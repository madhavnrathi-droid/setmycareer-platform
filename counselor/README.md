# counselor — the SetMyCareer product app

**One React SPA serving four audiences.** The counsellor console, client portal, admin dashboard
and guest test engine all ship from a single build. They differ by route, shell and data scope —
not by codebase.

> New here? Read [`docs/SMC_SYSTEM_ARCHITECTURE.md`](docs/SMC_SYSTEM_ARCHITECTURE.md) — it walks
> every screen in the product for someone who has never used it.

```bash
npm install && npm run dev     # → http://localhost:5180
```

| Surface | Route | Who it's for |
|---|---|---|
| Counsellor console | `/` | SMC counsellors — caseload, calendar, live sessions, report authoring |
| Client portal | `/portal` | Students, professionals, parents — tests, reports, sessions, Compass, billing |
| Admin dashboard | `/admin` | SMC staff — KPIs, session oversight, revenue, test-link generation |
| Guest tests | `/t/:token` | Prospects — the full battery, no account needed |
| Call room | `/call/:clientId` | Both sides of a live video/voice session (outside the shell) |

---

## Layout

```
src/
├── App.tsx           route table for all four surfaces
│
├── screens/          COUNSELLOR CONSOLE — Overview, Clients, ClientHub, Calendar, ReportsHub,
│                     ReportBuilder, TranscriptsHub, Messages, Library, Terminal, Assistant,
│                     Methodology, Settings, CallRoom
│
├── portal/           CLIENT PORTAL sub-app (own router + shell)
│   ├── screens/        Home, Assessments, TestRunner, Reports, ResultsSummary, TestReport,
│   │                   Sessions, Journey, Therapy (Compass), Voice, Messages, Terminal,
│   │                   Services, Product, Billing, Account, Auth
│   ├── tests/          catalog · results-store · report-bridge · interpretations · market-match
│   └── components/     JourneyStream, IsoGlyphs, ProfileGate, CareerCards
│
├── admin/            ADMIN DASHBOARD sub-app — Overview (mission control), Clients, ClientDetail,
│                     Counsellors, ExpertApplications, Sessions, TestLinks, Revenue, Economics,
│                     Commerce, Marketing, Growth, Api, Copilot
│
├── guest/            GUEST TEST ENGINE — GuestFlow orchestrator, the three runners
│                     (Likert / Ability / CCPA), and all four instrument item banks
│
├── components/       shared UI — ui/ (shadcn), shell/, compass/, assistant/, custom/ (charts),
│                     report/, brand/, calendar/, recording/
├── lib/              API clients (smc-api, smc-live-api, live-queries), stores, scoring (sigma/),
│                     report pipeline, auth, calendar, recording
├── server/           server cores shared by the Vercel functions AND the Vite dev middleware —
│                     so /api behaves identically in dev and production
└── intelligence/     Career Intelligence layer — agents, engines, sources, context

api/                  Vercel functions (every server-only secret lives behind these)
├── assistant.ts        Edge · Compass chat — Groq → OpenRouter → Gemini failover
├── razorpay.ts         Node · order creation + HMAC verification   ← must stay Node
├── cloud.ts            Edge · per-user state + chats — store unconfigured (see below)
├── livekit-token.ts    Edge · video/voice room tokens
├── consolidate.ts      Edge · guest-battery synthesis (Gemini)
├── report.ts           Edge · counsellor report generation
├── transcribe.ts       Edge · speech-to-text
├── notes.ts            Edge · session-notes helper
├── fit-report.ts       Edge · marketing fit-test report
├── marketing.ts        Edge · Google Ads spend metrics
└── providers.ts        Node · live provider usage (Razorpay, OpenRouter, Groq, LiveKit)
```

---

## Where app state lives (since 19 Jul 2026)

The interim cloud store is **retired**. `POST /api/cloud` now answers `{"ok":false,"disabled":true}`
at HTTP 200, `src/lib/cloud.ts` flips `serverReachable = false`, and every cloud-backed store falls
back to per-user-namespaced `localStorage`. This is the **designed fallback, not a crash** — portal
sign-in, dashboard and Reports all render with zero console errors.

| | |
|---|---|
| **Unaffected** | Clients, counsellors, sessions and uploaded reports — those live in the .NET backend at `api.setmycareer.com`. Completed test results are pushed there too. |
| **Lost** | Cross-device sync · durability (clearing browser data wipes app-layer state) · shared admin state (coupons, refunds and client overrides are now per-browser) |

