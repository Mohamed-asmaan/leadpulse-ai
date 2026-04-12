"""Lead Capture: validation, email-based dedupe, immutable raw payload + integrity hash."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.schemas.lead import LeadCaptureIn


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 7:
        return None
    return digits


def find_duplicate_lead(db: Session, payload: LeadCaptureIn) -> Lead | None:
    """Return existing lead if normalized email already exists (email-based dedupe)."""
    email = normalize_email(str(payload.email))
    return db.query(Lead).filter(Lead.email == email).one_or_none()


def _canonical_capture_dict(payload: LeadCaptureIn) -> dict[str, Any]:
    """Stable dict for SHA-256 (order-independent via sorted JSON)."""
    return {
        "name": payload.name.strip(),
        "email": normalize_email(str(payload.email)),
        "phone": payload.phone,
        "company": payload.company,
        "source": payload.source.strip(),
        "context": payload.context,
    }


def compute_capture_integrity(payload: LeadCaptureIn) -> str:
    body = json.dumps(_canonical_capture_dict(payload), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def build_raw_capture_payload(
    *,
    capture_channel: str,
    validated: LeadCaptureIn,
    extras: dict[str, Any] | None,
) -> dict[str, Any]:
    received_at = datetime.now(timezone.utc).isoformat()
    return {
        "received_at": received_at,
        "capture_channel": capture_channel,
        "validated_body": validated.model_dump(mode="json"),
        "vendor_extras": extras or {},
    }


def create_lead(
    db: Session,
    payload: LeadCaptureIn,
    *,
    capture_channel: str,
    extras: dict[str, Any] | None = None,
) -> Lead:
    email = normalize_email(str(payload.email))
    phone_norm = normalize_phone(payload.phone)
    notes = json.dumps(payload.context, separators=(",", ":"), sort_keys=True) if payload.context else None
    raw = build_raw_capture_payload(
        capture_channel=capture_channel,
        validated=payload,
        extras=extras,
    )
    digest = compute_capture_integrity(payload)
    lead = Lead(
        name=payload.name,
        email=email,
        phone=payload.phone,
        phone_normalized=phone_norm,
        company=payload.company,
        source=payload.source,
        notes=notes,
        capture_channel=capture_channel,
        raw_capture_payload=raw,
        integrity_sha256=digest,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead_by_id(db: Session, lead_id: UUID) -> Lead | None:
    return db.query(Lead).filter(Lead.id == lead_id).one_or_none()
