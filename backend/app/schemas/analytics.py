from pydantic import BaseModel


class FunnelMetricsOut(BaseModel):
    total_leads: int
    hot: int
    warm: int
    cold: int
    avg_response_seconds: float | None
    conversion_proxy_rate: float | None
