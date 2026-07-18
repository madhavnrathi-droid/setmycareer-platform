import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChevronDown, ChevronUp } from "lucide-react"
import { gsap, prefersReducedMotion } from "@/lib/gsap"
import { buildKnowledge } from "@/lib/assistant-knowledge"
import { useCounsellorBrief } from "@/lib/counsellor-brief"
import { useAppearance } from "@/lib/appearance"
import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AskInput } from "./AskInput"
import { AnswerPanel } from "./AnswerPanel"
import { getActions, type CompassAction, type CompassContext } from "./registry"

/* CompassBar — the universal floating co-pilot bar.

   Blurred liquid-glass pill (no gradient fill, no circles around the icons),
   docked bottom-centre and draggable. ≤5 buttons: up to 4 contextual actions +
   a Hide that slides the bar off the bottom edge, leaving a peek tab to summon
   it back (GSAP). The Ask answer opens UPWARD; focusing it shows left-aligned
   quick prompts. Can be hidden entirely from Settings → Appearance. */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function routeToScreen(path: string): string {
  if (path === "/") return "dashboard"
  if (path.startsWith("/clients/")) return "client detail"
  if (path.startsWith("/clients")) return "clients"
  if (path.startsWith("/calendar")) return "calendar"
  if (path.startsWith("/reports")) return "reports"
  if (path.startsWith("/transcripts")) return "transcripts"
  if (path.startsWith("/methodology")) return "methodology"
  if (path.startsWith("/settings")) return "settings"
  return "console"
}

