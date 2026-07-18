// ─────────────────────────────────────────────────────────────────────────────
// Site auth store — REAL SetMyCareer accounts, the same identity the client
// portal uses (no separate marketing-site identity). Mirrors the counselor
// project's smc-live-api auth surface against the open-CORS production API:
//
//   · phone/email OTP:  User/SendOtp → User/LoginWithOtp   (sign in)
//                       User/SendOtpRegister → LoginWithOtp (create account)
//   · password:         User/LoginWithPassword
//
// The verified profile's NUMERIC id is the clientId the whole platform keys on
// (portal sessions, purchases, reports). We persist only {clientId, name,
// email, mobile} in localStorage — never passwords, never OTPs.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react"

const BASE = "https://api.setmycareer.com/api/"
const KEY = "smc.site.session"

export interface SiteSession {
  clientId: number
  name?: string
  email?: string
  mobile?: string
  at: string // ISO timestamp of sign-in
}

/** Either a mobile number or an email — exactly one, like the portal. */
export interface OtpChannel { mobile?: string; email?: string }

/** The live UserDetail shape (subset) the auth endpoints return. */
interface UserDetail {
  id: number
  name?: string | null
  email?: string | null
  mobile?: string | null
  [k: string]: unknown
}

// ── transport ─────────────────────────────────────────────────────────────────
async function post<T>(path: string, body: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error("We couldn't reach the server — check your connection and try again.")
  }
  if (!r.ok) throw new Error(`The server answered ${r.status} — please try again in a moment.`)
  return (await r.json().catch(() => ({}))) as T
}

// ── the store (module singleton + cross-tab sync) ─────────────────────────────
function read(): SiteSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SiteSession
    return Number(s?.clientId) > 0 ? { ...s, clientId: Number(s.clientId) } : null
  } catch { return null }
}

let session: SiteSession | null = read()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function write(s: SiteSession | null) {
  session = s
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY) } catch { /* private mode — session lives in memory */ }
  emit()
}

// another tab signed in/out — adopt its state
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === KEY) { session = read(); emit() } })
}

export function getSiteSession(): SiteSession | null { return session }
export function signOutSite(): void { write(null) }

/** Subscribe to the session — re-renders on sign-in/out, including other tabs. */
export function useSiteSession(): SiteSession | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => session,
    () => session,
  )
}

export const firstName = (s?: SiteSession | null) =>
  s?.name?.trim().split(/\s+/)[0] || s?.email?.split("@")[0] || "Account"

// ── helpers ───────────────────────────────────────────────────────────────────
const isUser = (u: unknown): u is UserDetail =>
  !!u && typeof u === "object" && "id" in (u as Record<string, unknown>) && Number((u as UserDetail).id) > 0

function adopt(u: UserDetail): SiteSession {
  const s: SiteSession = {
    clientId: Number(u.id),
    name: u.name ?? undefined,
    email: u.email ?? undefined,
    mobile: u.mobile ?? undefined,
    at: new Date().toISOString(),
  }
  write(s)
  return s
}

/** Normalise the raw "mobile or email" field into the API's channel shape. */
export const toChannel = (loginId: string): OtpChannel =>
  /@/.test(loginId) ? { email: loginId.trim() } : { mobile: loginId.replace(/\D/g, "") }

// ── OTP flows (mirror counselor/src/lib/auth-store.ts exactly) ────────────────
export async function sendOtp(ch: OtpChannel): Promise<{ ok: boolean; message?: string }> {
  const r = await post<{ success?: boolean; message?: string }>("User/SendOtp", ch)
  return { ok: r?.success !== false, message: r?.message }
}

/** Create-account OTP — the live registration door the portal uses. */
export async function register(ch: OtpChannel): Promise<{ ok: boolean; message?: string }> {
  const r = await post<{ success?: boolean; message?: string }>("User/SendOtpRegister", ch)
  return { ok: r?.success !== false, message: r?.message }
}

export async function resendOtp(ch: OtpChannel): Promise<void> {
  await post("User/ResendOtp", ch).catch(() => { /* best-effort */ })
}

/** Verify the OTP and sign in. Falls back to a UserView lookup when the OTP
 *  endpoint doesn't echo the full profile (same defence as the portal). */
export async function verifyOtp(otp: string, ch: OtpChannel): Promise<SiteSession> {
  let u = await post<UserDetail>("User/LoginWithOtp", { otp, ...ch }).catch(() => null)
  if (!isUser(u)) {
    const looked = await post<UserDetail | UserDetail[]>("UserView", ch).catch(() => null)
    u = Array.isArray(looked) ? looked[0] : looked
  }
  if (!isUser(u)) throw new Error("Invalid or expired code. Please try again.")
  return adopt(u)
}

/** Email (or mobile) + password sign-in. */
export async function emailLogin(loginId: string, password: string): Promise<SiteSession> {
  const r = await post<{ success?: boolean; message?: string; data?: UserDetail }>(
    "User/LoginWithPassword", { ...toChannel(loginId), password },
  )
  const u = r?.data
  if (!isUser(u)) throw new Error(r?.message || "Wrong email or password.")
  return adopt(u)
}
