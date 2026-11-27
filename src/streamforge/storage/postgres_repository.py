"""PostgreSQL-backed repository for StreamForge.

The primary event-ingestion method persists the immutable event and its
derived ride projection in one transaction. DLQ writes use independent
transactions after rejected event transactions have rolled back.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from streamforge.config.settings import get_settings
from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)
from streamforge.storage.repository import (
    BatchItem,
    BatchItemResult,
    BatchPersistenceResult,
    EventPersistenceResult,
    EventRepository,
)

logger = logging.getLogger(__name__)

_MAX_DLQ_PAYLOAD_BYTES = 512 * 1024
_MAX_DLQ_REASON_LENGTH = 2000
_VALID_FAILURE_CATEGORIES = {
    "deserialization_error",
    "validation_error",
    "invalid_state_transition",
    "transient_exhausted",
    "processing_error",
}


class _TerminalConflictException(Exception):
    """Internal exception raised to trigger atomic rollback of invalid terminal state transitions."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _extract_ride_update_fields(event: RideEvent) -> Dict[str, Any]:
    """Extract projection backfill fields from event payload."""
    p = event.payload
    rider_id = getattr(p, "rider_id", None)
    driver_id = getattr(p, "driver_id", None)

    pickup = getattr(p, "pickup_zone", None) or getattr(p, "pickup_city", None)
    pickup_city = pickup.value if hasattr(pickup, "value") else pickup

    dropoff = getattr(p, "dropoff_zone", None) or getattr(p, "dropoff_city", None)
    dropoff_city = dropoff.value if hasattr(dropoff, "value") else dropoff

    estimated_fare = getattr(p, "estimated_fare", None)
    if estimated_fare is None and isinstance(p, RideRequestedPayload):
        estimated_fare = getattr(p, "fare_amount", None)

    final_fare = getattr(p, "final_fare", None)
    if final_fare is None and isinstance(p, RideCompletedPayload):
        final_fare = getattr(p, "fare_amount", None)

    requested_at = event.occurred_at if event.event_type == RideEventType.REQUESTED else None
    accepted_at = event.occurred_at if event.event_type == RideEventType.ACCEPTED else None
    started_at = event.occurred_at if event.event_type == RideEventType.STARTED else None
    completed_at = event.occurred_at if event.event_type == RideEventType.COMPLETED else None
    cancelled_at = event.occurred_at if event.event_type == RideEventType.CANCELLED else None

    return {
        "rider_id": rider_id,
        "driver_id": driver_id,
        "pickup_city": pickup_city,
        "dropoff_city": dropoff_city,
        "estimated_fare": estimated_fare,
        "final_fare": final_fare,
        "requested_at": requested_at,
        "accepted_at": accepted_at,
        "started_at": started_at,
        "completed_at": completed_at,
        "cancelled_at": cancelled_at,
    }


_UPSERT_RIDE_PROJECTION_SQL = """
    INSERT INTO rides (
        ride_id, rider_id, driver_id, pickup_city, dropoff_city,
        status, status_rank, estimated_fare, final_fare, currency,
        requested_at, accepted_at, started_at, completed_at, cancelled_at,
        updated_at
    ) VALUES (
        %(ride_id)s, %(rider_id)s, %(driver_id)s, %(pickup_city)s, %(dropoff_city)s,
        %(status)s, %(status_rank)s, %(estimated_fare)s, %(final_fare)s, 'INR',
        %(requested_at)s, %(accepted_at)s, %(started_at)s, %(completed_at)s, %(cancelled_at)s,
        NOW()
    )
    ON CONFLICT (ride_id) DO UPDATE SET
        rider_id = COALESCE(rides.rider_id, EXCLUDED.rider_id),
        driver_id = COALESCE(rides.driver_id, EXCLUDED.driver_id),
        pickup_city = COALESCE(rides.pickup_city, EXCLUDED.pickup_city),
        dropoff_city = COALESCE(rides.dropoff_city, EXCLUDED.dropoff_city),
        estimated_fare = COALESCE(rides.estimated_fare, EXCLUDED.estimated_fare),
        final_fare = COALESCE(rides.final_fare, EXCLUDED.final_fare),
        requested_at = COALESCE(rides.requested_at, EXCLUDED.requested_at),
        accepted_at = COALESCE(rides.accepted_at, EXCLUDED.accepted_at),
        started_at = COALESCE(rides.started_at, EXCLUDED.started_at),
        completed_at = COALESCE(rides.completed_at, EXCLUDED.completed_at),
        cancelled_at = COALESCE(rides.cancelled_at, EXCLUDED.cancelled_at),
        status = CASE
            WHEN EXCLUDED.status_rank > rides.status_rank THEN EXCLUDED.status
            ELSE rides.status
        END,
        status_rank = CASE
            WHEN EXCLUDED.status_rank > rides.status_rank THEN EXCLUDED.status_rank
            ELSE rides.status_rank
        END,
        updated_at = NOW()
    WHERE NOT (
        rides.status_rank = 4 AND
        EXCLUDED.status_rank = 4 AND
        rides.status <> EXCLUDED.status
    )
    RETURNING status, status_rank;
"""


