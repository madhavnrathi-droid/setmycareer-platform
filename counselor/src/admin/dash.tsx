// ── Shared dashboard chrome + charts ─────────────────────────────────────────
// The reusable building blocks that give every admin screen the depth of a
// best-in-class dashboard: a global period selector + last-updated stamp +
// compare-to-previous framing, and a small dependency-free SVG chart kit
// (trend, waterfall, funnel, cohort grid, donut, segment bars, pacing, gauge,
// scorecard, alerts). Monochrome base + semantic accents, matching the console.

import { useSyncExternalStore, type ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, RefreshCw, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { PERIODS, periodById, SEG_AUDIENCE, SEG_TIER, type Period, type Segment, type Alert, type Cohort, type Pace, type MrrMovement, type FunnelStage, type FlowStep, type SegFilter } from "./metrics"

const STROKE: Record<string, string> = { brand: "stroke-brand-500", well: "stroke-well-600", mind: "stroke-mind-500", warn: "stroke-warn-600", risk: "stroke-risk-500", ink: "stroke-ink-400" }
const FILL: Record<string, string> = { brand: "fill-brand-500/12", well: "fill-well-500/12", mind: "fill-mind-500/12", warn: "fill-warn-500/12", risk: "fill-risk-500/12", ink: "fill-ink-400/10" }
const BG: Record<string, string> = { brand: "bg-brand-500", well: "bg-well-500", mind: "bg-mind-500", warn: "bg-warn-500", risk: "bg-risk-500", ink: "bg-ink-400" }

// ── period selector (localStorage-backed, shared across screens) ─────────────
const PKEY = "smc.admin.period"
let pval = (() => { try { return localStorage.getItem(PKEY) || "30d" } catch { return "30d" } })()
const plisteners = new Set<() => void>()
function setPeriodId(id: string) { pval = id; try { localStorage.setItem(PKEY, id) } catch { /* */ } plisteners.forEach((l) => l()) }
function subscribeP(l: () => void) { plisteners.add(l); return () => { plisteners.delete(l) } }

export function usePeriod(): [Period, (id: string) => void] {
  const id = useSyncExternalStore(subscribeP, () => pval, () => pval)
  return [periodById(id), setPeriodId]
}

export function PeriodPicker() {
  const [period, set] = usePeriod()
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
      {PERIODS.map((p) => (
        <button key={p.id} onClick={() => set(p.id)} className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors", period.id === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{p.label}</button>
      ))}
    </div>
  )
}

export function LastUpdated() {
  return <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-300"><RefreshCw className="size-3" /> Live · SetMyCareer backend</span>
}

/** Period header strip: title + subtitle on the left, picker + last-updated right. */
export function DashHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const [period] = usePeriod()
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle} · {period.compare}</p>}
      </div>
      <div className="flex items-center gap-3">{right}<PeriodPicker /></div>
    </div>
  )
}

// ── delta + scorecard ─────────────────────────────────────────────────────────
export function Delta({ value, invert, suffix = "%" }: { value: number; invert?: boolean; suffix?: string }) {
  if (!value) return <span className="text-[11.5px] text-ink-300">—</span>
  const up = value > 0, good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className={cn("inline-flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums", good ? "text-well-600" : "text-risk-500")}><Icon className="size-3" />{Math.abs(value).toFixed(1)}{suffix}</span>
}

