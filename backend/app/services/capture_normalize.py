"""Normalize heterogeneous JSON (Meta/Google/custom forms) into LeadCaptureIn + passthrough extras."""

from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.schemas.lead import LeadCaptureIn

# Incoming keys often vary by vendor — map to LeadCaptureIn field names (after lower_snake).
_FIELD_ALIASES: dict[str, str] = {
    "full_name": "name",
    "mail": "email",
    "email_address": "email",
    "company_name": "company",
    "organization": "company",
    "phone_number": "phone",
    "mobile": "phone",
    "utm_source": "source",  # only if source missing — handled below
}

_LEAD_CAPTURE_FIELDS = set(LeadCaptureIn.model_fields.keys())


def _snake_key(key: str) -> str:
    return key.strip().lower().replace("-", "_")


def normalize_incoming_lead_dict(data: Any) -> tuple[LeadCaptureIn, dict[str, Any]]:
    """
    Validate a loose dict into LeadCaptureIn.

    Returns (validated_model, extras) where extras are keys not mapped to the schema
    (preserved for raw_capture_payload auditing).
    """
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    merged: dict[str, Any] = {}
    extras: dict[str, Any] = {}

    for raw_key, value in data.items():
        sk = _snake_key(str(raw_key))
        target = _FIELD_ALIASES.get(sk, sk)
        if target in _LEAD_CAPTURE_FIELDS:
            if target not in merged or merged[target] in (None, ""):
                merged[target] = value
        else:
            extras[str(raw_key)] = value

    try:
        lead = LeadCaptureIn.model_validate(merged)
    except ValidationError as exc:
        raise ValueError(json.dumps(exc.errors(), default=str)) from exc
    return lead, extras
