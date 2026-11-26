"""Consumer-to-processor deserialization integration tests."""

import base64
import json
import pytest

from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.producer.generator import RideEventGenerator
from streamforge.storage.repository import InMemoryRepository


def status_value(result):
    """Support either string or enum-based processing statuses."""
    return getattr(result.status, "value", result.status)


@pytest.fixture
def repository():
    return InMemoryRepository()


@pytest.fixture
def worker(repository):
    processor = StreamProcessor(repository=repository)
    return StreamConsumerWorker(
        processor=processor,
        topic="streamforge.rides.v1",
        dry_run=True,
    )


@pytest.mark.parametrize(
    "raw_bytes,expected_error_substr",
    [
        (b"\x80\x81\xff", "invalid utf-8"),
        (b'{"ride_id": "r-1", bad-json', "invalid json syntax"),
        (b'["json", "array"]', "expected json object"),
        (b'"json_string_primitive"', "expected json object"),
    ],
)
def test_transport_deserialization_failures_quarantined_and_committed(
    worker, repository, raw_bytes, expected_error_substr
):
    """Parameterized test (4 cases): Corrupt/malformed Kafka transport bytes route to DLQ and commit offset."""
    worker.inject_mock_message(raw_bytes, topic="streamforge.rides.v1", partition=1, offset=42)
    result = worker.poll_and_process()

    assert result is not None
    assert status_value(result) == "quarantined"
    assert expected_error_substr.lower() in result.error_reason.lower()
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1
    assert worker.committed_offsets["streamforge.rides.v1:1"] == 43

    # Verify DLQ record in repository
    assert len(repository.dead_letter_events) == 1
    dlq_record = list(repository.dead_letter_events.values())[0]
    assert dlq_record["failure_category"] == "deserialization_error"
    assert dlq_record["source_partition"] == 1
    assert dlq_record["source_offset"] == 42
    assert dlq_record["source_topic"] == "streamforge.rides.v1"


def test_valid_ride_event_processed_and_committed(worker, repository):
    """Test 5: Valid ride event is processed, projected in repository, and offset is committed."""
    generator = RideEventGenerator(seed=42)
    event, _ = generator.generate_ride_requested(ride_id="ride-int-001")
    payload_bytes = json.dumps(event.to_kafka_dict()).encode("utf-8")

    worker.inject_mock_message(payload_bytes, topic="streamforge.rides.v1", partition=0, offset=10)
    result = worker.poll_and_process()

    assert result is not None
    assert status_value(result) == "accepted"
    assert result.ride_id == "ride-int-001"
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1
    assert worker.committed_offsets["streamforge.rides.v1:0"] == 11

    # Verify repository projection
    ride = repository.get_ride("ride-int-001")
    assert ride is not None
    assert len(repository.dead_letter_events) == 0


def test_schema_validation_failure_quarantined_and_committed(worker, repository):
    """Test 6: Valid JSON object with invalid schema routes to DLQ with validation_error and commits offset."""
    invalid_schema_obj = {
        "event_id": "EVT-BAD-SCHEMA-001",
        "invalid_key": "some_value",
        # Missing required occurred_at, event_type, payload, etc.
    }
    payload_bytes = json.dumps(invalid_schema_obj).encode("utf-8")

    worker.inject_mock_message(payload_bytes, topic="streamforge.rides.v1", partition=2, offset=105)
    result = worker.poll_and_process()

    assert result is not None
    assert status_value(result) == "quarantined"
    assert "SchemaValidationError" in result.error_reason
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1
    assert worker.committed_offsets["streamforge.rides.v1:2"] == 106

    # Verify DLQ record
    assert len(repository.dead_letter_events) == 1
    dlq_record = list(repository.dead_letter_events.values())[0]
    assert dlq_record["failure_category"] == "validation_error"
    assert dlq_record["event_id"] == "EVT-BAD-SCHEMA-001"
    assert dlq_record["source_partition"] == 2
    assert dlq_record["source_offset"] == 105
    assert dlq_record["source_topic"] == "streamforge.rides.v1"


def test_database_failure_during_processing_halts_worker_and_withholds_commit(worker, repository):
    """Test 7: Database crash during processing halts the worker, withholds commit, and blocks subsequent polls."""
    generator = RideEventGenerator(seed=42)
    event, _ = generator.generate_ride_requested(ride_id="ride-int-003")
    payload_bytes = json.dumps(event.to_kafka_dict()).encode("utf-8")

    def failing_projection(evt):
        raise ConnectionError("PostgreSQL connection terminated abruptly.")

    repository.upsert_ride_projection = failing_projection

    worker.inject_mock_message(payload_bytes, topic="streamforge.rides.v1", partition=0, offset=200)

    with pytest.raises(ConnectionError, match="PostgreSQL connection terminated abruptly."):
        worker.poll_and_process()

    assert worker._halted is True
    assert "offset 200" in worker._halt_reason
    assert worker.messages_committed == 0
    assert "streamforge.rides.v1:0" not in worker.committed_offsets

    # Fail-stop safeguard blocks subsequent calls
    with pytest.raises(RuntimeError, match="Consumer worker is halted after an uncommitted failure"):
        worker.poll_and_process()
