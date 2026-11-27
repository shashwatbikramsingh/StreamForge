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

import logging
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from streamforge.config.settings import Settings, get_settings
from streamforge.events.deserializer import deserialize_kafka_value
from streamforge.processor.engine import StreamProcessor, ProcessResult

logger = logging.getLogger(__name__)

try:
    import confluent_kafka
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False


@dataclass(frozen=True)
class StageTiming:
    """Decoupled stage breakdown for a single consumer event loop iteration (in milliseconds)."""
    poll_ms: float
    validation_ms: float
    db_persist_ms: float
    offset_commit_ms: float
    total_processing_ms: float


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
        self.dry_run = dry_run
        self.is_running = False
        self.messages_processed = 0
        self.messages_committed = 0

        self.committed_offsets: Dict[str, int] = {}  # key: f"{topic}:{partition}" -> offset
        self._in_memory_queue: List[MockMessage] = []
        self._consumer = None

        # Prevent processing later offsets after an uncommitted failure.
        self._halted = False
        self._halt_reason: Optional[str] = None
        self.last_stage_timing: Optional[StageTiming] = None

        # Explicit dry-run mode is permitted for tests and offline development.
        if self.dry_run:
            logger.info("StreamConsumerWorker initialized in explicit dry-run mode.")
        else:
            # Never silently convert a production consumer into dry-run mode.
            if not CONFLUENT_KAFKA_AVAILABLE:
                raise RuntimeError(
                    "confluent-kafka is not installed. "
                    "Install the dependency or explicitly enable dry_run=True."
                )

            if self.settings.kafka_enable_auto_commit is not False:
                raise ValueError(
                    "Automatic Kafka offset commits must remain disabled."
                )

            # These settings protect our at-least-once delivery guarantee.
            protected_config = {
                "enable.auto.commit": False,
                "enable.auto.offset.store": False,
            }

            overrides = consumer_config or {}

            # Reject attempts to weaken our delivery guarantees.
            for key, required_value in protected_config.items():
                if key in overrides and overrides[key] is not required_value:
                    raise ValueError(
                        f"Unsafe consumer configuration override: '{key}' must be {required_value}, "
                        f"got {overrides[key]}."
                    )

            base_config = {
                "bootstrap.servers": self.settings.kafka_bootstrap_servers,
                "group.id": self.settings.kafka_consumer_group,
                "auto.offset.reset": "earliest",
                "enable.auto.commit": False,
                "enable.auto.offset.store": False,
            }
            if consumer_config:
                base_config.update(consumer_config)
            base_config.update(protected_config)
            self.consumer_config = base_config

            try:
                self._consumer = confluent_kafka.Consumer(base_config)
                self._consumer.subscribe([self.topic])
                self.is_running = True
            except Exception as e:
                logger.error("Failed to initialize confluent_kafka.Consumer: %s", e)
                raise RuntimeError(f"Failed to initialize Kafka consumer: {e}") from e

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

    def poll_and_process(
        self,
        timeout_seconds: float = 1.0,
    ) -> Optional[ProcessResult]:
        """
        Poll one Kafka message, validate its JSON representation,
        hand it to the processor, and commit only after durable processing.

        A processing or commit failure halts this worker so that a later
        message cannot cause the failed message's offset to be skipped.
        """
        if self._halted:
            raise RuntimeError(
                "Consumer worker is halted after an uncommitted failure. "
                "Close and recreate the worker to resume from Kafka's "
                "last committed offset. "
                f"Reason: {self._halt_reason}"
            )

        if timeout_seconds < 0:
            raise ValueError("timeout_seconds must be non-negative.")

        t_iter_start = time.perf_counter()

        # STEP 1: Retrieve one message.
        t_poll_start = time.perf_counter()
        if self.dry_run:
            if not self._in_memory_queue:
                return None
            msg = self._in_memory_queue.pop(0)
        else:
            if self._consumer is None:
                raise RuntimeError(
                    "Kafka consumer is not initialized."
                )
            try:
                msg = self._consumer.poll(timeout=timeout_seconds)
            except Exception as e:
                logger.error("Error while polling Kafka: %s", e)
                raise
        t_poll_end = time.perf_counter()
        poll_ms = max(0.0, (t_poll_end - t_poll_start) * 1000.0)

        if msg is None:
            return None

        # Check for Kafka-level delivery errors
        if msg.error() is not None:
            err = msg.error()
            is_eof = False
            if hasattr(err, "code") and callable(err.code):
                eof_code = getattr(confluent_kafka.KafkaError, "_PARTITION_EOF", -191) if (CONFLUENT_KAFKA_AVAILABLE and hasattr(confluent_kafka, "KafkaError")) else -191
                if err.code() == eof_code:
                    is_eof = True
            elif getattr(err, "is_eof", False):
                is_eof = True

            if is_eof:
                logger.debug(
                    "Reached end of partition: %s [%s] @ offset %s",
                    msg.topic(),
                    msg.partition(),
                    msg.offset(),
                )
                return None

            # Surface other Kafka message errors instead of silently swallowing
            logger.error("Consumer received error from Kafka broker: %s", err)
            raise RuntimeError(f"Kafka message error: {err}")

        # STEP 1: Deserialize the Kafka message.
        try:
            deserialization_result = deserialize_kafka_value(
                msg.value()
            )
            # STEP 2: Route according to deserialization outcome.
            if deserialization_result.succeeded:
                if deserialization_result.payload is None:
                    raise RuntimeError(
                        "Deserializer succeeded without producing a JSON object."
                    )
                # Valid JSON object: perform semantic schema validation.
                result = self.processor.process_raw_message(
                    raw_message=deserialization_result.payload,
                    source_partition=msg.partition(),
                    source_offset=msg.offset(),
                    source_topic=msg.topic(),
                )
            else:
                # Invalid transport representation: write directly to DLQ.
                result = self.processor.process_deserialization_failure(
                    result=deserialization_result,
                    source_topic=msg.topic(),
                    source_partition=msg.partition(),
                    source_offset=msg.offset(),
                )
            # STEP 3: Processing or quarantine completed successfully.
            self.messages_processed += 1

            # STEP 4: Commit only after repository operation succeeds.
            t_commit_start = time.perf_counter()
            self._commit_offset(msg)
            t_commit_end = time.perf_counter()
            commit_ms = max(0.0, (t_commit_end - t_commit_start) * 1000.0)

            val_ms = getattr(self.processor, "last_validation_ms", 0.0)
            db_ms = getattr(self.processor, "last_db_persist_ms", 0.0)
            total_proc_ms = max(0.0, (time.perf_counter() - t_iter_start) * 1000.0)

            self.last_stage_timing = StageTiming(
                poll_ms=round(poll_ms, 3),
                validation_ms=round(val_ms, 3),
                db_persist_ms=round(db_ms, 3),
                offset_commit_ms=round(commit_ms, 3),
                total_processing_ms=round(total_proc_ms, 3),
            )
            return result
        except Exception as e:
            self._halted = True
            self._halt_reason = (
                f"Processing/commit failure at {msg.topic()} [{msg.partition()}] "
                f"offset {msg.offset()}: {e}"
            )
            logger.error(
                "Halting consumer worker due to unhandled processing/storage failure: %s",
                self._halt_reason,
                exc_info=True,
            )
            raise

    def _commit_offset(self, msg: Any):
        """
        Commit a Kafka offset only after downstream processing is durable.

        Live mode:
            Wait for broker confirmation before updating metrics.

        Dry-run mode:
            Record a simulated commit in local memory.
        """
        topic = msg.topic()
        partition = msg.partition()
        offset = msg.offset()

        topic_partition_key = f"{topic}:{partition}"

        # Explicit simulation mode.
        if self.dry_run:
            self.committed_offsets[topic_partition_key] = offset + 1
            self.messages_committed += 1

            logger.debug(
                "[Dry-run] Simulated offset commit: %s [%s] -> %s",
                topic,
                partition,
                offset + 1,
            )
            return

        if self._consumer is None:
            raise RuntimeError(
                "Cannot commit Kafka offset: consumer is not initialized."
            )

        try:
            partitions = self._consumer.commit(
                message=msg,
                asynchronous=False,
            )
            if not partitions:
                raise RuntimeError(
                    "Kafka returned no offset commit confirmation."
                )

            for tp in partitions:
                err = getattr(tp, "error", None)
                if err is not None:
                    err_val = err() if callable(err) else err
                    if err_val:
                        raise RuntimeError(
                            f"Broker returned partition error during offset commit: {err_val}"
                        )

            self.committed_offsets[topic_partition_key] = offset + 1
            self.messages_committed += 1
            logger.debug(
                "Committed offset %s for topic %s [%s]",
                offset + 1,
                topic,
                partition,
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
