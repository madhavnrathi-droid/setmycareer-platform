import { Link, useLocation } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Fragment } from "react"
import { getSession } from "@/lib/mock"
import { useCaseloadClients } from "@/lib/caseload"

const LABELS: Record<string, string> = {
  clients: "Clients", calendar: "Calendar", reports: "Reports", transcripts: "Transcripts",
  settings: "Settings", overview: "Overview", sessions: "Sessions", tests: "Tests",
  notes: "Notes", prescriptions: "Prescriptions", new: "New report", share: "Share",
}

/** Breadcrumb = URL segments 1:1; last is current (aria-current). Resolves client
 *  and session ids to human names. */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split("/").filter(Boolean)
  const { clients } = useCaseloadClients() // resolve live client ids → names

  const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/" }]
  let acc = ""
  for (const p of parts) {
    acc += `/${p}`
    const liveName = clients.find((c) => c.id === p)?.name
    const session = getSession(p)
    crumbs.push({ label: liveName ?? session?.summary?.slice(0, 18) ?? LABELS[p] ?? p, href: acc })
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={c.href}>
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 stroke-[1.5] text-ink-300" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">{c.label}</span>
              ) : (
                <Link to={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
