#!/usr/bin/env python
"""Build the ESCO crosswalk → app/knowledge/esco_crosswalk.jsonl.

For each occupation in the bundled O*NET labor corpus, query the public ESCO API
for the matching ESCO occupation + its essential skills, and write a crosswalk row
{onet_soc, title, esco_uri, esco_title, skills[]}. Free, no key, commercial-OK —
adds richer skill matching + i18n on top of O*NET.

Run on demand:  python scripts/refresh_esco.py
ESCO API: https://ec.europa.eu/esco/api  ·  Downloads: https://esco.ec.europa.eu/en/use-esco/download
"""
from __future__ import annotations

import json
import pathlib
import time

import httpx

ROOT = pathlib.Path(__file__).resolve().parents[1]
LABOR = ROOT / "app/knowledge/labor_data.jsonl"
OUT = ROOT / "app/knowledge/esco_crosswalk.jsonl"
API = "https://ec.europa.eu/esco/api"


def _search(title: str):
    r = httpx.get(f"{API}/search",
                  params={"text": title, "type": "occupation", "language": "en", "limit": 1}, timeout=15.0)
    if r.status_code >= 400:
        return None
    results = (r.json().get("_embedded", {}) or {}).get("results", [])
    return results[0] if results else None


def _skills(uri: str) -> list:
    r = httpx.get(f"{API}/resource/occupation", params={"uri": uri, "language": "en"}, timeout=15.0)
    if r.status_code >= 400:
        return []
    links = (r.json().get("_links", {}) or {}).get("hasEssentialSkill", []) or []
    return [s.get("title") for s in links if s.get("title")][:15]


def main() -> None:
    rows = [json.loads(line) for line in LABOR.read_text().splitlines() if line.strip()]
    n = 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        for occ in rows:
            title, soc = occ.get("title"), occ.get("soc")
            if not title:
                continue
            hit = _search(title)
            if not hit:
                continue
            uri = hit.get("uri")
            f.write(json.dumps({
                "onet_soc": soc, "title": title, "esco_uri": uri,
                "esco_title": hit.get("title"), "skills": _skills(uri) if uri else [],
            }) + "\n")
            n += 1
            time.sleep(0.3)  # be polite to the public API
    print(f"wrote {n} crosswalk rows → {OUT}")


if __name__ == "__main__":
    main()
