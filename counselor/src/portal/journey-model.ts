// The member's guided journey — ONE source of truth for both the full tracker
// (PortalJourney) and the compact spine on the dashboard (PortalHome). Status is
// derived from real progress: tests taken, sessions confirmed, report shared.

import type { ComponentType } from "react"
import { UserRound, Compass, Brain, CalendarDays, FileText, Target, Award, Star } from "lucide-react"
import { getClient } from "@/lib/mock"
import { useIsShared } from "@/lib/report-share"
import { usePortalAccount, useBookings } from "./portal-store"
import { useTestResults } from "./tests/results-store"

export type JourneyStatus = "done" | "now" | "todo" | "locked"
export interface JourneyStep {
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

  const steps: JourneyStep[] = [
    { n: 1, label: "Profile info", short: "Profile", icon: UserRound, status: "done", cta: "Edit", to: "/portal/account" },
    { n: 2, label: "Interest Test", short: "Interests", icon: Compass, status: took("sigma_interest") ? "done" : "now", cta: took("sigma_interest") ? "View" : "Take it", to: took("sigma_interest") ? "/portal/reports/test/sigma_interest" : "/portal/assessments/sigma_interest" },
    { n: 3, label: "Personality Test", short: "Personality", icon: Brain, status: took("sigma_personality") ? "done" : "now", cta: took("sigma_personality") ? "View" : "Take it", to: took("sigma_personality") ? "/portal/reports/test/sigma_personality" : "/portal/assessments/sigma_personality" },
    { n: 4, label: "1st Discussion Session", short: "Session 1", icon: CalendarDays, status: confirmedSessions >= 1 ? "done" : "now", cta: confirmedSessions >= 1 ? "Done" : "Book", to: "/portal/sessions" },
    { n: 5, label: "2nd Discussion Session", short: "Session 2", icon: CalendarDays, status: confirmedSessions >= 2 ? "done" : "todo", cta: "Book", to: "/portal/sessions" },
    { n: 6, label: "Career Recommendation Report", short: "Report", icon: FileText, status: reportReady ? "now" : "locked", cta: reportReady ? "Read" : "Locked", to: "/portal/reports/career" },
    { n: 7, label: "Strategy Session", short: "Strategy", icon: Target, status: "todo", cta: "Book", to: "/portal/sessions" },
    { n: 8, label: "Passion Certificate", short: "Certificate", icon: Award, status: reportReady ? "todo" : "locked", cta: reportReady ? "Download" : "Locked", to: "/portal/reports" },
    { n: 9, label: "Write a Review", short: "Review", icon: Star, status: "todo", cta: "Start", to: "/portal/messages" },
  ]

  const doneCount = steps.filter((s) => s.status === "done").length
  const current = steps.find((s) => s.status === "now") ?? steps.find((s) => s.status === "todo")
  return { steps, doneCount, current, pct: Math.round((doneCount / steps.length) * 100) }
}
