// Live voice session with the AI guide. Fully browser-native (no server agent):
//   • SpeechRecognition streams the member's speech to live on-screen transcript
//   • the text hits the resilient AI guide (/api/assistant, client persona) and
//     streams back, optionally grounded in the member's own report
//   • SpeechSynthesis speaks the reply, then we listen again — a real loop.
// A CREDIT DROPPER at the top burns AI-minutes faster than real time (margin +
// anti-overuse) and ends the session at zero. Launched from the AI guide, the
// bottom bar, or the report ("discuss by voice").

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Mic, X, Phone, Zap, Volume2, Sparkles, Check, Play, Maximize2, Minimize2 } from "lucide-react"
import { toast } from "sonner"
import { LogoMark } from "@/components/brand/Logo"
import { usePortalAccount, spendAI, aiBalance, addPlanItem } from "../portal-store"
import { assessmentSummary } from "../tests/report-bridge"
import { CareerToolCard, isCareerToolName } from "../components/CareerCards"
import { EdgeGlow } from "../art/EdgeGlow"
import {
  COUNSELLOR_STYLES, styleById, useVoices, useVoicePref, setVoiceStyle, setVoiceURI,
  sortVoices, pickVoice, previewVoice, type CounsellorStyle,
} from "../voice-personas"
import { cn } from "@/lib/utils"

// the voice room's own weather — an aurora (teal → lime → cyan → green), a
// different family from the text guide's warm set. It listens: the gradient
// moves with your voice (a real AnalyserNode on the mic), pulses while the
// counsellor speaks, and glows as tokens stream in.
const VOICE_GLOW: [string, string, string, string] = ["#14b8a6", "#a3e635", "#22d3ee", "#4ade80"]

// Burn AI-minutes at this multiple of real time (so we profit over the raw
// LiveKit/voice cost and members don't over-use). 2 = two credit-minutes / min.
const BURN_MULTIPLIER = 2

type Phase = "ready" | "listening" | "thinking" | "speaking" | "ended" | "unsupported"
interface Turn { who: "you" | "guide"; text: string }

interface UIMsg { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] }

/** One generative-UI card the guide emitted mid-conversation, keyed by its tool
 *  call id so a re-emitted call updates its card in place rather than duplicating. */
interface LiveInsight { id: string; name: string; input: unknown }

/** A completed tool call as surfaced by the AI SDK UI-message stream. The single
 *  event that carries the full tool name + input is `tool-input-available`; the
 *  preceding `tool-input-start` / `tool-input-delta` events stream the input
 *  incrementally and are ignored here (we render from the completed call only). */
interface ToolEvent { name: string; input: unknown; callId: string }

/** POST to the AI guide and accumulate the streamed reply. `onDelta` gets the
 *  running assistant TEXT (this — and only this — drives TTS). `onTool` fires once
 *  per completed tool call so the host can render a live insight card; tool inputs
 *  never reach speech. */
async function streamReply(
  messages: UIMsg[],
  context: unknown,
  onDelta: (full: string) => void,
  onTool: (ev: ToolEvent) => void,
): Promise<string> {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, context }),
  })
  if (!res.body) return ""
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = "", full = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split("\n")
    buf = lines.pop() ?? ""
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith("data:")) continue
      const payload = t.slice(5).trim()
      if (!payload || payload === "[DONE]") continue
      try {
        const ev = JSON.parse(payload) as {
          type?: string; delta?: string
          toolName?: string; toolCallId?: string; input?: unknown
        }
        // Spoken text → TTS.
        if (ev.type === "text-delta" && typeof ev.delta === "string") { full += ev.delta; onDelta(full) }
        // Completed tool call → a live insight card (never spoken).
        else if (ev.type === "tool-input-available" && typeof ev.toolName === "string") {
          onTool({ name: ev.toolName, input: ev.input, callId: ev.toolCallId ?? `${ev.toolName}-${Date.now()}` })
        }
      } catch { /* ignore non-JSON keepalives */ }
    }
  }
  return full
}

