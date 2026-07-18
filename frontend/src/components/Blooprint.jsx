import { motion } from 'motion/react'

const INTENSITY_DOTS = { low: '·', moderate: '··', high: '···' }

// Dominant emotions as chips — the feeling-first read of a session.
export function EmotionChips({ emotions, dark = false, glass = false }) {
  if (!emotions?.length) return null
  const darkStyle = dark
    ? { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.1)', color: '#E9EEF4' }
    : undefined
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      {emotions.map((e, i) => (
        <motion.span key={e.emotion + i} className={'chip' + (glass ? ' glass' : dark ? '' : ' accent')} style={darkStyle}
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
          {e.emotion} <span style={{ opacity: 0.55, letterSpacing: 1 }}>{INTENSITY_DOTS[e.intensity] || '··'}</span>
        </motion.span>
      ))}
    </div>
  )
}

// Dimension rows — every dimension always renders. A scored one gets a bar;
// an unscored one shows its qualitative state ("not discussed", "heavy", …).
export function Dimensions({ dimensions, footnote }) {
  const dims = Object.values(dimensions || {})
  if (!dims.length) return null
  return (
    <>
      {dims.map((d) => {
        const scored = d.score != null
        return (
          <div className="dim-row" key={d.label}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="dim-name" style={{ display: 'block' }}>{d.label}</span>
              {d.state && d.state !== 'not discussed' && (
                <span className="micro" style={{ fontStyle: 'italic', color: scored ? 'var(--navy)' : 'var(--ink-3)' }}>
                  feeling {d.state}
                </span>
              )}
            </div>
            {scored ? (
              <>
                <div className="dim-track">
                  <motion.div className="dim-fill"
                    initial={{ width: 0 }} animate={{ width: d.score + '%' }}
                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
                </div>
                <span className="dim-val">{d.score}</span>
              </>
            ) : (
              <span className="micro" style={{ fontStyle: 'italic' }}>
                {d.state === 'not discussed' || !d.state ? 'not discussed' : ''}
              </span>
            )}
          </div>
        )
      })}
      {footnote && <p className="micro" style={{ marginTop: 8 }}>{footnote}</p>}
    </>
  )
}
