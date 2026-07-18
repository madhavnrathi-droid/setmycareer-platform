import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react"
import { getClient } from "@/lib/mock"
import { saveRecording } from "@/lib/recordings-store"
import type { RecordingDraft, RecordingLine } from "@/lib/types"

/* ============================================================
   Global recording context (SPEC: Feature A)

   A persistent, app-wide recording session that survives navigation. The flow:
   start → full-screen overlay (live waveform + timer + streaming transcript) →
   minimize (keeps recording; a pill takes over the top-right) → stop → a draft
   handed to the log-session step.

   GRACEFUL DEGRADATION: real microphone amplitude drives the waveform via a Web
   Audio AnalyserNode when available. In headless / denied / deployed contexts we
   silently fall back to a smooth simulated signal so the whole flow stays
   demoable. We never throw to the user.
   ============================================================ */

export type RecordingStatus = "idle" | "recording" | "paused"

const LEVELS = 48 // waveform bars / sample window

export interface RecordingState {
  status: RecordingStatus
  clientId?: string
  clientName?: string
  startedAt: string | null
  elapsedMs: number
  levels: number[]
  expanded: boolean
  micAvailable: boolean
  transcriptLines: RecordingLine[]
  /** The in-progress (not-yet-final) phrase from live speech recognition. */
  interim: string
  source: "mic" | "meeting"
  /** A real speech-to-text + notes pass is running on the stopped audio. */
  transcribing: boolean
  /** Which post-stop step is running (for the log dialog's label). */
  processingStep: "transcribing" | "drafting" | null
}

export interface RecordingApi extends RecordingState {
  start: (opts?: { clientId?: string; clientName?: string; source?: "mic" | "meeting" }) => void
  pause: () => void
  resume: () => void
  minimize: () => void
  openFullscreen: () => void
  /** Stop tracks + timer; returns the draft and parks it for the log step. */
  stop: () => RecordingDraft | null
  /** Assign / change the client mid-recording (the overlay picker). */
  assignClient: (clientId: string, clientName?: string) => void
  /** Consume + clear the pending draft (the log dialog reads this). */
  pendingDraft: RecordingDraft | null
  clearPendingDraft: () => void
  /** Inject a meeting-bot draft straight into the log step (no live recording). */
  setPendingDraftFromMeeting: (draft: RecordingDraft) => void
}

const RecordingContext = createContext<RecordingApi | null>(null)

