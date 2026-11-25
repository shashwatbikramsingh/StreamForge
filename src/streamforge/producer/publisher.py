"""StreamForge Kafka publisher using confluent-kafka."""

import json
import logging
import math
import time
from typing import Any, Callable, Optional, Dict

try:
    from confluent_kafka import Producer as KafkaProducer
except ImportError:
    KafkaProducer = None

from streamforge.config.settings import Settings, get_settings
from streamforge.events.schemas import RideEvent

logger = logging.getLogger(__name__)

DeliveryCallback = Callable[[Any, Any], None]


class EventPublisher:
    """Publish StreamForge events asynchronously to Apache Kafka."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        delivery_callback: Optional[DeliveryCallback] = None,
        dry_run: bool = False,
        producer: Any = None,
        queue_wait_timeout_seconds: float = 5.0,
        poll_interval_seconds: float = 0.1,
    ) -> None:
        if (
            math.isnan(queue_wait_timeout_seconds)
            or queue_wait_timeout_seconds < 0
        ):
            raise ValueError("queue_wait_timeout_seconds must be a non-negative number")
        if math.isnan(poll_interval_seconds) or poll_interval_seconds <= 0:
            raise ValueError("poll_interval_seconds must be a positive number")

        self.settings = settings or get_settings()
        self.delivery_callback = delivery_callback
        self.dry_run = dry_run or (producer is None and KafkaProducer is None)
        self.queue_wait_timeout_seconds = queue_wait_timeout_seconds
        self.poll_interval_seconds = poll_interval_seconds

        self.enqueued_count = 0
        self.published_count = 0  # Compatibility counter with existing checks
        self.acknowledged_count = 0
        self.failed_count = 0
        self.dry_run_count = 0
        self.last_published_event_id: Optional[str] = None

        self._producer = producer
        if not self.dry_run and self._producer is None:
            try:
                conf = {
                    "bootstrap.servers": self.settings.kafka_bootstrap_servers,
                    "client.id": "streamforge-event-producer",
                    "acks": "all",  # Strongest durability guarantee
                    "retries": 3,
                    "linger.ms": 5,
                }
                self._producer = KafkaProducer(conf)
            except Exception as e:
                logger.warning(
                    "Failed to initialize confluent_kafka.Producer (%s). Falling back to dry-run.", e
                )
                self.dry_run = True

    def _default_delivery_callback(self, err: Optional[Exception], msg: Any) -> None:
        """Internal callback invoked on broker ACK or failure."""
        if err is not None:
            self.failed_count += 1
            logger.error("Kafka message delivery failed: %s", err)
        else:
            self.acknowledged_count += 1
            logger.debug(
                "Event delivered to topic %s [%s] @ offset %s",
                getattr(msg, "topic", lambda: "unknown")(),
                getattr(msg, "partition", lambda: "unknown")(),
                getattr(msg, "offset", lambda: "unknown")(),
            )

        if self.delivery_callback:
            try:
                self.delivery_callback(err, msg)
            except Exception as cb_err:
                logger.exception("Error executing user delivery callback: %s", cb_err)

    def _produce_bytes(
        self,
        topic: str,
        key_bytes: bytes,
        payload_bytes: bytes,
        event_id: str,
    ) -> bool:
        """Internal worker method handling local queue enqueue, BufferError, and backpressure."""
        self.last_published_event_id = event_id

        if self.dry_run:
            self.enqueued_count += 1
            self.published_count += 1
            self.acknowledged_count += 1
            self.dry_run_count += 1
            logger.info("[Dry-Run] Published event %s to topic %s", event_id, topic)
            if self.delivery_callback:
                try:
                    self.delivery_callback(None, None)
                except Exception as cb_err:
                    logger.exception("Error executing delivery callback in dry-run: %s", cb_err)
            return True

        deadline = time.time() + self.queue_wait_timeout_seconds
        while True:
            try:
                self._producer.produce(
                    topic=topic,
                    key=key_bytes,
                    value=payload_bytes,
                    on_delivery=self._default_delivery_callback,
                )
                # Poll triggers delivery callbacks for previously queued messages
                self._producer.poll(0)
                self.enqueued_count += 1
                self.published_count += 1
                return True
            except BufferError:
                # Queue full backpressure: poll to drain callbacks and wait for buffer capacity
                logger.warning("Producer queue full. Polling to drain buffer...")
                self._producer.poll(self.poll_interval_seconds)
                if time.time() >= deadline:
                    self.failed_count += 1
                    logger.error(
                        "Producer queue remained full for %s seconds. Event %s dropped.",
                        self.queue_wait_timeout_seconds,
                        event_id,
                    )
                    return False
            except Exception as e:
                self.failed_count += 1
                logger.error("Exception producing event %s: %s", event_id, e)
                return False

    def publish(self, event: RideEvent, topic: Optional[str] = None) -> bool:
        """
        Publish a validated RideEvent to Kafka.
        Uses event.ride_id as partition key to ensure all events for a given ride
        route to the same partition and preserve strict temporal ordering.
        """
        target_topic = topic or self.settings.kafka_topic_rides
        payload_bytes = json.dumps(event.to_kafka_dict()).encode("utf-8")
        key_bytes = event.ride_id.encode("utf-8")

        return self._produce_bytes(
            topic=target_topic,
            key_bytes=key_bytes,
            payload_bytes=payload_bytes,
            event_id=event.event_id,
        )

    def publish_raw_test_record(
        self,
        raw_payload: Dict[str, Any],
        key: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> bool:
        """
        Development/test-only method for publishing intentionally malformed JSON records
        to Kafka to exercise downstream Dead Letter Queue (DLQ) processing.
        """
        if self.settings.environment not in ("development", "test"):
            raise RuntimeError(
                "publish_raw_test_record is only permitted in development or test environments."
            )

        target_topic = topic or self.settings.kafka_topic_rides
        payload_bytes = json.dumps(raw_payload).encode("utf-8")
        key_str = key or str(raw_payload.get("ride_id", "MALFORMED_KEY"))
        key_bytes = key_str.encode("utf-8")
        event_id = str(raw_payload.get("event_id", "UNKNOWN_EVENT_ID"))

        return self._produce_bytes(
            topic=target_topic,
            key_bytes=key_bytes,
            payload_bytes=payload_bytes,
            event_id=event_id,
        )

    def flush(self, timeout_seconds: float = 5.0) -> int:
        """Flush outstanding messages before shutdown."""
        if self.dry_run or self._producer is None:
            return 0
        return self._producer.flush(timeout=timeout_seconds)
