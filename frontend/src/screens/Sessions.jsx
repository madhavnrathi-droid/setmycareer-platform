import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronIcon, LockIcon, CheckIcon, AddIcon } from '../components/Icons'
import { loadSampleData } from '../lib/sample'
import { stateColor } from '../lib/science'
import { getRoster, saveRosterEntry, deleteRosterEntry, assignSessionCircle, circleFieldFor } from '../lib/store'
import ImportTranscript from '../components/ImportTranscript'
import CircleSheet, { circleVocab } from '../components/CircleSheet'

const smooth = [0.2, 0.8, 0.2, 1]
const fmt = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const dur = (s) => (s >= 60 ? `${Math.round(s / 60)} min` : s > 0 ? `${s}s` : 'imported')

// Editorial archive — divider rows, hierarchy from type scale. Sessions can be
// filed under a provider (patient) or a client (counsellor); filing is purely
// organizational — every session still feeds one Blueprint.
export default function Sessions({ sessions, profile, onOpen, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [roster, setRoster] = useState([])
  const [assignFor, setAssignFor] = useState(null) // session id being filed
  const [managing, setManaging] = useState(false)
  const v = circleVocab(profile)
  const field = circleFieldFor(profile.role)

  const reloadRoster = () => getRoster(profile.role).then(setRoster)
  useEffect(() => { reloadRoster() }, [profile.role])

  async function seed() {
    setLoading(true)
    await loadSampleData()
    await onRefresh()
    setLoading(false)
  }

  const byId = new Map(roster.map((c) => [c.id, c]))
  // group sessions by their roster entry; unfiled last. Roster order leads.
  const groups = roster.map((c) => ({ c, items: sessions.filter((s) => s[field] === c.id) }))
  const unfiled = sessions.filter((s) => !s[field] || !byId.has(s[field]))
  const grouped = roster.length > 0

  const assignSession = sessions.find((s) => s.id === assignFor)

  function Row({ s, i }) {
    const score = s.analysis?.metrics?.wellbeing_index ?? null
    const filed = s[field] ? byId.get(s[field]) : null
    return (
      <motion.div className="sig-row" initial={{ y: 10 }} animate={{ y: 0 }}
        transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3, ease: smooth }}>
        <button className="row" style={{ flex: 1, minWidth: 0, gap: 14, textAlign: 'left' }} onClick={() => onOpen(s.id)}>
          <span className="big-num" style={{ fontSize: 26, color: score == null ? 'var(--ink-3)' : stateColor(score), width: 44, textAlign: 'left', flexShrink: 0 }}>
            {score ?? '–'}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>
              {s.peer ? s.peer.name : (s.imported ? 'Imported session' : 'Private session')}
            </span>
            <span className="micro" style={{ display: 'block' }}>{fmt(s.startedAt)} · {dur(s.duration)}</span>
          </span>
          <span style={{ color: s.verified ? 'var(--good)' : 'var(--ink-3)', flexShrink: 0 }}>
            {s.imported ? null : s.verified ? <CheckIcon size={15} /> : <LockIcon size={15} />}
          </span>
        </button>
        <button className={'file-pill' + (filed ? ' on' : '')} onClick={() => setAssignFor(s.id)}
          aria-label="File this session">
          {filed ? filed.name : `＋ ${v.noun}`}
        </button>
      </motion.div>
    )
  }

  let idx = 0
  return (
    <div className="screen">
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: smooth }} style={{ marginBottom: 14 }}>
        <p className="label" style={{ margin: 0 }}>Your archive</p>
        <h1 className="display" style={{ marginBottom: 12 }}>Sessions</h1>
        <div className="row" style={{ gap: 7 }}>
          <button className="chip" style={{ padding: '9px 13px', gap: 6 }} onClick={() => setManaging(true)}>
            <AddIcon size={15} /> {v.nounCap}
          </button>
          <button className="chip accent" style={{ padding: '9px 13px', gap: 6 }} onClick={() => setImporting(true)}>
            <AddIcon size={15} /> Import
          </button>
        </div>
      </motion.div>

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '44px 24px' }}>
          <p className="muted" style={{ margin: '0 0 18px' }}>
            No sessions yet.<br />Record one, or import a transcript you already have.
          </p>
          <div className="row gap" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => setImporting(true)}>
              <AddIcon size={16} /> Import a transcript
            </button>
            <button className="btn soft" disabled={loading} onClick={seed}>
              {loading ? 'Loading…' : 'Preview with sample data'}
            </button>
          </div>
        </div>
      )}

      {grouped ? (
        <div>
          {groups.map(({ c, items }) => (
            <div key={c.id}>
              <div className="circle-group-head">
                <span className="circle-av">{(c.name || '?').trim().charAt(0).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650, fontSize: 14.5 }}>{c.name}</div>
                  <div className="micro">{c.role ? c.role + ' · ' : ''}{items.length} session{items.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              {items.length === 0
                ? <p className="micro" style={{ padding: '0 2px 8px', color: 'var(--ink-3)' }}>Nothing filed here yet — tap “＋ {v.noun}” on a session below.</p>
                : items.map((s) => <Row key={s.id} s={s} i={idx++} />)}
            </div>
          ))}
          {unfiled.length > 0 && (
            <div>
              <div className="circle-group-head">
                <span className="circle-av" style={{ background: 'var(--powder-soft)', color: 'var(--ink-3)' }}>·</span>
                <div style={{ fontWeight: 650, fontSize: 14.5, color: 'var(--ink-2)' }}>Unfiled</div>
              </div>
              {unfiled.map((s) => <Row key={s.id} s={s} i={idx++} />)}
            </div>
          )}
        </div>
      ) : (
        <div>{sessions.map((s) => <Row key={s.id} s={s} i={idx++} />)}</div>
      )}

      <AnimatePresence>
        {importing && (
          <ImportTranscript profile={profile}
            onClose={() => setImporting(false)}
            onDone={async (session) => {
              setImporting(false)
              await onRefresh()
              onOpen(session.id)
            }} />
        )}
        {(assignFor || managing) && (
          <CircleSheet profile={profile} roster={roster}
            mode={managing ? 'manage' : 'assign'}
            selectedId={assignSession?.[field] || null}
            onClose={() => { setAssignFor(null); setManaging(false) }}
            onSaveEntry={async (entry) => { await saveRosterEntry(profile.role, entry); await reloadRoster() }}
            onDelete={async (id) => { await deleteRosterEntry(profile.role, id); await reloadRoster(); await onRefresh() }}
            onPick={async (cid) => { await assignSessionCircle(profile.role, assignFor, cid); await onRefresh() }} />
        )}
      </AnimatePresence>
    </div>
  )
}
