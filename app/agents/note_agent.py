"""The note generator — highest-priority agent.

Produces a structured, therapist-style progress note adapted to the chosen
modality (CBT / psychodynamic / DBT / ACT / general). Returns structured JSON;
the markdown is rendered deterministically in Python so it stays consistent and
cheap (one LLM call).
"""
from __future__ import annotations

from ..llm import chat_json
from .persona import OBSERVER_STANCE
from .state import SessionState

# Per-modality lens applied to the assessment/plan sections.
MODALITY_GUIDANCE = {
    "general": "Write a balanced, integrative progress note.",
    "cbt": "Emphasize the cognitive-behavioral frame: situations, automatic thoughts, "
           "distortions, behaviors, and concrete between-session homework/experiments.",
    "psychodynamic": "Emphasize relational and unconscious themes: transference, defenses, "
                     "recurring relational patterns, and links to early experience.",
    "dbt": "Emphasize emotion regulation, distress tolerance, interpersonal effectiveness, "
           "and mindfulness skills; note skill use and diary-card relevant content.",
    "act": "Emphasize values, psychological flexibility, acceptance, defusion, and committed "
           "action aligned with the patient's stated values.",
}

SYSTEM = """You are an experienced licensed therapist writing a concise, professional progress note
after a session. Use clear clinical language, neutral tone, and brevity. {modality_guidance}

""" + OBSERVER_STANCE + """

Respond ONLY with a JSON object with exactly these keys:

{{
  "presenting_concerns": str,          // 1-2 sentences on what brought the patient today
  "subjective": str,                   // patient's reported experience, in their framing (S of SOAP)
  "objective": str,                    // ONLY language-based observations from the transcript (see rules)
  "assessment": str,                   // tentative, hedged formulation through the modality lens (A)
  "plan": str,                         // next steps, interventions, follow-up (P)
  "homework": [str],                   // concrete tasks/experiments (may be empty)
  "themes": [str],                     // 2-5 short session themes
  "followup_questions": [str]          // 2-4 things to revisit next session
}}

Rules for quality:
- Be SPECIFIC: name the actual situations, people, and events the patient described.
  "Patient reports conflict with their mother over weekend plans" beats "interpersonal stressors".
- Write only what the transcript supports. Do not fabricate quotes, scores, or history.
- OBJECTIVE section — this is a TEXT transcript with NO audio/video. Describe ONLY language-based
  observations: the content they reported, the emotions they expressed in words, and HOW they
  talked (e.g. self-critical framing, absolute vs. tentative language, avoidance of a topic).
  You MUST NOT mention eye contact, appearance, posture, tone of voice, psychomotor activity, or
  response latency. If unsure, prefix with "From the transcript:". If there is nothing
  language-based to note, write "Limited to transcript content; no audio/visual data."
- ASSESSMENT — frame as a TENTATIVE, evidence-based hypothesis, never a diagnosis or conclusion.
  Use "patterns that may be consistent with…", "the session suggests…", "more sessions would help
  clarify whether…". Do not assert a diagnosis or a stable trait/attachment style from one session.
  State any causal link as a correlation, not a mechanism ("may be linked to", "alongside") —
  never "driven by" or "because of".
- Homework items must be concrete and actionable, derived from what was actually discussed.
- Keep every section tight: 2-4 sentences. A reviewing clinician should recognize the
  session immediately from the note."""


# Deterministic guard (not prompt-only): strip any sentence that asserts a
# non-verbal/audio/visual observation a text transcript cannot support. This is
# the credibility backstop the clinical audit asked for — if the model leaks
# "maintained eye contact", we remove it rather than ship it.
import re as _re

_NONVERBAL = (
    "eye contact", "eye-contact", "made eye", "maintained eye", "averted", "gaze",
    "posture", "sat forward", "leaned back", "leaned forward", "fidget", "restless leg",
    "well-groomed", "groomed", "disheveled", "dishevelled", "unkempt",
    "tone of voice", "spoke softly", "spoke quietly", "spoke rapidly", "voice was",
    "psychomotor", "slowed movement", "response latency", "answered promptly",
    "responded promptly", "answers promptly", "body language", "facial expression",
    "tearful in", "appeared ", "presented as ",
)
_SAFE_OBJ = "Limited to transcript content; no audio or video data was available."


