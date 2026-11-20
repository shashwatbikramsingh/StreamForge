"""
StreamForge — Synthetic Bengaluru Ride Event Generator
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decisions 5 & 8)

Generates realistic Markov lifecycle transitions across Bengaluru zones:
REQUESTED (1) -> ACCEPTED (2) -> STARTED (3) -> COMPLETED (4) or CANCELLED (4).
Enforces distinct pickup/dropoff zones and strict UTC timestamp ordering.
"""

import random
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Tuple, Dict, Any, Optional

from streamforge.events.geography import BengaluruZone
from streamforge.events.schemas import (
    RideEvent,
    RideEventType,
    RideRequestedPayload,
    RideAcceptedPayload,
    RideStartedPayload,
    RideCompletedPayload,
    RideCancelledPayload,
)


# Approximate rough inter-zone distance lookup in kilometers for synthetic realism
_ZONE_DISTANCE_KM: Dict[Tuple[str, str], Decimal] = {
    ("Koramangala", "Indiranagar"): Decimal("7.5"),
    ("Koramangala", "Whitefield"): Decimal("18.0"),
    ("Koramangala", "Electronic City"): Decimal("14.5"),
    ("Koramangala", "HSR Layout"): Decimal("4.2"),
    ("Koramangala", "MG Road"): Decimal("6.8"),
    ("Indiranagar", "MG Road"): Decimal("4.5"),
    ("Indiranagar", "Whitefield"): Decimal("14.0"),
    ("Hebbal", "MG Road"): Decimal("9.5"),
    ("Hebbal", "Electronic City"): Decimal("24.0"),
    ("Jayanagar", "BTM Layout"): Decimal("3.8"),
    ("BTM Layout", "Electronic City"): Decimal("11.5"),
    ("Marathahalli", "Whitefield"): Decimal("6.5"),
    ("Marathahalli", "Indiranagar"): Decimal("9.0"),
}


