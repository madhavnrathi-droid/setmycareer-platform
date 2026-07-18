"""Fireflies-grade meeting connector.

Dispatches a bot that JOINS Zoom / Google Meet / Teams via the meeting URL,
records, and transcribes — then runs the career pipeline over the transcript and
persists the Blueprint. Uses Recall.ai as the bot backend (the industry-standard
API that powers Fireflies / Otter / Fathom-class products); the existing Google
Meet / Zoho OAuth + manual import remain as host-side fallbacks.

Live dispatch needs RECALL_API_KEY. Without it, status() reports the provider as
unconfigured and the app falls back to manual import — nothing breaks.
"""
from __future__ import annotations

import re
import uuid

import httpx

from . import db
from .config import settings

_PLATFORMS = [
    (r"zoom\.us", "zoom"),
    (r"meet\.google\.com", "google_meet"),
    (r"teams\.(microsoft|live)\.com", "teams"),
    (r"webex\.com", "webex"),
]


def configured() -> bool:
    return bool(settings.recall_api_key)


def _headers() -> dict:
    return {"Authorization": f"Token {settings.recall_api_key}", "Content-Type": "application/json"}


def detect_platform(url: str) -> str | None:
    for pat, name in _PLATFORMS:
        if re.search(pat, url or "", re.I):
            return name
    return None


def status() -> dict:
    return {"recall": {"state": "ready" if configured() else "unconfigured",
                       "label": "Auto-join notetaker (Recall.ai)"}}


def dispatch_bot(user_id: str | None, meeting_url: str, bot_name: str = "Setmycareer Notetaker") -> dict:
    """Send a bot to auto-join + record + transcribe the meeting."""
    if not configured():
        return {"error": "not_configured",
                "message": "Add RECALL_API_KEY to auto-join meetings. Until then, import the recording or transcript manually."}
    platform = detect_platform(meeting_url)
    body: dict = {
        "meeting_url": meeting_url,
        "bot_name": bot_name,
        # Regional Recall API (e.g. ap-northeast-1) uses recording_config, not the
        # legacy transcription_options. meeting_captions = the platform's own captions.
        "recording_config": {"transcript": {"provider": {"meeting_captions": {}}}},
    }
    if settings.recall_webhook_url:
        body["webhook_url"] = settings.recall_webhook_url
    try:
        r = httpx.post(f"{settings.recall_base}/api/v1/bot/", headers=_headers(), json=body, timeout=20.0)
    except httpx.HTTPError as exc:
        return {"error": "request_failed", "message": str(exc)[:140]}
    if r.status_code >= 400:
        return {"error": "recall_error", "status": r.status_code, "message": r.text[:200]}
    bot_id = r.json().get("id")
    if db.available() and user_id:
        try:
            db.save_meeting_bot({"user_id": user_id, "provider": "recall", "meeting_url": meeting_url,
                                 "platform": platform, "bot_id": bot_id, "status": "joining"})
        except Exception:  # noqa: BLE001
            pass
    return {"bot_id": bot_id, "platform": platform, "status": "joining"}


def fetch_transcript(bot_id: str) -> str | None:
    """Pull the finished transcript and flatten it into speaker-labeled lines."""
    if not configured():
        return None
    try:
        r = httpx.get(f"{settings.recall_base}/api/v1/bot/{bot_id}/transcript/", headers=_headers(), timeout=25.0)
    except httpx.HTTPError:
        return None
    if r.status_code >= 400:
        return None
    data = r.json()
    segments = data if isinstance(data, list) else data.get("transcript", [])
    lines: list[str] = []
    for seg in segments:
        speaker = seg.get("speaker") or "Speaker"
        words = seg.get("words") or []
        text = " ".join(w.get("text", "") for w in words) if words else (seg.get("text") or "")
        if text.strip():
            lines.append(f"{speaker}: {text.strip()}")
    return "\n".join(lines) or None


def process_completed_bot(bot_id: str) -> dict:
    """Webhook completion → fetch transcript → career pipeline → persist."""
    from .career.analyze import analyze_career  # lazy (heavier import)

    transcript = fetch_transcript(bot_id)
    if not transcript:
        if db.available():
            try:
                db.update_meeting_bot(bot_id, status="failed")
            except Exception:  # noqa: BLE001
                pass
        return {"ok": False, "reason": "no_transcript"}

    rec = db.get_meeting_bot(bot_id) if db.available() else None
    user_id = rec.get("user_id") if rec else None
    career_profile = db.get_career_profile(user_id) if (user_id and db.available()) else None
    mh = db.get_mh_context(user_id) if (user_id and db.available()) else None

    session_id = None
    if db.available() and user_id:
        try:
            session_id = str(uuid.uuid4())
            db.save_session({"id": session_id, "user_id": user_id, "source": "recall",
                             "transcript": transcript, "status": "transcribed"})
            db.update_meeting_bot(bot_id, status="done", transcript=transcript, session_id=session_id)
        except Exception:  # noqa: BLE001
            session_id = None

    blueprint = analyze_career(transcript, career_profile=career_profile, mh_context=mh,
                               persist_user_id=user_id, session_id=session_id)
    return {"ok": True, "bot_id": bot_id, "blueprint": blueprint}


def handle_event(event: dict) -> dict:
    """Recall webhook dispatcher — process when the recording/transcript is done."""
    etype = str(event.get("event") or event.get("type") or "").lower()
    data = event.get("data") or {}
    bot_id = data.get("bot_id") or data.get("id") or (data.get("bot") or {}).get("id")
    st = data.get("status")
    status_code = (st.get("code") if isinstance(st, dict) else st) or ""
    status_code = str(status_code).lower()
    done = ("done" in etype) or status_code in ("done", "call_ended", "analysis_done", "media_expired")
    if bot_id and done:
        return process_completed_bot(bot_id)
    return {"ok": True, "ignored": etype or status_code or "unknown"}
