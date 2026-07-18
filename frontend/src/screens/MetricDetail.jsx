import { useState } from 'react'
import { motion } from 'motion/react'
import { BackIcon, CheckIcon } from '../components/Icons'
import { METRIC_BY_KEY, bandFor, BANDS, stateColor } from '../lib/science'
import { AppleBars, BandScale, CountUp } from '../components/charts'
import { SignalGauge, Pill, tint } from '../components/gauges'
import { isStatic } from '../lib/motion'
import { saveSession } from '../lib/store'

const smooth = [0.2, 0.8, 0.2, 1]
const fmt = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
// Transform-only entrance (opacity stays 1) so content is never stuck hidden if
// the frame loop stalls — Motion still drives the satisfying slide-up.
const item = (i) => ({
  initial: { y: 12 },
  animate: { y: 0 },
  transition: { duration: 0.4, ease: smooth, delay: Math.min(i * 0.05, 0.35) },
})


// Locate the quote inside the transcript and show it in context.
function Trace({ quote, transcript }) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '')
  const nq = norm(quote)
  const nt = norm(transcript)
  let idx = nt.indexOf(nq.slice(0, Math.min(40, nq.length)))
  if (idx < 0) return <div className="trace">&ldquo;<mark>{quote}</mark>&rdquo;</div>
  let raw = 0, n = 0
  while (raw < transcript.length && n < idx) {
    if (/[a-z0-9 ]/i.test(transcript[raw])) n++
    raw++
  }
  const start = Math.max(0, raw - 70)
  const qLen = Math.min(quote.length + 10, transcript.length - raw)
  const end = Math.min(transcript.length, raw + qLen + 70)
  return (
    <div className="trace">
      {start > 0 && '…'}{transcript.slice(start, raw)}
      <mark>{transcript.slice(raw, raw + qLen)}</mark>
      {transcript.slice(raw + qLen, end)}{end < transcript.length && '…'}
    </div>
  )
}

function baselineText(info, intake) {
  if (!info.baseline || !intake) return null
  if (info.baseline === 'phq2' && intake.phq2?.length) {
    const v = intake.phq2.reduce((a, b) => a + (b ?? 0), 0)
    return `Your PHQ-2 intake screen: ${v}/6 ${v >= 3 ? '(positive screen — mood difficulty likely)' : '(below the clinical cut-off of 3)'}`
  }
  if (info.baseline === 'gad2' && intake.gad2?.length) {
    const v = intake.gad2.reduce((a, b) => a + (b ?? 0), 0)
    return `Your GAD-2 intake screen: ${v}/6 ${v >= 3 ? '(positive screen — anxiety difficulty likely)' : '(below the clinical cut-off of 3)'}`
  }
  if (info.baseline === 'sleep' && intake.sleep) {
    return `Your intake self-rating: sleep "${intake.sleep}"`
  }
  return null
}

const Section = ({ title, children, i }) => (
  <motion.section {...item(i)} style={{ padding: '22px 0 6px' }}>
    <p className="label" style={{ margin: '0 0 8px' }}>{title}</p>
    {children}
  </motion.section>
)

