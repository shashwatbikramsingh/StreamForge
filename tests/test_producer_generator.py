"""
StreamForge — Unit Tests for Synthetic Ride Event Generator
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & RULES.md
"""

import pytest
from datetime import datetime, timezone

from streamforge.producer.generator import RideEventGenerator
from streamforge.events.schemas import RideEventType


def test_generate_ride_requested_valid():
    """Verify that RideEventGenerator produces a valid RideRequested event with distinct zones."""
    gen = RideEventGenerator(seed=42)
    event, distance = gen.generate_ride_requested()

    assert event.event_type == RideEventType.REQUESTED
    assert event.event_id.startswith("EVT-")
    assert event.ride_id.startswith("RIDE-")
    assert event.payload.pickup_zone != event.payload.dropoff_zone
    assert event.payload.estimated_fare > 0
    assert distance > 0
    assert event.produced_at >= event.occurred_at


def test_generate_full_ride_lifecycle_success():
    """Verify a complete 4-stage lifecycle trace has strictly ascending ranks: 1 -> 2 -> 3 -> 4."""
    gen = RideEventGenerator(seed=101)
    trace = gen.generate_full_ride_lifecycle(simulate_cancellation=False)

    assert len(trace) == 4
    assert trace[0].event_type == RideEventType.REQUESTED
    assert trace[1].event_type == RideEventType.ACCEPTED
    assert trace[2].event_type == RideEventType.STARTED
    assert trace[3].event_type == RideEventType.COMPLETED

    # Check rank ordering
    ranks = [e.lifecycle_rank for e in trace]
    assert ranks == [1, 2, 3, 4]

    # Check timestamps advance monotonically
    for i in range(len(trace) - 1):
        assert trace[i + 1].occurred_at >= trace[i].occurred_at


def test_generate_lifecycle_cancellation():
    """Verify that a cancelled ride trace terminates with CANCELLED (rank 4)."""
    gen = RideEventGenerator(seed=202)
    trace = gen.generate_full_ride_lifecycle(simulate_cancellation=True)

    assert trace[-1].event_type == RideEventType.CANCELLED
    assert trace[-1].lifecycle_rank == 4
