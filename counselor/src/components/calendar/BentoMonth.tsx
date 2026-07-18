// The month grid — a clean, uniform, Cron/Notion-style calendar: one continuous
// hairline grid, equal-height cells, the day number as a small tabular figure
// (today = a filled accent disc), and thin single-line event chips with a
// platform dot + time. Dense and quiet; a subtle wellbeing-flag marker and a
// hover "+" to schedule. Same props as before so the Calendar screen is unchanged.

import {
  Plus, AlertTriangle,
} from "lucide-react"
import type { Appointment, Platform } from "@/lib/types"
import { composeDay } from "@/lib/calendar-bento"
import { useGsap, gsap } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(":00", "")
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x }
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const DOT: Record<Platform, string> = {
  livekit: "bg-brand-600", google_meet: "bg-brand-500", zoom: "bg-mind-500", teams: "bg-well-600", in_person: "bg-ink-400",
}

function Chip({ appt, active, onSelect }: { appt: Appointment; active: boolean; onSelect: () => void }) {
  const done = appt.status === "completed"
  const canceled = appt.status === "canceled"
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      aria-pressed={active}
      title={`${fmtTime(appt.scheduledAt)} · ${appt.title} · ${appt.clientName}`}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-[5px] px-1.5 py-[3px] text-left text-[11px] leading-tight transition-colors",
        active ? "bg-brand-100 ring-1 ring-brand-300" : "hover:bg-secondary",
        canceled && "opacity-50",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[appt.platform])} />
      <span className="shrink-0 tabular-nums text-ink-400">{fmtTime(appt.scheduledAt)}</span>
      <span className={cn("min-w-0 flex-1 truncate font-medium text-ink-700", (done || canceled) && "text-ink-400 line-through decoration-ink-300")}>{appt.title}</span>
    </button>
  )
}

function Cell({
  d, inMonth, isToday, events, selectedId, onSelect, onOpenDay, onSchedule,
}: {
  d: Date; inMonth: boolean; isToday: boolean; events: Appointment[]; selectedId: string | null
  onSelect: (a: Appointment) => void; onOpenDay: (d: Date) => void; onSchedule: (d: Date) => void
}) {
  const day = composeDay(ymd(d), events, isToday)
  const sessions = day.sessions
  const MAX = 3
  const overflow = sessions.length - MAX
  return (
    <div data-day className={cn("group relative flex min-h-[112px] flex-col border-b border-r border-border/60 p-1.5", !inMonth && "bg-canvas/50")}>
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenDay(d)}
          aria-label={`Open ${ymd(d)}`}
          className={cn(
            "grid size-6 place-items-center rounded-full text-[12px] tabular-nums transition-colors",
            isToday ? "bg-brand-500 font-semibold text-white" : inMonth ? "font-medium text-ink-700 hover:bg-secondary" : "text-ink-300 hover:bg-secondary",
          )}
        >
          {d.getDate()}
        </button>
        <div className="flex items-center gap-1">
          {day.flag && (
            <span title={`Wellbeing flag · ${day.flag.clientName}`} className="grid size-4 place-items-center">
              <AlertTriangle className="size-3 text-warn-500" />
            </span>
          )}
          <button
            type="button"
            onClick={() => onSchedule(d)}
            aria-label="Schedule on this day"
            className="grid size-5 place-items-center rounded text-ink-300 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Plus className="size-3.5 stroke-[1.75]" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {sessions.slice(0, MAX).map((a) => (
          <Chip key={a.id} appt={a} active={a.id === selectedId} onSelect={() => onSelect(a)} />
        ))}
        {overflow > 0 && (
          <button type="button" onClick={() => onOpenDay(d)} className="px-1.5 pt-0.5 text-left text-[10.5px] font-medium text-ink-400 hover:text-foreground">
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  )
}

export function BentoMonth({
  cursor, today, events, selectedId, onSelect, onOpenDay, onSchedule,
}: {
  cursor: Date
  today: Date
  events: Appointment[]
  selectedId: string | null
  onSelect: (a: Appointment) => void
  onOpenDay: (d: Date) => void
  onSchedule: (d: Date) => void
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`
  const todayIso = ymd(today)

  const gridRef = useGsap<HTMLDivElement>((scope) => {
    const items = scope.querySelectorAll("[data-day]")
    if (!items.length) return
    gsap.from(items, {
      opacity: 0, y: 6, duration: 0.32, ease: "power3.out",
      stagger: { each: 0.008, grid: [6, 7], from: "start" }, clearProps: "all",
    })
  }, [monthKey])

  return (
    <div ref={gridRef} className="overflow-hidden rounded-xl border-l border-t border-border/60">
      {/* weekday header */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className="border-b border-r border-border/60 bg-secondary/30 px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">{w}</div>
        ))}
      </div>
      {/* days */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const iso = ymd(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = iso === todayIso
          const dayEvents = events.filter((a) => a.scheduledAt.startsWith(iso))
          return (
            <Cell key={i} d={d} inMonth={inMonth} isToday={isToday} events={dayEvents} selectedId={selectedId} onSelect={onSelect} onOpenDay={onOpenDay} onSchedule={onSchedule} />
          )
        })}
      </div>
    </div>
  )
}
