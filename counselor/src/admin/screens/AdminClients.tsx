// Clients — the live client directory. Real identities (name / counsellor /
// category / sessions / last-active / reports) come from the company-wide session
// feed (getSessionAllAdmin) folded by client-directory.ts — the bulk roster
// returns name:null, so this feed is where the names live. Registered users with
// no sessions yet are appended from the roster. Admins can hand-add a client and
// pause / archive (a local, reversible hold the client portal honours).

import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Search, Plus, MoreHorizontal, PauseCircle, PlayCircle, Archive, Trash2, FileText } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useRoster } from "@/lib/live-queries"
import { useClientDirectory } from "../client-directory"
import { getAccountState, setAccountState, getStateMap, type AccountState } from "@/lib/account-state"
import { useCompanyClients, removeClient } from "../company-store"
import { Scorecard } from "../dash"
import { LiveRosterStat } from "../parts/LivePanels"
import { tableHead, td } from "../ui"
import { AddClientModal } from "../parts/AddClientModal"
import { cn } from "@/lib/utils"

const STATE_TONE: Record<string, string> = {
  active: "bg-well-50 text-well-700", paused: "bg-warn-50 text-warn-700", archived: "bg-ink-100 text-ink-500",
}

// A directory row — identity + engagement are live from the session feed.
interface Row {
  id: string
  name: string
  named: boolean
  initials: string
  email?: string
  mobile?: string
  category?: string
  counsellor?: string
  sessions: number
  lastDate?: string
  lastTs: number
  reports: number
  state: AccountState
  manual: boolean
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase() : "—"
}
const clean = (v?: string | null) => (v && v !== "None" && v !== "null" ? v.trim() : undefined)
const prettyCat = (c?: string) => c ? c.replace(/^btn_/, "").replace(/_/g, " ").trim() : undefined

