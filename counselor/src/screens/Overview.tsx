// Counsellor dashboard — FULLY LIVE, no mock data. Every figure is computed from
// the navigator's real caseload (SoldService/getclientbynaviId): active clients
// (last 90 days), lifetime served, upcoming sessions, services this month/week,
// reports generated, package mix and online/offline split. Renders for a signed-in
// counsellor (navigator) session; gracefully empty otherwise.

import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Users, CalendarClock, FileText, Activity, ArrowUpRight } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useSession } from "@/lib/auth-store"
import { useNaviClients, useNavigatorStats, useNaviDashboardSessions } from "@/lib/live-queries"
import type { AdminSession } from "@/lib/smc-live-api"
import { CounsellorCaseloadPanel } from "@/components/dashboard/CounsellorCaseloadPanel"
import { UnloggedRecordingsBanner } from "@/components/recording/UnloggedRecordingsBanner"
import { cn } from "@/lib/utils"

const CARD = "rounded-2xl bg-card shadow-[var(--shadow-e2)]"
const DAY = 86400000

const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" && s !== "undefined" ? s : undefined
}
const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
// service_date is US "M/D/YYYY h:mm:ss AM/PM"
const parseUS = (s?: string): number => {
  if (!s) return 0
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM))?/i)
  if (!m) { const t = Date.parse(String(s)); return Number.isNaN(t) ? 0 : t }
  let H = m[4] ? +m[4] : 0
  if (m[7]) { const ap = m[7].toUpperCase(); if (ap === "PM" && H < 12) H += 12; if (ap === "AM" && H === 12) H = 0 }
  return new Date(+m[3], +m[1] - 1, +m[2], H, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0).getTime()
}
// A booked session: session_date "DD/MM/YYYY" + session_time "06:00 PM - 07:00 PM".
// Returns the start-of-session timestamp (date + start time when present).
const parseSessionStart = (date?: string, time?: string): number => {
  if (!date) return 0
  const dm = String(date).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!dm) return 0
  let H = 0, M = 0
  const tm = String(time ?? "").trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (tm) {
    H = +tm[1]; M = +tm[2]
    const ap = tm[3]?.toUpperCase()
    if (ap === "PM" && H < 12) H += 12
    if (ap === "AM" && H === 12) H = 0
  }
  return new Date(+dm[3], +dm[2] - 1, +dm[1], H, M).getTime()
}
const fmtDay = (ts: number) => new Date(ts).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })

interface NaviRow {
  user_id?: string | number; name?: string; package_name?: string
  service_date?: string; last_session_date?: string; mode?: string
  img_url?: string
  intrest_report?: string | null; personal_report?: string | null
  ability_report?: string | null; competency_report?: string | null
  careerRecommendationsReprt?: string | null
}

