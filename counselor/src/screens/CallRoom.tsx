import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom"
import { useChat as useAIChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  usePortalAccount, useBookings, completeBooking, startCallInvite, setCallStatus, type PortalBooking,
} from "@/portal/portal-store"
import {
  NotebookPen, AudioLines, Circle, Plus, MessageSquare, Send, Radio, CalendarDays, Columns2,
} from "lucide-react"
import { toast } from "sonner"
import { LiveKitRoom, RoomAudioRenderer, useChat, useDataChannel, useRemoteParticipants, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import "@livekit/components-styles"
import { useClientName } from "@/lib/caseload"
import { useSession } from "@/lib/auth-store"
import { saveRecording as storeRecording } from "@/lib/recordings-store"
import { fetchLiveKitToken } from "@/lib/livekit"
import { cn } from "@/lib/utils"
import { InCallBar, InCallChatPanel, type InCallAI, type MediaCtl, type AiStatus } from "./call/InCallAssistant"
import { VideoStage, LiveKitMediaBridge } from "./call/LiveStage"

/* Native video/voice call room (counselor side). Real LiveKit multi-party when
   keys are set (LiveKitRoom + VideoConference); otherwise a local camera/mic
   preview so the experience works end-to-end. In-call counselor tools live in
   the right rail: Notes (each note stamped with when typing began), Transcript,
   and Chat (LiveKit data-channel messages live, local echo in preview). */

const SESSION_MIN = 50 // package length (mock — would come from the client's plan)
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

type Note = { ts: number; text: string }
type TLine = { ts: number; speaker: string; text: string; self: boolean }
type Mode = "connecting" | "live" | "demo"
type ChatMsg = { me: boolean; name?: string; text: string }

// Browser SpeechRecognition (Chromium). Typed loosely — it's a vendor API.
type SpeechRec = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const getSpeechRec = (): SpeechRec | null => {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
  if (!Ctor) return null
  try { return new Ctor() } catch { return null }
}
const captionsSupported = (): boolean => {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition)
}
type RailTabKey = "notes" | "split" | "transcript" | "chat"
type RailProps = {
  tab: RailTabKey
  setTab: (t: RailTabKey) => void
  notes: Note[]
  transcript: TLine[]
  captionsOn: boolean
  draft: string
  setDraft: (s: string) => void
  draftTs: React.MutableRefObject<number | null>
  elapsedRef: React.MutableRefObject<number>
  addNote: () => void
  live: boolean
}

