import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronIcon, InfoIcon, CheckIcon, LockIcon, BackIcon, AddIcon, ChatIcon } from '../components/Icons'
import { METRICS, METRIC_BY_KEY, WHY_THESE, bandFor, stateColor } from '../lib/science'
import { loadSampleData } from '../lib/sample'
import { getInsights, careerRead, laborOutlook } from '../lib/api'
import { getLifestyle, saveCheckin, today, getRoster, saveRosterEntry, deleteRosterEntry, circleFieldFor, getCareerProfile, saveCareerProfile } from '../lib/store'
import { computeCareer, CAREER_DIMS } from '../lib/career'
import { lifeBlend } from '../lib/blend'
import { fmtWage } from '../lib/labor'
import { ScrubLine, CountUp } from '../components/charts'
import { PhaseRing, Pill, MiniRing, Dial } from '../components/gauges'
import PathTimeline from '../components/PathTimeline'
import SignalCard from '../components/SignalCard'
import CircleSheet from '../components/CircleSheet'
import CareerSheet from '../components/CareerSheet'
import { wellnessContext, longitudinalPatterns } from '../lib/wellness'


const STYLE_LABEL = {
  gentle_support: 'holding space gently',
  soft_check_in: 'a soft check-in',
  warm_encouraging: 'warm encouragement',
  steady_reflective: 'steady reflection',
}

const analyzed = (sessions) => sessions.filter((s) => s.analysis?.metrics)
const fmtDay = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const smooth = [0.2, 0.8, 0.2, 1]
const item = (i) => ({
  initial: { y: 12 },
  animate: { y: 0 },
  transition: { duration: 0.4, ease: smooth, delay: Math.min(i * 0.05, 0.4) },
})

export function MiniSpark({ points, color = 'var(--navy)', width = 60, height = 26 }) {
  if (!points || points.length < 2) return <div className="metric-spark" />
  const Pd = 2
  const xs = points.map((_, i) => Pd + (i / (points.length - 1)) * (width - 2 * Pd))
  const ys = points.map((v) => height - Pd - (v / 100) * (height - 2 * Pd))
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg className="metric-spark" viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <circle cx={xs.at(-1)} cy={ys.at(-1)} r="2.6" fill={color} />
    </svg>
  )
}


