import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LeadScore(Base):
    __tablename__ = "lead_scores"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    grade: Mapped[str] = mapped_column(String(1), nullable=False, default="D", index=True)
    score_reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    last_calculated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    is_dead: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
