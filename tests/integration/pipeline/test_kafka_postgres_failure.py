"""Integration test for database infrastructure failure and fail-stop consumer behavior.

Verifies:
1. Valid RideEvent is published and confirmed by Kafka broker.
2. Controlled fault injection simulates a PostgreSQL outage (psycopg.OperationalError).
3. Database exception escapes to StreamConsumerWorker.poll_and_process().
4. Worker immediately halts (worker._halted is True) to prevent skipping offsets.
5. Ingestion metrics remain zero (messages_processed == 0, messages_committed == 0).
6. Offset is NOT committed to the Kafka broker coordinator.
7. Subsequent poll_and_process() calls raise RuntimeError, refusing to process further.
8. Event is NOT erroneously quarantined to dead_letter_events (outages != schema errors).
9. processed_events and rides tables remain untouched.
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
    """Fault-injecting repository simulating an infrastructure outage during persistence."""

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
    """Create a temporary, isolated Kafka topic with 3 partitions for hermetic failure testing."""
    topic_name = f"streamforge.fail.{uuid.uuid4().hex[:8]}"
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


def test_realtime_pipeline_database_failure_triggers_fail_stop(live_repo, isolated_topic):
    """
    Scenario 3: Database failure prevents offset commitment and halts the worker.
    """
    settings = get_settings()
    topic = isolated_topic
    group_id = f"streamforge-fail-grp-{uuid.uuid4().hex[:8]}"

    # -------------------------------------------------------------------------
    # 1. Generate one valid RideRequested event with isolated ID
    # -------------------------------------------------------------------------
    generator = RideEventGenerator()
    unique_ride_id = f"RIDE-FAIL-{uuid.uuid4().hex[:8].upper()}"
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
    # 3. Initialize worker with fault-injecting repository
    # -------------------------------------------------------------------------
    failing_repo = FailingPostgresRepository(pool=live_repo._pool)
    processor = StreamProcessor(repository=failing_repo)
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

    # -------------------------------------------------------------------------
    # 4. Poll and assert database exception propagation & fail-stop halt
    # -------------------------------------------------------------------------
    try:
        # Worker must raise the database OperationalError
        with pytest.raises(psycopg.OperationalError) as exc_info:
            worker.poll_and_process(timeout_seconds=10.0)

        assert "connection to server lost" in str(exc_info.value)

        # Worker state invariants: fail-stop triggered
        assert worker._halted is True, "Worker did not halt after database failure!"
        assert "Processing/commit failure" in (worker._halt_reason or "")
        assert worker.messages_processed == 0, f"Processed count was incremented: {worker.messages_processed}"
        assert worker.messages_committed == 0, f"Committed count was incremented: {worker.messages_committed}"

        # ---------------------------------------------------------------------
        # 5. Subsequent poll_and_process() must raise RuntimeError (halted)
        # ---------------------------------------------------------------------
        with pytest.raises(RuntimeError) as halt_exc:
            worker.poll_and_process(timeout_seconds=1.0)

        assert "Consumer worker is halted after an uncommitted failure" in str(halt_exc.value)

        # ---------------------------------------------------------------------
        # 6. Kafka Group Coordinator offset verification: must NOT be advanced
        # ---------------------------------------------------------------------
        committed_tps = worker._consumer.committed(
            [TopicPartition(topic, target_partition)],
            timeout=5.0,
        )
        assert len(committed_tps) == 1
        coordinator_offset = committed_tps[0].offset

        # The offset must remain uncommitted (-1001 / OFFSET_INVALID) or not advanced past published_offset
        assert coordinator_offset != published_offset + 1, (
            f"Data loss danger! Offset {published_offset + 1} was committed despite database failure!"
        )

    finally:
        worker.close()

    # -------------------------------------------------------------------------
    # 7. Verify PostgreSQL state: clean processed_events, DLQ, and rides
    # -------------------------------------------------------------------------
    with live_repo._connection() as conn:
        with conn.cursor() as cur:
            # 1. Event was NOT persisted
            cur.execute(
                "SELECT COUNT(*) AS total FROM processed_events WHERE event_id = %s;",
                (event_id,),
            )
            count_processed = cur.fetchone()["total"]
            assert count_processed == 0, "Failed event was erroneously stored in processed_events!"

            # 2. Event was NOT quarantined to DLQ (outage is NOT a schema validation failure!)
            cur.execute(
                "SELECT COUNT(*) AS total FROM dead_letter_events WHERE event_id = %s;",
                (event_id,),
            )
            count_dlq = cur.fetchone()["total"]
            assert count_dlq == 0, "Infrastructure failure was erroneously quarantined to DLQ!"

    # 3. Ride projection was NOT created
    ride = live_repo.get_ride(unique_ride_id)
    assert ride is None, "Ride projection was erroneously created despite DB outage!"