function StatTile({ icon: Icon, label, value, sub, loading }: {
  icon: React.ElementType; label: string; value: string; sub?: string; loading?: boolean
}) {
  return (
    <div className={cn(CARD, "p-4")}>
      <div className="flex items-center gap-2 text-ink-400">
        <Icon className="size-4 stroke-[1.5]" />
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300">{label}</span>
      </div>
      <div className="mt-2 font-display text-[28px] font-light leading-none tabular-nums text-foreground">
        {loading ? <span className="text-ink-200">…</span> : value}
      </div>
      {sub && <p className="mt-1 text-[11.5px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function Overview() {
  const ref = useGsap((s) => revealChildren(s))
  const session = useSession()
  const naviId = session?.role === "counsellor" ? session.userId : undefined
  const { data: caseload, loading } = useNaviClients(naviId ?? null)
  // the real future-bookings feed (getclientbynaviIdNavi), not the past last-session date
  const { data: naviSessions } = useNaviDashboardSessions(naviId ?? null)
  // the navigator's OFFICIAL figures from the backend (GetNavigatorStats)
  const { data: nstatsRaw } = useNavigatorStats(naviId ?? null)
  const nstats = (nstatsRaw as { data?: Record<string, unknown> } | undefined)?.data ?? (nstatsRaw as Record<string, unknown> | undefined)
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : undefined }
  const clientCount = num(nstats?.ClientCount)
  const sessionCount = num(nstats?.SessionCount)
  const rating = nstats?.Rating != null && String(nstats.Rating).trim() !== "" ? String(nstats.Rating) : undefined
  const earning = num(nstats?.Earning)

  const firstName = (session?.name ?? "there").replace(/^(dr|mr|mrs|ms|prof|miss)\.?\s+/i, "").trim().split(/\s+/)[0] || "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const s = useMemo(() => {
    const rows = (Array.isArray(caseload) ? caseload : []) as NaviRow[]
    const now = Date.now(), d90 = now - 90 * DAY, d30 = now - 30 * DAY, d7 = now - 7 * DAY
    const latest = new Map<string, number>()
    const hasReport = new Set<string>()
    const pkg = new Map<string, number>()
    let online = 0, offline = 0, servicesMonth = 0, servicesWeek = 0
    for (const r of rows) {
      const id = String(r.user_id ?? "").trim()
      if (!id || id === "undefined") continue
      const sTs = parseUS(r.service_date)
      if (sTs) {
        latest.set(id, Math.max(latest.get(id) ?? 0, sTs))
        if (sTs >= d30) servicesMonth++
        if (sTs >= d7) servicesWeek++
      }
      const m = clean(r.mode)
      if (m === "Online") online++; else if (m === "Offline") offline++
      const p = clean(r.package_name)
      if (p) pkg.set(p, (pkg.get(p) ?? 0) + 1)
      if ([r.intrest_report, r.personal_report, r.ability_report, r.competency_report, r.careerRecommendationsReprt].some((x) => clean(x))) hasReport.add(id)
    }
    let active90 = 0, active30 = 0
    for (const ts of latest.values()) { if (ts >= d90) active90++; if (ts >= d30) active30++ }
    const packages = [...pkg.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    const totalPkg = packages.reduce((t, p) => t + p.count, 0) || 1
    return {
      served: latest.size, active90, active30, servicesMonth, servicesWeek,
      reports: hasReport.size, packages, totalPkg, online, offline, modeTotal: online + offline || 1,
    }
  }, [caseload])

  // Real upcoming sessions — booked future bookings from getclientbynaviIdNavi,
  // filtered to today-or-later and excluding completed/cancelled/deleted rows.
  const upcoming = useMemo(() => {
    const rows = (Array.isArray(naviSessions) ? naviSessions : []) as AdminSession[]
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const floor = startOfToday.getTime()
    const items: { key: string; id: string; name: string; ts: number; pkg?: string; time?: string }[] = []
    for (const r of rows) {
      const status = (clean(r.session_status) ?? "").toLowerCase()
      if (status === "completed" || status === "deleted" || status === "cancelled") continue
      const ts = parseSessionStart(r.session_date, r.session_time)
      if (!ts || ts < floor) continue
      const id = String(r.user_id ?? "").trim()
      items.push({
        key: String(r.session_id ?? r.id ?? `${id}-${ts}`),
        id, name: clean(r.name) ?? (id ? `Client ${id}` : "Client"),
        ts, pkg: clean(r.package_name), time: clean(r.session_time),
      })
    }
    return items.sort((a, b) => a.ts - b.ts)
  }, [naviSessions])

  const en = (n: number) => n.toLocaleString("en-IN")

  return (
    <div ref={ref}>
      <header data-reveal className="mb-7">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">
          {greeting}, <span className="font-wordmark text-[15px] normal-case tracking-normal text-ink-500">{firstName}</span>
        </p>
        <h1 className="mt-1.5 font-display text-[clamp(28px,4vw,40px)] font-extralight leading-tight tracking-tight">
          <span className="tabular-nums">{loading ? "…" : en(s.active90)}</span> active {s.active90 === 1 ? "client" : "clients"}
        </h1>
        {!loading && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {clientCount != null ? `${en(clientCount)} clients` : `${en(s.served)} served all-time`}
            {" · "}
            {sessionCount != null ? `${en(sessionCount)} sessions` : `${en(upcoming.length)} upcoming`}
            {rating ? ` · ${rating}★` : ""}
            {earning != null && earning > 0 ? ` · ₹${en(earning)} earned` : ""}
          </p>
        )}
      </header>

      <UnloggedRecordingsBanner />

      {/* real, computed stat row */}
      <div data-reveal className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Active clients" value={en(s.active90)} sub="seen in the last 90 days" loading={loading} />
        <StatTile icon={CalendarClock} label="Upcoming sessions" value={en(upcoming.length)} sub="booked ahead" loading={loading} />
        <StatTile icon={Activity} label="Services this month" value={en(s.servicesMonth)} sub={`${en(s.servicesWeek)} in the last 7 days`} loading={loading} />
        <StatTile icon={FileText} label="Reports generated" value={en(s.reports)} sub="clients with a report" loading={loading} />
      </div>

      {/* caseload composition — package mix + delivery mode, all live */}
      <div data-reveal className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className={cn(CARD, "p-5 lg:col-span-2")}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Caseload by package</p>
          {loading ? (
            <p className="mt-4 text-[13px] text-muted-foreground">Loading your caseload…</p>
          ) : s.packages.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-400">No services on record yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {s.packages.slice(0, 6).map((p) => {
                const pct = Math.round((p.count / s.totalPkg) * 100)
                return (
                  <li key={p.name}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="truncate font-medium text-foreground">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{en(p.count)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-well-500" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={cn(CARD, "flex flex-col p-5")}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Delivery mode</p>
          <div className="mt-4 flex items-end gap-4">
            <div>
              <div className="font-display text-[30px] font-light leading-none tabular-nums">{loading ? "…" : `${Math.round((s.online / s.modeTotal) * 100)}%`}</div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">Online · {en(s.online)}</p>
            </div>
            <div>
              <div className="font-display text-[20px] font-light leading-none tabular-nums text-ink-500">{loading ? "" : `${Math.round((s.offline / s.modeTotal) * 100)}%`}</div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">In-person · {en(s.offline)}</p>
            </div>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-well-500" style={{ width: `${(s.online / s.modeTotal) * 100}%` }} />
            <div className="h-full bg-brand-400" style={{ width: `${(s.offline / s.modeTotal) * 100}%` }} />
          </div>
          <p className="mt-auto pt-4 text-[11.5px] text-ink-300">Across {en(s.online + s.offline)} services on record.</p>
        </section>
      </div>

      {/* upcoming sessions — real booked future sessions (getclientbynaviIdNavi) */}
      <div data-reveal className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className={cn(CARD, "p-5 lg:col-span-2")}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-medium">Upcoming sessions</h2>
            <Link to="/calendar" className="text-[12px] text-brand-600 hover:underline">Open calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-400">No upcoming sessions booked.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {upcoming.slice(0, 8).map((u) => (
                <li key={u.key} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-700">{initialsOf(u.name)}</span>
                  {u.id ? (
                    <Link to={`/clients/${u.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground hover:underline">{u.name}</p>
                      {u.pkg && <p className="truncate text-[11.5px] text-muted-foreground">{u.pkg}</p>}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{u.name}</p>
                      {u.pkg && <p className="truncate text-[11.5px] text-muted-foreground">{u.pkg}</p>}
                    </div>
                  )}
                  <span className="shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">
                    {fmtDay(u.ts)}{u.time ? <span className="block text-[11px] text-ink-300">{u.time}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cn(CARD, "flex flex-col justify-center gap-3 p-5")}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">This week</p>
          <div className="flex items-end gap-2">
            <span className="font-display text-[40px] font-extralight leading-none tabular-nums">{loading ? "…" : en(s.servicesWeek)}</span>
            <span className="mb-1 inline-flex items-center gap-0.5 text-[11.5px] text-muted-foreground"><ArrowUpRight className="size-3 stroke-[1.75]" /> services</span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {en(s.active30)} clients seen in the last 30 days, of {en(s.served)} you've worked with all-time.
          </p>
          <Link to="/clients" className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-foreground px-3.5 py-1.5 text-[12.5px] font-medium text-background hover:opacity-90">
            View all clients
          </Link>
        </section>
      </div>

      {/* the live caseload list (real clients, recent-first) */}
      <CounsellorCaseloadPanel />
    </div>
  )
}
