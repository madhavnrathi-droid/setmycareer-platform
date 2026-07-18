"""Layer 3 — Entity extractor.

Pulls structured clinical entities out of a raw transcript: people,
relationships, trauma events, emotions, medications, diagnoses.
"""
from __future__ import annotations

from ..llm import chat_json
from .state import SessionState

SYSTEM = """You are a clinical entity extraction module inside a therapy note system.
Read the session transcript and extract structured entities. Respond ONLY with a JSON object
with exactly these keys (use empty arrays when nothing is found):

{
  "people":        [{"name": str, "role": str}],          // people mentioned (partner, mother, boss...)
  "relationships": [{"who": str, "quality": str}],         // relational dynamics described
  "trauma_events": [{"event": str, "when": str}],          // past/ongoing adverse events
  "emotions":      [{"emotion": str, "context": str}],     // affect expressed by the patient
  "medications":   [{"name": str, "status": str}],         // status: current|started|stopped|changed|mentioned
  "diagnoses":     [{"name": str, "status": str}]          // status: confirmed|suspected|historical|mentioned
}

Rules for precision:
- Only extract what is actually stated or strongly implied. Never invent.
- People: include only named or clearly-referenced individuals (\"my mother\" counts; \"people\" does not).
- Medications: extract the exact name as spoken, even if misspelled; infer status only from explicit
  cues (\"started\", \"stopped\", \"they upped my dose\" → changed).
- Emotions: only emotions the PATIENT expresses about themselves, with the situation they attach to.
- When uncertain whether something qualifies, leave it out — precision beats recall here."""


def run(state: SessionState) -> SessionState:
    transcript = state.get("transcript", "")
    data = chat_json(SYSTEM, f"Transcript:\n\"\"\"\n{transcript}\n\"\"\"")
    entities = {
        "people": data.get("people", []),
        "relationships": data.get("relationships", []),
        "trauma_events": data.get("trauma_events", []),
        "emotions": data.get("emotions", []),
        "medications": data.get("medications", []),
        "diagnoses": data.get("diagnoses", []),
    }
    return {"entities": entities, "llm_used": bool(data)}
