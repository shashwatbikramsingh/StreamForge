"""Tests for processor deserialization failure integration."""

import base64
import pytest
from streamforge.events.deserializer import (
    deserialize_kafka_value,
    DeserializationResult,
)
from streamforge.processor.engine import StreamProcessor
from streamforge.storage.repository import InMemoryRepository


@pytest.fixture
def repository():
    return InMemoryRepository()


@pytest.fixture
def processor(repository):
    return StreamProcessor(repository=repository)


def test_invalid_utf8_is_quarantined_with_original_bytes(processor, repository):
    """Test 1: Non-UTF-8 bytes are quarantined with lossless Base64 preservation."""
    original_bytes = b"\xff\xfe\xfa"
    result = deserialize_kafka_value(original_bytes)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=2,
        source_offset=48102,
    )

    assert processed.status == "quarantined"
    assert processed.event_id == "UNKNOWN_EVENT_ID"
    assert processed.ride_id is None
    assert processed.latency_ms == 0.0
    assert "Invalid UTF-8" in processed.error_reason
    assert processed.dlq_id is not None

    record = repository.dead_letter_events[processed.dlq_id]
    assert record["event_id"] is None
    assert record["source_topic"] == "streamforge.rides.v1"
    assert record["source_partition"] == 2
    assert record["source_offset"] == 48102
    assert record["failure_category"] == "deserialization_error"
    assert record["raw_payload"]["raw_value_base64"] == base64.b64encode(original_bytes).decode("ascii")


def test_malformed_json_syntax_is_quarantined(processor, repository):
    """Test 2: Syntactically malformed JSON is quarantined."""
    raw = b'{"event_id":'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=10,
    )

    assert processed.status == "quarantined"
    assert "Invalid JSON syntax" in processed.error_reason
    record = repository.dead_letter_events[processed.dlq_id]
    assert record["source_offset"] == 10
    assert record["failure_category"] == "deserialization_error"


def test_json_array_is_quarantined(processor, repository):
    """Test 3: Top-level JSON array is quarantined as non-object."""
    raw = b'[1, 2, 3]'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=1,
        source_offset=20,
    )

    assert processed.status == "quarantined"
    assert "Expected JSON object" in processed.error_reason
    assert "list" in processed.error_reason


def test_json_string_primitive_is_quarantined(processor, repository):
    """Test 4: Top-level JSON string is quarantined as non-object."""
    raw = b'"unexpected string"'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=30,
    )

    assert processed.status == "quarantined"
    assert "Expected JSON object" in processed.error_reason
    assert "str" in processed.error_reason


def test_json_number_primitive_is_quarantined(processor, repository):
    """Test 5: Top-level JSON integer is quarantined as non-object."""
    raw = b'42'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=40,
    )

    assert processed.status == "quarantined"
    assert "Expected JSON object" in processed.error_reason
    assert "int" in processed.error_reason


def test_json_boolean_primitive_is_quarantined(processor, repository):
    """Test 6: Top-level JSON boolean is quarantined as non-object."""
    raw = b'false'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=50,
    )

    assert processed.status == "quarantined"
    assert "Expected JSON object" in processed.error_reason
    assert "bool" in processed.error_reason


def test_json_null_is_quarantined(processor, repository):
    """Test 7: Top-level JSON null is quarantined as non-object."""
    raw = b'null'
    result = deserialize_kafka_value(raw)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=60,
    )

    assert processed.status == "quarantined"
    assert "Expected JSON object" in processed.error_reason
    assert "null" in processed.error_reason


def test_kafka_tombstone_is_quarantined(processor, repository):
    """Test 8: Kafka tombstone message (None) is quarantined."""
    result = deserialize_kafka_value(None)
    processed = processor.process_deserialization_failure(
        result=result,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=70,
    )

    assert processed.status == "quarantined"
    assert "Kafka tombstone message" in processed.error_reason
    record = repository.dead_letter_events[processed.dlq_id]
    assert record["raw_payload"]["raw_value_base64"] is None


def test_successful_deserialization_result_rejected_by_handler(processor):
    """Test 9: Passing a successful DeserializationResult raises ValueError."""
    raw = b'{"event_id": "evt_1", "ride_id": "ride_1"}'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is True

    with pytest.raises(ValueError, match="process_deserialization_failure\\(\\) requires a failed DeserializationResult"):
        processor.process_deserialization_failure(
            result=result,
            source_topic="streamforge.rides.v1",
            source_partition=0,
            source_offset=80,
        )


def test_dlq_database_exception_propagates_without_quarantine_return():
    """Test 10: Infrastructure failure during DLQ write propagates without false quarantine reporting."""
    class FaultyRepository(InMemoryRepository):
        def insert_dead_letter(self, *args, **kwargs):
            raise RuntimeError("PostgreSQL dead_letter_events connection terminated abruptly")

    faulty_repo = FaultyRepository()
    faulty_processor = StreamProcessor(repository=faulty_repo)

    result = deserialize_kafka_value(b"corrupted-data")

    with pytest.raises(RuntimeError, match="PostgreSQL dead_letter_events connection terminated abruptly"):
        faulty_processor.process_deserialization_failure(
            result=result,
            source_topic="streamforge.rides.v1",
            source_partition=0,
            source_offset=90,
        )

    # Repository should not have committed the dead letter
    assert len(faulty_repo.dead_letter_events) == 0
