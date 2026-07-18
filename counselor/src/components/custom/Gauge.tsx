import { useEffect, useRef } from "react"
import { gsap, prefersReducedMotion, EASE } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Tick-marked radial gauge / activity ring (REF: Apple-Watch activity ring +
   DNAm-age semicircle dial "90 · Grade A"). A mono ink-100 track with fine tick
   marks around the dial and a progress arc in brand-500 (or a passed semantic
   tone). Big bold center number (Montserrat extralight) + unit + an optional band
   label. GSAP sweeps the arc and counts the number up on mount; under
   reduced-motion it renders at the end-state. Accessible via role=img +
   aria-label carrying value/max/label.

   variants:
     • radial — full 360° ring, number centered
     • arc    — 180° semicircle dial, number sits at the base
     • ring   — full 360° activity-ring: thicker rounded arc, fine ticks, a
                soft inner halo on the active arc and a bold number. The
                "quietly addictive" hero dial. */

type GaugeTone = "brand" | "well" | "risk" | "mind" | "warn" | "ink"

const TONE_STROKE: Record<GaugeTone, string> = {
  brand: "var(--color-brand-500)",
  well: "var(--color-well-600)",
  risk: "var(--color-risk-500)",
  mind: "var(--color-mind-500)",
  warn: "var(--color-warn-600)",
  ink: "var(--color-foreground)",
}

