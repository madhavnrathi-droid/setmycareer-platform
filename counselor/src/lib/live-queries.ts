// ─────────────────────────────────────────────────────────────────────────────
// Live queries — a tiny react-query-style layer over the live API: a TTL'd,
// de-duplicated, manually-invalidatable cache + typed hooks. Every surface reads
// the SAME live source through these, and every write calls invalidate() so the
// three apps never drift (the stale-after-write feedback gap the migration map
// flagged). No external dependency — just the existing fetch transport.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react"
import {
  getStatistics, getAllNavigators, getUserSessions, getUserNotes, getUserReviews,
  userView, getUserReports, getUserPurchases, getRecommendedServices, getAbilitySummary,
  getAllClientsBySession, getSessionsAllAdmin, getClientsByNavi,
  getNavigatorStats, getAdmissionData, getCareerExplorerQA, getNaviDashboardSessions, listCalendarEvents,
} from "./smc-live-api"
import { getAllPackages, fetchRoster } from "./smc-api"

const DEFAULT_TTL = 60_000

interface Entry { promise: Promise<unknown>; ts: number }
const cache = new Map<string, Entry>()

// Optional localStorage persistence for heavy reads (e.g. a large caseload that
// the backend serialises very slowly). Seeds the hook instantly from the last
// good response and survives reloads, so a slow/failed revalidation never blanks
// the screen — it just keeps showing the cached data.
function readPersist<T>(k: string): T | undefined {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : undefined } catch { return undefined }
}
function writePersist(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota — keep in-memory */ }
}

/** Cached, de-duped fetch keyed by `key`. Re-fetches once the TTL lapses. */
export function query<T>(key: string, fn: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const hit = cache.get(key)
  const fresh = hit && performance.now() - hit.ts < ttl
  if (fresh) return hit!.promise as Promise<T>
  const promise = fn().catch((e) => { if (cache.get(key)?.promise === promise) cache.delete(key); throw e })
  cache.set(key, { promise, ts: performance.now() })
  return promise
}

/** Drop cached entries so the next read re-fetches. Call after any write. */
export function invalidate(prefix?: string): void {
  if (!prefix) { cache.clear(); bump(); return }
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
  bump()
}

// a global version counter so mounted hooks re-run after invalidate()
let version = 0
const versionListeners = new Set<() => void>()
function bump() { version++; versionListeners.forEach((l) => l()) }

export interface Live<T> { data?: T; loading: boolean; error?: string; reload: () => void }

