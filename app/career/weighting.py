"""Deterministic source + dimension weighting — LLM proposes, Python decides.

Two layers, both pure-Python (never model-invented):
  (a) source → dimension: the founder's input mix, presence-renormalized with
      recency decay and hard caps. Counsellor notes + uploaded reports can
      corroborate but never originate or dominate a score.
  (b) dimension → index: the career weight vector from the ontology, presence-
      renormalized over the dimensions that actually have signal. NO risk-cap —
      career strain is not a safety event (that cap lives only in bloo's lane).
"""
from __future__ import annotations

import math

from .ontology import CAREER_INDEX_WEIGHTS, MASTER_BLEND

# founder's nominal source mix (sums to 1.0 when all present)
SOURCE_WEIGHTS = {
    "transcript": 0.40, "assessment": 0.20, "trend": 0.15,
    "journal": 0.10, "counsellor": 0.10, "self_report": 0.05,
}
# hard caps applied BEFORE renormalization (a slick PDF / third-party note can't dominate)
SOURCE_CAPS = {"counsellor": 0.10, "report": 0.15}
# recency time-constants (days); trend is a slow-moving prior
TAU = {"assessment": 30.0, "report": 90.0}


def _decay(nominal: float, days, tau) -> float:
    if days is None or tau is None:
        return nominal
    return nominal * math.exp(-max(0.0, float(days)) / tau)


def resolve_source_weights(sources: dict) -> dict:
    """sources: {name: {"present": bool, "days": float|None, "quality": float 0-1}}.
    Returns normalized weights over the present sources (stored per session as an
    audit trail). Generalizes bloo's `total_w` renormalization from dimensions to
    sources."""
    raw: dict[str, float] = {}
    for name, meta in sources.items():
        if not meta.get("present"):
            continue
        if name == "report":
            nominal = SOURCE_CAPS["report"] * float(meta.get("quality", 0.5))
        else:
            nominal = SOURCE_WEIGHTS.get(name)
            if nominal is None:
                continue
        nominal = _decay(nominal, meta.get("days"), TAU.get(name))
        cap = SOURCE_CAPS.get(name)
        if cap is not None:
            nominal = min(nominal, cap)
        raw[name] = nominal
    total = sum(raw.values())
    return {k: (v / total if total else 0.0) for k, v in raw.items()}


def career_index(scores: dict, weights: dict | None = None):
    """cx.career_index — presence-renormalized weighted mean over pc.* (0–100).
    NO risk-cap. Returns None when nothing has signal."""
    weights = weights or CAREER_INDEX_WEIGHTS
    num = den = 0.0
    for mid, w in weights.items():
        s = scores.get(mid)
        if s is None:
            continue
        num += w * float(s)
        den += w
    return round(num / den) if den else None


def master_index(wellbeing, career, alpha: float | None = None, beta: float | None = None):
    """cx.bloom_index = α·wellbeing + β·career over whichever legs are present.
    The wellbeing leg carries bloo's risk-cap; the career leg never adds optimism
    on a safety flag because it's bounded by the (already capped) wellbeing value."""
    a = MASTER_BLEND["alpha_wellbeing"] if alpha is None else alpha
    b = MASTER_BLEND["beta_career"] if beta is None else beta
    parts = []
    if wellbeing is not None:
        parts.append((wellbeing, a))
    if career is not None:
        parts.append((career, b))
    if not parts:
        return None
    den = sum(w for _, w in parts)
    return round(sum(v * w for v, w in parts) / den)


def coverage(scores: dict, weights: dict | None = None) -> float:
    """Fraction of weighted dimensions that actually have signal."""
    weights = weights or CAREER_INDEX_WEIGHTS
    present = sum(1 for mid in weights if scores.get(mid) is not None)
    return present / max(1, len(weights))
