// Live operational statistics straight from Admin/GetStatistics — the real
// company numbers (consultations, sessions, packages sold, counsellors, test
// links). This is the source of truth for Mission Control; the synthetic
// financial/BI charts that have no live source are blanked elsewhere.

import { Database, RefreshCw, AlertCircle } from "lucide-react"
import { useStatistics } from "@/lib/live-queries"
import { cn } from "@/lib/utils"

const intIN = (n: number) => n.toLocaleString("en-IN")

// section → accent
const TONE: Record<string, string> = {
  "Sessions": "text-brand-600",
  "Counsellors": "text-mind-600",
  "Initial Consultations": "text-well-600",
  "Test Links": "text-warn-600",
}

export function LiveStats() {
  const { data, loading, error, reload } = useStatistics()
  const sections = data ? Object.entries(data) : []

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><Database className="size-3.5" /> SetMyCareer operations</h2>
        <button onClick={reload} disabled={loading} className="ml-auto grid size-6 place-items-center rounded-full text-ink-400 hover:bg-secondary"><RefreshCw className={cn("size-3", loading && "animate-spin")} /></button>
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-risk-600"><AlertCircle className="size-3.5" /> {error}</p>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(([name, entries]) => {
            const total = (entries ?? []).reduce((s, e) => s + (Number(e.value) || 0), 0)
            return (
              <div key={name} className="rounded-xl border border-border p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{name}</p>
                <p className={cn("mt-0.5 font-display text-[24px] font-semibold tabular-nums tracking-tight", TONE[name] ?? "text-foreground")}>{intIN(total)}</p>
                <div className="mt-1.5 space-y-0.5">
                  {(entries ?? []).slice(0, 4).map((e) => (
                    <p key={e.key} className="flex items-center justify-between text-[11.5px]">
                      <span className="truncate text-ink-500">{e.key}</span>
                      <span className="ml-2 shrink-0 font-medium tabular-nums text-foreground">{intIN(Number(e.value) || 0)}</span>
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
