// The AI guide — a live, member-facing companion for between sessions. It runs
// the same resilient model stack as the rest of the product (Groq → OpenRouter
// failover) but through a CLIENT-SAFE persona (no counsellor tools, clinical
// guardrails). Usage is metered against the account's AI-minute balance: each
// message spends a minute, and the guide pauses with a top-up prompt at zero.
// Live VOICE sessions (the LiveKit voice agent) are the next step on top of this.

import { useMemo, useRef, useState, useEffect, useCallback } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Send, Zap, Mic, History, Plus } from "lucide-react"
import { toast } from "sonner"
import { LogoMark } from "@/components/brand/Logo"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePortalAccount, spendAI, aiBalance, addPlanItem } from "../portal-store"
import { assessmentSummary } from "../tests/report-bridge"
import { useChats, saveChat, getChat } from "../portal-chats"
import { CareerToolCard, isCareerToolName } from "../components/CareerCards"
import { EdgeGlow } from "../art/EdgeGlow"
import { cn } from "@/lib/utils"

// the guide's own colour weather — saturated, warm, unused anywhere else:
// orange → pink → blue → yellow, flowing around the edges of the room while
// the middle stays white for the words.
const GUIDE_GLOW: [string, string, string, string] = ["#fb923c", "#ec4899", "#3b82f6", "#facc15"]

// wayfinding — real starting points, not "ask me anything"
const STARTERS = [
  "Help me decide between two options I'm weighing",
  "What does my report actually say about me?",
  "Map courses and colleges that fit my interests",
  "I feel stuck — where do I even start?",
]

const uid = () =>
  `gc_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`

function textOf(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim()
}

