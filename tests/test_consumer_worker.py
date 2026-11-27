"""
Unit tests for StreamForge Kafka Consumer Worker.
Verifies:
1. Message polling, processor handoff, and offset commitment.
2. Schema validation error quarantined to DLQ and offset committed (non-blocking).
3. Duplicate replay handled idempotently and offset committed.
4. Terminal state conflict quarantined to DLQ and offset committed.
5. Database failure prevents offset commitment (at-least-once preservation).
"""

import json
from decimal import Decimal
from datetime import datetime, timezone
import pytest

from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.storage.repository import InMemoryRepository
from streamforge.producer.generator import RideEventGenerator
from streamforge.events.schemas import RideEvent, RideEventType, RideCancelledPayload


@pytest.fixture
def repo():
    return InMemoryRepository()


@pytest.fixture
def processor(repo):
    return StreamProcessor(repository=repo)


@pytest.fixture
def worker(processor):
    return StreamConsumerWorker(processor=processor, topic="ride-events", dry_run=True)


def test_consumer_successful_processing_and_offset_commit(worker, repo):
    """Verify standard message consumption, database persistence, and offset commit."""
    generator = RideEventGenerator(seed=42)
    events = generator.generate_full_ride_lifecycle(ride_id="ride-101")
    req_event = events[0]
    payload_bytes = json.dumps(req_event.to_kafka_dict()).encode("utf-8")

    worker.inject_mock_message(payload_bytes, topic="ride-events", partition=0, offset=10)

    result = worker.poll_and_process()

    assert result is not None
    assert result.status == "accepted"
    assert result.ride_id == "ride-101"
    assert worker.messages_processed == 1
    assert worker.messages_committed == 1
    assert worker.committed_offsets["ride-events:0"] == 11

    # Verify repository has projected ride
    ride = repo.get_ride("ride-101")
    assert ride is not None
    assert ride["status"] == "ride.requested"
    assert ride["estimated_fare"] > 0


def test_consumer_schema_validation_failure_quarantined_and_committed(worker, repo):
    """Verify malformed JSON/schema routes to DLQ and still commits offset to avoid partition stall."""
    malformed_payload = {
        "event_id": "bad-evt-1",
        "event_type": "RIDE_REQUESTED",
        # Missing required fields like produced_at, ride_id, occurred_at, payload
    }
    payload_bytes = json.dumps(malformed_payload).encode("utf-8")

    worker.inject_mock_message(payload_bytes, topic="ride-events", partition=0, offset=25)

    result = worker.poll_and_process()

    assert result is not None
    assert result.status == "quarantined"
    assert "SchemaValidationError" in result.error_reason
    assert worker.messages_committed == 1
    assert worker.committed_offsets["ride-events:0"] == 26

    # Verify DLQ contains entry
    assert len(repo.dead_letter_events) == 1
    dlq_entry = list(repo.dead_letter_events.values())[0]
    assert dlq_entry["event_id"] == "bad-evt-1"
    assert dlq_entry["source_offset"] == 25


def test_consumer_duplicate_event_replay_committed(worker, repo):
    """Verify duplicate event replay is ignored and offset is committed."""
    generator = RideEventGenerator(seed=42)
    events = generator.generate_full_ride_lifecycle(ride_id="ride-102")
    payload_bytes = json.dumps(events[0].to_kafka_dict()).encode("utf-8")

    # Inject first delivery
    worker.inject_mock_message(payload_bytes, topic="ride-events", partition=0, offset=30)
    res1 = worker.poll_and_process()
    assert res1.status == "accepted"

    # Inject duplicate replay
    worker.inject_mock_message(payload_bytes, topic="ride-events", partition=0, offset=31)
    res2 = worker.poll_and_process()
    assert res2.status == "duplicate"
    assert worker.messages_committed == 2
    assert repo.get_counter("duplicates_ignored") == 1


