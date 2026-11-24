"""
StreamForge — Kafka Stream Consumer Worker
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 2, 3, 5) & RULES.md

Core invariants:
1. At-least-once delivery with manual offset commitment (enable.auto.commit = false).
2. Kafka source partition offsets are committed ONLY AFTER the downstream database transaction
   (processed_events or dead_letter_events) is durable.
3. If an unhandled failure occurs during processing, the offset is NOT committed, ensuring
   re-delivery on consumer restart.
4. Quarantined messages (DLQ) commit the offset once stored in dead_letter_events to prevent
   partition head-of-line blocking while maintaining complete audit trails.
"""

import json
import logging
from typing import Optional, Dict, Any, List
from streamforge.config.settings import Settings, get_settings
from streamforge.processor.engine import StreamProcessor, ProcessResult

logger = logging.getLogger(__name__)

try:
    import confluent_kafka
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False


class MockMessage:
    """Mock Kafka message for hermetic unit testing and dry-run operation."""

    def __init__(
        self,
        topic: str,
        partition: int,
        offset: int,
        key: Optional[bytes],
        value: bytes,
        error: Optional[Exception] = None,
    ):
        self._topic = topic
        self._partition = partition
        self._offset = offset
        self._key = key
        self._value = value
        self._error = error

    def topic(self) -> str:
        return self._topic

    def partition(self) -> int:
        return self._partition

    def offset(self) -> int:
        return self._offset

    def key(self) -> Optional[bytes]:
        return self._key

    def value(self) -> bytes:
        return self._value

    def error(self) -> Optional[Exception]:
        return self._error


class StreamConsumerWorker:
    """
    Kafka consumer worker coordinating message polling, processor handoff,
    and post-persistence manual offset commits.
    """

    def __init__(
        self,
        processor: StreamProcessor,
        topic: Optional[str] = None,
        settings: Optional[Settings] = None,
        consumer_config: Optional[Dict[str, Any]] = None,
        dry_run: bool = False,
    ):
        self.processor = processor
        self.settings = settings or get_settings()
        self.topic = topic or self.settings.kafka_topic_rides
        self.dry_run = dry_run or not CONFLUENT_KAFKA_AVAILABLE
        self.is_running = False

        self.messages_processed = 0
        self.messages_committed = 0
        self.committed_offsets: Dict[str, int] = {}  # key: f"{topic}:{partition}" -> offset

        self._in_memory_queue: List[MockMessage] = []
        self._consumer = None

        if not self.dry_run:
            base_config = {
                "bootstrap.servers": self.settings.kafka_bootstrap_servers,
                "group.id": self.settings.kafka_consumer_group,
                "auto.offset.reset": "earliest",
                "enable.auto.commit": False,  # CRITICAL: Manual commit only after DB durability
            }
            if consumer_config:
                base_config.update(consumer_config)

            try:
                self._consumer = confluent_kafka.Consumer(base_config)
                self._consumer.subscribe([self.topic])
                self.is_running = True
            except Exception as e:
                logger.warning(
                    "Failed to initialize confluent_kafka.Consumer (%s). Falling back to dry-run.", e
                )
                self.dry_run = True

    def inject_mock_message(
        self,
        payload_bytes: bytes,
        topic: Optional[str] = None,
        partition: int = 0,
        offset: int = 0,
        key: Optional[bytes] = None,
        error: Optional[Exception] = None,
    ):
        """Inject a mock message into the queue for hermetic unit testing."""
        msg = MockMessage(
            topic=topic or self.topic,
            partition=partition,
            offset=offset,
            key=key,
            value=payload_bytes,
            error=error,
        )
        self._in_memory_queue.append(msg)

    def poll_and_process(self, timeout_seconds: float = 1.0) -> Optional[ProcessResult]:
        """
        Poll a message from Kafka, process it via the StreamProcessor, and commit offset on success.

        Commit Rule (ADR 0001 Decision 3 & RULES.md):
        - If database commit succeeded (accepted, duplicate, or quarantined in DLQ): commit offset.
        - If unhandled failure or database crash occurs: DO NOT COMMIT offset.
        """
        msg = None
        if self.dry_run:
            if self._in_memory_queue:
                msg = self._in_memory_queue.pop(0)
            else:
                return None
        else:
            if not self._consumer:
                return None
            try:
                msg = self._consumer.poll(timeout=timeout_seconds)
            except Exception as e:
                logger.error("Error while polling Kafka: %s", e)
                return None

        if msg is None:
            return None

        # Check for Kafka-level delivery errors
        if msg.error() is not None:
            if (
                CONFLUENT_KAFKA_AVAILABLE
                and hasattr(confluent_kafka, "KafkaError")
                and msg.error().code() == confluent_kafka.KafkaError._PARTITION_EOF
            ):
                logger.debug(
                    "Reached end of partition: %s [%s] @ offset %s",
                    msg.topic(),
                    msg.partition(),
                    msg.offset(),
                )
                return None
            logger.error("Consumer received error from Kafka broker: %s", msg.error())
            return None

        # Parse message value as JSON (or encapsulate malformed bytes)
        raw_val = msg.value()
        try:
            raw_payload = json.loads(raw_val.decode("utf-8"))
        except Exception:
            raw_payload = {"raw_content": raw_val.decode("utf-8", errors="replace")}

        # Step 2: Hand off to StreamProcessor
        # If the repository encounters an unhandled exception here, it bubbles up
        # and offset commitment will NOT occur.
        result = self.processor.process_raw_message(
            raw_payload=raw_payload,
            source_partition=msg.partition(),
            source_offset=msg.offset(),
        )
        self.messages_processed += 1

        # Step 3: Manual Offset Commit
        # Both successful processing, duplicate replay, and DLQ quarantine are durable in DB.
        self._commit_offset(msg)
        return result

    def _commit_offset(self, msg: Any):
        """Commit the Kafka offset manually after verifying database durability."""
        topic_partition_key = f"{msg.topic()}:{msg.partition()}"
        self.committed_offsets[topic_partition_key] = msg.offset() + 1
        self.messages_committed += 1

        if not self.dry_run and self._consumer:
            try:
                self._consumer.commit(message=msg, asynchronous=False)
                logger.debug(
                    "Committed offset %s for topic %s [%s]",
                    msg.offset(),
                    msg.topic(),
                    msg.partition(),
                )
            except Exception as e:
                logger.error("Failed to commit offset to Kafka broker: %s", e)
                raise

    def close(self):
        """Close the Kafka consumer cleanly."""
        self.is_running = False
        if not self.dry_run and self._consumer:
            try:
                self._consumer.close()
            except Exception as e:
                logger.warning("Error closing Kafka consumer: %s", e)
