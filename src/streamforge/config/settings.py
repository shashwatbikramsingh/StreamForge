"""
StreamForge — Centralized Settings & Environment Validation
Specification: streamforge_docs/architecture.md, RULES.md, and ADR 0001
"""

import os
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class Settings(BaseModel):
    """
    Typed centralized settings with validation and safe defaults for local KRaft dev.
    """
    # Environment
    environment: str = Field(default="development", description="Runtime environment (development, staging, production)")
    log_level: str = Field(default="INFO", description="Standard logging level")

    # Kafka Broker Configuration (ADR 0001: KRaft mode)
    kafka_bootstrap_servers: str = Field(default="localhost:9092", description="Kafka bootstrap broker list")
    kafka_topic_rides: str = Field(default="streamforge.rides.v1", description="Primary ride event stream topic")
    kafka_topic_dlq: str = Field(default="streamforge.dlq.v1", description="Dead-letter quarantine topic")
    kafka_consumer_group: str = Field(default="streamforge-consumer-group", description="Consumer group ID")
    kafka_enable_auto_commit: bool = Field(default=False, description="Explicit manual offset commit required per ADR 0001")

    # PostgreSQL Database Configuration
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432, ge=1024, le=65535)
    postgres_db: str = Field(default="streamforge")
    postgres_user: str = Field(default="postgres")
    postgres_password: str = Field(default="postgres")
    postgres_min_connections: int = Field(default=2, ge=1)
    postgres_max_connections: int = Field(default=10, ge=2)

    # FastAPI Read API Configuration
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000, ge=1024, le=65535)

    # Event Producer Configuration
    producer_target_rate_eps: int = Field(default=50, ge=1, le=100000, description="Target synthetic events per second")

    @field_validator("environment")
    @classmethod
    def validate_env_name(cls, v: str) -> str:
        allowed = {"development", "test", "staging", "production"}
        if v.lower() not in allowed:
            raise ValueError(f"Environment must be one of {allowed}, got '{v}'")
        return v.lower()

    @property
    def postgres_dsn(self) -> str:
        """Construct PostgreSQL connection string."""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from current environment variables."""
        return cls(
            environment=os.getenv("STREAMFORGE_ENV", "development"),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            kafka_bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            kafka_topic_rides=os.getenv("KAFKA_TOPIC_RIDES", "streamforge.rides.v1"),
            kafka_topic_dlq=os.getenv("KAFKA_TOPIC_DLQ", "streamforge.dlq.v1"),
            kafka_consumer_group=os.getenv("KAFKA_CONSUMER_GROUP", "streamforge-consumer-group"),
            postgres_host=os.getenv("POSTGRES_HOST", "localhost"),
            postgres_port=int(os.getenv("POSTGRES_PORT", "5432")),
            postgres_db=os.getenv("POSTGRES_DB", "streamforge"),
            postgres_user=os.getenv("POSTGRES_USER", "postgres"),
            postgres_password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            api_host=os.getenv("API_HOST", "0.0.0.0"),
            api_port=int(os.getenv("API_PORT", "8000")),
            producer_target_rate_eps=int(os.getenv("PRODUCER_TARGET_RATE_EPS", "50")),
        )


_cached_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Singleton provider for validated application settings."""
    global _cached_settings
    if _cached_settings is None:
        _cached_settings = Settings.from_env()
    return _cached_settings
