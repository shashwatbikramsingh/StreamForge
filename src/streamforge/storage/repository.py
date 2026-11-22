"""
StreamForge — PostgreSQL & In-Memory Event Repository
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 3, 5, 6) & database.md

Implements:
1. processed_events: Immutable append-only log with unique constraint on event_id.
2. rides: Monotonic lifecycle projection using COALESCE backfill (no status downgrades).
3. dead_letter_events: Primary and sole durable DLQ destination for invalid/conflicted events.
4. pipeline_counters: Durable transactional counters (duplicates_ignored, transient_retries).
"""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple

from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideLifecycleRank,
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)

logger = logging.getLogger(__name__)


class EventRepository(ABC):
    """Abstract interface for StreamForge storage repository."""

    @abstractmethod
    def insert_processed_event(self, event: RideEvent, ingested_at: Optional[datetime] = None) -> bool:
        """Insert event immutably. Returns True if inserted, False if duplicate."""
        pass

    @abstractmethod
    def upsert_ride_projection(self, event: RideEvent) -> Tuple[bool, Optional[str]]:
        """
        Update stateful ride projection monotonically.
        Returns (success: bool, conflict_reason: Optional[str]).
        """
        pass

    @abstractmethod
    def insert_dead_letter(
        self,
        event_id: str,
        ride_id: str,
        raw_payload: Dict[str, Any],
        error_reason: str,
        source_partition: int = 0,
        source_offset: int = 0,
    ) -> str:
        """Store quarantined event into dead_letter_events. Returns quarantine record ID."""
        pass

    @abstractmethod
    def increment_counter(self, counter_name: str, delta: int = 1) -> int:
        """Increment durable pipeline counter transactionally."""
        pass

    @abstractmethod
    def get_counter(self, counter_name: str) -> int:
        """Retrieve counter value."""
        pass

    @abstractmethod
    def get_ride(self, ride_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve current projected ride state."""
        pass


class InMemoryRepository(EventRepository):
    """
    High-performance in-memory repository conforming strictly to PostgreSQL schema contracts.
    Used for rapid unit/integration testing and standalone dry-run verification.
    """

    def __init__(self):
        self.processed_events: Dict[str, Dict[str, Any]] = {}  # PK: event_id
        self.rides: Dict[str, Dict[str, Any]] = {}             # PK: ride_id
        self.dead_letter_events: Dict[str, Dict[str, Any]] = {}# PK: dlq_id
        self.pipeline_counters: Dict[str, int] = {
            "duplicates_ignored": 0,
            "transient_retries": 0,
        }

    def insert_processed_event(self, event: RideEvent, ingested_at: Optional[datetime] = None) -> bool:
        """
        Implements: INSERT INTO processed_events (...) ON CONFLICT (event_id) DO NOTHING.
        Returns True if newly inserted, False if duplicate.
        """
        if event.event_id in self.processed_events:
            self.increment_counter("duplicates_ignored")
            return False

        ingest_time = ingested_at or datetime.now(timezone.utc)
        self.processed_events[event.event_id] = {
            "event_id": event.event_id,
            "ride_id": event.ride_id,
            "event_type": event.event_type.value,
            "occurred_at": event.occurred_at,
            "produced_at": event.produced_at,
            "ingested_at": ingest_time,
            "payload": event.payload.model_dump(mode="json"),
        }
        return True

    def upsert_ride_projection(self, event: RideEvent) -> Tuple[bool, Optional[str]]:
        """
        Implements: Monotonic ride state machine projection per ADR 0001 (Decision 5).
        - Ranks: REQUESTED(1) -> ACCEPTED(2) -> STARTED(3) -> COMPLETED(4) / CANCELLED(4).
        - Terminal conflict: COMPLETED <-> CANCELLED transitions are rejected.
        - Late earlier events backfill missing timestamps via COALESCE without state regression.
        """
        incoming_rank = event.lifecycle_rank
        existing = self.rides.get(event.ride_id)

        if existing is None:
            # First event observed for this ride
            record = {
                "ride_id": event.ride_id,
                "status": event.event_type.value,
                "current_rank": incoming_rank,
                "rider_id": None,
                "driver_id": None,
                "pickup_zone": None,
                "dropoff_zone": None,
                "estimated_fare": None,
                "final_fare": None,
                "requested_at": None,
                "accepted_at": None,
                "started_at": None,
                "completed_at": None,
                "cancelled_at": None,
            }
            self._apply_payload_fields(record, event)
            self.rides[event.ride_id] = record
            return True, None

        current_rank = existing["current_rank"]
        current_status = existing["status"]

        # Terminal conflict check: Cannot cancel completed ride or complete cancelled ride
        if current_rank == 4 and incoming_rank == 4:
            if current_status != event.event_type.value:
                conflict_msg = f"Terminal conflict: cannot transition from {current_status} to {event.event_type.value}"
                logger.warning("Ride %s: %s", event.ride_id, conflict_msg)
                return False, conflict_msg

        # Monotonic update: If incoming is higher rank, advance status
        if incoming_rank > current_rank:
            existing["status"] = event.event_type.value
            existing["current_rank"] = incoming_rank

        # COALESCE backfill: Apply metadata fields if currently missing
        self._apply_payload_fields(existing, event)
        return True, None

    def _apply_payload_fields(self, record: Dict[str, Any], event: RideEvent) -> None:
        """Backfill metadata without overwriting populated fields."""
        p = event.payload
        if isinstance(p, RideRequestedPayload):
            record["rider_id"] = record["rider_id"] or p.rider_id
            record["pickup_zone"] = record["pickup_zone"] or p.pickup_zone.value
            record["dropoff_zone"] = record["dropoff_zone"] or p.dropoff_zone.value
            record["estimated_fare"] = record["estimated_fare"] or p.estimated_fare
            record["requested_at"] = record["requested_at"] or event.occurred_at
        elif isinstance(p, RideAcceptedPayload):
            record["driver_id"] = record["driver_id"] or p.driver_id
            record["accepted_at"] = record["accepted_at"] or event.occurred_at
        elif isinstance(p, RideStartedPayload):
            record["driver_id"] = record["driver_id"] or p.driver_id
            record["started_at"] = record["started_at"] or event.occurred_at
        elif isinstance(p, RideCompletedPayload):
            record["driver_id"] = record["driver_id"] or p.driver_id
            record["final_fare"] = record["final_fare"] or p.final_fare
            record["completed_at"] = record["completed_at"] or event.occurred_at
        elif isinstance(p, RideCancelledPayload):
            record["cancelled_at"] = record["cancelled_at"] or event.occurred_at

    def insert_dead_letter(
        self,
        event_id: str,
        ride_id: str,
        raw_payload: Dict[str, Any],
        error_reason: str,
        source_partition: int = 0,
        source_offset: int = 0,
    ) -> str:
        """Durable DLQ write into dead_letter_events."""
        dlq_id = f"DLQ-{len(self.dead_letter_events) + 1:06d}"
        self.dead_letter_events[dlq_id] = {
            "dlq_id": dlq_id,
            "event_id": event_id,
            "ride_id": ride_id,
            "raw_payload": raw_payload,
            "error_reason": error_reason,
            "source_partition": source_partition,
            "source_offset": source_offset,
            "quarantined_at": datetime.now(timezone.utc),
        }
        return dlq_id

    def increment_counter(self, counter_name: str, delta: int = 1) -> int:
        """Durable pipeline counter increment."""
        current = self.pipeline_counters.get(counter_name, 0)
        self.pipeline_counters[counter_name] = current + delta
        return self.pipeline_counters[counter_name]

    def get_counter(self, counter_name: str) -> int:
        return self.pipeline_counters.get(counter_name, 0)

    def get_ride(self, ride_id: str) -> Optional[Dict[str, Any]]:
        return self.rides.get(ride_id)