export function CallRoom() {
  const { clientId } = useParams()
  const [params] = useSearchParams()
  const audioOnly = params.get("mode") === "voice"
  const nav = useNavigate()
  const loc = useLocation()
  const portalAccount = usePortalAccount()
  // The same room (smc-<clientId>) is joined from BOTH sides — the counsellor at
  // /call/:id and the client at /portal/call/:id — so they must use DISTINCT
  // identities or LiveKit treats them as the same participant.
  const isClient = loc.pathname.startsWith("/portal")
  const me = useSession()
  // counsellor side resolves the client's real name from the live caseload;
  // a ?topic= on the link gives a sensible header when the id isn't in caseload.
  const liveClientName = useClientName(clientId)
  const topic = params.get("topic") ?? undefined
  const name = isClient
    ? portalAccount?.name ?? "You"
    : liveClientName ?? topic ?? (clientId ? `Client ${clientId}` : "Session")
  const selfIdentity = isClient ? `client-${clientId ?? "guest"}` : `counselor-${me?.userId ?? "self"}`
  const selfName = isClient ? portalAccount?.name ?? "Client" : me?.name ?? "Counsellor"

  const [mode, setMode] = useState<Mode>("connecting")
  const [lk, setLk] = useState<{ token: string; url: string } | null>(null)
  const [connState, setConnState] = useState<ConnectionState | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(!audioOnly)
  const [screenRec, setScreenRec] = useState(false) // off until the user starts capture (UI must match real capture state)
  const elapsedRef = useRef(0)
  const screenStreamRef = useRef<MediaStream | null>(null)
  // MediaRecorder + collected chunks for storing the screen capture locally.
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // best-effort broadcast of the recording notice to the other participant; set
  // inside the live subtree (see RecordingNotifier). No-op in demo mode.
  const broadcastRecRef = useRef<((on: boolean) => void) | null>(null)

  // bookings → the call's planned length + where the actual duration is stamped
  const bookings = useBookings(clientId ?? "")
  const booking = useMemo(
    () => bookings.filter((b) => b.status !== "canceled" && b.status !== "completed").sort((a, b) => a.at.localeCompare(b.at))[0],
    [bookings],
  )
  // presence-gated timer: ticks only while the OTHER party is in the room and the
  // counsellor hasn't paused it; stops when they leave. Demo (single user) runs.
  const [remoteCount, setRemoteCount] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showCal, setShowCal] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false) // right-hand deep-chat panel
  const [liveMedia, setLiveMedia] = useState<MediaCtl | null>(null) // from LiveKit in live mode
  const joined = mode === "demo" ? true : remoteCount >= 1
  const running = joined && !paused
  const runningRef = useRef(false)
  runningRef.current = running

  // Rail state lives here (not in RightRail) so notes/draft/tab survive the
  // connecting→live remount, when RightRail moves under <LiveKitRoom>.
  const [tab, setTab] = useState<RailTabKey>("notes")
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState("")
  const draftTs = useRef<number | null>(null)
  const addNote = () => {
    if (!draft.trim()) return
    setNotes((n) => [...n, { ts: draftTs.current ?? elapsedRef.current, text: draft.trim() }])
    setDraft(""); draftTs.current = null
  }

  // ── live transcript (real STT) ────────────────────────────────────────────
  // Each side runs the browser's SpeechRecognition on its OWN mic and broadcasts
  // final lines over a LiveKit data channel, so both participants see one combined,
  // speaker-labelled transcript as it happens (Chromium only; degrades to a note
  // elsewhere). The whole thing is stamped onto the session on end.
  const [transcript, setTranscript] = useState<TLine[]>([])
  const captionsOn = useMemo(() => captionsSupported(), [])
  const transcriptRef = useRef<TLine[]>([])
  transcriptRef.current = transcript
  const broadcastTLineRef = useRef<((l: TLine) => void) | null>(null)
  const pushTLine = (line: TLine) => setTranscript((t) => (t.length > 800 ? [...t.slice(-800), line] : [...t, line]))

  const rail = { tab, setTab, notes, transcript, captionsOn, draft, setDraft, draftTs, elapsedRef, addNote }

  // In-call AI assistant — same /api/assistant brain, grounded in WHOSE account is
  // on this side of the call (client vs counsellor). Conversational only (no nav
  // cards mid-call); the popup shows the latest turn, the right panel the full chat.
  const aiTransport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages: aiMessages, sendMessage: aiSendMessage, status: aiStatus, error: aiError, setMessages: aiSetMessages } = useAIChat({ transport: aiTransport })
  const aiContext = useMemo(
    () => isClient
      ? { audience: "client" as const, clientName: (portalAccount?.name ?? name).split(" ")[0], goal: portalAccount?.goal, screen: "Live counselling session" }
      : { audience: "counselor" as const, clientName: liveClientName, screen: "Live counselling session", route: loc.pathname },
    [isClient, portalAccount?.name, portalAccount?.goal, liveClientName, name, loc.pathname],
  )
  const ai: InCallAI = {
    messages: aiMessages,
    status: aiStatus as AiStatus,
    error: aiError,
    send: (t: string) => { if (aiStatus !== "submitted" && aiStatus !== "streaming") aiSendMessage({ text: t }, { body: { context: aiContext } }) },
    reset: () => aiSetMessages([]),
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // connect (or fall back to local preview). A per-session room (?room=smc-s-<id>)
  // makes every booked session its own unique gmeet-style room; otherwise the
  // client's default room is used.
  const lkRoom = params.get("room") || `smc-${clientId ?? "adhoc"}`
  useEffect(() => {
    let cancelled = false
    fetchLiveKitToken(lkRoom, selfIdentity, selfName).then((r) => {
      if (cancelled) return
      if ("token" in r) { setLk({ token: r.token, url: r.url }); setMode("live") }
      else setMode("demo")
    })
    return () => { cancelled = true }
  }, [clientId, selfIdentity, selfName, lkRoom])

  // session timer — accumulates ONLY while both are present and not paused
  useEffect(() => {
    const id = setInterval(() => { if (runningRef.current) { elapsedRef.current += 1; setElapsed(elapsedRef.current) } }, 1000)
    return () => clearInterval(id)
  }, [])

  // live captions — run SpeechRecognition on the LOCAL mic for the whole call and
  // broadcast each final line; the transcript is stamped onto the session on end.
  const captureActive = mode !== "connecting"
  useEffect(() => {
    if (!captureActive || !captionsOn) return
    const rec = getSpeechRec()
    if (!rec) return
    rec.continuous = true; rec.interimResults = false; rec.lang = "en-US"
    let stopped = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (!r.isFinal) continue
        const text = r[0].transcript.trim()
        if (!text) continue
        const line: TLine = { ts: elapsedRef.current, speaker: selfName, text, self: true }
        pushTLine(line)
        broadcastTLineRef.current?.(line)
      }
    }
    // SpeechRecognition auto-stops after a pause; restart until we tear down.
    rec.onend = () => { if (!stopped) { try { rec.start() } catch { /* ignore */ } } }
    rec.onerror = () => { /* transient (no-speech / audio-capture) — onend restarts */ }
    try { rec.start() } catch { /* ignore */ }
    return () => { stopped = true; rec.onend = null; try { rec.stop() } catch { /* ignore */ } }
  }, [captureActive, captionsOn, selfName])

  // ring the client when the counsellor opens the room; mark accepted on the
  // client side; clear the invite when the room unmounts.
  useEffect(() => {
    if (!clientId) return
    if (isClient) setCallStatus(clientId, "accepted")
    else startCallInvite({ clientId, counsellorId: booking?.counsellorId ?? "cn_maya", counsellorName: selfName, mode: audioOnly ? "voice" : "video", topic: booking?.topic ?? "Counselling session", room: lkRoom })
    return () => { if (!isClient) setCallStatus(clientId, "ended") }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, isClient])

  // stop any screen capture if the room unmounts — also flush the recorder so a
  // capture in progress is still saved to the device. Refs are read directly to
  // avoid a stale closure over stopScreenCapture (which changes each render).
  useEffect(() => () => {
    try {
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder && recorder.state !== "inactive") recorder.stop()
    } catch { /* ignore */ }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
  }, [])

  // local camera/mic preview in demo mode
  useEffect(() => {
    if (mode !== "demo") return
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: !audioOnly, audio: true })
      .then((s) => {
        stream = s; streamRef.current = s
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
      })
      .catch(() => { /* no devices — show the avatar fallback */ })
    return () => { stream?.getTracks().forEach((t) => t.stop()) }
  }, [mode, audioOnly])

  const toggleMic = () => {
    setMicOn((v) => { streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !v)); return !v })
  }
  const toggleCam = () => {
    setCamOn((v) => { streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !v)); return !v })
  }

  // Assemble collected chunks into a Blob and store it on-device (Library).
  const saveRecording = () => {
    try {
      const chunks = chunksRef.current
      chunksRef.current = []
      if (chunks.length === 0) return
      const blob = new Blob(chunks, { type: chunks[0].type || "video/webm" })
      const ms = elapsedRef.current * 1000
      void storeRecording({
        id: `call_${Date.now()}`, kind: "screen", clientName: name,
        startedAt: new Date(Date.now() - ms).toISOString(), durationMs: ms,
        mime: blob.type, size: blob.size, createdAt: Date.now(), blob,
      })
    } catch { /* never let a save failure crash the call */ }
  }

  // Begin recording the captured display stream; saves on stop via onstop.
  const startRecording = (stream: MediaStream) => {
    try {
      chunksRef.current = []
      const preferred = "video/webm;codecs=vp9"
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(preferred)
          ? preferred
          : "video/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => { saveRecording() }
      recorder.start()
      recorderRef.current = recorder
    } catch { /* recording unsupported — capture still works, just no local save */ }
  }

  const stopScreenCapture = () => {
    // Stop the recorder first so its onstop handler can flush + save the chunks
    // before the underlying tracks are torn down.
    try {
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder && recorder.state !== "inactive") recorder.stop()
    } catch { /* ignore — proceed to release tracks */ }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
  }

  // Toggling ON is a user gesture, so we can request the OS screen picker here.
  const toggleScreenRec = async () => {
    if (screenRec) {
      stopScreenCapture()
      setScreenRec(false)
      broadcastRecRef.current?.(false)
      toast("Screen recording stopped")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      startRecording(stream)
      // If the user stops sharing via the browser's own control, reflect that.
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          if (screenStreamRef.current) {
            stopScreenCapture()
            setScreenRec(false)
            broadcastRecRef.current?.(false)
          }
        })
      })
      setScreenRec(true)
      broadcastRecRef.current?.(true)
      toast.success("Screen recording on — participants notified")
    } catch {
      stopScreenCapture()
      setScreenRec(false)
      toast.error("Screen recording permission denied")
    }
  }

  const end = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    stopScreenCapture()
    const mins = Math.max(1, Math.round(elapsedRef.current / 60))
    // Serialise the live transcript into a readable, timestamped script for the recap.
    const lines = transcriptRef.current
    const transcriptText = lines.length
      ? lines.map((l) => `[${fmt(l.ts)}] ${l.speaker}: ${l.text}`).join("\n")
      : undefined
    // stamp the actual call duration + the session recap (timestamped notes +
    // transcript) on the booking — admin reads the duration; client/counsellor
    // review the notes + transcript after. completeBooking mirrors it to the cloud.
    if (clientId && booking && elapsedRef.current > 0) completeBooking(booking.id, mins, { notes, transcript: transcriptText })
    if (clientId) setCallStatus(clientId, "ended")
    toast.success(`Call ended · ${mins} min — saved to the session`)
    // Portal clients must return to the portal, not the counsellor console.
    nav(isClient ? "/portal/sessions" : clientId ? `/clients/${clientId}/sessions` : "/")
  }

  const limitMin = booking?.durationMin ?? SESSION_MIN
  const limit = limitMin * 60
  const remaining = limit - elapsed
  const overtime = remaining <= 0
  const timeTone = overtime ? "text-risk-500" : remaining <= 300 ? "text-warn-600" : "text-foreground"

  const initials = useMemo(() => name.split(" ").map((w) => w[0]).join("").slice(0, 2), [name])

  // connection health — surface reconnecting / lost so the call has an honest
  // state for every phase (not just connecting/connected).
  const reconnecting = connState === ConnectionState.Reconnecting
  const connLost = mode === "live" && connState === ConnectionState.Disconnected && joined
  const connBad = reconnecting || connLost
  const connLabel = reconnecting
    ? "Reconnecting…"
    : connLost
      ? "Connection lost — trying to reconnect"
      : mode === "live"
        ? (joined ? "Connected · LiveKit" : "Connected · waiting for the other participant")
        : mode === "demo"
          ? "Local preview · add LiveKit keys for multi-party"
          : "Connecting…"

  // extra bottom room so the video + rail clear the floating control bar
  const bodyClass = "flex min-h-0 flex-1 gap-3 px-3 pb-24"

  return (
    <div className="flex h-svh flex-col bg-ink-900 text-background">
      {/* top bar */}
      <header className="flex shrink-0 items-center gap-3 px-5 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-white/10 text-[13px] font-medium">{initials}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium">{name}</span>
            {joined ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-risk-500/20 px-2 py-0.5 text-[10px] font-medium text-risk-500">
                <Circle className="size-2 animate-pulse fill-current" /> LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-background/70">
                <Circle className={cn("size-2 fill-current", mode === "connecting" && "animate-pulse")} /> {mode === "connecting" ? "Connecting" : "Waiting"}
              </span>
            )}
            {screenRec && (
              <span className="inline-flex items-center gap-1 rounded-full bg-risk-500/20 px-2 py-0.5 text-[10px] font-medium text-risk-500">
                <Radio className="size-3 stroke-[1.75] animate-pulse" /> Recording
              </span>
            )}
            {captionsOn && captureActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-background/70">
                <AudioLines className="size-3 stroke-[1.75]" /> Captions
              </span>
            )}
          </div>
          <div className={cn("flex items-center gap-1.5 text-[11.5px]", connBad ? "text-warn-500" : "text-background/60")}>
            {connBad && <Circle className="size-2 animate-pulse fill-current" />}
            {connLabel}
          </div>
        </div>
        {/* every call control now lives on the floating bar — the header keeps just
            the live session clock (turns red and keeps counting in overtime). */}
        <div className="ml-auto text-right">
          <div className={cn("font-display text-[22px] font-extralight leading-none tabular-nums", overtime ? "text-risk-500" : timeTone === "text-foreground" ? "text-background" : timeTone)}>
            {fmt(elapsed)}
          </div>
          <div className={cn("text-[10px] tabular-nums", overtime ? "text-risk-500" : "text-background/50")}>
            {!joined ? "waiting for the other participant…" : paused ? "paused" : `of ${limitMin}:00 · ${remaining > 0 ? `${fmt(remaining)} left` : "overtime"}`}
          </div>
        </div>
      </header>

      {/* body: video + right rail. In live mode the whole body is inside
          LiveKitRoom so the Chat tab can use the room's data channel. */}
      {mode === "live" && lk ? (
        <LiveKitRoom
          token={lk.token} serverUrl={lk.url} connect audio video={!audioOnly}
          data-lk-theme="default" className={bodyClass}
        >
          <RecordingNotifier registerBroadcast={(fn) => { broadcastRecRef.current = fn }} />
          <TranscriptNotifier registerBroadcast={(fn) => { broadcastTLineRef.current = fn }} onRemote={pushTLine} />
          <ConnStateWatcher onState={setConnState} />
          <PresenceWatcher onCount={setRemoteCount} />
          <LiveKitMediaBridge onMedia={setLiveMedia} />
          <RoomAudioRenderer />
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-black">
            <VideoStage />
            {screenRec && <RecBanner />}
          </div>
          <RightRail {...rail} live />
        </LiveKitRoom>
      ) : (
        <div className={bodyClass}>
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-black">
            {camOn && !audioOnly ? (
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <span className="grid size-24 place-items-center rounded-full bg-white/10 font-display text-[32px] font-extralight">{initials}</span>
              </div>
            )}
            {screenRec && <RecBanner />}
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
              {selfName} (you)
            </div>
          </div>
          <RightRail {...rail} live={false} />
        </div>
      )}

      {/* the one floating bar — AI ask + every call control. Floated up from the
          bottom edge; the answer popup opens above it, expand promotes to the
          right-hand panel. */}
      {mode !== "connecting" && (
        <InCallBar
          ai={ai}
          media={mode === "demo"
            ? { micOn, camOn, sharing: false, toggleMic, toggleCam, toggleShare: () => toast("Screen share turns on with LiveKit keys — screen recording works now via Record.") }
            : liveMedia}
          isClient={isClient}
          audioOnly={audioOnly}
          joined={joined}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          screenRec={screenRec}
          onToggleScreenRec={toggleScreenRec}
          onToggleCalendar={() => setShowCal((v) => !v)}
          calendarOpen={showCal}
          onEnd={end}
          onOpenPanel={() => setPanelOpen(true)}
        />
      )}
      {panelOpen && <InCallChatPanel ai={ai} isClient={isClient} onClose={() => setPanelOpen(false)} />}
      {isClient && showCal && <UpcomingPanel bookings={bookings} onClose={() => setShowCal(false)} />}
    </div>
  )
}

