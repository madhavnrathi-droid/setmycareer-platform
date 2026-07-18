import type { NavigateFunction } from "react-router-dom"
import {
  Plus, UserSearch, Inbox, UserPlus,
  CalendarPlus, FileUp, Video, CalendarDays, Link2,
  FileUp as Import, FilterX, FilePlus2, LayoutTemplate, Printer,
  Check, StickyNote, Mic,
} from "lucide-react"
import { toast } from "sonner"
import { attention } from "@/lib/mock"

/* Live review-queue count, derived from data (honesty: never fake a number).
   The badge reflects the real awaiting-review pile rather than a static literal,
   so it always matches the actual queue. */
const reviewQueueCount = attention.filter((a) => a.kind === "awaiting_review").length

/* The registry stays decoupled from the recording hook: instead of importing
   it (which would tightly couple this data module to React state), recording
   actions dispatch a window CustomEvent. `RecordingProvider` listens and calls
   `start(...)` / opens the connect-meeting dialog. */
const fire = (name: string, detail?: unknown) =>
  window.dispatchEvent(new CustomEvent(name, detail !== undefined ? { detail } : undefined))

/* The Compass registry — the core UX logic, expressed as data.
   Each route contributes the handful of actions that are *genuinely* the most
   useful on that page (Rams: as few as needed, count varies per route).

   Built to be reused: the future client app supplies its own registry with the
   same Action shape. Resolution is data-driven via `getActions(pathname)` so the
   bar never hard-codes a screen. */

export type CompassContext = {
  /** Current route, e.g. "/clients/cl_tiffany/overview". */
  route: string
  /** Resolved client name when on a client route. */
  clientName?: string
  /** Resolved client id when on a client route. */
  clientId?: string
}

export type ActionRun = (nav: NavigateFunction, ctx: CompassContext) => void

export type CompassAction = {
  /** Stable id (used as React key + analytics). */
  id: string
  /** Monoline lucide icon (rendered at 1.5 stroke by the bar). */
  icon: React.ElementType
  /** Tooltip label. */
  label: string
  /** Optional keyboard hint shown in the tooltip (display-only). */
  shortcut?: string
  /** Optional live badge (e.g. review-queue count). */
  badge?: number
  /** Direct action — navigate, open a sheet, fire a toast. */
  run?: ActionRun
  /** Or a popover: returns the content rendered in a small frosted popover. */
  popover?: (ctx: CompassContext) => React.ReactNode
}

/* ---- popover bodies (plain render helpers — kept tiny; the bar's
   PopoverContent supplies the frosted chrome). They are deliberately NOT React
   components so this stays a pure data module with a single `getActions`
   export. ---- */

const popoverHeading = (text: string) => (
  <div className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300">
    {text}
  </div>
)

const popoverItem = (key: string, label: string, onClick: () => void, icon?: React.ReactNode) => (
  <button
    key={key}
    onClick={onClick}
    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-secondary"
  >
    {icon}
    {label}
  </button>
)

function renderTemplatesPopover(): React.ReactNode {
  const templates = ["Engagement Blueprint", "North Star Card", "Progress summary", "Session recap"]
  return (
    <div className="flex flex-col gap-1">
      {popoverHeading("Report templates")}
      {templates.map((t) =>
        // template choice happens for real inside the builder — take them there
        popoverItem(t, t, () => { window.location.href = "/reports/new" }, (
          <LayoutTemplate className="size-3.5 shrink-0 stroke-[1.5] text-ink-300" />
        )),
      )}
    </div>
  )
}

/* ---- shared actions (reused across routes) ---- */

const findClient: CompassAction = {
  id: "find-client",
  icon: UserSearch,
  label: "Find client",
  shortcut: "⌘K",
  run: (nav) => nav("/clients"),
}

const newClient: CompassAction = {
  id: "new-client",
  icon: UserPlus,
  label: "New client",
  run: (nav) => nav("/clients/new"),
}

const addNote: CompassAction = {
  id: "add-note",
  icon: StickyNote,
  label: "Add note",
  run: (nav, ctx) =>
    ctx.clientId ? nav(`/clients/${ctx.clientId}/notes`) : toast("Open a client first — notes live on their record."),
}

const exportReport: CompassAction = {
  id: "export-report",
  icon: FileUp,
  label: "Export report",
  run: (nav, ctx) =>
    nav(ctx.clientId ? `/reports/new?client=${ctx.clientId}` : "/reports/new"),
}

const schedule: CompassAction = {
  id: "schedule",
  icon: CalendarPlus,
  label: "Schedule",
  run: (nav) => nav("/calendar"),
}

