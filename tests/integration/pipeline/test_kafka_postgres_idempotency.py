"""Integration test for duplicate event delivery and database idempotency.

Verifies:
1. Publishing the exact same RideEvent twice to Apache Kafka.
2. Partition affinity ensures both duplicate events land on the identical partition.
3. StreamConsumerWorker polls and dispatches both messages in sequence.
4. First message is accepted and persisted into processed_events and rides tables.
5. Second message is recognized as duplicate via event_id primary key constraint.
6. Second message increments the persistent duplicates_ignored pipeline counter.
7. processed_events table retains exactly one row (zero data duplication).
8. Kafka source offsets for BOTH messages are committed to the broker coordinator,
   advancing the consumer offset past the duplicate.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, List
import pytest
from confluent_kafka import TopicPartition
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
    """Create a temporary, isolated Kafka topic with 3 partitions for hermetic idempotency testing."""
    topic_name = f"streamforge.idemp.{uuid.uuid4().hex[:8]}"
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


def test_realtime_pipeline_duplicate_delivery_is_idempotent(live_repo, isolated_topic):
    """
    Scenario 2: Publishing the same event twice results in 1 accepted insert,
    1 duplicate recognition, 1 duplicates_ignored counter increment, and 2 committed offsets.
    """
    settings = get_settings()
    topic = isolated_topic
    group_id = f"streamforge-idemp-grp-{uuid.uuid4().hex[:8]}"

    # Initial baseline of persistent duplicates counter
    initial_duplicates = live_repo.get_counter("duplicates_ignored")

    # -------------------------------------------------------------------------
    # 1. Generate one valid RideRequested event with isolated ID
    # -------------------------------------------------------------------------
    generator = RideEventGenerator()
    unique_ride_id = f"RIDE-DUP-{uuid.uuid4().hex[:8].upper()}"
    event, _ = generator.generate_ride_requested(ride_id=unique_ride_id)
    event_id = event.event_id

    # -------------------------------------------------------------------------
    # 2. Publish the exact same event TWICE to Kafka
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

    # First delivery
    success1 = publisher.publish(event, topic=topic)
    assert success1 is True, "Failed to enqueue first delivery"

    # Second delivery (identical event payload and key)
    success2 = publisher.publish(event, topic=topic)
    assert success2 is True, "Failed to enqueue duplicate delivery"

    unflushed = publisher.flush(timeout_seconds=10.0)
    assert unflushed == 0, f"Flush timed out with {unflushed} unsent messages"
    assert publisher.dry_run_count == 0
    assert publisher.failed_count == 0
    assert publisher.acknowledged_count == 2
    assert len(delivery_reports) == 2

    # Verify partition affinity and offset sequence
    part0 = delivery_reports[0].partition()
    part1 = delivery_reports[1].partition()
    assert part0 == part1, f"Partition affinity broken! Deliveries landed on {part0} and {part1}"

    offset0 = delivery_reports[0].offset()
    offset1 = delivery_reports[1].offset()
    assert offset1 == offset0 + 1, f"Expected consecutive offsets, got {offset0} and {offset1}"

    # -------------------------------------------------------------------------
    # 3. Consume both records via StreamConsumerWorker
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

    results = []
    poll_deadline = time.time() + 20.0

    try:
        while len(results) < 2 and time.time() < poll_deadline:
            res = worker.poll_and_process(timeout_seconds=1.0)
            if res is not None:
                results.append(res)

        assert len(results) == 2, f"Consumer timed out: received {len(results)}/2 messages"

        # Result 1: First delivery is accepted
        assert results[0].status == "accepted", f"Expected 'accepted', got {results[0].status}"
        assert results[0].event_id == event_id
        assert results[0].ride_id == unique_ride_id

        # Result 2: Duplicate delivery is recognized as duplicate
        assert results[1].status == "duplicate", f"Expected 'duplicate', got {results[1].status}"
        assert results[1].event_id == event_id
        assert results[1].ride_id == unique_ride_id

        # Crucial invariant: BOTH messages must increment processed and committed counts
        assert worker.messages_processed == 2, f"Expected 2 processed messages, got {worker.messages_processed}"
        assert worker.messages_committed == 2, f"Expected 2 committed offsets, got {worker.messages_committed}"
        assert worker.committed_offsets[f"{topic}:{part0}"] == offset1 + 1

        # Enhanced offset verification: verify broker group coordinator state
        committed_tps = worker._consumer.committed([TopicPartition(topic, part0)], timeout=5.0)
        assert len(committed_tps) == 1
        coordinator_offset = committed_tps[0].offset
        assert coordinator_offset == offset1 + 1, (
            f"Broker coordinator committed offset mismatch: expected {offset1 + 1}, got {coordinator_offset}"
        )

    finally:
        worker.close()

    # -------------------------------------------------------------------------
    # 4. Verify PostgreSQL persistence & counter invariants
    # -------------------------------------------------------------------------
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            # Table must contain EXACTLY ONE row for this event_id
            cur.execute(
                "SELECT COUNT(*) AS total FROM processed_events WHERE event_id = %s;",
                (event_id,),
            )
            count_event = cur.fetchone()["total"]
            assert count_event == 1, (
                f"Idempotency failure! Expected 1 row in processed_events, found {count_event}"
            )

            # Table must contain EXACTLY ONE row for this ride_id
            cur.execute(
                "SELECT COUNT(*) AS total FROM processed_events WHERE ride_id = %s;",
                (unique_ride_id,),
            )
            count_ride = cur.fetchone()["total"]
            assert count_ride == 1, (
                f"Expected 1 event for ride {unique_ride_id}, found {count_ride}"
            )

    # Projected ride state remains valid
    ride = live_repo.get_ride(unique_ride_id)
    assert ride is not None
    assert ride["status"] == "ride.requested"

    # Counter verification: duplicates_ignored must increment by exactly 1
    final_duplicates = live_repo.get_counter("duplicates_ignored")
    assert final_duplicates == initial_duplicates + 1, (
        f"Counter mismatch: duplicates_ignored before={initial_duplicates}, after={final_duplicates}"
    )
