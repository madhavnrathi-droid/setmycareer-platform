"""Layer 3 — Risk assessor.

Screens the transcript for safety signals. This is DECISION SUPPORT ONLY — it
surfaces possible flags with supporting quotes for the clinician to review. It
is not a validated instrument and must never replace clinical judgment.
"""
from __future__ import annotations

from ..llm import chat_json
from .state import SessionState

DISCLAIMER = (
    "Automated screening for clinician review only. Not a validated risk assessment. "
    "If imminent risk is suspected, follow your crisis protocol immediately."
)

SYSTEM = """You are a cautious clinical risk-screening module. Read the transcript and flag possible
safety concerns for a clinician to review. Respond ONLY with a JSON object:

{
  "overall_level": "none" | "low" | "moderate" | "high",
  "categories": {
    "suicide":    {"level": "none|low|moderate|high", "rationale": str, "quotes": [str]},
    "self_harm":  {"level": "none|low|moderate|high", "rationale": str, "quotes": [str]},
    "harm_to_others": {"level": "none|low|moderate|high", "rationale": str, "quotes": [str]},
    "mania":      {"level": "none|low|moderate|high", "rationale": str, "quotes": [str]},
    "psychosis":  {"level": "none|low|moderate|high", "rationale": str, "quotes": [str]}
  },
  "recommended_actions": [str]
}

Quotes MUST be copied verbatim from the transcript. When there is no evidence for a category,
set its level to "none" with empty quotes. Be conservative: do not over-pathologize ordinary
distress, but never miss explicit statements of intent."""

_LEVELS = {"none": 0, "low": 1, "moderate": 2, "high": 3}


def _max_level(categories: dict) -> str:
    best = 0
    for c in categories.values():
        best = max(best, _LEVELS.get((c or {}).get("level", "none"), 0))
    for name, v in _LEVELS.items():
        if v == best:
            return name
    return "none"


def run(state: SessionState) -> SessionState:
    transcript = state.get("transcript", "")
    data = chat_json(SYSTEM, f"Transcript:\n\"\"\"\n{transcript}\n\"\"\"", temperature=0.0)

    categories = data.get("categories", {}) if data else {}
    # Normalize so the UI can rely on all keys existing.
    for key in ("suicide", "self_harm", "harm_to_others", "mania", "psychosis"):
        c = categories.get(key) or {}
        categories[key] = {
            "level": c.get("level", "none"),
            "rationale": c.get("rationale", ""),
            "quotes": c.get("quotes", []),
        }

    risk = {
        "overall_level": data.get("overall_level") or _max_level(categories),
        "categories": categories,
        "recommended_actions": data.get("recommended_actions", []),
        "disclaimer": DISCLAIMER,
    }
    return {"risk": risk}
