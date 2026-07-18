import { useParams, useLocation, Routes, Route, Navigate } from "react-router-dom"
import { getClient } from "@/lib/mock"
import { ContextHeader } from "@/components/shell/ContextHeader"
import { PillNav, type PillItem } from "@/components/shell/PillNav"
import { ClientOverview } from "./client/ClientOverview"
import { ClientSessions } from "./client/ClientSessions"
import { SessionDetail } from "./client/SessionDetail"
import { ClientTranscripts } from "./client/ClientTranscripts"
import { TranscriptReview } from "./client/TranscriptReview"
import { ClientTests } from "./client/ClientTests"
import { TestReportDoc } from "./client/TestReportDoc"
import { ClientNotes } from "./client/ClientNotes"
import { ClientReports } from "./client/ClientReports"
import { LiveClientHub } from "./client/LiveClientHub"
import { Placeholder } from "./Placeholder"

export function ClientHub() {
  const { clientId } = useParams()
  const location = useLocation()
  const client = getClient(clientId ?? "")
  if (!client) {
    // A numeric id with no mock persona is a real backend client — render the
    // live detail (sessions / reports / notes) straight from the production API.
    if (clientId && /^\d+$/.test(clientId)) return <LiveClientHub clientId={clientId} />
    return <Placeholder title="Client not found" note="This client doesn't exist or isn't assigned to you." />
  }
  const base = `/clients/${client.id}`
  const tabs: PillItem[] = [
    { to: `${base}/overview`, label: "Overview" },
    { to: `${base}/sessions`, label: "Sessions" },
    { to: `${base}/transcripts`, label: "Transcripts" },
    { to: `${base}/tests`, label: "Tests" },
    { to: `${base}/notes`, label: "Notes" },
    { to: `${base}/reports`, label: "Reports" },
  ]

  // The Test report renders as its own clean, print-ready document — it skips
  // the hub chrome (context header + pill-nav) on screen and in print.
  const isReport = location.pathname.endsWith("/test-report")

  return (
    <div>
      {!isReport && (
        <>
          <ContextHeader client={client} />
          <div className="mb-7">
            <PillNav items={tabs} />
          </div>
        </>
      )}
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ClientOverview client={client} />} />
        <Route path="sessions" element={<ClientSessions client={client} />} />
        <Route path="sessions/:sessionId" element={<SessionDetail />} />
        <Route path="transcripts" element={<ClientTranscripts client={client} />} />
        <Route path="transcripts/:sessionId" element={<TranscriptReview />} />
        <Route path="tests" element={<ClientTests client={client} />} />
        <Route path="test-report" element={<TestReportDoc client={client} />} />
        <Route path="notes" element={<ClientNotes client={client} />} />
        <Route path="reports" element={<ClientReports client={client} />} />
        <Route path="*" element={<Placeholder title="Not found" />} />
      </Routes>
    </div>
  )
}
