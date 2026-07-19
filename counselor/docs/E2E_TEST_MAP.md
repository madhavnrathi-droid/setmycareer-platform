# SetMyCareer — Cross-Role Functional Map (E2E test foundation)

> **Credentials are deliberately NOT in this file.** These are accounts on the
> **live production backend**. Passwords live in the team password manager
> (1Password → “SMC E2E test logins”), never in git — anything committed here
> would survive in history on every clone, forever, even after a later edit.
> If you need access and can't find the entry, ask the founder.

_Generated 2026-07-12 for the "3 test logins + drive every touchpoint" effort. This is the
ground truth for how data flows between the **client portal**, **counsellor console**, and
**admin dashboard**, where every state lives, and where feedback is missing. Fix the flows
here first; then the same wiring ships to every product._

---

## 0. The architecture in one paragraph

Three apps, one React-Router tree (`src/App.tsx`): `/portal/*` (client), `/admin/*` (admin),
everything else under `AppShell` (counsellor). **Two data planes** back them:

- **Plane A — live SMC backend** (`https://api.setmycareer.com/api/`): identity, the 81
  navigators, packages, sold services, live sessions, uploaded report PDFs, counsellor notes.
  Numeric user ids. Reads are open (no token); writes are client-gated by
  `VITE_SMC_WRITES_ENABLED` (currently **ON**, local + prod).
- **Plane B — app cloud store** (`POST /api/cloud`, ops `state:getAll|set|remove`,
  `chats:list|upsert|remove|clear`; two tables `app_state` + `app_chats`, scoped by
  `(app, user_id)`): everything conversational — bookings, calendar, messages, test-result
  digests, wallet/credits, AI chats.
  **⚠️ Plane B is OFF as of 19 Jul 2026.** The Supabase project behind it was retired and
  `SUPABASE_URL`/`SUPABASE_KEY` are unset, so `/api/cloud` answers
  `{"ok":false,"disabled":true}` (HTTP 200) and `src/lib/cloud.ts` sets
  `serverReachable = false`. Everything above still works, but **per browser only** — it
  now lives in localStorage namespaced `key::app:userId`.

  **What this changes when you test:** nothing syncs across devices or browsers, and a
  second tester signed in as the same client sees an empty slate rather than the first
  tester's data. Clearing site data wipes it. If you are verifying a cross-role hand-off
  (client books → counsellor sees it), **you must drive both roles in the same browser
  profile**, or Plane B data will look silently missing. Plane A is unaffected.

Identity: counsellor/admin read `localStorage["smc.auth.session"]`; client reads
`localStorage["smc.portal.account"]` (`src/lib/cloud.ts`). LiveKit (`/api/livekit-token`) and
the AI endpoints (`/api/assistant`, `/api/report`) are fully configured in prod.

---

## 1. The dominant structural risk: THREE parallel "session" systems

There is no single session entity. Each has its own store **and its own LiveKit room scheme**,
which is why a client and counsellor can both think they "joined" and land in different rooms.

| System | Entity | Created by | Stored | Room scheme |
|---|---|---|---|---|
| **A. In-app booking** | `PortalBooking` | client request / admin schedule | `smc.portal.bookings` + cloud `shared.bookings` (client scope) | `smc-<clientId>` |
| **B. Counsellor calendar** | `Appointment` | counsellor Calendar screen | `smc.calendar.events::<app>:<uid>` + cloud `calendar-events` (counsellor scope) | `smc-cal-<eventId>` |
| **C. Live SMC session** | `UserSession` | the real backend / purchase | remote (read-only in app) | `smc-s-<sessionId>` (or parsed from `meetinglink`) |

The counsellor Calendar folds System C in read-only (`live:` prefix). **The ring
(`startCallInvite`) reconciles room mismatches, but `callStore` is localStorage-only → the ring
only crosses tabs in ONE browser, never cross-device.** For our test (one browser, two tabs or
two profiles) this works; on real separate devices it does not.

**Deterministic cross-device path that DOES work:** both sides join a **System-A booking**
(room `smc-<clientId>`) or a **live session** (room `smc-s-<sid>`), because both sides derive
the identical room string from shared ids without needing the ring.

---

## 2. Auth & the 3 logins (recipe)

| Role | Door | Live call | How to get a test login |
|---|---|---|---|
| **Admin** | `/admin` | `Login/AdminLogin {username,password}` (array, len>0) | **No create endpoint exists.** Must use a real SMC staff username+password. ← _only external dependency we can't self-serve._ |
| **Counsellor** | `/` | `Login/NavigatorLogin {email\|mobile, password}` — keyed on **email**, gated on `isActive` | `NavigatorDetail/AddNavigator {name,email,password}` (write, enabled) → then **approve** in `/admin` (EnableNavigator) so `isActive=true`. |
| **Client** | `/portal` | OTP (`SendOtp`→`LoginWithOtp`) or `LoginWithPassword` | Portal "Create account" is **LOCAL-ONLY** (no backend user). A real client needs a backend user; OTP delivers to a real inbox. **Soft path:** for an already-existing backend account, `verifyOtp` falls back to `UserView` — signs in without a valid code. |