export function PortalVoice() {
  const account = usePortalAccount()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const reportMode = params.get("report") === "1"

  const [phase, setPhase] = useState<Phase>("ready")
  const [turns, setTurns] = useState<Turn[]>([])
  const [interim, setInterim] = useState("")
  const [elapsed, setElapsed] = useState(0) // real seconds
  const [insights, setInsights] = useState<LiveInsight[]>([]) // live tool cards

  const recRef = useRef<any>(null)
  const activeRef = useRef(false)
  const phaseRef = useRef<Phase>("ready")
  const historyRef = useRef<UIMsg[]>([])
  const listenRef = useRef<() => void>(() => {})
  const startTsRef = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)
  const railEndRef = useRef<HTMLDivElement>(null)
  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p) }

  // ── the gradient's pulse: mic level + speaking pulse + streamed tokens ──────
  const energyRef = useRef(0.12)
  const meterStopRef = useRef<(() => void) | null>(null)
  const [isFull, setIsFull] = useState(false)
  // credits must settle exactly once, even if the user backs out of the route
  const elapsedRef = useRef(0)
  const settledRef = useRef(false)

  const startMeter = useCallback(async () => {
    if (meterStopRef.current) return
    // Own the pending request IMMEDIATELY: if teardown runs while the
    // permission prompt is up, this placeholder flips `cancelled` so the
    // resolved stream is stopped instead of leaking a hot mic forever.
    let cancelled = false
    meterStopRef.current = () => { cancelled = true; meterStopRef.current = null }
    try {
      // a second, visual-only capture — SpeechRecognition keeps its own stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (cancelled || !activeRef.current) {
        stream.getTracks().forEach((tr) => tr.stop())
        return
      }
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
      const ac: AudioContext = new Ctx()
      const an = ac.createAnalyser()
      an.fftSize = 512
      ac.createMediaStreamSource(stream).connect(an)
      const data = new Uint8Array(an.frequencyBinCount)
      let raf = 0
      const tick = () => {
        an.getByteTimeDomainData(data)
        let sum = 0
        for (let k = 0; k < data.length; k++) { const d = (data[k] - 128) / 128; sum += d * d }
        let level = Math.min(1.5, Math.sqrt(sum / data.length) * 7)
        const t = performance.now() * 0.001
        if (phaseRef.current === "speaking") level = Math.max(level, 0.45 + 0.3 * Math.abs(Math.sin(t * 5.2))) // the counsellor's voice isn't in the mic — pulse for it
        if (phaseRef.current === "thinking") level = Math.max(level, 0.28 + 0.1 * Math.sin(t * 2.4))
        energyRef.current = Math.max(energyRef.current, level)
        raf = requestAnimationFrame(tick)
      }
      tick()
      meterStopRef.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((tr) => tr.stop())
        void ac.close()
        meterStopRef.current = null
      }
    } catch { if (!cancelled) meterStopRef.current = null /* no mic for the meter — the glow just idles */ }
  }, [])

  const toggleFull = useCallback(() => {
    // state follows the fullscreenchange event, never the request — on iOS
    // Safari requestFullscreen doesn't exist and an optimistic flip would
    // leave the icon permanently wrong
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }, [])
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const firstName = account?.name.split(" ")[0] ?? "there"
  const startCredits = useRef(aiBalance(account?.credits, "voice"))

  // ── chosen AI-counsellor persona + device voice ─────────────────────────────
  const voices = useVoices()
  const pref = useVoicePref()
  const style = styleById(pref.styleId)
  const sortedVoices = useMemo(() => sortVoices(voices), [voices])
  const chosenVoice = useMemo(() => pickVoice(sortedVoices, style, pref.voiceURI), [sortedVoices, style, pref.voiceURI])
  // refs so the long-lived speak()/listen() loop always reads the latest choice
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined)
  const styleRef = useRef<CounsellorStyle>(style)
  useEffect(() => { voiceRef.current = chosenVoice; styleRef.current = style }, [chosenVoice, style])
  // Display the SAME rounding we charge (ceil to the next credit-minute), so the
  // dropper and the final spend agree.
  const consumedMin = Math.ceil((elapsed * BURN_MULTIPLIER) / 60)
  const remaining = Math.max(0, startCredits.current - consumedMin)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [turns.length, interim, phase])
  // Keep the newest insight card in view as the rail fills (desktop scrolls down,
  // the mobile strip scrolls to the end of the row).
  useEffect(() => { railEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" }) }, [insights.length])

  // A completed tool call → append a live insight card (or update one in place if
  // the same tool call streams again), keyed by its tool-call id. Only the client
  // UI tools that render a real card get one — followUps needs a composer (there
  // is none in voice), so it would be a phantom empty card; skip it.
  const onTool = useCallback((ev: ToolEvent) => {
    if (!isCareerToolName(ev.name) || ev.name === "followUps") return
    setInsights((cur) => {
      const i = cur.findIndex((c) => c.id === ev.callId)
      if (i >= 0) { const next = [...cur]; next[i] = { id: ev.callId, name: ev.name, input: ev.input }; return next }
      return [...cur, { id: ev.callId, name: ev.name, input: ev.input }]
    })
  }, [])

  // Card actions → real portal navigation / plan-store (mirrors the text guide,
  // PortalTherapy). Navigation ends + cleans the live session first so the mic and
  // speech don't keep running behind the destination screen; save_to_plan stays.
  const endSessionQuiet = useCallback(() => {
    activeRef.current = false
    try { recRef.current?.abort?.() } catch { /* noop */ }
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    meterStopRef.current?.()
    if (!settledRef.current) {
      settledRef.current = true
      const spend = Math.ceil((elapsed * BURN_MULTIPLIER) / 60)
      if (spend > 0) spendAI("voice", spend)
    }
  }, [elapsed])

  const onCardAction = useCallback((action: string, detail?: string) => {
    if (action === "save_to_plan") { if (detail && addPlanItem(detail)) toast("Saved to your plan — it's on My journey."); return }
    endSessionQuiet()
    switch (action) {
      case "book_session": nav("/portal/sessions"); break
      case "take_assessment": nav("/portal/assessments"); break
      case "view_report": nav("/portal/reports"); break
      case "talk_to_counsellor": nav("/portal/messages"); break
      case "top_up": nav("/portal/billing"); break
    }
  }, [endSessionQuiet, nav])

  // ── speech synthesis ───────────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone: () => void) => {
    const synth = window.speechSynthesis
    if (!synth) { onDone(); return }
    synth.cancel()
    // Safety net: never read markdown punctuation aloud (the persona writes plain
    // text, but strip stray **bold**/#/`code`/- bullets so they aren't spoken).
    const spoken = text.replace(/[*#`_>]/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/\s{2,}/g, " ").trim()
    const u = new SpeechSynthesisUtterance(spoken)
    // speak in the member's CHOSEN voice + the persona's prosody
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = styleRef.current.rate; u.pitch = styleRef.current.pitch
    u.onend = onDone
    u.onerror = onDone
    setPhaseBoth("speaking")
    synth.speak(u)
  }, [])

  // ── one turn: send text → stream reply → speak → listen again ──────────────
  const handleUser = useCallback(async (text: string) => {
    const clean = text.trim()
    if (!clean || !activeRef.current) return
    setInterim("")
    setTurns((t) => [...t, { who: "you", text: clean }])
    historyRef.current = [...historyRef.current, { id: `u${Date.now()}`, role: "user", parts: [{ type: "text", text: clean }] }]
    setPhaseBoth("thinking")

    const context = {
      audience: "client" as const,
      clientName: firstName,
      goal: account?.goal,
      reportContext: reportMode && account ? assessmentSummary(account.clientId) : undefined,
      counsellorStyle: { name: styleRef.current.name, tone: styleRef.current.tone },
    }
    setTurns((t) => [...t, { who: "guide", text: "" }])
    let full = ""
    try {
      full = await streamReply(historyRef.current, context, (f) => {
        energyRef.current = Math.min(1.5, energyRef.current + 0.05) // tokens arriving → the room glows
        setTurns((t) => { const c = [...t]; c[c.length - 1] = { who: "guide", text: f }; return c })
      }, onTool)
    } catch { full = "Sorry — I had trouble reaching the line. Let's try again." }
    if (!full) full = "Could you say that again?"
    historyRef.current = [...historyRef.current, { id: `a${Date.now()}`, role: "assistant", parts: [{ type: "text", text: full }] }]
    if (!activeRef.current) return
    speak(full, () => { if (activeRef.current) listenRef.current() })
  }, [account, firstName, reportMode, speak, onTool])

  // ── speech recognition ─────────────────────────────────────────────────────
  const listen = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setPhaseBoth("unsupported"); return }
    try { recRef.current?.abort?.() } catch { /* noop */ }
    const rec = new SR()
    rec.lang = "en-IN"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1
    let finalText = ""
    rec.onresult = (e: any) => {
      let intr = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else intr += r[0].transcript
      }
      setInterim(intr)
    }
    const restart = () => setTimeout(() => { if (activeRef.current && phaseRef.current === "listening") listenRef.current() }, 0)
    rec.onend = () => {
      if (!activeRef.current) return
      if (finalText.trim()) handleUser(finalText)
      else if (phaseRef.current === "listening") restart() // silence → build a FRESH recognizer (can't restart a finished one)
    }
    rec.onerror = () => { if (activeRef.current && phaseRef.current === "listening") restart() }
    recRef.current = rec
    setInterim("")
    setPhaseBoth("listening")
    try { rec.start() } catch { /* already started */ }
  }, [handleUser])

  // keep the ref pointed at the latest listen() so callbacks restart cleanly
  useEffect(() => { listenRef.current = listen }, [listen])

  // ── session lifecycle ──────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (aiBalance(account?.credits, "voice") <= 0) return
    activeRef.current = true
    settledRef.current = false
    startCredits.current = aiBalance(account?.credits, "voice")
    startTsRef.current = Date.now()
    setElapsed(0)
    elapsedRef.current = 0
    setInsights([])
    void startMeter() // the gradient starts listening with you
    const greeting = reportMode
      ? `Hi ${firstName}. I'm ${styleRef.current.name}, your SetMyCareer counsellor. Let's talk through your report — ask me about any result, or how the career-fit was worked out, and I'll pin the key points as we go.`
      : `Hi ${firstName}. I'm ${styleRef.current.name}, your SetMyCareer counsellor. We can talk through a decision you're weighing, walk through your report, or explore courses and colleges — where would you like to start?`
    setTurns([{ who: "guide", text: greeting }])
    historyRef.current = [{ id: "a0", role: "assistant", parts: [{ type: "text", text: greeting }] }]
    speak(greeting, () => { if (activeRef.current) listenRef.current() })
  }, [account, firstName, reportMode, speak])

  const end = useCallback(() => {
    activeRef.current = false
    setPhaseBoth("ended")
    try { recRef.current?.abort?.() } catch { /* noop */ }
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    meterStopRef.current?.()
    if (document.fullscreenElement) void document.exitFullscreen()
    if (!settledRef.current) {
      settledRef.current = true
      const spend = Math.ceil((elapsed * BURN_MULTIPLIER) / 60)
      if (spend > 0) spendAI("voice", spend)
    }
    nav(reportMode ? "/portal/reports/career" : "/portal/therapy")
  }, [elapsed, nav, reportMode])

  // credit-dropper ticker — created once per session (not per phase), elapsed
  // computed from wall-clock so it can't drift under the listen/speak cycle.
  const sessionActive = phase !== "ready" && phase !== "ended" && phase !== "unsupported"
  useEffect(() => {
    if (!sessionActive) return
    const id = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startTsRef.current) / 1000)
      elapsedRef.current = secs
      setElapsed(secs)
    }, 1000)
    return () => window.clearInterval(id)
  }, [sessionActive])
  useEffect(() => {
    if (sessionActive && remaining <= 0) end()
  }, [remaining, sessionActive, end])

  // cleanup on unmount — including settling credits if the user backed out of
  // the route mid-session (browser back skips end())
  useEffect(() => () => {
    const wasLive = activeRef.current
    activeRef.current = false
    try { recRef.current?.abort?.() } catch { /* noop */ }
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    meterStopRef.current?.()
    if (wasLive && !settledRef.current) {
      settledRef.current = true
      const spend = Math.ceil((elapsedRef.current * BURN_MULTIPLIER) / 60)
      if (spend > 0) spendAI("voice", spend)
    }
  }, [])

  if (!account) return null
  const noCredits = aiBalance(account.credits, "voice") <= 0

  const statusLabel = phase === "listening" ? "Listening…" : phase === "thinking" ? "Thinking…" : phase === "speaking" ? "Speaking…" : ""

  const hasInsights = insights.length > 0

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      {/* the aurora — colour at the edges, listening to the room; centre stays clean */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <EdgeGlow palette={VOICE_GLOW} energyRef={energyRef} idle={0.12} />
      </div>

      {/* top bar: credit dropper · live status (REC + clock) · fullscreen + close */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-[var(--shadow-e1)] sm:px-3.5">
          <Zap className={cn("size-4 shrink-0", remaining < 3 ? "text-risk-500" : "text-mind-500")} />
          <span className="text-[13px] font-semibold tabular-nums text-foreground">{remaining.toFixed(1)}</span>
          <span className="hidden text-[11.5px] text-muted-foreground sm:inline">Voice Credits</span>
          <div className="ml-1 hidden h-1.5 w-16 overflow-hidden rounded-full bg-secondary sm:block">
            <div className="h-full rounded-full bg-mind-500 transition-[width] duration-1000 ease-linear" style={{ width: `${startCredits.current ? (remaining / startCredits.current) * 100 : 0}%` }} />
          </div>
        </div>

        {/* the session's vitals — always visible, never ambiguous */}
        {sessionActive && (
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-e1)]">
            <span className={cn("size-2 rounded-full", phase === "listening" ? "animate-pulse bg-risk-500" : "bg-ink-300")} />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-600">
              {phase === "listening" ? "Rec" : phase === "thinking" ? "…" : "Live"}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-foreground">{mm}:{ss}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={toggleFull} className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-e1)] transition hover:text-foreground" aria-label={isFull ? "Exit full screen" : "Full screen"}>
            {isFull ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={end} className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-e1)] transition hover:text-foreground" aria-label="End session">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* body: conversation column + (desktop) live insight rail */}
      <div className="relative z-10 flex min-h-0 flex-1 lg:gap-2">
        {/* conversation column — orb, transcript, controls (the working voice loop) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* orb + status */}
          <div className="flex flex-col items-center pt-2">
            <div className={cn(
              "relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white transition-transform",
              phase === "listening" && "animate-pulse",
              phase === "speaking" && "scale-105",
            )}>
              <LogoMark size={40} className="text-white" />
              {phase === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-teal-500/30" />}
            </div>
            <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{statusLabel || `${style.name} · ${style.tagline}`}</p>
          </div>

          {/* pre-session: choose your counsellor + voice (replaces the empty transcript) */}
          {phase === "ready" && !noCredits ? (
            <CounsellorPicker
              style={style} voices={sortedVoices} chosenVoice={chosenVoice} firstName={firstName}
              onSelectStyle={setVoiceStyle} onSelectVoice={setVoiceURI}
              onPreview={() => previewVoice(chosenVoice, style, firstName)}
            />
          ) : (
          /* transcript */
          <div className="mx-auto mt-6 flex w-full max-w-xl flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4">
            {turns.map((t, i) => (
              <div key={i} className={cn("flex", t.who === "you" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[82%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
                  t.who === "you" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-border bg-card text-foreground",
                )}>
                  {t.text || <Volume2 className="size-4 animate-pulse text-ink-300" />}
                </div>
              </div>
            ))}
            {interim && (
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-brand-600/50 px-4 py-2.5 text-[14px] italic text-white">{interim}</div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          )}

          {/* mobile / narrow: live insight strip below the transcript (above controls) */}
          {hasInsights && (
            <div className="lg:hidden">
              <div className="flex items-center gap-1.5 px-5 pb-1.5 pt-1">
                <Sparkles className="size-3.5 text-mind-500" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">Live insights</span>
                <span className="text-[10.5px] tabular-nums text-ink-300">{insights.length}</span>
              </div>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {insights.map((c) => (
                  <div
                    key={c.id}
                    className="w-[19rem] shrink-0 snap-start animate-in fade-in slide-in-from-bottom-2 duration-500"
                  >
                    <CareerToolCard name={c.name} input={c.input} onAction={onCardAction} />
                  </div>
                ))}
                <div ref={railEndRef} className="w-px shrink-0" />
              </div>
            </div>
          )}

          {/* controls */}
          <div className="flex flex-col items-center gap-3 px-5 pb-10 pt-2">
            {phase === "unsupported" ? (
              <p className="max-w-[40ch] text-center text-[13px] text-muted-foreground">Live voice needs Chrome or Edge. On other browsers, use the text guide instead.</p>
            ) : phase === "ready" ? (
              noCredits ? (
                <>
                  <p className="text-[13px] text-muted-foreground">You're out of Voice Credits.</p>
                  <button onClick={() => nav("/portal/billing")} className="rounded-full bg-warn-500 px-5 py-2.5 text-[13px] font-medium text-white">Top up</button>
                </>
              ) : (
                <button onClick={start} className="flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-[14px] font-medium text-white shadow-sm transition hover:bg-brand-700">
                  <Mic className="size-5" /> Start talking with {style.name}
                </button>
              )
            ) : (
              <button onClick={end} className="flex items-center gap-2 rounded-full bg-risk-500 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-risk-600">
                <Phone className="size-5 rotate-[135deg]" /> End session
              </button>
            )}
            <p className="text-[11px] text-ink-300">
              Credits burn at {BURN_MULTIPLIER}× real time · {reportMode ? "report mode" : "general chat"} · mic is live only during the session · AI counsellor — it can be wrong
            </p>
          </div>
        </div>

        {/* desktop: right-hand live insight rail beside the orb/transcript */}
        <aside className="hidden w-[23rem] shrink-0 flex-col border-l border-border/70 bg-card/40 backdrop-blur-sm lg:flex">
          <div className="flex items-center gap-2 border-b border-border/70 px-5 py-4">
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-mind-600">
              <Sparkles className="size-4 stroke-[1.75]" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold leading-tight text-foreground">Live insights</p>
              <p className="text-[11px] leading-tight text-muted-foreground">Captured as we talk</p>
            </div>
            {hasInsights && (
              <span className="ml-auto rounded-full bg-mind-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-mind-700">{insights.length}</span>
            )}
          </div>
          {hasInsights ? (
            <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-5 py-4">
              {insights.map((c) => (
                <div key={c.id} className="w-full animate-in fade-in slide-in-from-right-3 duration-500">
                  <CareerToolCard name={c.name} input={c.input} onAction={onCardAction} />
                </div>
              ))}
              <div ref={railEndRef} className="h-px w-full shrink-0" />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-ink-300">
                <Sparkles className="size-5" />
              </span>
              <p className="max-w-[24ch] text-[12.5px] leading-relaxed text-muted-foreground">
                As we talk through careers, study paths and your report, the key points will appear here.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// ── pre-session picker: choose the AI counsellor (persona) + the voice it speaks in ──
function CounsellorPicker({ style, voices, chosenVoice, firstName, onSelectStyle, onSelectVoice, onPreview }: {
  style: CounsellorStyle
  voices: SpeechSynthesisVoice[]
  chosenVoice?: SpeechSynthesisVoice
  firstName: string
  onSelectStyle: (id: string) => void
  onSelectVoice: (uri: string | null) => void
  onPreview: () => void
}) {
  return (
    <div className="mx-auto mt-5 w-full max-w-xl flex-1 overflow-y-auto px-5 pb-4">
      <p className="text-center text-[13px] text-muted-foreground">
        Choose who you'd like to talk to{firstName !== "there" ? `, ${firstName}` : ""} — and the voice they speak in.
      </p>

      {/* persona cards */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {COUNSELLOR_STYLES.map((s) => {
          const active = s.id === style.id
          return (
            <button
              key={s.id}
              onClick={() => onSelectStyle(s.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                active ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-border bg-card hover:border-ink-300",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white", s.tint)}>
                <span className="text-[15px] font-semibold">{s.name[0]}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-foreground">{s.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{s.tagline}</span>
              </span>
              {active && <Check className="absolute right-2.5 top-2.5 size-4 text-brand-600" />}
            </button>
          )
        })}
      </div>

      {/* voice picker */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="voice" className="text-[12px] font-medium text-foreground">Voice</label>
          <button
            onClick={onPreview}
            disabled={!voices.length}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[12px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Play className="size-3.5" /> Preview
          </button>
        </div>
        {voices.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">Loading the voices your device offers… (live voice needs Chrome or Edge.)</p>
        ) : (
          <select
            id="voice"
            value={chosenVoice?.voiceURI ?? ""}
            onChange={(e) => onSelectVoice(e.target.value || null)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>
            ))}
          </select>
        )}
        <p className="mt-2 text-[11px] text-ink-300">
          {chosenVoice ? `Speaking as ${style.name} in ${chosenVoice.name}.` : "We'll pick a fitting voice automatically."} Your choice is remembered.
        </p>
      </div>
    </div>
  )
}
