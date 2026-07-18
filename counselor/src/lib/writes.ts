// ─────────────────────────────────────────────────────────────────────────────
// Write actions — the ONE place the app mutates live production data. Every
// wrapper (a) calls the env-gated smc-api write (off unless VITE_SMC_WRITES_ENABLED),
// (b) invalidates the affected live-queries so all three surfaces refresh, and
// (c) logs to the admin activity stream. Refunds stay on Razorpay.
//
// SAFETY: with writes disabled these reject loudly and touch nothing. Turn them on
// deliberately (env flag) and verify with a self-cleanup test before going live.
// ─────────────────────────────────────────────────────────────────────────────

import {
  addClientService, modifySessionStatus, deleteSession as apiDeleteSession,
  reassignNavigator as apiReassign, insertNote as apiInsertNote, modifyCategory as apiModifyCategory,
  enableNavigator as apiEnable, disableNavigator as apiDisable,
  type AddClientServicePayload, type UserSession,
} from "./smc-live-api"
import { SMC_WRITES_ENABLED } from "./smc-api"
import { invalidate, invalidateUser } from "./live-queries"
import { logEvent } from "@/admin/admin-events"

export { SMC_WRITES_ENABLED }

const ddmmyyyy = (d = new Date()) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

/** Add a package/service to a client (admin). */
export async function addServiceToClient(p: AddClientServicePayload) {
  const r = await addClientService(p)
  invalidateUser(p.user_id)
  logEvent({ kind: "purchase", title: `Package added · ${p.package_name}`, detail: `client #${p.user_id}` })
  return r
}

/** Mark a session Completed / Booked / Cancelled. */
export async function setSessionStatus(sessionId: number | string, status: string, userId?: number | string) {
  const r = await modifySessionStatus(sessionId, status)
  if (userId != null) invalidateUser(userId); else { invalidate("sessions-all"); invalidate("sessions-admin") }
  logEvent({ kind: "session", title: `Session ${status.toLowerCase()}`, detail: `session #${sessionId}` })
  return r
}

/** Delete a session (sets status Deleted). */
export async function removeSession(session: Record<string, unknown> & { user_id?: number | string }) {
  const r = await apiDeleteSession(session)
  if (session.user_id != null) invalidateUser(session.user_id); else { invalidate("sessions-all"); invalidate("sessions-admin") }
  logEvent({ kind: "session", title: "Session deleted", detail: `session #${session.id ?? session.session_id ?? ""}` })
  return r
}

/** Reassign a client's counsellor (navigator) for a sold service. */
export async function reassignCounsellor(navigatorId: number | string, serviceId: number | string, userId?: number | string) {
  const r = await apiReassign(navigatorId, serviceId)
  if (userId != null) invalidateUser(userId)
  logEvent({ kind: "counsellor", title: "Counsellor reassigned", detail: `service #${serviceId} → navigator #${navigatorId}` })
  return r
}

/** Add a session note (the "comment"). */
export async function addNote(opts: { sessionId: number | string; userId: number | string; navigatorId: number | string; navigatorName: string; comment: string; meetingType?: string }) {
  const r = await apiInsertNote({
    id: opts.sessionId, uid: opts.userId, navigator_id: opts.navigatorId, navigator_name: opts.navigatorName,
    comment: opts.comment, date: ddmmyyyy(), meeting_type: opts.meetingType ?? "Online",
  })
  invalidateUser(opts.userId) // the note must show on the client portal + counsellor + admin
  logEvent({ kind: "session", title: "Note added", detail: `client #${opts.userId}` })
  return r
}

export async function setCategory(category: string, mobile: string, userId?: number | string) {
  const r = await apiModifyCategory(category, mobile)
  if (userId != null) invalidateUser(userId)
  logEvent({ kind: "signup", title: `Category → ${category}`, detail: mobile })
  return r
}

export async function toggleNavigator(email: string, active: boolean) {
  const r = active ? await apiEnable(email) : await apiDisable(email)
  invalidate("navigators"); invalidate("roster")
  logEvent({ kind: "counsellor", title: `Counsellor ${active ? "enabled" : "disabled"}`, detail: email })
  return r
}

export type { UserSession }
