"""Specialised career-report engine — counsellor-weighted, route-predictive,
journey + JVIS-style sections.

This is the deepened backend mirror of the frontend generation engine in
`counselor/src/server/report-core.ts`. It turns a verified Blueprint (the
quote-gated `pc.*` scores Python already decided) PLUS the counsellor's
qualitative notes PLUS the bundled O*NET/BLS labor grounding into a structured,
specialised report dict the API can return verbatim (and that report.build_report
can render).

Three things make this report "highly accurate + specialised":

  1. STRUCTURED PROFESSIONAL JUDGMENT (clinical-vs-actuarial).
     The deterministic scores are the *actuarial* base rate. The counsellor's
     notes are the *clinical* overlay. Per the SPJ principle, when a human who
     met the client contradicts the model, the human wins — but in a BOUNDED,
     DOCUMENTED way, never a free hand. `apply_counsellor_judgment` shifts the
     career index, the lead recommendation, the outlook, and the time-to-offer
     band within hard caps, and records every adjustment as an audit trail.

  2. GROUNDED PREDICTION (routes + success probability + time-to-offer).
     `career_routes` ranks candidate occupations from the labor corpus by fit
     (RIASEC congruence × skill coverage × readiness), then derives a TRANSPARENT
     success-probability estimate and a time-to-offer band from real grounded
     signals (BLS growth %, wage band, O*NET job zone, the client's readiness and
     skill coverage). Probabilities are expressed as estimates with their inputs
     shown — never guarantees.

  3. JOURNEY + JVIS-STYLE SPECIALISATION.
     `journey_scaffold` builds the problem → assessment → sessions → synthesis →
     future arc. `work_role_percentiles` and `job_group_ranking` add the
     JVIS-style work-role percentile and job-group similarity views.

Everything deterministic here is pure-Python (stdlib + the career ontology /
weighting / confidence modules). The optional narrative prose is generated with
the existing app.llm client (Claude via OpenRouter when configured, else Groq),
guarded so the module imports and the structured report builds even with no LLM
and no heavy deps installed.
"""
from __future__ import annotations

import json
import math
import re

from . import confidence, ontology, weighting

# ---------------------------------------------------------------------------
# Counsellor-note weighting — structured professional judgment, BOUNDED.
# ---------------------------------------------------------------------------
#
# The counsellor met the client; the model only read a transcript. So the
# counsellor's read is the most authoritative HUMAN signal and is allowed to
# override the scores ON CONFLICT — but within hard, documented bounds so a
# single note can never swing the whole report. These caps are the contract.

# Max the career index may move from the counsellor's overall steer (points).
COUNSELLOR_INDEX_CAP = 12
# Max a single dimension may be nudged by a matching counsellor note (points).
COUNSELLOR_DIM_CAP = 15
# How many time-to-offer bands the counsellor can shift the headline estimate.
COUNSELLOR_HORIZON_SHIFT_CAP = 1
# Sentiment lexicon — tiny, transparent, and only used to read the DIRECTION of
# the counsellor's qualitative steer (positive vs. concerned). Magnitude is then
# bounded by the caps above; we never let the lexicon invent precision. Cues are
# matched on WORD BOUNDARIES and are negation-aware (see `_find_cues`), so
# "not ready" reads as a concern rather than tripping the positive "ready".
_POS_CUES = (
    "ready", "strong", "confident", "motivated", "driven", "promising", "capable",
    "resilient", "committed", "clear", "focused", "progress", "improving", "thriving",
    "talented", "impressive", "well-prepared", "prepared", "mature", "self-aware",
)
_NEG_CUES = (
    "struggling", "anxious", "burnt out", "burned out", "burnout",
    "unrealistic", "scattered", "stuck", "doubt", "overwhelmed", "avoidant",
    "stalling", "disengaged", "fragile", "exhausted", "drifting", "unsure",
    "premature", "rushing", "gap", "concern", "worried", "risk",
)
# Negators that flip a following positive cue into a concern (within a few words).
_NEGATORS = ("not", "isn't", "isnt", "is not", "no", "never", "lacks", "lacking",
             "far from", "hardly", "barely")

