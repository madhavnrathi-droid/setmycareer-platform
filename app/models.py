"""Pydantic request schemas for the stateless v2 API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    transcript: str = Field(min_length=1)
    modality: str = "general"          # general | cbt | psychodynamic | dbt | act
    person_label: str = "Patient"      # display name used inside the note
    context: str = ""                  # optional prior-session context, supplied by the device


class PairCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(pattern="^(client|clinician)$")


class PairJoin(BaseModel):
    code: str = Field(min_length=4, max_length=12)
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(pattern="^(client|clinician)$")
