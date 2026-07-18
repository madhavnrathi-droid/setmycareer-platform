// The in-call command bar — one floating, liquid-glass nav bar that carries BOTH
// the AI assistant (ask + streamed answer popup) AND every call control (mic,
// camera, share, record, pause, calendar, end). It floats a little up from the
// bottom edge. Asking pops a compact answer card ABOVE the bar; the expand glyph
// in that card's top-right promotes the conversation into a right-hand collapsible
// panel for an in-depth chat. The assistant pulls from the signed-in account
// (client or counsellor) and otherwise behaves like a normal LLM.
//
// Used by both sides of the call — the only difference is which account context
// is handed to the model (wired by the parent CallRoom via `isClient`).

import { useEffect, useRef, useState } from "react"
import type { UIMessage } from "ai"
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff,
  Pause, Play, CalendarDays, Maximize2, RefreshCw, X, ArrowUp, Radio,
} from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

export type AiStatus = "submitted" | "streaming" | "ready" | "error"
export interface InCallAI {
  messages: UIMessage[]
  status: AiStatus
  error?: Error
  send: (text: string) => void
  reset: () => void
}

/** A uniform media controller — backed by the local preview stream in demo mode
 *  or the LiveKit local participant in live mode (see LiveKitMediaBridge). */
export interface MediaCtl {
  micOn: boolean
  camOn: boolean
  sharing: boolean
  toggleMic: () => void
  toggleCam: () => void
  toggleShare: () => void
}

const GLYPH = "linear-gradient(135deg, #0ea5e9 0%, #0574a9 52%, #4f46e5 100%)"

// plain-text view of an assistant turn (we keep mid-call answers conversational —
// no navigate/record generative cards while someone's in a session).
function textOf(m: UIMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (m.parts as any[]).filter((p) => p.type === "text").map((p) => p.text).join("")
}

function CtlBtn({ on = true, danger, active, onClick, label, children }: {
  on?: boolean; danger?: boolean; active?: boolean; onClick: () => void; label: string; children: React.ReactNode
}) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label}
      className={cn(
        "grid size-10 place-items-center rounded-full transition-colors",
        danger ? "bg-risk-500 text-white hover:bg-risk-600"
          : active ? "bg-risk-500/20 text-risk-400 hover:bg-risk-500/30"
          : on ? "bg-white/10 text-background hover:bg-white/20"
          : "bg-white/85 text-ink-900 hover:bg-white",
      )}
    >
      {children}
    </button>
  )
}

/* ── the floating bar ─────────────────────────────────────────────────────── */
export function InCallBar({
  ai, media, isClient, audioOnly, joined, paused, onTogglePause,
  screenRec, onToggleScreenRec, onToggleCalendar, calendarOpen, onEnd, onOpenPanel,
}: {
  ai: InCallAI
  media: MediaCtl | null
  isClient: boolean
  audioOnly: boolean
  joined: boolean
  paused: boolean
  onTogglePause: () => void
  screenRec: boolean
  onToggleScreenRec: () => void
  onToggleCalendar: () => void
  calendarOpen: boolean
  onEnd: () => void
  onOpenPanel: () => void
}) {
  const [input, setInput] = useState("")
  const [dismissed, setDismissed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = ai.status === "submitted" || ai.status === "streaming"
  const showAnswer = !dismissed && (ai.messages.length > 0 || busy)

  const submit = () => {
    const t = input.trim()
    if (!t || busy) return
    setInput(""); setDismissed(false); ai.send(t)
  }
  const expand = () => { setDismissed(true); onOpenPanel() }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto relative">
        {showAnswer && (
          <InCallAnswerPopup ai={ai} onExpand={expand} onClose={() => setDismissed(true)} />
        )}

        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/70 p-1.5 pl-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
          {/* AI ask */}
          <span className="grid size-7 shrink-0 place-items-center rounded-full text-white" style={{ background: GLYPH }}>
            <LogoMark size={13} className="text-white" />
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit() } }}
            placeholder={isClient ? "Ask your guide…" : "Ask Compass…"}
            className="w-[clamp(120px,32vw,240px)] bg-transparent px-1 text-[13.5px] text-background placeholder:text-background/45 focus:outline-none"
          />
          <button
            type="button" onClick={submit} disabled={!input.trim() || busy} aria-label="Ask"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/90 text-ink-900 transition disabled:opacity-30 enabled:hover:bg-white"
          >
            <ArrowUp className="size-4 stroke-[2]" />
          </button>

          <span aria-hidden className="mx-0.5 h-6 w-px bg-white/15" />

          {/* call controls — every call button lives here */}
          <CtlBtn on={media?.micOn ?? true} onClick={() => media?.toggleMic()} label={media?.micOn ?? true ? "Mute" : "Unmute"}>
            {media?.micOn ?? true ? <Mic className="size-[18px] stroke-[1.6]" /> : <MicOff className="size-[18px] stroke-[1.6]" />}
          </CtlBtn>
          {!audioOnly && (
            <CtlBtn on={media?.camOn ?? true} onClick={() => media?.toggleCam()} label={media?.camOn ?? true ? "Turn camera off" : "Turn camera on"}>
              {media?.camOn ?? true ? <VideoIcon className="size-[18px] stroke-[1.6]" /> : <VideoOff className="size-[18px] stroke-[1.6]" />}
            </CtlBtn>
          )}
          <CtlBtn active={media?.sharing} onClick={() => media?.toggleShare()} label="Share screen">
            <MonitorUp className="size-[18px] stroke-[1.6]" />
          </CtlBtn>
          <CtlBtn active={screenRec} onClick={onToggleScreenRec} label={screenRec ? "Stop screen recording" : "Record screen"}>
            <Radio className={cn("size-[18px] stroke-[1.7]", screenRec && "animate-pulse")} />
          </CtlBtn>
          {!isClient && joined && (
            <CtlBtn onClick={onTogglePause} label={paused ? "Resume session clock" : "Pause session clock"}>
              {paused ? <Play className="size-[18px] stroke-[1.7]" /> : <Pause className="size-[18px] stroke-[1.7]" />}
            </CtlBtn>
          )}
          {isClient && (
            <CtlBtn active={calendarOpen} onClick={onToggleCalendar} label="Upcoming sessions">
              <CalendarDays className="size-[18px] stroke-[1.6]" />
            </CtlBtn>
          )}

          <span aria-hidden className="mx-0.5 h-6 w-px bg-white/15" />

          <CtlBtn danger onClick={onEnd} label={isClient ? "Leave call" : "End call"}>
            <PhoneOff className="size-[18px] stroke-[1.8]" />
          </CtlBtn>
        </div>
      </div>
    </div>
  )
}

