import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Video, ChevronLeft, ChevronRight, CalendarPlus, Plus, Clock, User,
  CircleDot, X, RotateCcw, CalendarRange, CalendarDays, Calendar as CalendarIcon, List,
} from "lucide-react"
import { toast } from "sonner"
import { useCaseloadClients } from "@/lib/caseload"
import { BentoMonth } from "@/components/calendar/BentoMonth"
import type { Appointment, Platform } from "@/lib/types"
import { useCalendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, calendarRoom } from "@/lib/calendar-store"
import { useSession } from "@/lib/auth-store"
import { useNaviDashboardSessions } from "@/lib/live-queries"
import type { AdminSession } from "@/lib/smc-live-api"
import { roomForSession } from "@/lib/meeting-link"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useAppearance } from "@/lib/appearance"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogClose,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"

/* ── constants / helpers ─────────────────────────────────────────────── */

// Real "today" (YYYY-MM-DD), computed at load — drives the cursor, the today
// highlight, and the relative-day labels so the calendar tracks the actual clock.
const TODAY = (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()
const VIEWS = [
  { key: "month", label: "Month", icon: CalendarIcon },
  { key: "week", label: "Week", icon: CalendarRange },
  { key: "day", label: "Day", icon: CalendarDays },
  { key: "list", label: "List", icon: List },
] as const
type ViewKey = (typeof VIEWS)[number]["key"]

// Validate a persisted view value (from localStorage via useAppearance). A
// stale/invalid stored string falls back to "month" so ViewKey stays sound.
const isViewKey = (v: string): v is ViewKey => VIEWS.some((x) => x.key === v)

const PLATFORM_LABEL: Record<Platform, string> = {
  livekit: "LiveKit video", google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", in_person: "In person",
}
const PLATFORM_DOT: Record<Platform, string> = {
  livekit: "bg-brand-600", google_meet: "bg-brand-500", zoom: "bg-mind-500", teams: "bg-well-600", in_person: "bg-ink-300",
}
const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Scheduled", live: "Live", completed: "Completed", no_show: "No-show", canceled: "Canceled",
}
const STATUS_TONE: Record<Appointment["status"], string> = {
  scheduled: "text-brand-600 bg-brand-100", live: "text-well-600 bg-well-100",
  completed: "text-ink-600 bg-secondary", no_show: "text-risk-600 bg-risk-100",
  canceled: "text-ink-500 bg-secondary",
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const PLATFORMS: Platform[] = ["livekit", "google_meet", "zoom", "teams", "in_person"]
const DURATIONS = [30, 45, 50, 60, 90]

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d) }
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
const fmtDayLong = (d: Date) => d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
const fmtMonthYear = (d: Date) => d.toLocaleDateString([], { month: "long", year: "numeric" })
const sameDay = (iso: string, d: Date) => iso.startsWith(ymd(d))
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("")