/* ── recording notice ─────────────────────────────────────────────────────
   The banner renders on every party's copy of this room, so it doubles as the
   cross-party notification. In live mode RecordingNotifier also pushes a data
   message so the other side is told in real time and can surface it too. */

function RecBanner() {
  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-risk-500/90 px-3 py-1 text-[11px] font-medium text-background shadow backdrop-blur">
      <Radio className="size-3.5 stroke-[2] animate-pulse" />
      Recording · saves to your device on stop · everyone has been notified
    </div>
  )
}

const REC_TOPIC = "smc-recording"

function RecordingNotifier({ registerBroadcast }: {
  registerBroadcast: (fn: (on: boolean) => void) => void
}) {
  const enc = useRef(new TextEncoder())
  // Surface notices from the other participant.
  const { send } = useDataChannel(REC_TOPIC, (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { rec?: boolean }
      if (typeof data.rec === "boolean") {
        toast(data.rec ? "A participant started screen recording" : "A participant stopped screen recording")
      }
    } catch { /* ignore malformed payloads */ }
  })

  useEffect(() => {
    registerBroadcast((on: boolean) => {
      try { void send(enc.current.encode(JSON.stringify({ rec: on })), {}) } catch { /* best-effort */ }
    })
    return () => registerBroadcast(() => {})
  }, [registerBroadcast, send])

  return null
}

