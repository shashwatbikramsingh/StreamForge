"""
Unit tests for StreamForge Canonical Event Generator.
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & PRD v1.0

Verifies all generator acceptance criteria:
1. Generator produces valid RideEvent objects.
2. Event IDs and Ride IDs are 100% reproducible with seed.
3. Ride IDs remain consistent across lifecycle events.
4. Only the ten approved Bengaluru zones are generated.
5. Money uses Decimal, serialized as a decimal string.
6. Event names follow the approved naming convention (ride.requested, etc.).
7. Invalid generated events are detected on schema validation.
8. Lifecycle ranks advance monotonically (1 -> 2 -> 3 -> 4).
9. Configurable event count produces exact number of events.
10. Controlled duplicate event injection re-uses existing event IDs.
11. Controlled malformed event injection emits raw invalid records for DLQ testing.
"""

import time
from decimal import Decimal
import pytest
from pydantic import ValidationError

from streamforge.producer.generator import RideEventGenerator
from streamforge.events.schemas import RideEvent, RideEventType
from streamforge.events.geography import BengaluruZone


@pytest.fixture
def generator():
    return RideEventGenerator(seed=42)


def test_generator_produces_valid_ride_events(generator):
    """Criterion 1: Generator produces valid RideEvent objects."""
    event, distance = generator.generate_ride_requested()
    assert isinstance(event, RideEvent)
    assert distance > 0

    # Ensure model validation passes on serialized dict
    dumped = event.model_dump(mode="json")
    revalidated = RideEvent.model_validate(dumped)
    assert revalidated.event_id == event.event_id


def test_event_and_ride_ids_reproducible_with_seed():
    """Criterion 2: Seed makes both event_id and ride_id sequences 100% deterministic."""
    gen1 = RideEventGenerator(seed=12345)
    gen2 = RideEventGenerator(seed=12345)

    events1 = [gen1.generate_ride_requested()[0] for _ in range(10)]
    events2 = [gen2.generate_ride_requested()[0] for _ in range(10)]

    for e1, e2 in zip(events1, events2):
        assert e1.event_id == e2.event_id
        assert e1.ride_id == e2.ride_id
        assert e1.payload.pickup_city == e2.payload.pickup_city
        assert e1.payload.fare_amount == e2.payload.fare_amount


def test_ride_ids_consistent_across_lifecycle(generator):
    """Criterion 3: Ride IDs remain consistent across lifecycle events."""
    trace = generator.generate_full_ride_lifecycle(ride_id="RIDE-TRACE-999")
    assert len(trace) >= 2

    # Every event must have the exact same ride_id in envelope and payload
    for evt in trace:
        assert evt.ride_id == "RIDE-TRACE-999"
        assert evt.payload.ride_id == "RIDE-TRACE-999"


def test_only_approved_bengaluru_zones_generated(generator):
    """Criterion 4: Only the ten approved Bengaluru zones are generated."""
    valid_zone_values = BengaluruZone.list_zones()

    for _ in range(30):
        event, _ = generator.generate_ride_requested()
        assert event.payload.pickup_city.value in valid_zone_values
        assert event.payload.dropoff_city.value in valid_zone_values
        assert event.payload.pickup_city != event.payload.dropoff_city


def test_money_uses_decimal_and_serializes_as_decimal_string(generator):
    """Criterion 5: Money uses Decimal and serializes as a decimal string."""
    event, _ = generator.generate_ride_requested()
    assert isinstance(event.payload.fare_amount, Decimal)
    assert event.payload.fare_amount > 0

    dumped = event.model_dump(mode="json")
    assert isinstance(dumped["payload"]["fare_amount"], str)
    parts = dumped["payload"]["fare_amount"].split(".")
    assert len(parts) == 2
    assert len(parts[1]) == 2


def test_event_names_follow_approved_convention(generator):
    """Criterion 6: Event names follow approved dot-notation naming."""
    trace = generator.generate_full_ride_lifecycle(simulate_cancellation=False)
    assert trace[0].event_type.value == "ride.requested"
    assert trace[1].event_type.value == "ride.accepted"
    assert trace[2].event_type.value == "ride.started"
    assert trace[3].event_type.value == "ride.completed"


def test_invalid_generated_events_detected(generator):
    """Criterion 7: Tampered or invalid generated events are caught by Pydantic."""
    event, _ = generator.generate_ride_requested()
    dumped = event.model_dump(mode="json")

    dumped["payload"]["pickup_city"] = "Bellandur"
    with pytest.raises(ValidationError):
        RideEvent.model_validate(dumped)


def test_monotonic_rank_progression(generator):
    """Criterion 8: Monotonic lifecycle rank progression (1 -> 2 -> 3 -> 4)."""
    trace = generator.generate_full_ride_lifecycle(simulate_cancellation=False)
    ranks = [e.lifecycle_rank for e in trace]
    assert ranks == [1, 2, 3, 4]

    cancel_trace = generator.generate_full_ride_lifecycle(simulate_cancellation=True)
    assert cancel_trace[-1].lifecycle_rank == 4
    assert cancel_trace[-1].event_type == RideEventType.CANCELLED


def test_configurable_count_and_rate():
    """Criterion 9: Configurable event count produces exact number of events with rate pacing."""
    gen = RideEventGenerator(seed=999)
    start_time = time.time()
    events = list(gen.generate_events(count=5, rate_per_sec=50.0))
    elapsed = time.time() - start_time

    assert len(events) == 5
    assert all(isinstance(e, RideEvent) for e in events)
    assert elapsed >= 0.05  # At 50 eps, 5 items require ~0.08s of pacing


def test_controlled_duplicate_event_injection():
    """Criterion 10: Controlled duplicate injection generates repeated event_ids."""
    gen = RideEventGenerator(seed=777, duplicate_rate=1.0)
    # Prime generator with one event
    e1, _ = gen.generate_ride_requested()
    # Next generation with duplicate_rate=1.0 MUST reuse e1's event_id
    e2, _ = gen.generate_ride_requested()

    assert e1.event_id == e2.event_id


def test_controlled_malformed_event_injection():
    """Criterion 11: Controlled malformed injection produces raw invalid dictionaries for DLQ testing."""
    gen = RideEventGenerator(seed=888, malformed_rate=1.0)
    records = list(gen.generate_events(count=3))

    assert len(records) == 3
    for rec in records:
        assert isinstance(rec, dict)
        assert rec["event_type"] == "malformed.corrupted"
        assert rec["payload"]["corrupted"] is True
