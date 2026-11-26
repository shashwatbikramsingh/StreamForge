"""Polling and message-handling reliability tests."""

from types import SimpleNamespace
from typing import Any, Dict, List, Optional
import pytest

import confluent_kafka
from streamforge.consumer import worker as worker_module
from streamforge.consumer.worker import (
    MockMessage,
    StreamConsumerWorker,
)


class RecordingProcessor:
    """Test processor that records received events."""

    def __init__(self, error=None):
        self.calls: List[Dict[str, Any]] = []
        self.error = error

    def process_raw_message(
        self,
        raw_message: Optional[Dict[str, Any]] = None,
        source_partition: int = 0,
        source_offset: int = 0,
        source_topic: str = "streamforge.rides.v1",
        raw_payload: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> SimpleNamespace:
        payload = raw_message if raw_message is not None else raw_payload
        self.calls.append({
            "raw_payload": payload,
            "source_partition": source_partition,
            "source_offset": source_offset,
            "source_topic": source_topic,
        })
        if self.error:
            raise self.error
        return SimpleNamespace(status="accepted")

    def process_deserialization_failure(
        self,
        result: Any,
        source_topic: str = "streamforge.rides.v1",
        source_partition: int = 0,
        source_offset: int = 0,
        **kwargs,
    ) -> SimpleNamespace:
        self.calls.append({
            "deserialization_result": result,
            "source_topic": source_topic,
            "source_partition": source_partition,
            "source_offset": source_offset,
        })
        if self.error:
            raise self.error
        return SimpleNamespace(status="quarantined", error_reason="deserialization failure")


class MockKafkaConsumer:
    """Mock Kafka consumer for polling and error testing."""

    def __init__(self, poll_messages=None, commit_error=None):
        self.poll_messages = list(poll_messages) if poll_messages else []
        self.commit_error = commit_error
        self.subscribed_topics = []

    def subscribe(self, topics):
        self.subscribed_topics = topics

    def poll(self, timeout=1.0):
        if self.poll_messages:
            return self.poll_messages.pop(0)
        return None

    def commit(self, message=None, asynchronous=True):
        if self.commit_error:
            raise self.commit_error
        return [SimpleNamespace(topic=message.topic(), partition=message.partition(), offset=message.offset() + 1, error=None)]


def test_negative_timeout_rejected():
    """Test 1: Negative timeout_seconds raises ValueError."""
    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)
    with pytest.raises(ValueError, match="timeout_seconds must be non-negative"):
        worker.poll_and_process(timeout_seconds=-0.5)


def test_empty_poll_returns_none_in_dry_run():
    """Test 2: Empty in-memory queue returns None without errors."""
    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)
    assert worker.poll_and_process() is None
    assert len(processor.calls) == 0


def test_empty_poll_returns_none_in_live_mode(monkeypatch):
    """Test 3: Live consumer returning None on poll returns None."""
    mock_consumer = MockKafkaConsumer(poll_messages=[])
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: mock_consumer)

    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=False)

    assert worker.poll_and_process(timeout_seconds=0.1) is None
    assert len(processor.calls) == 0


def test_partition_eof_returns_none_without_processing():
    """Test 4: Partition EOF message is skipped and returns None."""
    eof_error = SimpleNamespace(
        code=lambda: confluent_kafka.KafkaError._PARTITION_EOF,
        is_eof=True,
    )
    eof_msg = MockMessage(
        topic="streamforge.rides.v1",
        partition=0,
        offset=100,
        key=None,
        value=b"",
        error=eof_error,
    )

    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)
    worker.inject_mock_message(b"", error=eof_error)

    result = worker.poll_and_process()
    assert result is None
    assert len(processor.calls) == 0
    assert worker.messages_processed == 0


class DummyKafkaError:
    """Mock Kafka error with code and string representation."""

    def __init__(self, message="Broker connection reset", code=-1):
        self._message = message
        self._code = code

    def code(self):
        return self._code

    def __str__(self):
        return self._message


def test_kafka_message_error_surfaced_as_runtime_error():
    """Test 5: Broker message errors other than EOF are surfaced as RuntimeError."""
    broker_error = DummyKafkaError(message="Broker connection reset", code=-1)
    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)
    worker.inject_mock_message(b"", error=broker_error)

    with pytest.raises(RuntimeError, match="Kafka message error: Broker connection reset"):
        worker.poll_and_process()

    assert len(processor.calls) == 0