class PostgresRepository(EventRepository):
    """PostgreSQL-backed repository implementing the canonical StreamForge event contracts."""

    def __init__(
        self,
        pool: Optional[ConnectionPool] = None,
        dsn: Optional[str] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
    ):
        settings = get_settings()
        self._dsn = dsn or settings.postgres_dsn
        self._min_size = min_size if min_size is not None else settings.postgres_min_connections
        self._max_size = max_size if max_size is not None else settings.postgres_max_connections

        if pool is not None:
            self._pool = pool
            self._owns_pool = False
        else:
            self._pool = ConnectionPool(
                conninfo=self._dsn,
                min_size=self._min_size,
                max_size=self._max_size,
                kwargs={"row_factory": dict_row},
                open=False,
            )
            self._owns_pool = True

    def _connection(self):
        """Obtain a pooled connection, lazily opening the pool if not already active."""
        if self._pool.closed:
            self._pool.open()
        return self._pool.connection()

    def close(self) -> None:
        """Close the managed connection pool if owned by this instance."""
        if self._owns_pool and not self._pool.closed:
            self._pool.close()

    def __enter__(self) -> "PostgresRepository":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def _increment_counter_with_conn(self, conn: Any, counter_name: str, delta: int = 1) -> int:
        """Transactional counter increment on an existing connection."""
        insert_sql = """
            INSERT INTO pipeline_counters (metric_key, metric_value, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (metric_key) DO UPDATE
            SET metric_value = pipeline_counters.metric_value + EXCLUDED.metric_value,
                updated_at = NOW()
            RETURNING metric_value;
        """
        with conn.cursor() as cur:
            cur.execute(insert_sql, (counter_name, delta))
            row = cur.fetchone()
            return row["metric_value"] if row else 0

    def persist_event_and_projection(
        self,
        event: RideEvent,
        ingested_at: Optional[datetime] = None,
        source_topic: str = "streamforge.rides.v1",
        source_partition: int = 0,
        source_offset: int = 0,
    ) -> EventPersistenceResult:
        """
        Atomically persist an event and its derived ride projection in one transaction.

        If a terminal state conflict occurs, rolls back the transaction (including
        the tentative processed_events insert) and returns status='conflict'.
        """
        if not source_topic.strip():
            raise ValueError("source_topic cannot be empty.")
        if source_partition < 0 or source_offset < 0:
            raise ValueError("Kafka partition and offset must be non-negative.")

        ingest_time = ingested_at or datetime.now(timezone.utc)
        payload_json = Jsonb(event.payload.model_dump(mode="json"))

        insert_event_sql = """
            INSERT INTO processed_events (
                event_id, ride_id, event_type, schema_version,
                occurred_at, produced_at, ingested_at, producer,
                payload, source_topic, source_partition, source_offset
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (event_id) DO NOTHING
            RETURNING id;
        """

        fields = _extract_ride_update_fields(event)
        upsert_params = {
            "ride_id": event.ride_id,
            "status": event.event_type.value,
            "status_rank": event.lifecycle_rank,
            **fields,
        }

        try:
            with self._connection() as conn:
                with conn.transaction():
                    with conn.cursor() as cur:
                        # 1. Idempotent insertion into processed_events
                        cur.execute(
                            insert_event_sql,
                            (
                                event.event_id,
                                event.ride_id,
                                event.event_type.value,
                                event.schema_version,
                                event.occurred_at,
                                event.produced_at,
                                ingest_time,
                                event.producer,
                                payload_json,
                                source_topic,
                                source_partition,
                                source_offset,
                            ),
                        )
                        event_row = cur.fetchone()

                        # Duplicate check: zero rows inserted
                        if event_row is None:
                            self._increment_counter_with_conn(conn, "duplicates_ignored", 1)
                            return EventPersistenceResult(status="duplicate")

                        # 2. Update projection with serialized conflict checking
                        cur.execute(_UPSERT_RIDE_PROJECTION_SQL, upsert_params)
                        proj_row = cur.fetchone()

                        # Terminal conflict: WHERE condition on conflict DO UPDATE evaluated to False
                        if proj_row is None:
                            cur.execute(
                                "SELECT status FROM rides WHERE ride_id = %s;",
                                (event.ride_id,),
                            )
                            existing = cur.fetchone()
                            existing_status = existing["status"] if existing else "UNKNOWN"
                            conflict_msg = (
                                f"Terminal conflict: cannot transition from {existing_status} "
                                f"to {event.event_type.value}"
                            )
                            # Roll back the transaction by raising internal exception
                            raise _TerminalConflictException(conflict_msg)

                        return EventPersistenceResult(status="accepted")

        except _TerminalConflictException as exc:
            # Transaction has rolled back, leaving processed_events clean
            return EventPersistenceResult(status="conflict", conflict_reason=exc.message)

    def persist_events_batch(
        self,
        items: List[BatchItem],
    ) -> BatchPersistenceResult:
        """
        Atomically persist a batch of events and update their ride projections.

        Uses one pooled database connection and one outer PostgreSQL transaction.
        Nested transactions (savepoints) isolate terminal projection conflicts per item
        without aborting the entire batch. Conflicted items are quarantined to
        dead_letter_events within the outer transaction. Unhandled database errors
        roll back the entire outer transaction and propagate.

        If items is empty, immediately returns an empty result without checking
        out a connection.
        """
        if not items:
            return BatchPersistenceResult(
                item_results=[],
                accepted_count=0,
                duplicate_count=0,
                quarantined_count=0,
            )

        insert_event_sql = """
            INSERT INTO processed_events (
                event_id, ride_id, event_type, schema_version,
                occurred_at, produced_at, ingested_at, producer,
                payload, source_topic, source_partition, source_offset
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (event_id) DO NOTHING
            RETURNING id;
        """

        item_results: List[BatchItemResult] = []
        accepted_count = 0
        duplicate_count = 0
        quarantined_count = 0

        with self._connection() as conn:
            with conn.transaction():
                for item in items:
                    if not item.source_topic.strip():
                        raise ValueError("source_topic cannot be empty.")
                    if item.source_partition < 0 or item.source_offset < 0:
                        raise ValueError("Kafka partition and offset must be non-negative.")

                    ingest_time = item.ingested_at or datetime.now(timezone.utc)
                    payload_json = Jsonb(item.event.payload.model_dump(mode="json"))

                    fields = _extract_ride_update_fields(item.event)
                    upsert_params = {
                        "ride_id": item.event.ride_id,
                        "status": item.event.event_type.value,
                        "status_rank": item.event.lifecycle_rank,
                        **fields,
                    }

                    try:
                        # Nested transaction context acts as a SAVEPOINT in psycopg 3
                        with conn.transaction():
                            with conn.cursor() as cur:
                                # 1. Idempotent insertion into processed_events
                                cur.execute(
                                    insert_event_sql,
                                    (
                                        item.event.event_id,
                                        item.event.ride_id,
                                        item.event.event_type.value,
                                        item.event.schema_version,
                                        item.event.occurred_at,
                                        item.event.produced_at,
                                        ingest_time,
                                        item.event.producer,
                                        payload_json,
                                        item.source_topic,
                                        item.source_partition,
                                        item.source_offset,
                                    ),
                                )
                                event_row = cur.fetchone()

                                # Duplicate check: zero rows inserted
                                if event_row is None:
                                    self._increment_counter_with_conn(conn, "duplicates_ignored", 1)
                                    item_results.append(
                                        BatchItemResult(
                                            event_id=item.event.event_id,
                                            status="duplicate",
                                            source_partition=item.source_partition,
                                            source_offset=item.source_offset,
                                        )
                                    )
                                    duplicate_count += 1
                                    continue

                                # 2. Update projection with serialized conflict checking
                                cur.execute(_UPSERT_RIDE_PROJECTION_SQL, upsert_params)
                                proj_row = cur.fetchone()

                                # Terminal conflict: WHERE condition on conflict DO UPDATE evaluated to False
                                if proj_row is None:
                                    cur.execute(
                                        "SELECT status FROM rides WHERE ride_id = %s;",
                                        (item.event.ride_id,),
                                    )
                                    existing = cur.fetchone()
                                    existing_status = existing["status"] if existing else "UNKNOWN"
                                    conflict_msg = (
                                        f"Terminal conflict: cannot transition from {existing_status} "
                                        f"to {item.event.event_type.value}"
                                    )
                                    raise _TerminalConflictException(conflict_msg)

                                item_results.append(
                                    BatchItemResult(
                                        event_id=item.event.event_id,
                                        status="accepted",
                                        source_partition=item.source_partition,
                                        source_offset=item.source_offset,
                                    )
                                )
                                accepted_count += 1

                    except _TerminalConflictException as exc:
                        # Savepoint rolled back tentative insert into processed_events.
                        # Now persist DLQ entry inside the outer transaction.
                        dlq_id = self._insert_dead_letter_with_conn(
                            conn=conn,
                            event_id=item.event.event_id,
                            raw_payload=item.event.payload.model_dump(mode="json"),
                            error_reason=exc.message,
                            source_partition=item.source_partition,
                            source_offset=item.source_offset,
                            source_topic=item.source_topic,
                            failure_category="invalid_state_transition",
                            ride_id=item.event.ride_id,
                        )
                        item_results.append(
                            BatchItemResult(
                                event_id=item.event.event_id,
                                status="quarantined",
                                source_partition=item.source_partition,
                                source_offset=item.source_offset,
                                error_reason=exc.message,
                                dlq_id=dlq_id,
                            )
                        )
                        quarantined_count += 1

        return BatchPersistenceResult(
            item_results=item_results,
            accepted_count=accepted_count,
            duplicate_count=duplicate_count,
            quarantined_count=quarantined_count,
        )

    def insert_processed_event(
        self,
        event: RideEvent,
        ingested_at: Optional[datetime] = None,
    ) -> bool:
        """Standalone idempotent event insertion."""
        ingest_time = ingested_at or datetime.now(timezone.utc)
        payload_json = Jsonb(event.payload.model_dump(mode="json"))

        insert_sql = """
            INSERT INTO processed_events (
                event_id, ride_id, event_type, schema_version,
                occurred_at, produced_at, ingested_at, producer,
                payload
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s
            )
            ON CONFLICT (event_id) DO NOTHING
            RETURNING id;
        """
        with self._connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        insert_sql,
                        (
                            event.event_id,
                            event.ride_id,
                            event.event_type.value,
                            event.schema_version,
                            event.occurred_at,
                            event.produced_at,
                            ingest_time,
                            event.producer,
                            payload_json,
                        ),
                    )
                    row = cur.fetchone()
                    if row is None:
                        self._increment_counter_with_conn(conn, "duplicates_ignored", 1)
                        return False
                    return True

    def upsert_ride_projection(self, event: RideEvent) -> Tuple[bool, Optional[str]]:
        """Standalone monotonic ride projection update."""
        fields = _extract_ride_update_fields(event)
        params = {
            "ride_id": event.ride_id,
            "status": event.event_type.value,
            "status_rank": event.lifecycle_rank,
            **fields,
        }

        with self._connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_RIDE_PROJECTION_SQL, params)
                    row = cur.fetchone()
                    if row is None:
                        cur.execute(
                            "SELECT status FROM rides WHERE ride_id = %s;",
                            (event.ride_id,),
                        )
                        existing = cur.fetchone()
                        existing_status = existing["status"] if existing else "UNKNOWN"
                        conflict_msg = (
                            f"Terminal conflict: cannot transition from {existing_status} "
                            f"to {event.event_type.value}"
                        )
                        return False, conflict_msg
                    return True, None

    def _insert_dead_letter_with_conn(
        self,
        conn: Any,
        event_id: Optional[str],
        raw_payload: Dict[str, Any],
        error_reason: str,
        source_partition: int = 0,
        source_offset: int = 0,
        *,
        source_topic: str = "streamforge.rides.v1",
        failure_category: str = "validation_error",
        ride_id: Optional[str] = None,
    ) -> str:
        """Persist a quarantined record into dead_letter_events using an existing connection."""
        if not source_topic.strip():
            raise ValueError("source_topic cannot be empty.")
        if source_partition < 0 or source_offset < 0:
            raise ValueError("Kafka partition and offset must be non-negative.")
        if failure_category not in _VALID_FAILURE_CATEGORIES:
            raise ValueError(f"Unsupported DLQ failure category: {failure_category}")

        # Preserve only identifiers that fit the canonical database columns.
        # The complete original values remain available in raw_payload.
        safe_event_id = (
            event_id.strip()
            if isinstance(event_id, str) and event_id.strip()
            else None
        )
        if safe_event_id is not None and len(safe_event_id) > 128:
            safe_event_id = None

        safe_ride_id = (
            ride_id.strip()
            if isinstance(ride_id, str) and ride_id.strip()
            else None
        )
        if safe_ride_id is not None and not 3 <= len(safe_ride_id) <= 64:
            safe_ride_id = None

        bounded_reason = (
            (error_reason or "Unknown failure").strip()[:_MAX_DLQ_REASON_LENGTH]
            or "Unknown failure"
        )
        payload_str = json.dumps(raw_payload) if isinstance(raw_payload, dict) else str(raw_payload)
        bounded_payload = payload_str.encode("utf-8")[:_MAX_DLQ_PAYLOAD_BYTES].decode("utf-8", errors="replace")

        insert_dlq_sql = """
            INSERT INTO dead_letter_events (
                event_id, ride_id, source_topic, source_partition,
                source_offset, failure_category, failure_reason, payload
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id;
        """

        with conn.cursor() as cur:
            cur.execute(
                insert_dlq_sql,
                (
                    safe_event_id,
                    safe_ride_id,
                    source_topic,
                    source_partition,
                    source_offset,
                    failure_category,
                    bounded_reason,
                    bounded_payload,
                ),
            )
            row = cur.fetchone()
            dlq_id = f"DLQ-{row['id']:06d}" if row else "DLQ-UNKNOWN"
            return dlq_id

    def insert_dead_letter(
        self,
        event_id: Optional[str],
        raw_payload: Dict[str, Any],
        error_reason: str,
        source_partition: int = 0,
        source_offset: int = 0,
        *,
        source_topic: str = "streamforge.rides.v1",
        failure_category: str = "validation_error",
        ride_id: Optional[str] = None,
    ) -> str:
        """
        Persist a quarantined record into dead_letter_events in an independent transaction.
        """
        with self._connection() as conn:
            with conn.transaction():
                return self._insert_dead_letter_with_conn(
                    conn=conn,
                    event_id=event_id,
                    raw_payload=raw_payload,
                    error_reason=error_reason,
                    source_partition=source_partition,
                    source_offset=source_offset,
                    source_topic=source_topic,
                    failure_category=failure_category,
                    ride_id=ride_id,
                )

    def increment_counter(self, counter_name: str, delta: int = 1) -> int:
        """Atomically increment a persistent pipeline counter."""
        with self._connection() as conn:
            with conn.transaction():
                return self._increment_counter_with_conn(conn, counter_name, delta)

    def get_counter(self, counter_name: str) -> int:
        """Retrieve current value of a persistent pipeline counter."""
        query_sql = "SELECT metric_value FROM pipeline_counters WHERE metric_key = %s;"
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query_sql, (counter_name,))
                row = cur.fetchone()
                return int(row["metric_value"]) if row else 0

    def get_ride(self, ride_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve current projected ride state."""
        query_sql = "SELECT * FROM rides WHERE ride_id = %s;"
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query_sql, (ride_id,))
                row = cur.fetchone()
                return dict(row) if row else None
