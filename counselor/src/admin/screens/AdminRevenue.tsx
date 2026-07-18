// Revenue & subscriptions — the live package catalogue (with real pricing) and
// the real coupon / refund layer (Razorpay-backed) are shown. The SaaS revenue
// analytics — MRR, retention, revenue trend/forecast, MRR movement, leakage and
// dunning, and per-product revenue/units — have no backend source in the current
// Admin API contract, so each renders a calm placeholder rather than fabricated
// numbers.

import { useState } from "react"
import { IndianRupee } from "lucide-react"
import { Link } from "react-router-dom"
import { useGsap, revealChildren } from "@/lib/gsap"
import { fmtINR } from "../admin-data"
import { useCommerceMetrics } from "../commerce-store"
import { LiveCataloguePanel } from "../parts/LivePanels"
import { Catalogue2026Panel } from "../parts/Catalogue2026"
import { cn } from "@/lib/utils"

/** A calm placeholder for sections whose metric has no live backend source. */
function NoSource({ note }: { note?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-[12.5px] text-muted-foreground">No live source — connect the backend metric to populate.</p>
      {note && <p className="mt-1 text-[11px] text-ink-300">{note}</p>}
    </div>
  )
}

export function AdminRevenue() {
  const ref = useGsap((s) => revealChildren(s), [])
  const cm = useCommerceMetrics()
  const rupees = (paise: number) => fmtINR(Math.round(paise / 100))
  // new-vs-legacy segregation: the 2026 catalog is the default view; the legacy
  // live catalogue stays EXACTLY as it was, one toggle away.
  const [catalogView, setCatalogView] = useState<"2026" | "legacy">("2026")

  return (
    <div ref={ref} className="space-y-6">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Revenue &amp; subscriptions</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Live package catalogue and the real coupon / refund layer.</p>
        </div>
        <Link to="/admin/economics" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary"><IndianRupee className="size-3.5" /> Unit economics</Link>
      </div>

      {/* recurring-revenue scorecards — no live source */}
      <div data-reveal>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Recurring revenue</h2>
        <NoSource note="Revenue MTD, MRR, net revenue retention and churn have no backend source yet." />
      </div>

      {/* package catalogue — 2026 catalog (new line) | Legacy (untouched live catalogue) */}
      <div data-reveal className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Package catalogue</h2>
          <div className="inline-flex rounded-full border border-border bg-card p-0.5" role="tablist" aria-label="Catalogue view">
            {([["2026", "2026 catalog"], ["legacy", "Legacy"]] as const).map(([id, label]) => (
              <button
                key={id} role="tab" aria-selected={catalogView === id} onClick={() => setCatalogView(id)}
                className={cn("rounded-full px-3 py-1 text-[12px] font-medium transition-colors", catalogView === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {catalogView === "2026" ? <Catalogue2026Panel /> : <LiveCataloguePanel />}
      </div>

      {/* coupons & refunds — real (commerce-store / Razorpay) */}
      <Link to="/admin/commerce" data-reveal className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card px-1 shadow-[var(--shadow-e1)] transition hover:bg-secondary/30 sm:grid-cols-3">
        {[
          { label: "Refunds this month", value: `−${rupees(cm.refundsThisMonth)}`, tone: "text-risk-600" },
          { label: "Coupon redemptions", value: cm.redemptions.toLocaleString("en-IN"), tone: "text-foreground" },
          { label: "Active coupons", value: `${cm.activeCoupons}`, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3.5"><p className="text-[11.5px] font-medium text-muted-foreground">{s.label}</p><p className={cn("mt-1 truncate font-display text-[18px] font-semibold tabular-nums tracking-tight", s.tone)}>{s.value}</p></div>
        ))}
      </Link>

      {/* trend + MRR movement — no live source */}
      <div data-reveal className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Revenue trend + 3-month forecast</h2>
          <NoSource />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">MRR movement · this month</h2>
          <NoSource />
        </section>
      </div>

      {/* revenue leakage — no live source */}
      <section data-reveal className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Revenue leakage · gross bookings → net collected</h2>
        <NoSource note="Discounts, refunds, fees and dunning leakage land with the billing backend." />
      </section>

      {/* dunning recovery — no live source */}
      <section data-reveal className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Failed-payment recovery · dunning</h2>
        <NoSource note="Smart retries + reminder cadence run through Razorpay once connected." />
      </section>

      {/* per-product revenue — no live source */}
      <section data-reveal>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Revenue by product</h2>
        <NoSource note="Per-product revenue and units aren't exposed by the backend yet — the live catalogue above shows the real packages and pricing." />
      </section>
    </div>
  )
}