/* Record a session for the current client — fires `compass:record-session`
   ({clientId}); RecordingProvider starts a client-scoped recording. */
const recordSession: CompassAction = {
  id: "record-session",
  icon: Mic,
  label: "Record session",
  run: (_nav, ctx) => fire("compass:record-session", { clientId: ctx.clientId, clientName: ctx.clientName }),
}

/* ---- the route → actions map (matched longest-prefix first) ---- */

type Rule = { test: (path: string) => boolean; actions: CompassAction[] }

const RULES: Rule[] = [
  // session detail / transcript review (most specific client sub-routes first)
  {
    test: (p) => /^\/clients\/[^/]+\/(sessions|transcripts)\//.test(p),
    actions: [
      {
        id: "approve-deltas",
        icon: Check,
        label: "Approve deltas",
        // approvals are per-delta, inline on the review page — point there honestly
        run: () => toast("Approve each change inline — the Approve buttons sit on the score deltas below."),
      },
      addNote,
      { ...exportReport, label: "Export" },
    ],
  },
  // client hub — the things a counselor does on a client
  {
    test: (p) => /^\/clients\/[^/]+/.test(p),
    actions: [
      schedule,
      recordSession,
      addNote,
      exportReport,
      {
        id: "join-meeting",
        icon: Video,
        label: "Join meeting",
        // the real Join buttons live on the client's live-session rows
        run: (nav, ctx) => nav(ctx.clientId ? `/clients/${ctx.clientId}` : "/calendar"),
      },
    ],
  },
  // clients list — manage the roster
  {
    test: (p) => p === "/clients" || p.startsWith("/clients?"),
    actions: [
      newClient,
      // filter/sort live as REAL controls on the Clients page itself — no
      // fake-success popovers here (the search box + mode chips do the work)
    ],
  },
  // calendar essentials
  {
    test: (p) => p.startsWith("/calendar"),
    actions: [
      { id: "new-event", icon: CalendarPlus, label: "New event", run: () => fire("compass:new-event") },
      { id: "today", icon: CalendarDays, label: "Today", shortcut: "T", run: (nav) => nav("/calendar") },
      { id: "connect-meeting", icon: Link2, label: "Connect meeting", run: () => fire("compass:connect-meeting") },
    ],
  },
  // transcripts — get audio in, triage
  {
    test: (p) => p.startsWith("/transcripts"),
    actions: [
      { id: "import-transcript", icon: Import, label: "Import transcript", run: () => toast("Transcripts come from recorded sessions — record live or connect a meeting to import one.") },
      { id: "needs-review", icon: FilterX, label: "Needs review", run: () => toast("Sessions awaiting client approval carry a review flag on their transcript rows.") },
    ],
  },
  // reports essentials
  {
    test: (p) => p === "/reports" || p.startsWith("/reports?"),
    actions: [
      { id: "new-report", icon: FilePlus2, label: "New report", run: (nav) => nav("/reports/new") },
      { id: "templates", icon: LayoutTemplate, label: "Templates", popover: () => renderTemplatesPopover() },
    ],
  },
  // report builder — keep it minimal
  {
    test: (p) => p.startsWith("/reports/new"),
    actions: [
      { id: "templates", icon: LayoutTemplate, label: "Templates", popover: () => renderTemplatesPopover() },
    ],
  },
  // methodology — read-mostly page, fewer buttons (demonstrates count decreasing)
  {
    test: (p) => p.startsWith("/methodology"),
    actions: [
      { id: "print-share", icon: Printer, label: "Print / share", shortcut: "⌘P", run: () => window.print() },
    ],
  },
  // settings — Ask only (no contextual actions)
  {
    test: (p) => p.startsWith("/settings"),
    actions: [],
  },
  // dashboard (root) — start work, jump to anyone, clear the review pile
  {
    test: (p) => p === "/",
    actions: [
      { id: "new-session", icon: Plus, label: "New session", shortcut: "N", run: () => fire("compass:new-session") },
      findClient,
      { id: "review-queue", icon: Inbox, label: "Review queue", badge: reviewQueueCount, run: (nav) => nav("/transcripts") },
    ],
  },
]

/** Resolve the contextual actions for a route. Longest/most-specific rule wins
 *  (RULES is ordered specific → general). Falls back to a sensible default. */
export function getActions(pathname: string): CompassAction[] {
  const rule = RULES.find((r) => r.test(pathname))
  if (rule) return rule.actions
  // unknown route: offer the universal "find client" escape hatch
  return [findClient]
}
