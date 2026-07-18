// Persistence for taken tests + purchased premium tests. localStorage-backed and
// cross-tab live (storage events) like the rest of the portal, so a result the
// client saves is immediately visible to the report pipeline and the counsellor.

import { useSyncExternalStore } from "react"
import { getTest, scoreTest, type ScoredResult } from "./catalog"
import { pushClientTestResults } from "@/lib/shared-store"

export interface StoredTestResult {
  testId: string
  clientId: string
  takenAt: string // ISO
  answers: number[]
  scores: Record<string, number>
  overall: number
  /** qualitative reflection answers (scenario choice index / chosen label / free
   *  text), keyed by ReflectionItem id — never fed to scoring, only the report */
  reflections?: Record<string, string | number>
  /** which battery this third-test result came from (track-automatic) */
  variant?: "dbda" | "ccpa"
  /** the battery's rich outputs (DBDA grades/raw · CCPA method breakdown) — the
   *  test report renders these; `scores` stays the flat 0–100 view */
  payload?: unknown
}

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
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) { value = read(); listeners.forEach((l) => l()) }
    })
  }
  return {
    get: (): T => value,
    set: (next: T) => {
      value = next
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
      listeners.forEach((l) => l())
    },
    subscribe: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l) } },
  }
}

const resultsStore = makePersisted<StoredTestResult[]>("smc.portal.testresults", [])
const purchasedStore = makePersisted<Record<string, string[]>>("smc.portal.purchasedtests", {})

// ── results ──────────────────────────────────────────────────────────────────

export function useTestResults(clientId: string): StoredTestResult[] {
  useSyncExternalStore(resultsStore.subscribe, resultsStore.get, resultsStore.get)
  return resultsStore.get().filter((r) => r.clientId === clientId)
}

export function getTestResult(clientId: string, testId: string): StoredTestResult | undefined {
  return resultsStore.get().find((r) => r.clientId === clientId && r.testId === testId)
}

export function useTestResult(clientId: string, testId: string): StoredTestResult | undefined {
  useSyncExternalStore(resultsStore.subscribe, resultsStore.get, resultsStore.get)
  return getTestResult(clientId, testId)
}

/** Score and persist a completed test (replaces any prior result for it).
 *  `reflections` are qualitative and stored verbatim — they never touch scoring. */
export function saveTestResult(
  clientId: string,
  testId: string,
  answers: number[],
  reflections?: Record<string, string | number>,
): StoredTestResult | null {
  const def = getTest(testId)
  if (!def) return null
  const scored: ScoredResult = scoreTest(def, answers)
  const result: StoredTestResult = {
    testId,
    clientId,
    takenAt: new Date().toISOString(),
    answers,
    scores: scored.scores,
    overall: scored.overall,
    ...(reflections && Object.keys(reflections).length ? { reflections } : {}),
  }
  const rest = resultsStore.get().filter((r) => !(r.clientId === clientId && r.testId === testId))
  const next = [...rest, result]
  resultsStore.set(next)
  // Mirror this client's results to their shared server scope, so their counsellor
  // sees them on the client detail (and they follow the client across devices).
  void pushClientTestResults(
    clientId,
    next.filter((r) => r.clientId === clientId).map((r) => ({ testId: r.testId, takenAt: r.takenAt, scores: r.scores, overall: r.overall })),
  )
  return result
}

/** Persist a completed BATTERY (dbda/ccpa) — pre-scored by its own engine; the
 *  flat `scores` map keeps every generic consumer working, `payload` carries the
 *  rich outputs for the test report. */
export function saveBatteryResult(
  clientId: string,
  testId: string,
  variant: "dbda" | "ccpa",
  scores: Record<string, number>,
  overall: number,
  payload: unknown,
): StoredTestResult {
  const result: StoredTestResult = {
    testId, clientId, takenAt: new Date().toISOString(),
    answers: [], scores, overall, variant, payload,
  }
  const next = [...resultsStore.get().filter((r) => !(r.clientId === clientId && r.testId === testId)), result]
  resultsStore.set(next)
  void pushClientTestResults(
    clientId,
    next.filter((r) => r.clientId === clientId).map((r) => ({ testId: r.testId, takenAt: r.takenAt, scores: r.scores, overall: r.overall })),
  )
  return result
}

// ── purchases (premium tests) ────────────────────────────────────────────────

export function usePurchasedTests(clientId: string): string[] {
  useSyncExternalStore(purchasedStore.subscribe, purchasedStore.get, purchasedStore.get)
  return purchasedStore.get()[clientId] ?? []
}

export function isPurchased(clientId: string, testId: string): boolean {
  return (purchasedStore.get()[clientId] ?? []).includes(testId)
}

export function purchaseTest(clientId: string, testId: string): void {
  const map = purchasedStore.get()
  const list = map[clientId] ?? []
  if (list.includes(testId)) return
  purchasedStore.set({ ...map, [clientId]: [...list, testId] })
}

/** Every instrument ships with the programme — nothing is sold separately.
 *  (Kept as a function so a future gated instrument only changes this line;
 *  `isPurchased` remains for historical receipts.) */
export function isUnlocked(_clientId: string, testId: string): boolean {
  return Boolean(getTest(testId))
}
