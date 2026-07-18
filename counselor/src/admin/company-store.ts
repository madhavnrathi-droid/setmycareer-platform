// ── The company control store — the admin's LIVE writes ──────────────────────
// SetMyCareer runs three surfaces against one data model: the counsellor console,
// the client portal, and this admin dashboard. This module is where the admin's
// changes become real for the other two. Same localStorage + useSyncExternalStore
// pattern as the portal store, and crucially the same cross-surface effect:
//
//   • Pause a client here  → that client's PORTAL shows a polite "account paused"
//     gate (read via useClientState), live across tabs.
//   • Schedule a session here → it lands in the client's portal AND the counsellor
//     console through the SHARED bookings store (portal-store).
//   • Add / reassign a client here → it shows in the admin directory immediately,
//     and (for a portal-linked id) on the client side.
//
// Today this is browser-shared (genuinely live across open tabs via `storage`
// events). The FastAPI/Appwrite backend slots in behind these same accessors
// later without touching a screen.

import { useSyncExternalStore } from "react"
import { ADMIN_CLIENTS, COUNSELLORS, type JourneyStage } from "./admin-data"
import { requestBooking, setBookingStatus, type BookingMode } from "@/portal/portal-store"
import {
  getAccountState, setAccountState, useAccountState, getStateMap,
  subscribe as subscribeAccountState, type AccountState,
} from "@/lib/account-state"

export type { AccountState }

/** Per-client admin overrides (assignment / stage) layered on the seeded data.
 *  Account state (active/paused/archived) lives in the shared lib/account-state
 *  store so the portal can read it without importing admin data. */
export interface ClientOverride {
  counsellorId?: string
  stage?: JourneyStage
}

/** A client added by hand from the admin (no seeded profile behind it). */
export interface AddedClient {
  id: string
  name: string
  email: string
  phone?: string
  gender?: string
  age?: number
  headline?: string
  counsellorId: string
  stage: JourneyStage
  createdAt: string
}

/** The unified shape every admin screen renders — seeded or hand-added, with the
 *  live account state folded in. Decoupled from the full counsellor `Client` so a
 *  hand-added member needs only the fields a human actually fills in. */
export interface CompanyClient {
  id: string
  name: string
  initials: string
  headline: string
  stage: JourneyStage
  counsellorId: string
  careerIndex: number | null
  wellbeingIndex: number | null
  riskFlag: "none" | "low" | "moderate" | "high"
  sessionCount: number
  ltv: number
  lastActiveDays: number
  state: AccountState
  manual: boolean
  gender?: string
  email?: string
  phone?: string
  age?: number
  createdAt?: string
}

// ── persisted reactive store factory (mirrors portal-store) ──────────────────
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
      if (e.key === key) { value = read(); emit() }
    })
  }
  return {
    get: (): T => value,
    set: (next: T) => {
      value = next
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* quota / private mode */ }
      emit()
    },
    subscribe: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l) } },
  }
}

const overridesStore = makePersisted<Record<string, ClientOverride>>("smc.admin.client.overrides", {})
const addedStore = makePersisted<AddedClient[]>("smc.admin.clients.added", [])

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "—"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

