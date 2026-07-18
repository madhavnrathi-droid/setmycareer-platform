// ── Shared account-state (admin ⇄ portal) ────────────────────────────────────
// The one piece of admin control the CLIENT app must also read: whether an
// account is active, paused (a polite, reversible hold) or archived (closed).
// Kept here in lib/ — not in the admin bundle — so the portal can gate on it
// without importing any admin-only data. localStorage + cross-tab `storage`
// events make it genuinely live: pause a client in the admin tab and their
// portal tab shows the hold within the same browser. The backend slots in behind
// these accessors later.

import { useSyncExternalStore } from "react"

export type AccountState = "active" | "paused" | "archived"
export interface AccountStateEntry { state: AccountState; reason?: string }

const KEY = "smc.account.state"
type Listener = () => void

function read(): Record<string, AccountStateEntry> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, AccountStateEntry>) : {}
  } catch {
    return {}
  }
}

let value = read()
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l())
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { value = read(); emit() }
  })
}
export const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l) } }
const snapshot = () => value

/** The raw map, by reference — used as a cache key by the company-store merge. */
export const getStateMap = () => value

function set(next: Record<string, AccountStateEntry>) {
  value = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota / private mode */ }
  emit()
}

export function getAccountState(clientId: string): AccountState {
  if (!clientId) return "active"
  return value[clientId]?.state ?? "active"
}
export function getAccountReason(clientId: string): string | undefined {
  return value[clientId]?.reason
}

/** Reactive — the portal gate and admin screens both subscribe to this. */
export function useAccountState(clientId: string): AccountStateEntry {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return (clientId && value[clientId]) || { state: "active" }
}

export function setAccountState(clientId: string, state: AccountState, reason?: string): void {
  if (!clientId) return
  const next = { ...value, [clientId]: { state, reason } }
  if (state === "active") delete next[clientId]
  set(next)
}