**Assignment (dedicated counsellor):** the portal resolves the counsellor from the client's
sold-service `navi_id`, else `account.counsellorId`. Two levers:
- **Live:** `SoldService/addClientServiceFromAdmin` (create a service carrying `navigator_id`)
  or `Calendar/changeUserNavigator {navigatorId, serviceId}` (reassign). Both enabled, no UI.
- **Client-side instant:** set `account.counsellorId` to a real navigator id (`chooseCounsellor`).
  `usePortalCounsellor` resolves it against the roster and lights up the card + messaging +
  booking. Threads/bookings key on `${clientId}::${counsellorId}` and mirror to the client's
  cloud scope, so the counsellor signed in as that navigator id sees them.

---

## 3. Every call state (the primary test target)

`Mode`: **connecting → live | demo**. `Presence/timer`: **waiting → running ⇄ paused → ended**.

Surfaces both sides: header (connecting / connected / local-preview + LIVE pill + timer),
floating bar (mic, cam, share, record, pause[counsellor], calendar[client], end, AI ask),
right rail tabs (Notes / Split / Transcript / Chat), ring panel (client), recording banner.

**Confirmed gaps to fix (task #324):**
1. **No reconnecting / failed / disconnected UI** — LiveKit connection state is unused.
2. **No missed-call record** — decline just deletes the invite; counsellor sees only "waiting…".
3. **Live/calendar-only sessions lose in-call notes** — `end()` calls `completeBooking` only if
   a System-A booking matches `clientId`; otherwise timestamped notes + duration are discarded.
4. **Video-call "Transcript" tab is a placeholder** — no STT runs in the call. Real STT lives
   only in the standalone mic recorder (`recording.tsx`, Chrome SpeechRecognition + Groq Whisper).
5. **Client join has no timing gate** (status-only) while counsellor gates on real date/time.
6. **Static "Recording bot on" pill** — always shown regardless of actual capture state.
7. In-call AI chatbot works both sides (same `/api/assistant`, audience-swapped) and is **free**
   (no `spendAI`) — this is correct/intended.

---

## 4. Messages, calendar, booking (task #325)

- **Messages:** one `ChatThread` drives both ends (`me` prop). Cloud key `shared.messages`
  always under the **client** scope (that's what makes it two-way). 5s poll on the open thread;
  inbox list only refreshes on caseload change (new inbound threads lag). Unread = local-only
  seen-stores (don't follow across devices). Attachments inline ≤1.5MB; `@`/`/` tags real
  bookings/tests/reports. Call button is on the **client** header only.
- **Booking feedback holes:** client books → **counsellor gets nothing** (no calendar entry, no
  notification; only admin sees it). Counsellor schedules on their Calendar → **client gets
  nothing** (the two calendars are disjoint). `completeBooking` is the one booking mutation that
  does NOT mirror to cloud → post-session notes/transcript/duration don't sync.
- **Notifications bell is inert** — `notifications.ts` seeds `[]` with no producer anywhere.

---

## 5. Tests → reports → Compass (task #325)

- **Tests:** 3 instruments (personality/interest free, aptitude ₹799 premium). Real scoring
  engine (`src/lib/sigma/engine.ts`) — **never touch**; reflections are unscored side-data.
  Results save to `smc.portal.testresults` + mirror a **digest** to cloud `shared.test_results`.
  Premium unlock flag `smc.portal.purchasedtests` is **local-only** (doesn't follow devices).
- **Reports:** per-test report re-runs the engine live; "Save to profile" is confirm+write-gated
  → `Reports/uploadReport` (Plane A). AI Career Report = `/api/report` (Groq llama-3.3-70b +
  OpenRouter fallback), grounded in real assessment digest. **Share-to-client + Tiptap edits are
  localStorage-only** (`smc.report.share`) → don't cross devices; non-demo client only sees the
  doc if a backend PDF exists.
- **Compass:** `/api/assistant`, 4 personas by audience (client/counsellor/admin/visitor),
  generative-UI cards. Client chat/voice spend Career/Voice Credits (`spendAI`); counsellor/admin
  are free. Chats persist to `app_chats` (≤50/user), shared bar↔full-page.

---

## 6. Feedback matrix — where the system is SILENT (the through-line to fix)

Every "silent" cell below is a place a user acts and the counterpart learns nothing:

| Action | Actor feedback | Counterpart feedback | Fix |
|---|---|---|---|
| Client sends message | optimistic bubble | 5s poll + sidebar count (no toast/push) | acceptable; add inbox interval |
| Client books session | "Request sent" 3.5s | **counsellor: NONE** | mirror booking into counsellor view / notification |
| Counsellor schedules (Calendar) | toast | **client: NONE** | create a matching `PortalBooking` |
| Counsellor completes call | notes stamped | **client cross-device: NONE** | make `completeBooking` mirror to cloud |
| Call declined / missed | — | **counsellor: NONE** | missed-call record + surface it |
| Report shared / edited | toast | **client cross-device: NONE** | server-side share flag |
| Test completed / note added / report uploaded | toast | **no notification anywhere** | fire NotificationCenter events |
| LiveKit reconnecting / failed | — | — | render connection-state banner |

---

## 7. Test-login credentials (LIVE — created 2026-07-12)

All three are **real production accounts** on `api.setmycareer.com`. Plus-addressed to the
founder's Gmail so OTPs land in his inbox.

| Role | Door | Login | Password | Key ids |
|---|---|---|---|---|
| **Counsellor** | `/` (or `/counsellors` sign-in) | `madhav.n.rathi+smccounsellor@gmail.com` | _see 1Password → “SMC E2E test logins”_ | navigator **id 4104**, `isActive:true` |
| **Client** | `/portal` | `madhav.n.rathi+smcclient@gmail.com` | _see 1Password_ (or OTP → founder Gmail) | user **id 31369** |
| **Admin** | `/admin` | _founder's own SMC staff username+password_ | — | no create-admin endpoint; founder tests admin himself |

**Wiring done:**
- Sold-service **21233** (package "Consultation", id 6) ties **navigator 4104 → client 31369**;
  the client shows in counsellor 4104's live caseload (`getclientbynaviId`), and the portal now
  resolves the dedicated counsellor from the purchase package's `navigator_id`
  (fix in `src/portal/counsellors.ts` — works on any device, no session required).
- Cloud `portal.wallet` for client 31369 seeded generous: 20 sessions, 400 AI min,
  1000 career credits, 500 voice credits, plan `premium` — syncs down on login everywhere.

**Known account-level caveats to watch during testing:**
- Client display name is null on the backend (`UpdateSignUp` payload rejected); portal shows
  email/first-name fallback. Cosmetic.
- Premium `aptitude` test unlock is localStorage-only (`smc.portal.purchasedtests`) — buying it
  on one device won't unlock on another (gap #3). Free tests (personality/interest) always work.

## 8. Fixes applied (2026-07-12 batch)

- **Blank-portal crash fixed** — `ProfileBlock` (`PortalSidebar.tsx`) threw on any account
  missing `plan`/`name`, blanking the whole portal (no error boundary). Now guarded.
- **Dedicated-counsellor resolution** — `usePortalCounsellor` now recovers the counsellor from
  the client's **purchase package** `navigator_id` (not only from scheduled sessions), so the
  assigned counsellor shows on any device before any session is booked.
- **Call — honest states** — the header "LIVE" pill shows only when both parties are present;
  otherwise "Connecting"/"Waiting". The fake always-on "Recording bot on" pill is gone; a
  "Recording" pill shows only during actual capture, and a "Captions" pill when STT runs.
- **Call — connection health** — a `ConnStateWatcher` surfaces LiveKit reconnecting /
  connection-lost in the header (was only connecting/connected).
- **Call — real transcript** — the Transcript tab now runs live SpeechRecognition on each side's
  mic and broadcasts final lines over a LiveKit data channel → one combined, speaker-labelled,
  timestamped transcript, live; serialised onto the session on end. (Chromium only.)
- **Call — notes/transcript persist** — `completeBooking` now mirrors the completed session
  (duration + timestamped notes + transcript) to the cloud, so it follows the client to every
  device and the counsellor's copy stays in sync.
- **Compass grounding** — the full-page client guide (`PortalTherapy`) now passes the assessment
  summary as `reportContext` (parity with the floating bar + voice).

## 9. Test script (drive these with the 3 logins)

**Call + transcript + notes** (use two windows; the ring is same-browser only, so join by session):
1. Client `/portal` → sign in → **Book session** → the request shows in the portal.
2. Counsellor `/` → sign in → the client is in the caseload.
3. Client opens the session → **Join**; counsellor opens the same client's call room. Both land in
   room `smc-31369`. Grant mic/camera → LIVE pill appears when both are in; timer runs; speak →
   live captions appear in the Transcript tab on **both** sides; add a timestamped note.
4. End → duration + notes + transcript saved to the session (client sees them in Past sessions).

**Messages**: Client `/portal/messages` ↔ Counsellor `/messages/31369` — both ways, attach a file,
`@`-tag a booking/test/report.

**Assessments → report → Compass**: Client `/portal/assessments` → Personality + Interest (free)
→ Reports → ask Compass "explain my results".

## 10. Known remaining feedback gaps (next iteration)

- Client books → counsellor's **Calendar** doesn't show it yet (only admin does); no notification.
  Counsellor-scheduled calendar events don't create a client booking.
- Notification bell has **no producer** (message/booking/report/test never notify).
- Report **share-to-client + Tiptap edits** are localStorage-only → don't cross devices.
- Missed / declined calls leave **no record** for the counsellor.
