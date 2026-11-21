"""
StreamForge — Kafka Event Publisher
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decision 2)

Wraps confluent_kafka.Producer to publish validated RideEvent envelopes to Kafka.
Partitions by ride_id to guarantee per-ride strict ordering across partitions.
Employs explicit delivery report callbacks and safe dry-run fallback.
"""

import json
import logging
from typing import Optional, Callable, Dict, Any
from streamforge.config.settings import Settings, get_settings
from streamforge.events.schemas import RideEvent

logger = logging.getLogger(__name__)

try:
    import confluent_kafka
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False


class EventPublisher:
    """
    Kafka event publisher enforcing per-ride partition keys and delivery callbacks.
    """

    def __init__(
        self,
        settings: Optional[Settings] = None,
        delivery_callback: Optional[Callable[[Optional[Exception], Any], None]] = None,
        dry_run: bool = False,
    ):
        self.settings = settings or get_settings()
        self.dry_run = dry_run or not CONFLUENT_KAFKA_AVAILABLE
        self.published_count = 0
        self.failed_count = 0
        self.last_published_event_id: Optional[str] = None
        self._user_callback = delivery_callback

        self._producer = None
        if not self.dry_run:
            try:
                conf = {
                    "bootstrap.servers": self.settings.kafka_bootstrap_servers,
                    "client.id": "streamforge-event-producer",
                    "acks": "all",  # Strongest durability guarantee
                    "retries": 3,
                    "linger.ms": 5,
                }
                self._producer = confluent_kafka.Producer(conf)
            except Exception as e:
                logger.warning("Failed to initialize confluent_kafka.Producer (%s). Falling back to dry-run.", e)
                self.dry_run = True

    def _default_delivery_callback(self, err: Optional[Exception], msg: Any) -> None:
        """Internal callback invoked on broker ACK or failure."""
        if err is not None:
            self.failed_count += 1
            logger.error("Kafka message delivery failed: %s", err)
        else:
            self.published_count += 1
            logger.debug(
                "Event delivered to topic %s [%s] @ offset %s",
                msg.topic(), msg.partition(), msg.offset()
            )

        if self._user_callback:
            self._user_callback(err, msg)

    def publish(self, event: RideEvent, topic: Optional[str] = None) -> bool:
        """
        Publish a RideEvent to Kafka.
        Uses event.ride_id as partition key to ensure all events for a given ride
        route to the same partition and preserve strict temporal ordering.
        """
        target_topic = topic or self.settings.kafka_topic_rides
        payload_bytes = json.dumps(event.to_kafka_dict()).encode("utf-8")
        key_bytes = event.ride_id.encode("utf-8")

        self.last_published_event_id = event.event_id

        if self.dry_run:
            # Standalone dry-run simulation
            self.published_count += 1
            logger.info("[Dry-Run] Published event %s for ride %s to %s", event.event_id, event.ride_id, target_topic)
            if self._user_callback:
                self._user_callback(None, None)
            return True

        try:
            self._producer.produce(
                topic=target_topic,
                key=key_bytes,
                value=payload_bytes,
                on_delivery=self._default_delivery_callback,
            )
            # Poll triggers delivery callbacks for previously queued messages
            self._producer.poll(0)
            return True
        except Exception as e:
            self.failed_count += 1
            logger.error("Exception producing event %s: %s", event.event_id, e)
            return False

    def flush(self, timeout_seconds: float = 5.0) -> int:
        """Flush outstanding messages before shutdown."""
        if self.dry_run or self._producer is None:
            return 0
        return self._producer.flush(timeout=timeout_seconds)
