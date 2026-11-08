# StreamForge — Kafka Consumer & Stream Validator ⚡

The stream consumer service reads records from Apache Kafka topic `ride-events`, enforces strict schema contracts, executes idempotent persistence into PostgreSQL, maintains monotonic ride projection state, and routes invalid data to the durable Dead Letter Queue.

---

## 🛡️ Delivery & Resilience Guarantees

- **At-Least-Once Delivery:** Uses manual offset commits (`enable_auto_commit=False`). Offsets are committed to Kafka *only after* the PostgreSQL transaction successfully commits to disk.
- **Idempotency:** Inserts immutable event envelopes into `processed_events` using `ON CONFLICT (event_id) DO NOTHING`. Replayed or duplicate events are discarded without mutating downstream analytics.
- **State Machine Protection:** Derives `rides` projections with rank-checking logic (`REQUESTED`=1 $\to$ `ACCEPTED`=2 $\to$ `STARTED`=3 $\to$ `COMPLETED`/`CANCELLED`=4). Out-of-order stale events cannot downgrade state.
- **Durable Dead Letter Queue (DLQ):** Quarantines unparseable JSON payloads or contract violations directly into the PostgreSQL `dead_letter_queue` table with topic, partition, offset, and error stack traces.

---

## 🚀 Running Locally

```bash
# Optional: virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run consumer (runs standalone verification if Kafka/Postgres are offline)
python consumer.py
```

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker connection string |
| `TOPIC_NAME` | `ride-events` | Target Kafka topic |
| `CONSUMER_GROUP` | `streamforge-consumers` | Consumer group ID |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/streamforge` | PostgreSQL connection URL |