export function PortalTherapy() {
  const account = usePortalAccount()
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, setMessages, error } = useChat({ transport })
  const [draft, setDraft] = useState("")
  // "Discuss with Compass" hand-off: Sessions stashes the transcript context under
  // this key; we pick it up here, show it as a dismissible chip, and ground the
  // conversation in it until the member dismisses it or starts a new chat.
  const [sessionCtx, setSessionCtx] = useState<{ topic?: string; at?: string; excerpt?: string } | null>(() => {
    try {
      const raw = localStorage.getItem("smc.portal.compass.context")
      if (!raw) return null
      const c = JSON.parse(raw)
      return c?.kind === "session_transcript" ? c : null
    } catch { return null }
  })
  const dropSessionCtx = () => { setSessionCtx(null); try { localStorage.removeItem("smc.portal.compass.context") } catch { /* ignore */ } }
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  // Always start with a FRESH id; the effect below owns loading a ?chat= deep-link
  // (seeding from the URL would defeat the load guard and overwrite the stored chat).
  const [chatId, setChatId] = useState(() => uid())
  const chats = useChats()
  const endRef = useRef<HTMLDivElement>(null)

  // the glow's pulse — bumped by keystrokes and by every streamed token,
  // decayed by the shader itself. No re-renders involved.
  const energyRef = useRef(0.14)
  const lastLenRef = useRef(0)
  useEffect(() => {
    // words arriving from the model make the room breathe
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return
    const len = textOf(last).length
    const delta = len - lastLenRef.current
    lastLenRef.current = len
    if (delta > 0) energyRef.current = Math.min(1.5, energyRef.current + Math.min(0.5, delta * 0.012))
  }, [messages])

  // open a chat passed via ?chat= (e.g. "continue" from the hovering bar)
  useEffect(() => {
    const id = params.get("chat")
    if (id && id !== chatId) {
      const c = getChat(id)
      if (c) { setChatId(id); setMessages(c.messages) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // persist the live conversation so it appears in history + the bottom bar
  useEffect(() => { if (messages.length) saveChat(chatId, messages, "guide") }, [messages, chatId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, status])

  const newChat = () => { const id = uid(); setChatId(id); setMessages([]); setParams({}, { replace: true }) }
  const openChat = (id: string) => { const c = getChat(id); if (!c) return; setChatId(id); setMessages(c.messages); setParams({ chat: id }, { replace: true }) }

  // Card actions → real portal navigation / plan-store (mirrors the voice screen).
  const onCardAction = useCallback((action: string, detail?: string) => {
    switch (action) {
      case "book_session": nav("/portal/sessions"); break
      case "take_assessment": nav("/portal/assessments"); break
      case "view_report": nav("/portal/reports"); break
      case "talk_to_counsellor": nav("/portal/messages"); break
      case "top_up": nav("/portal/billing"); break
      case "save_to_plan": {
        const saved = detail ? addPlanItem(detail) : undefined
        toast(saved ? "Saved to your plan — it's on My journey." : "Nothing to save from this step.")
        break
      }
    }
  }, [nav])

  if (!account) return null
  const firstName = account.name.split(" ")[0]
  const chatCredits = aiBalance(account.credits, "chat")
  const out = chatCredits <= 0
  const busy = status === "streaming" || status === "submitted"

  const send = (preset?: string) => {
    const t = (preset ?? draft).trim()
    if (!t || busy || out) return
    if (!spendAI("chat", 1)) return
    energyRef.current = Math.min(1.5, energyRef.current + 0.45)
    sendMessage(
      { text: t },
      // Ground the full-page guide in the client's OWN assessment results (parity
      // with the floating Compass bar + voice) so "explain my results" works here too.
      { body: { context: {
        audience: "client", clientName: firstName, goal: account.goal,
        reportContext: assessmentSummary(account.clientId) || undefined,
        sessionContext: sessionCtx
          ? `Session: ${sessionCtx.topic || "Counselling session"}${sessionCtx.at ? ` (${new Date(sessionCtx.at).toLocaleDateString()})` : ""}\nTranscript:\n${sessionCtx.excerpt || ""}`
          : undefined,
      } } },
    )
    setDraft("")
  }

  return (
    <>
      {/* the room's weather — colour breathes in from the edges of the CONTENT
          area (inset past the opaque sidebar on desktop, so the band never
          hard-cuts under it) and reacts to typing and to the guide's words.
          Kept QUIET: low resting energy + reduced opacity, so it reads as
          ambience behind the words, never a light show. */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-45 lg:left-[248px]">
        <EdgeGlow palette={GUIDE_GLOW} energyRef={energyRef} idle={0.07} />
      </div>

    <div className="relative z-10 mx-auto flex h-[calc(100svh-12rem)] w-full max-w-3xl flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <span className="compass-gradient-ring grid size-11 place-items-center rounded-full bg-card">
          <LogoMark size={22} className="text-foreground" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-foreground">Compass</p>
          <p className="text-[12.5px] text-muted-foreground">Your AI career guide — here any time, between sessions</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-secondary" aria-label="Chat history">
              <History className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Recent chats</DropdownMenuLabel>
              {chats.length === 0 && <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No saved chats yet.</p>}
              {chats.slice(0, 12).map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => openChat(c.id)} className="flex flex-col items-start gap-0.5">
                  <span className="line-clamp-1 text-[12.5px] font-medium text-foreground">{c.title}</span>
                  <span className="text-[10.5px] text-muted-foreground">{c.origin === "bar" ? "From the bar" : "Guide"} · {new Date(c.updatedAt).toLocaleDateString()}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={newChat} className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-secondary" aria-label="New chat"><Plus className="size-4" /></button>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium">
            <Zap className="size-3.5 text-mind-500" /> {chatCredits} credits left
          </span>
        </div>
      </div>

      {/* conversation */}
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-4">
        {/* warm opener — only on a fresh chat */}
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-3">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground">
              Hi {firstName} — I'm Compass, your career guide. We can think through a decision you're weighing,
              unpack what your report is pointing to, or map out courses and colleges that fit. Where
              would you like to start?
            </div>
            {/* wayfinding starters — one tap, no prompt engineering required */}
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card/80 px-3.5 py-2 text-[12.5px] text-ink-600 backdrop-blur-sm transition hover:border-ink-300 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.role === "user"
          const text = textOf(m)
          // The guide also emits generative-UI tool parts (careerCard / studyPath /
          // reportInsight / actionStep). In AI SDK v5 these arrive as message parts
          // typed `tool-<name>` carrying `part.input`; render each as a branded card
          // once its input is available, so the chat organizes recommendations
          // visually rather than burying them in prose.
          const cards = mine
            ? []
            : m.parts.flatMap((p) => {
                const input = (p as { input?: unknown }).input
                return isCareerToolName(p.type) && input
                  ? [{ type: p.type, input }]
                  : []
              })
          if (!text && cards.length === 0) return null
          return (
            <div key={m.id} className={cn("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
              {text && (
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                    mine
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md border border-border bg-card text-foreground",
                  )}
                >
                  {text}
                </div>
              )}
              {cards.map((c, i) => (
                <CareerToolCard key={i} name={c.type} input={c.input} onAction={onCardAction} onReply={(t) => send(t)} />
              ))}
            </div>
          )
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* API failure — say so plainly instead of a silently stuck reply */}
      {error && (
        <div className="mb-2 rounded-xl border border-risk-200 bg-risk-50 px-3.5 py-2 text-[12.5px] text-risk-700">
          That message didn't get through — the guide couldn't reach the model. Check your connection and send it again.
        </div>
      )}

      {/* "Discuss with Compass" — the session transcript this chat is grounded in */}
      {sessionCtx && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3.5 py-2">
          <History className="size-3.5 shrink-0 text-ink-500" />
          <p className="flex-1 truncate text-[12.5px] text-ink-700">
            Discussing your session{sessionCtx.topic ? `: ${sessionCtx.topic}` : ""}
            {sessionCtx.at ? ` · ${new Date(sessionCtx.at).toLocaleDateString([], { day: "numeric", month: "short" })}` : ""}
          </p>
          <button
            type="button"
            onClick={dropSessionCtx}
            className="shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium text-ink-500 transition hover:bg-secondary hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* composer / out-of-credits */}
      {out ? (
        <div className="flex items-center gap-3 rounded-2xl border border-warn-200 bg-warn-50 px-4 py-3">
          <Zap className="size-5 text-warn-600" />
          <p className="flex-1 text-[13px] text-warn-800">You're out of Career Credits for now.</p>
          <Link
            to="/portal/billing"
            className="rounded-full bg-warn-500 px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-warn-600"
          >
            Top up
          </Link>
        </div>
      ) : (
        /* the composer — ONE pill. Text, then the mic (live voice session) and
           send inside the same bar, like a modern messenger. No banner below. */
        <div className="flex items-end gap-1 rounded-[22px] border border-border bg-card p-1.5 shadow-sm transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              energyRef.current = Math.min(1.2, energyRef.current + 0.1) // the room hears you typing, softly
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Tell your guide what's going on…"
            className="max-h-32 min-h-[40px] flex-1 resize-none self-center bg-transparent px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-300"
          />
          <Link
            to="/portal/voice"
            aria-label="Start a live voice session"
            title="Talk it out — live voice session"
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Mic className="size-[18px]" />
          </Link>
          <button
            onClick={() => send()}
            disabled={!draft.trim() || busy}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      )}

      {/* the caveat, where the decision happens — not buried in a footer page */}
      <p className="mt-2 text-center text-[11px] text-ink-300">
        Compass — it can be wrong. Your counsellor confirms the big calls. 1 Career Credit per message.
      </p>
    </div>
    </>
  )
}
