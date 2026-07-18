# SetMyCareer — Cross-Role Functional Map

One app, three doors: **client portal** `/portal/*`, **counsellor console** `/`, **admin** `/admin/*`
(`src/App.tsx`). This document maps every core flow — data planes, states, touchpoints, and
who-gets-what-feedback — as the ground truth for E2E testing with the three test logins.

Generated 2026-07-12 from a four-agent sweep of the codebase. File references are exact.

---

## 1. The two data planes (the single most important fact)

| | **Plane A — live SMC backend** | **Plane B — app cloud store (Supabase)** |
|---|---|---|
| Base | `https://api.setmycareer.com/api/` (CORS `*`, no auth token) | `POST /api/cloud` → Supabase PostgREST (server-held key) |
| Holds | Identity (numeric user ids), navigator roster (81), sold services/packages, sessions-of-record, counsellor comments (notes), uploaded report PDFs, Zoho calendar | Bookings, in-app calendar, client↔counsellor messages, test results, wallet/credits/purchases, AI chats (≤50/user) |
| Writes | Gated client-side by `VITE_SMC_WRITES_ENABLED` (**ON** in .env.local + Vercel prod). Gate is client-side only. | Open POST; scoped by `(app, user_id)`; **no RLS yet** — scoping is by convention |
| Tables | remote FastAPI | `app_state` (key/value docs) + `app_chats` |

Identity resolution for Plane B (`src/lib/cloud.ts:22`): counsellor/admin ⇒ `localStorage["smc.auth.session"]`;
client ⇒ `localStorage["smc.portal.account"]`. Scope strings like `client:29232`, `counsellor:2038`.

**Key `app_state` docs:** `shared.messages` (thread, client-scoped), `shared.bookings` (client-scoped),
`shared.test_results` (digest only), `portal.wallet`, `purchases:<clientId>` (server purchase ledger),
`calendar-events` (per-counsellor).

---

## 2. Auth — who signs in how

| Role | Door | Mechanism | Session |
|---|---|---|---|
| Client | `/portal` | Phone/email **OTP** (`User/SendOtp` → `LoginWithOtp`) or email+password (`User/LoginWithPassword`) | `smc.portal.account` keyed on numeric SMC user id |
| Counsellor | `/` | `Login/NavigatorLogin` — **email**+password (not username); app rejects `isActive=false` client-side | `smc.auth.session` keyed on navigator id |
| Admin | `/admin` | `Login/AdminLogin {username,password}` against the **live staff table** | `smc.auth.session`, role forced `admin` |

Universal login (`authenticate()`, `src/lib/auth-store.ts:176`) tries staff → navigator → user and routes
each role to its own app (`homeForRole`).

### Auth findings (to fix / know)
- **A1. OTP soft-bypass**: `verifyOtp` falls back to `UserView` on OTP failure (`auth-store.ts:72-82`) —
  for an **existing** account, any wrong code still signs you in. Useful for testing; a real security hole.
- **A2. Portal "Create account" is local-only** — `signUp()` writes a `cl_portal_*` account to localStorage;
  **no backend user is created**. That client can never sign in from another device.
- **A3. No admin-creation endpoint exists.** Admin test login = real staff credentials only.
- **A4. Admin "Invite counsellor" modal is fake** (logs an event; `AddNavigator` endpoint exists but has no UI).
- **A5. Admin "Add client" is Plane-B local only** (`cl_admin_*` in `smc.admin.clients.added`).

---

## 3. Sessions & video calls

**Three parallel session systems** (the dominant testing risk):

| System | Entity | Created by | Store | LiveKit room |
|---|---|---|---|---|
| A. In-app bookings | `PortalBooking` | client request / admin schedule | `smc.portal.bookings` + cloud `shared.bookings` | `smc-<clientId>` (or ring-invite room) |
| B. Counsellor calendar | `Appointment` | counsellor Calendar | `smc.calendar.events::…` + cloud `calendar-events` | `smc-cal-<eventId>` |
| C. Live SMC sessions | `UserSession` | real backend (purchases) | remote; read-only in-app | `smc-s-<session_id>` or parsed `meetinglink` |

Calendar screen folds C into B read-only (`live:` prefix). A/B/C never merge otherwise.

**Call room** (`src/screens/CallRoom.tsx`): routes `/call/:clientId` + `/portal/call/:clientId`
(both outside auth gates). Room = `?room=` param or `smc-<clientId>`. Token via `POST /api/livekit-token`
(LiveKit configured in prod → real "live" mode). Identities `counselor-<id>` / `client-<id>`.

**State machine**: connecting → live|demo; waiting (`!joined`, needs remote participant) → running ⇄ paused
(counsellor-only) → ended. Timer presence-gated; limit = `booking.durationMin ?? 50`; overtime turns clock
red and counts up. Ring: counsellor opening the room fires `startCallInvite` → client `IncomingCall` panel
(accept/decline).

**Join gating**: counsellor/admin gate Join on real date+time (10-min pre-window = "live");
**client Join has no timing gate** (status only); counsellor Calendar join ungated.

### Call findings
- **C1. The ring is same-browser only** — `smc.portal.calls` is localStorage-only, never cloud-synced.
  Cross-device the client never rings; they must use a deterministic session link.
- **C2. In-call Transcript tab is a placeholder** — no STT runs in the video call at all. Real STT exists
  only in the counsellor's standalone mic recorder (`src/lib/recording.tsx` → `/api/transcribe` Groq Whisper).
- **C3. Timestamped in-call notes are silently discarded** unless a System-A booking matches the clientId
  (`CallRoom.tsx:284`) — calls on System-B/C sessions lose notes + duration.
- **C4. `completeBooking` never pushes to cloud** — the one booking mutation that skips `pushClientBookings`;
  notes/transcript/actualMin don't reach the client's other devices.
- **C5. No reconnecting/failed UI; no missed-call record; decline is silent to the counsellor.**
- **C6. "Recording bot on" pill is static** — shows regardless of any actual recording.
- **C7. Counsellor has no live-call banner** (`LiveCallBanner` is dead code).

**In-call chatbot**: both sides, same `/api/assistant` (audience-swit