def sanitize_nonverbal(text: str) -> str:
    """Drop sentences that claim non-verbal cues unknowable from text."""
    if not text:
        return text
    sentences = _re.split(r"(?<=[.!?])\s+", text)
    kept = [s for s in sentences if not any(t in s.lower() for t in _NONVERBAL)]
    return " ".join(kept).strip()


def render_markdown(note: dict, modality: str, patient_name: str) -> str:
    def block(title: str, body: str) -> str:
        body = (body or "").strip()
        return f"### {title}\n{body if body else '_—_'}\n"

    def bullets(title: str, items: list[str]) -> str:
        items = [i for i in (items or []) if str(i).strip()]
        if not items:
            return ""
        lines = "\n".join(f"- {i}" for i in items)
        return f"### {title}\n{lines}\n"

    header = f"## Progress Note — {patient_name}\n*Modality: {modality.upper()}*\n"
    parts = [
        header,
        block("Presenting Concerns", note.get("presenting_concerns", "")),
        block("Subjective", note.get("subjective", "")),
        block("Objective", note.get("objective", "")),
        block("Assessment", note.get("assessment", "")),
        block("Plan", note.get("plan", "")),
        bullets("Homework", note.get("homework", [])),
        bullets("Themes", note.get("themes", [])),
        bullets("Follow-up Next Session", note.get("followup_questions", [])),
    ]
    return "\n".join(p for p in parts if p).strip() + "\n"


def _demo_note(state: SessionState) -> SessionState:
    """Fallback when no LLM key is configured — keeps the app fully usable."""
    transcript = state.get("transcript", "")
    snippet = (transcript[:280] + "…") if len(transcript) > 280 else transcript
    note = {
        "presenting_concerns": "(Demo mode — no GROQ_API_KEY set, so notes are not AI-generated.)",
        "subjective": snippet or "No transcript captured.",
        "objective": "",
        "assessment": "Add a GROQ_API_KEY environment variable to enable the AI agent pipeline.",
        "plan": "",
        "homework": [],
        "themes": [],
        "followup_questions": [],
    }
    md = render_markdown(note, state.get("modality", "general"), state.get("patient_name", "Patient"))
    return {"note": note, "note_markdown": md}


def run(state: SessionState) -> SessionState:
    from ..llm import llm_available

    if not llm_available():
        return _demo_note(state)

    modality = state.get("modality", "general")
    guidance = MODALITY_GUIDANCE.get(modality, MODALITY_GUIDANCE["general"])
    system = SYSTEM.format(modality_guidance=guidance)

    grounding = state.get("framework_context", "")
    grounding_block = (
        f"\nEvidence-based framework guidance to ground the Plan/homework "
        f"(use what fits; do not quote verbatim):\n{grounding}\n" if grounding else ""
    )
    user = (
        f"Patient: {state.get('patient_name', 'Patient')}\n"
        f"Prior context: {state.get('patient_context') or 'none'}\n\n"
        f"Extracted entities (JSON): {state.get('entities', {})}\n"
        f"Extracted patterns (JSON): {state.get('patterns', {})}\n"
        f"{grounding_block}\n"
        f"Full transcript:\n\"\"\"\n{state.get('transcript', '')}\n\"\"\""
    )
    data = chat_json(system, user, temperature=0.3)
    if not data:
        return _demo_note(state)

    # backstop the prompt rules in code: never let a fabricated non-verbal
    # observation reach the report, even if the model ignores the instruction.
    objective = sanitize_nonverbal(data.get("objective", "")) or _SAFE_OBJ
    assessment = sanitize_nonverbal(data.get("assessment", ""))

    note = {
        "presenting_concerns": data.get("presenting_concerns", ""),
        "subjective": data.get("subjective", ""),
        "objective": objective,
        "assessment": assessment,
        "plan": data.get("plan", ""),
        "homework": data.get("homework", []),
        "themes": data.get("themes", []),
        "followup_questions": data.get("followup_questions", []),
    }
    md = render_markdown(note, modality, state.get("patient_name", "Patient"))
    return {"note": note, "note_markdown": md}
