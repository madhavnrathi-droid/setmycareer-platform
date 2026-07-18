import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckIcon, TrashIcon, AddIcon, BackIcon, LockIcon } from '../components/Icons'
import { CountUp } from '../components/charts'
import { getJournal, saveJournalEntry, updateJournalEntry, deleteJournalEntry } from '../lib/store'
import { summarizeReport } from '../lib/api'

const smooth = [0.2, 0.8, 0.2, 1]
const KINDS = [['me', 'Me'], ['counsellor', 'Counsellor'], ['report', 'Report']]
const KIND_TAG = { counsellor: ['Counsellor', '#6366F1'], report: ['Report', '#0F4C81'] }
// mood → word + a calm state hue (matches the dashboard ramp)
const MOODS = [[1, 'rough', '#EF4444'], [2, 'low', '#F97316'], [3, 'okay', '#F59E0B'], [4, 'good', '#22C55E'], [5, 'great', '#10B981']]
const MOOD = Object.fromEntries(MOODS.map(([v, w, c]) => [v, { w, c }]))

const PROMPTS = [
  'What made you feel grounded today?',
  'Name one moment you want to remember from this week.',
  'What took more energy than it should have today?',
  'Who made things lighter recently — and how?',
  'What would you tell a friend who had your day?',
  'What is one small thing your body needed today?',
  'What thought kept returning today? Just set it down here.',
]

