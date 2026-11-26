"""
StreamForge — Unit Test Suite for Pydantic Event Schemas
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & RULES.md
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pydantic import ValidationError

from streamforge.events import (
    BengaluruZone,
    RideEventType,
    RideLifecycleRank,
    RideEvent,
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)


def make_utc_now():
    return datetime.now(timezone.utc)


def test_valid_ride_requested_event():
    """Verify that a valid RideRequested event initializes, validates, and serializes properly."""
    now = make_utc_now()
    payload = RideRequestedPayload(
        ride_id="RIDE-00129",
        rider_id="usr_10928",
        pickup_city=BengaluruZone.KORAMANGALA,
        dropoff_city=BengaluruZone.INDIRANAGAR,
        fare_amount=Decimal("245.50"),
    )

    event = RideEvent(
        event_id="EVT-94281",
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now + timedelta(milliseconds=120),
        producer="streamforge-test",
        payload=payload,
    )

    assert event.event_id == "EVT-94281"
    assert event.ride_id == "RIDE-00129"
    assert event.event_type == RideEventType.REQUESTED
    assert event.lifecycle_rank == 1
    assert event.payload.pickup_city == BengaluruZone.KORAMANGALA
    assert event.payload.dropoff_city == BengaluruZone.INDIRANAGAR
    assert event.payload.fare_amount == Decimal("245.50")

    # Verify JSON serialization
    kafka_dict = event.to_kafka_dict()
    assert kafka_dict["event_id"] == "EVT-94281"
    assert kafka_dict["payload"]["pickup_city"] == "Koramangala"
    assert kafka_dict["payload"]["fare_amount"] == "245.50"


def test_pickup_and_dropoff_must_differ():
    """Verify that intra-zone hops (pickup == dropoff) are rejected with a clear ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        RideRequestedPayload(
            ride_id="RIDE-00129",
            rider_id="usr_10928",
            pickup_city=BengaluruZone.HSR_LAYOUT,
            dropoff_city=BengaluruZone.HSR_LAYOUT,
            fare_amount=Decimal("150.00"),
        )
    assert "Pickup and dropoff zones must differ" in str(exc_info.value)


def test_invalid_bengaluru_zone_rejected():
    """Verify that zones outside the 10 approved Bengaluru zones are rejected."""
    with pytest.raises(ValidationError):
        RideRequestedPayload(
            ride_id="RIDE-00129",
            rider_id="usr_10928",
            pickup_city="Downtown Manhattan",  # Invalid
            dropoff_city=BengaluruZone.WHITEFIELD,
            fare_amount=Decimal("200.00"),
        )


def test_produced_at_cannot_precede_occurred_at():
    """Verify that emission time before occurrence time is rejected per ADR 0001 timestamp rules."""
    now = make_utc_now()
    payload = RideAcceptedPayload(ride_id="RIDE-00129", driver_id="drv_9921", eta_minutes=5)

    with pytest.raises(ValidationError) as exc_info:
        RideEvent(
            event_id="EVT-94282",
            event_type=RideEventType.ACCEPTED,
            occurred_at=now,
            produced_at=now - timedelta(seconds=10),  # Earlier than occurred_at!
            producer="streamforge-test",
            payload=payload,
        )
    assert "cannot be earlier than occurred_at" in str(exc_info.value)


def test_naive_timestamp_rejected():
    """Verify that naive datetimes lacking tzinfo are rejected per RULES.md strict UTC rule."""
    naive_dt = datetime(2026, 11, 17, 10, 30, 0)  # No tzinfo
    payload = RideAcceptedPayload(ride_id="RIDE-00129", driver_id="drv_9921", eta_minutes=5)

    with pytest.raises(ValidationError) as exc_info:
        RideEvent(
            event_id="EVT-94282",
            event_type=RideEventType.ACCEPTED,
            occurred_at=naive_dt,
            produced_at=naive_dt,
            producer="streamforge-test",
            payload=payload,
        )
    assert "Timestamps must be timezone-aware (UTC)" in str(exc_info.value)


def test_payload_type_mismatch_rejected():
    """Verify that providing a payload mismatched with event_type is rejected."""
    now = make_utc_now()
    payload = RideCompletedPayload(
        ride_id="RIDE-00129",
        driver_id="drv_9921",
        fare_amount=Decimal("310.00"),
        distance_km=Decimal("12.40"),
        duration_seconds=1420,
    )

    # Attempting to assign completed payload to a ride_started event
    with pytest.raises(ValidationError) as exc_info:
        RideEvent(
            event_id="EVT-94283",
            event_type=RideEventType.STARTED,  # Expects RideStartedPayload
            occurred_at=now,
            produced_at=now,
            producer="streamforge-test",
            payload=payload,
        )
    assert "Payload type mismatch" in str(exc_info.value)


def test_lifecycle_rank_progression():
    """Verify that lifecycle ranks follow ADR 0001 (Decision 5) ordering."""
    assert RideLifecycleRank.from_event_type(RideEventType.REQUESTED) == 1
    assert RideLifecycleRank.from_event_type(RideEventType.ACCEPTED) == 2
    assert RideLifecycleRank.from_event_type(RideEventType.STARTED) == 3
    assert RideLifecycleRank.from_event_type(RideEventType.COMPLETED) == 4
    assert RideLifecycleRank.from_event_type(RideEventType.CANCELLED) == 4


def test_monetary_decimal_precision():
    """Verify that monetary amounts preserve exact 2-decimal precision without float drift."""
    payload = RideCancelledPayload(
        ride_id="RIDE-00129",
        cancelled_by="rider",
        cancellation_reason="Driver taking too long",
        cancellation_fee=Decimal("45.50"),
    )
    assert payload.cancellation_fee == Decimal("45.50")
    assert str(payload.cancellation_fee) == "45.50"
