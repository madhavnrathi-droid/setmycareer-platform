import { useEffect, useRef } from "react"
import { gsap, prefersReducedMotion, EASE } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Thin SVG score ring (REF-B). Mono track, accent/semantic progress, GSAP draw +
   count-up (skips to end-state under reduced-motion). */
export function ScoreRing({
  value, size = 76, stroke = 5, sublabel, tone = "auto", className,
}: {
  value: number | null
  size?: number
  stroke?: number
  sublabel?: string
  /** "auto" = score semantics (low reads as concerning: red/amber/brand).
   *  "progress" = completeness (low just means early) — always the brand accent,
   *  so a fresh 0–44% reads as a starting line, not an alarm. */
  tone?: "auto" | "progress"
  className?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const v = value ?? 0
  const toneClass =
    tone === "progress" ? "stroke-brand-500"
    : value == null ? "stroke-ink-200"
    : v >= 70 ? "stroke-brand-500"
    : v >= 45 ? "stroke-warn-600"
    : "stroke-risk-500"

  const arcRef = useRef<SVGCircleElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const arc = arcRef.current
    const num = numRef.current
    if (!arc) return
    const offset = circ * (1 - v / 100)
    if (prefersReducedMotion()) {
      arc.style.strokeDashoffset = String(offset)
      if (num) num.textContent = value == null ? "—" : String(v)
      return
    }
    const a = gsap.fromTo(arc, { strokeDashoffset: circ }, { strokeDashoffset: offset, duration: 0.9, ease: EASE.quart })
    let b: gsap.core.Tween | undefined
    if (num) {
      if (value == null) num.textContent = "—"
      else { const o = { n: 0 }; b = gsap.to(o, { n: v, duration: 0.9, ease: EASE.quart, onUpdate: () => { num.textContent = String(Math.round(o.n)) } }) }
    }
    return () => { a.kill(); b?.kill() }
  }, [v, value, circ])

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-100" />
        <circle
          ref={arcRef} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} className={cn("transition-colors", toneClass)}
        />
      </svg>
      <div className="absolute text-center">
        <span ref={numRef} className="font-display text-[18px] font-light leading-none tabular-nums text-foreground">
          {value ?? "—"}
        </span>
        {sublabel && <div className="mt-0.5 text-[8.5px] font-medium uppercase tracking-wider text-ink-300">{sublabel}</div>}
      </div>
    </div>
  )
}