The cloud code was kept **on purpose**. `src/server/cloud-core.ts` speaks plain PostgREST, so
pointing `SUPABASE_URL` + `SUPABASE_KEY` at *any* Postgres re-enables the whole layer with no app
changes. Treat it as present-but-unconfigured.

> ⚠️ **RELEASE BLOCKER — a marketing-site purchase no longer grants the package.**
> The flow was `site/src/pages/Checkout.tsx` → `POST /api/razorpay` action `verify` →
> `recordServerPurchase()` writes `purchases:<clientId>` → the portal's `syncWalletAndPurchases()`
> (`src/portal/portal-store.ts`) reads it back and grants the package exactly once. With no store the
> write returns `false` and the read returns `null`, so the customer **is charged and receives
> nothing in the portal**. Payment verification itself still works correctly — it is explicitly
> best-effort, *a store failure never invalidates a genuine payment* — and Razorpay remains the
> authoritative record of the money. **Latent, not active**: the deployed key is `rzp_test_…`, so no
> real money flows through it yet. **This must be resolved before switching to live Razorpay keys.**
> The real fix is the backend purchase/entitlement endpoints in
> [`docs/BACKEND_API_SPEC.md`](docs/BACKEND_API_SPEC.md).

---

## The four instruments

`src/guest/` holds the item banks, scoring engines and norm tables. The portal embeds these same
runners for its final battery, so a test behaves identically for a guest and a paying client.

| Instrument | Items | Scoring |
|---|---|---|
| Personality — `personality-final.ts` | 72 | 6 factors × 3 sub-facets, 0–100 with bands |
| Interest — `interest-final.ts` | 176 | 34 clusters; attraction + career-level scores |
| Ability (DBDA) — `ability-bank.ts` + `ability-norms.ts` | 245 | 7 timed sections, graded A–J against age/gender norms |
| Competency (CCPA) — `ccpa.ts` | 88 | 12 competencies via 3 methods (SJT, forced-choice, Likert) |

**The third test is automatic by track:** students get DBDA, professionals get CCPA. Both save
under the same result id (`aptitude`) with a `variant` discriminator, so downstream wiring is
identical.

Plain-language interpretations live in `src/portal/tests/interpretations.ts` — a **rule engine,
not AI**, so the same scores always produce the same words.

> ⚠️ These are live assessment materials under licence. Don't alter items or scoring without the
> validated source — see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Docs in this folder

| File | What it is |
|---|---|
| [`SMC_SYSTEM_ARCHITECTURE.md`](docs/SMC_SYSTEM_ARCHITECTURE.md) | **The master document** — full IA of every touchpoint + the C# API spec for the backend team |
| [`SMC_API_REFERENCE.md`](docs/SMC_API_REFERENCE.md) | All 141 endpoints across the four API layers |
| [`E2E_TEST_MAP.md`](docs/E2E_TEST_MAP.md) | Cross-role data-flow map + how to drive the product end to end |
| [`BACKEND_API_SPEC.md`](docs/BACKEND_API_SPEC.md) | The earlier gap list handed to the backend team |
| [`SMC_MIGRATION_GAPS.md`](docs/SMC_MIGRATION_GAPS.md) | What still depends on the interim store |

---

## Commands

```bash
npm run dev                # dev server on :5180, /api served by Vite middleware
npx tsc -b --force         # typecheck — --force is required (see below)
npm run build              # production build
npx vercel --prod --yes    # deploy
```

---

## Things that will bite you

| | |
|---|---|
| **`tsc -b` without `--force`** | Incremental mode skips files and hides unused-variable errors until CI. Always pass `--force`. |
| **Razorpay on Edge** | 406s. `api/razorpay.ts` must stay on the Node runtime. |
| **Blank white app** | Usually module-eval TDZ — a top-level call to a `const` arrow declared lower in the file. Neither `tsc` nor the build catches it; check the browser console. |
| **Ability score keys** | Uppercase (`VA`, `SA`, `RA`, `NA`, `MA`, `CL`, `CA`). Lowercase won't resolve to labels and users see raw codes. |
| **`VITE_SMC_WRITES_ENABLED=true`** | Writes to the **real production backend**. Keep it `false` locally. |
| **Portal "account closed"** | A local admin flag, not a server state. Clear `smc.account.state` and `smc.portal.revoked` from localStorage. |
| **App state vanishes** | Expected since the cloud store was retired — clearing browser data wipes it, and nothing follows you to a second device. See [Where app state lives](#where-app-state-lives-since-19-jul-2026). |
| **A test purchase grants nothing** | Not a bug you introduced — the marketing-site checkout can't grant packages without a server store. Same section, RELEASE BLOCKER note. |
