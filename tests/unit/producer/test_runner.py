"""Tests for the StreamForge producer runner."""

from typing import Any
import pytest

from streamforge.producer.generator import RideEventGenerator
from streamforge.producer.runner import run_pipeline, ProducerRunResult


class FakePublisher:
    """Fake publisher for testing runner orchestration."""

    def __init__(self, fail_on_call: int | None = None) -> None:
        self.events: list[Any] = []
        self.enqueued_count = 0
        self.acknowledged_count = 0
        self.failed_count = 0
        self.dry_run_count = 0
        self.fail_on_call = fail_on_call
        self.calls = 0

    def publish(self, event: Any) -> bool:
        self.calls += 1
        if self.calls == self.fail_on_call:
            self.failed_count += 1
            return False
        self.events.append(event)
        self.enqueued_count += 1
        return True

    def flush(self, timeout_seconds: float = 5.0) -> int:
        self.acknowledged_count = self.enqueued_count
        return 0


def test_runner_successful_run():
    """Verify that runner orchestrates generation, enqueuing, and acknowledgment successfully."""
    pub = FakePublisher()
    result = run_pipeline(rides=3, events_per_second=1000.0, seed=42, publisher=pub)

    assert isinstance(result, ProducerRunResult)
    assert result.succeeded is True
    assert result.rides_requested == 3
    assert result.events_generated >= 6
    assert result.enqueued_count == len(pub.events)
    assert result.acknowledged_count == result.enqueued_count
    assert result.failed_count == 0
    assert result.enqueue_rejections == 0
    assert result.outstanding_count == 0


def test_runner_stops_on_enqueue_rejection():
    """Verify that runner stops creating additional publish attempts on enqueue failure."""
    # Fail on call #2
    pub = FakePublisher(fail_on_call=2)
    result = run_pipeline(rides=5, events_per_second=1000.0, seed=42, publisher=pub)

    assert result.succeeded is False
    assert result.enqueue_rejections == 1
    assert result.enqueued_count == 1
    assert result.failed_count == 1
    assert len(pub.events) == 1


def test_runner_dry_run_mode():
    """Verify that runner runs cleanly in dry-run mode using real EventPublisher."""
    result = run_pipeline(rides=2, events_per_second=1000.0, seed=42, dry_run=True)

    assert result.succeeded is True
    assert result.rides_requested == 2
    assert result.dry_run_count > 0
    assert result.enqueued_count == result.dry_run_count
    assert result.acknowledged_count == result.enqueued_count


def test_runner_invalid_parameters_rejected():
    """Verify that runner rejects non-positive or NaN ride counts and rates."""
    with pytest.raises(ValueError, match="rides must be positive"):
        run_pipeline(rides=0)

    with pytest.raises(ValueError, match="rides must be positive"):
        run_pipeline(rides=-5)

    with pytest.raises(ValueError, match="events_per_second must be positive"):
        run_pipeline(events_per_second=0)

    with pytest.raises(ValueError, match="events_per_second must be positive"):
        run_pipeline(events_per_second=float("nan"))
