"""
Unit tests for the StreamForge Kafka publisher.
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decision 2) & PRD v1.0

Tests:
1. Queue acceptance: enqueued_count increases.
2. Successful delivery: acknowledged_count increases only after callback.
3. Failed delivery: failed_count increases.
4. User callback exception: Does not escape publisher callback.
5. Kafka key: Uses ride_id.
6. Serialization: Produces valid JSON.
7. Temporary queue saturation: Retries after polling upon BufferError.
8. Persistent queue saturation: Stops after configured timeout.
9. Raw test record: Allowed in dev/test, forbidden in production.
10. Dry-run behavior: Standalone testing without broker.
"""

import json
import time
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, List, Dict, Optional, Callable
import pytest

from streamforge.config.settings import Settings
from streamforge.events.schemas import RideEvent, RideEventType, RideRequestedPayload
from streamforge.events.geography import BengaluruZone
from streamforge.producer.publisher import EventPublisher

TEST_TOPIC = "streamforge.rides.v1"


def make_test_event() -> RideEvent:
    """Create a valid PRD v1.0 ride.requested event."""
    return RideEvent.model_validate(
        {
            "event_id": "9d8d7e9a-1a2b-4c3d-8e9f-123456789001",
            "event_type": "ride.requested",
            "schema_version": 1,
            "occurred_at": "2026-11-01T12:30:00Z",
            "produced_at": "2026-11-01T12:30:01Z",
            "producer": "streamforge-test",
            "payload": {
                "ride_id": "ride-test-001",
                "rider_id": "synthetic-rider-42",
                "driver_id": None,
                "pickup_city": "Koramangala",
                "dropoff_city": "Indiranagar",
                "fare_amount": "250.00",
                "currency": "INR",
            },
        }
    )


class MockKafkaProducer:
    """Mock Kafka producer for testing delivery callbacks, queue backpressure, and key routing."""

    def __init__(self, buffer_error_count: int = 0):
        self.produced_records: List[Dict[str, Any]] = []
        self.buffer_error_count = buffer_error_count
        self.pending_callbacks: List[Callable[[], None]] = []
        self.poll_invocations = 0
        self.flush_invocations = 0

    def produce(self, topic: str, key: bytes, value: bytes, on_delivery: Optional[Callable] = None):
        if self.buffer_error_count > 0:
            self.buffer_error_count -= 1
            raise BufferError("Simulated Kafka client buffer queue full")

        record = {"topic": topic, "key": key, "value": value}
        self.produced_records.append(record)

        if on_delivery:
            msg = SimpleNamespace(
                topic=lambda: topic,
                partition=lambda: 0,
                offset=lambda: len(self.produced_records),
            )
            # Store callback for delivery on poll or immediate execution
            self.pending_callbacks.append(lambda: on_delivery(None, msg))

    def poll(self, timeout: float = 0):
        self.poll_invocations += 1
        callbacks = list(self.pending_callbacks)
        self.pending_callbacks.clear()
        for cb in callbacks:
            cb()
        return len(callbacks)

    def flush(self, timeout: Optional[float] = None) -> int:
        self.flush_invocations += 1
        self.poll(0)
        return len(self.pending_callbacks)


@pytest.fixture
def mock_producer():
    return MockKafkaProducer()


@pytest.fixture
def publisher(mock_producer):
    settings = Settings(environment="test", kafka_bootstrap_servers="localhost:9092")
    return EventPublisher(settings=settings, producer=mock_producer, dry_run=False)


def test_queue_acceptance_increases_enqueued_count(publisher, mock_producer):
    """Test area: Queue acceptance — enqueued_count increases and publish returns True."""
    event = make_test_event()
    success = publisher.publish(event, topic=TEST_TOPIC)

    assert success is True
    assert publisher.enqueued_count == 1
    assert publisher.published_count == 1
    assert len(mock_producer.produced_records) == 1


def test_successful_delivery_increases_acknowledged_count(publisher, mock_producer):
    """Test area: Successful delivery — acknowledged_count increases only after broker callback."""
    event = make_test_event()
    publisher.publish(event, topic=TEST_TOPIC)

    # Initial publish enqueued the message and poll(0) drained the ACK callback
    assert publisher.enqueued_count == 1
    assert publisher.acknowledged_count == 1
    assert publisher.failed_count == 0


def test_failed_delivery_increases_failed_count(mock_producer):
    """Test area: Failed delivery — failed_count increases when broker reports delivery failure."""
    def deliver_error(topic, key, value, on_delivery):
        if on_delivery:
            on_delivery(Exception("Kafka broker leader not available"), None)

    mock_producer.produce = deliver_error
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock_producer, dry_run=False)

    event = make_test_event()
    publisher.publish(event, topic=TEST_TOPIC)

    assert publisher.failed_count == 1
    assert publisher.acknowledged_count == 0


