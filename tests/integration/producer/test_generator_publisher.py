"""Integration tests for the StreamForge generator-to-publisher flow."""

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, List, Dict, Optional, Callable
import pytest

from streamforge.config.settings import Settings
from streamforge.events.schemas import RideEvent
from streamforge.producer.generator import RideEventGenerator
from streamforge.producer.publisher import EventPublisher

TEST_TOPIC = "streamforge.rides.v1"


class MockKafkaMessage:
    def __init__(self, topic: str = TEST_TOPIC, partition: int = 0, offset: int = 100):
        self._topic = topic
        self._partition = partition
        self._offset = offset

    def topic(self) -> str:
        return self._topic

    def partition(self) -> int:
        return self._partition

    def offset(self) -> int:
        return self._offset


class MockKafkaProducer:
    """Captures published records and allows manual delivery acknowledgments."""

    def __init__(self, auto_ack: bool = True) -> None:
        self.records: List[Dict[str, Any]] = []
        self.callbacks: List[Callable[[], None]] = []
        self.auto_ack = auto_ack

    def produce(
        self,
        topic: str,
        key: bytes,
        value: bytes,
        on_delivery: Optional[Callable] = None,
    ) -> None:
        self.records.append({"topic": topic, "key": key, "value": value})
        if on_delivery:
            msg = MockKafkaMessage(topic=topic, partition=0, offset=len(self.records))
            self.callbacks.append(lambda: on_delivery(None, msg))

    def poll(self, timeout: float = 0) -> int:
        if not self.auto_ack:
            return 0
        cbs = list(self.callbacks)
        self.callbacks.clear()
        for cb in cbs:
            cb()
        return len(cbs)

    def trigger_acks(self) -> int:
        """Manually drain pending callbacks for delayed acknowledgment testing."""
        cbs = list(self.callbacks)
        self.callbacks.clear()
        for cb in cbs:
            cb()
        return len(cbs)

    def flush(self, timeout: Optional[float] = None) -> int:
        self.trigger_acks()
        return len(self.callbacks)


def test_generator_to_publisher_full_lifecycle():
    """Verify end-to-end trace generation, JSON serialization, and ride_id key assignment."""
    generator = RideEventGenerator(seed=42)
    mock = MockKafkaProducer(auto_ack=True)
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock, dry_run=False)

    trace = generator.generate_full_ride_lifecycle(ride_id="RIDE-INTEG-001", simulate_cancellation=False)
    assert len(trace) == 4

    # Publish each lifecycle event
    for event in trace:
        ok = publisher.publish(event, topic=TEST_TOPIC)
        assert ok is True

    # Check publisher counters
    assert publisher.enqueued_count == 4
    assert publisher.acknowledged_count == 4
    assert publisher.failed_count == 0

    # Verify captured Kafka records
    assert len(mock.records) == 4
    expected_types = ["ride.requested", "ride.accepted", "ride.started", "ride.completed"]

    for idx, (record, expected_type) in enumerate(zip(mock.records, expected_types)):
        assert record["topic"] == TEST_TOPIC
        # Partition key MUST strictly match the ride_id
        assert record["key"] == b"RIDE-INTEG-001"

        # Value must be valid JSON matching PRD envelope
        payload = json.loads(record["value"].decode("utf-8"))
        assert payload["event_type"] == expected_type
        assert payload["schema_version"] == 1
        assert payload["producer"] == "streamforge-generator"
        assert payload["payload"]["ride_id"] == "RIDE-INTEG-001"


def test_duplicate_event_published_without_producer_side_filtering():
    """Verify that duplicate event IDs are forwarded to Kafka for consumer idempotency testing."""
    generator = RideEventGenerator(seed=101, duplicate_rate=1.0)
    mock = MockKafkaProducer(auto_ack=True)
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock, dry_run=False)

    # Prime first event
    e1, _ = generator.generate_ride_requested()
    # Second event reuses e1's event_id
    e2, _ = generator.generate_ride_requested()
    assert e1.event_id == e2.event_id

    # Both must be accepted and published
    assert publisher.publish(e1, topic=TEST_TOPIC) is True
    assert publisher.publish(e2, topic=TEST_TOPIC) is True

    assert publisher.enqueued_count == 2
    assert publisher.acknowledged_count == 2

    # Verify both records reached Kafka with identical event_ids
    rec1 = json.loads(mock.records[0]["value"].decode("utf-8"))
    rec2 = json.loads(mock.records[1]["value"].decode("utf-8"))
    assert rec1["event_id"] == rec2["event_id"]


def test_dlq_malformed_test_record_routing():
    """Verify that intentionally schema-invalid records publish via publish_raw_test_record."""
    generator = RideEventGenerator(seed=202, malformed_rate=1.0)
    mock = MockKafkaProducer(auto_ack=True)
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock, dry_run=False)

    malformed_record = next(generator.generate_events(count=1))
    assert isinstance(malformed_record, dict)
    assert malformed_record["event_type"] == "malformed.corrupted"

    # Publish via guarded method
    ok = publisher.publish_raw_test_record(malformed_record, topic=TEST_TOPIC)
    assert ok is True
    assert publisher.enqueued_count == 1
    assert publisher.acknowledged_count == 1

    # Verify broker received valid JSON containing invalid schema
    recorded = mock.records[0]
    payload = json.loads(recorded["value"].decode("utf-8"))
    assert payload["event_type"] == "malformed.corrupted"
    assert payload["payload"]["corrupted"] is True


def test_delivery_acknowledgment_distinguishes_enqueue_from_broker_ack():
    """Verify local enqueue does not increment acknowledged_count until broker ACK arrives."""
    generator = RideEventGenerator(seed=303)
    # auto_ack=False disables automatic ACK on poll(0)
    mock = MockKafkaProducer(auto_ack=False)
    settings = Settings(environment="test")
    publisher = EventPublisher(settings=settings, producer=mock, dry_run=False)

    event, _ = generator.generate_ride_requested()
    ok = publisher.publish(event, topic=TEST_TOPIC)

    # Message was enqueued locally, but broker has not yet acknowledged
    assert ok is True
    assert publisher.enqueued_count == 1
    assert publisher.acknowledged_count == 0

    # Broker sends ACK
    mock.trigger_acks()

    # Now acknowledged_count must be updated
    assert publisher.acknowledged_count == 1
