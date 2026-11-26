"""Unit tests for PostgresRepository using mocked connection pools and transactions.

Verifies transactional boundaries, SQL statements, commits, rollbacks,
DLQ bounding, counter atomicity, and pool lifecycle without requiring a running database.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List
from unittest.mock import MagicMock, patch

import pytest
from psycopg import OperationalError

import streamforge.storage.postgres_repository as postgres_module
from streamforge.events.geography import BengaluruZone
from streamforge.events.schemas import (
    RideCancelledPayload,
    RideEvent,
    RideEventType,
    RideRequestedPayload,
)
from streamforge.storage.postgres_repository import PostgresRepository


# ---------------------------------------------------------------------
# Mock database infrastructure
# ---------------------------------------------------------------------

def make_connection(fetchone_values=()):
    """Create a mocked connection with observable transaction outcomes."""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchone.side_effect = list(fetchone_values)
    transaction_events: List[str] = []

    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = None
    conn.cursor.return_value = cursor

    @contextmanager
    def transaction_context():
        transaction_events.append("BEGIN")
        try:
            yield
            transaction_events.append("COMMIT")
        except Exception:
            transaction_events.append("ROLLBACK")
            raise

    conn.transaction = transaction_context
    conn.transaction_events = transaction_events
    conn.cursor_mock = cursor
    return conn


def make_mock_pool(conn: MagicMock, closed: bool = False) -> MagicMock:
    """Create a mock connection pool returning the given connection."""
    pool = MagicMock()
    pool.closed = closed
    pool.connection.return_value.__enter__.return_value = conn
    pool.connection.return_value.__exit__.return_value = None
    return pool


def _create_sample_ride_requested_event(
    event_id: str = "EVT-MOCK-001",
    ride_id: str = "RIDE-MOCK-001",
) -> RideEvent:
    """Helper to create a valid RideRequested event envelope."""
    payload = RideRequestedPayload(
        ride_id=ride_id,
        rider_id="RIDER-001",
        pickup_city=BengaluruZone.KORAMANGALA,
        dropoff_city=BengaluruZone.INDIRANAGAR,
        fare_amount=Decimal("350.00"),
    )
    now = datetime.now(timezone.utc)
    return RideEvent(
        event_id=event_id,
        event_type=RideEventType.REQUESTED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=payload,
    )


def _create_sample_ride_cancelled_event(
    event_id: str = "EVT-MOCK-002",
    ride_id: str = "RIDE-MOCK-001",
) -> RideEvent:
    """Helper to create a valid RideCancelled event envelope."""
    payload = RideCancelledPayload(
        ride_id=ride_id,
        cancelled_by="rider",
        cancellation_reason="Rider changed mind",
        cancellation_fee=Decimal("50.00"),
    )
    now = datetime.now(timezone.utc)
    return RideEvent(
        event_id=event_id,
        event_type=RideEventType.CANCELLED,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=payload,
    )


# ---------------------------------------------------------------------
# Phase C: 10 Mocked-Pool Tests
# ---------------------------------------------------------------------

def test_persist_valid_event_commits_event_and_projection():
    """Scenario 1: New event inserts into processed_events and updates rides projection in one atomic transaction."""
    event = _create_sample_ride_requested_event()
    # 1st fetchone: insert processed_events -> returns row with ID
    # 2nd fetchone: upsert rides -> returns updated status and rank
    conn = make_connection(
        fetchone_values=[
            {"id": 1},
            {"status": "ride.requested", "status_rank": 0},
        ]
    )
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    result = repo.persist_event_and_projection(
        event,
        source_topic="streamforge.rides.v1",
        source_partition=1,
        source_offset=100,
    )

    assert result.status == "accepted"
    assert result.is_duplicate is False
    assert result.has_conflict is False
    assert conn.transaction_events == ["BEGIN", "COMMIT"]
    assert conn.cursor_mock.execute.call_count == 2

    first_call_sql = conn.cursor_mock.execute.call_args_list[0][0][0]
    second_call_sql = conn.cursor_mock.execute.call_args_list[1][0][0]
    assert "INSERT INTO processed_events" in first_call_sql
    assert "INSERT INTO rides" in second_call_sql
    assert "ON CONFLICT (ride_id) DO UPDATE" in second_call_sql


def test_persist_duplicate_event_increments_counter_and_preserves_projection():
    """Scenario 2: Duplicate event insert returns None, increments duplicates_ignored counter, and does NOT touch rides."""
    event = _create_sample_ride_requested_event()
    # 1st fetchone: insert processed_events returns None (conflict DO NOTHING)
    # 2nd fetchone: counter increment returns new value
    conn = make_connection(
        fetchone_values=[
            None,
            {"metric_value": 7},
        ]
    )
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    result = repo.persist_event_and_projection(event)

    assert result.status == "duplicate"
    assert result.is_duplicate is True
    assert result.has_conflict is False
    assert conn.transaction_events == ["BEGIN", "COMMIT"]
    assert conn.cursor_mock.execute.call_count == 2

    first_call_sql = conn.cursor_mock.execute.call_args_list[0][0][0]
    second_call_sql = conn.cursor_mock.execute.call_args_list[1][0][0]
    assert "INSERT INTO processed_events" in first_call_sql
    assert "pipeline_counters" in second_call_sql
    assert "duplicates_ignored" in conn.cursor_mock.execute.call_args_list[1][0][1]


def test_persist_terminal_conflict_triggers_transaction_rollback():
    """Scenario 3: Conflicting terminal update causes upsert returning None, rolling back tentative insert."""
    event = _create_sample_ride_cancelled_event()
    # 1st fetchone: processed_events insert succeeds tentatively
    # 2nd fetchone: rides upsert returns None (WHERE condition rejected conflict)
    # 3rd fetchone: rides query returns existing terminal state
    conn = make_connection(
        fetchone_values=[
            {"id": 2},
            None,
            {"status": "ride.completed"},
        ]
    )
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    result = repo.persist_event_and_projection(event)

    assert result.status == "conflict"
    assert result.has_conflict is True
    assert result.is_duplicate is False
    assert "Terminal conflict" in (result.conflict_reason or "")
    assert "ride.completed" in (result.conflict_reason or "")
    assert "ride.cancelled" in (result.conflict_reason or "")
    # Transaction MUST have rolled back
    assert conn.transaction_events == ["BEGIN", "ROLLBACK"]


def test_insert_dead_letter_commits_in_independent_transaction():
    """Scenario 4: DLQ record is inserted and committed in an independent transaction, returning formatted ID."""
    conn = make_connection(fetchone_values=[{"id": 1}])
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    dlq_id = repo.insert_dead_letter(
        event_id="EVT-BAD-001",
        raw_payload={"corrupted": True},
        error_reason="Invalid JSON syntax",
        source_partition=3,
        source_offset=4200,
        source_topic="streamforge.rides.v1",
        failure_category="deserialization_error",
        ride_id="RIDE-BAD-001",
    )

    assert dlq_id == "DLQ-000001"
    assert conn.transaction_events == ["BEGIN", "COMMIT"]
    assert conn.cursor_mock.execute.call_count == 1
    sql = conn.cursor_mock.execute.call_args[0][0]
    assert "INSERT INTO dead_letter_events" in sql


def test_database_exception_during_persistence_propagates_without_false_success():
    """Scenario 5: Infrastructure errors (OperationalError) bubble up uncaught and trigger ROLLBACK."""
    event = _create_sample_ride_requested_event()
    conn = make_connection()
    conn.cursor_mock.execute.side_effect = OperationalError("connection terminated unexpectedly")
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    with pytest.raises(OperationalError, match="connection terminated unexpectedly"):
        repo.persist_event_and_projection(event)

    assert conn.transaction_events == ["BEGIN", "ROLLBACK"]


def test_dlq_payload_and_reason_bounding():
    """Scenario 6: DLQ payload and reason strings exceeding maximum limits are safely truncated."""
    conn = make_connection(fetchone_values=[{"id": 42}])
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    huge_reason = "X" * 3000
    huge_payload = {"key": "A" * 600000}

    dlq_id = repo.insert_dead_letter(
        event_id="EVT-HUGE-001",
        raw_payload=huge_payload,
        error_reason=huge_reason,
        failure_category="processing_error",
    )

    assert dlq_id == "DLQ-000042"
    params = conn.cursor_mock.execute.call_args[0][1]
    reason_param = params[6]
    payload_param = params[7]

    assert len(reason_param) <= 2000
    assert len(payload_param.encode("utf-8")) <= 512 * 1024


def test_dlq_invalid_failure_category_rejected():
    """Scenario 7: Unsupported DLQ failure categories raise ValueError without touching the database."""
    conn = make_connection()
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    with pytest.raises(ValueError, match="Unsupported DLQ failure category"):
        repo.insert_dead_letter(
            event_id="EVT-01",
            raw_payload={"test": 1},
            error_reason="Test reason",
            failure_category="unregistered_failure_type",
        )

    # Database cursor was never invoked
    conn.cursor_mock.execute.assert_not_called()


def test_pipeline_counters_atomic_increment_and_retrieval():
    """Scenario 8: Counters atomically increment via UPSERT and retrieve current values via SELECT."""
    conn = make_connection(
        fetchone_values=[
            {"metric_value": 15},
            {"metric_value": 15},
        ]
    )
    pool = make_mock_pool(conn)
    repo = PostgresRepository(pool=pool)

    inc_val = repo.increment_counter("events_processed", delta=5)
    assert inc_val == 15
    assert conn.transaction_events == ["BEGIN", "COMMIT"]

    get_val = repo.get_counter("events_processed")
    assert get_val == 15
    select_sql = conn.cursor_mock.execute.call_args_list[1][0][0]
    assert "SELECT metric_value FROM pipeline_counters" in select_sql


def test_connection_pool_lifecycle_lazy_open_and_close(monkeypatch):
    """Scenario 9: Connection pool initializes with open=False, lazily opens on first checkout, and closes on exit."""
    mock_pool = MagicMock()
    mock_pool.closed = True
    mock_pool.connection.return_value.__enter__.return_value = MagicMock()
    mock_pool.connection.return_value.__exit__.return_value = None

    mock_pool_cls = MagicMock(return_value=mock_pool)
    monkeypatch.setattr(postgres_module, "ConnectionPool", mock_pool_cls)

    repo = PostgresRepository()
    assert repo._owns_pool is True
    mock_pool_cls.assert_called_once()
    assert mock_pool_cls.call_args[1].get("open") is False
    mock_pool.open.assert_not_called()

    # Accessing connection triggers lazy pool opening
    repo._connection()
    mock_pool.open.assert_called_once()

    # Calling close on owned pool closes it
    mock_pool.closed = False
    repo.close()
    mock_pool.close.assert_called_once()


def test_injected_pool_ownership_preserved():
    """Scenario 10: An externally injected pool is NOT owned by repository and is NOT closed on repo.close()."""
    injected_pool = MagicMock()
    injected_pool.closed = False

    repo = PostgresRepository(pool=injected_pool)
    assert repo._owns_pool is False

    repo.close()
    injected_pool.close.assert_not_called()


def test_dlq_oversized_identifiers_do_not_break_quarantine():
    """Scenario 11: Oversized event_id or ride_id are sanitized to NULL in relational columns while retained in payload."""
    conn = make_connection(fetchone_values=[{"id": 52}])
    pool = make_mock_pool(conn)
    repository = PostgresRepository(pool=pool)
    oversized_event_id = "E" * 129
    oversized_ride_id = "R" * 65
    dlq_id = repository.insert_dead_letter(
        event_id=oversized_event_id,
        ride_id=oversized_ride_id,
        raw_payload={
            "event_id": oversized_event_id,
            "ride_id": oversized_ride_id,
        },
        error_reason="Malformed identifiers",
        failure_category="validation_error",
    )
    assert dlq_id == "DLQ-000052"
    params = conn.cursor_mock.execute.call_args.args[1]
    # Unsafe relational identifiers become NULL.
    assert params[0] is None
    assert params[1] is None
    # Original values remain in the forensic payload.
    assert oversized_event_id in params[7]
    assert oversized_ride_id in params[7]


def test_projection_sql_preserves_first_non_null_driver_and_final_fare():
    """Scenario 12: Upsert SQL COALESCE order preserves existing non-null driver_id and final_fare."""
    sql = " ".join(
        postgres_module._UPSERT_RIDE_PROJECTION_SQL.split()
    )
    assert (
        "driver_id = COALESCE(rides.driver_id, EXCLUDED.driver_id)"
        in sql
    )
    assert (
        "final_fare = COALESCE(rides.final_fare, EXCLUDED.final_fare)"
        in sql
    )