function RowMenu({ row }: { row: Row }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const setState = (state: AccountState, reason?: string) => { setAccountState(row.id, state, reason); setOpen(false) }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Actions">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-[var(--shadow-e4)]">
            {row.state === "active" ? (
              <button onClick={() => setState("paused", "Paused by admin")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-secondary"><PauseCircle className="size-3.5 text-warn-600" /> Pause account</button>
            ) : (
              <button onClick={() => setState("active")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-secondary"><PlayCircle className="size-3.5 text-well-600" /> Reactivate</button>
            )}
            {row.state !== "archived" ? (
              <button onClick={() => setState("archived")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-secondary"><Archive className="size-3.5 text-ink-400" /> Archive</button>
            ) : null}
            {row.manual && (
              <button onClick={() => { if (confirm(`Remove ${row.name}? This can't be undone.`)) removeClient(row.id); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-risk-600 hover:bg-secondary"><Trash2 className="size-3.5" /> Remove</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const fmtDate = (s?: string) => { if (!s) return undefined; const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); return m ? `${m[1]}/${m[2]}/${m[3].slice(-2)}` : s }

export function AdminClients() {
  const ref = useGsap((s) => revealChildren(s), [])
  const roster = useRoster()
  const dir = useClientDirectory()
  // subscribe so account-state + hand-added edits re-render the directory
  const stateMap = getStateMap()
  const added = useCompanyClients()
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("all")
  const [adding, setAdding] = useState(false)

  // hand-added first, then every NAMED client from the live session directory
  // (real name / counsellor / category / sessions / last-active / reports), then
  // registered roster users who have no sessions yet (named "User <id>").
  const rowsAll: Row[] = useMemo(() => {
    const manual: Row[] = added.filter((c) => c.manual).map((c) => ({
      id: c.id, name: c.name, named: true, initials: c.initials, email: clean(c.email), mobile: clean(c.phone),
      category: undefined, counsellor: undefined, sessions: 0, lastTs: 0, reports: 0, state: getAccountState(c.id), manual: true,
    }))
    const fromDir: Row[] = dir.clients.map((c) => ({
      id: c.id, name: c.name, named: c.named, initials: initialsOf(c.name), email: c.email, mobile: c.mobile,
      category: prettyCat(c.category), counsellor: c.navigator, sessions: c.sessionCount, lastDate: c.lastDate,
      lastTs: c.lastTs, reports: c.reports.length, state: getAccountState(c.id), manual: false,
    }))
    const dirIds = new Set(dir.clients.map((c) => c.id))
    const rosterOnly: Row[] = (roster.data ?? [])
      .filter((u) => !dirIds.has(String(u.id)))
      .map((u) => {
        const id = String(u.id)
        const name = clean(u.Name) ?? `User ${u.id}`
        return { id, name, named: Boolean(clean(u.Name)), initials: initialsOf(name), email: clean(u.email), mobile: clean(u.mobile), category: prettyCat(clean(u.category)), counsellor: undefined, sessions: 0, lastTs: 0, reports: 0, state: getAccountState(id), manual: false }
      })
    return [...manual, ...fromDir, ...rosterOnly]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir.clients, roster.data, added, stateMap])

  const categories = useMemo(() => [...new Set(rowsAll.map((r) => r.category).filter(Boolean) as string[])].sort(), [rowsAll])

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return rowsAll.filter((r) =>
      (cat === "all" || r.category === cat) &&
      (!needle || r.name.toLowerCase().includes(needle) || (r.email ?? "").toLowerCase().includes(needle) || (r.mobile ?? "").includes(needle) || (r.counsellor ?? "").toLowerCase().includes(needle)),
    )
  }, [rowsAll, q, cat])

  const total = rowsAll.length
  const named = useMemo(() => rowsAll.filter((r) => r.named).length, [rowsAll])
  // Engagement metrics, computed LIVE from the directory (folded session feed).
  const dLoad = dir.loading && dir.clients.length === 0
  const now = Date.now(); const WEEK = 7 * 864e5
  const activeWeek = useMemo(() => dir.clients.filter((c) => c.lastTs && Math.abs(now - c.lastTs) <= WEEK).length, [dir.clients, now])
  const withReports = useMemo(() => dir.clients.filter((c) => c.reports.length > 0).length, [dir.clients])

  const clientStats: { label: string; value: string; tone: string; hint?: string }[] = [
    { label: "Clients", value: roster.loading && dLoad ? "…" : total.toLocaleString("en-IN"), tone: "brand", hint: `${named.toLocaleString("en-IN")} named` },
    { label: "Active this week", value: dLoad ? "…" : activeWeek.toLocaleString("en-IN"), tone: "well", hint: "session in the last 7 days" },
    { label: "With reports", value: dLoad ? "…" : withReports.toLocaleString("en-IN"), tone: "mind", hint: "have a generated report" },
    { label: "Sessions logged", value: dLoad ? "…" : dir.clients.reduce((s, c) => s + c.sessionCount, 0).toLocaleString("en-IN"), tone: "ink", hint: "all-time, live feed" },
  ]

  return (
    <div ref={ref} className="space-y-5">
      <div data-reveal className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Clients</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{dir.loading && dir.clients.length === 0 ? "Loading the live client directory…" : `${total.toLocaleString("en-IN")} clients · ${named.toLocaleString("en-IN")} with names`}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="w-36 bg-transparent text-[13px] outline-none placeholder:text-ink-300" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 max-w-[170px] rounded-full border border-border bg-card px-3 text-[13px] outline-none">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background hover:opacity-90">
            <Plus className="size-4" /> Add client
          </button>
        </div>
      </div>

      {/* live registered-user count + headline stats (derived ones blank — no source) */}
      <div data-reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {clientStats.map((s) => <Scorecard key={s.label} label={s.label} value={s.value} tone={s.tone} hint={s.hint} />)}
        <LiveRosterStat />
      </div>

      <div data-reveal className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className={tableHead}>
              <th className="py-2.5 pl-4 pr-3">Client</th>
              <th className="hidden py-2.5 pr-3 md:table-cell">Mobile</th>
              <th className="hidden py-2.5 pr-3 lg:table-cell">Category</th>
              <th className="hidden py-2.5 pr-3 lg:table-cell">Counsellor</th>
              <th className="py-2.5 pr-3">Sessions</th>
              <th className="hidden py-2.5 pr-3 md:table-cell">Last active</th>
              <th className="py-2.5 pr-3">Status</th>
              <th className="py-2.5 pr-3" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 250).map((c) => (
              <tr key={c.id} className={cn("border-b border-border/60 last:border-0 hover:bg-secondary/40", c.state === "archived" && "opacity-55")}>
                <td className="py-3 pl-4 pr-3">
                  <Link to={`/admin/clients/${c.id}`} className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">{c.initials}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-foreground">
                        <span className="truncate">{c.name}</span>
                        {c.manual && <span className="rounded bg-brand-50 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide text-brand-600">New</span>}
                        {c.reports > 0 && <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-mind-50 px-1 py-px text-[9.5px] font-semibold text-mind-700"><FileText className="size-2.5" />{c.reports}</span>}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.email ?? c.mobile ?? "—"}</p>
                    </div>
                  </Link>
                </td>
                <td className={cn(td, "hidden pr-3 tabular-nums text-muted-foreground md:table-cell")}>{c.mobile ?? "—"}</td>
                <td className={cn(td, "hidden pr-3 capitalize text-muted-foreground lg:table-cell")}>{c.category ?? "—"}</td>
                <td className={cn(td, "hidden pr-3 text-muted-foreground lg:table-cell")}>{c.counsellor ?? "—"}</td>
                <td className={cn(td, "pr-3 tabular-nums text-foreground")}>{c.sessions || "—"}</td>
                <td className={cn(td, "hidden pr-3 tabular-nums text-muted-foreground md:table-cell")}>{fmtDate(c.lastDate) ?? "—"}</td>
                <td className={cn(td, "pr-3")}><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATE_TONE[c.state])}>{c.state}</span></td>
                <td className={cn(td, "pr-3")}><RowMenu row={c} /></td>
              </tr>
            ))}
            {dir.loading && roster.loading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-[13px] text-muted-foreground">Loading the live client directory…</td></tr>
            )}
            {dir.error && roster.error && rows.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-[13px] text-risk-600">Couldn’t reach the backend — {dir.error}</td></tr>
            )}
            {!dir.loading && !roster.loading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-[13px] text-muted-foreground">No clients match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p data-reveal className="text-[11.5px] text-ink-300">Names, counsellor, category, sessions, last-active and report count are live from the production session feed; registered users with no sessions show by id. Click any client for their full record. Showing the first {Math.min(rows.length, 250).toLocaleString("en-IN")} of {rows.length.toLocaleString("en-IN")} matches; refine with search. Pause / archive is a local hold the client portal honours.</p>

      {adding && <AddClientModal onClose={() => setAdding(false)} />}
    </div>
  )
}
