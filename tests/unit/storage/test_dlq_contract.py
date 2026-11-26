"""Tests for the canonical StreamForge DLQ repository contract."""

import pytest
from streamforge.storage.repository import InMemoryRepository


def test_dlq_accepts_unknown_event_identifier():
    """Test 1: event_id can be None for messages where identity is unparseable."""
    repo = InMemoryRepository()
    raw_payload = {
        "format": "streamforge.kafka.raw.v1",
        "raw_value_base64": "/v76",
        "decoded_text": None,
    }
    dlq_id = repo.insert_dead_letter(
        event_id=None,
        raw_payload=raw_payload,
        error_reason="Invalid UTF-8",
        source_partition=2,
        source_offset=48102,
        source_topic="streamforge.rides.v1",
        failure_category="deserialization_error",
    )
    record = repo.dead_letter_events[dlq_id]
    assert record["event_id"] is None
    assert record["source_topic"] == "streamforge.rides.v1"
    assert record["source_partition"] == 2
    assert record["source_offset"] == 48102
    assert record["failure_category"] == "deserialization_error"
    assert record["error_reason"] == "Invalid UTF-8"
    assert record["attempt_count"] == 1


def test_dlq_default_arguments_applied():
    """Test 2: Optional keyword arguments apply canonical defaults."""
    repo = InMemoryRepository()
    dlq_id = repo.insert_dead_letter(
        event_id="EVT-TEST-001",
        raw_payload={"test": True},
        error_reason="Schema violation",
    )
    record = repo.dead_letter_events[dlq_id]
    assert record["event_id"] == "EVT-TEST-001"
    assert record["source_topic"] == "streamforge.rides.v1"
    assert record["source_partition"] == 0
    assert record["source_offset"] == 0
    assert record["failure_category"] == "validation_error"


def test_dlq_empty_source_topic_rejected():
    """Test 3: Empty or whitespace source_topic raises ValueError."""
    repo = InMemoryRepository()
    with pytest.raises(ValueError, match="source_topic cannot be empty"):
        repo.insert_dead_letter(
            event_id="EVT-01",
            raw_payload={},
            error_reason="err",
            source_topic="   ",
        )


def test_dlq_negative_source_partition_rejected():
    """Test 4: Negative source_partition raises ValueError."""
    repo = InMemoryRepository()
    with pytest.raises(ValueError, match="source_partition must be non-negative"):
        repo.insert_dead_letter(
            event_id="EVT-01",
            raw_payload={},
            error_reason="err",
            source_partition=-1,
        )


def test_dlq_negative_source_offset_rejected():
    """Test 5: Negative source_offset raises ValueError."""
    repo = InMemoryRepository()
    with pytest.raises(ValueError, match="source_offset must be non-negative"):
        repo.insert_dead_letter(
            event_id="EVT-01",
            raw_payload={},
            error_reason="err",
            source_offset=-5,
        )


def test_dlq_unsupported_failure_category_rejected():
    """Test 6: Unapproved failure category raises ValueError."""
    repo = InMemoryRepository()
    with pytest.raises(ValueError, match="Unsupported DLQ failure category"):
        repo.insert_dead_letter(
            event_id="EVT-01",
            raw_payload={},
            error_reason="err",
            failure_category="unknown_random_error",
        )
