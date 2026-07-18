// Growth & product — activation, feature adoption, lifecycle distribution and
// the support & sentiment panel (speed-to-lead, response/resolution, CSAT/CES/
// NPS, SLA). None of these are exposed by the current Admin API contract, so the
// page keeps its structure but each section renders a calm placeholder rather
// than fabricated data.

import { DashHead, LastUpdated } from "../dash"

/** A calm placeholder for sections whose metric has no live backend source. */
function NoSource({ note }: { note?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-[12.5px] text-muted-foreground">No live source — connect the backend metric to populate.</p>
      {note && <p className="mt-1 text-[11px] text-ink-300">{note}</p>}
    </div>
  )
}

export function AdminGrowth() {
  return (
    <div className="space-y-8">
      <DashHead title="Growth & product" subtitle="Activation, adoption, lifecycle and experience" right={<LastUpdated />} />

      {/* activation funnel — no live source */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Activation funnel · signup → value</h2>
        <NoSource note="Activation, time-to-value and activation rate aren't exposed by the backend yet." />
      </section>

      {/* adoption + lifecycle — no live source */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Feature adoption · % of active members</h2>
          <NoSource />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
          <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Lifecycle distribution</h2>
          <NoSource />
        </section>
      </div>

      {/* support & sentiment — no live source */}
      <div>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Support &amp; sentiment</h2>
        <NoSource note="Speed-to-lead, response/resolution, CSAT/CES/NPS, SLA and ticket volume need a support backend." />
      </div>
    </div>
  )
}