# Map a counsellor cue to the dimension(s) it most plausibly speaks to, so the
# override lands on the RIGHT score rather than smearing across all of them.
_CUE_TO_DIM = {
    "ready": "pc.market_readiness",
    "prepared": "pc.market_readiness",
    "premature": "pc.aspiration_realism",
    "unrealistic": "pc.aspiration_realism",
    "rushing": "pc.aspiration_realism",
    "confident": "pc.professional_confidence",
    "doubt": "pc.impostor_load",
    "impostor": "pc.impostor_load",
    "burnout": "pc.workload_sustainability",
    "burnt out": "pc.workload_sustainability",
    "burned out": "pc.workload_sustainability",
    "exhausted": "pc.workload_sustainability",
    "overwhelmed": "pc.workload_sustainability",
    "stuck": "pc.execution_momentum",
    "stalling": "pc.execution_momentum",
    "scattered": "pc.focus_consistency",
    "clear": "pc.career_clarity",
    "focused": "pc.focus_consistency",
    "gap": "pc.skill_gap_severity",
}


def _find_cues(text: str) -> dict[str, int]:
    """Return {cue: signed_count} for every lexicon cue present on a word boundary.

    A positive cue immediately preceded (within ~3 words) by a negator counts as a
    CONCERN (-1) instead of a strength (+1) — so "not ready", "far from confident",
    and "lacks focus" all read as concerns. Negative cues always count as concerns.
    """
    t = (text or "").lower()
    counts: dict[str, int] = {}
    neg_pat = r"(?:" + "|".join(re.escape(n) for n in _NEGATORS) + r")"
    for cue in _POS_CUES:
        pat = re.compile(r"\b" + re.escape(cue) + r"\b")
        for m in pat.finditer(t):
            window = t[max(0, m.start() - 24):m.start()]
            negated = re.search(neg_pat + r"\W+(?:\w+\W+){0,2}$", window) is not None
            counts[cue] = counts.get(cue, 0) + (-1 if negated else 1)
    for cue in _NEG_CUES:
        pat = re.compile(r"\b" + re.escape(cue) + r"\b")
        n = len(pat.findall(t))
        if n:
            counts[cue] = counts.get(cue, 0) - n
    return counts


def _notes_text(counsellor_notes) -> str:
    """Flatten whatever the caller passed (str / list / dict of note sections)."""
    if not counsellor_notes:
        return ""
    if isinstance(counsellor_notes, str):
        return counsellor_notes
    if isinstance(counsellor_notes, list):
        return "\n".join(_notes_text(n) for n in counsellor_notes)
    if isinstance(counsellor_notes, dict):
        # common shapes: {"counselor": "...", "client": "..."} or {"text": "..."}
        return "\n".join(str(v) for v in counsellor_notes.values() if v)
    return str(counsellor_notes)


def _steer(text: str) -> tuple[float, list[str], list[str]]:
    """Read the DIRECTION + strength of the counsellor's overall steer from text.

    Returns (steer in [-1, 1], matched positive cues, matched negative cues).
    Strength saturates quickly — a few concordant cues already pin the steer near
    its bound — because the magnitude is bounded by the caps, not the cue count.
    Built on `_find_cues`, so negated positives ("not ready") count as concerns.
    """
    cues = _find_cues(text)
    pos = [c for c, n in cues.items() if n > 0]
    neg = [c for c, n in cues.items() if n < 0]
    raw = sum(cues.values())
    if raw == 0:
        return 0.0, pos, neg
    steer = math.tanh(raw / 2.0)  # smooth, saturating; |steer| < 1
    return steer, pos, neg


