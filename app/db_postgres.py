"""Supabase (Postgres) persistence — the cloud backbone.

Talks to the isolated `setmycareer` schema via a direct Postgres connection
(psycopg3) using DATABASE_URL (the Supabase transaction-pooler connection string,
which includes the DB password and bypasses RLS). When DATABASE_URL is unset the
whole layer is a graceful no-op so the app still boots — useful locally, in demo
mode, and before the secret is configured on Vercel.

Serverless-friendly: a short-lived connection per call against the pooler.
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:  # noqa: BLE001
    psycopg = None  # layer becomes a no-op

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def available() -> bool:
    return bool(DATABASE_URL and psycopg)


@contextmanager
def _conn():
    if not available():
        yield None
        return
    conn = psycopg.connect(
        DATABASE_URL, autocommit=True, row_factory=dict_row,
        options="-c search_path=setmycareer,public",
    )
    try:
        yield conn
    finally:
        conn.close()


def _exec(sql: str, params: tuple = (), fetch: str | None = None):
    with _conn() as c:
        if c is None:
            return None
        with c.cursor() as cur:
            cur.execute(sql, params)
            if fetch == "one":
                return cur.fetchone()
            if fetch == "all":
                return cur.fetchall()
            return None


# ── profiles ───────────────────────────────────────────────────────────────
def upsert_profile(p: dict):
    return _exec(
        """insert into setmycareer.profiles (id, name, role, intake, skipped)
           values (%s,%s,%s,%s,%s)
           on conflict (id) do update set name=excluded.name, role=excluded.role,
             intake=excluded.intake, skipped=excluded.skipped, updated_at=now()
           returning id""",
        (p.get("id"), p.get("name"), p.get("role", "me"),
         json.dumps(p.get("intake") or {}), bool(p.get("skipped"))), fetch="one")


def get_profile(user_id):
    return _exec("select * from setmycareer.profiles where id=%s", (user_id,), fetch="one")


def upsert_career_profile(user_id, cp: dict):
    return _exec(
        """insert into setmycareer.career_profiles
             (user_id,current,target,goal,skills,riasec,big_five,momentum)
           values (%s,%s,%s,%s,%s,%s,%s,%s)
           on conflict (user_id) do update set current=excluded.current, target=excluded.target,
             goal=excluded.goal, skills=excluded.skills, riasec=excluded.riasec,
             big_five=excluded.big_five, momentum=excluded.momentum, updated_at=now()""",
        (user_id, cp.get("current"), cp.get("target"), cp.get("goal"),
         json.dumps(cp.get("skills") or []), json.dumps(cp.get("riasec") or []),
         json.dumps(cp.get("big_five")) if cp.get("big_five") is not None else None,
         cp.get("momentum")))


def get_career_profile(user_id):
    return _exec("select * from setmycareer.career_profiles where user_id=%s", (user_id,), fetch="one")


# ── sessions ───────────────────────────────────────────────────────────────
def save_session(s: dict):
    return _exec(
        """insert into setmycareer.sessions
             (id,user_id,source,started_at,duration,modality,verified,peer,transcript,status)
           values (%s,%s,%s,to_timestamp(%s),%s,%s,%s,%s,%s,%s)
           on conflict (id) do update set transcript=excluded.transcript, status=excluded.status
           returning id""",
        (s.get("id"), s["user_id"], s.get("source", "manual"),
         (s.get("startedAt") or 0) / 1000.0, s.get("duration", 0), s.get("modality", "general"),
         bool(s.get("verified")), json.dumps(s.get("peer")) if s.get("peer") else None,
         s.get("transcript"), s.get("status", "recorded")), fetch="one")


# ── blueprints ─────────────────────────────────────────────────────────────
def save_blueprint(b: dict):
    return _exec(
        """insert into setmycareer.blueprints
             (user_id,session_id,career_index,confidence,scores,composites,outlook,moves,citations,source_weights)
           values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
        (b["user_id"], b.get("session_id"), b.get("career_index"), b.get("confidence"),
         json.dumps(b.get("scores") or {}), json.dumps(b.get("composites") or {}),
         json.dumps(b.get("outlook")) if b.get("outlook") else None,
         json.dumps(b.get("moves") or []), json.dumps(b.get("citations") or []),
         json.dumps(b.get("source_weights")) if b.get("source_weights") else None), fetch="one")


