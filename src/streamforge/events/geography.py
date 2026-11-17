"""
StreamForge — Synthetic Bengaluru Mobility Geography Module
Specification: streamforge_docs/adr/0001-mvp-baseline-decisions.md (Decision 8)

Coarse synthetic Bengaluru mobility zones only.
Pickup and dropoff must differ. Zero real customer coordinates or PII.
"""

from enum import Enum
from typing import List


class BengaluruZone(str, Enum):
    """
    Approved 10 coarse synthetic mobility zones in Bengaluru per ADR 0001.
    """
    KORAMANGALA = "Koramangala"
    INDIRANAGAR = "Indiranagar"
    WHITEFIELD = "Whitefield"
    ELECTRONIC_CITY = "Electronic City"
    HSR_LAYOUT = "HSR Layout"
    JAYANAGAR = "Jayanagar"
    MG_ROAD = "MG Road"
    HEBBAL = "Hebbal"
    MARATHAHALLI = "Marathahalli"
    BTM_LAYOUT = "BTM Layout"

    @classmethod
    def list_zones(cls) -> List[str]:
        """Return list of all valid zone names."""
        return [zone.value for zone in cls]

    @classmethod
    def is_valid_zone(cls, name: str) -> bool:
        """Check if a string matches an approved Bengaluru zone."""
        return any(zone.value == name for zone in cls)
