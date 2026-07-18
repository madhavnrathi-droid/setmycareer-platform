// Mission Control's floating AI bar — the same liquid-glass Compass pill the
// portal and console have, tuned for a POWER ADMIN. It carries a live, complete
// snapshot of the whole dashboard (every KPI, financials, retention, capacity,
// counsellor + client rolls, funnels, segments, alerts) so it can answer and
// COMPUTE anything across the business. Fixed shortcut buttons jump to the key
// screens. Unmetered (internal). Reuses the exact AskInput + AnswerPanel.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChevronDown, ChevronUp, UserPlus, UserCog, CalendarPlus, Ticket, RotateCcw } from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AskInput } from "@/components/compass/AskInput"
import { AnswerPanel } from "@/components/compass/AnswerPanel"
import { useCompanyClients } from "./company-store"
import { useAdminLiveSnapshot, useClientDirectory } from "./client-directory"
import { buildAdminContext } from "./admin-context"
import { useSharedAdminChat, resetAdminChat } from "./admin-chat"
import { AddClientModal } from "./parts/AddClientModal"
import { ScheduleSessionModal } from "./parts/ScheduleSessionModal"
import { AddCounsellorModal } from "./parts/AddCounsellorModal"
import { NewCouponModal, IssueRefundModal } from "./screens/AdminCommerce"


type ActionKey = "client" | "counsellor" | "schedule" | "coupon" | "refund"
const ACTIONS: { label: string; icon: typeof UserPlus; key: ActionKey }[] = [
  { label: "Add client", icon: UserPlus, key: "client" },
  { label: "Invite counsellor", icon: UserCog, key: "counsellor" },
  { label: "Schedule session", icon: CalendarPlus, key: "schedule" },
  { label: "New coupon", icon: Ticket, key: "coupon" },
  { label: "Issue refund", icon: RotateCcw, key: "refund" },
]

const QUICK_PROMPTS = [
  "Summarise the business this month — the 5 numbers that matter.",
  "Who are our most at-risk clients, and what's the play for each?",
  "Which counsellors are over or under capacity right now?",
  "What's driving revenue churn, and what should we do about it?",
  "Compute revenue per counsellor and rank them.",
  "Is our LTV:CAC healthy? Walk me through the unit economics.",
]

const SCREEN: [string, string][] = [
  ["/admin/clients", "Clients"], ["/admin/counsellors", "Counsellors"], ["/admin/journeys", "Journeys"],
  ["/admin/growth", "Growth & product"], ["/admin/reports", "Reports"], ["/admin/sessions", "Sessions"],
  ["/admin/revenue", "Revenue"], ["/admin/economics", "Unit economics"], ["/admin/api", "API & usage"],
  ["/admin/access", "Access"], ["/admin/settings", "Settings"], ["/admin/assistant", "AI copilot"], ["/admin", "Overview"],
]
const screenFor = (p: string) => { let best = "Overview", len = -1; for (const [pre, l] of SCREEN) if (p.startsWith(pre) && pre.length > len) { best = l; len = pre.length } return best }

