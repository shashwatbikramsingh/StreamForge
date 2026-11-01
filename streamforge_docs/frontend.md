# StreamForge — Frontend (Streamlit Dashboard) Specification

## 1. Purpose and boundary

The frontend is a Streamlit-based internal analytics dashboard. It visualizes data exposed by the StreamForge FastAPI read API. It is not a separate React application and must not implement event ingestion, Kafka consumption, or core business-state transitions.

## 2. Approved stack

- Python + Streamlit for the UI.
- `httpx` (or another explicitly approved HTTP client) for calls to FastAPI.
- Pandas only where tabular transformation is useful; avoid loading unbounded datasets.
- Plotly or Streamlit-native charts, selected once and used consistently.

Pin/bound versions in the project dependency configuration. Do not add a JavaScript frontend framework to the MVP.

## 3. Suggested module layout

```text
src/streamforge/dashboard/
├── app.py                 # Streamlit entry point
├── pages/
│   ├── overview.py
│   └── pipeline.py
├── services/
│   └── api_client.py      # HTTP calls, timeout and error mapping
├── components/
│   ├── kpi.py
│   ├── charts.py
│   └── tables.py
└── config.py
```

Adjust only through an approved architecture change if the repository's actual package layout differs.

## 4. API integration contract

- Base URL comes from `STREAMFORGE_API_BASE_URL`.
- Set explicit connect/read timeouts.
- Handle connection errors, non-2xx responses, invalid JSON, and schema mismatches.
- Use API endpoints defined in `api.md`; do not invent endpoints independently.
- Send time filters and pagination parameters; never download the full events table for a chart.
- Show the response's `generated_at` / freshness metadata where provided.
- Do not query PostgreSQL directly from Streamlit and do not connect to Kafka.

## 5. Pages

### Overview
- Health and freshness summary.
- KPI cards: event count, completed rides, cancellation rate, completed fare total.
- Time series and status distribution.
- Popular routes and recent events.

### Pipeline
- Show accepted-event counts derived from `processed_events`, DLQ/rejected counts derived from `dead_letter_events`, and durable `duplicates_ignored` / `transient_retries` from `pipeline_counters`. Published counts, processing rate, and consumer lag are unavailable until instrumented. Pipeline ingestion latency is `ingested_at - produced_at` (producer emission to database ingestion, not physical commit duration). Never display unavailable metrics as zero.
- Clearly mark unavailable metrics as `Not instrumented` rather than using fabricated values.

## 6. State management and performance

- Keep filter state in Streamlit session state only where needed.
- Use `st.cache_data` for read-only API results with an explicit TTL and cache key that includes all filters. Do not cache data longer than its freshness requirement.
- Use `st.cache_resource` only for reusable thread-safe resources.
- Avoid an aggressive refresh loop. Make refresh interval configurable and visible.
- Keep chart datasets aggregated server-side where possible.
- Add pagination for tables and sensible maximum date ranges.

## 7. Configuration and security

Required setting: `STREAMFORGE_API_BASE_URL`. Do not put API keys, passwords, or database connection strings in the dashboard source. If authentication is added later, use a documented token/session strategy and never share user-specific cached results across sessions.

## 8. Tests

- Unit tests for API-client URL construction, query parameters, timeout/error mapping, and response parsing.
- Component tests or smoke tests for empty/error/populated states where practical.
- Integration/smoke test against a running API in the full Compose environment.
- Verify no direct Kafka or database dependency exists in dashboard modules.

## 9. Acceptance criteria

The dashboard starts using documented commands, obtains data only through FastAPI, renders all documented states, displays metric units/time basis, and remains responsive with a bounded event dataset.

## 10. References

- Streamlit docs: https://docs.streamlit.io/
- Caching: https://docs.streamlit.io/develop/concepts/architecture/caching