// Monday-anchored start of the ISO week containing d.
const startOfWeek = (d: Date) => {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  x.setHours(0, 0, 0, 0)
  return x
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// ── live booked sessions → calendar appointments ────────────────────────────
// The counsellor's REAL client bookings (getclientbynaviIdNavi) are folded into
// the calendar as READ-ONLY events so the grid shows what's actually booked, not
// just the counsellor's own ad-hoc events. They're tagged with a "live:" id prefix
// that carries the session's unique LiveKit room, so the join link is correct and
// the edit/cancel/delete controls can disable themselves (these live in the
// backend, managed from the client's profile — not editable from here).
const LIVE_PREFIX = "live:"
export const isLiveAppt = (id: string) => id.startsWith(LIVE_PREFIX)
export const liveApptRoom = (id: string) => id.slice(LIVE_PREFIX.length)

const cleanField = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" && s !== "undefined" ? s : ""
}
// session_date "DD/MM/YYYY" + session_time "06:00 PM - 07:00 PM" → local timestamp
const sessionStartTs = (date?: string, time?: string): number => {
  const dm = String(date ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!dm) return 0
  let H = 0, M = 0
  const tm = String(time ?? "").trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (tm) { H = +tm[1]; M = +tm[2]; const ap = tm[3]?.toUpperCase(); if (ap === "PM" && H < 12) H += 12; if (ap === "AM" && H === 12) H = 0 }
  return new Date(+dm[3], +dm[2] - 1, +dm[1], H, M).getTime()
}
// LOCAL ISO (no timezone suffix) so it lines up with calendar-store events, which
// the views match by `iso.startsWith(localYMD)`.
const localISO = (ts: number) => { const d = new Date(ts); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00` }

function toLiveAppointments(rows: unknown): Appointment[] {
  const list = Array.isArray(rows) ? (rows as AdminSession[]) : []
  const out: Appointment[] = []
  for (const r of list) {
    const ts = sessionStartTs(r.session_date, r.session_time)
    if (!ts) continue
    const st = String(r.session_status ?? "").toLowerCase()
    const status: Appointment["status"] =
      st === "completed" ? "completed"
      : st === "cancelled" || st === "canceled" || st === "deleted" ? "canceled"
      : "scheduled"
    const dur = Number(r.session_in_min)
    const sid = (r as { session_id?: unknown }).session_id ?? r.sessionsid ?? r.id
    out.push({
      id: `${LIVE_PREFIX}${roomForSession({ session_id: sid as string | number, meetinglink: r.meetinglink, session_name: r.session_name })}`,
      clientId: String(r.user_id ?? ""),
      clientName: cleanField(r.name) || (r.user_id ? `Client ${r.user_id}` : "Client"),
      title: cleanField(r.session_name) || cleanField(r.discussion_topic) || cleanField(r.package_name) || "Counselling session",
      scheduledAt: localISO(ts),
      durationMin: Number.isFinite(dur) && dur > 0 ? dur : 60,
      platform: "livekit",
      status,
    })
  }
  return out
}

/* ── views ───────────────────────────────────────────────────────────── */

/* Time-grid scaffolding for Week + Day (Google-Calendar style). */
const DAY_START = 7   // 7 AM
const DAY_END = 21    // 9 PM
const HOUR_H = 52     // px per hour
const GRID_H = (DAY_END - DAY_START) * HOUR_H
const fmtHour = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`
const minsFromStart = (iso: string) => { const d = new Date(iso); return (d.getHours() - DAY_START) * 60 + d.getMinutes() }

// lane assignment so overlapping events sit side-by-side (GCal-style)
function layoutDay(events: Appointment[]) {
  const sorted = [...events].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const laneEnds: number[] = []
  const placed = sorted.map((e) => {
    const start = minsFromStart(e.scheduledAt)
    const end = start + e.durationMin
    let lane = laneEnds.findIndex((m) => m <= start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end) } else laneEnds[lane] = end
    return { e, start, end, lane }
  })
  return { placed, lanes: Math.max(1, laneEnds.length) }
}

function HourAxis() {
  return (
    <div className="relative" style={{ height: GRID_H }}>
      {Array.from({ length: DAY_END - DAY_START + 1 }, (_, h) => (
        <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-ink-300" style={{ top: h * HOUR_H }}>
          {h < DAY_END - DAY_START ? fmtHour(DAY_START + h) : ""}
        </div>
      ))}
    </div>
  )
}

// snapped drag state: the grid-aligned start minute the block previews at,
// plus the horizontal pixel offset so the lifted block follows the cursor
// across week day-columns (vertical position comes from the snapped start).
type DragState = {
  id: string
  startMin: number        // snapped minutes-from-DAY_START for the preview
  dx: number              // horizontal cursor offset, px (cross-day follow)
}