/* A contextual action — a clean monoline icon, NO circle (ghost hover only). */
function ActionButton({ action, ctx, onRun }: {
  action: CompassAction
  ctx: CompassContext
  onRun: (a: CompassAction) => void
}) {
  const Icon = action.icon
  const btn = (
    <button
      type="button"
      aria-label={action.label}
      className={cn(
        "relative grid size-9 place-items-center rounded-full text-ink-500",
        "transition-[transform,background-color,color] duration-150 hover:bg-secondary hover:text-foreground active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={action.popover ? undefined : () => onRun(action)}
    >
      <Icon className="size-[18px] stroke-[1.5]" />
      {typeof action.badge === "number" && action.badge > 0 && (
        <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-brand-500 px-0.5 text-[9px] font-medium leading-none tabular-nums text-white">
          {action.badge}
        </span>
      )}
    </button>
  )
  const tip = (
    <TooltipContent side="top" sideOffset={10} className="flex items-center gap-2 bg-[var(--surface-frost-strong)] text-foreground shadow-[var(--shadow-e3)] backdrop-blur-xl">
      <span>{action.label}</span>
      {action.shortcut && <kbd className="rounded bg-secondary px-1 py-px text-[10px] font-medium text-ink-500">{action.shortcut}</kbd>}
    </TooltipContent>
  )
  if (action.popover) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild><PopoverTrigger asChild>{btn}</PopoverTrigger></TooltipTrigger>
          {tip}
        </Tooltip>
        <PopoverContent side="top" align="center" sideOffset={12} className="w-56 rounded-2xl border-hairline bg-[var(--surface-frost-strong)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
          {action.popover(ctx)}
        </PopoverContent>
      </Popover>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      {tip}
    </Tooltip>
  )
}

export function CompassBar() {
  const loc = useLocation()
  const nav = useNavigate()
  const { compassVisible } = useAppearance()

  const [asking, setAsking] = useState(false)
  const [input, setInput] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [hidden, setHidden] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const draggedRef = useRef(false)

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })

  // the counsellor's LIVE account — real caseload + today's real sessions
  const { caseload, counselorName, today } = useCounsellorBrief()

  const screen = routeToScreen(loc.pathname)
  const { clientName, clientId } = useMemo(() => {
    const m = loc.pathname.match(/^\/clients\/([^/]+)/)
    const id = m?.[1]
    return { clientId: id, clientName: id ? caseload.find((c) => c.id === id)?.name : undefined }
  }, [loc.pathname, caseload])

  const aiContext = useMemo(() => ({ route: loc.pathname, screen, clientName, today }), [loc.pathname, screen, clientName, today])
  const registryCtx: CompassContext = useMemo(() => ({ route: loc.pathname, clientName, clientId }), [loc.pathname, clientName, clientId])
  const actions = useMemo(() => getActions(loc.pathname).slice(0, 4), [loc.pathname])
  const busy = status === "submitted" || status === "streaming"
  const showAnswer = !dismissed && (messages.length > 0 || busy)

  const quickPrompts = useMemo(() => {
    const first = clientName?.split(" ")[0]
    return [
      "Summarise my day",
      clientName ? `Start recording ${first}'s session` : "Start a new recording",
      clientName ? `What's the read on ${first}?` : "Show me a client",
      "What does the career index mean?",
    ]
  }, [clientName])

  const send = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setInput("")
    setDismissed(false)
    // build the LIVE brief: caseload roster + a deep dossier for the client in view
    // (or any named in the message) so "what's the read on X" is grounded, not mock.
    const { knowledge, primaryClient } = await buildKnowledge(t, { caseload, counselorName, focusClientId: clientId })
    sendMessage({ text: t }, { body: { context: { ...aiContext, knowledge, clientName: clientName ?? primaryClient } } })
  }, [busy, sendMessage, aiContext, caseload, counselorName, clientId, clientName])

  const openAsk = useCallback(() => { setAsking(true); requestAnimationFrame(() => inputRef.current?.focus()) }, [])
  const closeAll = useCallback(() => { setAsking(false); setExpanded(false); setDismissed(true); inputRef.current?.blur() }, [])
  const resetConversation = useCallback(() => { setMessages([]); setExpanded(false); setDismissed(false) }, [setMessages])
  const runAction = useCallback((a: CompassAction) => { a.run?.(nav, registryCtx) }, [nav, registryCtx])

  const hide = useCallback(() => setHidden(true), [])
  const showBar = useCallback(() => setHidden(false), [])

  // drag-to-move (threshold; clamp to viewport; suppress the trailing click)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    draggedRef.current = false
    const move = (ev: PointerEvent) => {
      if (!draggedRef.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      draggedRef.current = true
      setPos({
        x: clamp(rect.left + (ev.clientX - sx), 8, window.innerWidth - rect.width - 8),
        y: clamp(rect.top + (ev.clientY - sy), 8, window.innerHeight - rect.height - 8),
      })
    }
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up) }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }, [])
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (draggedRef.current) { e.preventDefault(); e.stopPropagation(); draggedRef.current = false }
  }, [])

  // contextual buttons cross-fade on route change
  useLayoutEffect(() => {
    const el = actionsRef.current
    if (!el || prefersReducedMotion()) return
    const t = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power2.out" })
    return () => { t.kill() }
  }, [loc.pathname])

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

  // the full-screen Assistant tab is the same agent — don't double up on /assistant
  if (!compassVisible || loc.pathname === "/assistant") return null

  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { left: "50%", bottom: 32, transform: "translateX(-50%)" }

  return (
    <TooltipProvider delayDuration={250}>
      <div ref={barRef} role="toolbar" aria-label="Compass" className="fixed z-50" style={positionStyle}>
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
          />
        )}

        {/* quick prompts — left-aligned to the input's edge */}
        {!hidden && asking && !showAnswer && (
          <div className="absolute bottom-full left-0 mb-3 flex w-max max-w-[92vw] flex-col gap-1.5 rounded-2xl border border-hairline bg-[var(--surface-frost-strong)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <span className="px-1.5 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Try asking</span>
            {quickPrompts.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-xl px-3 py-1.5 text-left text-[13px] text-ink-600 transition-colors hover:bg-secondary hover:text-foreground">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* liquid-glass pill */}
        <div
          ref={pillRef}
          onPointerDown={onPointerDown}
          onClickCapture={onClickCapture}
          className={cn(
            "flex cursor-grab items-center gap-1 rounded-full border border-hairline px-1.5 py-1.5 active:cursor-grabbing",
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
          />

          {!asking && (
            <>
              <span aria-hidden className="mx-0.5 h-5 w-px bg-hairline" />
              <div ref={actionsRef} className="flex items-center gap-0.5">
                {actions.map((a) => (
                  <ActionButton key={a.id} action={a} ctx={registryCtx} onRun={runAction} />
                ))}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Hide bar"
                      onClick={hide}
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

      {/* peek tab — slides up from the bottom edge when the bar is hidden */}
      <button
        onClick={showBar}
        aria-label="Show Compass"
        className={cn(
          "fixed bottom-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-t-2xl border border-b-0 border-hairline bg-[var(--surface-frost-strong)] px-3.5 py-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl",
          "transition-[transform,opacity] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[120%] opacity-0",
        )}
      >
        <span className="grid size-5 place-items-center rounded-full bg-foreground text-white">
          <LogoMark size={11} className="text-white" />
        </span>
        <ChevronUp className="size-4 stroke-[1.75] text-ink-500" />
      </button>
    </TooltipProvider>
  )
}
