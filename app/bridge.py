"""Mental-health bridge — bloo → Setmycareer.

bloo stays mental-health-only; SMC owns career and READS bloo's wellbeing context
to (a) temper career pushes when energy is low and (b) surface the cross-lane
contradiction band. Both apps are separate, so the bridge is a simple contract:
bloo exports the blob below (or the user pastes it / a shared store syncs it).

Contract (what bloo already produces in lib/context.js / chat context):
  { wellbeing_index, band, emotion, dimensions{}, recent_emotions[], notes[],
    n_sessions, sessions_since }

Cross-lane statements always carry the LOWER of the two confidences and are framed
as hypotheses, never folded into a career number.
"""
from __future__ import annotations

from . import db


def save_context(user_id: str, ctx: dict) -> dict:
    if db.available():
        try:
            db.save_mh_context(user_id, ctx)
            return {"ok": True, "stored": True}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)[:140]}
    return {"ok": True, "stored": False, "note": "DATABASE_URL unset — accepted transiently"}


def get_context(user_id: str):
    return db.get_mh_context(user_id) if db.available() else None


def contradiction_band(career_idx, career_delta, wellbeing_idx, wellbeing_delta) -> dict | None:
    """The career×wellbeing tension, as a gentle hypothesis (tentative confidence).
    Returns None when there's no meaningful tension or a leg is missing."""
    if career_idx is None or wellbeing_idx is None:
        return None
    cd = career_delta or 0
    wd = wellbeing_delta or 0
    kind = text = None
    if cd > 2 and wd < -2:
        kind = "burnout_risk"
        text = ("Career momentum is climbing while your wellbeing is dipping — worth protecting "
                "your energy so the gains actually hold.")
    elif cd < -2 and wd > 2:
        kind = "recovering"
        text = "Your wellbeing is recovering even as career momentum cooled — a steadier base to build from."
    elif career_idx >= 60 and wellbeing_idx < 45:
        kind = "strained_climb"
        text = "You're making real career progress on a thin wellbeing reserve — pace matters here."
    elif career_idx < 45 and wellbeing_idx < 45:
        kind = "both_low"
        text = "Both career and wellbeing are running low right now — small, kind next steps over big pushes."
    if not kind:
        return None
    # cross-lane is always a hypothesis → lower-of-two, capped at tentative
    return {"kind": kind, "text": text, "confidence": "tentative"}
