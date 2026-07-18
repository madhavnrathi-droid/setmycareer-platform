// Our OWN calendar — persistent events backed by the cloud store (Supabase via
// /api/cloud), scoped to the signed-in user, with a LiveKit room per event. This
// replaces the Zoho calendar so SetMyCareer runs scheduling + video entirely on
// LiveKit (no Zoho subscription). Local-first (works offline / in the demo) with
// write-through + hydrate to the cloud whenever a real account is signed in.

import { useSyncExternalStore } from "react"
import { identity, onIdentityChange, cloudStateGetAllFor, cloudStateSetFor } from "@/lib/cloud"
import type { Appointment } from "@/lib/types"

const KEY = "calendar-events"
const LS_BASE = "smc.calendar.events"

const lsKey = () => { const id = identity(); return id ? `${LS_BASE}::${id.app}:${id.userId}` : LS_BASE }
const readLocal = (): Appointment[] => {
  try { const r = localStorage.getItem(lsKey()); return r ? (JSON.parse(r) as Appointment[]) : [] } catch { return [] }
}

let events: Appointment[] = typeof window !== "undefined" ? readLocal() : []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function commit(next: Appointment[]): void {
  events = next
  try { localStorage.setItem(lsKey(), JSON.stringify(events)) } catch { /* quota / private mode */ }
  const id = identity()
  if (id) void cloudStateSetFor(id.app, id.userId, KEY, events) // best-effort cloud sync
  emit()
}

async function hydrate(): Promise<void> {
  // adopt the (new) identity's local copy immediately, then reconcile with cloud
  events = readLocal(); emit()
  const id = identity()
  if (!id) return
  const all = await cloudStateGetAllFor(id.app, id.userId).catch(() => null)
  const cloud = all?.[KEY]
  if (Array.isArray(cloud)) {
    events = cloud as Appointment[]
    try { localStorage.setItem(lsKey(), JSON.stringify(events)) } catch { /* ignore */ }
    emit()
  }
}

if (typeof window !== "undefined") {
  onIdentityChange(() => { void hydrate() }) // re-scope + re-hydrate on login/logout
  void hydrate()
}

/** Reactive list of the signed-in user's calendar events. */
export function useCalendarEvents(): Appointment[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => events, () => events)
}
export const getCalendarEvents = (): Appointment[] => events

export function addCalendarEvent(a: Appointment): void { commit([...events.filter((e) => e.id !== a.id), a]) }
export function updateCalendarEvent(id: string, patch: Partial<Appointment>): void {
  commit(events.map((e) => (e.id === id ? { ...e, ...patch } : e)))
}
export function removeCalendarEvent(id: string): void { commit(events.filter((e) => e.id !== id)) }
/** Seed events only if the calendar is currently empty (used to populate the demo). */
export function seedCalendarIfEmpty(seed: Appointment[]): void { if (events.length === 0 && seed.length) commit(seed) }

/** Deterministic LiveKit room id for a calendar event. */
export const calendarRoom = (id: string): string => `smc-cal-${id}`
