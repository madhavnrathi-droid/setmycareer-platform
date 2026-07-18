// Calendar events store — the in-memory source of truth for the Calendar screen.
//
// Mirrors the app's other mutable demo stores (see `mock.ts` sessions store): a
// framework-agnostic module store + a tiny subscribe/snapshot pair that the
// React layer consumes via `useSyncExternalStore` (see `useCalendarEvents`).
// Standalone on purpose — it derives its seed from the appointments *shape*
// (clients + a realistic week of counseling sessions) without importing or
// mutating `mock.ts`.
import { useSyncExternalStore } from "react"
import {
  addDays,
  addMinutes,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfWeek,
} from "date-fns"
import type { Platform } from "./types"

/* ── types ───────────────────────────────────────────────────────────── */

// A calendar (the "My calendars" list) — a colored, toggleable grouping.
export type CalendarId = "sessions" | "personal" | "meetings"

export interface CalendarMeta {
  id: CalendarId
  name: string
  /** Tailwind token base, e.g. "brand" → used to build bg-/text-/border- classes. */
  tone: EventTone
}

// Semantic tone tokens available to events (map 1:1 to index.css chart tokens).
export type EventTone = "brand" | "well" | "mind" | "warn" | "ink"

export interface CalendarEvent {
  id: string
  title: string
  /** ISO start (local, no Z) — e.g. "2026-06-17T10:00:00". */
  start: string
  /** ISO end (local, no Z). */
  end: string
  allDay: boolean
  calendarId: CalendarId
  /** Optional link to a console client (enables "View client →"). */
  clientId?: string
  clientName?: string
  /** Meeting platform, when this is a video/in-person session. */
  platform?: Platform
  /** Video/meeting URL — renders a "Join" affordance when present. */
  meetingLink?: string
  location?: string
  notes?: string
}

/* ── calendars ───────────────────────────────────────────────────────── */

export const CALENDARS: CalendarMeta[] = [
  { id: "sessions", name: "Sessions", tone: "brand" },
  { id: "meetings", name: "Meetings", tone: "mind" },
  { id: "personal", name: "Personal", tone: "well" },
]

export const TONE_OF: Record<CalendarId, EventTone> = {
  sessions: "brand",
  meetings: "mind",
  personal: "well",
}

/* ── color system (resolved from tone) ───────────────────────────────────
   One place to map a tone → the classes a colored block / chip / dot uses.
   Uses @theme tokens only (no arbitrary hex). AA-legible text on the soft
   fills; the solid dot/bar carries the calendar's identity. */
export interface ToneClasses {
  /** Soft block fill for time-grid events + month chips. */
  block: string
  /** Solid color bar / dot for accents. */
  solid: string
  /** Text color matching the tone. */
  text: string
  /** Checkbox fill when a calendar is enabled. */
  check: string
  /** Hover/active selected ring. */
  ring: string
}

export const TONE_CLASSES: Record<EventTone, ToneClasses> = {
  brand: {
    block: "bg-brand-100 text-brand-600 hover:bg-brand-100/80",
    solid: "bg-brand-500",
    text: "text-brand-600",
    check: "bg-brand-500 border-brand-500",
    ring: "ring-brand-500",
  },
  mind: {
    block: "bg-mind-100 text-mind-600 hover:bg-mind-100/80",
    solid: "bg-mind-500",
    text: "text-mind-600",
    check: "bg-mind-500 border-mind-500",
    ring: "ring-mind-500",
  },
  well: {
    block: "bg-well-100 text-well-600 hover:bg-well-100/80",
    solid: "bg-well-600",
    text: "text-well-600",
    check: "bg-well-600 border-well-600",
    ring: "ring-well-600",
  },
  warn: {
    block: "bg-warn-100 text-warn-600 hover:bg-warn-100/80",
    solid: "bg-warn-600",
    text: "text-warn-600",
    check: "bg-warn-600 border-warn-600",
    ring: "ring-warn-600",
  },
  ink: {
    block: "bg-ink-100 text-ink-700 hover:bg-ink-100/80",
    solid: "bg-ink-300",
    text: "text-ink-700",
    check: "bg-ink-900 border-ink-900",
    ring: "ring-ink-300",
  },
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  livekit: "LiveKit video",
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  in_person: "In person",
}

/* ── seed ─────────────────────────────────────────────────────────────
   "Today" for the demo is 2026-06-17 (a Wednesday). Seed a realistic working
   week of counseling sessions around it + a couple of meeting-link sessions and
   a personal block, plus a smattering across the rest of June so Month view has
   density. Derived from the appointments shape (client id/name + platform). */

const TODAY_ISO = "2026-06-17"
const today = parseISO(TODAY_ISO)
const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday

