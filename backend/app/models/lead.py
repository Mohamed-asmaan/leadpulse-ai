import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    phone_normalized: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    capture_channel: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="api", index=True
    )  # api | webhook
    raw_capture_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    integrity_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    assignee = relationship("User", foreign_keys=[assigned_to_id])

    # Enrichment (Step 2)
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    company_size_band: Mapped[str | None] = mapped_column(String(64), nullable=True)
    company_size_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location_country: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    enrichment_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Scoring + XAI (Step 3)
    fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intent_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    predictive_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_score: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tier: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)  # hot | warm | cold
    fit_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    predictive_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    score_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    scored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Workflow (Step 4)
    first_outreach_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_outreach_channel: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Verification / risk (Step 5)
    authenticity_trust: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bot_risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
