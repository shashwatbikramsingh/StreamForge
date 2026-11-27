"""Integration test for Kafka-to-PostgreSQL Dead Letter Queue (DLQ) quarantine.

Verifies:
1. Malformed / invalid-schema event published to Kafka broker.
2. StreamConsumerWorker polls and deserializes message.
3. StreamProcessor detects schema validation failure.
4. Record is durably quarantined in PostgreSQL dead_letter_events table.
5. Ingestion transaction is aborted: processed_events and rides remain untouched.
6. Kafka source offset is committed to broker coordinator to prevent head-of-line blocking.
7. Committed offset is queried and confirmed directly from Kafka's group coordinator.
"""

from __future__ import annotations

import time
import uuid
from typing import Any
import pytest
from confluent_kafka import TopicPartition
from confluent_kafka.admin import AdminClient, NewTopic

from streamforge.config.settings import get_settings
from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.producer.publisher import EventPublisher
from streamforge.storage.postgres_repository import PostgresRepository


@pytest.fixture(scope="module")
def live_repo():
    """Module-scoped live PostgreSQL repository connection."""
    repo = PostgresRepository()
    yield repo
    repo.close()


@pytest.fixture(scope="module")
def kafka_admin():
    """Module-scoped Kafka AdminClient."""
    settings = get_settings()
    admin = AdminClient({"bootstrap.servers": settings.kafka_bootstrap_servers})
    return admin


@pytest.fixture
def isolated_topic(kafka_admin):
    """Create a temporary, isolated Kafka topic with 3 partitions for hermetic DLQ testing."""
    topic_name = f"streamforge.dlq.{uuid.uuid4().hex[:8]}"
    new_topic = NewTopic(topic_name, num_partitions=3, replication_factor=1)
    fs = kafka_admin.create_topics([new_topic])
    for _, f in fs.items():
        f.result()

    # Wait for metadata propagation
    deadline = time.time() + 5.0
    while time.time() < deadline:
        md = kafka_admin.list_topics(timeout=2.0)
        if topic_name in md.topics and len(md.topics[topic_name].partitions) == 3:
            break
        time.sleep(0.1)

    yield topic_name

    # Clean up topic after test
    try:
        dfs = kafka_admin.delete_topics([topic_name])
        for _, f in dfs.items():
            f.result()
    except Exception:
        pass


