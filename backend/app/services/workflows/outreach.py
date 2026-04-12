"""Automation: HOT immediate outreach, WARM nurture queue, COLD low-priority bucket."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
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
    if lead.total_score is None or lead.total_score < settings.HOT_SCORE_MIN:
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
        event_type="email_sent",
        payload={"outreach_id": str(log.id), "subject": subject, "tier": "hot"},
        summary="Automated HOT outreach dispatched (email channel — configure SMTP/Resend to deliver externally)",
    )
    return log


def trigger_nurture_for_warm(db: Session, lead: Lead) -> OutreachLog | None:
    """Score 50–79: single nurture touch (logged; no duplicate if already nurtured)."""
    tier = (lead.tier or "").lower()
    if tier != "warm":
        return None
    exists = (
        db.query(OutreachLog)
        .filter(OutreachLog.lead_id == lead.id, OutreachLog.status == "nurture_scheduled")
        .first()
    )
    if exists:
        return exists

    fn = _first_name(lead.name)
    subject = f"{fn}, quick ideas for {lead.company or 'your team'}"
    message = (
        f"Hi {fn},\n\n"
        f"We queued a nurture sequence because your profile scored in the WARM band "
        f"({lead.total_score}/100). Reply if you want a tailored walkthrough.\n\n"
        f"— LeadPulse AI"
    )
    log = OutreachLog(
        lead_id=lead.id,
        channel="email",
        subject=subject,
        message=message,
        status="nurture_scheduled",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    log_timeline_event(
        db,
        lead_id=lead.id,
        channel="system",
        event_type="nurture_marked",
        payload={"outreach_id": str(log.id), "tier": "warm"},
        summary="WARM nurture track scheduled (single-touch automation)",
    )
    return log


def trigger_cold_bucket(db: Session, lead: Lead) -> None:
    if (lead.tier or "").lower() != "cold":
        return
    log_timeline_event(
        db,
        lead_id=lead.id,
        channel="system",
        event_type="low_priority_bucket",
        payload={"total_score": lead.total_score},
        summary="COLD tier — no automated email; revisit during digest campaigns",
    )


def run_automation_for_lead(db: Session, lead: Lead) -> None:
    tier = (lead.tier or "cold").lower()
    if tier == "hot":
        trigger_hot_outreach(db, lead)
    elif tier == "warm":
        trigger_nurture_for_warm(db, lead)
    else:
        trigger_cold_bucket(db, lead)
