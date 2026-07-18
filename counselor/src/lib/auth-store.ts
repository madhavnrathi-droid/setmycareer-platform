// ─────────────────────────────────────────────────────────────────────────────
// Auth / identity bridge — the single source of "who is signed in", shared by the
// client portal, the counsellor console and the admin dashboard. The live API
// keys every per-user read on the NUMERIC UserData.id, so this store holds that
// id and is what every live query reads. localStorage-backed + cross-tab, same
// pattern as the other stores.
//
//   • Client: phone-OTP (SendOtp → LoginWithOtp) or email/password (LoginWithPassword).
//   • Admin: Login/AdminLogin { username, password } (array; success if length>0).
//   • No bearer token in the contract — UserData is returned directly; we persist id.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react"
import { adminLogin, navigatorLogin, sendOtp as apiSendOtp, resendOtp as apiResendOtp, loginWithOtp, loginWithPassword, userViewBy, getAllNavigators, type UserDetail, type FullNavigator } from "./smc-live-api"
import { emitIdentityChange } from "./cloud"

export type Role = "client" | "counsellor" | "admin"

export interface AuthSession {
  userId: number
  name?: string
  email?: string
  mobile?: string
  category?: string
  img?: string
  role: Role
  /** the raw profile, for screens that want more fields. */
  raw?: UserDetail
  at: string
}

// ── persisted reactive store ──────────────────────────────────────────────────
const KEY = "smc.auth.session"
type Listener = () => void
const listeners = new Set<Listener>()
let value: AuthSession | null = read()
function read(): AuthSession | null { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null } catch { return null } }
function write(next: AuthSession | null) { value = next; try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY) } catch { /* ignore */ } listeners.forEach((l) => l()); emitIdentityChange() }
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === KEY) { value = read(); listeners.forEach((l) => l()) } })

export function getSession(): AuthSession | null { return value }
export function useSession(): AuthSession | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => value, () => value)
}
export function signOut(): void { write(null) }

// ── helpers ───────────────────────────────────────────────────────────────────
function toSession(u: UserDetail, role: Role): AuthSession {
  return {
    userId: Number(u.id),
    name: u.name ?? undefined,
    email: u.email ?? undefined,
    mobile: u.mobile ?? undefined,
    category: u.category ?? undefined,
    img: u.img_url ?? undefined,
    role, raw: u, at: new Date().toISOString(),
  }
}
const isUser = (u: unknown): u is UserDetail => !!u && typeof u === "object" && "id" in (u as Record<string, unknown>) && Number((u as UserDetail).id) > 0

// ── client OTP flow ────────────────────────────────────────────────────────────
export interface OtpChannel { mobile?: string; email?: string }

export async function startOtp(ch: OtpChannel): Promise<{ ok: boolean; message?: string }> {
  const r = await apiSendOtp(ch)
  return { ok: r?.success !== false, message: r?.message }
}
export async function resendOtp(ch: OtpChannel): Promise<void> { await apiResendOtp(ch) }

/** Verify the OTP and sign the client in. Falls back to a UserView lookup if the
 *  OTP endpoint doesn't echo the full profile. */
export async function verifyOtp(otp: string, ch: OtpChannel): Promise<AuthSession> {
  let u = await loginWithOtp({ otp, ...ch }).catch(() => null)
  if (!isUser(u)) {
    const looked = await userViewBy(ch).catch(() => null)
    u = Array.isArray(looked) ? looked[0] : looked
  }
  if (!isUser(u)) throw new Error("Invalid or expired code. Please try again.")
  const s = toSession(u, "client")
  write(s)
  return s
}

/** Email/password client sign-in. */
export async function signInWithPassword(ch: { mobile?: string; email?: string; password: string }): Promise<AuthSession> {
  const r = await loginWithPassword(ch)
  const u = r?.data
  if (!isUser(u)) throw new Error(r?.message || "Wrong email or password.")
  const s = toSession(u, "client")
  write(s)
  return s
}

// ── admin sign-in ───────────────────────────────────────────────────────────────
export async function signInAdmin(username: string, password: string): Promise<AuthSession> {
  const arr = await adminLogin(username, password)
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("Invalid admin credentials.")
  const rec = arr[0] as Partial<UserDetail> & Record<string, unknown>
  write({
    userId: Number(rec.id ?? 0),
    name: (rec.name as string) ?? (rec.username as string) ?? "Admin",
    email: (rec.email as string) ?? username,
    role: "admin", raw: rec as UserDetail, at: new Date().toISOString(),
  })
  return value!
}

// ── counsellor sign-in ────────────────────────────────────────────────────────
/** Counsellor (navigator) sign-in. Navigators are created via AddNavigator with an
 *  email + password, so the SAME staff `AdminLogin` array authenticates them. We
 *  read the navigator id defensively off the returned record (id / navigator_id /
 *  naviId / naviID) and key the session on it, since every per-navigator live read
 *  (getClientsByNavi, getNavigatorDetail) wants that numeric id. */
export async function signInCounsellor(username: string, password: string): Promise<AuthSession> {
  const arr = await adminLogin(username, password)
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("Invalid credentials.")
  const rec = arr[0] as Record<string, unknown>
  const naviId = Number(rec.id ?? rec.navigator_id ?? rec.naviId ?? rec.naviID ?? 0)
  write({
    userId: naviId,
    name: (rec.name as string) ?? (rec.username as string) ?? "Counsellor",
    email: (rec.email as string) ?? username,
    role: "counsellor", raw: rec as UserDetail, at: new Date().toISOString(),
  })
  return value!
}

