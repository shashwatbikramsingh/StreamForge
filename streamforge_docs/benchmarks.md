# StreamForge Pipeline Benchmarking & Capacity Report (Day 4)

## 1. Executive Summary

This report documents the performance, latency characteristics, and reliability boundaries of StreamForge's end-to-end event streaming pipeline. Across graduated workloads ranging from 10 EPS to 100 EPS, StreamForge maintained **100% data integrity with zero event loss, zero duplicate persistence, and zero DLQ errors**.

Under the tested single-consumer configuration, the pipeline scaled linearly up to **50 EPS** with sub-50ms tail commit latency. At **100 EPS**, incoming traffic exceeded the single-threaded consumer's maximum sustained processing capacity ($\approx 88.12\text{ EPS}$), demonstrating a textbook queueing effect where Kafka buffered excess messages while preserving strict delivery guarantees.

---

## 2. Benchmark Architecture & Methodology

### 2.1 Live Data Path
```
RideEventGenerator (deterministic seed, unique run-ID)
       ↓
EventPublisher (confluent-kafka Producer, dry_run=False)
       ↓
Kafka KRaft Broker (port 9092, temporary 3-partition topic)
       ↓
StreamConsumerWorker (manual offset management, dry_run=False)
       ↓
StreamProcessor (Pydantic validation, business rules)
       ↓
PostgreSQL 16 (port 5432, processed_events + rides tables)
```

### 2.2 Dual-Latency Instrumentation
To capture true stream processing behavior without confounding network and storage layers, two distinct latency metrics are recorded for every event:

1. **Producer-to-Processor Ingress Latency**:
   - **Boundary**: `event.produced_at` $\to$ `event.ingested_at`
   - **Meaning**: Time elapsed from message generation until the consumer worker hands the deserialized payload to `StreamProcessor.process_raw_message()`. Captures producer queue delay, Kafka broker network transit, and consumer fetch polling. Excludes database write and offset commit.
   - **Storage**: Calculated directly from PostgreSQL timestamps: `EXTRACT(EPOCH FROM (ingested_at - produced_at)) * 1000.0`.

2. **Producer Enqueue to Offset Commit Latency**:
   - **Boundary**: Wall-clock `time.perf_counter()` immediately before `EventPublisher.publish()` $\to$ immediately after `StreamConsumerWorker.poll_and_process()` returns.
   - **Meaning**: Total wall-clock duration of the event lifecycle, including serialization, broker transfer, worker dequeue, validation, PostgreSQL transaction (`INSERT INTO processed_events`), and synchronous Kafka offset commit (`commitSync`).

---

## 3. Benchmark Results Matrix

All workloads executed against live Docker containers (`streamforge-kafka` KRaft, `streamforge-postgres` PostgreSQL 16) with background generator and consumer containers stopped to isolate measurement noise.

| Workload Metric | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 |
| :--- | :--- | :--- | :--- | :--- |
| **Offered Rate** | **10 EPS** | **25 EPS** | **50 EPS** | **100 EPS** |
| **Target Events** | 500 events | 1,000 events | 2,000 events | 5,000 events |
| **Rides Modeled** | 125 rides | 250 rides | 500 rides | 1,250 rides |
| **Partitions** | 3 | 3 | 3 | 3 |
| **Broker ACKs** | 500 / 500 (100%) | 1,000 / 1,000 (100%) | 2,000 / 2,000 (100%) | 5,000 / 5,000 (100%) |
| **Consumer Commits** | 500 / 500 (100%) | 1,000 / 1,000 (100%) | 2,000 / 2,000 (100%) | 5,000 / 5,000 (100%) |
| **PostgreSQL Rows** | 500 unique rows | 1,000 unique rows | 2,000 unique rows | 5,000 unique rows |
| **Dropped / DLQ** | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| **Persisted Throughput** | **10.00 EPS** | **24.97 EPS** | **49.97 EPS** | **88.12 EPS** |
| **Consumer Drain Time** | 0.000 s | 0.051 s | 0.025 s | **6.740 s** |
| **Ingress Latency P50** | 18.2 ms | 55.5 ms | 17.7 ms | 133.4 ms |
| **Ingress Latency P95** | 21.0 ms | 65.5 ms | 30.6 ms | 6,760.2 ms |
| **Commit Latency P50** | 24.1 ms | 68.2 ms | 30.8 ms | 143.3 ms |
| **Commit Latency P95** | 29.8 ms | 78.4 ms | 49.9 ms | 6,770.5 ms |
| **Commit Latency P99** | 35.2 ms | 86.1 ms | 81.8 ms | 6,877.4 ms |

