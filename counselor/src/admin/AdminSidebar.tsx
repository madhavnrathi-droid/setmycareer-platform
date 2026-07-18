// Admin sidebar — same ghost-row / active-pill pattern as the counsellor console,
// so the three surfaces (console, portal, admin) feel like one product. Admin nav
// covers the whole company: people, journeys, money, APIs and access.

import { NavLink } from "react-router-dom"
import {
  LayoutGrid, Users, UserCog, UserPlus, Route, FileText, CalendarDays,
  IndianRupee, Activity, ShieldCheck, Settings, LogOut, Calculator, TrendingUp, Sparkles, Ticket, X, Megaphone, Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/brand/Logo"
import { useNavigators } from "@/lib/live-queries"

const item =
  "group relative flex items-center gap-3 rounded-md px-3 h-9 text-[13px] font-normal text-ink-600 transition-colors hover:bg-secondary"

function Row({ to, icon: Icon, label, end, onNavigate, badge }: {
  to: string; icon: React.ElementType; label: string; end?: boolean; onNavigate?: () => void; badge?: number
}) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) =>
      cn(item, isActive && "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(35,31,32,0.05)]")
    }>
      {({ isActive }) => (
        <>
          <span aria-hidden className={cn("absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-500 transition-opacity", isActive ? "opacity-100" : "opacity-0")} />
          <Icon className="size-[17px] shrink-0 stroke-[1.5]" />
          <span className="flex-1 truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-600">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

// "Applications" row with a live count of counsellors not yet live (pending approval).
function ApplicationsRow({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useNavigators()
  const isOn = (v: unknown) => v === true || v === 1 || v === "1" || v === "true" || v === "Active"
  const pending = (data ?? []).filter((n) => !isOn(n.isActive)).length
  return <Row to="/admin/applications" icon={UserPlus} label="Applications" badge={pending} onNavigate={onNavigate} />
}

export function AdminSidebar({ onSignOut, open, onClose }: {
  onSignOut: () => void
  /** mobile (<lg) off-canvas drawer open state — ignored at lg+ where the column is static */
  open?: boolean
  /** close the mobile drawer (backdrop click, Escape, or nav link click) */
  onClose?: () => void
}) {
  return (
    <aside
      className={cn(
        // mobile: fixed off-canvas drawer, slides in over the backdrop
        "fixed inset-y-0 left-0 z-50 flex h-svh w-[270px] flex-col border-r border-border bg-sidebar",
        "transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
        open ? "translate-x-0" : "-translate-x-full",
        // lg+: revert to the original sticky 248px column — exactly as before
        "lg:sticky lg:top-0 lg:z-30 lg:w-[248px] lg:shrink-0 lg:translate-x-0 lg:self-start",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <LogoMark size={22} className="text-foreground" />
        <span className="text-[12px] font-medium tracking-tight text-muted-foreground">Admin · Mission Control</span>
        {/* mobile drawer close — hidden at lg+ (close via backdrop/Escape/nav) */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <X className="size-[18px] stroke-[1.5]" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        <Row to="/admin" end icon={LayoutGrid} label="Overview" onNavigate={onClose} />
        <Row to="/admin/assistant" icon={Sparkles} label="AI copilot" onNavigate={onClose} />
        <Row to="/admin/clients" icon={Users} label="Clients" onNavigate={onClose} />
        <Row to="/admin/counsellors" icon={UserCog} label="Counsellors" onNavigate={onClose} />
        <ApplicationsRow onNavigate={onClose} />
        <Row to="/admin/journeys" icon={Route} label="Journeys" onNavigate={onClose} />
        <Row to="/admin/growth" icon={TrendingUp} label="Growth & product" onNavigate={onClose} />
        <Row to="/admin/reports" icon={FileText} label="Reports & transcripts" onNavigate={onClose} />
        <Row to="/admin/sessions" icon={CalendarDays} label="Sessions" onNavigate={onClose} />
        <Row to="/admin/test-links" icon={Link2} label="Test links" onNavigate={onClose} />

        <div className="my-2 h-px bg-border" />
        <Row to="/admin/revenue" icon={IndianRupee} label="Revenue & subscriptions" onNavigate={onClose} />
        <Row to="/admin/commerce" icon={Ticket} label="Coupons & refunds" onNavigate={onClose} />
        <Row to="/admin/economics" icon={Calculator} label="Unit economics" onNavigate={onClose} />
        <Row to="/admin/marketing" icon={Megaphone} label="Marketing & spend" onNavigate={onClose} />
        <Row to="/admin/api" icon={Activity} label="API & usage" onNavigate={onClose} />

        <div className="my-2 h-px bg-border" />
        <Row to="/admin/access" icon={ShieldCheck} label="Access & roles" onNavigate={onClose} />
        <Row to="/admin/settings" icon={Settings} label="Settings" onNavigate={onClose} />
      </nav>

      <div className="border-t border-border p-3">
        <button onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <LogOut className="size-3.5" /> Sign out of admin
        </button>
      </div>
    </aside>
  )
}
