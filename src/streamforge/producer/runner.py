"""Runnable StreamForge Kafka producer pipeline."""

import argparse
import logging
import math
import time
from dataclasses import asdict, dataclass
from typing import Any, Optional

from streamforge.config.settings import get_settings
from streamforge.producer.generator import RideEventGenerator
from streamforge.producer.publisher import EventPublisher

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProducerRunResult:
    """Summary of one producer execution."""

    rides_requested: int
    events_generated: int
    enqueue_rejections: int
    enqueued_count: int
    acknowledged_count: int
    failed_count: int
    outstanding_count: int
    dry_run_count: int

    @property
    def succeeded(self) -> bool:
        return (
            self.enqueue_rejections == 0
            and self.failed_count == 0
            and self.outstanding_count == 0
        )


def run_pipeline(
    rides: int = 10,
    events_per_second: float = 50.0,
    seed: Optional[int] = None,
    dry_run: bool = False,
    publisher: Optional[Any] = None,
    generator: Optional[RideEventGenerator] = None,
    topic: Optional[str] = None,
    simulate_cancellation_probability: float = 0.2,
) -> ProducerRunResult:
    """
    Connects the generator to the publisher, orchestrating paced event production.

    Invariants:
    - Stops creating additional publish attempts if local queue acceptance fails.
    - Always flushes previously accepted messages.
    - Succeeded requires zero enqueue rejections, zero failed deliveries, and zero outstanding messages.
    """
    if rides <= 0:
        raise ValueError("rides must be positive")
    if math.isnan(events_per_second) or events_per_second <= 0:
        raise ValueError("events_per_second must be positive")

    gen = generator or RideEventGenerator(seed=seed)
    pub = publisher or EventPublisher(dry_run=dry_run)

    events_generated = 0
    enqueue_rejections = 0
    rides_requested = 0
    sleep_interval = 1.0 / events_per_second if events_per_second > 0 else 0.0

    for _ in range(rides):
        rides_requested += 1
        should_cancel = (
            gen._rng.random() < simulate_cancellation_probability
            if hasattr(gen, "_rng")
            else False
        )
        trace = gen.generate_full_ride_lifecycle(simulate_cancellation=should_cancel)

        abort_due_to_enqueue_failure = False
        for event in trace:
            events_generated += 1
            ok = pub.publish(event, topic=topic) if topic else pub.publish(event)
            if not ok:
                enqueue_rejections += 1
                logger.error(
                    "Enqueue rejected for event %s. Halting further event creation.",
                    getattr(event, "event_id", "unknown"),
                )
                abort_due_to_enqueue_failure = True
                break

            if sleep_interval > 0:
                time.sleep(sleep_interval)

        if abort_due_to_enqueue_failure:
            break

    # Flush outstanding messages through delivery callbacks
    pub.flush()

    enqueued = getattr(pub, "enqueued_count", 0)
    acked = getattr(pub, "acknowledged_count", 0)
    failed = getattr(pub, "failed_count", 0)
    dry_run_cnt = getattr(
        pub,
        "dry_run_count",
        enqueued if getattr(pub, "dry_run", False) else 0,
    )
    outstanding = max(0, enqueued - (acked + failed))

    return ProducerRunResult(
        rides_requested=rides_requested,
        events_generated=events_generated,
        enqueue_rejections=enqueue_rejections,
        enqueued_count=enqueued,
        acknowledged_count=acked,
        failed_count=failed,
        outstanding_count=outstanding,
        dry_run_count=dry_run_cnt,
    )


def main() -> None:
    """CLI entry point for running the StreamForge producer pipeline."""
    parser = argparse.ArgumentParser(
        description="StreamForge Kafka Producer Pipeline Runner"
    )
    parser.add_argument(
        "--rides", type=int, default=10, help="Number of rides to generate"
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=50.0,
        help="Target events per second generation rate",
    )
    parser.add_argument(
        "--seed", type=int, default=None, help="Deterministic random seed"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in standalone simulation mode without connecting to Kafka broker",
    )
    parser.add_argument(
        "--topic", type=str, default=None, help="Target Kafka topic"
    )
    parser.add_argument(
        "--log-level", type=str, default="INFO", help="Logging level"
    )
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))
    print(
        f"[*] Starting StreamForge Producer Runner (rides={args.rides}, rate={args.rate}/s, dry_run={args.dry_run})"
    )
    result = run_pipeline(
        rides=args.rides,
        events_per_second=args.rate,
        seed=args.seed,
        dry_run=args.dry_run,
        topic=args.topic,
    )
    print(f"[+] Producer Run Summary:")
    print(f"    Rides requested:     {result.rides_requested}")
    print(f"    Events generated:    {result.events_generated}")
    print(f"    Enqueued count:      {result.enqueued_count}")
    print(f"    Acknowledged count:  {result.acknowledged_count}")
    print(f"    Failed count:        {result.failed_count}")
    print(f"    Enqueue rejections:  {result.enqueue_rejections}")
    print(f"    Outstanding count:   {result.outstanding_count}")
    print(f"    Dry-run count:       {result.dry_run_count}")
    print(f"    Overall status:      {'SUCCESS' if result.succeeded else 'FAILED'}")

    import sys

    sys.exit(0 if result.succeeded else 1)


if __name__ == "__main__":
    main()
