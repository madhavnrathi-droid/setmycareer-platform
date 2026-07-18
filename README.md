# SetMyCareer

**Measured career decisions.** A client takes four validated psychometric instruments, the
system scores and synthesises them, and a human counsellor reads the results with the client
across booked sessions. An AI assistant ("Compass") is available throughout, grounded in the
client's own results.

This repository holds the **entire product** — the marketing site, all three dashboards, the
guest test engine, the AI services, and the data pipelines.

---

## Read this first

| If you want to… | Go to |
|---|---|
| Understand what the product *is*, screen by screen | **[`counselor/docs/SMC_SYSTEM_ARCHITECTURE.md`](counselor/docs/SMC_SYSTEM_ARCHITECTURE.md)** — master IA + C# API spec |
| See every endpoint in the system (141 of them) | [`counselor/docs/SMC_API_REFERENCE.md`](counselor/docs/SMC_API_REFERENCE.md) |
| Get it running locally | [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md) |
| Understand how the pieces deploy | [`docs/DEPLOYMENTS.md`](docs/DEPLOYMENTS.md) |
| Know the rules before you commit | [`docs/SECURITY.md`](docs/SECURITY.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Test the product end to end | [`counselor/docs/E2E_TEST_MAP.md`](counselor/docs/E2E_TEST_MAP.md) |

---

## What's in here

Four independently-deployed applications share this one repository.

```
SetMyCareer/
├── counselor/   ⭐ THE PRODUCT — one React app serving four audiences
│   ├── /            counsellor console  · caseload, calendar, sessions, reports
│   ├── /portal      client portal       · tests, reports, sessions, Compass, billing
│   ├── /admin       admin dashboard     · KPIs, oversight, revenue, test links
│   ├── /t/:token    guest test links    · full battery, no account needed
│   └── api/         Vercel functions    · AI chat, Razorpay, LiveKit, cloud store
│
├── site/        the public marketing website (its own Vercel project)
│
├── app/         Python FastAPI + LangGraph — career & therapy intelligence service
├── api/         the Vercel Python entry point that serves app/
├── frontend/    "bloo" — therapy/recording PWA (separate product, same deployment)
│
├── scripts/     data pipelines — ingestion, RAG index build, dataset refresh
├── data/        datasets (heavy artefacts gitignored — regenerate via scripts/)
├── docs/        engineering docs + therapy frameworks that feed the RAG index
├── supabase/    SQL migrations for the `setmycareer` Postgres schema
└── _archive/    superseded code kept for reference — see _archive/README.md
```

### The three dashboards are one app

This surprises people. `counselor/` is a **single React SPA** whose router splits by path, so
the counsellor console, client portal and admin dashboard share one build, one deployment, one
component library and one design system. They differ by route, shell and data scope — not by
codebase.

```
counselor/src/
├── App.tsx          route table for all four surfaces
├── screens/         counsellor console screens
├── portal/          client portal sub-app   (own shell, sidebar, routes)
├── admin/           admin dashboard sub-app (own shell, sidebar, routes)
├── guest/           guest test engine + the four scoring instruments
├── components/      shared UI — shadcn primitives, shells, charts, brand
├── lib/             API clients, stores, domain logic
├── server/          server cores shared by Vercel functions AND Vite dev middleware
└── intelligence/    Career Intelligence layer (agents, engines, sources)
```

---

## Quick start

```bash
# 1 — the product app (all three dashboards + guest tests)
cd counselor && npm install && npm run dev        # → http://localhost:5180

# 2 — the marketing site
cd site && npm install && npm run dev             # → http://localhost:5173

# 3 — the Python AI service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload                     # → http://localhost:8000
```

The apps run against live read-only APIs out of the box; AI and payment features need keys.
Full instructions: **[`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)**

---

## Live deployments

| App | URL | Source | Host |
|---|---|---|---|
| Product — 3 dashboards + guest tests | `setmycareer-counselor.vercel.app` | `counselor/` | Vercel |
| Marketing site | `site-madhavs-projects-56d7586e.vercel.app` | `site/` | Vercel |
| Python API + bloo PWA | `setmycareer.vercel.app` | `api/` + `app/` + `frontend/` | Vercel |
| Company backend *(not in this repo)* | `api.setmycareer.com` | — | existing .NET service |

> **On Railway.** `Procfile`, `railway.json` and `.railwayignore` describe a Railway deploy of
> the Python service. That path is **superseded** — the live Python API is served by Vercel via
> `api/index.py`, confirmed against `/api/health`. Those files are kept only so the history
> reads sensibly; don't treat them as current.

---

## The stack

| Layer | Technology |
|---|---|
| All user interfaces | **TypeScript** · React 19 · Vite · Tailwind · shadcn/ui |
| Serverless functions | **TypeScript** on Vercel (Edge + Node runtimes) |
| AI / report engine | **Python** · FastAPI + LangGraph (7-agent career pipeline) |
| Company backend | **C#** / ASP.NET — separate repo; spec in `SMC_SYSTEM_ARCHITECTURE.md` §2 |
| Data | Postgres (Supabase), Appwrite, generated datasets under `data/` |

Three languages, each doing a job it suits: TypeScript where the browser is, Python where the
LLM/agent ecosystem lives, C# where the company's existing data already sits.

---

## Security — read before your first commit

**Never commit a secret.** Every `.env*` file is gitignored, along with `*.local`, key files and
the generated test-link sheets. Real keys live in the Vercel dashboard and the team password
manager — never in this repository.

A secret committed once lives in git history **forever**, on every clone, even after a later
edit removes it. If you think one has been committed: **rotate the key first**, then clean
history. Full rules and the key inventory (names only): **[`docs/SECURITY.md`](docs/SECURITY.md)**.

---

## A note on the psychometric instruments

`counselor/src/guest/` contains the item banks for the personality, interest, DBDA ability and
CCPA competency instruments, together with their scoring engines and norm tables.

These are **live assessment materials**, which has two consequences:

1. **Keep this repository private.** Published item banks let future test-takers see the
   questions in advance, which invalidates results for everyone who takes them after.
2. **Respect the licences.** DBDA and CCPA are published instruments. Redistribution outside
   this organisation needs the publisher's permission.
