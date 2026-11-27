"""
Unit tests for decoupled stage timing instrumentation.
Verifies that StreamProcessor and StreamConsumerWorker record accurate,
decoupled stage timings without altering ProcessResult contracts.
"""

import json
from unittest.mock import MagicMock
from streamforge.consumer.worker import StreamConsumerWorker, StageTiming
from streamforge.processor.engine import StreamProcessor, ProcessResult
from streamforge.storage.repository import EventPersistenceResult, InMemoryRepository
from streamforge.producer.generator import RideEventGenerator


def test_stage_timing_dataclass_fields():
    """Verify StageTiming structure and field types."""
    timing = StageTiming(
        poll_ms=0.5,
        validation_ms=1.2,
        db_persist_ms=4.3,
        offset_commit_ms=2.1,
        total_processing_ms=8.1,
    )
    assert timing.poll_ms == 0.5
    assert timing.validation_ms == 1.2
    assert timing.db_persist_ms == 4.3
    assert timing.offset_commit_ms == 2.1
    assert timing.total_processing_ms == 8.1


def test_processor_records_stage_breakdown():
    """Verify StreamProcessor records validation_ms and db_persist_ms separately."""
    generator = RideEventGenerator(seed=42)
    sample_event = generator.generate_full_ride_lifecycle("RIDE-STAGE-001")[0].model_dump(mode="json")

    mock_repo = MagicMock()
    mock_repo.persist_event_and_projection.return_value = EventPersistenceResult(status="accepted")

    processor = StreamProcessor(repository=mock_repo)
    result = processor.process_raw_message(raw_message=sample_event)

    assert result.status == "accepted"
    # Ensure ProcessResult has not been polluted with stage timing fields
    assert not hasattr(result, "validation_ms")
    assert not hasattr(result, "db_persist_ms")

    # Ensure processor tracked the timing metrics
    assert isinstance(processor.last_validation_ms, float)
    assert isinstance(processor.last_db_persist_ms, float)
    assert processor.last_validation_ms >= 0.0
    assert processor.last_db_persist_ms >= 0.0
    mock_repo.persist_event_and_projection.assert_called_once()


def test_consumer_worker_populates_last_stage_timing():
    """Verify StreamConsumerWorker populates last_stage_timing on successful processing in dry-run mode."""
    generator = RideEventGenerator(seed=42)
    sample_event = generator.generate_full_ride_lifecycle("RIDE-STAGE-002")[0].model_dump(mode="json")

    mock_repo = MagicMock()
    mock_repo.persist_event_and_projection.return_value = EventPersistenceResult(status="accepted")
    processor = StreamProcessor(repository=mock_repo)

    worker = StreamConsumerWorker(
        processor=processor,
        topic="test-topic",
        dry_run=True,
    )
    assert worker.last_stage_timing is None

    payload_bytes = json.dumps(sample_event).encode("utf-8")
    worker.inject_mock_message(payload_bytes=payload_bytes, partition=0, offset=42)

    result = worker.poll_and_process()
    assert result is not None
    assert result.status == "accepted"

    # Verify StageTiming populated on worker
    timing = worker.last_stage_timing
    assert timing is not None
    assert isinstance(timing, StageTiming)
    assert timing.poll_ms >= 0.0
    assert timing.validation_ms >= 0.0
    assert timing.db_persist_ms >= 0.0
    assert timing.offset_commit_ms >= 0.0
    assert timing.total_processing_ms >= 0.0
    assert worker.messages_committed == 1


def test_consumer_worker_timing_on_dlq_quarantine():
    """Verify timing is recorded even when an invalid message is quarantined to DLQ."""
    mock_repo = MagicMock()
    mock_repo.insert_dead_letter.return_value = "DLQ-000001"
    processor = StreamProcessor(repository=mock_repo)

    worker = StreamConsumerWorker(
        processor=processor,
        topic="test-topic",
        dry_run=True,
    )

    invalid_payload = {"event_id": "EVT-BAD", "event_type": "INVALID_TYPE"}
    payload_bytes = json.dumps(invalid_payload).encode("utf-8")
    worker.inject_mock_message(payload_bytes=payload_bytes, partition=0, offset=99)

    result = worker.poll_and_process()
    assert result is not None
    assert result.status == "quarantined"

    timing = worker.last_stage_timing
    assert timing is not None
    assert isinstance(timing, StageTiming)
    assert timing.validation_ms >= 0.0
    assert timing.db_persist_ms >= 0.0
    assert worker.messages_committed == 1
