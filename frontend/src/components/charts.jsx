import { useRef, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { isStatic } from '../lib/motion'

const smooth = [0.2, 0.8, 0.2, 1]
const fmtD = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// hex → rgba (local copy to avoid a charts↔gauges import cycle)
const tint = (hex, a) => {
  if (!hex || hex[0] !== '#') return hex
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(f, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

let _uid = 0
const nextId = () => `c${(_uid = (_uid + 1) % 1e5)}`

// Smooth filled area mini-chart — gradient fill, animated draw, latest dot.
// Reads like the sparkline on a SaaS metric card. fluid → fills its container
// (crisp via non-scaling-stroke).
export function AreaSpark({ points, color = '#16314a', width = 132, height = 46, tone = 'navy', fluid = false }) {
  const id = useRef(nextId()).current
  if (!points || points.length < 2) {
    return <div style={{ width: fluid ? '100%' : width, height, display: 'grid', placeItems: 'center' }}>
      <span className="micro" style={{ opacity: 0.6 }}>—</span></div>
  }
  const svgProps = fluid
    ? { width: '100%', height, viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' }
    : { width, height, viewBox: `0 0 ${width} ${height}` }
  const P = 4
  const lo = Math.min(...points), hi = Math.max(...points)
  const span = Math.max(8, hi - lo)
  const xs = points.map((_, i) => P + (i / (points.length - 1)) * (width - 2 * P))
  const ys = points.map((v) => height - P - ((v - lo) / span) * (height - 2 * P - 6) - 3)
  // smooth path via midpoint quadratics
  let d = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2
    d += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${(ys[i - 1] + ys[i]) / 2}`
  }
  d += ` T${xs.at(-1)},${ys.at(-1)}`
  const area = `${d} L${xs.at(-1)},${height} L${xs[0]},${height} Z`
  return (
    <svg {...svgProps} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={tone === 'navy' ? 0.16 : 0.28} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        vectorEffect={fluid ? 'non-scaling-stroke' : undefined}
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: smooth }} />
      {!fluid && (
        <motion.circle cx={xs.at(-1)} cy={ys.at(-1)} r="3.4" fill={color}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 18 }} />
      )}
    </svg>
  )
}

// Clinical reference-range scale — segmented rubric bands (low→high), the
// current value marked like a lab result against its reference range. Calm
// two-blue ramp (lighter = lower, navy = higher), animated marker slide-in.
const BAND_STOPS = [
  { to: 20, label: 'severe', fill: '#FCA5A5' },
  { to: 40, label: 'struggling', fill: '#FDBA74' },
  { to: 60, label: 'strained', fill: '#FCD34D' },
  { to: 85, label: 'steady', fill: '#86EFAC' },
  { to: 100, label: 'thriving', fill: '#34D399' },
]
export function BandScale({ score, showLabels = true, height = 10 }) {
  const W = 100
  let prev = 0
  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', borderRadius: 99, overflow: 'hidden' }}>
        {BAND_STOPS.map((b) => {
          const x = prev; const w = b.to - prev; prev = b.to
          return <rect key={b.label} x={x} y={0} width={w} height={height} fill={b.fill} />
        })}
      </svg>
      {score != null && (
        <div style={{ position: 'relative', height: 0 }}>
          <div style={{ position: 'absolute', top: -height - 3, left: `${Math.max(2, Math.min(98, score))}%`, transform: 'translateX(-50%)' }}>
            <div style={{ width: 3, height: height + 6, borderRadius: 99, background: '#fff', boxShadow: '0 0 0 1.5px var(--navy)' }} />
          </div>
        </div>
      )}
      {showLabels && (
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="micro" style={{ fontSize: 9.5 }}>severe</span>
          <span className="micro" style={{ fontSize: 9.5 }}>thriving</span>
        </div>
      )}
    </div>
  )
}

// Numeral — renders the value immediately. (The count-up animation was removed:
// numbers jumping/rolling read as instability on a clinical screen.)
export function CountUp({ value, style, className }) {
  return <span className={className} style={style}>{value == null ? '–' : value}</span>
}

/**
 * Data-usage-style bar chart (ref 1): rounded bars with faint baseline grid and
 * axis labels, latest bar in the full hue, the rest tinted. Bars spring up when
 * the chart is scrolled into view; tap/drag to inspect with a value bubble.
 */
export function AppleBars({ points, height = 156, color = '#12354E' }) {
  const [sel, setSel] = useState(null)
  const ref = useRef(null)
  if (!points || points.length < 2) {
    return <p className="micro" style={{ padding: '14px 0' }}>Not enough sessions yet to draw a trend.</p>
  }
  const W = 320, H = height, PAD = 8, GAP = 8, BASE = 22, TOP = 30
  const n = points.length
  const bw = Math.min(34, (W - 2 * PAD - GAP * (n - 1)) / n)
  const total = n * bw + (n - 1) * GAP
  const x0 = (W - total) / 2
  const sx = (i) => x0 + i * (bw + GAP)
  const hOf = (v) => Math.max(8, (v / 100) * (H - BASE - TOP))
  const active = sel ?? n - 1
  const grid = [0, 50, 100]
  const gy = (v) => H - BASE - (v / 100) * (H - BASE - TOP)

  function pick(e) {
    const r = ref.current.getBoundingClientRect()
    const px = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width * W
    let best = 0, bd = 1e9
    points.forEach((_, i) => {
      const d = Math.abs(px - (sx(i) + bw / 2))
      if (d < bd) { bd = d; best = i }
    })
    setSel(best)
  }

  const p = points[active]
  const bubbleX = Math.min(Math.max(sx(active) + bw / 2, 34), W - 34)

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', touchAction: 'pan-y' }}
      onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} onPointerLeave={() => setSel(null)}>
      {/* faint baseline grid + axis ticks */}
      {grid.map((v) => (
        <g key={v}>
          <line x1={PAD} x2={W - PAD - 16} y1={gy(v)} y2={gy(v)} stroke="var(--line)" strokeWidth="1"
            strokeDasharray="2 4" />
          <text x={W - PAD - 12} y={gy(v) + 3} fontSize="9" fill="var(--ink-3)">{v}</text>
        </g>
      ))}
      {points.map((pt, i) => (
        <rect key={i}
          x={sx(i)} width={bw} rx={Math.min(7, bw / 2)}
          fill={i === active ? color : tint(color, 0.25)}
          y={H - BASE - hOf(pt.v)} height={hOf(pt.v)}
          className={isStatic() ? undefined : 'bar-rise'}
          style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
        />
      ))}
      {/* value bubble */}
      <g>
        <rect x={bubbleX - 30} y={2} width={60} height={24} rx={12} fill={color} />
        <text x={bubbleX} y={18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{p.v}</text>
      </g>
      <text x={sx(0)} y={H - 6} fontSize="9.5" fill="var(--ink-3)">{fmtD(points[0].t)}</text>
      <text x={sx(n - 1) + bw} y={H - 6} fontSize="9.5" fill="var(--ink-3)" textAnchor="end">{fmtD(points[n - 1].t)}</text>
    </svg>
  )
}

/**
 * Scrubbable smooth line (Apple Fitness trend): animated draw-in, flat powder
 * area, drag to inspect with a floating value pill.
 */
export function ScrubLine({ points, height = 92, light = false, color = null }) {
  const [sel, setSel] = useState(null)
  const ref = useRef(null)
  if (!points || points.length < 2) return null
  const W = 320, H = height, P = 10, TOP = 26
  const xs = points.map((_, i) => P + (i / (points.length - 1)) * (W - 2 * P))
  const ys = points.map((p) => TOP + (1 - p.v / 100) * (H - TOP - P))
  // smooth catmull-rom-ish curve via midpoint quadratics
  let d = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2
    d += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${(ys[i - 1] + ys[i]) / 2}`
  }
  d += ` T${xs.at(-1)},${ys.at(-1)}`
  const area = `${d} L${xs.at(-1)},${H} L${xs[0]},${H} Z`

  function pick(e) {
    const r = ref.current.getBoundingClientRect()
    const px = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width * W
    let best = 0, bd = 1e9
    xs.forEach((x, i) => { const dd = Math.abs(px - x); if (dd < bd) { bd = dd; best = i } })
    setSel(best)
  }

  const a = sel ?? points.length - 1
  const pillX = Math.min(Math.max(xs[a], 34), W - 34)
  const id = useRef(nextId()).current
  const stroke = color || (light ? 'var(--powder)' : 'var(--navy)')
  const fill = color ? tint(color, 0.16) : (light ? 'rgba(167,212,228,.14)' : 'var(--powder-soft)')
  const pillBg = color || (light ? 'var(--powder)' : 'var(--navy)')
  const pillText = color ? '#fff' : (light ? 'var(--navy)' : '#fff')

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', touchAction: 'pan-y' }}
      onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} onPointerLeave={() => setSel(null)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || 'var(--navy)'} stopOpacity={color ? 0.3 : 0.2} />
          <stop offset="45%" stopColor={color || 'var(--navy)'} stopOpacity={color ? 0.12 : 0.08} />
          <stop offset="100%" stopColor={color || 'var(--navy)'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={color ? `url(#${id})` : fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" pathLength={1}
        className={isStatic() ? undefined : 'line-draw'} />
      <line x1={xs[a]} x2={xs[a]} y1={TOP - 4} y2={H - 4} stroke={stroke} strokeWidth="1" opacity="0.35" />
      <circle cx={xs[a]} cy={ys[a]} r="5" fill={stroke} stroke="#fff" strokeWidth="2" />
      <g>
        <rect x={pillX - 34} y={0} width={68} height={20} rx={10} fill={pillBg} />
        <text x={pillX} y={14} textAnchor="middle" fontSize="11" fontWeight="700" fill={pillText}>
          {points[a].v} · {fmtD(points[a].t)}
        </text>
      </g>
    </svg>
  )
}
