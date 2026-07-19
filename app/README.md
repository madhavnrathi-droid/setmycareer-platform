# app — the Python career & therapy intelligence service

A stateless FastAPI backend that turns a **conversation** into structured career intelligence.
Give it audio or a transcript; it returns a transcript, extracted signals, scored career
dimensions with confidence, and a written report.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn app.main:app --reload      # → http://localhost:8000
curl localhost:8000/api/health
```

**Live at** `setmycareer.vercel.app` — served by Vercel through [`../api/index.py`](../api/index.py),
*not* Railway (those config files are superseded; see [`../docs/DEPLOYMENTS.md`](../docs/DEPLOYMENTS.md)).

---

## The career pipeline

The centrepiece is a **7-node LangGraph DAG** in [`career/graph.py`](career/graph.py), compiled
once at import and run over a `CareerState`:

```
labor_retriever  →  career_metrics  →  evidence_verifier  →  behavioral_scientist
                 →  contradiction_agent  →  synthesis  →  counsellor_report
```

Each node adds evidence and narrows uncertainty; the last two produce the client-facing
narrative and the counsellor's brief.

| File | Lines | What it does |
|---|---|---|
| [`career/graph.py`](career/graph.py) | 273 | The DAG above; SSE `updates` streaming for live UIs |
| [`career/specialised.py`](career/specialised.py) | 753 | The counsellor-weighted specialised report — the deepest file here |
| [`career/ontology.py`](career/ontology.py) | 270 | **Single source of truth** — the `pc.*` professional and `cx.*` context metrics |
| [`career/weighting.py`](career/weighting.py) | 93 | Deterministic two-layer weighting: source→dimension, then evidence→score |
| [`career/confidence.py`](career/confidence.py) | 72 | `c_dim = c_evidence × c_agreement × c_recency × c_verifier` |
| [`career/analyze.py`](career/analyze.py) | 137 | The non-graph pipeline the DAG wraps |
| [`career/report.py`](career/report.py) | 346 | Renders self-contained reports |
| [`career/inventories.py`](career/inventories.py) | 112 | Public-domain instruments — IPIP RIASEC, Mini-IPIP Big Five |

A second, deliberately **parallel** DAG in [`agents/graph.py`](agents/graph.py) handles therapy
sessions across 10 agent nodes (entity, pattern, risk, theme, …).

---

## Layout

```
app/
├── main.py          THE API SURFACE — ~30 routes (see ../counselor/docs/SMC_API_REFERENCE.md)
├── config.py        all runtime config, read from environment variables
├── llm.py           provider calls (Groq, OpenRouter)
├── rag.py           retrieval over app/knowledge/*.jsonl
│
├── career/          the career pipeline (table above)
├── agents/          the 10 therapy-session agent nodes + their DAG
├── knowledge/       generated jsonl indexes — rebuild via ../scripts/preprocess/build_rag.py
│
├── db.py            persistence dispatcher — resolves one backend at import
├── db_appwrite.py   Appwrite backend (the live one)
├── db_postgres.py   Postgres backend (used only when DATABASE_URL is set — it isn't)
│
├── bridge.py        wellbeing-context bridge
├── meetings.py      Recall.ai meeting bot (joins Zoom/Meet/Teams)
├── integrations.py  Google / Zoho OAuth + import
├── labor.py         BLS employment-outlook data
├── pairing.py       device pairing
└── static/          where frontend/ builds to
```

---

## Configuration

Copy [`../.env.example`](../.env.example) to `.env` at the repository root:

| Variable | Needed for |
|---|---|
| `GROQ_API_KEY` | **Required** — every LLM route |
| `OPENROUTER_API_KEY` | Optional paid fallback when Groq's free tier is exhausted |
| `LLM_MODEL`, `STT_MODEL` | Model overrides (production runs `openai/gpt-oss-120b`) |
| `DATABASE_URL` | Optional — any Postgres; omit to run stateless. **Not set in production** |
| `APPWRITE_*` | Optional — the live persistence backend |
| `RECALL_API_KEY` | Optional — meeting bot |
| `GOOGLE_CLIENT_*`, `ZOHO_CLIENT_*` | Optional — calendar/meeting OAuth |

With no keys the service still starts; LLM routes return a clear "not configured" error rather
than failing obscurely.

### Which persistence backend you get

`db.py` resolves exactly one backend at import, in this order:

1. `APPWRITE_API_KEY` + `APPWRITE_PROJECT_ID` set → **Appwrite**
2. else `DATABASE_URL` set → **Postgres**
3. else → **no-op**, and the service still boots

The Vercel project `setmycareer` sets `APPWRITE_*` and no `DATABASE_URL`, so production resolves
to Appwrite at step 1 — `DATABASE_URL` is never consulted there. It stays a real option: point it
at any Postgres to run `db_postgres.py` instead. This service has never depended on Supabase, and
the app-layer Supabase store the `counselor/` app used was retired on 2026-07-19 without touching
anything here.

---

## Who calls this

- **`counselor/src/lib/persist.ts`** → `/api/counselor/sessions` (POST + GET by client)
- **`counselor/src/components/recording/ConnectMeetingDialog.tsx`** → `/api/meetings/bot`
- The **C# API** (per the spec) calls `/api/career/report/specialised` to generate blueprints

Both TS callers set `API_BASE = import.meta.env.DEV ? "" : "https://setmycareer.vercel.app"`, and
`counselor/vite.config.ts` proxies to the same origin in dev.

---

## Known inert edges

Honest notes so you don't chase them:

- `career/esco.py` — inert; `knowledge/esco_crosswalk.jsonl` isn't in the repo, so it reports
  unavailable and falls back to O*NET. Same for the BLS EP snapshot.
- `DB_PATH` — still read in `config.py` from the SQLite era, but no code path uses SQLite now.
- `data/embeddings/*.npz` — staged but unused; `rag.py` never reads it.
