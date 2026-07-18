import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search, FileText, FilePlus2, ArrowUpRight, ExternalLink } from "lucide-react"
import { useSession } from "@/lib/auth-store"
import { useNaviClients } from "@/lib/live-queries"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

// The five standard SetMyCareer report types carried on each client's record
// (UserDetail / caseload rows). A non-null value means that report exists for the
// client — that's our live source for the Reports hub (one caseload call, no
// per-client fan-out). Uploaded PDFs are listed live on each client's detail page.
const REPORT_FIELDS = [
  { field: "careerRecommendationsReprt", label: "Career recommendations", kind: "career" },
  { field: "intrest_report", label: "Interest profile", kind: "interest" },
  { field: "personal_report", label: "Personality report", kind: "personality" },
  { field: "ability_report", label: "Aptitude report", kind: "aptitude" },
  { field: "competency_report", label: "Competency report", kind: "competency" },
] as const

type Kind = (typeof REPORT_FIELDS)[number]["kind"]

interface LiveReport {
  id: string
  clientId: string
  clientName: string
  title: string
  kind: Kind
  date: string | null
  href: string | null // external PDF link when the field is a URL
}

const KIND_LABEL: Record<Kind, string> = {
  career: "Career", interest: "Interest", personality: "Personality", aptitude: "Aptitude", competency: "Competency",
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "career", label: "Career" },
  { key: "interest", label: "Interest" },
  { key: "personality", label: "Personality" },
  { key: "aptitude", label: "Aptitude" },
  { key: "competency", label: "Competency" },
]

const TILE_BG: Record<string, string> = {
  ink: "from-ink-100/50", well: "from-well-100/50", warn: "from-warn-100/50", brand: "from-brand-100/50",
}

const str = (v: unknown) => (v == null ? "" : String(v)).trim()
const present = (v: unknown) => { const s = str(v); return s !== "" && s.toLowerCase() !== "null" }
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

// caseload dates come as DD/MM/YYYY — show "MMM D, YYYY"; fall back to raw/none.
function fmtDate(raw: string | null): string {
  if (!raw) return "—"
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    if (!isNaN(d.getTime())) return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function StatTile({ label, value, tone, foot }: { label: string; value: number; tone: string; foot?: string }) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-hairline bg-gradient-to-br to-card p-3.5", TILE_BG[tone])}>
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">{label}</span>
      <span className="mt-1 font-display text-[26px] font-light leading-none tabular-nums text-foreground">{value}</span>
      {foot && <span className="mt-1.5 text-[11px] text-muted-foreground">{foot}</span>}
    </div>
  )
}

