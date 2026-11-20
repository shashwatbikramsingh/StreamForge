"""
StreamForge — Unit Tests for Configuration Settings
Specification: streamforge_docs/architecture.md & RULES.md
"""

import pytest
from streamforge.config.settings import Settings


def test_default_settings():
    """Verify default settings values for local KRaft development."""
    settings = Settings()
    assert settings.environment == "development"
    assert settings.kafka_bootstrap_servers == "localhost:9092"
    assert settings.kafka_topic_rides == "streamforge.rides.v1"
    assert settings.kafka_enable_auto_commit is False
    assert settings.postgres_port == 5432
    assert "postgresql://" in settings.postgres_dsn


def test_custom_settings_override():
    """Verify settings can be overridden with valid custom values."""
    settings = Settings(
        environment="staging",
        kafka_bootstrap_servers="kafka1:9092,kafka2:9092",
        postgres_port=5433,
        producer_target_rate_eps=1200,
    )
    assert settings.environment == "staging"
    assert settings.kafka_bootstrap_servers == "kafka1:9092,kafka2:9092"
    assert settings.postgres_port == 5433
    assert settings.producer_target_rate_eps == 1200


def test_invalid_environment_rejected():
    """Verify invalid environment name raises ValueError."""
    with pytest.raises(ValueError):
        Settings(environment="invalid_env")


def test_invalid_port_range_rejected():
    """Verify out-of-range port numbers raise ValueError."""
    with pytest.raises(ValueError):
        Settings(postgres_port=80)  # Port < 1024 forbidden
