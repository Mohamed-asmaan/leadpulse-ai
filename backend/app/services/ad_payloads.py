"""Unwrap Meta Lead Ads and Google Ads lead-form style JSON into flat dicts for LeadCaptureIn."""

from __future__ import annotations

from typing import Any


def _meta_field_map(field_data: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for fd in field_data:
        name = str(fd.get("name") or "").strip().lower().replace(" ", "_")
        vals = fd.get("values") or []
        if not name or not vals:
            continue
        val = vals[0]
        if val in (None, ""):
            continue
        out[name] = val
    return out


def unwrap_meta_leadgen(body: dict[str, Any]) -> dict[str, Any] | None:
    """
    Facebook / Instagram Lead Ads delivery (Graph webhook shape).
    https://developers.facebook.com/docs/marketing-api/guides/lead-ads
    """
    try:
        entries = body.get("entry")
        if not isinstance(entries, list):
            return None
        for entry in entries:
            changes = entry.get("changes") if isinstance(entry, dict) else None
            if not isinstance(changes, list):
                continue
            for ch in changes:
                if not isinstance(ch, dict):
                    continue
                value = ch.get("value")
                if not isinstance(value, dict):
                    continue
                fd = value.get("field_data")
                if not isinstance(fd, list):
                    continue
                flat = _meta_field_map(fd)
                if not flat:
                    continue
                merged: dict[str, Any] = {"source": "meta_ads_lead"}
                email = flat.get("email") or flat.get("work_email")
                if email:
                    merged["email"] = email
                fn = flat.get("first_name") or flat.get("first name")
                ln = flat.get("last_name") or flat.get("last name")
                full = flat.get("full_name") or flat.get("full name")
                if full:
                    merged["name"] = str(full).strip()
                elif fn or ln:
                    merged["name"] = f"{fn or ''} {ln or ''}".strip()
                if "phone_number" in flat:
                    merged["phone"] = flat["phone_number"]
                elif "phone" in flat:
                    merged["phone"] = flat["phone"]
                if "company_name" in flat:
                    merged["company"] = flat["company_name"]
                elif "company" in flat:
                    merged["company"] = flat["company"]
                merged["context"] = {"meta_leadgen": {k: flat[k] for k in list(flat)[:30]}}
                if merged.get("email") and merged.get("name"):
                    return merged
    except (TypeError, ValueError, KeyError, AttributeError, IndexError):
        return None
    return None


def _google_columns_to_flat(cols: list[dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    raw: dict[str, Any] = {}
    for col in cols:
        if not isinstance(col, dict):
            continue
        cid = str(col.get("column_id") or col.get("column_name") or "").upper()
        val = col.get("string_value")
        if val is None:
            val = col.get("boolean_value")
        if val is None:
            val = col.get("number_value")
        if val in (None, ""):
            continue
        raw[cid] = val
        if cid in {"FULL_NAME", "FULL NAME"}:
            merged["name"] = str(val).strip()
        elif cid in {"FIRST_NAME", "FIRST NAME"}:
            merged["_first"] = str(val).strip()
        elif cid in {"LAST_NAME", "LAST NAME"}:
            merged["_last"] = str(val).strip()
        elif cid in {"EMAIL", "WORK_EMAIL", "WORK EMAIL", "USER_EMAIL"}:
            merged["email"] = str(val).strip().lower()
        elif cid in {"PHONE_NUMBER", "PHONE", "PHONE_NUMBER_LE"}:
            merged["phone"] = str(val).strip()
        elif cid in {"COMPANY_NAME", "COMPANY", "COMPANY_NAME_LE"}:
            merged["company"] = str(val).strip()
    if "_first" in merged or "_last" in merged:
        fn = merged.pop("_first", "")
        ln = merged.pop("_last", "")
        combo = f"{fn} {ln}".strip()
        if combo and not merged.get("name"):
            merged["name"] = combo
    merged["context"] = {"google_ads_lead_form": raw}
    return merged


def unwrap_google_lead_form(body: dict[str, Any]) -> dict[str, Any] | None:
    """Google Ads Lead Form Extension webhook style."""
    root = body.get("lead") if isinstance(body.get("lead"), dict) else body
    if not isinstance(root, dict):
        return None
    cols = root.get("user_column_data")
    if not isinstance(cols, list):
        return None
    flat = _google_columns_to_flat(cols)
    flat.setdefault("source", "google_ads_lead")
    if flat.get("email") and flat.get("name"):
        return flat
    return None


def try_unwrap_ad_platform(body: dict[str, Any]) -> tuple[dict[str, Any], str] | None:
    """
    If body matches a known ads vendor, return (flattened_lead_dict, vendor_tag).
    """
    m = unwrap_meta_leadgen(body)
    if m:
        return m, "meta_leadgen"
    g = unwrap_google_lead_form(body)
    if g:
        return g, "google_lead_form"
    return None
