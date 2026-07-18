import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutGrid, Users, CalendarDays, FileText, AudioLines, Settings, ChevronRight, BookOpen, Sparkles, PanelLeftClose, FolderOpen, MessageCircle, ShoppingBag, X,
  TrendingUp,
} from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/brand/Logo"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useCounsellorUnread } from "@/portal/portal-store"
import { useSession } from "@/lib/auth-store"
import { useNaviClients } from "@/lib/live-queries"

/* Reference-faithful left sidebar (REF-D): logomark top-left, ghost nav rows,
   active = white pill + 2px accent left indicator, a collapsible "Clients" group
   whose children hang off a 1px vertical nest line, live count badges. Thin. */

const item =
  "group relative flex items-center gap-3 rounded-md px-3 h-9 text-[13px] font-normal text-ink-600 transition-colors hover:bg-secondary"

const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}

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

function Row({ to, icon: Icon, label, badge, end, onNavigate }: {
  to: string; icon: React.ElementType; label: string; badge?: number; end?: boolean; onNavigate?: () => void
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
            <span className="rounded-full bg-secondary px-1.5 text-[11px] tabular-nums text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ collapsed, onCollapse, open, onClose }: {
  collapsed?: boolean
  onCollapse?: () => void
  open?: boolean
  onClose?: () => void
}) {
  const { pathname } = useLocation()
  const [clientsOpen, setClientsOpen] = useState(pathname.startsWith("/clients"))
  const session = useSession()
  const { data: caseload } = useNaviClients(session?.userId)
  // live caseload → recent clients + total, deduped by user_id (most-recent first)
  const { recent, total } = useMemo(() => {
    const rows = (caseload ?? []) as { user_id?: string | number; name?: string; service_date?: string }[]
    const byId = new Map<string, { id: string; name: string; initials: string; ts: number }>()
    for (const r of rows) {
      const id = String(r.user_id ?? "").trim()
      if (!id || id === "undefined") continue
      const name = r.name && r.name !== "null" ? r.name.trim() : `Client ${id}`
      const ts = r.service_date ? Date.parse(r.service_date) || 0 : 0
      const cur = byId.get(id)
      if (!cur) byId.set(id, { id, name, initials: initialsOf(name), ts })
      else if (ts > cur.ts) cur.ts = ts
    }
    const all = [...byId.values()].sort((a, b) => b.ts - a.ts)
    return { recent: all.slice(0, 6), total: all.length }
  }, [caseload])
  const unreadMessages = useCounsellorUnread(String(session?.userId ?? ""))

  if (collapsed) return null

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex h-svh w-[270px] flex-col border-r border-border bg-sidebar",
      "transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
      open ? "translate-x-0" : "-translate-x-full",
      "lg:sticky lg:top-0 lg:z-30 lg:w-[248px] lg:shrink-0 lg:translate-x-0 lg:self-start",
    )}>
      {/* logomark, top-left + collapse control */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <LogoMark size={22} className="text-foreground" />
        <span className="text-[12px] font-medium tracking-tight text-muted-foreground">
          Counselor Console
        </span>
        {/* desktop collapse — lg+ only */}
        <button
          onClick={onCollapse}
          aria-label="Collapse navigation"
          className="ml-auto hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
        >
          <PanelLeftClose className="size-[18px] stroke-[1.5]" />
        </button>
        {/* mobile drawer close — below lg */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <X className="size-[18px] stroke-[1.5]" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        <Row to="/" end icon={LayoutGrid} label="Dashboard" onNavigate={onClose} />
        <Row to="/assistant" icon={Sparkles} label="Assistant" onNavigate={onClose} />

        {/* Clients — collapsible, line-nested children (REF-D) */}
        <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
          <div className="flex items-center">
            <NavLink to="/clients" end onClick={onClose} className={({ isActive }) =>
              cn(item, "flex-1", isActive && "bg-card font-medium text-foreground")
            }>
              {({ isActive }) => (
                <>
                  <Indicator active={isActive} />
                  <Users className="size-[17px] shrink-0 stroke-[1.5]" />
                  <span className="flex-1 truncate">Clients</span>
                  {total > 0 && (
                    <span className="rounded-full bg-secondary px-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {total.toLocaleString("en-IN")}
                    </span>
                  )}
                </>
              )}
            </NavLink>
            <CollapsibleTrigger
              aria-label={clientsOpen ? "Collapse clients" : "Expand clients"}
              className="ml-0.5 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
            >
              <ChevronRight className={cn("size-4 stroke-[1.5] transition-transform", clientsOpen && "rotate-90")} />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-[collapsible-up_150ms] data-[state=open]:animate-[collapsible-down_150ms]">
            {/* the nest line */}
            <div className="ml-[22px] mt-0.5 flex flex-col border-l border-border pl-3">
              {recent.map((c) => (
                <NavLink key={c.id} to={`/clients/${c.id}`} onClick={onClose} className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-2 h-8 text-[12.5px] text-ink-500 transition-colors hover:bg-secondary",
                    isActive && "bg-card font-medium text-foreground",
                  )
                }>
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-medium text-muted-foreground">
                    {c.initials}
                  </span>
                  <span className="flex-1 truncate">{c.name}</span>
                </NavLink>
              ))}
              {recent.length === 0 && (
                <span className="px-2 h-8 flex items-center text-[12px] text-ink-300">No clients yet</span>
              )}
              <NavLink to="/clients" onClick={onClose} className="px-2 h-8 flex items-center text-[12px] text-muted-foreground hover:text-foreground">
                View all →
              </NavLink>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Row to="/calendar" icon={CalendarDays} label="Calendar" onNavigate={onClose} />
        <Row to="/reports" icon={FileText} label="Reports" onNavigate={onClose} />
        <Row to="/transcripts" icon={AudioLines} label="Transcripts" onNavigate={onClose} />
        <Row to="/messages" icon={MessageCircle} label="Messages" badge={unreadMessages || undefined} onNavigate={onClose} />
        <Row to="/library" icon={FolderOpen} label="Library" onNavigate={onClose} />
        <Row to="/terminal" icon={TrendingUp} label="Terminal" onNavigate={onClose} />

        <div className="my-2 h-px bg-border" />
        <Row to="/offerings" icon={ShoppingBag} label="What we offer" onNavigate={onClose} />
        <Row to="/methodology" icon={BookOpen} label="Methodology" onNavigate={onClose} />
        <Row to="/settings" icon={Settings} label="Settings" onNavigate={onClose} />
      </nav>
    </aside>
  )
}
