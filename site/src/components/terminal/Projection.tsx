import { useMemo, useState } from "react"
import { useDrawnRings } from "@/components/terminal/rings-hook"

// "Measured vs guesswork" — a compounding model of a career decision. Two
// trajectories: one started blind (a wrong first turn, slower recovery) and one
// started measured (counselled). Drag the years to see the gap widen. Framed
// honestly as an illustrative model — the metaphor (compounding, risk) is the
// point, not a promise.

const YEARS = 12
function build() {
  const measured: number[] = [], guess: number[] = []
  let m = 100, g = 100
  for (let y = 0; y <= YEARS; y++) {
    measured.push(m); guess.push(g)
    m *= 1.185 // measured: steady compounding on a right-fit start
    g *= y === 2 ? 0.9 : y < 5 ? 1.06 : 1.12 // guesswork: an early wrong turn, slower to compound
  }
  return { measured, guess }
}

export function ProjectionModel() {
  const { measured, guess } = useMemo(build, [])
  const [year, setYear] = useState(8)
  const max = measured[YEARS]
  const W = 720, H = 300, padL = 8, padR = 8, padT = 16, padB = 28
  const x = (i: number) => padL + (i / YEARS) * (W - padL - padR)
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB)
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const gap = Math.round(((measured[year] - guess[year]) / guess[year]) * 100)

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A model comparing a measured career start against a guesswork start, compounding over years">
          {/* gap band */}
          <path d={`${path(measured)} L${x(YEARS)} ${y(guess[YEARS])} ${[...guess].reverse().map((v, i) => `L${x(YEARS - i)} ${y(v)}`).join(" ")} Z`} fill="var(--color-ink)" opacity="0.06" />
          {/* guesswork */}
          <path d={path(guess)} fill="none" stroke="var(--color-ink)" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.5" vectorEffect="non-scaling-stroke" />
          {/* measured */}
          <path d={path(measured)} fill="none" stroke="var(--color-ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {/* scrubber */}
          <line x1={x(year)} y1={padT} x2={x(year)} y2={H - padB} stroke="var(--color-ink)" strokeWidth="1" opacity="0.35" />
          <circle cx={x(year)} cy={y(measured[year])} r="4" fill="var(--color-ink)" />
          <circle cx={x(year)} cy={y(guess[year])} r="4" fill="var(--color-paper-pure)" stroke="var(--color-ink)" strokeWidth="1.4" />
          {/* labels on the curves */}
          <text x={x(YEARS) - 2} y={y(measured[YEARS]) - 8} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--color-ink)">Measured</text>
          <text x={x(YEARS) - 2} y={y(guess[YEARS]) + 16} textAnchor="end" fontSize="11" fill="var(--color-ink)" opacity="0.6">Guesswork</text>
          {/* x ticks */}
          {[0, 3, 6, 9, 12].map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="mono" fontSize="9" fill="var(--color-ink-40)">{t === 0 ? "Yr 0" : `${t}`}</text>)}
        </svg>
        {/* readout */}
        <div className="pointer-events-none absolute right-0 top-0 text-right">
          <div className="mono text-[10px] uppercase tracking-[0.12em] text-ink-40">Gap at year {year}</div>
          <div className="text-[clamp(1.6rem,4vw,2.6rem)] font-light leading-none tabular-nums">+{gap}%</div>
          <div className="mono text-[10px] uppercase tracking-[0.1em] text-ink-40">career equity, modelled</div>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-ink-40">Drag the years — 0 to {YEARS}</span>
        <input type="range" min={0} max={YEARS} value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="range-mono mt-2 w-full" aria-label="Years" />
      </label>
      <p className="mono mt-3 text-[10px] leading-relaxed text-ink-40">Illustrative model — compounding on a right-fit start vs an early wrong turn. Not a guarantee; the point is that a first decision compounds.</p>
    </div>
  )
}

/* ── concentric rings: from market noise to a position you can hold. Five layers
   inward, callouts on the right (the orange-ref, monochrome). Scroll-drawn. ── */
const RINGS = [
  { no: "01", title: "Noise", note: "Everyone's opinion — relatives, rankings, trends." },
  { no: "02", title: "Options", note: "The real set of paths, widened past two roads." },
  { no: "03", title: "Evidence", note: "Aptitude, interest and personality, measured." },
  { no: "04", title: "Fit", note: "Where the evidence and the market agree." },
  { no: "05", title: "Position", note: "A decision you can defend — and hold." },
]
export function RingsDiagram() {
  const { ref, drawn } = useDrawnRings()
  const cx = 210, cy = 220
  return (
    <svg ref={ref} viewBox="0 0 640 440" className="w-full" role="img" aria-label="From market noise to a position you can hold — five layers inward to a decision">
      {RINGS.map((r, i) => {
        const rad = 190 - i * 34
        return (
          <g key={r.no}>
            <circle cx={cx} cy={cy} r={rad} fill="none" stroke="var(--color-ink)" strokeWidth={i === RINGS.length - 1 ? 1.6 : 1}
              opacity={i === RINGS.length - 1 ? 0.9 : 0.22 + i * 0.06}
              style={{ strokeDasharray: 2 * Math.PI * rad, strokeDashoffset: drawn ? 0 : 2 * Math.PI * rad, transition: `stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.12}s` }} />
            <text x={cx} y={cy - rad + 18} textAnchor="middle" className="mono" fontSize="11" fill="var(--color-ink-40)"
              style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.5s ease ${0.3 + i * 0.12}s` }}>{r.no}</text>
          </g>
        )
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-ink)" style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.5s ease 0.9s" }}>Position</text>
      {/* callouts */}
      {RINGS.map((r, i) => {
        const ly = 70 + i * 74
        const rad = 190 - i * 34
        return (
          <g key={`c${r.no}`} style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.12}s` }}>
            <line x1={cx + Math.cos(-0.5) * rad} y1={cy + Math.sin(-0.5) * rad} x2={432} y2={ly + 6} stroke="var(--color-ink-20)" strokeWidth="1" />
            <circle cx={432} cy={ly + 6} r="2.5" fill="var(--color-ink)" />
            <text x={444} y={ly} fontSize="14" fontWeight="500" fill="var(--color-ink)">{r.no} · {r.title}</text>
            <text x={444} y={ly + 18} fontSize="11.5" fill="var(--color-ink-60)">{r.note.length > 44 ? r.note.slice(0, 42) + "…" : r.note}</text>
          </g>
        )
      })}
    </svg>
  )
}
