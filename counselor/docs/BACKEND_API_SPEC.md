# SetMyCareer — Backend work required to "store everything on the server"

This is the complete list of backend work that **only your backend team can do** — the
things I cannot do from the frontend, and the **new API endpoints** the app needs so that
chats, app-state, messaging, bookings and test results can live on **your** server
(`api.setmycareer.com`) instead of the interim Supabase database.

Today the app already uses your live backend for **clients, sessions, notes, reports,
navigators, packages**. The items below are the gaps.

---

## 0. TL;DR — what to build

| # | Capability | Why it's needed | New endpoints |
|---|-----------|-----------------|---------------|
| A | **AI chat storage** | Compass conversations (per user, ≤50) | 4 |
| B | **App-state (key/value)** | per-user app data with no existing home | 3 |
| C | **Messaging** | client ↔ counsellor chat (not session notes) | 3 |
| D | **Booking requests** | client asks for a session before it's a sold service | 3 |
| E | **In-app test results** | Big-Five / RIASEC / Sigma results taken in the app | 2 |
| F | **Coupons & refunds ledger** | currently only in the browser | 4 |
| — | **Security & infra** (§3) | auth tokens, password **hashing**, CORS, authorization | — |

Until these exist, that data is stored in a **Supabase Postgres DB** (free, Mumbai) that
only our serverless function touches — see §5 for the trivial swap once your endpoints
are live.

---

## 1. Conventions (match the existing API)

- **Base:** `https://api.setmycareer.com/api/`
- **Content-Type:** `application/json` (file upload = `multipart/form-data`, like `Reports/uploadReport`)
- **IDs:** send numeric ids **as strings** (`user_id`, `uid`) — same as the current contract.
- **Keys:** lowercase-first, exactly as the existing endpoints.
- **Success shape:** please standardise on `{ "success": true, "data": ... }` / `{ "success": false, "message": "..." }` (matches `User/LoginWithPassword`). Array-returning endpoints (like `AdminLogin`) are fine too, but a consistent envelope is easier to consume.
- **CORS:** every new route must allow the app origins (`https://setmycareer-counselor.vercel.app` and the production domain) for `GET, POST, DELETE, OPTIONS` + the `Authorization` header. (The current API sends `*`, which works, but see §3 on locking this down once auth lands.)

Throughout, **`app`** is one of `counsellor | client | admin` (who is acting), and
**`user_id`** is that person's numeric SetMyCareer id.

---

## 2. New endpoints

### A. AI chat storage (Compass conversations)

One row per saved conversation, scoped to the signed-in user. Cap 50/user (enforce or let the client prune).

**Table `app_chats`**

| column | type | notes |
|--------|------|-------|
| `id` | text PK | client-generated id |
| `app` | text | counsellor / client / admin |
| `user_id` | text | owner's numeric id |
| `title` | text | first user message, truncated |
| `messages` | json/jsonb | array of `{ role, parts:[{type:'text',text}] }` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | index `(app, user_id, updated_at desc)` |

**Endpoints**

```
POST  Chats/List      { app, user_id }                          → { success, data: ChatRow[] }   // newest first
POST  Chats/Upsert    { app, user_id, chat: ChatRow }           → { success }                     // insert or update by id
POST  Chats/Delete    { app, user_id, id }                      → { success }
POST  Chats/Clear     { app, user_id }                          → { success }                     // delete all for the user
```

`ChatRow = { id, title, messages, created_at?, updated_at? }`

### B. App-state (generic per-user key/value)

A simple document store for per-user app data that has no dedicated table (UI prefs, plan
selection, "seen" markers, onboarding flags, etc.). One value per `(app, user_id, key)`.

**Table `app_state`** — `app text, user_id text, key text, value json, updated_at timestamptz`, PK `(app, user_id, key)`.

```
POST  AppState/GetAll  { app, user_id }                 → { success, data: { [key]: value } }
POST  AppState/Set     { app, user_id, key, value }     → { success }   // upsert
POST  AppState/Remove  { app, user_id, key }            → { success }
```

### C. Messaging (client ↔ counsellor)

Distinct from **session notes** (`commentinsert`). This is the chat thread between a client
and their counsellor. Keyed by **client id** so **both** parties read the same thread.

**Table `messages`** — `id, client_id, navigator_id, from_role ('client'|'counsellor'), from_id, body text, attachments json, created_at`.

```
POST  Messages/Thread  { client_id }                                      → { success, data: Message[] }   // chronological
POST  Messages/Send    { client_id, navigator_id, from_role, from_id, body, attachments? } → { success, data: Message }
POST  Messages/MarkSeen { client_id, reader_role, last_seen_id }          → { success }
```

> Without this, a message a client sends only reaches the counsellor if both use the **same
> browser** (current localStorage behaviour). This endpoint is what makes messaging work
> across devices/accounts.

### D. Booking requests

A client requesting a session **before** it becomes a formal sold-service/session row.

**Table `bookings`** — `id, client_id, navigator_id, requested_slot, topic, mode ('online'|'offline'), status ('requested'|'confirmed'|'declined'|'cancelled'), created_at`.

```
POST  Bookings/List      { client_id }  OR  { navigator_id }   → { success, data: Booking[] }
POST  Bookings/Request   { client_id, navigator_id, requested_slot, topic, mode } → { success, data: Booking }
POST  Bookings/SetStatus { id, status }                        → { success }
```

### E. In-app test results (structured)

