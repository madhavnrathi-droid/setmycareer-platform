// Terminal data-viz primitives, drawn to the dashboard references: hairline
// vertical bar fields (Quantro), big thin numerals with soft delta chips (Flux),
// a segmented forecast bar, and a semi-circle gauge. Pure SVG/CSS — transforms
// and opacity only, no chart-lib weight where a hairline will do.

import { useId } from "react"
import { cn } from "@/lib/utils"

/* ── the hairline bar field — a row of thin vertical bars, optional highlight
      window (the Quantro read). Values are 0–100 heights. ── */
export function BarField({ values, highlight, tone = "ink", h = 44, className }: {
  values: number[]
  /** [startIdx, endIdx) window rendered in the accent tone */
  highlight?: [number, number]
  tone?: "ink" | "well" | "warn" | "risk"
  h?: number
  className?: string
}) {
  const toneCls: Record<string, string> = {
    ink: "fill-ink-300", well: "fill-well-500", warn: "fill-warn-500", risk: "fill-risk-500",
  }
  const w = values.length * 6
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} style={{ height: h }} preserveAspectRatio="none" aria-hidden>
      {values.map((v, i) => {
        const inWin = highlight && i >= highlight[0] && i < highlight[1]
        const bh = Math.max(2, (v / 100) * (h - 4))
        return <rect key={i} x={i * 6 + 2} y={h - bh} width={1.8} height={bh} rx={0.9}
          className={inWin ? toneCls[tone] : "fill-ink-200"} />
      })}
    </svg>
  )
}

/* ── delta chip — "↗ 18%" in a soft green (or red) pill, per the refs ── */
export function DeltaChip({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
      up ? "bg-well-50 text-well-700" : "bg-risk-50 text-risk-600", className,
    )}>
      {up ? "↗" : "↘"} {up ? "+" : ""}{pct}%
    </span>
  )
}

/* ── the big-numeral KPI card (Flux "Token 2.4M ↗18%" grammar) ── */
export function KpiCard({ label, value, unit, delta, sub, bars }: {
  label: string; value: string; unit?: string; delta?: number; sub: string; bars: number[]
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e1)] sm:p-5">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-foreground sm:text-[30px]">
          {value}{unit && <span className="ml-0.5 text-[0.55em] font-medium text-ink-400">{unit}</span>}
        </span>
        {delta != null && <DeltaChip pct={delta} />}
      </div>
      <p className="mt-1 text-[11px] text-ink-400">{sub}</p>
      <div className="mt-3"><BarField values={bars} highlight={[Math.max(0, bars.length - 7), bars.length]} tone="well" h={34} /></div>
    </div>
  )
}

/* ── segmented outlook bar (the Flux 30-day forecast row) ── */
export function SegBar({ segments }: { segments: { label: string; value: number; tone: "well" | "warn" | "brand" }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const toneBar: Record<string, string> = { well: "bg-well-500", warn: "bg-warn-500", brand: "bg-brand-600" }
  const toneDot: Record<string, string> = { well: "bg-well-500", warn: "bg-warn-500", brand: "bg-brand-600" }
  return (
    <div>
      <div className="flex items-center justify-between">
        {segments.map((s) => (
          <span key={s.label} className="text-[12px] font-semibold tabular-nums text-foreground">
            {Math.round((s.value / total) * 100)}%
          </span>
        ))}
      </div>
      <div className="mt-2 flex h-3.5 items-stretch gap-1.5 overflow-hidden">
        {segments.map((s) => (
          <span key={s.label} className={cn("rounded-full", toneBar[s.tone])} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", toneDot[s.tone])} /> {s.label} · {s.value}M
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── the semi-gauge (Quantro "45% Windows") ── */
export function Gauge({ pct, label, sub }: { pct: number; label: string; sub?: string }) {
  const gid = useId()
  const clamped = Math.max(0, Math.min(100, pct))
  const r = 54, cx = 64, cy = 62
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from), a1 = Math.PI * (1 - to)
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1)
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`
  }
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 70" className="w-full max-w-[190px]" role="img" aria-label={`${label}: ${clamped}%`}>
        <path d={arc(0, 1)} fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-ink-100" />
        <path d={arc(0, clamped / 100)} fill="none" strokeWidth={10} strokeLinecap="round" stroke={`url(#g-${gid})`} />
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-well-400, #4ade80)" />
            <stop offset="100%" stopColor="var(--color-well-600, #16a34a)" />
          </linearGradient>
        </defs>
      </svg>
      <p className="-mt-5 font-display text-[24px] font-semibold leading-none text-foreground">{clamped}%</p>
      <p className="mt-1 text-[12px] font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-400">{sub}</p>}
    </div>
  )
}

/* ── tiny inline trend spark for table rows ── */
export function RowSpark({ trend, up }: { trend: number[]; up: boolean }) {
  const min = Math.min(...trend), max = Math.max(...trend), span = max - min || 1
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * 56},${20 - ((v - min) / span) * 16 - 2}`).join(" ")
  return (
    <svg viewBox="0 0 56 20" className="h-5 w-14" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        className={up ? "stroke-well-500" : "stroke-risk-500"} />
    </svg>
  )
}

/* ── AI-exposure dots (1–3) ── */
export function AiDots({ level }: { level: number | null }) {
  if (level == null) return <span className="text-[11px] text-ink-300">—</span>
  return (
    <span className="inline-flex items-center gap-1" aria-label={`AI exposure ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i <= level ? (level >= 3 ? "bg-warn-500" : "bg-ink-500") : "bg-ink-200")} />
      ))}
    </span>
  )
}