const flat = () => Array.from({ length: LEVELS }, () => 0.04)
const elapsedToDraftMin = (ms: number) => Math.max(1, Math.round(ms / 60000))

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RecordingStatus>("idle")
  const [clientId, setClientId] = useState<string | undefined>(undefined)
  const [clientName, setClientName] = useState<string | undefined>(undefined)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [levels, setLevels] = useState<number[]>(flat)
  const [expanded, setExpanded] = useState(false)
  const [micAvailable, setMicAvailable] = useState(true)
  const [transcriptLines, setTranscriptLines] = useState<RecordingLine[]>([])
  const [interim, setInterim] = useState("")
  const [source, setSource] = useState<"mic" | "meeting">("mic")
  const [pendingDraft, setPendingDraft] = useState<RecordingDraft | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [processingStep, setProcessingStep] = useState<"transcribing" | "drafting" | null>(null)

  // imperative refs (audio graph + loops) — never trigger renders
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTsRef = useRef<number>(0)
  const pausedAccumRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const statusRef = useRef<RecordingStatus>("idle")
  const simPhaseRef = useRef<number>(0)
  const startedAtIsoRef = useRef<string>("")
  const clientIdRef = useRef<string | undefined>(undefined)
  const clientNameRef = useRef<string | undefined>(undefined)
  const sourceRef = useRef<"mic" | "meeting">("mic")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // live speech-to-text (browser SpeechRecognition) — shows transcript WHILE recording
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null)
  const liveActiveRef = useRef(false)

  const stopLiveTranscript = useCallback(() => {
    liveActiveRef.current = false
    setInterim("")
    const r = recognizerRef.current
    if (r) { try { r.onend = null; r.stop() } catch { /* ignore */ } ; recognizerRef.current = null }
  }, [])

  const startLiveTranscript = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition
    if (!SR) return // unsupported (e.g. Safari/Firefox) → the end-of-session Whisper pass still runs
    try {
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = "en-US"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onresult = (e: any) => {
        let pending = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          const txt = (res[0]?.transcript ?? "").trim()
          if (!txt) continue
          if (res.isFinal) setTranscriptLines((prev) => [...prev, { speaker: "", text: txt }])
          else pending += txt + " "
        }
        setInterim(pending.trim())
      }
      r.onerror = () => { /* ignore; degrade to end-of-session transcription */ }
      r.onend = () => { if (liveActiveRef.current) { try { r.start() } catch { /* ignore */ } } }
      liveActiveRef.current = true
      r.start()
      recognizerRef.current = r
    } catch { /* unsupported / blocked — silent */ }
  }, [])

  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { clientIdRef.current = clientId }, [clientId])
  useEffect(() => { clientNameRef.current = clientName }, [clientName])
  useEffect(() => { sourceRef.current = source }, [source])

  const stopLoops = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (timerRef.current != null) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const teardownAudio = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    dataRef.current = null
  }, [])

  // The amplitude loop — reads real audio when an analyser exists, otherwise
  // synthesizes a calm, organic signal. Either way it pushes into `levels`.
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick)
    const paused = statusRef.current === "paused"
    let next: number[]

    const analyser = analyserRef.current
    const data = dataRef.current
    if (analyser && data) {
      analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>)
      const step = Math.floor(data.length / LEVELS) || 1
      next = Array.from({ length: LEVELS }, (_, i) => {
        const v = data[i * step] / 255
        return paused ? 0.04 : Math.max(0.04, v)
      })
    } else {
      // simulated: layered sines + light noise → believable speech envelope
      simPhaseRef.current += 0.08
      const p = simPhaseRef.current
      next = Array.from({ length: LEVELS }, (_, i) => {
        if (paused) return 0.04
        const env = 0.5 + 0.5 * Math.sin(p * 0.7 + i * 0.18)
        const fast = 0.5 + 0.5 * Math.sin(p * 2.3 + i * 0.5)
        const noise = Math.random() * 0.18
        return Math.max(0.05, Math.min(1, env * 0.55 * fast + noise))
      })
    }
    setLevels(next)
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      if (statusRef.current === "paused") return
      setElapsedMs(performance.now() - startTsRef.current - pausedAccumRef.current)
    }, 200)
  }, [])

  const start = useCallback(
    (opts?: { clientId?: string; clientName?: string; source?: "mic" | "meeting" }) => {
      if (statusRef.current !== "idle") {
        // already recording — just resurface the overlay
        setExpanded(true)
        return
      }
      const resolvedName =
        opts?.clientName ?? (opts?.clientId ? getClient(opts.clientId)?.name : undefined)
      const iso = new Date().toISOString()
      startedAtIsoRef.current = iso
      startTsRef.current = performance.now()
      pausedAccumRef.current = 0
      setClientId(opts?.clientId)
      setClientName(resolvedName)
      setSource(opts?.source ?? "mic")
      setStartedAt(iso)
      setElapsedMs(0)
      setStatus("recording")
      setExpanded(true)
      setLevels(flat())

      startTimer()
      setTranscriptLines([])
      setInterim("")
      startLiveTranscript()
      rafRef.current = requestAnimationFrame(tick)

      // Try the real microphone; degrade gracefully on any failure.
      const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined
      if (md && typeof md.getUserMedia === "function") {
        md.getUserMedia({ audio: true })
          .then((stream) => {
            if (statusRef.current === "idle") {
              stream.getTracks().forEach((t) => t.stop())
              return
            }
            streamRef.current = stream
            try {
              const Ctx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
              const ctx = new Ctx()
              const sourceNode = ctx.createMediaStreamSource(stream)
              const analyser = ctx.createAnalyser()
              analyser.fftSize = 128
              analyser.smoothingTimeConstant = 0.8
              sourceNode.connect(analyser)
              audioCtxRef.current = ctx
              analyserRef.current = analyser
              dataRef.current = new Uint8Array(analyser.frequencyBinCount)
              setMicAvailable(true)
              // also capture the audio itself so we can transcribe it for real on stop
              try {
                const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
                  (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
                )
                const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
                chunksRef.current = []
                mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
                mr.start()
                mediaRecorderRef.current = mr
              } catch {
                mediaRecorderRef.current = null
              }
            } catch {
              setMicAvailable(false)
            }
          })
          .catch(() => setMicAvailable(false))
      } else {
        setMicAvailable(false)
      }
    },
    [startTimer, tick, startLiveTranscript],
  )

  const pause = useCallback(() => {
    if (statusRef.current !== "recording") return
    pausedAtRef.current = performance.now()
    setStatus("paused")
    audioCtxRef.current?.suspend?.().catch(() => {})
    stopLiveTranscript()
  }, [stopLiveTranscript])

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return
    pausedAccumRef.current += performance.now() - pausedAtRef.current
    setStatus("recording")
    audioCtxRef.current?.resume?.().catch(() => {})
    startLiveTranscript()
  }, [startLiveTranscript])

  const minimize = useCallback(() => setExpanded(false), [])
  const openFullscreen = useCallback(() => setExpanded(true), [])

  const assignClient = useCallback((id: string, name?: string) => {
    setClientId(id)
    setClientName(name ?? getClient(id)?.name)
  }, [])

  // Upload the captured audio to the real STT endpoint (Groq Whisper) and swap
  // the preview transcript for the real one. Silently keeps the preview on any
  // failure (no mic audio, too large, network) so the flow never breaks.
  const transcribeBlob = useCallback(async (blob: Blob, draftId: string) => {
    if (!blob || blob.size < 2048) { setProcessingStep(null); setTranscribing(false); return }
    let lines: RecordingLine[] | null = null
    // 1) real speech-to-text (Groq Whisper)
    try {
      setProcessingStep("transcribing")
      const fd = new FormData()
      const ext = blob.type.includes("mp4") ? "mp4" : "webm"
      fd.append("audio", blob, `session.${ext}`)
      const r = await fetch("/api/transcribe", { method: "POST", body: fd })
      if (!r.ok) throw new Error(String(r.status))
      const data = (await r.json()) as { text?: string; segments?: { text: string }[] }
      const parsed = (
        data.segments && data.segments.length
          ? data.segments.map((s) => ({ speaker: "", text: s.text.trim() }))
          : (data.text ?? "").split(/(?<=[.!?])\s+/).map((t) => ({ speaker: "", text: t.trim() }))
      ).filter((l) => l.text.length)
      if (parsed.length) {
        lines = parsed
        setPendingDraft((prev) =>
          prev && prev.id === draftId ? { ...prev, transcript: parsed, transcribed: true } : prev,
        )
      }
    } catch {
      // keep the preview transcript silently
    }
    // 2) AI-drafted notes from the real transcript
    try {
      if (lines && lines.length) {
        setProcessingStep("drafting")
        const r = await fetch("/api/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transcript: lines, clientName: clientNameRef.current }),
        })
        if (r.ok) {
          const n = (await r.json()) as { summary?: string; counselor?: string; client?: string }
          if (n && n.counselor) {
            setPendingDraft((prev) =>
              prev && prev.id === draftId
                ? { ...prev, aiNotes: { summary: n.summary, counselor: n.counselor!, client: n.client ?? "" } }
                : prev,
            )
          }
        }
      }
    } catch {
      // keep the heuristic notes silently
    }
    setProcessingStep(null)
    setTranscribing(false)
  }, [])

  const stop = useCallback((): RecordingDraft | null => {
    if (statusRef.current === "idle") return null
    const elapsed = performance.now() - startTsRef.current - pausedAccumRef.current
    stopLoops()
    stopLiveTranscript()
    const draft: RecordingDraft = {
      id: `rec_${Date.now()}`,
      clientId: clientIdRef.current,
      clientName: clientNameRef.current,
      durationMin: elapsedToDraftMin(Math.max(0, elapsed)),
      startedAt: startedAtIsoRef.current || new Date().toISOString(),
      transcript: transcriptLines,
      source: sourceRef.current,
    }
    setStatus("idle")
    setExpanded(false)
    setLevels(flat())
    setPendingDraft(draft)

    // If we captured real audio, transcribe it for real; otherwise tear down now.
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== "inactive") {
      setTranscribing(true)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        mediaRecorderRef.current = null
        chunksRef.current = []
        teardownAudio()
        // store the audio locally (on-device) so it's accessible in the Library
        if (blob.size > 1024) {
          void saveRecording({
            id: draft.id, kind: "audio", clientName: draft.clientName,
            startedAt: draft.startedAt, durationMs: Math.max(0, elapsed),
            mime: blob.type, size: blob.size, transcript: draft.transcript,
            createdAt: Date.now(), blob,
          })
        }
        void transcribeBlob(blob, draft.id)
      }
      try { mr.stop() } catch { setTranscribing(false); teardownAudio() }
    } else {
      teardownAudio()
    }
    return draft
    // transcriptLines intentionally captured at stop time
  }, [stopLoops, teardownAudio, transcriptLines, transcribeBlob])

  const clearPendingDraft = useCallback(() => setPendingDraft(null), [])
  const setPendingDraftFromMeeting = useCallback((draft: RecordingDraft) => setPendingDraft(draft), [])

  // Listen for compass-bar CustomEvents so the registry can trigger recording
  // WITHOUT importing this hook (loose coupling per SPEC #5/#6).
  useEffect(() => {
    const onNew = () => start()
    const onRecord = (e: Event) => {
      const detail = (e as CustomEvent<{ clientId?: string; clientName?: string }>).detail
      start({ clientId: detail?.clientId, clientName: detail?.clientName })
    }
    window.addEventListener("compass:new-session", onNew)
    window.addEventListener("compass:record-session", onRecord as EventListener)
    return () => {
      window.removeEventListener("compass:new-session", onNew)
      window.removeEventListener("compass:record-session", onRecord as EventListener)
    }
  }, [start])

  // cleanup on unmount
  useEffect(() => () => { stopLoops(); teardownAudio(); stopLiveTranscript() }, [stopLoops, teardownAudio, stopLiveTranscript])

  const value = useMemo<RecordingApi>(
    () => ({
      status, clientId, clientName, startedAt, elapsedMs, levels, expanded,
      micAvailable, transcriptLines, interim, source, transcribing, processingStep,
      start, pause, resume, minimize, openFullscreen, stop, assignClient,
      pendingDraft, clearPendingDraft, setPendingDraftFromMeeting,
    }),
    [
      status, clientId, clientName, startedAt, elapsedMs, levels, expanded,
      micAvailable, transcriptLines, interim, source, transcribing, processingStep,
      start, pause, resume, minimize, openFullscreen, stop, assignClient,
      pendingDraft, clearPendingDraft, setPendingDraftFromMeeting,
    ],
  )

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>
}

export function useRecording(): RecordingApi {
  const ctx = useContext(RecordingContext)
  if (!ctx) throw new Error("useRecording must be used within <RecordingProvider>")
  return ctx
}

/** mm:ss from elapsed milliseconds (tabular-friendly). */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
