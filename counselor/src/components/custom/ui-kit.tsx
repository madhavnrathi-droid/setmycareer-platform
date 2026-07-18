// The shared premium UI kit — the card-and-chip language every dashboard
// (client portal, counsellor console, admin) draws from, so the same object
// looks the same wherever the three sides talk about it.
//
// The vocabulary (from the product's reference set):
//   · PANE        soft rounded surface — hairline ring + low wide shadow
//   · Chip        full-round pill: tinted fill, or DASHED outline for
//                 tentative/pending things (a signature of the language)
//   · TINT        soft colour fills for cards that carry state (confirmed /
//                 pending / attention) — mature token tints, never neon
//   · AvatarStack overlapping member circles with a +N tail
//   · RoundAction the circular icon button cluster (join / dismiss / open)
//   · DotMatrix   the little dot-grid stat graphic (n of cap filled)
//
// Everything uses the app's existing tokens (brand/mind/well/warn/ink) so the
// kit inherits theme changes for free.

import { useId, type ComponentType, type ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/* ── surfaces ─────────────────────────────────────────────────────────────── */

export const PANE =
  "rounded-[20px] bg-card ring-1 ring-[rgba(24,24,27,0.06)] shadow-[0_1px_2px_rgba(24,24,27,0.03),0_12px_32px_-20px_rgba(24,24,27,0.20)]"

export function Pane({ children, className }: { children: ReactNode; className?: string }) {
  return <section data-reveal className={cn(PANE, "p-5 sm:p-6", className)}>{children}</section>
}

// small mono eyebrow that heads a section — structure without a box
export function Eyebrow({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">{children}</p>
      {right}
    </div>
  )
}

/* ── chips ────────────────────────────────────────────────────────────────── */

export type ChipTone =
  | "neutral" | "brand" | "well" | "warn" | "mind" | "risk"
  | "dark" | "outline" | "dashed"

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-secondary text-ink-600",
  brand: "bg-brand-50 text-brand-700",
  well: "bg-well-50 text-well-700",
  warn: "bg-warn-100 text-warn-700",
  mind: "bg-mind-50 text-mind-700",
  risk: "bg-risk-100/60 text-risk-600",
  dark: "bg-foreground text-background",
  outline: "border border-border bg-card text-ink-600",
  // the tentative/pending signature — dashed outline, no fill
  dashed: "border border-dashed border-ink-200 bg-transparent text-ink-500",
}

export function Chip({
  children, tone = "neutral", icon: Icon, className,
}: {
  children: ReactNode
  tone?: ChipTone
  icon?: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
      CHIP_TONES[tone], className,
    )}>
      {Icon && <Icon className="size-3 shrink-0 stroke-[1.75]" />}
      {children}
    </span>
  )
}

/* ── tinted state cards (the queue-card fills) ────────────────────────────── */

export type TintTone = "brand" | "well" | "warn" | "mind" | "neutral"

export const TINTS: Record<TintTone, string> = {
  brand: "bg-brand-50/70 ring-1 ring-brand-100",
  well: "bg-well-50/70 ring-1 ring-well-100",
  warn: "bg-warn-100/50 ring-1 ring-warn-100",
  mind: "bg-mind-50/70 ring-1 ring-mind-100",
  neutral: "bg-secondary/60 ring-1 ring-border",
}

/* ── people ───────────────────────────────────────────────────────────────── */

export interface AvatarSpec {
  initials: string
  img?: string
  tone?: "brand" | "mind" | "well" | "ink"
}

const AVATAR_TONES = {
  brand: "bg-brand-600 text-white",
  mind: "bg-mind-600 text-white",
  well: "bg-well-600 text-white",
  ink: "bg-foreground text-background",
}

export function AvatarStack({ people, size = 8, max = 3, className }: {
  people: AvatarSpec[]
  /** tailwind size unit (8 → size-8) */
  size?: 7 | 8 | 9 | 11
  max?: number
  className?: string
}) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const sz = { 7: "size-7 text-[10px]", 8: "size-8 text-[11px]", 9: "size-9 text-[12px]", 11: "size-11 text-[14px]" }[size]
  return (
    <span className={cn("flex items-center", className)}>
      {shown.map((p, i) => (
        <span key={`${p.initials}-${i}`} className={cn("relative overflow-hidden rounded-full ring-2 ring-card", sz, i > 0 && "-ml-2")} style={{ zIndex: shown.length - i }}>
          {p.img ? (
            <img src={p.img} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
          ) : (
            <span className={cn("grid h-full w-full place-items-center font-semibold", AVATAR_TONES[p.tone ?? "brand"])}>{p.initials}</span>
          )}
        </span>
      ))}
      {extra > 0 && (
        <span className={cn("z-0 -ml-2 grid place-items-center rounded-full bg-secondary font-medium text-ink-600 ring-2 ring-card", sz)}>+{extra}</span>
      )}
    </span>
  )
}