def apply_counsellor_judgment(verified: dict, career_idx, counsellor_notes,
                              base_horizon_band: int) -> dict:
    """Overlay the counsellor's qualitative read on the actuarial scores.

    Inputs
      verified           : {metric_id: 0-100} the quote-gated scores (the base rate)
      career_idx         : the deterministic career index (or None)
      counsellor_notes   : the counsellor's qualitative notes (str/list/dict)
      base_horizon_band  : index into TIME_TO_OFFER_BANDS the routes engine derived

    Returns an audit dict:
      {
        "applied": bool,
        "steer": float,                 # -1..1 direction of the human read
        "matched_cues": {"positive": [...], "concern": [...]},
        "adjusted_scores": {id: int},   # scores after the bounded overlay
        "adjusted_index": int|None,     # index after the bounded overlay
        "index_delta": int,             # how far the human moved the index (capped)
        "horizon_band": int,            # possibly shifted by <= CAP bands
        "horizon_shift": int,
        "adjustments": [ {dimension, from, to, note} ],  # per-dimension audit
        "rationale": str,               # plain-language, for the report + footer
        "overrides_scores": bool,       # did the human contradict the model?
      }
    """
    text = _notes_text(counsellor_notes)
    steer, pos_cues, neg_cues = _steer(text)
    out = {
        "applied": bool(text.strip()),
        "steer": round(steer, 3),
        "matched_cues": {"positive": pos_cues, "concern": neg_cues},
        "adjusted_scores": dict(verified),
        "adjusted_index": career_idx,
        "index_delta": 0,
        "horizon_band": base_horizon_band,
        "horizon_shift": 0,
        "adjustments": [],
        "rationale": "",
        "overrides_scores": False,
    }
    if not text.strip():
        out["rationale"] = "No counsellor notes supplied — scores stand on the transcript alone."
        return out

    # (a) Per-dimension overlay: where a cue maps to a dimension that has a score,
    #     nudge that score in the cue's signed direction, bounded by
    #     COUNSELLOR_DIM_CAP. The human can CONTRADICT the model here (that's the
    #     whole point), but only by a bounded amount, and every nudge is recorded.
    #     `_find_cues` gives the sign (so "not ready" lowers readiness, not raises).
    adjusted = dict(verified)
    cue_counts = _find_cues(text)
    # collapse to one signed nudge per dimension (cues on the same dim accumulate,
    # then clamp to ±CAP so two synonyms can't exceed the single-dimension bound).
    per_dim: dict[str, int] = {}
    per_dim_cue: dict[str, str] = {}
    for cue, signed in cue_counts.items():
        dim = _CUE_TO_DIM.get(cue)
        if not dim or dim not in adjusted or signed == 0:
            continue
        per_dim[dim] = per_dim.get(dim, 0) + (1 if signed > 0 else -1)
        per_dim_cue.setdefault(dim, cue)
    for dim, sign in per_dim.items():
        direction = max(-1, min(1, sign))
        delta = int(round(direction * COUNSELLOR_DIM_CAP))
        if delta == 0:
            continue
        before = adjusted[dim]
        after = max(0, min(100, before + delta))
        if after == before:
            continue
        adjusted[dim] = after
        out["adjustments"].append({
            "dimension": dim,
            "name": ontology.PC_BY_ID[dim].name if dim in ontology.PC_BY_ID else dim,
            "from": before, "to": after,
            "note": f'counsellor cue "{per_dim_cue.get(dim, "")}"',
        })
        # "override" = the human pushed a score across the 50 midpoint, flipping
        # its sign (a genuine contradiction of the model, not mere reinforcement).
        if (before - 50) * (after - 50) < 0:
            out["overrides_scores"] = True

    out["adjusted_scores"] = adjusted

    # (b) Index overlay: recompute the index from the adjusted scores, then add a
    #     bounded global steer (the counsellor's overall confidence about the
    #     PERSON, beyond any single dimension), capped at COUNSELLOR_INDEX_CAP.
    new_idx = weighting.career_index(adjusted)
    if new_idx is not None and career_idx is not None:
        steer_points = int(round(steer * COUNSELLOR_INDEX_CAP))
        capped = max(-COUNSELLOR_INDEX_CAP, min(COUNSELLOR_INDEX_CAP,
                                                (new_idx - career_idx) + steer_points))
        out["adjusted_index"] = max(0, min(100, career_idx + capped))
        out["index_delta"] = out["adjusted_index"] - career_idx
    elif new_idx is not None:
        out["adjusted_index"] = new_idx

    # (c) Time-to-offer overlay: a strong human steer can shift the headline band
    #     by at most COUNSELLOR_HORIZON_SHIFT_CAP. Positive steer → sooner (down a
    #     band index), concern → later (up a band index).
    if abs(steer) >= 0.5:
        shift = -COUNSELLOR_HORIZON_SHIFT_CAP if steer > 0 else COUNSELLOR_HORIZON_SHIFT_CAP
        new_band = max(0, min(len(TIME_TO_OFFER_BANDS) - 1, base_horizon_band + shift))
        out["horizon_shift"] = new_band - base_horizon_band
        out["horizon_band"] = new_band

    # (d) Plain-language rationale (drives the report's counsellor-synthesis block).
    bits = []
    if out["index_delta"]:
        verb = "raised" if out["index_delta"] > 0 else "tempered"
        bits.append(f"the counsellor's read {verb} the overall index by {abs(out['index_delta'])} "
                    f"point(s) within the ±{COUNSELLOR_INDEX_CAP} bound")
    if out["adjustments"]:
        names = ", ".join(a["name"] for a in out["adjustments"][:4])
        bits.append(f"and shifted {names} to match what they observed in person")
    if out["horizon_shift"]:
        dirn = "sooner" if out["horizon_shift"] < 0 else "later"
        bits.append(f"and moved the time-to-offer estimate one band {dirn}")
    if not bits:
        bits.append("the counsellor's notes broadly corroborated the scored signals")
    lead = "On conflict, the human read takes precedence: " if out["overrides_scores"] else ""
    out["rationale"] = (lead + "; ".join(bits) + ". These adjustments are bounded and logged "
                        "(structured professional judgment), not a free override.").capitalize()
    return out


