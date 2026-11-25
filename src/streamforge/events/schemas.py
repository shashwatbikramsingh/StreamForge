"""StreamForge event schemas following PRD v1.0 and ADR 0001."""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum, IntEnum
from typing import Annotated, Any, Literal, Union, Dict, Optional
from pydantic import (
    BaseModel,
    BeforeValidator,
    PlainSerializer,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)
from streamforge.events.geography import BengaluruZone


def validate_money_input(value: Any) -> Any:
    """Accept decimal strings from JSON or Decimal values from Python."""
    if isinstance(value, (float, int)) and not isinstance(value, bool):
        raise ValueError(
            "Money must be provided as a decimal string or Decimal, "
            "not a float or integer."
        )
    if not isinstance(value, (str, Decimal)):
        raise ValueError(
            "Money must be provided as a decimal string or Decimal, "
            "not a float or integer."
        )
    return value


PositiveMoney = Annotated[
    Decimal,
    BeforeValidator(validate_money_input),
    Field(gt=Decimal("0"), decimal_places=2),
    PlainSerializer(lambda x: f"{x:.2f}", return_type=str),
]

NonNegativeMoney = Annotated[
    Decimal,
    BeforeValidator(validate_money_input),
    Field(ge=Decimal("0"), decimal_places=2),
    PlainSerializer(lambda x: f"{x:.2f}", return_type=str),
]


class RideEventType(str, Enum):
    """Supported ride lifecycle event types following PRD v1.0."""
    REQUESTED = "ride.requested"
    ACCEPTED = "ride.accepted"
    STARTED = "ride.started"
    COMPLETED = "ride.completed"
    CANCELLED = "ride.cancelled"


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

    ride_id: str = Field(..., min_length=3, max_length=64, description="Business ride identifier")
    rider_id: str = Field(..., min_length=3, max_length=64, description="Unique rider identifier")
    driver_id: Optional[str] = Field(default=None, description="Assigned driver identifier")
    pickup_city: BengaluruZone = Field(..., description="Synthetic Bengaluru pickup location")
    dropoff_city: BengaluruZone = Field(..., description="Synthetic Bengaluru dropoff location")
    fare_amount: PositiveMoney = Field(..., description="Estimated trip fare in INR")
    currency: Literal["INR"] = Field(default="INR", description="Currency code")

    @model_validator(mode="after")
    def validate_different_zones(self) -> "RideRequestedPayload":
        if self.pickup_city == self.dropoff_city:
            raise ValueError(f"Pickup and dropoff zones must differ: got {self.pickup_city.value}")
        return self

    @property
    def pickup_zone(self) -> BengaluruZone:
        """Backward-compatible property for pickup zone."""
        return self.pickup_city

    @property
    def dropoff_zone(self) -> BengaluruZone:
        """Backward-compatible property for dropoff zone."""
        return self.dropoff_city

    @property
    def estimated_fare(self) -> Decimal:
        """Backward-compatible property for estimated fare."""
        return self.fare_amount


class RideAcceptedPayload(BaseModel):
    """Payload emitted when a driver accepts a ride dispatch."""
    model_config = ConfigDict(extra="forbid")

    ride_id: str = Field(..., min_length=3, max_length=64, description="Business ride identifier")
    driver_id: str = Field(..., min_length=3, max_length=64, description="Assigned driver identifier")
    eta_minutes: int = Field(..., ge=1, le=120, description="Estimated arrival time in minutes")


class RideStartedPayload(BaseModel):
    """Payload emitted when the driver picks up the rider and starts the trip."""
    model_config = ConfigDict(extra="forbid")

    ride_id: str = Field(..., min_length=3, max_length=64, description="Business ride identifier")
    driver_id: str = Field(..., min_length=3, max_length=64, description="Assigned driver identifier")
    start_odometer_km: Decimal = Field(..., ge=0, decimal_places=2, description="Vehicle initial odometer")


class RideCompletedPayload(BaseModel):
    """Payload emitted upon successful trip termination."""
    model_config = ConfigDict(extra="forbid")

    ride_id: str = Field(..., min_length=3, max_length=64, description="Business ride identifier")
    driver_id: str = Field(..., min_length=3, max_length=64, description="Assigned driver identifier")
    fare_amount: PositiveMoney = Field(..., description="Final billed fare in INR")
    distance_km: Decimal = Field(..., gt=0, decimal_places=2, description="Trip distance in km")
    duration_seconds: int = Field(..., gt=0, description="Trip total duration in seconds")
    currency: Literal["INR"] = Field(default="INR", description="Currency code")

    @property
    def final_fare(self) -> Decimal:
        """Backward-compatible property for final fare."""
        return self.fare_amount


class RideCancelledPayload(BaseModel):
    """Payload emitted when a trip is aborted before completion."""
    model_config = ConfigDict(extra="forbid")

    ride_id: str = Field(..., min_length=3, max_length=64, description="Business ride identifier")
    cancelled_by: Literal["rider", "driver", "system"] = Field(...)
    cancellation_reason: str = Field(..., min_length=3, max_length=256)
    cancellation_fee: NonNegativeMoney = Field(default=Decimal("0.00"), description="Cancellation fee in INR")
    currency: Literal["INR"] = Field(default="INR", description="Currency code")


PayloadUnion = Union[
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
]


# ---------------------------------------------------------------------------
# Core Base Event Envelope
# ---------------------------------------------------------------------------

class RideEvent(BaseModel):
    """
    Standardized StreamForge Event Envelope per PRD v1.0 & ADR 0001:
    - event_id: distinct event message identifier
    - event_type: ride lifecycle transition
    - schema_version: required version integer (1)
    - occurred_at: business event timestamp (UTC)
    - produced_at: Kafka emission timestamp (UTC)
    - producer: producer identifier
    - payload: typed payload containing ride_id and transition details
    """
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(..., min_length=5, max_length=128, description="Unique event identifier")
    event_type: RideEventType = Field(..., description="Lifecycle transition type")
    schema_version: Literal[1] = Field(default=1, description="Event schema version")
    occurred_at: datetime = Field(..., description="Business timestamp in UTC")
    produced_at: datetime = Field(..., description="Producer emission timestamp in UTC")
    producer: str = Field(..., min_length=1, max_length=128, description="Producer identifier")
    payload: PayloadUnion = Field(..., description="Typed payload matching event_type")

    @field_validator("event_type", mode="before")
    @classmethod
    def normalize_event_type(cls, v: Any) -> Any:
        """Accept enum, dot-notation or legacy underscore-notation."""
        if isinstance(v, str):
            v_norm = v.lower().replace("_", ".")
            return v_norm
        return v

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
    def ride_id(self) -> str:
        """Convenience accessor to business ride identifier."""
        return self.payload.ride_id

    @property
    def lifecycle_rank(self) -> int:
        """Return the integer rank for monotonic state progression."""
        return int(RideLifecycleRank.from_event_type(self.event_type))

    def to_kafka_dict(self) -> Dict[str, Any]:
        """Serialize model to clean JSON-compatible dictionary for Kafka emission."""
        return self.model_dump(mode="json")
