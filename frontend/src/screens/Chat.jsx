import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BackIcon } from '../components/Icons'
import { getSessions, getJournal, getCareerProfile } from '../lib/store'
import { computeCareer } from '../lib/career'
import { bandFor, METRIC_BY_KEY } from '../lib/science'
import { chatReply } from '../lib/api'

// Talk to Setmycareer — a grounded counsellor that answers from the user's OWN account
// (their Blueprint, notes, sessions, career), with citations. Six stances; the
// backend retrieves labor/framework grounding by relevance. Context is assembled
// here, on-device, and sent transiently with each message.
const MODES = [
  ['reflect', 'Reflect', 'mirror what I hear'],
  ['strategize', 'Strategize', 'options + trade-offs'],
  ['decide', 'Decide', 'weigh one choice'],
  ['review', 'Review', 'patterns over time'],
  ['prepare', 'Prepare', 'rehearse what’s next'],
  ['challenge', 'Challenge', 'push, gently'],
]
const OPENERS = {
  reflect: 'What’s been sitting with you lately?',
  strategize: 'What are you trying to figure out?',
  decide: 'What decision are you weighing?',
  review: 'Want to look back over the last few weeks together?',
  prepare: 'What’s coming up that you want to feel ready for?',
  challenge: 'Where do you feel stuck between what you want and what you do?',
}

function buildContext(sessions, journal, career) {
  const lines = []
  const done = sessions.filter((s) => s.analysis?.metrics).sort((a, b) => a.startedAt - b.startedAt)
  const latest = done.at(-1)
  if (latest) {
    const m = latest.analysis.metrics
    lines.push(`Blueprint: wellbeing ${m.wellbeing_index}/100 (${bandFor(m.wellbeing_index)?.name || '—'}), feeling ${m.dominant_emotions?.[0]?.emotion || '—'}.`)
    const dims = Object.entries(m.dimensions || {}).filter(([, v]) => v?.score != null)
      .map(([k, v]) => `${METRIC_BY_KEY[k]?.name || k} ${v.score}`)
    if (dims.length) lines.push('Latest signals: ' + dims.join(', ') + '.')
    lines.push(`${done.length} session${done.length === 1 ? '' : 's'} tracked since ${new Date(done[0].startedAt).toLocaleDateString()}.`)
  }
  const mine = journal.filter((e) => (e.kind || 'me') === 'me').slice(0, 3)
  if (mine.length) lines.push('Recent notes: ' + mine.map((e) => `"${(e.text || '').slice(0, 140)}"`).join(' | '))
  if (career?.target) {
    const r = computeCareer(career)
    if (r) lines.push(`Career: aiming for ${r.occ.title} (career index ${r.index}/100). Holds: ${(career.skills || []).join(', ') || '—'}. Gaps: ${(r.coverage?.missing || []).slice(0, 3).join(', ') || '—'}. Outlook ${r.outlook.label}.`)
  }
  return lines.join('\n')
}

export default function Chat({ profile, onClose }) {
  const [mode, setMode] = useState('reflect')
  const [msgs, setMsgs] = useState([])     // {role:'user'|'assistant', content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const ctxRef = useRef('')
  const scroller = useRef(null)

  useEffect(() => {
    Promise.all([getSessions(), getJournal(), getCareerProfile()])
      .then(([s, j, c]) => { ctxRef.current = buildContext(s, j, c) })
  }, [])

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  async function send(text) {
    const t = (text ?? input).trim()
    if (!t || busy) return
    setInput('')
    const next = [...msgs, { role: 'user', content: t }]
    setMsgs(next)
    setBusy(true)
    try {
      const { reply } = await chatReply({ message: t, mode, context: ctxRef.current, history: next.slice(-6) })
      setMsgs((m) => [...m, { role: 'assistant', content: reply || '…' }])
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: "I couldn't reach my reasoning just then — try once more in a moment." }])
    }
    setBusy(false)
  }

  return (
    <motion.div className="chat-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="chat-head">
        <button className="icon-btn" onClick={onClose} aria-label="Close"><BackIcon size={20} /></button>
        <div style={{ flex: 1 }}>
          <p className="label" style={{ margin: 0 }}>Talk to Setmycareer</p>
          <p className="micro" style={{ margin: 0 }}>Answers from your own account · private</p>
        </div>
      </div>

      <div className="chat-modes">
        {MODES.map(([k, label]) => (
          <button key={k} className={'chip' + (mode === k ? ' accent' : '')} onClick={() => setMode(k)}
            style={mode === k ? { background: 'var(--navy)', color: '#fff' } : undefined}>{label}</button>
        ))}
      </div>

      <div className="chat-body" ref={scroller}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{OPENERS[mode]}</p>
            <p className="micro" style={{ margin: 0 }}>Setmycareer draws on your Blueprint, notes and career — and cites what it leans on. Not a clinician; in crisis call 988 (US).</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'chat-bubble ' + m.role}>{m.content}</div>
        ))}
        {busy && <div className="chat-bubble assistant chat-typing"><span /><span /><span /></div>}
      </div>

      <div className="chat-input">
        <textarea rows={1} value={input} placeholder="Say what’s on your mind…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className="btn primary" disabled={!input.trim() || busy} onClick={() => send()}>Send</button>
      </div>
    </motion.div>
  )
}
