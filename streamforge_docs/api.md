# StreamForge — API Specification

**API framework:** FastAPI · **Role:** Read-only application/query API for the dashboard in the MVP.

## 1. Design principles

- REST-style JSON endpoints with stable, typed response models.
- The API is a read-side interface; Kafka ingestion remains in the producer/consumer pipeline.
- Validate query parameters, cap time ranges and page sizes, and use explicit timezones.
- Return consistent errors and never expose stack traces, secrets, raw database errors, or internal infrastructure details.
- Generate and publish OpenAPI documentation through FastAPI; keep this document and response models aligned.

## 2. Base path and versioning

Use `/api/v1` for application endpoints. Health endpoints may live under `/health` for orchestration. Breaking response changes require a versioning decision and documentation update.

## 3. Initial endpoint contract

### Shared metric semantics

- All API time intervals are half-open: `[from, to)`. Timestamps must include a timezone and are normalized to UTC.
- Unless an endpoint explicitly says otherwise, business-event filters use `occurred_at`; ingestion/arrival filters use `ingested_at`.
- **Cancellation-rate cohort:** select rides whose `rides.requested_at` is in `[from, to)`. Within that cohort, `cancelled_terminal_rides` is the count of distinct rides whose current terminal status is `CANCELLED`; `eligible_terminal_rides` is the count of distinct rides in that cohort whose current terminal status is either `COMPLETED` or `CANCELLED`. `cancellation_rate = cancelled_terminal_rides / eligible_terminal_rides`. Pending and in-progress rides are excluded from the denominator. Return `null` when the denominator is zero. This is a terminal-outcome rate, not cancellations divided by all requested rides. The cohort is based on request time, not cancellation-event time.
- **Pipeline ingestion latency:** `ingested_at - produced_at`, in milliseconds. This is producer-emission-to-database-ingestion delay, not physical database commit duration.

### `GET /health/live`
Liveness only: confirms the API process is running. It should not fail merely because a downstream service is temporarily unavailable.

Example:
```json
{"status":"ok"}
```

### `GET /health/ready`
Readiness: checks required dependencies with short timeouts and returns a clear degraded/unavailable status. Do not expose credentials or raw connection strings.

### `GET /api/v1/metrics/overview`
Query parameters:
- `from`: optional ISO-8601 timestamp with timezone.
- `to`: optional ISO-8601 timestamp with timezone.
- `time_basis`: `event_time` or `ingested_at`; default is `event_time` (`occurred_at`). The selected basis applies to `total_events`; ride cohort metrics retain their explicitly documented `requested_at` basis.

Response shape (illustrative contract; `total_events` uses the selected `time_basis`; `completed_rides` and `cancelled_terminal_rides` are distinct rides whose `requested_at` falls in the requested cohort; completed fare total sums fares for completed rides in that same request-time cohort):
```json
{
  "generated_at": "2026-11-01T12:30:00Z",
  "time_range": {"from": "...", "to": "...", "time_basis": "event_time"},
  "currency": "INR",
  "total_events": 1200,
  "completed_rides": 420,
  "cancelled_terminal_rides": 35,
  "eligible_terminal_rides": 455,
  "cancellation_rate": 0.0769,
  "completed_fare_total": "105000.00"
}
```

### `GET /api/v1/metrics/events-over-time`
Query parameters: `from`, `to`, `interval` (`minute`, `hour`, `day`), bounded maximum range. Return time buckets, event counts, and explicitly named timestamp basis.

### `GET /api/v1/metrics/ride-status`
Return counts by current derived ride status for rides whose `requested_at` is in `[from, to)`. Count distinct rides, not raw lifecycle event rows; pending, in-progress, and terminal states are mutually exclusive current projection states.

### `GET /api/v1/metrics/top-routes`
Query parameters: `from`, `to`, `limit` (default small, hard maximum e.g. 20). Return pickup, dropoff, distinct ride count, and documented ranking basis. The MVP cohort is based on `rides.requested_at` in `[from, to)`.

### `GET /api/v1/events`
Query parameters: `from`, `to`, `event_type`, `limit` (default 50, hard maximum 200), and an opaque cursor or stable page mechanism. Return event metadata and synthetic identifiers; do not return sensitive raw payload fields by default.

### `GET /api/v1/metrics/pipeline`
Return only values supported by a defined source and measurement method. MVP source mapping:

- `accepted_events`: count of rows in `processed_events` for the requested ingestion-time window (or clearly labelled all-time total when no window is supplied).
- `dead_letter_events`: count of rows in `dead_letter_events`, optionally filtered by `failed_at` for a requested failure-time window.
- `duplicates_ignored` and `transient_retries`: durable cumulative values from PostgreSQL `pipeline_counters`; do not present them as windowed counts unless the schema is extended to store time buckets.
- `published_events`: unavailable until producer-side durable/observable instrumentation exists.
- `consumer_lag`: unavailable unless measured from actual Kafka consumer-group metadata.
- `processing_rate`: return only if measured over a stated interval with a documented numerator and clock; otherwise unavailable.
- `pipeline_ingestion_latency`: calculate from `ingested_at - produced_at` for accepted events with both timestamps; report sample count and percentile method. This is not physical transaction commit duration.

A missing or uninstrumented metric must be represented as unavailable (`null` plus an availability/status field in the response contract), not zero. Counts derived from event/DLQ tables must be labelled as derived counts, not durable counters.

## 4. Error format

Use a consistent error body, for example:
```json
{
  "error": {
    "code": "INVALID_TIME_RANGE",
    "message": "The requested time range is invalid.",
    "request_id": "..."
  }
}
```
Do not return exception tracebacks to clients. Use appropriate HTTP status codes: 400 for invalid query input, 404 for missing resources, 422 for validation errors where appropriate, 429 for rate limiting if enabled, and 5xx for unexpected server/dependency failures.

## 5. Validation rules

- Require timezone-aware timestamps; normalize internally to UTC.
- Require `from < to`; cap maximum range per endpoint.
- Restrict interval and event-type values to known enums.
- Bound `limit` and enforce stable ordering for pagination.
- Parameterize all SQL/ORM queries.
- Reject malformed cursors rather than interpolating them into SQL.

## 6. API implementation structure

```text
src/streamforge/api/
├── main.py
├── dependencies.py
├── routers/
│   ├── health.py
│   ├── metrics.py
│   └── events.py
├── schemas/
└── services/
```

Keep route handlers thin. Put query/business logic in services/repositories. Use Pydantic response models and dependency injection for database sessions/configuration.

## 7. Security requirements

The MVP is local/private. Before public exposure, implement authentication and authorization, TLS, rate limiting, request-size limits, CORS allowlists where relevant, secret management, dependency updates, and security tests. Avoid unrestricted data export and resource-heavy query ranges. Follow OWASP API security guidance.

## 8. Testing

- Test success and validation/error responses for every endpoint.
- Test time boundaries, timezone normalization, pagination, and maximum limits.
- Test database unavailable/readiness behavior.
- Test that aggregate endpoints count distinct rides correctly and do not double-count duplicate events.
- Verify generated OpenAPI schema reflects actual request/response models.

## 9. References

- FastAPI: https://fastapi.tiangolo.com/
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- OWASP API Security: https://owasp.org/www-project-api-security/
