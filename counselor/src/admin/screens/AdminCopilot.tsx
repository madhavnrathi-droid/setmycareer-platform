// The full-screen Mission Control AI copilot — a dedicated chat surface for the
// power admin, on the same model + live dashboard context as the floating bar.
// Unmetered. A roomy composer, suggested operator prompts, and a clean transcript.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useLocation } from "react-router-dom"
import { ArrowUp, Sparkles, RotateCcw, Loader2 } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useCompanyClients } from "../company-store"
import { useAdminLiveSnapshot } from "../client-directory"
import { buildAdminContext } from "../admin-context"
import { useSharedAdminChat, resetAdminChat } from "../admin-chat"
import { cn } from "@/lib/utils"

const PROMPTS = [
  "Give me the board-ready summary of this month — growth, retention, burn, the one risk.",
  "Rank counsellors by revenue per session and flag anyone off-target.",
  "Who are the 5 highest-value at-risk clients and the save play for each?",
  "Break down where revenue leaks between gross bookings and net collected.",
  "Model runway if we double paid marketing and CAC rises 20%.",
  "Which product has the best contribution margin, and should we push it?",
]

const textOf = (m: UIMessage) => m.parts.filter((p): p is { type: "text"; text: string } => p.type === "text").map((p) => p.text).join("")

export function AdminCopilot() {
  const clients = useCompanyClients()
  const live = useAdminLiveSnapshot()
  const loc = useLocation()
  const [input, setInput] = useState("")
  const ref = useGsap((s) => revealChildren(s), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })
  const busy = status === "submitted" || status === "streaming"
  useSharedAdminChat({ messages, status, setMessages }) // one thread shared with the floating bar

  const aiContext = useMemo(() => ({ audience: "admin" as const, screen: "AI copilot", adminContext: buildAdminContext(clients, live) }), [clients, live])

  const send = useCallback((text: string) => {
    const t = text.trim(); if (!t || busy) return
    setInput(""); sendMessage({ text: t }, { body: { context: aiContext } })
  }, [busy, sendMessage, aiContext])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }) }, [messages, loc.pathname])

  const empty = messages.length === 0

  return (
    <div ref={ref} className="flex h-[calc(100svh-9rem)] flex-col">
      <div data-reveal className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-[24px] font-semibold tracking-tight"><Sparkles className="size-5 text-brand-500" /> AI copilot</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Ask anything about the business — it sees the whole live dashboard and can compute on it.</p>
        </div>
        {!empty && <button onClick={() => { setMessages([]); resetAdminChat() }} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary"><RotateCcw className="size-3.5" /> New chat</button>}
      </div>

      {/* transcript */}
      <div ref={scrollRef} className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
        {empty ? (
          <div data-reveal className="grid gap-2.5 sm:grid-cols-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} className="rounded-2xl border border-border bg-card p-4 text-left text-[13.5px] text-foreground shadow-[var(--shadow-e1)] transition hover:bg-secondary/50">{p}</button>
            ))}
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed", m.role === "user" ? "bg-foreground text-background" : "bg-card text-foreground ring-1 ring-border")}>
                {textOf(m) || (busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : "")}
              </div>
            </div>
          ))
        )}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start"><div className="rounded-2xl bg-card px-4 py-2.5 ring-1 ring-border"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div></div>
        )}
        {error && <p className="text-[13px] text-risk-600">Hit a snag reaching the model — try again in a moment.</p>}
      </div>

      {/* composer */}
      <div data-reveal className="mt-4 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-e2)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
            rows={1}
            placeholder="Ask about revenue, retention, a counsellor, a client, unit economics… or ask it to compute something."
            className="max-h-40 flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] text-foreground outline-none placeholder:text-ink-300"
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()} className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-40">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
