# StreamForge — Database Design Specification

**Database:** PostgreSQL · **Schema changes:** Alembic migrations only · **Data:** synthetic ride events.  
**Decision baseline:** `docs/adr/0001-mvp-baseline-decisions.md`.

## 1. Responsibilities

PostgreSQL stores accepted immutable event history, the derived ride projection, durable dead-letter records, and pipeline counters. Kafka is the transport and replay log, not the relational system of record. Database constraints and transactions provide the final integrity boundary.

## 2. Modeling principles

- Keep event identity (`event_id`) separate from business identity (`ride_id`).
- Store accepted events as append-only records; do not mutate event history to reflect current ride state.
- Update the `rides` projection in the same transaction as event insertion.
- Use `TIMESTAMPTZ` for all timestamps and normalize input to UTC.
- Store money as `NUMERIC(12,2)` in PostgreSQL and `Decimal` in Python; serialize JSON fare values as decimal strings.
- Use JSONB for the validated versioned payload while retaining frequently queried fields as typed columns.
- Use synthetic identifiers and coarse Bengaluru mobility-zone labels only.

## 3. Logical tables

### `processed_events`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | Internal primary key |
| `event_id` | UUID | NOT NULL, UNIQUE; idempotency key |
| `ride_id` | UUID | NOT NULL; business entity key |
| `event_type` | TEXT | NOT NULL; constrained to the five supported ride event types |
| `schema_version` | INTEGER | NOT NULL, CHECK > 0 |
| `occurred_at` | TIMESTAMPTZ | NOT NULL; domain event time |
| `produced_at` | TIMESTAMPTZ | NOT NULL; producer emission time |
| `ingested_at` | TIMESTAMPTZ | NOT NULL; database ingestion timestamp, default `now()` |
| `producer` | TEXT | NOT NULL; source component |
| `payload` | JSONB | NOT NULL; validated payload |
| `topic` | TEXT | NOT NULL; Kafka source topic |
| `partition_id` | INTEGER | NOT NULL, CHECK >= 0 |
| `offset_value` | BIGINT | NOT NULL, CHECK >= 0 |

`ingested_at` records the database-side ingestion timestamp; it is not a guaranteed physical transaction-commit timestamp. `event_id` is the canonical deduplication key. Do not assume Kafka coordinates are globally unique across topics or clusters.

### `rides` (derived projection)

| Column | Type | Notes |
|---|---|---|
| `ride_id` | UUID | Primary key |
| `rider_id` | TEXT | NOT NULL; synthetic identifier |
| `driver_id` | TEXT | Nullable synthetic identifier; populated on acceptance and later events |
| `pickup_city` | TEXT | NOT NULL; one of the approved Bengaluru zones |
| `dropoff_city` | TEXT | NOT NULL; one of the approved Bengaluru zones; differs from pickup |
| `status` | TEXT | NOT NULL; `REQUESTED`, `ACCEPTED`, `STARTED`, `COMPLETED`, `CANCELLED` |
| `status_rank` | SMALLINT | NOT NULL; monotonic rank 1–4 |
| `fare_amount` | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| `currency` | CHAR(3) | NOT NULL; MVP constraint `INR` |
| `requested_at` | TIMESTAMPTZ | Nullable lifecycle timestamp |
| `accepted_at` | TIMESTAMPTZ | Nullable lifecycle timestamp |
| `started_at` | TIMESTAMPTZ | Nullable lifecycle timestamp |
| `completed_at` | TIMESTAMPTZ | Nullable lifecycle timestamp |
| `cancelled_at` | TIMESTAMPTZ | Nullable lifecycle timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL; projection update timestamp |

#### State transition and out-of-order policy

Ranks are `REQUESTED` (1), `ACCEPTED` (2), `STARTED` (3), and terminal `COMPLETED` (4) / `CANCELLED` (4). The processor must enforce legal transitions; rank alone is not sufficient to distinguish the two terminal states.

- A valid event is inserted into `processed_events` and its projection changes are applied in one transaction.
- When a lower-ranked event arrives after a higher-ranked event, preserve the current `status` and `status_rank`. The event remains in accepted event history, and missing lifecycle timestamps / driver metadata may be backfilled with `COALESCE` where the event is otherwise consistent.
- Once a ride is terminal, a conflicting terminal event (`COMPLETED` versus `CANCELLED`) is an invalid transition. Roll back the attempted `processed_events` insertion and persist the source message in `dead_letter_events` with `failure_category = 'invalid_state_transition'`.
- Repeated same-state events with different `event_id` values require explicit processor policy and tests; database event uniqueness only deduplicates identical event IDs.

### `dead_letter_events`

