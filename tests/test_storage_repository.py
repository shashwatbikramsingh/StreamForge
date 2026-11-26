"""
StreamForge — Unit Tests for Storage Layer Repository
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 3, 5, 6)
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)
from streamforge.events.geography import BengaluruZone
from streamforge.storage.repository import InMemoryRepository


def test_idempotent_event_insertion():
    """Verify that replaying duplicate event_id is rejected and increments duplicates_ignored counter."""
    repo = InMemoryRepository()
    now = datetime.now(timezone.utc)
    event = RideEvent(
        event_id="EVT-IDEM-001",
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=RideRequestedPayload(
            ride_id="RIDE-IDEM-001",
            rider_id="usr_110",
            pickup_city=BengaluruZone.KORAMANGALA,
            dropoff_city=BengaluruZone.INDIRANAGAR,
            fare_amount=Decimal("190.00"),
        ),
    )

    # First insert: success
    assert repo.insert_processed_event(event) is True
    assert repo.get_counter("duplicates_ignored") == 0

    # Replay identical event_id: idempotent pass, increments duplicates_ignored
    assert repo.insert_processed_event(event) is False
    assert repo.get_counter("duplicates_ignored") == 1


def test_monotonic_projection_and_coalesce_backfill():
    """Verify that out-of-order earlier events backfill metadata without regressing state."""
    repo = InMemoryRepository()
    now = datetime.now(timezone.utc)
    ride_id = "RIDE-BACKFILL-002"

    # 1. Event 3: STARTED arrives first (due to network reordering)
    evt_started = RideEvent(
        event_id="EVT-003",
        event_type=RideEventType.STARTED,
        occurred_at=now + timedelta(minutes=5),
        produced_at=now + timedelta(minutes=5),
        producer="streamforge-test",
        payload=RideStartedPayload(
            ride_id=ride_id,
            driver_id="drv_9921",
            start_odometer_km=Decimal("15000.00"),
        ),
    )
    ok, err = repo.upsert_ride_projection(evt_started)
    assert ok is True
    assert err is None
    assert repo.get_ride(ride_id)["status"] == "ride.started"
    assert repo.get_ride(ride_id)["current_rank"] == 3

    # 2. Delayed Event 1: REQUESTED arrives late
    evt_requested = RideEvent(
        event_id="EVT-001",
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=RideRequestedPayload(
            ride_id=ride_id,
            rider_id="usr_999",
            pickup_city=BengaluruZone.WHITEFIELD,
            dropoff_city=BengaluruZone.MG_ROAD,
            fare_amount=Decimal("350.00"),
        ),
    )
    ok, err = repo.upsert_ride_projection(evt_requested)
    assert ok is True
    assert err is None

    # Status must NOT have regressed to ride.requested!
    ride = repo.get_ride(ride_id)
    assert ride["status"] == "ride.started"
    assert ride["current_rank"] == 3
    # Metadata backfilled via COALESCE
    assert ride["rider_id"] == "usr_999"
    assert ride["pickup_zone"] == "Whitefield"
    assert ride["dropoff_zone"] == "MG Road"


def test_terminal_conflict_rejected():
    """Verify that a CANCELLED event for an already COMPLETED ride is rejected per ADR 0001 (Decision 5)."""
    repo = InMemoryRepository()
    now = datetime.now(timezone.utc)
    ride_id = "RIDE-TERM-003"

    # Complete the ride (rank 4)
    evt_completed = RideEvent(
        event_id="EVT-COMP-01",
        event_type=RideEventType.COMPLETED,
        occurred_at=now + timedelta(minutes=20),
        produced_at=now + timedelta(minutes=20),
        producer="streamforge-test",
        payload=RideCompletedPayload(
            ride_id=ride_id,
            driver_id="drv_123",
            fare_amount=Decimal("280.00"),
            distance_km=Decimal("8.50"),
            duration_seconds=950,
        ),
    )
    ok, err = repo.upsert_ride_projection(evt_completed)
    assert ok is True

    # Incoming CANCELLED event for the same ride
    evt_cancelled = RideEvent(
        event_id="EVT-CANC-01",
        event_type=RideEventType.CANCELLED,
        occurred_at=now + timedelta(minutes=21),
        produced_at=now + timedelta(minutes=21),
        producer="streamforge-test",
        payload=RideCancelledPayload(
            ride_id=ride_id,
            cancelled_by="rider",
            cancellation_reason="Changed mind",
        ),
    )
    ok, err = repo.upsert_ride_projection(evt_cancelled)
    assert ok is False
    assert "Terminal conflict" in err


def test_dead_letter_quarantine():
    """Verify that events are written to dead_letter_events cleanly."""
    repo = InMemoryRepository()
    dlq_id = repo.insert_dead_letter(
        event_id="EVT-BAD-01",
        ride_id="RIDE-BAD-01",
        raw_payload={"corrupted": True},
        error_reason="invalid_state_transition",
        source_partition=2,
        source_offset=48102,
    )
    assert dlq_id.startswith("DLQ-")
    assert repo.dead_letter_events[dlq_id]["error_reason"] == "invalid_state_transition"
    assert repo.dead_letter_events[dlq_id]["source_partition"] == 2
