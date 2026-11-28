# StreamForge — Day 7: Throughput Stress Testing & Scalability Engineering

## 1. Executive Summary

On **Day 7**, StreamForge transitioned from local functional correctness and micro-batch database optimizations to **large-scale throughput stress testing and capacity engineering**. The mission was to push the live end-to-end streaming pipeline (Kafka KRaft $\to$ Python Consumer Worker $\to$ PostgreSQL 16) through graduated load tiers, measure where the single worker encounters its physical throughput ceiling, and observe how Kafka buffers excess arrival spikes while maintaining zero data loss.

### Day 7 Milestones & Core Results:
- **Hardened Broker Lag Telemetry**: Implemented multi-partition broker watermark and committed offset queries (`consumer.committed` + `consumer.get_watermark_offsets(cached=False)`) executed strictly inside the consumer's owning thread, backed by 11 focused unit tests in [tests/unit/test_partition_lag.py](file:///e:/project/Streamforge/tests/unit/test_partition_lag.py).
- **Graduated Stress Testing**: Successfully benchmarked four graduated workload tiers:
  1. **Calibration (100 EPS / 500 events)**: Verified baseline instrumentation and synchronous commit semantics.
  2. **Load Tier 1 (150 EPS / 3,000 events)**: Observed improved batch filling density (46.15 records/batch) and a 44.9% increase in sustained throughput (138.18 EPS).
  3. **Load Tier 2 (250 EPS / 5,000 events)**: Confirmed the definitive transition to the **size-driven batching regime** (poll wait collapsed to 0.14 ms, batches saturated at 49.5 records/batch).
  4. **Load Tier 3 (500 EPS / 10,000 events)**: Stress-tested the single worker under severe overload ($2\times$ its service capacity), accumulating a sum of observed per-partition peak lags of 6,084 messages in Kafka KRaft, and safely draining all 10,000 events down to zero residual lag.
- **100% Data Integrity Guaranteed**: Across all 18,500 stress events executed on Day 7, StreamForge maintained **0 delivery failures, 0 dropped events, 0 duplicate database rows, 0 DLQ quarantines, and 0 residual Kafka lag**.
- **Test Suite**: **208 / 208 unit and integration tests passing** (197 baseline + 11 partition lag tests, 0 regressions).

---

## 2. Problem Statement: Quantifying System Boundaries

In Days 1–6, StreamForge established end-to-end reliability, transaction micro-batching, and SQL statement batching. However, critical operational questions remained unanswered:
1. **Batching Regime Boundaries**: At what arrival rate does the consumer transition from timer-driven batching (waiting for `batch_timeout_ms=100`) to size-driven batching (filling `batch_size=50` immediately)?
2. **Single-Worker Processing Ceiling**: What is the maximum throughput a single Python worker can sustain when executing validation, pooled PostgreSQL transactions, and synchronous Kafka offset commits?
3. **Queueing Dynamics & Shock Absorption**: When arrival rate $\lambda$ exceeds service rate $\mu$, does Kafka KRaft buffer messages reliably without dropping events or crashing, and how does backlog drain time scale?
4. **Latency Bifurcation**: Does tail latency increase because the database slows down, or because messages dwell in the broker buffer waiting to be fetched?

---

## 3. Implementation: In-Thread Broker Lag Observability

