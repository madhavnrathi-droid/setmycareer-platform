"""Setmycareer — stateless API + static SPA.

Privacy architecture: this server stores NOTHING. There is no database. All
session data (audio, transcripts, notes, scores) lives exclusively on the
user's device (IndexedDB). The endpoints below process requests transiently:

  /api/transcribe — audio in, text out (Groq Whisper), nothing retained
  /api/analyze    — transcript in, LangGraph pipeline out, nothing retained
  /api/pair/*     — ephemeral in-memory QR pairing codes (5-min TTL)
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import json

from fastapi.responses import StreamingResponse

from . import bridge, db, integrations, meetings, pairing, rag
from .career.analyze import analyze_career
from .career import graph as career_graph
from .career.report import build_report, build_specialised_report
from .career import inventories, specialised as career_specialised
from .agents.diarize import label_speakers
from .agents.graph import STAGE_LABELS, STAGE_TOTAL, run_pipeline, stream_pipeline
from .config import settings
from .labor import bls_median_wage
from .llm import chat_json, chat_messages, llm_available, openrouter_available, transcribe_audio
from .models import AnalyzeRequest, PairCreate, PairJoin


def _reasoning_model():
    """Heavy reasoning runs on Claude (OpenRouter) when configured, else Groq."""
    return settings.openrouter_model if openrouter_available() else None

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Setmycareer", description="Career intelligence from your conversations (stateless API)")

# The counselor console is a separate origin (setmycareer-counselor.vercel.app)
# that calls this API directly — allow cross-origin access to the JSON endpoints.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "llm_available": llm_available(),
        "model": settings.llm_model,
        "stt_model": settings.stt_model,
        "stores_data": db.available(),
        "store_backend": db.BACKEND,
    }


# ---------------------------------------------------------------------------
# Transcription (transient — audio is never written to disk)
# ---------------------------------------------------------------------------

@app.post("/api/transcribe")
async def transcribe(file: UploadFile, roles: str = "") -> dict:
    """Audio → text. If `roles` (comma-separated, e.g. "Therapist,Client") names
    two or more speakers, the transcript is re-segmented with speaker labels."""
    if not llm_available():
        raise HTTPException(503, "Transcription unavailable: GROQ_API_KEY not configured")
    data = await file.read()
    text = transcribe_audio(data, file.filename or "audio.webm")
    if text is None:
        raise HTTPException(502, "transcription failed")
    role_list = [r.strip() for r in roles.split(",") if r.strip()]
    labelled = label_speakers(text, role_list) if len(role_list) >= 2 else text
    return {"text": labelled, "raw": text, "diarized": labelled != text}


@app.post("/api/diarize")
def diarize(body: dict) -> dict:
    """Label speakers in an existing (e.g. pasted/imported) transcript."""
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text is empty")
    roles = [str(r).strip() for r in (body.get("roles") or ["Therapist", "Client"]) if str(r).strip()]
    labelled = label_speakers(text, roles)
    return {"text": labelled, "diarized": labelled != text}


_SUMMARIZE_SYS = (
    "You read an uploaded mental-health or career report/assessment a person brought to their "
    "personal dashboard. Be an evidence-based observer: summarize what the document says, never "
    "diagnose or add findings it doesn't contain. Respond ONLY with JSON: "
    '{"summary": str (2-3 warm, plain sentences a person can read), '
    '"category": "mental" | "career" | "other", '
    '"markers": [str] (up to 5 concrete findings/scores stated in the report, verbatim where possible)}'
)


@app.post("/api/summarize")
def summarize(body: dict) -> dict:
    """Summarize an imported report (Claude when available) for a Notes card."""
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text is empty")
    if not llm_available():
        return {"summary": "", "category": "other", "markers": []}
    data = chat_json(_SUMMARIZE_SYS, f'Report text:\n"""\n{text[:6000]}\n"""',
                     temperature=0.2, model=_reasoning_model())
    return {"summary": data.get("summary", ""),
            "category": data.get("category", "other"),
            "markers": (data.get("markers") or [])[:5]}


_INSIGHTS_SYS = (
    "You are a careful behavioral scientist + contradiction-checker reviewing someone's history "
    "across sessions, journal notes and any reports — for a longitudinal life dashboard. "
    "Find (a) PATTERNS over time (recurring themes, leading indicators, what tends to precede dips or "
    "lifts) and (b) CONTRADICTIONS (where stated wants/goals diverge from actions/feelings). "
    "Evidence-based observer: hedge, never diagnose, never invent; ground each point in the data given. "
    "If evidence is thin, return fewer points. Respond ONLY with JSON: "
    '{"patterns": [{"text": str (one warm, specific sentence), "confidence": "low"|"moderate"}], '
    '"contradictions": [{"text": str (gentle, non-judgmental), "confidence": "low"|"moderate"}]}'
)


@app.post("/api/insights")
def insights(body: dict) -> dict:
    """Longitudinal patterns + contradictions over a compact history (Claude when available)."""
    history = body.get("history")
    if not history:
        raise HTTPException(400, "history is empty")
    if not llm_available():
        return {"patterns": [], "contradictions": []}
    import json as _json
    data = chat_json(_INSIGHTS_SYS, f"History (JSON):\n{_json.dumps(history)[:8000]}",
                     temperature=0.3, model=_reasoning_model())
    return {"patterns": (data.get("patterns") or [])[:4],
            "contradictions": (data.get("contradictions") or [])[:3]}


# ---------------------------------------------------------------------------
# Career layer — labor-data RAG grounding + live BLS wage (transient)
# ---------------------------------------------------------------------------

_CAREER_SYS = (
    "You are a grounded, encouraging career strategist for someone's personal dashboard. "
    "Ground EVERYTHING in the provided labor-market data (O*NET/BLS snapshot) — do not invent "
    "occupations, wages or outlook numbers beyond it. Use signal-language and never guarantee an "
    "outcome (no 'you will get hired'); frame moves as what tends to help. Be specific and warm. "
    "Respond ONLY with JSON: {"
    '"summary": str (2-3 sentences on where they stand vs the target role, grounded in the data), '
    '"moves": [{"title": str (a concrete next move), "why": str (one sentence, tied to the data)}] (up to 4), '
    '"citations": [str] (the occupation/data points you leaned on, e.g. "Data Scientist · ~35% growth")}'
)


@app.post("/api/career")
def career(body: dict) -> dict:
    """Deeper career read: retrieve labor grounding for the user's target/skills and
    have Claude (when available) produce a grounded, cited set of next moves."""
    target = (body.get("target") or "").strip()
    if not target:
        raise HTTPException(400, "target is empty")
    if not llm_available():
        return {"summary": "", "moves": [], "citations": []}
    current = (body.get("current") or "").strip()
    skills = [str(s) for s in (body.get("skills") or [])]
    goal = (body.get("goal") or "").strip()
    query = f"{target} {current} {' '.join(skills)} {goal} skills outlook transitions career path"
    grounding = rag.grounding_text(query, k=4, corpus="labor", max_chars=2000)
    user = (
        f"Target role: {target}\n"
        f"Current role: {current or 'unspecified'}\n"
        f"Skills they hold: {', '.join(skills) or 'unspecified'}\n"
        f"Their goal: {goal or 'unspecified'}\n\n"
        f"Labor-market data to ground in (cite role names/figures):\n{grounding or '(no data retrieved)'}"
    )
    data = chat_json(_CAREER_SYS, user, temperature=0.3, model=_reasoning_model())
    return {"summary": data.get("summary", ""),
            "moves": (data.get("moves") or [])[:4],
            "citations": (data.get("citations") or [])[:5]}


@app.get("/api/labor/outlook")
def labor_outlook(soc: str = "") -> dict:
    """Current BLS OEWS median wage for an SOC, when the live API answers (else live=false)."""
    w = bls_median_wage(soc) if soc else None
    return {"soc": soc, "live": bool(w), **(w or {})}


# ---------------------------------------------------------------------------
# AI counsellor chat — answers from the user's own account, grounded + cited
# ---------------------------------------------------------------------------

_CHAT_SYS = (
    "You are Setmycareer — a warm, grounded companion inside someone's private self-dashboard. "
    "Answer ONLY from the person's own data given below (their Blueprint scores, notes, sessions, "
    "career profile) plus the reference data provided. Cite what you lean on, inline and lightly — "
    "e.g. (from your May 26 session), (your sleep signal is 43), (BLS: Data Scientist ~35% growth). "
    "Never invent sessions, numbers, or facts not provided. Use signal-language ('seems', 'tends to'); "
    "never diagnose, never guarantee outcomes. If they mention self-harm or crisis, gently encourage "
    "reaching a person now and share 988 (US Suicide & Crisis Lifeline). Be concise, specific, and kind "
    "— a few sentences, not an essay. You are decision support, not a clinician or an authority."
)

_MODE_STANCE = {
    "reflect": "Reflect: listen and mirror back what you hear in their words and data. Validate first. Ask at most one gentle question. Offer little advice.",
    "strategize": "Strategize: lay out 2-3 concrete options with their trade-offs, grounded in their data and the labor/framework references. Let them choose.",
    "decide": "Decide: help them weigh one specific choice — surface what matters, the tension, and what their own data leans toward. Don't decide for them.",
    "review": "Review: look back across their sessions/scores for honest patterns and shifts, citing specifics. Name both progress and what's stuck.",
    "prepare": "Prepare: help them rehearse or plan for a specific upcoming moment (a conversation, interview, decision). Offer a small, concrete plan.",
    "challenge": "Challenge: gently and warmly push on a contradiction between what they want and what they're doing, using their own data as the mirror. Stay caring.",
}


@app.post("/api/chat")
def chat(body: dict) -> dict:
    """Grounded AI-counsellor reply. Context (the user's own data) is assembled on-device
    and sent transiently; labor/framework grounding is retrieved by relevance."""
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message is empty")
    if not llm_available():
        return {"reply": "I can't reach my reasoning right now — try again in a moment."}
    mode = body.get("mode") or "reflect"
    ctx = (body.get("context") or "").strip()
    history = body.get("history") or []

    ql = (message + " " + mode).lower()
    grounding = ""
    career_terms = ("career", "job", "role", "skill", "salary", "wage", "promot", "work", "interview", "market", "hire")
    if any(t in ql for t in career_terms) or mode in ("strategize", "decide", "prepare"):
        g = rag.grounding_text(message, k=3, corpus="labor", max_chars=1200)
        if g:
            grounding += "Labor-market reference (O*NET/BLS):\n" + g + "\n\n"
    fg = rag.grounding_text(message, k=2, corpus="frameworks", max_chars=800)
    if fg:
        grounding += "Therapeutic frameworks (for your framing only — never quote as a diagnosis):\n" + fg

    system = _CHAT_SYS + "\n\nMode — " + _MODE_STANCE.get(mode, _MODE_STANCE["reflect"])
    if ctx:
        system += "\n\nTHE PERSON'S OWN DATA (this is what you answer from):\n" + ctx[:4000]
    if grounding:
        system += "\n\nReference data you may cite:\n" + grounding

    messages = [{"role": "system", "content": system}]
    for m in history[-6:]:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    reply = chat_messages(messages, temperature=0.5, model=_reasoning_model())
    return {"reply": reply or "I'm here — could you say a little more?"}


# ---------------------------------------------------------------------------
# Analysis (transient — runs the LangGraph pipeline, returns everything)
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
def analyze(body: AnalyzeRequest) -> dict:
    if not body.transcript.strip():
        raise HTTPException(400, "transcript is empty")
    result = run_pipeline(
        body.transcript, body.modality, body.person_label, body.context
    )
    return {
        "note": result.get("note", {}),
        "note_markdown": result.get("note_markdown", ""),
        "entities": result.get("entities", {}),
        "patterns": result.get("patterns", {}),
        "risk": result.get("risk", {}),
        "metrics": result.get("metrics", {}),
        "evidence": result.get("evidence", []),
        "reflection": result.get("reflection", {}),
    }


def _result_payload(acc: dict) -> dict:
    return {
        "note": acc.get("note", {}),
        "note_markdown": acc.get("note_markdown", ""),
        "entities": acc.get("entities", {}),
        "patterns": acc.get("patterns", {}),
        "risk": acc.get("risk", {}),
        "metrics": acc.get("metrics", {}),
        "evidence": acc.get("evidence", []),
        "reflection": acc.get("reflection", {}),
    }


@app.post("/api/analyze/stream")
def analyze_stream(body: AnalyzeRequest) -> StreamingResponse:
    """Same pipeline as /api/analyze, but streams real per-node progress as
    Server-Sent Events so the client can show what Setmycareer is doing, then a final
    'result' event with the full analysis. Stores nothing."""
    if not body.transcript.strip():
        raise HTTPException(400, "transcript is empty")

    def sse(obj: dict) -> str:
        return f"data: {json.dumps(obj)}\n\n"

    def gen():
        yield sse({"type": "stage", "label": "Starting", "done": 0, "total": STAGE_TOTAL})
        seen = set()  # count each pipeline node once → clean 1/8…8/8 despite parallelism
        try:
            for kind, payload in stream_pipeline(
                body.transcript, body.modality, body.person_label, body.context
            ):
                if kind == "node":
                    if payload in seen:
                        continue
                    seen.add(payload)
                    yield sse({"type": "stage", "node": payload,
                               "label": STAGE_LABELS.get(payload, "Working"),
                               "done": min(len(seen), STAGE_TOTAL), "total": STAGE_TOTAL})
                else:  # done
                    yield sse({"type": "result", "result": _result_payload(payload)})
        except Exception as exc:  # noqa: BLE001
            yield sse({"type": "error", "message": str(exc)[:200]})

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# QR pairing (ephemeral, in-memory only)
# ---------------------------------------------------------------------------

@app.post("/api/pair/create")
def pair_create(body: PairCreate) -> dict:
    return pairing.create(body.name, body.role)


@app.post("/api/pair/join")
def pair_join(body: PairJoin) -> dict:
    creator = pairing.join(body.code, body.name, body.role)
    if creator is None:
        raise HTTPException(404, "code invalid or expired")
    return {"ok": True, "peer": creator}


@app.get("/api/pair/status/{code}")
def pair_status(code: str) -> dict:
    return pairing.status(code)


# ---------------------------------------------------------------------------
# Career Blueprint — full pc.* ontology pipeline (cloud-persisted)
# ---------------------------------------------------------------------------

@app.post("/api/career/analyze")
def career_analyze(body: dict) -> dict:
    """Run the career pipeline over a transcript: labor-grounded, quote-gated pc.*
    scoring → deterministic career index + composites → persisted to Supabase when
    DATABASE_URL is set. Returns the full Blueprint."""
    transcript = (body.get("transcript") or "").strip()
    if not transcript:
        raise HTTPException(400, "transcript is empty")
    return analyze_career(
        transcript,
        career_profile=body.get("career_profile"),
        mh_context=body.get("mental_health_context"),
        persist_user_id=body.get("user_id"),
        session_id=body.get("session_id"),
    )


@app.post("/api/career/analyze/stream")
def career_analyze_stream(body: dict) -> StreamingResponse:
    """Same career pipeline, streamed: real per-node progress via SSE (labor →
    metrics → verify → behavioral ∥ contradiction → synthesis), then a final
    'result' event with the Blueprint. Persists when the DB is configured."""
    transcript = (body.get("transcript") or "").strip()
    if not transcript:
        raise HTTPException(400, "transcript is empty")

    def sse(obj: dict) -> str:
        return f"data: {json.dumps(obj)}\n\n"

    def gen():
        yield sse({"type": "stage", "label": "Starting", "done": 0, "total": career_graph.STAGE_TOTAL})
        seen: set = set()
        try:
            for kind, payload in career_graph.stream(
                transcript, body.get("career_profile"), body.get("mental_health_context")
            ):
                if kind == "node":
                    if payload in seen:
                        continue
                    seen.add(payload)
                    yield sse({"type": "stage", "node": payload,
                               "label": career_graph.STAGE_LABELS.get(payload, "Working"),
                               "done": min(len(seen), career_graph.STAGE_TOTAL),
                               "total": career_graph.STAGE_TOTAL})
                else:
                    bp = payload
                    uid = body.get("user_id")
                    if uid and db.available():
                        try:
                            db.save_blueprint({"user_id": uid, "session_id": body.get("session_id"),
                                               "career_index": bp.get("career_index"), "confidence": bp.get("confidence"),
                                               "scores": bp.get("scores"), "composites": bp.get("composites"),
                                               "moves": bp.get("moves"), "citations": bp.get("citations")})
                            db.record_index_point(uid, {
                                "career_index": bp.get("career_index"),
                                "wellbeing_index": (body.get("mental_health_context") or {}).get("wellbeing_index"),
                                "master_index": (bp.get("composites", {}).get("cx.bloom_index", {}) or {}).get("score"),
                                "dims": {k: v.get("score") for k, v in (bp.get("scores") or {}).items()},
                                "session_id": body.get("session_id")})
                        except Exception:  # noqa: BLE001
                            pass
                    yield sse({"type": "result", "result": bp})
        except Exception as exc:  # noqa: BLE001
            yield sse({"type": "error", "message": str(exc)[:200]})

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/career/report")
def career_report(body: dict) -> HTMLResponse:
    """Render a branded, cited, print-ready career Blueprint report (browser → PDF).
    Pass a `blueprint`, or a `user_id` whose latest saved Blueprint we fetch."""
    bp = body.get("blueprint")
    if not bp and body.get("user_id") and db.available():
        rows = db.get_blueprints(body["user_id"], limit=1)
        bp = rows[0] if rows else None
    if not bp:
        raise HTTPException(400, "no blueprint — pass `blueprint`, or a user_id with a saved Blueprint")
    out = build_report(bp, body.get("career_profile"), body.get("name", ""))
    if body.get("user_id") and db.available():
        try:
            db.save_report({"user_id": body["user_id"], "blueprint_id": bp.get("id"), "kind": "career_blueprint"})
        except Exception:  # noqa: BLE001
            pass
    return HTMLResponse(out["html"])


@app.post("/api/career/report/specialised")
def career_report_specialised(body: dict) -> dict:
    """Generate the SPECIALISED career report: the counsellor's qualitative notes are
    weighted HEAVILY (bounded structured-professional-judgment override of the
    scores, outlook, lead recommendation and time-to-offer), plus grounded career
    routes with transparent success-probability + time-to-offer estimates, the
    problem→assessment→sessions→synthesis→future journey, and JVIS-style work-role
    percentile + job-group similarity sections.

    Pass an existing `blueprint` (skips re-scoring), or a `transcript` (runs the full
    career graph first). `counsellor_notes` (str/list/dict) drives the human overlay.
    Returns the structured report; set `html: true` to also get the print-ready HTML.
    Stateless — persists nothing."""
    bp = body.get("blueprint")
    cp = body.get("career_profile")
    notes = body.get("counsellor_notes")
    name = body.get("name", "")
    with_narrative = body.get("with_narrative", True)

    if not bp:
        if not bp and body.get("user_id") and db.available():
            rows = db.get_blueprints(body["user_id"], limit=1)
            bp = rows[0] if rows else None
    if not bp:
        transcript = (body.get("transcript") or "").strip()
        if not transcript:
            raise HTTPException(400, "pass a `blueprint`, a `transcript`, or a user_id with a saved Blueprint")
        out = career_graph.generate_report(
            transcript, career_profile=cp, mh_context=body.get("mental_health_context"),
            counsellor_notes=notes, session_summaries=body.get("session_summaries"),
            name=name, with_narrative=with_narrative,
        )
        report = out.get("report", {})
        result = {"report": report, "blueprint": out.get("blueprint", {})}
    else:
        report = career_specialised.generate_report(
            bp, career_profile=cp, counsellor_notes=notes,
            labor_context=body.get("labor_context", ""),
            session_summaries=body.get("session_summaries"),
            name=name, with_narrative=with_narrative,
        )
        result = {"report": report, "blueprint": bp}

    if body.get("html"):
        rendered = build_specialised_report(report, name=name)
        result["html"] = rendered["html"]
        result["summary"] = rendered["summary"]
    return result


# ---------------------------------------------------------------------------
# Inventories — public-domain RIASEC + Big Five (IPIP), administer + score
# ---------------------------------------------------------------------------

@app.get("/api/inventories")
def inventories_get() -> dict:
    return inventories.items()


@app.post("/api/inventories/score")
def inventories_score(body: dict) -> dict:
    """Score RIASEC + Big Five responses; persist to the career profile when a
    user_id is given (merged so other fields aren't wiped)."""
    riasec = inventories.score_riasec(body["riasec_responses"]) if body.get("riasec_responses") else None
    big_five = inventories.score_big_five(body["big_five_responses"]) if body.get("big_five_responses") else None
    uid = body.get("user_id")
    if uid and db.available() and (riasec or big_five):
        try:
            cur = db.get_career_profile(uid) or {}
            merged = {"current": cur.get("current"), "target": cur.get("target"), "goal": cur.get("goal"),
                      "skills": cur.get("skills") or [], "riasec": cur.get("riasec") or [],
                      "big_five": cur.get("big_five"), "momentum": cur.get("momentum")}
            if riasec:
                merged["riasec"] = list(riasec["top"])
            if big_five:
                merged["big_five"] = big_five
            db.upsert_career_profile(uid, merged)
        except Exception:  # noqa: BLE001
            pass
    return {"riasec": riasec, "big_five": big_five}


# ---------------------------------------------------------------------------
# Mental-health bridge — bloo → SMC (wellbeing context + contradiction band)
# ---------------------------------------------------------------------------

@app.post("/api/bridge/wellbeing")
def bridge_save(body: dict) -> dict:
    """Ingest bloo's wellbeing context for a user (persisted when DB is configured)."""
    uid = body.get("user_id")
    if not uid:
        raise HTTPException(400, "user_id is required")
    return bridge.save_context(uid, body.get("context") or {})


@app.get("/api/bridge/wellbeing/{user_id}")
def bridge_get(user_id: str) -> dict:
    return {"context": bridge.get_context(user_id)}


# ---------------------------------------------------------------------------
# Meeting integrations — Google Meet / Zoho (OAuth optional; manual always works)
# ---------------------------------------------------------------------------

@app.get("/api/integrations/status")
def integrations_status() -> dict:
    return {**integrations.status(), **meetings.status()}


@app.get("/api/integrations/{provider}/connect")
def integrations_connect(provider: str) -> dict:
    """Return the OAuth consent URL for a provider (when configured)."""
    try:
        return {"url": integrations.auth_url(provider)}
    except KeyError:
        raise HTTPException(404, "unknown provider")
    except RuntimeError:
        raise HTTPException(400, "not_configured")


@app.get("/api/integrations/{provider}/callback")
def integrations_callback(provider: str, code: str = "", error: str = "") -> HTMLResponse:
    """OAuth redirect target — exchanges the code, then closes the popup."""
    ok = False
    if code and provider in integrations._PROVIDERS:
        try:
            ok = integrations.exchange(provider, code)
        except Exception:  # noqa: BLE001
            ok = False
    msg = "Connected — you can close this tab." if ok else "Couldn't connect. Close this tab and import manually."
    return HTMLResponse(
        "<!doctype html><meta charset=utf-8><title>Setmycareer</title>"
        "<body style='font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;"
        "height:100vh;margin:0;color:#231F20;background:#fff'><div style='text-align:center'>"
        f"<p style='font-size:18px;font-weight:600'>{msg}</p>"
        f"<script>try{{window.opener&&window.opener.postMessage({{smc_integration:'{provider}',"
        f"ok:{str(ok).lower()}}},'*')}}catch(e){{}}setTimeout(function(){{window.close()}},1200)</script>"
        "</div></body>")


@app.post("/api/integrations/import")
def integrations_import(body: dict) -> dict:
    """Pull a meeting transcript when possible; otherwise tell the client to fall
    back to manual paste/upload. Stores nothing."""
    provider = (body.get("provider") or "").strip()
    if provider not in integrations._PROVIDERS:
        raise HTTPException(400, "unknown provider")
    ref = (body.get("meeting_url") or body.get("meeting_ref") or "").strip()
    transcript, message = integrations.fetch_transcript(provider, ref)
    return {"transcript": transcript or "", "needs_manual": transcript is None, "message": message}


# ---------------------------------------------------------------------------
# Meeting bot — fireflies-grade auto-join (Recall.ai); webhook → career pipeline
# ---------------------------------------------------------------------------

@app.post("/api/meetings/bot")
def meetings_bot(body: dict) -> dict:
    """Dispatch a notetaker bot to auto-join + record + transcribe a meeting."""
    url = (body.get("meeting_url") or "").strip()
    if not url:
        raise HTTPException(400, "meeting_url is required")
    return meetings.dispatch_bot(body.get("user_id"), url, body.get("bot_name") or "Setmycareer Notetaker")


@app.get("/api/meetings/bot/{bot_id}")
def meetings_bot_status(bot_id: str) -> dict:
    rec = db.get_meeting_bot(bot_id) if db.available() else None
    transcript = (rec or {}).get("transcript") if rec else None
    # No stored transcript (or no DB configured) — poll Recall.ai directly so the
    # transcript round-trips even without persistence enabled.
    if not transcript:
        transcript = meetings.fetch_transcript(bot_id)
    return {"bot_id": bot_id, "record": rec, "transcript": transcript, "transcript_ready": bool(transcript)}


@app.post("/api/meetings/webhook")
def meetings_webhook(body: dict) -> dict:
    """Recall.ai webhook → on completion, pull transcript + run the career pipeline."""
    return meetings.handle_event(body)


# ---------------------------------------------------------------------------
# Counselor console — persist recorded sessions + notes (additive; the console
# always keeps its own local store, so these degrade quietly when DB is off).
# ---------------------------------------------------------------------------

@app.post("/api/counselor/sessions")
def counselor_session_save(body: dict) -> dict:
    """Upsert a counselor session (by its app-side session_id). Body is the session
    dict (snake_case; transcript already JSON-stringified). Quiet no-op without a DB."""
    if not db.available():
        return {"ok": False, "stored": False}
    try:
        doc_id = db.save_counselor_session(body or {})
        return {"ok": bool(doc_id), "id": doc_id, "stored": bool(doc_id)}
    except Exception:  # noqa: BLE001
        return {"ok": False, "stored": False}


@app.get("/api/counselor/sessions/{client_id}")
def counselor_sessions_list(client_id: str) -> dict:
    """All persisted sessions for a client (so logged sessions survive a reload)."""
    if not db.available():
        return {"sessions": []}
    try:
        return {"sessions": db.list_counselor_sessions(client_id)}
    except Exception:  # noqa: BLE001
        return {"sessions": []}


@app.patch("/api/counselor/sessions/{session_id}")
def counselor_session_notes(session_id: str, body: dict) -> dict:
    """Patch a session's notes. Body: {counselor, client, status, sharedAt}."""
    if not db.available():
        return {"ok": False, "stored": False}
    try:
        ok = db.update_counselor_session_notes(session_id, body or {})
        return {"ok": bool(ok)}
    except Exception:  # noqa: BLE001
        return {"ok": False, "stored": False}


# ---------------------------------------------------------------------------
# Static SPA (mounted last so /api/* wins)
# ---------------------------------------------------------------------------

# On Vercel the SPA is served by the CDN and only /api/* reaches this function,
# so the static dir may be absent here — guard the mount so import never fails.
if STATIC_DIR.exists():
    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
