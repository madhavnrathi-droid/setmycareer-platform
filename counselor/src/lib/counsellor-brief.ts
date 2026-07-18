// The live account brief the counsellor's Compass reads. Both Compass surfaces —
// the full-screen Assistant and the floating CompassBar — call this hook to get
// the SAME live caseload (getclientbynaviId) and today's real sessions
// (getclientbynaviIdNavi), then pass them into buildKnowledge() at send time
// (buildKnowledge can't call hooks itself). Reads through the shared live-queries
// cache, so it costs nothing beyond what the dashboard/sidebar already fetch.

import { useMemo } from "react"
import { useSession } from "./auth-store"
import { useNaviClients, useNaviDashboardSessions } from "./live-queries"
import { foldCaseload, toMentionClients, buildTodayLine, type AiCaseClient, type MentionClient } from "./assistant-knowledge"

export interface CounsellorBrief {
  /** The signed-in counsellor's navigator id (null if not a counsellor session). */
  naviId: number | null
  counselorName?: string
  /** The folded live caseload (one record per client, newest-first). */
  caseload: AiCaseClient[]
  /** The caseload mapped for the composer's "@" mention autocomplete. */
  mentionClients: MentionClient[]
  /** A one-line, real-dated snapshot of today's sessions. */
  today: string
}

export function useCounsellorBrief(): CounsellorBrief {
  const session = useSession()
  const naviId = session?.role === "counsellor" ? session.userId : null
  const { data: caseloadRows } = useNaviClients(naviId)
  const { data: sessionRows } = useNaviDashboardSessions(naviId)

  const caseload = useMemo(() => foldCaseload(caseloadRows), [caseloadRows])
  const mentionClients = useMemo(() => toMentionClients(caseload), [caseload])
  const today = useMemo(() => buildTodayLine(sessionRows), [sessionRows])

  return { naviId, counselorName: session?.name, caseload, mentionClients, today }
}