const dayLabel = (ts) => {
  const d = new Date(ts)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that = new Date(d); that.setHours(0, 0, 0, 0)
  const diff = Math.round((today - that) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return 'Earlier this week'
  if (diff < 30) return 'Earlier this month'
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
const titleOf = (t) => {
  const l = (t.split('\n').find((x) => x.trim()) || 'New note').trim()
  return l.length > 56 ? l.slice(0, 56) + '…' : l
}
const snippetOf = (t) => {
  const lines = t.split('\n').map((x) => x.trim()).filter(Boolean)
  const rest = lines.slice(1).join('  ') || ''
  return rest.length > 90 ? rest.slice(0, 90) + '…' : rest
}
const timeOf = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function streakOf(entries) {
  const days = new Set(entries.map((e) => new Date(e.ts).toDateString()))
  let streak = 0
  const d = new Date()
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

/** Journal — an Apple-Notes-style note list with Setmycareer's wellness layer: a daily
 *  reflection prompt, optional mood tagging, and a gentle reminder that entries
 *  ground the next Blueprint. Everything stays on the device. */
export default function Journal({ profile }) {
  const [entries, setEntries] = useState([])
  const [q, setQ] = useState('')
  const [editor, setEditor] = useState(null) // { id?, text, mood, prompt? }
  const [toast, setToast] = useState(null)
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  useEffect(() => { getJournal().then(setEntries) }, [])
  const prompt = useMemo(() => PROMPTS[new Date().getDate() % PROMPTS.length], [])
  const streak = streakOf(entries)

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? entries.filter((e) => e.text.toLowerCase().includes(t)) : entries
  }, [entries, q])

  const groups = useMemo(() => {
    const g = []
    for (const e of filtered) {
      const label = dayLabel(e.ts)
      const last = g.at(-1)
      if (last && last.label === label) last.items.push(e)
      else g.push({ label, items: [e] })
    }
    return g
  }, [filtered])

  async function persist({ id, text, mood, kind = 'me' }) {
    if (!text.trim()) { if (id) await deleteJournalEntry(id); setEntries(await getJournal()); return }
    let summary = null
    if (kind === 'report') {
      flash('Reading your report…')
      try { summary = (await summarizeReport(text)).summary || null } catch { /* keep raw */ }
    }
    if (id) { await updateJournalEntry(id, { text, mood, kind, summary }); flash(kind === 'report' ? 'Report updated · on your device' : 'Updated · on your device') }
    else { await saveJournalEntry({ text, mood, kind, summary }); flash(kind === 'report' ? 'Report added · stays on your device' : 'Saved · stays on your device') }
    setEntries(await getJournal())
  }

  async function remove(id) {
    await deleteJournalEntry(id)
    setEntries(await getJournal())
    setEditor(null)
  }

  return (
    <div className="screen">
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.35, ease: smooth }}>
        <p className="label" style={{ margin: 0 }}>Between sessions</p>
        <h1 className="display" style={{ marginBottom: 8 }}>Notes</h1>
        <p className="micro" style={{ margin: '0 0 8px', lineHeight: 1.5, color: 'var(--ink-2)' }}>
          Your reflections, your counsellor&apos;s notes, and any test reports you bring in —
          all the small things that grow into your Blueprint.
        </p>
        <div className="row" style={{ gap: 6, color: 'var(--ink-3)', marginBottom: 16 }}>
          <LockIcon size={13} />
          <span className="micro">Private to this device — never uploaded.</span>
        </div>
      </motion.div>

      {/* search */}
      <div className="note-search">
        <span aria-hidden style={{ color: 'var(--ink-3)' }}>⌕</span>
        <input className="note-search-input" placeholder="Search notes" value={q}
          onChange={(e) => setQ(e.target.value)} />
        {q && <button onClick={() => setQ('')} className="micro" style={{ color: 'var(--ink-3)' }}>Clear</button>}
      </div>

      {/* today's reflection + gentle streak */}
      {!q && (
        <div className="bento" style={{ marginTop: 12 }}>
          <button className="cell powderful span2" style={{ textAlign: 'left', gap: 8 }}
            onClick={() => setEditor({ text: '', mood: null, prompt })}>
            <span className="c-label">Today&apos;s reflection</span>
            <span style={{ fontSize: 16.5, fontWeight: 550, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
              {prompt}
            </span>
            <span className="c-sub" style={{ fontWeight: 600 }}>Write about it →</span>
          </button>
          <div className="cell soft span2" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{streak > 0 ? '🌱' : '·'}</span>
            <div className="col" style={{ gap: 1, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                <CountUp value={streak} />-day streak
              </span>
              <span className="c-sub">{streak > 0 ? 'Showing up for yourself, gently.' : 'One honest line starts it.'}</span>
            </div>
            <span className="micro">{entries.length} note{entries.length === 1 ? '' : 's'}</span>
          </div>
          <button className="cell line span2" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left' }}
            onClick={() => setEditor({ text: '', mood: null, kind: 'report' })}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div className="col" style={{ gap: 1, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Import a report</span>
              <span className="c-sub">A therapy or career assessment — Setmycareer reads it into your Blueprint.</span>
            </div>
            <AddIcon size={16} style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>
      )}

      {/* note list — Apple Notes rows */}
      <div style={{ marginTop: 22 }}>
        {groups.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
            {q ? 'No notes match that.' : 'Nothing here yet. One honest line counts.'}
          </p>
        ) : groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 18 }}>
            <p className="label" style={{ margin: '0 2px 6px' }}>{g.label}</p>
            <div className="note-list">
              <AnimatePresence initial={false}>
                {g.items.map((e) => (
                  <motion.button key={e.id} className="note-row" onClick={() => setEditor({ ...e })}
                    initial={{ y: 8 }} animate={{ y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.22, ease: smooth }}>
                    {e.mood
                      ? <span className="note-mood" style={{ background: MOOD[e.mood].c }} />
                      : KIND_TAG[e.kind] && <span className="note-mood" style={{ background: KIND_TAG[e.kind][1] }} />}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div className="note-title">
                        {KIND_TAG[e.kind] && <span className="kind-tag" style={{ color: KIND_TAG[e.kind][1] }}>{KIND_TAG[e.kind][0]}</span>}
                        {titleOf(e.kind === 'report' ? (e.summary || e.text) : e.text)}
                      </div>
                      <div className="note-snip">
                        <span style={{ color: 'var(--ink-3)' }}>{timeOf(e.ts)}</span>
                        {snippetOf(e.kind === 'report' ? (e.summary || e.text) : e.text) && <span>  {snippetOf(e.kind === 'report' ? (e.summary || e.text) : e.text)}</span>}
                        {e.mood && !snippetOf(e.text) && <span style={{ color: MOOD[e.mood].c }}>  felt {MOOD[e.mood].w}</span>}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* compose FAB */}
      <button aria-label="New note" className="fab" onClick={() => setEditor({ text: '', mood: null })}>
        <AddIcon size={26} />
      </button>

      <AnimatePresence>
        {editor && (
          <NoteEditor key="editor" initial={editor} name={profile.name}
            onClose={(data) => { persist(data); setEditor(null) }}
            onDelete={editor.id ? () => remove(editor.id) : null} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.25, ease: smooth }}>
            <CheckIcon size={14} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Full-screen note editor (Apple Notes feel) — autosaves on close. */
function NoteEditor({ initial, name, onClose, onDelete }) {
  const [text, setText] = useState(initial.text || '')
  const [mood, setMood] = useState(initial.mood ?? null)
  const [kind, setKind] = useState(initial.kind || 'me')
  const close = () => onClose({ id: initial.id, text, mood, kind })
  const ph = kind === 'report' ? 'Paste the report or assessment text here…'
    : kind === 'counsellor' ? 'What did your counsellor note?'
    : initial.prompt ? 'Write it out…' : `What's on your mind, ${name}?`

  return (
    <motion.div className="metric-overlay" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: smooth }}>
      <div className="screen" style={{ paddingTop: 'max(16px, var(--safe-t))' }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <button className="btn ghost" style={{ minHeight: 40, padding: '8px 6px', gap: 6 }} onClick={close}>
            <BackIcon size={18} /> Notes
          </button>
          <div className="row" style={{ gap: 8 }}>
            {onDelete && (
              <button className="icon-btn" style={{ width: 40, height: 40, background: 'var(--bad-soft)', color: 'var(--bad)' }}
                onClick={onDelete} aria-label="Delete note"><TrashIcon size={16} /></button>
            )}
            <button className="btn primary" style={{ minHeight: 40, padding: '8px 18px' }} onClick={close}>
              <CheckIcon size={15} /> Done
            </button>
          </div>
        </div>

        <div className="seg" style={{ marginBottom: 12 }}>
          {KINDS.map(([id, label]) => (
            <button key={id} className={'seg-opt' + (kind === id ? ' on' : '')} onClick={() => setKind(id)}>{label}</button>
          ))}
        </div>

        {initial.prompt && kind === 'me' && (
          <p style={{ fontSize: 16, fontWeight: 550, lineHeight: 1.45, color: 'var(--ink-2)', margin: '0 0 12px' }}>
            {initial.prompt}
          </p>
        )}
        {kind === 'report' && (
          <p className="micro" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
            Paste a therapy or career report/assessment. Setmycareer summarizes it and weaves it (lightly) into your Blueprint — it never overrides what you say in session.
          </p>
        )}
        {kind === 'report' && initial.summary && (
          <div className="block powder" style={{ padding: '12px 14px', marginBottom: 10 }}>
            <span className="c-label" style={{ opacity: 0.6 }}>Setmycareer&apos;s read</span>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '4px 0 0', color: 'var(--navy)' }}>{initial.summary}</p>
          </div>
        )}

        <textarea className="note-area" autoFocus value={text} placeholder={ph}
          onChange={(e) => setText(e.target.value)} />

        {kind !== 'report' && (
          <>
            <div className="hairline" style={{ margin: '14px 0 12px' }} />
            <p className="label" style={{ margin: '0 0 8px' }}>How did that feel?</p>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              {MOODS.map(([v, w, c]) => (
                <button key={v} className="mood-chip" onClick={() => setMood(mood === v ? null : v)}
                  style={mood === v ? { background: c, color: '#fff', borderColor: c } : { borderColor: 'var(--line)' }}>
                  <span className="mood-dot" style={{ background: mood === v ? '#fff' : c }} /> {w}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="row" style={{ gap: 6, color: 'var(--ink-3)', margin: '20px 0 0', justifyContent: 'center' }}>
          <LockIcon size={12} />
          <span className="micro">Saved only on this device · gently grounds your next Blueprint</span>
        </div>
      </div>
    </motion.div>
  )
}
