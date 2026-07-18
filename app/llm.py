"""Thin wrapper around the Groq SDK with a model fallback chain.

Groq's free-tier daily token caps are per model, so when the primary model is
rate-limited (429) — or fails for any reason — we walk the fallback chain
instead of returning nothing. JSON mode and plain-text helpers degrade
gracefully to empty results when no API key is configured at all.
"""
from __future__ import annotations

import json

import httpx

from .config import settings

_OR_URL = "https://openrouter.ai/api/v1/chat/completions"


def openrouter_available() -> bool:
    return bool(settings.openrouter_api_key)


def _openrouter_chat(messages: list[dict], model: str, temperature: float) -> str | None:
    """One call to OpenRouter (OpenAI-compatible). Returns content or None."""
    try:
        r = httpx.post(
            _OR_URL, timeout=120.0,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://setmycareer.vercel.app",
                "X-Title": "Setmycareer",
            },
            json={"model": model, "messages": messages, "temperature": temperature},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"].get("content") or ""
    except Exception as exc:  # noqa: BLE001 — caller falls back to Groq
        print(f"[openrouter] {model} failed ({type(exc).__name__}): {str(exc)[:160]}")
        return None


def _extract_json(content: str | None) -> dict | None:
    """Parse a JSON object out of model text (tolerates ```json fences / prose)."""
    if not content:
        return None
    s = content.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s[:4].lower() == "json":
            s = s[4:]
    i, j = s.find("{"), s.rfind("}")
    if i != -1 and j > i:
        s = s[i:j + 1]
    try:
        return json.loads(s)
    except Exception:  # noqa: BLE001
        return None

try:
    from groq import Groq
except ImportError:  # dependency not installed yet
    Groq = None  # type: ignore

_client = None


def get_client():
    global _client
    if _client is None and Groq is not None and settings.groq_api_key:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def llm_available() -> bool:
    return get_client() is not None


def _model_chain() -> list[str]:
    chain = [settings.llm_model]
    for m in settings.llm_fallbacks:
        if m not in chain:
            chain.append(m)
    return chain


def _chat(messages: list[dict], *, temperature: float, json_mode: bool) -> str | None:
    """Run the completion across the model chain. Returns content or None."""
    client = get_client()
    if client is None:
        return None
    kwargs: dict = {"temperature": temperature, "messages": messages}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    for model in _model_chain():
        try:
            resp = client.chat.completions.create(model=model, **kwargs)
            return resp.choices[0].message.content or ""
        except Exception as exc:  # noqa: BLE001 — fall through to the next model
            print(f"[llm] {model} failed ({type(exc).__name__}): {str(exc)[:140]}")
    return None


def chat_json(system: str, user: str, *, temperature: float = 0.2, model: str | None = None) -> dict:
    """Call the LLM in JSON mode and return a parsed dict ({} on any failure).

    If `model` is given AND an OpenRouter key is set, the call routes through
    OpenRouter (e.g. Claude) for higher-quality reasoning, then falls back to the
    Groq model chain on any failure. With no `model`, it uses Groq as before.
    Note: Groq JSON mode requires the word "json" in the prompt; all agent prompts include it.
    """
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    if model and openrouter_available():
        data = _extract_json(_openrouter_chat(messages, model, temperature))
        if data is not None:
            return data
        # otherwise fall through to Groq so the pipeline never stalls
    content = _chat(messages, temperature=temperature, json_mode=True)
    if not content:
        return {}
    data = _extract_json(content)
    if data is None:
        print("[llm.chat_json] bad JSON from Groq")
        return {}
    return data


def chat_text(system: str, user: str, *, temperature: float = 0.3) -> str:
    content = _chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=temperature, json_mode=False,
    )
    return content or ""


def chat_messages(messages: list[dict], *, temperature: float = 0.4, model: str | None = None) -> str:
    """Multi-turn plain-text chat. Routes to OpenRouter (Claude) when `model` is set
    and a key exists, else the Groq chain. Returns '' on total failure."""
    if model and openrouter_available():
        out = _openrouter_chat(messages, model, temperature)
        if out is not None:
            return out
    return _chat(messages, temperature=temperature, json_mode=False) or ""


def transcribe_audio(file_bytes: bytes, filename: str) -> str | None:
    """Transcribe an uploaded audio file with Groq Whisper. None if unavailable."""
    client = get_client()
    if client is None:
        return None
    try:
        resp = client.audio.transcriptions.create(
            file=(filename, file_bytes),
            model=settings.stt_model,
        )
        return resp.text
    except Exception as exc:  # noqa: BLE001
        print(f"[llm.transcribe_audio] error: {exc}")
        return None
