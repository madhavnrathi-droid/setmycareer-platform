// ─────────────────────────────────────────────────────────────────────────────
// Cloud store — the browser client for SetMyCareer's app-native server storage.
//
// The browser holds NO database credential; it only POSTs to /api/cloud, which
// relays to Supabase with a server-only key. "Who am I" is resolved by reading
// the two session localStorage keys DIRECTLY (not by importing the stores), which
// keeps this module free of import cycles with auth-store / portal-store.
//
// Every record is scoped by (app, user_id) — so a counsellor, a client and an
// admin (and two different counsellors) never see each other's data. This is what
// fixes the cross-account chat/data leak: storage is keyed on the signed-in id,
// not the browser.
// ─────────────────────────────────────────────────────────────────────────────

export type AppName = "counsellor" | "client" | "admin"
export interface Identity { app: AppName; userId: string }

const AUTH_KEY = "smc.auth.session" // counsellor / admin (auth-store)
const PORTAL_KEY = "smc.portal.account" // client (portal-store)

/** Resolve the signed-in identity from the session stores, or null when nobody is. */
export function identity(): Identity | null {
  try {
    const a = JSON.parse(localStorage.getItem(AUTH_KEY) || "null")
    if (a && a.userId != null && (a.role === "counsellor" || a.role === "admin")) {
      return { app: a.role as AppName, userId: String(a.userId) }
    }
  } catch { /* ignore */ }
  try {
    const p = JSON.parse(localStorage.getItem(PORTAL_KEY) || "null")
    if (p && p.clientId) return { app: "client", userId: String(p.clientId) }
  } catch { /* ignore */ }
  return null
}

/** A stable string like "counsellor:2038" / "client:29232", or null when logged out. */
export function identityScope(id = identity()): string | null {
  return id ? `${id.app}:${id.userId}` : null
}

// ── identity-change pub/sub ────────────────────────────────────────────────────
// auth-store / portal-store call emitIdentityChange() on login + logout; we also
// react to cross-tab storage changes on the two identity keys. Cloud-backed stores
// subscribe so they re-scope + re-hydrate the instant the user switches.
const IDENTITY_EVENT = "smc:identity"
export function emitIdentityChange(): void {
  try { window.dispatchEvent(new Event(IDENTITY_EVENT)) } catch { /* ignore */ }
}
export function onIdentityChange(cb: () => void): () => void {
  const onEvt = () => cb()
  const onStorage = (e: StorageEvent) => { if (e.key === AUTH_KEY || e.key === PORTAL_KEY) cb() }
  window.addEventListener(IDENTITY_EVENT, onEvt)
  window.addEventListener("storage", onStorage)
  return () => { window.removeEventListener(IDENTITY_EVENT, onEvt); window.removeEventListener("storage", onStorage) }
}

// ── low-level transport ────────────────────────────────────────────────────────
let serverReachable = true // flips false if /api/cloud is unconfigured/unreachable → local-only
export const cloudReachable = () => serverReachable

async function call(body: Record<string, unknown>, scope?: Identity): Promise<Record<string, unknown> | null> {
  const id = scope ?? identity()
  if (!id) return null // not signed in (and no explicit scope) → caller stays local-only
  try {
    const r = await fetch("/api/cloud", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, app: id.app, userId: id.userId }),
    })
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null
    if (j && (j as { disabled?: boolean }).disabled) serverReachable = false
    return j
  } catch {
    serverReachable = false
    return null
  }
}

// ── per-user key/value state ───────────────────────────────────────────────────
export async function cloudStateGetAll(): Promise<Record<string, unknown> | null> {
  const j = await call({ kind: "state", op: "getAll" })
  return j && j.ok ? ((j.state as Record<string, unknown>) ?? {}) : null
}
export async function cloudStateSet(key: string, value: unknown): Promise<boolean> {
  const j = await call({ kind: "state", op: "set", key, value })
  return !!(j && j.ok)
}
export async function cloudStateRemove(key: string): Promise<boolean> {
  const j = await call({ kind: "state", op: "remove", key })
  return !!(j && j.ok)
}

// ── SHARED access: read/write a SPECIFIC user's scope (not the caller's) ─────────
// This is how a counsellor reads/writes a client's shared records (test results,
// message thread) — by passing the client's scope explicitly. It mirrors the
// current open-backend posture; real per-user authorization arrives with auth
// tokens (see docs/BACKEND_API_SPEC.md).
export async function cloudStateGetAllFor(app: AppName, userId: string): Promise<Record<string, unknown> | null> {
  const j = await call({ kind: "state", op: "getAll" }, { app, userId })
  return j && j.ok ? ((j.state as Record<string, unknown>) ?? {}) : null
}
export async function cloudStateSetFor(app: AppName, userId: string, key: string, value: unknown): Promise<boolean> {
  const j = await call({ kind: "state", op: "set", key, value }, { app, userId })
  return !!(j && j.ok)
}

// ── saved chats ────────────────────────────────────────────────────────────────
export interface CloudChatRow {
  id: string
  title: string
  messages: unknown
  created_at: string
  updated_at: string
}
export async function cloudChatsList(): Promise<CloudChatRow[] | null> {
  const j = await call({ kind: "chats", op: "list" })
  return j && j.ok ? ((j.chats as CloudChatRow[]) ?? []) : null
}
export async function cloudChatUpsert(chat: {
  id: string; title: string; messages: unknown; created_at?: string; updated_at?: string
}): Promise<boolean> {
  const j = await call({ kind: "chats", op: "upsert", chat })
  return !!(j && j.ok)
}
export async function cloudChatRemove(id: string): Promise<boolean> {
  const j = await call({ kind: "chats", op: "remove", id })
  return !!(j && j.ok)
}
export async function cloudChatsClear(): Promise<boolean> {
  const j = await call({ kind: "chats", op: "clear" })
  return !!(j && j.ok)
}