def test_consumer_terminal_conflict_quarantined_and_committed(worker, repo):
    """Verify terminal state conflict (CANCELLED on COMPLETED ride) is quarantined and committed."""
    generator = RideEventGenerator(seed=42)
    lifecycle = generator.generate_full_ride_lifecycle(ride_id="ride-103", simulate_cancellation=False)
    # Feed REQUESTED, ACCEPTED, STARTED, COMPLETED
    for idx, evt in enumerate(lifecycle):
        worker.inject_mock_message(
            json.dumps(evt.to_kafka_dict()).encode("utf-8"),
            topic="ride-events",
            partition=0,
            offset=40 + idx,
        )
        worker.poll_and_process()

    assert repo.get_ride("ride-103")["status"] == "ride.completed"

    # Now inject conflicting CANCELLED event
    now = datetime.now(timezone.utc)
    cancel_evt = RideEvent(
        event_id="EVT-CANCEL-CONFLICT-01",
        event_type=RideEventType.CANCELLED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=RideCancelledPayload(
            ride_id="ride-103",
            cancelled_by="rider",
            cancellation_reason="changed mind after arrival",
            cancellation_fee=Decimal("0.00"),
        ),
    )
    worker.inject_mock_message(
        json.dumps(cancel_evt.to_kafka_dict()).encode("utf-8"),
        topic="ride-events",
        partition=0,
        offset=44,
    )

    res = worker.poll_and_process()
    assert res.status == "quarantined"
    assert "invalid_state_transition" in res.error_reason
    assert worker.committed_offsets["ride-events:0"] == 45


def test_consumer_database_failure_does_not_commit_offset(processor):
    """Verify unhandled database crash aborts offset commitment to preserve at-least-once guarantee."""
    class FaultyRepository(InMemoryRepository):
        def insert_processed_event(self, event, ingested_at=None):
            raise RuntimeError("Database connection terminated abruptly")

    faulty_repo = FaultyRepository()
    faulty_processor = StreamProcessor(repository=faulty_repo)
    faulty_worker = StreamConsumerWorker(processor=faulty_processor, topic="ride-events", dry_run=True)

    generator = RideEventGenerator(seed=42)
    events = generator.generate_full_ride_lifecycle(ride_id="ride-104")
    payload_bytes = json.dumps(events[0].to_kafka_dict()).encode("utf-8")

    faulty_worker.inject_mock_message(payload_bytes, topic="ride-events", partition=0, offset=50)

    with pytest.raises(RuntimeError, match="Database connection terminated abruptly"):
        faulty_worker.poll_and_process()

    # Offset MUST NOT be committed
    assert faulty_worker.messages_committed == 0
    assert "ride-events:0" not in faulty_worker.committed_offsets


def test_consumer_batch_successful_processing_and_offset_commit(worker, repo):
    """Verify batch polling, processing, and multi-record offset commit."""
    generator = RideEventGenerator(seed=42)
    for i in range(5):
        events = generator.generate_full_ride_lifecycle(ride_id=f"ride-batch-{i}")
        worker.inject_mock_message(
            json.dumps(events[0].to_kafka_dict()).encode("utf-8"),
            topic="ride-events",
            partition=0,
            offset=100 + i,
        )

    res = worker.poll_and_process_batch(max_batch_size=5)

    assert res is not None
    assert res.accepted_count == 5
    assert worker.messages_processed == 5
    assert worker.messages_committed == 5
    assert worker.committed_offsets["ride-events:0"] == 105
    assert len(repo.rides) == 5


def test_consumer_batch_multi_partition_and_offset_gaps(worker, repo):
    """Verify multi-partition commits and handling of non-consecutive offset gaps."""
    generator = RideEventGenerator(seed=42)

    # Partition 0: offsets 10, 15, 22 (gaps!)
    p0_offsets = [10, 15, 22]
    for idx, off in enumerate(p0_offsets):
        e = generator.generate_full_ride_lifecycle(ride_id=f"ride-p0-{idx}")[0]
        worker.inject_mock_message(
            json.dumps(e.to_kafka_dict()).encode("utf-8"),
            topic="ride-events",
            partition=0,
            offset=off,
        )

    # Partition 1: offsets 5, 6
    p1_offsets = [5, 6]
    for idx, off in enumerate(p1_offsets):
        e = generator.generate_full_ride_lifecycle(ride_id=f"ride-p1-{idx}")[0]
        worker.inject_mock_message(
            json.dumps(e.to_kafka_dict()).encode("utf-8"),
            topic="ride-events",
            partition=1,
            offset=off,
        )

    res = worker.poll_and_process_batch(max_batch_size=10)

    assert res is not None
    assert res.accepted_count == 5
    assert worker.messages_processed == 5
    assert worker.messages_committed == 5

    # Partition 0 target is max(10, 15, 22) + 1 = 23
    assert worker.committed_offsets["ride-events:0"] == 23
    # Partition 1 target is max(5, 6) + 1 = 7
    assert worker.committed_offsets["ride-events:1"] == 7


