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

## 7. Day 6: SQL Statement Batching & Database Performance Benchmark

Following Day 5's transaction batching milestone, Day 6 evaluated SQL statement batching and optimistic conflict handling under an identical 2,000-event / 100 EPS workload (3 Kafka partitions, 1 consumer worker, batch size 50, batch timeout 100 ms).

### 7.1 Day 5 vs. Day 6 Empirical Performance Comparison

| Metric | Day 5 (Transaction Batching Only) | Day 6 (SQL Statement Batching + Defense) | Delta / Improvement |
| :--- | :--- | :--- | :--- |
| **P50 Database Persistence (`db_persist_ms`)** | **149.61 ms** | **100.74 ms** | **−32.7% latency reduction** 🔥 |
| **Mean Database Persistence (`db_persist_ms`)** | 148.50 ms | **99.58 ms** | **−32.9% faster** |
| **P95 Database Persistence (`db_persist_ms`)** | 185.20 ms | **143.02 ms** | **−22.8% lower latency** |
| **P50 End-to-End Latency (`enqueue_to_commit`)** | 310.40 ms | **254.32 ms** | **−18.1% lower latency** |
| **Consumer Drain Latency (`drain_seconds`)** | 0.203 s | **0.196 s** | **−3.4% faster drain** |
| **Persisted Ingestion Throughput** | 98.85 EPS | **98.85 EPS** | 100% of offered rate absorbed |
| **Unique Database Rows Persisted** | 2,000 / 2,000 | **2,000 / 2,000** | 100% integrity |
| **Synchronous Kafka Offsets Committed** | 2,000 / 2,000 | **2,000 / 2,000** | 100% offset durability |
| **Quarantined / Dropped / Failed Records** | 0 / 0 / 0 | **0 / 0 / 0** | Zero errors |

### 7.2 Amdahl's Law in the Processing Pipeline
With database persistence dropping from ~150 ms to ~100 ms per batch, the primary time consumer transitioned from database execution (>55% in Day 5) to an even balance between Kafka polling accumulation (**105 ms / 50%**) and PostgreSQL batch persistence (**100 ms / 47%**). Full details and trade-offs are documented in `DAY_6.md`.

---

## 8. Day 7: Throughput Stress Testing & Multi-Tier Capacity Report

### 8.1 Executive Summary & Objectives
On **Day 7**, StreamForge evaluated pipeline stability, queue formation, and reliability boundaries across graduated stress workloads ranging from 100 EPS up to 500 EPS (10,000 events). Across all tested workloads, the pipeline preserved **100% data integrity with zero event loss, zero duplicate insertions, zero DLQ quarantines, and zero residual Kafka lag**.

The tests confirmed that a single consumer worker achieves an active batch-processing rate of $\approx 250\text{ EPS}$ with sub-200 ms database persistence latency. Under extreme arrival rates (500 EPS), Kafka KRaft decoupled publication from consumption, absorbing a peak backlog exceeding 6,000 messages across 3 partitions without packet loss, while the consumer drained the entire backlog safely down to zero residual lag.

---

### 8.2 Benchmark Architecture & Timer Definitions

All benchmarks executed against live Docker containers (`streamforge-kafka` KRaft, `streamforge-postgres` PostgreSQL 16) with background generators and consumer containers stopped.

#### Lifecycle Timers & Telemetry Semantics:
1. **`total_duration`**: Wall-clock time from the first published event (`first_publish_perf`) to the final synchronous Kafka consumer offset commit (`last_commit_perf`).
2. **`drain_duration`**: Wall-clock duration from producer completion (`producer_done_at`, after publishing all events and flushing broker buffers) to the final synchronous offset commit (`last_commit_perf`). Measures the physical time required to drain buffered messages.
3. **`consumer_window_seconds`**: Wall-clock time from consumer readiness (`consumer_ready_at`, when the consumer thread has joined the group and established partition assignments) to the final synchronous offset commit.
4. **Broker-Query Partition Lag**: Queried directly from the broker inside the consumer thread using `consumer.committed(requested)` and `consumer.get_watermark_offsets(tp, cached=False)`. Calculated as $\max(0, \text{highwater} - \text{effective\_committed\_offset})$.

