"""Career analysis pipeline — labor-grounding → career_metrics → evidence-verify
→ deterministic synthesis → persist.

LLM proposes (quote-gated pc.* scores grounded in the transcript + career profile +
bundled O*NET/BLS labor data + the bloo wellbeing bridge); Python decides every
number (weighting.py / confidence.py). This is the working pipeline the LangGraph
multi-agent DAG wraps for SSE streaming + parallel Behavioral/Contradiction lanes.
Mirrors bloo's reflective lane and its non-negotiables: never guarantee an outcome,
signal-language + confidence everywhere.
"""
from __future__ import annotations

import json

from .. import db, rag
from ..bridge import contradiction_band
from ..config import settings
from ..llm import chat_json, llm_available, openrouter_available
from . import confidence, ontology, weighting


def _reasoning_model():
    """Heavy reasoning on Claude (OpenRouter) when configured, else Groq."""
    return settings.openrouter_model if openrouter_available() else None


CAREER_SYS = (
    "You are the Setmycareer Career Counsellor — an evidence-based behavioral career "
    "scientist. Score the person's career dimensions on a 0-100 scale (100 = strong, "
    "healthy signal) ONLY from the evidence provided: the conversation transcript, their "
    "career profile, the bundled labor-market data, and (as context) their wellbeing read.\n"
    "Hard rules:\n"
    "- QUOTE-GATE every score: include a short verbatim quote from the transcript that "
    "supports it. If you cannot quote support for a dimension, OMIT it — never guess.\n"
    "- Signal-language only ('seems', 'tends to'); never 'you are', never a verdict like "
    "'you should quit', never guarantee an outcome.\n"
    "- Ground any market/skill/wage/outlook claim in the provided labor data; invent nothing.\n"
    "- When wellbeing/energy reads low, temper career pushes (gentler, smaller next steps).\n"
    "- Inverse dimensions (impostor_load, skill_gap_severity, workload_sustainability) are "
    "framed so higher = healthier; score them that way.\n\n"
    "Respond ONLY with JSON: {\n"
    '  "scores": { "<metric id>": {"score": int, "evidence": "verbatim transcript quote", '
    '"reasoning": "one hedged sentence"} },\n'
    '  "moves": [{"title": "a concrete next move", "why": "one sentence tied to the data"}],\n'
    '  "citations": ["labor data points you leaned on"]\n}'
)


def _verify(scores: dict, transcript: str):
    """Quote-gate (the trust backbone): keep a score only if its evidence quote is
    actually present in the transcript. Unverifiable → dropped before it can enter
    the index. Mirrors bloo's `_evidence_count` substring re-check."""
    t = (transcript or "").lower()
    verified: dict[str, int] = {}
    evidence: dict[str, dict] = {}
    for mid, payload in (scores or {}).items():
        if mid not in ontology.PC_BY_ID or not isinstance(payload, dict):
            continue
        score = payload.get("score")
        quote = (payload.get("evidence") or "").strip()
        ok = bool(quote) and quote.lower()[:80] in t
        if score is None or not ok:
            continue
        verified[mid] = max(0, min(100, int(score)))
        evidence[mid] = {"quote": quote, "reasoning": payload.get("reasoning", ""), "verified": True}
    return verified, evidence


def analyze_career(transcript: str, career_profile: dict | None = None,
                   mh_context: dict | None = None, persist_user_id: str | None = None,
                   session_id: str | None = None) -> dict:
    career_profile = career_profile or {}

    # 1) labor grounding (RAG over the bundled O*NET/BLS corpus)
    target = career_profile.get("target", "")
    q = f"{target} {career_profile.get('current', '')} {career_profile.get('goal', '')} skills outlook transitions"
    grounding = rag.grounding_text(q, k=4, corpus="labor", max_chars=2000) if target else ""

    # 2) LLM proposes quote-gated scores
    data: dict = {}
    if llm_available():
        user = (
            f"Career profile: {json.dumps(career_profile)[:1500]}\n\n"
            f"Wellbeing bridge (temper pushes when low): "
            f"{json.dumps(mh_context)[:600] if mh_context else 'none'}\n\n"
            f"Labor-market data to ground in:\n{grounding or '(none retrieved)'}\n\n"
            f"Career rubric — score these dimensions where the transcript supports it:\n"
            f"{ontology.rubric_block()}\n\n"
            f'Transcript:\n"""\n{(transcript or "")[:9000]}\n"""'
        )
        data = chat_json(CAREER_SYS, user, temperature=0.2, model=_reasoning_model()) or {}

    # 3) Python decides — verify, weight, compose (every number deterministic)
    verified, evidence = _verify(data.get("scores", {}), transcript)
    confs = {mid: confidence.dim_confidence(n_verified=1, verifier=1.0) for mid in verified}

    career_idx = weighting.career_index(verified)
    cov = weighting.coverage(verified)
    idx_conf = confidence.index_tier(confs, coverage_factor=cov)
    wellbeing_idx = (mh_context or {}).get("wellbeing_index")
    master = weighting.master_index(wellbeing_idx, career_idx)

    scores_out = {
        mid: {"score": verified[mid], "confidence": confidence.tier_from_value(confs[mid]),
              **evidence.get(mid, {})}
        for mid in verified
    }
    composites = {
        "cx.career_index": {"score": career_idx, "confidence": idx_conf},
        "cx.bloom_index": {"score": master,
                           "confidence": "tentative" if wellbeing_idx is not None else idx_conf,
                           "needs": None if wellbeing_idx is not None else "bloo wellbeing bridge"},
    }
    blueprint = {
        "career_index": career_idx,
        "confidence": idx_conf,
        "scores": scores_out,
        "composites": composites,
        "moves": (data.get("moves") or [])[:4],
        "citations": (data.get("citations") or [])[:6],
        "coverage": round(cov, 3),
        "contradiction": contradiction_band(career_idx, None, wellbeing_idx, None),
        "outlook": None,
    }

    # 4) persist to Supabase (graceful no-op without DATABASE_URL)
    if persist_user_id and db.available():
        try:
            bp = db.save_blueprint({"user_id": persist_user_id, "session_id": session_id, **blueprint})
            db.record_index_point(persist_user_id, {
                "career_index": career_idx, "wellbeing_index": wellbeing_idx, "master_index": master,
                "dims": {k: v["score"] for k, v in scores_out.items()}, "session_id": session_id})
            blueprint["id"] = bp["id"] if bp else None
        except Exception as exc:  # noqa: BLE001
            blueprint["persist_error"] = str(exc)[:140]

    return blueprint
