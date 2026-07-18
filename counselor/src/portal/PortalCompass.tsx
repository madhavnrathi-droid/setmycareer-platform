// The client portal's floating co-pilot bar — the same liquid-glass Compass pill
// the counsellor has, but tuned for a member: the AI guide (client-safe persona,
// metered by AI minutes) plus a FIXED set of shortcut buttons that never change
// between pages. Reuses the exact AskInput + AnswerPanel so the two products
// feel identical.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { toast } from "sonner"
import {
  ChevronDown, ChevronUp, CalendarPlus, MessageCircle, FileText, ClipboardList, Mic,
} from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { AskInput } from "@/components/compass/AskInput"
import { AnswerPanel } from "@/components/compass/AnswerPanel"
import { usePortalAccount, spendAI, addPlanItem } from "./portal-store"
import { saveChat } from "./portal-chats"
import { assessmentSummary } from "./tests/report-bridge"

const newChatId = () =>
  `bar_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`


// Fixed shortcuts — identical on every page (the founder's ask).
const SHORTCUTS = [
  { label: "Live voice session", icon: Mic, to: "/portal/voice" },
  { label: "Book a session", icon: CalendarPlus, to: "/portal/sessions" },
  { label: "Message counsellor", icon: MessageCircle, to: "/portal/messages" },
  { label: "Reports", icon: FileText, to: "/portal/reports" },
  { label: "Assessments", icon: ClipboardList, to: "/portal/assessments" },
] as const

// The four openers are PERSONA-led, not feature-led: whoever opens the portal
// should see their own situation named back to them in the first second.
const QUICK_PROMPTS = [
  "I'm a student — how do I make the right career decision?",
  "I'm an executive — how do I move past career stagnation?",
  "I'm a parent — how do I guide my child's future?",
  "What's the secret to career and financial success?",
]

// The guide reads the room: its placeholder + quick prompts (and the `screen` it
// tells the AI) change with the page, nudging the member toward the next useful
// step — comparing services, booking a session, taking a test, etc.
interface RouteCtx { screen: string; placeholder: string; prompts: string[] }
const ROUTE_CTX: { test: (p: string) => boolean; ctx: RouteCtx }[] = [
  { test: (p) => p.startsWith("/portal/services") || p.startsWith("/portal/product"), ctx: {
    screen: "Services & products", placeholder: "Which service is right for me?",
    prompts: ["Which service is best for me?", "Compare the Career Success packages", "Big Picture or True North — which fits me?", "What's included in admission support?"] } },
  { test: (p) => p.startsWith("/portal/sessions"), ctx: {
    screen: "Sessions", placeholder: "Help me make the most of my session…",
    prompts: ["What should I cover in my next session?", "Should I book another session?", "Prep me for my counsellor call"] } },
  { test: (p) => p.startsWith("/portal/assessments"), ctx: {
    screen: "Assessments", placeholder: "Which assessment should I take?",
    prompts: ["Which test should I take first?", "What will the personality test tell me?", "How do my results shape my path?"] } },
  { test: (p) => p.startsWith("/portal/reports"), ctx: {
    screen: "Reports", placeholder: "Ask about your report…",
    prompts: ["Explain my career index", "What are my strongest job matches?", "What should I do next, based on this?"] } },
  { test: (p) => p.startsWith("/portal/billing"), ctx: {
    screen: "Package & credits", placeholder: "Which package fits me?",
    prompts: ["Which package is right for me?", "How many sessions do I get?", "Which credit pack should I get?"] } },
  { test: (p) => p.startsWith("/portal/journey"), ctx: {
    screen: "My journey", placeholder: "What's my next step?",
    prompts: ["What's my next milestone?", "Am I on track with my goal?", "What should I focus on this month?"] } },
  { test: (p) => p.startsWith("/portal/terminal"), ctx: {
    screen: "Terminal", placeholder: "Ask about any career on the board…",
    prompts: ["Which rising career fits my test results?", "Explain the AI-exposure read on this board", "Compare two careers for me", "What do today's headlines mean for my plan?"] } },
]
const DEFAULT_CTX: RouteCtx = { screen: "Home", placeholder: "Ask your guide…", prompts: QUICK_PROMPTS }
const routeCtxFor = (p: string): RouteCtx => ROUTE_CTX.find((r) => r.test(p))?.ctx ?? DEFAULT_CTX

