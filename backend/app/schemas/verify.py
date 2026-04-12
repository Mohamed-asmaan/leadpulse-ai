from typing import Any

from pydantic import BaseModel, Field


class DocumentVerifyIn(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)
    signature_hex: str = Field(..., min_length=32, max_length=128)


class DocumentVerifyOut(BaseModel):
    authentic: bool
    analysis_notes: str
    expected_signature: str


class QRPayloadOut(BaseModel):
    valid: bool
    badge_type: str | None = None
    tier: str | None = None
    issued_at: str | None = None
    total_score: int | None = None
    industry: str | None = None
    contact_initial: str | None = Field(
        default=None,
        description="Redacted contact hint for verification pages (e.g. J. from Acme).",
    )
    verification_message: str | None = None
