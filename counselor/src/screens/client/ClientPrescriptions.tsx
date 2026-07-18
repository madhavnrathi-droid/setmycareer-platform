import { Pill, Clock3, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Client, Prescription } from "@/lib/types"
import { clientPrescriptions } from "@/lib/mock"
import { Button } from "@/components/ui/button"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

function AdherenceBar({ value }: { value: number | null }) {
  const tone =
    value == null ? "bg-ink-200"
    : value >= 80 ? "bg-well-600"
    : value >= 60 ? "bg-warn-600"
    : "bg-risk-500"
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value ?? 0}%` }} />
      </div>
      <span className="w-9 text-[12.5px] font-medium tabular-nums text-foreground">
        {value == null ? "—" : `${value}%`}
      </span>
    </div>
  )
}

function RenewalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn-100 px-2 py-0.5 text-[11px] font-medium text-warn-600">
      <Clock3 className="size-3 stroke-[1.75]" /> Renewal due
    </span>
  )
}

function RxTable({ rows, ended }: { rows: Prescription[]; ended?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr>
            {["Medication", "Dose", "Frequency", "Period", ended ? "Status" : "Adherence"].map((h) => (
              <th
                key={h}
                className="border-b border-border px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rx) => (
            <tr key={rx.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3.5 align-top">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-medium text-foreground">{rx.drug}</span>
                  {rx.renewalDue && !ended && <RenewalBadge />}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{rx.prescriber}</div>
              </td>
              <td className="px-4 py-3.5 align-top text-[12.5px] tabular-nums text-ink-600">{rx.dose}</td>
              <td className="px-4 py-3.5 align-top text-[12.5px] text-ink-600">{rx.frequency}</td>
              <td className="px-4 py-3.5 align-top text-[12.5px] tabular-nums text-ink-600">
                {fmtDate(rx.startDate)}
                {rx.endDate ? ` – ${fmtDate(rx.endDate)}` : ended ? "" : " – ongoing"}
              </td>
              <td className="px-4 py-3.5 align-top">
                {ended ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-ink-300" /> Ended
                  </span>
                ) : (
                  <AdherenceBar value={rx.adherence} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ClientPrescriptions({ client }: { client: Client }) {
  const all = clientPrescriptions(client.id)
  const active = all.filter((p) => p.status === "active")
  const history = all.filter((p) => p.status === "ended")
  const ref = useGsap((s) => revealChildren(s), [client.id])

  if (!all.length) {
    return (
      <div ref={ref}>
        <section data-reveal className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Pill className="mx-auto size-8 stroke-[1.25] text-ink-300" />
          <h2 className="mt-4 font-display text-[19px] font-light tracking-tight">No prescriptions</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            {client.name.split(" ")[0]} has no medications on file. Add one to track dose, frequency and adherence.
          </p>
          <Button size="sm" className="mt-5 gap-1.5" onClick={() => toast("Opening prescription form…")}>
            <Plus className="size-4 stroke-[1.75]" /> New prescription
          </Button>
        </section>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <header data-reveal className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Clinical · counselor only</p>
          <h2 className="mt-1 font-display text-[22px] font-extralight tracking-tight">Prescriptions</h2>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast("Opening prescription form…")}>
          <Plus className="size-4 stroke-[1.75]" /> New prescription
        </Button>
      </header>

      {/* active medication chips — quick glance */}
      {active.length > 0 && (
        <section data-reveal>
          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Currently taking</p>
          <div className="flex flex-wrap gap-2">
            {active.map((rx) => (
              <span
                key={rx.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-[12.5px]"
              >
                <Pill className="size-3.5 stroke-[1.5] text-ink-500" />
                <span className="font-medium text-foreground">{rx.drug}</span>
                <span className="text-muted-foreground tabular-nums">{rx.dose} · {rx.frequency}</span>
                {rx.renewalDue && <RenewalBadge />}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* active table */}
      <section data-reveal>
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
          Active <span className="tabular-nums text-ink-300">· {active.length}</span>
        </p>
        {active.length > 0 ? (
          <RxTable rows={active} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-[13px] text-muted-foreground">
            No active prescriptions.
          </div>
        )}
      </section>

      {/* history */}
      {history.length > 0 && (
        <section data-reveal>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
            History <span className="tabular-nums text-ink-300">· {history.length}</span>
          </p>
          <RxTable rows={history} ended />
        </section>
      )}
    </div>
  )
}
