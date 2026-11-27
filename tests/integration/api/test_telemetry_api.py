"""Integration tests for the StreamForge Read-Only Telemetry API.

Verifies live responses from the FastAPI telemetry service against
real PostgreSQL tables and KRaft broker connectivity.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
import pytest

API_BASE_URL = "http://localhost:8000"


def _is_api_reachable() -> bool:
    """Helper to check if the API container is running and responding."""
    try:
        with urllib.request.urlopen(f"{API_BASE_URL}/health/live", timeout=2.0) as res:
            return res.status == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _is_api_reachable(),
    reason="StreamForge FastAPI telemetry service is not reachable at http://localhost:8000",
)


def _get_json(endpoint: str) -> dict | list:
    """Helper to make a GET request and parse JSON response."""
    url = f"{API_BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=5.0) as res:
        assert res.status == 200
        data = res.read().decode("utf-8")
        return json.loads(data)


def test_health_live():
    """Verify GET /health/live returns liveness status."""
    data = _get_json("/health/live")
    assert data["status"] == "ok"
    assert data["service"] == "streamforge-api"
    assert "timestamp" in data
    assert data["database_connected"] is True


def test_health_ready():
    """Verify GET /health/ready confirms database readiness."""
    data = _get_json("/health/ready")
    assert data["status"] == "ready"
    assert data["service"] == "streamforge-api"
    assert data["database_connected"] is True


def test_metrics_overview():
    """Verify GET /api/v1/metrics/overview returns real database counts."""
    data = _get_json("/api/v1/metrics/overview")
    assert data["data_source"] == "postgresql"
    assert data["currency"] == "INR"
    assert isinstance(data["total_events"], int)
    assert data["total_events"] >= 0
    assert isinstance(data["completed_rides"], int)
    assert isinstance(data["failed_events"], int)
    assert isinstance(data["duplicate_events"], int)
    assert isinstance(data["p95_ingestion_latency_ms"], (int, float))
    assert data["p95_ingestion_latency_ms"] >= 0.0


def test_recent_events():
    """Verify GET /api/v1/events/recent returns real processed events."""
    data = _get_json("/api/v1/events/recent?limit=5")
    assert isinstance(data, list)
    if len(data) > 0:
        evt = data[0]
        assert "event_id" in evt
        assert "ride_id" in evt
        assert "event_type" in evt
        assert evt["event_type"].startswith("ride.")
        assert "pickup_city" in evt
        assert "dropoff_city" in evt
        assert "fare_amount" in evt
        assert evt["fare_amount"] >= 0.0
        assert evt["status"] in ("Success", "Failed")
        assert "latency_ms" in evt
        assert "partition" in evt
        assert "occurred_at" in evt
        assert "payload" in evt
        assert isinstance(evt["payload"], dict)


def test_dlq_events():
    """Verify GET /api/v1/dlq/events returns dead letter records."""
    data = _get_json("/api/v1/dlq/events?limit=5")
    assert isinstance(data, list)
    if len(data) > 0:
        dlq = data[0]
        assert "dlq_id" in dlq
        assert "topic" in dlq
        assert "partition_id" in dlq
        assert "offset_value" in dlq
        assert "error_type" in dlq
        assert "error_message" in dlq
        assert "received_at" in dlq
        assert dlq["is_resolved"] is False


def test_pipeline_health():
    """Verify GET /api/v1/pipeline/health returns live component states."""
    data = _get_json("/api/v1/pipeline/health")
    assert data["status"] in ("healthy", "degraded")
    assert data["healthy_percent"] > 0
    assert isinstance(data["components"], list)
    component_names = [c["name"] for c in data["components"]]
    assert "Kafka Broker (KRaft)" in component_names
    assert "PostgreSQL Data Store" in component_names
    assert "Stream Processor & Validator (Python)" in component_names
    assert "FastAPI Telemetry Layer" in component_names
    for comp in data["components"]:
        assert comp["status"] in ("healthy", "degraded", "failed")
        assert comp["latency_ms"] >= 0.0
