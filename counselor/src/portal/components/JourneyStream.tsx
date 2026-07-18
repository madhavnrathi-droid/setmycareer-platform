// The journey stream — the cardiology-timeline treatment in SMC's language:
// one horizontal spine of dated widget cards built from the member's REAL
// record (tests taken with their highlight, sessions with status + Join,
// purchases branching in), lime accents only where something is live NOW.
// Every card links to the page it came from.

import { Link } from "react-router-dom"
import { ArrowUpRight, Video, Check, Clock } from "lucide-react"
import { usePortalAccount, useBookings, portalCallHref, accountTrack } from "../portal-store"
import { useTestResults } from "../tests/results-store"
import { testsFor } from "../tests/catalog"
import { IsoGlyph } from "./IsoGlyphs"
import { cn } from "@/lib/utils"

interface Ev {
  at: string
  kind: "test" | "session" | "purchase" | "upcoming"
  title: string
  summary: string
  to: string
  live?: boolean
  joinHref?: string
  glyph?: string
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })
const fmtT = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

export function JourneyStream() {
  const account = usePortalAccount()
  const bookings = useBookings(account?.clientId ?? "")
  const results = useTestResults(account?.clientId ?? "")
  if (!account) return null
  const TESTS = testsFor(accountTrack(account))

  const events: Ev[] = []
  for (const r of results) {
    const def = TESTS.find((t) => t.id === r.testId)
    const top = Object.entries(r.scores).sort((a, b) => b[1] - a[1])[0]
    const topLabel = def?.factors.find((f) => f.key === top?.[0])?.label ?? top?.[0]
    events.push({
      at: r.takenAt, kind: "test",
      title: def?.name ?? r.testId,
      summary: top ? `Standout: ${topLabel} · ${Math.round(top[1])}` : "Completed",
      to: `/portal/reports/test/${r.testId}`,
      glyph: def?.kind === "ccpa" ? "aptitude_ccpa" : def?.kind === "dbda" ? "aptitude_dbda" : r.testId,
    })
  }
  for (const b of bookings) {
    if (b.status === "canceled") continue
    const upcoming = (b.status === "requested" || b.status === "confirmed") && +new Date(b.at) > Date.now() - 60 * 60000
    events.push({
      at: b.at, kind: upcoming ? "upcoming" : "session",
      title: b.topic || "Counselling session",
      summary: upcoming
        ? `${fmt(b.at)} · ${fmtT(b.at)} · ${b.status === "confirmed" ? "confirmed" : "awaiting confirm"}`
        : `${b.actualMin ?? b.durationMin} min · ${(b.notes?.length ?? 0)} note${(b.notes?.length ?? 0) === 1 ? "" : "s"}${b.transcript ? " · transcript ready" : ""}`,
      to: "/portal/sessions",
      live: upcoming && b.status === "confirmed" && Math.abs(+new Date(b.at) - Date.now()) < 90 * 60000,
      joinHref: upcoming && b.status === "confirmed" ? portalCallHref(account.clientId) : undefined,
    })
  }
  for (const pur of account.purchases ?? []) {
    events.push({ at: pur.at, kind: "purchase", title: pur.label ?? pur.productId, summary: "Added to your programme", to: "/portal/billing" })
  }
  events.sort((a, b) => +new Date(a.at) - +new Date(b.at))
  if (events.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-600">Your record, in order</p>
        <p className="text-[11.5px] font-light text-ink-400"><span className="mr-1 inline-block size-2 rounded-full bg-[#d8e94f] align-middle" />lime = live now</p>
      </div>
      <div className="relative -mx-1 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className="flex min-w-max items-stretch gap-0 px-1">
          {events.map((e, i) => (
            <div key={i} className="flex items-stretch">
              {i > 0 && <span aria-hidden className="mt-[52px] h-px w-8 shrink-0 self-start bg-ink-200" />}
              <div className="flex w-[248px] shrink-0 flex-col">
                {/* date node on the spine */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border bg-card",
                    e.live ? "border-transparent bg-[#d8e94f] text-foreground" : e.kind === "upcoming" ? "border-dashed border-ink-300 text-ink-400" : "border-border text-ink-600",
                  )}>
                    {e.kind === "test" && e.glyph ? <IsoGlyph id={e.glyph} className="size-5" />
                      : e.kind === "upcoming" ? <Clock className="size-3.5" />
                      : e.kind === "purchase" ? <ArrowUpRight className="size-3.5" />
                      : <Check className="size-3.5" />}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.12em] text-ink-400">{fmt(e.at)} · {fmtT(e.at)}</span>
                </div>
                {/* widget card */}
                <Link
                  to={e.to}
                  className={cn(
                    "mt-2 flex flex-1 flex-col gap-1.5 rounded-2xl border p-3.5 transition-colors",
                    e.live ? "border-[#c9da3e] bg-[#f7fbdc]" : e.kind === "upcoming" ? "border-dashed border-ink-300 bg-card hover:border-ink-400" : "border-border bg-card hover:border-ink-300",
                  )}
                >
                  <p className="text-[13px] font-medium leading-snug text-foreground">{e.title}</p>
                  <p className="text-[11.5px] font-light leading-relaxed text-ink-600">{e.summary}</p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-[10.5px] font-medium text-ink-400">
                      {e.kind === "test" ? "Open report" : e.kind === "purchase" ? "Package & credits" : "Open sessions"} →
                    </span>
                    {e.joinHref && (
                      <span
                        role="link"
                        onClick={(ev) => { ev.preventDefault(); window.location.href = e.joinHref! }}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10.5px] font-medium text-background hover:opacity-90"
                      >
                        <Video className="size-3" /> Join now
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