# ---------------------------------------------------------------------------
# Grounded prediction — routes, success probability, time-to-offer band.
# ---------------------------------------------------------------------------

# Time-to-offer bands (responsible, wide; the headline picks one by index).
TIME_TO_OFFER_BANDS = [
    "1-3 months",
    "3-6 months",
    "6-12 months",
    "12-18 months",
    "18+ months",
]


def _parse_growth_pct(growth: str):
    """Pull a signed growth percentage out of a labor 'growth' string, e.g.
    'growing very fast (~35% through 2032)' -> 35.0; 'declining (~-7%)' -> -7.0."""
    if not growth:
        return None
    m = re.search(r"(-?\d+(?:\.\d+)?)\s*%", growth)
    if m:
        return float(m.group(1))
    g = growth.lower()
    if "very fast" in g:
        return 30.0
    if "fast" in g:
        return 20.0
    if "declin" in g:
        return -5.0
    if "grow" in g:
        return 8.0
    return 0.0


def _riasec_congruence(client_code, occ_riasec) -> float:
    """Holland congruence in [0,1]: overlap of the client's top interests with the
    occupation's RIASEC tags, lightly rewarding the primary-letter match."""
    if not client_code or not occ_riasec:
        return 0.5  # neutral prior when we can't compare
    client = [c for c in str(client_code).upper() if c in "RIASEC"]
    occ = [c for c in occ_riasec if c in "RIASEC"]
    if not client or not occ:
        return 0.5
    overlap = len(set(client) & set(occ)) / max(1, len(set(occ)))
    primary_bonus = 0.2 if client[0] in occ else 0.0
    return max(0.0, min(1.0, 0.8 * overlap + primary_bonus))


# Tiny synonym map so a client's free-text skill ("python", "sql") matches the
# O*NET skill labels ("Programming", "Data analysis"). Transparent + extendable.
_SKILL_SYNONYMS = {
    "programming": {"python", "java", "c++", "javascript", "coding", "code", "scripting", "sql", "r"},
    "data analysis": {"sql", "excel", "analytics", "pandas", "analysis", "analyst"},
    "statistics": {"stats", "statistical", "probability", "regression"},
    "machine learning": {"ml", "deep learning", "ai", "modeling", "models", "tensorflow", "pytorch"},
    "data visualization": {"tableau", "powerbi", "matplotlib", "charts", "dashboards", "viz"},
    "communication": {"writing", "presentation", "presenting", "storytelling"},
    "project management": {"agile", "scrum", "planning", "roadmap", "jira"},
    "software design": {"architecture", "system design", "design patterns"},
    "debugging": {"troubleshooting", "testing", "qa"},
}


def _skill_match(occ_name: str, have_tokens: set[str], have_text: str) -> bool:
    """Does the client cover this single occupation skill? Forgiving on purpose:
    token overlap, substring either direction, or a synonym-set hit."""
    name = occ_name.lower().strip()
    if not name:
        return False
    name_tokens = set(name.split())
    if name_tokens & have_tokens:                       # shared word ("statistics")
        return True
    if name in have_text or any(name in tok or tok in name for tok in have_tokens):
        return True
    syns = _SKILL_SYNONYMS.get(name, set())             # synonym set ("python"→Programming)
    return bool(syns & have_tokens) or any(s in have_text for s in syns)


