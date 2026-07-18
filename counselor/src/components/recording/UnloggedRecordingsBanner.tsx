import { Mic, X } from "lucide-react"
import { removeUnlogged } from "@/lib/mock"
import { useUnloggedRecordings } from "@/lib/stores"
import { useRecording, formatElapsed } from "@/lib/recording"
import { Button } from "@/components/ui/button"

/* Surfaces "log later" recordings (SPEC #4) — a calm banner on the Dashboard.
   Each parked recording can be logged now (re-opens the log-session dialog via
   the recording context) or dismissed. Renders nothing when the pile is empty
   (Rams: unobtrusive). */
export function UnloggedRecordingsBanner() {
  const rec = useRecording()
  const unlogged = useUnloggedRecordings()

  if (unlogged.length === 0) return null

  return (
    <section
      data-reveal
      className="mb-6 rounded-2xl bg-card p-4 shadow-[var(--shadow-e2)]"
      aria-label="Unlogged recordings"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-warn-100 text-warn-600">
          <Mic className="size-4 stroke-[1.5]" />
        </span>
        <div>
          <p className="text-[13px] font-medium">
            <span className="tabular-nums">{unlogged.length}</span>{" "}
            unlogged recording{unlogged.length > 1 ? "s" : ""}
          </p>
          <p className="text-[12px] text-muted-foreground">Recorded but not yet assigned to a client.</p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {unlogged.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="font-display text-[15px] font-light tabular-nums text-foreground">
              {formatElapsed(u.durationMin * 60000)}
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-[12px] text-muted-foreground sm:block">
              {u.transcript.find((l) => l.speaker !== "Dr. Lin")?.text ?? "Recorded session"}
            </span>
            <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">
              {new Date(u.startedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                rec.setPendingDraftFromMeeting(u)
                removeUnlogged(u.id)
              }}
            >
              Log
            </Button>
            <button
              type="button"
              aria-label="Dismiss recording"
              className="grid size-7 place-items-center rounded-full text-ink-300 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => removeUnlogged(u.id)}
            >
              <X className="size-4 stroke-[1.5]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
