// Adaptive bento calendar — the density-signal layer that drives card size.
//
// The month view is a *bento*: a day's footprint scales with how much is
// happening on it (sessions, wellbeing flags, follow-up tasks, AI insights,
// all-day blocks). This module is the single source of those signals.
//
// It layers a realistic month of June 2026 on top of the 4 seed appointments
// WITHOUT mutating the global `appointments` array — the dashboard, Compass and
// live-call banner all read that array filtered to "today" (2026-06-17), so
// adding sessions on other days here is regression-free.

import type { Appointment } from "./types"
import { appointments as seed } from "./mock"

/* ── signal types ────────────────────────────────────────────────────── */

export interface DayBlock {
  id: string
  label: string
  kind: "deep_work" | "admin" | "personal"
}

export interface DayFlag {
  clientId: string
  clientName: string
  initials: string
  severity: "low" | "moderate" | "high"
  text: string
}

export interface DayTask {
  id: string
  label: string
  meta?: string
  clientId?: string
}

/* The bento calendar overlays nothing fabricated — sessions come from the
   counsellor's OWN cloud calendar (calendar-store), and the per-day signal maps
   below are empty until real flags/tasks/insights are produced. No demo clients. */

/** Empty: the Calendar screen reads the live calendar-store, not this. */
export const bentoAppointments: Appointment[] = [...seed]

/* ── per-day signals (keyed by yyyy-mm-dd) — empty (no fabricated clients) ─── */

export const dayBlocks: Record<string, DayBlock[]> = {}
export const dayFlags: Record<string, DayFlag> = {}
export const dayTasks: Record<string, DayTask[]> = {}
export const dayInsights: Record<string, string> = {}

/* ── composition ─────────────────────────────────────────────────────────
   A day's tier is what the bento card renders. Density is a soft score used
   only for ordering/telemetry; tier is decided by content so the layout reads
   predictably (today and 3+ session days are always heroes). */

export type DayTier = "empty" | "compact" | "rich" | "hero"

export interface DayData {
  iso: string
  sessions: Appointment[]
  blocks: DayBlock[]
  flag?: DayFlag
  tasks: DayTask[]
  insight?: string
  density: number
  tier: DayTier
}

export function composeDay(iso: string, sessions: Appointment[], isToday: boolean): DayData {
  const blocks = dayBlocks[iso] ?? []
  const flag = dayFlags[iso]
  const tasks = dayTasks[iso] ?? []
  const insight = dayInsights[iso]
  const sorted = [...sessions].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  const density =
    sorted.length * 2 + (flag ? 3 : 0) + tasks.length * 1.5 + blocks.length + (isToday ? 2 : 0)

  let tier: DayTier
  if (isToday || sorted.length >= 3) tier = "hero"
  else if (sorted.length >= 2 || flag || tasks.length > 0 || (sorted.length >= 1 && (blocks.length > 0 || !!insight)))
    tier = "rich"
  else if (sorted.length === 1 || blocks.length > 0) tier = "compact"
  else tier = "empty"

  return { iso, sessions: sorted, blocks, flag, tasks, insight, density, tier }
}

/** Two-letter initials from a display name. */
export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
