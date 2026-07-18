import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

// Deep-research-style progress. When `stage` (real SSE progress from the server)
// is provided, it narrates the actual pipeline node running now; otherwise it
// falls back to a calibrated timer so there's never a dead screen. Progress eases
// and never claims 100% until the parent unmounts it on the real result.
const SUBS = [
  'taking in every line you shared',
  'gently — without jumping to conclusions',
  'grounding in CBT, ACT & clinical frameworks',
  'safety comes first, always',
  'as ranges, not verdicts',
  'in your own words, for you',
  'so nothing is invented',
]

export default function AnalyzingOverlay({ title = 'Reading your session', stage = null, estimate = 34 }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 0.1), 100)
    return () => clearInterval(id)
  }, [])

  const real = stage && stage.total
  // progress: real fraction (clamped so it reads as "working") or an eased timer
  const pct = real
    ? Math.max(8, Math.min(96, (stage.done / stage.total) * 100))
    : Math.min(95, (1 - Math.exp(-t / (estimate * 0.55))) * 100)
  const label = real ? (stage.label || 'Working') : ['Reading the session', 'Noticing patterns & themes',
    'Grounding in evidence', 'Estimating your signals', 'Writing your reflection'][Math.min(4, Math.floor(t / 7))]
  const sub = SUBS[Math.min(SUBS.length - 1, Math.floor((pct / 100) * SUBS.length))]
  const remaining = real
    ? (pct > 82 ? 'almost there' : `about ${Math.max(2, Math.round(t * (100 - pct) / Math.max(pct, 1)))}s left`)
    : `about ${Math.max(1, Math.round(estimate - t))}s left`
  const R = 52, C = 2 * Math.PI * R

  return (
    <motion.div className="metric-overlay analyzing" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}>
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 128, height: 128, marginBottom: 8 }}>
          <motion.div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--powder-soft)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
          <svg width="128" height="128" viewBox="0 0 128 128" style={{ position: 'relative', transform: 'rotate(-90deg)' }}>
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--powder-soft)" strokeWidth="8" />
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--navy)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}`}
              style={{ transition: 'stroke-dasharray .35s var(--ease)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span className="big-num" style={{ fontSize: 30, color: 'var(--navy)' }}>{Math.round(pct)}</span>
          </div>
        </div>

        <h2 className="display" style={{ margin: 0 }}>{title}</h2>

        <div style={{ minHeight: 48 }}>
          <motion.p key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }} style={{ fontWeight: 600, fontSize: 15.5, margin: '6px 0 2px', color: 'var(--navy)' }}>
            {label}{real && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {stage.done}/{stage.total}</span>}
          </motion.p>
          <p className="micro">{sub}</p>
        </div>

        <div style={{ width: 'min(280px, 80%)', marginTop: 8 }}>
          <div className="anlz-track"><span style={{ width: pct + '%' }} /></div>
          <p className="micro" style={{ marginTop: 8 }}>{remaining} · your words never leave this device</p>
        </div>
      </div>
    </motion.div>
  )
}
