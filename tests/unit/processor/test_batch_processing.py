"""
Unit tests for StreamProcessor batch processing (process_batch).
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & RULES.md

Verifies:
1. All accepted batch events
2. Mixed duplicates
3. In-batch schema validation errors quarantined to DLQ
4. In-batch deserialization errors quarantined to DLQ
5. In-batch terminal projection conflicts quarantined to DLQ
6. Input message ordering strictly preserved across mixed outcomes
7. Database failure propagates immediately without hiding errors
8. Empty batch short-circuit
9. Stage timings (last_validation_ms, last_db_persist_ms)
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import MagicMock

from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)
from streamforge.events.geography import BengaluruZone
from streamforge.events.deserializer import DeserializationResult
from streamforge.storage.repository import InMemoryRepository
from streamforge.processor.engine import (
    StreamProcessor,
    RawMessageItem,
    BatchProcessResult,
    ProcessResult,
)


def _make_sample_payload(ride_id: str, event_id: str, fare: str = "200.00") -> dict:
    now = datetime.now(timezone.utc)
    return {
        "event_id": event_id,
        "event_type": "ride.requested",
        "schema_version": 1,
        "occurred_at": now.isoformat(),
        "produced_at": (now + timedelta(milliseconds=20)).isoformat(),
        "producer": "streamforge-test",
        "payload": {
            "ride_id": ride_id,
            "rider_id": "usr_test_01",
            "pickup_city": "Koramangala",
            "dropoff_city": "Indiranagar",
            "fare_amount": fare,
        },
    }


def test_process_batch_all_accepted():
    """Scenario 1: All valid events in a batch are accepted and preserve order."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    messages = [
        RawMessageItem(
            raw_payload=_make_sample_payload(f"RIDE-BATCH-1-{i}", f"EVT-BATCH-1-{i}"),
            source_partition=0,
            source_offset=i,
        )
        for i in range(5)
    ]

    res: BatchProcessResult = processor.process_batch(messages)

    assert res.accepted_count == 5
    assert res.duplicate_count == 0
    assert res.quarantined_count == 0
    assert len(res.results) == 5

    for i, r in enumerate(res.results):
        assert r.status == "accepted"
        assert r.event_id == f"EVT-BATCH-1-{i}"
        assert r.ride_id == f"RIDE-BATCH-1-{i}"
        assert r.latency_ms >= 0.0

    assert processor.last_validation_ms >= 0.0
    assert processor.last_db_persist_ms >= 0.0
    assert len(repo.processed_events) == 5
    assert len(repo.rides) == 5


def test_process_batch_mixed_duplicates():
    """Scenario 2: Duplicate events are detected and classified while new events are accepted."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    p0 = _make_sample_payload("RIDE-DUP-1", "EVT-DUP-1")
    p1 = _make_sample_payload("RIDE-DUP-2", "EVT-DUP-2")

    messages = [
        RawMessageItem(raw_payload=p0, source_partition=0, source_offset=0),
        RawMessageItem(raw_payload=p1, source_partition=0, source_offset=1),
        RawMessageItem(raw_payload=p0, source_partition=0, source_offset=2),  # Duplicate of p0
    ]

    res = processor.process_batch(messages)

    assert res.accepted_count == 2
    assert res.duplicate_count == 1
    assert res.quarantined_count == 0
    assert res.results[0].status == "accepted"
    assert res.results[1].status == "accepted"
    assert res.results[2].status == "duplicate"
    assert res.results[2].event_id == "EVT-DUP-1"
    assert repo.pipeline_counters["duplicates_ignored"] == 1


def test_process_batch_schema_validation_failure_quarantined():
    """Scenario 3: Schema invalid items in a batch are quarantined to DLQ while valid items succeed."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    valid_p1 = _make_sample_payload("RIDE-VAL-1", "EVT-VAL-1")
    bad_p = {
        "event_id": "EVT-BAD-P",
        "event_type": "ride.requested",
        # Missing schema_version, occurred_at, produced_at, payload
    }
    valid_p2 = _make_sample_payload("RIDE-VAL-2", "EVT-VAL-2")

    messages = [
        RawMessageItem(raw_payload=valid_p1, source_partition=1, source_offset=10),
        RawMessageItem(raw_payload=bad_p, source_partition=1, source_offset=11),
        RawMessageItem(raw_payload=valid_p2, source_partition=1, source_offset=12),
    ]

    res = processor.process_batch(messages)

    assert res.accepted_count == 2
    assert res.duplicate_count == 0
    assert res.quarantined_count == 1

    # Exact ordering preserved
    assert res.results[0].status == "accepted"
    assert res.results[0].event_id == "EVT-VAL-1"

    assert res.results[1].status == "quarantined"
    assert res.results[1].event_id == "EVT-BAD-P"
    assert "SchemaValidationError" in res.results[1].error_reason
    assert res.results[1].dlq_id.startswith("DLQ-")

    assert res.results[2].status == "accepted"
    assert res.results[2].event_id == "EVT-VAL-2"

    assert len(repo.dead_letter_events) == 1
    assert len(repo.rides) == 2


