import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, Mic, UserPlus, PanelLeft, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Breadcrumbs } from "./Breadcrumbs"
import { useMe, signOut } from "@/lib/me"
import { useRecording } from "@/lib/recording"
import { RecordingPill } from "@/components/recording/RecordingPill"

export function Topbar({ onCommand, navCollapsed, onExpandNav, onOpenNav }: {
  onCommand?: () => void
  navCollapsed?: boolean
  onExpandNav?: () => void
  onOpenNav?: () => void
}) {
  const recording = useRecording()
  const me = useMe()
  const nav = useNavigate()
  const [newOpen, setNewOpen] = useState(false)
  // a short grace delay so moving the cursor from the trigger to the portaled
  // menu content doesn't close the menu mid-traverse
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openNow = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setNewOpen(true)
  }
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setNewOpen(false), 150)
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-8 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* mobile hamburger — opens the off-canvas drawer below lg */}
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-2 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="size-[18px] stroke-[1.5]" />
      </button>
      {/* desktop expand — only when the sidebar is collapsed, lg+ */}
      {navCollapsed && (
        <button
          onClick={onExpandNav}
          aria-label="Open navigation"
          className="-ml-2 hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
        >
          <PanelLeft className="size-[18px] stroke-[1.5]" />
        </button>
      )}
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onCommand ?? (() => window.dispatchEvent(new Event("smc:palette")))}
          className="hidden items-center gap-2 rounded-md border border-border px-2.5 h-8 text-[12.5px] text-muted-foreground transition-colors hover:bg-secondary md:flex"
        >
          <Search className="size-3.5 stroke-[1.5]" />
          <span>Search clients, sessions…</span>
          <kbd className="ml-2 rounded bg-secondary px-1 py-px text-[10px] font-medium">⌘K</kbd>
        </button>

        {/* "New" → hover/click for a menu: a recording session (starts immediately)
            or a new client (onboarding form). While recording, it becomes the live pill. */}
        {recording.status === "idle" ? (
          <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
            {/* modal={false}: a HOVER menu must not scroll-lock the page. Modal mode
                hides the scrollbar and pads the body to compensate, which shifts the
                layout a few px on open — that moved the trigger out from under the
                cursor, firing mouseleave→close→reopen in a loop (the "flashing"). */}
            <DropdownMenu open={newOpen} onOpenChange={setNewOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="size-4 stroke-[2]" /> New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end" sideOffset={4} className="w-56"
                onMouseEnter={openNow} onMouseLeave={closeSoon}
              >
                <DropdownMenuItem className="gap-2.5 py-2" onClick={() => { setNewOpen(false); recording.start() }}>
                  <Mic className="size-4 stroke-[1.5] text-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium">Recording / session</span>
                    <span className="text-[11px] text-muted-foreground">Starts recording now</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 py-2" onClick={() => { setNewOpen(false); nav("/clients/new") }}>
                  <UserPlus className="size-4 stroke-[1.5] text-foreground" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium">New client</span>
                    <span className="text-[11px] text-muted-foreground">Onboard a client</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <RecordingPill />
        )}

        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="grid size-8 place-items-center rounded-full bg-foreground text-[12px] font-medium text-background">
              {me.initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="text-[13px] font-medium">{me.name}</div>
              <div className="text-[11px] text-muted-foreground">{me.subtitle}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/settings")}>Profile & license</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
