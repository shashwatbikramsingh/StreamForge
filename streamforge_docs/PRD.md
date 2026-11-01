# StreamForge — Product Requirements Document

**Status:** Approved baseline · **Version:** 1.0 · **Owner:** Project maintainer  
**Product:** Real-time event streaming and analytics platform for a simulated ride-booking service.

## 1. Product vision

StreamForge demonstrates how an engineering team can ingest continuous business events, validate and process them reliably, persist them, expose operational metrics, and turn them into useful analytics. It is an educational portfolio system, not a production ride-hailing service.

**Product statement:** Turn real-time events into trustworthy operational intelligence.

## 2. Problem and users

A ride-booking platform emits events when a ride is requested, accepted, started, completed, or cancelled. Raw events are not automatically trustworthy: they may be malformed, duplicated, delayed, or delivered again after a consumer restart. Operators also need a timely view of rides, cancellations, revenue, and processing health.

Primary users:
- **Project evaluator / interviewer:** wants to understand the design, trade-offs, tests, and measured results.
- **Platform operator (demo persona):** wants current pipeline health and ride metrics.
- **Developer:** wants to run, test, debug, and extend the platform locally.

## 3. Goals

1. Generate realistic, schema-versioned ride events.
2. Publish events to Kafka and consume them asynchronously.
3. Validate and normalize events before persistence.
4. Handle duplicate delivery safely using a stable event identifier and database uniqueness constraints.
5. Persist accepted events and derived ride state in PostgreSQL.
6. Expose read-only operational and analytical endpoints through FastAPI.
7. Present useful metrics in a Streamlit dashboard.
8. Make the complete local environment reproducible with Docker Compose.
9. Demonstrate correctness with automated tests, failure scenarios, and reproducible benchmarks.

## 4. Non-goals for the initial release

- A real ride-booking marketplace, driver/customer mobile apps, or payment processing.
- Real personal or location data. Use synthetic data only.
- Multi-region deployment, Kubernetes, service mesh, or cloud infrastructure in the MVP.
- A claim of exactly-once end-to-end processing. The initial design uses at-least-once delivery with idempotent database writes.
- Machine-learning predictions or an LLM feature in the MVP.
- Authentication for a private local demo. Any public deployment must add authentication, authorization, rate limiting, secret management, and a security review first.

## 5. Scope and release plan

### MVP — build first
- Python event generator producing valid and intentionally invalid test events.
- Versioned JSON event envelope.
- Kafka topic(s), producer, consumer group, and configurable local broker.
- Consumer-side validation, normalization, structured logging, retry policy, and dead-letter handling.
- PostgreSQL schema managed by migrations.
- Idempotent event persistence using `event_id` uniqueness.
- FastAPI health and read-only metrics endpoints.
- Streamlit dashboard for ride counts, status distribution, estimated completed-ride fare totals, popular routes, and recent events.
- Docker Compose environment, tests, setup instructions, and architecture documentation.

### Later enhancements (only after MVP works)
- Multiple Kafka partitions and partition-key experiments.
- Schema Registry / Avro or Protobuf schema evolution.
- Apache Spark / PySpark for batch or micro-batch processing.
- Airflow for scheduled backfills and warehouse workflows.
- dbt for analytical transformations and data tests.
- Cloud deployment, monitoring/alerting, and infrastructure-as-code.
- Optional anomaly detection after a reliable historical dataset exists.

## 6. Core user journeys

1. A developer clones the repository, configures `.env`, and starts the stack using documented Compose commands.
2. The developer runs the event generator; it emits uniquely identified ride events.
3. The producer publishes events to Kafka.
4. The consumer reads events, validates the envelope and payload, and persists valid events.
5. Invalid or repeatedly failing events are recorded in a dead-letter path with a reason and original payload; they do not silently disappear.
6. A dashboard user opens Streamlit and sees metrics sourced from persisted data through the API.
7. A developer runs tests and a benchmark, then can explain throughput, latency, duplicate handling, and known limitations.

