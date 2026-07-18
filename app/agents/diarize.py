"""Speaker attribution for transcripts.

Groq Whisper returns words but not *who said them*. This adds a turn-attribution
pass that re-segments a raw transcript into speaker-labelled turns. It is
text-level diarization (the LLM infers speakers from conversational structure —
in therapy the clinician asks open questions and reflects, the client discloses),
not acoustic diarization. It needs no extra service or account and keeps audio on
the same single STT provider already in use. For true voice-print diarization a
provider like Deepgram/AssemblyAI would be wired in behind this same interface.
"""
from __future__ import annotations

from ..llm import chat_text, llm_available

SYSTEM = """You are a transcript diarizer. You are given the raw, unpunctuated-by-speaker text
of a spoken conversation that has {n} speakers but no speaker labels. Re-segment it into turns
and prefix each turn with the correct speaker label, inferring who is speaking from the content
and flow of the dialogue.

Speakers: {roles}.
{role_hint}

Strict rules:
- PRESERVE the words exactly. Do not summarize, paraphrase, add, or drop content. Only insert
  speaker labels and split the text into turns.
- One turn per line, formatted exactly as "Label: their words".
- Start a new turn only at a genuine speaker change.
- If a stretch is clearly one continuous speaker, keep it as one turn.
Return ONLY the labelled transcript as plain text — no preamble, no commentary."""

THERAPY_HINT = ("This looks like a therapy session: the therapist tends to ask open questions, "
                "reflect feelings, and stay brief; the client discloses experiences at length. "
                "Use that to attribute turns.")


def label_speakers(transcript: str, roles: list[str] | None = None) -> str:
    """Return the transcript re-segmented with speaker labels. Falls back to the
    raw transcript on any failure or when there is nothing to attribute."""
    text = (transcript or "").strip()
    if not text or not llm_available():
        return text
    roles = [r.strip() for r in (roles or []) if r and r.strip()]
    if len(roles) < 2:
        return text  # single speaker → nothing to diarize
    # already labelled (imported transcript)? leave it.
    if any(text.lstrip().startswith(r + ":") for r in roles) or text[:40].count(":") and "\n" in text[:120]:
        # heuristic: looks pre-labelled — don't double-label
        labelled_already = sum(1 for ln in text.splitlines()[:8] if ":" in ln.split(" ", 1)[0]) >= 2
        if labelled_already:
            return text
    is_therapy = any(r.lower() in ("therapist", "clinician", "client", "patient") for r in roles)
    system = SYSTEM.format(
        n=len(roles), roles=" and ".join(roles),
        role_hint=THERAPY_HINT if is_therapy else "",
    )
    out = chat_text(system, f"Raw transcript:\n\"\"\"\n{text}\n\"\"\"", temperature=0.0)
    out = (out or "").strip()
    # guard: only accept if it actually produced labelled turns and didn't lose the content
    if out and ":" in out and len(out) > len(text) * 0.5:
        return out
    return text