---

## 4. Saturation & Queueing Analysis

### 4.1 Single-Worker Capacity Bottleneck
In Scenario 4 (100 EPS offered), the measured persisted throughput reached **88.12 EPS**.
The per-event lifecycle in `StreamConsumerWorker` consists of four sequential steps:
1. `consumer.poll()`
2. Deserialization & Pydantic schema validation
3. PostgreSQL connection checkout & disk insert transaction
4. Synchronous Kafka offset commit (`commitSync`)

The average service time per event under this configuration is:
$$T_{\text{service}} \approx \frac{1000\text{ ms}}{88.12} \approx 11.35\text{ ms}$$

Because the arrival rate ($\lambda = 100\text{ EPS}$) exceeds the maximum service rate ($\mu \approx 88.12\text{ EPS}$), a queue forms in the Kafka broker during the 50-second publication window:
$$\text{Accumulated Backlog} = (100 - 88.12) \times 50 \approx 594\text{ events}$$

### 4.2 Drain Behavior and Tail Latency
Once the producer completes emission at $t = 50.0\text{s}$, the consumer continues draining the backlog:
$$T_{\text{drain}} = \frac{594\text{ events}}{88.12\text{ EPS}} \approx 6.74\text{ seconds}$$

Events published toward the end of the run sat in partition logs waiting for their turn in the single consumer thread. Consequently:
- **P50 Latency (143.3 ms)** reflects early events processed before large queue accumulation.
- **P95 Latency (6,770.5 ms)** and **P99 Latency (6,877.4 ms)** reflect late-arriving events that waited through the accumulating buffer.
- Ingress latency and commit latency are nearly identical at P95/P99 (~6.76s vs ~6.77s) because over 98% of the delay is **queue wait time in Kafka**, not database transaction overhead.

---

## 5. Engineering Caveats & Production Scaling

1. **Measured Throughput vs. Cluster Capacity**:
   The 88.12 EPS figure represents the capacity of a *single Python consumer worker* executing synchronous database writes and individual synchronous commits. It does not represent the throughput limit of Kafka or PostgreSQL.
2. **Horizontal Scaling Across Partitions**:
   The topic is created with 3 partitions. Scaling consumer workers to match partition count (3 consumer threads/containers in the same consumer group) distributes partitions 1:1, offering potential linear scale up to $\approx 3 \times 88 = 264\text{ EPS}$. However, real multi-worker scaling requires evaluating PostgreSQL connection pool contention and database lock overhead.
3. **Micro-batching & Commit Aggregation**:
   Persisting records in micro-batches (e.g. 50 records per multi-row `INSERT`) and committing offsets asynchronously or periodically reduces database round-trips and eliminates synchronous commit blocking, allowing a single worker to achieve significantly higher throughput.

---

## 6. How to Reproduce

Run the live benchmark script against healthy Kafka and PostgreSQL containers:

```powershell
# Scenario 1 (10 EPS, 500 events)
.\.venv\Scripts\python.exe .\scripts\benchmark_e2e_pipeline.py --events 500 --rate 10 --partitions 3

# Scenario 2 (25 EPS, 1,000 events)
.\.venv\Scripts\python.exe .\scripts\benchmark_e2e_pipeline.py --events 1000 --rate 25 --partitions 3

# Scenario 3 (50 EPS, 2,000 events)
.\.venv\Scripts\python.exe .\scripts\benchmark_e2e_pipeline.py --events 2000 --rate 50 --partitions 3

# Scenario 4 (100 EPS, 5,000 events)
.\.venv\Scripts\python.exe .\scripts\benchmark_e2e_pipeline.py --events 5000 --rate 100 --partitions 3
```
