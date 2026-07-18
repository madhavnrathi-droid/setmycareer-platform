// Client directory — the admin's single connective layer over the whole client
// base, folded from the company-wide session feed (SoldService/getSessionAllAdmin,
// ~12k sessions). The bulk roster (UserView{userId:0}) returns name:null for
// everyone — THIS feed is where the real identities live: each session row carries
// the client's name, mobile, email, category, gender, their counsellor, the
// session status/date, AND the report PDFs + the counsellor's comment. We fold
// those rows into one rich record per client so the admin can see real names,
// every report and every comment, and "what's happening" across the platform —
// all from one already-cached read.

import { useMemo } from "react"
import { useAdminSessions } from "@/lib/live-queries"
import type { AdminSession } from "@/lib/smc-live-api"
import { useAdminCounsellors } from "./counsellor-roster"

export interface DirReport { kind: "Interest" | "Personality" | "Ability" | "Recommendations"; url: string; date?: string; ts: number }

// Many SetMyCareer report URLs embed a 14-digit YYYYMMDDHHMMSS stamp — pull it out
// so the dashboard can show when the report was generated.
function reportStamp(url: string): { date?: string; ts: number } {
  const m = url.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!m) return { ts: 0 }
  const [, y, mo, d, h, mi, s] = m
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  const ts = dt.getTime()
  return Number.isNaN(ts) ? { ts: 0 } : { date: dt.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), ts }
}
export interface DirComment { text: string; date?: string; ts: number; navigator?: string; session?: string }
export interface DirClient {
  id: string
  name: string
  named: boolean // true if a real name resolved (vs the "User <id>" fallback)
  mobile?: string
  email?: string
  gender?: string
  category?: string
  navigator?: string
  navigatorId?: string
  sessionCount: number
  lastDate?: string
  lastTs: number
  lastStatus?: string
  packages: string[]
  comments: DirComment[]
  reports: DirReport[]
}

const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" && s !== "undefined" ? s : undefined
}

// Backend dates are DD/MM/YYYY (sometimes with a time) — parse to a sortable ts.
export const parseAdminDate = (s?: string | null): number => {
  if (!s) return 0
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) { const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return new Date(yr, Number(m[2]) - 1, Number(m[1])).getTime() }
  const t = Date.parse(String(s))
  return Number.isNaN(t) ? 0 : t
}

const REPORT_FIELDS: { field: string; kind: DirReport["kind"] }[] = [
  { field: "intrest_report", kind: "Interest" },
  { field: "personal_report", kind: "Personality" },
  { field: "ability_report", kind: "Ability" },
  { field: "careerRecommendationsReprt", kind: "Recommendations" },
]

interface Directory {
  clients: DirClient[]
  byId: Map<string, DirClient>
  nameOf: (id?: string | number | null) => string | undefined
  total: number
  loading: boolean
  error?: string
  reload: () => void
  /** flattened, newest-first feeds for the dashboard */
  recentComments: (DirComment & { clientId: string; clientName: string })[]
  recentReports: (DirReport & { clientId: string; clientName: string; navigator?: string })[]
}

