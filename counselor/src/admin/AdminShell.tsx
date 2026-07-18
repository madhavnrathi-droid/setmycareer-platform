// Admin shell — sidebar + frosted topbar + content well, matching the console.
import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Database, Menu } from "lucide-react"
import { AdminSidebar } from "./AdminSidebar"
import { AdminSearch } from "./parts/AdminSearch"
import { AdminAssistant } from "./AdminAssistant"

const TITLES: [string, string][] = [
  ["/admin/assistant", "AI copilot"],
  ["/admin/clients", "Clients"],
  ["/admin/counsellors", "Counsellors"],
  ["/admin/applications", "Expert applications"],
  ["/admin/journeys", "Journeys"],
  ["/admin/growth", "Growth & product"],
  ["/admin/reports", "Reports & transcripts"],
  ["/admin/sessions", "Sessions"],
  ["/admin/test-links", "Test links"],
  ["/admin/revenue", "Revenue & subscriptions"],
  ["/admin/commerce", "Coupons & refunds"],
  ["/admin/economics", "Unit economics"],
  ["/admin/marketing", "Marketing & spend"],
  ["/admin/api", "API & usage"],
  ["/admin/access", "Access & roles"],
  ["/admin/settings", "Settings"],
  ["/admin", "Overview"],
]
const titleFor = (p: string) => {
  let best = "Overview", len = -1
  for (const [pre, label] of TITLES) if (p.startsWith(pre) && pre.length > len) { best = label; len = pre.length }
  return best
}

export function AdminShell({ onSignOut }: { onSignOut: () => void }) {
  const { pathname } = useLocation()
  // Mobile (<lg) off-canvas drawer — additive, never affects layout at lg+.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    <div className="flex min-h-svh bg-canvas">
      <AdminSidebar onSignOut={onSignOut} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {/* mobile drawer backdrop — only below lg, only when open */}
      {mobileNavOpen && (
        <div
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur lg:px-8">
          {/* mobile hamburger — opens the off-canvas drawer; hidden at lg+ */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="-ml-2 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <Menu className="size-[18px] stroke-[1.5]" />
          </button>
          <h1 className="hidden shrink-0 font-display text-[18px] font-medium tracking-tight text-foreground sm:block">{titleFor(pathname)}</h1>
          <div className="flex flex-1 justify-center"><AdminSearch /></div>
          <span title="Roster, packages, counsellors and per-client records are live from the SetMyCareer production backend. Some company-wide financial roll-ups are still modelled." className="hidden shrink-0 items-center gap-1.5 rounded-full border border-well-200 bg-well-50 px-3 py-1.5 text-[11.5px] font-medium text-well-700 lg:inline-flex">
            <Database className="size-3.5" /> Live · SetMyCareer backend
          </span>
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1320px] px-6 py-6 pb-28">
            <Outlet />
          </div>
        </main>
      </div>
      <AdminAssistant />
    </div>
  )
}
