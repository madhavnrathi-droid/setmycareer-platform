import { useEffect, useRef } from "react"
import { gsap, prefersReducedMotion, EASE } from "@/lib/gsap"
import type { VizTone, RingDatum } from "@/lib/types"
import { cn } from "@/lib/utils"

const TONE_VAR: Record<VizTone, string> = {
  brand: "var(--color-brand-500)",
  well: "var(--color-well-600)",
  mind: "var(--color-mind-500)",
  warn: "var(--color-warn-600)",
  risk: "var(--color-risk-500)",
  ink: "var(--color-foreground)",
}
const TONE_DOT: Record<VizTone, string> = {
  brand: "bg-brand-500", well: "bg-well-600", mind: "bg-mind-500",
  warn: "bg-warn-600", risk: "bg-risk-500", ink: "bg-foreground",
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/* Apple-Fitness-style concentric rings. Each ring is a tinted track + a
   gradient progress arc (rounded cap), drawn left-to-right on reveal with a
   staggered GSAP sweep. Skips to end-state under reduced-motion. */
export function ActivityRings({
  rings, size = 148, stroke = 13, gap = 5, centerLabel, centerSub, className,
}: {
  rings: RingDatum[]
  size?: number
  stroke?: number
  gap?: number
  centerLabel?: string
  centerSub?: string
  className?: string
}) {
  const uid = useRef(`rings-${Math.random().toString(36).slice(2, 8)}`).current
  const arcRefs = useRef<(SVGCircleElement | null)[]>([])

  // geometry: outermost ring first, each inner ring inset by stroke + gap
  const geom = rings.map((ring, i) => {
    const r = (size - stroke) / 2 - i * (stroke + gap)
    const circ = 2 * Math.PI * r
    const frac = clamp01(ring.max > 0 ? ring.value / ring.max : 0)
    return { r, circ, offset: circ * (1 - frac) }
  })

  useEffect(() => {
    if (prefersReducedMotion()) {
      arcRefs.current.forEach((el, i) => { if (el) el.style.strokeDashoffset = String(geom[i].offset) })
      return
    }
    const tweens = arcRefs.current.map((el, i) =>
      el
        ? gsap.fromTo(
            el,
            { strokeDashoffset: geom[i].circ },
            { strokeDashoffset: geom[i].offset, duration: 0.95, ease: EASE.quart, delay: i * 0.09 },
          )
        : undefined,
    )
    return () => tweens.forEach((t) => t?.kill())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings.map((r) => `${r.value}/${r.max}`).join("|")])

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            {rings.map((ring, i) => {
              const base = TONE_VAR[ring.tone]
              return (
                <linearGradient key={ring.key} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={`color-mix(in oklab, ${base} 72%, white)`} />
                  <stop offset="100%" stopColor={base} />
                </linearGradient>
              )
            })}
          </defs>
          {geom.map((g, i) => (
            <circle
              key={`track-${rings[i].key}`}
              cx={size / 2} cy={size / 2} r={g.r} fill="none" strokeWidth={stroke}
              stroke={TONE_VAR[rings[i].tone]} strokeOpacity={0.14}
            />
          ))}
          {geom.map((g, i) => (
            <circle
              key={`arc-${rings[i].key}`}
              ref={(el) => { arcRefs.current[i] = el }}
              cx={size / 2} cy={size / 2} r={g.r} fill="none" strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={g.circ} strokeDashoffset={g.circ}
              stroke={`url(#${uid}-${i})`}
            />
          ))}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-[19px] font-light leading-none tabular-nums text-foreground">{centerLabel}</div>
              {centerSub && <div className="mt-0.5 text-[8.5px] font-medium uppercase tracking-wider text-ink-300">{centerSub}</div>}
            </div>
          </div>
        )}
      </div>

      <ul className="flex min-w-0 flex-col gap-2.5">
        {rings.map((ring) => (
          <li key={ring.key} className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[ring.tone])} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">{ring.label}</span>
            <span className="shrink-0 font-display text-[14px] font-light tabular-nums text-foreground">{ring.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
