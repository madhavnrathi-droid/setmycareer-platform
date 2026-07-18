import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { LockIcon, ChatIcon, ChevronIcon } from '../components/Icons'
import { getContacts, wipeAll, exportTuningData } from '../lib/store'
import { health } from '../lib/api'

export default function Profile({ profile, sessions, onWiped, onOpenChat }) {
  const [contacts, setContacts] = useState([])
  const [sys, setSys] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [exportMsg, setExportMsg] = useState(null)

  async function doExport() {
    const n = await exportTuningData()
    setExportMsg(n ? `Exported ${n} analyzed session${n === 1 ? '' : 's'} to a file on this device.` : 'No analyzed sessions yet.')
    setTimeout(() => setExportMsg(null), 3000)
  }

  useEffect(() => {
    getContacts().then(setContacts)
    health().then(setSys).catch(() => {})
  }, [])

  async function wipe() {
    await wipeAll()
    onWiped()
  }

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label" style={{ margin: 0 }}>{profile.role === 'clinician' ? 'Clinician' : 'Client'}</p>
        <h1 className="display" style={{ marginBottom: 20 }}>{profile.name}</h1>
      </motion.div>

      <div className="col" style={{ gap: 14 }}>
        {onOpenChat && (
          <button className="card row gap" style={{ textAlign: 'left', background: 'var(--navy)', borderColor: 'transparent' }} onClick={onOpenChat}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <ChatIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#F2F8FB' }}>Talk to Setmycareer</div>
              <p className="micro" style={{ margin: '2px 0 0', color: 'rgba(242,248,251,.6)' }}>
                Reflect, strategize or decide — grounded in your own account.
              </p>
            </div>
            <ChevronIcon size={18} style={{ color: 'rgba(242,248,251,.6)' }} />
          </button>
        )}

        <div className="card row gap">
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--good-soft)', color: 'var(--good)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <LockIcon />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font)' }}>Your data stays here</div>
            <p className="micro" style={{ margin: '2px 0 0' }}>
              {sessions.length} session{sessions.length === 1 ? '' : 's'} stored only on this device.
              The server keeps nothing — AI processing is transient and never stored.
            </p>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="card">
            <p className="label" style={{ marginTop: 0 }}>Paired {profile.role === 'clinician' ? 'clients' : 'clinicians'}</p>
            {contacts.map((c) => (
              <div key={c.id} className="row between" style={{ padding: '8px 0' }}>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span className="chip">{c.role}</span>
              </div>
            ))}
          </div>
        )}

        {sys && (
          <div className="card">
            <p className="label" style={{ marginTop: 0 }}>Engine</p>
            <div className="row between" style={{ padding: '6px 0' }}>
              <span className="muted" style={{ fontSize: 13.5 }}>Analysis model</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{sys.model}</span>
            </div>
            <div className="row between" style={{ padding: '6px 0' }}>
              <span className="muted" style={{ fontSize: 13.5 }}>Transcription</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{sys.stt_model}</span>
            </div>
            <div className="row between" style={{ padding: '6px 0' }}>
              <span className="muted" style={{ fontSize: 13.5 }}>Server-side storage</span>
              <span className="chip on" style={{ padding: '3px 9px' }}>none</span>
            </div>
          </div>
        )}

        <div className="card">
          <p className="label" style={{ marginTop: 0 }}>Connected data</p>
          <p className="micro" style={{ margin: '4px 0 10px', lineHeight: 1.55 }}>
            Sleep and movement shape mental health — Setmycareer reads them as evidence-backed
            behavioral signals (never &ldquo;neurotransmitter levels,&rdquo; which no consumer device measures).
          </p>
          {['Apple Health', 'Google Fit', 'Fitbit', 'Oura', 'Strava'].map((s) => (
            <div key={s} className="row between" style={{ padding: '8px 0' }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{s}</span>
              <span className="chip" style={{ padding: '3px 10px' }}>soon</span>
            </div>
          ))}
          <p className="micro" style={{ margin: '6px 0 0' }}>
            Until then, the daily check-in on your Blueprint feeds the same signals.
          </p>
        </div>

        <div className="card">
          <p className="label" style={{ marginTop: 0 }}>Help Setmycareer improve — for you</p>
          <p className="micro" style={{ margin: '4px 0 12px', lineHeight: 1.55 }}>
            Your reactions already tune your reflections privately on this device. You can also export
            your analyzed sessions as a file to share with the Setmycareer team for tuning — only if you choose to.
          </p>
          <button className="btn soft block" onClick={doExport}>Export tuning data</button>
          {exportMsg && <p className="micro" style={{ margin: '8px 0 0', color: 'var(--good)' }}>{exportMsg}</p>}
        </div>

        {!confirming ? (
          <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => setConfirming(true)}>
            Delete everything on this device
          </button>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, margin: '0 0 14px' }}>
              This permanently erases all sessions, audio, and your profile. There is no backup anywhere.
            </p>
            <div className="row gap">
              <button className="btn soft" style={{ flex: 1 }} onClick={() => setConfirming(false)}>Keep</button>
              <button className="btn" style={{ flex: 1, background: 'var(--bad)', color: '#fff' }} onClick={wipe}>Erase</button>
            </div>
          </div>
        )}

        <p className="micro" style={{ textAlign: 'center', padding: '0 16px' }}>
          Setmycareer is a wellness prototype, not a medical device. Insights are not a diagnosis and
          require clinician judgment. In crisis, call or text 988 (US).
        </p>
      </div>
    </div>
  )
}
