import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { CheckIcon, AddIcon, TrashIcon, UserIcon } from './Icons'
import { uid } from '../lib/store'

// One sheet for the whole roster idea. A patient files sessions under PROVIDERS
// (a therapist, a psychiatrist, a coach — they name the title and role); a
// counsellor keeps CLIENTS. Same shape either way. Used two ways:
//   mode="assign" → radio-pick who a session is filed under (+ inline add)
//   mode="manage" → add / edit / remove the people in your roster
// Filing is organizational only — every session still feeds one Blueprint.

export function circleVocab(profile) {
  return profile?.role === 'clinician'
    ? { noun: 'client', nounCap: 'Client', plural: 'clients', file: 'About', roles: [] }
    : {
        noun: 'provider', nounCap: 'Provider', plural: 'providers', file: 'With',
        roles: ['Therapist', 'Psychiatrist', 'Counsellor', 'Life coach', 'Other'],
      }
}

export default function CircleSheet({ profile, roster, selectedId, mode = 'assign', onPick, onSaveEntry, onDelete, onClose }) {
  const v = circleVocab(profile)
  const [adding, setAdding] = useState(roster.length === 0)
  const [name, setName] = useState('')
  const [role, setRole] = useState(v.roles[0] || '')
  const [note, setNote] = useState('')

  async function add() {
    const n = name.trim()
    if (!n) return
    const entry = { id: uid(), name: n, role, note: note.trim() }
    await onSaveEntry(entry)
    setName(''); setNote(''); setRole(v.roles[0] || ''); setAdding(false)
    if (mode === 'assign') { await onPick?.(entry.id); onClose?.() }
  }

  return createPortal((
    <>
      <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
        <div className="sheet-grab" />
        <h2 className="display" style={{ marginBottom: 4 }}>
          {mode === 'assign' ? `File this session` : `Your ${v.plural}`}
        </h2>
        <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px' }}>
          {mode === 'assign'
            ? `Who was this ${v.file.toLowerCase() === 'with' ? 'session with' : 'session about'}? It still counts toward your whole Blueprint.`
            : profile?.role === 'clinician'
              ? 'Keep a record per client. All their sessions live in their case file.'
              : 'A therapist, a psychiatrist, a coach — name each one. Sessions you file under them stay grouped, but your Blueprint always sees everything.'}
        </p>

        <div className="col" style={{ gap: 8, maxHeight: '42vh', overflowY: 'auto' }}>
          {mode === 'assign' && (
            <button className={'circle-opt' + (!selectedId ? ' on' : '')} onClick={() => { onPick?.(null); onClose?.() }}>
              <span className="circle-av" style={{ background: 'var(--powder-soft)', color: 'var(--ink-3)' }}><UserIcon size={18} /></span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Unfiled</span>
              {!selectedId && <CheckIcon size={16} />}
            </button>
          )}
          {roster.map((c) => (
            <div key={c.id} className={'circle-opt' + (mode === 'assign' && selectedId === c.id ? ' on' : '')}
              onClick={() => { if (mode === 'assign') { onPick?.(c.id); onClose?.() } }}
              style={{ cursor: mode === 'assign' ? 'pointer' : 'default' }}>
              <span className="circle-av">{(c.name || '?').trim().charAt(0).toUpperCase()}</span>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                {c.role && <div className="micro">{c.role}</div>}
              </div>
              {mode === 'assign' && selectedId === c.id && <CheckIcon size={16} />}
              {mode === 'manage' && (
                <button className="icon-btn" style={{ width: 34, height: 34, background: 'transparent', color: 'var(--ink-3)' }}
                  onClick={(e) => { e.stopPropagation(); onDelete?.(c.id) }} aria-label={`Remove ${c.name}`}>
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {adding ? (
          <div className="col" style={{ gap: 10, marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <input autoFocus className="field" placeholder={profile?.role === 'clinician' ? 'Client name or initials' : 'Name — e.g. Dr. Lee, or "My therapist"'}
              value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            {v.roles.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
                {v.roles.map((r) => (
                  <button key={r} className={'opt' + (role === r ? ' sel' : '')} onClick={() => setRole(r)}>{r}</button>
                ))}
              </div>
            )}
            {profile?.role === 'clinician' && (
              <input className="field" placeholder="A private note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            )}
            <div className="row gap">
              <button className="btn primary block" disabled={!name.trim()} onClick={add}>
                <AddIcon size={16} /> Add {v.noun}
              </button>
              {roster.length > 0 && <button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>}
            </div>
          </div>
        ) : (
          <button className="btn soft block" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>
            <AddIcon size={16} /> Add a {v.noun}
          </button>
        )}
      </motion.div>
    </>
  ), document.body)
}