## 7. Functional requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| FR-01 | Generate synthetic ride events with unique `event_id`, event type, schema version, event time, and payload. | Generator emits configurable count/rate; output validates against the schema. |
| FR-02 | Publish events to Kafka and report delivery errors. | Integration test receives a published event; producer logs failures. |
| FR-03 | Consume events using a consumer group. | Consumer processes messages and commits offsets only according to the documented persistence policy. |
| FR-04 | Validate required fields, types, ranges, and supported schema versions. | Valid payload accepted; invalid payload rejected with a reason. |
| FR-05 | Prevent duplicate event persistence. | Replaying the same `event_id` does not create a second stored event or double-count metrics. |
| FR-06 | Persist event records and derived ride data. | Database migrations create schema; repository tests verify writes and reads. |
| FR-07 | Preserve failed events for investigation. | Poison, invalid, or exhausted-failure events appear in PostgreSQL `dead_letter_events` with a sanitized reason, bounded original payload, source topic/partition/offset, attempt count, and failure timestamp. PostgreSQL is the sole durable DLQ in the MVP; no Kafka DLQ topic is used. |
| FR-08 | Expose health and analytics endpoints. | API tests verify status codes, response shape, and time-window filtering. |
| FR-09 | Display analytics and pipeline health. | Dashboard shows empty, loading, error, and populated states. |
| FR-10 | Reproduce the local environment. | A clean setup can start services using the documented Compose workflow. |

## 8. Event model baseline

Use an envelope similar to:

```json
{
  "event_id": "uuid",
  "event_type": "ride.requested",
  "schema_version": 1,
  "occurred_at": "2026-11-01T12:30:00Z",
  "produced_at": "2026-11-01T12:30:01Z",
  "producer": "streamforge-generator",
  "payload": {
    "ride_id": "uuid",
    "rider_id": "synthetic-rider-42",
    "driver_id": null,
    "pickup_city": "Koramangala",
    "dropoff_city": "Electronic City",
    "fare_amount": "250.00",
    "currency": "INR"
  }
}
```

Use ISO-8601 UTC timestamps. Represent money as decimal strings in JSON and `NUMERIC` in PostgreSQL, never binary floating point. Keep event identity separate from ride identity: one ride can have several lifecycle events. Avoid real names, phone numbers, precise addresses, or other personal data.

Initial event types: `ride.requested`, `ride.accepted`, `ride.started`, `ride.completed`, `ride.cancelled`. Define allowed transitions and required payload fields in code and documentation. The accepted baseline uses monotonic ranks REQUESTED=1, ACCEPTED=2, STARTED=3, COMPLETED=4, CANCELLED=4; late lower-ranked events cannot downgrade the ride projection, while conflicting terminal events are rejected and durably dead-lettered. See `docs/adr/0001-mvp-baseline-decisions.md`.

## 9. Quality attributes / non-functional requirements

- **Correctness:** duplicate replay does not double-count; invalid events are observable.
- **Reliability:** transient errors use bounded retries; poison messages have a dead-letter path; offsets are not committed before the persistence outcome is known.
- **Observability:** structured logs include event ID, topic, partition, offset, processing result, and error category where available. Never log secrets.
- **Maintainability:** typed models, small modules, migrations, tests, clear configuration, and documented decisions.
- **Reproducibility:** pinned or bounded dependencies, deterministic test fixtures, Compose-based local services.
- **Performance:** measure throughput and latency under a stated machine/configuration; do not claim unmeasured scale.
- **Security:** synthetic data, environment-based secrets, least privilege where practical, no committed credentials.

## 10. Success metrics

Record measured results rather than inventing targets after the fact:
- events generated / published / consumed per second;
- pipeline ingestion latency (`ingested_at - produced_at`), including p50 and p95, clearly labelled as producer-emission-to-database-ingestion time. `ingested_at` is assigned during the database transaction and is not a measurement of physical transaction commit time. If actual commit-duration measurement is added later, report it as a separate instrumented metric; do not infer it from `ingested_at`.
- accepted-event, rejected/DLQ, duplicate, and retry counts with documented sources: accepted events are derived from `processed_events`, rejected/DLQ events from `dead_letter_events`, and durable duplicate/retry counters from `pipeline_counters`. Published-event counts are reported only if producer-side instrumentation is implemented.
- database insert/query performance for a documented dataset size;
- recovery behavior after consumer restart or database outage.

Every benchmark report must include hardware, Docker/resource settings, event volume, partition count, test duration, and measurement method.

## 11. Definition of done

A feature is done only when its code, tests, documentation, error behavior, and observable evidence are complete. The README must allow another developer to run the MVP from a clean clone. Resume claims must match implemented and measured behavior.

## 12. Approved MVP decisions

The initial implementation decisions are recorded in `docs/adr/0001-mvp-baseline-decisions.md`: Python `src/` package layout; official Apache Kafka image in single-node KRaft mode; `confluent-kafka`; PostgreSQL as the sole durable DLQ; `occurred_at`, `produced_at`, and `ingested_at`; monotonic ride lifecycle policy; PostgreSQL-backed pipeline counters; and the approved synthetic Bengaluru mobility zones. These decisions close the corresponding open questions for the MVP. Any material change requires owner approval and a new or superseding ADR. Do not let an AI agent silently change the baseline.
