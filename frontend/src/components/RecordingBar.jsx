import { motion } from 'motion/react'
import { StopIcon } from './Icons'
import { useRecorder, stopRecording } from '../lib/recorder'

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * Persistent recording indicator — appears at the top whenever a recording is
 * running and the user has navigated away from Home. Tap body → back to Home;
 * tap stop → end + save from anywhere.
 */
export default function RecordingBar({ onGoHome, onSessionSaved }) {
  const rec = useRecorder()
  if (!rec.active) return null

  async function stop(e) {
    e.stopPropagation()
    const session = await stopRecording()
    if (session) onSessionSaved(session)
  }

  return (
    <motion.button className="rec-bar" onClick={onGoHome} aria-label="Recording in progress — back to session"
      initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -70, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <motion.span className="rec-dot"
        animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <span className="rec-bar-time">{fmtTime(rec.secs)}</span>
      <div className="eq" style={{ height: 18 }} aria-hidden="true">
        {rec.bands.map((b, i) => (
          <i key={i} style={{ height: `${Math.max(18, b * 100)}%` }} />
        ))}
      </div>
      <span className="micro" style={{ color: 'rgba(237,239,230,.6)' }}>
        {rec.verifiedPeer ? 'verified' : 'private'}
      </span>
      <span className="rec-bar-stop" role="button" aria-label="Stop recording" onClick={stop}>
        {rec.saving ? <div className="spin" style={{ width: 16, height: 16 }} /> : <StopIcon size={15} />}
      </span>
    </motion.button>
  )
}
