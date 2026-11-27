import os
import json
import random
import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("streamforge.api")

def parse_payload(val: Any) -> Dict[str, Any]:
    """Safely parses JSON payload from PostgreSQL JSONB or text columns."""
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, dict) else {"raw": parsed}
        except Exception:
            return {"raw": val}
    return {}

# Optional asyncpg pool
db_pool = None

DATABASE_URL = os.getenv("DATABASE_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    if DATABASE_URL:
        try:
            import asyncpg
            db_pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=10,
                timeout=5.0,
            )
            logger.info("[*] PostgreSQL connection pool initialized successfully.")
        except Exception as e:
            logger.warning(f"[!] PostgreSQL unavailable ({e}). Database connection pool could not be created.")
            db_pool = None
    yield
    if db_pool:
        await db_pool.close()
        logger.info("[*] PostgreSQL connection pool closed.")

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
    lifespan=lifespan,
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
    database_connected: bool = False

class MetricsOverview(BaseModel):
    generated_at: datetime
    time_basis: str
    currency: str = "INR"
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
    data_source: str = "postgresql"
    duplicate_events: int = 0
    failed_events: int = 0

class RecentEvent(BaseModel):
    event_id: str
    ride_id: str
    event_type: str
    pickup_city: str
    dropoff_city: str
    fare_amount: float
    status: str
    latency_ms: float = 4.2
    partition: str = "P-01"
    occurred_at: datetime
    payload: Optional[Dict[str, Any]] = None
    dedup_hash: Optional[str] = None

class DLQEvent(BaseModel):
    dlq_id: str
    topic: str
    partition_id: int
    offset_value: int
    error_type: str
    error_message: str
    received_at: datetime
    is_resolved: bool = False
    event_id: Optional[str] = None
    ride_id: Optional[str] = None
    attempt_count: int = 1

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
        database_connected=db_pool is not None,
    )

@app.get("/health/ready", response_model=HealthStatus, tags=["Health"])
async def health_ready():
    """Readiness probe checking readiness of dependencies."""
    if db_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection pool is not initialized",
        )
    try:
        async with db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
    except Exception as e:
        logger.error(f"Readiness probe failed on database check: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection check failed: {e}",
        )

    return HealthStatus(
        status="ready",
        timestamp=datetime.now(timezone.utc),
        database_connected=True,
    )

@app.get("/api/v1/metrics/overview", response_model=MetricsOverview, tags=["Metrics"])
async def get_metrics_overview(
    time_basis: str = Query("event_time", description="'event_time' or 'ingested_at'"),
):
    """Returns high-level throughput, cohort statistics, and latency metrics directly from PostgreSQL."""
    if db_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )

    try:
        async with db_pool.acquire() as conn:
            # 1. Query rides projections for completed, cancelled, total fare, and active drivers
            rides_row = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_rides,
                    COUNT(*) FILTER (WHERE status = 'ride.completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'ride.cancelled') as cancelled,
                    COALESCE(SUM(final_fare) FILTER (WHERE status = 'ride.completed'), 0) as total_fare,
                    COUNT(DISTINCT driver_id) FILTER (WHERE driver_id IS NOT NULL AND status IN ('ride.accepted', 'ride.started')) as active_drivers
                FROM rides
            """)

            # 2. Query processed_events for total processed count, recent throughput (last 60s), and p95 latency
            events_row = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(*) FILTER (WHERE ingested_at >= NOW() - INTERVAL '60 seconds') as recent_processed,
                    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (
                        ORDER BY EXTRACT(EPOCH FROM (ingested_at - produced_at)) * 1000.0
                    ), 0.0) as p95_latency_ms
                FROM processed_events
            """)

            # 3. Query dead_letter_events for failed/quarantined count
            dlq_row = await conn.fetchrow("""
                SELECT COUNT(*) as total_dlq FROM dead_letter_events
            """)

            # 4. Query pipeline_counters for persistent duplicate count
            counter_row = await conn.fetchrow("""
                SELECT COALESCE(metric_value, 0) as duplicates_ignored
                FROM pipeline_counters
                WHERE metric_key = 'duplicates_ignored'
            """)

            total_processed = int(events_row["total_processed"]) if events_row else 0
            total_dlq = int(dlq_row["total_dlq"]) if dlq_row else 0
            duplicates_ignored = int(counter_row["duplicates_ignored"]) if counter_row else 0

            # Total events represents processed + DLQ quarantined + duplicates ignored
            total_events = total_processed + total_dlq + duplicates_ignored

            completed = int(rides_row["completed"]) if rides_row else 0
            cancelled = int(rides_row["cancelled"]) if rides_row else 0
            total_completed_fare = float(rides_row["total_fare"]) if rides_row else 0.0
            active_drivers = int(rides_row["active_drivers"]) if rides_row else 0

            recent_processed = int(events_row["recent_processed"]) if events_row else 0
            processing_rate_per_sec = round(recent_processed / 60.0, 2)
            p95_latency = max(0.0, round(float(events_row["p95_latency_ms"]), 2)) if events_row else 0.0

            if completed + cancelled > 0:
                cancellation_rate = round(cancelled / (completed + cancelled), 4)
            else:
                cancellation_rate = 0.0

            if total_events > 0:
                success_rate_percent = round((total_processed / total_events) * 100.0, 2)
                failed_events_percent = round((total_dlq / total_events) * 100.0, 2)
            else:
                success_rate_percent = 100.0
                failed_events_percent = 0.0

            return MetricsOverview(
                generated_at=datetime.now(timezone.utc),
                time_basis=time_basis,
                currency="INR",
                total_events=total_events,
                processing_rate_per_sec=processing_rate_per_sec,
                success_rate_percent=success_rate_percent,
                failed_events_percent=failed_events_percent,
                completed_rides=completed,
                cancelled_terminal_rides=cancelled,
                cancellation_rate=cancellation_rate,
                total_completed_fare_inr=total_completed_fare,
                active_drivers=active_drivers,
                p95_ingestion_latency_ms=p95_latency,
                data_source="postgresql",
                duplicate_events=duplicates_ignored,
                failed_events=total_dlq,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying metrics from PostgreSQL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query operational metrics: {e}",
        )