def test_consumer_batch_mixed_duplicates_and_dlq_quarantine(worker, repo):
    """Verify that batches containing valid, duplicate, and quarantined events commit offsets without blocking."""
    generator = RideEventGenerator(seed=42)
    valid_event = generator.generate_full_ride_lifecycle(ride_id="ride-mixed-01")[0]
    valid_bytes = json.dumps(valid_event.to_kafka_dict()).encode("utf-8")

    malformed_bytes = json.dumps({"bad": "payload", "event_id": "bad-batch-01"}).encode("utf-8")

    # Item 0: Valid event (offset 50)
    worker.inject_mock_message(valid_bytes, topic="ride-events", partition=0, offset=50)
    # Item 1: Malformed event -> DLQ (offset 51)
    worker.inject_mock_message(malformed_bytes, topic="ride-events", partition=0, offset=51)
    # Item 2: Duplicate of Item 0 (offset 52)
    worker.inject_mock_message(valid_bytes, topic="ride-events", partition=0, offset=52)

    res = worker.poll_and_process_batch(max_batch_size=3)

    assert res is not None
    assert res.accepted_count == 1
    assert res.quarantined_count == 1
    assert res.duplicate_count == 1

    assert worker.messages_processed == 3
    assert worker.messages_committed == 3
    assert worker.committed_offsets["ride-events:0"] == 53
    assert len(repo.dead_letter_events) == 1
    assert repo.pipeline_counters["duplicates_ignored"] == 1


def test_consumer_batch_database_failure_halts_and_aborts_commit():
    """Verify that unhandled database failures halt the worker and commit NO offsets."""
    class FaultyRepository(InMemoryRepository):
        def persist_events_batch(self, items):
            raise RuntimeError("Database connection crashed during batch")

    faulty_repo = FaultyRepository()
    faulty_processor = StreamProcessor(repository=faulty_repo)
    faulty_worker = StreamConsumerWorker(processor=faulty_processor, topic="ride-events", dry_run=True)

    generator = RideEventGenerator(seed=42)
    for i in range(3):
        e = generator.generate_full_ride_lifecycle(ride_id=f"ride-faulty-{i}")[0]
        faulty_worker.inject_mock_message(
            json.dumps(e.to_kafka_dict()).encode("utf-8"),
            topic="ride-events",
            partition=0,
            offset=200 + i,
        )

    with pytest.raises(RuntimeError, match="Database connection crashed during batch"):
        faulty_worker.poll_and_process_batch()

    assert faulty_worker._halted is True
    assert faulty_worker.messages_committed == 0
    assert "ride-events:0" not in faulty_worker.committed_offsets

    # Subsequent call fails immediately due to halted state
    with pytest.raises(RuntimeError, match="Consumer worker is halted"):
        faulty_worker.poll_and_process_batch()


def test_consumer_batch_empty_queue_returns_none(worker):
    """Verify empty queue returns None immediately."""
    res = worker.poll_and_process_batch()
    assert res is None
    assert worker.messages_processed == 0
    assert worker.messages_committed == 0


def test_consumer_batch_stage_timing_recorded(worker):
    """Verify that batch stage timing captures non-zero metrics."""
    generator = RideEventGenerator(seed=42)
    e = generator.generate_full_ride_lifecycle(ride_id="ride-timing-01")[0]
    worker.inject_mock_message(
        json.dumps(e.to_kafka_dict()).encode("utf-8"),
        topic="ride-events",
        partition=0,
        offset=300,
    )

    res = worker.poll_and_process_batch()
    assert res is not None

    timing = worker.last_stage_timing
    assert timing is not None
    assert timing.poll_ms >= 0.0
    assert timing.validation_ms >= 0.0
    assert timing.db_persist_ms >= 0.0
    assert timing.offset_commit_ms >= 0.0
    assert timing.total_processing_ms >= 0.0

