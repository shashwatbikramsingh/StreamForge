"""Integration test for consumer restart, at-least-once recovery, and uncommitted offset redelivery.

Verifies:
1. Valid RideEvent published and confirmed at Kafka partition P, offset N.
2. Consumer instance 1 encounters a database infrastructure outage (psycopg.OperationalError).
3. Consumer instance 1 halts without committing offset N.
4. Consumer instance 1 closes cleanly without advancing group coordinator state.
5. Consumer instance 2 initializes with the SAME group.id and healthy PostgreSQL connection.
6. Kafka broker redelivers the uncommitted message at offset N without manual seek or re-publish.
7. Consumer instance 2 processes the redelivered message successfully.
8. PostgreSQL persists the recovered event and updates the ride projection.
9. Consumer instance 2 commits offset N + 1 to the Kafka broker coordinator.
10. Database records verify exact source_partition and source_offset coordinates.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, List
import psycopg
import pytest
from confluent_kafka import TopicPartition
from confluent_kafka.admin import AdminClient, NewTopic

from streamforge.config.settings import get_settings
from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.producer.generator import RideEventGenerator
from streamforge.producer.publisher import EventPublisher
from streamforge.storage.postgres_repository import PostgresRepository


class FailingPostgresRepository(PostgresRepository):
    """Fault-injecting repository simulating an infrastructure outage during initial processing."""

    def persist_event_and_projection(self, *args, **kwargs):
        raise psycopg.OperationalError("FATAL: connection to server lost / database unavailable")


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
    """Create a temporary, isolated Kafka topic with 3 partitions for hermetic recovery testing."""
    topic_name = f"streamforge.recov.{uuid.uuid4().hex[:8]}"
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


def test_realtime_pipeline_consumer_recovery_after_failure(live_repo, isolated_topic):
    """
    Scenario 4: Verify uncommitted message redelivery and at-least-once recovery across consumer restarts.
    """
    settings = get_settings()
    topic = isolated_topic
    shared_group_id = f"streamforge-recov-grp-{uuid.uuid4().hex[:8]}"

    # -------------------------------------------------------------------------
    # 1. Generate one valid RideRequested event with isolated ID
    # -------------------------------------------------------------------------
    generator = RideEventGenerator()
    unique_ride_id = f"RIDE-RECOV-{uuid.uuid4().hex[:8].upper()}"
    event, _ = generator.generate_ride_requested(ride_id=unique_ride_id)
    event_id = event.event_id

    # -------------------------------------------------------------------------
    # 2. Publish event to Kafka broker
    # -------------------------------------------------------------------------
    delivery_reports: List[Any] = []

    def delivery_callback(err, msg):
        assert err is None, f"Broker delivery failed: {err}"
        delivery_reports.append(msg)

    publisher = EventPublisher(
        settings=settings,
        delivery_callback=delivery_callback,
        dry_run=False,
    )
    assert publisher.dry_run is False

    success = publisher.publish(event, topic=topic)
    assert success is True, "Failed to publish event to Kafka"

    unflushed = publisher.flush(timeout_seconds=10.0)
    assert unflushed == 0, f"Flush timed out with {unflushed} unsent messages"
    assert publisher.dry_run_count == 0
    assert publisher.failed_count == 0
    assert publisher.acknowledged_count == 1
    assert len(delivery_reports) == 1

    published_msg = delivery_reports[0]
    target_partition = published_msg.partition()
    published_offset = published_msg.offset()

    # -------------------------------------------------------------------------
    # 3. Start Consumer 1 with failing repository
    # -------------------------------------------------------------------------
    failing_repo = FailingPostgresRepository(pool=live_repo._pool)
    processor1 = StreamProcessor(repository=failing_repo)
    consumer_config = {
        "group.id": shared_group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
        "enable.auto.offset.store": False,
    }

    worker1 = StreamConsumerWorker(
        processor=processor1,
        topic=topic,
        consumer_config=consumer_config,
        dry_run=False,
    )
    assert worker1.dry_run is False

    # -------------------------------------------------------------------------
    # 4. Assert failure and uncommitted offset on Consumer 1
    # -------------------------------------------------------------------------
    try:
        with pytest.raises(psycopg.OperationalError):
            worker1.poll_and_process(timeout_seconds=10.0)

        # Fail-stop assertions for consumer 1
        assert worker1._halted is True
        assert worker1.messages_processed == 0
        assert worker1.messages_committed == 0

        # Coordinator offset must NOT be advanced
        committed1 = worker1._consumer.committed(
            [TopicPartition(topic, target_partition)],
            timeout=5.0,
        )
        assert len(committed1) == 1
        assert committed1[0].offset != published_offset + 1

    finally:
        # Close consumer 1 to release partition assignment cleanly
        worker1.close()

    # -------------------------------------------------------------------------
    # 5. Start Consumer 2 with the SAME group.id and healthy repository
    # -------------------------------------------------------------------------
    processor2 = StreamProcessor(repository=live_repo)

    worker2 = StreamConsumerWorker(
        processor=processor2,
        topic=topic,
        consumer_config=consumer_config,  # Exact same group.id
        dry_run=False,
    )
    assert worker2.dry_run is False

    # -------------------------------------------------------------------------
    # 6. Poll and assert successful at-least-once recovery
    # -------------------------------------------------------------------------
    recovery_result = None
    poll_deadline = time.time() + 20.0

    try:
        while time.time() < poll_deadline:
            res = worker2.poll_and_process(timeout_seconds=1.0)
            if res is not None:
                recovery_result = res
                break

        assert recovery_result is not None, "Consumer 2 timed out waiting for uncommitted message redelivery"
        assert recovery_result.status == "accepted", f"Expected 'accepted', got {recovery_result.status}"
        assert recovery_result.event_id == event_id
        assert recovery_result.ride_id == unique_ride_id

        # Worker 2 accounting metrics
        assert worker2.messages_processed == 1, f"Expected 1 processed message, got {worker2.messages_processed}"
        assert worker2.messages_committed == 1, f"Expected 1 committed offset, got {worker2.messages_committed}"
        assert worker2.committed_offsets[f"{topic}:{target_partition}"] == published_offset + 1

        # ---------------------------------------------------------------------
        # 7. Enhanced offset verification on Broker Coordinator
        # ---------------------------------------------------------------------
        committed2 = worker2._consumer.committed(
            [TopicPartition(topic, target_partition)],
            timeout=5.0,
        )
        assert len(committed2) == 1
        coordinator_offset = committed2[0].offset
        assert coordinator_offset == published_offset + 1, (
            f"Broker coordinator committed offset mismatch: expected {published_offset + 1}, got {coordinator_offset}"
        )

    finally:
        worker2.close()

    # -------------------------------------------------------------------------
    # 8. Verify PostgreSQL persistence & source coordinates
    # -------------------------------------------------------------------------
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            # Query processed_events
            cur.execute(
                "SELECT * FROM processed_events WHERE event_id = %s;",
                (event_id,),
            )
            event_row = cur.fetchone()
            assert event_row is not None, "Recovered event was not persisted in processed_events!"
            assert event_row["ride_id"] == unique_ride_id
            assert event_row["source_topic"] == topic
            # Coordinates must match the exact original Kafka message (not a newly generated replacement)
            assert event_row["source_partition"] == target_partition
            assert event_row["source_offset"] == published_offset

            # Dead letter queue must be empty for this event
            cur.execute(
                "SELECT COUNT(*) AS total FROM dead_letter_events WHERE event_id = %s;",
                (event_id,),
            )
            count_dlq = cur.fetchone()["total"]
            assert count_dlq == 0, "Recovered event was erroneously sent to DLQ!"

    # Ride projection was updated successfully
    ride = live_repo.get_ride(unique_ride_id)
    assert ride is not None, "Ride projection was not created!"
    assert ride["status"] == "ride.requested"
    assert ride["status_rank"] == 1
