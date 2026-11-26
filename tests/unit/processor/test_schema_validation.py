"""Semantic schema validation and failure classification tests."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from streamforge.producer.generator import RideEventGenerator
from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideCancelledPayload,
)
from streamforge.processor.engine import StreamProcessor
from streamforge.storage.repository import InMemoryRepository


@pytest.fixture
def repository():
    return InMemoryRepository()


@pytest.fixture
def processor(repository):
    return StreamProcessor(repository=repository)


def test_schema_validation_failure_is_classified_correctly(processor, repository):
    """Test 1: Pydantic validation failure is quarantined with failure_category='validation_error'."""
    generator = RideEventGenerator(seed=42)
    event = generator.generate_full_ride_lifecycle(ride_id="ride-schema-001")[0]
    raw = event.to_kafka_dict()
    # Invalidate schema: unapproved zone
    raw["payload"]["pickup_city"] = "UnapprovedCity"

    result = processor.process_raw_message(
        raw_payload=raw,
        source_partition=1,
        source_offset=123,
        source_topic="streamforge.rides.v1",
    )

    assert result.status == "quarantined"
    assert "SchemaValidationError" in result.error_reason
    record = repository.dead_letter_events[result.dlq_id]
    assert record["failure_category"] == "validation_error"
    assert record["source_partition"] == 1
    assert record["source_offset"] == 123
    assert record["source_topic"] == "streamforge.rides.v1"
    assert record["event_id"] == event.event_id


def test_terminal_state_conflict_is_classified_as_invalid_state_transition(processor, repository):
    """Test 2: Terminal conflict (CANCELLED after COMPLETED) is quarantined with failure_category='invalid_state_transition'."""
    generator = RideEventGenerator(seed=42)
    lifecycle = generator.generate_full_ride_lifecycle(ride_id="ride-schema-002", simulate_cancellation=False)
    # Process up to completed
    for evt in lifecycle:
        res = processor.process_raw_message(evt.to_kafka_dict())
        assert res.status == "accepted"

    # Conflicting CANCELLED event
    now = datetime.now(timezone.utc)
    cancel_evt = RideEvent(
        event_id="EVT-CANCEL-CONFLICT-99",
        event_type=RideEventType.CANCELLED,
        schema_version=1,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=RideCancelledPayload(
            ride_id="ride-schema-002",
            cancelled_by="rider",
            cancellation_reason="changed mind",
            cancellation_fee=Decimal("0.00"),
        ),
    )

    result = processor.process_raw_message(
        cancel_evt.to_kafka_dict(),
        source_partition=3,
        source_offset=456,
        source_topic="streamforge.rides.v1",
    )

    assert result.status == "quarantined"
    assert "invalid_state_transition" in result.error_reason
    record = repository.dead_letter_events[result.dlq_id]
    assert record["failure_category"] == "invalid_state_transition"
    assert record["source_partition"] == 3
    assert record["source_offset"] == 456
    assert record["source_topic"] == "streamforge.rides.v1"
    assert record["event_id"] == "EVT-CANCEL-CONFLICT-99"


def test_missing_event_id_stored_as_none_in_dlq(processor, repository):
    """Test 3: Corrupt event without an event_id stores event_id=None in the DLQ."""
    raw = {
        "event_type": "ride.requested",
        # Missing event_id, occurred_at, produced_at, payload
    }

    result = processor.process_raw_message(
        raw_payload=raw,
        source_partition=0,
        source_offset=789,
        source_topic="streamforge.rides.v1",
    )

    assert result.status == "quarantined"
    assert result.event_id == "UNKNOWN_EVENT_ID"
    record = repository.dead_letter_events[result.dlq_id]
    assert record["event_id"] is None
    assert record["failure_category"] == "validation_error"


def test_database_failure_during_event_processing_propagates():
    """Test 4: Database/repository exceptions propagate and are not converted to false DLQ results."""
    class FaultyRepository(InMemoryRepository):
        def insert_processed_event(self, event, ingested_at=None):
            raise RuntimeError("PostgreSQL processed_events table is read-only")

    faulty_repo = FaultyRepository()
    faulty_processor = StreamProcessor(repository=faulty_repo)

    generator = RideEventGenerator(seed=42)
    event = generator.generate_full_ride_lifecycle(ride_id="ride-schema-004")[0]

    with pytest.raises(RuntimeError, match="PostgreSQL processed_events table is read-only"):
        faulty_processor.process_raw_message(event.to_kafka_dict())

    # Ensure no false DLQ entry was created
    assert len(faulty_repo.dead_letter_events) == 0