---

### 8.3 Multi-Tier Empirical Benchmark Matrix

| Metric | Calibration (100 EPS) | Tier 1 (150 EPS) | Tier 2 (250 EPS) | Tier 3 (500 EPS) |
| :--- | :--- | :--- | :--- | :--- |
| **Run ID** | `c0d8f7fe` | `3cb0e122` | `c53db79d` | `eb84971e` |
| **Offered Publish Rate** | 100.02 EPS | 150.00 EPS | 250.01 EPS | **500.02 EPS** |
| **Target Events / Window** | 500 ev / 5.0 s | 3,000 ev / 20.0 s | 5,000 ev / 20.0 s | **10,000 ev / 20.001 s** |
| **Simulated Rides / Partitions** | 125 rides / 3 parts | 750 rides / 3 parts | 1,250 rides / 3 parts | **2,500 rides / 3 parts** |
| **Broker ACKs / Enqueue Rejections** | 500 / 0 (100%) | 3,000 / 0 (100%) | 5,000 / 0 (100%) | **10,000 / 0 (100%)** |
| **Consumer Processed & Committed** | 500 / 500 (100%) | 3,000 / 3,000 (100%) | 5,000 / 5,000 (100%) | **10,000 / 10,000 (100%)** |
| **PostgreSQL Unique Rows Persisted** | 500 unique rows | 3,000 unique rows | 5,000 unique rows | **10,000 unique rows** |
| **Duplicates / DLQ Quarantined** | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 0** |
| **Batches Processed / Avg Batch Size** | 16 / **31.25** records | 65 / **46.15** records | 101 / **49.50** records | **201 / 49.75 records** |
| **Active Batch Service Rate ($\mu_{\text{batch}}$)** | $\approx 124\text{ EPS}$ | $\approx 166\text{ EPS}$ | $\approx \mathbf{247\text{ EPS}}$ | $\approx \mathbf{251\text{ EPS}}$ |
| **Whole-Lifecycle Persisted Rate** | 95.37 EPS | 138.18 EPS | 120.74 EPS | **48.82 EPS** |
| **Consumer Drain Duration** | 0.244 s | 1.707 s | 21.411 s | **184.831 s** |
| **Stage: `poll_ms` (Median P50)** | 108.77 ms (timer-driven) | 91.59 ms (near-cap) | **0.14 ms** (size-driven) | **0.15 ms** (size-driven) |
| **Stage: `poll_ms` (Mean)** | 106.33 ms | 73.50 ms | 2.18 ms | **1.26 ms** |
| **Stage: `db_persist_ms` (Median P50)**| 137.17 ms | 196.38 ms | 171.49 ms | **172.19 ms** |
| **Stage: `offset_commit_ms` (P50)**| 4.09 ms | 4.19 ms | 3.07 ms | **3.21 ms** |
| **Total Worker Iteration (P50)** | 252.4 ms | 269.8 ms | 188.8 ms | **183.3 ms** |
| **Peak Observed Lag (P0 / P1 / P2)**| 14 / 15 / 17 | 28 / 29 / 32 | 291 / 352 / 303 | **2,032 / 1,900 / 2,152** |
| **Sum of Observed Per-Partition Peaks**| 46 | 89 | 946 | **6,084** |
| **Ingress Latency P50** | 174.96 ms | 165.80 ms | 2,796.08 ms | **43,290.42 ms** |
| **Ingress Latency P99** | 303.11 ms | 341.82 ms | 19,827.87 ms | **181,815.15 ms** |
| **Commit Latency P50** | 374.55 ms | 374.02 ms | 2,968.04 ms | **43,451.07 ms** |
| **Commit Latency P99** | 601.04 ms | 631.53 ms | 20,146.81 ms | **181,934.11 ms** |
| **Final Residual Lag (All Partitions)**| **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** |
| **Zero-Lag Assertion Status** | Verified (`True`) | Verified (`True`) | Verified (`True`) | **Verified (`True`)** |

---

### 8.4 Four Core Engineering Distinctions & Corrections