def _skill_coverage(client_skills, occ_skills) -> float:
    """Importance-weighted share of the occupation's skills the client already
    names. occ_skills is [[name, importance], ...]; client_skills is a list of
    free-text skills. Token / substring / synonym match keeps it forgiving."""
    if not occ_skills:
        return 0.5
    have_text = " ".join(str(s).lower() for s in (client_skills or []))
    have_tokens = set(re.findall(r"[a-z0-9+#]+", have_text))
    if not have_tokens:
        return 0.4  # client named no skills → modest prior, not zero
    num = den = 0.0
    for entry in occ_skills:
        name = entry[0] if isinstance(entry, (list, tuple)) else str(entry)
        imp = float(entry[1]) if isinstance(entry, (list, tuple)) and len(entry) > 1 else 3.0
        den += imp
        if _skill_match(name, have_tokens, have_text):
            num += imp
    return (num / den) if den else 0.5


def _occupations_from_labor(labor_context: str) -> list[dict]:
    """Parse occupation cards out of the RAG labor grounding block.

    rag.grounding_text returns the prose 'text' fields joined; but we also try the
    structured corpus directly so we keep soc/growth/wageBand/skills. Falls back to
    a light prose parse when the structured corpus isn't importable.
    """
    occs: list[dict] = []
    # Preferred: read structured cards straight from the bundled corpus.
    try:  # pragma: no cover - depends on bundled data file
        import pathlib
        p = pathlib.Path(__file__).resolve().parents[1] / "knowledge/labor_data.jsonl"
        if p.exists():
            for line in p.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if rec.get("type") == "occupation" and rec.get("title"):
                    occs.append(rec)
    except Exception:  # noqa: BLE001
        pass
    return occs


def _route_id(title: str) -> str:
    return "route:" + re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")


def career_routes(career_profile: dict, verified: dict, labor_context: str = "",
                  top_k: int = 4) -> list[dict]:
    """Rank candidate career routes and attach a transparent success-probability
    estimate + time-to-offer band, grounded in the labor data.

    Fit = 0.45·RIASEC congruence + 0.40·skill coverage + 0.15·readiness signal.
    Success probability is a bounded logistic over (fit, market growth, readiness)
    expressed as an ESTIMATE with its inputs surfaced. Nothing here is a guarantee.
    """
    cp = career_profile or {}
    client_code = "".join(cp.get("riasec") or []) or cp.get("holland") or ""
    client_skills = cp.get("skills") or []
    target = (cp.get("target") or "").lower()

    readiness = (verified.get("pc.market_readiness")
                 or verified.get("pc.skill_coverage")
                 or 50) / 100.0

    occs = _occupations_from_labor(labor_context)
    routes: list[dict] = []
    for occ in occs:
        congru = _riasec_congruence(client_code, occ.get("riasec"))
        cover = _skill_coverage(client_skills, occ.get("skills"))
        fit = 0.45 * congru + 0.40 * cover + 0.15 * readiness
        # surface the target the client actually named
        is_target = bool(target) and target in (occ.get("title", "").lower())
        if is_target:
            fit = min(1.0, fit + 0.05)

        growth_pct = _parse_growth_pct(occ.get("growth", ""))
        # transparent logistic: centred so an "average fit, flat market, mid
        # readiness" candidate sits near 0.5; market + readiness move it modestly.
        z = (2.4 * (fit - 0.5)
             + 0.9 * (readiness - 0.5)
             + 0.012 * (growth_pct or 0.0))
        prob = 1.0 / (1.0 + math.exp(-z))
        prob = max(0.12, min(0.88, prob))  # responsible floor + ceiling (no 0/100)

        job_zone = occ.get("jobZone") or 3
        # time-to-offer band: harder zones + thinner readiness/coverage push later.
        band = 0
        band += 0 if cover >= 0.7 else (1 if cover >= 0.45 else 2)
        band += 0 if readiness >= 0.65 else 1
        band += 0 if job_zone <= 3 else 1
        band = max(0, min(len(TIME_TO_OFFER_BANDS) - 1, band))

        routes.append({
            "id": _route_id(occ.get("title", "")),
            "title": occ.get("title", ""),
            "soc": occ.get("soc"),
            "field": occ.get("field"),
            "fit": round(fit, 3),
            "fit_pct": round(fit * 100),
            "success_probability": round(prob, 2),
            "success_pct": round(prob * 100),
            "horizon_band": band,
            "time_to_offer": TIME_TO_OFFER_BANDS[band],
            "is_target": is_target,
            "grounding": {
                "riasec_congruence": round(congru, 2),
                "skill_coverage": round(cover, 2),
                "readiness": round(readiness, 2),
                "market_growth_pct": growth_pct,
                "wage_band": occ.get("wageBand"),
                "job_zone": job_zone,
            },
            "basis": (f"{occ.get('title','')}: ~{round(congru*100)}% interest fit, "
                      f"~{round(cover*100)}% skill coverage, market growth "
                      f"{('+' + str(growth_pct)) if growth_pct and growth_pct>0 else growth_pct}%."),
        })

    routes.sort(key=lambda r: (r["is_target"], r["fit"], r["success_probability"]), reverse=True)
    return routes[:top_k]


