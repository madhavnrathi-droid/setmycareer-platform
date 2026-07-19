#!/usr/bin/env python
"""Create the Appwrite database + collections for Setmycareer (idempotent).

Run once after setting APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY
(the API key needs the `databases` scope) in your env or .env:

    pip install appwrite
    python scripts/setup_appwrite.py

Mirrors the schema in supabase/migrations/. Safe to re-run — "already exists" errors are ignored.
"""
from __future__ import annotations

import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.config import settings  # loads .env  # noqa: E402
from appwrite.client import Client  # noqa: E402
from appwrite.exception import AppwriteException  # noqa: E402
from appwrite.services.databases import Databases  # noqa: E402

DB = settings.appwrite_database_id
_client = (Client().set_endpoint(settings.appwrite_endpoint)
           .set_project(settings.appwrite_project_id).set_key(settings.appwrite_api_key))
dbs = Databases(_client)

S, I, B, D = "string", "integer", "boolean", "datetime"
SCHEMA = {
    "profiles": [("name", S, 200), ("role", S, 32), ("intake", S, 100000), ("skipped", B, None)],
    "career_profiles": [("user_id", S, 64), ("current", S, 300), ("target", S, 300), ("goal", S, 2000),
                        ("skills", S, 100000), ("riasec", S, 1000), ("big_five", S, 4000), ("momentum", I, None)],
    "sessions": [("user_id", S, 64), ("source", S, 32), ("started_at", D, None), ("duration", I, None),
                 ("modality", S, 32), ("verified", B, None), ("peer", S, 4000), ("transcript", S, 1000000),
                 ("status", S, 32)],
    "blueprints": [("user_id", S, 64), ("session_id", S, 64), ("career_index", I, None), ("confidence", S, 16),
                   ("scores", S, 1000000), ("composites", S, 200000), ("outlook", S, 20000), ("moves", S, 100000),
                   ("citations", S, 100000), ("source_weights", S, 20000)],
    "index_history": [("user_id", S, 64), ("ts", D, None), ("career_index", I, None), ("wellbeing_index", I, None),
                      ("master_index", I, None), ("dims", S, 100000), ("session_id", S, 64)],
    "mental_health_context": [("user_id", S, 64), ("wellbeing_index", I, None), ("band", S, 32), ("emotion", S, 64),
                              ("dimensions", S, 100000), ("recent_emotions", S, 20000), ("notes", S, 200000),
                              ("n_sessions", I, None), ("sessions_since", S, 32)],
    "integrations": [("user_id", S, 64), ("provider", S, 32), ("status", S, 32), ("access_token", S, 8000),
                     ("refresh_token", S, 8000), ("expires_at", D, None), ("meta", S, 20000)],
    "meeting_bots": [("user_id", S, 64), ("provider", S, 32), ("meeting_url", S, 2000), ("platform", S, 32),
                     ("bot_id", S, 128), ("status", S, 32), ("transcript", S, 1000000), ("recording_url", S, 2000),
                     ("session_id", S, 64), ("started_at", D, None), ("ended_at", D, None)],
    "reports": [("user_id", S, 64), ("blueprint_id", S, 64), ("kind", S, 64), ("storage_path", S, 2000)],
}
INDEXES = {
    "career_profiles": [("user_id_idx", ["user_id"])],
    "sessions": [("user_id_idx", ["user_id"])],
    "blueprints": [("user_id_idx", ["user_id"])],
    "index_history": [("user_id_idx", ["user_id"])],
    "mental_health_context": [("user_id_idx", ["user_id"])],
    "integrations": [("user_provider_idx", ["user_id", "provider"])],
    "meeting_bots": [("bot_id_idx", ["bot_id"]), ("user_id_idx", ["user_id"])],
    "reports": [("user_id_idx", ["user_id"])],
}


def _ok(fn, *args, **kw) -> bool:
    try:
        fn(*args, **kw)
        return True
    except AppwriteException as exc:
        if "already exists" in str(exc).lower() or getattr(exc, "code", None) == 409:
            return False
        print("  !", str(exc)[:140])
        return False


def _attr(coll: str, key: str, typ: str, size) -> None:
    if typ == S:
        _ok(dbs.create_string_attribute, DB, coll, key, size, False)
    elif typ == I:
        _ok(dbs.create_integer_attribute, DB, coll, key, False)
    elif typ == B:
        _ok(dbs.create_boolean_attribute, DB, coll, key, False)
    elif typ == D:
        _ok(dbs.create_datetime_attribute, DB, coll, key, False)


def main() -> None:
    if not (settings.appwrite_project_id and settings.appwrite_api_key):
        sys.exit("Set APPWRITE_PROJECT_ID + APPWRITE_API_KEY (databases scope) in env/.env first.")
    _ok(dbs.create, DB, "Setmycareer")
    for coll, attrs in SCHEMA.items():
        _ok(dbs.create_collection, DB, coll, coll)
        for key, typ, size in attrs:
            _attr(coll, key, typ, size)
        print(f"✓ {coll} ({len(attrs)} attrs)")
    print("waiting for attributes to settle before indexing…")
    time.sleep(8)
    for coll, idxs in INDEXES.items():
        for ikey, cols in idxs:
            _ok(dbs.create_index, DB, coll, ikey, "key", cols)
    print(f"done — database '{DB}' ready with {len(SCHEMA)} collections.")


if __name__ == "__main__":
    main()
