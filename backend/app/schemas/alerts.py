import uuid
from datetime import datetime

from pydantic import BaseModel


class LeadAlertOut(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    lead_name: str
    assigned_to_id: uuid.UUID | None = None
    triggered_at: datetime
    responded_at: datetime | None = None
    escalated: bool
    trigger_reason: str
    elapsed_seconds: int


class LeadAlertStatsItemOut(BaseModel):
    user_id: uuid.UUID
    user_name: str
    avg_response_seconds: float | None
    responded_count: int