def test_realtime_pipeline_schema_validation_quarantined_to_dlq(live_repo, isolated_topic):
    """
    Scenario 1: Invalid-schema event is quarantined in PostgreSQL DLQ,
    processed_events and rides tables remain clean, and Kafka offset is committed.
    """
    settings = get_settings()
    topic = isolated_topic
    group_id = f"streamforge-dlq-grp-{uuid.uuid4().hex[:8]}"

    invalid_event_id = f"EVT-BAD-{uuid.uuid4().hex[:8].upper()}"
    invalid_ride_id = f"RIDE-BAD-{uuid.uuid4().hex[:8].upper()}"

    # Construct deliberately invalid schema payload
    malformed_payload = {
        "event_id": invalid_event_id,
        "event_type": "ride.requested",
        "schema_version": 999,  # Unsupported schema version
        "occurred_at": "invalid-timestamp-format",
        "produced_at": "invalid-timestamp-format",
        "producer": "streamforge-test",
        "payload": {
            "ride_id": invalid_ride_id,
            "rider_id": "usr_9999",
            "pickup_city": "Atlantis",  # Non-existent zone (not in BengaluruZone enum)
            "dropoff_city": "Koramangala",
            "fare_amount": "-500.00",  # Negative fare violating Decimal constraints
            "currency": "XYZ",  # Unsupported currency
        },
    }

    # -------------------------------------------------------------------------
    # 1. Publish invalid event to Kafka broker
    # -------------------------------------------------------------------------
    delivery_reports = []

    def delivery_callback(err, msg):
        assert err is None, f"Broker delivery failed: {err}"
        delivery_reports.append(msg)

    publisher = EventPublisher(
        settings=settings,
        delivery_callback=delivery_callback,
        dry_run=False,
    )
    assert publisher.dry_run is False, "Publisher unexpectedly in dry-run mode!"

    success = publisher.publish_raw_test_record(
        raw_payload=malformed_payload,
        key=invalid_ride_id,
        topic=topic,
    )
    assert success is True, "Failed to publish malformed record to Kafka"

    unflushed = publisher.flush(timeout_seconds=10.0)
    assert unflushed == 0, f"Publisher flush timed out with {unflushed} remaining messages"
    assert publisher.dry_run_count == 0
    assert publisher.failed_count == 0
    assert publisher.acknowledged_count == 1
    assert len(delivery_reports) == 1

    published_msg = delivery_reports[0]
    target_partition = published_msg.partition()
    published_offset = published_msg.offset()

    # -------------------------------------------------------------------------
    # 2. Consume, validate, and quarantine via StreamConsumerWorker
    # -------------------------------------------------------------------------
    processor = StreamProcessor(repository=live_repo)
    consumer_config = {
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
        "enable.auto.offset.store": False,
    }

    worker = StreamConsumerWorker(
        processor=processor,
        topic=topic,
        consumer_config=consumer_config,
        dry_run=False,
    )
    assert worker.dry_run is False

    poll_deadline = time.time() + 20.0
    result = None

    try:
        while time.time() < poll_deadline:
            result = worker.poll_and_process(timeout_seconds=1.0)
            if result is not None:
                break

        # Assert consumer-side processing outcome
        assert result is not None, "Consumer worker timed out polling malformed message"
        assert result.status == "quarantined", f"Expected 'quarantined', got '{result.status}'"
        assert result.event_id == invalid_event_id
        assert result.ride_id == invalid_ride_id
        assert result.dlq_id is not None
        assert result.dlq_id.startswith("DLQ-")
        assert "SchemaValidationError" in (result.error_reason or "")

        # Worker accounting: offset must be committed to avoid head-of-line blocking
        assert worker.messages_processed == 1, f"Expected 1 processed message, got {worker.messages_processed}"
        assert worker.messages_committed == 1, f"Expected 1 committed offset, got {worker.messages_committed}"
        assert worker.committed_offsets[f"{topic}:{target_partition}"] == published_offset + 1

        # ---------------------------------------------------------------------
        # 3. Enhanced offset verification: query Kafka Broker Group Coordinator
        # ---------------------------------------------------------------------
        committed_tps = worker._consumer.committed(
            [TopicPartition(topic, target_partition)],
            timeout=5.0,
        )
        assert len(committed_tps) == 1
        coordinator_offset = committed_tps[0].offset
        assert coordinator_offset == published_offset + 1, (
            f"Broker coordinator committed offset mismatch: expected {published_offset + 1}, got {coordinator_offset}"
        )

    finally:
        worker.close()

    # -------------------------------------------------------------------------
    # 4. Verify PostgreSQL persistence: dead_letter_events vs processed_events
    # -------------------------------------------------------------------------
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            # DLQ row must exist with exact metadata
            cur.execute(
                "SELECT * FROM dead_letter_events WHERE event_id = %s;",
                (invalid_event_id,),
            )
            dlq_record = cur.fetchone()
            assert dlq_record is not None, "Quarantined record was not found in dead_letter_events!"
            assert dlq_record["failure_category"] == "validation_error"
            assert dlq_record["ride_id"] == invalid_ride_id
            assert dlq_record["source_topic"] == topic
            assert dlq_record["source_partition"] == target_partition
            assert dlq_record["source_offset"] == published_offset
            assert "SchemaValidationError" in dlq_record["failure_reason"]

            # processed_events must NOT contain this invalid event
            cur.execute(
                "SELECT COUNT(*) AS total FROM processed_events WHERE event_id = %s;",
                (invalid_event_id,),
            )
            count_processed = cur.fetchone()["total"]
            assert count_processed == 0, (
                f"Invalid event was erroneously stored in processed_events ({count_processed} rows found)!"
            )

    # rides projection table must NOT contain this ride
    ride = live_repo.get_ride(invalid_ride_id)
    assert ride is None, "Ride projection was erroneously created for an invalid event!"