def lead_horizon_band(career_idx, routes: list[dict]) -> int:
    """The headline time-to-offer band BEFORE the counsellor overlay: the band of
    the best-fit route, nudged by the overall index."""
    base = routes[0]["horizon_band"] if routes else 2
    if career_idx is not None:
        if career_idx >= 70:
            base = max(0, base - 1)
        elif career_idx < 45:
            base = min(len(TIME_TO_OFFER_BANDS) - 1, base + 1)
    return base


# ---------------------------------------------------------------------------
# Journey + JVIS-style specialised sections.
# ---------------------------------------------------------------------------

def journey_scaffold(career_profile: dict, verified: dict, evidence: dict,
                     session_summaries: list | None = None,
                     counsellor_rationale: str = "") -> list[dict]:
    """Deterministic problem → assessment → sessions → synthesis → future scaffold.

    Each stage carries the real facts (so the prose layer, if any, weaves quotes in
    rather than inventing the arc). Mirrors the five journey keys the frontend
    AINarrative expects."""
    cp = career_profile or {}
    top = sorted(verified.items(), key=lambda kv: kv[1], reverse=True)
    strongest = [ontology.PC_BY_ID[m].name for m, _ in top[:3] if m in ontology.PC_BY_ID]
    weakest = [ontology.PC_BY_ID[m].name for m, _ in sorted(verified.items(), key=lambda kv: kv[1])[:3]
               if m in ontology.PC_BY_ID]
    quotes = [e.get("quote") for e in evidence.values() if e.get("quote")][:5]
    n_sessions = len(session_summaries or []) or 1

    return [
        {"key": "problem",
         "facts": {"current": cp.get("current"), "target": cp.get("target"), "goal": cp.get("goal")},
         "summary": (f"Where it started: moving from {cp.get('current') or 'the present role'} toward "
                     f"{cp.get('target') or 'a clearer direction'}.")},
        {"key": "assessment",
         "facts": {"dimensions_scored": len(verified), "strongest": strongest, "weakest": weakest},
         "summary": (f"What the assessment surfaced: strengths in {', '.join(strongest) or '—'}; "
                     f"room to grow in {', '.join(weakest) or '—'}.")},
        {"key": "sessions",
         "facts": {"n_sessions": n_sessions, "quotes": quotes},
         "summary": f"Across {n_sessions} session(s), in their own words."},
        {"key": "synthesis",
         "facts": {"counsellor": counsellor_rationale},
         "summary": counsellor_rationale or "Bringing the scores and the human read together."},
        {"key": "future",
         "facts": {"target": cp.get("target")},
         "summary": f"Where the evidence points next for {cp.get('target') or 'the chosen direction'}."},
    ]


def work_role_percentiles(verified: dict) -> list[dict]:
    """JVIS-style work-role percentile view: every scored dimension expressed as a
    percentile-style band so the client sees relative standing, not just a number.
    (Self-referenced percentiles — honest about being within-profile, not normed
    against a population.)"""
    out = []
    for mid, score in sorted(verified.items(), key=lambda kv: kv[1], reverse=True):
        m = ontology.PC_BY_ID.get(mid)
        if not m:
            continue
        out.append({
            "id": mid, "name": m.name, "cluster": ontology.PC_CLUSTERS.get(m.cluster, m.cluster),
            "score": score, "percentile": score,  # 0-100 score doubles as the within-profile percentile
            "band": _band_label(score),
        })
    return out