function uid(prefix: string): string {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${r}`
}

// ── merge: seeded clients + hand-added, with overrides applied ───────────────
function buildCompany(overrides: Record<string, ClientOverride>, added: AddedClient[]): CompanyClient[] {
  const seeded: CompanyClient[] = ADMIN_CLIENTS.map((c) => {
    const o = overrides[c.id] ?? {}
    return {
      id: c.id,
      name: c.name,
      initials: c.initials,
      headline: c.headline,
      stage: o.stage ?? c.stage,
      counsellorId: o.counsellorId ?? c.counsellorId,
      careerIndex: c.careerIndex,
      wellbeingIndex: c.clinical.wellbeingIndex,
      riskFlag: c.riskFlag,
      sessionCount: c.sessionCount,
      ltv: c.ltv,
      lastActiveDays: c.lastActiveDays,
      state: getAccountState(c.id),
      manual: false,
    }
  })
  const manual: CompanyClient[] = added.map((a) => {
    const o = overrides[a.id] ?? {}
    return {
      id: a.id,
      name: a.name,
      initials: initialsOf(a.name),
      headline: a.headline || "New client · profile pending",
      stage: o.stage ?? a.stage,
      counsellorId: o.counsellorId ?? a.counsellorId,
      careerIndex: null,
      wellbeingIndex: null,
      riskFlag: "none",
      sessionCount: 0,
      ltv: 0,
      lastActiveDays: 0,
      state: getAccountState(a.id),
      manual: true,
      gender: a.gender,
      email: a.email,
      phone: a.phone,
      age: a.age,
      createdAt: a.createdAt,
    }
  })
  // newest hand-added first, then the seeded directory
  return [...manual, ...seeded]
}

// snapshot caching so useSyncExternalStore gets a stable reference between emits;
// keyed on all three inputs (overrides, hand-added, shared account-state).
let cache: { o: Record<string, ClientOverride>; a: AddedClient[]; s: object; out: CompanyClient[] } | null = null
function companySnapshot(): CompanyClient[] {
  const o = overridesStore.get(), a = addedStore.get(), s = getStateMap()
  if (cache && cache.o === o && cache.a === a && cache.s === s) return cache.out
  const out = buildCompany(o, a)
  cache = { o, a, s, out }
  return out
}
function subscribeBoth(l: Listener) {
  const u1 = overridesStore.subscribe(l)
  const u2 = addedStore.subscribe(l)
  const u3 = subscribeAccountState(l)
  return () => { u1(); u2(); u3() }
}

// ── reads ────────────────────────────────────────────────────────────────────
export function useCompanyClients(): CompanyClient[] {
  return useSyncExternalStore(subscribeBoth, companySnapshot, companySnapshot)
}
export function getCompanyClient(id: string): CompanyClient | undefined {
  return companySnapshot().find((c) => c.id === id)
}

/** The live account state for one client (re-exported for admin convenience;
 *  the portal reads useAccountState from lib/account-state directly). */
export function useClientState(clientId: string): AccountState {
  return useAccountState(clientId).state
}
export function getClientOverride(clientId: string): ClientOverride {
  return overridesStore.get()[clientId] ?? {}
}

// ── writes (admin controls) ──────────────────────────────────────────────────
function patchOverride(clientId: string, patch: Partial<ClientOverride>): void {
  const all = overridesStore.get()
  overridesStore.set({ ...all, [clientId]: { ...all[clientId], ...patch } })
}

/** Pause (polite, reversible block), archive (closed), or reactivate a client. */
export function setClientState(clientId: string, state: AccountState, reason?: string): void {
  setAccountState(clientId, state, state === "paused" ? reason : undefined)
}
export function assignCounsellor(clientId: string, counsellorId: string): void {
  patchOverride(clientId, { counsellorId })
}
export function setClientStage(clientId: string, stage: JourneyStage): void {
  patchOverride(clientId, { stage })
}

export interface AddClientInput {
  name: string
  email: string
  phone?: string
  gender?: string
  age?: number
  headline?: string
  counsellorId: string
  /** Optional first session to schedule on creation (writes to the live store). */
  firstSession?: { at: string; durationMin: number; mode: BookingMode; topic?: string }
}

/** Hand-add a client. Optionally books their first session (live on the client +
 *  counsellor sides through the shared bookings store). Returns the new id. */
export function addClient(input: AddClientInput): string {
  const id = uid("cl_admin")
  const client: AddedClient = {
    id,
    name: input.name.trim() || "New client",
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    gender: input.gender || undefined,
    age: input.age,
    headline: input.headline?.trim() || undefined,
    counsellorId: input.counsellorId,
    stage: "profile",
    createdAt: new Date().toISOString(),
  }
  addedStore.set([client, ...addedStore.get()])
  if (input.firstSession) {
    scheduleSession({
      clientId: id,
      counsellorId: input.counsellorId,
      topic: input.firstSession.topic || "Initial consultation",
      at: input.firstSession.at,
      durationMin: input.firstSession.durationMin,
      mode: input.firstSession.mode,
    })
  }
  return id
}

/** Remove a hand-added client outright; seeded clients can only be archived. */
export function removeClient(clientId: string): void {
  addedStore.set(addedStore.get().filter((c) => c.id !== clientId))
  const all = { ...overridesStore.get() }
  delete all[clientId]
  overridesStore.set(all)
}

/** Schedule (and auto-confirm) a session — lands in the client's portal + the
 *  counsellor console via the shared bookings store. */
export function scheduleSession(input: {
  clientId: string; counsellorId: string; topic: string; at: string; durationMin: number; mode: BookingMode
}): void {
  const b = requestBooking(input)
  setBookingStatus(b.id, "confirmed")
}

export const counsellorName = (id: string) => COUNSELLORS.find((c) => c.id === id)?.name ?? "Unassigned"

export const fmtState = (s: AccountState): string => (s === "paused" ? "Paused" : s === "archived" ? "Closed" : "Active")
