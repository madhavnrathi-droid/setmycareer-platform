// Client portal topbar — same height, hairline border and frosted backdrop as
// the counsellor console topbar. Left: a clear page title (NN/g: always show
// where you are). Right: a live credits pill and the persistent primary action.

import { useLocation, useNavigate } from "react-router-dom"
import { CalendarCheck, Sparkles, Plus, CalendarPlus, PanelLeft, Menu } from "lucide-react"
import { usePortalAccount } from "./portal-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// longest-prefix wins, so sub-routes (reports/test/:id) resolve sensibly
const TITLES: [string, string][] = [
  ["/portal/home", "Home"],
  ["/portal/therapy", "Compass"],
  ["/portal/reports/test", "Report"],
  ["/portal/reports/career", "Career report"],
  ["/portal/reports", "Reports"],
  ["/portal/sessions", "Sessions"],
  ["/portal/messages", "Messages"],
  ["/portal/assessments/", "Assessment"],
  ["/portal/assessments", "Assessments"],
  ["/portal/services", "Services"],
  ["/portal/journey", "My journey"],
  ["/portal/billing", "Package & credits"],
  ["/portal/terminal", "Terminal"],
  ["/portal/resources", "Resources"],
  ["/portal/voice", "Voice session"],
  ["/portal/account", "Account"],
]
const titleFor = (path: string): string => {
  let best = "Home"
  let bestLen = -1
  for (const [prefix, label] of TITLES) {
    if (path.startsWith(prefix) && prefix.length > bestLen) { best = label; bestLen = prefix.length }
  }
  return best
}

export function PortalTopbar({ navCollapsed, onExpandNav, onOpenNav }: {
  navCollapsed?: boolean
  onExpandNav?: () => void
  /** open the mobile (<lg) off-canvas nav drawer */
  onOpenNav?: () => void
}) {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const account = usePortalAccount()
  const title = titleFor(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-8">
      {/* mobile hamburger — opens the off-canvas drawer; hidden at lg+ */}
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-2 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="size-[18px] stroke-[1.5]" />
      </button>
      {navCollapsed && (
        <button
          onClick={onExpandNav}
          aria-label="Expand navigation"
          className="-ml-2 hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:grid"
        >
          <PanelLeft className="size-[18px] stroke-[1.5]" />
        </button>
      )}
      <h1 className="font-display text-[18px] font-medium tracking-tight text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {account && (
          <TooltipProvider delayDuration={200}>
            <div className="hidden items-center sm:flex">
              {/* balance — sessions + Career Credits, with a top-up + tacked on the end */}
              <div className="flex h-8 items-center gap-2.5 rounded-l-full border border-r-0 border-border bg-card pl-3 pr-2.5 text-[12px] font-medium text-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarCheck className="size-3.5 stroke-[1.75] text-brand-600" />
                      <span className="tabular-nums">{account.credits.sessions}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Counselling sessions left</TooltipContent>
                </Tooltip>
                <span aria-hidden className="h-3.5 w-px bg-border" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3.5 stroke-[1.75] text-mind-500" />
                      <span className="tabular-nums">{(account.credits.careerCredits ?? 0) + (account.credits.aiMinutes ?? 0)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Career Credits (AI Compass) left</TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => nav("/portal/billing")}
                    aria-label="Top up credits"
                    className="grid h-8 w-8 place-items-center rounded-r-full border border-border bg-card text-mind-600 transition-colors hover:bg-mind-50 hover:text-mind-700"
                  >
                    <Plus className="size-4 stroke-[2.25]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Top up sessions &amp; credits</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
        <button
          onClick={() => nav("/portal/sessions")}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 h-8 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
        >
          <CalendarPlus className="size-4 stroke-[1.75]" /> Book session
        </button>
      </div>
    </header>
  )
}
