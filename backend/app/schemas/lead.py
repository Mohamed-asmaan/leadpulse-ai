import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


_PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-().]{6,20}$")


class LeadCaptureIn(BaseModel):
    """Structured payload accepted by the Lead Capture module."""

    name: str = Field(..., min_length=1, max_length=255, description="Contact full name")
    email: EmailStr = Field(..., description="Work or personal email")
    phone: str | None = Field(
        default=None,
        max_length=64,
        description="E.164 or common national formats; optional",
    )
    company: str | None = Field(default=None, max_length=255)
    source: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Attribution: form id, campaign, partner, etc.",
    )
    context: dict[str, Any] | None = Field(
        default=None,
        description="Optional structured context from ads/forms (stored as JSON in notes).",
    )

    @field_validator("name", "source")
    @classmethod
    def strip_not_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be blank")
        return s

    @field_validator("company")
    @classmethod
    def strip_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        if not _PHONE_RE.match(s):
            raise ValueError("phone format is invalid")
        return s

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    company: str | None
    source: str
    created_at: datetime
    updated_at: datetime


class LeadDetailOut(LeadOut):
    assigned_to_id: uuid.UUID | None = None

    capture_channel: str | None = None
    raw_capture_payload: dict[str, Any] | None = None
    integrity_sha256: str | None = None

    job_title: str | None = None
    industry: str | None = None
    company_size_band: str | None = None
    company_size_estimate: int | None = None
    location_country: str | None = None
    enrichment_provider: str | None = None
    enriched_at: datetime | None = None

    fit_score: int | None = None
    intent_score: int | None = None
    predictive_score: int | None = None
    total_score: int | None = None
    tier: str | None = None
    fit_reason: str | None = None
    intent_reason: str | None = None
    predictive_reason: str | None = None
    score_summary: str | None = None
    scored_at: datetime | None = None

    first_outreach_at: datetime | None = None
    last_outreach_channel: str | None = None

    authenticity_trust: str | None = None
    bot_risk_score: int | None = None

    notes: str | None = None


class LeadListItem(LeadDetailOut):
    pass


class LeadEventIn(BaseModel):
    channel: str = Field(..., min_length=2, max_length=64)
    event_type: str = Field(..., min_length=2, max_length=64)
    payload: dict[str, Any] | None = None
    summary: str | None = Field(default=None, max_length=512)


class LeadEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    channel: str
    event_type: str
    payload: dict[str, Any] | None = None
    occurred_at: datetime
    summary: str | None = None


class LeadAssignIn(BaseModel):
    assigned_to_id: uuid.UUID | None = None


class OutreachOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    channel: str
    subject: str | None
    message: str
    status: str
    created_at: datetime


class LeadVerificationOut(BaseModel):
    """Pointers for document / QR verification UX (no secrets)."""

    profile_integrity_hash: str = Field(
        ...,
        description="Stable SHA-256 prefix derived from lead identity for audit display.",
    )
    qr_verify_paths: list[str] = Field(
        default_factory=list,
        description="Relative API paths (append to API base) for QR badge resolution.",
    )


class LeadDuplicateOut(BaseModel):
    """Returned as HTTPException detail (JSON) when a duplicate email exists."""

    reason: str = Field(..., description="Human-readable explanation")
    existing_lead_id: uuid.UUID
    matched_on: str = Field(default="email", description="Dedupe key (email-based)")
