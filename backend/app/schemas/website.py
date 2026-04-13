import uuid

from pydantic import BaseModel, EmailStr, Field


class WebsiteLeadIn(BaseModel):
    """Public website form — secret-gated; same pipeline as webhook capture."""

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=64)
    company: str | None = Field(default=None, max_length=255)
    source: str = Field(default="website", min_length=1, max_length=128)
    landing_page: str | None = Field(default=None, max_length=2048)


class WebsiteLeadOut(BaseModel):
    ok: bool = True
    lead_id: uuid.UUID
    message: str = "Lead captured; enrichment and scoring run in the background."