#### 1. Active Batch-Processing Rate vs. Whole-Lifecycle Throughput
It is critical to distinguish between the rate at which the consumer worker processes batches when data is present versus the effective throughput across the complete benchmark lifecycle:
- **Active Batch Service Rate ($\mu_{\text{batch}}$)**: Calculated as $\frac{\text{Average Records Per Batch}}{\text{Mean Total Processing Duration Per Batch}}$.
  At Tier 3 (500 EPS):
  $$\mu_{\text{batch}} \approx \frac{49.75\text{ records}}{0.198202\text{ seconds}} \approx 251.0\text{ records/sec}$$
  This represents the single consumer worker's true processing capacity while executing batch iterations.
- **Whole-Lifecycle Persisted Rate**: Calculated as $\frac{\text{Total Persisted Events}}{\text{Total Elapsed Time}} = \frac{10,000}{204.832\text{ s}} = 48.82\text{ EPS}$.
  This rate declines at higher workloads not because the consumer slowed down, but because the 20-second publication window created an enormous backlog that took 184.8 seconds to drain, spreading the 10,000 events over a much longer total duration.

#### 2. Sum of Observed Per-Partition Peaks vs. Simultaneous Cluster Backlog
The values reported as peak lag (e.g., 2,032 on P0, 1,900 on P1, 2,152 on P2 at Tier 3) are the maximum lag values observed on each partition across 201 discrete post-batch sampling points. Their sum ($2032 + 1900 + 2152 = 6,084$) represents the **sum of independently observed per-partition peaks**. Because partitions drain dynamically as batches are pulled, these peaks may have occurred at slightly different sampling intervals rather than at a single simultaneous instant.

#### 3. The Horizontal Scaling Hypothesis: 3 Workers on 3 Partitions
Because the Kafka topic is partitioned into 3 partitions, spinning up 3 consumer workers in the same consumer group creates a 1:1 partition mapping. While this mathematically provides an aggregate theoretical processing ceiling of $3 \times 250 \approx 750\text{ EPS}$, **this is a hypothesis for future validation, not a proven capacity**. In practice, multi-worker scaling may be constrained by shared PostgreSQL connection pool limits, table-level lock contention on `rides` projections, and disk I/O bottlenecks.

#### 4. Experimental Drain Timeout History
Under the 500 EPS workload, the benchmark was executed twice:
- **Run 1 (`7b8b2bf6`)**: Executed with default `--drain-timeout 180.0`. The producer published all 10,000 events in 20.0 seconds. The consumer processed and committed 9,700 events across 194 batches. At $t = 200\text{s}$, the 180-second drain window expired, leaving exactly 300 events (6 batches) in Kafka ($P0: 104, P1: 92, P2: 104$). The benchmark failed-stop on the zero-residual-lag assertion as designed.
- **Run 2 (`eb84971e`)**: Executed with `--drain-timeout 300.0`. The consumer processed all 10,000 events across 201 batches, taking 184.831 seconds to drain. All 10,000 unique rows were verified in PostgreSQL with zero final residual lag across all partitions.
The longer timeout adjusted only the harness's permitted drain duration, leaving consumer batching and database transaction logic completely unchanged.

---

### 8.5 Saturation Mechanics & Latency Bifurcation

#### The Transition to the Size-Driven Batching Regime
- At 100 EPS, `poll_ms` averaged **106.33 ms** (median 108.77 ms) because the consumer waited for the 100 ms timeout to assemble ~31 records.
- At 150 EPS, `poll_ms` dropped to a mean of **73.50 ms** as batches filled to ~46 records.
- At 250 EPS and 500 EPS, `poll_ms` **collapsed to 0.14–0.15 ms P50** (mean 1.2–2.1 ms), while average batch size reached **49.5–49.75 records** (99.5% capacity). The consumer operated purely in the size-driven regime, pulling 50-record batches from socket memory with zero timeout delay.

