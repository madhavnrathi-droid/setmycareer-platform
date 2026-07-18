// Per-session video rooms — gmeet-style. Every booked session gets its OWN unique
// LiveKit room, derived deterministically from the session id so the counsellor
// and the client both compute the SAME room from their own dashboards (no shared
// state needed). If the live API session already carries a parseable room link,
// we honour it; otherwise we mint a stable one from the session id.

import type { UserSession } from "./smc-live-api"

type SessionLike = { session_id?: string | number; sessionTopic?: string; session_name?: string; meetinglink?: string }

/** Deterministic unique LiveKit room id for a session. */
export const sessionRoomId = (s: SessionLike): string => `smc-s-${s.session_id ?? "adhoc"}`

/** Pull an existing room id out of a stored meeting link (?room=...), if any. */
export function parseRoom(meetinglink?: string): string | undefined {
  if (!meetinglink) return undefined
  try {
    const u = new URL(meetinglink, "https://x")
    return u.searchParams.get("room") || undefined
  } catch { return undefined }
}

/** The room a session should use — an existing parseable one, else a fresh stable one. */
export const roomForSession = (s: SessionLike): string => parseRoom(s.meetinglink) ?? sessionRoomId(s)

/** In-app call route that joins the session's unique room (used by both sides). */
export function sessionCallHref(clientId: string | number, s: SessionLike): string {
  const q = new URLSearchParams({ room: roomForSession(s) })
  const topic = s.sessionTopic || s.session_name
  if (topic) q.set("topic", topic)
  return `/portal/call/${clientId}?${q.toString()}`
}

/** Shareable absolute meeting link for a session (gmeet-style). */
export function sessionMeetingUrl(clientId: string | number, s: SessionLike): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://setmycareer-counselor.vercel.app"
  return origin + sessionCallHref(clientId, s)
}

export type { UserSession }
