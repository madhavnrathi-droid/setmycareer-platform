import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BackIcon, ShareIcon, LockIcon, CheckIcon, QrIcon, EditIcon, ExportIcon, RenewIcon } from '../components/Icons'
import Ring from '../components/Ring'
import Aurora from '../components/Aurora'
import DimensionBento from '../components/DimensionBento'
import Pair from '../components/Pair'
import AnalyzingOverlay from '../components/AnalyzingOverlay'
import { transcribe, analyze, analyzeStream } from '../lib/api'
import { saveSession, getAudio, deleteSession, getLifestyle, getSessions, getJournal, recordIndexPoint } from '../lib/store'
import { buildIntakeContext } from '../lib/context'
import { bandFor, stateColor, METRIC_BY_KEY } from '../lib/science'

const smooth = [0.2, 0.8, 0.2, 1]
const fmt = (ts) => new Date(ts).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const fmtDay = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const MODALITIES = [['general', 'General'], ['cbt', 'CBT'], ['psychodynamic', 'Psychodynamic'], ['dbt', 'DBT'], ['act', 'ACT']]

function md(mdText) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
  let html = '', inList = false
  for (const raw of esc(mdText || '').split('\n')) {
    const line = raw.trimEnd()
    if (/^- /.test(line)) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(line.slice(2))}</li>`; continue }
    if (inList) { html += '</ul>'; inList = false }
    if (/^### /.test(line)) html += `<h3>${inline(line.slice(4))}</h3>`
    else if (/^## /.test(line)) html += `<h2>${inline(line.slice(3))}</h2>`
    else if (line.trim()) html += `<p>${inline(line)}</p>`
  }
  if (inList) html += '</ul>'
  return html
}

/* The reflection — Setmycareer's warm, client-facing voice. Readable light card with a
   blue accent and a highlighted single next step. */
const REFL_FB = [['spot_on', 'Spot on'], ['not_quite', 'Not quite'], ['too_much_advice', 'Too much advice'], ['missed', 'Missed it']]

function ReflectionCard({ reflection: r, feedback, onFeedback }) {
  if (!r || !r.generated || !r.opening) return null
  const cur = feedback?.rating
  return (
    <motion.div className="card reflection-card" initial={{ y: 10 }} animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: smooth }}>
      <p className="label" style={{ marginTop: 0, color: 'var(--navy)' }}>From Setmycareer</p>
      <p className="refl-lead">{r.opening}</p>
      {r.noticing && <p className="refl-body">{r.noticing}</p>}
      {r.strength && <p className="refl-body"><b>What&apos;s working — </b>{r.strength}</p>}
      {r.reframe && <p className="refl-body">{r.reframe}</p>}
      {r.suggestion?.title && (
        <div className="refl-suggestion">
          <span className="label" style={{ color: 'var(--navy)' }}>One small thing to try</span>
          <p className="refl-sug-title">{r.suggestion.title}</p>
          {r.suggestion.why && <p className="refl-sug-why">{r.suggestion.why}</p>}
        </div>
      )}
      {r.question && <p className="refl-question">{r.question}</p>}
      {r.closing && <p className="refl-closing">{r.closing}</p>}

      <div className="hairline" style={{ margin: '16px 0 12px' }} />
      <p className="label" style={{ margin: '0 0 8px' }}>Did this land?</p>
      <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
        {REFL_FB.map(([v, l]) => (
          <button key={v} className={'opt' + (cur === v ? ' sel' : '')} style={{ padding: '7px 12px', fontSize: 12.5 }}
            onClick={() => onFeedback(cur === v ? null : v)}>
            {cur === v && <CheckIcon size={12} style={{ marginRight: 4 }} />}{l}
          </button>
        ))}
      </div>
      <p className="micro" style={{ margin: '10px 0 0' }}>
        {cur ? 'Thanks — Setmycareer quietly tunes future reflections to you, all on this device.'
          : 'Your reaction tunes future reflections — privately, on this device. Not a diagnosis; you know yourself best.'}
      </p>
    </motion.div>
  )
}

export default function SessionDetail({ session, profile, onBack, onUpdated, onDeleted }) {
  const [busy, setBusy] = useState(null) // 'transcribe' | 'analyze'
  const [stage, setStage] = useState(null)
  const [pairing, setPairing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  // session-info editing
  const [editInfo, setEditInfo] = useState(false)
  const [infoName, setInfoName] = useState(session.peer?.name || '')
  const [infoDate, setInfoDate] = useState(new Date(session.startedAt).toISOString().slice(0, 10))
  const [infoModality, setInfoModality] = useState(session.modality || 'general')

  const isClinician = profile.role === 'clinician'
  const m = session.analysis?.metrics
  const risk = session.analysis?.risk
  const reflection = session.analysis?.reflection
  const sClr = stateColor(m?.wellbeing_index)
  const sName = bandFor(m?.wellbeing_index)?.name
  const top = m?.dominant_emotions?.[0]

  async function update(patch) {
    const next = { ...session, ...patch }
    await saveSession(next)
    onUpdated(next)
  }

  async function saveInfo() {
    setEditInfo(false)
    const startedAt = new Date(infoDate + 'T12:00:00').getTime() || session.startedAt
    await update({
      peer: infoName.trim() ? { name: infoName.trim(), role: session.peer?.role || (isClinician ? 'client' : 'clinician') } : null,
      startedAt,
      modality: infoModality,
    })
  }

  async function onPairedLate(peer) { setPairing(false); await update({ verified: true, peer }) }

  async function runTranscribe() {
    setBusy('transcribe'); setErr(null)
    try {
      const blob = await getAudio(session.id)
      if (!blob) throw new Error('No audio stored for this session')
      // verified sessions are two-party (clinician + client) → ask for speaker labels
      const roles = session.peer ? ['Therapist', 'Client'] : []
      const text = await transcribe(blob, roles)
      await update({ transcript: text, status: 'transcribed' })
    } catch (e) { setErr(e.message) }
    setBusy(null)
  }

  async function runAnalyze() {
    setBusy('analyze'); setErr(null); setStage(null)
    try {
      const personLabel = isClinician ? (session.peer?.name || 'Patient') : profile.name
      const modality = isClinician ? (profile.practice?.modality || session.modality) : session.modality
      const [lifestyle, allSessions, journal] = await Promise.all([getLifestyle(), getSessions(), getJournal()])
      const context = buildIntakeContext(profile, { lifestyle, sessions: allSessions, journal })
      const a = await analyzeStream(session.transcript, modality, personLabel, context, setStage)
      await update({ analysis: a, status: 'analyzed' })
      await recordIndexPoint({ ...session, analysis: a })
    } catch (e) { setErr(e.message) }
    setBusy(null); setStage(null)
  }

  async function remove() { await deleteSession(session.id); onDeleted?.() }

  const DeleteBlock = () => (
    !confirmDel ? (
      <button className="btn ghost block" style={{ color: 'var(--bad)' }} onClick={() => setConfirmDel(true)}>
        Delete this session
      </button>
    ) : (
      <div className="card cloud" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13.5, margin: '0 0 12px' }}>
          Permanently erase this {session.imported ? 'transcript' : 'recording'} and its analysis? There is no backup.
        </p>
        <div className="row gap">
          <button className="btn soft" style={{ flex: 1 }} onClick={() => setConfirmDel(false)}>Keep</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={remove}>Delete</button>
        </div>
      </div>
    )
  )

  function startEdit() { setDraft(session.transcript); setEditing(true) }
  async function saveEdit() {
    setEditing(false)
    if (draft.trim() !== session.transcript) {
      await update({ transcript: draft.trim(), analysis: null, status: 'transcribed' })
    }
  }

  async function shareText() {
    const title = `Setmycareer session — ${fmt(session.startedAt)}`
    const text = isClinician && session.analysis?.note_markdown
      ? session.analysis.note_markdown
      : (m?.clinical_summary ? m.clinical_summary + '\n\n' : '') + session.transcript
    if (navigator.share) { try { await navigator.share({ title, text }) } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(text); setErr('Copied to clipboard'); setTimeout(() => setErr(null), 1800) }
  }

  const exportPdf = () => window.print()

  return (
    <div className="screen">
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Back"><BackIcon /></button>
        <div className="row gap">
          <button className="icon-btn" onClick={() => setEditInfo(!editInfo)} aria-label="Edit details"><EditIcon size={17} /></button>
          {session.transcript && (
            <button className="icon-btn" onClick={shareText} aria-label="Share"><ShareIcon size={18} /></button>
          )}
          {session.analysis && (
            <button className="icon-btn" onClick={exportPdf} aria-label="Export PDF"><ExportIcon size={18} /></button>
          )}
        </div>
      </div>

      {editInfo ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="label" style={{ marginTop: 0 }}>Session details</p>
          <div className="col" style={{ gap: 10 }}>
            <input className="field" value={infoName} onChange={(e) => setInfoName(e.target.value)}
              placeholder={isClinician ? 'Client name (or leave blank)' : 'Who it was with (or leave blank)'} />
            <div className="row" style={{ gap: 10 }}>
              <input className="field" type="date" style={{ flex: 1 }} value={infoDate} onChange={(e) => setInfoDate(e.target.value)} />
              {isClinician && (
                <select className="field" style={{ flex: 1 }} value={infoModality} onChange={(e) => setInfoModality(e.target.value)}>
                  {MODALITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
            </div>
            <div className="row gap">
              <button className="btn soft" style={{ flex: 1 }} onClick={() => setEditInfo(false)}>Cancel</button>
              <button className="btn primary" style={{ flex: 1 }} onClick={saveInfo}><CheckIcon size={14} /> Save</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="label" style={{ margin: 0 }}>
            {session.peer ? `With ${session.peer.name}` : session.imported ? 'Imported session' : 'Private session'}
          </p>
          <h2 className="display" style={{ marginBottom: 8 }}>{fmt(session.startedAt)}</h2>
          <div className="row gap" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
            {session.imported
              ? <span className="chip accent"><CheckIcon size={13} /> Imported</span>
              : <span className={'chip ' + (session.verified ? 'on' : 'off')}>
                  {session.verified ? <><CheckIcon size={13} /> Verified</> : <><LockIcon size={13} /> Unverified</>}
                </span>}
            {session.duration > 0 && <span className="chip num">{Math.max(1, Math.round(session.duration / 60))} min</span>}
            {isClinician && <span className="chip num" style={{ textTransform: 'uppercase' }}>{session.modality || 'general'}</span>}
          </div>
        </>
      )}

      {err && <p style={{ color: 'var(--bad)', fontSize: 13 }}>{err}</p>}

      {/* ---- Unverified gate (recorded, not imported) ---- */}
      {!session.verified && (
        <div className="col" style={{ gap: 12 }}>
          <div className="card" style={{ textAlign: 'center', padding: '30px 22px' }}>
            <LockIcon size={26} />
            <p className="muted" style={{ margin: '10px 0 18px', fontSize: 13.5 }}>
              This recording is sealed. Verify it with the other person&apos;s QR to unlock transcription and analysis.
            </p>
            <button className="btn primary block" onClick={() => setPairing(true)}><QrIcon size={17} /> Verify now</button>
          </div>
          <DeleteBlock />
        </div>
      )}

      {/* ---- Verified, no transcript ---- */}
      {session.verified && !session.transcript && (
        <div className="card" style={{ textAlign: 'center', padding: '30px 22px' }}>
          <p className="muted" style={{ margin: '0 0 18px', fontSize: 13.5 }}>Session verified. Transcribe the recording to continue.</p>
          <button className="btn primary block" disabled={busy === 'transcribe'} onClick={runTranscribe}>
            {busy === 'transcribe' ? 'Transcribing…' : 'Transcribe recording'}
          </button>
        </div>
      )}

      {/* ---- Transcript, not analyzed ---- */}
      {session.transcript && !session.analysis && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row between">
            <p className="label" style={{ margin: 0 }}>Transcript</p>
            <button className="chip" onClick={editing ? saveEdit : startEdit}>
              <EditIcon size={13} /> {editing ? 'Save' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <textarea className="field" rows={9} style={{ marginTop: 10 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : (
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', lineHeight: 1.7 }}>{session.transcript}</p>
          )}
          {!editing && (
            <button className="btn primary block" disabled={busy === 'analyze'} onClick={runAnalyze}>
              {busy === 'analyze' ? 'Drawing your blueprint…' : isClinician ? 'Generate clinical report' : 'Generate Blueprint'}
            </button>
          )}
        </div>
      )}

      {/* ---- Full analysis: blue shader bento + reflection + detail ---- */}
      {session.analysis && (
        <div className="col" style={{ gap: 12 }}>
          {m && (
            <div className="bento session-bento">
              <div className="cell span2 shadercell" style={{ minHeight: 200, alignItems: 'center', flexDirection: 'row', gap: 18, padding: '22px 20px' }}>
                <Aurora palette="deep" speed={0.12} />
                <Ring value={m.wellbeing_index} size={120} stroke={11} track="rgba(255,255,255,.22)" color="#fff" lightLabel label=""
                  style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
                <div className="col" style={{ gap: 6, position: 'relative', zIndex: 1, flex: 1 }}>
                  <span className="c-label" style={{ opacity: 0.85 }}>Blueprint</span>
                  <span style={{ fontSize: 17, fontWeight: 600, textTransform: 'capitalize' }}>{sName || 'not scored'}</span>
                  {m.risk_capped && <span className="c-sub">adjusted for risk flags</span>}
                </div>
              </div>

              {top && (
                <div className="cell shadercell" style={{ gap: 4 }}>
                  <Aurora palette="ocean" speed={0.14} />
                  <span className="c-label" style={{ opacity: 0.85, position: 'relative', zIndex: 1 }}>Mostly feeling</span>
                  <span className="c-value" style={{ fontSize: 22, textTransform: 'capitalize', position: 'relative', zIndex: 1 }}>{top.emotion}</span>
                  <span className="c-sub" style={{ position: 'relative', zIndex: 1 }}>{top.intensity} intensity</span>
                </div>
              )}
              <div className="cell shadercell" style={{ gap: 4 }}>
                <Aurora palette="dusk" speed={0.13} />
                <span className="c-label" style={{ opacity: 0.85, position: 'relative', zIndex: 1 }}>Session</span>
                <span className="c-value" style={{ fontSize: 19, position: 'relative', zIndex: 1 }}>{fmtDay(session.startedAt)}</span>
                <span className="c-sub" style={{ position: 'relative', zIndex: 1 }}>
                  {session.imported ? 'imported' : session.verified ? 'verified' : 'unverified'}
                </span>
              </div>
            </div>
          )}

          {/* the warm reflection — client-facing voice */}
          <ReflectionCard reflection={reflection} feedback={session.reflectionFeedback}
            onFeedback={(rating) => update({ reflectionFeedback: rating ? { rating, ts: Date.now() } : null })} />

          {/* a readable client summary if the reflection didn't generate */}
          {(!reflection?.generated) && m?.clinical_summary && (
            <div className="card"><p style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{m.clinical_summary}</p></div>
          )}

          {risk && risk.overall_level !== 'none' && (
            <div className="card" style={{ borderLeft: '3px solid ' + (risk.overall_level === 'high' ? 'var(--bad)' : 'var(--warn)') }}>
              <div className="row between">
                <p className="label" style={{ margin: 0 }}>Safety screening</p>
                <span className="chip risk">{risk.overall_level}</span>
              </div>
              {isClinician ? (
                <>
                  {Object.entries(risk.categories || {}).filter(([, c]) => c.level !== 'none').map(([k, c]) => (
                    <p key={k} style={{ fontSize: 13.5, margin: '8px 0 0' }}>
                      <b style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</b> ({c.level}) — {c.rationale}
                    </p>
                  ))}
                  <p className="micro" style={{ marginTop: 10 }}>{risk.disclaimer}</p>
                </>
              ) : (
                <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>
                  Parts of this session may be worth discussing with your clinician.
                  If you&apos;re struggling right now, you can call or text <b>988</b> any time.
                </p>
              )}
            </div>
          )}

          {m?.dimensions && <DimensionBento dimensions={m.dimensions} />}

          {isClinician && session.analysis.note_markdown && (
            <div className="card note-md" dangerouslySetInnerHTML={{ __html: md(session.analysis.note_markdown) }} />
          )}

          {session.analysis.evidence?.length > 0 && isClinician && (
            <div className="card">
              <p className="label" style={{ marginTop: 0 }}>Evidence</p>
              {session.analysis.evidence.map((e, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--powder-soft)', paddingLeft: 10, marginBottom: 10 }}>
                  <p style={{ fontStyle: 'italic', fontFamily: 'var(--font)', fontSize: 13.5, margin: 0 }}>&ldquo;{e.quote}&rdquo;</p>
                  <p className="micro" style={{ margin: '2px 0 0' }}>{e.finding}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="row between">
              <p className="label" style={{ margin: 0 }}>Transcript</p>
              <button className="chip" onClick={editing ? saveEdit : startEdit}>
                <EditIcon size={13} /> {editing ? 'Save & redraw' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <textarea className="field" rows={9} style={{ marginTop: 10 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
            ) : (
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', margin: 0, lineHeight: 1.7 }}>{session.transcript}</p>
            )}
          </div>

          <div className="row gap">
            <button className="btn soft" style={{ flex: 1 }} disabled={busy === 'analyze'} onClick={runAnalyze}>
              <RenewIcon size={15} /> {busy === 'analyze' ? 'Redrawing…' : 'Re-analyze'}
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={exportPdf}>
              <ExportIcon size={15} /> Export PDF
            </button>
          </div>
          <DeleteBlock />
        </div>
      )}

      {session.verified && !session.analysis && (
        <div style={{ marginTop: 12 }}><DeleteBlock /></div>
      )}

      <AnimatePresence>
        {pairing && <Pair profile={profile} onPaired={onPairedLate} onClose={() => setPairing(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {busy === 'analyze' && <AnalyzingOverlay title="Drawing your Blueprint" stage={stage} />}
      </AnimatePresence>

      {/* ---- print-only clinical report ---- */}
      {session.analysis && (
        <div className="print-sheet">
          <h1>Your <span style={{ color: '#1E5C8A' }}>Setmycareer</span>print</h1>
          <p style={{ margin: '0 0 2px' }}>{fmt(session.startedAt)} · {session.duration > 0 ? Math.max(1, Math.round(session.duration / 60)) + ' min · ' : ''}{session.imported ? 'Imported' : session.verified ? 'QR-verified session' : 'Unverified'}</p>
          <p style={{ margin: 0 }}>{session.peer ? `Participants: ${profile.name} & ${session.peer.name}` : `Recorded by ${profile.name}`}</p>
          {m && (
            <>
              <div className="pr-index">
                <div className="pr-index-num">{m.wellbeing_index ?? '—'}<span>/100</span></div>
                <div>
                  <h2 style={{ margin: 0 }}>Blueprint — wellbeing estimate</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 11 }}>
                    {bandFor(m.wellbeing_index)?.name || 'not scored'}{m.risk_capped ? ' · risk-adjusted' : ''} ·
                    a probabilistic read of this session, not a measurement
                  </p>
                </div>
              </div>
              <p style={{ fontStyle: 'italic' }}>{m.clinical_summary}</p>
              <p style={{ fontSize: 11, margin: '0 0 6px' }}>Dominant affect: {m.dominant_emotions?.map((e) => `${e.emotion} (${e.intensity})`).join(', ') || '—'}.</p>
              <div className="pr-grid">
                {Object.entries(m.dimensions || {}).map(([k, d]) => {
                  const inst = METRIC_BY_KEY[k]?.instrument || ''
                  const pct = typeof d.score === 'number' ? d.score : 0
                  return (
                    <div className="pr-dim" key={k}>
                      <div className="pr-dim-head">
                        <span className="pr-dim-name">{d.label}</span>
                        <span className="pr-dim-inst">{inst}</span>
                      </div>
                      <div className="pr-bar"><span style={{ width: pct + '%', background: stateColor(d.score) }} /></div>
                      <div className="pr-dim-meta">
                        {d.score == null ? 'not discussed'
                          : <>&asymp;{Math.round(d.score / 5) * 5} · {d.state} · {({ moderate: 'fair', tentative: 'tentative', low: 'low' }[d.confidence] || 'low')} confidence</>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {reflection?.generated && (
            <>
              <h2>Reflection</h2>
              <p>{reflection.opening} {reflection.strength} {reflection.reframe}</p>
              {reflection.suggestion?.title && <p><b>Try:</b> {reflection.suggestion.title} — {reflection.suggestion.why}</p>}
            </>
          )}
          {risk && (
            <>
              <h2>Safety screening</h2>
              <p>Overall: <b>{risk.overall_level}</b>. {Object.entries(risk.categories || {})
                .filter(([, c]) => c.level !== 'none').map(([k, c]) => `${k.replace('_', ' ')}: ${c.level} — ${c.rationale}`).join(' ') || 'No category flags.'}</p>
              <p style={{ fontSize: 10.5, color: '#666' }}>{risk.disclaimer}</p>
            </>
          )}
          {session.analysis.note_markdown && (
            <><h2>Clinical note</h2><div dangerouslySetInnerHTML={{ __html: md(session.analysis.note_markdown) }} /></>
          )}
          <h2>Transcript</h2>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{session.transcript}</p>
          <p style={{ fontSize: 10.5, color: '#666', marginTop: 18 }}>
            Generated by Setmycareer on {new Date().toLocaleDateString()}. Wellness-tracking signals anchored to validated
            instruments (PHQ-9, GAD-7, ISI, UCLA, RRS, PANAS); not a diagnosis or validated assessment.
            All data resides on the participant&apos;s device; this report was generated locally.
          </p>
        </div>
      )}
    </div>
  )
}