def job_group_ranking(routes: list[dict]) -> list[dict]:
    """JVIS-style job-group similarity ranking: collapse the ranked routes into
    occupational groups (by labor 'field') and rank groups by best fit within."""
    groups: dict[str, dict] = {}
    for r in routes:
        g = r.get("field") or "General"
        cur = groups.setdefault(g, {"group": g, "best_fit": 0, "roles": []})
        cur["roles"].append({"title": r["title"], "fit_pct": r["fit_pct"]})
        cur["best_fit"] = max(cur["best_fit"], r["fit_pct"])
    ranked = sorted(groups.values(), key=lambda x: x["best_fit"], reverse=True)
    for i, g in enumerate(ranked, 1):
        g["rank"] = i
    return ranked


def _band_label(score) -> str:
    if score is None:
        return "Not discussed"
    if score >= 75:
        return "Strong"
    if score >= 55:
        return "Steady"
    if score >= 40:
        return "Building"
    return "Needs focus"


# ---------------------------------------------------------------------------
# Optional LLM narrative — McKinsey-grade prose, counsellor notes weighted HEAVILY.
# Guarded so the structured report builds with no LLM / no heavy deps.
# ---------------------------------------------------------------------------

_NARRATIVE_SYS = (
    "You are an elite career strategist writing the prose for a specialised career-assessment "
    "report. Address the client directly in the second person. Warm, precise, candid; no hype, no "
    "emoji, no exclamation marks.\n"
    "STANDARD — McKinsey-grade: lead with a clear FRAMING THESIS (the central tension / defining "
    "shift). Frame growth as a 'shift from X to Y'. EVERY claim must be grounded in the real numbers, "
    "bands, route ids, probabilities and verbatim quotes in the payload — NEVER invent a number, "
    "score, route or quote.\n"
    "COUNSELLOR NOTES CARRY THE HIGHEST WEIGHT: the counsellor met the client; their observations are "
    "the most authoritative human signal. Let them VISIBLY drive the synthesis and the recommendations, "
    "and privilege them over the scores wherever the two conflict.\n"
    "HONESTY: probabilities are ESTIMATES, scores are point-in-time, and the market — not the model — "
    "decides outcomes. Say so where it matters.\n"
    "Respond ONLY with a single JSON object using exactly these keys (all values plain prose strings, "
    "string arrays where noted): {\n"
    '  "framingThesis": str,\n'
    '  "executiveSummary": [str],\n'
    '  "journey": [{"key": str, "narrative": str}],\n'
    '  "counsellorSynthesis": str,\n'
    '  "routeNarratives": [{"id": str, "rationale": str}],\n'
    '  "recommendations": [str],\n'
    '  "pullQuotes": [str]\n}'
)


def _narrative(payload: dict):
    """Generate the report prose via the existing app.llm client (guarded)."""
    try:
        from ..config import settings
        from ..llm import chat_json, llm_available, openrouter_available
    except Exception:  # noqa: BLE001 — heavy deps absent; structured report still ships
        return {}
    if not llm_available() and not openrouter_available():
        return {}
    model = settings.openrouter_model if openrouter_available() else None
    user = ("SCAFFOLD FACTS (JSON — the only facts you may use):\n"
            + json.dumps(payload)[:14000]
            + "\n\nWrite the specialised report now as the single JSON object specified.")
    try:
        return chat_json(_NARRATIVE_SYS, user, temperature=0.4, model=model) or {}
    except Exception:  # noqa: BLE001
        return {}


# ---------------------------------------------------------------------------
# generate_report — the structured specialised report entry point.
# ---------------------------------------------------------------------------

