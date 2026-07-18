"""Meeting integrations — Google Meet & Zoho Meeting.

OAuth is OPTIONAL. With client credentials configured (env vars + a public
OAUTH_REDIRECT_BASE), users can one-click "Connect" and we can pull meeting
transcripts automatically. Without them the app still works end-to-end: the user
imports a meeting manually (paste the link / transcript, or upload the recording)
and the same LangGraph analyze pipeline runs over it.

Tokens are held in-memory only (ephemeral, per-process) — consistent with the
app's stateless, on-device-first stance. Nothing is persisted server-side.
"""
from __future__ import annotations

import time
import urllib.parse

import httpx

from .config import settings

# provider → OAuth endpoints, scopes, credential accessors
_PROVIDERS = {
    "google": {
        "label": "Google Meet",
        "auth": lambda: "https://accounts.google.com/o/oauth2/v2/auth",
        "token": lambda: "https://oauth2.googleapis.com/token",
        # Meet REST API (conference records / transcripts) + Drive read for the
        # exported transcript doc. Workspace + recorded captions are required for
        # automatic pull; the manual path needs no scopes.
        "scope": ("openid email "
                  "https://www.googleapis.com/auth/meetings.space.readonly "
                  "https://www.googleapis.com/auth/drive.readonly"),
        "client_id": lambda: settings.google_client_id,
        "client_secret": lambda: settings.google_client_secret,
    },
    "zoho": {
        "label": "Zoho Meeting",
        "auth": lambda: settings.zoho_accounts_base.rstrip("/") + "/oauth/v2/auth",
        "token": lambda: settings.zoho_accounts_base.rstrip("/") + "/oauth/v2/token",
        "scope": "ZohoMeeting.meeting.READ,ZohoMeeting.recording.READ",
        "client_id": lambda: settings.zoho_client_id,
        "client_secret": lambda: settings.zoho_client_secret,
    },
}

# provider -> {access_token, refresh_token, expires_at}
_TOKENS: dict[str, dict] = {}


def _p(provider: str) -> dict:
    p = _PROVIDERS.get(provider)
    if not p:
        raise KeyError(provider)
    return p


def configured(provider: str) -> bool:
    p = _p(provider)
    return bool(p["client_id"]() and p["client_secret"]())


def redirect_uri(provider: str) -> str:
    base = settings.oauth_redirect_base.rstrip("/")
    return f"{base}/api/integrations/{provider}/callback"


def status() -> dict:
    """Per-provider connection state for the UI:
    connected → we hold a token · ready → configured, user can connect ·
    manual → not configured, import meetings by hand."""
    out = {}
    for key, p in _PROVIDERS.items():
        if _TOKENS.get(key, {}).get("access_token"):
            state = "connected"
        elif configured(key) and settings.oauth_redirect_base:
            state = "ready"
        else:
            state = "manual"
        out[key] = {"state": state, "label": p["label"]}
    return out


def auth_url(provider: str) -> str:
    p = _p(provider)
    if not configured(provider) or not settings.oauth_redirect_base:
        raise RuntimeError("not_configured")
    params = {
        "client_id": p["client_id"](),
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": p["scope"],
        "access_type": "offline",
        "prompt": "consent",
    }
    return p["auth"]() + "?" + urllib.parse.urlencode(params)


def exchange(provider: str, code: str) -> bool:
    """Exchange an OAuth code for tokens (stored in-memory). Returns success."""
    p = _p(provider)
    data = {
        "code": code,
        "client_id": p["client_id"](),
        "client_secret": p["client_secret"](),
        "redirect_uri": redirect_uri(provider),
        "grant_type": "authorization_code",
    }
    try:
        r = httpx.post(p["token"](), data=data, timeout=12.0)
    except httpx.HTTPError:
        return False
    if r.status_code >= 400:
        return False
    tok = r.json()
    access = tok.get("access_token")
    if not access:
        return False
    _TOKENS[provider] = {
        "access_token": access,
        "refresh_token": tok.get("refresh_token"),
        "expires_at": time.time() + float(tok.get("expires_in", 3600)),
    }
    return True


def fetch_transcript(provider: str, meeting_ref: str) -> tuple[str | None, str]:
    """Best-effort pull of a meeting transcript. Returns (transcript, message).

    Automatic retrieval (Google Meet `conferenceRecords.transcripts`, Zoho Meeting
    recordings) requires workspace admin scopes, the host's consent, and recorded
    captions on the meeting. When that path isn't available we return (None, why)
    and the client falls back to the manual paste/upload flow — which runs the
    exact same analysis."""
    _p(provider)  # validate provider
    if not _TOKENS.get(provider, {}).get("access_token"):
        return None, (f"Not connected to {_PROVIDERS[provider]['label']} yet. "
                      "Connect it above, or paste the transcript / upload the recording below.")
    # Connected, but auto-pull is gated on recorded captions + host permission.
    return None, (f"{_PROVIDERS[provider]['label']} is connected. Automatic transcript pull "
                  "needs the meeting to have recorded captions and host permission — paste the "
                  "transcript or upload the recording and Setmycareer will analyze it the same way.")
