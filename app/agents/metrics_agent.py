"""Blueprint scorer — powers the mental health dashboard.

Accuracy design (in order of impact):
  1. Evidence-first scoring — the model must quote the transcript verbatim and
     reason BEFORE it scores (field order enforces this), which suppresses
     "vibes-based" numbers. Quotes are verified against the transcript in
     Python; dimensions whose evidence doesn't check out are downgraded.
  2. Emotions before numbers — the model first names the dominant emotions in
     the session, then scores dimensions. Not everything has to be a number:
     a dimension that wasn't discussed stays null with a qualitative state.
  3. Anchored rubric — bands tied to the constructs of validated instruments
     (PHQ-9 mood, GAD-7 anxiety, ISI sleep, UCLA loneliness, RRS rumination)
     with calibration examples spanning the full range.
  4. Deterministic composite — the Blueprint index is computed in Python from
     the subscores, never invented by the model, and capped by the risk agent.

These are wellness-tracking signals, NOT diagnoses or validated assessments.
"""
from __future__ import annotations

from ..llm import chat_json
from .state import SessionState

SYSTEM = """You are a careful clinical scoring module inside a therapy-notes app.

Work in this order:
STEP 1 — Read the transcript and identify the dominant EMOTIONS actually expressed
(e.g. anxious, ashamed, hopeful, numb, angry, relieved, lonely, proud). Quote the moment
each emotion appears.
STEP 2 — For each dimension below: first collect verbatim evidence quotes, then write
one sentence of reasoning, then give a qualitative state word, and only then a 0-100 score.
If the transcript contains no real signal for a dimension, use score null and state
"not discussed" — never guess.

Scoring bands (100 = thriving, 0 = severe difficulty), anchored in validated constructs:
- 85-100 thriving: explicit positive statements, no difficulty expressed
- 60-84 steady: mild or passing difficulty, functioning intact
- 40-59 strained: recurring distress with some functional impact
- 20-39 struggling: pervasive distress, clear functional impairment
- 0-19 severe: constant distress, major impairment, or safety concern

Calibration examples:
A. "Work is busy but I'm sleeping fine and saw friends twice this week." → sleep_quality 85
   ("sleeping fine"), social_connectedness 82 ("saw friends twice").
B. "I haven't slept more than 3 hours in weeks. I cancelled on everyone again." →
   sleep_quality 12, social_connectedness 22.
C. "The promotion felt good for a day, then the dread came back every morning." →
   mood 45 (brief positive, recurrent dread), anxiety_regulation 38 ("dread... every morning").
D. "Honestly this week was okay. The breathing exercises helped before the interview." →
   anxiety_regulation 68 (coping skill used effectively, stressor handled).

Dimensions and their anchor constructs:
- mood — PHQ-9: anhedonia, low mood, worthlessness, hopelessness
- anxiety_regulation — GAD-7: worry, restlessness, dread, ability to settle
- energy_activation — fatigue, psychomotor change, engagement with life
- sleep_quality — ISI: falling asleep, staying asleep, daytime impact
- social_connectedness — UCLA: isolation vs. felt support and contact
- cognitive_flexibility — RRS inverse: rumination, loops, all-or-nothing thinking
- affect_balance — ratio of positive to negative affect expressed in session

Respond ONLY with a JSON object:
{
  "dominant_emotions": [{"emotion": str, "intensity": "low"|"moderate"|"high", "quote": str}],
  "dimensions": {
    "<dimension_key>": {
      "evidence": [str],          // verbatim quotes copied EXACTLY from the transcript
      "reasoning": str,           // one sentence tying evidence to the band
      "state": str,               // one feeling-word: e.g. settled, strained, heavy, wired, flat, hopeful, "not discussed"
      "score": int | null
    }
    // include ALL seven keys, in the order listed above
  },
  "clinical_summary": str         // 2-3 warm, plain-language, HEDGED sentences a patient could read
}

IMPORTANT — these are rough estimates from a single short session, not measurements. In the
clinical_summary, hedge ("it sounds like…", "this session suggests…", "may be"), name at most one
gentle hypothesis, and avoid any diagnosis or stable-trait/attachment claim. Treat every number as
a probabilistic read of what was said today, not a verdict."""

