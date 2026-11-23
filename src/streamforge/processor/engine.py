"""
StreamForge — Stream Processing Engine
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 3, 4, 5)

Responsibilities:
1. Validate incoming raw Kafka messages using Pydantic V2 schemas.
2. Route malformed payloads to PostgreSQL dead_letter_events (SchemaValidationError).
3. Enforce database idempotency on event_id (duplicates_ignored).
4. Enforce monotonic ride lifecycle transitions; quarantine terminal conflicts (invalid_state_transition).
5. Calculate pipeline ingestion latency: ingested_at - produced_at per ADR 0001.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal
from pydantic import ValidationError

from streamforge.events.schemas import RideEvent
from streamforge.storage.repository import EventRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProcessResult:
    """Outcome of processing an event message."""
    status: Literal["accepted", "duplicate", "quarantined", "failed"]
    event_id: str
    ride_id: Optional[str]
    latency_ms: float
    error_reason: Optional[str] = None
    dlq_id: Optional[str] = None


class StreamProcessor:
    """
    Core stream processing engine coordinating schema validation,
    idempotent storage, monotonic lifecycle state, and latency metrics.
    """

    def __init__(self, repository: EventRepository):
        self.repository = repository

    def process_raw_message(
        self,
        raw_payload: Dict[str, Any],
        source_partition: int = 0,
        source_offset: int = 0,
    ) -> ProcessResult:
        """
        Process a single raw message received from Kafka.
        Guarantees that unparseable or conflicted messages are quarantined in DLQ.
        """
        ingested_at = datetime.now(timezone.utc)
        event_id = str(raw_payload.get("event_id", "UNKNOWN_EVENT_ID"))
        ride_id = str(raw_payload.get("ride_id", "UNKNOWN_RIDE_ID"))

        # Step 1: Validate payload against Pydantic schema
        try:
            event = RideEvent.model_validate(raw_payload)
            event_id = event.event_id
            ride_id = event.ride_id
        except (ValidationError, Exception) as e:
            error_reason = f"SchemaValidationError: {e}"
            logger.warning("Event %s failed schema validation: %s", event_id, error_reason)
            dlq_id = self.repository.insert_dead_letter(
                event_id=event_id,
                ride_id=ride_id,
                raw_payload=raw_payload,
                error_reason=error_reason,
                source_partition=source_partition,
                source_offset=source_offset,
            )
            return ProcessResult(
                status="quarantined",
                event_id=event_id,
                ride_id=ride_id,
                latency_ms=0.0,
                error_reason=error_reason,
                dlq_id=dlq_id,
            )

        # Calculate pipeline ingestion latency: ingested_at - produced_at
        latency_ms = max(0.0, (ingested_at - event.produced_at).total_seconds() * 1000.0)

        # Step 2: Idempotent insertion into processed_events
        is_new = self.repository.insert_processed_event(event, ingested_at=ingested_at)
        if not is_new:
            # Duplicate event replay: already durable, no aggregate effect
            return ProcessResult(
                status="duplicate",
                event_id=event.event_id,
                ride_id=event.ride_id,
                latency_ms=latency_ms,
            )

        # Step 3: Monotonic projection update into rides
        ok, conflict_reason = self.repository.upsert_ride_projection(event)
        if not ok:
            # Conflicting terminal transition per ADR 0001 (Decision 5): quarantine in DLQ
            error_reason = f"invalid_state_transition: {conflict_reason}"
            dlq_id = self.repository.insert_dead_letter(
                event_id=event.event_id,
                ride_id=event.ride_id,
                raw_payload=raw_payload,
                error_reason=error_reason,
                source_partition=source_partition,
                source_offset=source_offset,
            )
            return ProcessResult(
                status="quarantined",
                event_id=event.event_id,
                ride_id=event.ride_id,
                latency_ms=latency_ms,
                error_reason=error_reason,
                dlq_id=dlq_id,
            )

        return ProcessResult(
            status="accepted",
            event_id=event.event_id,
            ride_id=event.ride_id,
            latency_ms=latency_ms,
        )
