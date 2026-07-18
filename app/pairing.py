"""Ephemeral QR session pairing.

Either party (client or clinician) creates a pairing code; the other joins by
scanning the QR (or typing the code). Everything is held in process memory with
a short TTL — nothing is ever written to disk, by design (privacy-first).
"""
from __future__ import annotations

import secrets
import threading
import time

TTL_SECONDS = 300  # codes live 5 minutes

_lock = threading.Lock()
_pairs: dict[str, dict] = {}


def _sweep() -> None:
    now = time.time()
    dead = [c for c, p in _pairs.items() if now - p["ts"] > TTL_SECONDS]
    for c in dead:
        _pairs.pop(c, None)


def create(name: str, role: str) -> dict:
    with _lock:
        _sweep()
        code = secrets.token_hex(3).upper()  # e.g. "A3F92C"
        _pairs[code] = {
            "creator": {"name": name, "role": role},
            "peer": None,
            "ts": time.time(),
        }
        return {"code": code, "expires_in": TTL_SECONDS}


def join(code: str, name: str, role: str) -> dict | None:
    """Join a pairing. Returns the creator's info, or None if invalid/expired."""
    with _lock:
        _sweep()
        pair = _pairs.get(code.strip().upper())
        if pair is None:
            return None
        pair["peer"] = {"name": name, "role": role}
        return dict(pair["creator"])


def status(code: str) -> dict:
    with _lock:
        _sweep()
        pair = _pairs.get(code.strip().upper())
        if pair is None:
            return {"status": "expired"}
        if pair["peer"] is None:
            return {"status": "waiting"}
        return {"status": "paired", "peer": dict(pair["peer"])}
