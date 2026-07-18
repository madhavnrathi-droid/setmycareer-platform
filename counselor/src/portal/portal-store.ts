// ── The client portal's local-first store ────────────────────────────────────
// Setmycareer runs TWO front-ends against the same backend: the counsellor
// console (the rest of this app) and the CLIENT PORTAL (this module, mounted at
// /portal with its own login). The portal is deliberately a separate experience
// — a different person, a different link.
//
// Everything here is localStorage-backed so the demo is fully live in the
// browser with no server round-trip, and — crucially — the SAME keys are read by
// the counsellor side, so a message a client sends or a session they request
// shows up for their counsellor in real time. We listen to cross-tab `storage`
// events, so the counsellor console open in one tab and the portal in another
// stay in sync live (true counsellor↔client communication). Each mutation also
// fires a best-effort POST to the FastAPI backend so it survives a reload;
// failures are swallowed — the local store is the source of truth on the client.

import { useSyncExternalStore, useEffect } from "react"
import { PLANS, type PortalPlanId, type PortalCredits } from "./plans"
import { CREDIT_PACKS_2026, offering2026ById, type Offering2026 } from "../server/offerings-2026"
import { emitIdentityChange, cloudStateGetAllFor, cloudStateSetFor } from "@/lib/cloud"

export type { PortalPlanId, PortalCredits }

/** Who this account serves — chosen at sign-up; drives the catalogue, the Career
 *  Terminal's default audience, and how packages are framed across the portal. */
export type PortalTrack = "student" | "professional"

export interface PortalAccount {
  /** Stable client id. Demo personas reuse a mock id (e.g. "cl_tiffany") so the
   *  report / sessions / assessments light up with seeded data; fresh sign-ups
   *  get a generated "cl_portal_*" id and start with graceful empty states. */
  clientId: string
  name: string
  email: string
  counsellorId: string | null
  plan: PortalPlanId
  credits: PortalCredits
  createdAt: string
  goal?: string
  /** True for the rich demo-persona path (linked to seeded mock data). */
  demo?: boolean
  /** SetMyCareer products the member has bought (demo unlock; Razorpay later). */
  purchases?: Purchase[]
  /** Whether the first-run guided tour has been seen. */
  onboarded?: boolean
  /** ISO stamp of the last cloud-wallet push — the LWW cursor for credit sync. */
  walletAt?: string
  /** Student vs working-professional — set at sign-up; live accounts fall back
   *  to the purchase-derived hint (see accountTrack). */
  track?: PortalTrack
  /** Phone number, when known (OTP sign-ins arrive with one; profile asks for it). */
  phone?: string
  /** The post-sign-up intake — gates tests and session booking until complete. */
  profile?: PortalProfile
}

/** The member profile filled in after sign-up (on the Account page). Tests and
 *  session booking stay locked until the REQUIRED set is complete — the
 *  counsellor match, the norm tables (age/gender) and the report all depend on
 *  it. Subjective answers are handed to the counsellor and the report verbatim. */
export interface PortalProfile {
  fullName?: string
  age?: number
  gender?: "male" | "female" | "other"
  /** City / town — counsellor context + market framing. */
  location?: string
  phone?: string
  email?: string
  linkedin?: string
  /** Where they are on their track — class for students, experience band for
   *  professionals (see PROFILE_STAGES). */
  stage?: string
  /** In their own words — the decision they're trying to make. REQUIRED. */
  qDecision?: string
  /** What prompted this now / where they feel stuck. */
  qContext?: string
  /** What people around them say they're good at. */
  qStrengths?: string
  /** Constraints that matter (city, family, finances, timelines). */
  qConstraints?: string
  /** What a great outcome looks like three years from now. REQUIRED. */
  qSuccess?: string
  /** Stamped the first time the required set is complete. */
  completedAt?: string
}

export const PROFILE_STAGES: Record<PortalTrack, { v: string; label: string }[]> = {
  student: [
    { v: "class8-9", label: "Class 8–9" },
    { v: "class10", label: "Class 10" },
    { v: "class11-12", label: "Class 11–12" },
    { v: "ug", label: "Undergraduate" },
    { v: "pg", label: "Postgraduate" },
  ],
  professional: [
    { v: "exp0-2", label: "0–2 years experience" },
    { v: "exp3-5", label: "3–5 years experience" },
    { v: "exp6-10", label: "6–10 years experience" },
    { v: "exp10plus", label: "10+ years experience" },
  ],
}

export interface Purchase {
  productId: string
  tierId?: string
  at: string
  /** Human label for the journey/history feed, e.g. "Growth plan", "+1 session". */
  label?: string
  /** What the purchase added to the balance (so the journey can show "+90 AI min"). */
  grants?: Partial<PortalCredits>
  /** Coarse bucket for grouping/iconography in the UI. */
  kind?: "plan" | "sessions" | "aiMinutes" | "credits" | "test" | "product"
  /** Razorpay payment id when the purchase came through checkout (dedupe key). */
  paymentId?: string
}

/** A small item the member saved to "my plan" — typically a career or next step
 *  the AI guide surfaced and the member chose to keep (the `save_to_plan` action). */
export interface PlanItem {
  id: string
  text: string
  at: string
}

/** An inline file/image attachment — kept small (data-URL) so it rides the thread
 *  with no separate storage. Large files would use a storage bucket later. */
export interface ChatAttachment {
  kind: "image" | "file"
  name: string
  mime: string
  size: number
  dataUrl: string
}
/** A tagged resource from the member's account (typed via @ or / in the composer):
 *  a booked session, a completed test, or a shared report. Rendered as a rich card. */
export interface ChatRef {
  kind: "session" | "test" | "report"
  refId: string
  title: string
  meta?: string
  href?: string
}

export interface PortalMessage {
  id: string
  /** `${clientId}::${counsellorId}` — the 1:1 thread. */
  threadId: string
  from: "client" | "counsellor"
  text: string
  ts: string
  /** Inline image/file attachments. */
  attachments?: ChatAttachment[]
  /** Tagged account resources (session/test/report) rendered as cards. */
  refs?: ChatRef[]
}