def test_process_batch_deserialization_failure_quarantined():
    """Scenario 4: Transport deserialization failure is quarantined with failure_category='deserialization_error'."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    valid_p = _make_sample_payload("RIDE-DESER-1", "EVT-DESER-1")
    failed_deser = DeserializationResult(
        payload=None,
        raw_record={"raw_bytes": "corrupted"},
        error_reason="JSONDecodeError: Unterminated string",
    )

    messages = [
        RawMessageItem(raw_payload=valid_p, source_partition=2, source_offset=20),
        RawMessageItem(
            deserialization_result=failed_deser,
            source_partition=2,
            source_offset=21,
        ),
    ]

    res = processor.process_batch(messages)

    assert res.accepted_count == 1
    assert res.quarantined_count == 1

    assert res.results[0].status == "accepted"
    assert res.results[1].status == "quarantined"
    assert res.results[1].event_id == "UNKNOWN_EVENT_ID"
    assert "JSONDecodeError" in res.results[1].error_reason
    assert res.results[1].dlq_id.startswith("DLQ-")

    dlq_record = list(repo.dead_letter_events.values())[0]
    assert dlq_record["failure_category"] == "deserialization_error"


def test_process_batch_terminal_conflict_quarantined():
    """Scenario 5: Terminal conflict in batch is quarantined to DLQ while valid event in same batch succeeds."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)
    now = datetime.now(timezone.utc)
    completed_ride_id = "RIDE-COMPLETED-ALREADY"

    # Set up completed ride in repo
    req_payload = _make_sample_payload(completed_ride_id, "EVT-COMP-REQ")
    comp_payload = {
        "event_id": "EVT-COMP-END",
        "event_type": "ride.completed",
        "schema_version": 1,
        "occurred_at": (now + timedelta(minutes=5)).isoformat(),
        "produced_at": (now + timedelta(minutes=5)).isoformat(),
        "producer": "streamforge-test",
        "payload": {
            "ride_id": completed_ride_id,
            "driver_id": "drv_99",
            "fare_amount": "250.00",
            "distance_km": "6.00",
            "duration_seconds": 600,
        },
    }
    processor.process_raw_message(req_payload)
    processor.process_raw_message(comp_payload)

    # Batch containing:
    # 1. Valid new ride
    # 2. Conflicted cancel on completed ride
    valid_new = _make_sample_payload("RIDE-NEW-VALID", "EVT-NEW-VALID")
    conflicted_cancel = {
        "event_id": "EVT-CONFLICTED-CANCEL",
        "event_type": "ride.cancelled",
        "schema_version": 1,
        "occurred_at": (now + timedelta(minutes=10)).isoformat(),
        "produced_at": (now + timedelta(minutes=10)).isoformat(),
        "producer": "streamforge-test",
        "payload": {
            "ride_id": completed_ride_id,
            "cancelled_by": "rider",
            "cancellation_reason": "Late cancel attempt",
            "cancellation_fee": "0.00",
        },
    }

    messages = [
        RawMessageItem(raw_payload=valid_new, source_partition=0, source_offset=100),
        RawMessageItem(raw_payload=conflicted_cancel, source_partition=0, source_offset=101),
    ]

    res = processor.process_batch(messages)

    assert res.accepted_count == 1
    assert res.duplicate_count == 0
    assert res.quarantined_count == 1

    assert res.results[0].status == "accepted"
    assert res.results[0].event_id == "EVT-NEW-VALID"

    assert res.results[1].status == "quarantined"
    assert res.results[1].event_id == "EVT-CONFLICTED-CANCEL"
    assert "invalid_state_transition" in res.results[1].error_reason
    assert res.results[1].dlq_id.startswith("DLQ-")


def test_process_batch_database_failure_propagates():
    """Scenario 6: Database exception during batch persistence propagates immediately without false success."""
    mock_repo = MagicMock()
    mock_repo.persist_events_batch.side_effect = RuntimeError("PostgreSQL connection lost")
    processor = StreamProcessor(repository=mock_repo)

    messages = [
        RawMessageItem(
            raw_payload=_make_sample_payload("RIDE-ERR-1", "EVT-ERR-1"),
            source_partition=0,
            source_offset=1,
        )
    ]

    with pytest.raises(RuntimeError, match="PostgreSQL connection lost"):
        processor.process_batch(messages)


def test_process_batch_empty_short_circuit():
    """Scenario 7: Empty batch returns empty result immediately with zero stage latencies."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    res = processor.process_batch([])

    assert res.accepted_count == 0
    assert res.duplicate_count == 0
    assert res.quarantined_count == 0
    assert res.total_latency_ms == 0.0
    assert res.results == []
    assert processor.last_validation_ms == 0.0
    assert processor.last_db_persist_ms == 0.0


def test_process_batch_dict_normalization():
    """Scenario 8: Plain dictionary items are cleanly normalized and processed."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    messages = [
        _make_sample_payload("RIDE-DICT-1", "EVT-DICT-1"),
        {"raw_payload": _make_sample_payload("RIDE-DICT-2", "EVT-DICT-2"), "source_partition": 1, "source_offset": 5},
    ]

    res = processor.process_batch(messages)
    assert res.accepted_count == 2
    assert len(res.results) == 2
    assert res.results[0].event_id == "EVT-DICT-1"
    assert res.results[1].event_id == "EVT-DICT-2"
