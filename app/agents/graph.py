"""LangGraph orchestration of the therapy-note agent pipeline.

    transcript
       │
       ▼
   entity_extractor ──► pattern_extractor ──► note_generator ──► risk_assessor ──► evidence_linker
       │                                                                                   │
       └───────────────────────── accumulated SessionState ───────────────────────────────┘

The graph is compiled once at import and reused for every session.
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from . import (entity_agent, evidence_agent, metrics_agent, note_agent,
               pattern_agent, reflection_agent, retrieval_agent, risk_agent)
from .state import SessionState


def _build():
    g = StateGraph(SessionState)

    g.add_node("entity_extractor", entity_agent.run)
    g.add_node("pattern_extractor", pattern_agent.run)
    g.add_node("framework_retriever", retrieval_agent.run)
    g.add_node("note_generator", note_agent.run)
    g.add_node("risk_assessor", risk_agent.run)
    g.add_node("metrics_scorer", metrics_agent.run)
    g.add_node("evidence_linker", evidence_agent.run)
    g.add_node("reflection_writer", reflection_agent.run)

    # Parallelized DAG — each node writes a disjoint state key, so independent
    # branches run concurrently and the wall-clock follows the critical path
    # (entity → pattern → note → reflection) instead of all nodes in series.
    #   risk is transcript-only        → runs in parallel with the entity chain
    #   metrics needs patterns + risk  → runs in parallel with note
    #   evidence needs the note        → runs in parallel with reflection's wait
    g.add_edge(START, "entity_extractor")
    g.add_edge(START, "risk_assessor")
    g.add_edge("entity_extractor", "pattern_extractor")
    g.add_edge("pattern_extractor", "framework_retriever")
    g.add_edge("framework_retriever", "note_generator")
    g.add_edge("pattern_extractor", "metrics_scorer")   # metrics waits for...
    g.add_edge("risk_assessor", "metrics_scorer")        # ...both pattern AND risk
    g.add_edge("note_generator", "evidence_linker")
    g.add_edge("note_generator", "reflection_writer")    # reflection waits for...
    g.add_edge("metrics_scorer", "reflection_writer")    # ...both note AND metrics
    g.add_edge("evidence_linker", END)
    g.add_edge("reflection_writer", END)

    return g.compile()


PIPELINE = _build()


def _initial(transcript, modality, patient_name, patient_context) -> SessionState:
    return {
        "transcript": transcript,
        "modality": modality,
        "patient_name": patient_name,
        "patient_context": patient_context,
        "errors": [],
    }


def run_pipeline(transcript: str, modality: str = "general",
                 patient_name: str = "Patient", patient_context: str = "") -> dict:
    """Run the full pipeline and return the accumulated state as a plain dict."""
    result = PIPELINE.invoke(_initial(transcript, modality, patient_name, patient_context))
    return dict(result)


# Friendly stage labels for streamed progress (deep-research-style UX).
STAGE_LABELS = {
    "entity_extractor": "Reading the session",
    "risk_assessor": "Checking for anything that needs care",
    "pattern_extractor": "Noticing patterns & themes",
    "framework_retriever": "Grounding in evidence",
    "note_generator": "Writing the clinical note",
    "metrics_scorer": "Estimating your signals",
    "evidence_linker": "Linking evidence to your words",
    "reflection_writer": "Writing your reflection",
}
STAGE_TOTAL = len(STAGE_LABELS)


def stream_pipeline(transcript: str, modality: str = "general",
                    patient_name: str = "Patient", patient_context: str = ""):
    """Generator yielding ('node', name) as each node completes, then ('done', full_dict).

    LangGraph's 'updates' stream emits one dict per superstep ({node: delta}); with the
    parallelized DAG several nodes can land in one superstep, so we walk each.
    """
    acc: dict = dict(_initial(transcript, modality, patient_name, patient_context))
    for update in PIPELINE.stream(
        _initial(transcript, modality, patient_name, patient_context), stream_mode="updates"
    ):
        for node, delta in (update or {}).items():
            if isinstance(delta, dict):
                acc.update(delta)
            yield ("node", node)
    yield ("done", acc)
