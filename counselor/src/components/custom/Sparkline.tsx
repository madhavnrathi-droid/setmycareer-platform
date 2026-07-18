import { useEffect, useRef } from "react"
import { gsap, prefersReducedMotion, EASE, DUR } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Tiny inline trend (REF stat-card sparklines): an axis-less area + mono line with
   a last-point dot. Hand-drawn SVG so it stays crisp at ~64×24 and we can GSAP a
   left→right line draw on reveal. Truthful — the fill always sits on the series
   baseline (min of the data), never an arbitrary floor; flat series read flat. */

type Tone = "ink" | "brand" | "well" | "risk" | "mind" | "warn"

const STROKE: Record<Tone, string> = {
  ink: "var(--color-foreground)",
  brand: "var(--color-brand-500)",
  well: "var(--color-well-600)",
  risk: "var(--color-risk-500)",
  mind: "var(--color-mind-500)",
  warn: "var(--color-warn-600)",
}

export function Sparkline({
  data,
  tone = "ink",
  width = 64,
  height = 24,
  className,
}: {
  data: number[]
  tone?: Tone
  width?: number
  height?: number
  className?: string
}) {
  const pad = 2
  const w = width - pad * 2
  const h = height - pad * 2

  const n = data.length
  const min = n ? Math.min(...data) : 0
  const max = n ? Math.max(...data) : 1
  const span = max - min || 1

  const x = (i: number) => (n <= 1 ? pad : pad + (i / (n - 1)) * w)
  const y = (val: number) => pad + h - ((val - min) / span) * h

  const pts = data.map((v, i) => [x(i), y(v)] as const)
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(2)} ${py.toFixed(2)}`).join(" ")
  const area = pts.length
    ? `${line} L${pts[pts.length - 1][0].toFixed(2)} ${(height - pad).toFixed(2)} L${pts[0][0].toFixed(2)} ${(height - pad).toFixed(2)} Z`
    : ""
  const last = pts[pts.length - 1]

  const color = STROKE[tone]
  const gid = useRef(`spark-${Math.random().toString(36).slice(2, 9)}`).current
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const el = pathRef.current
    if (!el || prefersReducedMotion()) return
    const len = el.getTotalLength()
    const a = gsap.fromTo(
      el,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: DUR.draw, ease: EASE.soft },
    )
    return () => { a.kill() }
  }, [line])

  if (!n) return null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`Trend sparkline, ${data[0]} to ${data[n - 1]}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.14} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gid})`} stroke="none" />}
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={1.8} fill={color} />}
    </svg>
  )
}
