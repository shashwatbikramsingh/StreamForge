"""Live integration tests for PostgresRepository against real PostgreSQL 16 container.

Verifies real SQL execution, constraints, transactions, rollback behavior,
monotonic COALESCE updates, and independent DLQ persistence.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest

from streamforge.events.geography import BengaluruZone
from streamforge.events.schemas import (
    RideCancelledPayload,
    RideCompletedPayload,
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideStartedPayload,
)
from streamforge.storage.postgres_repository import PostgresRepository
from streamforge.storage.repository import BatchItem


@pytest.fixture(scope="module")
def live_repo():
    """Shared live repository connection for the integration test run."""
    repo = PostgresRepository()
    yield repo
    repo.close()


@pytest.fixture(scope="module")
def test_ids():
    """Generate isolated IDs for this test module run."""
    uid = uuid.uuid4().hex[:6].upper()
    return {
        "ride_id": f"RIDE-LIVE-{uid}",
        "evt_req": f"EVT-REQ-{uid}",
        "evt_start": f"EVT-START-{uid}",
        "evt_comp": f"EVT-COMP-{uid}",
        "evt_conflict": f"EVT-CONF-{uid}",
    }


def test_live_persist_valid_event_and_query_state(live_repo, test_ids):
    """Test 1: Live event insertion into processed_events and rides projection."""
    now = datetime.now(timezone.utc)
    req_payload = RideRequestedPayload(
        ride_id=test_ids["ride_id"],
        rider_id="RIDER-LIVE-001",
        pickup_city=BengaluruZone.KORAMANGALA,
        dropoff_city=BengaluruZone.INDIRANAGAR,
        fare_amount=Decimal("350.00"),
    )
    event = RideEvent(
        event_id=test_ids["evt_req"],
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=req_payload,
    )

    result = live_repo.persist_event_and_projection(
        event,
        source_topic="streamforge.rides.v1",
        source_partition=0,
        source_offset=1,
    )

    assert result.status == "accepted"
    assert result.is_accepted is True
    assert result.is_duplicate is False

    ride = live_repo.get_ride(test_ids["ride_id"])
    assert ride is not None
    assert ride["status"] == "ride.requested"
    assert ride["rider_id"] == "RIDER-LIVE-001"
    assert ride["pickup_city"] == "Koramangala"
    assert ride["dropoff_city"] == "Indiranagar"
    assert Decimal(str(ride["estimated_fare"])) == Decimal("350.00")


def test_live_persist_duplicate_event_is_idempotent(live_repo, test_ids):
    """Test 2: Re-submitting the same event_id increments duplicates_ignored without error."""
    now = datetime.now(timezone.utc)
    req_payload = RideRequestedPayload(
        ride_id=test_ids["ride_id"],
        rider_id="RIDER-LIVE-001",
        pickup_city=BengaluruZone.KORAMANGALA,
        dropoff_city=BengaluruZone.INDIRANAGAR,
        fare_amount=Decimal("350.00"),
    )
    duplicate_event = RideEvent(
        event_id=test_ids["evt_req"],  # Same event ID
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=req_payload,
    )

    initial_dup_count = live_repo.get_counter("duplicates_ignored")
    result = live_repo.persist_event_and_projection(duplicate_event)

    assert result.status == "duplicate"
    assert result.is_duplicate is True
    assert live_repo.get_counter("duplicates_ignored") == initial_dup_count + 1


def test_live_monotonic_progression_and_coalesce_backfill(live_repo, test_ids):
    """Test 3: Advancing ride lifecycle from REQUESTED to STARTED updates state and backfills fields."""
    now = datetime.now(timezone.utc)
    started_payload = RideStartedPayload(
        ride_id=test_ids["ride_id"],
        driver_id="DRIVER-LIVE-88",
        start_odometer_km=Decimal("12050.50"),
    )
    started_event = RideEvent(
        event_id=test_ids["evt_start"],
        event_type=RideEventType.STARTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=started_payload,
    )

    result = live_repo.persist_event_and_projection(started_event)
    assert result.status == "accepted"

    ride = live_repo.get_ride(test_ids["ride_id"])
    assert ride is not None
    assert ride["status"] == "ride.started"
    assert ride["status_rank"] == 3
    assert ride["driver_id"] == "DRIVER-LIVE-88"
    assert ride["rider_id"] == "RIDER-LIVE-001"  # Preserved from previous REQUESTED event


def test_live_terminal_conflict_triggers_real_rollback(live_repo, test_ids):
    """Test 4: Terminal completed ride rejects cancellation, and rollback leaves processed_events clean."""
    now = datetime.now(timezone.utc)
    # 1. Complete the ride (terminal rank 4)
    completed_payload = RideCompletedPayload(
        ride_id=test_ids["ride_id"],
        driver_id="DRIVER-LIVE-88",
        fare_amount=Decimal("380.00"),
        distance_km=Decimal("9.20"),
        duration_seconds=1420,
    )
    completed_event = RideEvent(
        event_id=test_ids["evt_comp"],
        event_type=RideEventType.COMPLETED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=completed_payload,
    )
    res_completed = live_repo.persist_event_and_projection(completed_event)
    assert res_completed.status == "accepted"

    # 2. Attempt invalid CANCELLED on COMPLETED ride
    cancelled_payload = RideCancelledPayload(
        ride_id=test_ids["ride_id"],
        cancelled_by="rider",
        cancellation_reason="Driver never arrived",
        cancellation_fee=Decimal("0.00"),
    )
    conflict_event = RideEvent(
        event_id=test_ids["evt_conflict"],
        event_type=RideEventType.CANCELLED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=cancelled_payload,
    )

    res_conflict = live_repo.persist_event_and_projection(conflict_event)
    assert res_conflict.status == "conflict"
    assert res_conflict.has_conflict is True
    assert "Terminal conflict" in (res_conflict.conflict_reason or "")
    assert "ride.completed" in (res_conflict.conflict_reason or "")

    # Crucial real-engine verification: conflicted event was rolled back and NOT inserted into processed_events!
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM processed_events WHERE event_id = %s;",
                (test_ids["evt_conflict"],),
            )
            count = cur.fetchone()["count"]
            assert count == 0, "Conflicted event was not rolled back from processed_events!"


def test_live_dlq_quarantine_in_independent_transaction(live_repo, test_ids):
    """Test 5: Conflicted or invalid event is persisted in dead_letter_events."""
    dlq_id = live_repo.insert_dead_letter(
        event_id=test_ids["evt_conflict"],
        ride_id=test_ids["ride_id"],
        raw_payload={"raw": "conflicted-payload", "ride_id": test_ids["ride_id"]},
        error_reason="Terminal conflict: cannot cancel completed ride",
        source_partition=0,
        source_offset=4,
        source_topic="streamforge.rides.v1",
        failure_category="invalid_state_transition",
    )

    assert dlq_id.startswith("DLQ-")

    # Verify real record exists in database
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM dead_letter_events WHERE event_id = %s;",
                (test_ids["evt_conflict"],),
            )
            row = cur.fetchone()
            assert row is not None
            assert row["ride_id"] == test_ids["ride_id"]
            assert row["failure_category"] == "invalid_state_transition"
            assert "Terminal conflict" in row["failure_reason"]


# ---------------------------------------------------------------------
# Live PostgreSQL 16 Micro-Batch Tests
# ---------------------------------------------------------------------

def test_live_persist_events_batch_all_accepted(live_repo):
    """Live Test 6: Atomically persist a batch of 50 valid events to PostgreSQL."""
    now = datetime.now(timezone.utc)
    batch_uid = uuid.uuid4().hex[:8]
    items = []
    for i in range(50):
        ride_id = f"RIDE-LIVE-B1-{batch_uid}-{i:03d}"
        evt_id = f"EVT-LIVE-B1-{batch_uid}-{i:03d}"
        event = RideEvent(
            event_id=evt_id,
            event_type=RideEventType.REQUESTED,
            occurred_at=now,
            produced_at=now,
            producer="streamforge-live-test",
            payload=RideRequestedPayload(
                ride_id=ride_id,
                rider_id=f"RIDER-{i:03d}",
                pickup_city=BengaluruZone.KORAMANGALA,
                dropoff_city=BengaluruZone.INDIRANAGAR,
                fare_amount=Decimal("250.00"),
            ),
        )
        items.append(BatchItem(event=event, source_partition=0, source_offset=i))

    result = live_repo.persist_events_batch(items)

    assert result.accepted_count == 50
    assert result.duplicate_count == 0
    assert result.quarantined_count == 0
    assert len(result.item_results) == 50
    assert all(r.status == "accepted" for r in result.item_results)

    # Verify directly via PostgreSQL query
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM processed_events WHERE producer = 'streamforge-live-test' AND ride_id LIKE %s;",
                (f"RIDE-LIVE-B1-{batch_uid}-%",),
            )
            ev_count = cur.fetchone()["count"]
            assert ev_count == 50

            cur.execute(
                "SELECT COUNT(*) FROM rides WHERE ride_id LIKE %s AND status = 'ride.requested';",
                (f"RIDE-LIVE-B1-{batch_uid}-%",),
            )
            ride_count = cur.fetchone()["count"]
            assert ride_count == 50


def test_live_persist_events_batch_mixed_duplicates(live_repo):
    """Live Test 7: Batch containing 40 new and 10 duplicate events correctly ignores duplicates and updates counters."""
    now = datetime.now(timezone.utc)
    batch_uid = uuid.uuid4().hex[:8]
    initial_dups = live_repo.get_counter("duplicates_ignored")

    # Step 1: Pre-populate 10 events
    pre_items = []
    for i in range(10):
        ride_id = f"RIDE-LIVE-B2-{batch_uid}-{i:03d}"
        evt_id = f"EVT-LIVE-B2-{batch_uid}-{i:03d}"
        event = RideEvent(
            event_id=evt_id,
            event_type=RideEventType.REQUESTED,
            occurred_at=now,
            produced_at=now,
            producer="streamforge-live-test",
            payload=RideRequestedPayload(
                ride_id=ride_id,
                rider_id=f"RIDER-{i:03d}",
                pickup_city=BengaluruZone.HSR_LAYOUT,
                dropoff_city=BengaluruZone.WHITEFIELD,
                fare_amount=Decimal("300.00"),
            ),
        )
        pre_items.append(BatchItem(event=event, source_partition=0, source_offset=i))

    pre_res = live_repo.persist_events_batch(pre_items)
    assert pre_res.accepted_count == 10

    # Step 2: Create a batch with 40 new items + the 10 pre-existing items
    mixed_items = []
    # 40 new items (indices 10..49)
    for i in range(10, 50):
        ride_id = f"RIDE-LIVE-B2-{batch_uid}-{i:03d}"
        evt_id = f"EVT-LIVE-B2-{batch_uid}-{i:03d}"
        event = RideEvent(
            event_id=evt_id,
            event_type=RideEventType.REQUESTED,
            occurred_at=now,
            produced_at=now,
            producer="streamforge-live-test",
            payload=RideRequestedPayload(
                ride_id=ride_id,
                rider_id=f"RIDER-{i:03d}",
                pickup_city=BengaluruZone.HSR_LAYOUT,
                dropoff_city=BengaluruZone.WHITEFIELD,
                fare_amount=Decimal("300.00"),
            ),
        )
        mixed_items.append(BatchItem(event=event, source_partition=0, source_offset=i))
    # Add the 10 duplicates
    mixed_items.extend(pre_items)

    mixed_res = live_repo.persist_events_batch(mixed_items)

    assert mixed_res.accepted_count == 40
    assert mixed_res.duplicate_count == 10
    assert mixed_res.quarantined_count == 0

    new_dups = live_repo.get_counter("duplicates_ignored")
    assert new_dups - initial_dups == 10


def test_live_persist_events_batch_terminal_conflict_isolated_to_dlq(live_repo):
    """Live Test 8: Conflicted item rolls back savepoint and writes to DLQ; valid item commits."""
    now = datetime.now(timezone.utc)
    batch_uid = uuid.uuid4().hex[:8]

    # Pre-condition: Create a completed ride
    ride_completed_id = f"RIDE-LIVE-B3-COMPLETED-{batch_uid}"
    evt_req = RideEvent(
        event_id=f"EVT-LIVE-B3-REQ-{batch_uid}",
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=RideRequestedPayload(
            ride_id=ride_completed_id,
            rider_id="RIDER-COMP",
            pickup_city=BengaluruZone.ELECTRONIC_CITY,
            dropoff_city=BengaluruZone.MARATHAHALLI,
            fare_amount=Decimal("180.00"),
        ),
    )
    evt_comp = RideEvent(
        event_id=f"EVT-LIVE-B3-COMP-{batch_uid}",
        event_type=RideEventType.COMPLETED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=RideCompletedPayload(
            ride_id=ride_completed_id,
            driver_id="DRIVER-LIVE-01",
            fare_amount=Decimal("180.00"),
            distance_km=Decimal("7.20"),
            duration_seconds=840,
        ),
    )
    live_repo.persist_event_and_projection(evt_req)
    live_repo.persist_event_and_projection(evt_comp)

    # Batch with:
    # 1. Valid new ride
    # 2. Invalid cancel on completed ride
    ride_valid_id = f"RIDE-LIVE-B3-VALID-{batch_uid}"
    evt_valid = RideEvent(
        event_id=f"EVT-LIVE-B3-VALID-{batch_uid}",
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=RideRequestedPayload(
            ride_id=ride_valid_id,
            rider_id="RIDER-VALID",
            pickup_city=BengaluruZone.KORAMANGALA,
            dropoff_city=BengaluruZone.WHITEFIELD,
            fare_amount=Decimal("400.00"),
        ),
    )
    evt_conflicted_id = f"EVT-LIVE-B3-CONF-{batch_uid}"
    evt_conflict = RideEvent(
        event_id=evt_conflicted_id,
        event_type=RideEventType.CANCELLED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-live-test",
        payload=RideCancelledPayload(
            ride_id=ride_completed_id,
            cancelled_by="rider",
            cancellation_reason="Late cancellation",
        ),
    )

    items = [
        BatchItem(event=evt_valid, source_partition=1, source_offset=50),
        BatchItem(event=evt_conflict, source_partition=1, source_offset=51),
    ]

    result = live_repo.persist_events_batch(items)

    assert result.accepted_count == 1
    assert result.duplicate_count == 0
    assert result.quarantined_count == 1

    assert result.item_results[0].status == "accepted"
    assert result.item_results[1].status == "quarantined"
    dlq_id = result.item_results[1].dlq_id
    assert dlq_id.startswith("DLQ-")

    # DB Checks:
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            # Valid event persisted
            cur.execute("SELECT COUNT(*) FROM processed_events WHERE event_id = %s;", (evt_valid.event_id,))
            assert cur.fetchone()["count"] == 1
            cur.execute("SELECT status FROM rides WHERE ride_id = %s;", (ride_valid_id,))
            assert cur.fetchone()["status"] == "ride.requested"

            # Conflicted event rolled back from processed_events!
            cur.execute("SELECT COUNT(*) FROM processed_events WHERE event_id = %s;", (evt_conflicted_id,))
            assert cur.fetchone()["count"] == 0

            # Conflicted event committed to dead_letter_events!
            cur.execute("SELECT * FROM dead_letter_events WHERE event_id = %s;", (evt_conflicted_id,))
            dlq_row = cur.fetchone()
            assert dlq_row is not None
            assert dlq_row["failure_category"] == "invalid_state_transition"
            assert "Terminal conflict" in dlq_row["failure_reason"]


def test_live_persist_events_batch_empty_short_circuit(live_repo):
    """Live Test 9: Empty batch returns empty result immediately."""
    result = live_repo.persist_events_batch([])
    assert result.accepted_count == 0
    assert result.duplicate_count == 0
    assert result.quarantined_count == 0
    assert result.item_results == []
