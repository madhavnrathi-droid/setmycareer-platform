import { useId } from "react"
import type { CareerRoute } from "@/lib/report-content"
import { useGsap, gsap, EASE, DUR, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* ── FutureScenarios ──────────────────────────────────────────────────────────
   The modelled routes presented as divergent FUTURE SCENARIOS — forking paths
   radiating from a shared "today" point, each card carrying a probability ring,
   horizon, fitTag and a one-line essence (the first sentence of its rationale).
   Cinematic but honest: the lead route is quietly elevated, the long-shots are
   kept open rather than dismissed.

   Report visual language: a small SVG "fork" header that branches from one origin
   into N routes (closer/thicker = higher probability), then a responsive set of
   cards each with a brand probability ring. GSAP draws the forks + reveals cards,
   reduced-motion safe, print-friendly (break-avoid per card). */

const firstSentence = (s: string) => {
  const m = s.match(/^[^.!?]*[.!?]/)
  return (m ? m[0] : s).trim()
}

export function FutureScenarios({ routes }: { routes: CareerRoute[] }) {
  const ref = useGsap<HTMLDivElement>((scope) => {
    const forks = scope.querySelectorAll<SVGPathElement>("[data-fork]")
    const origin = scope.querySelector<SVGGElement>("[data-origin]")
    const cards = scope.querySelectorAll<HTMLElement>("[data-card]")
    const tl = gsap.timeline()
    if (origin) tl.from(origin, { opacity: 0, scale: 0.6, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft })
    forks.forEach((f) => {
      const len = f.getTotalLength?.() ?? 200
      tl.fromTo(f, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: EASE.quart }, "<+=0.05")
    })
    if (cards.length) tl.from(cards, { opacity: 0, y: 16, duration: DUR.enter, ease: EASE.soft, stagger: 0.08 }, "-=0.4")
  }, [routes.length])

  if (!routes?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-canvas px-6 py-12 text-center text-[13px] text-ink-400">
        Future scenarios appear once the career routes are modelled.
      </div>
    )
  }

  // lead = highest probability (already sorted, but be defensive)
  const lead = routes.reduce((a, b) => (b.probability > a.probability ? b : a), routes[0])

  // fork geometry: a single origin on the left, branching to N endpoints on the right
  const FW = 720
  const FH = 84 + routes.length * 4
  const ox = 26
  const oy = FH / 2

  return (
    <div ref={ref} className="w-full">
      {/* the forking-paths header */}
      <svg viewBox={`0 0 ${FW} ${FH}`} className="block h-auto w-full" aria-hidden role="presentation">
        {/* origin "today" marker */}
        <g data-origin>
          <circle cx={ox} cy={oy} r={11} fill="var(--color-brand-100)" />
          <circle cx={ox} cy={oy} r={4.5} fill="var(--color-brand-500)" />
          <text x={ox} y={oy + 26} textAnchor="middle" className="fill-ink-400" fontSize={8.5} fontWeight={600} letterSpacing="0.1em">
            TODAY
          </text>
        </g>
        {routes.map((r, i) => {
          const ey = 16 + (i * (FH - 32)) / Math.max(1, routes.length - 1)
          const ex = FW - 16
          const cx1 = ox + (ex - ox) * 0.42
          const isLead = r.id === lead.id
          const w = 1 + (r.probability / 100) * 2.4
          return (
            <path
              key={r.id}
              data-fork
              d={`M ${ox} ${oy} C ${cx1} ${oy} ${cx1} ${ey} ${ex} ${ey}`}
              fill="none"
              stroke={isLead ? "var(--color-brand-500)" : "var(--color-ink-300)"}
              strokeOpacity={isLead ? 0.9 : 0.45 + (r.probability / 100) * 0.25}
              strokeWidth={w}
              strokeLinecap="round"
              style={prefersReducedMotion() ? undefined : { strokeDashoffset: 0 }}
            />
          )
        })}
      </svg>

      {/* the scenario cards */}
      <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {routes.map((r) => (
          <ScenarioCard key={r.id} route={r} lead={r.id === lead.id} />
        ))}
      </div>
    </div>
  )
}

function ScenarioCard({ route, lead }: { route: CareerRoute; lead: boolean }) {
  return (
    <article
      data-card
      style={{ breakInside: "avoid" }}
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-[var(--shadow-e1)]",
        lead ? "border-brand-500/40 bg-gradient-to-b from-brand-100/25 to-card" : "border-hairline",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {lead && (
              <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-white">
                Lead
              </span>
            )}
            <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">{route.fitTag}</span>
          </div>
          <h4 className="mt-2 font-display text-[16px] font-medium leading-snug text-ink-900">{route.title}</h4>
        </div>
        <ProbabilityRing value={route.probability} lead={lead} />
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{firstSentence(route.rationale)}</p>

      <div className="mt-auto flex items-center gap-2 pt-4 text-[10.5px] text-ink-400">
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="shrink-0">
          <circle cx={6} cy={6} r={5} fill="none" stroke="currentColor" strokeWidth={1} />
          <path d="M6 3.2 V6 L7.8 7.4" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
        </svg>
        <span>{route.horizon}</span>
      </div>
    </article>
  )
}

/* A soft probability arc/ring — brand for the lead, ink otherwise. */
function ProbabilityRing({ value, lead }: { value: number; lead: boolean }) {
  const uid = useId().replace(/[:]/g, "")
  const size = 46
  const sw = 4
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value)) / 100
  const stroke = lead ? "var(--color-brand-500)" : "var(--color-ink-700)"
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink-100)" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          id={`ring-${uid}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-[14px] font-medium leading-none tabular-nums text-ink-900">{Math.round(value)}</span>
      </div>
    </div>
  )
}