/* Reports the remote-participant count up so the timer gates on "both present". */
function PresenceWatcher({ onCount }: { onCount: (n: number) => void }) {
  const remotes = useRemoteParticipants()
  useEffect(() => { onCount(remotes.length) }, [remotes.length, onCount])
  return null
}

/* Surfaces the LiveKit connection state up to the header so the call has an
   honest state for reconnecting / connection-lost, not just connecting/live. */
function ConnStateWatcher({ onState }: { onState: (s: ConnectionState) => void }) {
  const state = useConnectionState()
  useEffect(() => { onState(state) }, [state, onState])
  return null
}

/* Live transcript over the LiveKit data channel: each side broadcasts its own
   final caption lines and receives the other's, so both see one combined script. */
const TRANSCRIPT_TOPIC = "smc-transcript"
function TranscriptNotifier({ registerBroadcast, onRemote }: {
  registerBroadcast: (fn: (l: TLine) => void) => void
  onRemote: (l: TLine) => void
}) {
  const enc = useRef(new TextEncoder())
  const { send } = useDataChannel(TRANSCRIPT_TOPIC, (msg) => {
    try {
      const l = JSON.parse(new TextDecoder().decode(msg.payload)) as TLine
      if (l && typeof l.text === "string" && typeof l.ts === "number") onRemote({ ...l, self: false })
    } catch { /* ignore malformed payloads */ }
  })
  useEffect(() => {
    registerBroadcast((l: TLine) => {
      try { void send(enc.current.encode(JSON.stringify(l)), {}) } catch { /* best-effort */ }
    })
    return () => registerBroadcast(() => {})
  }, [registerBroadcast, send])
  return null
}