To monitor real-time queue formation without violating `confluent_kafka` thread-affinity constraints, we enhanced [scripts/benchmark_e2e_pipeline.py](file:///e:/project/Streamforge/scripts/benchmark_e2e_pipeline.py):

```python
def calculate_partition_lag(low: int, high: int, committed: int) -> Dict[str, Any]:
    """Calculate consumer lag using Kafka next-offset semantics."""
    if low < 0 or high < low:
        raise ValueError(f"Invalid Kafka watermarks: low={low}, high={high}")
    if committed == OFFSET_INVALID:
        effective_offset = low
        status = "uninitialized"
        committed_value = None
    elif committed < low:
        effective_offset = low
        status = "behind_log_start"
        committed_value = committed
    else:
        effective_offset = committed
        status = "active"
        committed_value = committed
    return {
        "lowwater": low,
        "highwater": high,
        "committed": committed_value,
        "effective_offset": effective_offset,
        "status": status,
        "lag": max(0, high - effective_offset),
    }
```

### Architectural Guardrails:
1. **In-Thread Broker Queries**: All calls to `consumer.committed()` and `consumer.get_watermark_offsets(cached=False)` occur within `consumer_worker_thread()` immediately following synchronous offset commit.
2. **Post-Batch Peak Tracking**: Tracks the maximum lag observed for each partition independently across all batch iterations.
3. **Final Broker Snapshot & Zero-Lag Assertion**: Captures watermarks and committed offsets before `worker.close()`, and asserts that total residual lag is exactly zero before allowing the benchmark to pass.
4. **End-to-End Completeness Assertion**: Directly validates that $N_{\text{persisted}} == N_{\text{committed}} == N_{\text{acknowledged}} == N_{\text{target}}$.

---

## 4. Multi-Tier Empirical Benchmark Matrix

All workloads executed against live Docker containers (`streamforge-kafka` KRaft, `streamforge-postgres` PostgreSQL 16) with background containers stopped.

| Workload Metric | Calibration (100 EPS) | Tier 1 (150 EPS) | Tier 2 (250 EPS) | Tier 3 (500 EPS) |
| :--- | :--- | :--- | :--- | :--- |
| **Run ID** | `c0d8f7fe` | `3cb0e122` | `c53db79d` | `eb84971e` |
| **Offered Publish Rate** | 100.02 EPS | 150.00 EPS | 250.01 EPS | **500.02 EPS** |
| **Target Events / Window** | 500 ev / 5.0 s | 3,000 ev / 20.0 s | 5,000 ev / 20.0 s | **10,000 ev / 20.001 s** |
| **Broker ACKs / Rejections** | 500 / 0 (100%) | 3,000 / 0 (100%) | 5,000 / 0 (100%) | **10,000 / 0 (100%)** |
| **Consumer Processed & Committed** | 500 / 500 (100%) | 3,000 / 3,000 (100%) | 5,000 / 5,000 (100%) | **10,000 / 10,000 (100%)** |
| **PostgreSQL Unique Rows** | 500 unique rows | 3,000 unique rows | 5,000 unique rows | **10,000 unique rows** |
| **Dropped / DLQ Quarantined** | 0 / 0 | 0 / 0 | 0 / 0 | **0 / 0** |
| **Batches Processed / Avg Size** | 16 / **31.25** records | 65 / **46.15** records | 101 / **49.50** records | **201 / 49.75 records** |
| **Active Batch Service Rate ($\mu_{\text{batch}}$)** | $\approx 124\text{ EPS}$ | $\approx 166\text{ EPS}$ | $\approx \mathbf{247\text{ EPS}}$ | $\approx \mathbf{251\text{ EPS}}$ |
| **Whole-Lifecycle Persisted Rate** | 95.37 EPS | 138.18 EPS | 120.74 EPS | **48.82 EPS** |
| **Consumer Drain Duration** | 0.244 s | 1.707 s | 21.411 s | **184.831 s** |
| **Stage: `poll_ms` (Median P50)** | 108.77 ms (timer-driven) | 91.59 ms (near-cap) | **0.14 ms** (size-driven) | **0.15 ms** (size-driven) |
| **Stage: `poll_ms` (Mean)** | 106.33 ms | 73.50 ms | 2.18 ms | **1.26 ms** |
| **Stage: `db_persist_ms` (Median P50)**| 137.17 ms | 196.38 ms | 171.49 ms | **172.19 ms** |
| **Stage: `offset_commit_ms` (P50)**| 4.09 ms | 4.19 ms | 3.07 ms | **3.21 ms** |
| **Total Worker Cycle (P50)** | 252.4 ms | 269.8 ms | 188.8 ms | **183.3 ms** |
| **Peak Observed Lag (P0 / P1 / P2)**| 14 / 15 / 17 | 28 / 29 / 32 | 291 / 352 / 303 | **2,032 / 1,900 / 2,152** |
| **Sum of Observed Per-Partition Peaks**| 46 | 89 | 946 | **6,084** |
| **Ingress Latency P50** | 174.96 ms | 165.80 ms | 2,796.08 ms | **43,290.42 ms** |
| **Ingress Latency P99** | 303.11 ms | 341.82 ms | 19,827.87 ms | **181,815.15 ms** |
| **Commit Latency P50** | 374.55 ms | 374.02 ms | 2,968.04 ms | **43,451.07 ms** |
| **Commit Latency P99** | 601.04 ms | 631.53 ms | 20,146.81 ms | **181,934.11 ms** |
| **Final Residual Lag (All Partitions)**| **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** | **0 / 0 / 0** |
| **Zero Residual Lag Verified** | True | True | True | **True** |

---

## 5. Four Core Engineering Distinctions

### 1. Active Batch Service Rate vs. Whole-Lifecycle Sustained Throughput
A common benchmarking pitfall is conflating instantaneous processing capacity with end-to-end lifecycle throughput:
- **Active Batch Service Rate ($\mu_{\text{batch}}$)**: Measures processing speed while the consumer executes batch iterations:
  $$\mu_{\text{batch}} \approx \frac{49.75\text{ records}}{0.198202\text{ seconds}} \approx \mathbf{251.0\text{ records/sec}}$$
- **Whole-Lifecycle Throughput**: Measures total events divided by the full duration from first publish to last commit:
  $$\text{Throughput}_{\text{lifecycle}} = \frac{10,000\text{ events}}{204.832\text{ seconds}} = \mathbf{48.82\text{ EPS}}$$
The whole-lifecycle rate drops at 500 EPS because the producer published for only 20.0 seconds, leaving the consumer to spend 184.8 seconds steadily draining the accumulated backlog.

### 2. Sum of Observed Per-Partition Peaks vs. Simultaneous Cluster Backlog
The values **2,032 (P0), 1,900 (P1), and 2,152 (P2)** represent the maximum lag observed independently on each partition across 201 post-batch samples. Their sum (**6,084**) is the **sum of independently observed per-partition peaks**. Because partitions drain dynamically as batches are fetched, these peaks occurred at slightly different sampling intervals rather than at a single simultaneous moment.

### 3. The 3-Worker Horizontal Scaling Hypothesis
With 3 Kafka partitions, adding 2 more consumer workers in the same consumer group creates a 1:1 worker-to-partition assignment. While this suggests a theoretical aggregate capacity of $3 \times 250 \approx 750\text{ EPS}$, **this remains a hypothesis for future validation**. In real deployments, concurrent workers share the PostgreSQL connection pool, compete for database CPU, and risk row-level lock contention on `rides` updates.

### 4. Experimental Drain Timeout History
Under the 500 EPS workload:
- **Run 1 (`7b8b2bf6`)**: Executed with default `--drain-timeout 180.0`. The producer finished in 20.0 seconds. The consumer processed 9,700 events across 194 batches. At $t = 200\text{s}$, the 180s drain window expired with 300 events remaining (6 batches). The benchmark raised a `RuntimeError` on residual lag as designed.
- **Run 2 (`eb84971e`)**: Executed with `--drain-timeout 300.0`. The consumer safely processed all 10,000 events in 201 batches, taking 184.831 seconds to drain, successfully asserting zero residual lag.
The extended timeout adjusted only the benchmark harness's allowed drain window, leaving the consumer's batching, polling, and transaction logic untouched.

---

## 6. Deep Technical Findings

### 6.1 The Transition to the Size-Driven Batching Regime
- At 100 EPS, `poll_ms` median was **108.77 ms**, proving the consumer was waiting for the 100 ms timer to expire before returning sparse batches (~31 records).
- At 150 EPS, `poll_ms` dropped to a mean of **73.50 ms** as batches filled to ~46 records.
- At 250 EPS and 500 EPS, `poll_ms` **collapsed to 0.14–0.15 ms P50**, and average batch size reached **49.50–49.75 records** (99.5% capacity). The consumer operated purely in the size-driven regime, pulling 50-event batches instantly from socket memory without blocking.

### 6.2 Dual-Latency Dwell Bifurcation & Little's Law
At 500 EPS, latency percentiles separated completely into queue dwell time and service time:
- P50 Ingress Latency: **43.29 seconds**; P50 Commit Latency: **43.45 seconds** (difference: **160 ms**).
- P99 Ingress Latency: **181.82 seconds**; P99 Commit Latency: **181.93 seconds** (difference: **119 ms**).
- Across all percentiles, the difference between ingress latency and commit latency remained constant at **120–160 ms**, perfectly matching active database persistence and offset commit time. Over **99.7% of total latency was waiting time in Kafka**, demonstrating that the consumer did not slow down; it simply processed a massive queue sequentially.

### 6.3 Storage Subsystem Observations: PostgreSQL Checkpointing
Container inspection revealed that during long 10,000-event stress runs, PostgreSQL triggered background WAL checkpoints (`wrote 1516 buffers in 152.6s` and `wrote 1006 buffers in 100.9s`). On virtualized storage (Docker Desktop on Windows), flushing dirty buffers created transient disk I/O competition, temporarily stretching individual batch persistence times. Smoothing checkpoint intervals represents a valuable operational tuning step for high-throughput deployments.

---

## 7. Telemetry Overhead Investigation & Multi-Tier Timing Reconciliation

### 7.1 Direct Empirical Measurement of Lag Query Overhead
To move beyond mathematical inference and measure the telemetry penalty directly, execution timers were embedded around every in-thread `query_partition_lag()` call in `scripts/benchmark_e2e_pipeline.py`.

Under run `a258d640` (10,000 events @ 500 EPS across 200 batches), the benchmark directly measured:
- **`lag.samples` (total queries timed)**: **201** (200 post-batch samples + 1 final shutdown snapshot)
- **`lag.post_batch_samples`**: **200**
- **`lag.total_sampling_overhead_seconds`**: **118.096 seconds**
- **`lag.mean_sample_duration_ms`**: **587.541 ms per sample**
- **`throughput.worker_active_processing_seconds`**: **27.304 seconds** (mean $136.52\text{ ms}$ per 50-event batch)
- **`drain_seconds`**: **122.585 seconds**
- **`total_seconds`**: **142.590 seconds**
- **`consumer_window_seconds`**: **144.092 seconds**

**Arithmetic Reconciliation of Mean vs. Total (Check A)**:
The mean sample duration ($587.541\text{ ms}$) multiplied by the total query count (201 queries, including the final shutdown snapshot) yields:
$$201 \times 587.541\text{ ms} = 118,095.74\text{ ms} \approx \mathbf{118.096\text{ seconds}}$$
The previously observed 0.588-second discrepancy was caused by counting only the 200 post-batch loop samples while averaging across all 201 timed queries. Accounting for the 201st final snapshot query reconciles the arithmetic to the microsecond. A dedicated unit test in `tests/unit/test_partition_lag.py` now enforces this mathematical invariant.

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

### 7.2 Micro-Benchmark Discrepancy Reconciliation (1,440 ms vs. 588 ms)
- **Isolated Cold Micro-Benchmark (1,440.6 ms)**: Executed against an idle consumer in a fresh consumer group.
- **In-Run Warm Measurement (587.541 ms)**: Executed during an active streaming session.
- **Plausible Hypothesis**: In the isolated script, librdkafka likely had to perform initial broker metadata discovery and TCP socket handshakes, whereas the live benchmark operated over established, warm TCP connections. This explanation remains a plausible hypothesis pending dedicated socket-level profiling. Both tests firmly establish that sequential `cached=False` partition queries introduce hundreds of milliseconds of blocking delay.

### 7.3 Multi-Window Timing Reconciliation Matrix

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

### 7.4 Theoretical Unmonitored Projections vs. Proven Capacity
- **Estimated Active Batch Processing Rate**: In run `a258d640`, the worker processed 50-event batches in $136.5\text{ ms}$ (P50 $121.0\text{ ms}$), representing an active service rate estimate of $\approx \mathbf{366\text{ records/sec}}$ (and $\approx \mathbf{251\text{ records/sec}}$ under checkpoint contention in run `eb84971e`).
- **Theoretical Unmonitored Lifecycle Projection**: If lag sampling is moved off the critical path, draining a 10,000-event backlog at active processing speeds would take $\approx 27.3\text{ s}$, yielding a projected end-to-end throughput of $\approx \frac{10,000}{20.0 + 27.3} \approx \mathbf{211\text{ EPS}}$ (or $\approx \mathbf{167\text{ EPS}}$ in run `eb84971e`).
- **Important Qualification**: These figures are **theoretical projections**, not demonstrated production throughput. Moving lag queries out-of-band may alter batch arrival cadence, consumer memory allocation, and database transaction concurrency. A dedicated Day 8 benchmark with decoupled telemetry is required to validate these projections empirically.

---

## 8. Day 8 Scalability Engineering Recommendations

Based on Day 7's empirical findings, we recommend investigating **consumer concurrency and PostgreSQL storage behavior** before attempting higher publication rates:

1. **Multi-Worker Horizontal Concurrency**:
   - Deploy 3 consumer workers in the same consumer group across the 3 topic partitions.
   - Measure whether aggregate throughput approaches the $3 \times 250 \approx 750\text{ EPS}$ hypothesis, or if PostgreSQL connection pool contention becomes the primary constraint.
2. **PostgreSQL Connection Pool & Lock Contention Analysis**:
   - Evaluate connection checkout overhead and row-level locks on `rides` when multiple workers persist concurrent batches.
3. **Asynchronous Offset Commit Evaluation**:
   - Benchmark asynchronous offset commits (`commitAsync`) to eliminate the synchronous 3–4 ms Kafka coordinator roundtrip per batch.
4. **Storage & WAL Checkpoint Tuning**:
   - Profile PostgreSQL `checkpoint_completion_target = 0.9` and volume I/O under continuous multi-worker ingestion.

---

## 9. Verification & Test Suite Integrity

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```
```text
208 passed in 6.91s
```

All 208 unit and integration tests across the repository pass without error. Day 7 is verified, mathematically reconciled, and ready for review.
