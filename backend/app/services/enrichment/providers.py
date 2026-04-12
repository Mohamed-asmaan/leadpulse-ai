"""External enrichment with deterministic mock fallback."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _heuristic_firmographics(email: str, name: str, company: str | None) -> dict[str, Any]:
    domain = email.split("@")[-1].lower() if "@" in email else ""
    is_consumer = domain in {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"}
    est_size = 120 if not is_consumer else 15
    industry = "technology" if not is_consumer else "consumer"
    title = "Head of Operations" if not is_consumer else "Individual Contributor"
    if any(k in (company or "").lower() for k in ("bank", "capital", "finance")):
        industry = "finance"
        title = "Director of Digital Banking"
        est_size = max(est_size, 800)
    return {
        "job_title": title,
        "industry": industry,
        "company_size_band": "201-500" if est_size > 200 else "11-50",
        "company_size_estimate": est_size,
        "location_country": "US",
        "provider": "mock_heuristic",
    }


def fetch_external_profile(email: str, name: str, company: str | None) -> dict[str, Any] | None:
    url = settings.ENRICHMENT_API_URL.strip()
    if not url:
        return None
    try:
        with httpx.Client(timeout=settings.ENRICHMENT_API_TIMEOUT_SECONDS) as client:
            r = client.post(
                url,
                json={"email": email, "name": name, "company": company},
            )
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict) and data.get("job_title"):
                data["provider"] = data.get("provider", "external_api")
                return data
    except Exception as exc:  # noqa: BLE001 — enrichment must never block capture
        logger.info("External enrichment unavailable, using mock: %s", exc)
    return None


def enrich_profile(email: str, name: str, company: str | None) -> dict[str, Any]:
    ext = fetch_external_profile(email, name, company)
    if ext is not None:
        return ext
    return _heuristic_firmographics(email, name, company)
