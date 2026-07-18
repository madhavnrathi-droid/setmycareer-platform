// Reference-faithful gauges — each form is lifted from one of the six product
// shots: the cycle-tracker ring, Apple-Weather capsule/dial/blob gauges, the
// sunrise sine curve, and the data-usage bars. Bespoke SVG, full ref color.
//
// Resilience: the data-bearing shapes (arcs, fills, blobs, ring segments, nodes)
// render at their FINAL value with no hide-then-show — so a stalled frame loop
// can never blank a clinical reading. The entrance is a compositor-driven CSS
// pop (`.gauge-pop`, reliable like the page transition); motion.dev drives only
// the non-critical accents (marker springs, the blob's slow drift).
import { motion } from 'motion/react'
import { isStatic } from '../lib/motion'
import { CountUp } from './charts'

const pop = { type: 'spring', stiffness: 300, damping: 15 }

// hex → rgba tint
export function tint(hex, a) {
  if (!hex || hex[0] !== '#') return hex
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(f, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// polar point with 0° = top, clockwise positive
const P = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function describeArc(cx, cy, r, startDeg, sweepDeg) {
  const [sx, sy] = P(cx, cy, r, startDeg)
  const [ex, ey] = P(cx, cy, r, startDeg + sweepDeg)
  const large = Math.abs(sweepDeg) > 180 ? 1 : 0
  const dir = sweepDeg >= 0 ? 1 : 0
  return `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 ${large} ${dir} ${ex.toFixed(2)} ${ey.toFixed(2)}`
}
// CSS pop class for the gauge wrapper (omitted when static → instant final state)
const popCls = (extra = '') => (isStatic() ? extra : ('gauge-pop ' + extra).trim())

/* ---------- Status pill (cycle "Peak" / "in 2 days") ---------- */
export function Pill({ children, color = '#12354E', solid = false }) {
  return (
    <span className="pill" style={solid
      ? { background: color, color: '#fff' }
      : { background: tint(color, 0.14), color }}>
      {children}
    </span>
  )
}

/* ---------- Dial gauge (Weather "Pressure" / steps arc) ---------- */
export function Dial({ value = 0, color = '#12354E', size = 78, thickness = 10.5, showValue = false }) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const cx = size / 2, cy = size / 2
  const r = size / 2 - thickness / 2 - 1
  const START = -135, SWEEP = 270
  const [px, py] = P(cx, cy, r, START + SWEEP * v)
  const stat = isStatic()
  // stroke variation: thin track, bolder progress that thickens with the value
  const track = thickness * 0.62
  const prog = thickness * (0.85 + 0.35 * v)
  return (
    <svg className={popCls()} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <path d={describeArc(cx, cy, r, START, SWEEP)} fill="none" stroke={tint(color, 0.15)}
        strokeWidth={track} strokeLinecap="round" />
      <path d={describeArc(cx, cy, r, START, Math.max(0.01, SWEEP * v))} fill="none" stroke={color}
        strokeWidth={prog} strokeLinecap="round" />
      <motion.circle cx={px} cy={py} r={prog / 2 + 2} fill="#fff" stroke={color} strokeWidth="2.5"
        initial={stat ? false : { scale: 0 }} animate={{ scale: 1 }}
        transition={{ ...pop, delay: stat ? 0 : 0.3 }} style={{ transformOrigin: `${px}px ${py}px` }} />
      {showValue && (
        <text x={cx} y={cy + size * 0.11} textAnchor="middle" fontSize={size * 0.3} fontWeight="700"
          fill={color} style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
          {Math.round(value)}
        </text>
      )}
    </svg>
  )
}

/* ---------- Capsule gauge (Weather "Humidity") ---------- */
export function Capsule({ value = 0, color = '#12354E', w = 30, h = 78, labels = false }) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const stat = isStatic()
  const pad = 3
  const inner = h - pad * 2
  const fillH = inner * v
  const top = pad + (inner - fillH)
  const rx = (w - pad * 2) / 2
  const cid = 'cap' + color.replace('#', '') + w + h
  return (
    <div className="row" style={{ gap: 7, alignItems: 'stretch' }}>
      {labels && (
        <div className="col" style={{ justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-3)', fontWeight: 600, padding: '1px 0' }}>
          <span>100</span><span>0</span>
        </div>
      )}
      <svg className={popCls()} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <rect x={pad} y={pad} width={w - pad * 2} height={inner} rx={rx} fill={tint(color, 0.16)} />
        <clipPath id={cid}><rect x={pad} y={pad} width={w - pad * 2} height={inner} rx={rx} /></clipPath>
        <rect clipPath={`url(#${cid})`} x={pad} y={top} width={w - pad * 2} height={fillH} fill={color} rx={rx} />
        <motion.path d="M0 0 L7 4 L0 8 Z" fill={color}
          initial={stat ? false : { opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: stat ? 0 : 0.25 }} style={{ x: -9, y: top - 4 }} />
      </svg>
    </div>
  )
}

/* ---------- Organic blob gauge (Weather "Wind" / "UV Index") ---------- */
function blobPath(cx, cy, r, lobes = 3, wob = 0.16, phase = 0) {
  const steps = lobes * 12
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const rr = r * (1 + wob * Math.sin(lobes * t + phase))
    pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)])
  }
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2
    const my = (pts[i - 1][1] + pts[i][1]) / 2
    d += ` Q${pts[i - 1][0].toFixed(2)} ${pts[i - 1][1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`
  }
  return d + 'Z'
}
export function Blob({ value = 0, color = '#12354E', size = 78, lobes = 3 }) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const cx = size / 2, cy = size / 2
  const track = size / 2 - 4
  const r = track * (0.44 + 0.48 * v)
  const [mx, my] = P(cx, cy, track, -90 + 360 * v)
  const stat = isStatic()
  return (
    <svg className={popCls()} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={track} fill="none" stroke={tint(color, 0.22)} strokeWidth="1.6" strokeDasharray="2 5" />
      <path d={blobPath(cx, cy, r, lobes)} fill={tint(color, 0.92)} stroke={color} strokeWidth="2" strokeOpacity="0.45" />
      {!stat && (
        <motion.path d={blobPath(cx, cy, r * 1.12, lobes, 0.2)} fill="none" stroke={tint(color, 0.45)} strokeWidth="1.5"
          animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }} />
      )}
      <circle cx={mx} cy={my} r="4.5" fill="#fff" stroke={color} strokeWidth="3" />
    </svg>
  )
}