WEIGHTS = {
    "mood": 0.25,
    "anxiety_regulation": 0.20,
    "energy_activation": 0.10,
    "sleep_quality": 0.10,
    "social_connectedness": 0.15,
    "cognitive_flexibility": 0.10,
    "affect_balance": 0.10,
}

DIMENSION_LABELS = {
    "mood": "Mood",
    "anxiety_regulation": "Anxiety regulation",
    "energy_activation": "Energy & activation",
    "sleep_quality": "Sleep quality",
    "social_connectedness": "Social connectedness",
    "cognitive_flexibility": "Cognitive flexibility",
    "affect_balance": "Affect balance",
}


def _norm_quote(s: str) -> str:
    return "".join(ch.lower() for ch in s if ch.isalnum() or ch == " ").strip()


def _evidence_count(quotes: list, transcript: str) -> int:
    """How many distinct quotes genuinely appear in the transcript."""
    hay = _norm_quote(transcript)
    n = 0
    for q in quotes or []:
        needle = _norm_quote(str(q))[:60]
        if len(needle) >= 12 and needle in hay:
            n += 1
    return n


# More grounding evidence → more confidence in a score. Presented in the UI so
# numbers read as estimates with a confidence level, not precise measurements.
def _confidence(score, n_verified: int) -> str:
    if score is None:
        return "none"
    if n_verified >= 2:
        return "moderate"
    if n_verified == 1:
        return "tentative"
    return "low"


def _composite(dimensions: dict) -> int | None:
    present = {k: v for k, v in dimensions.items()
               if isinstance(v.get("score"), (int, float))}
    if not present:
        return None
    total_w = sum(WEIGHTS[k] for k in present)
    score = sum(v["score"] * WEIGHTS[k] for k, v in present.items()) / total_w
    return round(max(0, min(100, score)))


def run(state: SessionState) -> SessionState:
    transcript = state.get("transcript", "")
    user = (
        f"Extracted entities (JSON): {state.get('entities', {})}\n"
        f"Extracted patterns (JSON): {state.get('patterns', {})}\n\n"
        f"Transcript:\n\"\"\"\n{transcript}\n\"\"\""
    )
    data = chat_json(SYSTEM, user, temperature=0.0)
    raw_dims = (data or {}).get("dimensions", {}) or {}

    dimensions = {}
    for key in WEIGHTS:
        d = raw_dims.get(key) or {}
        score = d.get("score")
        evidence = [str(q) for q in (d.get("evidence") or []) if str(q).strip()]
        n_verified = _evidence_count(evidence, transcript)
        verified = n_verified >= 1
        if isinstance(score, (int, float)) and not verified:
            # Unverifiable evidence → don't trust a hard number; keep the
            # qualitative read but drop the score so the composite stays honest.
            score = None
        final_score = int(score) if isinstance(score, (int, float)) else None
        dimensions[key] = {
            "label": DIMENSION_LABELS[key],
            "score": final_score,
            "state": (d.get("state") or ("not discussed" if score is None else "")).lower(),
            "evidence": evidence[:3],
            "reasoning": d.get("reasoning", ""),
            "evidence_verified": verified,
            "confidence": _confidence(final_score, n_verified),
        }

    emotions = []
    for e in (data or {}).get("dominant_emotions", [])[:6]:
        if isinstance(e, dict) and e.get("emotion"):
            emotions.append({
                "emotion": str(e["emotion"]).lower(),
                "intensity": e.get("intensity", "moderate"),
                "quote": e.get("quote", ""),
            })

    wellbeing = _composite(dimensions)

    # Safety override: the dashboard must never look reassuring when the risk
    # agent has flagged the session.
    risk_level = (state.get("risk") or {}).get("overall_level", "none")
    if wellbeing is not None and risk_level == "high":
        wellbeing = min(wellbeing, 25)
    elif wellbeing is not None and risk_level == "moderate":
        wellbeing = min(wellbeing, 45)

    metrics = {
        "wellbeing_index": wellbeing,
        "dominant_emotions": emotions,
        "dimensions": dimensions,
        "clinical_summary": (data or {}).get("clinical_summary", ""),
        "risk_capped": risk_level in ("moderate", "high"),
        "disclaimer": "Wellness-tracking signals, not a diagnosis or validated assessment.",
    }
    return {"metrics": metrics}
