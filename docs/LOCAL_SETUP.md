# Local setup

Getting all four applications running on your machine, and what each one needs to be useful.

**Prerequisites:** Node 20+, npm 10+, Python 3.12 (pinned in `.python-version`), git.

---

## 1. The product app — three dashboards + guest tests

This is where most work happens.

```bash
cd counselor
npm install
npm run dev            # → http://localhost:5180
```

Open the four surfaces:

| Surface | URL |
|---|---|
| Counsellor console | `http://localhost:5180/` |
| Client portal | `http://localhost:5180/portal` |
| Admin dashboard | `http://localhost:5180/admin` |
| Guest test link | `http://localhost:5180/t/smcmain01` |

**Works with no configuration.** The app reads the live SetMyCareer backend
(`api.setmycareer.com`) for navigators, packages and sessions — those endpoints are open, so
the UI populates immediately.

**To exercise the AI, payments or video**, create `counselor/.env.local`:

```bash
# AI (Compass chat, report generation, transcription)
GROQ_API_KEY=
OPENROUTER_API_KEY=          # paid fallback when Groq's free tier is exhausted
GEMINI_API_KEY=              # guest-battery consolidation

# Payments — TEST keys only, never live keys locally
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Video / voice sessions
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Writes to the live backend — leave false unless you mean it
VITE_SMC_WRITES_ENABLED=false
```

> `VITE_SMC_WRITES_ENABLED=true` makes the app write to the **real production backend** —
> creating navigators, modifying sessions, uploading reports. Keep it `false` while developing
> unless you are deliberately testing a write path.

Vite dev middleware serves the `api/` functions locally, so `/api/assistant` and friends work
in dev exactly as they do in production — they share the same code in `src/server/`.

**Getting signed in:** the portal's *Create account* button makes a local account in one click.
For accounts with real data, see [`counselor/docs/E2E_TEST_MAP.md`](../counselor/docs/E2E_TEST_MAP.md).

### The app cloud store is off — locally and in production

There is one more pair of variables, and it is **not currently set anywhere**:

```bash
# App cloud store (Compass chats + per-user app state) — OPTIONAL, NOT SET
# Leave blank to run local-only. This is what production does too.
SUPABASE_URL=
SUPABASE_KEY=
```

The Supabase project that backed this was retired on **2026-07-19**, and both variables were
removed from the `setmycareer-counselor` Vercel project. With them unset, `POST /api/cloud`
returns `{"ok":false,"disabled":true}` at HTTP 200 — a deliberate signal, not an error.
`src/lib/cloud.ts` reads it, sets `serverReachable = false`, and stores everything in
`localStorage` namespaced per user. Expect that locally; it is the same behaviour production has.

What this changes while you develop:

- **No cross-device sync.** State lives in the browser you created it in.
- **No durability.** Clearing site data wipes chats, bookings, wallet and admin state.
- **Admin state is per-browser.** Coupons, refunds and client overrides don't leave your machine.
- **Unaffected:** clients, counsellors, sessions and uploaded reports — those come from
  `api.setmycareer.com`, and completed test results are pushed there.

The server code is intact. `src/server/cloud-core.ts` talks plain PostgREST, so pointing those
two variables at **any** Postgres with the schema in [`../supabase/migrations/`](../supabase/migrations/)
brings the store back — no code change.

---

## 2. The marketing site

```bash
cd site
npm install
npm run dev            # → http://localhost:5173
```

Runs standalone. Its serverless functions (blog, news, lead capture, e-book) need keys only if
you're working on those specific features:

```bash
RESEND_API_KEY=        # contact form + e-book delivery
```

The site calls the product app's APIs for its chatbot, fit-test and checkout. In development
those point at the deployed product app, so they work without running `counselor/` too.

---

## 3. The Python AI service

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # → http://localhost:8000
```

Check it: `curl localhost:8000/api/health` → `{"ok":true,...}`

Copy `.env.example` to `.env` and fill what you need:

```bash
GROQ_API_KEY=          # required — everything LLM-shaped needs this
OPENROUTER_API_KEY=    # optional paid fallback
DATABASE_URL=          # optional — any Postgres; omit to run stateless. Not set in production.
APPWRITE_*=            # optional — the live persistence backend
RECALL_API_KEY=        # optional — meeting bot that joins Zoom/Meet/Teams
```

With no keys it still starts; LLM routes return a clear "not configured" error rather than
failing obscurely.

---

## 4. The bloo PWA (therapy/recording)

A separate product that shares the Python deployment.

```bash
cd frontend
npm install
npm run dev
```

---

## Common tasks

```bash
# typecheck (do this before every commit)
cd counselor && npx tsc -b --force
cd site      && npx tsc -b --force

# production build
npm run build

# rebuild the RAG index after editing docs/frameworks/*.md
python scripts/preprocess/build_rag.py
```

> **Counsellor typecheck gotcha:** `tsc -b` without `--force` is incremental and will silently
> skip files, hiding unused-variable errors until CI. Always pass `--force`.

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Portal says "account is closed" or signs you straight out | A local admin flag. Clear it: `localStorage.removeItem("smc.account.state"); localStorage.removeItem("smc.portal.revoked")` then reload. |
| Compass chat returns nothing | No `GROQ_API_KEY`. The UI now shows an error row rather than hanging. |
| `/api/cloud` returns `{"ok":false,"disabled":true}` | Expected. No `SUPABASE_URL`/`SUPABASE_KEY` is set anywhere since the store was retired; the app runs local-only. Not a bug. |
| Chats, bookings or admin overrides disappeared | App-layer state lives in `localStorage` only. Clearing site data, a different browser or a different profile all start empty. |
| Razorpay checkout 406s | The function must run on the **Node** runtime, not Edge — Razorpay rejects Edge. |
| Blank white app after an edit | Usually a module-eval TDZ error: a top-level call to a `const` arrow function declared lower in the file. `tsc` won't catch it. Check the browser console. |
| Test scores look wrong | Ability keys are **uppercase** (`VA`, `CA`, `NA`…). Lowercase keys won't resolve to labels. |
