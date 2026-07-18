// Live caseload panel for the counsellor console dashboard. When a counsellor is
// signed in (a navigator session keyed on their id), this surfaces their REAL
// caseload pulled live from the SetMyCareer backend (getclientbynaviId) — folded
// to one row per client and linking to that client's live detail in the console.
// It renders nothing for non-counsellor sessions, so it is a pure additive panel
// that does not disturb the existing mock console UI.

import { Link } from "react-router-dom"
import { Users, RefreshCw, Database } from "lucide-react"
import { useSession } from "@/lib/auth-store"
import { useNaviClients } from "@/lib/live-queries"
import { cn } from "@/lib/utils"

const inr = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString("en-IN")}` : undefined
}
const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" ? s : undefined
}
const initials = (name?: string) => (name ?? "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

type Row = Record<string, unknown>
function rows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[]
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>
    for (const k of ["data", "result", "clients", "Data"]) if (Array.isArray(d[k])) return d[k] as Row[]
  }
  return []
}

export function CounsellorCaseloadPanel() {
  const session = useSession()
  const naviId = session?.role === "counsellor" ? session.userId : undefined
  const { data, loading, error, reload } = useNaviClients(naviId ?? null)
  if (!naviId) return null // only for a live counsellor session

  // fold the per-service rows into one entry per client (user_id), newest first
  const byId = new Map<string, { row: Row; ts: number }>()
  for (const r of rows(data)) {
    const id = clean(r.user_id); if (!id) continue
    const ts = Date.parse(String(r.service_date ?? r.date ?? "")) || 0
    const cur = byId.get(id)
    if (!cur || ts > cur.ts) byId.set(id, { row: r, ts })
  }
  const list = [...byId.values()].sort((a, b) => b.ts - a.ts).map((x) => x.row)
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/40 px-5 py-3">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Users className="size-4 text-brand-600" /> Recent caseload</h2>
        <span className="ml-auto text-[11.5px] text-muted-foreground">{loading ? "pulling live…" : error ? "error" : `${list.length.toLocaleString("en-IN")} total · newest first`}</span>
        <button onClick={reload} disabled={loading} className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-secondary"><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /></button>
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 px-5 py-4 text-[12.5px] text-risk-600"><Database className="size-3.5" /> Couldn’t reach the backend — {error}</p>
      ) : loading && list.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">Pulling your live caseload…</p>
      ) : list.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">No clients on your caseload yet.</p>
      ) : (
        <div className="divide-y divide-border px-5">
          {list.slice(0, 30).map((r, i) => {
            const name = clean(r.name) ?? clean(r.user_name) ?? (clean(r.user_id) ? `Client #${clean(r.user_id)}` : "Client")
            const pkg = clean(r.package_name)
            const date = clean(r.date)?.split(" ")[0] ?? clean(r.session_date)?.split(" ")[0]
            const amount = inr(r.total_payment_amout ?? r.package_amout)
            const inner = (
              <>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">{initials(name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{[pkg, date].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                {amount && <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{amount}</span>}
              </>
            )
            return clean(r.user_id)
              ? <Link key={i} to={`/clients/${clean(r.user_id)}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">{inner}</Link>
              : <div key={i} className="flex items-center gap-3 py-2.5">{inner}</div>
          })}
        </div>
      )}
    </section>
  )
}