const iso = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm:ss")
const at = (base: Date, h: number, m: number) => setMinutes(setHours(base, h), m)

interface SeedSpec {
  dayOffset: number // from Monday of this week
  h: number
  m: number
  dur: number
  title: string
  calendarId: CalendarId
  clientId?: string
  clientName?: string
  platform?: Platform
  meetingLink?: string
  location?: string
  notes?: string
  allDay?: boolean
}

const SEED: SeedSpec[] = [
  // ── Monday
  {
    dayOffset: 0, h: 9, m: 0, dur: 50, title: "Follow-up · product transition",
    calendarId: "sessions", clientId: "cl_tiffany", clientName: "Tiffany Woodward",
    platform: "google_meet", meetingLink: "https://meet.google.com/abc-defg-hij",
    notes: "Confidence is the blocker, not capability. Revisit CV rework progress.",
  },
  {
    dayOffset: 0, h: 11, m: 30, dur: 45, title: "Intake · baseline mapping",
    calendarId: "sessions", clientId: "cl_noah", clientName: "Noah Bennett",
    platform: "zoom", meetingLink: "https://zoom.us/j/9921143087",
  },
  {
    dayOffset: 0, h: 15, m: 0, dur: 30, title: "Team sync · caseload review",
    calendarId: "meetings", location: "Room 2B",
  },

  // ── Tuesday
  {
    dayOffset: 1, h: 10, m: 0, dur: 50, title: "Senior-PM roadmap",
    calendarId: "sessions", clientId: "cl_priya", clientName: "Priya Raman",
    platform: "google_meet", meetingLink: "https://meet.google.com/qrs-tuvw-xyz",
  },
  {
    dayOffset: 1, h: 13, m: 0, dur: 45, title: "Comp negotiation prep",
    calendarId: "sessions", clientId: "cl_aarav", clientName: "Aarav Mehta",
    platform: "zoom", meetingLink: "https://zoom.us/j/4452201987",
  },
  {
    dayOffset: 1, h: 16, m: 30, dur: 50, title: "Values mapping",
    calendarId: "sessions", clientId: "cl_lena", clientName: "Lena Park",
    platform: "teams",
  },

  // ── Wednesday (today)
  {
    dayOffset: 2, h: 10, m: 0, dur: 50, title: "Follow-up · product transition",
    calendarId: "sessions", clientId: "cl_tiffany", clientName: "Tiffany Woodward",
    platform: "google_meet", meetingLink: "https://meet.google.com/abc-defg-hij",
  },
  {
    dayOffset: 2, h: 13, m: 30, dur: 45, title: "Comp negotiation prep",
    calendarId: "sessions", clientId: "cl_aarav", clientName: "Aarav Mehta",
    platform: "zoom", meetingLink: "https://zoom.us/j/4452201987",
  },
  {
    dayOffset: 2, h: 16, m: 0, dur: 50, title: "Senior-PM roadmap",
    calendarId: "sessions", clientId: "cl_priya", clientName: "Priya Raman",
    platform: "google_meet", meetingLink: "https://meet.google.com/qrs-tuvw-xyz",
  },
  {
    dayOffset: 2, h: 12, m: 0, dur: 45, title: "Lunch",
    calendarId: "personal", location: "Café Mori",
  },

  // ── Thursday
  {
    dayOffset: 3, h: 11, m: 0, dur: 50, title: "Check-in · wellbeing + search",
    calendarId: "sessions", clientId: "cl_sara", clientName: "Sara Okafor",
    platform: "teams",
    notes: "Watch the strained climb — career up while energy dips.",
  },
  {
    dayOffset: 3, h: 14, m: 0, dur: 30, title: "Supervision",
    calendarId: "meetings", platform: "zoom", meetingLink: "https://zoom.us/j/1122003344",
  },
  {
    dayOffset: 3, h: 15, m: 30, dur: 45, title: "Transcript review · Diego",
    calendarId: "sessions", clientId: "cl_diego", clientName: "Diego Santos",
    platform: "in_person", location: "Office",
  },

  // ── Friday
  {
    dayOffset: 4, h: 9, m: 30, dur: 50, title: "Portfolio review",
    calendarId: "sessions", clientId: "cl_tiffany", clientName: "Tiffany Woodward",
    platform: "zoom", meetingLink: "https://zoom.us/j/8890011234",
  },
  {
    dayOffset: 4, h: 13, m: 0, dur: 50, title: "Re-engagement · Marcus",
    calendarId: "sessions", clientId: "cl_marcus", clientName: "Marcus Hale",
    platform: "google_meet", meetingLink: "https://meet.google.com/lmn-opqr-stu",
  },
  {
    dayOffset: 4, h: 0, m: 0, dur: 0, title: "Quarterly reports due",
    calendarId: "personal", allDay: true,
  },

  // ── next Monday (spillover for week-nav)
  {
    dayOffset: 7, h: 10, m: 0, dur: 50, title: "Follow-up · product transition",
    calendarId: "sessions", clientId: "cl_tiffany", clientName: "Tiffany Woodward",
    platform: "google_meet", meetingLink: "https://meet.google.com/abc-defg-hij",
  },
  {
    dayOffset: 7, h: 14, m: 0, dur: 45, title: "Senior-PM roadmap",
    calendarId: "sessions", clientId: "cl_priya", clientName: "Priya Raman",
    platform: "google_meet",
  },
]

