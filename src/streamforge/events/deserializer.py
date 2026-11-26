"""StreamForge Kafka event deserialization.
Separates transport-level decoding from Pydantic schema validation.
"""

import base64
import json
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class DeserializationResult:
    """Result of decoding one Kafka message value."""

    payload: Optional[dict[str, Any]]
    raw_record: dict[str, Any]
    error_reason: Optional[str]

    @property
    def succeeded(self) -> bool:
        """Whether deserialization produced a valid JSON object."""
        return self.error_reason is None


def _build_raw_record(
    raw_value: Optional[bytes],
    decoded_text: Optional[str] = None,
    parsed_value: Any = None,
) -> dict[str, Any]:
    """Preserve the original Kafka value in a JSON-compatible format."""
    return {
        "format": "streamforge.kafka.raw.v1",
        "raw_value_base64": (
            base64.b64encode(raw_value).decode("ascii")
            if raw_value is not None
            else None
        ),
        "decoded_text": decoded_text,
        "parsed_type": (
            type(parsed_value).__name__
            if parsed_value is not None
            else ("null" if decoded_text == "null" else None)
        ),
    }


def deserialize_kafka_value(raw_value: Optional[bytes]) -> DeserializationResult:
    """
    Safely decode raw Kafka message bytes into a Python JSON object (dict).

    Enforces:
    1. Rejection of Kafka tombstones (raw_value is None).
    2. Valid UTF-8 encoding (lossless Base64 preservation in raw_record).
    3. Valid JSON syntax.
    4. Top-level JSON Object (rejects JSON arrays, primitives, and null).
    """
    if raw_value is None:
        return DeserializationResult(
            payload=None,
            raw_record=_build_raw_record(raw_value=None, decoded_text=None, parsed_value=None),
            error_reason="DeserializationError: Kafka tombstone message (value is None)",
        )

    # Decode UTF-8
    try:
        decoded_text = raw_value.decode("utf-8")
    except UnicodeDecodeError as e:
        safe_representation = raw_value.decode("utf-8", errors="replace")
        return DeserializationResult(
            payload=None,
            raw_record=_build_raw_record(
                raw_value=raw_value,
                decoded_text=safe_representation,
                parsed_value=None,
            ),
            error_reason=f"DeserializationError: Invalid UTF-8 encoding: {e}",
        )

    # Parse JSON
    try:
        parsed = json.loads(decoded_text)
    except json.JSONDecodeError as e:
        return DeserializationResult(
            payload=None,
            raw_record=_build_raw_record(
                raw_value=raw_value,
                decoded_text=decoded_text,
                parsed_value=None,
            ),
            error_reason=f"DeserializationError: Invalid JSON syntax: {e}",
        )

    # Enforce JSON Object (dict)
    if not isinstance(parsed, dict):
        type_name = "null" if parsed is None else type(parsed).__name__
        return DeserializationResult(
            payload=None,
            raw_record=_build_raw_record(
                raw_value=raw_value,
                decoded_text=decoded_text,
                parsed_value=parsed,
            ),
            error_reason=f"DeserializationError: Expected JSON object (dict), got JSON {type_name}",
        )

    # Deserialization succeeded
    return DeserializationResult(
        payload=parsed,
        raw_record=_build_raw_record(
            raw_value=raw_value,
            decoded_text=decoded_text,
            parsed_value=parsed,
        ),
        error_reason=None,
    )
