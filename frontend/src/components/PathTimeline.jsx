import { useRef, useState, useEffect } from 'react'
import { stateColor } from '../lib/science'

// The scrubbable "stock terminal" line for the Blueprint index over time.
// Drag across it to inspect any session: it reports the selected point to the
// parent (onSelect) and marks the all-time high and the lowest dip (a gentle
// "worth a look"). Pure SVG, pointer-driven; honors prefers-reduced-motion via
// CSS elsewhere. Needs >= 2 points to draw a trend.
const fmt = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function PathTimeline({ series, onSelect, height = 132 }) {
  const ref = useRef(null)
  const [sel, setSel] = useState(series.length - 1)

  useEffect(() => { onSelect?.(series[series.length - 1], series.length - 1) }, []) // default: latest

  if (!series || series.length < 2) {
    return (
      <div style={{ padding: '26px 8px', textAlign: 'center' }}>
        <p className="micro" style={{ lineHeight: 1.55 }}>
          Your timeline grows with every session — one more and your Blueprint starts to move like a line you can scrub.
        </p>
      </div>
    )
  }

  const W = 320, H = height, P = 12, TOP = 26
  const vals = series.map((s) => s.v)
  const xs = series.map((_, i) => P + (i / (series.length - 1)) * (W - 2 * P))
  const ys = series.map((v, i) => TOP + (1 - vals[i] / 100) * (H - TOP - P))
  let d = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2
    d += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${(ys[i - 1] + ys[i]) / 2}`
  }
  d += ` T${xs.at(-1)},${ys.at(-1)}`
  const area = `${d} L${xs.at(-1)},${H} L${xs[0]},${H} Z`

  const hiI = vals.indexOf(Math.max(...vals))
  const loI = vals.indexOf(Math.min(...vals))
  const a = sel ?? series.length - 1
  const selClr = stateColor(vals[a])

  function pick(e) {
    const r = ref.current.getBoundingClientRect()
    const px = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width * W
    let best = 0, bd = 1e9
    xs.forEach((x, i) => { const dd = Math.abs(px - x); if (dd < bd) { bd = dd; best = i } })
    setSel(best); onSelect?.(series[best], best)
  }

  const pillX = Math.min(Math.max(xs[a], 30), W - 30)

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', touchAction: 'pan-y', cursor: 'ew-resize' }}
      onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)}>
      <defs>
        <linearGradient id="pathTl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--navy)" stopOpacity="0.16" />
          <stop offset="55%" stopColor="var(--navy)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--navy)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pathTl)" />
      <path d={d} fill="none" stroke="var(--navy)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* gentle all-time markers */}
      {series.length >= 3 && hiI !== a && (
        <g><circle cx={xs[hiI]} cy={ys[hiI]} r="3" fill="var(--good)" />
          <text x={xs[hiI]} y={ys[hiI] - 7} textAnchor="middle" fontSize="8.5" fill="var(--good)" fontWeight="700">high</text></g>
      )}
      {series.length >= 3 && loI !== a && loI !== hiI && (
        <g><circle cx={xs[loI]} cy={ys[loI]} r="3" fill="#F59E0B" />
          <text x={xs[loI]} y={ys[loI] + 14} textAnchor="middle" fontSize="8.5" fill="#F59E0B" fontWeight="700">watch</text></g>
      )}

      {/* scrubber */}
      <line x1={xs[a]} x2={xs[a]} y1={TOP - 6} y2={H - 4} stroke={selClr} strokeWidth="1.4" opacity="0.4" />
      <circle cx={xs[a]} cy={ys[a]} r="7" fill={selClr} stroke="#fff" strokeWidth="3" style={{ transition: 'cx .26s var(--ease-bounce), cy .26s var(--ease-bounce)' }} />
      <g>
        <rect x={pillX - 30} y={0} width={60} height={19} rx={9.5} fill={selClr} />
        <text x={pillX} y={13.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
          {vals[a]} · {fmt(series[a].t)}
        </text>
      </g>
    </svg>
  )
}
