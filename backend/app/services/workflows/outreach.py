"""Hot-lead automated outreach with templated personalization (AI-style messaging)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.outreach_log import OutreachLog
from app.services.tracking.timeline import log_event as log_timeline_event


def _first_name(full: str) -> str:
    parts = full.strip().split()
    return parts[0] if parts else "there"


def build_personalized_email(lead: Lead) -> tuple[str, str]:
    fn = _first_name(lead.name)
    industry = (lead.industry or "your market").title()
    title = lead.job_title or "team leader"
    company = lead.company or "your organization"
    subject = f"{fn}, faster follow-ups for {industry} teams"
    body = (
        f"Hi {fn},\n\n"
        f"Given your role as {title} at {company}, we built LeadPulse AI to remove the response gap "
        f"that hurts conversions in {industry}. If you want replies in seconds instead of days, "
        f"reply YES and we’ll share a 2-minute walkthrough.\n\n"
        f"— LeadPulse AI"
    )
    return subject, body


def trigger_hot_outreach(db: Session, lead: Lead) -> OutreachLog | None:
    if (lead.tier or "") != "hot":
        return None
    if lead.first_outreach_at is not None:
        return None

    subject, message = build_personalized_email(lead)
    log = OutreachLog(
        lead_id=lead.id,
        channel="email",
        subject=subject,
        message=message,
        status="sent",
    )
    db.add(log)
    lead.first_outreach_at = datetime.now(timezone.utc)
    lead.last_outreach_channel = "email"
    db.commit()
    db.refresh(log)

    log_timeline_event(
        db,
        lead_id=lead.id,
        channel="email",
        event_type="outreach_sent",
        payload={"outreach_id": str(log.id), "subject": subject},
        summary="Automated outreach dispatched for HOT lead",
    )
    return log
