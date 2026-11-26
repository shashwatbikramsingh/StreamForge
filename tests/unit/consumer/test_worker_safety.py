"""Reliability and safety tests for StreamConsumerWorker."""

from types import SimpleNamespace
from typing import Any, List, Optional
import pytest

from streamforge.consumer import worker as worker_module
from streamforge.consumer.worker import StreamConsumerWorker, MockMessage
from streamforge.processor.engine import StreamProcessor
from streamforge.storage.repository import InMemoryRepository


@pytest.fixture
def processor():
    return StreamProcessor(repository=InMemoryRepository())


class FakeKafkaConsumer:
    """Mock Kafka consumer for live-mode unit testing."""

    def __init__(self, config, commit_result=None, commit_error=None):
        self.config = config
        self.commit_result = commit_result
        self.commit_error = commit_error
        self.subscribed_topics = []
        self.closed = False

    def subscribe(self, topics):
        self.subscribed_topics = topics

    def commit(self, message=None, asynchronous=True):
        if self.commit_error:
            raise self.commit_error
        return self.commit_result

    def close(self):
        self.closed = True


def test_auto_offset_storage_and_auto_commit_disabled_by_default(processor, monkeypatch):
    """Test 1: Consumer enforces enable.auto.commit=False and enable.auto.offset.store=False."""
    created_consumer = []

    def mock_consumer_cls(config):
        fake = FakeKafkaConsumer(config)
        created_consumer.append(fake)
        return fake

    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", mock_consumer_cls)

    worker = StreamConsumerWorker(processor=processor, dry_run=False)
    assert len(created_consumer) == 1
    consumer_instance = created_consumer[0]
    assert consumer_instance.config["enable.auto.commit"] is False
    assert consumer_instance.config["enable.auto.offset.store"] is False
    assert consumer_instance.config["auto.offset.reset"] == "earliest"


def test_unsafe_auto_commit_override_rejected(processor):
    """Test 2: Attempts to enable auto-commit via overrides are explicitly rejected."""
    with pytest.raises(ValueError, match="Unsafe consumer configuration override: 'enable.auto.commit'"):
        StreamConsumerWorker(
            processor=processor,
            consumer_config={"enable.auto.commit": True},
            dry_run=False,
        )


def test_unsafe_auto_offset_store_override_rejected(processor):
    """Test 3: Attempts to enable automatic offset storage via overrides are explicitly rejected."""
    with pytest.raises(ValueError, match="Unsafe consumer configuration override: 'enable.auto.offset.store'"):
        StreamConsumerWorker(
            processor=processor,
            consumer_config={"enable.auto.offset.store": True},
            dry_run=False,
        )


def test_missing_confluent_kafka_raises_runtime_error(processor, monkeypatch):
    """Test 4: When confluent-kafka is missing, live consumer initialization fails fast without silent dry-run fallback."""
    monkeypatch.setattr(worker_module, "CONFLUENT_KAFKA_AVAILABLE", False)

    with pytest.raises(RuntimeError, match="confluent-kafka is not installed"):
        StreamConsumerWorker(processor=processor, dry_run=False)


def test_kafka_initialization_failure_raises_runtime_error(processor, monkeypatch):
    """Test 5: Broker initialization errors fail fast without silent dry-run fallback."""
    def faulty_consumer_cls(config):
        raise RuntimeError("Fatal broker socket error")

    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", faulty_consumer_cls)

    with pytest.raises(RuntimeError, match="Failed to initialize Kafka consumer: Fatal broker socket error"):
        StreamConsumerWorker(processor=processor, dry_run=False)


def test_successful_commit_updates_metrics_after_broker_confirmation(processor, monkeypatch):
    """Test 6: Successful synchronous commit updates metrics only after broker confirmation."""
    fake_consumer = FakeKafkaConsumer(
        config={},
        commit_result=[SimpleNamespace(topic="streamforge.rides.v1", partition=0, offset=101, error=None)],
    )
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: fake_consumer)

    worker = StreamConsumerWorker(processor=processor, dry_run=False)
    msg = MockMessage(topic="streamforge.rides.v1", partition=0, offset=100, key=None, value=b"{}")

    worker._commit_offset(msg)

    assert worker.messages_committed == 1
    assert worker.committed_offsets["streamforge.rides.v1:0"] == 101


def test_failed_commit_does_not_increment_metrics(processor, monkeypatch):
    """Test 7: Failed commit (exception or partition error) does not increment committed metrics."""
    # Sub-case A: Broker throws commit error
    fake_consumer_err = FakeKafkaConsumer(
        config={},
        commit_error=RuntimeError("Broker rebalance in progress"),
    )
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: fake_consumer_err)

    worker = StreamConsumerWorker(processor=processor, dry_run=False)
    msg = MockMessage(topic="streamforge.rides.v1", partition=0, offset=200, key=None, value=b"{}")

    with pytest.raises(RuntimeError, match="Broker rebalance in progress"):
        worker._commit_offset(msg)

    assert worker.messages_committed == 0
    assert "streamforge.rides.v1:0" not in worker.committed_offsets

    # Sub-case B: Partition returns explicit error
    fake_consumer_partition_err = FakeKafkaConsumer(
        config={},
        commit_result=[SimpleNamespace(topic="streamforge.rides.v1", partition=0, offset=201, error="UNKNOWN_TOPIC_OR_PART")],
    )
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: fake_consumer_partition_err)

    worker2 = StreamConsumerWorker(processor=processor, dry_run=False)
    with pytest.raises(RuntimeError, match="Broker returned partition error during offset commit"):
        worker2._commit_offset(msg)

    assert worker2.messages_committed == 0
    assert "streamforge.rides.v1:0" not in worker2.committed_offsets


def test_commit_returning_none_raises_runtime_error(processor, monkeypatch):
    """Test 8: Synchronous commit returning None/empty confirmation raises RuntimeError and does not increment metrics."""
    fake_consumer = FakeKafkaConsumer(config={}, commit_result=None)
    monkeypatch.setattr(worker_module.confluent_kafka, "Consumer", lambda cfg: fake_consumer)

    worker = StreamConsumerWorker(processor=processor, dry_run=False)
    msg = MockMessage(topic="streamforge.rides.v1", partition=0, offset=300, key=None, value=b"{}")

    with pytest.raises(RuntimeError, match="Kafka returned no offset commit confirmation"):
        worker._commit_offset(msg)

    assert worker.messages_committed == 0
    assert "streamforge.rides.v1:0" not in worker.committed_offsets

