"""Fetch open therapy-framework documents for RAG → data/raw/frameworks/.

Only sources whose terms permit free download for clinical/personal/internal
use. We cache for INTERNAL retrieval grounding — not for redistribution.

  CCI (Centre for Clinical Interventions, WA Health) — CBT/BA workbooks, free
  WHO mhGAP intervention guide v2 — CC BY-NC-SA 3.0 IGO
  NICE guidance pages — UK OGL-adjacent terms permit personal/internal use

DBT/ACT/MI primary manuals are COPYRIGHTED books — we do not pirate them.
Instead, structured technique summaries live in data/raw/frameworks/curated/
(authored in-repo, citing primary sources).

Run:  .venv/bin/python scripts/ingest/fetch_frameworks.py
"""
from __future__ import annotations

import json
import time
from pathlib import Path
import ssl

import certifi
from urllib.request import Request, urlopen

SSL_CTX = ssl.create_default_context(cafile=certifi.where())

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "raw" / "frameworks"
OUT.mkdir(parents=True, exist_ok=True)

DOCS = [
    # name, url, framework, license/terms
    ("cci_ba_activity_planning.pdf",
     "https://www.cci.health.wa.gov.au/-/media/CCI/Consumer-Modules/Back-from-the-Bluez/Back-from-the-Bluez---02---Behavioural-Strategies.pdf",
     "CBT/Behavioral Activation", "CCI free resources (no redistribution)"),
    ("cci_unhelpful_thinking_styles.pdf",
     "https://www.cci.health.wa.gov.au/-/media/CCI/Consumer-Modules/Back-from-the-Bluez/Back-from-the-Bluez---05---Unhelpful-Thinking-Styles.pdf",
     "CBT/Cognitive Restructuring", "CCI free resources (no redistribution)"),
    ("who_mhgap_v2.pdf",
     "https://iris.who.int/server/api/core/bitstreams/6ded7ffd-9d69-493a-b48a-0b3e6250c173/content",
     "WHO mhGAP", "CC BY-NC-SA 3.0 IGO"),
]


def fetch(name: str, url: str) -> int:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (Setmycareer-research-cache)"})
    with urlopen(req, timeout=60, context=SSL_CTX) as r:
        data = r.read()
    (OUT / name).write_bytes(data)
    return len(data)


if __name__ == "__main__":
    manifest = []
    for name, url, fw, lic in DOCS:
        try:
            n = fetch(name, url)
            manifest.append({"file": name, "url": url, "framework": fw,
                             "license": lic, "bytes": n})
            print(f"✓ {name:38s} {n/1e6:.1f} MB")
        except Exception as exc:  # noqa: BLE001
            manifest.append({"file": name, "url": url, "framework": fw,
                             "license": lic, "error": str(exc)[:120]})
            print(f"✗ {name:38s} {str(exc)[:100]}")
        time.sleep(1)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
