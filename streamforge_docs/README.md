# StreamForge Documentation Pack

StreamForge is a learning-focused real-time event streaming and analytics platform using synthetic ride-booking events.

## Read these first

1. [`RULES.md`](RULES.md) — mandatory instructions for Antigravity and contributors.
2. [`PRD.md`](PRD.md) — what the product must do and what is out of scope.
3. [`architecture.md`](architecture.md) — components, data flow, delivery semantics, and repository structure.
4. `adr/0001-mvp-baseline-decisions.md` — accepted MVP architecture and data decisions.
5. Read component specifications before changing the corresponding component.

## Document map

| File | Purpose |
|---|---|
| `PRD.md` | Product vision, scope, requirements, acceptance criteria |
| `architecture.md` | System architecture, data flow, reliability and scaling |
| `RULES.md` | AI-agent workflow, code quality, safety and testing rules |
| `design.md` | Dashboard UX, metrics, states and visual direction |
| `frontend.md` | Streamlit dashboard implementation contract |
| `api.md` | FastAPI endpoint and response contracts |
| `database.md` | PostgreSQL tables, constraints, indexes and transactions |
| `ai.md` | AI/ML future scope and guardrails |
| `adr/0001-mvp-baseline-decisions.md` | Accepted MVP architecture and data decisions |

## Important project rule

These documents and accepted ADRs define the approved baseline, not proof that a feature is implemented. Update them when an approved design changes. Do not claim planned capabilities as completed capabilities.

## Suggested Antigravity starting prompt

> Before making any changes, read `docs/RULES.md`, `docs/PRD.md`, `docs/architecture.md`, and the relevant component specifications. Do not generate the whole application at once. First inspect the repository, report the current state, identify conflicts or missing decisions, and propose a small Day 1 implementation plan with acceptance criteria. Wait for my approval before coding. Explain concepts as you go and do not invent test or benchmark results.

## External technical references

- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Kafka design / semantics: https://kafka.apache.org/documentation/#semantics
- PostgreSQL documentation: https://www.postgresql.org/docs/
- Docker Compose: https://docs.docker.com/compose/
- FastAPI: https://fastapi.tiangolo.com/
- Streamlit: https://docs.streamlit.io/
- Streamlit caching: https://docs.streamlit.io/develop/concepts/architecture/caching
- OWASP API Security: https://owasp.org/www-project-api-security/
