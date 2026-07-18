// React bindings for the mutable demo stores in `mock.ts`.
// Kept separate so `mock.ts` stays a framework-agnostic data module.
import { useSyncExternalStore } from "react"
import {
  subscribeSessions, sessionsSnapshot,
  subscribeUnlogged, unloggedSnapshot, unloggedRecordings,
  clientSessions, getSession,
} from "./mock"
import type { Session, UnloggedRecording } from "./types"

/** Re-renders the caller whenever the sessions store mutates (e.g. a recording
 *  is logged or notes are approved). Returns the live version counter. */
export function useSessionsVersion(): number {
  return useSyncExternalStore(subscribeSessions, sessionsSnapshot, sessionsSnapshot)
}

/** Live list of a client's sessions — re-renders when the store changes. */
export function useClientSessions(clientId: string): Session[] {
  useSessionsVersion()
  return clientSessions(clientId)
}

/** Live single session by id — re-renders when its notes/anything change. */
export function useSession(sessionId: string | undefined): Session | undefined {
  useSessionsVersion()
  return sessionId ? getSession(sessionId) : undefined
}

/** Live list of unlogged ("log later") recordings. */
export function useUnloggedRecordings(): UnloggedRecording[] {
  useSyncExternalStore(subscribeUnlogged, unloggedSnapshot, unloggedSnapshot)
  return unloggedRecordings()
}
