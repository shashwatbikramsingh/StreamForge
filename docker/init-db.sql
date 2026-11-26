-- =============================================================================
-- STREAMFORGE
-- PostgreSQL Canonical Database Schema
-- PRD v1.0 + ADR 0001 + StreamForge Event Contracts
-- =============================================================================

-- 1. IMMUTABLE PROCESSED EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS processed_events (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    event_id VARCHAR(128) NOT NULL UNIQUE
        CHECK (char_length(event_id) BETWEEN 5 AND 128),

    ride_id VARCHAR(64) NOT NULL
        CHECK (char_length(ride_id) BETWEEN 3 AND 64),

    event_type TEXT NOT NULL
        CHECK (
            event_type IN (
                'ride.requested',
                'ride.accepted',
                'ride.started',
                'ride.completed',
                'ride.cancelled'
            )
        ),

    schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (schema_version > 0),

    occurred_at TIMESTAMPTZ NOT NULL,

    produced_at TIMESTAMPTZ NOT NULL,

    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    producer TEXT NOT NULL,

    payload JSONB NOT NULL,

    -- These become populated when repository source metadata
    -- is added in the next implementation milestone.
    source_topic TEXT,

    source_partition INTEGER
        CHECK (
            source_partition IS NULL
            OR source_partition >= 0
        ),

    source_offset BIGINT
        CHECK (
            source_offset IS NULL
            OR source_offset >= 0
        ),

    CHECK (produced_at >= occurred_at),

    CHECK (
        (
            source_topic IS NULL
            AND source_partition IS NULL
            AND source_offset IS NULL
        )
        OR
        (
            source_topic IS NOT NULL
            AND source_partition IS NOT NULL
            AND source_offset IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_processed_events_ride_id
    ON processed_events (ride_id);

CREATE INDEX IF NOT EXISTS idx_processed_events_occurred_at
    ON processed_events (occurred_at);

CREATE INDEX IF NOT EXISTS idx_processed_events_type_time
    ON processed_events (event_type, occurred_at);


-- 2. DERIVED RIDES PROJECTION
-- =============================================================================

CREATE TABLE IF NOT EXISTS rides (

    ride_id VARCHAR(64) PRIMARY KEY
        CHECK (char_length(ride_id) BETWEEN 3 AND 64),

    rider_id VARCHAR(64),

    driver_id VARCHAR(64),

    pickup_city TEXT,

    dropoff_city TEXT,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'ride.requested',
                'ride.accepted',
                'ride.started',
                'ride.completed',
                'ride.cancelled'
            )
        ),

    status_rank SMALLINT NOT NULL
        CHECK (status_rank BETWEEN 1 AND 4),

    estimated_fare NUMERIC(12, 2)
        CHECK (estimated_fare IS NULL OR estimated_fare > 0),

    final_fare NUMERIC(12, 2)
        CHECK (final_fare IS NULL OR final_fare > 0),

    currency CHAR(3) NOT NULL DEFAULT 'INR'
        CHECK (currency = 'INR'),

    requested_at TIMESTAMPTZ,

    accepted_at TIMESTAMPTZ,

    started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    cancelled_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        (status = 'ride.requested' AND status_rank = 1)
        OR
        (status = 'ride.accepted' AND status_rank = 2)
        OR
        (status = 'ride.started' AND status_rank = 3)
        OR
        (status = 'ride.completed' AND status_rank = 4)
        OR
        (status = 'ride.cancelled' AND status_rank = 4)
    ),

    CHECK (
        pickup_city IS NULL
        OR dropoff_city IS NULL
        OR pickup_city <> dropoff_city
    )
);

CREATE INDEX IF NOT EXISTS idx_rides_status
    ON rides (status);

CREATE INDEX IF NOT EXISTS idx_rides_requested_at
    ON rides (requested_at);

CREATE INDEX IF NOT EXISTS idx_rides_pickup_dropoff
    ON rides (pickup_city, dropoff_city);


-- 3. CANONICAL DEAD LETTER EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dead_letter_events (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    event_id VARCHAR(128),

    ride_id VARCHAR(64)
        CHECK (
            ride_id IS NULL OR
            char_length(ride_id) BETWEEN 3 AND 64
        ),

    source_topic TEXT NOT NULL
        CHECK (length(btrim(source_topic)) > 0),

    source_partition INTEGER NOT NULL
        CHECK (source_partition >= 0),

    source_offset BIGINT NOT NULL
        CHECK (source_offset >= 0),

    failure_category TEXT NOT NULL
        CHECK (
            failure_category IN (
                'deserialization_error',
                'validation_error',
                'invalid_state_transition',
                'transient_exhausted',
                'processing_error'
            )
        ),

    failure_reason TEXT NOT NULL
        CHECK (
            char_length(failure_reason) BETWEEN 1 AND 2000
        ),

    payload TEXT NOT NULL,

    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    attempt_count INTEGER NOT NULL DEFAULT 1
        CHECK (attempt_count >= 1),

    -- Bound the serialized forensic envelope.
    -- The application will separately enforce the raw message limit.
    CHECK (octet_length(payload) <= 524288)
);

CREATE INDEX IF NOT EXISTS idx_dlq_failed_at
    ON dead_letter_events (failed_at);

CREATE INDEX IF NOT EXISTS idx_dlq_failure_category
    ON dead_letter_events (failure_category);

CREATE INDEX IF NOT EXISTS idx_dlq_event_id
    ON dead_letter_events (event_id);

CREATE INDEX IF NOT EXISTS idx_dlq_ride_id
    ON dead_letter_events (ride_id);

CREATE INDEX IF NOT EXISTS idx_dlq_source_coordinates
    ON dead_letter_events (
        source_topic,
        source_partition,
        source_offset
    );


-- 4. PIPELINE COUNTERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS pipeline_counters (

    metric_key TEXT PRIMARY KEY,

    metric_value BIGINT NOT NULL DEFAULT 0
        CHECK (metric_value >= 0),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize canonical metrics without resetting existing values.

INSERT INTO pipeline_counters (metric_key, metric_value)
VALUES
    ('duplicates_ignored', 0),
    ('transient_retries', 0)
ON CONFLICT (metric_key) DO NOTHING;


-- =============================================================================
-- END OF STREAMFORGE DATABASE SCHEMA
-- =============================================================================
