"""End-to-end integration test for the real-time StreamForge streaming pipeline.

Verifies the full lifecycle across real infrastructure:
1. Dynamic isolated Kafka topic creation with 3 partitions and RF 1.
2. Complete 4-event Markov ride lifecycle generation via RideEventGenerator.
3. Event publication via EventPublisher (acks=all, ride_id partition key).
4. Broker acknowledgement and single-partition affinity assertions.
5. Pipelined consumption via StreamConsumerWorker and StreamProcessor.
6. Synchronous offset commitment after durable storage.
7. Direct PostgreSQL 16 persistence and projection verification.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, List
import pytest
from confluent_kafka.admin import AdminClient, NewTopic

from streamforge.config.settings import get_settings
from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.producer.generator import RideEventGenerator
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
    """Create a temporary, isolated Kafka topic with 3 partitions for hermetic E2E testing."""
    topic_name = f"streamforge.e2e.{uuid.uuid4().hex[:8]}"
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


def test_realtime_pipeline_e2e_happy_path(live_repo, isolated_topic):
    """
    Stage 1 to 7: Verify a complete ride lifecycle through Kafka to PostgreSQL.
    """
    settings = get_settings()
    topic = isolated_topic
    group_id = f"streamforge-e2e-{uuid.uuid4().hex[:8]}"

    # -------------------------------------------------------------------------
    # STAGE 2: Generate one complete ride (4 events) with isolated IDs
    # -------------------------------------------------------------------------
    generator = RideEventGenerator()
    unique_ride_id = f"RIDE-E2E-{uuid.uuid4().hex[:8].upper()}"
    events = generator.generate_full_ride_lifecycle(ride_id=unique_ride_id)
    assert len(events) == 4, f"Expected 4 lifecycle events, got {len(events)}"

    ride_id = events[0].ride_id
    assert ride_id == unique_ride_id
    expected_event_types = [
        "ride.requested",
        "ride.accepted",
        "ride.started",
        "ride.completed",
    ]
    for idx, expected_type in enumerate(expected_event_types):
        assert events[idx].event_type.value == expected_type
        assert events[idx].ride_id == ride_id

    # -------------------------------------------------------------------------
    # STAGE 3: Publish events to Kafka broker
    # -------------------------------------------------------------------------
    delivery_reports: List[Any] = []

    def delivery_callback(err, msg):
        assert err is None, f"Kafka delivery error reported: {err}"
        delivery_reports.append(msg)

    publisher = EventPublisher(
        settings=settings,
        delivery_callback=delivery_callback,
        dry_run=False,
    )

    # Safeguard 1: Explicit non-dry-run assertion
    assert publisher.dry_run is False, "Publisher silently fell back to dry-run mode!"

    for event in events:
        success = publisher.publish(event, topic=topic)
        assert success is True, f"Failed to enqueue event {event.event_id}"

    unflushed = publisher.flush(timeout_seconds=10.0)
    assert unflushed == 0, f"Publisher flush timed out with {unflushed} unsent messages"

    # Verify producer accounting metrics
    assert publisher.dry_run_count == 0, "Producer performed dry-run operations in live test!"
    assert publisher.failed_count == 0, "Producer reported delivery failures!"
    assert publisher.acknowledged_count == 4, f"Expected 4 ACKs, got {publisher.acknowledged_count}"
    assert len(delivery_reports) == 4, f"Expected 4 delivery callback reports, got {len(delivery_reports)}"

    # Verify partition affinity: all 4 events for the same ride must route to the SAME partition
    partitions_used = {msg.partition() for msg in delivery_reports}
    assert len(partitions_used) == 1, (
        f"Partition affinity broken! Ride events were routed across multiple partitions: {partitions_used}"
    )

    # -------------------------------------------------------------------------
    # STAGE 4: Start dedicated consumer group & worker
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
    assert worker.dry_run is False, "Consumer worker initialized in dry-run mode!"

    # -------------------------------------------------------------------------
    # STAGES 5 & 6: Process messages & commit offsets
    # -------------------------------------------------------------------------
    process_results = []
    poll_deadline = time.time() + 20.0

    try:
        while len(process_results) < 4 and time.time() < poll_deadline:
            result = worker.poll_and_process(timeout_seconds=1.0)
            if result is not None:
                process_results.append(result)

        assert len(process_results) == 4, (
            f"Consumer timed out: processed {len(process_results)}/4 messages within 20s"
        )

        for res in process_results:
            assert res.status == "accepted", f"Event failed processing with reason: {res.error_reason}"
            assert res.ride_id == ride_id

        # Safeguard 3: Offset commit verification
        assert worker.messages_processed == 4, f"Expected 4 processed messages, got {worker.messages_processed}"
        assert worker.messages_committed == 4, f"Expected 4 committed offsets, got {worker.messages_committed}"

    finally:
        worker.close()

    # -------------------------------------------------------------------------
    # STAGE 7: Directly query PostgreSQL persistence and ride projection
    # -------------------------------------------------------------------------
    # Safeguard 2: Direct raw SQL query on processed_events table
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM processed_events WHERE ride_id = %s AND source_topic = %s;",
                (ride_id, topic),
            )
            count_row = cur.fetchone()
            assert count_row["total"] == 4, (
                f"Expected 4 rows in processed_events, found {count_row['total']}"
            )

    # Query projected ride state in rides table
    ride = live_repo.get_ride(ride_id)
    assert ride is not None, f"Ride {ride_id} was not projected into rides table!"
    assert ride["status"] == "ride.completed", f"Expected status 'ride.completed', got '{ride['status']}'"
    assert ride["status_rank"] == 4, f"Expected status_rank 4, got {ride['status_rank']}"
    assert ride["rider_id"] is not None, "rider_id was not backfilled"
    assert ride["driver_id"] is not None, "driver_id was not backfilled"
    assert ride["pickup_city"] is not None, "pickup_city was not backfilled"
    assert ride["dropoff_city"] is not None, "dropoff_city was not backfilled"
    assert ride["estimated_fare"] is not None, "estimated_fare was not backfilled"
    assert ride["final_fare"] is not None, "final_fare was not recorded"
    assert ride["completed_at"] is not None, "completed_at timestamp was not recorded"