PostgreSQL is the primary durable DLQ for the MVP.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key |
| `event_id` | UUID | Nullable; set only when safely parseable |
| `source_topic` | TEXT | NOT NULL |
| `source_partition` | INTEGER | NOT NULL, CHECK >= 0 |
| `source_offset` | BIGINT | NOT NULL, CHECK >= 0 |
| `failure_category` | TEXT | NOT NULL; `validation_error`, `invalid_state_transition`, `transient_exhausted`, `processing_error` |
| `failure_reason` | TEXT | NOT NULL; sanitized and bounded |
| `payload` | TEXT | NOT NULL; original raw message, bounded to 64 KiB |
| `failed_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `attempt_count` | INTEGER | NOT NULL, CHECK >= 1 |

The source Kafka offset is committed only after the DLQ row is durably committed. A DLQ write failure leaves the source offset uncommitted and must surface an operational error. Do not also publish to a Kafka DLQ topic in the MVP unless a later ADR changes ownership.

### `pipeline_counters`

A small PostgreSQL-backed counter table provides durable MVP counters used by the API. Suggested columns:

| Column | Type | Notes |
|---|---|---|
| `metric_key` | TEXT | Primary key; allowlisted keys such as `duplicates_ignored`, `transient_retries` |
| `metric_value` | BIGINT | NOT NULL, default 0, CHECK >= 0 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` |

Counters must be incremented transactionally with the outcome they represent. In the MVP, only `duplicates_ignored` and `transient_retries` are durable counters in this table. Accepted-event counts are derived from `processed_events`; rejected/DLQ counts are derived from `dead_letter_events` (and may be grouped by `failure_category`). Published-event counts, processing rate, and consumer lag are unavailable unless separately instrumented. These derived counts are not rows in `pipeline_counters`. This table is not a substitute for time-series telemetry.

## 4. Index strategy

Create only indexes tied to documented query patterns:

- UNIQUE constraint/index on `processed_events(event_id)`.
- `idx_processed_events_occurred_at` on `processed_events(occurred_at DESC)`.
- `idx_processed_events_ingested_at` on `processed_events(ingested_at DESC)`.
- `idx_processed_events_type_occurred` on `processed_events(event_type, occurred_at DESC)`.
- `idx_rides_status_updated` on `rides(status, updated_at DESC)`.
- `idx_rides_routes` on `rides(pickup_city, dropoff_city)`.
- `idx_dlq_failed_at` on `dead_letter_events(failed_at DESC)`.

Validate query plans with representative data and `EXPLAIN (ANALYZE, BUFFERS)` before adding further indexes. Indexes add write and storage costs.

## 5. Transaction and idempotency pattern

For each valid event:

1. Begin a database transaction.
2. Insert into `processed_events` using `ON CONFLICT (event_id) DO NOTHING`.
3. If no row was inserted, increment `pipeline_counters('duplicates_ignored')`, commit, and do not reapply the projection.
4. If inserted, lock the existing ride projection row with `SELECT ... FOR UPDATE` when present, validate the state transition, and apply the projection update in the same transaction.
5. Commit the database transaction.
6. Commit the Kafka offset only after the durable database outcome is known.

If a transition is invalid, roll back the valid-event transaction, then write the DLQ record in a separate transaction. Commit the source offset only after that DLQ transaction succeeds. A crash after database commit but before offset commit causes redelivery; the unique `event_id` makes that replay idempotent.

The consumer must not commit a later offset in a partition while an earlier message's outcome remains unresolved. Prefer serial processing per partition for the MVP; if processing concurrently, implement contiguous completed-offset tracking and test it.

## 6. Analytics definitions

- **Terminal cancellation rate:** cohort rides are selected by `rides.requested_at` in the half-open interval `[from, to)`. Numerator = distinct cohort rides whose current terminal status is `CANCELLED`. Denominator = distinct cohort rides whose current terminal status is `COMPLETED` or `CANCELLED`. Pending and in-progress rides are excluded; return NULL when the denominator is zero. This is a request-time cohort, not a cancellation-event-time window.
- **Pipeline ingestion latency:** `EXTRACT(EPOCH FROM (ingested_at - produced_at)) * 1000.0` milliseconds. This measures producer-emission-to-database-ingestion delay. `ingested_at` is assigned during the transaction and is not physical commit time; do not describe this as producer-to-commit latency.
- **Event time:** use `occurred_at` for business-event windows when explicitly requested.
- **Ingestion time:** use `ingested_at` for arrival/ingestion windows when explicitly requested.
- Count distinct `ride_id` for ride metrics and event rows for event metrics.

## 7. Migrations and operations

- Use Alembic; all schema changes are reviewed migrations.
- Never edit an already-applied migration; create a new migration.
- Use a least-privilege application role where practical.
- Persist local database state with a named Docker volume. Destructive resets require explicit user approval.
- Use parameterized SQL / ORM expressions, bounded queries, UTC-aware filters, and deliberate connection/transaction boundaries.

## 8. Required tests

- Duplicate `event_id` does not create another event or double-apply the projection.
- Valid lifecycle transitions update status and lifecycle timestamps correctly.
- Late lower-ranked events do not downgrade status and can backfill missing metadata.
- Conflicting terminal transitions roll back the event insert and are durably dead-lettered.
- DLQ persistence failure prevents source offset commit.
- Transaction rollback leaves no partial event/projection update.
- Migration upgrade works from an empty database; downgrade is tested only where safe.
- Concurrent processing cannot commit past an unresolved earlier offset in the same partition.

## 9. References

- PostgreSQL documentation: https://www.postgresql.org/docs/
- Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- Indexes: https://www.postgresql.org/docs/current/indexes.html
- Transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
