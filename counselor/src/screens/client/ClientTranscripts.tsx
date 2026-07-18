import { Link } from "react-router-dom"
import { FileText, CheckCircle2, ArrowUpRight, Video } from "lucide-react"
import type { Client, Platform } from "@/lib/types"
import { clientSessions } from "@/lib/mock"
import { useGsap, revealChildren } from "@/lib/gsap"

const PLATFORM: Record<Platform, string> = {
  livekit: "LiveKit",
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Teams",
  in_person: "In person",
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

/** Deterministic faux word-count from the session id, so the demo reads as real. */
const wordCount = (id: string, durationMin: number) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return durationMin * 130 + (h % 400)
}

export function ClientTranscripts({ client }: { client: Client }) {
  const list = clientSessions(client.id).filter((s) => s.hasTranscript)
  const ref = useGsap((s) => revealChildren(s), [client.id])
  const base = `/clients/${client.id}`

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <header data-reveal className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Transcripts</p>
          <h2 className="mt-1.5 font-display text-[clamp(20px,2.4vw,26px)] font-extralight tracking-tight">
            Reviewable sessions
          </h2>
        </div>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {list.length} {list.length === 1 ? "transcript" : "transcripts"}
        </span>
      </header>

      {list.length === 0 ? (
        <div
          data-reveal
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"
        >
          <FileText className="size-6 stroke-[1.25] text-ink-300" />
          <div>
            <div className="text-[14px] font-medium">No transcripts yet</div>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-muted-foreground">
              Transcripts appear here once a recorded session finishes processing.
            </p>
          </div>
          <Link
            to={`${base}/sessions`}
            className="mt-1 inline-flex h-9 items-center rounded-md border border-border bg-background px-3.5 text-[13px] font-medium transition-colors hover:border-ink-300"
          >
            View sessions
          </Link>
        </div>
      ) : (
        <section data-reveal className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 border-b border-border px-5 py-3 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300 md:grid">
            <span>Session</span>
            <span className="text-right">Duration</span>
            <span className="text-right">Words</span>
            <span>Pipeline</span>
            <span className="sr-only">Open</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {list.map((s) => (
              <Link
                key={s.id}
                to={`${base}/transcripts/${s.id}`}
                className="group grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary md:grid-cols-[1fr_auto_auto_auto_auto] md:gap-6 md:py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700">
                    <FileText className="size-4 stroke-[1.5]" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium">{fmtDate(s.date)}</div>
                    <div className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                      <Video className="size-3 stroke-[1.5]" /> {PLATFORM[s.platform]}
                    </div>
                  </div>
                </div>

                <div className="text-[13px] tabular-nums text-ink-600 md:text-right">
                  <span className="text-ink-300 md:hidden">Duration · </span>
                  {s.durationMin} min
                </div>

                <div className="text-[13px] tabular-nums text-ink-600 md:text-right">
                  <span className="text-ink-300 md:hidden">Words · </span>
                  {wordCount(s.id, s.durationMin).toLocaleString()}
                </div>

                <div className="flex items-center gap-1.5 text-[12px] font-medium text-well-600">
                  <CheckCircle2 className="size-3.5 stroke-[1.75]" />
                  Pipeline complete
                </div>

                <ArrowUpRight className="hidden size-4 shrink-0 stroke-[1.5] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100 md:block" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
