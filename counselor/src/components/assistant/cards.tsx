import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutGrid, Users, CalendarDays, FileText, AudioLines, BookOpen, Settings,
  ArrowRight, CalendarPlus, Check, X, Info, UserSearch, Mic,
} from "lucide-react"
import { toast } from "sonner"
import { clients } from "@/lib/mock"
import { addCalendarEvent } from "@/lib/calendar-store"
import { EXPLAINERS } from "@/components/custom/MetricInfo"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { cn } from "@/lib/utils"

/* The cards the Compass assistant renders in place of prose. Each is driven by a
   tool's input (the model decides which to emit); the counselor takes the real
   action here, so anything with a side-effect asks for an explicit confirm. */

const SCREENS: Record<string, { to: string; label: string; icon: React.ElementType }> = {
  dashboard: { to: "/", label: "Dashboard", icon: LayoutGrid },
  clients: { to: "/clients", label: "Clients", icon: Users },
  calendar: { to: "/calendar", label: "Calendar", icon: CalendarDays },
  reports: { to: "/reports", label: "Reports", icon: FileText },
  transcripts: { to: "/transcripts", label: "Transcripts", icon: AudioLines },
  methodology: { to: "/methodology", label: "Methodology", icon: BookOpen },
  settings: { to: "/settings", label: "Settings", icon: Settings },
}

const METRIC_KEY: Record<string, string> = {
  career_index: "cx.career_index",
  market_readiness: "pc.market_readiness",
  wellbeing: "wellbeing",
  life_performance: "cx.bloom_index",
  contradiction: "contradiction",
}

/* Co-pilot action: actually start the live recorder (fires the same events the
   registry uses, which RecordingProvider listens for). Resolves a named client. */
export function RecordCard({ clientName, onAct }: { clientName?: string; onAct?: () => void }) {
  const q = (clientName ?? "").toLowerCase().trim()
  const client = q
    ? clients.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(" ")[0]))
    : undefined
  const start = () => {
    if (client) {
      window.dispatchEvent(new CustomEvent("compass:record-session", { detail: { clientId: client.id, clientName: client.name } }))
    } else {
      window.dispatchEvent(new CustomEvent("compass:new-session"))
    }
    onAct?.()
  }
  return (
    <div className="mt-1.5 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <Mic className="size-[18px] stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Record a session{client ? ` · ${client.name}` : ""}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">Starts the live recorder and transcribes it.</div>
        </div>
        <button
          onClick={start}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
        >
          <Mic className="size-3.5 stroke-[2]" /> Start
        </button>
      </div>
    </div>
  )
}

export function NavigateCard({ screen, reason, onAct }: { screen: string; reason?: string; onAct?: () => void }) {
  const nav = useNavigate()
  const s = SCREENS[screen] ?? SCREENS.dashboard
  const Icon = s.icon
  return (
    <div className="mt-1.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <Icon className="size-[18px] stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Open {s.label}</div>
          {reason && <div className="truncate text-[11.5px] text-muted-foreground">{reason}</div>}
        </div>
        <button
          onClick={() => { nav(s.to); onAct?.() }}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Go <ArrowRight className="size-3.5 stroke-[2]" />
        </button>
      </div>
    </div>
  )
}

