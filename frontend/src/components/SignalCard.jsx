import { motion } from 'motion/react'
import { CountUp } from './charts'
import { SignalGauge, Pill, tint } from './gauges'
import { bandFor, stateColor } from '../lib/science'
import { useInViewReveal, isStatic } from '../lib/motion'

// A signal as an Apple-Weather "current conditions" card: name up top, its own
// gauge form (dial/capsule/blob/ring) in the middle, the score big at the
// bottom-left in the signal's hue, and a state pill. Reveals on scroll; the
// score carries a shared layoutId so it morphs into the detail hero on tap.
function CompactTile({ metric, score, band, onClick }) {
  const { ref, inView } = useInViewReveal()
  const clr = metric.hue[0]
  const sClr = stateColor(score)
  const morph = !isStatic()
  return (
    <button ref={ref} className="signal-tile" onClick={onClick}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <span className="st-name">{metric.name}</span>
        <span className="st-inst" style={{ color: clr, background: tint(clr, 0.13) }}>
          {metric.instrument.split(' ')[0]}
        </span>
      </div>
      <div className="st-gauge">
        {inView && <SignalGauge type={metric.gauge} value={score} color={clr} size={76} />}
      </div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <span className="st-score" style={{ color: clr }}>
          {score == null ? '–' : (
            <motion.span layoutId={morph ? `sig-score-${metric.key}` : undefined}
              style={{ display: 'inline-block' }}>
              {inView ? <CountUp value={score} /> : score}
            </motion.span>
          )}
        </span>
        {band && <Pill color={sClr}>{band.name}</Pill>}
      </div>
    </button>
  )
}

/**
 * A wellness signal as a clinical tile. `compact` → the weather-style gauge cell
 * that nests into the deep-dive on tap. Non-compact → a wider report row.
 */
export default function SignalCard({ metric, dim, i, onClick, compact = false }) {
  const score = dim?.score
  const band = bandFor(score)

  if (compact) {
    return <CompactTile metric={metric} score={score} band={band} onClick={onClick} />
  }

  const clr = metric.hue[0]
  return (
    <motion.button className="signal-card" onClick={onClick}
      initial={{ y: 14 }} animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(i * 0.06, 0.5) }}>
      <div className="row between" style={{ alignItems: 'center', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div className="sc-name">{metric.name}</div>
          <div className="micro">{score != null && dim?.state ? `feeling ${dim.state}` : 'not discussed recently'}</div>
          <div className="row" style={{ gap: 8, alignItems: 'baseline', marginTop: 6 }}>
            <span className="sc-score" style={{ color: clr }}>{score == null ? '–' : <CountUp value={score} />}</span>
            {band && <Pill color={stateColor(score)}>{band.name}</Pill>}
          </div>
        </div>
        <SignalGauge type={metric.gauge} value={score} color={clr} size={72} />
      </div>
    </motion.button>
  )
}
