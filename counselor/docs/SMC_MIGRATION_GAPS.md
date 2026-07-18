# SetMyCareer — live-migration gaps

What is LIVE vs. what has **no backend source** (and therefore renders **blank**, not synthetic), per the Admin API contract. Base: `https://api.setmycareer.com/api/`.

## Live (real data wired)

- **Auth** — client phone-OTP (`User/SendOtp`→`LoginWithOtp`) + email/password (`LoginWithPassword`); admin `Login/AdminLogin`. Sessions key on the numeric `UserData.id` (`src/lib/auth-store.ts`).
- **Client portal** — session history, counsellor, package, reports (real PDFs), notes (`getSessionAll`, `GetPurchasePackages`, `getAllReportsForUser`, `getCommentsAllbyNavi`).
- **Admin Mission Control** — real `Admin/GetStatistics` (consultations, sessions completed/pending, packages sold, counsellors active/inactive, test links).
- **Navigators / packages / roster / sessions / ability scores** — `getAllNavigator` (81), `getAllPackages` (115), `UserView{userId:0}` (1841), `getAllclientbysession` (5694), `GetAdminAbilitySummaryData` (978).
- **Per-session video** — unique LiveKit room per session (`src/lib/meeting-link.ts`, `roomForSession`/`sessionCallHref`); both sides compute the same room from `session_id`.
- **Writes** — `src/lib/writes.ts` (add service, modify/delete session, reassign counsellor, add note, toggle navigator, set category) — gated by `VITE_SMC_WRITES_ENABLED` (default OFF). Refunds via Razorpay. Verified reachable non-destructively (`ModifysessionsStatus{id:0}` → 200).

## No live source → render BLANK (do not synthesize)

These have **no endpoint** in the contract. Show empty / hidden, never fabricated:

- **All business intelligence** in `metrics.ts` & `economics.ts`: MRR / MRR movement, NRR/GRR/churn, time-series (revenue/sessions/MAU/DAU), funnel, cohorts, forecasts, segments, FINANCE (cash/burn/runway), ALERTS, dunning, support (CSAT/NPS), pacing, capacity, unit economics (CAC/LTV/payback/ARPU).
- **Per-counsellor performance**: caseload, rating, utilization, notes-SLA, revenue, response time (the roster gives identity + active flag only).
- **Per-client derived**: careerIndex, wellbeingIndex, riskFlag, journey stage, LTV, lastActive (roster is sparse — mostly id/name/email/mobile/category).
- **API/provider usage & cost** (`API_PROVIDERS`), **coupon usage counts**, **AI-minute/credit balances**, **transcripts**, **roles/RBAC**.

## Writes with NO endpoint → stay LOCAL (clearly non-persistent)

`assign navigator (admin-side), set stage, pause/archive/reactivate client, schedule/cancel session (no create-session endpoint), coupon CRUD, invite counsellor`. These remain local overlays and do **not** persist to the backend until the SMC team adds endpoints.

## Notes / gotchas

- `user_id` / `uid` are sent as **strings**; `getclientbyadmin`/`getclientbynaviId` need numeric `id:0`.
- Roster is ~1 MB and there is **no aggregate endpoint** — headline totals come from `GetStatistics`; deeper aggregates would require per-user iteration (cached via `live-queries.ts` TTL).
- LiveKit prod needs `LIVEKIT_URL/API_KEY/API_SECRET` in the deploy env or calls fall back to local-preview (no real multi-party room).
- `account-state` pause/archive gates the **UI only** (cannot be enforced server-side).
