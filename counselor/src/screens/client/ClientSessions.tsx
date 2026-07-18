import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Video, FileText, ScrollText, CalendarX2, ChevronRight } from "lucide-react"
import type { Client, Session } from "@/lib/types"
import { useClientSessions } from "@/lib/stores"
import { mergeSessions } from "@/lib/mock"
import { fetchClientSessions } from "@/lib/persist"
import { DeltaPill } from "@/components/custom/DeltaPill"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const PLATFORM: Record<string, string> = {
  google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", in_person: "In person",
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

/* TimelineFlow hero — the arc of sessions, oldest → newest, as a thin connected
   spine. Each node carries the index delta (semantic) and attendance state. */
function TimelineFlow({ sessions }: { sessions: Session[] }) {
  const ordered = [...sessions].sort((a, b) => +new Date(a.date) - +new Date(b.date))
  return (
    <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Session arc</p>
      <h2 className="mt-1.5 font-display text-[clamp(20px,2.6vw,26px)] font-extralight tracking-tight">
        <span className="tabular-nums">{ordered.length}</span> sessions over the relationship
      </h2>

      <div className="mt-7 flex items-stretch gap-0 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ordered.map((s, i) => {
          const last = i === ordered.length - 1
          const attended = s.attended
          return (
            <div key={s.id} className="flex min-w-[132px] flex-1 flex-col">
              {/* spine row */}
              <div className="flex items-center">
                <span
                  className={cn(
                    "z-10 grid size-3.5 shrink-0 place-items-center rounded-full ring-4 ring-card",
                    attended ? "bg-foreground" : "bg-ink-200",
                  )}
                >
                  {!attended && <span className="size-1.5 rounded-full bg-card" />}
                </span>
                {!last && <span className="h-px flex-1 bg-border" />}
              </div>
              {/* node body */}
              <Link
                to={`../sessions/${s.id}`}
                className="group mt-3 mr-3 flex flex-col gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-secondary"
              >
                <div className="text-[12px] font-medium tabular-nums">{fmtDate(s.date)}</div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[20px] font-extralight tabular-nums">
                    {attended ? `${s.durationMin}m` : "—"}
                  </span>
                  {s.indexDelta != null && <DeltaPill value={s.indexDelta} />}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {attended ? (
                    <>
                      <Video className="size-3 stroke-[1.5]" /> {PLATFORM[s.platform]}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-risk-600">
                      <CalendarX2 className="size-3 stroke-[1.5]" /> No-show
                    </span>
                  )}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ClientSessions({ client }: { client: Client }) {
  const sessions = useClientSessions(client.id)
  const ref = useGsap((s) => revealChildren(s), [client.id])
  const ordered = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date))

  // Hydrate from the cloud so sessions logged in a previous visit reappear after a
  // reload. Fully graceful: any fetch failure silently keeps the local store.
  // mergeSessions dedupes by id and emits, so useClientSessions re-renders.
  useEffect(() => {
    let cancelled = false
    fetchClientSessions(client.id).then((remote) => {
      if (!cancelled) mergeSessions(remote)
    })
    return () => {
      cancelled = true
    }
  }, [client.id])

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {sessions.length > 0 && <TimelineFlow sessions={sessions} />}

      <section data-reveal>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
          All sessions · newest first
        </p>

        {ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <ScrollText className="size-6 stroke-[1.25] text-ink-300" />
            <div className="text-[13.5px] font-medium">No sessions yet</div>
            <p className="max-w-xs text-[12.5px] text-muted-foreground">
              Sessions appear here once {client.name.split(" ")[0]} has met with you.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-e2)]">
            <div className="flex flex-col divide-y divide-border">
              {ordered.map((s) => (
                <Link
                  key={s.id}
                  to={`../sessions/${s.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary"
                >
                  <div className="w-24 shrink-0">
                    <div className="text-[13px] font-medium tabular-nums">{fmtDate(s.date)}</div>
                    <div className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">
                      {s.attended ? `${s.durationMin} min` : "—"}
                    </div>
                  </div>

                  <span className="hidden w-28 shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex">
                    <Video className="size-3.5 stroke-[1.5]" /> {PLATFORM[s.platform]}
                  </span>

                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 text-[11.5px]",
                      s.attended ? "text-muted-foreground" : "text-risk-600",
                    )}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", s.attended ? "bg-well-600" : "bg-risk-500")}
                    />
                    {s.attended ? "Attended" : "No-show"}
                  </span>

                  <div className="hidden min-w-0 flex-1 lg:block">
                    {s.summary && (
                      <p className="truncate text-[12.5px] text-ink-600">{s.summary}</p>
                    )}
                    {s.snippet && (
                      <p className="mt-0.5 truncate text-[11.5px] italic text-muted-foreground">
                        “{s.snippet}”
                      </p>
                    )}
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    {s.indexDelta != null && <DeltaPill value={s.indexDelta} />}
                    <span className="flex items-center gap-1.5">
                      {s.hasTranscript && (
                        <span
                          title="Has transcript"
                          aria-label="Has transcript"
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-medium text-ink-600"
                        >
                          <ScrollText className="size-3 stroke-[1.5]" /> Transcript
                        </span>
                      )}
                      {s.hasReport && (
                        <span
                          title="Has report"
                          aria-label="Has report"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-medium text-brand-600"
                        >
                          <FileText className="size-3 stroke-[1.5]" /> Report
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-ink-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
