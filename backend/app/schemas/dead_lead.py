import uuid
from datetime import datetime

from pydantic import BaseModel


class DeadLeadItemOut(BaseModel):
    lead_id: uuid.UUID
    lead_name: str
    score: int
    grade: str
    reason: str
    marked_dead_at: datetime
    revived_at: datetime | None = None


class DeadLeadSummaryOut(BaseModel):
    archived_this_month: int
    estimated_hours_saved: int
