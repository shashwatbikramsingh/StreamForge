# StreamForge — AI Agent & Engineering Rules

**This file is mandatory for Antigravity and every coding assistant working in this repository.** Read it and the relevant specification files before editing code.

## 1. Source-of-truth order

1. `RULES.md` — engineering constraints and agent behavior.
2. `PRD.md` — product scope and acceptance criteria.
3. `architecture.md` — system boundaries and data flow.
4. `database.md`, `api.md`, `frontend.md`, `design.md`, `ai.md` — component contracts.
5. Accepted ADRs — approved architectural decisions; these supersede older unresolved options in component docs.
6. Existing code and tests — actual implementation details, which must be brought back into alignment with approved docs/ADRs rather than treated as permission for undocumented design drift.

If documents conflict, stop and report the conflict. Do not silently choose a direction. Propose a change and wait for the project owner to approve material architecture, scope, dependency, schema, or security changes.

## 2. Required workflow

Before coding:
- Inspect the repository and relevant files; do not assume the directory structure.
- Summarize the task, affected components, acceptance criteria, and risks.
- Identify which documentation and tests need updating.
- Ask before destructive operations or broad refactors.

While coding:
- Make the smallest coherent change that solves the task.
- Follow existing conventions and keep modules focused.
- Prefer typed, readable Python and explicit configuration.
- Add or update tests with the implementation.
- Keep secrets out of source control and logs.
- Do not introduce a new framework/library without explaining why and requesting approval when it changes the approved stack.

After coding:
- Run relevant format/lint/type-check/test commands that exist in the repository.
- Report exact commands and results. Never claim a test passed if it was not run.
- Update docs, `.env.example`, migrations, and README where relevant.
- Summarize changed files, behavior, limitations, and next steps.

## 3. Technology guardrails

Approved baseline: Python, Apache Kafka (single-node KRaft for local development), `confluent-kafka`, PostgreSQL, FastAPI, Streamlit, Docker Compose, pytest, and Alembic-managed schema. `docs/adr/0001-mvp-baseline-decisions.md` records the selected package layout, DLQ ownership, timestamp model, ride state policy, counters, and synthetic geography. Specific library/image versions must be selected deliberately, pinned or bounded, and documented. Do not add Spark, Airflow, dbt, cloud services, React, Kubernetes, or an AI model to the MVP unless the owner explicitly approves the relevant phase.

## 4. Data and event correctness

- Treat events as untrusted input. Validate schema version, required fields, types, enums, timestamps, and numeric ranges.
- Use UTC ISO-8601 timestamps and timezone-aware datetimes.
- Use `Decimal` in Python and `NUMERIC` in PostgreSQL for money.
- Keep `event_id` (event identity) separate from `ride_id` (business entity identity).
- Enforce idempotency with database constraints and transaction logic, not only in-memory sets.
- Do not claim end-to-end exactly-once semantics. Explain at-least-once delivery and idempotent effects.
- Do not commit Kafka offsets before the relevant PostgreSQL transaction is durable. For the MVP, PostgreSQL `dead_letter_events` is the sole durable DLQ; commit the source offset only after the DLQ row is committed. Preserve per-partition offset order.
- Never silently drop malformed, duplicate, or failed messages; classify and count them.
- Keep raw event evidence immutable where the data model specifies it.

## 5. Security and privacy

- Use synthetic data only. Never add real customer names, phone numbers, credentials, or precise personal location data.
- Read secrets from environment variables; commit only `.env.example` placeholders.
- Never print credentials, tokens, connection strings, or full sensitive payloads in logs.
- Use parameterized SQL / ORM bindings; never concatenate untrusted input into SQL.
- Bound API pagination, query windows, payload sizes, and request rates where exposed.
- Do not expose Kafka, PostgreSQL, or administrative endpoints publicly by default.
- Before any public deployment, require authentication/authorization, TLS, secret management, rate limiting, dependency review, and a threat/security review.

## 6. Code quality

- Use clear names, small functions, explicit interfaces, and separation of concerns.
- Avoid giant files, hidden global state, duplicated business rules, and unnecessary abstractions.
- Centralize configuration and validate it at startup.
- Use structured logs with correlation fields such as event ID and Kafka coordinates.
- Handle exceptions specifically; do not swallow errors with bare `except` or empty handlers.
- Add docstrings/comments for non-obvious decisions, not line-by-line narration.
- Keep dependencies minimal and justify every new dependency.

## 7. Database and migrations

- All schema changes must be represented by a migration.
- Never modify an applied migration to change an existing environment; create a new migration.
- Add constraints and indexes based on documented access patterns.
- Use transactions for event insert + projection update.
- Do not run destructive migrations or wipe persistent volumes without explicit approval.

## 8. Tests and quality gates

- Unit-test pure validation, transformation, and state-transition logic.
- Integration-test Kafka and PostgreSQL boundaries where feasible.
- Test duplicate replay, invalid schema, transient database outage, consumer restart, and DLQ failure behavior.
- Test API response schemas, error cases, time filters, and pagination.
- Test dashboard empty/loading/error states where practical.
- Use deterministic fixtures and fixed seeds for reproducible tests.
- Never weaken or delete a test simply to make a change pass without explaining the underlying issue and getting approval.

## 9. Antigravity task protocol

For every task, return:
1. **Understanding:** concise restatement of the requested change.
2. **Plan:** files/components to touch and acceptance criteria.
3. **Implementation:** focused changes only.
4. **Verification:** commands executed and truthful results.
5. **Documentation:** docs updated or why no update was needed.
6. **Learning notes:** explain important concepts and trade-offs for the student.
7. **Interview questions:** 2–5 questions based on the work, with concise answer outlines.

Do not implement the entire project in one prompt. Work phase by phase and wait for the owner to review each milestone.

## 10. Prohibited behavior

- Do not invent benchmark results, scale claims, test results, or completed features.
- Do not fabricate credentials, external services, or API responses.
- Do not rewrite the architecture, rename major modules, or delete files without approval.
- Do not add placeholder code that looks complete but is not functional.
- Do not hide errors or make the dashboard display simulated metrics as live production data.
- Do not put generated secrets or local data files into Git.

## 11. Definition of done

The change meets its acceptance criteria, tests are added and run, failures/limitations are disclosed, docs/config examples are updated, and the owner can understand the implementation. The student must be able to explain the code; prioritize teaching over opaque code generation.
