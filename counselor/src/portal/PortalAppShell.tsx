// The client portal shell — same composition as the counsellor AppShell: a
// sticky sidebar, a frosted topbar, a max-width padded content well with room
// for the floating bar, and the client Compass docked bottom-centre.

import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { usePortalAccount, isPortalRevoked, signOut } from "./portal-store"
import { PortalSidebar } from "./PortalSidebar"
import { PortalTopbar } from "./PortalTopbar"
import { PortalCompass } from "./PortalCompass"
import { PortalTour } from "./onboarding/PortalTour"
import { IncomingCall } from "./IncomingCall"

export function PortalAppShell() {
  // Admin access control: a revoked client is signed out and blocked here.
  const account = usePortalAccount()
  const revoked = isPortalRevoked(account?.clientId)
  useEffect(() => { if (revoked) signOut() }, [revoked])
  // Desktop (lg+) collapse/expand of the sticky column — unchanged behaviour.
  const [navCollapsed, setNavCollapsed] = useState(false)
  // Mobile (<lg) off-canvas drawer — additive, never affects layout at lg+.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer on route change.
  useEffect(() => setMobileNavOpen(false), [pathname])

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileNavOpen])

  return (
    // portal-type = the client dashboard's thin-but-readable type system (index.css)
    <div className="portal-type flex min-h-svh bg-canvas">
      <PortalSidebar
        collapsed={navCollapsed}
        onCollapse={() => setNavCollapsed(true)}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      {/* mobile drawer backdrop — only below lg, only when open */}
      {mobileNavOpen && (
        <div
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar
          navCollapsed={navCollapsed}
          onExpandNav={() => setNavCollapsed(false)}
          onOpenNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1360px] px-4 py-6 pb-28 sm:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <PortalCompass />
      <PortalTour />
      <IncomingCall />
    </div>
  )
}
