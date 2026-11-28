"""
Unit tests for partition lag measurement helpers.
Verifies broker watermark queries, committed offset parsing,
uninitialized partition handling, and aggregate lag calculation.
"""

import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from confluent_kafka import OFFSET_INVALID, TopicPartition

# Ensure repository root is on sys.path for scripts import
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.benchmark_e2e_pipeline import (
    calculate_interval_intersection,
    calculate_partition_lag,
    calculate_total_in_window_overhead,
    query_partition_lag,
    summarize_lag_sampling,
)


def make_consumer(committed_offsets, watermarks, errors=None):
    """Creates a mock Kafka consumer returning configured offsets, watermarks, and errors."""
    errors = errors or {}
    consumer = MagicMock()

    committed_list = []
    for partition, offset in committed_offsets.items():
        if partition in errors:
            tp = SimpleNamespace(
                topic="test-topic",
                partition=partition,
                offset=offset,
                error=errors[partition],
            )
        else:
            tp = TopicPartition(
                "test-topic",
                partition,
                offset=offset,
            )
        committed_list.append(tp)

    consumer.committed.return_value = committed_list

    consumer.get_watermark_offsets.side_effect = (
        lambda tp, timeout, cached: watermarks[tp.partition]
    )

    return consumer


# --- Tests for calculate_partition_lag ---

def test_calculate_partition_lag_caught_up():
    res = calculate_partition_lag(low=0, high=100, committed=100)
    assert res == {
        "lowwater": 0,
        "highwater": 100,
        "committed": 100,
        "effective_offset": 100,
        "status": "active",
        "lag": 0,
    }


def test_calculate_partition_lag_lagging():
    res = calculate_partition_lag(low=0, high=100, committed=80)
    assert res == {
        "lowwater": 0,
        "highwater": 100,
        "committed": 80,
        "effective_offset": 80,
        "status": "active",
        "lag": 20,
    }


def test_calculate_partition_lag_uninitialized():
    res = calculate_partition_lag(low=0, high=50, committed=OFFSET_INVALID)
    assert res == {
        "lowwater": 0,
        "highwater": 50,
        "committed": None,
        "effective_offset": 0,
        "status": "uninitialized",
        "lag": 50,
    }


def test_calculate_partition_lag_empty_partition():
    res = calculate_partition_lag(low=0, high=0, committed=-1001)
    assert res == {
        "lowwater": 0,
        "highwater": 0,
        "committed": None,
        "effective_offset": 0,
        "status": "uninitialized",
        "lag": 0,
    }


def test_calculate_partition_lag_committed_beyond_high():
    res = calculate_partition_lag(low=0, high=100, committed=110)
    assert res == {
        "lowwater": 0,
        "highwater": 100,
        "committed": 110,
        "effective_offset": 110,
        "status": "active",
        "lag": 0,
    }


def test_calculate_partition_lag_invalid_watermarks():
    with pytest.raises(ValueError, match="Invalid Kafka watermarks: low=-1, high=10"):
        calculate_partition_lag(low=-1, high=10, committed=5)

    with pytest.raises(ValueError, match="Invalid Kafka watermarks: low=10, high=5"):
        calculate_partition_lag(low=10, high=5, committed=5)


# --- Tests for query_partition_lag ---

def test_query_partition_lag_for_multiple_partitions():
    consumer = make_consumer(
        committed_offsets={0: 100, 1: 80, 2: 50},
        watermarks={
            0: (0, 100),
            1: (0, 100),
            2: (0, 50),
        },
    )
    result = query_partition_lag(
        consumer=consumer,
        topic="test-topic",
        partition_count=3,
    )
    assert result["total_lag"] == 20
    assert result["by_partition"][0]["lag"] == 0
    assert result["by_partition"][0]["status"] == "active"
    assert result["by_partition"][1]["lag"] == 20
    assert result["by_partition"][1]["status"] == "active"
    assert result["by_partition"][2]["lag"] == 0
    assert result["by_partition"][2]["status"] == "active"


def test_query_partition_lag_with_uninitialized_partitions():
    consumer = make_consumer(
        committed_offsets={0: OFFSET_INVALID, 1: 50},
        watermarks={
            0: (0, 40),
            1: (0, 50),
        },
    )
    result = query_partition_lag(
        consumer=consumer,
        topic="test-topic",
        partition_count=2,
    )
    assert result["total_lag"] == 40
    assert result["by_partition"][0]["lag"] == 40
    assert result["by_partition"][0]["status"] == "uninitialized"
    assert result["by_partition"][0]["committed"] is None
    assert result["by_partition"][1]["lag"] == 0
    assert result["by_partition"][1]["status"] == "active"


def test_query_partition_lag_invalid_partition_count():
    consumer = MagicMock()
    with pytest.raises(ValueError, match="partition_count must be positive"):
        query_partition_lag(
            consumer=consumer,
            topic="test-topic",
            partition_count=0,
        )


def test_query_partition_lag_broker_partition_error():
    consumer = make_consumer(
        committed_offsets={0: 100},
        watermarks={0: (0, 100)},
        errors={0: "Broker: NotLeaderForPartition"},
    )
    with pytest.raises(RuntimeError, match="Failed to fetch committed offset for partition 0"):
        query_partition_lag(
            consumer=consumer,
            topic="test-topic",
            partition_count=1,
        )


def test_query_partition_lag_missing_partition_in_response():
    consumer = MagicMock()
    # Returns committed offset for partition 0 only, but partition_count is 2
    consumer.committed.return_value = [
        TopicPartition("test-topic", 0, offset=100)
    ]
    with pytest.raises(RuntimeError, match="Kafka returned no committed-offset result for partitions: \\[1\\]"):
        query_partition_lag(
            consumer=consumer,
            topic="test-topic",
            partition_count=2,
        )


