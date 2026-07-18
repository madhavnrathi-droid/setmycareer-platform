import { useState, useEffect } from "react"
import { Outlet, useLocation, Navigate } from "react-router-dom"
import { homeForRole } from "@/lib/login"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { CommandPalette } from "./CommandPalette"
import { CompassBar } from "@/components/compass/CompassBar"
import { RecordingProvider } from "@/lib/recording"
import { RecordOverlay } from "@/components/recording/RecordOverlay"
import { ConnectMeetingDialog } from "@/components/recording/ConnectMeetingDialog"
import { useSession } from "@/lib/auth-store"
import { CounsellorGate } from "./CounsellorGate"
import { CounsellorAgreement, counsellorAgreementAccepted } from "./CounsellorAgreement"

export function AppShell() {
  // service-agreement gate: counsellors confirm their profile + accept the
  // T&C/confidentiality/conduct terms before offering services
  const [agreed, setAgreed] = useState(() => counsellorAgreementAccepted())
  const { pathname } = useLocation()
  // Gate the counsellor console behind a live navigator sign-in. AppShell wraps
  // only the "/" console routes (portal + admin have their own shells), so this
  // never touches /portal/* or /admin/*. Any existing session passes through;
  // a counsellor session additionally unlocks the live caseload on the dashboard.
  const session = useSession()
  const [navCollapsed, setNavCollapsed] = useState(false)   // existing desktop collapse — unchanged
  const [mobileNavOpen, setMobileNavOpen] = useState(false) // <lg off-canvas drawer
  // the Assistant is an immersive full-bleed surface (its own rail + composer);
  // it opts out of the standard max-width padded content wrapper.
  const fullBleed = pathname === "/assistant"
  // close the mobile drawer on route change
  useEffect(() => setMobileNavOpen(false), [pathname])
  // close the mobile drawer on Escape
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileNavOpen])
  // Gate AFTER hooks so hook order stays stable across renders.
  if (!session) return <CounsellorGate />
  // a signed-in non-counsellor (client/admin) landing on "/" → their own app.
  if (session.role !== "counsellor") return <Navigate to={homeForRole(session.role)} replace />
  return (
    <RecordingProvider>
      {/* service agreement — no client work until the counsellor accepts */}
      {!agreed && <CounsellorAgreement onDone={() => setAgreed(true)} />}
      <div className="flex min-h-svh bg-canvas">
        <Sidebar
          collapsed={navCollapsed}
          onCollapse={() => setNavCollapsed(true)}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        {mobileNavOpen && (
          <div
            aria-hidden
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            navCollapsed={navCollapsed}
            onExpandNav={() => setNavCollapsed(false)}
            onOpenNav={() => setMobileNavOpen(true)}
          />
          <main className="flex-1">
            <div className={fullBleed ? "h-[calc(100svh-4rem)]" : "mx-auto w-full max-w-[1320px] px-5 py-6 pb-28 sm:px-6"}>
              <Outlet />
            </div>
          </main>
        </div>
        <CommandPalette />
        <CompassBar />
        {/* global, persistent recording surfaces (survive navigation) */}
        <RecordOverlay />
        <ConnectMeetingDialog />
      </div>
    </RecordingProvider>
  )
}
