// Counsellors — the live team, sourced from the production navigator roster
// (getAllNavigator). Identity and the active flag are real; per-counsellor
// performance (caseload, rating, utilization, notes-SLA, response, attributed
// revenue) has no backend source yet and renders blank rather than fabricated.

import { Link } from "react-router-dom"
import { UserPlus, ArrowRight } from "lucide-react"
import { useNavigators } from "@/lib/live-queries"
import { Scorecard } from "../dash"
import { LiveCounsellorsPanel } from "../parts/LivePanels"
import { tableHead, td } from "../ui"
import { cn } from "@/lib/utils"

const isActiveFlag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true" || v === "Active"
const initials = (name?: string) => (name ?? "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
const clean = (v?: string) => (v && v !== "None" ? v.trim() : undefined)

export function AdminCounsellors() {
  const { data, loading, error } = useNavigators()
  const team = data ?? []
  const active = team.filter((c) => isActiveFlag(c.isActive)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Counsellors</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{loading ? "Loading the live team…" : `${team.length} on the team · ${active} active`}</p>
      </div>

      {/* new expert applications waiting on approval → the review queue */}
      {!loading && team.length - active > 0 && (
        <Link to="/admin/applications" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[13px] shadow-[var(--shadow-e2)] transition hover:bg-secondary/40">
          <span className="inline-flex items-center gap-2 text-foreground">
            <UserPlus className="size-4 text-brand-600" />
            <span className="font-medium">{team.length - active} pending approval</span>
            <span className="hidden text-muted-foreground sm:inline">— review new expert applications before they go live</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-600">Review <ArrowRight className="size-3.5" /></span>
        </Link>
      )}

      {/* live team-size stats — performance aggregates have no backend source */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Scorecard label="Counsellors" value={loading ? "…" : String(team.length)} tone="brand" />
        <Scorecard label="Active" value={loading ? "…" : String(active)} tone="well" />
        <Scorecard label="Avg. rating" value="—" tone="ink" hint="No live source" />
        <Scorecard label="Attributed revenue" value="—" tone="ink" hint="No live source" />
      </div>

      <LiveCounsellorsPanel />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className={tableHead}>
              <th className="py-2.5 pl-4 pr-3">Counsellor</th>
              <th className="hidden py-2.5 pr-3 xl:table-cell">Caseload</th>
              <th className="py-2.5 pr-3">Sessions</th>
              <th className="py-2.5 pr-3">Rating</th>
              <th className="py-2.5 pr-3">Utilization</th>
              <th className="hidden py-2.5 pr-3 lg:table-cell">Notes SLA</th>
              <th className="hidden py-2.5 pr-3 lg:table-cell">Response</th>
              <th className="py-2.5 pr-3">Revenue</th>
              <th className="py-2.5 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {team.map((c) => {
              const on = isActiveFlag(c.isActive)
              return (
                <tr key={String(c.id)} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pl-4 pr-3">
                    <Link to={`/admin/counsellors/${c.id}`} className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">{initials(c.name)}</span>
                      <div className="min-w-0"><p className="truncate text-[13px] font-medium text-foreground">{clean(c.name) ?? `Navigator ${c.id}`}</p><p className="truncate text-[11px] text-muted-foreground">{clean(c.practicing_expertise) ?? clean(c.location) ?? "Career counsellor"}</p></div>
                    </Link>
                  </td>
                  <td className={cn(td, "hidden pr-3 text-ink-300 xl:table-cell")}>—</td>
                  <td className={cn(td, "pr-3 text-ink-300")}>—</td>
                  <td className={cn(td, "pr-3 text-ink-300")}>—</td>
                  <td className={cn(td, "pr-3 text-ink-300")}>—</td>
                  <td className={cn(td, "hidden pr-3 text-ink-300 lg:table-cell")}>—</td>
                  <td className={cn(td, "hidden pr-3 text-ink-300 lg:table-cell")}>—</td>
                  <td className={cn(td, "pr-3 text-ink-300")}>—</td>
                  <td className={cn(td, "pr-3")}><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", on ? "bg-well-50 text-well-700" : "bg-ink-100 text-ink-600")}>{on ? "active" : "inactive"}</span></td>
                </tr>
              )
            })}
            {loading && team.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-[13px] text-muted-foreground">Loading the live team…</td></tr>
            )}
            {error && (
              <tr><td colSpan={9} className="py-10 text-center text-[13px] text-risk-600">Couldn’t reach the backend — {error}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-ink-300">Caseload, rating, utilization, notes-SLA, response time and attributed revenue aren't tracked yet and stay blank.</p>
    </div>
  )
}