def test_valid_message_deserialized_and_passed_to_processor():
    """Test 6: Valid JSON bytes are decoded to dict and passed to processor."""
    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)

    payload_json = b'{"event_id": "EVT-100", "ride_id": "RIDE-500", "fare": "250.00"}'
    worker.inject_mock_message(payload_json, topic="streamforge.rides.v1", partition=1, offset=42)

    result = worker.poll_and_process()
    assert result is not None
    assert result.status == "accepted"
    assert len(processor.calls) == 1
    assert processor.calls[0]["raw_payload"] == {"event_id": "EVT-100", "ride_id": "RIDE-500", "fare": "250.00"}
    assert processor.calls[0]["source_partition"] == 1
    assert processor.calls[0]["source_offset"] == 42
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1
    assert worker.committed_offsets["streamforge.rides.v1:1"] == 43


def test_malformed_json_routed_to_deserialization_failure_handler():
    """Test 7: Malformed JSON bytes are routed to process_deserialization_failure and committed."""
    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=True)

    malformed_bytes = b'{"event_id": "EVT-BAD", unclosed-json...'
    worker.inject_mock_message(malformed_bytes, topic="streamforge.rides.v1", partition=0, offset=77)

    result = worker.poll_and_process()
    assert result is not None
    assert len(processor.calls) == 1
    assert "deserialization_result" in processor.calls[0]
    assert processor.calls[0]["deserialization_result"].succeeded is False
    assert processor.calls[0]["source_offset"] == 77
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1


def test_processing_failure_halts_consumer_and_prevents_subsequent_polling():
    """Test 8: Database/processing failure halts the worker, withholding commits and blocking later messages."""
    processor = RecordingProcessor(error=RuntimeError("PostgreSQL connection terminated abruptly"))
    worker = StreamConsumerWorker(processor=processor, dry_run=True)

    # Queue Message 50 and Message 51
    worker.inject_mock_message(b'{"event_id": "EVT-50"}', partition=0, offset=50)
    worker.inject_mock_message(b'{"event_id": "EVT-51"}', partition=0, offset=51)

    # Processing Message 50 fails
    with pytest.raises(RuntimeError, match="PostgreSQL connection terminated abruptly"):
        worker.poll_and_process()

    assert worker._halted is True
    assert "offset 50" in worker._halt_reason
    assert worker.messages_committed == 0
    assert "streamforge.rides.v1:0" not in worker.committed_offsets

    # Subsequent polling must be blocked by fail-stop safeguard
    with pytest.raises(RuntimeError, match="Consumer worker is halted after an uncommitted failure"):
        worker.poll_and_process()

    # Offset 51 was never processed or committed
    assert len(processor.calls) == 1
    assert worker.messages_committed == 0


def test_commit_failure_halts_consumer_and_prevents_subsequent_polling(monkeypatch):
    """Test 9: Broker commit failure halts the worker and prevents advancing to subsequent offsets."""
    msg50 = MockMessage(topic="streamforge.rides.v1", partition=0, offset=50, key=None, value=b'{"event_id": "50"}')
    msg51 = MockMessage(topic="streamforge.rides.v1", partition=0, offset=51, key=None, value=b'{"event_id": "51"}')

    mock_consumer = MockKafkaConsumer(
        poll_messages=[msg50, msg51],
        commit_error=RuntimeError("Broker rebalance in progress"),
    )
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: mock_consumer)

    processor = RecordingProcessor()
    worker = StreamConsumerWorker(processor=processor, dry_run=False)

    # Polling Message 50 succeeds in processor, but fails in commit
    with pytest.raises(RuntimeError, match="Broker rebalance in progress"):
        worker.poll_and_process()

    assert worker._halted is True
    assert "failure at streamforge.rides.v1 [0] offset 50" in worker._halt_reason
    assert worker.messages_committed == 0

    # Attempting to poll Message 51 is blocked by fail-stop
    with pytest.raises(RuntimeError, match="Consumer worker is halted after an uncommitted failure"):
        worker.poll_and_process()

    assert len(processor.calls) == 1
    assert worker.messages_committed == 0
