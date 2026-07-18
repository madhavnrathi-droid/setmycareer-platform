"""Persistence dispatcher — picks the cloud backend from the environment.

  APPWRITE_API_KEY + APPWRITE_PROJECT_ID set → Appwrite  (SMC's cloud default)
  DATABASE_URL set                            → Supabase / Postgres
  neither                                      → no-op (the app still boots)

The career pipeline imports `db` and calls `db.*`; it never cares which backend is
live. Selection happens once at import via `settings` (which loads .env), so flipping
backends is just an env change + redeploy.
"""
from __future__ import annotations

import os

from .config import settings  # loads .env before we inspect env vars

if settings.appwrite_api_key and settings.appwrite_project_id:
    from .db_appwrite import *  # noqa: F401,F403
    BACKEND = "appwrite"
elif os.getenv("DATABASE_URL", "").strip():
    from .db_postgres import *  # noqa: F401,F403
    BACKEND = "postgres"
else:
    # postgres impl no-ops without DATABASE_URL — keeps the app booting bare
    from .db_postgres import *  # noqa: F401,F403
    BACKEND = "none"
