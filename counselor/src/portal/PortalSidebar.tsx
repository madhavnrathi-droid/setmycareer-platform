// Client portal sidebar — mirrors the counsellor console's sidebar exactly
// (same ghost rows, 2px active indicator, white active pill + hairline shadow,
// type scale and spacing) so the two surfaces feel like one product. The nav
// items and the bottom profile block are client-flavoured.

import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutGrid, FileText, CalendarDays, MessageCircle, ClipboardList,
  Wallet, PanelLeftClose, LogOut, ChevronsUpDown, ShoppingBag, Footprints, X, Newspaper,
  TrendingUp, } from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/brand/Logo"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePortalAccount, signOut, useClientUnread, type PortalAccount } from "./portal-store"
import { usePortalCounsellor } from "./counsellors"
import { PLANS } from "./plans"

const item =
  "group relative flex items-center gap-3 rounded-md px-3 h-9 text-[13px] font-normal text-ink-600 transition-colors hover:bg-secondary"

function Indicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-500 transition-opacity",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  )
}

// Compass wears a compass NEEDLE — a hairline ring with a solid kite pointing
// north-east. The logomark is reserved for the brand lockup and the AI's own
// avatar in chat; in the nav it has to live in the same line-icon family as its
// neighbours. A four-point star was tried first and collapsed into a "+" at
// 17px; the canted kite is unmistakably a compass at any size.
function CompassGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88Z" fill="currentColor" />
    </svg>
  )
}

function Row({ to, icon: Icon, label, badge, end, onNavigate }: {
  to: string; icon: React.ElementType; label: string; badge?: number; end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) =>
      cn(item, isActive && "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(35,31,32,0.05)]")
    }>
      {({ isActive }) => (
        <>
          <Indicator active={isActive} />
          <Icon className="size-[17px] shrink-0 stroke-[1.5]" />
          <span className="flex-1 truncate">{label}</span>
          {badge ? (
            <span className="rounded-full bg-brand-500 px-1.5 text-[11px] font-medium tabular-nums text-white">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

// A quiet section heading — turns a flat list into scannable groups without
// adding a hard divider between every item.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
      {children}
    </p>
  )
}

function ProfileBlock({ account }: { account: PortalAccount }) {
  const nav = useNavigate()
  // Guard against a malformed/legacy account (missing plan or name) so a corrupt
  // local record degrades gracefully instead of blanking the whole portal shell.
  const plan = PLANS[account.plan] ?? PLANS.free
  const displayName = account.name?.trim() || account.email?.split("@")[0] || "You"
  const initials = displayName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "•"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card p-2 text-left outline-none transition-colors hover:bg-secondary">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-foreground">{displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{plan.name} plan</p>
        </div>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[212px]">
        <DropdownMenuLabel className="font-normal">
          <div className="text-[13px] font-medium">{displayName}</div>
          <div className="text-[11px] text-muted-foreground">{account.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => nav("/portal/account")}>Account &amp; profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav("/portal/billing")}>Plan &amp; credits</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => { signOut(); nav("/portal") }}>
          <LogOut className="mr-2 size-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PortalSidebar({ collapsed, onCollapse, open, onClose }: {
  collapsed?: boolean
  onCollapse?: () => void
  /** mobile (<lg) off-canvas drawer open state — ignored at lg+ where the column is static */
  open?: boolean
  /** close the mobile drawer (backdrop click, Escape, or nav link click) */
  onClose?: () => void
}) {
  const account = usePortalAccount()
  const unread = useClientUnread(account?.clientId ?? "", account?.counsellorId ?? null)
  const { counsellor } = usePortalCounsellor()
  if (!account || collapsed) return null

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
      {/* brand, top-left + collapse control */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <LogoMark size={22} className="text-foreground" />
        <span className="text-[13px] font-semibold tracking-tight text-foreground">Setmycareer</span>
        {/* desktop collapse — hidden in the mobile drawer (close via backdrop/Escape/nav) */}
        <button
          onClick={onCollapse}
          aria-label="Collapse navigation"
          className="ml-auto hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
        >
          <PanelLeftClose className="size-[18px] stroke-[1.5]" />
        </button>
        {/* mobile drawer close */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <X className="size-[18px] stroke-[1.5]" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        <Row to="/portal/home" end icon={LayoutGrid} label="Home" onNavigate={onClose} />
        <Row to="/portal/therapy" icon={CompassGlyph} label="Compass" onNavigate={onClose} />
        <Row to="/portal/sessions" icon={CalendarDays} label="Sessions" onNavigate={onClose} />
        <Row to="/portal/messages" icon={MessageCircle} label="Messages" badge={unread || undefined} onNavigate={onClose} />
        <Row to="/portal/assessments" icon={ClipboardList} label="Assessments" onNavigate={onClose} />
        <Row to="/portal/journey" icon={Footprints} label="My journey" onNavigate={onClose} />

        {/* Your results — the three surfaces that read the member's own data. Two
            new items would have taken the flat nav to thirteen; a labelled group
            keeps it scannable and says what these three have in common. */}
        <SectionLabel>Your results</SectionLabel>
        <Row to="/portal/reports" icon={FileText} label="Reports" onNavigate={onClose} />

        <SectionLabel>Explore</SectionLabel>
        <Row to="/portal/terminal" icon={TrendingUp} label="Terminal" onNavigate={onClose} />
        <Row to="/portal/resources" icon={Newspaper} label="Resources" onNavigate={onClose} />

        <div className="my-2 h-px bg-border" />
        <Row to="/portal/services" icon={ShoppingBag} label="Services" onNavigate={onClose} />
        <Row to="/portal/billing" icon={Wallet} label="Package & credits" onNavigate={onClose} />

        {/* your counsellor — quiet footer card linking to the thread */}
        {counsellor && (
          <NavLink
            to="/portal/messages"
            onClick={onClose}
            className="mt-auto flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
              {counsellor.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">Your counsellor</p>
              <p className="truncate text-[12.5px] font-medium text-foreground">{counsellor.name}</p>
            </div>
          </NavLink>
        )}
      </nav>

      {/* client profile, bottom (reference decks put the user here) */}
      <div className="border-t border-border p-3">
        <ProfileBlock account={account} />
      </div>
    </aside>
  )
}
