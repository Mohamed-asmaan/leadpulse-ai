"""Deterministic simulated engagement events for explainable scoring (no paid APIs)."""

from __future__ import annotations

import hashlib
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.services.tracking.timeline import log_event

_CONSUMER = frozenset(
    {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"}
)


def seed_synthetic_engagement_events(db: Session, lead: Lead) -> None:
    """
    Append timeline rows that represent opens/clicks used only by the engagement scorer.
    Deterministic from email hash so the same lead reproduces the same demo trajectory.
    """
    dom = lead.email.split("@", 1)[1].lower() if "@" in lead.email else ""
    h = int(hashlib.sha256(lead.email.encode("utf-8")).hexdigest()[:8], 16)
    base_opens = 1 + (h % 3)  # 1–3
    base_clicks = min(2, (h >> 3) % 3)
    if dom and dom not in _CONSUMER:
        base_opens += 1
    lid: UUID = lead.id
    for i in range(min(base_opens, 4)):
        log_event(
            db,
            lead_id=lid,
            channel="email",
            event_type="email_open",
            payload={"simulated": True, "seq": i, "model": "engagement_proxy"},
            summary="Simulated inbox engagement (open) — used for engagement score only",
        )
    for i in range(min(base_clicks, 3)):
        log_event(
            db,
            lead_id=lid,
            channel="email",
            event_type="email_click",
            payload={"simulated": True, "seq": i, "model": "engagement_proxy"},
            summary="Simulated content click — used for engagement score only",
        )
