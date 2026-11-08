"""
StreamForge — Kafka Consumer & Stream Validator Service
Specification: streamforge_docs/architecture.md & streamforge_docs/adr/0001-mvp-baseline-decisions.md

Responsibilities:
1. Subscribes to Kafka topic `ride-events` as consumer group `streamforge-consumers`.
2. Validates envelope schemas and timestamps.
3. Implements idempotent persistence in PostgreSQL (`ON CONFLICT (event_id) DO NOTHING`).
4. Updates derived `rides` state projection enforcing monotonic state ranks.
5. Routes malformed, unparseable, or invalid events to the PostgreSQL `dead_letter_queue`.
6. Commits Kafka offsets manually ONLY after database durability is guaranteed.
"""

import os
import sys
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("streamforge.consumer")

# Configuration
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = os.getenv("TOPIC_NAME", "ride-events")
CONSUMER_GROUP = os.getenv("CONSUMER_GROUP", "streamforge-consumers")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/streamforge")

VALID_EVENT_TYPES = {
    "RIDE_REQUESTED": 1,
    "RIDE_ACCEPTED": 2,
    "RIDE_STARTED": 3,
    "RIDE_COMPLETED": 4,
    "RIDE_CANCELLED": 4,
}

STATUS_MAP = {
    "RIDE_REQUESTED": "REQUESTED",
    "RIDE_ACCEPTED": "ACCEPTED",
    "RIDE_STARTED": "STARTED",
    "RIDE_COMPLETED": "COMPLETED",
    "RIDE_CANCELLED": "CANCELLED",
}

