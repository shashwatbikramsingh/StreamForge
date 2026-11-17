"""
StreamForge — Pydantic Event Schemas & Domain Models
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md & RULES.md

Governs typed schema validation, UTC timezone-aware timestamps,
monetary decimal precision, and Bengaluru geography invariants.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum, IntEnum
from typing import Literal, Union, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

from streamforge.events.geography import BengaluruZone


class RideEventType(str, Enum):
    """Supported ride lifecycle event types."""
    REQUESTED = "ride_requested"
    ACCEPTED = "ride_accepted"
    STARTED = "ride_started"
    COMPLETED = "ride_completed"
    CANCELLED = "ride_cancelled"


class RideLifecycleRank(IntEnum):
    """
    Monotonic lifecycle rank ordering per ADR 0001 (Decision 5):
    REQUESTED(1) -> ACCEPTED(2) -> STARTED(3) -> COMPLETED(4) / CANCELLED(4).
    """
    REQUESTED = 1
    ACCEPTED = 2
    STARTED = 3
    COMPLETED = 4
    CANCELLED = 4

    @classmethod
    def from_event_type(cls, event_type: RideEventType) -> "RideLifecycleRank":
        mapping = {
            RideEventType.REQUESTED: cls.REQUESTED,
            RideEventType.ACCEPTED: cls.ACCEPTED,
            RideEventType.STARTED: cls.STARTED,
            RideEventType.COMPLETED: cls.COMPLETED,
            RideEventType.CANCELLED: cls.CANCELLED,
        }
        return mapping[event_type]


# ---------------------------------------------------------------------------
# Specialized Event Payloads
# ---------------------------------------------------------------------------

class RideRequestedPayload(BaseModel):
    """Payload emitted when a rider books a trip."""
    model_config = ConfigDict(extra="forbid")

    rider_id: str = Field(..., min_length=3, max_length=64, description="Unique rider identifier")
    pickup_zone: BengaluruZone = Field(..., description="Synthetic Bengaluru pickup location")
    dropoff_zone: BengaluruZone = Field(..., description="Synthetic Bengaluru dropoff location")
    estimated_fare: Decimal = Field(..., gt=0, decimal_places=2, description="Estimated trip fare in INR")
    surge_multiplier: Decimal = Field(default=Decimal("1.00"), ge=Decimal("1.00"), le=Decimal("5.00"), decimal_places=2)

    @model_validator(mode="after")
    def validate_different_zones(self) -> "RideRequestedPayload":
        if self.pickup_zone == self.dropoff_zone:
            raise ValueError(f"Pickup and dropoff zones must differ: got {self.pickup_zone.value}")
        return self


class RideAcceptedPayload(BaseModel):
    """Payload emitted when a driver accepts a ride dispatch."""
    model_config = ConfigDict(extra="forbid")

    driver_id: str = Field(..., min_length=3, max_length=64, description="Assigned driver identifier")
    eta_minutes: int = Field(..., ge=1, le=120, description="Estimated arrival time in minutes")


class RideStartedPayload(BaseModel):
    """Payload emitted when the driver picks up the rider and starts the trip."""
    model_config = ConfigDict(extra="forbid")

    driver_id: str = Field(..., min_length=3, max_length=64)
    start_odometer_km: Decimal = Field(..., ge=0, decimal_places=2, description="Vehicle initial odometer")


class RideCompletedPayload(BaseModel):
    """Payload emitted upon successful trip termination."""
    model_config = ConfigDict(extra="forbid")

    driver_id: str = Field(..., min_length=3, max_length=64)
    final_fare: Decimal = Field(..., gt=0, decimal_places=2, description="Final billed fare in INR")
    distance_km: Decimal = Field(..., gt=0, decimal_places=2, description="Trip distance in km")
    duration_seconds: int = Field(..., gt=0, description="Trip total duration in seconds")


class RideCancelledPayload(BaseModel):
    """Payload emitted when a trip is aborted before completion."""
    model_config = ConfigDict(extra="forbid")

    cancelled_by: Literal["rider", "driver", "system"] = Field(...)
    cancellation_reason: str = Field(..., min_length=3, max_length=256)
    cancellation_fee: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)


PayloadUnion = Union[
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload
]


# ---------------------------------------------------------------------------
# Core Base Event Envelope
# ---------------------------------------------------------------------------

class RideEvent(BaseModel):
    """
    Standardized StreamForge Event Envelope per ADR 0001:
    - event_id: distinct event message identifier
    - ride_id: persistent business entity identifier
    - occurred_at: business event timestamp (UTC)
    - produced_at: Kafka emission timestamp (UTC)
    """
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(..., min_length=5, max_length=128, description="Unique event identifier")
    ride_id: str = Field(..., min_length=5, max_length=128, description="Business ride identifier")
    event_type: RideEventType = Field(..., description="Lifecycle transition type")
    occurred_at: datetime = Field(..., description="Business timestamp in UTC")
    produced_at: datetime = Field(..., description="Producer emission timestamp in UTC")
    payload: PayloadUnion = Field(..., description="Typed payload matching event_type")

    @field_validator("occurred_at", "produced_at", mode="after")
    @classmethod
    def ensure_timezone_aware_utc(cls, v: datetime) -> datetime:
        """Enforce strict timezone-awareness in UTC per RULES.md."""
        if v.tzinfo is None:
            raise ValueError("Timestamps must be timezone-aware (UTC)")
        return v.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_timestamp_ordering_and_payload_type(self) -> "RideEvent":
        """Validate logical timestamp sequencing and matching payload type."""
        # 1. Produced at must not precede occurred_at
        if self.produced_at < self.occurred_at:
            raise ValueError(
                f"produced_at ({self.produced_at.isoformat()}) cannot be earlier than occurred_at ({self.occurred_at.isoformat()})"
            )

        # 2. Payload type consistency check
        type_to_payload_cls = {
            RideEventType.REQUESTED: RideRequestedPayload,
            RideEventType.ACCEPTED: RideAcceptedPayload,
            RideEventType.STARTED: RideStartedPayload,
            RideEventType.COMPLETED: RideCompletedPayload,
            RideEventType.CANCELLED: RideCancelledPayload,
        }

        expected_cls = type_to_payload_cls[self.event_type]
        if not isinstance(self.payload, expected_cls):
            raise ValueError(
                f"Payload type mismatch for event_type '{self.event_type.value}': expected {expected_cls.__name__}, got {type(self.payload).__name__}"
            )

        return self

    @property
    def lifecycle_rank(self) -> int:
        """Return the integer rank for monotonic state progression."""
        return int(RideLifecycleRank.from_event_type(self.event_type))

    def to_kafka_dict(self) -> Dict[str, Any]:
        """Serialize model to clean JSON-compatible dictionary for Kafka emission."""
        return self.model_dump(mode="json")
