"""ESCO crosswalk loader — multilingual occupations/skills + O*NET mapping.

ESCO (European Skills, Competences, Qualifications & Occupations) is free and
commercial-OK; it adds richer skill matching and i18n on top of O*NET. The full
classification is large, so it's bundled as a refreshable snapshot
(app/knowledge/esco_crosswalk.jsonl) built by scripts/refresh_esco.py.

Graceful by design: if the snapshot isn't present, lookups return empty and the
career pipeline falls back to the bundled O*NET labor data — nothing breaks.
"""
from __future__ import annotations

import json
import pathlib

_PATH = pathlib.Path(__file__).resolve().parents[1] / "knowledge/esco_crosswalk.jsonl"
_INDEX: dict | None = None


def available() -> bool:
    return _PATH.exists()


def _load() -> dict:
    global _INDEX
    if _INDEX is not None:
        return _INDEX
    _INDEX = {"by_onet": {}, "by_esco": {}}
    if _PATH.exists():
        for line in _PATH.read_text().splitlines():
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("onet_soc"):
                _INDEX["by_onet"][rec["onet_soc"]] = rec
            if rec.get("esco_uri"):
                _INDEX["by_esco"][rec["esco_uri"]] = rec
    return _INDEX


def occupation_for_onet(soc: str) -> dict | None:
    return _load()["by_onet"].get(soc)


def related_skills(soc: str) -> list:
    return (occupation_for_onet(soc) or {}).get("skills", [])