class RideEventGenerator:
    """
    Generator of simulated real-time ride events conforming to ADR 0001.
    """

    def __init__(self, seed: Optional[int] = None):
        self._rng = random.Random(seed)
        self._zones = list(BengaluruZone)

    def _get_distinct_zones(self) -> Tuple[BengaluruZone, BengaluruZone]:
        """Pick two distinct Bengaluru zones."""
        pickup = self._rng.choice(self._zones)
        remaining = [z for z in self._zones if z != pickup]
        dropoff = self._rng.choice(remaining)
        return pickup, dropoff

    def _estimate_distance_km(self, pickup: BengaluruZone, dropoff: BengaluruZone) -> Decimal:
        """Estimate distance between zones with randomized deviation."""
        key = (pickup.value, dropoff.value)
        rev_key = (dropoff.value, pickup.value)
        base = _ZONE_DISTANCE_KM.get(key) or _ZONE_DISTANCE_KM.get(rev_key) or Decimal("10.0")
        jitter = Decimal(str(round(self._rng.uniform(-1.5, 2.5), 1)))
        dist = base + jitter
        return max(Decimal("2.0"), dist)

    def _calculate_fare(self, distance_km: Decimal, surge: Decimal) -> Decimal:
        """Base fare: INR 50 + INR 18/km, scaled by surge multiplier."""
        base_fare = Decimal("50.00")
        rate_per_km = Decimal("18.00")
        raw = (base_fare + (distance_km * rate_per_km)) * surge
        return Decimal(str(round(raw, 2)))

    def generate_ride_requested(
        self,
        ride_id: Optional[str] = None,
        base_time: Optional[datetime] = None,
    ) -> Tuple[RideEvent, Decimal]:
        """Generate a valid RideRequested event."""
        now = base_time or datetime.now(timezone.utc)
        r_id = ride_id or f"RIDE-{uuid.uuid4().hex[:10].upper()}"
        e_id = f"EVT-{uuid.uuid4().hex[:12].upper()}"

        pickup, dropoff = self._get_distinct_zones()
        distance = self._estimate_distance_km(pickup, dropoff)
        surge = Decimal(str(round(self._rng.choice([1.0, 1.0, 1.1, 1.25, 1.4, 1.5]), 2)))
        fare = self._calculate_fare(distance, surge)

        payload = RideRequestedPayload(
            rider_id=f"usr_{self._rng.randint(1000, 9999)}",
            pickup_zone=pickup,
            dropoff_zone=dropoff,
            estimated_fare=fare,
            surge_multiplier=surge,
        )

        event = RideEvent(
            event_id=e_id,
            ride_id=r_id,
            event_type=RideEventType.REQUESTED,
            occurred_at=now,
            produced_at=now + timedelta(milliseconds=self._rng.randint(20, 150)),
            payload=payload,
        )
        return event, distance

    def generate_full_ride_lifecycle(
        self,
        ride_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        simulate_cancellation: bool = False,
    ) -> List[RideEvent]:
        """
        Generate an ordered trace of events for a single ride adhering to the lifecycle rank matrix:
        REQUESTED -> ACCEPTED -> STARTED -> COMPLETED (or CANCELLED).
        """
        events: List[RideEvent] = []
        t0 = start_time or datetime.now(timezone.utc)
        req_event, distance = self.generate_ride_requested(ride_id=ride_id, base_time=t0)
        events.append(req_event)

        r_id = req_event.ride_id
        driver_id = f"drv_{self._rng.randint(1000, 9999)}"

        if simulate_cancellation and self._rng.random() < 0.3:
            # Cancelled right after request
            t_cancel = req_event.occurred_at + timedelta(seconds=self._rng.randint(30, 90))
            cancel_event = RideEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
                ride_id=r_id,
                event_type=RideEventType.CANCELLED,
                occurred_at=t_cancel,
                produced_at=t_cancel + timedelta(milliseconds=50),
                payload=RideCancelledPayload(
                    cancelled_by="rider",
                    cancellation_reason="No nearby driver responded in time",
                    cancellation_fee=Decimal("0.00"),
                ),
            )
            events.append(cancel_event)
            return events

        # 2. ACCEPTED
        t_acc = req_event.occurred_at + timedelta(seconds=self._rng.randint(15, 60))
        acc_event = RideEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
            ride_id=r_id,
            event_type=RideEventType.ACCEPTED,
            occurred_at=t_acc,
            produced_at=t_acc + timedelta(milliseconds=40),
            payload=RideAcceptedPayload(
                driver_id=driver_id,
                eta_minutes=self._rng.randint(3, 10),
            ),
        )
        events.append(acc_event)

        # 3. STARTED
        t_start = t_acc + timedelta(minutes=self._rng.randint(3, 8))
        start_event = RideEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
            ride_id=r_id,
            event_type=RideEventType.STARTED,
            occurred_at=t_start,
            produced_at=t_start + timedelta(milliseconds=45),
            payload=RideStartedPayload(
                driver_id=driver_id,
                start_odometer_km=Decimal(str(self._rng.randint(12000, 35000))),
            ),
        )
        events.append(start_event)

        # 4. Terminal State: COMPLETED or CANCELLED during trip
        if simulate_cancellation:
            t_cancel = t_start + timedelta(minutes=self._rng.randint(2, 6))
            cancel_event = RideEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
                ride_id=r_id,
                event_type=RideEventType.CANCELLED,
                occurred_at=t_cancel,
                produced_at=t_cancel + timedelta(milliseconds=35),
                payload=RideCancelledPayload(
                    cancelled_by="driver",
                    cancellation_reason="Vehicle breakdown / flat tire",
                    cancellation_fee=Decimal("25.00"),
                ),
            )
            events.append(cancel_event)
        else:
            duration_sec = int(float(distance) * self._rng.uniform(120, 180))
            t_comp = t_start + timedelta(seconds=duration_sec)
            final_fare = self._calculate_fare(distance, Decimal("1.00"))
            comp_event = RideEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:12].upper()}",
                ride_id=r_id,
                event_type=RideEventType.COMPLETED,
                occurred_at=t_comp,
                produced_at=t_comp + timedelta(milliseconds=60),
                payload=RideCompletedPayload(
                    driver_id=driver_id,
                    final_fare=final_fare,
                    distance_km=distance,
                    duration_seconds=duration_sec,
                ),
            )
            events.append(comp_event)

        return events
