// Unit economics — ARPU, gross margin, CAC / LTV / payback and per-product
// contribution. None of these are exposed by the current Admin API contract
// (they need booked CAC, COGS and refund data from a finance backend), so the
// page keeps its structure but each section renders a calm placeholder rather
// than fabricated figures.

import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"

/** A calm placeholder for sections whose metric has no live backend source. */
function NoSource({ note }: { note?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-[12.5px] text-muted-foreground">No live source — connect the backend metric to populate.</p>
      {note && <p className="mt-1 text-[11px] text-ink-300">{note}</p>}
    </div>
  )
}

export function AdminEconomics() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="space-y-7">
      <div data-reveal>
        <Link to="/admin/revenue" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Revenue</Link>
        <h1 className="mt-2 font-display text-[24px] font-semibold tracking-tight">Unit economics</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">How a member, a session and a product actually pay back.</p>
      </div>

      {/* headline metric grid — no live source */}
      <NoSource note="ARPU, gross margin, CAC, LTV, LTV:CAC, payback and MRR need booked finance data the backend doesn't expose yet." />

      {/* trends — no live source */}
      <section data-reveal className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Monthly contribution · 12 months</h2>
          <NoSource />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">ARPU · 12 months</h2>
          <NoSource />
        </div>
      </section>

      {/* contribution by product — no live source */}
      <section data-reveal>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Contribution by product</h2>
        <NoSource note="Per-product contribution requires COGS the backend doesn't expose yet." />
      </section>

      {/* drivers / assumptions — no live source */}
      <section data-reveal>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Model drivers</h2>
        <NoSource note="CAC, churn, margin targets and fee assumptions land from the finance backend." />
      </section>
    </div>
  )
}