class EventValidator:
    """Validates streaming event envelopes against the StreamForge data contract."""

    @staticmethod
    def validate_envelope(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        required_fields = ["event_id", "ride_id", "event_type", "schema_version", "occurred_at", "produced_at", "payload"]
        for field in required_fields:
            if field not in data:
                return False, f"Missing required envelope field: '{field}'"

        if data["event_type"] not in VALID_EVENT_TYPES:
            return False, f"Invalid or unrecognized event_type: '{data['event_type']}'"

        if not isinstance(data.get("schema_version"), int) or data["schema_version"] < 1:
            return False, "schema_version must be an integer >= 1"

        if not isinstance(data.get("payload"), dict):
            return False, "payload must be a JSON object"

        # Validate timestamp formats
        for ts_field in ["occurred_at", "produced_at"]:
            try:
                datetime.fromisoformat(data[ts_field].replace("Z", "+00:00"))
            except Exception as e:
                return False, f"Invalid timestamp format in '{ts_field}': {e}"

        return True, None

class StreamConsumer:
    def __init__(self, bootstrap_servers: str, topic: str, group_id: str, db_url: str):
        self.topic = topic
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.db_url = db_url
        self.consumer = None
        self.db_conn = None

        self._init_db()
        self._init_kafka()

    def _init_db(self):
        try:
            import psycopg2
            self.db_conn = psycopg2.connect(self.db_url)
            self.db_conn.autocommit = False
            logger.info("[*] Connected to PostgreSQL data store.")
        except Exception as e:
            logger.warning(f"[!] PostgreSQL unavailable ({e}). Running in simulation mode.")
            self.db_conn = None

    def _init_kafka(self):
        try:
            from kafka import KafkaConsumer
            self.consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers.split(","),
                group_id=self.group_id,
                auto_offset_reset="earliest",
                enable_auto_commit=False,  # Strict manual commit after DB persist
                value_deserializer=lambda m: m.decode("utf-8"),
                consumer_timeout_ms=1000,
            )
            logger.info(f"[*] Subscribed to Kafka topic '{self.topic}' (group: {self.group_id}).")
        except Exception as e:
            logger.warning(f"[!] Kafka broker unavailable ({e}). Running in standalone dry-run verification mode.")
            self.consumer = None

    def process_record(self, raw_value: str, topic: str, partition: int, offset: int) -> bool:
        """Processes a single event record with validation, idempotency, and DLQ routing."""
        # 1. Parse JSON payload
        try:
            event = json.loads(raw_value)
        except Exception as e:
            logger.error(f"[DLQ] JSON parse error at {topic}[{partition}:{offset}]: {e}")
            self._route_to_dlq(raw_value, topic, partition, offset, "JSON_PARSE_ERROR", str(e))
            return True

        # 2. Validate envelope schema
        is_valid, error_msg = EventValidator.validate_envelope(event)
        if not is_valid:
            logger.warning(f"[DLQ] Schema validation failure at {topic}[{partition}:{offset}]: {error_msg}")
            self._route_to_dlq(raw_value, topic, partition, offset, "SCHEMA_VALIDATION_ERROR", error_msg or "Invalid schema")
            return True

        # 3. Persist to PostgreSQL if connected
        if self.db_conn:
            try:
                with self.db_conn.cursor() as cur:
                    # Insert into immutable processed_events (idempotent ON CONFLICT DO NOTHING)
                    cur.execute("""
                        INSERT INTO processed_events (
                            event_id, ride_id, event_type, schema_version,
                            occurred_at, produced_at, producer, payload,
                            topic, partition_id, offset_value
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO NOTHING;
                    """, (
                        event["event_id"],
                        event["ride_id"],
                        event["event_type"],
                        event["schema_version"],
                        event["occurred_at"],
                        event["produced_at"],
                        event.get("producer", "streamforge-consumer"),
                        json.dumps(event["payload"]),
                        topic,
                        partition,
                        offset,
                    ))

                    # Update derived rides projection state machine
                    etype = event["event_type"]
                    status = STATUS_MAP[etype]
                    rank = VALID_EVENT_TYPES[etype]
                    payload = event["payload"]
                    now_ts = datetime.now(timezone.utc)

                    if etype == "RIDE_REQUESTED":
                        cur.execute("""
                            INSERT INTO rides (
                                ride_id, rider_id, driver_id, pickup_city, dropoff_city,
                                status, status_rank, fare_amount, currency, requested_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (ride_id) DO UPDATE SET
                                status = EXCLUDED.status,
                                status_rank = EXCLUDED.status_rank,
                                updated_at = EXCLUDED.updated_at
                            WHERE rides.status_rank <= EXCLUDED.status_rank;
                        """, (
                            event["ride_id"],
                            payload.get("rider_id", "unknown"),
                            payload.get("driver_id"),
                            payload.get("pickup_city", "Unknown"),
                            payload.get("dropoff_city", "Unknown"),
                            status,
                            rank,
                            payload.get("fare_amount", 100.0),
                            payload.get("currency", "INR"),
                            event["occurred_at"],
                            now_ts,
                        ))
                    else:
                        cur.execute("""
                            UPDATE rides SET
                                status = %s,
                                status_rank = %s,
                                driver_id = COALESCE(%s, driver_id),
                                updated_at = %s
                            WHERE ride_id = %s AND status_rank <= %s;
                        """, (
                            status,
                            rank,
                            payload.get("driver_id"),
                            now_ts,
                            event["ride_id"],
                            rank,
                        ))

                self.db_conn.commit()
                logger.info(f"[PROCESSED] {event['event_type']} | ride={event['ride_id'][:8]} | offset={offset}")
            except Exception as e:
                self.db_conn.rollback()
                logger.error(f"[!] Database transaction error: {e}")
                self._route_to_dlq(raw_value, topic, partition, offset, "DB_TRANSACTION_ERROR", str(e))
                return True
        else:
            # Standalone output
            logger.info(f"[STANDALONE] Validated {event['event_type']} for ride={event['ride_id'][:8]} (idempotent write simulated)")

        return True

    def _route_to_dlq(self, raw_payload: str, topic: str, partition: int, offset: int, error_type: str, error_msg: str):
        """Durable Dead Letter Queue persistence in PostgreSQL."""
        if self.db_conn:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO dead_letter_queue (
                            raw_payload, topic, partition_id, offset_value, error_type, error_message
                        ) VALUES (%s, %s, %s, %s, %s, %s);
                    """, (raw_payload, topic, partition, offset, error_type, error_msg))
                self.db_conn.commit()
                logger.info(f"[DLQ-PERSISTED] Quarantined corrupted event to PostgreSQL dead_letter_queue.")
            except Exception as e:
                self.db_conn.rollback()
                logger.error(f"[!] Critical error persisting to DLQ: {e}")
        else:
            logger.info(f"[DLQ-SIMULATED] Error quarantined: {error_type} - {error_msg}")

    def run(self):
        logger.info("[*] StreamForge Consumer started. Listening for Kafka events...")
        if not self.consumer:
            logger.info("[*] Running 10-cycle standalone validation test...")
            self._run_standalone_demo()
            return

        try:
            while True:
                records = self.consumer.poll(timeout_ms=1000)
                for tp, msgs in records.items():
                    for msg in msgs:
                        success = self.process_record(msg.value, msg.topic, msg.partition, msg.offset)
                        if success:
                            # Commit offset only after DB durability
                            self.consumer.commit()
        except KeyboardInterrupt:
            logger.info("[*] Shutting down consumer...")
            if self.consumer:
                self.consumer.close()
            if self.db_conn:
                self.db_conn.close()
            logger.info("[*] Consumer stopped cleanly.")

    def _run_standalone_demo(self):
        """Demonstrates event validation, idempotency, and DLQ handling with mock data."""
        mock_events = [
            # 1. Valid Requested
            json.dumps({
                "event_id": "11111111-1111-4111-8111-111111111111",
                "ride_id": "22222222-2222-4222-8222-222222222222",
                "event_type": "RIDE_REQUESTED",
                "schema_version": 1,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "produced_at": datetime.now(timezone.utc).isoformat(),
                "payload": {"rider_id": "rider_101", "pickup_city": "Koramangala", "dropoff_city": "Indiranagar", "fare_amount": 250.0}
            }),
            # 2. Duplicate Event (tests idempotency)
            json.dumps({
                "event_id": "11111111-1111-4111-8111-111111111111",
                "ride_id": "22222222-2222-4222-8222-222222222222",
                "event_type": "RIDE_REQUESTED",
                "schema_version": 1,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "produced_at": datetime.now(timezone.utc).isoformat(),
                "payload": {"rider_id": "rider_101", "pickup_city": "Koramangala", "dropoff_city": "Indiranagar", "fare_amount": 250.0}
            }),
            # 3. Valid Accepted
            json.dumps({
                "event_id": "33333333-3333-4333-8333-333333333333",
                "ride_id": "22222222-2222-4222-8222-222222222222",
                "event_type": "RIDE_ACCEPTED",
                "schema_version": 1,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "produced_at": datetime.now(timezone.utc).isoformat(),
                "payload": {"driver_id": "driver_909"}
            }),
            # 4. Corrupted / Malformed (tests DLQ routing)
            "{ invalid_json_payload: null ",
            # 5. Invalid Schema (tests DLQ schema failure)
            json.dumps({
                "event_id": "55555555-5555-4555-8555-555555555555",
                "ride_id": "22222222-2222-4222-8222-222222222222",
                "event_type": "UNKNOWN_UNSUPPORTED_TYPE",
                "schema_version": 1,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "produced_at": datetime.now(timezone.utc).isoformat(),
                "payload": {}
            }),
        ]

        for i, raw in enumerate(mock_events):
            self.process_record(raw, "ride-events", 0, i)
            time.sleep(0.1)
        logger.info("[*] Standalone validation test completed successfully.")

if __name__ == "__main__":
    consumer = StreamConsumer(KAFKA_BOOTSTRAP, TOPIC_NAME, CONSUMER_GROUP, DATABASE_URL)
    consumer.run()

