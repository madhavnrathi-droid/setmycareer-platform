// App-level recording engine — a module singleton so recording survives
// navigation between tabs. React components subscribe via useRecorder().
import { useSyncExternalStore } from 'react'
import { uid, saveSession, saveAudio } from './store'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

const state = {
  active: false,
  secs: 0,
  level: 0,          // 0..1 smoothed mic energy — drives the breathing circle
  bands: [0, 0, 0, 0, 0], // coarse spectrum for the mini equalizer
  caption: '',
  verifiedPeer: null,
  saving: false,
  error: null,
}

let listeners = new Set()
let snapshot = { ...state }
function emit() {
  snapshot = { ...state }
  listeners.forEach((l) => l())
}

// internals
let stream, mediaRecorder, recognition, audioCtx, analyser, meterInt, timerInt
let chunks = []
let finalText = ''
let startedAt = 0

export async function startRecording(verifiedPeer) {
  if (state.active) return
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    state.error = 'Microphone access denied'
    emit()
    setTimeout(() => { state.error = null; emit() }, 100)
    return
  }

  chunks = []
  finalText = ''
  startedAt = Date.now()
  Object.assign(state, {
    active: true, secs: 0, level: 0, caption: '',
    verifiedPeer: verifiedPeer || null, saving: false, error: null,
  })

  mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  mediaRecorder.start(1000)

  // Mic energy meter (drives the voice-reactive visuals)
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const src = audioCtx.createMediaStreamSource(stream)
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.82
  src.connect(analyser)
  const data = new Uint8Array(analyser.frequencyBinCount)
  meterInt = setInterval(() => {
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const raw = sum / (data.length * 255)
    state.level = state.level * 0.7 + Math.min(1, raw * 2.6) * 0.3
    const seg = Math.floor(data.length / 5)
    state.bands = Array.from({ length: 5 }, (_, b) => {
      let s = 0
      for (let i = b * seg; i < (b + 1) * seg; i++) s += data[i]
      return Math.min(1, (s / (seg * 255)) * 2.8)
    })
    emit()
  }, 66)

  // Live captions only for verified (consented) sessions
  if (verifiedPeer && SR) {
    recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      state.caption = (finalText + interim).trimStart()
      emit()
    }
    recognition.onend = () => {
      try { if (state.active) recognition.start() } catch { /* tab hidden etc. */ }
    }
    recognition.start()
  }

  timerInt = setInterval(() => { state.secs += 1; emit() }, 1000)
  emit()
}

export async function stopRecording() {
  if (!state.active || state.saving) return null
  state.saving = true
  emit()

  clearInterval(timerInt)
  clearInterval(meterInt)
  try { recognition?.stop() } catch { /* */ }

  await new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return resolve()
    mediaRecorder.onstop = resolve
    mediaRecorder.stop()
  })
  stream?.getTracks().forEach((t) => t.stop())
  try { await audioCtx?.close() } catch { /* */ }

  const blob = new Blob(chunks, { type: 'audio/webm' })
  const session = {
    id: uid(),
    startedAt,
    duration: state.secs,
    modality: 'general',
    verified: !!state.verifiedPeer,
    peer: state.verifiedPeer || null,
    transcript: state.verifiedPeer ? finalText.trim() : '',
    hasAudio: blob.size > 0,
    analysis: null,
    status: state.verifiedPeer && finalText.trim() ? 'transcribed' : 'recorded',
  }
  if (blob.size > 0) await saveAudio(session.id, blob)
  await saveSession(session)

  Object.assign(state, {
    active: false, secs: 0, level: 0, bands: [0, 0, 0, 0, 0],
    caption: '', verifiedPeer: null, saving: false,
  })
  emit()
  return session
}

export function useRecorder() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => snapshot,
  )
}