def generate_report(blueprint: dict, career_profile: dict | None = None,
                    counsellor_notes=None, labor_context: str = "",
                    session_summaries: list | None = None,
                    name: str = "", with_narrative: bool = True) -> dict:
    """Assemble the full specialised report dict from an already-computed Blueprint.

    This is deliberately Blueprint-IN (it does NOT re-score) so it composes cleanly
    on top of analyze_career / the career graph's synthesis. It:
      1. derives grounded routes + success probabilities + time-to-offer,
      2. applies the BOUNDED counsellor-note overlay (SPJ) to scores/index/horizon,
      3. builds the journey + JVIS-style sections,
      4. optionally generates the McKinsey-grade prose (counsellor notes weighted),
    and returns one structured dict the API can return and report.build_report can
    render.
    """
    cp = career_profile or {}
    bp = blueprint or {}
    # pull the plain {id: score} from a scores dict that may be nested payloads
    raw_scores = bp.get("scores") or {}
    verified = {mid: (v.get("score") if isinstance(v, dict) else v)
                for mid, v in raw_scores.items()
                if (v.get("score") if isinstance(v, dict) else v) is not None}
    evidence = {mid: v for mid, v in raw_scores.items() if isinstance(v, dict)}
    career_idx = bp.get("career_index")

    # 1) grounded prediction
    routes = career_routes(cp, verified, labor_context)
    base_band = lead_horizon_band(career_idx, routes)

    # 2) bounded counsellor overlay (structured professional judgment)
    judgment = apply_counsellor_judgment(verified, career_idx, counsellor_notes, base_band)
    adj_scores = judgment["adjusted_scores"]
    adj_index = judgment["adjusted_index"]

    # recompute index confidence over the adjusted scores so the headline confidence
    # reflects the post-overlay picture (counsellor corroboration is a real source).
    confs = {mid: confidence.dim_confidence(n_verified=1, n_sources=2 if judgment["applied"] else 1)
             for mid in adj_scores}
    cov = weighting.coverage(adj_scores)
    idx_conf = confidence.index_tier(confs, coverage_factor=cov)

    # 3) journey + JVIS-style specialised sections
    journey = journey_scaffold(cp, adj_scores, evidence, session_summaries, judgment["rationale"])
    work_roles = work_role_percentiles(adj_scores)
    job_groups = job_group_ranking(routes)

    headline_band = judgment["horizon_band"]
    report = {
        "name": name or "You",
        "career_profile": {"current": cp.get("current"), "target": cp.get("target"),
                           "goal": cp.get("goal"), "riasec": cp.get("riasec"),
                           "skills": cp.get("skills")},
        "career_index": {
            "base": career_idx,
            "adjusted": adj_index,
            "delta_from_counsellor": judgment["index_delta"],
            "confidence": idx_conf,
            "band": _band_label(adj_index),
        },
        "outlook": {
            "time_to_offer": TIME_TO_OFFER_BANDS[headline_band],
            "horizon_band": headline_band,
            "lead_route": routes[0]["title"] if routes else None,
            "lead_route_id": routes[0]["id"] if routes else None,
            "note": "Estimate, not a guarantee — the market decides the final outcome.",
        },
        "routes": routes,
        "counsellor_judgment": judgment,   # full audit trail (bounds + adjustments)
        "journey": journey,
        "work_role_percentiles": work_roles,
        "job_group_ranking": job_groups,
        "scores": {mid: {"score": adj_scores[mid],
                         "base_score": verified.get(mid),
                         "confidence": confidence.tier_from_value(confs.get(mid, 0.0)),
                         **{k: v for k, v in evidence.get(mid, {}).items() if k in ("quote", "reasoning")}}
                   for mid in adj_scores},
        "moves": bp.get("moves") or [],
        "citations": bp.get("citations") or [],
        "behavioral": bp.get("behavioral") or {},
        "contradictions": bp.get("contradictions") or [],
        "contradiction": bp.get("contradiction"),
        "disclaimer": ("Decision support, not a guarantee. Scores are anchored to the client's own words "
                       "and labor-market data (O*NET/BLS); probabilities are estimates; the counsellor's "
                       "professional judgment is weighted heavily and bounded."),
    }

    # 4) optional McKinsey-grade prose, counsellor notes weighted heavily
    if with_narrative:
        narrative = _narrative({
            "client": {"preferredName": name, "name": name},
            "career_index": report["career_index"],
            "outlook": report["outlook"],
            "routes": [{"id": r["id"], "title": r["title"], "success_pct": r["success_pct"],
                        "time_to_offer": r["time_to_offer"], "basis": r["basis"]} for r in routes],
            "scores": {mid: report["scores"][mid]["score"] for mid in report["scores"]},
            "work_role_percentiles": work_roles[:8],
            "job_group_ranking": job_groups,
            "journey": journey,
            "counsellor_judgment": {"rationale": judgment["rationale"],
                                    "overrides_scores": judgment["overrides_scores"],
                                    "adjustments": judgment["adjustments"],
                                    "notes": _notes_text(counsellor_notes)[:2000]},
            "moves": report["moves"], "citations": report["citations"],
            "contradictions": report["contradictions"],
        })
        report["narrative"] = narrative or {}

    return report
