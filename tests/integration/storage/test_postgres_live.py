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
