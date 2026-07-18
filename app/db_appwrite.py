"""Appwrite persistence — the cloud backend (SMC keeps data in the cloud so it can
learn + improve). Same function interface as db_postgres.py, so the career pipeline
imports `db` and never cares which backend is live.

Collections (created by scripts/setup_appwrite.py) mirror the schema: profiles,
career_profiles, sessions, blueprints, index_history, mental_health_context,
integrations, meeting_bots, reports. Nested/free-form fields are stored as JSON
strings (Appwrite attributes are typed); this layer (de)serializes them. Graceful
no-op when the SDK or credentials are absent, so the app always boots.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from .config import settings

try:
    from appwrite.client import Client
    from appwrite.services.databases import Databases
    from appwrite.query import Query
    from appwrite.id import ID
    from appwrite.exception import AppwriteException
except Exception:  # noqa: BLE001
    Client = None  # layer becomes a no-op

# fields stored as JSON strings (Appwrite has no native nested-object attribute)
JSON_FIELDS = {
    "profiles": {"intake"},
    "career_profiles": {"skills", "riasec", "big_five"},
    "sessions": {"peer"},
    "blueprints": {"scores", "composites", "outlook", "moves", "citations", "source_weights"},
    "index_history": {"dims"},
    "mental_health_context": {"dimensions", "recent_emotions", "notes"},
    "integrations": {"meta"},
    # counselor console: transcript is already a JSON string from the client, so we
    # store/return it as-is (NOT in JSON_FIELDS) to avoid double-encoding.
}

_DB = None


def available() -> bool:
    return bool(Client and settings.appwrite_project_id and settings.appwrite_api_key)


def _db():
    global _DB
    if _DB is None:
        client = (Client()
                  .set_endpoint(settings.appwrite_endpoint)
                  .set_project(settings.appwrite_project_id)
                  .set_key(settings.appwrite_api_key))
        _DB = Databases(client)
    return _DB


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ser(coll: str, data: dict) -> dict:
    jf = JSON_FIELDS.get(coll, set())
    out = {}
    for k, v in data.items():
        if v is None:
            continue
        out[k] = json.dumps(v) if k in jf else v
    return out


def _as_dict(obj):
    """Appwrite SDK 6.x returns Pydantic Document objects; older SDKs return dicts.
    Normalize both into a plain dict with $-prefixed system fields preserved AND
    the user attributes merged in (SDK 6.x stores them in `.data`, not `model_extra`)."""
    if obj is None or isinstance(obj, dict):
        return obj
    if hasattr(obj, "model_dump"):
        d = obj.model_dump(by_alias=True) or {}
        data = getattr(obj, "data", None)
        if isinstance(data, dict):
            d.update(data)
        return d
    if hasattr(obj, "__dict__"):
        return dict(obj.__dict__)
    return obj


def _deser(coll: str, doc) -> dict:
    if not doc:
        return doc
    doc = _as_dict(doc)
    if not isinstance(doc, dict):
        return doc
    jf = JSON_FIELDS.get(coll, set())
    out = dict(doc)
    out["id"] = doc.get("$id") or doc.get("id")
    for k in jf:
        if isinstance(out.get(k), str):
            try:
                out[k] = json.loads(out[k])
            except (ValueError, TypeError):
                pass
    return out


def _upsert(coll: str, doc_id: str, data: dict):
    """Create-or-update a document with a known id."""
    payload = _ser(coll, data)
    try:
        d = _db().update_document(database_id=settings.appwrite_database_id, collection_id=coll,
                                  document_id=doc_id, data=payload)
    except AppwriteException:
        d = _db().create_document(database_id=settings.appwrite_database_id, collection_id=coll,
                                  document_id=doc_id, data=payload)
    return _deser(coll, d)


def _create(coll: str, data: dict, doc_id: str | None = None):
    d = _db().create_document(database_id=settings.appwrite_database_id, collection_id=coll,
                              document_id=doc_id or ID.unique(), data=_ser(coll, data))
    return _deser(coll, d)


def _list(coll: str, queries: list):
    res = _db().list_documents(database_id=settings.appwrite_database_id, collection_id=coll, queries=queries)
    docs = getattr(res, "documents", None) or []
    return [_deser(coll, d) for d in docs]


def _get(coll: str, doc_id: str):
    try:
        return _deser(coll, _db().get_document(database_id=settings.appwrite_database_id,
                                               collection_id=coll, document_id=doc_id))
    except AppwriteException:
        return None


# ── profiles ───────────────────────────────────────────────────────────────
def upsert_profile(p: dict):
    return _upsert("profiles", p["id"], {"name": p.get("name"), "role": p.get("role", "me"),
                                         "intake": p.get("intake") or {}, "skipped": bool(p.get("skipped"))})


def get_profile(user_id):
    return _get("profiles", user_id)


def upsert_career_profile(user_id, cp: dict):
    return _upsert("career_profiles", user_id, {
        "user_id": user_id, "current": cp.get("current"), "target": cp.get("target"),
        "goal": cp.get("goal"), "skills": cp.get("skills") or [], "riasec": cp.get("riasec") or [],
        "big_five": cp.get("big_five"), "momentum": cp.get("momentum")})


def get_career_profile(user_id):
    return _get("career_profiles", user_id)


# ── sessions ───────────────────────────────────────────────────────────────
def save_session(s: dict):
    sid = s.get("id") or ID.unique()
    started = s.get("startedAt")
    iso = datetime.fromtimestamp(started / 1000, timezone.utc).isoformat() if started else _now_iso()
    return _upsert("sessions", sid, {
        "user_id": s["user_id"], "source": s.get("source", "manual"), "started_at": iso,
        "duration": s.get("duration", 0), "modality": s.get("modality", "general"),
        "verified": bool(s.get("verified")), "peer": s.get("peer"),
        "transcript": s.get("transcript"), "status": s.get("status", "recorded")})


# ── blueprints ─────────────────────────────────────────────────────────────
def save_blueprint(b: dict):
    return _create("blueprints", {
        "user_id": b["user_id"], "session_id": b.get("session_id"), "career_index": b.get("career_index"),
        "confidence": b.get("confidence"), "scores": b.get("scores") or {}, "composites": b.get("composites") or {},
        "outlook": b.get("outlook"), "moves": b.get("moves") or [], "citations": b.get("citations") or [],
        "source_weights": b.get("source_weights")})


def get_blueprints(user_id, limit=50):
    return _list("blueprints", [Query.equal("user_id", user_id), Query.order_desc("$createdAt"), Query.limit(limit)])


def save_report(r: dict):
    return _create("reports", {"user_id": r["user_id"], "blueprint_id": r.get("blueprint_id"),
                               "kind": r.get("kind", "career_blueprint"), "storage_path": r.get("storage_path")})


# ── index history ──────────────────────────────────────────────────────────
def record_index_point(user_id, point: dict):
    return _create("index_history", {
        "user_id": user_id, "ts": _now_iso(), "career_index": point.get("career_index"),
        "wellbeing_index": point.get("wellbeing_index"), "master_index": point.get("master_index"),
        "dims": point.get("dims") or {}, "session_id": point.get("session_id")})


def get_index_history(user_id, limit=500):
    return _list("index_history", [Query.equal("user_id", user_id), Query.order_asc("ts"), Query.limit(limit)])


# ── mental-health bridge ───────────────────────────────────────────────────
def save_mh_context(user_id, ctx: dict):
    return _upsert("mental_health_context", user_id, {
        "user_id": user_id, "wellbeing_index": ctx.get("wellbeing_index"), "band": ctx.get("band"),
        "emotion": ctx.get("emotion"), "dimensions": ctx.get("dimensions") or {},
        "recent_emotions": ctx.get("recent_emotions") or [], "notes": ctx.get("notes") or [],
        "n_sessions": ctx.get("n_sessions", 0), "sessions_since": ctx.get("sessions_since")})


def get_mh_context(user_id):
    return _get("mental_health_context", user_id)


# ── integrations + meeting bots ────────────────────────────────────────────
def save_integration(user_id, provider, tokens: dict):
    existing = _list("integrations", [Query.equal("user_id", user_id), Query.equal("provider", provider), Query.limit(1)])
    data = {"user_id": user_id, "provider": provider, "status": tokens.get("status", "connected"),
            "access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token"),
            "expires_at": tokens.get("expires_at"), "meta": tokens.get("meta") or {}}
    if existing:
        return _upsert("integrations", existing[0]["id"], data)
    return _create("integrations", data)


def save_meeting_bot(b: dict):
    return _create("meeting_bots", {
        "user_id": b["user_id"], "provider": b.get("provider", "recall"), "meeting_url": b["meeting_url"],
        "platform": b.get("platform"), "bot_id": b.get("bot_id"), "status": b.get("status", "requested")})


def update_meeting_bot(bot_id, **fields):
    rows = _list("meeting_bots", [Query.equal("bot_id", bot_id), Query.limit(1)])
    if not rows:
        return None
    return _upsert("meeting_bots", rows[0]["id"], fields)


def get_meeting_bot(bot_id):
    rows = _list("meeting_bots", [Query.equal("bot_id", bot_id), Query.limit(1)])
    return rows[0] if rows else None


# ── counselor console (recorded sessions + notes) ───────────────────────────
# Persists the counselor app's logged sessions so they survive a reload. The
# app keeps its own session id; we upsert by it. Every function is guarded so a
# backend hiccup degrades to a safe default and never throws to the caller.
_COUNSELOR_COLL = "counselor_sessions"


def save_counselor_session(doc: dict) -> str:
    """Upsert a session by its app-side `session_id`; return the Appwrite doc id (or "")."""
    try:
        sid = (doc or {}).get("session_id")
        if not sid:
            return ""
        data = {
            "session_id": sid,
            "client_id": doc.get("client_id"),
            "title": doc.get("title"),
            "date": doc.get("date"),
            "duration_min": doc.get("duration_min"),
            "platform": doc.get("platform"),
            "status": doc.get("status"),
            "source": doc.get("source"),
            "transcript": doc.get("transcript"),
            "counselor_notes": doc.get("counselor_notes"),
            "client_notes": doc.get("client_notes"),
            "notes_status": doc.get("notes_status"),
            "shared_at": doc.get("shared_at"),
            "created_at": doc.get("created_at") or _now_iso(),
        }
        existing = _list(_COUNSELOR_COLL, [Query.equal("session_id", sid), Query.limit(1)])
        if existing:
            saved = _upsert(_COUNSELOR_COLL, existing[0]["id"], data)
        else:
            saved = _create(_COUNSELOR_COLL, data)
        return (saved or {}).get("id") or ""
    except Exception:  # noqa: BLE001
        return ""


def list_counselor_sessions(client_id: str) -> list[dict]:
    """All persisted sessions for a client (newest first). Safe [] on any failure."""
    try:
        return _list(_COUNSELOR_COLL, [
            Query.equal("client_id", client_id),
            Query.order_desc("$createdAt"),
            Query.limit(200),
        ])
    except Exception:  # noqa: BLE001
        return []


def update_counselor_session_notes(session_id: str, notes: dict) -> bool:
    """Patch the notes (+ status/shared_at) on a session, found by app-side id."""
    try:
        rows = _list(_COUNSELOR_COLL, [Query.equal("session_id", session_id), Query.limit(1)])
        if not rows:
            return False
        data = {
            "counselor_notes": (notes or {}).get("counselor"),
            "client_notes": (notes or {}).get("client"),
            "notes_status": (notes or {}).get("status"),
            "shared_at": (notes or {}).get("sharedAt"),
        }
        _upsert(_COUNSELOR_COLL, rows[0]["id"], data)
        return True
    except Exception:  # noqa: BLE001
        return False
