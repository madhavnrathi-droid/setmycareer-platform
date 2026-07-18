import { useEffect, useLayoutEffect, useRef } from "react"
import type { UIMessage } from "ai"
import { Maximize2, Minimize2, RefreshCw, X } from "lucide-react"
import { gsap, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/brand/Logo"
import { MessageParts } from "@/components/assistant/MessageParts"

/* The answer surface for the Compass Bar. It opens UPWARD — anchored above the
   bar (bottom:100%) as a frosted card that grows with a gentle spring
   (y + scale + opacity). It hosts the streamed answer and any generative-UI
   cards (navigate / client / schedule / explain), is multi-turn, has a
   new-conversation reset, and an expand affordance that promotes it to a larger
   centered reading panel. */

type Status = "submitted" | "streaming" | "ready" | "error"

type AnswerPanelProps = {
  messages: UIMessage[]
  status: Status
  error?: Error
  /** Promote to a larger centered reading panel. */
  expanded: boolean
  onToggleExpand: () => void
  /** Clear the conversation. */
  onReset: () => void
  /** Dismiss the whole answer surface. */
  onClose: () => void
  /** Re-ask (retry / suggestion taps). */
  onSend: (text: string) => void
  /** Route a member card's action (book_session, view_report, top_up, …). */
  onCardAction?: (action: string, detail?: string) => void
  /** Brand label shown in the card header (defaults to "Compass"). */
  label?: string
}

export function AnswerPanel({
  messages, status, error, expanded, onToggleExpand, onReset, onClose, onSend, onCardAction, label = "Compass",
}: AnswerPanelProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // spring entrance — y + scale + opacity (SPEC §2.3). Reduced-motion: end-state.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el || prefersReducedMotion()) return
    const tween = gsap.fromTo(
      el,
      { y: 8, scale: 0.98, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.4)" },
    )
    return () => { tween.kill() }
  }, [expanded])

  // keep pinned to the newest turn as it streams
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  if (messages.length === 0 && status === "ready") return null

  return (
    <div
      ref={cardRef}
      role="log"
      aria-live="polite"
      aria-label={`${label} answer`}
      className={cn(
        // the Compass signature gradient hairline — the AI surface's one owned
        // identity, applied to its answer window (rationed, per craft R1)
        "compass-gradient-ring",
        "absolute bottom-full left-1/2 mb-3 -translate-x-1/2 origin-bottom",
        "overflow-hidden rounded-3xl shadow-[var(--shadow-float)]",
        "bg-[var(--surface-frost-strong)] backdrop-blur-xl",
        expanded ? "h-[min(70svh,560px)] w-[min(92vw,720px)]" : "max-h-[min(56svh,480px)] w-[min(92vw,560px)]",
        "flex flex-col",
      )}
    >
      {/* header — Compass avatar + controls */}
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="compass-gradient-ring grid size-6 place-items-center rounded-full bg-card">
          <LogoMark size={13} className="text-foreground" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
          {label}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={onReset}
              aria-label="New conversation"
              title="New conversation"
              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="size-3.5 stroke-[1.5]" />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse answer" : "Expand answer"}
            title={expanded ? "Collapse" : "Expand"}
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? <Minimize2 className="size-3.5 stroke-[1.5]" /> : <Maximize2 className="size-3.5 stroke-[1.5]" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Dismiss answer"
            title="Dismiss"
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* conversation — overscroll-contain keeps a wheel/trackpad gesture INSIDE
          the panel instead of leaking to the page beneath it (the "alternating
          scroll" bug) */}
      <div
        ref={scrollRef}
        className={cn("flex-1 overflow-y-auto overscroll-contain px-4 py-4", expanded && "mx-auto w-full max-w-2xl")}
      >
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[88%] text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-background"
                    : "text-foreground",
                )}
              >
                <MessageParts m={m} onAct={onClose} onCardAction={onCardAction} onReply={onSend} />
              </div>
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-1.5 text-muted-foreground" aria-label="Thinking">
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-300" />
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl bg-warn-100 px-3 py-2 text-[12px] text-warn-600">
              {error?.message || "That didn't go through — try again in a moment."}{" "}
              <button onClick={() => onSend("Please try again.")} className="font-medium underline">
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