export function PortalCompass() {
  const nav = useNavigate()
  const loc = useLocation()
  const account = usePortalAccount()

  const [asking, setAsking] = useState(false)
  const [input, setInput] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [hidden, setHidden] = useState(() => loc.pathname === "/portal/messages")

  // On the Messages page the chat owns the screen, so minimise the bar by default
  // (the user can still peek it open). Fires once per entry to /portal/messages.
  useEffect(() => { if (loc.pathname === "/portal/messages") setHidden(true) }, [loc.pathname])

  const barRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })
  const chatIdRef = useRef(newChatId())

  // persist the bar conversation so it appears in the AI guide's history and can
  // be continued there (chats started in the bar land in the main assistant).
  useEffect(() => { if (messages.length) saveChat(chatIdRef.current, messages, "bar") }, [messages])

  const busy = status === "submitted" || status === "streaming"
  const showAnswer = !dismissed && (messages.length > 0 || busy)

  const firstName = account?.name.split(" ")[0]
  const routeCtx = useMemo(() => routeCtxFor(loc.pathname), [loc.pathname])
  // Ground the bar in the member's OWN assessment results (same digest the voice
  // guide uses) so "what do my results mean?" answers from their real report, not
  // in the abstract. Empty when they've taken no tests → the persona skips it.
  const reportContext = useMemo(
    () => (account?.clientId ? assessmentSummary(account.clientId) || undefined : undefined),
    [account?.clientId],
  )
  const aiContext = useMemo(
    () => ({ audience: "client" as const, clientName: firstName, goal: account?.goal, screen: routeCtx.screen, reportContext }),
    [firstName, account?.goal, routeCtx.screen, reportContext],
  )

  const send = useCallback((text: string) => {
    const t = text.trim()
    if (!t || busy) return
    if (!spendAI("chat", 1)) {
      toast("You're out of Career Credits — top up in Plan & credits.")
      nav("/portal/billing")
      return
    }
    setInput("")
    setDismissed(false)
    sendMessage({ text: t }, { body: { context: aiContext } })
  }, [busy, sendMessage, aiContext, nav])

  const openAsk = useCallback(() => { setAsking(true); requestAnimationFrame(() => inputRef.current?.focus()) }, [])

  // a member card's button → real portal navigation / plan-store (mirrors the
  // full-screen guide). Navigation dismisses the answer so the bar gets out of
  // the way of the destination.
  const onCardAction = useCallback((action: string, detail?: string) => {
    if (action === "save_to_plan") {
      const saved = detail ? addPlanItem(detail) : undefined
      toast(saved ? "Saved to your plan — it's on My journey." : "Nothing to save from this step.")
      return
    }
    setDismissed(true); setExpanded(false)
    switch (action) {
      case "book_session": nav("/portal/sessions"); break
      case "take_assessment": nav("/portal/assessments"); break
      case "view_report": nav("/portal/reports"); break
      case "talk_to_counsellor": nav("/portal/messages"); break
      case "top_up": nav("/portal/billing"); break
    }
  }, [nav])

  // Screens can hand the guide a prompt (e.g. the Career Terminal's "Ask" chips):
  // window.dispatchEvent(new CustomEvent("smc:ask", { detail: "…" })) — the bar
  // un-hides, opens, and sends it as if the member typed it.
  useEffect(() => {
    const onAskEvt = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail
      if (typeof prompt !== "string" || !prompt.trim()) return
      setHidden(false)
      openAsk()
      send(prompt)
    }
    window.addEventListener("smc:ask", onAskEvt)
    return () => window.removeEventListener("smc:ask", onAskEvt)
  }, [openAsk, send])
  const closeAll = useCallback(() => { setAsking(false); setExpanded(false); setDismissed(true); inputRef.current?.blur() }, [])
  const resetConversation = useCallback(() => { chatIdRef.current = newChatId(); setMessages([]); setExpanded(false); setDismissed(false) }, [setMessages])

  // keyboard: ⌘K / '/' focus Ask; Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const inField = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !inField)) { e.preventDefault(); if (hidden) setHidden(false); openAsk() }
      else if (e.key === "Escape" && (showAnswer || asking)) { e.preventDefault(); closeAll() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openAsk, closeAll, showAnswer, asking, hidden])

  // click outside collapses the ask/answer
  useEffect(() => {
    if (!asking && !showAnswer) return
    const onDown = (e: PointerEvent) => { const el = barRef.current; if (el && !el.contains(e.target as Node)) closeAll() }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [asking, showAnswer, closeAll])

  // Hide on dedicated conversation surfaces (their own composer) and while
  // someone is taking a test (keep the focus on the questions).
  const onConversation = loc.pathname === "/portal/therapy" || loc.pathname === "/portal/messages"
  const onTest = /^\/portal\/assessments\/.+/.test(loc.pathname)
  if (!account || onConversation || onTest) return null

  return (
    <TooltipProvider delayDuration={250}>
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Your guide"
        className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2"
      >
        {!hidden && showAnswer && (
          <AnswerPanel
            messages={messages}
            status={status as "submitted" | "streaming" | "ready" | "error"}
            error={error}
            expanded={expanded}
            onToggleExpand={() => setExpanded((v) => !v)}
            onReset={resetConversation}
            onClose={() => { setDismissed(true); setExpanded(false) }}
            onSend={send}
            onCardAction={onCardAction}
            label="Compass"
          />
        )}

        {/* quick prompts — left-aligned, when focusing the empty ask */}
        {!hidden && asking && !showAnswer && (
          <div className="absolute bottom-full left-0 mb-3 flex w-max max-w-[92vw] flex-col gap-1.5 rounded-2xl border border-hairline bg-[var(--surface-frost-strong)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <span className="px-1.5 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Try asking</span>
            {routeCtx.prompts.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-xl px-3 py-1.5 text-left text-[13px] text-ink-600 transition-colors hover:bg-secondary hover:text-foreground">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* liquid-glass pill */}
        <div
          data-tour="guide"
          className={cn(
            "flex items-center gap-1 rounded-full border border-hairline px-1.5 py-1.5",
            "bg-[var(--surface-frost-strong)] shadow-[var(--shadow-float)] backdrop-blur-xl",
            "transition-[width,transform,opacity] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
            hidden ? "pointer-events-none translate-y-[160%] opacity-0" : "translate-y-0 opacity-100",
            asking ? "w-[min(92vw,560px)]" : "w-auto",
          )}
        >
          <AskInput
            ref={inputRef}
            asking={asking}
            value={input}
            onChange={setInput}
            onOpen={openAsk}
            onSubmit={() => send(input)}
            onClose={closeAll}
            busy={busy}
            placeholder={routeCtx.placeholder}
          />

          {!asking && (
            <>
              <span aria-hidden className="mx-0.5 h-5 w-px bg-hairline" />
              <div className="flex items-center gap-0.5">
                {SHORTCUTS.map((s) => {
                  const Icon = s.icon
                  return (
                    <Tooltip key={s.to}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={s.label}
                          onClick={() => nav(s.to)}
                          className="grid size-9 place-items-center rounded-full text-ink-500 transition-[transform,background-color,color] duration-150 hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Icon className="size-[18px] stroke-[1.5]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={10} className="bg-[var(--surface-frost-strong)] text-foreground shadow-[var(--shadow-e3)] backdrop-blur-xl">
                        {s.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Hide bar"
                      onClick={() => setHidden(true)}
                      className="grid size-9 place-items-center rounded-full text-ink-400 transition-[transform,background-color,color] duration-150 hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronDown className="size-[18px] stroke-[1.5]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={10} className="bg-[var(--surface-frost-strong)] text-foreground shadow-[var(--shadow-e3)] backdrop-blur-xl">Hide</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </div>

      {/* peek tab — slides up from the bottom edge when hidden */}
      <button
        onClick={() => setHidden(false)}
        aria-label="Show your guide"
        className={cn(
          "fixed bottom-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-t-2xl border border-b-0 border-hairline bg-[var(--surface-frost-strong)] px-3.5 py-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl",
          "transition-[transform,opacity] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[120%] opacity-0",
        )}
      >
        <span className="grid size-5 place-items-center text-foreground">
          <LogoMark size={16} className="text-foreground" />
        </span>
        <ChevronUp className="size-4 stroke-[1.75] text-ink-500" />
      </button>
    </TooltipProvider>
  )
}