/* ---- Career layer — professional Blueprint grounded in bundled labor data ---- */
function CareerView({ career, profile, onEdit }) {
  const r = career ? computeCareer(career) : null
  const [live, setLive] = useState(null)        // live BLS wage { wage, year }
  const [read, setRead] = useState(null)        // deeper grounded read
  const [loadingRead, setLoadingRead] = useState(false)
  const soc = r?.occ?.code

  // refresh the target's wage from the live BLS API (clean SOCs only); snapshot stands otherwise
  useEffect(() => {
    setLive(null); setRead(null)
    if (soc && /^\d{2}-\d{4}$/.test(soc)) {
      laborOutlook(soc).then((o) => { if (o?.live) setLive(o) }).catch(() => {})
    }
  }, [soc])

  if (!r) {
    return (
      <motion.div {...item(1)} className="block powder" style={{ textAlign: 'center', padding: '38px 24px' }}>
        <p style={{ fontWeight: 650, fontSize: 16, color: 'var(--navy)', margin: '0 0 6px' }}>Build your career layer</p>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 18px' }}>
          Tell Setmycareer where you're aiming and what you bring. We match it against open labor data
          (O*NET · BLS) on your device for clarity, market readiness, skill coverage and fit.
        </p>
        <button className="btn primary" onClick={onEdit}>Set up my career layer</button>
      </motion.div>
    )
  }

  async function loadRead() {
    setLoadingRead(true)
    try {
      setRead(await careerRead({ target: career.target, current: career.current, skills: career.skills, goal: career.goal }))
    } catch { setRead({ summary: '', moves: [], citations: [] }) }
    setLoadingRead(false)
  }

  const clr = stateColor(r.index)
  return (
    <>
      <motion.div className="hero-card" {...item(0)} style={{ alignItems: 'stretch', textAlign: 'left', gap: 8, marginBottom: 12 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="label" style={{ margin: 0 }}>Career index · {r.occ.title}</p>
            <div className="row" style={{ gap: 7, alignItems: 'baseline' }}>
              <span className="big-num" style={{ fontSize: 50, color: clr }}>{r.index ?? '–'}</span>
              <span style={{ fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
            {bandFor(r.index) && <Pill color={clr} solid>{bandFor(r.index).name}</Pill>}
            <button className="chip" style={{ padding: '7px 12px' }} onClick={onEdit}>Edit</button>
          </div>
        </div>
        <div className="scrub-readout" style={{ marginTop: 4 }}>
          <p className="label" style={{ margin: '0 0 6px' }}>Outlook · {live ? `BLS live ${live.year}` : 'BLS snapshot'}</p>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--good)' }}>▲ {r.outlook.growth}% <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 12.5 }}>by 2032</span></span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtWage(live ? live.wage : r.outlook.wage)} <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 12.5 }}>median/yr{live ? '' : ''}</span></span>
            <span className="micro" style={{ color: clr, fontWeight: 600 }}>{r.outlook.label}</span>
          </div>
        </div>
      </motion.div>

      <motion.p className="label" {...item(1)} style={{ padding: '4px 2px 10px' }}>Signals</motion.p>
      <div className="bento">
        {CAREER_DIMS.map((d, i) => {
          const v = r.dims[d.key]
          const has = v?.score != null
          return (
            <motion.div key={d.key} className="cell line" {...item(2 + i)}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <span className="c-label" style={{ color: d.hue }}>{d.name}</span>
                <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                  <MiniRing value={has ? v.score : 0} color={has ? d.hue : 'var(--line)'} size={40} thickness={5} />
                  <span className="big-num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12.5, color: has ? d.hue : 'var(--ink-3)' }}>
                    {has ? v.score : '–'}
                  </span>
                </div>
              </div>
              <span className="c-sub" style={{ lineHeight: 1.4 }}>{has ? d.why : 'Add more over time and this sharpens.'}</span>
              {has && <span className="conf-chip" style={{ color: v.confidence === 'moderate' ? 'var(--ink-2)' : 'var(--ink-3)' }}>{v.confidence} confidence</span>}
            </motion.div>
          )
        })}
      </div>

      {r.coverage && (
        <motion.div {...item(7)} className="block powder" style={{ marginTop: 12 }}>
          <p className="label" style={{ margin: '0 0 8px' }}>Skill coverage · {r.coverage.pct}%</p>
          {r.coverage.matched.length > 0 && (
            <>
              <p className="micro" style={{ margin: '0 0 6px' }}>Already in your kit</p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: r.coverage.missing.length ? 12 : 0 }}>
                {r.coverage.matched.map((s) => <span key={s} className="chip on" style={{ padding: '5px 11px' }}>{s}</span>)}
              </div>
            </>
          )}
          {r.coverage.missing.length > 0 && (
            <>
              <p className="micro" style={{ margin: '0 0 6px' }}>Worth prioritizing next</p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {r.coverage.missing.slice(0, 4).map((s) => <span key={s} className="chip accent" style={{ padding: '5px 11px' }}>{s}</span>)}
              </div>
            </>
          )}
        </motion.div>
      )}

      {r.opportunities.length > 0 && (
        <motion.div {...item(8)} style={{ marginTop: 18 }}>
          <p className="label" style={{ padding: '0 2px 8px' }}>Doors open · roles within reach</p>
          <div className="col" style={{ gap: 8 }}>
            {r.opportunities.map((o) => (
              <div key={o.title} className="row between" style={{ padding: '12px 14px', background: 'var(--powder-soft)', borderRadius: 'var(--r-md)' }}>
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{o.title}</span>
                <span className="micro" style={{ color: 'var(--good)', fontWeight: 700 }}>▲ {o.growth}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* deeper read — labor-RAG-grounded next moves, on demand (cost-aware) */}
      <motion.div {...item(9)} style={{ marginTop: 18 }}>
        {!read && (
          <button className="btn soft block" disabled={loadingRead} onClick={loadRead}>
            {loadingRead ? 'Reading the market…' : 'Get a deeper read'}
          </button>
        )}
        {read && (
          <div className="block powder" style={{ textAlign: 'left' }}>
            <p className="label" style={{ margin: '0 0 8px' }}>Your next moves · grounded in labor data</p>
            {read.summary && <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 12px', color: 'var(--ink)' }}>{read.summary}</p>}
            <div className="col" style={{ gap: 10 }}>
              {(read.moves || []).map((m, i) => (
                <div key={i} className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 999, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>{m.title}</div>
                    {m.why && <div className="micro" style={{ lineHeight: 1.45 }}>{m.why}</div>}
                  </div>
                </div>
              ))}
            </div>
            {(read.citations || []).length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {read.citations.map((c, i) => <span key={i} className="chip" style={{ padding: '4px 10px', fontSize: 11 }}>{c}</span>)}
              </div>
            )}
            {!read.summary && !(read.moves || []).length && (
              <p className="micro" style={{ margin: 0 }}>Couldn&apos;t reach the reasoner just now — try again in a moment.</p>
            )}
          </div>
        )}
      </motion.div>

      <p className="micro" style={{ textAlign: 'center', margin: '18px 0 0', lineHeight: 1.5 }}>
        Grounded in open labor data (O*NET · BLS){live ? ` · wage refreshed live from BLS (${live.year})` : ' — wage is a snapshot'}. Decision support, not a guarantee.
      </p>
    </>
  )
}

/* ---- BOTH layer — one life-performance master over personal + career tickers ---- */
const TENSION_CLR = { burnout: '#F97316', underbuilt: '#2563EB', 'both-low': '#C25B50', aligned: 'var(--good)' }

function BothView({ done, career, onLayer, onEditCareer, clientProps }) {
  const ordered = [...done].sort((a, b) => a.startedAt - b.startedAt)
  const latest = ordered.at(-1)
  const cur = latest?.analysis?.metrics
  const personalIdx = cur?.wellbeing_index ?? null
  const series = ordered.map((s) => s.analysis?.metrics?.wellbeing_index).filter((v) => v != null)
  const personalDelta = series.length >= 2 ? series.at(-1) - series.at(-2) : null
  const personalEmotion = cur?.dominant_emotions?.[0]?.emotion
  const blend = lifeBlend({ personalIdx, personalDelta, personalEmotion, career })

  // only one layer has signal → defer to that layer's full view
  if (blend.careerIdx == null) return <ClientView done={done} {...clientProps} />
  if (personalIdx == null) return <CareerView career={career} profile={clientProps.profile} onEdit={onEditCareer} />

  const lifeClr = stateColor(blend.life)
  const pClr = stateColor(personalIdx)
  const cClr = stateColor(blend.careerIdx)
  return (
    <>
      <motion.div className="hero-card" {...item(0)} style={{ alignItems: 'stretch', textAlign: 'left', gap: 10, marginBottom: 12 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="label" style={{ margin: 0 }}>Career index</p>
            <div className="row" style={{ gap: 7, alignItems: 'baseline' }}>
              <span className="big-num" style={{ fontSize: 50, color: cClr }}>{blend.careerIdx}</span>
              <span style={{ fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>/100</span>
            </div>
          </div>
          {blend.lifeBand && <Pill color={cClr} solid>{blend.lifeBand.name}</Pill>}
        </div>

        <div className="bento" style={{ gap: 10 }}>
          <button className="cell powder" onClick={onEditCareer} style={{ alignItems: 'stretch', textAlign: 'left' }}>
            <span className="c-label">Direction</span>
            <span className="c-value" style={{ fontSize: 19, color: cClr }}>{blend.career?.occ?.title || 'Set a target'}</span>
            <span className="c-sub">{blend.career?.occ?.title ? blend.career.outlook.label : 'tap to refine your career'}</span>
          </button>
          <div className="cell powder" style={{ alignItems: 'stretch', textAlign: 'left' }}>
            <div className="row between"><span className="c-label">Wellbeing</span>
              {personalDelta != null && <span style={{ fontSize: 11, fontWeight: 700, color: personalDelta >= 0 ? 'var(--good)' : 'var(--bad)' }}>{personalDelta >= 0 ? '▲' : '▼'} {Math.abs(personalDelta)}</span>}
            </div>
            <span className="c-value" style={{ color: pClr }}>{personalIdx}</span>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <span className="c-sub">{personalEmotion || 'how you feel'}</span>
              {series.length >= 2 && <MiniSpark points={series} color={pClr} width={54} height={20} />}
            </div>
          </div>
        </div>

        {blend.tension && (
          <div className="row" style={{ gap: 10, padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'var(--powder-soft)', borderLeft: `3px solid ${TENSION_CLR[blend.tension.kind] || 'var(--navy)'}`, alignItems: 'flex-start' }}>
            <InfoIcon size={15} style={{ color: TENSION_CLR[blend.tension.kind] || 'var(--navy)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)' }}>{blend.tension.text}</span>
          </div>
        )}
        <p className="micro" style={{ margin: 0 }}>Your wellbeing is read alongside your career — when one starts pulling on the other, you&apos;ll see it here first.</p>
      </motion.div>

      <CareerView career={career} profile={clientProps.profile} onEdit={onEditCareer} />

      <div className="hairline" style={{ margin: '24px 0 16px' }} />
      <p className="label" style={{ margin: '0 0 12px' }}>Wellbeing signals</p>
      <ClientView done={done} {...clientProps} />
    </>
  )
}

export default function Dashboard({ sessions, profile, layer = 'both', onLayer, onOpen, onOpenMetric, onRefresh, onOpenChat }) {
  const done = analyzed(sessions)
  const isClinician = profile.role === 'clinician'
  const [loading, setLoading] = useState(false)
  const [why, setWhy] = useState(false)
  const [lifestyle, setLifestyle] = useState([])
  const [roster, setRoster] = useState([])
  const reloadRoster = () => getRoster(profile.role).then(setRoster)
  const [career, setCareer] = useState(null)
  const [careerEdit, setCareerEdit] = useState(false)

  useEffect(() => { getLifestyle().then(setLifestyle); reloadRoster(); getCareerProfile().then(setCareer) }, [profile.role])

  async function seed() {
    setLoading(true)
    await loadSampleData()
    await onRefresh()
    setLoading(false)
  }

  return (
    <div className="screen">
      <motion.div {...item(0)}>
        <p className="label" style={{ margin: 0 }}>Your career, in focus</p>
        <h1 className="display" style={{ marginBottom: 10 }}>Blueprint</h1>
        <div className="row between" style={{ marginBottom: 18, gap: 10 }}>
          <div className="trust-line">
            <LockIcon size={13} />
            {isClinician ? 'Every client record stays on this device.' : 'Computed on your device — nothing leaves your phone.'}
          </div>
          {!isClinician && onOpenChat && (
            <button className="chip accent" style={{ flexShrink: 0, gap: 6, padding: '8px 13px' }} onClick={onOpenChat}>
              <ChatIcon size={15} /> Ask Setmycareer
            </button>
          )}
        </div>
      </motion.div>

      {/* the career layer is driven by the career profile, not sessions — so the
          professional view (and a career-only BOTH view) show even with no recordings */}
      {done.length === 0 && !(((layer === 'professional') || (layer === 'both' && career)) && !isClinician) ? (
        <motion.div {...item(1)} style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p className="muted" style={{ margin: '0 0 18px' }}>
            Generate a Blueprint from a verified session and your
            {isClinician ? ' caseload' : ''} insights appear here.
          </p>
          <button className="btn primary" disabled={loading} onClick={seed}>
            {loading ? 'Loading…' : 'Preview with sample data'}
          </button>
        </motion.div>
      ) : isClinician
        ? <ClinicianView done={done} onOpen={onOpen} profile={profile} roster={roster}
            onSaveEntry={async (e) => { await saveRosterEntry(profile.role, e); await reloadRoster() }}
            onDelete={async (id) => { await deleteRosterEntry(profile.role, id); await reloadRoster(); await onRefresh?.() }} />
        : layer === 'professional'
          ? <CareerView career={career} profile={profile} onEdit={() => setCareerEdit(true)} />
          : layer === 'both'
            ? <BothView done={done} career={career} onLayer={onLayer} onEditCareer={() => setCareerEdit(true)}
                clientProps={{ profile, onOpenMetric, onOpen, why, setWhy, lifestyle, setLifestyle }} />
            : <ClientView done={done} onOpenMetric={onOpenMetric} onOpen={onOpen} why={why} setWhy={setWhy}
                lifestyle={lifestyle} setLifestyle={setLifestyle} />}

      <AnimatePresence>
        {careerEdit && (
          <CareerSheet initial={career}
            onClose={() => setCareerEdit(false)}
            onSave={async (patch) => { const next = await saveCareerProfile(patch); setCareer(next); setCareerEdit(false) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---- today's check-in, inline in the bento ---- */
function CheckinCells({ lifestyle, setLifestyle }) {
  const done = lifestyle.find((e) => e.date === today())
  const [open, setOpen] = useState(false)
  const [sleep, setSleep] = useState(done?.sleepHrs ?? null)
  const [active, setActive] = useState(done?.activeMin ?? null)
  const [stress, setStress] = useState(done?.stress ?? null)

  async function save() {
    await saveCheckin({ date: today(), sleepHrs: sleep, activeMin: active, stress })
    setLifestyle(await getLifestyle())
    setOpen(false)
  }

  if (!open) {
    return (
      <>
        <button className="cell soft" onClick={() => setOpen(true)}>
          <span className="c-label">Sleep</span>
          <span className="c-value" style={{ color: '#6366F1' }}>{done?.sleepHrs != null ? done.sleepHrs + 'h' : '–'}</span>
          <span className="c-sub">{done ? 'last night' : 'tap to log'}</span>
        </button>
        <button className="cell soft" onClick={() => setOpen(true)}>
          <span className="c-label">Movement</span>
          <span className="c-value" style={{ color: '#10B981' }}>{done?.activeMin != null ? done.activeMin + 'm' : '–'}</span>
          <span className="c-sub">{done ? 'today' : 'tap to log'}</span>
        </button>
      </>
    )
  }

  const Chips = ({ list, val, set, fmt = (x) => x }) => (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
      {list.map((v) => (
        <button key={v} className={'opt' + (val === v ? ' sel' : '')} style={{ padding: '6px 11px', fontSize: 12 }}
          onClick={() => set(v)}>{fmt(v)}</button>
      ))}
    </div>
  )

  return (
    <div className="cell soft span2" style={{ gap: 10 }}>
      <span className="c-label">Today&apos;s check-in</span>
      <div className="col" style={{ gap: 8 }}>
        <Chips list={[4, 5, 6, 7, 8, 9]} val={sleep} set={setSleep} fmt={(v) => v + 'h sleep'} />
        <Chips list={[0, 15, 30, 60, 90]} val={active} set={setActive} fmt={(v) => v + 'm move'} />
        <Chips list={[1, 2, 3, 4, 5]} val={stress} set={setStress} fmt={(v) => 'stress ' + v} />
      </div>
      <button className="btn primary" style={{ minHeight: 40, padding: '8px 20px', alignSelf: 'flex-start' }}
        disabled={sleep == null && active == null && stress == null} onClick={save}>
        <CheckIcon size={14} /> Log it
      </button>
    </div>
  )
}

/* ---- Client: cycle-tracker hero ring + weather-style gauge bento ---- */
function ClientView({ done, onOpenMetric, onOpen, why, setWhy, lifestyle, setLifestyle }) {
  const ordered = [...done].sort((a, b) => a.startedAt - b.startedAt)
  const latest = ordered.at(-1)
  const cur = latest.analysis.metrics
  const series = ordered.map((s) => s.analysis.metrics.wellbeing_index).filter((v) => v != null)
  const delta = series.length >= 2 && cur.wellbeing_index != null
    ? cur.wellbeing_index - series.at(-2) : null
  const top = cur.dominant_emotions?.[0]
  const idx = cur.wellbeing_index
  const sClr = stateColor(idx)
  const sName = bandFor(idx)?.name

  // longitudinal timeline points for the master-index terminal
  const tl = ordered
    .filter((s) => s.analysis.metrics.wellbeing_index != null)
    .map((s) => ({ t: s.startedAt, v: s.analysis.metrics.wellbeing_index, emotion: s.analysis.metrics.dominant_emotions?.[0]?.emotion, id: s.id }))
  const [selPt, setSelPt] = useState(null)
  const selIdx = selPt ? tl.findIndex((p) => p.id === selPt.id) : tl.length - 1
  const selDelta = selIdx > 0 ? tl[selIdx].v - tl[selIdx - 1].v : null
  // forensics: the verbatim line behind the selected point
  const selSession = selIdx >= 0 ? ordered.find((s) => s.id === tl[selIdx]?.id) : null
  const selWhy = selSession?.analysis?.evidence?.[0]?.quote
    || selSession?.analysis?.metrics?.dominant_emotions?.[0]?.quote || null
  // the selected session's dimensions (3 most notable = lowest) — the live readout
  const selDims = selSession
    ? Object.entries(selSession.analysis.metrics.dimensions || {})
        .filter(([, v]) => v.score != null)
        .map(([k, v]) => ({ m: METRIC_BY_KEY[k], score: v.score }))
        .filter((x) => x.m).sort((a, b) => a.score - b.score).slice(0, 3)
    : []

  // movers: dimensions that shifted most since the previous session
  const prevDims = ordered.length >= 2 ? ordered.at(-2).analysis.metrics.dimensions : null
  const movers = prevDims ? METRICS.map((m) => {
    const now = cur.dimensions?.[m.key]?.score, was = prevDims[m.key]?.score
    return now != null && was != null && Math.abs(now - was) >= 1 ? { m, d: now - was } : null
  }).filter(Boolean).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)) : []
  const blooms = movers.filter((x) => x.d > 0).slice(0, 2)
  const bloopers = movers.filter((x) => x.d < 0).slice(0, 2)

  // behavioral-scientist + contradiction read across sessions (on demand → cost-aware)
  const [insights, setInsights] = useState(null)
  const [loadingIns, setLoadingIns] = useState(false)
  async function loadInsights() {
    setLoadingIns(true)
    try {
      const history = ordered.map((s) => ({
        date: new Date(s.startedAt).toISOString().slice(0, 10),
        wellbeing: s.analysis.metrics.wellbeing_index,
        emotions: (s.analysis.metrics.dominant_emotions || []).map((e) => e.emotion).slice(0, 3),
        themes: (s.analysis.note?.themes || s.analysis.patterns?.themes || []).slice(0, 4),
      }))
      setInsights(await getInsights(history))
    } catch { setInsights({ patterns: [], contradictions: [] }) }
    setLoadingIns(false)
  }

  // the signal most worth attention (lowest score) — surfaced like a "focus"
  const scored = METRICS.map((m) => ({ m, s: cur.dimensions?.[m.key]?.score }))
    .filter((x) => x.s != null).sort((a, b) => a.s - b.s)
  const focus = scored[0]?.m

  const wc = wellnessContext(lifestyle, done)
  const patterns = longitudinalPatterns(lifestyle, done)

  return (
    <>
      {/* MASTER INDEX — the Blueprint as a scrubbable terminal over time */}
      <motion.div className="hero-card" {...item(0)} style={{ alignItems: 'stretch', textAlign: 'left', gap: 10, marginBottom: 12 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="label" style={{ margin: 0 }}>Your Blueprint{tl.length > 1 ? ` · since ${fmtDay(tl[0].t)}` : ''}</p>
            <div className="row" style={{ gap: 7, alignItems: 'baseline' }}>
              <span className="big-num" style={{ fontSize: 50, color: sClr }}>{idx ?? '–'}</span>
              <span style={{ fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
            {sName && <Pill color={sClr} solid>{sName}</Pill>}
            {delta != null && (
              <span className="micro" style={{ color: delta >= 0 ? 'var(--good)' : '#F97316', fontWeight: 700 }}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs last
              </span>
            )}
          </div>
        </div>
        <PathTimeline series={tl} onSelect={(p) => setSelPt(p)} />
        {tl.length > 1 && selSession && (
          <div className="scrub-readout">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <div className="row" style={{ gap: 7, alignItems: 'baseline' }}>
                <span className="big-num" style={{ fontSize: 28, color: stateColor(selPt ? selPt.v : tl[selIdx].v) }}>{tl[selIdx].v}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>/100</span>
                {bandFor(tl[selIdx].v) && <Pill color={stateColor(tl[selIdx].v)}>{bandFor(tl[selIdx].v).name}</Pill>}
                {selDelta != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: selDelta >= 0 ? 'var(--good)' : '#F97316' }}>
                    {selDelta >= 0 ? '▲' : '▼'} {Math.abs(selDelta)}
                  </span>
                )}
              </div>
              <span className="micro">{fmtDay(tl[selIdx].t)}{tl[selIdx].emotion ? ` · ${tl[selIdx].emotion}` : ''}</span>
            </div>
            <div className="col" style={{ gap: 6, marginTop: 8 }}>
              {selDims.map(({ m, score }) => (
                <div key={m.key} className="row" style={{ gap: 9, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, width: 92, flexShrink: 0, color: 'var(--ink-2)' }}>{m.name}</span>
                  <span className="mini-bar"><span style={{ width: score + '%', background: stateColor(score) }} /></span>
                  <span style={{ fontSize: 12, fontWeight: 700, width: 22, textAlign: 'right', color: stateColor(score) }}>{score}</span>
                </div>
              ))}
            </div>
            {selWhy && (
              <p className="scrub-why">why: &ldquo;{selWhy.length > 110 ? selWhy.slice(0, 110) + '…' : selWhy}&rdquo;</p>
            )}
            <button className="row" onClick={() => onOpen?.(tl[selIdx].id)}
              style={{ gap: 3, marginTop: 8, color: 'var(--navy)', fontWeight: 600, fontSize: 12.5 }}>
              Open this session <ChevronIcon size={14} />
            </button>
          </div>
        )}
      </motion.div>

      {(blooms.length > 0 || bloopers.length > 0) && (
        <motion.div className="cell line" {...item(1)} style={{ marginBottom: 12, gap: 8 }}>
          <span className="c-label">Movers · since last session</span>
          {[...blooms, ...bloopers].map(({ m, d }) => (
            <button key={m.key} className="row between" onClick={() => onOpenMetric(m.key)} style={{ padding: '5px 0', textAlign: 'left' }}>
              <span className="row" style={{ gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: m.hue[0], flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
              </span>
              <Pill color={d >= 0 ? '#10B981' : '#F97316'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}</Pill>
            </button>
          ))}
        </motion.div>
      )}

      {ordered.length >= 2 && (
        <motion.div className="block powder" {...item(1)} style={{ marginBottom: 12 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="c-label" style={{ opacity: 0.6 }}>Deeper patterns · across your sessions</span>
            {!insights && (
              <button className="chip accent" onClick={loadInsights} disabled={loadingIns}>
                {loadingIns ? 'Reading…' : 'Find patterns'}
              </button>
            )}
          </div>
          {!insights ? (
            <p className="micro" style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
              Setmycareer reads across all your sessions for recurring patterns and gentle contradictions between what you want and what you do.
            </p>
          ) : (
            <div className="col" style={{ gap: 9, marginTop: 8 }}>
              {(insights.patterns || []).map((p, i) => (
                <p key={'p' + i} style={{ fontSize: 14, lineHeight: 1.55, margin: 0, color: 'var(--navy)' }}>
                  • {p.text} <span className="micro">({p.confidence} confidence)</span>
                </p>
              ))}
              {(insights.contradictions || []).map((c, i) => (
                <p key={'c' + i} style={{ fontSize: 14, lineHeight: 1.55, margin: 0, color: 'var(--ink-2)' }}>
                  ⤫ {c.text}
                </p>
              ))}
              {!(insights.patterns || []).length && !(insights.contradictions || []).length && (
                <p className="micro" style={{ margin: 0 }}>Not enough yet to call a pattern — a few more sessions will sharpen this.</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {patterns.length > 0 && (
        <motion.div className="block powder" {...item(1)} style={{ marginBottom: 12 }}>
          <span className="c-label" style={{ opacity: 0.6 }}>Setmycareer noticed</span>
          {patterns.map((p, i) => (
            <p key={i} style={{ fontSize: 14.5, lineHeight: 1.6, margin: i ? '8px 0 0' : '6px 0 0', color: 'var(--navy)' }}>
              {p.text}
            </p>
          ))}
        </motion.div>
      )}

      {/* HERO — cycle-tracker ring: composite in the centre, a tappable node per signal */}
      <motion.div className="hero-card" {...item(patterns.length ? 2 : 1)}>
        <PhaseRing metrics={METRICS} dims={cur.dimensions} score={idx}
          stateName={sName} stateClr={sClr} onOpen={onOpenMetric} />
        <p className="hero-summary">{cur.clinical_summary || 'Your latest session, distilled into seven signals.'}</p>
        <span className="micro" style={{ opacity: 0.7 }}>Tap any node to open its deep-dive</span>
      </motion.div>

      {/* info cards (cycle "Ovulation / Next period") */}
      <motion.div className="bento" {...item(3)} style={{ marginTop: 12 }}>
        <div className="cell line infocard">
          <span className="c-label">Momentum</span>
          {delta == null
            ? <Pill color="#97A9B9">one more needed</Pill>
            : <Pill color={delta >= 0 ? '#10B981' : '#F97316'}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
              </Pill>}
          <span className="c-sub">{delta == null ? 'vs last session' : delta >= 0 ? 'gently rising' : 'a heavier week'}</span>
        </div>
        <div className="cell line infocard">
          <span className="c-label">Mostly feeling</span>
          <span className="c-value" style={{ fontSize: 21, textTransform: 'capitalize', color: 'var(--navy)' }}>{top?.emotion || '—'}</span>
          <span className="c-sub">{done.length} session{done.length > 1 ? 's' : ''} tracked</span>
        </div>

        {focus && (
          <button className="cell line infocard span2" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onClick={() => onOpenMetric(focus.key)}>
            <span className="focus-dot" style={{ background: focus.hue[0] }} />
            <div className="col" style={{ gap: 2, flex: 1, textAlign: 'left' }}>
              <span className="c-label" style={{ opacity: 0.6 }}>Bloopers · gentle flags, not failures</span>
              <span style={{ fontWeight: 650, fontSize: 15 }}>{focus.name}</span>
            </div>
            <Pill color={stateColor(scored[0].s)}>{bandFor(scored[0].s)?.name}</Pill>
            <ChevronIcon size={16} style={{ color: 'var(--ink-3)' }} />
          </button>
        )}

        <CheckinCells lifestyle={lifestyle} setLifestyle={setLifestyle} />

        {series.length >= 2 && (
          <div className="cell line span2" style={{ gap: 8 }}>
            <span className="c-label">Trend · {series.length} sessions · touch to explore</span>
            <ScrubLine color={sClr} points={ordered.filter(s => s.analysis.metrics.wellbeing_index != null)
              .map(s => ({ t: s.startedAt, v: s.analysis.metrics.wellbeing_index }))} />
          </div>
        )}

        {wc.burnout_risk != null && (
          <div className="cell navy span2" style={{ gap: 6 }}>
            <span className="c-label">Today Setmycareer will lean toward</span>
            <span className="c-value" style={{ fontSize: 19 }}>{STYLE_LABEL[wc.response_style]}</span>
            <span className="c-sub">
              sleep {wc.sleep_quality} · stress {wc.stress_load}
              {wc.burnout_risk != null ? ` · burnout risk ${Math.round(wc.burnout_risk * 100)}%` : ''}
            </span>
          </div>
        )}
      </motion.div>

      {/* signals — weather "current conditions" gauge cards */}
      <motion.div className="row between" {...item(4)} style={{ padding: '28px 2px 10px' }}>
        <span className="label">Signals</span>
        <button className="row gap" style={{ gap: 5, color: 'var(--ink-3)', fontSize: 12 }} onClick={() => setWhy(!why)}>
          <InfoIcon size={14} /> why these
        </button>
      </motion.div>
      {why && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="micro" style={{ margin: '0 2px 10px', lineHeight: 1.6 }}>
          {WHY_THESE}
        </motion.p>
      )}

      <div className="bento">
        {METRICS.map((m, i) => (
          <SignalCard key={m.key} compact metric={m} dim={cur.dimensions?.[m.key]}
            i={i} onClick={() => onOpenMetric(m.key)} />
        ))}
      </div>

      <motion.p className="micro" {...item(12)} style={{ textAlign: 'center', padding: '16px 20px 4px' }}>
        Wellness tracking grounded in validated instruments — not a diagnosis.
      </motion.p>
    </>
  )
}

/* ---- Clinician: caseload overview — a ring per patient, sorted by attention ---- */
const RISK_RANK = { high: 3, severe: 3, moderate: 2, elevated: 2, low: 1, mild: 1, none: 0 }
const RISK_CLR = { high: '#EF4444', severe: '#EF4444', moderate: '#F97316', elevated: '#F97316', low: '#F59E0B', mild: '#F59E0B' }

function ClinicianView({ done, onOpen, profile, roster = [], onSaveEntry, onDelete }) {
  const [managing, setManaging] = useState(false)
  const [openClient, setOpenClient] = useState(null) // client id whose case file is open

  // Build the client list from the roster first; then fold in any legacy /
  // unfiled sessions grouped by their pairing peer so nothing is ever lost.
  const field = circleFieldFor('clinician') // 'clientId'
  const rosterIds = new Set(roster.map((c) => c.id))
  const clients = roster.map((c) => ({
    id: c.id, name: c.name, role: c.role, note: c.note,
    items: done.filter((s) => s[field] === c.id).sort((a, b) => a.startedAt - b.startedAt),
  }))
  const peerMap = new Map()
  for (const s of done) {
    if (s[field] && rosterIds.has(s[field])) continue
    const key = s.peer?.name || 'Unfiled'
    if (!peerMap.has(key)) peerMap.set(key, [])
    peerMap.get(key).push(s)
  }
  for (const [name, items] of peerMap) {
    items.sort((a, b) => a.startedAt - b.startedAt)
    clients.push({ id: 'peer:' + name, name, virtual: true, items })
  }

  // per-client stats
  const stat = (c) => {
    const latest = c.items.at(-1)
    const m = latest?.analysis?.metrics
    return {
      ...c, latest, count: c.items.length, score: m?.wellbeing_index ?? null,
      risk: latest?.analysis?.risk?.overall_level,
      topEmotion: m?.dominant_emotions?.[0]?.emotion,
    }
  }
  const rows = clients.map(stat).sort((a, b) =>
    (b.count > 0) - (a.count > 0)
    || (RISK_RANK[b.risk] || 0) - (RISK_RANK[a.risk] || 0)
    || (a.score ?? 101) - (b.score ?? 101))
  const flagged = rows.filter((p) => (RISK_RANK[p.risk] || 0) >= 2).length

  const current = rows.find((c) => c.id === openClient)

  return (
    <>
      <motion.div className="bento" {...item(1)}>
        <div className="cell soft">
          <span className="c-label">Caseload</span>
          <span className="c-value"><CountUp value={rows.length} /></span>
          <span className="c-sub">{rows.length === 1 ? 'client' : 'clients'}</span>
        </div>
        <div className="cell soft">
          <span className="c-label">Need attention</span>
          <span className="c-value" style={{ color: flagged ? '#F97316' : '#10B981' }}><CountUp value={flagged} /></span>
          <span className="c-sub">{flagged ? 'flagged this week' : 'all steady'}</span>
        </div>
      </motion.div>

      <motion.div className="row between" {...item(2)} style={{ padding: '24px 2px 10px', alignItems: 'center' }}>
        <p className="label" style={{ margin: 0 }}>Clients · most in need first</p>
        <button className="chip" style={{ padding: '8px 12px', gap: 5 }} onClick={() => setManaging(true)}>
          <AddIcon size={14} /> Client
        </button>
      </motion.div>

      {rows.length === 0 && (
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, padding: '0 2px' }}>
          Add a client, then file their sessions under them from the Sessions tab. Each client gets their own case file — sessions, trend, and notes.
        </p>
      )}

      <div className="col" style={{ gap: 10 }}>
        {rows.map((p, i) => (
          <motion.button key={p.id} className="patient-card" onClick={() => setOpenClient(p.id)} {...item(3 + i)}>
            <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
              <MiniRing value={p.score ?? 0} color={stateColor(p.score)} size={54} thickness={6} />
              <span className="big-num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 17, color: stateColor(p.score) }}>
                {p.score ?? '–'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>{p.name}</div>
              <div className="micro">
                {p.count === 0 ? 'no sessions yet' : `${p.count} blueprint${p.count > 1 ? 's' : ''}${p.topEmotion ? ` · feeling ${p.topEmotion}` : ''}`}
              </div>
            </div>
            {p.count > 0 && (p.risk && p.risk !== 'none'
              ? <Pill color={RISK_CLR[p.risk] || '#F59E0B'} solid>{p.risk} risk</Pill>
              : <Pill color={stateColor(p.score)}>{bandFor(p.score)?.name}</Pill>)}
            <ChevronIcon size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {managing && (
          <CircleSheet profile={profile} roster={roster} mode="manage"
            onClose={() => setManaging(false)}
            onSaveEntry={onSaveEntry} onDelete={onDelete} />
        )}
        {current && (
          <CaseFile key="case" client={current} onOpen={onOpen} onClose={() => setOpenClient(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ---- Clinician: a single client's case file (their sessions, trend, notes) ---- */
function CaseFile({ client, onOpen, onClose }) {
  const series = client.items
    .filter((s) => s.analysis?.metrics?.wellbeing_index != null)
    .map((s) => ({ t: s.startedAt, v: s.analysis.metrics.wellbeing_index, emotion: s.analysis.metrics.dominant_emotions?.[0]?.emotion, id: s.id }))
  const latest = client.latest
  const score = latest?.analysis?.metrics?.wellbeing_index ?? null

  return createPortal((
    <motion.div className="metric-overlay" style={{ zIndex: 55 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.26, ease: smooth }}>
      <div className="screen">
        <button className="icon-btn" onClick={onClose} aria-label="Back" style={{ marginBottom: 14 }}><BackIcon size={20} /></button>
        <p className="label" style={{ margin: 0 }}>Case file{client.role ? ` · ${client.role}` : ''}</p>
        <h1 className="display" style={{ marginBottom: 8 }}>{client.name}</h1>
        {client.note && <p className="muted" style={{ fontSize: 13.5, margin: '0 0 12px' }}>{client.note}</p>}

        {score != null && (
          <div className="row" style={{ gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
            <span className="big-num" style={{ fontSize: 40, color: stateColor(score) }}>{score}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>/100</span>
            {bandFor(score) && <Pill color={stateColor(score)}>{bandFor(score).name}</Pill>}
          </div>
        )}

        {series.length > 1 && (
          <div className="block powder" style={{ padding: 14, marginBottom: 16 }}>
            <p className="label" style={{ margin: '0 0 4px' }}>Their trend · {series.length} sessions</p>
            <PathTimeline series={series} onSelect={() => {}} height={120} />
          </div>
        )}

        <p className="label" style={{ padding: '4px 2px 8px' }}>Sessions</p>
        {client.items.length === 0
          ? <p className="muted" style={{ fontSize: 13.5, padding: '0 2px' }}>No sessions filed under {client.name} yet. File one from the Sessions tab.</p>
          : (
            <div>
              {[...client.items].reverse().map((s) => {
                const sc = s.analysis?.metrics?.wellbeing_index ?? null
                return (
                  <button key={s.id} className="sig-row" onClick={() => onOpen(s.id)}>
                    <span className="big-num" style={{ fontSize: 24, color: sc == null ? 'var(--ink-3)' : stateColor(sc), width: 40, textAlign: 'left' }}>{sc ?? '–'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{fmtDay(s.startedAt)}</div>
                      <div className="micro">{s.analysis?.metrics?.dominant_emotions?.[0]?.emotion || 'session'}</div>
                    </div>
                    <ChevronIcon size={16} style={{ color: 'var(--ink-3)' }} />
                  </button>
                )
              })}
            </div>
          )}
      </div>
    </motion.div>
  ), document.body)
}