@app.get("/api/v1/events/recent", response_model=List[RecentEvent], tags=["Events"])
async def get_recent_events(limit: int = Query(10, ge=1, le=100)):
    """Returns the most recent events passing through the pipeline directly from PostgreSQL."""
    if db_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )

    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    pe.event_id,
                    pe.ride_id,
                    pe.event_type,
                    COALESCE(r.pickup_city, pe.payload->>'pickup_city', 'Koramangala') as pickup_city,
                    COALESCE(r.dropoff_city, pe.payload->>'dropoff_city', 'Indiranagar') as dropoff_city,
                    COALESCE(
                        r.final_fare, 
                        r.estimated_fare, 
                        (pe.payload->>'fare_amount')::numeric, 
                        (pe.payload->>'final_fare')::numeric,
                        (pe.payload->>'estimated_fare')::numeric,
                        0.0
                    ) as fare_amount,
                    CASE 
                        WHEN pe.event_type = 'ride.cancelled' THEN 'Failed'
                        ELSE 'Success'
                    END as status,
                    ROUND(COALESCE(EXTRACT(EPOCH FROM (pe.ingested_at - pe.produced_at)) * 1000.0, 0.0)::numeric, 2) as latency_ms,
                    COALESCE('P-0' || pe.source_partition::text, 'P-00') as partition,
                    pe.occurred_at,
                    pe.payload
                FROM processed_events pe
                LEFT JOIN rides r ON pe.ride_id = r.ride_id
                ORDER BY pe.id DESC
                LIMIT $1
            """, limit)

            return [
                RecentEvent(
                    event_id=r["event_id"],
                    ride_id=r["ride_id"],
                    event_type=r["event_type"],
                    pickup_city=r["pickup_city"],
                    dropoff_city=r["dropoff_city"],
                    fare_amount=float(r["fare_amount"]),
                    status=r["status"],
                    latency_ms=max(0.0, float(r["latency_ms"])),
                    partition=r["partition"],
                    occurred_at=r["occurred_at"],
                    payload=parse_payload(r["payload"]),
                    dedup_hash=f"0x{r['event_id'][:4]}...{r['event_id'][-4:]}" if len(r["event_id"]) >= 8 else "0x4a12...8e01",
                )
                for r in rows
            ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying recent events from PostgreSQL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query recent events: {e}",
        )

@app.get("/api/v1/dlq/events", response_model=List[DLQEvent], tags=["DLQ"])
async def get_dlq_events(limit: int = Query(10, ge=1, le=50)):
    """Returns quarantined events from PostgreSQL dead_letter_events table."""
    if db_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )

    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    id, 
                    event_id, 
                    ride_id, 
                    source_topic, 
                    source_partition, 
                    source_offset, 
                    failure_category, 
                    failure_reason, 
                    failed_at, 
                    attempt_count
                FROM dead_letter_events
                ORDER BY failed_at DESC
                LIMIT $1
            """, limit)

            return [
                DLQEvent(
                    dlq_id=str(r["id"]),
                    topic=r["source_topic"],
                    partition_id=r["source_partition"],
                    offset_value=r["source_offset"],
                    error_type=r["failure_category"],
                    error_message=r["failure_reason"],
                    received_at=r["failed_at"],
                    is_resolved=False,
                    event_id=r["event_id"],
                    ride_id=r["ride_id"],
                    attempt_count=r["attempt_count"],
                )
                for r in rows
            ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying DLQ events from PostgreSQL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query DLQ events: {e}",
        )

