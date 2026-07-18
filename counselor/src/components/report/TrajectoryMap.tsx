import { useId } from "react"
import type { CareerRoute } from "@/lib/report-content"
import type { IndexHistoryPoint } from "@/lib/types"
import { useGsap, gsap, EASE, DUR, prefersReducedMotion } from "@/lib/gsap"

/* ── TrajectoryMap ────────────────────────────────────────────────────────────
   The signature career-trajectory MAP. The PAST is a single flowing line plotting
   the career index across the journey (with a faint wellbeing companion line); a
   "YOU ARE HERE" marker sits at the present; then the line BRANCHES into the
   modelled future routes, each branch labelled with its title + probability and
   weighted so the most-probable path is thickest and rises closest to the top.
   It should read as one continuous journey — where they started → where they are
   → where they could go.

   Report visual language: ink-scale grid, brand focus line for the index, mind
   dashed companion for wellbeing, semantic-neutral ink branches with the lead in
   brand, hairline frame, GSAP draws past-line then unfurls each branch in
   sequence, reduced-motion safe, responsive viewBox, print-friendly. */

const W = 760
const H = 380
const PAD_T = 34
const PAD_B = 52
const PAD_L = 16
const SPLIT = 0.52 // x-fraction where "now" sits and the future begins
const PLOT_H = H - PAD_T - PAD_B

// map a 0–100 value to a y within the plot band
const yOf = (v: number) => PAD_T + PLOT_H * (1 - Math.max(0, Math.min(100, v)) / 100)