/* ── the compact answer popup (above the bar) ─────────────────────────────── */
function InCallAnswerPopup({ ai, onExpand, onClose }: { ai: InCallAI; onExpand: () => void; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [ai.messages, ai.status])
  // show just the latest exchange in the popup — depth lives in the panel
  const last = ai.messages.length ? ai.messages[ai.messages.length - 1] : null

  return (
    <div className="absolute bottom-full left-1/2 mb-3 w-[min(92vw,460px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/85 shadow-[var(--shadow-float)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-background/55">{ai.messages.some((m) => m.role === "user") ? "Assistant" : "Assistant"}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={onExpand} aria-label="Open full chat" title="Open full chat" className="grid size-7 place-items-center rounded-full text-background/60 transition hover:bg-white/10 hover:text-background"><Maximize2 className="size-3.5 stroke-[1.6]" /></button>
          <button onClick={onClose} aria-label="Dismiss" title="Dismiss" className="grid size-7 place-items-center rounded-full text-background/60 transition hover:bg-white/10 hover:text-background"><X className="size-4 stroke-[1.6]" /></button>
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[40svh] overflow-y-auto px-3.5 py-3 text-[13px] leading-relaxed text-background/90">
        {last?.role === "assistant" ? (
          <p className="whitespace-pre-wrap">{textOf(last) || <Thinking />}</p>
        ) : ai.status === "submitted" || ai.status === "streaming" ? (
          <Thinking />
        ) : (
          <p className="whitespace-pre-wrap text-background/70">{last ? textOf(last) : ""}</p>
        )}
        {ai.status === "error" && <p className="mt-1 text-[12px] text-risk-400">{ai.error?.message || "That didn't go through — try again."}</p>}
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Thinking">
      <span className="size-1.5 animate-bounce rounded-full bg-background/50 [animation-delay:-0.2s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-background/50 [animation-delay:-0.1s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-background/50" />
    </span>
  )
}

/* ── the right collapsible deep-chat panel ────────────────────────────────── */
export function InCallChatPanel({ ai, isClient, onClose }: { ai: InCallAI; isClient: boolean; onClose: () => void }) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = ai.status === "submitted" || ai.status === "streaming"
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }) }, [ai.messages, ai.status])

  const submit = () => { const t = input.trim(); if (!t || busy) return; setInput(""); ai.send(t) }

  return (
    <div className="fixed right-0 top-0 z-50 flex h-svh w-[min(92vw,400px)] flex-col border-l border-white/10 bg-ink-900/95 text-background shadow-[var(--shadow-float)] backdrop-blur-xl animate-in slide-in-from-right duration-300">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: GLYPH }}><LogoMark size={11} className="text-white" /></span>
        <span className="text-[13.5px] font-medium">{isClient ? "Your guide" : "Compass"}</span>
        <span className="text-[11px] text-background/45">· in this session</span>
        <div className="ml-auto flex items-center gap-0.5">
          {ai.messages.length > 0 && (
            <button onClick={ai.reset} aria-label="New conversation" title="New conversation" className="grid size-7 place-items-center rounded-full text-background/60 transition hover:bg-white/10 hover:text-background"><RefreshCw className="size-3.5 stroke-[1.6]" /></button>
          )}
          <button onClick={onClose} aria-label="Close panel" title="Close" className="grid size-7 place-items-center rounded-full text-background/60 transition hover:bg-white/10 hover:text-background"><X className="size-4 stroke-[1.6]" /></button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {ai.messages.length === 0 && (
          <p className="pt-2 text-[13px] leading-relaxed text-background/55">
            Ask anything — talk through what's coming up in the session, pull from {isClient ? "your" : "the client's"} profile, or get a quick second opinion. Answers stay private to this call.
          </p>
        )}
        {ai.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[86%] text-[13px] leading-relaxed",
              m.role === "user" ? "rounded-2xl rounded-br-md bg-white/90 px-3.5 py-2 text-ink-900" : "text-background/90",
            )}>
              <p className="whitespace-pre-wrap">{textOf(m)}</p>
            </div>
          </div>
        ))}
        {ai.status === "submitted" && <Thinking />}
        {ai.status === "error" && <p className="text-[12px] text-risk-400">{ai.error?.message || "That didn't go through — try again."}</p>}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
            rows={1}
            placeholder="Message your assistant…"
            className="max-h-28 flex-1 resize-none bg-transparent text-[13.5px] text-background placeholder:text-background/40 focus:outline-none"
          />
          <button onClick={submit} disabled={!input.trim() || busy} aria-label="Send" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/90 text-ink-900 transition disabled:opacity-30 enabled:hover:bg-white"><ArrowUp className="size-4 stroke-[2]" /></button>
        </div>
      </div>
    </div>
  )
}