#### Dual-Latency Dwell Bifurcation
At 500 EPS, tail latency expanded dramatically:
- Ingress latency P50: **43,290 ms** ($\approx 43.3\text{ s}$); Commit latency P50: **43,451 ms** ($\approx 43.5\text{ s}$).
- Ingress latency P99: **181,815 ms** ($\approx 181.8\text{ s}$); Commit latency P99: **181,934 ms** ($\approx 181.9\text{ s}$).
- The difference between ingress latency and commit latency remained constant at **120–160 ms** across all percentiles, precisely matching active database persistence and offset commit time. Over **99.7% of observed end-to-end latency was waiting time in the Kafka broker queue**, proving that the consumer worker did not degrade internally; it simply drained a large upstream buffer sequentially.

---

### 8.6 Storage Subsystem Observations: PostgreSQL Checkpoint Contention

Container logs revealed that during large sustained workloads (10,000 events), PostgreSQL triggered multiple background WAL checkpoints (`wrote 1516 buffers in 152.6s` and `wrote 1006 buffers in 100.9s`). In virtualized container environments (Docker Desktop on Windows), disk flushing creates transient I/O competition with active transaction commits. Smoothing checkpoint I/O (`checkpoint_completion_target = 0.9`) and provisioning dedicated storage volumes represent important operational optimizations for high-throughput production deployments.

---

### 8.7 Telemetry Instrumentation Overhead & Multi-Tier Timing Reconciliation

A critical engineering investigation was conducted to explain the relationship between the worker's internal stage processing times, the lag-sampling telemetry overhead, and the macro benchmark duration across all tiers.

#### 1. Direct Empirical Measurement of Lag Query Overhead
To verify the telemetry overhead directly rather than relying on inference, timing instrumentation was embedded around all `query_partition_lag()` calls. Under run `a258d640` (10,000 events @ 500 EPS across 200 batches), the benchmark directly measured:
- **`lag.samples` (total queries timed)**: **201** (200 post-batch samples + 1 final shutdown snapshot)
- **`lag.post_batch_samples`**: **200**
- **`lag.total_sampling_overhead_seconds`**: **118.096 seconds**
- **`lag.mean_sample_duration_ms`**: **587.541 ms per sample**
- **`throughput.worker_active_processing_seconds`**: **27.304 seconds** (mean $136.52\text{ ms}$ per 50-event batch)
- **`drain_seconds`**: **122.585 seconds**
- **`total_seconds`**: **142.590 seconds**
- **`consumer_window_seconds`**: **144.092 seconds**

**Arithmetic Reconciliation of Mean vs. Total (Check A)**:
The mean sample duration ($587.541\text{ ms}$) multiplied by the total query count (201 queries, including the final snapshot) yields:
$$201 \times 587.541\text{ ms} = 118,095.74\text{ ms} \approx \mathbf{118.096\text{ seconds}}$$
The previously reported 0.588-second discrepancy was caused by counting only the 200 post-batch loop samples while averaging across all 201 timed queries. Accounting for the 201st final snapshot query reconciles the arithmetic to the microsecond.

**Timestamp-Boundary & Interval Audit of Consumer Window (Check B)**:
- **Timer Definitions & Sequence**:
  - `consumer_ready_at` ($t_{\text{ready}}$): Captured on the consumer worker thread immediately before entering the `while not stop_consumer.is_set():` loop.
  - `last_commit_perf` ($t_{\text{commit}}$): Updated inside the consumer loop immediately after `worker.poll_and_process_batch()` returns a successful batch. On the final batch (Batch 200), $t_{\text{commit}}$ is recorded immediately after the synchronous offset commit of Batch 200.
  - `consumer_window_seconds` (**144.092 s**): Bounded strictly by $[t_{\text{ready}}, t_{\text{commit}}]$.
