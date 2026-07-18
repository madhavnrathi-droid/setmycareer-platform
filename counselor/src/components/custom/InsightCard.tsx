import { Sparkline } from "@/components/custom/Sparkline"
import type { VizTone } from "@/lib/types"
import { cn } from "@/lib/utils"

const BG: Record<VizTone, string> = {
  brand: "from-brand-100/50", well: "from-well-100/50", mind: "from-mind-100/50",
  warn: "from-warn-100/50", risk: "from-risk-100/50", ink: "from-ink-100/50",
}

/* Premium KPI tile (REF "Insights for today"): label, oversized value, a soft
   tinted gradient, and a full-width sparkline trend with a last-point dot. */
export function InsightCard({
  label, value, sub, tone, trend, className,
}: {
  label: string
  value: string
  sub?: string
  tone: VizTone
  trend: number[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-hairline bg-gradient-to-br to-card p-3.5", BG[tone], className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">{label}</span>
      <div className="mt-1 font-display text-[26px] font-light leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      {sub && <span className="mt-1 text-[11px] text-muted-foreground">{sub}</span>}
      <div className="mt-auto pt-3">
        <Sparkline data={trend} tone={tone} width={220} height={34} className="w-full" />
      </div>
    </div>
  )
}
