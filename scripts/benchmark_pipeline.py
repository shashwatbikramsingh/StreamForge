"""
StreamForge — High-Throughput Pipeline Benchmark Suite
Measures event synthesis, serialization, contract validation, and deduplication throughput.
"""

import sys
import os
import time
import json
import statistics
from datetime import datetime, timezone

# Add consumer and generator to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "consumer")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generator")))

from consumer import EventValidator
from event_generator import EventGenerator

def run_benchmark(iterations: int = 10000):
    print("=" * 70)
    print(f" STREAMFORGE PIPELINE BENCHMARK (N = {iterations:,} events)")
    print("=" * 70)

    gen = EventGenerator("localhost:9092", "benchmark-topic")

    # 1. Benchmark Event Generation
    t0 = time.perf_counter()
    events = [gen.generate_event() for _ in range(iterations)]
    gen_time = time.perf_counter() - t0
    gen_ops = iterations / gen_time

    # 2. Benchmark JSON Serialization
    t0 = time.perf_counter()
    serialized = [json.dumps(e) for e in events]
    ser_time = time.perf_counter() - t0
    ser_ops = iterations / ser_time

    # 3. Benchmark Schema Validation
    latencies_us = []
    t0 = time.perf_counter()
    valid_count = 0
    for e in events:
        item_t0 = time.perf_counter()
        is_valid, _ = EventValidator.validate_envelope(e)
        latencies_us.append((time.perf_counter() - item_t0) * 1_000_000)
        if is_valid:
            valid_count += 1
    val_time = time.perf_counter() - t0
    val_ops = iterations / val_time

    # 4. Benchmark In-Memory Idempotency & Deduplication
    seen_ids = set()
    dup_count = 0
    t0 = time.perf_counter()
    for e in events:
        eid = e["event_id"]
        if eid in seen_ids:
            dup_count += 1
        else:
            seen_ids.add(eid)
    dedup_time = time.perf_counter() - t0
    dedup_ops = iterations / dedup_time

    latencies_us.sort()
    p50 = latencies_us[int(len(latencies_us) * 0.50)]
    p95 = latencies_us[int(len(latencies_us) * 0.95)]
    p99 = latencies_us[int(len(latencies_us) * 0.99)]
    avg_lat = statistics.mean(latencies_us)

    print("\n[RESULTS]")
    print(f"  • Event Synthesis:        {gen_ops:10,.1f} events/sec  ({gen_time:.3f}s total)")
    print(f"  • JSON Serialization:     {ser_ops:10,.1f} events/sec  ({ser_time:.3f}s total)")
    print(f"  • Contract Validation:    {val_ops:10,.1f} events/sec  ({val_time:.3f}s total)")
    print(f"  • Deduplication Checks:   {dedup_ops:10,.1f} events/sec  ({dedup_time:.3f}s total)")
    print(f"\n[VALIDATION LATENCY PERCENTILES]")
    print(f"  • Average: {avg_lat:.2f} µs")
    print(f"  • p50:     {p50:.2f} µs")
    print(f"  • p95:     {p95:.2f} µs")
    print(f"  • p99:     {p99:.2f} µs")
    print(f"\n[DATA QUALITY]")
    print(f"  • Passed Schema Validation: {valid_count:,} / {iterations:,} ({valid_count/iterations*100:.1f}%)")
    print(f"  • Synthetic Duplicates:     {dup_count:,} (Deduplicated)")
    print("=" * 70)
    print(" BENCHMARK COMPLETED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10000
    run_benchmark(count)
