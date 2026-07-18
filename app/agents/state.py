"""Shared state flowing through the LangGraph pipeline."""
from __future__ import annotations

from typing import Any, TypedDict


class SessionState(TypedDict, total=False):
    # Inputs
    transcript: str
    modality: str          # general | cbt | psychodynamic | dbt | act
    patient_name: str
    patient_context: str   # short summary of prior sessions/timeline (retrieval)

    # Agent outputs
    entities: dict[str, Any]
    patterns: dict[str, Any]
    framework_context: str     # retrieved CBT/DBT/ACT/WHO grounding (RAG node)
    note: dict[str, Any]       # structured therapist note
    note_markdown: str
    risk: dict[str, Any]
    metrics: dict[str, Any]    # wellbeing index + clinical-rubric subscores
    evidence: list[dict[str, Any]]
    reflection: dict[str, Any]  # warm, client-facing therapeutic feedback

    # Bookkeeping
    llm_used: bool
    errors: list[str]
