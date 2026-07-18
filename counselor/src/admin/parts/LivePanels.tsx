// Live production panels — drop-in sections that surface REAL SetMyCareer backend
// data inside the existing admin screens (counsellors, revenue, clients). Each is
// read-only, cached (see live-data.ts), and clearly badged "live" so it sits
// alongside the demo data without replacing it.

import { useState } from "react"
import { Database, UserCog, Package, Users, ChevronRight } from "lucide-react"
import { useSmcCounsellors, useSmcPackages, useSmcRoster } from "../live-data"
import type { PackagesData } from "@/lib/smc-api"
import { cn } from "@/lib/utils"

const prettyName = (s?: string | null) => (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "Package"

const inr = (v?: string | number | null) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—"
}

function LiveBadge() {
  return null
}

function Shell({ icon: Icon, title, sub, children }: { icon: typeof UserCog; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><Icon className="size-3.5" /> {title}</h2>
        <LiveBadge />
        {sub && <span className="ml-auto text-[12px] text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </section>
  )
}

const initials = (name?: string) => (name ?? "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

/** Real counsellor ("navigator") roster — surfaced on the Counsellors screen. */
export function LiveCounsellorsPanel() {
  const { data, loading, error } = useSmcCounsellors()
  return (
    <Shell icon={UserCog} title="Counsellors on the SetMyCareer platform" sub={loading ? "pulling…" : error ? "" : `${data?.length ?? 0}`}>
      {error ? <ErrLine msg={error} /> : loading ? <Skel rows={3} /> : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((n) => {
            const meta = [n.practicing_expertise, n.experiance, n.education, n.location].filter((x) => x && x !== "None")
            return (
              <div key={String(n.id)} className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-700">{initials(n.name)}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-foreground">{n.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{meta[0] ?? (n.online_mode && n.online_mode !== "None" ? n.online_mode : "Career counsellor")}</p>
                  {n.email && n.email !== "None" && <p className="truncate text-[11px] text-ink-400">{n.email}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

const catLabel = (c: string) => c.replace(/^btn_/, "").replace(/_/g, " ").replace(/\bpag\b/i, "PG/UG").replace(/\bug\b/i, "UG").trim() || "Other"

/** Real package catalogue with live pricing — drill into a stage to see every
 *  package (name · duration · online + face-to-face price). The 123 packages are
 *  ~25 products replicated across the 6 student-stage categories. */
export function LiveCataloguePanel() {
  const { data, loading, error } = useSmcPackages()
  const [open, setOpen] = useState<string | null>(null)
  const groups = (() => {
    const m = new Map<string, PackagesData[]>()
    for (const p of data ?? []) { const k = p.category || "other"; (m.get(k) ?? m.set(k, []).get(k)!).push(p) }
    return [...m.entries()].map(([cat, items]) => {
      const prices = items.map((p) => Number(p.price_online)).filter((n) => Number.isFinite(n) && n > 0)
      const sorted = [...items].sort((a, b) => (Number(a.price_online) || 0) - (Number(b.price_online) || 0))
      return { cat, items: sorted, count: items.length, min: prices.length ? Math.min(...prices) : undefined, max: prices.length ? Math.max(...prices) : undefined }
    }).sort((a, b) => b.count - a.count)
  })()
  const products = new Set((data ?? []).map((p) => p.package_name)).size

  return (
    <Shell icon={Package} title="Package catalogue" sub={loading ? "pulling…" : error ? "" : `${data?.length ?? 0} packages · ${products} products × ${groups.length} stages`}>
      {error ? <ErrLine msg={error} /> : loading ? <Skel rows={4} /> : (
        <div className="overflow-hidden rounded-xl border border-border">
          {groups.map((g, i) => {
            const isOpen = open === g.cat
            return (
              <div key={g.cat} className={cn(i > 0 && "border-t border-border")}>
                <button onClick={() => setOpen(isOpen ? null : g.cat)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary/50">
                  <ChevronRight className={cn("size-3.5 shrink-0 text-ink-400 transition-transform", isOpen && "rotate-90")} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium capitalize text-foreground">{catLabel(g.cat)}</span>
                  <span className="shrink-0 text-[11.5px] text-muted-foreground">{g.count} package{g.count === 1 ? "" : "s"}</span>
                  <span className="w-28 shrink-0 text-right text-[12px] tabular-nums text-ink-700">{g.min != null ? (g.min === g.max ? inr(g.min) : `${inr(g.min)}–${inr(g.max)}`) : "—"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-secondary/20">
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-300">
                      <span className="pl-6">Package</span><span className="w-20 text-right">Online</span><span className="w-24 text-right">Face-to-face</span>
                    </div>
                    {g.items.map((p) => (
                      <div key={p.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-border/50 px-3 py-1.5">
                        <span className="min-w-0 pl-6">
                          <span className="block truncate text-[12px] font-medium text-foreground">{prettyName(p.package_name)}</span>
                          {p.package_description && <span className="block truncate text-[10.5px] text-ink-400">{p.package_description}</span>}
                        </span>
                        <span className="w-20 text-right text-[12px] tabular-nums text-foreground">{inr(p.price_online)}</span>
                        <span className="w-24 text-right text-[12px] tabular-nums text-muted-foreground">{inr(p.price_face_to_face)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

/** A single live KPI card — registered-user count from production. */
export function LiveRosterStat({ className }: { className?: string }) {
  const { data, loading, error } = useSmcRoster()
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e4)]", className)}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground"><Users className="size-3.5" /> Registered users <LiveBadge /></p>
      <p className="mt-1 font-display text-[24px] font-semibold tabular-nums tracking-tight text-foreground">{error ? "—" : loading ? "…" : (data?.length ?? 0).toLocaleString("en-IN")}</p>
      <p className="text-[11.5px] text-ink-300">{error ? error : "registered on the platform"}</p>
    </div>
  )
}

function ErrLine({ msg }: { msg: string }) {
  return <p className="flex items-center gap-1.5 text-[12.5px] text-risk-600"><Database className="size-3.5" /> Couldn’t reach the backend — {msg}</p>
}
function Skel({ rows }: { rows: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-secondary" />)}</div>
}
