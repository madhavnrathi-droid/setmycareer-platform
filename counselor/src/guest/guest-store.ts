// Guest assessment state — one localStorage document per share token.
// DELIBERATELY local-only: for the credibility-testing phase nothing is stored on
// any server. The taker downloads the finished report as a PDF and sends it back.

import { useSyncExternalStore } from "react"
import type { SectionKey } from "./ability-bank"

/** student = the timed cognitive Ability battery (age-normed, 12–19 focus);
 *  executive = the Leadership & Work-Style scale for working professionals.
 *  The choice ONLY changes the THIRD test — personality + interest are identical. */
export type GuestTrack = "student" | "executive"

export interface GuestDetails {
  name: string
  age: number
  gender: "male" | "female"
  track: GuestTrack
  grade: string // class / qualification (students) or role / organisation (executives)
  email?: string
  phone?: string
  city?: string
}

export type GuestTestId = "personality" | "interest" | "ability"
export const GUEST_TEST_ORDER: GuestTestId[] = ["personality", "interest", "ability"]

/** CCPA sitting — most/least picks are option letters A–D. */
export interface CompetencyProgress {
  sjt: ({ m: string; l: string } | null)[]
  fc: ({ m: string; l: string } | null)[]
  lik: (number | null)[]
}

export interface AbilityProgress {
  /** answers per section (option index | "R"/"S" | "S"/"D" | null) */
  answers: Partial<Record<SectionKey, (number | string | null)[]>>
  /** seconds remaining when the section was last open (resume support) */
  secondsLeft: Partial<Record<SectionKey, number>>
  /** sections already closed (time out or finished) */
  done: SectionKey[]
}

export interface GuestState {
  token: string
  details?: GuestDetails
  startedAt?: string
  /** likert answers, index-aligned (personality: 0-4 → engine 1-5 handled at scoring) */
  personality?: (number | null)[]
  personalityDoneAt?: string
  interest?: (number | null)[]
  /** per-item first-answer response times, ms, STORAGE order (reliability
   *  index only — never scored). Absent on attempts made before capture. */
  interestTimes?: (number | null)[]
  interestDoneAt?: string
  /** third test — STUDENT track: the timed ability battery */
  ability?: AbilityProgress
  abilityDoneAt?: string
  /** third test — EXECUTIVE track: the CCPA (Career Competency & Potential
   *  Assessment): 16 SJT most/least + 24 forced-choice most/least + 48 Likert */
  competency?: CompetencyProgress
  competencyDoneAt?: string
  /** the taker confirmed the answer-review screen — gate before report generation */
  reviewedAt?: string
  /** which per-test "well done" closure screens have been acknowledged */
  celebrated?: Partial<Record<"personality" | "interest" | "third", boolean>>
  /** cached AI consolidation so a reload doesn't re-spend the API call */
  aiSummary?: unknown
  theme?: "dark" | "light"
}

const KEY = (token: string) => `smc.guesttest.${token}`
const listeners = new Set<() => void>()
let cache: { token: string; state: GuestState } | null = null

function read(token: string): GuestState {
  if (cache?.token === token) return cache.state
  let state: GuestState = { token }
  try {
    const raw = localStorage.getItem(KEY(token))
    if (raw) state = { ...state, ...(JSON.parse(raw) as GuestState), token }
  } catch { /* corrupted → start clean */ }
  cache = { token, state }
  return state
}

export function getGuest(token: string): GuestState {
  return read(token)
}

export function updateGuest(token: string, patch: Partial<GuestState>): GuestState {
  const next = { ...read(token), ...patch, token }
  cache = { token, state: next }
  try { localStorage.setItem(KEY(token), JSON.stringify(next)) } catch { /* storage full — keep in-memory */ }
  listeners.forEach((l) => l())
  return next
}

export function useGuest(token: string): GuestState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => read(token),
    () => read(token),
  )
}

export type GuestStage = "welcome" | "details" | GuestTestId | "review" | "report"

/** Is the third (track-dependent) test finished? */
export function thirdDone(s: GuestState): boolean {
  return s.details?.track === "executive" ? !!s.competencyDoneAt : !!s.abilityDoneAt
}

/** Where the taker currently is in the battery. */
export function guestStage(s: GuestState): GuestStage {
  if (!s.details) return s.startedAt ? "details" : "welcome"
  if (!s.personalityDoneAt) return "personality"
  if (!s.interestDoneAt) return "interest"
  if (!thirdDone(s)) return "ability" // the third slot renders per track inside
  if (!s.reviewedAt) return "review" // answer preview before the report is built
  return "report"
}

/** A per-test "well done" closure is due when a test is finished but its
 *  encouraging screen hasn't been acknowledged yet. Ordered by completion so the
 *  right one shows at the right moment. */
export function pendingClosure(s: GuestState): "personality" | "interest" | "third" | null {
  const c = s.celebrated ?? {}
  if (s.personalityDoneAt && !c.personality) return "personality"
  if (s.interestDoneAt && !c.interest) return "interest"
  if (thirdDone(s) && !c.third) return "third"
  return null
}

/** Deterministic display order for a test's items — seeded by token+test so the
 *  SAME taker always sees the SAME order (stable across resume), but different
 *  people (and different tests) get different orders. Returns a permutation where
 *  perm[displayPosition] = originalIndex. Answers are stored back in ORIGINAL
 *  order, so the validated scoring engines are unaffected. */
export function itemOrder(seedStr: string, n: number): number[] {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  const perm = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  return perm
}

/** Wipe this token's session on THIS device so the next person starts fresh.
 *  (Links are reusable — every device keeps its own session; nothing is stored
 *  server-side, so this only clears the local copy.) */
export function resetGuest(token: string): void {
  try { localStorage.removeItem(KEY(token)) } catch { /* ignore */ }
  try { sessionStorage.removeItem(`smc.guestgate.${token}`) } catch { /* ignore */ }
  cache = { token, state: { token } }
  listeners.forEach((l) => l())
}

/** Share-token mint — crypto-random, URL-safe, unambiguous alphabet. */
export function mintToken(len = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789" // no 0/O/1/l/i
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (v) => alphabet[v % alphabet.length]).join("")
}
