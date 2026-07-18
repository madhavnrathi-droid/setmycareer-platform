import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MicIcon, QrIcon, LockIcon, CheckIcon, StopIcon } from '../components/Icons'
import Pair from '../components/Pair'
import VoiceBlob from '../components/VoiceBlob'
import { useRecorder, startRecording, stopRecording } from '../lib/recorder'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const smooth = [0.2, 0.8, 0.2, 1]

/**
 * Home is one circular control. Idle → a still-water orb.
 * Recording happens IN PLACE: the orb becomes a living watercolor blob that
 * swells with the voice while koi dots circle it. Captions surface in serif.
 */
export default function Home({ profile, onSessionSaved, onMask }) {
  const rec = useRecorder()
  const [sheet, setSheet] = useState(false)
  const [pairing, setPairing] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState(false)

  // the start flow (sheet / pairing) hides the bottom nav; recording brings it back
  const masked = (sheet || pairing) && !rec.active
  useEffect(() => { onMask?.(masked) }, [masked, onMask])

  function tryCode() {
    if (code.trim() === '123450') begin({ name: 'Verified session', role: 'clinician', viaCode: true })
    else setCodeErr(true)
  }

  async function begin(peer) {
    setSheet(false)
    setPairing(false)
    await startRecording(peer)
  }

  async function finish() {
    const session = await stopRecording()
    if (session) onSessionSaved(session)
  }

  // last ~12 caption words, surfacing like thoughts
  const words = rec.caption ? rec.caption.trim().split(/\s+/).slice(-12) : []

  return (
    <>
    <div className="screen center" style={{ position: 'relative' }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: smooth }}
        style={{ position: 'absolute', top: 'max(28px, env(safe-area-inset-top))', left: 24, right: 24 }}>
        <p className="label" style={{ margin: 0 }}>{greeting()}</p>
        <h1 className="display">{profile.name}</h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {!rec.active ? (
          <motion.div key="idle" className="col" style={{ alignItems: 'center', gap: 26 }}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, ease: smooth }}>
            <div className="rec-wrap">
              <motion.div className="rec-halo"
                animate={{ scale: [1, 1.06, 1], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
              <motion.div className="rec-ring"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
              <motion.button className="rec-btn" aria-label="Start recording"
                onClick={() => setSheet(true)}
                whileTap={{ scale: 0.94 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                <MicIcon size={40} />
              </motion.button>
            </div>
            <motion.p className="muted" style={{ fontSize: 14.5, margin: 0, fontFamily: 'var(--font)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              Tap to begin a session
            </motion.p>
          </motion.div>
        ) : (
          <motion.div key="live" className="col" style={{ alignItems: 'center', gap: 20 }}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25, ease: smooth }}>

            <span className={'chip ' + (rec.verifiedPeer ? 'on' : 'off')}>
              {rec.verifiedPeer
                ? <><CheckIcon size={13} /> Verified · {rec.verifiedPeer.name}</>
                : <><LockIcon size={13} /> Private — transcript unlocks after pairing</>}
            </span>

            <div className="rec-wrap">
              <VoiceBlob bands={rec.bands} level={rec.level} />
              <div className="live-center">
                <span className="live-timer" style={{ color: '#F2F6FA' }}>{fmtTime(rec.secs)}</span>
              </div>
            </div>

            <div className="live-caption" aria-live="polite">
              <p style={{ margin: 0 }}>
                {rec.verifiedPeer ? (
                  words.length ? (
                    <AnimatePresence initial={false}>
                      {words.map((w, i) => (
                        <motion.span className="live-word" key={`${i}-${w}`}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: smooth }}>
                          {w}{' '}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  ) : 'Listening…'
                ) : 'Recording privately on this device.'}
              </p>
            </div>

            <motion.button className="btn primary" onClick={finish} whileTap={{ scale: 0.96 }}
              disabled={rec.saving} aria-label="End session">
              {rec.saving ? 'Saving…' : 'End session'}
              <StopIcon size={16} light />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      <AnimatePresence>
        {sheet && !pairing && !rec.active && (
          <>
            <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
              <div className="sheet-grab" />
              <h2 className="display" style={{ textAlign: 'center', marginBottom: 4 }}>Start session</h2>
              <p className="muted" style={{ textAlign: 'center', fontSize: 13.5, margin: '0 0 20px' }}>
                Verified sessions transcribe live. Private ones stay sealed until both sides pair.
              </p>
              <button className="btn primary block" onClick={() => setPairing(true)}>
                <QrIcon size={17} /> Verify with QR &amp; record
              </button>
              <button className="btn soft block" style={{ marginTop: 10 }} onClick={() => begin(null)}>
                <LockIcon size={16} /> Record privately
              </button>
              {!codeOpen ? (
                <button className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setCodeOpen(true)}>
                  Have a session code?
                </button>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <div className="row gap">
                    <input className="field" inputMode="numeric" autoFocus placeholder="Enter session code"
                      value={code} style={{ flex: 1, letterSpacing: '.18em', textAlign: 'center' }}
                      onChange={(e) => { setCode(e.target.value); setCodeErr(false) }}
                      onKeyDown={(e) => e.key === 'Enter' && tryCode()} />
                    <button className="btn primary" onClick={tryCode}>Start</button>
                  </div>
                  <p className="micro" style={{ margin: '8px 2px 0', color: codeErr ? 'var(--bad)' : 'var(--ink-3)' }}>
                    {codeErr ? "That code didn't work — check and try again." : 'A valid code starts a verified session without scanning a QR.'}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
        {pairing && (
          <Pair profile={profile} onPaired={(peer) => begin(peer)} onClose={() => setPairing(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
