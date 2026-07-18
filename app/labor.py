"""Live BLS wage lookup over the bundled labor snapshot.

The bundled snapshot (frontend lib/labor.js + the labor RAG corpus) carries
approximate wages; this fetches the *current* OEWS national median wage for an
occupation straight from the free BLS Public Data API (no key) when the network
allows, and degrades silently to the snapshot otherwise.

Stateless-server hygiene: the public (keyless) API is rate-limited per IP, so we
@lru_cache per SOC — there are only a few dozen occupations, so a worker makes at
most that many distinct calls in its lifetime, and repeats are free.
"""
from __future__ import annotations

import re
from functools import lru_cache

import httpx

_BLS = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def _soc6(soc: str | None) -> str | None:
    """'15-1252' -> '151252' (OEWS occupation code). None if not 6 digits."""
    digits = re.sub(r"\D", "", soc or "")
    return digits[:6] if len(digits) >= 6 else None


@lru_cache(maxsize=256)
def bls_median_wage(soc: str) -> dict | None:
    """Current OEWS national annual median wage for a SOC, or None on any failure.

    OEWS series id: OEU + N(national) + 0000000(area) + 000000(industry) +
    <6-digit SOC> + 13(datatype: annual median wage).
    """
    s6 = _soc6(soc)
    if not s6:
        return None
    series = f"OEUN{'0' * 13}{s6}13"
    try:
        r = httpx.get(_BLS + series, timeout=8.0)
        r.raise_for_status()
        ser = (r.json().get("Results", {}).get("series") or [{}])[0]
        pts = ser.get("data") or []
        if not pts:
            return None
        p = pts[0]
        return {"wage": int(float(p["value"])), "year": p.get("year"), "source": "BLS OEWS"}
    except Exception as exc:  # noqa: BLE001 — caller falls back to the snapshot
        print(f"[bls] {soc} wage lookup failed ({type(exc).__name__}): {str(exc)[:120]}")
        return None
