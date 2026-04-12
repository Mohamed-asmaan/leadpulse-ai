"""Lightweight authenticity heuristics and signed-metadata verification."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from app.core.config import settings
from app.models.lead import Lead

_DISPOSABLE_DOMAINS = frozenset(
    {
        "mailinator.com",
        "tempmail.com",
        "10minutemail.com",
        "guerrillamail.com",
    }
)


def apply_lead_authenticity_heuristics(lead: Lead) -> None:
    domain = lead.email.split("@")[-1].lower() if "@" in lead.email else ""
    risk = 12
    if domain in _DISPOSABLE_DOMAINS:
        risk = 78
    elif domain in {"gmail.com", "yahoo.com", "hotmail.com"}:
        risk = 28
    lead.bot_risk_score = risk
    if risk >= 60:
        lead.authenticity_trust = "low"
    elif risk >= 35:
        lead.authenticity_trust = "medium"
    else:
        lead.authenticity_trust = "high"


def _canonical_metadata_bytes(metadata: dict[str, Any]) -> bytes:
    return json.dumps(metadata, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_metadata(metadata: dict[str, Any]) -> str:
    """Server-side helper to produce a tamper-evident signature over JSON metadata."""
    body = _canonical_metadata_bytes(metadata)
    return hmac.new(settings.JWT_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()


def verify_signed_metadata(metadata: dict[str, Any], signature_hex: str) -> dict[str, Any]:
    expected = sign_metadata(metadata)
    authentic = hmac.compare_digest(expected, signature_hex.lower())
    notes = (
        "Metadata HMAC matches the server-side expectation."
        if authentic
        else "Metadata HMAC mismatch; payload may be tampered or signed with a different secret."
    )
    return {"authentic": authentic, "analysis_notes": notes, "expected_signature": expected}