/** The folded directory — one record per client, plus newest-first feeds. */
export function useClientDirectory(): Directory {
  const { data, loading, error, reload } = useAdminSessions()
  return useMemo(() => {
    const rows = (data ?? []) as AdminSession[]
    const byId = new Map<string, DirClient>()
    const seenReport = new Set<string>() // dedupe report URLs per client

    for (const r of rows) {
      const id = clean(r.user_id)
      if (!id) continue
      const rec = (r as unknown) as Record<string, unknown>
      let c = byId.get(id)
      if (!c) {
        c = {
          id, name: `User ${id}`, named: false, sessionCount: 0, lastTs: 0,
          packages: [], comments: [], reports: [],
        }
        byId.set(id, c)
      }
      // identity — first non-empty wins, but a real name always upgrades the fallback
      const nm = clean(r.name)
      if (nm && !c.named) { c.name = nm; c.named = true }
      c.mobile ??= clean(rec.mobile)
      c.email ??= clean(rec.email)
      c.gender ??= clean(rec.gender)
      c.category ??= clean(r.category)
      const navi = clean(r.navigator); if (navi && !c.navigator) c.navigator = navi
      c.navigatorId ??= clean(r.navigator_id)

      c.sessionCount += 1
      const pkg = clean(r.package_name); if (pkg && !c.packages.includes(pkg)) c.packages.push(pkg)

      const ts = parseAdminDate(r.session_date ?? (rec.date as string))
      if (ts >= c.lastTs) { c.lastTs = ts; c.lastDate = clean(r.session_date); c.lastStatus = clean(r.session_status) }

      const comment = clean(r.comment)
      if (comment) c.comments.push({ text: comment, date: clean(r.session_date), ts, navigator: navi, session: clean(r.session_name) })

      for (const { field, kind } of REPORT_FIELDS) {
        const url = clean(rec[field])
        if (url && /^https?:\/\//.test(url)) {
          const key = `${id}:${url}`
          if (!seenReport.has(key)) { seenReport.add(key); const st = reportStamp(url); c.reports.push({ kind, url, date: st.date, ts: st.ts }) }
        }
      }
    }

    const clients = [...byId.values()].sort((a, b) => b.lastTs - a.lastTs)
    for (const c of clients) c.comments.sort((a, b) => b.ts - a.ts)

    const recentComments = clients
      .flatMap((c) => c.comments.map((m) => ({ ...m, clientId: c.id, clientName: c.name })))
      .sort((a, b) => b.ts - a.ts)
    // sort by the report's own generated stamp when present, else keep the
    // client-recency order from the flatMap.
    const recentReports = clients
      .flatMap((c) => c.reports.map((rp) => ({ ...rp, clientId: c.id, clientName: c.name, navigator: c.navigator })))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))

    const nameOf = (id?: string | number | null) => {
      if (id == null || id === "") return undefined
      const c = byId.get(String(id))
      return c?.named ? c.name : undefined
    }

    return { clients, byId, nameOf, total: clients.length, loading, error, reload, recentComments, recentReports }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, error])
}

// ── live snapshot for the admin AI brief ─────────────────────────────────────
// A compact, REAL-data summary the Mission Control assistant can ground in: the
// live counsellor + client counts, the most-active clients, and the newest
// reports/comments — all from the same cached feeds the dashboard renders.
export interface AdminLiveSnapshot {
  counsellorCount: number
  clientCount: number
  namedClientCount: number
  loading: boolean
  topClients: { name: string; sessions: number; navigator?: string; reports: number; comments: number }[]
  recentReports: { clientName: string; kind: string; date?: string; navigator?: string }[]
  recentComments: { clientName: string; text: string; date?: string; navigator?: string }[]
}

export function useAdminLiveSnapshot(): AdminLiveSnapshot {
  const dir = useClientDirectory()
  const { counsellors, loading: rLoading } = useAdminCounsellors()
  return useMemo(() => ({
    counsellorCount: counsellors.length,
    clientCount: dir.total,
    namedClientCount: dir.clients.filter((c) => c.named).length,
    loading: dir.loading || rLoading,
    topClients: [...dir.clients].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 8)
      .map((c) => ({ name: c.name, sessions: c.sessionCount, navigator: c.navigator, reports: c.reports.length, comments: c.comments.length })),
    recentReports: dir.recentReports.slice(0, 8).map((r) => ({ clientName: r.clientName, kind: r.kind, date: r.date, navigator: r.navigator })),
    recentComments: dir.recentComments.slice(0, 8).map((c) => ({ clientName: c.clientName, text: c.text, date: c.date, navigator: c.navigator })),
  }), [dir, counsellors, rLoading])
}
