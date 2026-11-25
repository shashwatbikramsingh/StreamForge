"""
Unit tests for StreamForge Pydantic Event Schemas.
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & PRD v1.0

Tests all 10 schema invariants:
1. Valid ride event accepted.
2. Decimal amount serialized as a string.
3. Identical pickup/dropoff rejected.
4. Unapproved geography rejected.
5. Float money input rejected.
6. Unsupported schema version rejected.
7. Naive timestamps rejected.
8. Invalid timestamp ordering rejected.
9. Unexpected payload fields rejected.
10. Event/payload mismatch rejected.
"""

from copy import deepcopy
from decimal import Decimal
import pytest
from pydantic import ValidationError

from streamforge.events.schemas import RideEvent, RideRequestedPayload


@pytest.fixture
def valid_event():
    return {
        "event_id": "evt_001",
        "event_type": "ride.requested",
        "schema_version": 1,
        "occurred_at": "2026-11-26T10:00:00Z",
        "produced_at": "2026-11-26T10:00:01Z",
        "producer": "streamforge-generator",
        "payload": {
            "ride_id": "ride_001",
            "rider_id": "synthetic-rider-42",
            "driver_id": None,
            "pickup_city": "Koramangala",
            "dropoff_city": "Electronic City",
            "fare_amount": "250.00",
            "currency": "INR",
        },
    }


def test_valid_ride_requested_event(valid_event):
    """Criterion 1: Valid ride event accepted."""
    event = RideEvent.model_validate(valid_event)
    assert event.event_type.value == "ride.requested"
    assert event.payload.ride_id == "ride_001"
    assert event.payload.fare_amount.as_tuple().exponent == -2
    assert event.payload.fare_amount == Decimal("250.00")
    assert event.ride_id == "ride_001"


def test_decimal_amount_serialized_as_string(valid_event):
    """Criterion 2: Decimal amount serialized as a string in JSON dump."""
    event = RideEvent.model_validate(valid_event)
    dumped = event.model_dump(mode="json")
    assert isinstance(dumped["payload"]["fare_amount"], str)
    assert dumped["payload"]["fare_amount"] == "250.00"


def test_identical_pickup_dropoff_rejected(valid_event):
    """Criterion 3: Identical pickup and dropoff rejected."""
    bad_event = deepcopy(valid_event)
    bad_event["payload"]["dropoff_city"] = "Koramangala"

    with pytest.raises(ValidationError) as exc_info:
        RideEvent.model_validate(bad_event)
    assert "Pickup and dropoff zones must differ" in str(exc_info.value)


def test_unapproved_geography_rejected(valid_event):
    """Criterion 4: Unapproved geography rejected."""
    bad_event = deepcopy(valid_event)
    bad_event["payload"]["pickup_city"] = "Bellandur"  # Not among 10 approved zones

    with pytest.raises(ValidationError):
        RideEvent.model_validate(bad_event)


def test_float_money_input_rejected(valid_event):
    """Criterion 5: Float money input rejected to prevent precision errors."""
    bad_event = deepcopy(valid_event)
    bad_event["payload"]["fare_amount"] = 250.00  # float

    with pytest.raises(ValidationError) as exc_info:
        RideEvent.model_validate(bad_event)
    assert "Money must be provided as a decimal string or Decimal" in str(exc_info.value)

    # Integer also rejected per PRD
    bad_event["payload"]["fare_amount"] = 250
    with pytest.raises(ValidationError):
        RideEvent.model_validate(bad_event)


def test_unsupported_schema_version_rejected(valid_event):
    """Criterion 6: Unsupported schema version rejected."""
    bad_event = deepcopy(valid_event)
    bad_event["schema_version"] = 2

    with pytest.raises(ValidationError):
        RideEvent.model_validate(bad_event)


def test_naive_timestamps_rejected(valid_event):
    """Criterion 7: Naive timestamps rejected; UTC required."""
    bad_event = deepcopy(valid_event)
    bad_event["occurred_at"] = "2026-11-26T10:00:00"  # Missing timezone

    with pytest.raises(ValidationError) as exc_info:
        RideEvent.model_validate(bad_event)
    assert "Timestamps must be timezone-aware (UTC)" in str(exc_info.value)


def test_invalid_timestamp_ordering_rejected(valid_event):
    """Criterion 8: Invalid timestamp ordering rejected (produced_at < occurred_at)."""
    bad_event = deepcopy(valid_event)
    bad_event["produced_at"] = "2026-11-26T09:59:59Z"

    with pytest.raises(ValidationError) as exc_info:
        RideEvent.model_validate(bad_event)
    assert "cannot be earlier than occurred_at" in str(exc_info.value)


def test_unexpected_payload_fields_rejected(valid_event):
    """Criterion 9: Unexpected payload fields rejected (ConfigDict(extra='forbid'))."""
    bad_event = deepcopy(valid_event)
    bad_event["payload"]["unexpected_injected_field"] = "malicious_data"

    with pytest.raises(ValidationError):
        RideEvent.model_validate(bad_event)

    # Extra envelope fields also rejected
    bad_envelope = deepcopy(valid_event)
    bad_envelope["unexpected_header"] = "extra"
    with pytest.raises(ValidationError):
        RideEvent.model_validate(bad_envelope)


def test_event_payload_mismatch_rejected(valid_event):
    """Criterion 10: Event and payload type mismatch rejected."""
    bad_event = deepcopy(valid_event)
    bad_event["event_type"] = "ride.accepted"
    # payload is still RideRequestedPayload, which doesn't match ride.accepted

    with pytest.raises(ValidationError) as exc_info:
        RideEvent.model_validate(bad_event)
    assert "Payload type mismatch" in str(exc_info.value)
