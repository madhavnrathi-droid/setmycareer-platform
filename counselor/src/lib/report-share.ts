// Report sharing + prose-edit overrides — a localStorage store mirroring the
// external-store shape used by assistant-chats.ts (a module store + subscribe/
// snapshot pair consumed through useSyncExternalStore). Two concerns live here:
//
//   1. which clients' Career Intelligence Reports are "shared to their profile"
//      (so ClientReports can surface a link, and the client app could read it), and
//   2. per-client prose EDITS — counselor overrides for individual report
//      sections, keyed by a stable section id.
//
// Everything is best-effort: localStorage may be unavailable (private mode),
// over quota, or hold a malformed/tampered value. Nothing here ever throws — a
// failed read yields empty state and a failed write keeps the in-memory copy.

import { useSyncExternalStore } from "react"

/** A client whose report has been shared to their profile. */
export interface SharedReport {
  clientId: string
  /** ISO timestamp of when sharing was (last) turned on. */
  sharedAt: string
  /** Optional display label / report title captured at share time. */
  title?: string
}

interface ShareState {
  /** clientId → share record (presence ⇒ shared). */
  shared: Record<string, SharedReport>
  /** clientId → (sectionId → edited prose text). */
  edits: Record<string, Record<string, string>>
}

const KEY = "smc.report.share"

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

function load(): ShareState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { shared: {}, edits: {} }
    const v: unknown = JSON.parse(raw)
    if (!isRecord(v)) return { shared: {}, edits: {} }

    // Defensively rebuild each map so shape drift / tampering can't crash readers.
    const shared: Record<string, SharedReport> = {}
    if (isRecord(v.shared)) {
      for (const [id, rec] of Object.entries(v.shared)) {
        if (isRecord(rec) && typeof rec.sharedAt === "string") {
          shared[id] = {
            clientId: id,
            sharedAt: rec.sharedAt,
            title: typeof rec.title === "string" ? rec.title : undefined,
          }
        }
      }
    }

    const edits: Record<string, Record<string, string>> = {}
    if (isRecord(v.edits)) {
      for (const [id, sections] of Object.entries(v.edits)) {
        if (!isRecord(sections)) continue
        const clean: Record<string, string> = {}
        for (const [sectionId, text] of Object.entries(sections)) {
          if (typeof text === "string") clean[sectionId] = text
        }
        edits[id] = clean
      }
    }

    return { shared, edits }
  } catch {
    return { shared: {}, edits: {} }
  }
}

let state: ShareState = load()
const listeners = new Set<() => void>()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota / unavailable — keep the in-memory copy */
  }
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
function snapshot(): ShareState {
  return state
}

// ── sharing ────────────────────────────────────────────────────────────────

/** All shared reports, newest-share-first. */
export function listSharedReports(): SharedReport[] {
  return Object.values(state.shared).sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
}

export function isShared(clientId: string): boolean {
  return !!state.shared[clientId]
}

/** Share metadata for a client, if shared. */
export function getSharedReport(clientId: string): SharedReport | undefined {
  return state.shared[clientId]
}

/** Turn sharing on (optionally with a title) or off for a client. */
export function setShared(clientId: string, shared: boolean, meta?: { title?: string }): void {
  if (shared) {
    const existing = state.shared[clientId]
    const next: SharedReport = {
      clientId,
      sharedAt: new Date().toISOString(),
      title: meta?.title ?? existing?.title,
    }
    state = { ...state, shared: { ...state.shared, [clientId]: next } }
  } else {
    if (!state.shared[clientId]) return
    const rest = { ...state.shared }
    delete rest[clientId]
    state = { ...state, shared: rest }
  }
  emit()
}

// ── prose edits ──────────────────────────────────────────────────────────────

/** The edit overrides for a client (sectionId → text). Empty object if none. */
export function getProseEdits(clientId: string): Record<string, string> {
  return state.edits[clientId] ?? {}
}

/** Save (or, with empty text, clear) one section's edited prose. */
export function saveProseEdit(clientId: string, sectionId: string, text: string): void {
  const current = state.edits[clientId] ?? {}
  const nextSections: Record<string, string> = { ...current }

  if (text.trim() === "") {
    if (!(sectionId in nextSections)) return
    delete nextSections[sectionId]
  } else {
    if (nextSections[sectionId] === text) return
    nextSections[sectionId] = text
  }

  const nextEdits = { ...state.edits }
  if (Object.keys(nextSections).length === 0) delete nextEdits[clientId]
  else nextEdits[clientId] = nextSections

  state = { ...state, edits: nextEdits }
  emit()
}

/** Drop all edit overrides for a client (revert to the generated report). */
export function clearProseEdits(clientId: string): void {
  if (!state.edits[clientId]) return
  const nextEdits = { ...state.edits }
  delete nextEdits[clientId]
  state = { ...state, edits: nextEdits }
  emit()
}

// ── hooks ────────────────────────────────────────────────────────────────────

/** Reactive, newest-first list of shared reports. */
export function useSharedReports(): SharedReport[] {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return listSharedReports()
}

/** Reactive boolean: is this client's report shared? */
export function useIsShared(clientId: string): boolean {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return isShared(clientId)
}

/** Reactive prose-edit overrides for a client. */
export function useProseEdits(clientId: string): Record<string, string> {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return getProseEdits(clientId)
}
