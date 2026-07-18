"""Career LangGraph — the multi-agent wrap of the career pipeline.

Mirrors bloo's reflective lane (StateGraph + SSE 'updates' streaming) and adds the
cross-cutting reasoning agents the FOUNDATION calls for:

    labor_retriever → career_metrics → evidence_verifier
                                            ├── behavioral_scientist ┐
                                            └── contradiction_agent   ┴── synthesis → END

career_metrics PROPOSES quote-gated pc.* scores; evidence_verifier is the hard
groundedness gate; behavioral ∥ contradiction add reasoning depth (parallel,
disjoint keys); synthesis computes every number deterministically (weighting /
confidence / bridge) and writes the warm life-coach narrative. Compiled once at
import and reused, exactly like bloo's PIPELINE.
"""
from __future__ import annotations

import json
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from .. import rag
from ..agents.persona import PERSONA
from ..bridge import contradiction_band
from ..llm import chat_json, llm_available
from . import confidence, ontology, specialised, weighting
from .analyze import CAREER_SYS, _reasoning_model, _verify


class CareerState(TypedDict, total=False):
    transcript: str
    career_profile: dict
    mh_context: dict
    counsellor_notes: object    # the counsellor's qualitative notes (str/list/dict)
    session_summaries: list      # prior-session summaries (for the journey arc)
    name: str
    want_report: bool            # build the specialised report in the report node
    with_narrative: bool         # generate McKinsey-grade prose in the report node
    labor_context: str          # labor_retriever
    raw: dict                   # career_metrics (proposed, pre-verify)
    moves: list
    citations: list
    verified: dict              # evidence_verifier
    evidence: dict
    confs: dict
    behavioral: dict            # behavioral_scientist
    contradictions: list        # contradiction_agent
    synthesis: dict             # synthesis (final Blueprint)
    report: dict                 # counsellor_report (specialised, counsellor-weighted)
    errors: list


# ── nodes ────────────────────────────────────────────────────────────────
def _labor_retriever(s: CareerState) -> dict:
    cp = s.get("career_profile") or {}
    target = cp.get("target", "")
    if not target:
        return {"labor_context": ""}
    q = f"{target} {cp.get('current', '')} {cp.get('goal', '')} skills outlook transitions"
    return {"labor_context": rag.grounding_text(q, k=4, corpus="labor", max_chars=2000)}


def _career_metrics(s: CareerState) -> dict:
    if not llm_available():
        return {"raw": {}, "moves": [], "citations": []}
    cp = s.get("career_profile") or {}
    user = (
        f"Career profile: {json.dumps(cp)[:1500]}\n\n"
        f"Wellbeing bridge (temper pushes when low): "
        f"{json.dumps(s.get('mh_context'))[:600] if s.get('mh_context') else 'none'}\n\n"
        f"Labor data:\n{s.get('labor_context') or '(none)'}\n\n"
        f"Career rubric — score where the transcript supports it:\n{ontology.rubric_block()}\n\n"
        f'Transcript:\n"""\n{(s.get("transcript") or "")[:9000]}\n"""'
    )
    data = chat_json(CAREER_SYS, user, temperature=0.2, model=_reasoning_model()) or {}
    return {"raw": data.get("scores", {}), "moves": (data.get("moves") or [])[:4],
            "citations": (data.get("citations") or [])[:6]}


def _evidence_verifier(s: CareerState) -> dict:
    verified, evidence = _verify(s.get("raw", {}), s.get("transcript", ""))
    confs = {mid: confidence.dim_confidence(n_verified=1) for mid in verified}
    return {"verified": verified, "evidence": evidence, "confs": confs}


BEHAVIORAL_SYS = (
    "You are a behavioral scientist. From the verified career signals + transcript + wellbeing, name "
    "1-3 MECHANISMS or leading indicators (why a signal sits where it is; what tends to precede a move), "
    "each tied to a short transcript quote. Surface at most ONE career<->wellbeing cross-lane link, as a "
    "hypothesis. Hedge; never assert traits; never invent. Respond ONLY with JSON: "
    '{"mechanisms":[{"text":str,"confidence":"low"|"moderate"}],"cross_lane_links":[{"text":str}]}'
)


