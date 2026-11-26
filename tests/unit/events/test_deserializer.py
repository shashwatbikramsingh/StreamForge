"""Tests for StreamForge Kafka event deserialization."""

import base64
import pytest
from streamforge.events.deserializer import (
    deserialize_kafka_value,
)


def test_valid_json_object_deserialized():
    """Test 1: Valid JSON object bytes are decoded and parsed cleanly."""
    raw = b'{"event_id":"evt_001","ride_id":"ride_001"}'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is True
    assert result.error_reason is None
    assert result.payload["event_id"] == "evt_001"
    assert result.raw_record["raw_value_base64"] == (
        base64.b64encode(raw).decode("ascii")
    )
    assert result.raw_record["decoded_text"] == raw.decode("utf-8")


def test_invalid_json_classified():
    """Test 2: Syntactically malformed JSON is rejected with DeserializationError."""
    raw = b'{"event_id":'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Invalid JSON" in result.error_reason
    assert result.raw_record["decoded_text"] == raw.decode("utf-8")
    assert result.raw_record["raw_value_base64"] == (
        base64.b64encode(raw).decode("ascii")
    )


def test_invalid_utf8_classified():
    """Test 3: Non-UTF-8 bytes are rejected with lossless Base64 preservation."""
    raw = b"\xff\xfe\xfa"
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Invalid UTF-8" in result.error_reason
    assert result.raw_record["raw_value_base64"] == (
        base64.b64encode(raw).decode("ascii")
    )
    assert "\ufffd" in result.raw_record["decoded_text"]


def test_json_array_rejected():
    """Test 4: Top-level JSON array is rejected as non-object."""
    raw = b'[{"event_id":"evt_001"}]'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "list" in result.error_reason


def test_json_string_rejected():
    """Test 5: Top-level JSON string primitive is rejected as non-object."""
    raw = b'"simple string"'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "str" in result.error_reason


def test_json_integer_rejected():
    """Test 6: Top-level JSON integer is rejected as non-object."""
    raw = b'12345'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "int" in result.error_reason


def test_json_float_rejected():
    """Test 7: Top-level JSON float is rejected as non-object."""
    raw = b'123.45'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "float" in result.error_reason


def test_json_boolean_rejected():
    """Test 8: Top-level JSON boolean is rejected as non-object."""
    raw = b'true'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "bool" in result.error_reason


def test_json_null_rejected():
    """Test 9: Top-level JSON null is rejected as non-object."""
    raw = b'null'
    result = deserialize_kafka_value(raw)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Expected JSON object" in result.error_reason
    assert "null" in result.error_reason


def test_kafka_tombstone_rejected():
    """Test 10: Kafka tombstone message (value=None) is cleanly rejected."""
    result = deserialize_kafka_value(None)
    assert result.succeeded is False
    assert result.payload is None
    assert "DeserializationError: Kafka tombstone message" in result.error_reason
    assert result.raw_record["raw_value_base64"] is None
    assert result.raw_record["decoded_text"] is None
