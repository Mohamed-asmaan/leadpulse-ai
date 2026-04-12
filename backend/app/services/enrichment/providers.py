"""Enrichment: Hunter.io + Clearbit + custom HTTP + deterministic heuristic fallback."""

from __future__ import annotations

import logging
import re
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


def _employees_to_band(employees: int | None) -> tuple[str | None, int | None]:
    if employees is None or employees <= 0:
        return None, None
    n = int(employees)
    if n <= 10:
        return "1-10", n
    if n <= 50:
        return "11-50", n
    if n <= 200:
        return "51-200", n
    if n <= 500:
        return "201-500", n
    if n <= 1000:
        return "501-1000", n
    if n <= 5000:
        return "1001-5000", n
    return "5000+", n


def _parse_hunter_company_size(raw: str | None) -> tuple[str | None, int | None]:
    if not raw:
        return None, None
    s = str(raw).strip().lower().replace(" ", "")
    m = re.match(r"(\d+)\s*-\s*(\d+)", s)
    if m:
        lo, hi = int(m.group(1)), int(m.group(2))
        mid = (lo + hi) // 2
        return str(raw), mid
    m2 = re.match(r"(\d+)\+", s)
    if m2:
        lo = int(m2.group(1))
        return str(raw), int(lo * 1.15)
    return str(raw), None


def fetch_hunter_profile(email: str, name: str, company: str | None) -> dict[str, Any] | None:
    key = settings.HUNTER_API_KEY.strip()
    if not key or "@" not in email:
        return None
    domain = email.split("@")[-1].lower()
    parts = name.strip().split()
    first = parts[0] if parts else "Unknown"
    last = " ".join(parts[1:]) if len(parts) > 1 else ""
    params: dict[str, Any] = {
        "api_key": key,
        "domain": domain,
        "first_name": first,
        "last_name": last,
    }
    if company:
        params["company"] = company
    try:
        with httpx.Client(timeout=max(settings.ENRICHMENT_API_TIMEOUT_SECONDS, 1.5)) as client:
            r = client.get("https://api.hunter.io/v2/email-finder", params=params)
            if not r.is_success:
                logger.info("Hunter email-finder non-success: %s %s", r.status_code, r.text[:200])
                return None
            payload = r.json()
            data = payload.get("data") if isinstance(payload, dict) else None
            if not isinstance(data, dict) or not data.get("email"):
                return None
            band, est = _parse_hunter_company_size(data.get("company_size"))
            if est is None and data.get("company_size"):
                band = str(data.get("company_size"))
            return {
                "job_title": (data.get("position") or data.get("title") or "").strip() or None,
                "industry": (data.get("industry") or "").strip() or None,
                "company_size_band": band,
                "company_size_estimate": est,
                "location_country": (data.get("country") or data.get("country_code") or "US"),
                "provider": "hunter.io",
            }
    except Exception as exc:  # noqa: BLE001
        logger.info("Hunter enrichment failed: %s", exc)
        return None


def fetch_clearbit_profile(email: str) -> dict[str, Any] | None:
    key = settings.CLEARBIT_API_KEY.strip()
    if not key:
        return None
    try:
        with httpx.Client(timeout=max(settings.ENRICHMENT_API_TIMEOUT_SECONDS, 2.0)) as client:
            r = client.get(
                "https://person.clearbit.com/v2/combined/find",
                params={"email": email},
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code in (404, 422):
                return None
            if not r.is_success:
                logger.info("Clearbit combined non-success: %s", r.status_code)
                return None
            data = r.json()
            if not isinstance(data, dict):
                return None
            person = data.get("person") if isinstance(data.get("person"), dict) else {}
            company = data.get("company") if isinstance(data.get("company"), dict) else {}
            metrics = company.get("metrics") if isinstance(company.get("metrics"), dict) else {}
            category = company.get("category") if isinstance(company.get("category"), dict) else {}
            emp = metrics.get("employees")
            try:
                emp_i = int(emp) if emp is not None else None
            except (TypeError, ValueError):
                emp_i = None
            band, est = _employees_to_band(emp_i)
            title = (person.get("title") or person.get("role") or "").strip() or None
            ind = (category.get("industry") or company.get("sector") or "").strip() or None
            geo = person.get("geo") if isinstance(person.get("geo"), dict) else {}
            country = str(geo.get("country") or geo.get("countryCode") or "US")[:8]
            return {
                "job_title": title,
                "industry": ind,
                "company_size_band": band,
                "company_size_estimate": est,
                "location_country": country,
                "provider": "clearbit.com",
            }
    except Exception as exc:  # noqa: BLE001
        logger.info("Clearbit enrichment failed: %s", exc)
        return None


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
    except Exception as exc:  # noqa: BLE001
        logger.info("External enrichment unavailable: %s", exc)
    return None


def _merge_overlay(base: dict[str, Any], overlay: dict[str, Any] | None) -> None:
    if not overlay:
        return
    for k, v in overlay.items():
        if k == "provider":
            continue
        if v in (None, "", 0):
            continue
        base[k] = v


def enrich_profile(email: str, name: str, company: str | None) -> dict[str, Any]:
    base = _heuristic_firmographics(email, name, company)
    providers_used: list[str] = []

    hunter = fetch_hunter_profile(email, name, company)
    if hunter:
        _merge_overlay(base, hunter)
        providers_used.append("hunter")

    clearbit = fetch_clearbit_profile(email)
    if clearbit:
        _merge_overlay(base, clearbit)
        providers_used.append("clearbit")

    custom = fetch_external_profile(email, name, company)
    if custom:
        _merge_overlay(base, custom)
        providers_used.append(custom.get("provider") or "external_api")

    if providers_used:
        base["provider"] = "+".join(dict.fromkeys(providers_used))
    return base
