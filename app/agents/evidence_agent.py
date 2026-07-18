"""Layer 3 — Evidence linker.

Attaches exact transcript moments to the key themes/findings so the clinician
can trace every claim back to what was actually said.
"""
from __future__ import annotations

from ..llm import chat_json
from .state import SessionState

SYSTEM = """You attach evidence to clinical findings. Given a transcript and a set of session
themes/findings, return the verbatim transcript snippets that best support each one.
Respond ONLY with a JSON object:

{
  "links": [
    {"finding": str, "quote": str, "category": "theme|emotion|pattern|risk|other"}
  ]
}

Each "quote" MUST be copied verbatim (a short sentence or phrase) from the transcript.
Return at most 8 of the most important links. If a finding has no clear quote, omit it."""


def run(state: SessionState) -> SessionState:
    transcript = state.get("transcript", "")
    themes = (state.get("patterns", {}) or {}).get("themes", [])
    note_themes = (state.get("note", {}) or {}).get("themes", [])
    findings = list({*(themes or []), *(note_themes or [])})

    if not findings:
        return {"evidence": []}

    user = (
        f"Findings to support: {findings}\n\n"
        f"Transcript:\n\"\"\"\n{transcript}\n\"\"\""
    )
    data = chat_json(SYSTEM, user, temperature=0.0)
    links = data.get("links", []) if data else []
    # Keep only links whose quote actually appears in the transcript.
    verified = [
        l for l in links
        if isinstance(l, dict) and l.get("quote") and l["quote"].strip()[:40] in transcript
    ]
    return {"evidence": verified or links[:8]}
