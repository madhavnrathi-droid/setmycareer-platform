"""RAG node — retrieves therapy-framework guidance relevant to this session.

Builds a query from the session's themes, cognitive distortions, and dominant
emotions, then pulls the top framework chunks (CBT/DBT/ACT/MI/WHO) so the note
generator's Plan/homework is grounded in real clinical material rather than the
model's free association.
"""
from __future__ import annotations

from .. import rag
from .state import SessionState


def run(state: SessionState) -> SessionState:
    patterns = state.get("patterns", {}) or {}
    parts = list(patterns.get("themes", []) or [])
    parts += [d.get("type", "") for d in patterns.get("cognitive_distortions", []) or []]
    parts += [a.get("behavior", "") for a in patterns.get("avoidance", []) or []]
    # fall back to the transcript opening if pattern extraction was thin
    query = " ".join(p for p in parts if p).strip() or state.get("transcript", "")[:400]
    return {"framework_context": rag.grounding_text(query, k=3)}
