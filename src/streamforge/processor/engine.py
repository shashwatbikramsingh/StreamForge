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
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal, List, Tuple, Union
from pydantic import ValidationError

from streamforge.events.schemas import RideEvent
from streamforge.events.deserializer import DeserializationResult
from streamforge.storage.repository import (
    EventRepository,
    BatchItem,
    BatchPersistenceResult,
)

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


@dataclass(frozen=True)
class RawMessageItem:
    """Incoming unvalidated message item with Kafka source coordinates."""
    raw_payload: Optional[Dict[str, Any]] = None
    source_partition: int = 0
    source_offset: int = 0
    source_topic: str = "streamforge.rides.v1"
    deserialization_result: Optional[DeserializationResult] = None


@dataclass(frozen=True)
class BatchProcessResult:
    """Outcome of batch processing across validation and repository persistence."""
    results: List[ProcessResult]
    accepted_count: int
    duplicate_count: int
    quarantined_count: int
    total_latency_ms: float


class StreamProcessor:
    """
    Core stream processing engine coordinating schema validation,
    idempotent storage, monotonic lifecycle state, and latency metrics.
    """

    def __init__(self, repository: EventRepository):
        self.repository = repository
        self.last_validation_ms: float = 0.0
        self.last_db_persist_ms: float = 0.0

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
        self.last_validation_ms = 0.0

        # No event or ride identity can be trusted when decoding failed.
        # UNKNOWN_EVENT_ID is only a presentation sentinel in ProcessResult.
        # PostgreSQL receives event_id=None.
        t_db_start = time.perf_counter()
        try:
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
        finally:
            self.last_db_persist_ms = max(0.0, (time.perf_counter() - t_db_start) * 1000.0)

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
        t_val_start = time.perf_counter()
        try:
            event = RideEvent.model_validate(raw_payload)
            event_id = event.event_id
            ride_id = event.ride_id
            self.last_validation_ms = max(0.0, (time.perf_counter() - t_val_start) * 1000.0)
        except ValidationError as e:
            self.last_validation_ms = max(0.0, (time.perf_counter() - t_val_start) * 1000.0)
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
            t_db_start = time.perf_counter()
            try:
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
            finally:
                self.last_db_persist_ms = max(0.0, (time.perf_counter() - t_db_start) * 1000.0)
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
        t_db_start = time.perf_counter()
        try:
            persistence = self.repository.persist_event_and_projection(
                event=event,
                ingested_at=ingested_at,
                source_topic=source_topic,
                source_partition=source_partition,
                source_offset=source_offset,
            )
        finally:
            self.last_db_persist_ms = max(0.0, (time.perf_counter() - t_db_start) * 1000.0)

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
            t_dlq_start = time.perf_counter()
            try:
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
            finally:
                self.last_db_persist_ms += max(0.0, (time.perf_counter() - t_dlq_start) * 1000.0)
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

    def process_batch(
        self,
        messages: List[Union[RawMessageItem, Dict[str, Any]]],
    ) -> BatchProcessResult:
        """
        Validate and process a batch of incoming Kafka messages.

        Validation failures and deserialization failures are durably quarantined to DLQ.
        Valid events are persisted atomically via repository.persist_events_batch().
        Results are returned in the exact order of the input messages.
        Infrastructure failures propagate to the consumer to guarantee fail-stop semantics.
        """
        if not messages:
            self.last_validation_ms = 0.0
            self.last_db_persist_ms = 0.0
            return BatchProcessResult(
                results=[],
                accepted_count=0,
                duplicate_count=0,
                quarantined_count=0,
                total_latency_ms=0.0,
            )

        # Normalize incoming messages to RawMessageItem instances
        normalized: List[RawMessageItem] = []
        for m in messages:
            if isinstance(m, RawMessageItem):
                normalized.append(m)
            elif isinstance(m, dict):
                if "raw_payload" in m:
                    normalized.append(
                        RawMessageItem(
                            raw_payload=m.get("raw_payload"),
                            source_partition=m.get("source_partition", 0),
                            source_offset=m.get("source_offset", 0),
                            source_topic=m.get("source_topic", "streamforge.rides.v1"),
                            deserialization_result=m.get("deserialization_result"),
                        )
                    )
                else:
                    normalized.append(
                        RawMessageItem(
                            raw_payload=m,
                            source_partition=0,
                            source_offset=0,
                            source_topic="streamforge.rides.v1",
                        )
                    )
            else:
                raise TypeError(f"Batch item must be RawMessageItem or dict, got {type(m).__name__}")

        t_val_start = time.perf_counter()
        ingested_at = datetime.now(timezone.utc)

        results_by_index: Dict[int, ProcessResult] = {}
        valid_items_to_persist: List[Tuple[int, BatchItem]] = []
        dlq_items_to_write: List[Tuple[int, Dict[str, Any]]] = []

        # Phase 1: In-memory schema validation & deserialization checks
        for idx, item in enumerate(normalized):
            # 1a. Deserialization error
            if item.deserialization_result and not item.deserialization_result.succeeded:
                dlq_items_to_write.append(
                    (
                        idx,
                        {
                            "event_id": None,
                            "ride_id": None,
                            "raw_payload": item.deserialization_result.raw_record or {},
                            "error_reason": item.deserialization_result.error_reason or "Deserialization error",
                            "source_partition": item.source_partition,
                            "source_offset": item.source_offset,
                            "source_topic": item.source_topic,
                            "failure_category": "deserialization_error",
                        },
                    )
                )
                continue

            raw_payload = item.raw_payload
            if not isinstance(raw_payload, dict):
                dlq_items_to_write.append(
                    (
                        idx,
                        {
                            "event_id": None,
                            "ride_id": None,
                            "raw_payload": {"raw": str(raw_payload)},
                            "error_reason": "Payload is not a valid JSON dictionary",
                            "source_partition": item.source_partition,
                            "source_offset": item.source_offset,
                            "source_topic": item.source_topic,
                            "failure_category": "validation_error",
                        },
                    )
                )
                continue

            # Safe identifier extraction
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

            # 1b. Schema validation
            try:
                event = RideEvent.model_validate(raw_payload)
                valid_items_to_persist.append(
                    (
                        idx,
                        BatchItem(
                            event=event,
                            source_partition=item.source_partition,
                            source_offset=item.source_offset,
                            ingested_at=ingested_at,
                            source_topic=item.source_topic,
                        ),
                    )
                )
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
                error_reason = ("SchemaValidationError: " + "; ".join(safe_issues))[:2000]
                logger.warning("Event %s failed schema validation: %s", event_id or "UNKNOWN", error_reason)
                dlq_items_to_write.append(
                    (
                        idx,
                        {
                            "event_id": event_id,
                            "ride_id": ride_id,
                            "raw_payload": raw_payload,
                            "error_reason": error_reason,
                            "source_partition": item.source_partition,
                            "source_offset": item.source_offset,
                            "source_topic": item.source_topic,
                            "failure_category": "validation_error",
                        },
                    )
                )

        self.last_validation_ms = max(0.0, (time.perf_counter() - t_val_start) * 1000.0)

        # Phase 2: Database Persistence
        t_db_start = time.perf_counter()

        # 2a. Quarantine validation/deserialization failures to DLQ
        for idx, dlq_data in dlq_items_to_write:
            dlq_id = self.repository.insert_dead_letter(
                event_id=dlq_data["event_id"],
                ride_id=dlq_data["ride_id"],
                raw_payload=dlq_data["raw_payload"],
                error_reason=dlq_data["error_reason"],
                source_partition=dlq_data["source_partition"],
                source_offset=dlq_data["source_offset"],
                source_topic=dlq_data["source_topic"],
                failure_category=dlq_data["failure_category"],
            )
            results_by_index[idx] = ProcessResult(
                status="quarantined",
                event_id=dlq_data["event_id"] or "UNKNOWN_EVENT_ID",
                ride_id=dlq_data["ride_id"],
                latency_ms=0.0,
                error_reason=dlq_data["error_reason"],
                dlq_id=dlq_id,
            )

        # 2b. Persist valid batch items atomically via repository
        if valid_items_to_persist:
            batch_items = [item for _, item in valid_items_to_persist]
            persist_res: BatchPersistenceResult = self.repository.persist_events_batch(batch_items)

            for (idx, batch_item), item_res in zip(valid_items_to_persist, persist_res.item_results):
                latency_ms = max(0.0, (ingested_at - batch_item.event.produced_at).total_seconds() * 1000.0)
                if item_res.status == "accepted":
                    results_by_index[idx] = ProcessResult(
                        status="accepted",
                        event_id=item_res.event_id,
                        ride_id=batch_item.event.ride_id,
                        latency_ms=latency_ms,
                    )
                elif item_res.status == "duplicate":
                    results_by_index[idx] = ProcessResult(
                        status="duplicate",
                        event_id=item_res.event_id,
                        ride_id=batch_item.event.ride_id,
                        latency_ms=latency_ms,
                    )
                elif item_res.status == "quarantined":
                    results_by_index[idx] = ProcessResult(
                        status="quarantined",
                        event_id=item_res.event_id,
                        ride_id=batch_item.event.ride_id,
                        latency_ms=latency_ms,
                        error_reason=f"invalid_state_transition: {item_res.error_reason or 'Terminal conflict'}",
                        dlq_id=item_res.dlq_id,
                    )
                else:
                    results_by_index[idx] = ProcessResult(
                        status="failed",
                        event_id=item_res.event_id,
                        ride_id=batch_item.event.ride_id,
                        latency_ms=latency_ms,
                        error_reason=item_res.error_reason,
                    )

        self.last_db_persist_ms = max(0.0, (time.perf_counter() - t_db_start) * 1000.0)

        # Phase 3: Assemble results in exact original input order
        ordered_results = [results_by_index[i] for i in range(len(normalized))]
        accepted_count = sum(1 for r in ordered_results if r.status == "accepted")
        duplicate_count = sum(1 for r in ordered_results if r.status == "duplicate")
        quarantined_count = sum(1 for r in ordered_results if r.status == "quarantined")
        total_latency_ms = sum(r.latency_ms for r in ordered_results if r.status == "accepted")

        return BatchProcessResult(
            results=ordered_results,
            accepted_count=accepted_count,
            duplicate_count=duplicate_count,
            quarantined_count=quarantined_count,
            total_latency_ms=total_latency_ms,
        )