export function ClientCard({ name, onAct }: { name: string; onAct?: () => void }) {
  const nav = useNavigate()
  const q = (name ?? "").toLowerCase().trim()
  const client = clients.find(
    (c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(" ")[0]),
  )

  if (!client) {
    return (
      <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <UserSearch className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
        <div className="flex-1 text-[12.5px] text-muted-foreground">
          No client matches “{name}”.
        </div>
        <button onClick={() => { nav("/clients"); onAct?.() }} className="text-[12px] font-medium text-brand-600 hover:underline">
          Browse
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1.5 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <ScoreRing value={client.careerIndex ?? null} size={48} stroke={4} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-foreground">{client.name}</span>
            {(client.riskFlag === "moderate" || client.riskFlag === "high") && (
              <span className="size-1.5 rounded-full bg-risk-500" aria-label="risk flag" />
            )}
          </div>
          <div className="truncate text-[11.5px] text-muted-foreground">{client.headline}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className="text-muted-foreground">Career <b className="font-medium tabular-nums text-foreground">{client.careerIndex ?? "—"}</b></span>
            <span className="text-muted-foreground">Wellbeing <b className="font-medium text-mind-600">{client.wellbeingBand ?? "—"}</b></span>
            <span className="text-muted-foreground">{client.sessionCount} sessions</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => { nav(`/clients/${client.id}`); onAct?.() }}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-border text-[12px] font-medium text-foreground transition-colors hover:bg-secondary"
      >
        Open client hub <ArrowRight className="size-3.5 stroke-[1.75]" />
      </button>
    </div>
  )
}

export function ScheduleCard({ clientName, when, note }: { clientName: string; when: string; note?: string }) {
  const [state, setState] = useState<"pending" | "done" | "cancelled">("pending")
  const nav = useNavigate()
  // Confirm books for REAL: an exact time becomes a calendar event; a fuzzy one
  // hands off to the scheduler instead of faking success.
  const confirm = () => {
    const t = Date.parse(when)
    if (Number.isFinite(t) && t > Date.now() - 60_000) {
      addCalendarEvent({
        id: `appt_ai_${Date.now().toString(36)}`,
        clientId: clients.find((c) => c.name === clientName)?.id ?? "",
        clientName,
        title: "Counselling session",
        scheduledAt: new Date(t).toISOString(),
        durationMin: 60,
        platform: "livekit",
        status: "scheduled",
      })
      setState("done")
      toast.success(`Session booked — ${clientName}, ${when}. It's on your calendar.`)
    } else {
      toast(`Couldn't read "${when}" as an exact slot — pick the time in the scheduler.`)
      nav("/calendar")
    }
  }

  if (state === "done") {
    return (
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-well-500/40 bg-well-100 p-3 text-[12.5px] text-well-600">
        <Check className="size-4 stroke-[1.75]" /> Session with {clientName} booked for {when}.
      </div>
    )
  }
  if (state === "cancelled") {
    return (
      <div className="mt-1.5 rounded-xl border border-border bg-card p-3 text-[12.5px] text-muted-foreground">
        Scheduling cancelled.
      </div>
    )
  }
  return (
    <div className="mt-1.5 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <CalendarPlus className="size-4 stroke-[1.5] text-foreground" />
        <div className="text-[13px] font-medium text-foreground">Schedule a session</div>
      </div>
      <div className="mt-2 text-[12.5px] text-ink-600">
        <b className="font-medium text-foreground">{clientName}</b> · {when}
      </div>
      {note && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{note}</div>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={confirm}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-foreground text-[12px] font-medium text-background hover:opacity-90"
        >
          <Check className="size-3.5 stroke-[2]" /> Confirm
        </button>
        <button
          onClick={() => setState("cancelled")}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary"
        >
          <X className="size-3.5 stroke-[2]" /> Cancel
        </button>
      </div>
    </div>
  )
}

export function ExplainCard({ metric }: { metric: string }) {
  const e = EXPLAINERS[METRIC_KEY[metric] ?? metric]
  if (!e) return null
  return (
    <div className="mt-1.5 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <Info className="size-4 stroke-[1.5] text-brand-600" />
        <div className="text-[13px] font-medium text-foreground">{e.title}</div>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{e.blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {e.steps.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className={cn(
              "rounded-md border px-2 py-1 text-[10.5px]",
              i === e.steps.length - 1 ? "border-brand-500/40 bg-brand-100 text-brand-600" : "border-border bg-secondary text-ink-600",
            )}>{s}</span>
            {i < e.steps.length - 1 && <span className="text-ink-300" aria-hidden>→</span>}
          </span>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-ink-500">Conceptual flow only — exact weighting isn't shown.</p>
    </div>
  )
}
