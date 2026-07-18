// Live client activity — the admin's window into "what's happening" across the
// whole client base, all real: every counsellor comment and every generated
// report, folded from the company-wide session feed (client-directory.ts). The
// founder lands on Mission Control and immediately sees real names, the notes
// counsellors are writing, and the reports going out — each linking to that
// client's full 360.

import { Link } from "react-router-dom"
import { FileText, MessageSquare, Users, ExternalLink, ArrowRight } from "lucide-react"
import { useClientDirectory } from "../client-directory"
import { cn } from "@/lib/utils"

const initials = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
const REPORT_TONE: Record<string, string> = {
  Interest: "bg-brand-50 text-brand-700", Personality: "bg-mind-50 text-mind-700",
  Ability: "bg-well-50 text-well-700", Recommendations: "bg-warn-50 text-warn-700",
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e1)]">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300"><Icon className={cn("size-3.5", tone)} /> {label}</p>
      <p className="mt-1.5 font-display text-[26px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function Panel({ title, icon: Icon, count, children }: { title: string; icon: typeof Users; count?: number; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Icon className="size-4 text-brand-600" /> {title}</h3>
        {typeof count === "number" && <span className="text-[11.5px] tabular-nums text-muted-foreground">{count.toLocaleString("en-IN")}</span>}
      </div>
      <div className="max-h-[420px] overflow-y-auto">{children}</div>
    </section>
  )
}

export function LiveClientFeeds() {
  const dir = useClientDirectory()
  const loading = dir.loading && dir.clients.length === 0
  const comments = dir.recentComments.slice(0, 25)
  const reports = dir.recentReports.slice(0, 25)
  const named = dir.clients.filter((c) => c.named).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Live client activity</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">Real names, counsellor comments and reports — straight from the production session feed.</p>
        </div>
        <Link to="/admin/clients" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline">All clients <ArrowRight className="size-3.5" /></Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Users} label="Named clients" tone="text-brand-600" value={loading ? "…" : named.toLocaleString("en-IN")} />
        <Stat icon={FileText} label="Reports" tone="text-mind-600" value={loading ? "…" : dir.recentReports.length.toLocaleString("en-IN")} />
        <Stat icon={MessageSquare} label="Counsellor comments" tone="text-well-600" value={loading ? "…" : dir.recentComments.length.toLocaleString("en-IN")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent counsellor comments" icon={MessageSquare} count={dir.recentComments.length}>
          {loading ? (
            <p className="p-4 text-[13px] text-muted-foreground">Loading the live feed…</p>
          ) : comments.length === 0 ? (
            <p className="p-4 text-[13px] text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {comments.map((m, i) => (
                <li key={i} className="px-4 py-3 transition-colors hover:bg-secondary/40">
                  <Link to={`/admin/clients/${m.clientId}`} className="block">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[9.5px] font-medium text-background">{initials(m.clientName)}</span>
                        <span className="truncate text-[12.5px] font-medium text-foreground">{m.clientName}</span>
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-ink-300">{m.date ?? ""}</span>
                    </div>
                    <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">{m.text}</p>
                    {m.navigator && <p className="mt-1 text-[11px] text-ink-400">— {m.navigator}{m.session ? ` · ${m.session}` : ""}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently generated reports" icon={FileText} count={dir.recentReports.length}>
          {loading ? (
            <p className="p-4 text-[13px] text-muted-foreground">Loading the live feed…</p>
          ) : reports.length === 0 ? (
            <p className="p-4 text-[13px] text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40">
                  <Link to={`/admin/clients/${r.clientId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mind-50 text-mind-700"><FileText className="size-3.5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-foreground">{r.clientName}</p>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("inline-block rounded px-1.5 py-px text-[10px] font-semibold", REPORT_TONE[r.kind] ?? "bg-secondary text-ink-500")}>{r.kind}</span>
                        {r.date && <span className="text-[10.5px] tabular-nums text-ink-400">{r.date}</span>}
                        {r.navigator && <span className="truncate text-[11px] text-ink-400">{r.navigator}</span>}
                      </span>
                    </div>
                  </Link>
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary" title="Open the report PDF">
                    Open <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
