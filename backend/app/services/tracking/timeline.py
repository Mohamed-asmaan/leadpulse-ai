"""Append-only unified behavioral timeline."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.lead_event import LeadEvent


def log_event(
    db: Session,
    *,
    lead_id: UUID,
    channel: str,
    event_type: str,
    payload: dict[str, Any] | None = None,
    summary: str | None = None,
    occurred_at: datetime | None = None,
) -> LeadEvent:
    ev = LeadEvent(
        lead_id=lead_id,
        channel=channel,
        event_type=event_type,
        payload=payload,
        summary=summary,
        occurred_at=occurred_at or datetime.now(timezone.utc),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def list_timeline(db: Session, lead_id: UUID, limit: int = 200, *, ascending: bool = True) -> list[LeadEvent]:
    q = db.query(LeadEvent).filter(LeadEvent.lead_id == lead_id)
    q = q.order_by(LeadEvent.occurred_at.asc() if ascending else LeadEvent.occurred_at.desc())
    return q.limit(limit).all()