/* ── round action buttons (the coloured circle cluster) ───────────────────── */

export type ActionTone = "brand" | "well" | "warn" | "risk" | "dark" | "ghost"

const ACTION_TONES: Record<ActionTone, string> = {
  brand: "bg-brand-600 text-white hover:bg-brand-700",
  well: "bg-well-600 text-white hover:bg-well-700",
  warn: "bg-warn-500 text-white hover:bg-warn-600",
  risk: "bg-risk-100/60 text-risk-600 hover:bg-risk-100",
  dark: "bg-foreground text-background hover:opacity-90",
  ghost: "bg-secondary text-ink-600 hover:bg-muted",
}

export function RoundAction({
  icon: Icon, label, onClick, tone = "ghost", className,
}: {
  icon: ComponentType<{ className?: string }>
  /** accessible name — these buttons are icon-only by design */
  label: string
  onClick?: () => void
  tone?: ActionTone
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("grid size-9 shrink-0 place-items-center rounded-full transition", ACTION_TONES[tone], className)}
    >
      <Icon className="size-4 stroke-[1.75]" />
    </button>
  )
}

/* ── the dot-matrix stat graphic ──────────────────────────────────────────── */

export function DotMatrix({ filled, total = 40, cols = 10, className }: {
  filled: number
  total?: number
  cols?: number
  className?: string
}) {
  const n = Math.max(0, Math.min(filled, total))
  return (
    <div className={cn("grid w-fit gap-1.5", className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i < n ? "bg-foreground" : "bg-ink-100")} />
      ))}
    </div>
  )
}

/* ── time range pill (15:00 – 16:00) ──────────────────────────────────────── */

export function timeRange(startISO: string, durationMin: number): string {
  const s = new Date(startISO)
  const e = new Date(s.getTime() + durationMin * 60000)
  const f = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${f(s)} – ${f(e)}`
}

/* ══════════════════════════════════════════════════════════════════════════
   JOB-MATCH VOCABULARY — the premium data-viz the founder's references live on:
   circular match gauges, pay-band rails, demand sparklines, AI-exposure reads
   and the dark "job match" card. The energy accent is a controlled LIME that
   only ever means "strong / rising" — it is not a global recolour.
   ══════════════════════════════════════════════════════════════════════════ */

// the match/rising energy accent — vivid lime→emerald, used only on gauges and
// rising signals so it reads as meaning, not decoration
export const SIGNAL = { lime: "#b8f13a", emerald: "#10b981", amber: "#f59e0b" }

function bandStops(v: number): [string, string] {
  if (v >= 66) return [SIGNAL.emerald, SIGNAL.lime]   // strong — the lime pop
  if (v >= 34) return ["#d97706", SIGNAL.amber]        // fair — amber
  return ["#94a3b8", "#cbd5e1"]                        // low — cool grey
}

/* ── FitGauge — the big circular "% match" ring (the Orion 79% gauge) ──────── */
export function FitGauge({
  value, size = 118, stroke = 9, label, sub, dark = false, className,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  sub?: string
  dark?: boolean
  className?: string
}) {
  const gid = useId()
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [c0, c1] = bandStops(v)
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`fg-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c0} />
            <stop offset="100%" stopColor={c1} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={dark ? "rgba(255,255,255,0.10)" : "var(--color-ink-100)"} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" stroke={`url(#fg-${gid})`}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute text-center">
        <span className={cn("font-display font-semibold leading-none tabular-nums", dark ? "text-white" : "text-foreground")}
          style={{ fontSize: size * 0.28 }}>{v}<span className="text-[0.5em] font-medium opacity-60">%</span></span>
        {label && <div className={cn("mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em]", dark ? "text-white/55" : "text-ink-300")}>{label}</div>}
      </div>
      {sub && <span className="sr-only">{sub}</span>}
    </div>
  )
}

