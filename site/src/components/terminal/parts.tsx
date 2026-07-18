import { useId } from "react"

// Finance primitives for the Career Terminal. Transforms/opacity only. The one
// colour axis is trajectory (purple growth / red decline / blue flat). The line
// itself FLOWS through those hues by its local slope — purple where it climbs,
// red where it falls, blue where it's flat — with intensity scaled to how sharp
// the move is. `hue` (the overall trajectory colour) tints the area wedge + dot.

// per-point gradient stops: hue by local slope, opacity by slope magnitude
export function slopeStops(data: number[]) {
  const n = data.length
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const eps = range * 0.05
  const slope = (i: number) => (n < 2 ? 0 : i === 0 ? data[1] - data[0] : data[i] - data[i - 1])
  const maxAbs = Math.max(1, ...data.map((_, i) => Math.abs(slope(i))))
  const hueOf = (s: number) => (s > eps ? "var(--color-growth)" : s < -eps ? "var(--color-decline)" : "var(--color-flat)")
  const stops = data.map((_, i) => {
    const s = slope(i)
    return { off: n < 2 ? 0 : (i / (n - 1)) * 100, color: hueOf(s), op: 0.68 + 0.32 * Math.min(1, Math.abs(s) / maxAbs) }
  })
  return { stops, endColor: hueOf(slope(n - 1)) }
}

/* sparkline — a demand trendline referenced to its own starting level, its line
   colour flowing by slope (up=purple / down=red / flat=blue) */
export function Spark({ data, w = 120, h = 34, hue = "currentColor", area = false, baseline = true, strong = false, className = "" }: {
  data: number[]; w?: number; h?: number; hue?: string; area?: boolean; baseline?: boolean; strong?: boolean; className?: string
}) {
  const gid = useId()
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 6) - 3] as const)
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
  const last = pts[pts.length - 1]
  const y0 = pts[0][1] // the starting level — the reference line
  // fill the band BETWEEN the line and its starting level, so the wedge itself
  // encodes direction (above start = growth, below = decline)
  const areaPath = `${d} L${last[0].toFixed(1)} ${y0.toFixed(1)} L0 ${y0.toFixed(1)} Z`
  const { stops, endColor } = slopeStops(data)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`s-${gid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
          {stops.map((s, i) => <stop key={i} offset={`${s.off}%`} stopColor={s.color} stopOpacity={s.op} />)}
        </linearGradient>
      </defs>
      {baseline && <line x1="0" y1={y0} x2={w} y2={y0} stroke="rgba(11,11,11,0.22)" strokeWidth="0.5" strokeDasharray="2 2.5" vectorEffect="non-scaling-stroke" />}
      {area && <path d={areaPath} fill={hue} opacity="0.09" />}
      <path d={d} fill="none" stroke={`url(#s-${gid})`} strokeWidth={strong ? 1.8 : 1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={strong ? 2.4 : 2} fill={endColor} />
    </svg>
  )
}

/* directional delta ▲/▼ + percentage. `hue` opts into a trajectory colour;
   omitted, it stays monochrome (editorial contexts). */
export function Delta({ pct, className = "", hue }: { pct: number; className?: string; hue?: string }) {
  const up = pct >= 0
  return (
    <span className={`mono tabular-nums ${className}`} style={hue ? { color: hue } : undefined}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{pct}%
    </span>
  )
}

/* AI-exposure dots (1–3) — "volatility" read, monochrome; paper-toned on dark */
export function ExposureDots({ level, dark = false, className = "" }: { level: number; dark?: boolean; className?: string }) {
  const on = dark ? "bg-paper" : "bg-ink"
  const off = dark ? "bg-paper/30" : "bg-ink/20"
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`AI exposure ${level} of 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={`size-[6px] rounded-full ${i <= level ? on : off}`} />)}
    </span>
  )
}

/* format ₹ LPA range */
export const lpa = (lo: number, hi: number) => `₹${lo}–${hi}L`