export type BookingMode = "video" | "voice" | "in_person"
export type BookingStatus = "requested" | "confirmed" | "completed" | "canceled"

/** A note taken during a call, stamped with the call-elapsed second it was started
 *  — so it lines up with the recording on post-session review. */
export interface SessionNote {
  ts: number // seconds into the call
  text: string
}

export interface PortalBooking {
  id: string
  clientId: string
  counsellorId: string
  topic: string
  at: string // ISO
  durationMin: number
  mode: BookingMode
  status: BookingStatus
  /** Actual minutes the call ran (join-gated), stamped when the call ends. */
  actualMin?: number
  /** Timestamped notes captured live in the call, kept for post-session review. */
  notes?: SessionNote[]
  /** Session transcript (attached when the recording is processed). */
  transcript?: string
  /** ISO time the call actually ended. */
  endedAt?: string
}

/** A live call invite — the counsellor "ringing" the client. localStorage-backed
 *  + cross-tab, so the client's portal surfaces an incoming-call ring in real time
 *  (same-origin/cross-tab; true cross-device ring rides LiveKit/the backend). */
export interface CallInvite {
  clientId: string
  counsellorId: string
  counsellorName: string
  mode: BookingMode
  topic: string
  /** The exact LiveKit room the counsellor opened — the client joins THIS room so
   *  both sides always meet (no per-side room-derivation drift). */
  room?: string
  status: "ringing" | "accepted" | "declined" | "ended"
  at: string
}

// ── persisted reactive store factory ─────────────────────────────────────────

type Listener = () => void

function makePersisted<T>(key: string, initial: T) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  }
  let value: T = read()
  const listeners = new Set<Listener>()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        value = read()
        emit()
      }
    })
  }

  return {
    get: (): T => value,
    set: (next: T) => {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* quota / private mode — keep the in-memory copy */
      }
      emit()
    },
    subscribe: (l: Listener) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}

