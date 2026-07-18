// Mission Control — the company at a glance. The real operational numbers come
// from the SetMyCareer backend via <LiveStats/>. The deeper SaaS-style analytics
// (recurring-revenue retention, pacing, acquisition funnel, cohort retention,
// revenue segments, operational KPI bento, health worklists and alerts) have no
// backend source in the current Admin API contract, so each renders a calm
// "connect the backend metric" placeholder rather than fabricated numbers.

import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { DashHead, LastUpdated } from "../dash"
import { LiveStats } from "../parts/LiveStats"
import { LiveClientFeeds } from "../parts/LiveClientFeeds"
import { cn } from "@/lib/utils"

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A calm placeholder for sections whose metric has no live backend source. */
function NoSource({ note }: { note?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-[12.5px] text-muted-foreground">No live source — connect the backend metric to populate.</p>
      {note && <p className="mt-1 text-[11px] text-ink-300">{note}</p>}
    </div>
  )
}

export function AdminOverview() {
  return (
    <div className="space-y-8">
      <DashHead title="Mission Control" subtitle="Everything across SetMyCareer" right={<LastUpdated />} />

      {/* real operational numbers from the SetMyCareer backend */}
      <LiveStats />

      {/* live client activity — real names, counsellor comments + reports */}
      <LiveClientFeeds />

      {/* recurring vs transactional revenue — no live source */}
      <Card title="Recurring vs transactional revenue · this month"><NoSource note="MRR split (recurring vs one-off) isn't exposed by the backend contract yet." /></Card>

      {/* pacing — no live source */}
      <Card title="Pacing to target · this month"><NoSource note="Targets and pacing land with the finance backend." /></Card>

      {/* growth & retention — no live source */}
      <div>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Growth &amp; retention</h2>
        <NoSource note="MRR, NRR/GRR, churn, stickiness and NPS have no backend source yet." />
      </div>

      {/* MRR movement + funnel — no live source */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="MRR movement · this month"><NoSource /></Card>
        <Card title="Acquisition funnel · 30 days"><NoSource /></Card>
      </div>

      {/* cohorts — no live source */}
      <Card title="Net revenue retention by cohort"><NoSource note="Cohort retention requires per-cohort revenue the backend doesn't expose yet." /></Card>

      {/* segments — no live source */}
      <div>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Revenue segments</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="By plan"><NoSource /></Card>
          <Card title="By geography"><NoSource /></Card>
          <Card title="By acquisition channel"><NoSource /></Card>
        </div>
      </div>

      {/* customer health worklists — no live source */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="At-risk — needs intervention" action={<Link to="/admin/clients" className="text-[12px] font-medium text-brand-600 hover:underline">All clients</Link>}><NoSource note="Health scoring (career/wellbeing/risk) has no backend source yet." /></Card>
        <Card title="Expansion-ready — upsell candidates"><NoSource /></Card>
      </div>

      {/* alerts — no live source */}
      <Card title="Alerts &amp; anomalies"><NoSource note="Anomaly detection runs once the metrics backend is connected." /></Card>

      <Link to="/admin/clients" className="flex items-center justify-between rounded-2xl bg-secondary/50 px-5 py-4 transition hover:bg-secondary">
        <div><p className="text-[14px] font-semibold text-foreground">Drill into clients, journeys and counsellors</p><p className="text-[12.5px] text-muted-foreground">Full history, activity and accountability — all controllable from here.</p></div>
        <ArrowRight className="size-5 text-ink-400" />
      </Link>
    </div>
  )
}