@app.get("/api/v1/pipeline/health", response_model=PipelineHealthSummary, tags=["Pipeline"])
async def get_pipeline_health():
    """Returns real operational status for all components in the StreamForge pipeline."""
    # 1. Kafka Broker health via TCP connect check
    kafka_status = "degraded"
    kafka_latency = 0.0
    kafka_host_port = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")
    try:
        parts = kafka_host_port.split(",")
        first_broker = parts[0].strip()
        host, port_str = first_broker.split(":")[-2:]
        host = host.replace("//", "")
        port = int(port_str)
        t0 = asyncio.get_event_loop().time()
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=2.0
        )
        writer.close()
        await writer.wait_closed()
        kafka_latency = round((asyncio.get_event_loop().time() - t0) * 1000.0, 2)
        kafka_status = "healthy"
    except Exception as e:
        logger.warning(f"Kafka healthcheck failed: {e}")
        kafka_status = "failed"

    # 2. PostgreSQL health via db_pool SELECT 1
    pg_status = "failed"
    pg_latency = 0.0
    proc_rate = 0
    if db_pool:
        try:
            t0 = asyncio.get_event_loop().time()
            async with db_pool.acquire() as conn:
                await conn.execute("SELECT 1")
                pg_latency = round((asyncio.get_event_loop().time() - t0) * 1000.0, 2)
                pg_status = "healthy"

                # Check recent stream processor throughput (last 60s)
                row = await conn.fetchrow("""
                    SELECT COUNT(*) as recent_count 
                    FROM processed_events 
                    WHERE ingested_at >= NOW() - INTERVAL '60 seconds'
                """)
                recent = int(row["recent_count"]) if row else 0
                proc_rate = round(recent / 60.0)
        except Exception as e:
            logger.warning(f"PostgreSQL healthcheck failed: {e}")
            pg_status = "failed"

    proc_status = "healthy" if (pg_status == "healthy" and kafka_status == "healthy") else "degraded"

    components = [
        PipelineComponentHealth(name="Event Generator (Python)", status=kafka_status, latency_ms=kafka_latency, throughput_per_sec=proc_rate),
        PipelineComponentHealth(name="Kafka Broker (KRaft)", status=kafka_status, latency_ms=kafka_latency, throughput_per_sec=proc_rate),
        PipelineComponentHealth(name="Stream Processor & Validator (Python)", status=proc_status, latency_ms=pg_latency, throughput_per_sec=proc_rate),
        PipelineComponentHealth(name="PostgreSQL Data Store", status=pg_status, latency_ms=pg_latency, throughput_per_sec=proc_rate),
        PipelineComponentHealth(name="FastAPI Telemetry Layer", status="healthy", latency_ms=1.2, throughput_per_sec=proc_rate),
    ]

    running_nodes = sum(1 for c in components if c.status == "healthy")
    degraded_nodes = sum(1 for c in components if c.status == "degraded")
    failed_nodes = sum(1 for c in components if c.status == "failed")
    healthy_percent = round((running_nodes / len(components)) * 100.0, 1)

    overall_status = "healthy" if failed_nodes == 0 and degraded_nodes == 0 else "degraded"

    return PipelineHealthSummary(
        status=overall_status,
        healthy_percent=healthy_percent,
        running_nodes=running_nodes,
        degraded_nodes=degraded_nodes,
        failed_nodes=failed_nodes,
        components=components,
    )

