"""Layer 3 — Clinical pattern extractor.

Identifies higher-level clinical patterns: cognitive distortions, attachment
patterns, avoidance behaviours, and emotional shifts across the session.
"""
from __future__ import annotations

from ..llm import chat_json
from .state import SessionState

SYSTEM = """You are a clinical pattern recognition module inside a therapy note system.
Given a session transcript (and any extracted entities), identify clinical patterns.
Respond ONLY with a JSON object with exactly these keys (empty arrays when none):

{
  "cognitive_distortions": [{"type": str, "example": str}],   // e.g. catastrophizing, black-and-white
  "attachment_patterns":   [{"pattern": str, "evidence": str}],// TENTATIVE only — phrase as "possible …, worth exploring"
  "avoidance":             [{"behavior": str, "context": str}],// experiential/behavioral avoidance
  "emotional_shifts":      [{"from": str, "to": str, "trigger": str}],
  "themes":                [str]                                // 2-5 short cross-cutting session themes
}

Rules for precision:
- Every "example"/"evidence" value MUST be a short verbatim quote copied exactly from the transcript.
- Name a cognitive distortion only when the quoted words actually instantiate it (e.g.
  "if one thing goes wrong the whole day is ruined" → all-or-nothing thinking). Do not
  diagnose a distortion from tone alone.
- Attachment patterns: a single short session is NOT enough to assert a stable attachment style.
  Describe what you see in PLAIN LANGUAGE as a tentative relational pattern, NOT a clinical typology
  label. Prefer "pattern": "tends to brace for criticism / seek reassurance — worth exploring" over
  "anxious-preoccupied". Only include one with REPEATED relational evidence across the session; when
  in doubt, return an empty list — over-claiming is a credibility error.
- Themes must be groundable: for each theme you list, you should be able to point to at
  least two transcript moments. Prefer 2-3 strong themes over 5 weak ones.
- Be a careful clinician, not speculative. Omit anything you cannot quote."""


def run(state: SessionState) -> SessionState:
    transcript = state.get("transcript", "")
    entities = state.get("entities", {})
    user = (
        f"Transcript:\n\"\"\"\n{transcript}\n\"\"\"\n\n"
        f"Extracted entities (JSON): {entities}"
    )
    data = chat_json(SYSTEM, user)
    patterns = {
        "cognitive_distortions": data.get("cognitive_distortions", []),
        "attachment_patterns": data.get("attachment_patterns", []),
        "avoidance": data.get("avoidance", []),
        "emotional_shifts": data.get("emotional_shifts", []),
        "themes": data.get("themes", []),
    }
    return {"patterns": patterns}