def _behavioral(s: CareerState) -> dict:
    if not llm_available() or not s.get("verified"):
        return {"behavioral": {}}
    user = (f"Verified signals: {json.dumps(s.get('verified', {}))[:800]}\n"
            f"Wellbeing: {json.dumps(s.get('mh_context'))[:400] if s.get('mh_context') else 'none'}\n"
            f'Transcript:\n"""\n{(s.get("transcript") or "")[:5000]}\n"""')
    return {"behavioral": chat_json(BEHAVIORAL_SYS, user, temperature=0.3, model=_reasoning_model()) or {}}


CONTRADICTION_SYS = (
    "You detect conflicts between what the person SAYS they want, what they DO, and their ENVIRONMENT. "
    "Quote both sides. Report the tension, do NOT resolve it. Gentle, non-judgmental, only real conflicts. "
    'Respond ONLY with JSON: {"contradictions":[{"text":str,"confidence":"low"|"moderate"}]}'
)


def _contradiction(s: CareerState) -> dict:
    if not llm_available():
        return {"contradictions": []}
    user = (f"Career profile: {json.dumps(s.get('career_profile') or {})[:600]}\n"
            f'Transcript:\n"""\n{(s.get("transcript") or "")[:5000]}\n"""')
    out = chat_json(CONTRADICTION_SYS, user, temperature=0.3, model=_reasoning_model()) or {}
    return {"contradictions": (out.get("contradictions") or [])[:3]}


SYNTH_SYS = PERSONA + (
    "\n\nWrite a SHORT synthesis of this career read: one warm, specific sentence on where they stand, "
    "and ONE small concrete next step. Ground it in the signals + moves. Signal-language; no guarantees. "
    'Respond ONLY with JSON: {"headline":str,"narrative":str,"next_step":str}'
)


def _synthesis(s: CareerState) -> dict:
    verified = s.get("verified", {})
    confs = s.get("confs", {})
    evidence = s.get("evidence", {})
    career_idx = weighting.career_index(verified)
    cov = weighting.coverage(verified)
    idx_conf = confidence.index_tier(confs, coverage_factor=cov)
    wb = (s.get("mh_context") or {}).get("wellbeing_index")
    master = weighting.master_index(wb, career_idx)
    scores_out = {mid: {"score": verified[mid], "confidence": confidence.tier_from_value(confs[mid]),
                        **evidence.get(mid, {})} for mid in verified}
    narrative = {}
    if llm_available() and verified:
        user = (f"Career index {career_idx} (confidence {idx_conf}). "
                f"Signals: {json.dumps({k: v['score'] for k, v in scores_out.items()})[:500]}. "
                f"Moves: {json.dumps(s.get('moves') or [])[:400]}. "
                f"Tensions: {json.dumps(s.get('contradictions') or [])[:300]}.")
        narrative = chat_json(SYNTH_SYS, user, temperature=0.5, model=_reasoning_model()) or {}
    blueprint = {
        "career_index": career_idx, "confidence": idx_conf, "coverage": round(cov, 3),
        "scores": scores_out,
        "composites": {
            "cx.career_index": {"score": career_idx, "confidence": idx_conf},
            "cx.bloom_index": {"score": master, "confidence": "tentative" if wb is not None else idx_conf},
        },
        "moves": s.get("moves") or [], "citations": s.get("citations") or [],
        "behavioral": s.get("behavioral") or {}, "contradictions": s.get("contradictions") or [],
        "contradiction": contradiction_band(career_idx, None, wb, None),
        "narrative": narrative,
    }
    return {"synthesis": blueprint}


def _counsellor_report(s: CareerState) -> dict:
    """Final node: fold the counsellor's qualitative notes in (HEAVILY, bounded) and
    assemble the specialised report — grounded routes + success probability +
    time-to-offer + journey + JVIS-style sections. Skipped (cheaply) unless the
    caller asked for it, so the streaming Blueprint flow is unaffected by default.

    This is where the structured-professional-judgment override lands: the human
    notes can shift the lead recommendation, the outlook, and the time-to-offer
    band, overriding the scores on conflict within documented caps (see
    specialised.apply_counsellor_judgment)."""
    if not s.get("want_report"):
        return {}
    blueprint = s.get("synthesis") or {}
    report = specialised.generate_report(
        blueprint,
        career_profile=s.get("career_profile") or {},
        counsellor_notes=s.get("counsellor_notes"),
        labor_context=s.get("labor_context") or "",
        session_summaries=s.get("session_summaries") or [],
        name=s.get("name") or "",
        with_narrative=bool(s.get("with_narrative", True)),
    )
    return {"report": report}


