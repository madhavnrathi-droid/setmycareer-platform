"""Runtime configuration, read from environment variables.

All values have safe defaults so the app boots even with nothing configured
(it then runs in a clearly-labelled demo mode).
"""
from __future__ import annotations

import os
from dataclasses import dataclass

try:
    # Load a local .env if present (no-op in production where vars are injected).
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


@dataclass
class Settings:
    # Groq free API key — powers both the LLM agents and Whisper transcription.
    groq_api_key: str = os.getenv("GROQ_API_KEY", "").strip()

    # Primary LLM model id (open models on Groq):
    #   openai/gpt-oss-120b       (default — strongest reasoning available free)
    #   llama-3.3-70b-versatile   (strong)
    #   qwen/qwen3-32b            (Qwen option)
    llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")

    # Fallback chain, tried in order on rate limits / failures. Groq's free-tier
    # daily token caps are PER MODEL, so falling back keeps the pipeline alive.
    llm_fallbacks: tuple = tuple(
        m.strip() for m in os.getenv(
            "LLM_FALLBACKS",
            "llama-3.3-70b-versatile,qwen/qwen3-32b,"
            "meta-llama/llama-4-scout-17b-16e-instruct,llama-3.1-8b-instant",
        ).split(",") if m.strip()
    )

    # OpenRouter — unified gateway (OpenAI-compatible) giving access to Claude +
    # many models with one key. When set, the heavy REASONING calls (reflection,
    # and the Wave-2 behavioral/contradiction/synthesis agents) route here for
    # quality; cheap extraction stays on Groq. Falls back to Groq on any failure.
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "").strip()
    # Default to the affordable Claude tier so it works on a fresh OpenRouter
    # balance; set OPENROUTER_MODEL=anthropic/claude-opus-4-8 once credits are added.
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-haiku").strip()

    # Speech-to-text model for uploaded audio (Groq Whisper).
    stt_model: str = os.getenv("STT_MODEL", "whisper-large-v3")

    # Where the SQLite file lives. On Railway, mount a Volume and point this
    # at it (e.g. DB_PATH=/data/setmycareer.db) so data survives redeploys.
    db_path: str = os.getenv("DB_PATH", "setmycareer.db")

    # Railway/most PaaS inject PORT.
    port: int = int(os.getenv("PORT", "8000"))

    # --- Meeting integrations (Google Meet, Zoho Meeting) — OAuth, optional ---
    # Set these to enable one-click "Connect" + automatic transcript pull. Without
    # them the app still imports meetings manually (paste link / transcript, or
    # upload the recording). Register each provider's redirect URI as
    #   {OAUTH_REDIRECT_BASE}/api/integrations/{google|zoho}/callback
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    zoho_client_id: str = os.getenv("ZOHO_CLIENT_ID", "").strip()
    zoho_client_secret: str = os.getenv("ZOHO_CLIENT_SECRET", "").strip()
    zoho_accounts_base: str = os.getenv("ZOHO_ACCOUNTS_BASE", "https://accounts.zoho.com").strip()
    oauth_redirect_base: str = os.getenv("OAUTH_REDIRECT_BASE", "").strip()

    # --- Fireflies-grade meeting bot (Recall.ai) — optional ---
    # A bot that auto-joins Zoom/Meet/Teams, records, and transcribes. Without a
    # key the connector reports "unconfigured" and meetings import manually.
    recall_api_key: str = os.getenv("RECALL_API_KEY", "").strip()
    recall_base: str = os.getenv("RECALL_BASE", "https://us-east-1.recall.ai").strip().rstrip("/")
    recall_webhook_url: str = os.getenv("RECALL_WEBHOOK_URL", "").strip()

    # --- Appwrite (cloud backend) — optional; when set, persistence uses Appwrite ---
    # Career data lives in the cloud so SMC can learn from it. Create a project at
    # cloud.appwrite.io + an API key with the `databases` scope, then run
    # scripts/setup_appwrite.py once to create the collections.
    appwrite_endpoint: str = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1").strip()
    appwrite_project_id: str = os.getenv("APPWRITE_PROJECT_ID", "").strip()
    appwrite_api_key: str = os.getenv("APPWRITE_API_KEY", "").strip()
    appwrite_database_id: str = os.getenv("APPWRITE_DATABASE_ID", "setmycareer").strip()


settings = Settings()