function uid(prefix: string): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${r}`
}

const accountStore = makePersisted<PortalAccount | null>("smc.portal.account", null)

// ── 2026 credits migration ────────────────────────────────────────────────────
// Accounts persisted before the 2026 catalog have no careerCredits/voiceCredits.
// Default both to 0 and leave sessions/aiMinutes untouched, so the legacy AI-
// minutes balance keeps working (spendAI falls back to it).
function withCreditDefaults(a: PortalAccount | null): PortalAccount | null {
  if (!a) return a
  const c = (a.credits ?? {}) as Partial<PortalCredits>
  if (typeof c.careerCredits === "number" && typeof c.voiceCredits === "number") return a
  return {
    ...a,
    credits: {
      sessions: c.sessions ?? 0,
      aiMinutes: c.aiMinutes ?? 0,
      careerCredits: typeof c.careerCredits === "number" ? c.careerCredits : 0,
      voiceCredits: typeof c.voiceCredits === "number" ? c.voiceCredits : 0,
    },
  }
}
{
  const cur = accountStore.get()
  const migrated = withCreditDefaults(cur)
  if (migrated !== cur) accountStore.set(migrated)
}

/** Add a grant bundle onto a balance (missing fields treated as 0 both sides). */
function applyGrants(credits: PortalCredits, g: Partial<PortalCredits>): PortalCredits {
  return {
    sessions: (credits.sessions ?? 0) + (g.sessions ?? 0),
    aiMinutes: (credits.aiMinutes ?? 0) + (g.aiMinutes ?? 0),
    careerCredits: (credits.careerCredits ?? 0) + (g.careerCredits ?? 0),
    voiceCredits: (credits.voiceCredits ?? 0) + (g.voiceCredits ?? 0),
  }
}

/** What a 2026 offering grants on purchase (sessions + AI Career Copilot). */
function offeringGrants(o: Offering2026): Partial<PortalCredits> {
  const g: Partial<PortalCredits> = {}
  if (o.sessions) g.sessions = o.sessions
  if (o.careerCredits) g.careerCredits = o.careerCredits
  if (o.voiceCredits) g.voiceCredits = o.voiceCredits
  return g
}

/** Grants for a 2026 tier id — an offering OR a cc_/vc_ credit pack. */
function grantsForTier(tierId: string | undefined): Partial<PortalCredits> | undefined {
  if (!tierId) return undefined
  const off = offering2026ById(tierId)
  if (off) return offeringGrants(off)
  const pack = CREDIT_PACKS_2026.find((p) => p.id === tierId)
  if (pack) return pack.unit === "career" ? { careerCredits: pack.amount } : { voiceCredits: pack.amount }
  return undefined
}
const messagesStore = makePersisted<PortalMessage[]>("smc.portal.messages", [])
const bookingsStore = makePersisted<PortalBooking[]>("smc.portal.bookings", [])
const planStore = makePersisted<PlanItem[]>("smc.portal.plan", [])
// threadId → ISO timestamp the COUNSELLOR last opened it (for the inbox badge).
const seenStore = makePersisted<Record<string, string>>("smc.portal.seen", {})
// threadId → ISO timestamp the CLIENT last opened it (for the portal nav badge).
const clientSeenStore = makePersisted<Record<string, string>>("smc.portal.seen.client", {})

// ── account / auth ───────────────────────────────────────────────────────────

export function usePortalAccount(): PortalAccount | null {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get, accountStore.get)
}

export function getPortalAccount(): PortalAccount | null {
  return accountStore.get()
}

export interface SignUpInput {
  name: string
  email: string
  goal?: string
  counsellorId?: string | null
  /** Student vs working professional — chosen on the sign-up form. */
  track?: PortalTrack
  /** Adopt a seeded persona (mock client id) for the full live demo. */
  demoClientId?: string
}

export function signUp(input: SignUpInput): PortalAccount {
  const account: PortalAccount = {
    clientId: input.demoClientId ?? uid("cl_portal"),
    name: input.name.trim() || "New member",
    email: input.email.trim(),
    counsellorId: input.counsellorId ?? null,
    plan: "free",
    credits: { ...PLANS.free.grants },
    createdAt: new Date().toISOString(),
    goal: input.goal?.trim() || undefined,
    track: input.track,
    demo: Boolean(input.demoClientId),
    // seed the intake with what sign-up already knows — the profile page asks
    // for the rest (and for phone, the channel they DIDN'T sign up with)
    profile: { fullName: input.name.trim() || undefined, email: input.email.trim() || undefined },
  }
  accountStore.set(account)
  emitIdentityChange() // re-scope cloud stores to this client
  return account
}

/** Sign in a LIVE client — keyed on their numeric SetMyCareer user id (so every
 *  per-user live read works). Not a demo persona. The counsellor + plan come from
 *  their real data once the screens load it. */
export function adoptLiveAccount(input: { userId: number; name?: string; email?: string; mobile?: string; counsellorId?: string | null }): PortalAccount {
  const account: PortalAccount = {
    clientId: String(input.userId),
    name: input.name?.trim() || "Member",
    email: input.email?.trim() || "",
    counsellorId: input.counsellorId ?? null,
    plan: "free",
    credits: { ...PLANS.free.grants },
    createdAt: new Date().toISOString(),
    demo: false,
    ...(input.mobile ? { phone: input.mobile } : {}),
    // the sign-in channel autofills the profile; the intake asks for the other one
    profile: {
      fullName: input.name?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.mobile || undefined,
    },
  }
  // a RETURNING member's filled profile/track must survive re-login — merge over
  // the fresh shell (last-signed-out copy included, for cleared localStorage tabs)
  const prior = accountStore.get()?.clientId === account.clientId ? accountStore.get() : (() => {
    try {
      const r = localStorage.getItem("smc.portal.account.last")
      const p = r ? (JSON.parse(r) as PortalAccount) : null
      return p?.clientId === account.clientId ? p : null
    } catch { return null }
  })()
  if (prior) {
    account.track = prior.track ?? account.track
    account.phone = prior.phone ?? account.phone
    account.profile = { ...account.profile, ...(prior.profile ?? {}) }
  }
  accountStore.set(account)
  try { localStorage.setItem("smc.portal.account.last", JSON.stringify(account)) } catch { /* ignore */ }
  emitIdentityChange() // re-scope cloud stores to this client
  return account
}

export function chooseCounsellor(counsellorId: string): void {
  const a = accountStore.get()
  if (!a) return
  accountStore.set({ ...a, counsellorId })
}

export function updateAccount(patch: Partial<PortalAccount>): void {
  const a = accountStore.get()
  if (!a) return
  accountStore.set({ ...a, ...patch })
}

// ── profile intake (gates tests + sessions until complete) ───────────────────

/** The gate's checklist, in the order the profile page asks them. `done` is
 *  computed against the CURRENT account so the Home nudge, the Account page and
 *  the runners all agree on one truth. */
export function profileRequirements(a: PortalAccount): { key: string; label: string; done: boolean }[] {
  const p = a.profile ?? {}
  const has = (s: string | undefined) => !!s && s.trim().length > 0
  return [
    { key: "fullName", label: "Full name", done: has(p.fullName ?? a.name) },
    { key: "age", label: "Age", done: typeof p.age === "number" && p.age >= 8 && p.age <= 80 },
    { key: "gender", label: "Gender", done: !!p.gender },
    { key: "location", label: "City", done: has(p.location) },
    { key: "track", label: "Student or professional", done: !!a.track },
    { key: "stage", label: "Where you are on that path", done: has(p.stage) },
    { key: "email", label: "Email", done: has(p.email ?? a.email) },
    { key: "phone", label: "Phone", done: has(p.phone ?? a.phone) },
    { key: "qDecision", label: "The decision you're making", done: has(p.qDecision) },
    { key: "qSuccess", label: "What success looks like", done: has(p.qSuccess) },
  ]
}

export function profileCompleteness(a: PortalAccount): number {
  const reqs = profileRequirements(a)
  return Math.round((reqs.filter((r) => r.done).length / reqs.length) * 100)
}

export function profileComplete(a: PortalAccount | null | undefined): boolean {
  return !!a && profileRequirements(a).every((r) => r.done)
}

/** Merge a profile patch (and optional track change), stamping completedAt the
 *  first time the required set is fully answered. Name/email/phone mirror onto
 *  the account so the rest of the portal (greetings, receipts) stays in sync. */
export function updateProfile(patch: Partial<PortalProfile>, track?: PortalTrack): void {
  const a = accountStore.get()
  if (!a) return
  const profile: PortalProfile = { ...(a.profile ?? {}), ...patch }
  const next: PortalAccount = {
    ...a,
    ...(track ? { track } : {}),
    profile,
    ...(profile.fullName?.trim() ? { name: profile.fullName.trim() } : {}),
    ...(profile.email?.trim() ? { email: profile.email.trim() } : {}),
    ...(profile.phone?.trim() ? { phone: profile.phone.trim() } : {}),
  }
  if (!profile.completedAt && profileComplete(next)) {
    profile.completedAt = new Date().toISOString()
  }
  accountStore.set({ ...next, profile })
}

export function signOut(): void {
  const a = accountStore.get()
  if (a) { try { localStorage.setItem("smc.portal.account.last", JSON.stringify(a)) } catch { /* ignore */ } }
  accountStore.set(null)
  emitIdentityChange() // logged out → cloud stores fall back to local-only
}

/** The email of the last signed-in account (for the "Existing user" prompt). */
export function lastAccountEmail(): string | undefined {
  try {
    const r = localStorage.getItem("smc.portal.account.last")
    return r ? (JSON.parse(r) as PortalAccount).email : undefined
  } catch { return undefined }
}

/** Restore the last account (returning user). Returns false if none cached. */
export function restoreLastAccount(): boolean {
  try {
    const r = localStorage.getItem("smc.portal.account.last")
    if (!r) return false
    accountStore.set(withCreditDefaults(JSON.parse(r) as PortalAccount))
    emitIdentityChange() // re-scope cloud stores to the restored client
    return true
  } catch { return false }
}

// ── product purchases (demo unlock, Razorpay-ready) ──────────────────────────

/** Record a product (and optional tier) purchase on the account. 2026-catalog
 *  ids (sj_/pro_/mk_/lt_/cc_/vc_) automatically grant their sessions +
 *  Career/Voice Credits; legacy products record as before. Call this only after
 *  payAndUnlock verifies (or for free products). */
export function buyProduct(productId: string, tierId?: string, meta?: { label?: string; grants?: Partial<PortalCredits>; kind?: Purchase["kind"]; paymentId?: string }): void {
  const a = accountStore.get()
  if (!a) return
  const catalogGrants = grantsForTier(tierId) ?? grantsForTier(productId)
  const grants = catalogGrants ?? meta?.grants
  const purchase: Purchase = {
    productId, tierId, at: new Date().toISOString(), kind: "product", ...meta,
    ...(grants && Object.keys(grants).length ? { grants } : {}),
  }
  accountStore.set({
    ...a,
    purchases: [...(a.purchases ?? []), purchase],
    credits: catalogGrants ? applyGrants(a.credits, catalogGrants) : a.credits,
  })
  schedulePushWallet()
}

/** Append a purchase to the account history (the journey/add-ons feed reads this).
 *  Used by the plan/credit/test buy paths so every spend leaves a visible trace. */
function recordPurchase(a: PortalAccount, p: Omit<Purchase, "at">): PortalAccount {
  const purchase: Purchase = { ...p, at: new Date().toISOString() }
  return { ...a, purchases: [...(a.purchases ?? []), purchase] }
}

export function usePurchases(): Purchase[] {
  const a = usePortalAccount()
  return a?.purchases ?? []
}

export function hasPurchased(productId: string): boolean {
  return (accountStore.get()?.purchases ?? []).some((p) => p.productId === productId)
}

export function setOnboarded(v = true): void {
  const a = accountStore.get()
  if (!a) return
  accountStore.set({ ...a, onboarded: v })
}

// ── account track (student vs professional) ──────────────────────────────────
// The explicit sign-up choice wins; live accounts (no sign-up form) fall back to
// the purchase-derived hint — owning any pro_ tier or Autobiography reads as a
// professional. Everything audience-shaped (catalogue, terminal, home sell rail)
// reads through here so the rule lives in ONE place.
const EXEC_PURCHASE_HINT = /^(pro_|lt_autobiography)/

export function accountTrack(a: PortalAccount | null | undefined): PortalTrack {
  if (a?.track) return a.track
  const purchases = a?.purchases ?? []
  return purchases.some((p) => EXEC_PURCHASE_HINT.test(p.tierId ?? "") || EXEC_PURCHASE_HINT.test(p.productId))
    ? "professional"
    : "student"
}

/** Reactive per-account track — the sign-up choice, else the purchase hint. */
export function useTrack(): PortalTrack {
  const a = usePortalAccount()
  return accountTrack(a)
}

/** Flip the account's track (the catalogue/terminal offer a small switch). */
export function setAccountTrack(track: PortalTrack): void {
  const a = accountStore.get()
  if (!a) return
  accountStore.set({ ...a, track })
}

// ── billing / credits ────────────────────────────────────────────────────────

export function buyPlan(planId: PortalPlanId): void {
  const a = accountStore.get()
  if (!a) return
  const plan = PLANS[planId]
  // Packages TOP-UP the balance; subscriptions refresh the monthly grant
  // (purchased 2026 Career/Voice Credits are top-ups and always survive).
  const credits: PortalCredits =
    plan.kind === "subscription"
      ? {
          ...plan.grants,
          careerCredits: a.credits.careerCredits ?? 0,
          voiceCredits: a.credits.voiceCredits ?? 0,
        }
      : applyGrants(a.credits, plan.grants)
  const next = recordPurchase(a, {
    productId: `plan_${planId}`,
    kind: "plan",
    label: `${plan.name} plan`,
    grants: { ...plan.grants },
  })
  accountStore.set({ ...next, plan: planId, credits })
  schedulePushWallet()
}

const CREDIT_KIND_META: Record<keyof PortalCredits, { label: (n: number) => string; productId: string; kind: Purchase["kind"] }> = {
  sessions: { label: (n) => `+${n} session${n === 1 ? "" : "s"}`, productId: "session_pack", kind: "sessions" },
  aiMinutes: { label: (n) => `+${n} AI minutes`, productId: "ai_credits", kind: "aiMinutes" },
  careerCredits: { label: (n) => `+${n} Career Credits`, productId: "career_credits", kind: "credits" },
  voiceCredits: { label: (n) => `+${n} Voice Credits`, productId: "voice_credits", kind: "credits" },
}

export function buyCredits(kind: keyof PortalCredits, amount: number): void {
  const a = accountStore.get()
  if (!a) return
  const m = CREDIT_KIND_META[kind]
  const grants: Partial<PortalCredits> = {}
  grants[kind] = amount
  const next = recordPurchase(a, { productId: m.productId, kind: m.kind, label: m.label(amount), grants })
  accountStore.set({ ...next, credits: applyGrants(next.credits, grants) })
  schedulePushWallet()
}

/** Buy a 2026 credit top-up pack (cc_ / vc_ ids) — grants its Career/Voice
 *  Credits. Call only after payAndUnlock verifies the charge. */
export function buyCreditPack(packId: string): void {
  const pack = CREDIT_PACKS_2026.find((p) => p.id === packId)
  const a = accountStore.get()
  if (!pack || !a) return
  const grants: Partial<PortalCredits> =
    pack.unit === "career" ? { careerCredits: pack.amount } : { voiceCredits: pack.amount }
  const next = recordPurchase(a, { productId: pack.id, kind: "credits", label: pack.name, grants })
  accountStore.set({ ...next, credits: applyGrants(next.credits, grants) })
  schedulePushWallet()
}

/** Spend a credit; returns false (and changes nothing) when the balance is short. */
export function spendCredit(kind: keyof PortalCredits, amount = 1): boolean {
  const a = accountStore.get()
  if (!a || (a.credits[kind] ?? 0) < amount) return false
  const credits = { ...a.credits }
  credits[kind] = (credits[kind] ?? 0) - amount
  accountStore.set({ ...a, credits })
  schedulePushWallet()
  return true
}

/** The spendable AI balance for a mode: the 2026 credit pool (Career Credits for
 *  chat, Voice Credits for voice) plus the legacy aiMinutes fallback. */
export function aiBalance(credits: PortalCredits | undefined, kind: "chat" | "voice"): number {
  if (!credits) return 0
  const primary = kind === "chat" ? credits.careerCredits ?? 0 : credits.voiceCredits ?? 0
  return primary + (credits.aiMinutes ?? 0)
}

/** Spend an AI allowance: Career Credits for chat, Voice Credits for voice,
 *  falling back to the legacy aiMinutes balance so pre-2026 accounts keep
 *  working. Returns false (spending nothing) when both pools are empty; when
 *  the pools cover only part of `n` (end-of-voice-session settle) they are
 *  drained and this still returns true. */
export function spendAI(kind: "chat" | "voice", n = 1): boolean {
  const a = accountStore.get()
  if (!a || n <= 0) return !!a
  const primaryKey = kind === "chat" ? ("careerCredits" as const) : ("voiceCredits" as const)
  const primary = a.credits[primaryKey] ?? 0
  const legacy = a.credits.aiMinutes ?? 0
  if (primary + legacy <= 0) return false
  const fromPrimary = Math.min(primary, n)
  const fromLegacy = Math.min(legacy, n - fromPrimary)
  const credits = { ...a.credits, aiMinutes: legacy - fromLegacy }
  credits[primaryKey] = primary - fromPrimary
  accountStore.set({ ...a, credits })
  schedulePushWallet()
  return true
}

// ── 2026 cloud wallet + server-recorded purchases ─────────────────────────────
// Credits + purchase history mirror to the cloud store under "portal.wallet"
// (last-writer-wins), so balances survive re-login and follow the member across
// devices. Purchases completed OUTSIDE the portal (the marketing site checks out
// against api/razorpay, whose verify writes "purchases:<clientId>") are consumed
// here EXACTLY once: the record is rewritten consumed:true on the server BEFORE
// any grant is applied, so retries and second devices can never re-grant.

const WALLET_KEY = "portal.wallet"
interface WalletDoc { credits: PortalCredits; purchases: Purchase[]; plan?: PortalPlanId; updatedAt: string }

/** One server-recorded purchase row (written by api/razorpay verify). */
export interface ServerPurchaseRecord {
  tierId?: string | null
  paymentId?: string
  orderId?: string
  amount?: number | null
  at?: string
  consumed?: boolean
  consumedAt?: string
}

let walletTimer: ReturnType<typeof setTimeout> | null = null
/** Debounced push of the balance + history to the cloud (best-effort). */
function schedulePushWallet(): void {
  if (typeof window === "undefined") return
  if (walletTimer) clearTimeout(walletTimer)
  walletTimer = setTimeout(() => {
    walletTimer = null
    const cur = accountStore.get()
    if (!cur) return
    const stamp = new Date().toISOString()
    const next = { ...cur, walletAt: stamp }
    accountStore.set(next)
    const doc: WalletDoc = { credits: next.credits, purchases: next.purchases ?? [], plan: next.plan, updatedAt: stamp }
    void cloudStateSetFor("client", String(next.clientId), WALLET_KEY, doc)
  }, 600)
}

let cloudSyncBusy = false
/** Boot-time (and periodic) pass: adopt the newer cloud wallet, then consume any
 *  unconsumed server-recorded 2026 purchases. Defensive: malformed records and
 *  unknown tier ids are skipped, and nothing is granted unless the consumed
 *  flags were successfully written back first. */
export async function syncWalletAndPurchases(clientId: string): Promise<void> {
  if (!clientId || cloudSyncBusy) return
  cloudSyncBusy = true
  try {
    const all = await cloudStateGetAllFor("client", String(clientId))
    if (!all) return

    // 1) wallet — last-writer-wins between this device and the cloud copy
    let a = accountStore.get()
    if (!a || String(a.clientId) !== String(clientId)) return
    const w = all[WALLET_KEY] as WalletDoc | undefined
    if (
      w && typeof w === "object" && w.credits && typeof w.credits === "object" &&
      typeof w.updatedAt === "string" && w.updatedAt > (a.walletAt ?? "")
    ) {
      a = {
        ...a,
        credits: applyGrants(w.credits as PortalCredits, {}), // normalises missing fields to 0
        purchases: Array.isArray(w.purchases) ? w.purchases : a.purchases,
        walletAt: w.updatedAt,
        ...(w.plan && PLANS[w.plan] ? { plan: w.plan } : {}),
      }
      accountStore.set(a)
    }

    // 2) server-recorded purchases → grant once, then never again
    const raw = all[`purchases:${clientId}`]
    if (!Array.isArray(raw) || raw.length === 0) return
    const records = raw as ServerPurchaseRecord[]
    const owned = new Set((a.purchases ?? []).map((p) => p.paymentId).filter(Boolean))
    const pending = records.filter((r) =>
      !!r && typeof r === "object" && !r.consumed &&
      typeof r.tierId === "string" && !!grantsForTier(r.tierId) &&
      !(r.paymentId && owned.has(r.paymentId)),
    )
    if (!pending.length) return

    // mark consumed on the SERVER first — if this write fails we grant nothing
    // and simply retry on the next pass; if it succeeds a re-run sees
    // consumed:true (and the paymentId in history) and skips.
    const stamp = new Date().toISOString()
    const rewritten = records.map((r) => (pending.includes(r) ? { ...r, consumed: true, consumedAt: stamp } : r))
    const ok = await cloudStateSetFor("client", String(clientId), `purchases:${clientId}`, rewritten)
    if (!ok) return

    let account = accountStore.get()
    if (!account || String(account.clientId) !== String(clientId)) return
    for (const r of pending) {
      const tierId = typeof r.tierId === "string" ? r.tierId : undefined
      const grants = grantsForTier(tierId)
      if (!grants) continue
      const off = offering2026ById(tierId)
      const pack = CREDIT_PACKS_2026.find((p) => p.id === tierId)
      const name = off?.name ?? pack?.name ?? tierId ?? "purchase"
      const purchase: Purchase = {
        productId: tierId ?? "purchase",
        tierId,
        at: typeof r.at === "string" && r.at ? r.at : stamp,
        label: `Purchased ${name}`,
        grants,
        kind: pack ? "credits" : "product",
        ...(r.paymentId ? { paymentId: r.paymentId } : {}),
      }
      account = {
        ...account,
        credits: applyGrants(account.credits, grants),
        purchases: [...(account.purchases ?? []), purchase],
      }
    }
    accountStore.set(account)
    schedulePushWallet()
  } catch {
    /* best-effort — retry on the next pass */
  } finally {
    cloudSyncBusy = false
  }
}

/** Portal boot hook: hydrates the cloud wallet and consumes server purchases,
 *  then polls so a marketing-site purchase made while the portal is open lands
 *  live. Mount once (PortalGuard). */
export function usePortalCloudSync(clientId: string | undefined): void {
  useEffect(() => {
    if (!clientId) return
    void syncWalletAndPurchases(clientId)
    const t = setInterval(() => void syncWalletAndPurchases(clientId), 30000)
    return () => clearInterval(t)
  }, [clientId])
}

// ── messaging (live counsellor↔client) ───────────────────────────────────────

const threadId = (clientId: string, counsellorId: string) => `${clientId}::${counsellorId}`

/** All messages in a 1:1 thread, oldest-first. Reactive across tabs. */
// ── shared (server) message sync — keyed by client id so client + counsellor
//    read/write the SAME thread across devices and accounts. ──────────────────
const SHARED_MSG_KEY = "shared.messages"

async function hydrateThread(clientId: string): Promise<void> {
  if (!clientId) return
  const all = await cloudStateGetAllFor("client", String(clientId))
  const remote = Array.isArray(all?.[SHARED_MSG_KEY]) ? (all![SHARED_MSG_KEY] as PortalMessage[]) : []
  if (!remote.length) return
  const local = messagesStore.get()
  const have = new Set(local.map((m) => m.id))
  const fresh = remote.filter((m) => m && m.id && !have.has(m.id))
  if (fresh.length) messagesStore.set([...local, ...fresh])
}
async function pushClientThread(clientId: string): Promise<void> {
  if (!clientId) return
  const thread = messagesStore.get().filter((m) => m.threadId.startsWith(String(clientId) + "::"))
  await cloudStateSetFor("client", String(clientId), SHARED_MSG_KEY, thread)
}

/** Populate the counsellor inbox from the server: pull the shared threads for a
 *  batch of clients (cap to keep it cheap — the recent caseload, not all 1,800).
 *  Runs ~6 at a time so a large list doesn't stampede the API. */
export async function hydrateInbox(clientIds: string[], limit = 30): Promise<void> {
  const ids = [...new Set(clientIds.filter(Boolean).map(String))].slice(0, limit)
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(ids.slice(i, i + 6).map((id) => hydrateThread(id)))
  }
}

export function useThread(clientId: string, counsellorId: string): PortalMessage[] {
  useSyncExternalStore(messagesStore.subscribe, messagesStore.get, messagesStore.get)
  // pull the server copy on open + poll, so both sides stay in sync live
  useEffect(() => {
    if (!clientId) return
    void hydrateThread(clientId)
    const t = setInterval(() => void hydrateThread(clientId), 5000)
    return () => clearInterval(t)
  }, [clientId])
  const id = threadId(clientId, counsellorId)
  return messagesStore.get().filter((m) => m.threadId === id)
}

/** Every thread that has at least one message — for the counsellor inbox. */
export function useAllThreads(): { threadId: string; clientId: string; counsellorId: string; last: PortalMessage }[] {
  useSyncExternalStore(messagesStore.subscribe, messagesStore.get, messagesStore.get)
  const byThread = new Map<string, PortalMessage>()
  for (const m of messagesStore.get()) {
    const prev = byThread.get(m.threadId)
    if (!prev || m.ts > prev.ts) byThread.set(m.threadId, m)
  }
  return [...byThread.values()]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .map((last) => {
      const [clientId, counsellorId] = last.threadId.split("::")
      return { threadId: last.threadId, clientId, counsellorId, last }
    })
}

export function sendMessage(
  clientId: string,
  counsellorId: string,
  from: PortalMessage["from"],
  text: string,
  extra?: { attachments?: ChatAttachment[]; refs?: ChatRef[] },
): void {
  const t = text.trim()
  const hasContent = !!t || !!extra?.attachments?.length || !!extra?.refs?.length
  if (!hasContent) return
  const msg: PortalMessage = {
    id: uid("msg"),
    threadId: threadId(clientId, counsellorId),
    from,
    text: t,
    ts: new Date().toISOString(),
    ...(extra?.attachments?.length ? { attachments: extra.attachments } : {}),
    ...(extra?.refs?.length ? { refs: extra.refs } : {}),
  }
  messagesStore.set([...messagesStore.get(), msg])
  void pushClientThread(clientId) // mirror to the shared server thread (cross-device)
}

// ── bookings (live session requests) ─────────────────────────────────────────

const SHARED_BK_KEY = "shared.bookings"
async function hydrateBookings(clientId: string): Promise<void> {
  if (!clientId) return
  const all = await cloudStateGetAllFor("client", String(clientId))
  const remote = Array.isArray(all?.[SHARED_BK_KEY]) ? (all![SHARED_BK_KEY] as PortalBooking[]) : []
  if (!remote.length) return
  const local = bookingsStore.get()
  const byId = new Map(local.map((b) => [b.id, b]))
  let changed = false
  for (const b of remote) if (b && b.id && JSON.stringify(byId.get(b.id)) !== JSON.stringify(b)) { byId.set(b.id, b); changed = true }
  if (changed) bookingsStore.set([...byId.values()])
}
async function pushClientBookings(clientId: string): Promise<void> {
  if (!clientId) return
  const mine = bookingsStore.get().filter((b) => b.clientId === String(clientId))
  await cloudStateSetFor("client", String(clientId), SHARED_BK_KEY, mine)
}

export function useBookings(clientId: string): PortalBooking[] {
  useSyncExternalStore(bookingsStore.subscribe, bookingsStore.get, bookingsStore.get)
  useEffect(() => {
    if (!clientId) return
    void hydrateBookings(clientId)
    const t = setInterval(() => void hydrateBookings(clientId), 6000)
    return () => clearInterval(t)
  }, [clientId])
  return bookingsStore
    .get()
    .filter((b) => b.clientId === clientId)
    .sort((a, b) => a.at.localeCompare(b.at))
}

/** Every booking across all clients — the admin sessions view. Reactive. */
export function useAllBookings(): PortalBooking[] {
  useSyncExternalStore(bookingsStore.subscribe, bookingsStore.get, bookingsStore.get)
  return [...bookingsStore.get()].sort((a, b) => a.at.localeCompare(b.at))
}

/** Admin/counsellor reschedule — moves a booking and returns it to "requested"
 *  so the other side re-confirms the new time. */
export function rescheduleBooking(id: string, at: string): void {
  bookingsStore.set(bookingsStore.get().map((b) => (b.id === id ? { ...b, at, status: "requested" as BookingStatus } : b)))
}

// ── portal-access revocation (admin control) ─────────────────────────────────
const REVOKED_KEY = "smc.portal.revoked"
export function revokedClientIds(): string[] {
  try { return JSON.parse(localStorage.getItem(REVOKED_KEY) ?? "[]") as string[] } catch { return [] }
}
export function isPortalRevoked(clientId: string | null | undefined): boolean {
  return !!clientId && revokedClientIds().includes(clientId)
}
export function setPortalRevoked(clientId: string, revoked: boolean): void {
  const list = new Set(revokedClientIds())
  if (revoked) list.add(clientId); else list.delete(clientId)
  try { localStorage.setItem(REVOKED_KEY, JSON.stringify([...list])) } catch { /* noop */ }
}

export function requestBooking(input: Omit<PortalBooking, "id" | "status">): PortalBooking {
  const booking: PortalBooking = { ...input, id: uid("bk"), status: "requested" }
  bookingsStore.set([...bookingsStore.get(), booking])
  void pushClientBookings(booking.clientId) // mirror to the shared server thread
  return booking
}

export function setBookingStatus(id: string, status: BookingStatus): void {
  bookingsStore.set(bookingsStore.get().map((b) => (b.id === id ? { ...b, status } : b)))
  const cid = bookingsStore.get().find((b) => b.id === id)?.clientId
  if (cid) void pushClientBookings(cid) // mirror the status change to the shared thread
}

export function cancelBooking(id: string): void {
  setBookingStatus(id, "canceled")
}

/** Mark a booking completed and stamp the actual call duration (minutes) plus the
 *  session recap (timestamped notes + transcript). Admin reads `durationMin`/
 *  `actualMin` for length; the client/counsellor read `notes`/`transcript` to
 *  review the session afterwards. */
export function completeBooking(
  id: string,
  actualMin: number,
  recap?: { notes?: SessionNote[]; transcript?: string },
): void {
  const endedAt = new Date().toISOString()
  bookingsStore.set(
    bookingsStore.get().map((b) =>
      b.id === id
        ? {
            ...b,
            status: "completed",
            actualMin,
            endedAt,
            notes: recap?.notes?.length ? recap.notes : b.notes,
            transcript: recap?.transcript ?? b.transcript,
          }
        : b,
    ),
  )
  // Mirror the completed session (duration + timestamped notes + transcript) to the
  // shared cloud thread — like requestBooking/setBookingStatus do — so the recap
  // follows the client to every device and the counsellor's copy stays in sync.
  const cid = bookingsStore.get().find((b) => b.id === id)?.clientId
  if (cid) void pushClientBookings(cid)
}

/** The booking that matches a live call for this client (the soonest non-finished
 *  one), so the call can read its planned length + stamp the actual duration. */
export function activeBookingFor(clientId: string): PortalBooking | undefined {
  return bookingsStore
    .get()
    .filter((b) => b.clientId === clientId && b.status !== "canceled" && b.status !== "completed")
    .sort((a, b) => a.at.localeCompare(b.at))[0]
}

// ── live call invite / ring (counsellor → client) ────────────────────────────
const callStore = makePersisted<Record<string, CallInvite>>("smc.portal.calls", {})

export function startCallInvite(input: Omit<CallInvite, "status" | "at">): void {
  const all = callStore.get()
  callStore.set({ ...all, [input.clientId]: { ...input, status: "ringing", at: new Date().toISOString() } })
}
export function setCallStatus(clientId: string, status: CallInvite["status"]): void {
  const all = callStore.get()
  const cur = all[clientId]
  if (!cur) return
  if (status === "ended" || status === "declined") { const next = { ...all }; delete next[clientId]; callStore.set(next); return }
  callStore.set({ ...all, [clientId]: { ...cur, status } })
}
/** The client's incoming call, if one is ringing/active for them. Reactive. */
export function useCallInvite(clientId: string | undefined): CallInvite | undefined {
  useSyncExternalStore(callStore.subscribe, callStore.get, callStore.get)
  return clientId ? callStore.get()[clientId] : undefined
}
export function getCallInvite(clientId: string): CallInvite | undefined {
  return callStore.get()[clientId]
}
/** The portal call route for a client. Honours an active invite's room so the
 *  client lands in the EXACT room the counsellor opened; falls back to the stable
 *  per-client room otherwise. Use this for every client-side "Join" action so the
 *  two sides never derive different rooms. */
export function portalCallHref(clientId: string): string {
  const room = callStore.get()[clientId]?.room || `smc-${clientId}`
  return `/portal/call/${clientId}?room=${encodeURIComponent(room)}`
}

// ── my plan (member-saved ideas / next steps) ────────────────────────────────

/** The member's saved plan items, newest-first. Reactive across tabs. */
export function usePlanItems(): PlanItem[] {
  useSyncExternalStore(planStore.subscribe, planStore.get, planStore.get)
  return [...planStore.get()].sort((a, b) => b.at.localeCompare(a.at))
}

/** Save an idea / next step to the member's plan. No-ops on empty text and
 *  de-dupes against the most recent identical entry. Returns the new item (or
 *  the existing duplicate). */
export function addPlanItem(text: string): PlanItem | undefined {
  const t = text.trim()
  if (!t) return undefined
  const existing = planStore.get().find((p) => p.text === t)
  if (existing) return existing
  const item: PlanItem = { id: uid("plan"), text: t, at: new Date().toISOString() }
  planStore.set([...planStore.get(), item])
  return item
}

export function removePlanItem(id: string): void {
  planStore.set(planStore.get().filter((p) => p.id !== id))
}

// ── the target career (What Next) ────────────────────────────────────────────
// The ONE career the member has committed to aiming at. It is the anchor for the
// gap analysis, and it is deliberately a single value — "check 1", per the brief.
// Stored per-client so switching accounts never inherits someone else's target.

const targetStore = makePersisted<Record<string, string>>("smc.portal.target", {})

/** The member's chosen target career id (a Career Terminal row id), if any. */
export function useTargetCareer(clientId: string | undefined): string | undefined {
  useSyncExternalStore(targetStore.subscribe, targetStore.get, targetStore.get)
  return clientId ? targetStore.get()[clientId] : undefined
}

export function getTargetCareer(clientId: string): string | undefined {
  return targetStore.get()[clientId]
}

/** Commit to a target career. Passing undefined clears it (re-open the choice). */
export function setTargetCareer(clientId: string, careerId: string | undefined): void {
  const all = { ...targetStore.get() }
  if (careerId) all[clientId] = careerId
  else delete all[clientId]
  targetStore.set(all)
}

// ── the gap self-assessment (What Next) ──────────────────────────────────────
// Six of the eight gap dimensions have NO per-career requirements table behind
// them — we cannot compute "what a Product Manager needs" from any data we hold.
// Rather than invent a requirement and score the member against it, the member
// tells us where they stand, and the counsellor verifies it in session. Keyed by
// client AND career, so changing target starts a clean sheet.

export type GapLevel = "have" | "partly" | "build"

const gapsStore = makePersisted<Record<string, Record<string, GapLevel>>>("smc.portal.gaps", {})
const gapKey = (clientId: string, careerId: string) => `${clientId}::${careerId}`

export function useCareerGaps(clientId: string, careerId: string | undefined): Record<string, GapLevel> {
  useSyncExternalStore(gapsStore.subscribe, gapsStore.get, gapsStore.get)
  if (!careerId) return {}
  return gapsStore.get()[gapKey(clientId, careerId)] ?? {}
}

export function setCareerGap(clientId: string, careerId: string, dimension: string, level: GapLevel): void {
  const all = gapsStore.get()
  const k = gapKey(clientId, careerId)
  gapsStore.set({ ...all, [k]: { ...(all[k] ?? {}), [dimension]: level } })
}

// ── unread tracking (counsellor inbox badge) ─────────────────────────────────

/** Mark a thread as read by the counsellor (stamps "now"). */
export function markThreadSeen(threadId: string): void {
  seenStore.set({ ...seenStore.get(), [threadId]: new Date().toISOString() })
}

/** Live count of client-sent messages a counsellor hasn't opened yet. */
export function useCounsellorUnread(counsellorId: string): number {
  useSyncExternalStore(messagesStore.subscribe, messagesStore.get, messagesStore.get)
  useSyncExternalStore(seenStore.subscribe, seenStore.get, seenStore.get)
  const seen = seenStore.get()
  return messagesStore.get().filter((m) => {
    if (m.from !== "client" || !m.threadId.endsWith(`::${counsellorId}`)) return false
    const lastSeen = seen[m.threadId]
    return !lastSeen || m.ts > lastSeen
  }).length
}

/** Mark a thread as read by the client (stamps "now"). */
export function markThreadSeenByClient(clientId: string, counsellorId: string): void {
  const id = threadId(clientId, counsellorId)
  clientSeenStore.set({ ...clientSeenStore.get(), [id]: new Date().toISOString() })
}

/** Live count of counsellor-sent messages the client hasn't opened yet. */
export function useClientUnread(clientId: string, counsellorId: string | null): number {
  useSyncExternalStore(messagesStore.subscribe, messagesStore.get, messagesStore.get)
  useSyncExternalStore(clientSeenStore.subscribe, clientSeenStore.get, clientSeenStore.get)
  if (!counsellorId) return 0
  const id = threadId(clientId, counsellorId)
  const lastSeen = clientSeenStore.get()[id]
  return messagesStore.get().filter(
    (m) => m.threadId === id && m.from === "counsellor" && (!lastSeen || m.ts > lastSeen),
  ).length
}
