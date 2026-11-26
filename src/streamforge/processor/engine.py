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
from streamforge.events.deserializer import DeserializationResult
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

    def process_deserialization_failure(
        self,
        result: DeserializationResult,
        source_topic: str,
        source_partition: int,
        source_offset: int,
    ) -> ProcessResult:
        """
        Persist an event that failed transport-level deserialization.
        The raw Kafka message is preserved in the DLQ.
        Database exceptions intentionally propagate to the consumer.
        """
        # Only failed deserialization results belong in this method.
        if result.succeeded or result.error_reason is None:
            raise ValueError(
                "process_deserialization_failure() requires "
                "a failed DeserializationResult."
            )

        if not result.raw_record:
            raise ValueError(
                "Deserialization failure must contain raw record evidence."
            )

        error_reason = result.error_reason

        # No event or ride identity can be trusted when decoding failed.
        # UNKNOWN_EVENT_ID is only a presentation sentinel in ProcessResult.
        # PostgreSQL receives event_id=None.
        dlq_id = self.repository.insert_dead_letter(
            event_id=None,
            ride_id=None,
            raw_payload=result.raw_record,
            error_reason=error_reason,
            source_partition=source_partition,
            source_offset=source_offset,
            source_topic=source_topic,
            failure_category="deserialization_error",
        )

        return ProcessResult(
            status="quarantined",
            event_id="UNKNOWN_EVENT_ID",
            ride_id=None,
            latency_ms=0.0,
            error_reason=error_reason,
            dlq_id=dlq_id,
        )

    def process_raw_message(
        self,
        raw_message: Optional[Dict[str, Any]] = None,
        source_partition: int = 0,
        source_offset: int = 0,
        source_topic: str = "streamforge.rides.v1",
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> ProcessResult:
        """
        Validate and process a decoded StreamForge ride event.
        Validation failures are durably quarantined.
        Infrastructure failures propagate to the consumer.
        """
        payload = raw_message if raw_message is not None else raw_payload
        if not isinstance(payload, dict):
            raise TypeError("raw_message must be a dictionary.")
        raw_payload = payload

        ingested_at = datetime.now(timezone.utc)

        # Extract identifiers only when they are safe to use.
        raw_event_id = raw_payload.get("event_id")
        event_id = (
            raw_event_id.strip()
            if isinstance(raw_event_id, str) and raw_event_id.strip()
            else None
        )

        raw_payload_data = raw_payload.get("payload")
        raw_ride_id = (
            raw_payload_data.get("ride_id")
            if isinstance(raw_payload_data, dict)
            else raw_payload.get("ride_id")
        )
        ride_id = (
            raw_ride_id.strip()
            if isinstance(raw_ride_id, str) and raw_ride_id.strip()
            else None
        )

        # Step 1: Validate payload against Pydantic schema
        try:
            event = RideEvent.model_validate(raw_payload)
            event_id = event.event_id
            ride_id = event.ride_id
        except ValidationError as e:
            issues = e.errors(
                include_input=False,
                include_context=False,
                include_url=False,
            )
            safe_issues = [
                f"{'.'.join(str(part) for part in issue.get('loc', ())) or '<root>'}:"
                f"{issue.get('type', 'validation_error')}"
                for issue in issues[:20]
            ]
            error_reason = (
                "SchemaValidationError: " + "; ".join(safe_issues)
            )[:2000]
            logger.warning("Event %s failed schema validation: %s", event_id or "UNKNOWN", error_reason)
            dlq_id = self.repository.insert_dead_letter(
                event_id=event_id,
                ride_id=ride_id,
                raw_payload=raw_payload,
                error_reason=error_reason,
                source_partition=source_partition,
                source_offset=source_offset,
                source_topic=source_topic,
                failure_category="validation_error",
            )
            return ProcessResult(
                status="quarantined",
                event_id=event_id or "UNKNOWN_EVENT_ID",
                ride_id=ride_id,
                latency_ms=0.0,
                error_reason=error_reason,
                dlq_id=dlq_id,
            )

        # Calculate pipeline ingestion latency: ingested_at - produced_at
        latency_ms = max(0.0, (ingested_at - event.produced_at).total_seconds() * 1000.0)

        # Step 2: Atomic event persistence + ride projection.
        persistence = self.repository.persist_event_and_projection(
            event=event,
            ingested_at=ingested_at,
            source_topic=source_topic,
            source_partition=source_partition,
            source_offset=source_offset,
        )
        if persistence.status == "duplicate":
            return ProcessResult(
                status="duplicate",
                event_id=event.event_id,
                ride_id=event.ride_id,
                latency_ms=latency_ms,
            )
        if persistence.status == "conflict":
            error_reason = (
                "invalid_state_transition: "
                f"{persistence.conflict_reason or 'Unspecified projection conflict'}"
            )
            # This happens after atomic persistence has returned.
            # PostgreSQL's failed transaction will already have rolled back.
            dlq_id = self.repository.insert_dead_letter(
                event_id=event.event_id,
                ride_id=event.ride_id,
                raw_payload=raw_payload,
                error_reason=error_reason,
                source_partition=source_partition,
                source_offset=source_offset,
                source_topic=source_topic,
                failure_category="invalid_state_transition",
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