/** Adopt a session directly (e.g. counsellor flows or a verified profile). */
export function setSession(u: UserDetail, role: Role): AuthSession {
  const s = toSession(u, role)
  write(s)
  return s
}

// ── UNIVERSAL sign-in ───────────────────────────────────────────────────────────
const lc = (s?: unknown) => String(s ?? "").trim().toLowerCase()
const digits = (s?: unknown) => String(s ?? "").replace(/\D/g, "")
/** A navigator record is sign-in-able only when active. The backend's
 *  NavigatorLogin returns the record even for DISABLED navigators, so the app
 *  must gate on isActive (boolean or "true"/"false" string) itself. */
const naviActive = (rec: Record<string, unknown>) => {
  const a = rec.isActive
  return a !== false && lc(a) !== "false"
}

/** Match a login against the live navigator roster (by email or 10-digit mobile),
 *  so we can tell a counsellor apart from an admin or a client. */
async function findNavigator(email?: string | null, mobile?: string | null): Promise<FullNavigator | undefined> {
  const navs = await getAllNavigators().catch(() => [] as FullNavigator[])
  const e = lc(email), m = digits(mobile)
  return navs.find((n) => (e !== "" && lc(n.email) === e) || (m.length >= 10 && digits(n.mobile) === m))
}

function writeCounsellor(navi: FullNavigator, fallback?: { email?: string | null; mobile?: string | null; raw?: unknown }): AuthSession {
  write({
    userId: Number(navi.id),
    name: navi.name ?? "Counsellor",
    email: navi.email ?? fallback?.email ?? undefined,
    mobile: navi.mobile ?? fallback?.mobile ?? undefined,
    img: (navi.img as string) ?? (navi.displayimg as string) ?? undefined,
    role: "counsellor",
    raw: (fallback?.raw as UserDetail) ?? (navi as unknown as UserDetail),
    at: new Date().toISOString(),
  })
  return value!
}

/**
 * One sign-in for EVERY user. Tries the staff table (Login/AdminLogin) and then
 * the user table (User/LoginWithPassword), and decides the role from the live
 * data — a login whose email/mobile is in the navigator roster is a COUNSELLOR
 * (keyed on the navigator id), an admin record is ADMIN, anyone else is a CLIENT.
 * This way the same credentials work no matter which login screen they used, and
 * each person can be routed to their own dashboard.
 */
export async function authenticate(loginId: string, password: string): Promise<AuthSession> {
  const idStr = loginId.trim()
  if (!idStr || !password) throw new Error("Enter your email or mobile and your password.")
  const isEmail = idStr.includes("@")
  const ch: OtpChannel = isEmail ? { email: idStr } : { mobile: idStr }

  // build a clean counsellor session from a login record (enrich from the roster)
  const asCounsellor = async (rec: Record<string, unknown>): Promise<AuthSession> => {
    const navi = await findNavigator((rec.email as string) ?? (isEmail ? idStr : undefined), (rec.mobile as string) ?? (isEmail ? undefined : idStr))
    if (navi) return writeCounsellor(navi, { email: rec.email as string, mobile: rec.mobile as string, raw: rec })
    const naviId = Number(rec.id ?? rec.navigator_id ?? rec.naviId ?? rec.naviID ?? 0)
    write({
      userId: naviId, name: (rec.name as string) ?? (rec.username as string) ?? "Counsellor",
      email: (rec.email as string) ?? (isEmail ? idStr : undefined), mobile: rec.mobile as string,
      role: "counsellor", raw: rec as UserDetail, at: new Date().toISOString(),
    })
    return value!
  }

  // 1) admin staff table (Login/AdminLogin)
  const adminArr = await adminLogin(idStr, password).catch(() => [] as unknown[])
  if (Array.isArray(adminArr) && adminArr.length > 0) {
    const rec = adminArr[0] as Partial<UserDetail> & Record<string, unknown>
    // an admin record whose email is also a navigator is treated as a counsellor.
    const navi = await findNavigator((rec.email as string) ?? (isEmail ? idStr : undefined), (rec.mobile as string) ?? (isEmail ? undefined : idStr))
    if (navi) return writeCounsellor(navi, { email: rec.email as string, mobile: rec.mobile as string, raw: rec })
    write({
      userId: Number(rec.id ?? 0),
      name: (rec.name as string) ?? (rec.username as string) ?? "Admin",
      email: (rec.email as string) ?? (isEmail ? idStr : undefined),
      role: "admin", raw: rec as UserDetail, at: new Date().toISOString(),
    })
    return value!
  }

  // 2) counsellor (navigator) table — the dedicated Login/NavigatorLogin endpoint
  //    (keys on `email`; returns the record even when DISABLED, so gate on isActive)
  const naviArr = await navigatorLogin(idStr, password).catch(() => [] as unknown[])
  if (Array.isArray(naviArr) && naviArr.length > 0) {
    const rec = naviArr[0] as Record<string, unknown>
    if (!naviActive(rec)) throw new Error("This navigator account has been disabled. Please contact your SetMyCareer administrator.")
    return asCounsellor(rec)
  }

  // 3) user table — clients, and any navigator who authenticates as a user
  const r = await loginWithPassword({ ...ch, password }).catch(() => null)
  const u = r?.data
  if (isUser(u)) {
    const navi = await findNavigator(u.email, u.mobile)
    if (navi) return writeCounsellor(navi, { email: u.email, mobile: u.mobile, raw: u })
    const s = toSession(u, "client"); write(s); return s
  }

  throw new Error("Wrong email/mobile or password. Please check your details and try again.")
}
