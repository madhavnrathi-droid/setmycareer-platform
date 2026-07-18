import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useSession } from "@/lib/auth-store"
import { useNaviClients } from "@/lib/live-queries"
import { cn } from "@/lib/utils"

// One sold-service row from getclientbynaviId — a single service a client bought
// from THIS counsellor. A client (user_id) can hold several rows; we fold them
// into one card. Only fields the backend actually returns are read; anything it
// can't supply (career index, journey stage, risk) is intentionally absent.
interface NaviRow {
  user_id?: string | number
  name?: string
  package_name?: string
  service_date?: string
  payment_status?: string
  mode?: string
}
interface ClientCard {
  id: string
  name: string
  initials: string
  packages: string[]
  services: number
  lastTs: number
  lastLabel?: string
  modes: Set<string>
}

const clean = (v?: string | null) => (v && v !== "None" && v !== "null" ? v.trim() : undefined)
const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
const tsOf = (s?: string) => { if (!s) return 0; const t = Date.parse(s); return Number.isNaN(t) ? 0 : t }
const fmtDate = (ts: number) => (ts ? new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : undefined)

const MODES = [
  { key: "all", label: "All" },
  { key: "Online", label: "Online" },
  { key: "Offline", label: "In-person" },
]

export function Clients() {
  const session = useSession()
  const naviId = session?.userId
  const { data, loading, error } = useNaviClients(naviId)

  const [mode, setMode] = useState("all")
  const [q, setQ] = useState("")
  const ref = useGsap((s) => revealChildren(s), [mode, q, data])

  // fold the per-service rows into one card per client
  const cards = useMemo(() => {
    const rows = (data ?? []) as NaviRow[]
    const byId = new Map<string, ClientCard>()
    for (const r of rows) {
      const id = String(r.user_id ?? "").trim()
      if (!id || id === "undefined") continue
      const name = clean(r.name) ?? `Client ${id}`
      const c = byId.get(id) ?? { id, name, initials: initialsOf(name), packages: [], services: 0, lastTs: 0, lastLabel: undefined, modes: new Set<string>() }
      c.services += 1
      const pkg = clean(r.package_name)
      if (pkg && !c.packages.includes(pkg)) c.packages.push(pkg)
      const md = clean(r.mode)
      if (md) c.modes.add(md)
      const ts = tsOf(r.service_date)
      if (ts > c.lastTs) { c.lastTs = ts; c.lastLabel = fmtDate(ts) }
      byId.set(id, c)
    }
    return [...byId.values()].sort((a, b) => b.lastTs - a.lastTs)
  }, [data])

  const list = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return cards.filter((c) =>
      (mode === "all" || c.modes.has(mode)) &&
      (!needle || c.name.toLowerCase().includes(needle)),
    )
  }, [cards, mode, q])

  return (
    <div>
      <header className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Caseload</p>
        <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Clients</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {loading ? "Loading your live caseload…" : `${cards.length.toLocaleString("en-IN")} clients you've worked with`}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 stroke-[1.5] text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" className="h-9 w-60 pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {MODES.map((x) => (
            <button
              key={x.key}
              onClick={() => setMode(x.key)}
              className={cn(
                "rounded-full px-3 h-8 text-[12.5px] transition-colors",
                mode === x.key ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">{list.length.toLocaleString("en-IN")} clients</span>
      </div>

      {/* full error only when we have nothing cached to show */}
      {error && cards.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-[13px] text-risk-600">
          Couldn’t reach the backend — {error}. Your caseload is large, so the backend can be slow to respond; try again in a moment.
        </div>
      )}
      {/* we have a cached caseload — keep showing it even if the refresh failed */}
      {error && cards.length > 0 && (
        <div className="mb-3 rounded-xl border border-warn-200 bg-warn-50 px-4 py-2.5 text-[12.5px] text-warn-700">
          Showing your last loaded caseload — couldn’t refresh just now (the backend was slow). It updates on the next successful load.
        </div>
      )}

      {cards.length > 0 && (
        <div ref={ref} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.slice(0, 300).map((c) => (
            <Link
              key={c.id} data-reveal to={`/clients/${c.id}`}
              className="group rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-e3)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-100 text-[12px] font-medium text-ink-700">
                  {c.initials}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{c.name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{c.packages.join(" · ") || "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-well-500" />
                  {c.services} {c.services === 1 ? "service" : "services"}
                  {c.modes.size > 0 && <span className="text-ink-300">· {[...c.modes].map((m) => (m === "Offline" ? "In-person" : m)).join(", ")}</span>}
                </span>
                <span>{c.lastLabel ? `Last ${c.lastLabel}` : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {loading && cards.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-card shadow-[var(--shadow-e1)]" />
          ))}
        </div>
      )}

      {!loading && !error && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-[13px] text-muted-foreground">
          {cards.length === 0 ? "No clients are assigned to your account yet." : "No clients match your search."}
        </div>
      )}

      <p className="mt-5 text-[11.5px] text-ink-300">
        Your clients and the services they've taken with you. Career index, journey stage and risk flags aren't tracked yet.
        {list.length > 300 && ` Showing the first 300 of ${list.length.toLocaleString("en-IN")}; refine with search.`}
      </p>
    </div>
  )
}
