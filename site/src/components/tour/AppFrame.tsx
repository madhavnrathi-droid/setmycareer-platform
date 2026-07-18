import type { ReactNode } from "react"

/* Shared full-frame app chrome for the tour demos — the REAL product shells,
   recreated as DOM so every demo fills the whole stage like a genuine screen
   (no floating cards, no dead space). Two frames:
   — PortalFrame: the client portal (matches the real portal: left sidebar with
     Home…Plan & credits, user chip, topbar with the page title).
   — ConsoleFrame: the counsellor console (Overview…Settings, navigator chip).
   Sidebars hide on very small stages; the content slot is a relative, clipped
   box the demo animates inside. Chrome is static — the motion lives in the
   demo content, exactly like the real app. */

const PORTAL_NAV = ["Home", "AI guide", "Reports", "Sessions", "Messages", "Assessments", "My journey", "Services", "Plan & credits"]
const CONSOLE_NAV = ["Overview", "Clients", "Calendar", "Reports", "Transcripts", "Messages", "Library", "Assistant"]

function Mark() {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-[6px] bg-ink">
      <span className="size-1.5 rounded-full bg-paper-pure" />
    </span>
  )
}

function Frame({
  nav, activeItem, brandNote, user, userSub, title, chips, children,
}: {
  nav: string[]; activeItem: string; brandNote?: string
  user: string; userSub: string
  title: string; chips?: ReactNode; children: ReactNode
}) {
  const initials = user.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className="flex h-full w-full bg-paper text-left">
      {/* ── sidebar (hidden on tiny stages) ── */}
      <aside className="hidden w-[148px] shrink-0 flex-col border-r border-line bg-paper-pure px-2.5 py-3 sm:flex md:w-[164px]">
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <Mark />
          <span className="truncate text-[11px] font-semibold tracking-tight text-ink">Setmycareer</span>
        </div>
        <nav className="flex flex-1 flex-col gap-[3px]">
          {nav.map((n) => {
            const on = n === activeItem
            return (
              <span key={n} className={`relative truncate rounded-[7px] px-2 py-[5px] text-[10.5px] ${on ? "bg-white font-medium text-ink shadow-[0_1px_4px_rgba(11,11,11,0.07)]" : "text-ink-60"}`}>
                {on && <span className="absolute inset-y-[6px] left-0 w-[2px] rounded-full bg-growth" />}
                <span className={on ? "pl-1" : ""}>{n}</span>
              </span>
            )
          })}
        </nav>
        <div className="mt-2 flex items-center gap-2 border-t border-line px-1 pt-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-10 text-[8.5px] font-semibold text-ink-60">{initials}</span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-medium leading-tight text-ink">{user}</span>
            <span className="block truncate text-[8.5px] leading-tight text-ink-40">{userSub}</span>
          </span>
        </div>
        {brandNote && <span className="mono mt-2 px-1 text-[7.5px] uppercase tracking-[0.12em] text-ink-20">{brandNote}</span>}
      </aside>

      {/* ── main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-paper-pure px-4 py-2.5">
          <span className="truncate text-[13px] font-semibold tracking-tight text-ink">{title}</span>
          <span className="flex shrink-0 items-center gap-2">{chips}</span>
        </header>
        {/* the demo canvas — fills everything left */}
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

/** The client portal shell (Arjun's seat). */
export function PortalFrame({ activeItem, title, chips, children }: { activeItem: string; title: string; chips?: ReactNode; children: ReactNode }) {
  return (
    <Frame nav={PORTAL_NAV} activeItem={activeItem} user="Arjun Menon" userSub="Explore plan" title={title} chips={chips}>
      {children}
    </Frame>
  )
}

/** The counsellor console shell (the practice seat). */
export function ConsoleFrame({ activeItem, title, chips, children }: { activeItem: string; title: string; chips?: ReactNode; children: ReactNode }) {
  return (
    <Frame nav={CONSOLE_NAV} activeItem={activeItem} user="Dr. Meera Sharma" userSub="Career navigator" title={title} chips={chips}>
      {children}
    </Frame>
  )
}

/** a tiny topbar chip for the frame header */
export function FrameChip({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-[3px] text-[9.5px] font-medium ${accent ? "border-transparent bg-growth text-paper-pure" : "border-line bg-white text-ink-60"}`}>
      {children}
    </span>
  )
}
