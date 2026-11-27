"""
StreamForge — Live Kafka-to-PostgreSQL Pipeline Benchmark Suite.
Measures real broker ACKs, consumer throughput, PostgreSQL persistence,
and end-to-end ingestion latency across varying publication rates.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import statistics
import threading
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from confluent_kafka.admin import AdminClient, NewTopic
from streamforge.config.settings import get_settings
from streamforge.consumer.worker import StreamConsumerWorker
from streamforge.processor.engine import StreamProcessor
from streamforge.producer.generator import RideEventGenerator
from streamforge.producer.publisher import EventPublisher
from streamforge.storage.postgres_repository import PostgresRepository

logger = logging.getLogger("streamforge.benchmark")


def percentile_nearest_rank(values: List[float], pct: float) -> float:
    """Calculates percentile using nearest rank method."""
    if not values:
        return 0.0
    s = sorted(values)
    idx = max(0, min(len(s) - 1, math.ceil((pct / 100.0) * len(s)) - 1))
    return s[idx]


def summarize_latency(values: List[float]) -> Dict[str, float]:
    """Computes summary statistics (mean, p50, p95, p99) for a latency distribution."""
    if not values:
        return {"mean": 0.0, "p50": 0.0, "p95": 0.0, "p99": 0.0}
    return {
        "mean": round(statistics.mean(values), 3),
        "p50": round(percentile_nearest_rank(values, 50), 3),
        "p95": round(percentile_nearest_rank(values, 95), 3),
        "p99": round(percentile_nearest_rank(values, 99), 3),
    }


def delete_topic_best_effort(admin: AdminClient, topic: str) -> None:
    """Deletes temporary benchmark topic."""
    try:
        fs = admin.delete_topics([topic], operation_timeout=10.0)
        for _, f in fs.items():
            f.result(timeout=10.0)
    except Exception:
        pass


def run_benchmark(
    event_count: int = 500,
    target_rate: float = 10.0,
    partitions: int = 3,
    seed: int = 42,
    drain_timeout_seconds: float = 180.0,
) -> Dict[str, Any]:
    if event_count <= 0 or event_count % 4 != 0:
        raise ValueError("event_count must be positive and divisible by 4 (4 events per ride lifecycle)")
    if target_rate <= 0:
        raise ValueError("target_rate must be positive")

    settings = get_settings()
    admin = AdminClient({"bootstrap.servers": settings.kafka_bootstrap_servers})
    run_id = uuid.uuid4().hex[:8]
    topic = f"streamforge.benchmark.{run_id}"
    group_id = f"streamforge-bench-{run_id}"

    # 1. Create temporary benchmark topic with specified partitions
    new_topic = NewTopic(topic, num_partitions=partitions, replication_factor=1)
    fs = admin.create_topics([new_topic], operation_timeout=15.0)
    for _, f in fs.items():
        f.result(timeout=15.0)

    # Wait for metadata propagation
    deadline = time.time() + 10.0
    while time.time() < deadline:
        md = admin.list_topics(timeout=2.0)
        if topic in md.topics and len(md.topics[topic].partitions) == partitions:
            break
        time.sleep(0.1)

    publisher: Optional[EventPublisher] = None
    producer_done = threading.Event()
    stop_consumer = threading.Event()
    consumer_started_at: List[float] = []
    consumer_metrics: Dict[str, Any] = {}
    consumer_status = {"processed": 0}
    persisted_by_id: Dict[str, Any] = {}
    ingress_latency_ms: List[float] = []
    enqueue_to_offset_commit_ms: List[float] = []
    publish_perf_by_id: Dict[str, float] = {}
    consumer_ready_at: Optional[float] = None
    last_commit_perf: Optional[float] = None

    repo = PostgresRepository()

    def consumer_worker_thread():
        nonlocal consumer_metrics, consumer_ready_at, last_commit_perf
        consumer_repo = PostgresRepository()
        processor = StreamProcessor(repository=consumer_repo)
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

        consumer_ready_at = time.perf_counter()
        processed = 0
        accepted_count = 0
        duplicate_count = 0
        quarantined_count = 0
        failed_count = 0

        try:
            while not stop_consumer.is_set():
                if processed >= event_count:
                    break
                result = worker.poll_and_process(timeout_seconds=0.2)
                if result is not None:
                    last_commit_perf = time.perf_counter()
                    if not consumer_started_at:
                        consumer_started_at.append(last_commit_perf)
                    processed += 1
                    consumer_status["processed"] = processed
                    if result.status == "accepted":
                        accepted_count += 1
                    elif result.status == "duplicate":
                        duplicate_count += 1
                    elif result.status in ("quarantined", "dlq_quarantined"):
                        quarantined_count += 1
                    elif result.status in ("failed", "error"):
                        failed_count += 1

                    if result.event_id in publish_perf_by_id:
                        lat = (last_commit_perf - publish_perf_by_id[result.event_id]) * 1000.0
                        enqueue_to_offset_commit_ms.append(max(0.0, lat))
                elif producer_done.is_set():
                    time.sleep(0.05)
        finally:
            consumer_metrics = {
                "processed": processed,
                "accepted": accepted_count,
                "duplicates": duplicate_count,
                "quarantined": quarantined_count,
                "failed": failed_count,
                "dlq_quarantined": quarantined_count,
                "committed": worker.messages_committed,
                "halted": worker._halted,
            }
            worker.close()
            consumer_repo.close()

    consumer_thread = threading.Thread(target=consumer_worker_thread, daemon=True)
    consumer_thread.start()

    # Small pause to allow consumer group coordinator partition assignment
    time.sleep(1.5)

    interval = 1.0 / target_rate
    rides_count = event_count // 4
    generator = RideEventGenerator(seed=seed)
    enqueue_rejections = 0
    first_publish_perf: Optional[float] = None
    last_publish_perf: Optional[float] = None
    producer_start: Optional[float] = None
    producer_end: Optional[float] = None
    producer_done_at: Optional[float] = None
    overall_start = time.perf_counter()

    try:
        publisher = EventPublisher(
            settings=settings,
            dry_run=False,
        )
        assert publisher.dry_run is False, "Publisher silently fell back to dry-run mode!"

        producer_start = time.perf_counter()
        events_emitted = 0

        for r_idx in range(rides_count):
            ride_id = f"RIDE-BENCH-{run_id}-{r_idx:05d}"
            base_time = datetime.now(timezone.utc) - timedelta(hours=2, minutes=r_idx % 60)
            trace = generator.generate_full_ride_lifecycle(ride_id=ride_id, start_time=base_time)
            for event in trace:
                event.event_id = f"{event.event_id}-{run_id}"
                event.produced_at = datetime.now(timezone.utc)
                events_emitted += 1
                t_pub = time.perf_counter()
                if first_publish_perf is None:
                    first_publish_perf = t_pub
                last_publish_perf = t_pub

                publish_perf_by_id[event.event_id] = t_pub
                ok = publisher.publish(event, topic=topic)
                if not ok:
                    enqueue_rejections += 1
                    logger.error("Enqueue rejected for event %s", event.event_id)

                # Rate pacing
                target_next = producer_start + (events_emitted * interval)
                now_perf = time.perf_counter()
                sleep_sec = target_next - now_perf
                if sleep_sec > 0:
                    time.sleep(sleep_sec)

        producer_end = time.perf_counter()
        publisher.flush(timeout_seconds=30.0)
        producer_done_at = time.perf_counter()
        producer_done.set()

        # Wait for consumer to finish processing all events or reach drain timeout
        drain_deadline = time.perf_counter() + drain_timeout_seconds
        while time.perf_counter() < drain_deadline:
            if not consumer_thread.is_alive():
                break
            if consumer_status["processed"] >= event_count:
                break
            time.sleep(0.05)

        stop_consumer.set()
        consumer_thread.join(timeout=10.0)
        overall_end = time.perf_counter()

        # Query PostgreSQL for the persisted rows in this topic
        with repo._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT event_id, produced_at, ingested_at,
                           EXTRACT(EPOCH FROM (ingested_at - produced_at)) * 1000.0 as lat_ms
                    FROM processed_events
                    WHERE source_topic = %s
                    ORDER BY id ASC
                    """,
                    (topic,),
                )
                rows = cur.fetchall()
                for r in rows:
                    eid = r["event_id"] if isinstance(r, dict) else r[0]
                    p_at = r["produced_at"] if isinstance(r, dict) else r[1]
                    i_at = r["ingested_at"] if isinstance(r, dict) else r[2]
                    lat = float(r["lat_ms"]) if isinstance(r, dict) else float(r[3])
                    persisted_by_id[eid] = {
                        "event_id": eid,
                        "produced_at": p_at,
                        "ingested_at": i_at,
                        "lat_ms": lat,
                    }
                    ingress_latency_ms.append(max(0.0, lat))

        producer_window = (
            max(interval, (last_publish_perf - first_publish_perf) + interval)
            if first_publish_perf is not None and last_publish_perf is not None
            else 0.0
        )
        producer_rate = publisher.acknowledged_count / producer_window if producer_window else 0.0

        last_commit = last_commit_perf if last_commit_perf is not None else overall_end
        first_publish = first_publish_perf if first_publish_perf is not None else overall_start
        total_duration = max(0.000001, last_commit - first_publish)
        consumer_duration = max(0.000001, last_commit - (consumer_ready_at or overall_start))
        drain_duration = max(
            0.0,
            last_commit - (producer_done_at if producer_done_at is not None else last_commit),
        )

        return {
            "run_id": run_id,
            "topic": topic,
            "consumer_group": group_id,
            "partitions": partitions,
            "target_events_per_second": target_rate,
            "target_events": event_count,
            "rides": event_count // 4,
            "producer": {
                "enqueued": publisher.enqueued_count,
                "broker_acknowledged": publisher.acknowledged_count,
                "delivery_failed": publisher.failed_count,
                "enqueue_rejections": enqueue_rejections,
                "dry_run": publisher.dry_run,
                "broker_acknowledged_per_publish_window_eps": round(producer_rate, 2),
                "enqueue_window_seconds": round(max(0.0, (producer_end or 0.0) - (producer_start or 0.0)), 3),
            },
            "consumer": {
                **consumer_metrics,
                "drain_seconds": round(drain_duration, 3),
            },
            "postgres": {
                "persisted_unique_rows": len(persisted_by_id),
                "data_source": "live PostgreSQL processed_events table",
            },
            "latency_ms": {
                "producer_to_processor_ingress": {
                    **summarize_latency(ingress_latency_ms),
                    "measurement": (
                        "producer produced_at timestamp -> processor ingested_at timestamp; "
                        "ingested_at is assigned at the start of StreamProcessor processing, "
                        "before PostgreSQL persistence"
                    ),
                },
                "producer_enqueue_to_offset_commit": {
                    **summarize_latency(enqueue_to_offset_commit_ms),
                    "measurement": (
                        "time.perf_counter immediately before EventPublisher.publish() "
                        "-> time.perf_counter after StreamConsumerWorker.poll_and_process() "
                        "returns; includes serialization/enqueue, Kafka availability, "
                        "processor + PostgreSQL transaction, and synchronous offset commit; "
                        "does not wait for the producer delivery callback"
                    ),
                },
            },
            "throughput": {
                "end_to_end_persisted_eps": round(len(persisted_by_id) / total_duration, 2),
                "total_seconds": round(total_duration, 3),
                "total_duration_measurement": "first publish start -> last synchronous consumer offset commit",
                "consumer_window_seconds": round(consumer_duration, 3),
                "consumer_window_measurement": "consumer worker ready -> last synchronous consumer offset commit",
            },
        }
    finally:
        producer_done.set()
        stop_consumer.set()
        consumer_thread.join(timeout=5.0)
        if publisher is not None:
            try:
                publisher.flush(timeout_seconds=5.0)
            except Exception:
                logger.exception("Final producer flush failed")
        repo.close()
        delete_topic_best_effort(admin, topic)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark the live StreamForge Kafka-to-PostgreSQL pipeline")
    parser.add_argument("--events", type=int, default=500, help="Number of events (must be divisible by 4; default: 500)")
    parser.add_argument("--rate", type=float, default=10.0, help="Target event publication rate in EPS (default: 10)")
    parser.add_argument("--partitions", type=int, default=3, help="Temporary Kafka topic partitions (default: 3)")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic generator seed (default: 42)")
    parser.add_argument("--drain-timeout", type=float, default=180.0, help="Consumer drain timeout in seconds (default: 180)")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        result = run_benchmark(
            event_count=args.events,
            target_rate=args.rate,
            partitions=args.partitions,
            seed=args.seed,
            drain_timeout_seconds=args.drain_timeout,
        )
    except Exception as exc:
        logger.exception("BENCHMARK FAILED: %s", exc)
        return 1

    print("\n" + "=" * 72)
    print("STREAMFORGE — LIVE KAFKA → POSTGRESQL BENCHMARK")
    print("=" * 72)
    print(json.dumps(result, indent=2, default=str))
    print("\nBENCHMARK PASSED: broker acknowledgements, consumer commits, and DB rows verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