function DayColumn({
  day, events, selectedId, onSelect, isToday, onMove, resolveDay,
}: {
  day: Date
  events: Appointment[]
  selectedId: string | null
  onSelect: (a: Appointment) => void
  isToday: boolean
  onMove?: (id: string, iso: string) => void
  resolveDay?: (clientX: number) => Date | null
}) {
  const { placed, lanes } = layoutDay(events)
  const colRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const now = new Date()
  const nowTop = (now.getHours() - DAY_START + now.getMinutes() / 60) * HOUR_H
  const totalMin = (DAY_END - DAY_START) * 60

  // pointer-drag to reschedule (Google-Calendar style): vertical = new time,
  // horizontal across week columns = new day. The preview snaps to a 15-min
  // grid as you drag so the block lands exactly where the ghost shows. A move
  // under the threshold counts as a click-to-select.
  const beginDrag = (e: React.PointerEvent, ev: Appointment, startMin: number) => {
    if (e.button !== 0 || !onMove) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY
    let moved = false
    const SNAP = 15

    // snap a pointer's vertical position to the 15-min grid, clamped to the day
    const snapTo = (cy: number) => {
      const raw = startMin + ((cy - sy) / HOUR_H) * 60
      return Math.max(0, Math.min(totalMin - ev.durationMin, Math.round(raw / SNAP) * SNAP))
    }

    const move = (pe: PointerEvent) => {
      const dx = pe.clientX - sx, dy = pe.clientY - sy
      if (!moved && Math.hypot(dx, dy) < 4) return
      moved = true
      setDrag({ id: ev.id, startMin: snapTo(pe.clientY), dx })
    }
    const up = (pe: PointerEvent) => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setDrag(null)
      if (!moved) { onSelect(ev); return }
      const snapped = snapTo(pe.clientY)
      const targetDay = resolveDay?.(pe.clientX) ?? day
      const abs = DAY_START * 60 + snapped
      onMove(ev.id, `${ymd(targetDay)}T${pad(Math.floor(abs / 60))}:${pad(abs % 60)}:00`)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  return (
    <div ref={colRef} className="relative" style={{ height: GRID_H }}>
      {Array.from({ length: DAY_END - DAY_START + 1 }, (_, h) => (
        <div key={h} className="absolute inset-x-0 border-t border-hairline" style={{ top: h * HOUR_H }} />
      ))}
      {isToday && nowTop >= 0 && nowTop <= GRID_H && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }}>
          <span className="-ml-[3px] size-1.5 rounded-full bg-risk-500" />
          <span className="h-px flex-1 bg-risk-500/70" />
        </div>
      )}
      {placed.map(({ e, start, end, lane }) => {
        const isDragging = drag?.id === e.id
        // while dragging, the block previews at the snapped start; otherwise its real slot
        const renderStart = isDragging ? drag!.startMin : start
        const top = (renderStart / 60) * HOUR_H
        const height = Math.max(20, ((end - start) / 60) * HOUR_H - 3)
        const w = 100 / lanes
        const active = e.id === selectedId
        const abs = DAY_START * 60 + renderStart
        return (
          <div
            key={e.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onPointerDown={(pe) => beginDrag(pe, e, start)}
            onKeyDown={(ke) => { if (ke.key === "Enter" || ke.key === " ") { ke.preventDefault(); onSelect(e) } }}
            className={cn(
              "absolute touch-none select-none overflow-hidden rounded-lg border-l-2 px-1.5 py-1 text-left shadow-[var(--shadow-e1)]",
              isDragging ? "transition-none" : "transition-shadow",
              onMove ? "cursor-grab" : "cursor-pointer",
              active ? "border-brand-500 bg-brand-100 z-10" : "bg-card hover:bg-secondary",
              isDragging && "z-30 cursor-grabbing bg-brand-100 opacity-95 shadow-[var(--shadow-e3)] ring-2 ring-brand-500",
            )}
            style={{
              top: top + 1, height,
              left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
              borderLeftColor: "var(--color-brand-500)",
              // vertical position is snapped via `top`; horizontal follows the
              // cursor so the lifted block visibly crosses week day-columns
              transform: isDragging ? `translateX(${drag!.dx}px)` : undefined,
            }}
          >
            <div className="truncate text-[11px] font-medium leading-tight">{e.clientName}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground tabular-nums">
              {isDragging
                ? `${((Math.floor(abs / 60) + 11) % 12) + 1}:${pad(abs % 60)} ${abs < 720 ? "AM" : "PM"}`
                : fmtTime(e.scheduledAt)} · {PLATFORM_LABEL[e.platform]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({
  cursor, events, selectedId, onSelect, onMove,
}: {
  cursor: Date; events: Appointment[]; selectedId: string | null
  onSelect: (a: Appointment) => void; onMove: (id: string, iso: string) => void
}) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = parse(TODAY)
  const gridRef = useRef<HTMLDivElement>(null)

  // map a viewport x to the day column it's over (for cross-day drag)
  const resolveDay = (clientX: number): Date | null => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left - 56 // minus the hour axis
    if (x < 0) return null
    const idx = Math.floor(x / ((rect.width - 56) / 7))
    return idx >= 0 && idx < 7 ? days[idx] : null
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))" }}>
        <div />
        {days.map((d, i) => {
          const isToday = ymd(d) === ymd(today)
          return (
            <div key={i} className={cn("border-l border-border px-2 py-2 text-center", isToday && "bg-brand-100")}>
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">{WEEKDAYS[i]}</div>
              <div className={cn("font-display text-[18px] font-extralight tabular-nums", isToday ? "text-brand-600" : "text-foreground")}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>
      <div ref={gridRef} className="grid overflow-y-auto" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))", maxHeight: 580 }}>
        <HourAxis />
        {days.map((d, i) => (
          <div key={i} className="border-l border-border">
            <DayColumn
              day={d}
              events={events.filter((a) => sameDay(a.scheduledAt, d))}
              selectedId={selectedId} onSelect={onSelect} isToday={ymd(d) === ymd(today)}
              onMove={onMove} resolveDay={resolveDay}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function DayView({
  cursor, events, selectedId, onSelect, onSchedule, onMove,
}: {
  cursor: Date; events: Appointment[]; selectedId: string | null
  onSelect: (a: Appointment) => void; onSchedule: () => void; onMove: (id: string, iso: string) => void
}) {
  const dayEvents = events.filter((a) => sameDay(a.scheduledAt, cursor))
  const isToday = ymd(cursor) === ymd(parse(TODAY))
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[14px] font-medium">{fmtDayLong(cursor)}</h2>
        <span className="text-[12px] tabular-nums text-muted-foreground">{dayEvents.length} sessions</span>
      </div>
      {dayEvents.length === 0 ? (
        <div className="p-5"><DayEmpty onSchedule={onSchedule} /></div>
      ) : (
        <div className="grid overflow-y-auto" style={{ gridTemplateColumns: "56px minmax(0,1fr)", maxHeight: 580 }}>
          <HourAxis />
          <div className="border-l border-border">
            <DayColumn day={cursor} events={dayEvents} selectedId={selectedId} onSelect={onSelect} isToday={isToday} onMove={onMove} />
          </div>
        </div>
      )}
    </div>
  )
}

const relDay = (key: string) => {
  const diff = Math.round((parse(key).getTime() - parse(TODAY).getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return parse(key).toLocaleDateString([], { weekday: "long" })
}

function ListView({
  events, selectedId, onSelect, onSchedule,
}: {
  events: Appointment[]; selectedId: string | null
  onSelect: (a: Appointment) => void; onSchedule: () => void
}) {
  const groups = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    const map = new Map<string, Appointment[]>()
    for (const a of sorted) {
      const key = a.scheduledAt.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [events])

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <DayEmpty onSchedule={onSchedule} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 px-1">
      {groups.map(([key, items]) => {
        const d = parse(key)
        const isToday = key === TODAY
        return (
          <section key={key}>
            <div className="mb-1 flex items-baseline gap-2">
              <h2 className={cn(
                "text-[11px] font-medium uppercase tracking-[0.12em]",
                isToday ? "text-brand-600" : "text-ink-400",
              )}>
                {relDay(key)}
              </h2>
              <span className="text-[11px] tabular-nums text-ink-300">{fmtDayLong(d)}</span>
            </div>
            <div className="flex flex-col">
              {items.map((a) => {
                const active = a.id === selectedId
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    aria-pressed={active}
                    className={cn(
                      "group -mx-2 flex items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors",
                      "border-t border-hairline first:border-t-0",
                      active ? "bg-secondary" : "hover:bg-secondary",
                    )}
                  >
                    <div className={cn(
                      "w-16 shrink-0 text-[13px] tabular-nums",
                      active ? "font-medium text-foreground" : "text-ink-600",
                    )}>
                      {fmtTime(a.scheduledAt)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium leading-tight">{a.clientName}</div>
                      <div className="truncate text-[12px] leading-tight text-muted-foreground">{a.title}</div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1.5 text-[11.5px] text-muted-foreground sm:inline-flex">
                      <span className={cn("size-1.5 rounded-full", PLATFORM_DOT[a.platform])} /> {PLATFORM_LABEL[a.platform]}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DayEmpty({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-full border border-border text-ink-300">
        <CalendarIcon className="size-5 stroke-[1.5]" />
      </div>
      <div>
        <p className="text-[13px] font-medium">No sessions scheduled</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">This day is clear. Book a session to fill it.</p>
      </div>
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onSchedule}>
        <Plus className="size-3.5 stroke-[1.5]" /> Schedule
      </Button>
    </div>
  )
}

/* ── right context / summary panel ───────────────────────────────────── */

function SummaryPanel({
  appt, onReschedule, onCancel, onDelete,
}: { appt: Appointment | null; onReschedule: () => void; onCancel: () => void; onDelete: () => void }) {
  if (!appt) {
    return (
      <aside data-reveal className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="grid size-11 place-items-center rounded-full border border-border text-ink-300">
            <CalendarDays className="size-5 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-[13px] font-medium">No session selected</p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              Pick an event from the calendar to see its details, join link, and recording status.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  const start = new Date(appt.scheduledAt)
  const end = new Date(start.getTime() + appt.durationMin * 60_000)
  const canceled = appt.status === "canceled"
  // booked client sessions are read-only here (they live in the backend); their
  // join link uses the session's own unique LiveKit room.
  const live = isLiveAppt(appt.id)
  const room = live ? liveApptRoom(appt.id) : calendarRoom(appt.id)

  return (
    <aside data-reveal className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Selected session</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_TONE[appt.status])}>
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      <h2 className="font-display text-[20px] font-extralight leading-tight tracking-tight">{appt.title}</h2>

      <Link
        to={`/clients/${appt.clientId}/overview`}
        className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-ink-300 hover:bg-secondary"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-700">
          {initials(appt.clientName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{appt.clientName}</div>
          <div className="text-[11.5px] text-brand-600">View client →</div>
        </div>
      </Link>

      <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <Row icon={<CalendarIcon className="size-4 stroke-[1.5] text-ink-300" />} label="Date">
          {fmtDayLong(start)}
        </Row>
        <Row icon={<Clock className="size-4 stroke-[1.5] text-ink-300" />} label="Time">
          <span className="tabular-nums">{fmtTime(appt.scheduledAt)} – {fmtTime(end.toISOString())}</span>
          <span className="text-muted-foreground"> · {appt.durationMin} min</span>
        </Row>
        <Row icon={<Video className="size-4 stroke-[1.5] text-ink-300" />} label="Platform">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", PLATFORM_DOT[appt.platform])} /> {PLATFORM_LABEL[appt.platform]}
          </span>
        </Row>
        <Row icon={<CircleDot className="size-4 stroke-[1.5] text-well-600" />} label="Transcript">
          {/* honest: transcripts come from IN-APP recording, not an external bot */}
          <span className="text-[12px] text-muted-foreground">Record in the session room — the live transcript and notes are generated there.</span>
        </Row>
      </dl>

      <div className="mt-5 flex flex-col gap-2">
        {canceled ? (
          <Button className="h-9 w-full gap-1.5" disabled>
            <Video className="size-4 stroke-[1.75]" /> Join LiveKit call
          </Button>
        ) : (
          <Button asChild className="h-9 w-full gap-1.5">
            <Link to={`/call/${appt.clientId || "session"}?room=${room}&topic=${encodeURIComponent(appt.title)}`}>
              <Video className="size-4 stroke-[1.75]" /> Join LiveKit call
            </Link>
          </Button>
        )}
        {live ? (
          <p className="rounded-lg bg-secondary/60 px-3 py-2 text-center text-[11.5px] leading-snug text-muted-foreground">
            Booked client session — reschedule or cancel it from the client's profile.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-9 gap-1.5" disabled={canceled} onClick={onReschedule}>
                <RotateCcw className="size-3.5 stroke-[1.5]" /> Reschedule
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-1.5 text-risk-600 hover:text-risk-600"
                disabled={canceled}
                onClick={onCancel}
              >
                <X className="size-3.5 stroke-[1.5]" /> Cancel
              </Button>
            </div>
            <button onClick={onDelete} className="mx-auto mt-0.5 text-[11.5px] text-ink-400 transition-colors hover:text-risk-600">Delete event</button>
          </>
        )}
      </div>
    </aside>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</dt>
        <dd className="mt-0.5 text-[12.5px] text-foreground">{children}</dd>
      </div>
    </div>
  )
}

/* ── schedule dialog ─────────────────────────────────────────────────── */

function ScheduleDialog({
  open, onOpenChange, onCreate, defaultDate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (a: Appointment) => void
  defaultDate?: Date
}) {
  const { clients: caseload, loading: caseloadLoading } = useCaseloadClients()
  const [clientId, setClientId] = useState<string>("")
  const [date, setDate] = useState<Date | undefined>(parse(TODAY))
  const [time, setTime] = useState("10:00")
  const [duration, setDuration] = useState("50")
  const [platform, setPlatform] = useState<Platform>("livekit")
  const [bot, setBot] = useState(true)
  const [agenda, setAgenda] = useState("")
  const [dateOpen, setDateOpen] = useState(false)

  // prefill the picker with the day the counselor clicked in the bento grid
  useEffect(() => {
    if (open && defaultDate) setDate(defaultDate)
  }, [open, defaultDate])

  const client = caseload.find((c) => c.id === clientId)
  const valid = !!clientId && !!date && !!time

  const submit = () => {
    if (!valid || !date) return
    const appt: Appointment = {
      id: `ap_${Date.now()}`,
      clientId: client!.id,
      clientName: client!.name,
      title: agenda.trim() || "Session",
      scheduledAt: `${ymd(date)}T${time}:00`,
      durationMin: Number(duration),
      platform,
      status: "scheduled",
      botStatus: bot ? "joining" : "none",
    }
    onCreate(appt)
    toast.success(`Session scheduled with ${client!.name}`)
    onOpenChange(false)
    // reset for next open
    setClientId(""); setAgenda(""); setBot(true); setPlatform("livekit"); setDuration("50"); setTime("10:00"); setDate(parse(TODAY))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[20px] font-light tracking-tight">Schedule a session</DialogTitle>
          <DialogDescription>Book a session and optionally send a recording bot to capture it.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Client">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {caseloadLoading && caseload.length === 0 ? (
                  <div className="px-2 py-1.5 text-[12.5px] text-muted-foreground">Loading your caseload…</div>
                ) : caseload.length === 0 ? (
                  <div className="px-2 py-1.5 text-[12.5px] text-muted-foreground">No clients in your caseload yet.</div>
                ) : caseload.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <User className="size-3.5 stroke-[1.5]" /> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-full justify-start gap-2 font-normal">
                    <CalendarIcon className="size-4 stroke-[1.5] text-ink-300" />
                    <span className="truncate">{date ? date.toLocaleDateString([], { month: "short", day: "numeric" }) : "Pick a date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={date}
                    onSelect={(d) => { setDate(d); setDateOpen(false) }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 tabular-nums" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration">
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Platform">
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <Label htmlFor="bot" className="text-[13px] font-medium">Auto-join recording bot</Label>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Sends a bot to record and transcribe the call.
              </p>
            </div>
            <Switch id="bot" checked={bot} onCheckedChange={setBot} className="mt-0.5" />
          </div>

          <Field label="Agenda">
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="What's the focus of this session?"
              className="min-h-[72px] resize-none"
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!valid} className="gap-1.5">
            <CalendarPlus className="size-4 stroke-[1.75]" /> Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</Label>
      {children}
    </div>
  )
}

/* ── screen ──────────────────────────────────────────────────────────── */

export function Calendar() {
  // Persisted per-browser via useAppearance (same pattern as font/compass prefs);
  // can be namespaced per user id once real auth lands so it's per-account.
  const { calendarView, setCalendarView } = useAppearance()
  const view: ViewKey = isViewKey(calendarView) ? calendarView : "month"
  const setView = (v: ViewKey) => setCalendarView(v)
  const [cursor, setCursor] = useState<Date>(parse(TODAY))
  // OUR OWN calendar — persistent events (cloud-synced per counsellor) drive the
  // grid. A fresh counsellor starts with an empty calendar (honest) until they
  // schedule their first event. Every event runs on LiveKit.
  const stored = useCalendarEvents()
  // the counsellor's REAL client bookings, folded in read-only
  const me = useSession()
  const naviId = me?.role === "counsellor" ? me.userId : undefined
  const { data: naviSessions } = useNaviDashboardSessions(naviId ?? null)
  const liveAppts = useMemo(() => toLiveAppointments(naviSessions), [naviSessions])
  const list = useMemo(() => [...stored, ...liveAppts], [stored, liveAppts])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState<Date>(parse(TODAY))

  // Compass bar "New event" opens the real scheduler
  useEffect(() => {
    const onNew = () => setScheduleOpen(true)
    window.addEventListener("compass:new-event", onNew)
    return () => window.removeEventListener("compass:new-event", onNew)
  }, [])

  const ref = useGsap((s) => revealChildren(s), [view])
  const selected = list.find((a) => a.id === selectedId) ?? list[0] ?? null

  const periodLabel =
    view === "month" ? fmtMonthYear(cursor)
    : view === "week" ? (() => {
        const s = startOfWeek(cursor), e = addDays(s, 6)
        return `${s.toLocaleDateString([], { month: "short", day: "numeric" })} – ${e.toLocaleDateString([], { month: "short", day: "numeric" })}`
      })()
    : view === "day" ? fmtDayLong(cursor)
    : "All upcoming"

  const step = (dir: 1 | -1) => {
    setCursor((c) => {
      if (view === "month") return new Date(c.getFullYear(), c.getMonth() + dir, 1)
      if (view === "week") return addDays(c, dir * 7)
      return addDays(c, dir)
    })
  }

  // booked client sessions live in the SMC backend — they're managed from the
  // client's profile, not editable here, so the local mutations refuse them.
  const liveGuard = () => { toast("This is a booked client session — manage it from the client's profile."); return true }
  const cancel = (id: string) => { if (isLiveAppt(id)) return void liveGuard(); updateCalendarEvent(id, { status: "canceled" }); toast("Session canceled") }
  const remove = (id: string) => { if (isLiveAppt(id)) return void liveGuard(); removeCalendarEvent(id); setSelectedId(null); toast("Event deleted") }

  const reschedule = () => {
    toast("Reschedule — adjust the date in the scheduler")
    setScheduleOpen(true)
  }

  const create = (a: Appointment) => {
    addCalendarEvent(a) // persists to the cloud-synced calendar
    setSelectedId(a.id)
    setCursor(parse(a.scheduledAt.slice(0, 10)))
    toast.success("Session scheduled — LiveKit room ready")
  }

  const openDay = (d: Date) => { setCursor(d); setView("day") }
  const scheduleOn = (d: Date) => { setScheduleDate(d); setScheduleOpen(true) }

  // drag-to-reschedule: patch the appointment's start time/day (persisted)
  const move = (id: string, iso: string) => {
    if (isLiveAppt(id)) { setSelectedId(id); liveGuard(); return }
    updateCalendarEvent(id, { scheduledAt: iso })
    setSelectedId(id)
    toast.success("Session rescheduled")
  }

  const empty = list.length === 0

  return (
    <div ref={ref}>
      {/* header */}
      <header data-reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Schedule</p>
          <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Calendar</h1>
        </div>
        <Button className="h-9 gap-1.5" onClick={() => setScheduleOpen(true)}>
          <CalendarPlus className="size-4 stroke-[1.75]" /> Schedule
        </Button>
      </header>

      {/* toolbar: nav + segmented control */}
      <div data-reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="icon-sm" aria-label="Previous"
              onClick={() => step(-1)} disabled={view === "list"}
            >
              <ChevronLeft className="size-4 stroke-[1.5]" />
            </Button>
            <Button
              variant="ghost" size="icon-sm" aria-label="Next"
              onClick={() => step(1)} disabled={view === "list"}
            >
              <ChevronRight className="size-4 stroke-[1.5]" />
            </Button>
          </div>
          <h2 className="min-w-[10rem] font-display text-[18px] font-light tracking-tight">{periodLabel}</h2>
          <Button
            variant="outline" size="sm" className="h-8"
            onClick={() => setCursor(parse(TODAY))} disabled={view === "list"}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => {
            const Icon = v.icon
            const active = view === v.key
            return (
              <button
                key={v.key}
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.key)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors",
                  active ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="size-3.5 stroke-[1.5]" /> {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* body: grid + summary panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div data-reveal className="min-w-0">
          {empty ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="grid size-12 place-items-center rounded-full border border-border text-ink-300">
                  <CalendarIcon className="size-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">No sessions on the calendar</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">Schedule your first session to get started.</p>
                </div>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setScheduleOpen(true)}>
                  <CalendarPlus className="size-3.5 stroke-[1.75]" /> Schedule
                </Button>
              </div>
            </div>
          ) : view === "month" ? (
            <BentoMonth
              cursor={cursor} today={parse(TODAY)} events={list} selectedId={selectedId}
              onSelect={(a) => setSelectedId(a.id)} onOpenDay={openDay} onSchedule={scheduleOn}
            />
          ) : view === "week" ? (
            <WeekView cursor={cursor} events={list} selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} onMove={move} />
          ) : view === "day" ? (
            <DayView
              cursor={cursor} events={list} selectedId={selectedId}
              onSelect={(a) => setSelectedId(a.id)} onSchedule={() => setScheduleOpen(true)} onMove={move}
            />
          ) : (
            <ListView
              events={list} selectedId={selectedId}
              onSelect={(a) => setSelectedId(a.id)} onSchedule={() => setScheduleOpen(true)}
            />
          )}

          {/* platform legend */}
          {!empty && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
              {PLATFORMS.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", PLATFORM_DOT[p])} /> {PLATFORM_LABEL[p]}
                </span>
              ))}
            </div>
          )}
        </div>

        <SummaryPanel appt={selected} onReschedule={reschedule} onCancel={() => selected && cancel(selected.id)} onDelete={() => selected && remove(selected.id)} />
      </div>

      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} onCreate={create} defaultDate={scheduleDate} />
    </div>
  )
}