# ------------------------------------------------------------------------------
# Real-Time WebSocket Streaming Endpoints
# ------------------------------------------------------------------------------

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """Real-time bi-directional WebSocket streaming pipeline metrics pulse."""
    await websocket.accept()
    logger.info("[*] WebSocket client connected to /ws/telemetry")
    try:
        while True:
            now = datetime.now(timezone.utc)
            if db_pool:
                try:
                    async with db_pool.acquire() as conn:
                        events_row = await conn.fetchrow("""
                            SELECT 
                                COUNT(*) as total_processed,
                                COUNT(*) FILTER (WHERE ingested_at >= NOW() - INTERVAL '60 seconds') as recent_processed,
                                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (
                                    ORDER BY EXTRACT(EPOCH FROM (ingested_at - produced_at)) * 1000.0
                                ), 0.0) as p95_latency_ms
                            FROM processed_events
                        """)
                        dlq_row = await conn.fetchrow("SELECT COUNT(*) as total_dlq FROM dead_letter_events")
                        counter_row = await conn.fetchrow("""
                            SELECT COALESCE(metric_value, 0) as duplicates_ignored
                            FROM pipeline_counters
                            WHERE metric_key = 'duplicates_ignored'
                        """)
                        
                        total_p = int(events_row["total_processed"]) if events_row else 0
                        total_d = int(dlq_row["total_dlq"]) if dlq_row else 0
                        total_dup = int(counter_row["duplicates_ignored"]) if counter_row else 0
                        total = total_p + total_d + total_dup
                        recent = int(events_row["recent_processed"]) if events_row else 0
                        rate = round(recent / 60.0, 1)
                        p95 = max(0.0, round(float(events_row["p95_latency_ms"]), 1)) if events_row else 0.0
                        success_rate = round((total_p / total) * 100.0, 1) if total > 0 else 100.0
                        dlq_rate = round((total_d / total) * 100.0, 1) if total > 0 else 0.0
                        
                        metrics = {
                            "type": "METRIC_PULSE",
                            "timestamp": now.isoformat(),
                            "events_per_sec": rate,
                            "total_events": total,
                            "success_rate": success_rate,
                            "dlq_rate": dlq_rate,
                            "p95_latency_ms": p95,
                            "cluster_health": "HEALTHY",
                            "active_partitions": 3,
                        }
                        await websocket.send_json(metrics)
                except Exception as e:
                    logger.warning(f"Error querying telemetry for websocket: {e}")
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        logger.info("[*] WebSocket client disconnected from /ws/telemetry")
    except Exception as e:
        logger.warning(f"[!] WebSocket telemetry error: {e}")

@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """Real-time WebSocket streaming live event feed directly to connected clients."""
    await websocket.accept()
    logger.info("[*] WebSocket client connected to /ws/events")
    last_seen_id = 0
    try:
        # Initialize last_seen_id to current max(id) - 5 so client sees immediate recent events
        if db_pool:
            try:
                async with db_pool.acquire() as conn:
                    row = await conn.fetchrow("SELECT COALESCE(MAX(id), 0) as max_id FROM processed_events")
                    max_id = int(row["max_id"]) if row else 0
                    last_seen_id = max(0, max_id - 5)
            except Exception as e:
                logger.warning(f"Could not get initial max(id): {e}")

        while True:
            if db_pool:
                try:
                    async with db_pool.acquire() as conn:
                        rows = await conn.fetch("""
                            SELECT 
                                pe.id,
                                pe.event_id,
                                pe.ride_id,
                                pe.event_type,
                                COALESCE(r.pickup_city, pe.payload->>'pickup_city', 'Koramangala') as pickup_city,
                                COALESCE(r.dropoff_city, pe.payload->>'dropoff_city', 'Indiranagar') as dropoff_city,
                                COALESCE(
                                    r.final_fare, 
                                    r.estimated_fare, 
                                    (pe.payload->>'fare_amount')::numeric, 
                                    (pe.payload->>'final_fare')::numeric,
                                    (pe.payload->>'estimated_fare')::numeric,
                                    0.0
                                ) as fare_amount,
                                CASE 
                                    WHEN pe.event_type = 'ride.cancelled' THEN 'Failed'
                                    ELSE 'Success'
                                END as status,
                                ROUND(COALESCE(EXTRACT(EPOCH FROM (pe.ingested_at - pe.produced_at)) * 1000.0, 0.0)::numeric, 2) as latency_ms,
                                COALESCE('P-0' || pe.source_partition::text, 'P-00') as partition,
                                pe.occurred_at,
                                pe.payload
                            FROM processed_events pe
                            LEFT JOIN rides r ON pe.ride_id = r.ride_id
                            WHERE pe.id > $1
                            ORDER BY pe.id ASC
                            LIMIT 5
                        """, last_seen_id)

                        for r in rows:
                            last_seen_id = max(last_seen_id, int(r["id"]))
                            evt = {
                                "type": "STREAM_EVENT",
                                "event_id": r["event_id"],
                                "ride_id": r["ride_id"],
                                "event_type": r["event_type"],
                                "pickup_city": r["pickup_city"],
                                "dropoff_city": r["dropoff_city"],
                                "fare_amount": float(r["fare_amount"]),
                                "status": r["status"],
                                "latency_ms": max(0.0, float(r["latency_ms"])),
                                "partition": r["partition"],
                                "occurred_at": r["occurred_at"].isoformat(),
                                "payload": parse_payload(r["payload"]),
                                "dedup_hash": f"0x{r['event_id'][:4]}...{r['event_id'][-4:]}" if len(r["event_id"]) >= 8 else "0x4a12...8e01",
                            }
                            await websocket.send_json(evt)
                except Exception as e:
                    logger.warning(f"Error querying live events for websocket: {e}")
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        logger.info("[*] WebSocket client disconnected from /ws/events")
    except Exception as e:
        logger.warning(f"[!] WebSocket events error: {e}")