The app administers **Big-Five, RIASEC and Sigma** tests. Right now results live only in the
browser. To persist them server-side (and feed the report engine), store the raw + scored
result. Must be readable by **both** the client and their counsellor (key by `client_id`).

**Table `test_results`** — `id, client_id, test_id, answers json, scores json, overall numeric, taken_at timestamptz`.

```
POST  Tests/SaveResult  { client_id, test_id, answers, scores, overall, taken_at } → { success, data: TestResult }
POST  Tests/Results     { client_id }                                              → { success, data: TestResult[] }
```

> Note: the **final report** generated from these results is **already** uploaded to your
> server via the existing `Reports/uploadReport` (we use it, confirm-gated). This endpoint is
> only for the **structured test data** behind the report.

### F. Coupons & refunds ledger (optional but requested for "everything on server")

Razorpay holds the actual transactions; this is your **own** record of issued coupons and
processed refunds for the admin views.

**Tables `coupons` / `refunds`** (mirror the fields the admin Commerce screen uses).

```
POST  Commerce/Coupons/List    {}                                  → { success, data: Coupon[] }
POST  Commerce/Coupons/Create  { code, type, value, expires_at, ... } → { success, data: Coupon }
POST  Commerce/Coupons/Delete  { id }                              → { success }
POST  Commerce/Refunds/List    {}                                  → { success, data: Refund[] }
```

---

## 3. Security & infrastructure — **only your team can do these**

These are not frontend tasks; they require backend code, DB migrations and secrets.

1. **🔴 Hash all passwords (critical).** Today `Login/NavigatorLogin` (and the user/admin
   login) **returns the password in plaintext** in the response, which means passwords are
   stored unhashed. This is a serious vulnerability. Migrate to bcrypt/argon2, stop returning
   the password field, and force a reset for any account whose hash can't be derived.
2. **Real authentication tokens.** The API is currently **open** (no token on any endpoint).
   Issue a JWT/session token on login and require it (`Authorization: Bearer …`) on every
   read/write. Without this, anyone can call any endpoint with any `user_id`. **All the new
   endpoints above must be behind this**, and authorize that the token's user matches the
   `user_id`/`client_id`/`navigator_id` in the request (a counsellor may read their own
   clients; a client only their own data; admins broadly).
3. **CORS allow-list.** Once tokens exist, replace `Access-Control-Allow-Origin: *` with the
   explicit app origins, and allow the `Authorization` header.
4. **Per-user authorization rules** (server-side), e.g. counsellor↔client thread access,
   admin-only commerce endpoints.
5. **Rate limiting / abuse protection** on auth + write endpoints.
6. **A "set/reset navigator password" endpoint** (or admin UI) — needed because some older
   navigator accounts may have no usable password (see the login work). `updateNavigatorDetial`
   already accepts a `password` field; expose a focused, authorized "reset password" path.
7. **Email/SMS provider** for OTP + notifications (already partly in your backend — confirm
   it's production-grade and rate-limited).
8. **DB schema migrations** for all tables in §2 on your production database.
9. **🟠 Paginate `SoldService/getclientbynaviId` (performance).** It returns a navigator's
   ENTIRE caseload in one response — for a large counsellor that's **>1.3 MB and takes
   90s+** to serialise, so the Clients page times out. Add `page` + `pageSize` (or a
   lighter `…/count` + paged rows), and ideally server-side search/filter. The frontend
   already raised its timeout to 90s and now persists the last good caseload (so it loads
   instantly after one success), but the real fix is here. Same applies to any other
   "return everything" endpoint (`getAllclientbysession`, `getSessionAllAdmin`).

---

## 4. Things I absolutely cannot do from here

- Add or change **any endpoint** on your `api.setmycareer.com` backend (I don't have that
  codebase or server access).
- **Hash the stored passwords** or change how login responses are built (backend code).
- Issue/verify **auth tokens** or change the open-API posture (backend).
- Run **database migrations** on your production DB.
- Access **server secrets** (DB credentials, the Razorpay secret beyond what's already set,
  any SMTP/SMS keys).
- Move the existing **clients/sessions/reports** data anywhere — that stays in your DB; I only
  read/write it through the endpoints you expose.

Everything I *can* do (and have done) is on the frontend + a thin serverless layer: the live
read/write wiring, the confirm-gated `uploadReport`, the per-user chat/app-state store, the
UI, and the PDF export.

---

## 5. Migration path (when your endpoints are live)

The app talks to a single internal function, **`/api/cloud`** (`src/server/cloud-core.ts`),
for chats + app-state. It currently relays to Supabase. When endpoints **A** and **B** above
exist on your backend, the swap is ~20 lines in `cloud-core.ts`:

```
// from (Supabase PostgREST):
fetch(`${SUPABASE_URL}/rest/v1/app_chats?...`, { headers: { apikey, authorization } })
// to (your backend):
fetch(`https://api.setmycareer.com/api/Chats/List`, { method:'POST', body: JSON.stringify({ app, user_id }) })
```

No UI changes. Messaging/bookings/test-results (**C/D/E**) would similarly replace the
browser-local stores with calls to your new endpoints, behind the same client helpers.

The Supabase DB can then be retired (or kept as a cache) — your call.

---

_Maintained by the frontend. Questions → the cloud store lives in `src/server/cloud-core.ts`,
`src/lib/cloud.ts`, `api/cloud.ts`; live SMC wiring in `src/lib/smc-live-api.ts`._
