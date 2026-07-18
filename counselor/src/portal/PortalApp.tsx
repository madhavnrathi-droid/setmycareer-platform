// The client portal as a self-contained app, mounted at /portal/* from the root
// router. It owns its own routes, its own chrome (PortalShell) and its own auth
// gate (an account in the portal store). Signed-out visitors land on the
// marketplace sign-up; the call room is full-screen, outside the shell.

import { Routes, Route, Navigate, Outlet } from "react-router-dom"
import { PauseCircle, LifeBuoy } from "lucide-react"
import { CallRoom } from "@/screens/CallRoom"
import { LogoMark } from "@/components/brand/Logo"
import { PortalAppShell } from "./PortalAppShell"
import { usePortalAccount, signOut, usePortalCloudSync } from "./portal-store"
import { useAccountState } from "@/lib/account-state"
import { PortalAuth } from "./screens/PortalAuth"
import { PortalHome } from "./screens/PortalHome"
import { PortalReport } from "./screens/PortalReport"
import { PortalResultsSummary } from "./screens/PortalResultsSummary"
import { PortalReports } from "./screens/PortalReports"
import { PortalTestReport } from "./screens/PortalTestReport"
import { PortalSessions } from "./screens/PortalSessions"
import { PortalMessages } from "./screens/PortalMessages"
import { PortalAssessments } from "./screens/PortalAssessments"
import { TestRunner } from "./screens/TestRunner"
import { PortalTherapy } from "./screens/PortalTherapy"
import { PortalBilling } from "./screens/PortalBilling"
import { PortalAccount } from "./screens/PortalAccount"
import { PortalServices } from "./screens/PortalServices"
import { PortalProduct } from "./screens/PortalProduct"
import { PortalJourney } from "./screens/PortalJourney"
import { PortalResources } from "./screens/PortalResources"
import { PortalTerminal } from "./screens/PortalTerminal"
import { PortalVoice } from "./screens/PortalVoice"

/** Signed-out → marketplace sign-up; signed-in → home. */
function PortalEntry() {
  const account = usePortalAccount()
  return account ? <Navigate to="/portal/home" replace /> : <PortalAuth />
}

/** A polite, full-screen hold shown when an admin has paused or closed the
 *  account. Live: the moment the admin reactivates, this clears. */
function PortalHold({ state, reason }: { state: "paused" | "archived"; reason?: string }) {
  const paused = state === "paused"
  return (
    <div className="grid min-h-svh place-items-center bg-canvas px-6">
      <div className="w-full max-w-[420px] text-center">
        <LogoMark size={34} className="mx-auto text-foreground" />
        <div className="mx-auto mt-6 grid size-12 place-items-center rounded-2xl bg-warn-50 text-warn-600"><PauseCircle className="size-6" /></div>
        <h1 className="mt-4 font-display text-[22px] font-semibold tracking-tight">{paused ? "Your workspace is on hold" : "Your account is closed"}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {paused
            ? "We've temporarily paused your SetMyCareer workspace. Your counsellor or our support team can lift this whenever you're ready — nothing has been lost."
            : "Thanks for being part of SetMyCareer. Your account has been closed; reach out any time if you'd like to reopen it."}
        </p>
        {reason && <p className="mt-3 rounded-xl bg-secondary/60 px-4 py-2.5 text-[12.5px] text-foreground">{reason}</p>}
        <div className="mt-6 flex items-center justify-center gap-2.5">
          <a href="mailto:care@setmycareer.com" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90"><LifeBuoy className="size-4" /> Contact support</a>
          <button onClick={signOut} className="rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary">Sign out</button>
        </div>
      </div>
    </div>
  )
}

/** Gate the shell behind an account; bounce to the front door otherwise. Also
 *  enforces the admin's live account-state (pause / archive). */
function PortalGuard() {
  const account = usePortalAccount()
  const { state, reason } = useAccountState(account?.clientId ?? "")
  // cloud wallet + server-recorded (marketing-site) purchases → grants, once
  usePortalCloudSync(account?.clientId)
  if (!account) return <Navigate to="/portal" replace />
  if (state !== "active") return <PortalHold state={state} reason={reason} />
  return <Outlet />
}

export function PortalApp() {
  return (
    <Routes>
      <Route index element={<PortalEntry />} />
      <Route path="call/:clientId" element={<CallRoom />} />
      <Route element={<PortalGuard />}>
        <Route path="voice" element={<PortalVoice />} />
        {/* test-taking is a full-screen, distraction-free room — no shell, no AI bar */}
        <Route path="assessments/:testId" element={<TestRunner />} />
        <Route element={<PortalAppShell />}>
          <Route path="home" element={<PortalHome />} />
          <Route path="reports" element={<PortalReports />} />
          <Route path="reports/career" element={<PortalReport />} />
          <Route path="reports/results" element={<PortalResultsSummary />} />
          <Route path="reports/test/:testId" element={<PortalTestReport />} />
          <Route path="report" element={<Navigate to="/portal/reports" replace />} />
          <Route path="sessions" element={<PortalSessions />} />
          <Route path="messages" element={<PortalMessages />} />
          <Route path="assessments" element={<PortalAssessments />} />
          <Route path="services" element={<PortalServices />} />
          <Route path="services/:productId" element={<PortalProduct />} />
          <Route path="journey" element={<PortalJourney />} />
          <Route path="resources" element={<PortalResources />} />
          <Route path="terminal" element={<PortalTerminal />} />
          <Route path="therapy" element={<PortalTherapy />} />
          <Route path="billing" element={<PortalBilling />} />
          <Route path="account" element={<PortalAccount />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  )
}
