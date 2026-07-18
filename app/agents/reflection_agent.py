"""Reflection agent — the client-facing therapeutic voice.

This is what makes Setmycareer feel like a great therapist *talking to you*, not a chart.
It runs after metrics/risk so it can speak to the whole picture, and it is grounded
four ways:
  1. the session's own patterns + emotions,
  2. retrieved evidence-based framework guidance (RAG),
  3. the most TOPICALLY RELEVANT real-counselor exemplars (TF-IDF retrieval over the
     curated corpus) used as voice anchors,
  4. on-device personalization (the person's prior context + their feedback on past
     reflections), passed in as patient_context.

It drafts, then runs a groundedness VERIFIER pass that strips anything not supported
by the transcript and enforces a single concrete suggestion — measurably improving
accuracy over a one-shot generation.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

from ..config import settings
from ..llm import chat_json, llm_available, openrouter_available
from .persona import PERSONA, SAFETY_NOTE
from .state import SessionState

# --- tiny TF-IDF over the therapist exemplars (stdlib, ~156 docs) ---------------
_TOKEN = re.compile(r"[a-z][a-z']+")
_STOP = set("the a an and or of to in is are be for with on as at it this that you your i we "
            "can will may not but if so do does done has have had they them their about into "
            "more most some any all our its his her he she than then when what which who my me".split())


def _tok(t: str) -> list[str]:
    return [w for w in _TOKEN.findall(t.lower()) if w not in _STOP and len(w) > 2]


class _Exemplars:
    def __init__(self):
        self.docs: list[dict] = []
        self.tf: list[Counter] = []
        self.idf: dict[str, float] = {}
        self.norms: list[float] = []
        path = Path(__file__).resolve().parents[1] / "knowledge" / "therapist_exemplars.jsonl"
        try:
            self.docs = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
        except Exception:
            self.docs = []
        df: Counter = Counter()
        for d in self.docs:
            c = Counter(_tok(d.get("context", "") + " " + d.get("topic", "")))
            self.tf.append(c); df.update(c.keys())
        n = max(1, len(self.docs))
        self.idf = {t: math.log((1 + n) / (1 + v)) + 1 for t, v in df.items()}
        self.norms = [math.sqrt(sum((f * self.idf.get(t, 0)) ** 2 for t, f in c.items())) or 1.0 for c in self.tf]

    def retrieve(self, query: str, k: int = 3) -> list[dict]:
        if not self.docs:
            return []
        q = Counter(_tok(query))
        if not q:
            return self.docs[:k]
        qw = {t: f * self.idf.get(t, 0) for t, f in q.items()}
        qn = math.sqrt(sum(w * w for w in qw.values())) or 1.0
        scored = []
        for i, c in enumerate(self.tf):
            dot = sum(qw.get(t, 0) * f * self.idf.get(t, 0) for t, f in c.items())
            scored.append((dot / (qn * self.norms[i]), i))
        scored.sort(reverse=True)
        return [self.docs[i] for s, i in scored[:k] if s > 0] or self.docs[:k]


_EX: _Exemplars | None = None


def _retrieve_exemplars(query: str, k: int = 3) -> list[dict]:
    global _EX
    if _EX is None:
        _EX = _Exemplars()
    return _EX.retrieve(query, k)


def _anchor_block(query: str) -> str:
    ex = _retrieve_exemplars(query)
    if not ex:
        return ""
    lines = ["\nVOICE ANCHORS — real counselors responding to similar situations. Match this warmth, "
             "specificity, and restraint. Do NOT copy their content; the person below is different:"]
    for e in ex:
        lines.append(f'- Someone said: "{e.get("context", "")[:150]}"\n  A good counselor replied: "{e.get("response", "")[:380]}"')
    return "\n".join(lines) + "\n"


KEYS = ("opening", "noticing", "strength", "reframe", "question", "closing")

SYSTEM = PERSONA + """

TASK: Write a short, personal reflection the person will read after their session — the kind
of thing a skilled therapist might say to them on the way out the door. Warm, specific, honest.

Respond ONLY with a JSON object with exactly these keys:
{
  "opening": str,        // 1-2 sentences that show you truly heard them; echo a few of THEIR exact words where natural
  "noticing": str,       // one perceptive, caring observation (a pattern, a tension, a shift) — gentle, never clinical
  "strength": str,       // something specific they are already doing well or showing (resilience, insight, reaching out)
  "reframe": str,        // OPTIONAL gentle perspective shift grounded in evidence — use "" if nothing honest fits
  "suggestion": {"title": str, "why": str},  // title = ONE concrete action as a short imperative ("Text one friend tonight"), NOT a sentence; why = one line on how it helps
  "question": str,       // one open, kind question for them to sit with before next time
  "closing": str         // one grounded line — hopeful but honest, never saccharine
}

