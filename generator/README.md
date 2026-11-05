# StreamForge — Synthetic Event Generator & Kafka Producer ⚡

The event generator synthesizes realistic ride-sharing lifecycle events and produces them to Apache Kafka with strict keying and delivery semantics.

---

## 🎯 Capabilities

- **Stateful Ride Lifecycles:** Generates monotonic ride transitions (`RIDE_REQUESTED` → `RIDE_ACCEPTED` → `RIDE_STARTED` → `RIDE_COMPLETED` or `RIDE_CANCELLED`).
- **Kafka Partition Ordering:** Keys all messages by `ride_id` to ensure strict chronological per-ride ordering within Kafka topic partitions.
- **Three-Timestamp Envelopes:** Tracks `occurred_at` (event time), `produced_at` (generator emission), and downstream `ingested_at`.
- **Synthetic Anomaly Injection:**
  - Injects duplicate `event_id` envelopes (2%) to verify PostgreSQL idempotent deduplication (`ON CONFLICT DO NOTHING`).
  - Injects corrupted/malformed envelopes (3%) to exercise Dead Letter Queue (DLQ) routing.

---

## 🚀 Running Locally

```bash
# Optional: create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run generator (runs in dry-run mode if Kafka is not active)
python event_generator.py
```

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker connection string |
| `TOPIC_NAME` | `ride-events` | Target Kafka topic |
| `EVENTS_PER_SECOND` | `5.0` | Emission throughput |
| `ENABLE_ANOMALIES` | `true` | Toggle test anomaly injection |
