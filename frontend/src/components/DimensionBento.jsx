import { useState } from 'react'
import { SignalGauge, Pill, tint } from './gauges'
import { METRIC_BY_KEY, bandFor, stateColor } from '../lib/science'

// Each signal as an expandable bento tile (same gauge language as the health
// dashboard) that opens to show the UNDERLYING LOGIC (what instrument it's
// anchored to, what Setmycareer listened for, the evidence + confidence) and a
// pro-therapist forward-look. Scores read as estimates (≈) with a confidence
// level — honest about the limits of one short session.

const CONF = {
  moderate: ['fair confidence', '#10B981'],
  tentative: ['tentative', '#F59E0B'],
  low: ['low confidence', '#F97316'],
  none: ['not discussed', '#97A9B9'],
}

function forwardLook(metric, score) {
  if (score == null) return `Not enough came up this session to read your ${metric.name.toLowerCase()} — worth checking in on next time.`
  const lead = score >= 85 ? 'A genuine strength right now.'
    : score >= 60 ? 'Holding fairly steady.'
    : score >= 40 ? 'Worth some gentle attention.'
    : 'Worth real care right now.'
  return `${lead} ${metric.tryThis}`
}

function Tile({ mkey, dim }) {
  const [open, setOpen] = useState(false)
  const metric = METRIC_BY_KEY[mkey]
  if (!metric) return null
  const score = dim?.score ?? null
  const band = bandFor(score)
  const clr = metric.hue[0]
  const conf = CONF[dim?.confidence || (score == null ? 'none' : 'low')] || CONF.low
  const nEv = (dim?.evidence || []).length

  return (
    <button className={'signal-tile dim-tile' + (open ? ' span2 open' : '')} onClick={() => setOpen(!open)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <span className="st-name">{metric.name}</span>
        <span className="st-inst" style={{ color: clr, background: tint(clr, 0.13) }}>{metric.instrument.split(' ')[0]}</span>
      </div>

      {!open && (
        <div className="st-gauge"><SignalGauge type={metric.gauge} value={score} color={clr} size={64} /></div>
      )}

      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <span className="st-score" style={{ color: score == null ? 'var(--ink-3)' : clr }}>
          {score == null ? '–' : <>&asymp;{Math.round(score / 5) * 5}</>}
        </span>
        {band && <Pill color={stateColor(score)}>{band.name}</Pill>}
      </div>
      <span className="conf-chip" style={{ color: conf[1] }}>● {conf[0]}</span>

      {open && (
        <div className="dim-detail" onClick={(e) => e.stopPropagation()}>
          <div className="dim-gauge-lg"><SignalGauge type={metric.gauge} value={score} color={clr} size={92} /></div>
          <p className="label" style={{ margin: '4px 0 4px' }}>The logic</p>
          <p className="dim-logic">
            Anchored to <b>{metric.instrument}</b>. From your words, Setmycareer listens for {metric.listensFor.charAt(0).toLowerCase() + metric.listensFor.slice(1)}
          </p>
          {dim?.evidence?.[0] && (
            <p className="dim-evidence">&ldquo;{dim.evidence[0]}&rdquo;</p>
          )}
          <p className="micro" style={{ margin: '2px 0 10px' }}>
            {score == null ? 'No clear signal this session.'
              : `Estimated from ${nEv} cue${nEv === 1 ? '' : 's'} you said today — read it as a range, not a measurement.`}
          </p>
          <p className="label" style={{ margin: '0 0 4px', color: clr }}>What to look for</p>
          <p className="dim-forward">{forwardLook(metric, score)}</p>
        </div>
      )}
    </button>
  )
}

export default function DimensionBento({ dimensions }) {
  const keys = Object.keys(METRIC_BY_KEY).filter((k) => dimensions?.[k])
  return (
    <div>
      <div className="row between" style={{ padding: '0 2px 10px' }}>
        <span className="label">How you&apos;re doing</span>
        <span className="micro">tap a signal for the logic</span>
      </div>
      <div className="bento">
        {keys.map((k) => <Tile key={k} mkey={k} dim={dimensions[k]} />)}
      </div>
      <p className="micro" style={{ textAlign: 'center', padding: '12px 16px 0' }}>
        Estimates from one session, anchored to validated instruments — a tracking signal, not a diagnosis.
      </p>
    </div>
  )
}
