-- ==============================================================================
-- StreamForge — Database Initialization Schema (PostgreSQL)
-- Specification: streamforge_docs/database.md
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Immutable Processed Events (Append-Only Event Store)
CREATE TABLE IF NOT EXISTS processed_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    ride_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('RIDE_REQUESTED', 'RIDE_ACCEPTED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'RIDE_CANCELLED')),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    produced_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    producer TEXT NOT NULL,
    payload JSONB NOT NULL,
    topic TEXT NOT NULL,
    partition_id INTEGER NOT NULL CHECK (partition_id >= 0),
    offset_value BIGINT NOT NULL CHECK (offset_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_processed_events_ride_id ON processed_events (ride_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_occurred_at ON processed_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_processed_events_type_time ON processed_events (event_type, occurred_at);

-- 2. Derived Rides Projection (Stateful Aggregation)
CREATE TABLE IF NOT EXISTS rides (
    ride_id UUID PRIMARY KEY,
    rider_id TEXT NOT NULL,
    driver_id TEXT,
    pickup_city TEXT NOT NULL,
    dropoff_city TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED')),
    status_rank SMALLINT NOT NULL CHECK (status_rank BETWEEN 1 AND 4),
    fare_amount NUMERIC(12, 2) NOT NULL CHECK (fare_amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    requested_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides (requested_at);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_dropoff ON rides (pickup_city, dropoff_city);

-- 3. Dead Letter Queue (Corrupted or Invalid Payload Isolation)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    dlq_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_payload TEXT NOT NULL,
    topic TEXT NOT NULL,
    partition_id INTEGER NOT NULL,
    offset_value BIGINT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_dlq_received_at ON dead_letter_queue (received_at);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue (is_resolved);

-- Seed Initial Demo Metrics Snapshot
INSERT INTO rides (
    ride_id, rider_id, driver_id, pickup_city, dropoff_city, 
    status, status_rank, fare_amount, currency, requested_at, accepted_at, started_at, completed_at, updated_at
) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'rider_4921', 'driver_8812', 'Koramangala', 'Indiranagar', 'COMPLETED', 4, 345.50, 'INR', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '13 minutes', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '2 minutes', NOW()),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'rider_1048', 'driver_3421', 'HSR Layout', 'Whitefield', 'COMPLETED', 4, 520.00, 'INR', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '22 minutes', NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '5 minutes', NOW()),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'rider_9082', 'driver_1994', 'Bellandur', 'Electronic City', 'STARTED', 3, 410.00, 'INR', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '6 minutes', NOW() - INTERVAL '3 minutes', NULL, NOW()),
('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'rider_3345', NULL, 'MG Road', 'Marathahalli', 'CANCELLED', 1, 280.00, 'INR', NOW() - INTERVAL '30 minutes', NULL, NULL, NULL, NOW())
ON CONFLICT (ride_id) DO NOTHING;

