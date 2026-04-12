from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PublicTrackEventIn(BaseModel):
    lead_id: UUID
    channel: str = Field(..., min_length=1, max_length=64, description="e.g. web, email, ads")
    event_type: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="page_visit, form_submit, email_open, email_click, reply, meeting_booked, …",
    )
    payload: dict[str, Any] | None = None
    summary: str | None = Field(default=None, max_length=512)


class PublicTrackEventOut(BaseModel):
    ok: bool
    event_id: UUID
    recomputed_score: int | None = None
    tier: str | None = None
