#!/usr/bin/env python
"""Create the `counselor_sessions` Appwrite collection (idempotent).

The counselor console persists its recorded sessions + notes here so logged
sessions survive a reload. Mirrors scripts/setup_appwrite.py's style: same client
init, same database_id from settings, the same skip-if-exists error handling.
Safe to re-run — "already exists" / 409 errors are ignored.

    pip install appwrite
    python scripts/create_counselor_sessions.py

Needs APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY (databases
scope) in env or .env.
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

COLLECTION = "counselor_sessions"
# (key, type, size) — transcript/notes are large (transcript holds JSON.stringify
# of the RecordingLine[]; notes are free text).
ATTRS = [
    ("session_id", S, 128),      # the app's own session id (se_rec_*) — our upsert key
    ("client_id", S, 64),
    ("title", S, 2000),
    ("date", S, 32),             # YYYY-MM-DD as sent by the app
    ("duration_min", I, None),
    ("platform", S, 32),
    ("status", S, 32),
    ("source", S, 32),
    ("transcript", S, 1000000),  # JSON.stringify(RecordingLine[])
    ("counselor_notes", S, 100000),
    ("client_notes", S, 100000),
    ("notes_status", S, 32),
    ("shared_at", S, 64),
    ("created_at", S, 64),
]
INDEXES = [
    ("session_id_idx", ["session_id"]),  # upsert lookup
    ("client_id_idx", ["client_id"]),    # list-by-client
]


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
    # Database is created by setup_appwrite.py; create() is idempotent so it's safe here too.
    _ok(dbs.create, DB, "Setmycareer")
    _ok(dbs.create_collection, DB, COLLECTION, COLLECTION)
    for key, typ, size in ATTRS:
        _attr(COLLECTION, key, typ, size)
    print(f"✓ {COLLECTION} ({len(ATTRS)} attrs)")
    print("waiting for attributes to settle before indexing…")
    time.sleep(8)
    for ikey, cols in INDEXES:
        _ok(dbs.create_index, DB, COLLECTION, ikey, "key", cols)
    print(f"done — collection '{COLLECTION}' ready in database '{DB}' "
          f"with {len(ATTRS)} attrs + {len(INDEXES)} indexes.")


if __name__ == "__main__":
    main()
