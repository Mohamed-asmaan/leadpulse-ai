"""Send HOT outreach via Resend (email) and optionally Twilio (SMS)."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _to_e164(phone: str | None) -> str | None:
    if not phone:
        return None
    raw = phone.strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 10:
        return None
    if raw.startswith("+"):
        return f"+{digits}"
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"


def send_resend_email(*, to_email: str, subject: str, text_body: str) -> tuple[bool, dict[str, Any]]:
    key = (settings.RESEND_API_KEY or "").strip()
    from_addr = (settings.RESEND_FROM_EMAIL or "").strip()
    if not key or not from_addr:
        return False, {"skipped": True, "reason": "RESEND_API_KEY or RESEND_FROM_EMAIL not configured"}

    try:
        with httpx.Client(timeout=12.0) as client:
            r = client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"from": from_addr, "to": [to_email], "subject": subject, "text": text_body},
            )
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            if r.is_success:
                return True, {"provider": "resend", "id": data.get("id"), "status": r.status_code}
            return False, {"provider": "resend", "status": r.status_code, "error": data or r.text[:500]}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Resend send failed: %s", exc)
        return False, {"provider": "resend", "error": str(exc)}


def send_twilio_sms(*, to_e164: str, body: str) -> tuple[bool, dict[str, Any]]:
    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    from_num = (settings.TWILIO_FROM_NUMBER or "").strip()
    if not sid or not token or not from_num:
        return False, {"skipped": True, "reason": "Twilio credentials not configured"}

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                url,
                data={"From": from_num, "To": to_e164, "Body": body[:1500]},
                auth=(sid, token),
            )
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            if r.is_success:
                return True, {"provider": "twilio", "sid": data.get("sid"), "status": r.status_code}
            return False, {"provider": "twilio", "status": r.status_code, "error": data or r.text[:500]}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Twilio SMS failed: %s", exc)
        return False, {"provider": "twilio", "error": str(exc)}
