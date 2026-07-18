// ─────────────────────────────────────────────────────────────────────────────
// Shared-by-client store — the data a client and their counsellor BOTH need to
// see (and that therefore must NOT be user-scoped to one of them): structured
// test results and the message thread. Everything lives under the CLIENT's scope
// (client, clientId) in app_state; the client reads/writes their own, and the
// counsellor reads/writes the same client's scope by passing the id explicitly.
//
// This is the interim home on our server DB. When the backend ships Messages/* +
// Tests/* (see docs/BACKEND_API_SPEC.md) these helpers swap to those endpoints
// with no UI change.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react"
import { cloudStateGetAllFor, cloudStateSetFor } from "./cloud"

const K_TESTS = "shared.test_results"
const K_THREAD = "shared.thread"

// ── shared test results ─────────────────────────────────────────────────────────
export interface SharedTestResult {
  testId: string
  takenAt: string // ISO
  scores: Record<string, number>
  overall: number
}

/** Persist this client's full test-result set to their shared scope. */
export function pushClientTestResults(clientId: string, results: SharedTestResult[]): Promise<boolean> {
  if (!clientId) return Promise.resolve(false)
  return cloudStateSetFor("client", String(clientId), K_TESTS, results)
}

/** One-shot (non-hook) read of a client's shared test results — for non-React
 *  callers (e.g. the assistant's live client dossier). Best-effort; never throws. */
export async function readClientTestResults(clientId?: string | null): Promise<SharedTestResult[]> {
  if (!clientId) return []
  try {
    const all = await cloudStateGetAllFor("client", String(clientId))
    const v = all?.[K_TESTS]
    return Array.isArray(v) ? (v as SharedTestResult[]) : []
  } catch { return [] }
}

/** Read a client's shared test results (used by the counsellor on client detail). */
export function useClientTestResults(clientId?: string | null): { data: SharedTestResult[]; loading: boolean } {
  const [data, setData] = useState<SharedTestResult[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!clientId) { setData([]); return }
    let alive = true
    setLoading(true)
    cloudStateGetAllFor("client", String(clientId)).then((all) => {
      if (!alive) return
      const v = all?.[K_TESTS]
      setData(Array.isArray(v) ? (v as SharedTestResult[]) : [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [clientId])
  return { data, loading }
}

// ── shared message thread (client ↔ counsellor) ─────────────────────────────────
export interface SharedMessage {
  id: string
  from: "client" | "counsellor"
  fromName?: string
  body: string
  at: string // ISO
}

const mid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 12) : `m_${Math.abs(Date.now()).toString(36)}`

/** Append a message to a client's shared thread (read-modify-write). */
export async function sendSharedMessage(clientId: string, msg: Omit<SharedMessage, "id" | "at"> & { at?: string }): Promise<boolean> {
  if (!clientId) return false
  const all = await cloudStateGetAllFor("client", String(clientId))
  const thread = Array.isArray(all?.[K_THREAD]) ? (all[K_THREAD] as SharedMessage[]) : []
  const next = [...thread, { id: mid(), at: msg.at ?? new Date().toISOString(), from: msg.from, fromName: msg.fromName, body: msg.body }]
  return cloudStateSetFor("client", String(clientId), K_THREAD, next)
}

/** Read a client's shared thread; pass pollMs to poll for new messages. */
export function useSharedThread(clientId?: string | null, pollMs = 0): { data: SharedMessage[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<SharedMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!clientId) { setData([]); return }
    let alive = true
    setLoading(true)
    cloudStateGetAllFor("client", String(clientId)).then((all) => {
      if (!alive) return
      const v = all?.[K_THREAD]
      setData(Array.isArray(v) ? (v as SharedMessage[]) : [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [clientId, tick])
  useEffect(() => {
    if (!clientId || pollMs <= 0) return
    timer.current = setInterval(() => setTick((t) => t + 1), pollMs)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [clientId, pollMs])
  return { data, loading, refresh: () => setTick((t) => t + 1) }
}
