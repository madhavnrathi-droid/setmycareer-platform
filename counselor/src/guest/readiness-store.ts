// Readiness-link state — one localStorage document per share token.
// Mirrors guest-store.ts: local-only by design, a useSyncExternalStore hook,
// shallow-merge updates, whole-doc reset. Deliberately NO display-order
// shuffle — the readiness instruments read better grouped by factor, so items
// are presented in module (chapter) order and answers are stored in that same
// storage order (values 1–5, null = unanswered).

import { useSyncExternalStore } from "react"
import type { ReadinessTrack } from "./readiness"

export interface ReadinessDetails {
  // student link — a PARENT answers about the child
  parentName?: string
  childName?: string
  childAge?: number
  grade?: string // class
  // executive link
  name?: string
  age?: number
  role?: string // role level / organisation
  // shared
  city?: string
  email?: string
  phone?: string
}

export interface ReadinessAnswers {
  /** storage order = module item order; values 1–5; null = unanswered */
  ccri?: (number | null)[]
  cdra?: (number | null)[]
  eccri?: (number | null)[]
}

export interface ReadinessState {
  token: string
  track?: ReadinessTrack
  startedAt?: string
  details?: ReadinessDetails
  answers: ReadinessAnswers
  /** executive link: Part 1 (CDRA) finished */
  cdraDoneAt?: string
  /** executive link: the Part-2 hand-off screen acknowledged */
  part2AckAt?: string
  doneAt?: string
  theme?: "dark" | "light"
}

const KEY = (token: string) => `smc.readiness.${token}`
const listeners = new Set<() => void>()
let cache: { token: string; state: ReadinessState } | null = null

function read(token: string): ReadinessState {
  if (cache?.token === token) return cache.state
  let state: ReadinessState = { token, answers: {} }
  try {
    const raw = localStorage.getItem(KEY(token))
    if (raw) {
      const parsed = JSON.parse(raw) as ReadinessState
      state = { ...state, ...parsed, answers: parsed.answers ?? {}, token }
    }
  } catch { /* corrupted → start clean */ }
  cache = { token, state }
  return state
}

export function getReadiness(token: string): ReadinessState {
  return read(token)
}

export function updateReadiness(token: string, patch: Partial<ReadinessState>): ReadinessState {
  const cur = read(token)
  const next: ReadinessState = { ...cur, ...patch, answers: patch.answers ?? cur.answers, token }
  cache = { token, state: next }
  try { localStorage.setItem(KEY(token), JSON.stringify(next)) } catch { /* storage full — keep in-memory */ }
  listeners.forEach((l) => l())
  return next
}

/** Autosave helper — replaces ONE instrument's answer array, keeping the rest. */
export function patchReadinessAnswers(
  token: string,
  key: keyof ReadinessAnswers,
  a: (number | null)[],
  extra?: Partial<ReadinessState>,
): void {
  const cur = read(token)
  updateReadiness(token, { answers: { ...cur.answers, [key]: a }, ...(extra ?? {}) })
}

export function useReadiness(token: string): ReadinessState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => read(token),
    () => read(token),
  )
}

export type ReadinessStage = "welcome" | "details" | "ccri" | "cdra" | "handoff" | "eccri" | "report"

/** Where this sitting currently is. Track is passed explicitly because on a
 *  first visit it comes from the link's ?track= before it is persisted. */
export function readinessStage(s: ReadinessState, track: ReadinessTrack): ReadinessStage {
  if (!s.details) return s.startedAt ? "details" : "welcome"
  if (s.doneAt) return "report"
  if (track === "executive") {
    if (!s.cdraDoneAt) return "cdra"
    if (!s.part2AckAt) return "handoff"
    return "eccri"
  }
  return "ccri"
}

/** Wipe this token's session on THIS device (links are reusable; nothing is
 *  stored server-side, so this only clears the local copy). */
export function resetReadiness(token: string): void {
  try { localStorage.removeItem(KEY(token)) } catch { /* ignore */ }
  cache = { token, state: { token, answers: {} } }
  listeners.forEach((l) => l())
}
