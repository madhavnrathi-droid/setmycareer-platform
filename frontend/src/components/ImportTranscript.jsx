import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BackIcon, CheckIcon, LockIcon } from './Icons'
import AnalyzingOverlay from './AnalyzingOverlay'
import { analyzeStream, diarize, transcribe, integrationsStatus, integrationConnectUrl, importMeeting } from '../lib/api'
import { saveSession, getLifestyle, getSessions, getJournal, recordIndexPoint } from '../lib/store'
import { buildIntakeContext } from '../lib/context'

// Strip subtitle scaffolding (.vtt/.srt cue numbers + timestamps) but keep
// speaker labels and the actual words. Plain .txt passes through untouched.
function clean(raw) {
  return raw
    .split(/\r?\n/)
    .filter((l) => !/-->/.test(l))            // timestamp ranges
    .filter((l) => !/^\s*\d+\s*$/.test(l))    // bare cue indices
    .filter((l) => !/^WEBVTT/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const PROVIDERS = [
  { id: 'google', label: 'Google Meet' },
  { id: 'zoho', label: 'Zoho Meeting' },
]

// Connect a provider, pull a meeting by link, or import a transcript / recording —
// all of it runs through the same on-device analysis. One unified, career-first flow.
export default function ImportTranscript({ profile, onDone, onClose }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [labeling, setLabeling] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [stage, setStage] = useState(null)
  const [err, setErr] = useState(null)
  const [status, setStatus] = useState(null)         // {google:{state,label}, zoho:{...}}
  const [link, setLink] = useState('')
  const [pulling, setPulling] = useState(null)        // provider id while pulling
  const [hint, setHint] = useState(null)
  const fileRef = useRef(null)
  const audioRef = useRef(null)

  const loadStatus = () => integrationsStatus().then(setStatus).catch(() => setStatus(null))
  useEffect(() => {
    loadStatus()
    const onMsg = (e) => { if (e?.data?.smc_integration) loadStatus() }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  async function connect(provider) {
    setHint(null)
    try {
      const { url } = await integrationConnectUrl(provider)
      window.open(url, 'smc_oauth', 'width=520,height=680')
    } catch {
      setHint(`${PROVIDERS.find((p) => p.id === provider)?.label} isn’t configured for one-click connect yet — paste the meeting link or transcript below and it works the same.`)
    }
  }

  async function pull(provider) {
    if (!link.trim()) { setHint('Paste a meeting link first.'); return }
    setPulling(provider); setHint(null); setErr(null)
    try {
      const r = await importMeeting(provider, link.trim())
      if (r.transcript) { setText(r.transcript); setHint('Transcript pulled — review it, then analyze.') }
      else setHint(r.message || 'Couldn’t pull that automatically — paste the transcript or upload the recording.')
    } catch { setHint('Couldn’t reach that meeting — paste the transcript or upload the recording below.') }
    setPulling(null)
  }

  async function labelSpeakers() {
    const t = clean(text)
    if (t.length < 20) { setErr('Add a transcript first.'); return }
    setLabeling(true); setErr(null)
    try {
      const r = await diarize(t, ['Me', 'Them'])
      setText(r.text || t)
    } catch { setErr('Could not label speakers — you can still analyze as-is.') }
    setLabeling(false)
  }

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setText(clean(String(r.result || '')))
    r.readAsText(f)
  }

  async function onAudio(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setTranscribing(true); setErr(null); setHint(null)
    try {
      const t = await transcribe(f)
      setText((prev) => (prev ? prev + '\n\n' : '') + (t || ''))
      setHint('Recording transcribed — review it, then analyze.')
    } catch { setErr('Could not transcribe that recording. Check the file, or paste the transcript instead.') }
    setTranscribing(false)
  }

  async function run() {
    const transcript = clean(text)
    if (transcript.length < 20) { setErr('Add a transcript first — paste it, pull a meeting, or upload a recording.'); return }
    setBusy(true); setErr(null); setStage(null)
    try {
      const [lifestyle, allSessions, journal] = await Promise.all([getLifestyle(), getSessions(), getJournal()])
      const context = buildIntakeContext(profile, { lifestyle, sessions: allSessions, journal })
      const a = await analyzeStream(transcript, 'general', profile.name, context, setStage)
      const startedAt = new Date(date + 'T12:00:00').getTime() || Date.now()
      const session = {
        id: (crypto.randomUUID?.() || String(Date.now() + Math.round(Math.random() * 1e6))),
        startedAt, duration: 0, modality: 'general', verified: true, imported: true,
        peer: name.trim() ? { name: name.trim(), role: 'contact' } : null,
        transcript, hasAudio: false, analysis: a, status: 'analyzed',
      }
      await saveSession(session)
      await recordIndexPoint(session)
      onDone(session)
    } catch (e) {
      setErr(e.message || 'Could not analyze that transcript.')
      setBusy(false)
    }
  }

  const pill = (state) => state === 'connected'
    ? { bg: 'var(--good-soft)', fg: 'var(--good)', text: 'Connected' }
    : state === 'ready'
      ? { bg: 'var(--accent-soft)', fg: 'var(--accent)', text: 'Connect' }
      : { bg: 'var(--powder-soft)', fg: 'var(--ink-3)', text: 'Manual' }

  return (
    <motion.div className="metric-overlay" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="screen" style={{ paddingTop: 'max(16px, var(--safe-t))' }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <button className="btn ghost" style={{ minHeight: 40, padding: '8px 6px', gap: 6 }} onClick={onClose}>
            <BackIcon size={18} /> Cancel
          </button>
        </div>

        <p className="label" style={{ margin: 0 }}>Add to your archive</p>
        <h1 className="display" style={{ marginBottom: 6 }}>Import a meeting</h1>
        <div className="row" style={{ gap: 6, color: 'var(--ink-3)', marginBottom: 16 }}>
          <LockIcon size={13} />
          <span className="micro">Analyzed transiently, then stored only on this device.</span>
        </div>

        {/* connect a meeting source */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <p className="label" style={{ margin: '0 0 10px' }}>Connect a meeting source</p>
          <div className="col" style={{ gap: 8 }}>
            {PROVIDERS.map((p) => {
              const st = status?.[p.id]?.state || 'manual'
              const v = pill(st)
              return (
                <button key={p.id} className="lrow" style={{ borderBottom: 0, padding: '8px 2px' }}
                  onClick={() => st === 'connected' ? null : connect(p.id)}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--powder-soft)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700 }}>
                    {p.label[0]}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.label}</div>
                    <div className="micro">{st === 'connected' ? 'Connected' : st === 'ready' ? 'Sign in to import meetings automatically' : 'Import meetings manually'}</div>
                  </div>
                  <span className="pill" style={{ background: v.bg, color: v.fg }}>
                    {st === 'connected' && <CheckIcon size={12} />} {v.text}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="row gap" style={{ marginTop: 12 }}>
            <input className="field" value={link} onChange={(e) => setLink(e.target.value)} style={{ flex: 1 }}
              placeholder="Paste a Meet / Zoho meeting link" />
            <button className="btn soft" style={{ minHeight: 46 }} disabled={!!pulling}
              onClick={() => pull(status?.zoho?.state === 'connected' && status?.google?.state !== 'connected' ? 'zoho' : 'google')}>
              {pulling ? 'Pulling…' : 'Pull'}
            </button>
          </div>
          {hint && <p className="micro" style={{ margin: '10px 2px 0', lineHeight: 1.5, color: 'var(--ink-2)' }}>{hint}</p>}
        </div>

        <p className="label" style={{ margin: '0 0 8px' }}>Or add the transcript</p>
        <textarea className="field" rows={8} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"Paste your meeting or conversation transcript here.\n\nSpeaker labels like “Me:” / “Them:” are kept if present."}
          style={{ lineHeight: 1.6 }} />

        <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn soft" style={{ minHeight: 42 }} onClick={() => fileRef.current?.click()}>
            Upload .txt / .vtt / .srt
          </button>
          <input ref={fileRef} type="file" accept=".txt,.vtt,.srt,text/plain" hidden onChange={onFile} />
          <button className="btn soft" style={{ minHeight: 42 }} disabled={transcribing} onClick={() => audioRef.current?.click()}>
            {transcribing ? 'Transcribing…' : 'Upload recording'}
          </button>
          <input ref={audioRef} type="file" accept="audio/*,.webm,.mp3,.m4a,.wav" hidden onChange={onAudio} />
          {text.trim() && (
            <button className="btn soft" style={{ minHeight: 42 }} disabled={labeling} onClick={labelSpeakers}>
              {labeling ? 'Labeling…' : 'Label speakers'}
            </button>
          )}
          {text && <span className="micro" style={{ alignSelf: 'center' }}>{clean(text).length} characters</span>}
        </div>

        <div className="col" style={{ gap: 12, margin: '18px 0' }}>
          <div>
            <p className="label" style={{ margin: '0 0 6px' }}>Who was this with? (optional)</p>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my manager, a mentor, an interview panel" />
          </div>
          <div>
            <p className="label" style={{ margin: '0 0 6px' }}>Date</p>
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {err && <p style={{ color: 'var(--bad)', fontSize: 13, margin: '0 0 10px' }}>{err}</p>}

        <button className="btn primary block" disabled={busy} onClick={run}>
          {busy ? 'Analyzing…' : <><CheckIcon size={15} /> Analyze &amp; save</>}
        </button>
        <p className="micro" style={{ textAlign: 'center', margin: '12px 0 0' }}>
          Setmycareer reads only what you add. Nothing is uploaded or kept on a server.
        </p>
      </div>
      <AnimatePresence>
        {busy && <AnalyzingOverlay title="Analyzing your meeting" stage={stage} />}
      </AnimatePresence>
    </motion.div>
  )
}
