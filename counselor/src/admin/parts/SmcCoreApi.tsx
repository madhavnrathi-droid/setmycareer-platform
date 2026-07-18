// The REAL SetMyCareer backend — surfaced in the admin API section. This is the
// client-side production API the portal talks to (login, packages, navigators,
// sold services, reports). We run a live, NON-DESTRUCTIVE health check against
// the catalogue endpoint and list the full contract; write endpoints are flagged
// "guarded" because they mutate live business data.

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw, CheckCircle2, XCircle, ShieldCheck, Lock, ArrowDownToLine, Search } from "lucide-react"
import { pingSmcApi, SMC_API_BASE, SMC_ENDPOINTS, type SmcHealth, type EndpointSpec, type EndpointGroup } from "@/lib/smc-api"
import { cn } from "@/lib/utils"

// ordered groups, derived from the live contract so the nav never drifts
const GROUPS = [...new Set(SMC_ENDPOINTS.map((e) => e.group))] as EndpointGroup[]

export function SmcCoreApiPanel() {
  const [health, setHealth] = useState<SmcHealth | null>(null)
  const [checking, setChecking] = useState(false)
  const [filter, setFilter] = useState<"All" | EndpointGroup>("All")
  const [q, setQ] = useState("")

  const check = useCallback(async () => {
    setChecking(true)
    const h = await pingSmcApi()
    setHealth({ ...h, at: Date.now() })
    setChecking(false)
  }, [])

  // probe once on mount — read-only, safe against live data
  useEffect(() => { void check() }, [check])

  const reads = SMC_ENDPOINTS.filter((e) => e.kind === "read").length
  const writes = SMC_ENDPOINTS.length - reads
  const ok = health?.ok

  const needle = q.toLowerCase().trim()
  const visible = useMemo(
    () => SMC_ENDPOINTS.filter((e) => (filter === "All" || e.group === filter) && (!needle || e.path.toLowerCase().includes(needle) || e.group.toLowerCase().includes(needle))),
    [filter, needle],
  )
  const shownGroups = filter === "All" ? GROUPS : [filter]

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("relative flex size-2.5", checking && "animate-pulse")}>
              <span className={cn("inline-flex size-2.5 rounded-full", ok == null ? "bg-ink-300" : ok ? "bg-well-500" : "bg-risk-500")} />
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">SetMyCareer Core API</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-medium text-brand-700">Production · live</span>
          </div>
          <p className="mt-1 font-mono text-[12px] text-muted-foreground">{SMC_API_BASE}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500">
            <ShieldCheck className="size-3.5 text-well-600" /> Consumed by the client portal · reads wired, writes guarded against live data
          </p>
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", checking && "animate-spin")} /> {checking ? "Checking…" : "Check connection"}
        </button>
      </div>

      {/* live status row */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-4">
        <Stat label="Status" value={ok == null ? "—" : ok ? "Connected" : "Unreachable"} tone={ok == null ? "" : ok ? "text-well-600" : "text-risk-600"}
          icon={ok == null ? undefined : ok ? <CheckCircle2 className="size-4 text-well-600" /> : <XCircle className="size-4 text-risk-600" />} />
        <Stat label="Latency" value={health ? `${health.ms} ms` : "—"} />
        <Stat label="Catalogue" value={health?.packages != null ? `${health.packages} packages` : "—"} />
        <Stat label="Endpoints" value={`${SMC_ENDPOINTS.length} · ${reads}r ${writes}w`} />
      </div>

      {health && !health.ok && (
        <p className="border-b border-border bg-risk-500/8 px-5 py-2.5 text-[12px] text-risk-600">{health.error}</p>
      )}

      {/* filter nav bar — All + per-domain, with counts + a path search */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <Pill label="All" count={SMC_ENDPOINTS.length} active={filter === "All"} onClick={() => setFilter("All")} />
        {GROUPS.map((g) => (
          <Pill key={g} label={g} count={SMC_ENDPOINTS.filter((e) => e.group === g).length} active={filter === g} onClick={() => setFilter(g)} />
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search endpoints…" className="h-8 w-44 rounded-full border border-border bg-background pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-300 focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      </div>

      {/* endpoint contract */}
      <div className="space-y-4 p-5">
        {visible.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">No endpoints match “{q}”.</p>
        ) : (
          shownGroups.map((g) => {
            const eps = visible.filter((e) => e.group === g)
            if (!eps.length) return null
            const r = eps.filter((e) => e.kind === "read").length
            return (
              <div key={g}>
                <p className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-300">
                  {g} <span className="text-ink-300/70 normal-case tracking-normal">· {r} read · {eps.length - r} write</span>
                </p>
                <div className="overflow-hidden rounded-xl border border-border">
                  {eps.map((e, i) => <EndpointRow key={e.path} e={e} first={i === 0} />)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function Pill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors", active ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary")}>
      {label} <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", active ? "bg-background/20" : "bg-secondary text-ink-500")}>{count}</span>
    </button>
  )
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 flex items-center gap-1.5 font-display text-[18px] font-semibold tabular-nums tracking-tight", tone || "text-foreground")}>
        {icon}{value}
      </p>
    </div>
  )
}

function EndpointRow({ e, first }: { e: EndpointSpec; first: boolean }) {
  const isRead = e.kind === "read"
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2", !first && "border-t border-border")}>
      <span className={cn("w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold", e.method === "GET" ? "bg-brand-50 text-brand-700" : "bg-secondary text-ink-600")}>{e.method}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">{e.path}</span>
      {isRead ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-well-100 px-2 py-0.5 text-[10.5px] font-medium text-well-700"><ArrowDownToLine className="size-3" /> read · wired</span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-warn-100 px-2 py-0.5 text-[10.5px] font-medium text-warn-700"><Lock className="size-3" /> write · guarded</span>
      )}
    </div>
  )
}
