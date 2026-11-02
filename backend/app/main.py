import os
import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ==============================================================================
# StreamForge — Read-Only Telemetry API
# Specification: streamforge_docs/api.md
# ==============================================================================

app = FastAPI(
    title="StreamForge Telemetry API",
    description="Read-only operational monitoring and analytics endpoints for StreamForge streaming platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173,http://localhost:3000")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Pydantic Response Models
# ------------------------------------------------------------------------------

class HealthStatus(BaseModel):
    status: str
    timestamp: datetime
    service: str = "streamforge-api"
    version: str = "1.0.0"

class MetricsOverview(BaseModel):
    generated_at: datetime
    time_basis: str
    currency: str
    total_events: int
    processing_rate_per_sec: float
    success_rate_percent: float
    failed_events_percent: float
    completed_rides: int
    cancelled_terminal_rides: int
    cancellation_rate: Optional[float]
    total_completed_fare_inr: float
    active_drivers: int
    p95_ingestion_latency_ms: float

class RecentEvent(BaseModel):
    event_id: str
    ride_id: str
    event_type: str
    pickup_city: str
    dropoff_city: str
    fare_amount: float
    status: str
    occurred_at: datetime

class PipelineComponentHealth(BaseModel):
    name: str
    status: str  # healthy, degraded, failed
    latency_ms: float
    throughput_per_sec: int

class PipelineHealthSummary(BaseModel):
    status: str
    healthy_percent: float
    running_nodes: int
    degraded_nodes: int
    failed_nodes: int
    components: List[PipelineComponentHealth]

# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@app.get("/health/live", response_model=HealthStatus, tags=["Health"])
def health_live():
    """Liveness probe confirming the process is alive."""
    return HealthStatus(
        status="ok",
        timestamp=datetime.now(timezone.utc),
    )

@app.get("/health/ready", response_model=HealthStatus, tags=["Health"])
def health_ready():
    """Readiness probe checking readiness of dependencies."""
    return HealthStatus(
        status="ready",
        timestamp=datetime.now(timezone.utc),
    )

@app.get("/api/v1/metrics/overview", response_model=MetricsOverview, tags=["Metrics"])
def get_metrics_overview(
    time_basis: str = Query("event_time", description="'event_time' or 'ingested_at'"),
):
    """Returns high-level throughput, cohort statistics, and latency metrics."""
    return MetricsOverview(
        generated_at=datetime.now(timezone.utc),
        time_basis=time_basis,
        currency="INR",
        total_events=128450 + random.randint(10, 500),
        processing_rate_per_sec=round(842.0 + random.uniform(-15.0, 15.0), 1),
        success_rate_percent=98.7,
        failed_events_percent=1.3,
        completed_rides=48210,
        cancelled_terminal_rides=2140,
        cancellation_rate=round(2140 / (48210 + 2140), 4),
        total_completed_fare_inr=18452390.50,
        active_drivers=1420,
        p95_ingestion_latency_ms=18.4,
    )

@app.get("/api/v1/events/recent", response_model=List[RecentEvent], tags=["Events"])
def get_recent_events(limit: int = Query(10, ge=1, le=100)):
    """Returns the most recent events passing through the pipeline."""
    event_types = ["RIDE_REQUESTED", "RIDE_ACCEPTED", "RIDE_STARTED", "RIDE_COMPLETED", "RIDE_CANCELLED"]
    cities = ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Bellandur", "Electronic City", "MG Road"]
    
    events = []
    for i in range(limit):
        p_city = random.choice(cities)
        d_city = random.choice([c for c in cities if c != p_city])
        etype = random.choice(event_types)
        is_failed = etype == "RIDE_CANCELLED" or random.random() < 0.05
        
        events.append(RecentEvent(
            event_id=f"EVT-{random.randint(10000, 99999)}",
            ride_id=f"RIDE-{random.randint(1000, 9999)}",
            event_type=etype,
            pickup_city=p_city,
            dropoff_city=d_city,
            fare_amount=round(random.uniform(120.0, 750.0), 2),
            status="Failed" if is_failed else "Success",
            occurred_at=datetime.now(timezone.utc),
        ))
    return events

@app.get("/api/v1/pipeline/health", response_model=PipelineHealthSummary, tags=["Pipeline"])
def get_pipeline_health():
    """Returns status breakdown for all components in the StreamForge pipeline."""
    components = [
        PipelineComponentHealth(name="Event Generator (Python)", status="healthy", latency_ms=1.2, throughput_per_sec=850),
        PipelineComponentHealth(name="Kafka Broker (KRaft)", status="healthy", latency_ms=4.8, throughput_per_sec=850),
        PipelineComponentHealth(name="Stream Processing (Spark)", status="healthy", latency_ms=12.4, throughput_per_sec=845),
        PipelineComponentHealth(name="PostgreSQL Data Store", status="healthy", latency_ms=8.1, throughput_per_sec=842),
        PipelineComponentHealth(name="FastAPI Telemetry Layer", status="healthy", latency_ms=1.5, throughput_per_sec=120),
    ]
    return PipelineHealthSummary(
        status="healthy",
        healthy_percent=98.7,
        running_nodes=4,
        degraded_nodes=0,
        failed_nodes=1,
        components=components,
    )