Before you answer, silently draft and then CHECK your draft:
1) Is every sentence grounded in what they actually said? Where natural, use their own words. Remove anything invented.
2) Is it warm and specific to THIS person — not generic? Rewrite anything that could apply to anyone.
3) Is the suggestion exactly ONE concrete action, phrased as a short imperative a person could do today?
4) Did you avoid diagnosis, medical advice, jargon, and toxic positivity?
5) You only have their WORDS — never imply you saw their face, tone, body language, or eye contact.
Output only the corrected final JSON."""

VERIFY_SYSTEM = """You are a meticulous clinical reviewer improving a reflection written for a client.
You are given the session transcript and a draft reflection (JSON). Return a corrected reflection
with the SAME keys. Fix these without changing the warm voice:
- Remove or correct ANY claim, detail, or quote not supported by the transcript (no inventions).
- Ensure "suggestion.title" is exactly ONE concrete action as a short imperative (split or cut if it's multiple).
- Keep it specific to this person; cut anything generic.
- If a stretch is already good, keep it verbatim.
Respond ONLY with the corrected reflection JSON (keys: opening, noticing, strength, reframe,
suggestion{title,why}, question, closing)."""


def _normalize(data: dict) -> dict:
    sug = data.get("suggestion") or {}
    if isinstance(sug, str):
        sug = {"title": sug, "why": ""}
    out = {k: data.get(k, "") for k in KEYS}
    out["suggestion"] = {"title": sug.get("title", ""), "why": sug.get("why", "")}
    return out


def _fallback(state: SessionState) -> SessionState:
    summary = (state.get("metrics", {}) or {}).get("clinical_summary") or ""
    return {"reflection": {
        "opening": summary or "Thank you for showing up and putting words to this.",
        "noticing": "", "strength": "", "reframe": "",
        "suggestion": {"title": "", "why": ""}, "question": "", "closing": "",
        "generated": False,
    }}


def run(state: SessionState) -> SessionState:
    if not llm_available():
        return _fallback(state)

    metrics = state.get("metrics", {}) or {}
    patterns = state.get("patterns", {}) or {}
    risk = state.get("risk", {}) or {}
    risk_level = risk.get("overall_level", "none")
    emotions = metrics.get("dominant_emotions", []) or []
    themes = (state.get("note", {}) or {}).get("themes", []) or patterns.get("themes", []) or []
    grounding = state.get("framework_context", "")
    transcript = state.get("transcript", "")

    query = " ".join(themes + [e.get("emotion", "") for e in emotions]) or transcript[:300]
    safety = ("\n" + SAFETY_NOTE) if risk_level in ("moderate", "high") else ""
    grounding_block = (f"\nEvidence-based guidance you may draw on (use what fits, don't quote):\n{grounding}\n"
                       if grounding else "")
    ctx = (state.get("patient_context") or "").strip()
    ctx_block = (f"\nWhat we already know about this person (prior context + their feedback on past "
                 f"reflections — adapt your tone and how much you suggest to it):\n{ctx}\n" if ctx else "")

    user = (
        f"{_anchor_block(query)}"
        f"Dominant emotions this session (JSON): {emotions}\n"
        f"Patterns noticed (JSON): {patterns}\n"
        f"Themes: {themes}\n"
        f"Risk level (screening): {risk_level}\n"
        f"{ctx_block}{grounding_block}{safety}\n"
        f"The person's own words — the session transcript:\n\"\"\"\n{transcript}\n\"\"\""
    )
    # the flagship voice — use Claude via OpenRouter when configured, else Groq
    or_model = settings.openrouter_model if openrouter_available() else None
    draft = chat_json(SYSTEM, user, temperature=0.5, model=or_model)
    if not draft or not draft.get("opening"):
        return _fallback(state)
    draft = _normalize(draft)

    # groundedness verifier — always run a second pass that strips anything the
    # transcript doesn't support (the streamed progress UI covers the latency).
    try:
        verify_user = (f"Transcript:\n\"\"\"\n{transcript}\n\"\"\"\n\n"
                       f"Draft reflection (JSON):\n{json.dumps(draft, ensure_ascii=False)}")
        fixed = chat_json(VERIFY_SYSTEM, verify_user, temperature=0.0, model=or_model)
        if fixed and fixed.get("opening"):
            draft = _normalize(fixed)
    except Exception:
        pass

    return {"reflection": {**draft, "generated": True}}