/* Client-side in-call peek at upcoming sessions, without leaving the call. */
function UpcomingPanel({ bookings, onClose }: { bookings: PortalBooking[]; onClose: () => void }) {
  const upcoming = bookings.filter((b) => b.status !== "canceled" && b.status !== "completed").slice(0, 5)
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed bottom-24 left-1/2 z-40 w-80 -translate-x-1/2 rounded-2xl border border-border bg-card p-3 text-foreground shadow-[var(--shadow-float)]">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Upcoming sessions</p>
        {upcoming.length === 0 ? <p className="py-2 text-[12.5px] text-muted-foreground">Nothing scheduled.</p> : (
          <div className="divide-y divide-border">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-brand-600"><CalendarDays className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium">{b.topic}</p><p className="text-[11px] text-muted-foreground">{new Date(b.at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {b.durationMin} min</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── right-rail content blocks (reused by the Notes/Transcript/Split tabs) ─── */
function NotesList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="px-1 pt-2 text-[12px] leading-relaxed text-muted-foreground">Notes you take are stamped with the moment you start typing, so they line up with the recording.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {notes.map((n, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="shrink-0 pt-0.5 font-mono text-[10.5px] tabular-nums text-brand-600">{fmt(n.ts)}</span>
          <span className="text-[12.5px] leading-snug text-ink-700">{n.text}</span>
        </li>
      ))}
    </ul>
  )
}
function NoteComposer({ draft, setDraft, draftTs, elapsedRef, addNote }: Pick<RailProps, "draft" | "setDraft" | "draftTs" | "elapsedRef" | "addNote">) {
  return (
    <div className="shrink-0 border-t border-border p-2">
      <div className="flex items-end gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => { if (draftTs.current == null && e.target.value) draftTs.current = elapsedRef.current; setDraft(e.target.value) }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote() } }}
          rows={1}
          placeholder="Add a timestamped note…"
          className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button onClick={addNote} disabled={!draft.trim()} aria-label="Add note" className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background disabled:opacity-30">
          <Plus className="size-4 stroke-[2]" />
        </button>
      </div>
    </div>
  )
}
function TranscriptBlock({ transcript, captionsOn }: { transcript: TLine[]; captionsOn: boolean }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [transcript.length])
  if (!captionsOn) {
    return (
      <p className="px-1 pt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Live captions need a Chromium browser (Chrome or Edge). The session still runs normally — a full transcript can be attached to the notes afterwards.
      </p>
    )
  }
  if (transcript.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-[12px] text-ink-600">
        <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-risk-500 opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-risk-500" /></span>
        Listening — captions appear here as people speak, stamped to the session clock.
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {transcript.map((l, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="shrink-0 pt-0.5 font-mono text-[10.5px] tabular-nums text-brand-600">{fmt(l.ts)}</span>
          <span className="min-w-0 text-[12.5px] leading-snug text-ink-700">
            <span className={cn("font-medium", l.self ? "text-brand-600" : "text-ink-500")}>{l.speaker}: </span>
            {l.text}
          </span>
        </li>
      ))}
      <div ref={endRef} />
    </ul>
  )
}

/* ── right rail: Notes / Split / Transcript / Chat ───────────────────────── */

function RightRail({ tab, setTab, notes, transcript, captionsOn, draft, setDraft, draftTs, elapsedRef, addNote, live }: RailProps) {
  const composer = { draft, setDraft, draftTs, elapsedRef, addNote }
  return (
    <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card text-foreground">
      <div className="flex shrink-0 items-center gap-1 border-b border-border p-1.5">
        <RailTab active={tab === "notes"} onClick={() => setTab("notes")} icon={NotebookPen} label="Notes" />
        <RailTab active={tab === "split"} onClick={() => setTab("split")} icon={Columns2} label="Split" />
        <RailTab active={tab === "transcript"} onClick={() => setTab("transcript")} icon={AudioLines} label="Transcript" />
        <RailTab active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label="Chat" />
      </div>

      {tab === "notes" ? (
        <>
          <div className="flex-1 overflow-y-auto p-3"><NotesList notes={notes} /></div>
          <NoteComposer {...composer} />
        </>
      ) : tab === "split" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Transcript</p>
            <TranscriptBlock transcript={transcript} captionsOn={captionsOn} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-3"><p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Notes</p><NotesList notes={notes} /></div>
            <NoteComposer {...composer} />
          </div>
        </div>
      ) : tab === "transcript" ? (
        <div className="flex-1 overflow-y-auto p-3"><TranscriptBlock transcript={transcript} captionsOn={captionsOn} /></div>
      ) : live ? (
        <LiveChat />
      ) : (
        <DemoChat />
      )}
    </aside>
  )
}

/* ── chat ────────────────────────────────────────────────────────────────── */

function ChatPanel({ messages, onSend, hint }: { messages: ChatMsg[]; onSend: (t: string) => void; hint: string }) {
  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages.length])
  const submit = () => { const t = text.trim(); if (t) { onSend(t); setText("") } }
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="px-1 pt-2 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m, i) => (
              <li key={i} className={cn("flex flex-col", m.me ? "items-end" : "items-start")}>
                {!m.me && m.name && <span className="px-1 pb-0.5 text-[10px] text-ink-300">{m.name}</span>}
                <span className={cn("max-w-[85%] rounded-2xl px-3 py-1.5 text-[12.5px] leading-snug", m.me ? "bg-brand-500 text-white" : "bg-secondary text-ink-700")}>
                  {m.text}
                </span>
              </li>
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <div className="flex items-end gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
            rows={1}
            placeholder="Message everyone…"
            className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button onClick={submit} disabled={!text.trim()} aria-label="Send message" className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background disabled:opacity-30">
            <Send className="size-4 stroke-[1.75]" />
          </button>
        </div>
      </div>
    </>
  )
}

function LiveChat() {
  const { chatMessages, send } = useChat()
  const messages: ChatMsg[] = chatMessages.map((m) => ({
    me: !!m.from?.isLocal,
    name: m.from?.name || m.from?.identity,
    text: m.message,
  }))
  return <ChatPanel messages={messages} onSend={(t) => { void send(t) }} hint="Messages send to everyone in the call over LiveKit." />
}

function DemoChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  return (
    <ChatPanel
      messages={msgs}
      onSend={(t) => setMsgs((m) => [...m, { me: true, text: t }])}
      hint="Local preview — messages deliver to participants once you're connected via LiveKit."
    />
  )
}

function RailTab({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors", active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60")}
    >
      <Icon className="size-3.5 stroke-[1.5]" /> {label}
    </button>
  )
}
