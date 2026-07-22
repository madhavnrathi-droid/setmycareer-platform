import { Routes, Route } from "react-router-dom"
import { AppearanceProvider } from "@/lib/appearance"
import { AppShell } from "@/components/shell/AppShell"
import { Overview } from "@/screens/Overview"
import { Clients } from "@/screens/Clients"
import { NewClient } from "@/screens/NewClient"
import { ClientHub } from "@/screens/ClientHub"
import { Calendar } from "@/screens/Calendar"
import { ReportsHub } from "@/screens/ReportsHub"
import { ReportBuilder } from "@/screens/ReportBuilder"
import { CareerReportDoc } from "@/screens/client/CareerReportDoc"
import { TranscriptsHub } from "@/screens/TranscriptsHub"
import { Library } from "@/screens/Library"
import { Terminal } from "@/screens/Terminal"
import { Methodology } from "@/screens/Methodology"
import { Assistant } from "@/screens/Assistant"
import { Settings } from "@/screens/Settings"
import { Placeholder } from "@/screens/Placeholder"
import { CallRoom } from "@/screens/CallRoom"
import { Messages } from "@/screens/Messages"
import { Offerings } from "@/screens/Offerings"
import { PortalApp } from "@/portal/PortalApp"
import { AdminApp } from "@/admin/AdminApp"
import GuestFlow from "@/guest/GuestFlow"
import ReadinessFlow from "@/guest/ReadinessFlow"

export default function App() {
  return (
    <AppearanceProvider>
    <Routes>
      {/* Client portal — a separate app + login at its own link (/portal). */}
      <Route path="/portal/*" element={<PortalApp />} />
      {/* Admin dashboard — a separate, role-gated app at its own link (/admin). */}
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/call" element={<CallRoom />} />
      <Route path="/call/:clientId" element={<CallRoom />} />
      {/* Shareable no-account assessment links (unique token per person). */}
      <Route path="/t/:token" element={<GuestFlow />} />
      {/* Shareable readiness links — parent CCRI / executive CDRA+ECCRI. */}
      <Route path="/r/:token" element={<ReadinessFlow />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<NewClient />} />
        <Route path="/clients/:clientId/*" element={<ClientHub />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/new" element={<ReportBuilder />} />
        <Route path="/reports/preview" element={<CareerReportDoc/>} />
        <Route path="/transcripts" element={<TranscriptsHub />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:clientId" element={<Messages />} />
        <Route path="/library" element={<Library />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/offerings" element={<Offerings />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title="Not found" note="That page doesn't exist." />} />
      </Route>
    </Routes>
    </AppearanceProvider>
  )
}
