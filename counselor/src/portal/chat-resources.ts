// The account resources a member (or their counsellor) can tag into the chat with
// @ or / — booked sessions, completed tests, and shared reports. Returned as
// ready-to-attach ChatRefs so the composer just filters + inserts them.

import { useMemo } from "react"
import { useBookings, type ChatRef } from "./portal-store"
import { useTestResults } from "./tests/results-store"
import { getTest } from "./tests/catalog"
import { useUserReports } from "@/lib/live-queries"

const fmtDay = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { day: "numeric", month: "short" })
}

/** All taggable resources for a client, newest-relevant first. */
export function useAccountResources(clientId: string): ChatRef[] {
  const bookings = useBookings(clientId)
  const tests = useTestResults(clientId)
  // live uploaded reports (numeric SMC ids only; demo personas have none)
  const reports = useUserReports(/^\d+$/.test(clientId) ? clientId : undefined)

  return useMemo(() => {
    const out: ChatRef[] = []
    for (const b of [...bookings].reverse()) {
      out.push({
        kind: "session",
        refId: b.id,
        title: b.topic?.trim() || "Counselling session",
        meta: [fmtDay(b.at), b.status].filter(Boolean).join(" · "),
        href: "/portal/sessions",
      })
    }
    for (const t of tests) {
      const def = getTest(t.testId)
      out.push({
        kind: "test",
        refId: t.testId,
        title: def?.name ?? t.testId,
        meta: t.overall ? `Overall ${t.overall}/100` : "Completed",
        href: `/portal/reports/test/${t.testId}`,
      })
    }
    for (const r of reports.data ?? []) {
      if (!(r.report_location || r.report_name)) continue
      out.push({
        kind: "report",
        refId: String(r.id),
        title: (r.report_name ?? "SetMyCareer report").trim(),
        meta: "Report",
        href: r.report_location ?? "/portal/reports",
      })
    }
    return out
  }, [bookings, tests, reports.data])
}