def _build():
    g = StateGraph(CareerState)
    g.add_node("labor_retriever", _labor_retriever)
    g.add_node("career_metrics", _career_metrics)
    g.add_node("evidence_verifier", _evidence_verifier)
    g.add_node("behavioral_scientist", _behavioral)
    g.add_node("contradiction_agent", _contradiction)
    g.add_node("synthesis", _synthesis)
    g.add_node("counsellor_report", _counsellor_report)
    g.add_edge(START, "labor_retriever")
    g.add_edge("labor_retriever", "career_metrics")
    g.add_edge("career_metrics", "evidence_verifier")
    g.add_edge("evidence_verifier", "behavioral_scientist")   # behavioral ∥ contradiction
    g.add_edge("evidence_verifier", "contradiction_agent")
    g.add_edge("behavioral_scientist", "synthesis")           # synthesis waits for both
    g.add_edge("contradiction_agent", "synthesis")
    g.add_edge("synthesis", "counsellor_report")              # counsellor notes weighted last
    g.add_edge("counsellor_report", END)
    return g.compile()


PIPELINE = _build()

STAGE_LABELS = {
    "labor_retriever": "Grounding in labor-market data",
    "career_metrics": "Scoring your career signals",
    "evidence_verifier": "Verifying every score against your words",
    "behavioral_scientist": "Explaining why your signals move",
    "contradiction_agent": "Checking wants vs. actions",
    "synthesis": "Writing your Blueprint",
    "counsellor_report": "Weighting the counsellor's notes + projecting routes",
}
STAGE_TOTAL = len(STAGE_LABELS)


def _initial(transcript, career_profile, mh_context, **extra) -> CareerState:
    state: CareerState = {"transcript": transcript, "career_profile": career_profile or {},
                          "mh_context": mh_context or {}, "errors": []}
    state.update({k: v for k, v in extra.items() if v is not None})
    return state


def run(transcript, career_profile=None, mh_context=None) -> dict:
    res = PIPELINE.invoke(_initial(transcript, career_profile, mh_context))
    return dict(res).get("synthesis", {})


def stream(transcript, career_profile=None, mh_context=None):
    """Yield ('node', name) as each node lands, then ('done', blueprint)."""
    init = _initial(transcript, career_profile, mh_context)
    acc: dict = dict(init)
    for update in PIPELINE.stream(init, stream_mode="updates"):
        for node, delta in (update or {}).items():
            if isinstance(delta, dict):
                acc.update(delta)
            yield ("node", node)
    yield ("done", acc.get("synthesis", {}))


def generate_report(transcript, career_profile=None, mh_context=None, counsellor_notes=None,
                    session_summaries=None, name="", with_narrative=True) -> dict:
    """Run the full graph AND build the specialised, counsellor-weighted report.

    Returns {"blueprint": <synthesis>, "report": <specialised report>}. The report
    folds the counsellor's notes in heavily (bounded SPJ override), adds grounded
    career routes with success-probability + time-to-offer estimates, the journey
    arc, and JVIS-style work-role / job-group sections. Stateless: persists nothing."""
    init = _initial(transcript, career_profile, mh_context,
                    counsellor_notes=counsellor_notes, session_summaries=session_summaries,
                    name=name, want_report=True, with_narrative=with_narrative)
    res = dict(PIPELINE.invoke(init))
    return {"blueprint": res.get("synthesis", {}), "report": res.get("report", {})}


def stream_report(transcript, career_profile=None, mh_context=None, counsellor_notes=None,
                  session_summaries=None, name="", with_narrative=True):
    """Same as generate_report but streams ('node', name) progress, then
    ('done', {"blueprint": ..., "report": ...})."""
    init = _initial(transcript, career_profile, mh_context,
                    counsellor_notes=counsellor_notes, session_summaries=session_summaries,
                    name=name, want_report=True, with_narrative=with_narrative)
    acc: dict = dict(init)
    for update in PIPELINE.stream(init, stream_mode="updates"):
        for node, delta in (update or {}).items():
            if isinstance(delta, dict):
                acc.update(delta)
            yield ("node", node)
    yield ("done", {"blueprint": acc.get("synthesis", {}), "report": acc.get("report", {})})