export function Gauge({
  value,
  max = 100,
  label,
  unit,
  band,
  size = 140,
  stroke,
  tone = "brand",
  variant = "radial",
  ticks = 0,
  track = true,
  className,
  centerClassName,
}: {
  value: number | null
  max?: number
  label?: string
  unit?: string
  band?: string
  size?: number
  /** ring weight; defaults sensibly per variant */
  stroke?: number
  tone?: GaugeTone
  variant?: "radial" | "arc" | "ring"
  /** number of fine tick marks around the dial; 0 = none */
  ticks?: number
  /** show the faint background track ring (default true) */
  track?: boolean
  className?: string
  /** override classes on the centered number stack */
  centerClassName?: string
}) {
  const isArc = variant === "arc"
  const isRing = variant === "ring"
  const sw = stroke ?? (isRing ? Math.max(7, Math.round(size * 0.075)) : 8)
  const v = value ?? 0
  const pct = Math.max(0, Math.min(1, max ? v / max : 0))

  const r = (size - sw) / 2
  const cx = size / 2
  // radial/ring: full ring centered vertically; arc: only the top half
  const height = isArc ? Math.round(size / 2 + sw) : size
  const cy = isArc ? size / 2 : size / 2

  // sweep lengths — radial/ring full circumference, arc half circumference
  const fullCirc = 2 * Math.PI * r
  const sweep = isArc ? fullCirc / 2 : fullCirc
  const dashArray = isArc ? `${sweep} ${fullCirc}` : fullCirc
  const targetOffset = sweep * (1 - pct)

  // arc starts at the left (180°) and sweeps clockwise across the top to 360°;
  // ring/radial start at 12 o'clock and sweep clockwise.
  const arcTransform = isArc
    ? `rotate(180 ${cx} ${cy})`
    : `rotate(-90 ${cx} ${cy})`

  const tone1 = TONE_STROKE[tone]
  const arcRef = useRef<SVGCircleElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const gid = useRef(`gauge-${Math.random().toString(36).slice(2, 9)}`).current

  useEffect(() => {
    const arc = arcRef.current
    const num = numRef.current
    const halo = haloRef.current
    if (!arc) return
    if (prefersReducedMotion()) {
      arc.style.strokeDashoffset = String(targetOffset)
      if (halo) halo.style.strokeDashoffset = String(targetOffset)
      if (num) num.textContent = value == null ? "—" : String(Math.round(v))
      return
    }
    const a = gsap.fromTo(
      [arc, halo].filter(Boolean) as SVGCircleElement[],
      { strokeDashoffset: sweep },
      { strokeDashoffset: targetOffset, duration: 1, ease: EASE.quart },
    )
    let b: gsap.core.Tween | undefined
    if (num) {
      if (value == null) num.textContent = "—"
      else {
        const o = { n: 0 }
        b = gsap.to(o, {
          n: v, duration: 1, ease: EASE.quart,
          onUpdate: () => { num.textContent = String(Math.round(o.n)) },
        })
      }
    }
    return () => { a.kill(); b?.kill() }
  }, [v, value, sweep, targetOffset])

  // optional fine tick marks around the dial
  const tickEls: React.ReactNode[] = []
  if (ticks > 0) {
    const span = isArc ? Math.PI : 2 * Math.PI // radians of dial
    const start = isArc ? Math.PI : -Math.PI / 2 // left for arc, top for radial/ring
    const gap = isRing ? sw * 0.62 : 3
    const len = isRing ? 3 : 4
    const inner = r - sw / 2 - gap - len
    const outer = r - sw / 2 - gap
    // ring closes the circle; don't double-draw the seam tick
    const count = isArc ? ticks : ticks
    for (let i = 0; i <= count; i++) {
      if (!isArc && i === count) break
      const ang = start + (span * i) / ticks
      const x1 = cx + Math.cos(ang) * outer
      const y1 = cy + Math.sin(ang) * outer
      const x2 = cx + Math.cos(ang) * inner
      const y2 = cy + Math.sin(ang) * inner
      // tint ticks that fall under the active arc in the tone, faintly
      const under = ticks ? i / ticks <= pct : false
      tickEls.push(
        <line
          key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={isRing && under ? tone1 : "var(--color-ink-200)"}
          strokeOpacity={isRing && under ? 0.55 : 1}
          strokeWidth={1} strokeLinecap="round"
        />,
      )
    }
  }

  const aria = `${label ? `${label}: ` : ""}${value == null ? "no value" : `${Math.round(v)}${unit ? ` ${unit}` : ""} of ${max}`}${band ? `, ${band}` : ""}`

  const numSize = isRing ? Math.round(size * 0.3) : Math.round(size * 0.26)

  return (
    <div
      role="img"
      aria-label={aria}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height }}
    >
      <svg width={size} height={height} className="overflow-visible">
        {isRing && (
          <defs>
            <filter id={gid} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={sw * 0.45} />
            </filter>
          </defs>
        )}
        {/* track */}
        {track && (
          <circle
            cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw}
            strokeLinecap="round"
            className="stroke-ink-100"
            strokeDasharray={dashArray}
            transform={arcTransform}
          />
        )}
        {/* soft halo behind the active arc (ring only) */}
        {isRing && value != null && (
          <circle
            ref={haloRef}
            cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw}
            strokeLinecap="round"
            stroke={tone1}
            strokeOpacity={0.28}
            strokeDasharray={dashArray}
            strokeDashoffset={sweep}
            transform={arcTransform}
            filter={`url(#${gid})`}
          />
        )}
        {/* progress */}
        <circle
          ref={arcRef}
          cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw}
          strokeLinecap="round"
          stroke={tone1}
          strokeDasharray={dashArray}
          strokeDashoffset={sweep}
          transform={arcTransform}
        />
        {ticks > 0 && tickEls}
      </svg>

      {/* center stack */}
      <div
        className={cn(
          "absolute flex flex-col items-center text-center",
          isArc ? "bottom-0" : "inset-0 justify-center",
          centerClassName,
        )}
        style={isArc ? { left: 0, right: 0 } : undefined}
      >
        <div className="flex items-baseline justify-center gap-0.5">
          <span
            ref={numRef}
            className="font-display font-extralight leading-none tracking-tight tabular-nums text-foreground"
            style={{ fontSize: numSize }}
          >
            {value ?? "—"}
          </span>
          {unit && (
            <span className="font-display text-[12px] font-light text-ink-300">{unit}</span>
          )}
        </div>
        {band && (
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
            {band}
          </div>
        )}
        {label && !band && (
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
