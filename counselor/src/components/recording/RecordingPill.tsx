import { Square } from "lucide-react"
import { useRecording, formatElapsed } from "@/lib/recording"
import { cn } from "@/lib/utils"
import { Waveform } from "./Waveform"

/* The top-right recording indicator (SPEC #3) — shown where the "New session"
   button was, while a recording is in progress. A compact live waveform + a red
   dot + the elapsed timer; clicking the body re-opens the full-screen overlay.
   A tiny inline stop control ends + logs the recording. */
export function RecordingPill() {
  const rec = useRecording()
  const paused = rec.status === "paused"

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-hairline py-1 pl-2.5 pr-1",
        "bg-[var(--surface-frost-strong)] shadow-[var(--shadow-e2)] backdrop-blur",
      )}
    >
      <button
        type="button"
        onClick={rec.openFullscreen}
        aria-label="Open recording"
        className="flex items-center gap-2 rounded-full pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative flex size-2">
          {!paused && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-risk-500 opacity-70" />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", paused ? "bg-warn-600" : "bg-risk-500")} />
        </span>

        <span className="h-4 w-10 text-brand-500">
          <Waveform levels={rec.levels} bars={9} paused={paused} />
        </span>

        <span className="font-display text-[13px] font-light tabular-nums text-foreground">
          {formatElapsed(rec.elapsedMs)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => rec.stop()}
        aria-label="Stop and log recording"
        title="Stop & log"
        className="grid size-7 place-items-center rounded-full text-risk-600 transition-colors hover:bg-risk-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Square className="size-3.5 fill-current stroke-[1.75]" />
      </button>
    </div>
  )
}