- **Interval Classification & Boundary Intersection**:
  - **Worker Batches 1 through 200**: All execute within $[t_{\text{ready}}, t_{\text{commit}}]$. Total active processing: $\sum_{k=1}^{200} T_{\text{proc}, k} = \mathbf{27.304\text{ seconds}}$.
  - **Lag Queries 1 through 199**: Each query $k \in \{1, \dots, 199\}$ begins after Batch $k$ completes and finishes before Batch $k+1$ begins. Because Batch 200 finishes at $t_{\text{commit}}$, all 199 queries lie strictly inside $[t_{\text{ready}}, t_{\text{commit}}]$ ($\text{Intersection} = T_{\text{lag}, k}$).
  - **Lag Query 200**: On Batch 200, $t_{\text{commit}}$ is recorded at the batch return point. Lag Query 200 begins *after* $t_{\text{commit}}$ has already been recorded ($t_{\text{lag\_start}, 200} > t_{\text{commit}}$). Its intersection with $[t_{\text{ready}}, t_{\text{commit}}]$ is $\emptyset$ (0.0 ms).
  - **Lag Query 201 (Shutdown Snapshot)**: Executes in the `finally:` block after the loop exits, strictly after Query 200. Its intersection with $[t_{\text{ready}}, t_{\text{commit}}]$ is $\emptyset$ (0.0 ms).
  - **Interval Overlaps**: Because all batches and queries execute sequentially on a single consumer thread, **no two intervals overlap** ($\text{Interval}_i \cap \text{Interval}_j = \emptyset$ for all $i \ne j$).
- **Identification of the 133 ms Source & Unresolved Measurement Discrepancy**:
  - In a sequential, single-threaded execution loop, unmeasured overhead (Python bytecode dispatch, loop condition evaluations, thread context switches, and empty poll timeouts) can only add elapsed time between sequential operations. Therefore, the outer wall-clock window must always be greater than or equal to the sum of measured internal activities:
    $$W \ge \sum_{k=1}^{200} T_{\text{proc}, k} + \sum_{k=1}^{199} T_{\text{lag}, k}$$
  - The previously reported component sum of $144.225\text{ s}$ ($27.304\text{ s} + 116.921\text{ s}$) exceeded the measured window ($144.092\text{ s}$) by $+133\text{ ms}$. This $+133\text{ ms}$ residual did **not** come from loop overhead, OS scheduling, or timer resolution (which cannot make components exceed the outer window). It was an artifact of **estimating in-window lag overhead by subtracting $2 \times \text{mean}$ ($2 \times 587.541\text{ ms} = 1.175\text{ s}$)** from the total lag sampling duration ($118.096\text{ s}$).
  - Subtracting $2 \times \text{mean}$ assumed that Query #200 and Query #201 each had an exact average duration of $587.541\text{ ms}$. In reality, broker watermark query durations exhibit high variance (frequently ranging from $<100\text{ ms}$ to $>1,500\text{ ms}$ depending on network and KRaft broker state). If Queries #200 and #201 actually took $> 1.308\text{ s}$ combined (e.g. $\approx 654\text{ ms}$ each), the actual sum of in-window queries was $\le 116.788\text{ s}$, which satisfies $27.304\text{ s} + 116.788\text{ s} \le 144.092\text{ s}$.
  - Because run `a258d640` did not persist individual microsecond timestamps for Query #200 and Query #201, the exact partition of time between Query #200, Query #201, and in-window loop overhead cannot be reconstructed post-hoc.
  - **Formal Classification**: This 133 ms discrepancy is formally designated an **unresolved measurement discrepancy of historical run `a258d640`**, arising from average-duration subtraction over high-variance telemetry samples rather than individual timestamp tracking.

- **Telemetry Metric Boundary Separation**:
  To prevent future boundary ambiguity, telemetry metrics are strictly separated by lifecycle time window:
  1. **`lag.total_sampling_overhead_seconds`**: Measures all timed lag queries across the entire benchmark lifecycle (including the final shutdown snapshot in `finally:`).
  2. **`lag.post_commit_sampling_overhead_seconds`**: Measures query duration occurring strictly after the final synchronous commit (`window_start = last_commit_perf`).
  3. **`throughput.in_window_instrumentation_overhead_seconds`**: Measures only query interval intersections within the active consumer window (`[consumer_ready_at, last_commit_perf]`).
  For historical run `a258d640`, in-window and post-commit telemetry values cannot be reconstructed reliably and are marked **Unavailable / Unresolved**. For all subsequent runs, the benchmark explicitly logs `(t_start, t_end)` for every query and computes exact boundary intersections.