def get_blueprints(user_id, limit=50):
    return _exec("select * from setmycareer.blueprints where user_id=%s order by created_at desc limit %s",
                 (user_id, limit), fetch="all")


def save_report(r: dict):
    return _exec(
        """insert into setmycareer.reports (user_id, blueprint_id, kind, storage_path)
           values (%s,%s,%s,%s) returning id""",
        (r["user_id"], r.get("blueprint_id"), r.get("kind", "career_blueprint"), r.get("storage_path")),
        fetch="one")


# ── index history ──────────────────────────────────────────────────────────
def record_index_point(user_id, point: dict):
    return _exec(
        """insert into setmycareer.index_history
             (user_id,career_index,wellbeing_index,master_index,dims,session_id)
           values (%s,%s,%s,%s,%s,%s)""",
        (user_id, point.get("career_index"), point.get("wellbeing_index"),
         point.get("master_index"), json.dumps(point.get("dims") or {}), point.get("session_id")))


def get_index_history(user_id, limit=500):
    return _exec("select * from setmycareer.index_history where user_id=%s order by ts asc limit %s",
                 (user_id, limit), fetch="all")


# ── mental-health bridge (read from bloo) ──────────────────────────────────
def save_mh_context(user_id, ctx: dict):
    return _exec(
        """insert into setmycareer.mental_health_context
             (user_id,wellbeing_index,band,emotion,dimensions,recent_emotions,notes,n_sessions,sessions_since)
           values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
           on conflict (user_id) do update set wellbeing_index=excluded.wellbeing_index,
             band=excluded.band, emotion=excluded.emotion, dimensions=excluded.dimensions,
             recent_emotions=excluded.recent_emotions, notes=excluded.notes,
             n_sessions=excluded.n_sessions, sessions_since=excluded.sessions_since, updated_at=now()""",
        (user_id, ctx.get("wellbeing_index"), ctx.get("band"), ctx.get("emotion"),
         json.dumps(ctx.get("dimensions") or {}), json.dumps(ctx.get("recent_emotions") or []),
         json.dumps(ctx.get("notes") or []), ctx.get("n_sessions", 0), ctx.get("sessions_since")))


def get_mh_context(user_id):
    return _exec("select * from setmycareer.mental_health_context where user_id=%s", (user_id,), fetch="one")


# ── integrations + meeting bots ────────────────────────────────────────────
def save_integration(user_id, provider, tokens: dict):
    return _exec(
        """insert into setmycareer.integrations
             (user_id,provider,status,access_token,refresh_token,expires_at,meta)
           values (%s,%s,%s,%s,%s,to_timestamp(%s),%s)
           on conflict (user_id,provider) do update set status=excluded.status,
             access_token=excluded.access_token, refresh_token=excluded.refresh_token,
             expires_at=excluded.expires_at, meta=excluded.meta, updated_at=now()""",
        (user_id, provider, tokens.get("status", "connected"), tokens.get("access_token"),
         tokens.get("refresh_token"), tokens.get("expires_at"), json.dumps(tokens.get("meta") or {})))


def save_meeting_bot(b: dict):
    return _exec(
        """insert into setmycareer.meeting_bots (user_id,provider,meeting_url,platform,bot_id,status)
           values (%s,%s,%s,%s,%s,%s) returning id""",
        (b["user_id"], b.get("provider", "recall"), b["meeting_url"], b.get("platform"),
         b.get("bot_id"), b.get("status", "requested")), fetch="one")


def update_meeting_bot(bot_id, **fields):
    if not fields:
        return None
    cols = ", ".join(f"{k}=%s" for k in fields)
    return _exec(f"update setmycareer.meeting_bots set {cols} where bot_id=%s",
                 tuple(fields.values()) + (bot_id,))


def get_meeting_bot(bot_id):
    return _exec("select * from setmycareer.meeting_bots where bot_id=%s", (bot_id,), fetch="one")


# ── counselor console (recorded sessions + notes) ───────────────────────────
# No-op stubs: the counselor-session store lives in Appwrite. These keep `db.*`
# satisfied (via `from .db_postgres import *`) when Appwrite isn't configured, so
# the endpoints degrade quietly instead of AttributeError-ing.
def save_counselor_session(doc: dict) -> str:
    return ""


def list_counselor_sessions(client_id: str) -> list:
    return []


def update_counselor_session_notes(session_id: str, notes: dict) -> bool:
    return False
