import { useId } from "react"
import type { TraitRead, ClusterRead } from "@/lib/report-content"
import { useGsap, gsap, EASE, DUR, prefersReducedMotion } from "@/lib/gsap"

/* ── PsychLandscape ───────────────────────────────────────────────────────────
   The inner profile rendered as a soft psychological TERRAIN rather than a
   clinical radar. The Big Five become a range of rolling contour hills — each
   trait a labelled peak whose HEIGHT encodes its value (a strength literally
   rises higher). Layered ridges behind give depth/atmosphere. The clusters float
   above as a quiet constellation of stars, sized by score, so the "landscape +
   sky" reads as one evocative inner world.

   Report visual language: ink-scale terrain, brand accent on the ridge line and
   the brightest star, faint gradient sky, hairline base, GSAP draw of the ridge,
   reduced-motion safe, fully responsive via viewBox, print-friendly. */

const W = 720
const H = 360
const BASE = 300 // ground line
const PEAK_MIN = 60 // y of a value=100 peak (higher value → smaller y → taller)

export function PsychLandscape({
  traits,
  clusters,
}: {
  traits: TraitRead[]
  clusters: ClusterRead[]
}) {
  const uid = useId().replace(/[:]/g, "")
  const reduced = prefersReducedMotion()

  const ref = useGsap<HTMLDivElement>((scope) => {
    const ridge = scope.querySelector<SVGPathElement>("[data-ridge]")
    const labels = scope.querySelectorAll<SVGGElement>("[data-peak]")
    const stars = scope.querySelectorAll<SVGGElement>("[data-star]")
    const tl = gsap.timeline()
    if (ridge) {
      const len = ridge.getTotalLength()
      tl.fromTo(ridge, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.3, ease: EASE.quart })
    }
    if (labels.length) tl.from(labels, { opacity: 0, y: 8, duration: DUR.enter, ease: EASE.soft, stagger: 0.08 }, "-=0.8")
    if (stars.length) tl.from(stars, { opacity: 0, scale: 0.4, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft, stagger: 0.06 }, "-=0.5")
  }, [traits.length, clusters.length])

  if (!traits?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-canvas px-6 py-12 text-center text-[13px] text-ink-400">
        The psychological landscape appears once the personality profile is scored.
      </div>
    )
  }

  // ── lay the Big Five out as evenly-spaced peaks across the range ──────────────
  const n = traits.length
  const pad = W / (n + 1)
  const peaks = traits.map((t, i) => {
    const x = pad * (i + 1)
    const v = Math.max(0, Math.min(100, t.value))
    const y = BASE - ((BASE - PEAK_MIN) * v) / 100
    return { ...t, x, y, v }
  })

  // a smooth ridge through the peaks, with low "valleys" dipping toward the base
  // between adjacent peaks — gives the rolling-hills silhouette.
  const ridgePath = buildRidge(peaks)
  const fillPath = `${ridgePath} L ${W} ${BASE} L 0 ${BASE} Z`

  // a softer, lower back-ridge for atmospheric depth (70% of each peak's height)
  const backPeaks = peaks.map((p) => ({ x: p.x + pad * 0.32, y: BASE - (BASE - p.y) * 0.62 }))
  const backRidge = buildRidge(
    [{ x: 0, y: BASE - 8 }, ...backPeaks, { x: W, y: BASE - 8 }] as { x: number; y: number }[],
    true,
  )
  const backFill = `${backRidge} L ${W} ${BASE} L 0 ${BASE} Z`

  // ── clusters become a constellation in the "sky" above the ridge ─────────────
  const sky = clusters?.length ? clusters : []
  const maxC = Math.max(1, ...sky.map((c) => c.score))
  const stars = sky.map((c, i) => {
    const x = pad * 0.7 + (i * (W - pad * 1.4)) / Math.max(1, sky.length - 1)
    // brighter/bigger clusters sit a touch higher in the sky
    const y = 40 + (1 - c.score / 100) * 26 + ((i % 2) * 14)
    const r = 1.6 + (c.score / 100) * 3.4
    const bright = c.score === maxC
    return { ...c, x, y, r, bright }
  })

  return (
    <figure ref={ref} className="w-full" aria-label="Psychological landscape: personality traits as a terrain of peaks, with cluster strengths as a constellation above.">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b from-brand-100/25 via-card to-ink-050/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
          <defs>
            <linearGradient id={`hill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`hillback-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-ink-400)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="var(--color-ink-400)" stopOpacity={0} />
            </linearGradient>
            <radialGradient id={`star-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* sky constellation — faint links + stars (clusters) */}
          {stars.length > 1 && (
            <polyline
              points={stars.map((s) => `${s.x},${s.y}`).join(" ")}
              fill="none"
              stroke="var(--color-ink-300)"
              strokeOpacity={0.35}
              strokeWidth={0.75}
              strokeDasharray="2 4"
            />
          )}
          {stars.map((s) => (
            <g key={s.key} data-star>
              <circle cx={s.x} cy={s.y} r={s.r * 3} fill={`url(#star-${uid})`} />
              <circle cx={s.x} cy={s.y} r={s.r} fill={s.bright ? "var(--color-brand-500)" : "var(--color-ink-400)"} />
              <text x={s.x} y={s.y - s.r - 6} textAnchor="middle" className="fill-ink-400" fontSize={8.5} fontWeight={500}>
                {s.label}
              </text>
              <text x={s.x} y={s.y - s.r - 6 - 9} textAnchor="middle" className="fill-ink-300 tabular-nums" fontSize={7.5}>
                {s.score}
              </text>
            </g>
          ))}

          {/* back ridge (depth) */}
          <path d={backFill} fill={`url(#hillback-${uid})`} />
          <path d={backRidge} fill="none" stroke="var(--color-ink-300)" strokeOpacity={0.5} strokeWidth={1} />

          {/* main terrain */}
          <path d={fillPath} fill={`url(#hill-${uid})`} />
          <path
            data-ridge
            d={ridgePath}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={reduced ? undefined : { strokeDashoffset: 0 }}
          />

          {/* ground line */}
          <line x1={0} y1={BASE} x2={W} y2={BASE} stroke="var(--color-ink-200)" strokeWidth={1} />

          {/* peak markers + trait labels/values */}
          {peaks.map((p) => (
            <g key={p.axis} data-peak>
              <line x1={p.x} y1={p.y} x2={p.x} y2={BASE} stroke="var(--color-brand-500)" strokeOpacity={0.14} strokeWidth={1} strokeDasharray="2 3" />
              <circle cx={p.x} cy={p.y} r={3} fill="var(--color-card)" stroke="var(--color-brand-500)" strokeWidth={1.5} />
              <text x={p.x} y={p.y - 11} textAnchor="middle" className="fill-ink-900 font-medium tabular-nums" fontSize={11}>
                {p.v}
              </text>
              <text x={p.x} y={BASE + 16} textAnchor="middle" className="fill-ink-600" fontSize={9.5} fontWeight={500}>
                {p.axis}
              </text>
              <text x={p.x} y={BASE + 27} textAnchor="middle" className="fill-ink-300 uppercase" fontSize={7.5} letterSpacing="0.08em">
                {p.level}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 bg-brand-500" aria-hidden />
          Peaks — personality traits (height = strength)
        </span>
        {sky.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ink-400" aria-hidden />
            Constellation — cluster scores
          </span>
        )}
      </figcaption>
    </figure>
  )
}

/* Build a smooth (Catmull-Rom-ish, via quadratics) ridge path that passes
   through the supplied peaks and dips toward the base between them, starting and
   ending at the ground edges. */
function buildRidge(peaks: { x: number; y: number }[], asGiven = false): string {
  if (!peaks.length) return `M 0 ${BASE} L ${W} ${BASE}`

  // anchor points: ground at both edges, peaks in between, valleys between peaks
  const pts: { x: number; y: number }[] = asGiven
    ? peaks
    : [{ x: 0, y: BASE - 4 }]

  if (!asGiven) {
    peaks.forEach((p, i) => {
      if (i > 0) {
        const prev = peaks[i - 1]
        // valley between two peaks: midpoint, dipped toward base
        const vx = (prev.x + p.x) / 2
        const vy = BASE - (BASE - Math.max(prev.y, p.y)) * 0.34
        pts.push({ x: vx, y: vy })
      }
      pts.push(p)
    })
    pts.push({ x: W, y: BASE - 4 })
  }

  // smooth through points with mid-point quadratic curves
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2
    const yc = (pts[i].y + pts[i + 1].y) / 2
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}