#### 2. Micro-Benchmark Discrepancy (1,440 ms vs. 588 ms)
- **Isolated Cold Micro-Benchmark (1,440.6 ms)**: Executed against an idle consumer in a fresh consumer group.
- **In-Run Warm Measurement (587.541 ms)**: Executed during an active streaming session.
- **Plausible Hypothesis**: In the isolated script, librdkafka likely had to perform initial broker metadata discovery and TCP socket handshakes, whereas the live benchmark operated over established, warm TCP connections. This explanation remains a plausible hypothesis pending dedicated socket-level profiling. Both tests firmly establish that sequential `cached=False` partition queries introduce hundreds of milliseconds of blocking delay.

#### 3. Corrected Multi-Window Timing Reconciliation Matrix

| Timing Dimension | Calibration (100 EPS) | Tier 1 (150 EPS) | Tier 2 (250 EPS) | Tier 3 (500 EPS, Run `a258d640`) |
| :--- | :--- | :--- | :--- | :--- |
| **Total Events / Batches** | 500 ev / 16 batches | 3,000 ev / 65 batches | 5,000 ev / 101 batches | 10,000 ev / 200 batches |
| **Producer Publish Window ($T_{\text{pub}}$)** | 5.000 s | 20.000 s | 20.000 s | 20.000 s |
| **Post-Publish Drain ($T_{\text{drain}}$)** | 0.244 s | 1.707 s | 21.411 s | **122.585 s** |
| **Total Benchmark Duration ($T_{\text{total}}$)** | 5.243 s | 21.710 s | 41.410 s | **142.590 s** |
| **Consumer Window ($T_{\text{consumer}}$)** | 6.746 s | 23.214 s | 42.913 s | 144.092 s |
| **Worker Active Processing ($\sum T_{\text{proc}}$)** | 4.038 s | 18.108 s | 20.245 s | **27.304 s** |
| **Total Lag Telemetry (`lag.total_sampling_overhead_seconds`)** | $\approx 0.9\text{ s}$ *(estimated)* | $\approx 3.6\text{ s}$ *(estimated)* | $\approx 21.2\text{ s}$ *(estimated)* | **118.096 s** *(measured, 201 queries)* |
| **In-Window Telemetry (`throughput.in_window_instrumentation_overhead_seconds`)** | — | — | — | **Unresolved / Unavailable** *(per-query intervals not logged)* |
| **Post-Commit Telemetry (`lag.post_commit_sampling_overhead_seconds`)** | — | — | — | **Unresolved / Unavailable** *(queries #200 & #201 not isolated)* |

*Note: For Tiers 1 and 2, $T_{\text{total}}$ includes the 20.0s publication window and the post-publish drain duration ($20.0\text{ s} + 1.707\text{ s} = 21.71\text{ s}$; $20.0\text{ s} + 21.411\text{ s} = 41.41\text{ s}$). Total duration is never equated with drain duration.*

#### 4. Theoretical Unmonitored Projections vs. Proven Capacity
- **Estimated Active Batch Processing Rate**: In run `a258d640`, the worker processed 50-event batches in $136.5\text{ ms}$ (P50 $121.0\text{ ms}$), representing an active service rate estimate of $\approx \mathbf{366\text{ records/sec}}$ (and $\approx \mathbf{251\text{ records/sec}}$ under checkpoint contention in run `eb84971e`).
- **Theoretical Unmonitored Lifecycle Projection**: If lag sampling is moved off the critical path, draining a 10,000-event backlog at active processing speeds would take $\approx 27.3\text{ s}$, yielding a projected end-to-end throughput of $\approx \frac{10,000}{20.0 + 27.3} \approx \mathbf{211\text{ EPS}}$ (or $\approx \mathbf{167\text{ EPS}}$ in run `eb84971e`).
- **Important Qualification**: These figures are **theoretical projections**, not demonstrated production throughput. Moving lag queries out-of-band may alter batch arrival cadence, consumer memory allocation, and database transaction concurrency. A dedicated Day 8 benchmark with decoupled telemetry is required to validate these projections empirically.
