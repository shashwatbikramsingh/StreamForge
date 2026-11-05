"""
StreamForge — Synthetic Event Generator & Kafka Producer
Specification: streamforge_docs/architecture.md & streamforge_docs/adr/0001-mvp-baseline-decisions.md

Generates realistic ride-sharing lifecycle events:
  RIDE_REQUESTED -> RIDE_ACCEPTED -> RIDE_STARTED -> RIDE_COMPLETED (or RIDE_CANCELLED)

Enforces:
- Unique UUIDv4 event_id
- Stable ride_id as Kafka partition key (ensuring chronological ordering per ride)
- 3-timestamp tracking: occurred_at, produced_at, ingested_at
- Controlled synthetic anomaly injection (3% malformed payload for DLQ testing, 2% duplicate event_id)
"""

import os
import sys
import json
import time
import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Configuration
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = os.getenv("TOPIC_NAME", "ride-events")
RATE_PER_SEC = float(os.getenv("EVENTS_PER_SECOND", "5.0"))
ENABLE_ANOMALIES = os.getenv("ENABLE_ANOMALIES", "true").lower() in ("true", "1", "yes")

CITIES = [
    ("Koramangala", "Indiranagar", 6.5),
    ("HSR Layout", "Whitefield", 18.2),
    ("Bellandur", "Electronic City", 14.0),
    ("Indiranagar", "MG Road", 4.2),
    ("Whitefield", "Marathahalli", 8.1),
    ("Electronic City", "Koramangala", 12.3),
    ("MG Road", "Hebbal", 10.5),
]

EVENT_TYPES = [
    "RIDE_REQUESTED",
    "RIDE_ACCEPTED",
    "RIDE_STARTED",
    "RIDE_COMPLETED",
    "RIDE_CANCELLED"
]

class EventGenerator:
    def __init__(self, bootstrap_servers: str, topic: str):
        self.topic = topic
        self.producer = None
        self.active_rides: Dict[str, Dict[str, Any]] = {}
        self.history_ids = []

        try:
            from kafka import KafkaProducer
            self.producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                retries=3,
                acks="all",
            )
            print(f"[*] Connected to Kafka broker at {bootstrap_servers} (topic: {topic})")
        except Exception as e:
            print(f"[!] Kafka unavailable ({e}). Running in standalone dry-run simulation mode.")
            self.producer = None

    def generate_event(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Decide whether to progress an existing ride or start a new one
        if self.active_rides and random.random() < 0.65:
            ride_id = random.choice(list(self.active_rides.keys()))
            state = self.active_rides[ride_id]
            curr_step = state["step"]

            if curr_step == "RIDE_REQUESTED":
                event_type = "RIDE_ACCEPTED"
                state["driver_id"] = f"driver_{random.randint(1000, 9999)}"
                state["step"] = event_type
            elif curr_step == "RIDE_ACCEPTED":
                event_type = "RIDE_STARTED"
                state["step"] = event_type
            elif curr_step == "RIDE_STARTED":
                event_type = "RIDE_COMPLETED"
                del self.active_rides[ride_id]
            else:
                event_type = "RIDE_CANCELLED"
                del self.active_rides[ride_id]
        else:
            # Create a new ride
            ride_id = str(uuid.uuid4())
            route = random.choice(CITIES)
            fare = round(random.uniform(120.0, 750.0), 2)
            state = {
                "ride_id": ride_id,
                "rider_id": f"rider_{random.randint(1000, 9999)}",
                "driver_id": None,
                "pickup": route[0],
                "dropoff": route[1],
                "distance_km": route[2],
                "fare": fare,
                "step": "RIDE_REQUESTED",
            }
            self.active_rides[ride_id] = state
            event_type = "RIDE_REQUESTED"

        # Unique event envelope
        event_id = str(uuid.uuid4())

        # Anomaly Injection: duplicate event_id (tests idempotency)
        if ENABLE_ANOMALIES and self.history_ids and random.random() < 0.02:
            event_id = random.choice(self.history_ids)

        self.history_ids.append(event_id)
        if len(self.history_ids) > 500:
            self.history_ids.pop(0)

        envelope = {
            "event_id": event_id,
            "ride_id": ride_id,
            "event_type": event_type,
            "schema_version": 1,
            "occurred_at": now_iso,
            "produced_at": now_iso,
            "producer": "streamforge-generator-v1",
            "payload": {
                "rider_id": state["rider_id"],
                "driver_id": state.get("driver_id"),
                "pickup_city": state["pickup"],
                "dropoff_city": state["dropoff"],
                "fare_amount": state["fare"],
                "currency": "INR",
            }
        }

        # Anomaly Injection: Malformed payload to exercise the Dead Letter Queue
        if ENABLE_ANOMALIES and random.random() < 0.03:
            envelope["event_type"] = "MALFORMED_CORRUPTED_EVENT"
            envelope["payload"] = {"error_injection": "unrecognized schema", "corrupted": True}

        return envelope

    def send(self, event: Dict[str, Any]):
        key = event.get("ride_id", "default")
        if self.producer:
            try:
                future = self.producer.send(self.topic, key=key, value=event)
                future.get(timeout=2.0)
            except Exception as e:
                print(f"[!] Failed to produce event to Kafka: {e}")
        else:
            # Dry-run output
            print(f"[DRY-RUN] {event['event_type']} | ride={event['ride_id'][:8]} | id={event['event_id'][:8]} | fare={event['payload'].get('fare_amount')}")

    def run(self):
        print(f"[*] StreamForge Event Generator running at ~{RATE_PER_SEC} events/sec. Press Ctrl+C to stop.")
        sleep_interval = 1.0 / max(RATE_PER_SEC, 0.1)
        count = 0
        try:
            while True:
                evt = self.generate_event()
                self.send(evt)
                count += 1
                if count % 25 == 0:
                    print(f"[*] Generated & produced {count} events (active rides: {len(self.active_rides)})")
                time.sleep(sleep_interval)
        except KeyboardInterrupt:
            print("\n[*] Stopping generator...")
            if self.producer:
                self.producer.flush()
                self.producer.close()
            print("[*] Generator stopped cleanly.")

if __name__ == "__main__":
    generator = EventGenerator(KAFKA_BOOTSTRAP, TOPIC_NAME)
    generator.run()
