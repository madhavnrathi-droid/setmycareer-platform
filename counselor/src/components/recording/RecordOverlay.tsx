import { useEffect, useLayoutEffect, useRef } from "react"
import {
  ChevronDown, Pause, Play, Square, MicOff, Sparkles, UserRound,
} from "lucide-react"
import { useCaseloadClients } from "@/lib/caseload"
import { useRecording, formatElapsed } from "@/lib/recording"
import { gsap, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Waveform } from "./Waveform"
import { LogSessionDialog } from "./LogSessionDialog"

/* Full-screen recording overlay (SPEC #2). Rendered by the provider's host (NOT
   a route) so recording state survives navigation. Frosted, calm, Apple-grade:
   a large live waveform, a font-display elapsed timer, the client (or an assign
   picker), a streaming transcript, and the controls (Pause/Resume · Stop & log ·
   Minimize). Esc minimizes. Also hosts the log-session dialog after Stop. */
export function RecordOverlay() {
  const rec = useRecording()
  const {
    status, expanded, levels, elapsedMs, clientId, clientName, micAvailable,
    transcriptLines, interim, pendingDraft,
  } = rec

  const showOverlay = status !== "idle" && expanded
  const paused = status === "paused"

  const panelRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Esc minimizes (keeps recording) — SPEC: "Esc minimizes."
  useEffect(() => {
    if (!showOverlay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); rec.minimize() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showOverlay, rec])

  // enter animation (rise + fade); reduced-motion → instant
  useLayoutEffect(() => {
    if (!showOverlay) return
    const el = panelRef.current
    if (!el || prefersReducedMotion()) return
    const tween = gsap.from(el, { y: 24, opacity: 0, scale: 0.985, duration: 0.45, ease: "power3.out" })
    return () => { tween.kill() }
  }, [showOverlay])

  // keep the transcript pinned to the latest line
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" })
  }, [transcriptLines.length, interim])

  return (
    <>
      {showOverlay && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface-frost-strong)] backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Session recording"
        >
          <div ref={panelRef} className="mx-auto flex h-full w-full max-w-[1180px] flex-col px-6 py-6 sm:px-10 sm:py-8">
            {/* top row — status + minimize */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-2.5">
                  {!paused && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-risk-500 opacity-60" />
                  )}
                  <span className={cn("relative inline-flex size-2.5 rounded-full", paused ? "bg-warn-600" : "bg-risk-500")} />
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
                  {paused ? "Paused" : "Recording"}
                </span>
                {rec.source === "meeting" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-medium text-brand-600">
                    <Sparkles className="size-3 stroke-[1.75]" /> Meeting bot
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={rec.minimize}
                aria-label="Minimize recording"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] text-ink-600 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown className="size-4 stroke-[1.5]" /> Minimize
              </button>
            </div>

            {/* center — timer + waveform + client */}
            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
              <ClientLabel clientId={clientId} clientName={clientName} onAssign={(id, name) => rec.assignClient(id, name)} />

              <div className="flex flex-col items-center gap-1.5">
                <div className="font-display text-[clamp(56px,12vw,120px)] font-extralight leading-none tracking-tight tabular-nums text-foreground">
                  {formatElapsed(elapsedMs)}
                </div>
                {!micAvailable && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <MicOff className="size-3.5 stroke-[1.5]" /> Microphone unavailable — simulated
                  </span>
                )}
              </div>

              <div className="h-28 w-full max-w-[680px] text-brand-500 sm:h-32">
                <Waveform levels={levels} paused={paused} />
              </div>
            </div>

            {/* live transcript */}
            <div className="mx-auto w-full max-w-[680px]">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-300">
                Transcript {rec.source === "meeting" ? "· bot" : ""}
              </p>
              <div
                ref={transcriptRef}
                className="flex max-h-40 flex-col gap-2.5 overflow-y-auto rounded-2xl bg-card/70 p-4 shadow-[var(--shadow-e2)] [scrollbar-width:thin]"
                aria-live="polite"
              >
                {transcriptLines.length === 0 && !interim ? (
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Listening… live transcript appears here as you speak. The full, accurate transcript is also generated from the audio when you stop.
                  </p>
                ) : (
                  <>
                    {transcriptLines.map((l, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        {l.speaker && (
                          <span className={cn(
                            "text-[10px] font-medium uppercase tracking-[0.1em]",
                            l.speaker === "Dr. Lin" ? "text-brand-600" : "text-ink-500",
                          )}>
                            {l.speaker}
                          </span>
                        )}
                        <span className="text-[13px] leading-relaxed text-foreground">{l.text}</span>
                      </div>
                    ))}
                    {interim && (
                      <span className="text-[13px] leading-relaxed text-ink-400">{interim}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* controls */}
            <div className="mt-7 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-full border-hairline bg-card/60 px-5 text-[13px] backdrop-blur"
                onClick={() => (paused ? rec.resume() : rec.pause())}
              >
                {paused ? <Play className="size-4 stroke-[1.75]" /> : <Pause className="size-4 stroke-[1.75]" />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button
                className="h-11 gap-2 rounded-full bg-risk-500 px-6 text-[13px] text-white hover:bg-risk-600"
                onClick={() => rec.stop()}
              >
                <Square className="size-4 fill-current stroke-[1.75]" /> Stop &amp; log
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* the log step appears once a recording is stopped (draft pending) */}
      <LogSessionDialog
        draft={pendingDraft}
        open={pendingDraft != null}
        onResolved={rec.clearPendingDraft}
      />
    </>
  )
}

function ClientLabel({
  clientId, clientName, onAssign,
}: {
  clientId?: string
  clientName?: string
  onAssign: (id: string, name?: string) => void
}) {
  const { clients } = useCaseloadClients()
  if (clientName) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-ink-100 text-[12px] font-medium text-ink-700">
          {clientName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </span>
        <span className="text-[15px] font-medium text-foreground">{clientName}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-full bg-secondary text-ink-300">
        <UserRound className="size-4 stroke-[1.5]" />
      </span>
      <Select
        value={clientId ?? ""}
        onValueChange={(v) => onAssign(v, clients.find((c) => c.id === v)?.name)}
      >
        <SelectTrigger
          aria-label="Assign to client"
          className="h-9 rounded-full border-hairline bg-card/60 px-4 text-[13px] backdrop-blur"
        >
          <SelectValue placeholder="Assign to client…" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-[13px]">{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
