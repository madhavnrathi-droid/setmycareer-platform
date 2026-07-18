import { Link } from "react-router-dom"
import { FileText, Link2, Share2, Lock, Plus, ArrowUpRight, Sparkles } from "lucide-react"
import type { Client, CounselorReport } from "@/lib/types"
import { clientReports } from "@/lib/mock"
import { Button } from "@/components/ui/button"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useIsShared, getSharedReport } from "@/lib/report-share"

const TYPE_LABEL: Record<CounselorReport["type"], string> = {
  career_asset: "Career asset",
  recruiter_cv: "Recruiter CV",
  progress: "Progress",
  clinical_summary: "Clinical summary",
  custom: "Custom",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

function SharedTag({ report }: { report: CounselorReport }) {
  if (report.shared) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-well-100 px-2.5 py-0.5 text-[11px] font-medium text-well-600">
        <Share2 className="size-3 stroke-[1.75]" /> Shared
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Lock className="size-3 stroke-[1.75]" /> Private
    </span>
  )
}

function ReportRow({ report }: { report: CounselorReport }) {
  return (
    <div className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-secondary/60">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">
        {report.format === "pdf" ? (
          <FileText className="size-4 stroke-[1.5]" />
        ) : (
          <Link2 className="size-4 stroke-[1.5]" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-foreground">{report.title}</span>
          <SharedTag report={report} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
          <span>{TYPE_LABEL[report.type]}</span>
          <span className="text-ink-300">·</span>
          <span className="uppercase tracking-wide text-ink-500">{report.format}</span>
          <span className="text-ink-300">·</span>
          <span className="tabular-nums">{fmtDate(report.date)}</span>
          {report.shared && report.recipients.length > 0 && (
            <>
              <span className="text-ink-300">·</span>
              <span className="truncate">To {report.recipients.join(", ")}</span>
            </>
          )}
        </div>
      </div>

      <ArrowUpRight className="mt-1 size-4 shrink-0 stroke-[1.5] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

/* Surfaces a Career Intelligence Report once the counselor has shared it to this
   client's profile (via the report-share store). Links to the live preview doc. */
function SharedReportCard({ client }: { client: Client }) {
  const shared = useIsShared(client.id)
  if (!shared) return null
  const meta = getSharedReport(client.id)

  return (
    <section data-reveal>
      <Link
        to={`/reports/preview?client=${client.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-well-600/20 bg-gradient-to-br from-well-100/60 to-card px-5 py-4 transition-colors hover:border-well-600/30"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-well-100 text-well-600">
          <Sparkles className="size-5 stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-medium text-foreground">
              {meta?.title ?? "Career Intelligence Report"} — shared with client
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-well-100 px-2.5 py-0.5 text-[11px] font-medium text-well-600">
              <Share2 className="size-3 stroke-[1.75]" /> Shared
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Visible in {client.name.split(" ")[0]}'s profile
            {meta?.sharedAt && <> · shared {fmtDate(meta.sharedAt)}</>}
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 stroke-[1.5] text-well-600 opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </section>
  )
}

export function ClientReports({ client }: { client: Client }) {
  const reports = clientReports(client.id)
  const ref = useGsap((s) => revealChildren(s), [client.id])
  const newHref = `/reports/new?client=${client.id}`

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <header data-reveal className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Deliverables</p>
          <h2 className="mt-1 font-display text-[22px] font-extralight tracking-tight">Reports</h2>
        </div>
        <Button asChild size="sm" className="h-8 gap-1.5">
          <Link to={newHref}>
            <Plus className="size-4 stroke-[1.75]" /> New report
          </Link>
        </Button>
      </header>

      <SharedReportCard client={client} />

      {reports.length > 0 ? (
        <section data-reveal className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col divide-y divide-border">
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        </section>
      ) : (
        <section data-reveal className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <FileText className="mx-auto size-8 stroke-[1.25] text-ink-300" />
          <h2 className="mt-4 font-display text-[19px] font-light tracking-tight">No reports yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            Generate a career asset, recruiter CV or progress summary for {client.name.split(" ")[0]} and share it as a
            PDF or link.
          </p>
          <Button asChild size="sm" className="mt-5 gap-1.5">
            <Link to={newHref}>
              <Plus className="size-4 stroke-[1.75]" /> New report
            </Link>
          </Button>
        </section>
      )}
    </div>
  )
}