def test_user_callback_exception_does_not_escape(mock_producer):
    """Test area: User callback exception — does not crash or escape the publisher."""
    def buggy_callback(err, msg):
        raise RuntimeError("User callback threw unhandled exception!")

    settings = Settings(environment="test")
    publisher = EventPublisher(
        settings=settings,
        delivery_callback=buggy_callback,
        producer=mock_producer,
        dry_run=False,
    )

    event = make_test_event()
    # Must not raise RuntimeError
    success = publisher.publish(event, topic=TEST_TOPIC)
    assert success is True
    assert publisher.acknowledged_count == 1


def test_kafka_key_uses_ride_id(publisher, mock_producer):
    """Test area: Kafka key — Uses event.ride_id to preserve partition ordering."""
    event = make_test_event()
    publisher.publish(event, topic=TEST_TOPIC)

    recorded = mock_producer.produced_records[0]
    assert recorded["key"] == b"ride-test-001"
    assert recorded["topic"] == TEST_TOPIC


def test_serialization_produces_valid_json(publisher, mock_producer):
    """Test area: Serialization — Produces valid JSON string with decimal-string fare."""
    event = make_test_event()
    publisher.publish(event, topic=TEST_TOPIC)

    recorded = mock_producer.produced_records[0]
    payload_dict = json.loads(recorded["value"].decode("utf-8"))

    assert payload_dict["event_id"] == "9d8d7e9a-1a2b-4c3d-8e9f-123456789001"
    assert payload_dict["event_type"] == "ride.requested"
    assert payload_dict["payload"]["fare_amount"] == "250.00"
    assert isinstance(payload_dict["payload"]["fare_amount"], str)


def test_temporary_queue_saturation_retries_after_polling():
    """Test area: Temporary queue saturation — Catches BufferError, polls, and retries successfully."""
    # Saturated for 2 produce calls, then succeeds
    mock_prod = MockKafkaProducer(buffer_error_count=2)
    settings = Settings(environment="test")
    publisher = EventPublisher(
        settings=settings,
        producer=mock_prod,
        dry_run=False,
        queue_wait_timeout_seconds=2.0,
        poll_interval_seconds=0.01,
    )

    event = make_test_event()
    success = publisher.publish(event, topic=TEST_TOPIC)

    assert success is True
    assert publisher.enqueued_count == 1
    assert mock_prod.poll_invocations >= 2


def test_persistent_queue_saturation_stops_after_timeout():
    """Test area: Persistent queue saturation — Stops and returns False after timeout."""
    # Saturated indefinitely
    mock_prod = MockKafkaProducer(buffer_error_count=9999)
    settings = Settings(environment="test")
    publisher = EventPublisher(
        settings=settings,
        producer=mock_prod,
        dry_run=False,
        queue_wait_timeout_seconds=0.1,
        poll_interval_seconds=0.02,
    )

    event = make_test_event()
    success = publisher.publish(event, topic=TEST_TOPIC)

    assert success is False
    assert publisher.enqueued_count == 0
    assert publisher.failed_count == 1


def test_raw_test_record_allowed_in_dev_and_test(mock_producer):
    """Test area: Raw test record — Allowed in development or test environment for DLQ testing."""
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock_producer, dry_run=False)

    raw_payload = {
        "event_id": "malformed-evt-999",
        "corrupted_structure": True,
    }
    success = publisher.publish_raw_test_record(raw_payload, key="ride-bad-001")

    assert success is True
    assert len(mock_producer.produced_records) == 1
    recorded = mock_producer.produced_records[0]
    assert recorded["key"] == b"ride-bad-001"
    assert json.loads(recorded["value"].decode("utf-8"))["event_id"] == "malformed-evt-999"


def test_raw_test_record_forbidden_in_production(mock_producer):
    """Test area: Raw test record — Strictly forbidden in production environment."""
    settings = Settings(environment="production")
    publisher = EventPublisher(settings=settings, producer=mock_producer, dry_run=False)

    with pytest.raises(RuntimeError, match="publish_raw_test_record is only permitted"):
        publisher.publish_raw_test_record({"event_id": "bad-1"})


def test_dry_run_behavior():
    """Test area: Dry-run behavior — Publishes cleanly in standalone mode without Kafka."""
    callback_fired = False

    def on_ack(err, msg):
        nonlocal callback_fired
        callback_fired = True

    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, delivery_callback=on_ack, dry_run=True)

    event = make_test_event()
    success = publisher.publish(event)

    assert success is True
    assert publisher.enqueued_count == 1
    assert publisher.acknowledged_count == 1
    assert callback_fired is True
    assert publisher.flush() == 0
