import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { CheckIcon } from './Icons'
import { OCCUPATIONS, OCC_BY_TITLE, SKILLS, RIASEC } from '../lib/labor'

// Captures the professional layer's grounding: a target role (from the bundled
// O*NET set), the skills you hold, what energizes you (RIASEC), a goal, and a
// quick momentum read. Everything is matched on-device against labor data.
const FIELDS = [...new Set(OCCUPATIONS.map((o) => o.field))]
const MOMENTUM = [['Quiet lately', 25], ['Some moves', 60], ['Lots of motion', 88]]

export default function CareerSheet({ initial, onSave, onClose }) {
  const [current, setCurrent] = useState(initial?.current || '')
  const [target, setTarget] = useState(initial?.target || '')
  const [skills, setSkills] = useState(initial?.skills || [])
  const [riasec, setRiasec] = useState(initial?.riasec || [])
  const [goal, setGoal] = useState(initial?.goal || '')
  const [momentum, setMomentum] = useState(initial?.momentum ?? null)

  const targetOcc = OCC_BY_TITLE[target]
  const coreSkills = targetOcc ? targetOcc.skills.map(([n]) => n) : []
  // surface the target role's core skills first so it's easy to self-assess
  const skillList = [...new Set([...coreSkills, ...SKILLS])]

  const toggle = (list, set, v, max) => {
    if (list.includes(v)) set(list.filter((x) => x !== v))
    else if (!max || list.length < max) set([...list, v])
  }

  function save() {
    if (!target) return
    onSave({ current, target, skills, riasec, goal: goal.trim(), momentum })
  }

  const Select = ({ value, onChange, placeholder }) => (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}
      style={{ appearance: 'none' }}>
      <option value="">{placeholder}</option>
      {FIELDS.map((f) => (
        <optgroup key={f} label={f}>
          {OCCUPATIONS.filter((o) => o.field === f).map((o) => (
            <option key={o.code} value={o.title}>{o.title}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  return createPortal((
    <>
      <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
        <div className="sheet-grab" />
        <h2 className="display" style={{ marginBottom: 4 }}>Your career layer</h2>
        <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px' }}>
          We match this against open labor data (O*NET · BLS) right on your device. Nothing leaves your phone.
        </p>

        <p className="label" style={{ margin: '0 0 6px' }}>Where you're aiming <span style={{ color: 'var(--bad)' }}>*</span></p>
        <Select value={target} onChange={setTarget} placeholder="Pick a target role…" />

        <p className="label" style={{ margin: '16px 0 6px' }}>Where you are now <span className="micro" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
        <Select value={current} onChange={setCurrent} placeholder="Current role…" />

        <p className="label" style={{ margin: '16px 0 6px' }}>Skills you have</p>
        {target && <p className="micro" style={{ margin: '0 0 8px' }}>★ are core for {target}.</p>}
        <div className="row" style={{ flexWrap: 'wrap', gap: 7, maxHeight: '24vh', overflowY: 'auto' }}>
          {skillList.map((s) => (
            <button key={s} className={'opt' + (skills.includes(s) ? ' sel' : '')} onClick={() => toggle(skills, setSkills, s)}>
              {coreSkills.includes(s) ? '★ ' : ''}{s}
            </button>
          ))}
        </div>

        <p className="label" style={{ margin: '16px 0 6px' }}>What energizes you <span className="micro" style={{ textTransform: 'none', letterSpacing: 0 }}>(pick up to 3)</span></p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
          {Object.entries(RIASEC).map(([k, label]) => (
            <button key={k} className={'opt' + (riasec.includes(k) ? ' sel' : '')} onClick={() => toggle(riasec, setRiasec, k, 3)}>
              {label.split(' — ')[0]}
            </button>
          ))}
        </div>

        <p className="label" style={{ margin: '16px 0 6px' }}>Your goal <span className="micro" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
        <input className="field" placeholder="e.g. move into data science within a year"
          value={goal} onChange={(e) => setGoal(e.target.value)} />

        <p className="label" style={{ margin: '16px 0 6px' }}>How's your momentum lately?</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
          {MOMENTUM.map(([label, v]) => (
            <button key={v} className={'opt' + (momentum === v ? ' sel' : '')} onClick={() => setMomentum(v)}>{label}</button>
          ))}
        </div>

        <button className="btn primary block" style={{ marginTop: 18 }} disabled={!target} onClick={save}>
          <CheckIcon size={16} /> Build my career layer
        </button>
        <p className="micro" style={{ textAlign: 'center', margin: '10px 0 0' }}>
          Decision support from labor data — estimates, never a guarantee.
        </p>
      </motion.div>
    </>
  ), document.body)
}