// smooth a polyline of points with mid-point quadratics
function smooth(points: [number, number][]): string {
  if (!points.length) return ""
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const xc = (x0 + x1) / 2
    const yc = (y0 + y1) / 2
    d += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`
  }
  const [lx, ly] = points[points.length - 1]
  d += ` L ${lx.toFixed(1)} ${ly.toFixed(1)}`
  return d
}

export function TrajectoryMap({
  history,
  routes,
  currentLabel,
}: {
  history: IndexHistoryPoint[]
  routes: CareerRoute[]
  currentLabel: string
}) {
  const uid = useId().replace(/[:]/g, "")
  const reduced = prefersReducedMotion()

  const ref = useGsap<HTMLDivElement>((scope) => {
    const past = scope.querySelector<SVGPathElement>("[data-past]")
    const well = scope.querySelector<SVGPathElement>("[data-well]")
    const fill = scope.querySelector<SVGPathElement>("[data-fill]")
    const branches = scope.querySelectorAll<SVGPathElement>("[data-branch]")
    const now = scope.querySelector<SVGGElement>("[data-now]")
    const ends = scope.querySelectorAll<SVGGElement>("[data-end]")
    const tl = gsap.timeline()
    if (fill) tl.from(fill, { opacity: 0, duration: 0.9, ease: EASE.soft }, 0)
    if (past) {
      const len = past.getTotalLength()
      tl.fromTo(past, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: EASE.quart }, 0)
    }
    if (well) {
      const len = well.getTotalLength()
      tl.fromTo(well, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: EASE.quart }, 0.15)
    }
    if (now) tl.from(now, { opacity: 0, scale: 0.5, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft }, "-=0.4")
    branches.forEach((b) => {
      const len = b.getTotalLength?.() ?? 200
      tl.fromTo(b, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: EASE.quart }, "<+=0.06")
    })
    if (ends.length) tl.from(ends, { opacity: 0, x: -6, duration: DUR.enter, ease: EASE.soft, stagger: 0.06 }, "-=0.4")
  }, [history.length, routes.length])

  const hasHistory = history && history.length > 0
  if (!hasHistory && !routes?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-canvas px-6 py-12 text-center text-[13px] text-ink-400">
        The trajectory map draws itself once there is a journey and routes to plot.
      </div>
    )
  }

  // ── PAST: plot history across [PAD_L, splitX] ────────────────────────────────
  const splitX = PAD_L + (W - PAD_L * 2) * SPLIT
  const hist = hasHistory ? history : [{ label: "Start", careerIndex: 50, wellbeing: 50 }]
  const nowValue = hist[hist.length - 1].careerIndex
  const nowY = yOf(nowValue)

  const xOfHist = (i: number) =>
    PAD_L + (hist.length === 1 ? 0 : ((splitX - PAD_L) * i) / (hist.length - 1))

  const careerPts: [number, number][] = hist.map((h, i) => [xOfHist(i), yOf(h.careerIndex)])
  // ensure the line lands exactly on the now-marker
  careerPts[careerPts.length - 1] = [splitX, nowY]
  const wellPts: [number, number][] = hist.map((h, i) => [xOfHist(i), yOf(h.wellbeing)])

  const careerPath = smooth(careerPts)
  const wellPath = smooth(wellPts)
  const fillPath = `${careerPath} L ${splitX} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`

  // ── FUTURE: branch from (splitX, nowY) to each route's endpoint ───────────────
  const futureEndX = W - PAD_L - 150 // leave room for the labels
  const rs = routes ?? []
  const lead = rs.length ? rs.reduce((a, b) => (b.probability > a.probability ? b : a), rs[0]) : null

  // higher probability → endpoint sits higher (toward the top of the band) and the
  // branch is thicker; spread endpoints across the band by rank.
  const sortedByProb = [...rs].sort((a, b) => b.probability - a.probability)
  const branchEnds = rs.map((r) => {
    const rank = sortedByProb.findIndex((x) => x.id === r.id)
    const bandTop = PAD_T + 6
    const bandBot = H - PAD_B - 6
    const ey = rs.length <= 1 ? nowY : bandTop + ((bandBot - bandTop) * rank) / (rs.length - 1)
    const isLead = lead ? r.id === lead.id : false
    return { route: r, ey, isLead }
  })

  return (
    <figure ref={ref} className="w-full" aria-label={`Career trajectory: the journey to "${currentLabel}", then branching into ${rs.length} possible routes.`}>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-canvas via-card to-brand-100/15">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
          <defs>
            <linearGradient id={`tj-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* faint horizontal guides at 25/50/75 */}
          {[25, 50, 75].map((g) => (
            <line key={g} x1={PAD_L} y1={yOf(g)} x2={W - PAD_L} y2={yOf(g)} stroke="var(--color-ink-100)" strokeWidth={1} strokeDasharray="2 5" />
          ))}

          {/* PAST region label + the "now" vertical divider */}
          <text x={PAD_L} y={PAD_T - 14} className="fill-ink-300" fontSize={8.5} fontWeight={600} letterSpacing="0.14em">
            THE PATH SO FAR
          </text>
          <text x={splitX + 14} y={PAD_T - 14} className="fill-brand-600" fontSize={8.5} fontWeight={600} letterSpacing="0.14em">
            POSSIBLE FUTURES
          </text>
          <line x1={splitX} y1={PAD_T - 6} x2={splitX} y2={H - PAD_B + 6} stroke="var(--color-ink-200)" strokeWidth={1} strokeDasharray="3 4" />

          {/* PAST: index fill + line, wellbeing companion */}
          <path data-fill d={fillPath} fill={`url(#tj-fill-${uid})`} style={reduced ? undefined : { opacity: 1 }} />
          <path
            data-well
            d={wellPath}
            fill="none"
            stroke="var(--color-mind-500)"
            strokeWidth={1.25}
            strokeOpacity={0.7}
            strokeDasharray="4 3"
            strokeLinecap="round"
            style={reduced ? undefined : { strokeDashoffset: 0 }}
          />
          <path
            data-past
            d={careerPath}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={reduced ? undefined : { strokeDashoffset: 0 }}
          />
          {/* small dots at each historical point */}
          {careerPts.slice(0, -1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2} fill="var(--color-brand-500)" fillOpacity={0.55} />
          ))}
          {/* start tag */}
          {hist.length > 1 && (
            <text x={PAD_L} y={H - PAD_B + 18} className="fill-ink-400" fontSize={9} fontWeight={500}>
              {hist[0].label}
            </text>
          )}

          {/* FUTURE: weighted branches from the now-point */}
          {branchEnds.map(({ route, ey, isLead }) => {
            const cx1 = splitX + (futureEndX - splitX) * 0.45
            const w = 1.25 + (route.probability / 100) * 2.5
            return (
              <path
                key={route.id}
                data-branch
                d={`M ${splitX} ${nowY} C ${cx1} ${nowY} ${cx1} ${ey} ${futureEndX} ${ey}`}
                fill="none"
                stroke={isLead ? "var(--color-brand-500)" : "var(--color-ink-300)"}
                strokeOpacity={isLead ? 0.92 : 0.4 + (route.probability / 100) * 0.3}
                strokeWidth={w}
                strokeLinecap="round"
                style={reduced ? undefined : { strokeDashoffset: 0 }}
              />
            )
          })}

          {/* branch endpoints + labels */}
          {branchEnds.map(({ route, ey, isLead }) => (
            <g key={`end-${route.id}`} data-end>
              <circle cx={futureEndX} cy={ey} r={isLead ? 4 : 3} fill={isLead ? "var(--color-brand-500)" : "var(--color-card)"} stroke={isLead ? "var(--color-brand-500)" : "var(--color-ink-300)"} strokeWidth={1.5} />
              <text x={futureEndX + 9} y={ey - 1} className={isLead ? "fill-ink-900 font-medium" : "fill-ink-700"} fontSize={10}>
                {truncate(route.title, 26)}
              </text>
              <text x={futureEndX + 9} y={ey + 11} className="fill-ink-400 tabular-nums" fontSize={8.5}>
                {Math.round(route.probability)}% likely · {shortHorizon(route.horizon)}
              </text>
            </g>
          ))}

          {/* the "YOU ARE HERE" marker, drawn last so it sits on top */}
          <g data-now>
            <circle cx={splitX} cy={nowY} r={12} fill="var(--color-brand-100)" />
            <circle cx={splitX} cy={nowY} r={5} fill="var(--color-card)" stroke="var(--color-brand-500)" strokeWidth={2} />
            <circle cx={splitX} cy={nowY} r={1.75} fill="var(--color-brand-500)" />
            <g transform={`translate(${splitX}, ${nowY})`}>
              <rect x={-44} y={-34} width={88} height={17} rx={8.5} fill="var(--color-ink-900)" />
              <text x={0} y={-25.5} textAnchor="middle" dominantBaseline="central" className="fill-white" fontSize={8} fontWeight={600} letterSpacing="0.08em">
                YOU ARE HERE
              </text>
            </g>
            <text x={splitX} y={nowY + 24} textAnchor="middle" className="fill-ink-500" fontSize={8.5} fontWeight={500}>
              {truncate(currentLabel, 30)}
            </text>
          </g>
        </svg>
      </div>

      {/* legend */}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[10.5px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-5 rounded-full bg-brand-500" aria-hidden />
          Career index
        </span>
        {hasHistory && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-5 rounded-full bg-mind-500" style={{ backgroundImage: "repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)" }} aria-hidden />
            Wellbeing
          </span>
        )}
        <span className="ml-auto text-ink-300">Thicker branch = higher probability</span>
      </figcaption>
    </figure>
  )
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/* condense "3–5 months to a credible offer" → "3–5 mo" */
function shortHorizon(h: string): string {
  const m = h.match(/(\d+\s*[–-]\s*\d+|\d+)\s*(month|mo|week|yr|year)/i)
  if (!m) return h
  const unit = /week/i.test(m[2]) ? "wk" : /yr|year/i.test(m[2]) ? "yr" : "mo"
  return `${m[1].replace(/\s+/g, "")} ${unit}`
}