export function Sparkline({ data, tone = "brand", w = 80, h = 26 }: { data: number[]; tone?: string; w?: number; h?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ")
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible"><polyline points={pts} fill="none" className={STROKE[tone]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function Scorecard({ label, value, delta, invert, target, tone = "brand", series, hint }: {
  label: string; value: string; delta?: number; invert?: boolean; target?: string; tone?: string; series?: number[]; hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e4)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-muted-foreground">{label}</span>
        {delta !== undefined && <Delta value={delta} invert={invert} />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-[23px] font-semibold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
          {target && <p className="mt-1 text-[11px] text-muted-foreground">Target {target}</p>}
          {hint && !target && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {series && <span className="hidden shrink-0 lg:block"><Sparkline data={series} tone={tone} /></span>}
      </div>
    </div>
  )
}

// ── trend chart (area + line, optional compare series) ───────────────────────
export function TrendChart({ data, compare, labels, tone = "brand", height = 200, areaFill = true }: {
  data: number[]; compare?: number[]; labels?: string[]; tone?: string; height?: number; areaFill?: boolean
}) {
  const W = 600, H = height
  if (data.length < 2) return <div style={{ height }} className="grid place-items-center text-[12px] text-ink-300">Not enough data</div>
  const all = compare ? [...data, ...compare] : data
  const min = Math.min(...all), max = Math.max(...all)
  const pad = Math.max((max - min) * 0.14, Math.abs(max) * 0.02, 1)
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad, hi = max + pad
  const x = (i: number) => (i / (data.length - 1)) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(" ")
  const area = `0,${H} ${line} ${W},${H}`
  const grid = [0.25, 0.5, 0.75]
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {grid.map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {areaFill && <polygon points={area} className={FILL[tone]} stroke="none" />}
        {compare && <polyline points={compare.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" className="stroke-ink-300" strokeWidth={1.25} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        <polyline points={line} fill="none" className={STROKE[tone]} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={3} className={cn(BG[tone].replace("bg-", "fill-"))} />
      </svg>
      {labels && <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-300">{labels.map((l, i) => (i % 2 === 0 || i === labels.length - 1) ? <span key={i}>{l}</span> : <span key={i} className="opacity-0">.</span>)}</div>}
    </div>
  )
}

// ── MRR movement waterfall ───────────────────────────────────────────────────
export function Waterfall({ m, fmt }: { m: MrrMovement; fmt: (n: number) => string }) {
  const steps = [
    { label: "Start", v: m.start, kind: "base" as const },
    { label: "New", v: m.new, kind: "up" as const },
    { label: "Expansion", v: m.expansion, kind: "up" as const },
    { label: "Reactivation", v: m.reactivation, kind: "up" as const },
    { label: "Contraction", v: -m.contraction, kind: "down" as const },
    { label: "Churned", v: -m.churned, kind: "down" as const },
    { label: "End", v: m.end, kind: "base" as const },
  ]
  const maxTop = Math.max(m.start, m.end) * 1.08
  let run = 0
  const H = 150
  const yScale = (v: number) => (v / maxTop) * H
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: H }}>
        {steps.map((s, i) => {
          const isBase = s.kind === "base"
          const bottom = isBase ? 0 : (s.kind === "up" ? run : run + s.v)
          const barH = Math.max(2, yScale(Math.abs(s.v)))
          const node = (
            <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height: H }}>
              <div className="relative w-full" style={{ height: H }}>
                <div className={cn("absolute left-1/2 w-[62%] -translate-x-1/2 rounded-sm", isBase ? "bg-foreground/85" : s.kind === "up" ? "bg-well-500" : "bg-risk-400")}
                  style={{ height: barH, bottom: yScale(isBase ? 0 : bottom) }} />
              </div>
            </div>
          )
          if (!isBase) run += s.v
          else run = s.v
          return node
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="truncate text-[10px] text-ink-300">{s.label}</p>
            <p className={cn("text-[11px] font-medium tabular-nums", s.kind === "down" ? "text-risk-500" : s.kind === "up" ? "text-well-600" : "text-foreground")}>{s.kind === "down" ? "−" : s.kind === "up" ? "+" : ""}{fmt(Math.abs(s.v))}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── generic flow waterfall (e.g. gross bookings → net collected) ─────────────
export function FlowWaterfall({ steps, fmt }: { steps: FlowStep[]; fmt: (n: number) => string }) {
  const maxTop = Math.max(...steps.filter((s) => s.kind === "base").map((s) => Math.abs(s.value))) * 1.06
  const H = 150
  const yScale = (v: number) => (v / maxTop) * H
  let run = 0
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: H }}>
        {steps.map((s, i) => {
          const isBase = s.kind === "base"
          const bottom = isBase ? 0 : (s.kind === "up" ? run : run + s.value)
          const barH = Math.max(2, yScale(Math.abs(s.value)))
          const node = (
            <div key={i} className="relative w-full flex-1" style={{ height: H }}>
              <div className={cn("absolute left-1/2 w-[62%] -translate-x-1/2 rounded-sm", isBase ? "bg-foreground/85" : s.kind === "up" ? "bg-well-500" : "bg-risk-400")} style={{ height: barH, bottom: yScale(isBase ? 0 : bottom) }} />
            </div>
          )
          if (isBase) run = s.value; else run += s.value
          return node
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="truncate text-[10px] text-ink-300">{s.label}</p>
            <p className={cn("text-[11px] font-medium tabular-nums", s.kind === "down" ? "text-risk-500" : "text-foreground")}>{s.kind === "down" ? "−" : ""}{fmt(Math.abs(s.value))}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── acquisition funnel ───────────────────────────────────────────────────────
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0].count
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.count / top) * 100
        const conv = i === 0 ? null : Math.round((s.count / stages[i - 1].count) * 100)
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.count.toLocaleString("en-IN")} <span className="text-ink-300">· {s.note}</span></span>
            </div>
            <div className="mt-1 h-7 overflow-hidden rounded-md bg-secondary">
              <div className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-brand-500/80 to-brand-600 pr-2" style={{ width: `${Math.max(8, pct)}%` }}>
                {conv !== null && <span className="text-[10.5px] font-semibold text-white">{conv}%</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── cohort retention grid ────────────────────────────────────────────────────
export function CohortGrid({ cohorts }: { cohorts: Cohort[] }) {
  const maxCols = Math.max(...cohorts.map((c) => c.retention.length))
  const cell = (r: number) => {
    const a = Math.max(0.06, Math.min(1, r / 100))
    return { backgroundColor: `color-mix(in srgb, var(--color-brand-500) ${Math.round(a * 100)}%, transparent)`, color: r > 55 ? "#fff" : "var(--foreground)" }
  }
  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="pr-2 text-left text-[10px] font-medium uppercase tracking-wide text-ink-300">Cohort</th>
            <th className="pr-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300">n</th>
            {Array.from({ length: maxCols }, (_, m) => <th key={m} className="w-9 text-center text-[10px] font-medium text-ink-300">M{m}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.label}>
              <td className="pr-2 text-[11px] font-medium text-foreground">{c.label}</td>
              <td className="pr-2 text-right text-[11px] tabular-nums text-muted-foreground">{c.size}</td>
              {Array.from({ length: maxCols }, (_, m) => (
                <td key={m} className="h-7 w-9 rounded text-center text-[10.5px] font-medium tabular-nums" style={m < c.retention.length ? cell(c.retention[m]) : { background: "transparent" }}>
                  {m < c.retention.length ? `${c.retention[m]}` : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── donut + segment bars ─────────────────────────────────────────────────────
const DONUT_TONES = ["text-brand-500", "text-mind-500", "text-well-500", "text-warn-500", "text-ink-400", "text-brand-300", "text-mind-300"]
export function Donut({ segments, fmt }: { segments: Segment[]; fmt: (n: number) => string }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const R = 52, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90">
        {segments.map((s, i) => {
          const frac = s.value / total, len = frac * C
          const el = <circle key={i} cx={60} cy={60} r={R} fill="none" strokeWidth={14} className={cn("stroke-current", DONUT_TONES[i % DONUT_TONES.length])} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          offset += len
          return el
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
            <span className={cn("size-2 shrink-0 rounded-full bg-current", DONUT_TONES[i % DONUT_TONES.length])} />
            <span className="flex-1 truncate text-ink-600">{s.label}</span>
            <span className="tabular-nums text-foreground">{fmt(s.value)}</span>
            <span className="w-9 text-right tabular-nums text-ink-300">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SegmentBars({ segments, fmt, tone = "brand" }: { segments: Segment[]; fmt: (n: number) => string; tone?: string }) {
  const max = Math.max(...segments.map((s) => s.value), 1)
  return (
    <div className="space-y-2">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
          <span className="w-24 shrink-0 truncate text-ink-600 sm:w-32">{s.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full", BG[tone])} style={{ width: `${max > 0 ? (s.value / max) * 100 : 0}%` }} /></div>
          <span className="w-16 text-right tabular-nums text-foreground">{fmt(s.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── pacing-to-target bar ─────────────────────────────────────────────────────
export function PaceBar({ pace }: { pace: Pace }) {
  const mtdPct = Math.min(100, (pace.mtd / pace.target) * 100)
  const projPct = Math.min(108, (pace.projected / pace.target) * 100)
  const onTrack = pace.pacePct >= 100
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-foreground">{pace.label}</span>
        <span className={cn("text-[12px] font-semibold tabular-nums", onTrack ? "text-well-600" : "text-warn-600")}>{pace.pacePct}% to target</span>
      </div>
      <div className="relative mt-1.5 h-2.5 rounded-full bg-secondary">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", onTrack ? "bg-well-500" : "bg-warn-500")} style={{ width: `${mtdPct}%` }} />
        <div className="absolute inset-y-[-2px] w-0.5 bg-foreground" style={{ left: `${projPct}%` }} title="projected" />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-300"><span>{pace.fmt(pace.mtd)} so far</span><span>proj {pace.fmt(pace.projected)} / {pace.fmt(pace.target)}</span></div>
    </div>
  )
}

// ── alerts ────────────────────────────────────────────────────────────────────
const SEV: Record<string, string> = { high: "bg-risk-500", medium: "bg-warn-500", info: "bg-mind-500" }
export function AlertList({ alerts, onNav }: { alerts: Alert[]; onNav?: (href: string) => void }) {
  return (
    <div className="divide-y divide-border">
      {alerts.map((a) => (
        <button key={a.id} onClick={() => a.href && onNav?.(a.href)} className="flex w-full items-start gap-3 py-2.5 text-left hover:bg-secondary/40">
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", SEV[a.severity])} />
          <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-foreground">{a.title}</p><p className="text-[12px] text-muted-foreground">{a.detail}</p></div>
        </button>
      ))}
    </div>
  )
}

// ── forecast chart (history + projected band) ────────────────────────────────
export function ForecastChart({ data, fc, labels, futureLabels, tone = "brand", height = 200 }: {
  data: number[]; fc: { proj: number[]; lo: number[]; hi: number[] }; labels: string[]; futureLabels: string[]; tone?: string; height?: number
}) {
  const W = 600, H = height
  if (data.length < 2) return <div style={{ height }} className="grid place-items-center text-[12px] text-ink-300">Not enough data</div>
  const all = [...data, ...fc.hi, ...fc.lo]
  const min = Math.min(...all), max = Math.max(...all)
  const pad = Math.max((max - min) * 0.14, Math.abs(max) * 0.02, 1)
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad, hi = max + pad
  const n = data.length + fc.proj.length
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  const hist = data.map((v, i) => `${x(i)},${y(v)}`).join(" ")
  const projPts = [data[data.length - 1], ...fc.proj].map((v, i) => `${x(data.length - 1 + i)},${y(v)}`).join(" ")
  const bandTop = fc.hi.map((v, i) => `${x(data.length + i)},${y(v)}`)
  const bandBot = fc.lo.map((v, i) => `${x(data.length + i)},${y(v)}`).reverse()
  const band = [`${x(data.length - 1)},${y(data[data.length - 1])}`, ...bandTop, ...bandBot].join(" ")
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        <polygon points={band} className={FILL[tone]} stroke="none" />
        <polyline points={hist} fill="none" className={STROKE[tone]} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={projPts} fill="none" className={STROKE[tone]} strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-300"><span>{labels[0]}</span><span className="text-foreground/60">now</span><span>{futureLabels[futureLabels.length - 1]} (proj)</span></div>
    </div>
  )
}

// ── radial gauge (0–100) ──────────────────────────────────────────────────────
export function GaugeArc({ pct, label, tone = "brand", caption }: { pct: number; label: string; tone?: string; caption?: string }) {
  const R = 46, len = Math.PI * R, dash = (Math.min(100, pct) / 100) * len
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 68" className="w-full max-w-[160px]">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" className="stroke-secondary" strokeWidth={10} strokeLinecap="round" />
        <path d="M14,60 A46,46 0 0 1 106,60" fill="none" className={STROKE[tone]} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${dash} ${len}`} />
        <text x={60} y={54} textAnchor="middle" className="fill-foreground font-display text-[22px] font-semibold tabular-nums">{pct}%</text>
      </svg>
      <p className="-mt-1 text-[12px] font-medium text-foreground">{label}</p>
      {caption && <p className="text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  )
}

// ── segmentation filter (re-scopes widgets, localStorage-backed) ─────────────
const AKEY = "smc.admin.seg.aud", TKEY = "smc.admin.seg.tier"
let aud = (() => { try { return localStorage.getItem(AKEY) || "all" } catch { return "all" } })()
let tier = (() => { try { return localStorage.getItem(TKEY) || "all" } catch { return "all" } })()
const slisteners = new Set<() => void>()
const semit = () => slisteners.forEach((l) => l())
function setAud(id: string) { aud = id; try { localStorage.setItem(AKEY, id) } catch { /* */ } semit() }
function setTier(id: string) { tier = id; try { localStorage.setItem(TKEY, id) } catch { /* */ } semit() }
const subS = (l: () => void) => { slisteners.add(l); return () => { slisteners.delete(l) } }
const factorOf = (opts: SegFilter[], id: string) => opts.find((o) => o.id === id)?.factor ?? 1

export function useSegFactor(): number {
  const a = useSyncExternalStore(subS, () => aud, () => aud)
  const t = useSyncExternalStore(subS, () => tier, () => tier)
  return factorOf(SEG_AUDIENCE, a) * factorOf(SEG_TIER, t)
}
export function SegFilterBar() {
  const a = useSyncExternalStore(subS, () => aud, () => aud)
  const t = useSyncExternalStore(subS, () => tier, () => tier)
  const sel = "h-8 rounded-full border border-border bg-card px-2.5 text-[12px] font-medium text-foreground outline-none"
  return (
    <div className="flex items-center gap-2">
      <select value={a} onChange={(e) => setAud(e.target.value)} className={sel}>{SEG_AUDIENCE.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      <select value={t} onChange={(e) => setTier(e.target.value)} className={sel}>{SEG_TIER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
    </div>
  )
}

// ── per-widget CSV export ─────────────────────────────────────────────────────
export function ExportButton({ filename, rows }: { filename: string; rows: (string | number)[][] }) {
  const onClick = () => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }
  return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"><Download className="size-3" /> Export</button>
}