export function AdminAssistant() {
  const loc = useLocation()
  const clients = useCompanyClients()
  const live = useAdminLiveSnapshot()
  const dir = useClientDirectory()
  // the schedule picker draws from the REAL client base (live directory), plus any
  // hand-added company clients, deduped by id.
  const scheduleClients = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name: string; counsellorId: string }[] = []
    for (const c of clients) if (c.state !== "archived" && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, name: c.name, counsellorId: c.counsellorId }) }
    for (const c of dir.clients) if (c.named && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, name: c.name, counsellorId: c.navigatorId ?? "" }) }
    return out
  }, [clients, dir.clients])

  const [asking, setAsking] = useState(false)
  const [input, setInput] = useState("")
  const [expanded, setExpanded] = useState(false)
  // Start dismissed so a thread restored from the shared store (or continued from
  // the full page) doesn't auto-pop the answer card on navigation.
  const [dismissed, setDismissed] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [modal, setModal] = useState<ActionKey | null>(null)

  const barRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })
  // Share one conversation with the full-screen copilot; suppress the auto-pop
  // when the thread updates from the other surface.
  useSharedAdminChat({ messages, status, setMessages, onExternal: () => setDismissed(true) })

  const busy = status === "submitted" || status === "streaming"
  const showAnswer = !dismissed && (messages.length > 0 || busy)

  // a live, complete snapshot of the dashboard handed to the model each send
  const aiContext = useMemo(
    () => ({ audience: "admin" as const, screen: screenFor(loc.pathname), adminContext: buildAdminContext(clients, live) }),
    [loc.pathname, clients, live],
  )

  const send = useCallback((text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setInput("")
    setDismissed(false)
    sendMessage({ text: t }, { body: { context: aiContext } })
  }, [busy, sendMessage, aiContext])

  const openAsk = useCallback(() => { setAsking(true); requestAnimationFrame(() => inputRef.current?.focus()) }, [])
  const closeAll = useCallback(() => { setAsking(false); setExpanded(false); setDismissed(true); inputRef.current?.blur() }, [])
  const resetConversation = useCallback(() => { setMessages([]); resetAdminChat(); setExpanded(false); setDismissed(false) }, [setMessages])

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

  useEffect(() => {
    if (!asking && !showAnswer) return
    const onDown = (e: PointerEvent) => { const el = barRef.current; if (el && !el.contains(e.target as Node)) closeAll() }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [asking, showAnswer, closeAll])

  // The dedicated full-screen AI page has its own composer.
  if (loc.pathname === "/admin/assistant") return null

  return (
    <TooltipProvider delayDuration={250}>
      <div ref={barRef} role="toolbar" aria-label="Mission Control AI" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
        {!hidden && showAnswer && (
          <AnswerPanel
            label="Mission Control AI"
            messages={messages}
            status={status as "submitted" | "streaming" | "ready" | "error"}
            error={error}
            expanded={expanded}
            onToggleExpand={() => setExpanded((v) => !v)}
            onReset={resetConversation}
            onClose={() => { setDismissed(true); setExpanded(false) }}
            onSend={send}
          />
        )}

        {!hidden && asking && !showAnswer && (
          <div className="absolute bottom-full left-0 mb-3 flex w-max max-w-[92vw] flex-col gap-1.5 rounded-2xl border border-hairline bg-[var(--surface-frost-strong)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <span className="px-1.5 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Ask Mission Control</span>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-xl px-3 py-1.5 text-left text-[13px] text-ink-600 transition-colors hover:bg-secondary hover:text-foreground">{q}</button>
            ))}
          </div>
        )}

        <div className={cn(
          "flex items-center gap-1 rounded-full border border-hairline px-1.5 py-1",
          "bg-[var(--surface-frost-strong)] shadow-[var(--shadow-float)] backdrop-blur-xl",
          "transition-[width,transform,opacity] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
          hidden ? "pointer-events-none translate-y-[160%] opacity-0" : "translate-y-0 opacity-100",
          asking ? "w-[min(92vw,600px)]" : "w-auto",
        )}>
          <AskInput ref={inputRef} compact asking={asking} value={input} onChange={setInput} onOpen={openAsk} onSubmit={() => send(input)} onClose={closeAll} busy={busy} placeholder="Ask anything about the business…" />

          {!asking && (
            <>
              <span aria-hidden className="mx-0.5 h-5 w-px bg-hairline" />
              <div className="flex items-center gap-0.5">
                {ACTIONS.map((a) => {
                  const Icon = a.icon
                  return (
                    <Tooltip key={a.key}>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label={a.label} onClick={() => setModal(a.key)} className="grid size-8 place-items-center rounded-full text-ink-500 transition-[transform,background-color,color] duration-150 hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Icon className="size-[17px] stroke-[1.5]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={10} className="bg-[var(--surface-frost-strong)] text-foreground shadow-[var(--shadow-e3)] backdrop-blur-xl">{a.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Hide bar" onClick={() => setHidden(true)} className="grid size-8 place-items-center rounded-full text-ink-400 transition-[transform,background-color,color] duration-150 hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

      <button onClick={() => setHidden(false)} aria-label="Show Mission Control AI" className={cn(
        "fixed bottom-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-t-2xl border border-b-0 border-hairline bg-[var(--surface-frost-strong)] px-3.5 py-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl",
        "transition-[transform,opacity] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
        hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[120%] opacity-0",
      )}>
        <span className="grid size-5 place-items-center text-foreground"><LogoMark size={16} className="text-foreground" /></span>
        <ChevronUp className="size-4 stroke-[1.75] text-ink-500" />
      </button>

      {/* quick-action modals */}
      {modal === "client" && <AddClientModal onClose={() => setModal(null)} />}
      {modal === "counsellor" && <AddCounsellorModal onClose={() => setModal(null)} />}
      {modal === "schedule" && <ScheduleSessionModal clients={scheduleClients} onClose={() => setModal(null)} />}
      {modal === "coupon" && <NewCouponModal onClose={() => setModal(null)} />}
      {modal === "refund" && <IssueRefundModal onClose={() => setModal(null)} />}
    </TooltipProvider>
  )
}