function buildSeed(): CalendarEvent[] {
  const fromSpec = SEED.map((s, i): CalendarEvent => {
    const base = addDays(weekStart, s.dayOffset)
    if (s.allDay) {
      return {
        id: `ev_seed_${i}`,
        title: s.title,
        start: format(base, "yyyy-MM-dd'T'00:00:00"),
        end: format(base, "yyyy-MM-dd'T'23:59:59"),
        allDay: true,
        calendarId: s.calendarId,
        clientId: s.clientId,
        clientName: s.clientName,
        platform: s.platform,
        meetingLink: s.meetingLink,
        location: s.location,
        notes: s.notes,
      }
    }
    const start = at(base, s.h, s.m)
    const end = addMinutes(start, s.dur)
    return {
      id: `ev_seed_${i}`,
      title: s.title,
      start: iso(start),
      end: iso(end),
      allDay: false,
      calendarId: s.calendarId,
      clientId: s.clientId,
      clientName: s.clientName,
      platform: s.platform,
      meetingLink: s.meetingLink,
      location: s.location,
      notes: s.notes,
    }
  })

  // A few scattered across the month so Month view has realistic density.
  const monthExtras: Array<[string, number, number, number, string, CalendarId]> = [
    ["2026-06-02", 10, 0, 50, "Career clarity workshop", "sessions"],
    ["2026-06-04", 14, 0, 45, "Skill-gap planning · Lena", "sessions"],
    ["2026-06-09", 11, 0, 45, "Transcript review · Diego", "sessions"],
    ["2026-06-11", 15, 30, 30, "Peer supervision", "meetings"],
    ["2026-06-23", 10, 0, 50, "Mock interview · Aarav", "sessions"],
    ["2026-06-25", 13, 0, 50, "Check-in · Sara", "sessions"],
    ["2026-06-29", 9, 30, 45, "Month-end planning", "meetings"],
  ]
  const extras = monthExtras.map(([day, h, m, dur, title, cal], i): CalendarEvent => {
    const start = at(parseISO(day), h, m)
    const end = addMinutes(start, dur)
    return {
      id: `ev_month_${i}`,
      title,
      start: iso(start),
      end: iso(end),
      allDay: false,
      calendarId: cal,
    }
  })

  return [...fromSpec, ...extras]
}

/* ── module store (subscribe / snapshot for useSyncExternalStore) ──────── */

let events: CalendarEvent[] = buildSeed()
let version = 0
const listeners = new Set<() => void>()

function emit() {
  version++
  for (const l of listeners) l()
}

export function subscribeEvents(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Monotonic version counter — the snapshot the React hook reads. */
export function eventsSnapshot(): number {
  return version
}

/** The live events array (read after subscribing for reactivity). */
export function getEvents(): CalendarEvent[] {
  return events
}

let seq = 0
const nextId = () => `ev_${Date.now().toString(36)}_${seq++}`

/** Create an event from a partial (id/allDay defaulted). Returns the created event. */
export function createEvent(
  input: Omit<CalendarEvent, "id" | "allDay"> & { id?: string; allDay?: boolean },
): CalendarEvent {
  const ev: CalendarEvent = {
    allDay: false,
    ...input,
    id: input.id ?? nextId(),
  }
  events = [...events, ev]
  emit()
  return ev
}

/** Patch an existing event by id (no-op if missing). */
export function updateEvent(id: string, patch: Partial<CalendarEvent>): void {
  let changed = false
  events = events.map((e) => {
    if (e.id !== id) return e
    changed = true
    return { ...e, ...patch }
  })
  if (changed) emit()
}

/** Remove an event by id. */
export function deleteEvent(id: string): void {
  const before = events.length
  events = events.filter((e) => e.id !== id)
  if (events.length !== before) emit()
}

/* ── React binding ───────────────────────────────────────────────────── */

/** Live events list — re-renders the caller on any store mutation. */
export function useCalendarEvents(): CalendarEvent[] {
  useSyncExternalStore(subscribeEvents, eventsSnapshot, eventsSnapshot)
  return getEvents()
}
