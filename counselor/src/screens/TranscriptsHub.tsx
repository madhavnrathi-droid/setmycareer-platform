import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, FileText, Clock, CheckCircle2, ArrowUpRight, Video } from "lucide-react"
import { sessions, getClient } from "@/lib/mock"
import type { Platform } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const PLATFORM: Record<Platform, string> = { livekit: "LiveKit", google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", in_person: "In person" }
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

type State = "reviewed" | "awaiting"
const STATE_LABEL: Record<State, string> = { reviewed: "Reviewed", awaiting: "Awaiting review" }
const STATE_TONE: Record<State, string> = { reviewed: "text-well-600", awaiting: "text-brand-600" }

const FILTERS: { key: string; label: string; match: (s: State) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "awaiting", label: "Awaiting review", match: (s) => s === "awaiting" },
  { key: "reviewed", label: "Reviewed", match: (s) => s === "reviewed" },
]

// a transcript is "awaiting review" when the session has a transcript but no report yet
const stateOf = (hasReport: boolean): State => (hasReport ? "reviewed" : "awaiting")

export function TranscriptsHub() {
  const [f, setF] = useState("all")
  const [q, setQ] = useState("")
  const ref = useGsap((s) => revealChildren(s), [f, q])
  const filter = FILTERS.find((x) => x.key === f)!

  const rows = sessions
    .filter((s) => s.hasTranscript)
    .map((s) => {
      const client = getClient(s.clientId)
      return { session: s, client, state: stateOf(s.hasReport) }
    })
    .filter((r) => filter.match(r.state))
    .filter((r) => `${r.client?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.session.date < b.session.date ? 1 : -1))

  return (
    <div ref={ref}>
      <header data-reveal className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Session intelligence</p>
        <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Transcripts</h1>
      </header>

      <div data-reveal className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 stroke-[1.5] text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by client" className="h-9 w-64 pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((x) => (
            <button
              key={x.key}
              onClick={() => setF(x.key)}
              className={cn(
                "rounded-full px-3 h-8 text-[12.5px] transition-colors",
                f === x.key ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">{rows.length} transcripts</span>
      </div>

      {rows.length === 0 ? (
        <div data-reveal className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-border bg-card">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-border bg-background">
              <FileText className="size-5 stroke-[1.25] text-ink-300" />
            </div>
            <h2 className="font-display text-[20px] font-light tracking-tight">No transcripts</h2>
            <p className="max-w-xs text-[13px] text-muted-foreground">Transcripts appear here once a recorded session is processed.</p>
          </div>
        </div>
      ) : (
        <div data-reveal className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 border-b border-border px-5 py-3 md:grid">
            {["Client", "Date", "Platform", "State", ""].map((h, i) => (
              <div key={i} className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-border">
            {rows.map(({ session: s, client, state }) => (
              <Link
                key={s.id}
                to={`/clients/${s.clientId}/transcripts/${s.id}`}
                className="group grid grid-cols-1 items-center gap-x-6 gap-y-2 px-5 py-3.5 transition-colors hover:bg-secondary md:grid-cols-[1fr_auto_auto_auto_auto]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-700">
                    {client?.initials ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium">{client?.name ?? "Unknown client"}</div>
                    <div className="truncate text-[12px] text-muted-foreground">{s.summary ?? "Session transcript"}</div>
                  </div>
                </div>
                <span className="text-[12.5px] tabular-nums text-muted-foreground md:w-28">{fmtDate(s.date)}</span>
                <span className="inline-flex w-fit items-center gap-1.5 text-[12px] text-ink-600 md:w-32">
                  <Video className="size-3.5 stroke-[1.5] text-ink-300" /> {PLATFORM[s.platform]}
                </span>
                <span className={cn("inline-flex w-fit items-center gap-1.5 text-[11.5px] font-medium md:w-36", STATE_TONE[state])}>
                  {state === "reviewed" ? <CheckCircle2 className="size-3.5 stroke-[1.5]" /> : <Clock className="size-3.5 stroke-[1.5]" />}
                  {STATE_LABEL[state]}
                </span>
                <ArrowUpRight className="hidden size-4 shrink-0 stroke-[1.5] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100 md:block md:justify-self-end" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