/** Deep dive: score → band → verbatim evidence in context → baseline → research. */
export default function MetricDetail({ metricKey, sessions, profile, onBack, onUpdated }) {
  const info = METRIC_BY_KEY[metricKey]
  const ordered = [...sessions]
    .filter((s) => s.analysis?.metrics?.dimensions?.[metricKey])
    .sort((a, b) => a.startedAt - b.startedAt)
  const points = ordered
    .map((s) => ({ t: s.startedAt, v: s.analysis.metrics.dimensions[metricKey].score }))
    .filter((p) => p.v != null)
  const latestSession = ordered.at(-1)
  const latest = latestSession?.analysis.metrics.dimensions[metricKey]
  const band = bandFor(latest?.score)
  const baseline = baselineText(info, profile?.intake)
  const clr = info.hue[0]
  const morph = !isStatic()
  const [fb, setFb] = useState(latestSession?.feedback?.[metricKey] || null)

  async function giveFeedback(v) {
    setFb(v)
    const next = { ...latestSession, feedback: { ...(latestSession.feedback || {}), [metricKey]: v } }
    await saveSession(next)
    onUpdated?.()
  }

  return (
    <div className="screen">

      <div className="row between" style={{ marginBottom: 18 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Back"><BackIcon /></button>
        <span className="chip" style={{ background: tint(clr, 0.14), color: clr }}>{info.instrument}</span>
      </div>

      {/* hero — the signal's own gauge + a hue-coloured score that morphs in from
          the dashboard tile (plain wrapper: no transforming ancestor over the
          shared-layout element, so the morph measures cleanly) */}
      <div>
        <p className="label" style={{ margin: 0 }}>Signal</p>
        <h1 className="display" style={{ margin: '2px 0 16px' }}>{info.name}</h1>
        <div className="row between" style={{ alignItems: 'center', gap: 16 }}>
          <div className="col" style={{ gap: 8, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className="big-num" style={{ fontSize: 66, color: clr }}>
                {latest?.score == null ? '–'
                  : morph
                    ? <motion.span layoutId={`sig-score-${metricKey}`} style={{ display: 'inline-block' }}>{latest.score}</motion.span>
                    : <CountUp value={latest.score} />}
              </span>
              {latest?.score != null && <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-3)' }}>/100</span>}
            </div>
            {band && <div><Pill color={stateColor(latest?.score)} solid>{band.name}</Pill></div>}
            {latest?.state && latest.state !== 'not discussed' && (
              <span className="micro" style={{ fontStyle: 'italic' }}>feeling {latest.state}</span>
            )}
          </div>
          {latest?.score != null && <SignalGauge type={info.gauge} value={latest.score} color={clr} size={118} />}
        </div>
        {latest?.score != null && (
          <div style={{ marginTop: 18 }}>
            <BandScale score={latest.score} />
            <p className="micro" style={{ margin: '8px 0 0' }}>
              Position on the {info.instrument}-anchored rubric — a reference range, not a percentile.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        {latest && latest.score != null && (
          <Section title="Why this score" i={1}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 10px' }}>
              <b style={{ textTransform: 'capitalize' }}>{band.name} ({band.min}–
              {(BANDS[BANDS.indexOf(band) - 1]?.min ?? 101) - 1})</b> on the rubric: {band.desc}.
              {latest.reasoning ? ` ${latest.reasoning}` : ''}
            </p>
            {latest.evidence?.length > 0 && latestSession?.transcript ? (
              <>
                <p className="micro" style={{ margin: '0 0 4px' }}>
                  Grounded in what you actually said — highlighted in place:
                </p>
                {latest.evidence.slice(0, 3).map((q, i) => (
                  <Trace key={i} quote={q} transcript={latestSession.transcript} />
                ))}
                <p className="micro" style={{ margin: '6px 0 0' }}>
                  {latest.evidence_verified
                    ? '✓ Every quote verified verbatim against your transcript before scoring.'
                    : 'Evidence could not be verified verbatim — this score was withheld from your composite.'}
                </p>
              </>
            ) : (
              <p className="micro">No verbatim evidence for this dimension in the last session.</p>
            )}
            {baseline && (
              <div className="block powder" style={{ marginTop: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 13, margin: 0, color: 'var(--navy)', fontWeight: 600 }}>{baseline}</p>
              </div>
            )}
          </Section>
        )}

        {latest && latest.score != null && (
          <Section title="Does this feel right?" i={2}>
            <div className="feedback-row">
              {[['low', 'Too low'], ['accurate', 'Feels right'], ['high', 'Too high']].map(([v, l]) => (
                <button key={v} className={'opt' + (fb === v ? ' sel' : '')} onClick={() => giveFeedback(v)}>
                  {fb === v && <CheckIcon size={12} style={{ marginRight: 4 }} />}{l}
                </button>
              ))}
            </div>
            <p className="micro" style={{ margin: '8px 0 0' }}>
              Your feedback calibrates future Blueprints — Setmycareer learns how you, specifically, talk about {info.name.toLowerCase()}.
            </p>
          </Section>
        )}

        <Section title="Across your sessions" i={3}>
          <AppleBars points={points} color={clr} />
        </Section>

        <Section title="What Setmycareer listens for" i={4}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0 }}>{info.listensFor}</p>
        </Section>

        <Section title="Why it matters" i={5}>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: '0 0 12px' }}>{info.whyItMatters}</p>
          <p className="label" style={{ margin: '0 0 6px' }}>The research</p>
          {info.citations.map((cite, i) => (
            <p key={i} className="micro" style={{ margin: '6px 0', lineHeight: 1.55, paddingLeft: 10, borderLeft: '2px solid var(--powder)' }}>
              {cite}
            </p>
          ))}
        </Section>

        <motion.div className="block navy" {...item(6)} style={{ marginTop: 20 }}>
          <p className="label" style={{ marginTop: 0 }}>Try this</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: '4px 0 0' }}>{info.tryThis}</p>
        </motion.div>

        <p className="micro" style={{ textAlign: 'center', padding: '18px 16px 0' }}>
          Anchored to {info.instrument} constructs — a tracking signal, not a score on the instrument itself.
        </p>
      </div>
    </div>
  )
}