/* ---------- Mini progress ring (sleep) ---------- */
export function MiniRing({ value = 0, color = '#12354E', size = 78, thickness = 10.5 }) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const cx = size / 2, cy = size / 2
  const r = size / 2 - thickness / 2 - 1
  const C = 2 * Math.PI * r
  const track = thickness * 0.6
  const prog = thickness * (0.85 + 0.35 * v)
  return (
    <svg className={popCls()} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={tint(color, 0.15)} strokeWidth={track} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={prog} strokeLinecap="round"
        strokeDasharray={`${(C * v).toFixed(1)} ${C.toFixed(1)}`} />
    </svg>
  )
}

// Dispatcher used by the signal cards — pick the gauge form per signal.
export function SignalGauge({ type, value, color, size = 76 }) {
  if (value == null) return <div style={{ width: size, height: size, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 20 }}>–</div>
  if (type === 'capsule') return <Capsule value={value} color={color} h={size} />
  if (type === 'blob') return <Blob value={value} color={color} size={size} />
  if (type === 'ring') return <MiniRing value={value} color={color} size={size} />
  return <Dial value={value} color={color} size={size} />
}

/* ---------- PhaseRing — the cycle-tracker hero ----------
   A ring of one colored segment per signal (bolder = higher score) with a
   tappable node on each, the composite index big in the centre, and a state
   pill below. Shapes render statically (never blank); the whole ring pops in
   via CSS and the centre number counts up. */
export function PhaseRing({ metrics, dims, score, stateName, stateClr, onOpen, size = 248 }) {
  const cx = size / 2, cy = size / 2
  const thickness = 13
  const r = size / 2 - thickness / 2 - 10
  const n = metrics.length
  const seg = 360 / n
  const gap = 5
  return (
    <div className="phasering" style={{ width: size, height: size, position: 'relative', margin: '0 auto' }}>
      <svg className={popCls()} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {metrics.map((m, i) => {
          const s = dims?.[m.key]?.score
          const start = i * seg - (seg - gap) / 2
          const op = s == null ? 0.18 : 0.5 + 0.5 * (s / 100)
          // dynamic stroke: stronger signals draw thicker, weaker ones thinner
          const sw = thickness * (s == null ? 0.5 : 0.6 + 0.55 * (s / 100))
          return (
            <path key={m.key} d={describeArc(cx, cy, r, start, seg - gap)} fill="none"
              stroke={m.hue[0]} strokeWidth={sw} strokeLinecap="round" style={{ opacity: op }} />
          )
        })}
        {metrics.map((m, i) => {
          const s = dims?.[m.key]?.score
          const [nx, ny] = P(cx, cy, r, i * seg)
          const nr = s == null ? 4 : 4 + (s / 100) * 4
          return (
            <g key={'n' + m.key} onClick={() => onOpen?.(m.key)} style={{ cursor: 'pointer' }}>
              <circle cx={nx} cy={ny} r={15} fill="transparent" />
              <circle cx={nx} cy={ny} r={nr + 3} fill="#fff" />
              <circle cx={nx} cy={ny} r={nr} fill={s == null ? 'var(--ink-3)' : m.hue[0]} />
            </g>
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="row" style={{ alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
            <span className="big-num" style={{ fontSize: 60, color: stateClr || 'var(--navy)' }}>
              {score == null ? '–' : <CountUp value={score} />}
            </span>
            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-3)' }}>/100</span>
          </div>
          {stateName && <div style={{ marginTop: 4 }}><Pill color={stateClr} solid>{stateName}</Pill></div>}
        </div>
      </div>
    </div>
  )
}

/* ---------- Particle field (AQI "Particulates") — dot density = value ---------- */
export function Particles({ value = 0, color = '#12354E', w = 120, h = 56, max = 46 }) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const count = Math.round(6 + max * v)
  const dots = Array.from({ length: count }, (_, i) => {
    const a = (i * 137.5) * Math.PI / 180
    const rad = i / count
    return {
      x: w / 2 + Math.cos(a) * rad * (w / 2 - 4) + ((i * 53) % 11) - 5,
      y: h / 2 + Math.sin(a) * rad * (h / 2 - 4) + ((i * 31) % 9) - 4,
      r: 1.4 + ((i * 17) % 10) / 5,
    }
  })
  return (
    <svg className={popCls()} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} opacity={0.35 + 0.5 * (d.r / 3.4)} />
      ))}
    </svg>
  )
}
