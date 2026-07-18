// Company activity stream — the "what just happened" feed. A deterministic
// baseline (recent purchases, sign-ups, sessions, a refund, a coupon redemption)
// merged with a LIVE reactive store that admin actions append to (issue a refund,
// redeem/created coupon, add a client/counsellor). Rendered as a recent-activity
// strip on Clients and Counsellors. Cross-tab live via the storage event.

import { useSyncExternalStore } from "react"

export type AdminEventKind = "purchase" | "refund" | "coupon" | "signup" | "session" | "report" | "counsellor"

export interface AdminEvent {
  id: string
  at: string                 // ISO; admin actions stamp real time, baseline uses fixed recent stamps
  kind: AdminEventKind
  title: string
  detail?: string
  amount?: number            // INR (negative for refunds)
  clientId?: string
  counsellorId?: string
}

// ── live store (appended by admin actions) ───────────────────────────────────
const KEY = "smc.admin.events"
function load(): AdminEvent[] { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
let live: AdminEvent[] = load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === KEY) { live = load(); emit() } })

function uid() { return (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)) }

/** Append a live activity event (returns it). Admin actions call this. */
export function logEvent(e: Omit<AdminEvent, "id" | "at"> & { at?: string }): AdminEvent {
  const ev: AdminEvent = { id: `ev_${uid()}`, at: e.at ?? new Date().toISOString(), ...e }
  live = [ev, ...live].slice(0, 200)
  try { localStorage.setItem(KEY, JSON.stringify(live)) } catch { /* */ }
  emit()
  return ev
}

// ── deterministic baseline (fixed recent stamps around the demo "today") ─────
// No fabricated baseline — the activity feed shows only real events logged this session.
const BASELINE: AdminEvent[] = []

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
let cache: { live: AdminEvent[]; out: AdminEvent[] } | null = null
function snapshot(): AdminEvent[] {
  if (cache && cache.live === live) return cache.out
  const out = [...live, ...BASELINE].sort((a, b) => b.at.localeCompare(a.at))
  cache = { live, out }
  return out
}

/** All activity (live + baseline), newest first. Reactive. */
export function useActivity(filter?: { clientId?: string; counsellorId?: string }): AdminEvent[] {
  const all = useSyncExternalStore(subscribe, snapshot, snapshot)
  if (!filter) return all
  return all.filter((e) =>
    (!filter.clientId || e.clientId === filter.clientId) &&
    (!filter.counsellorId || e.counsellorId === filter.counsellorId))
}

export function relTime(iso: string): string {
  const now = new Date("2026-06-21T11:00:00").getTime() // demo anchor; swap for Date.now() with a live clock
  const diff = now - new Date(iso).getTime()
  const h = Math.round(diff / 3.6e6)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
