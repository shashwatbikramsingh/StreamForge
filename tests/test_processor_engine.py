"""
StreamForge — Unit Tests for Stream Processor Engine
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 3, 4, 5)
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)
from streamforge.events.geography import BengaluruZone
from streamforge.storage.repository import InMemoryRepository
from streamforge.processor.engine import StreamProcessor


def test_process_valid_event():
    """Verify that a valid raw event dictionary is accepted and records positive latency."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)
    now = datetime.now(timezone.utc)

    raw_event = {
        "event_id": "EVT-PROC-01",
        "ride_id": "RIDE-PROC-01",
        "event_type": "ride_requested",
        "occurred_at": now.isoformat(),
        "produced_at": (now + timedelta(milliseconds=45)).isoformat(),
        "payload": {
            "rider_id": "usr_9921",
            "pickup_zone": "Koramangala",
            "dropoff_zone": "Indiranagar",
            "estimated_fare": "210.00",
            "surge_multiplier": "1.00",
        },
    }

    result = processor.process_raw_message(raw_event, source_partition=1, source_offset=100)
    assert result.status == "accepted"
    assert result.event_id == "EVT-PROC-01"
    assert result.ride_id == "RIDE-PROC-01"
    assert result.latency_ms >= 0.0
    assert repo.get_ride("RIDE-PROC-01")["status"] == "ride_requested"


def test_process_duplicate_event():
    """Verify that a replayed duplicate event returns status 'duplicate' and increments duplicates_ignored."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)
    now = datetime.now(timezone.utc)

    raw_event = {
        "event_id": "EVT-DUP-01",
        "ride_id": "RIDE-DUP-01",
        "event_type": "ride_requested",
        "occurred_at": now.isoformat(),
        "produced_at": now.isoformat(),
        "payload": {
            "rider_id": "usr_9921",
            "pickup_zone": "Whitefield",
            "dropoff_zone": "Electronic City",
            "estimated_fare": "450.00",
            "surge_multiplier": "1.00",
        },
    }

    res1 = processor.process_raw_message(raw_event)
    assert res1.status == "accepted"

    res2 = processor.process_raw_message(raw_event)
    assert res2.status == "duplicate"
    assert repo.get_counter("duplicates_ignored") == 1


def test_process_malformed_event_quarantine():
    """Verify that invalid schema payloads are quarantined to DLQ."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)

    malformed = {
        "event_id": "EVT-BAD-SCHEMA",
        "ride_id": "RIDE-BAD-01",
        "event_type": "ride_requested",
        # Missing required occurred_at, produced_at, and payload fields
    }

    result = processor.process_raw_message(malformed, source_partition=0, source_offset=50)
    assert result.status == "quarantined"
    assert "SchemaValidationError" in result.error_reason
    assert result.dlq_id is not None
    assert len(repo.dead_letter_events) == 1


def test_process_terminal_conflict_quarantine():
    """Verify that CANCELLED arriving after COMPLETED is quarantined with invalid_state_transition."""
    repo = InMemoryRepository()
    processor = StreamProcessor(repository=repo)
    now = datetime.now(timezone.utc)
    ride_id = "RIDE-TERM-CONFLICT"

    # 1. Complete ride
    comp_event = {
        "event_id": "EVT-C-01",
        "ride_id": ride_id,
        "event_type": "ride_completed",
        "occurred_at": now.isoformat(),
        "produced_at": now.isoformat(),
        "payload": {
            "driver_id": "drv_11",
            "final_fare": "300.00",
            "distance_km": "9.50",
            "duration_seconds": 1200,
        },
    }
    r1 = processor.process_raw_message(comp_event)
    assert r1.status == "accepted"

    # 2. Incoming CANCELLED for completed ride
    canc_event = {
        "event_id": "EVT-CANC-99",
        "ride_id": ride_id,
        "event_type": "ride_cancelled",
        "occurred_at": (now + timedelta(seconds=10)).isoformat(),
        "produced_at": (now + timedelta(seconds=10)).isoformat(),
        "payload": {
            "cancelled_by": "rider",
            "cancellation_reason": "Late request",
            "cancellation_fee": "0.00",
        },
    }
    r2 = processor.process_raw_message(canc_event)
    assert r2.status == "quarantined"
    assert "invalid_state_transition" in r2.error_reason
    assert len(repo.dead_letter_events) == 1
