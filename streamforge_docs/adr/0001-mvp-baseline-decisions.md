# ADR 0001: MVP Baseline Architectural and Data Decisions

- **Status:** Accepted baseline
- **Date:** 2026-11-01
- **Context:** Resolve the implementation decisions left open in `PRD.md`, `architecture.md`, and `database.md` before Day 1 implementation.

## Decisions

### 1. Unified Python package layout

Use the `src` layout. Application modules live under `src/streamforge/`: `config`, `events`, `producer`, `consumer`, `processor`, `storage`, `api`, and `dashboard`. Database migrations live under `db/migrations/`.

### 2. Kafka distribution and Python client

- Use the official Apache Kafka Docker image in single-node KRaft mode for local development; ZooKeeper is not part of the MVP.
- Use `confluent-kafka` for the Python producer and consumer.
- Producer delivery callbacks report broker delivery success/failure.
- Consumer auto-commit is disabled (`enable.auto.commit=false`); offsets are committed manually only after durable database or DLQ persistence.

Pin the exact official image tag in `compose.yaml` and record the `confluent-kafka` dependency bounds in `pyproject.toml` before the first runnable stack is declared reproducible.

### 3. Durable DLQ ownership

PostgreSQL `dead_letter_events` is the primary and only durable DLQ destination in the MVP. The consumer commits the source offset only after the DLQ row is committed. If DLQ persistence fails, the source offset remains uncommitted. A Kafka DLQ topic requires a future ADR and is not silently added alongside this path.

### 4. Timestamp model

`processed_events` stores three UTC timestamps:

- `occurred_at`: when the business event occurred.
- `produced_at`: when the producer emitted the event.
- `ingested_at`: when the database recorded ingestion (`now()` at insert/transaction time; not asserted to be the physical commit instant).

Pipeline ingestion latency is measured as `ingested_at - produced_at`. Business event windows use `occurred_at`; ingestion windows use `ingested_at`.

### 5. Ride lifecycle state policy

Ranks: `REQUESTED=1`, `ACCEPTED=2`, `STARTED=3`, and terminal `COMPLETED=4` / `CANCELLED=4`.

- Lower-ranked late events do not downgrade the projection. They may backfill missing lifecycle timestamps and driver metadata using `COALESCE` when consistent.
- The two terminal states are mutually conflicting; a `COMPLETED` to `CANCELLED` or `CANCELLED` to `COMPLETED` transition is rejected.
- For a conflicting terminal event, roll back its `processed_events` insertion and write the raw source record to `dead_letter_events` with `invalid_state_transition`.
- Rank is not a substitute for validating the legal transition matrix. Repeated same-state events with distinct event IDs require explicit handling in processor tests.

### 6. Pipeline counters

Use PostgreSQL `pipeline_counters` for durable MVP counters such as `duplicates_ignored` and `transient_retries`. Increment counters transactionally with the corresponding outcome. FastAPI reports only counters and measurements that are actually instrumented; unavailable values must not be represented as zero.

### 7. Metric definitions for the MVP

- Terminal cancellation rate uses a request-time cohort: rides with `requested_at` in `[from, to)`. Numerator is distinct cohort rides whose current terminal status is `CANCELLED`; denominator is distinct cohort rides whose current terminal status is `COMPLETED` or `CANCELLED`. Pending/in-progress rides are excluded; a zero denominator yields an unavailable/null rate.
- Pipeline ingestion latency is `ingested_at - produced_at`. `ingested_at` is assigned during the database transaction and is not physical commit time. Do not report this as producer-to-database-commit latency.
- In the MVP, `duplicates_ignored` and `transient_retries` are durable counters. Accepted-event and DLQ/rejected counts are derived from `processed_events` and `dead_letter_events`, respectively. Published counts, processing rate, and consumer lag are unavailable until separately instrumented.

### 8. Synthetic geography

`pickup_city` and `dropoff_city` are coarse synthetic Bengaluru mobility zones only: `Koramangala`, `Indiranagar`, `Whitefield`, `Electronic City`, `HSR Layout`, `Jayanagar`, `MG Road`, `Hebbal`, `Marathahalli`, and `BTM Layout`. Pickup and dropoff must differ. No precise or real personal location data is used.

## Consequences

- At-least-once Kafka delivery plus database idempotency is the supported reliability model; end-to-end exactly-once is not claimed.
- PostgreSQL is responsible for durable accepted history, the ride projection, DLQ records, and selected counters.
- The consumer must preserve partition offset order. Serial per-partition processing is the MVP default unless a tested contiguous-offset strategy is implemented.
- Component specifications and tests must follow these decisions. Changes require a new or superseding ADR.