export function useQuery<T>(key: string | null, fn: () => Promise<T>, ttl = DEFAULT_TTL, persistKey?: string): Live<T> {
  const [s, setS] = useState<{ data?: T; loading: boolean; error?: string }>(() => ({
    data: persistKey ? readPersist<T>(persistKey) : undefined,
    loading: !!key,
  }))
  const [, force] = useState(0)
  // re-render this hook when a global invalidate fires
  useEffect(() => { const l = () => force((n) => n + 1); versionListeners.add(l); return () => { versionListeners.delete(l) } }, [])

  const run = useCallback((bypass = false) => {
    if (!key) { setS({ loading: false }); return }
    if (bypass) cache.delete(key)
    setS((p) => ({ ...p, loading: true, error: undefined }))
    let alive = true
    query<T>(key, fn, ttl)
      .then((data) => { if (alive) { setS({ data, loading: false }); if (persistKey) writePersist(persistKey, data) } })
      // keep any previously-loaded/persisted data visible on failure (don't blank the screen)
      .catch((e) => { if (alive) setS((p) => ({ data: p.data, loading: false, error: e?.message ?? "failed" })) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, version, persistKey])

  useEffect(() => { const cancel = run(); return cancel }, [run])
  return { ...s, reload: () => run(true) }
}

// ── typed hooks (the surfaces read these) ─────────────────────────────────────

const idKey = (p: string, id?: number | string | null) => (id == null || id === "" ? null : `${p}:${id}`)

export const useStatistics = () => useQuery("statistics", getStatistics, 120_000)
export const useNavigators = () => useQuery("navigators", getAllNavigators, 300_000)
export const usePackages = () => useQuery("packages", getAllPackages, 300_000)
export const useRoster = () => useQuery("roster", fetchRoster, 300_000)
export const useAbilitySummary = () => useQuery("ability-summary", getAbilitySummary, 300_000)
export const useAllSessions = () => useQuery("sessions-all", getAllClientsBySession, 120_000)
export const useAdminSessions = () => useQuery("sessions-admin", getSessionsAllAdmin, 120_000)

export const useUserView = (id?: number | string | null) => useQuery(idKey("user", id), () => userView(id!))
export const useUserSessions = (id?: number | string | null) => useQuery(idKey("sessions", id), () => getUserSessions(id!))
export const useUserReports = (id?: number | string | null) => useQuery(idKey("reports", id), () => getUserReports(id!))
export const useUserPurchases = (id?: number | string | null) => useQuery(idKey("purchases", id), () => getUserPurchases(id!))
export const useUserNotes = (id?: number | string | null) => useQuery(idKey("notes", id), () => getUserNotes(id!))
export const useUserReviews = (id?: number | string | null) => useQuery(idKey("reviews", id), () => getUserReviews(id!))
export const useUserRecommended = (id?: number | string | null) => useQuery(idKey("recommended", id), () => getRecommendedServices(id!))

/** One navigator's live caseload (getclientbynaviId). The backend returns an
 *  array of sold-service rows for that counsellor's clients; we cache per id. */
export const useNaviClients = (navigatorId?: number | string | null) =>
  useQuery(
    idKey("navi-clients", navigatorId),
    () => getClientsByNavi(navigatorId!),
    DEFAULT_TTL,
    navigatorId != null && navigatorId !== "" ? `smc.cache.navi-clients:${navigatorId}` : undefined,
  )

// ── Navigator-view contract hooks ─────────────────────────────────────────────

/** A navigator's official top-level stats (GetNavigatorStats). */
export const useNavigatorStats = (navigatorId?: number | string | null) =>
  useQuery(idKey("navi-stats", navigatorId), () => getNavigatorStats(navigatorId!), 120_000)

/** A navigator's dashboard upcoming-sessions feed (getclientbynaviIdNavi). */
export const useNaviDashboardSessions = (navigatorId?: number | string | null) =>
  useQuery(idKey("navi-sessions", navigatorId), () => getNaviDashboardSessions(navigatorId!), DEFAULT_TTL)

/** A client's saved admission-assistance preferences (GetAdmissionData). */
export const useUserAdmission = (userId?: number | string | null) =>
  useQuery(idKey("admission", userId), () => getAdmissionData(userId!), 300_000)

/** Career Explorer questions + saved answers for a service (getCareerExplorerQuestionAnswers). */
export const useCareerExplorerQA = (serviceId?: number | string | null) =>
  useQuery(idKey("career-explorer", serviceId), () => getCareerExplorerQA(serviceId!), 120_000)

/** A navigator's live Zoho calendar events for a date window. */
export const useCalendarEvents = (p: { calendarId?: string | null; startDate: string; endDate: string; userId?: number | string | null; navigatorName?: string }) =>
  useQuery(
    p.calendarId && p.userId != null ? `calendar:${p.calendarId}:${p.startDate}:${p.endDate}` : null,
    () => listCalendarEvents({ calendarId: p.calendarId!, startDate: p.startDate, endDate: p.endDate, UserId: String(p.userId), NavigatorName: p.navigatorName }),
    120_000,
  )

/** Invalidate everything tied to one user after a write affecting them — so the
 *  change shows up on EVERY touchpoint: the client portal (their own reads), the
 *  counsellor console (the navigator caseload), and the admin dashboard. */
export function invalidateUser(id: number | string): void {
  for (const p of ["user", "sessions", "reports", "purchases", "notes", "reviews", "recommended"]) invalidate(`${p}:${id}`)
  invalidate("sessions-all"); invalidate("sessions-admin"); invalidate("statistics")
  // the counsellor dashboard / Clients page / caseload panel all read getClientsByNavi;
  // clear every navigator's caseload so a per-client write reflects there too.
  invalidate("navi-clients"); invalidate("roster")
}