/* ── PayBand — a salary range rail (entry → senior, LPA) ───────────────────── */
export function PayBand({ lo, hi, max = 60, dark = false, className }: {
  lo: number; hi: number; max?: number; dark?: boolean; className?: string
}) {
  const a = Math.max(0, Math.min(1, lo / max))
  const b = Math.max(0, Math.min(1, hi / max))
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("relative h-2 w-full overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-ink-100")}>
        {/* a salary range is NOT a fit signal — keep the reserved lime/emerald
            exclusive to the FitGauge and rising DemandSpark, fill this neutral */}
        <span
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${a * 100}%`, right: `${(1 - b) * 100}%`, background: dark ? "rgba(255,255,255,0.72)" : "var(--color-foreground)" }}
        />
      </div>
      <div className={cn("mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums", dark ? "text-white/60" : "text-ink-400")}>
        <span>₹{lo}L</span>
        <span className={dark ? "text-white/55" : "text-ink-300"}>entry → senior</span>
        <span>₹{hi}L</span>
      </div>
    </div>
  )
}

/* ── DemandSpark — a 10-year demand sparkline with the last point lit + a % ── */
export function DemandSpark({ series, pct, dark = false, w = 96, h = 30, label }: {
  series: number[]; pct: number; dark?: boolean; w?: number; h?: number; label?: string
}) {
  if (series.length < 2) return null
  const min = Math.min(...series), max = Math.max(...series), span = max - min || 1
  const up = pct >= 0
  const stroke = up ? SIGNAL.emerald : "#ef4444"
  const x = (i: number) => (i / (series.length - 1)) * (w - 4) + 2
  const y = (val: number) => h - 3 - ((val - min) / span) * (h - 6)
  const pts = series.map((val, i) => `${x(i)},${y(val)}`).join(" ")
  const last = series.length - 1
  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="shrink-0" style={{ width: w, height: h }} preserveAspectRatio="none" aria-hidden>
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(last)} cy={y(series[last])} r={2.4} fill={stroke} />
      </svg>
      <span className={cn("font-mono text-[11px] font-semibold tabular-nums",
        up ? (dark ? "text-[#34d399]" : "text-well-600") : (dark ? "text-[#f87171]" : "text-risk-600"))}>
        {up ? "+" : ""}{Math.round(pct)}%{label ? <span className={cn("ml-1 font-normal", dark ? "text-white/45" : "text-ink-300")}>{label}</span> : null}
      </span>
    </div>
  )
}

/* ── AiExposure — the 1–3 dot read with a word ────────────────────────────── */
export function AiExposure({ level, dark = false }: { level: number | null; dark?: boolean }) {
  const word = level == null ? "—" : level >= 3 ? "High" : level === 2 ? "Moderate" : "Low"
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`AI exposure: ${word}`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className="size-1.5 rounded-full" style={{
            background: level != null && i <= level
              ? (level >= 3 ? SIGNAL.amber : dark ? "rgba(255,255,255,0.85)" : "var(--color-ink-500)")
              : dark ? "rgba(255,255,255,0.20)" : "var(--color-ink-200)",
          }} />
        ))}
      </span>
      <span className={cn("text-[11px]", dark ? "text-white/60" : "text-ink-400")}>AI: {word}</span>
    </span>
  )
}

/* ── the career data a match card needs — plain props, no portal types, so the
      kit stays dependency-free and the screens map their Row → this ── */
export interface CareerViz {
  name: string
  cluster: string
  oneLine?: string
  fitPct?: number          // present only for the member's matched target
  band?: string
  payLo: number
  payHi: number
  demand: number[]         // the 10-year demand series
  demandPct: number        // trendPctOf
  aiLevel: number | null
  to?: string              // where the card links
}

/* ── MarketRow — a career as a scannable row: mini fit gauge, name, pay, demand
      (the Orion job-list row, portable to Home / Best Fit / What Next) ── */
export function MarketRow({ c, rank }: { c: CareerViz; rank?: number }) {
  const inner = (
    <div className="group flex items-center gap-3.5 py-3">
      {c.fitPct != null ? (
        <FitGauge value={c.fitPct} size={44} stroke={4} className="shrink-0" />
      ) : rank != null ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[12px] tabular-nums text-ink-500">
          {String(rank).padStart(2, "0")}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-editorial text-[16px] font-normal tracking-tight text-foreground">{c.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{c.cluster} · ₹{c.payLo}–{c.payHi}L</p>
      </div>
      <div className="hidden shrink-0 sm:block"><DemandSpark series={c.demand} pct={c.demandPct} /></div>
      <ArrowUpRight className="size-4 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
    </div>
  )
  return c.to ? <Link to={c.to} className="block">{inner}</Link> : inner
}

/* ── JobMatchCard — the premium hero (the Orion match card). A DARK glass slab
      on the light page: big fit gauge, pay band, demand read, AI exposure and
      cluster tags. Dark by default because that contrast is the whole point. ── */
export function JobMatchCard({
  c, headline, tags = [], action, dark = true,
}: {
  c: CareerViz
  headline?: string
  tags?: string[]
  action?: ReactNode
  dark?: boolean
}) {
  return (
    <div className={cn(
      "relative isolate overflow-hidden rounded-[24px] p-5 sm:p-7",
      dark ? "bg-[#101317] text-white ring-1 ring-white/10" : "bg-card text-foreground ring-1 ring-[rgba(24,24,27,0.06)]",
    )}>
      {/* a soft lime aura, top-right — the reference's energy glow, dialled low */}
      {dark && (
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-[0.16] blur-3xl"
          style={{ background: `radial-gradient(circle, ${SIGNAL.lime}, transparent 70%)` }} />
      )}
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        {c.fitPct != null ? (
          <FitGauge value={c.fitPct} size={132} stroke={11} label="Fit" dark={dark} />
        ) : (
          // no interest test yet → never fake a %; show an honest locked dial
          <div className="grid size-[132px] shrink-0 place-items-center rounded-full border border-dashed"
            style={{ borderColor: dark ? "rgba(255,255,255,0.2)" : "var(--color-ink-200)" }}>
            <div className="text-center">
              <span className={cn("font-display text-[34px] font-light leading-none", dark ? "text-white/40" : "text-ink-300")}>—</span>
              <p className={cn("mt-1 max-w-[88px] text-[9px] leading-tight", dark ? "text-white/45" : "text-ink-400")}>fit unlocks with the interest test</p>
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {headline && <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.16em]", dark ? "text-white/50" : "text-ink-300")}>{headline}</p>}
          <p className="mt-1.5 font-editorial text-[27px] font-light leading-tight tracking-tight sm:text-[31px]">{c.name}</p>
          <p className={cn("mt-1 text-[12.5px]", dark ? "text-white/60" : "text-muted-foreground")}>{c.cluster}{c.band ? ` · ${c.band} fit` : ""}</p>

          <div className="mt-4 max-w-[340px]"><PayBand lo={c.payLo} hi={c.payHi} dark={dark} /></div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <DemandSpark series={c.demand} pct={c.demandPct} dark={dark} label="10-yr demand" />
            <AiExposure level={c.aiLevel} dark={dark} />
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                  dark ? "bg-white/10 text-white/80" : "bg-secondary text-ink-600")}>{t}</span>
              ))}
            </div>
          )}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── GlassStat — a big-number stat card with delta + optional sparkbars ────── */
export function GlassStat({ label, value, unit, delta, bars, className }: {
  label: string; value: string; unit?: string; delta?: number; bars?: number[]; className?: string
}) {
  return (
    <div className={cn("rounded-2xl bg-card p-4 ring-1 ring-[rgba(24,24,27,0.06)]", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        {delta != null && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
            delta >= 0 ? "bg-well-50 text-well-700" : "bg-risk-100/60 text-risk-600")}>
            {delta >= 0 ? "↗" : "↘"} {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <p className="mt-1.5 font-display text-[27px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}{unit && <span className="ml-0.5 text-[0.5em] font-medium text-ink-400">{unit}</span>}
      </p>
      {bars && bars.length > 1 && (() => {
        const mx = Math.max(...bars, 1)
        return (
          <div className="mt-3 flex h-7 items-end gap-[3px]">
            {bars.map((b, i) => (
              <span key={i} className={cn("w-1 rounded-[2px]", i === bars.length - 1 ? "bg-well-500" : "bg-ink-200")}
                style={{ height: `${Math.max(12, (b / mx) * 100)}%` }} />
            ))}
          </div>
        )
      })()}
    </div>
  )
}
