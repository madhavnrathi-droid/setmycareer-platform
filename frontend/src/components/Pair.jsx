import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { pairCreate, pairJoin, pairStatus } from '../lib/api'
import { upsertContact } from '../lib/store'
import { CheckIcon } from './Icons'

/**
 * Session verification handshake.
 * One device shows an auto-generated QR; the other scans it (or types the code).
 * onPaired(peer) fires on both devices once the handshake completes.
 */
export default function Pair({ profile, onPaired, onClose }) {
  const [mode, setMode] = useState('show') // 'show' | 'scan'
  const [paired, setPaired] = useState(null)

  async function handlePaired(peer) {
    await upsertContact(peer)
    setPaired(peer)
    setTimeout(() => onPaired(peer), 900) // let the success state land
  }

  return (
    <>
      <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
        <div className="sheet-grab" />
        {paired ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center', padding: '28px 0 36px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999, background: 'var(--good-soft)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--good)',
            }}><CheckIcon size={30} /></div>
            <h2 className="display">Session verified</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Paired with {paired.name} ({paired.role})
            </p>
          </motion.div>
        ) : (
          <>
            <h2 className="display" style={{ textAlign: 'center' }}>Verify session</h2>
            <p className="muted" style={{ textAlign: 'center', margin: '6px 0 18px', fontSize: 13.5 }}>
              Both people confirm this session is consented — one shows, the other scans.
            </p>
            <div className="row" style={{ background: 'var(--powder-soft)', borderRadius: 999, padding: 4, marginBottom: 18 }}>
              {['show', 'scan'].map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 999, fontWeight: 600, fontSize: 14, position: 'relative',
                  color: mode === m ? '#fff' : 'var(--ink-2)',
                }}>
                  {mode === m && <motion.span layoutId="pair-seg" style={{
                    position: 'absolute', inset: 0, background: 'var(--ink)', borderRadius: 999,
                  }} transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                  <span style={{ position: 'relative' }}>{m === 'show' ? 'Show my QR' : 'Scan theirs'}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {mode === 'show'
                ? <ShowQR key="show" profile={profile} onPaired={handlePaired} />
                : <ScanQR key="scan" profile={profile} onPaired={handlePaired} />}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </>
  )
}

function ShowQR({ profile, onPaired }) {
  const [code, setCode] = useState(null)
  const [qr, setQr] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let live = true, poll
    pairCreate(profile.name, profile.role)
      .then(async ({ code }) => {
        if (!live) return
        setCode(code)
        setQr(await QRCode.toDataURL(code, { width: 480, margin: 1, color: { dark: '#12354E' } }))
        poll = setInterval(async () => {
          try {
            const s = await pairStatus(code)
            if (s.status === 'paired') { clearInterval(poll); onPaired(s.peer) }
            if (s.status === 'expired') { clearInterval(poll); setErr('Code expired — reopen to retry.') }
          } catch { /* transient */ }
        }, 1500)
      })
      .catch((e) => setErr(e.message))
    return () => { live = false; clearInterval(poll) }
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ textAlign: 'center' }}>
      {err ? <p style={{ color: 'var(--bad)' }}>{err}</p> : qr ? (
        <>
          <div className="qr-box" style={{ width: 232, margin: '0 auto' }}>
            <img src={qr} width="196" height="196" alt="pairing QR" style={{ display: 'block' }} />
          </div>
          <div className="code-text" style={{ marginTop: 16 }}>{code}</div>
          <p className="micro" style={{ marginTop: 8 }}>Waiting for the other device…</p>
          <div className="spin" style={{ margin: '12px auto 6px' }} />
        </>
      ) : <div className="spin" style={{ margin: '40px auto' }} />}
    </motion.div>
  )
}

function ScanQR({ profile, onPaired }) {
  const videoRef = useRef(null)
  const [manual, setManual] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const doneRef = useRef(false)

  async function submit(code) {
    if (doneRef.current || !code) return
    doneRef.current = true
    setBusy(true)
    try {
      const { peer } = await pairJoin(code.trim().toUpperCase(), profile.name, profile.role)
      onPaired(peer)
    } catch (e) {
      doneRef.current = false
      setBusy(false)
      setErr(e.message === 'code invalid or expired' ? 'Code not found — check and retry.' : e.message)
    }
  }

  useEffect(() => {
    let stream, raf
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        const v = videoRef.current
        if (!v) return
        v.srcObject = s
        v.play()
        const tick = () => {
          if (v.readyState === v.HAVE_ENOUGH_DATA && !doneRef.current) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight
            ctx.drawImage(v, 0, 0)
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
            if (hit?.data) { submit(hit.data); return }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      })
      .catch(() => setErr('Camera unavailable — type the code instead.'))
    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {!err && <video ref={videoRef} className="scan-video" muted playsInline />}
      {err && <p className="muted" style={{ textAlign: 'center', fontSize: 13.5 }}>{err}</p>}
      <div className="row gap" style={{ marginTop: 14 }}>
        <input className="field" placeholder="Or enter code" value={manual} maxLength={6}
          style={{ textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 600, textAlign: 'center' }}
          onChange={(e) => setManual(e.target.value)} />
        <button className="btn primary" disabled={busy || manual.length < 6}
          onClick={() => submit(manual)}>{busy ? '…' : 'Join'}</button>
      </div>
    </motion.div>
  )
}
