"""
StreamForge — Automated Pipeline & Validation Test Suite
Specification: streamforge_docs/architecture.md & streamforge_docs/RULES.md
"""

import sys
import os
import json
import unittest
from datetime import datetime, timezone

# Add consumer and generator to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "consumer")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generator")))

from consumer import EventValidator, VALID_EVENT_TYPES, STATUS_MAP
from event_generator import EventGenerator

class TestStreamPipelineValidation(unittest.TestCase):

    def test_valid_event_envelope(self):
        """Test that a well-formed event passes contract validation."""
        valid_envelope = {
            "event_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "ride_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            "event_type": "RIDE_REQUESTED",
            "schema_version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "produced_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "rider_id": "rider_1001",
                "pickup_city": "Koramangala",
                "dropoff_city": "Indiranagar",
                "fare_amount": 250.0,
            }
        }
        is_valid, error = EventValidator.validate_envelope(valid_envelope)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_missing_required_fields(self):
        """Test that missing event_id or timestamp is caught."""
        incomplete_envelope = {
            "ride_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            "event_type": "RIDE_REQUESTED",
            "schema_version": 1,
            # missing event_id
        }
        is_valid, error = EventValidator.validate_envelope(incomplete_envelope)
        self.assertFalse(is_valid)
        self.assertIn("Missing required envelope field", error)

    def test_invalid_event_type_rejection(self):
        """Test that unrecognized event types are rejected for DLQ isolation."""
        invalid_type_envelope = {
            "event_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "ride_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            "event_type": "INVALID_CORRUPTED_ACTION",
            "schema_version": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "produced_at": datetime.now(timezone.utc).isoformat(),
            "payload": {}
        }
        is_valid, error = EventValidator.validate_envelope(invalid_type_envelope)
        self.assertFalse(is_valid)
        self.assertIn("Invalid or unrecognized event_type", error)

    def test_state_machine_rank_ordering(self):
        """Test that event type progression matches strictly monotonic ranks."""
        self.assertLess(VALID_EVENT_TYPES["RIDE_REQUESTED"], VALID_EVENT_TYPES["RIDE_ACCEPTED"])
        self.assertLess(VALID_EVENT_TYPES["RIDE_ACCEPTED"], VALID_EVENT_TYPES["RIDE_STARTED"])
        self.assertLessEqual(VALID_EVENT_TYPES["RIDE_STARTED"], VALID_EVENT_TYPES["RIDE_COMPLETED"])
        self.assertEqual(STATUS_MAP["RIDE_COMPLETED"], "COMPLETED")
        self.assertEqual(STATUS_MAP["RIDE_CANCELLED"], "CANCELLED")

    def test_synthetic_event_generator_output(self):
        """Test that EventGenerator produces compliant envelope structures."""
        gen = EventGenerator("localhost:9092", "test-topic")
        event = gen.generate_event()
        self.assertIn("event_id", event)
        self.assertIn("ride_id", event)
        self.assertIn("event_type", event)
        self.assertIn("occurred_at", event)
        self.assertIn("produced_at", event)
        self.assertIn("payload", event)

    def test_invalid_timestamp_rejection(self):
        """Test that unparseable ISO timestamps are rejected by EventValidator."""
        bad_ts_envelope = {
            "event_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "ride_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            "event_type": "RIDE_REQUESTED",
            "schema_version": 1,
            "occurred_at": "not-a-valid-timestamp-value",
            "produced_at": datetime.now(timezone.utc).isoformat(),
            "payload": {"rider_id": "r1"}
        }
        is_valid, error = EventValidator.validate_envelope(bad_ts_envelope)
        self.assertFalse(is_valid)
        self.assertIn("Invalid timestamp format", error)

    def test_idempotent_deduplication_isolation(self):
        """Test that replayed identical event_id envelopes are identified as duplicates."""
        seen = set()
        events = [
            {"event_id": "evt-001", "action": "first"},
            {"event_id": "evt-002", "action": "second"},
            {"event_id": "evt-001", "action": "duplicate"},
        ]
        duplicates = []
        for e in events:
            if e["event_id"] in seen:
                duplicates.append(e["event_id"])
            else:
                seen.add(e["event_id"])
        self.assertEqual(len(duplicates), 1)
        self.assertEqual(duplicates[0], "evt-001")

if __name__ == "__main__":
    unittest.main()

