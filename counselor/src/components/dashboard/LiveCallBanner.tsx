import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Video, CalendarClock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { appointments } from "@/lib/mock"
import type { Appointment } from "@/lib/types"
import { cn } from "@/lib/utils"

/* Live / upcoming-call banner — sits under the dashboard header so the counselor
   never misses a session. Meet/Zoom "your meeting is starting" energy + a
   delivery-tracker countdown. Ticks every second; flips to "Live now" in-window.
   Time-of-day is mapped onto the real clock so the countdown stays meaningful. */

const PLATFORM_LABEL: Record<string, string> = {
  google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", in_person: "In person",
}

const today = appointments
  .filter((a) => a.scheduledAt.startsWith("2026-06-17"))
  .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

// a Date at today's real date but the session's time-of-day
function targetOf(a: Appointment, now: Date): Date {
  const d = new Date(a.scheduledAt)
  const t = new Date(now)
  t.setHours(d.getHours(), d.getMinutes(), 0, 0)
  return t
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2)

export function LiveCallBanner() {
  const nav = useNavigate()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const live = today.find((a) => {
    const s = targetOf(a, now)
    return now >= s && now < new Date(s.getTime() + a.durationMin * 60_000)
  })
  const next = live ? undefined : today.find((a) => targetOf(a, now) > now)
  const appt = live ?? next

  // nothing left today — a calm rest state
  if (!appt) {
    return (
      <div data-reveal className="mb-6 flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-[var(--shadow-e2)]">
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-ink-400">
          <CalendarClock className="size-4 stroke-[1.5]" />
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-medium">No more sessions today</p>
          <p className="text-[12px] text-muted-foreground">You're all caught up — enjoy the breathing room.</p>
        </div>
        <button onClick={() => nav("/calendar")} className="text-[12.5px] font-medium text-brand-600 hover:underline">Open calendar →</button>
      </div>
    )
  }

  const isLive = !!live
  const target = targetOf(appt, now)
  const countdown = isLive
    ? fmtCountdown(new Date(target.getTime() + appt.durationMin * 60_000).getTime() - now.getTime())
    : fmtCountdown(target.getTime() - now.getTime())

  return (
    <div
      data-reveal
      className={cn(
        "mb-6 overflow-hidden rounded-2xl shadow-[var(--shadow-e3)]",
        isLive ? "bg-foreground text-background" : "bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        {/* status + countdown */}
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className={cn("absolute inline-flex size-full rounded-full opacity-70", isLive ? "animate-ping bg-background" : "animate-ping bg-brand-500")} />
            <span className={cn("relative inline-flex size-2.5 rounded-full", isLive ? "bg-background" : "bg-brand-500")} />
          </span>
          <div>
            <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", isLive ? "text-background/70" : "text-ink-300")}>
              {isLive ? "Live now" : "Next session"}
            </div>
            <div className="font-display text-[26px] font-extralight leading-none tabular-nums">
              {isLive ? `ends in ${countdown}` : countdown}
            </div>
          </div>
        </div>

        {/* divider */}
        <span className={cn("hidden h-9 w-px sm:block", isLive ? "bg-background/20" : "bg-hairline")} />

        {/* who */}
        <button
          onClick={() => nav(`/clients/${appt.clientId}/overview`)}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-medium", isLive ? "bg-background/15 text-background" : "bg-ink-100 text-ink-700")}>
            {initials(appt.clientName)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium">{appt.clientName}</div>
            <div className={cn("truncate text-[12px]", isLive ? "text-background/70" : "text-muted-foreground")}>
              {appt.title} · {PLATFORM_LABEL[appt.platform]}
            </div>
          </div>
        </button>

        {/* actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => nav(`/clients/${appt.clientId}/overview`)}
            className={cn("hidden h-9 items-center gap-1 rounded-full px-3 text-[12.5px] font-medium sm:inline-flex", isLive ? "text-background/80 hover:bg-background/10" : "text-muted-foreground hover:bg-secondary")}
          >
            Open client <ArrowRight className="size-3.5 stroke-[1.75]" />
          </button>
          <button
            onClick={() => toast.success(`Joining ${appt.clientName}'s session…`)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-5 text-[13px] font-medium transition-[transform,opacity] hover:-translate-y-px active:scale-95",
              isLive ? "bg-background text-foreground" : "bg-foreground text-background",
            )}
          >
            <Video className="size-4 stroke-[1.75]" /> {isLive ? "Rejoin" : "Join call"}
          </button>
        </div>
      </div>
    </div>
  )
}
