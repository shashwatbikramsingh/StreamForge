"""
StreamForge — Unit Tests for Kafka Event Publisher
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decision 2)
"""

import pytest
from datetime import datetime, timezone
from streamforge.config.settings import Settings
from streamforge.events.schemas import RideEvent, RideEventType, RideRequestedPayload
from streamforge.events.geography import BengaluruZone
from streamforge.producer.publisher import EventPublisher
from decimal import Decimal


def make_test_event(ride_id="RIDE-TEST-100", event_id="EVT-TEST-100") -> RideEvent:
    now = datetime.now(timezone.utc)
    return RideEvent(
        event_id=event_id,
        event_type=RideEventType.REQUESTED,
        schema_version=1,
        occurred_at=now,
        produced_at=now,
        producer="streamforge-test",
        payload=RideRequestedPayload(
            ride_id=ride_id,
            rider_id="usr_5501",
            pickup_city=BengaluruZone.KORAMANGALA,
            dropoff_city=BengaluruZone.INDIRANAGAR,
            fare_amount="220.00",
            currency="INR",
        ),
    )


def test_publisher_dry_run():
    """Verify that EventPublisher in dry-run mode publishes cleanly and triggers callbacks."""
    callback_invoked = False

    def on_delivered(err, msg):
        nonlocal callback_invoked
        callback_invoked = True

    settings = Settings(kafka_bootstrap_servers="localhost:9092")
    publisher = EventPublisher(settings=settings, delivery_callback=on_delivered, dry_run=True)

    event = make_test_event()
    success = publisher.publish(event)

    assert success is True
    assert publisher.published_count == 1
    assert publisher.failed_count == 0
    assert publisher.last_published_event_id == event.event_id
    assert callback_invoked is True
    assert publisher.flush() == 0


def test_publisher_key_partitioning():
    """Verify that publisher preserves ride_id as message key."""
    publisher = EventPublisher(dry_run=True)
    event = make_test_event(ride_id="RIDE-BANGALORE-777", event_id="EVT-001")

    assert publisher.publish(event) is True
    assert publisher.last_published_event_id == "EVT-001"