export function ReportsHub() {
  const session = useSession()
  const naviId = session?.userId ?? null
  const { data: caseload, loading } = useNaviClients(naviId)

  const [f, setF] = useState("all")
  const [q, setQ] = useState("")
  const ref = useGsap((s) => revealChildren(s), [f, q, loading])

  // Build the live report list: dedupe caseload service-rows to clients, then emit
  // one row per non-null standard report field the client has.
  const all = useMemo<LiveReport[]>(() => {
    const rows = Array.isArray(caseload) ? (caseload as Record<string, unknown>[]) : []
    const byClient = new Map<string, Record<string, unknown>>()
    for (const r of rows) {
      const uid = str(r.user_id) || str(r.id)
      if (!uid) continue
      const prev = byClient.get(uid)
      if (!prev) byClient.set(uid, { ...r })
      else for (const { field } of REPORT_FIELDS) if (!present(prev[field]) && present(r[field])) prev[field] = r[field]
    }
    const out: LiveReport[] = []
    for (const [uid, c] of byClient) {
      const name = str(c.name) || str(c.client_name) || `Client ${uid}`
      const date = str(c.last_session_date) || str(c.service_date) || str(c.date) || null
      for (const rf of REPORT_FIELDS) {
        const val = c[rf.field]
        if (!present(val)) continue
        const v = str(val)
        out.push({
          id: `${uid}-${rf.kind}`,
          clientId: uid,
          clientName: name,
          title: rf.label,
          kind: rf.kind,
          date,
          href: /^https?:\/\//i.test(v) ? v : null,
        })
      }
    }
    return out
  }, [caseload])

  const list = all
    .filter((r) => (f === "all" ? true : r.kind === f))
    .filter((r) => `${r.title} ${r.clientName}`.toLowerCase().includes(q.toLowerCase()))

  const clientsWithReports = new Set(all.map((r) => r.clientId)).size
  const careerCount = all.filter((r) => r.kind === "career").length
  const psychCount = all.filter((r) => r.kind === "personality" || r.kind === "aptitude" || r.kind === "interest").length

  return (
    <div ref={ref}>
      <header data-reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Deliverables</p>
          <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Reports</h1>
        </div>
        <Button asChild size="sm" className="h-9 gap-1.5">
          <Link to="/reports/new">
            <FilePlus2 className="size-4 stroke-[1.75]" /> New report
          </Link>
        </Button>
      </header>

      <div data-reveal className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total reports" value={all.length} tone="ink" />
        <StatTile label="Clients with reports" value={clientsWithReports} tone="well" foot="across your caseload" />
        <StatTile label="Career recommendations" value={careerCount} tone="brand" foot="synthesis delivered" />
        <StatTile label="Psychometric" value={psychCount} tone="warn" foot="interest · personality · aptitude" />
      </div>

      <div data-reveal className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 stroke-[1.5] text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports or clients" className="h-9 w-64 pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((x) => (
            <button
              key={x.key}
              onClick={() => setF(x.key)}
              className={cn(
                "rounded-full px-3 h-8 text-[12.5px] transition-colors",
                f === x.key ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
          {loading ? "Loading…" : `${list.length} report${list.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {loading ? (
        <div data-reveal className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[58px] animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : list.length === 0 ? (
        <div data-reveal className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-border bg-card">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-border bg-background">
              <FileText className="size-5 stroke-[1.25] text-ink-300" />
            </div>
            <h2 className="font-display text-[20px] font-light tracking-tight">
              {all.length === 0 ? "No reports yet" : "No matches"}
            </h2>
            <p className="max-w-xs text-[13px] text-muted-foreground">
              {all.length === 0
                ? "Reports your clients have completed will appear here. Build one from any client's blueprint."
                : "Try a different filter or search."}
            </p>
            {all.length === 0 && (
              <Button asChild size="sm" className="mt-1 h-9 gap-1.5">
                <Link to="/reports/new"><FilePlus2 className="size-4 stroke-[1.75]" /> New report</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div data-reveal className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_auto_auto_auto] items-center gap-6 border-b border-border px-5 py-3 md:grid">
            {["Report", "Type", "Date", "Open"].map((h) => (
              <div key={h} className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-border">
            {list.map((r) => (
              <div key={r.id} className="group grid grid-cols-1 items-center gap-x-6 gap-y-2 px-5 py-3.5 transition-colors hover:bg-secondary md:grid-cols-[1fr_auto_auto_auto]">
                <Link to={`/clients/${r.clientId}`} className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-700">
                    {initials(r.clientName)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-medium">{r.title}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 stroke-[1.5] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <span className="text-[12px] text-muted-foreground">{r.clientName}</span>
                  </div>
                </Link>
                <span className="inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] text-ink-600 md:justify-self-start">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="text-[12.5px] tabular-nums text-muted-foreground md:w-28">{fmtDate(r.date)}</span>
                <span className="md:w-16">
                  {r.href ? (
                    <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-brand-600 hover:underline">
                      Open <ExternalLink className="size-3.5 stroke-[1.5]" />
                    </a>
                  ) : (
                    <Link to={`/clients/${r.clientId}`} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
                      View <ArrowUpRight className="size-3.5 stroke-[1.5]" />
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
