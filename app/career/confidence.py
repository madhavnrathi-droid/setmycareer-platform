"""Per-metric → index confidence propagation (FOUNDATION §5).

Numbers internally (none=0 … high=1.0), words in the UI. Mirrors bloo's
`_confidence()`, extended with the `high` tier for validated-instrument cases.

  c_dim   = c_evidence × c_agreement × c_recency × c_verifier
  c_index = Σ(w·c) / Σ(w)  over present dims, × coverage_factor × trend_factor

A Verifier `drop` sets c_dim = 0 and removes the dimension (mass renormalizes).
For BOTH-mode statements, callers take min(personal_conf, career_conf).
"""
from __future__ import annotations

from .ontology import CAREER_INDEX_WEIGHTS, CONFIDENCE_ORDER, CONFIDENCE_VALUES


def tier_from_value(v: float) -> str:
    best = "none"
    for tier in CONFIDENCE_ORDER:
        if v >= CONFIDENCE_VALUES[tier]:
            best = tier
    return best


def value_from_tier(tier: str) -> float:
    return CONFIDENCE_VALUES.get(tier, 0.0)


def evidence_confidence(n_verified: int, n_sources: int = 1) -> float:
    """0 anchors → low · 1 → tentative · ≥2 → moderate · ≥3 distinct sources → high."""
    if n_verified <= 0:
        return CONFIDENCE_VALUES["low"]
    if n_verified == 1:
        return CONFIDENCE_VALUES["tentative"]
    if n_sources >= 3:
        return CONFIDENCE_VALUES["high"]
    return CONFIDENCE_VALUES["moderate"]


def dim_confidence(n_verified: int, n_sources: int = 1, contradiction_penalty: float = 0.0,
                   recency: float = 1.0, verifier: float = 1.0, has_validated: bool = False) -> float:
    c_evidence = (CONFIDENCE_VALUES["high"] if has_validated and n_verified >= 1
                  else evidence_confidence(n_verified, n_sources))
    c_agreement = max(0.0, 1.0 - contradiction_penalty)
    return c_evidence * c_agreement * max(0.0, recency) * max(0.0, verifier)


def index_confidence(dim_confs: dict, weights: dict | None = None,
                     coverage_factor: float = 1.0, trend_factor: float = 1.0) -> float:
    weights = weights or CAREER_INDEX_WEIGHTS
    num = den = 0.0
    for mid, c in dim_confs.items():
        w = weights.get(mid, 0.0)
        num += w * c
        den += w
    base = (num / den) if den else 0.0
    return base * coverage_factor * trend_factor


def index_tier(dim_confs: dict, **kw) -> str:
    return tier_from_value(index_confidence(dim_confs, **kw))


def ewma(new_val, new_conf: float, prior_val, prior_conf: float):
    """Confidence-weighted EWMA for the timeline — a single low-confidence session
    nudges the line, never whips it."""
    if prior_val is None:
        return new_val
    if new_val is None:
        return prior_val
    den = new_conf + prior_conf
    return prior_val if den == 0 else (new_conf * new_val + prior_conf * prior_val) / den
