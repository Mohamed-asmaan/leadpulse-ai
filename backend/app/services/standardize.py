"""Normalize categorical geography strings for downstream ML consistency."""

_COUNTRY_ALIASES: dict[str, str] = {
    "usa": "US",
    "u.s.": "US",
    "u.s.a.": "US",
    "us": "US",
    "united states": "US",
    "united states of america": "US",
    "america": "US",
    "uk": "GB",
    "u.k.": "GB",
    "united kingdom": "GB",
    "great britain": "GB",
    "england": "GB",
    "deutschland": "DE",
    "germany": "DE",
    "france": "FR",
    "india": "IN",
    "canada": "CA",
    "australia": "AU",
    "singapore": "SG",
    "uae": "AE",
    "united arab emirates": "AE",
}


def standardize_country(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower()
    if len(key) == 2 and key.isalpha():
        return key.upper()
    return _COUNTRY_ALIASES.get(key, raw.strip()[:8].upper())


def standardize_industry(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().lower()
    if not s:
        return None
    return s.replace("&", "and").replace("  ", " ")
