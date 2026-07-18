import { motion } from 'motion/react'

export function scoreColor(v) {
  if (v == null) return 'var(--ink-3)'
  if (v >= 70) return 'var(--good)'
  if (v >= 45) return 'var(--warn)'
  return 'var(--bad)'
}

// Animated score ring — flat single-color stroke (two-blues system).
export default function Ring({
  value, size = 190, stroke = 13, label = 'Blueprint', sub,
  track = 'var(--powder-soft)', color = 'var(--navy)', lightLabel = false, style,
}) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const frac = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100
  return (
    <div className="ring-wrap" style={{ width: size, height: size, flexShrink: 0, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ type: 'spring', stiffness: 55, damping: 18, delay: 0.15 }}
        />
      </svg>
      <div className="ring-center">
        <div className="big-num" style={{ fontSize: size * 0.30, color: lightLabel ? '#fff' : 'var(--navy)' }}>
          {value == null ? '–' : value}
        </div>
        {label && (
          <div className="label" style={{ marginTop: 2, color: lightLabel ? 'rgba(255,255,255,.6)' : undefined }}>{label}</div>
        )}
        {sub && <div className="micro" style={{ marginTop: 2, color: lightLabel ? 'rgba(255,255,255,.55)' : undefined }}>{sub}</div>}
      </div>
    </div>
  )
}
