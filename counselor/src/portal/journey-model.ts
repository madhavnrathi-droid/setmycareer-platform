// The member's guided journey — ONE source of truth for both the full tracker
// (PortalJourney) and the compact spine on the dashboard (PortalHome). Status is
// derived from real progress: tests taken, sessions confirmed, report shared.

import type { ComponentType } from "react"
import { UserRound, Compass, Brain, Gauge, CalendarDays, FileText, Target, Award, Star } from "lucide-react"
import { getClient } from "@/lib/mock"
import { useIsShared } from "@/lib/report-share"
import { usePortalAccount, useBookings, profileComplete, accountTrack } from "./portal-store"
import { testsFor } from "./tests/catalog"
import { useTestResults } from "./tests/results-store"

export type JourneyStatus = "done" | "now" | "todo" | "locked"
export type JourneyKey =
  | "profile" | "interest" | "personality" | "third"
  | "session1" | "session2" | "report" | "strategy" | "certificate" | "review"
export interface JourneyStep {
  /** stable identity — group and look steps up by this, never by position or number,
   *  which shift whenever a step is added (the tracker's phases broke exactly that way) */
  key: JourneyKey
  n: number
  label: string
  short: string
  status: JourneyStatus
  cta: string
  to: string
  icon: ComponentType<{ className?: string }>
}

export interface JourneyState {
  steps: JourneyStep[]
  doneCount: number
  /** the step the member should act on next (first "now", else first "todo") */
  current?: JourneyStep
  pct: number
}

/** Reactive journey state for the current member. Reads the same stores the full
 *  tracker does, so the dashboard spine and the tracker never disagree. */
export function usePortalJourney(): JourneyState {
  const account = usePortalAccount()
  const results = useTestResults(account?.clientId ?? "")
  const bookings = useBookings(account?.clientId ?? "")
  const shared = useIsShared(account?.clientId ?? "")

  const client = account ? getClient(account.clientId) : undefined
  const isDemo = Boolean(client)
  const took = (id: string) => results.some((r) => r.testId === id)
  const confirmedSessions =
    bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length +
    (client ? Math.max(0, client.sessionCount ?? 0) : 0)
  const reportReady = shared || isDemo

  // The profile gates every test and every booking (age and gender choose the norm
  // tables; the answers brief the counsellor). It was hardcoded "done", so a brand-new
  // member saw "Profile ✓" on the spine while a banner above it said 30% and every
  // test and session behind it was locked. Demo personas arrive fully profiled.
  const profiled = isDemo || profileComplete(account)
  const gated = (s: JourneyStatus): JourneyStatus => (profiled || s === "done" ? s : "locked")

  // The third instrument is real and feeds the report ("All three instruments come with
  // your programme"), but it had no step here — the spine showed two tests while the
  // Assessments page listed three. Its name follows the member's track.
  const third = testsFor(accountTrack(account))[2]
  const test = (key: JourneyKey, id: string, label: string, short: string, icon: JourneyStep["icon"]): Omit<JourneyStep, "n"> => ({
    key, label, short, icon,
    status: gated(took(id) ? "done" : "now"),
    cta: took(id) ? "View" : profiled ? "Take it" : "Locked",
    to: took(id) ? `/portal/reports/test/${id}` : `/portal/assessments/${id}`,
  })

  const steps: JourneyStep[] = ([
    { key: "profile", label: "Profile info", short: "Profile", icon: UserRound, status: profiled ? "done" : "now", cta: profiled ? "Edit" : "Complete", to: "/portal/account" },
    test("interest", "sigma_interest", "Interest Test", "Interests", Compass),
    test("personality", "sigma_personality", "Personality Test", "Personality", Brain),
    test("third", "aptitude", third?.name ?? "Ability Test", third?.name.startsWith("Competency") ? "Competency" : "Ability", Gauge),
    { key: "session1", label: "1st Discussion Session", short: "Session 1", icon: CalendarDays, status: gated(confirmedSessions >= 1 ? "done" : "now"), cta: confirmedSessions >= 1 ? "Done" : profiled ? "Book" : "Locked", to: "/portal/sessions" },
    { key: "session2", label: "2nd Discussion Session", short: "Session 2", icon: CalendarDays, status: gated(confirmedSessions >= 2 ? "done" : "todo"), cta: profiled ? "Book" : "Locked", to: "/portal/sessions" },
    { key: "report", label: "Career Recommendation Report", short: "Report", icon: FileText, status: reportReady ? "now" : "locked", cta: reportReady ? "Read" : "Locked", to: "/portal/reports/career" },
    { key: "strategy", label: "Strategy Session", short: "Strategy", icon: Target, status: gated("todo"), cta: profiled ? "Book" : "Locked", to: "/portal/sessions" },
    { key: "certificate", label: "Passion Certificate", short: "Certificate", icon: Award, status: reportReady ? "todo" : "locked", cta: reportReady ? "Download" : "Locked", to: "/portal/reports" },
    { key: "review", label: "Write a Review", short: "Review", icon: Star, status: "todo", cta: "Start", to: "/portal/messages" },
  ] as Omit<JourneyStep, "n">[]).map((s, i) => ({ ...s, n: i + 1 }))

  const doneCount = steps.filter((s) => s.status === "done").length
  const current = steps.find((s) => s.status === "now") ?? steps.find((s) => s.status === "todo")
  return { steps, doneCount, current, pct: Math.round((doneCount / steps.length) * 100) }
}