def test_summarize_lag_sampling_empty():
    """Verify summarize_lag_sampling handles empty duration lists safely."""
    res = summarize_lag_sampling([])
    assert res == {
        "samples": 0,
        "total_sampling_overhead_seconds": 0.0,
        "mean_sample_duration_ms": 0.0,
    }


def test_summarize_lag_sampling_single_sample():
    """Verify summarize_lag_sampling with a single sample."""
    res = summarize_lag_sampling([587.541])
    assert res == {
        "samples": 1,
        "total_sampling_overhead_seconds": 0.588,
        "mean_sample_duration_ms": 587.541,
    }


def test_summarize_lag_sampling_multiple_samples():
    """Verify that sample count, mean duration, and total overhead are mathematically consistent."""
    durations_ms = [500.25, 600.50, 550.0, 650.25, 580.0]  # 5 samples
    res = summarize_lag_sampling(durations_ms)
    assert res["samples"] == 5
    assert res["total_sampling_overhead_seconds"] == 2.881
    assert res["mean_sample_duration_ms"] == 576.2

    # Check that samples * mean matches total within roundoff tolerance
    recomputed_total = round((res["samples"] * res["mean_sample_duration_ms"]) / 1000.0, 3)
    assert abs(recomputed_total - res["total_sampling_overhead_seconds"]) <= 0.001


def test_summarize_lag_sampling_tier3_reconciliation():
    """Verify exact 201-sample Tier 3 benchmark reconciliation."""
    # 201 samples averaging 587.541 ms, summing to 118,095.741 ms (118.096 s)
    durations = [587.541] * 201
    res = summarize_lag_sampling(durations)
    assert res["samples"] == 201
    assert res["total_sampling_overhead_seconds"] == 118.096
    assert res["mean_sample_duration_ms"] == 587.541
    recomputed_total = round((res["samples"] * res["mean_sample_duration_ms"]) / 1000.0, 3)
    assert recomputed_total == res["total_sampling_overhead_seconds"]


# --- Tests for interval intersection & in-window telemetry calculations ---

def test_calculate_interval_intersection_fully_inside():
    """Verify interval completely contained within the consumer window."""
    # Window: [10.0, 20.0], Interval: [12.0, 15.0] -> 3.0s
    intersection = calculate_interval_intersection(
        interval_start=12.0,
        interval_end=15.0,
        window_start=10.0,
        window_end=20.0,
    )
    assert intersection == 3.0


def test_calculate_interval_intersection_fully_outside():
    """Verify intervals completely outside the consumer window (before, after, and at boundary)."""
    # Interval before window
    assert calculate_interval_intersection(5.0, 8.0, 10.0, 20.0) == 0.0
    # Interval touching start boundary from outside
    assert calculate_interval_intersection(5.0, 10.0, 10.0, 20.0) == 0.0
    # Interval touching end boundary from outside
    assert calculate_interval_intersection(20.0, 25.0, 10.0, 20.0) == 0.0
    # Interval after window
    assert calculate_interval_intersection(22.0, 25.0, 10.0, 20.0) == 0.0


def test_calculate_interval_intersection_partially_overlapping_start():
    """Verify interval that starts before window and ends inside window."""
    # Window: [10.0, 20.0], Interval: [8.0, 14.0] -> overlap is [10.0, 14.0] = 4.0s
    intersection = calculate_interval_intersection(
        interval_start=8.0,
        interval_end=14.0,
        window_start=10.0,
        window_end=20.0,
    )
    assert intersection == 4.0


def test_calculate_interval_intersection_partially_overlapping_end():
    """Verify interval that starts inside window and extends beyond window end."""
    # Window: [10.0, 20.0], Interval: [16.0, 24.0] -> overlap is [16.0, 20.0] = 4.0s
    intersection = calculate_interval_intersection(
        interval_start=16.0,
        interval_end=24.0,
        window_start=10.0,
        window_end=20.0,
    )
    assert intersection == 4.0


def test_calculate_total_in_window_overhead_multiple_sequential_intervals():
    """Verify cumulative intersection over multiple sequential intervals."""
    # Window: [10.0, 50.0]
    # 1. [5.0, 12.0]   -> overlap [10.0, 12.0] = 2.0s (overlap start)
    # 2. [15.0, 20.0]  -> overlap [15.0, 20.0] = 5.0s (fully inside)
    # 3. [25.0, 30.0]  -> overlap [25.0, 30.0] = 5.0s (fully inside)
    # 4. [45.0, 55.0]  -> overlap [45.0, 50.0] = 5.0s (overlap end)
    # 5. [60.0, 70.0]  -> overlap = 0.0s (fully outside)
    intervals = [
        (5.0, 12.0),
        (15.0, 20.0),
        (25.0, 30.0),
        (45.0, 55.0),
        (60.0, 70.0),
    ]
    total_overhead = calculate_total_in_window_overhead(
        intervals=intervals,
        window_start=10.0,
        window_end=50.0,
    )
    assert total_overhead == 17.0


def test_calculate_interval_intersection_empty_and_inverted_intervals():
    """Verify robust handling of empty lists, point intervals, and inverted bounds."""
    # Empty interval list
    assert calculate_total_in_window_overhead([], 10.0, 20.0) == 0.0
    # Zero-duration point interval [15.0, 15.0]
    assert calculate_interval_intersection(15.0, 15.0, 10.0, 20.0) == 0.0
    # Inverted interval bounds [16.0, 14.0]
    assert calculate_interval_intersection(16.0, 14.0, 10.0, 20.0) == 0.0
    # Inverted window bounds [20.0, 10.0]
    assert calculate_interval_intersection(12.0, 15.0, 20.0, 10.0) == 0.0
