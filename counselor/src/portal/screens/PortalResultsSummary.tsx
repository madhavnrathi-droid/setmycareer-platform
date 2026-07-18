// Your results, together — the consolidated read across the whole battery.
//
// Deliberately scoped to MEASUREMENT only: every number here came out of a test
// the member sat. The counsellor's Career Intelligence Report is a separate
// document with a separate promise (it reads these against their subjects,
// circumstances and plans, after sessions) and lives under Reports on its own.
// Keeping the two apart is the honest split — this one is available the moment
// the battery is done, without waiting on anyone.

import { Link } from "react-router-dom"
import { ArrowLeft, Printer, ArrowRight, Sparkles } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { usePortalAccount, accountTrack } from "../portal-store"
import { useTestResults } from "../tests/results-store"
import { testsFor } from "../tests/catalog"
import { readoutFor, consolidatedReadout } from "../tests/interpretations"
import { IsoGlyph } from "../components/IsoGlyphs"
import { cn } from "@/lib/utils"

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })

/** A compact ranked bar list — the same read for every instrument. */
function ScoreBars({ rows }: { rows: { label: string; value: number }[] }) {
  const top = rows[0]?.value ?? 100
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-foreground">{r.label}</span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-500">{Math.round(r.value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", r.value >= 65 ? "bg-foreground" : "bg-ink-300")}
                style={{ width: `${Math.max(3, Math.round((r.value / Math.max(1, top)) * 100))}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function PortalResultsSummary() {
  const root = useGsap((s) => revealChildren(s))
  const account = usePortalAccount()
  const results = useTestResults(account?.clientId ?? "")
  if (!account) return null

  const TESTS = testsFor(accountTrack(account))
  const done = TESTS.filter((t) => results.some((r) => r.testId === t.id))
  const complete = done.length === TESTS.length

  const labelFor = (testId: string, key: string) =>
    TESTS.find((t) => t.id === testId)?.factors.find((f) => f.key === key)?.label ?? key

  const consolidated = complete ? consolidatedReadout(results, labelFor) : null
  const lastTaken = results.map((r) => r.takenAt).sort().slice(-1)[0]

  return (
    <div ref={root} className="mx-auto w-full max-w-[860px]">
      <Link to="/portal/reports" className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-foreground">
        <ArrowLeft className="size-4" /> Reports
      </Link>

      <header data-reveal className="mt-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Your measured results</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">
          Everything your tests measured
        </h1>
        <p className="mt-3 max-w-[62ch] text-[15px] font-light leading-relaxed text-ink-600">
          Every score you've produced, in one place, with a plain-language read of what the pattern shows.
          {lastTaken && <> Last updated {fmtDate(lastTaken)}.</>}
        </p>
      </header>

      {/* not finished yet — say exactly what's missing rather than showing a half-read */}
      {!complete && (
        <section data-reveal className="mt-8 rounded-2xl border border-dashed border-ink-300 p-6">
          <p className="text-[15px] font-medium text-foreground">
            {done.length} of {TESTS.length} tests complete
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-600">
            The consolidated read compares your instruments against each other, so it needs all {TESTS.length}. Finish the
            remaining {TESTS.length - done.length === 1 ? "test" : "tests"} and it appears here automatically — your
            individual results below are ready to read now.
          </p>
          <Link
            to="/portal/assessments"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
          >
            Go to assessments <ArrowRight className="size-3.5" />
          </Link>
        </section>
      )}

      {/* the consolidated read — the thing no single test can say */}
      {consolidated && (
        <section data-reveal className="mt-8 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-7">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Reading all three together</p>
          <h2 className="mt-2.5 max-w-[46ch] font-display text-[20px] font-semibold leading-snug tracking-tight sm:text-[23px]">
            {consolidated.headline}
          </h2>
          <div className="mt-4 flex flex-col gap-3.5">
            {consolidated.paragraphs.map((p, i) => (
              <p key={i} className="max-w-[68ch] text-[14.5px] leading-relaxed text-foreground">{p}</p>
            ))}
          </div>
          <p className="mt-5 max-w-[68ch] border-t border-border pt-4 text-[12.5px] leading-relaxed text-ink-600">
            <span className="font-medium text-ink-700">How this was written — </span>{consolidated.caveat}
          </p>
        </section>
      )}

      {/* per-instrument metrics + its own read-out */}
      <section className="mt-10 flex flex-col gap-8">
        {TESTS.map((t) => {
          const r = results.find((x) => x.testId === t.id)
          const glyph = t.kind === "ccpa" ? "aptitude_ccpa" : t.kind === "dbda" ? "aptitude_dbda" : t.id
          if (!r) {
            return (
              <article key={t.id} data-reveal className="rounded-2xl border border-dashed border-ink-300 p-5">
                <div className="flex items-center gap-3">
                  <span className="text-ink-400"><IsoGlyph id={glyph} className="size-8" /></span>
                  <div>
                    <p className="text-[15px] font-medium text-foreground">{t.name}</p>
                    <p className="text-[12.5px] text-ink-500">Not taken yet · ~{t.minutes} min</p>
                  </div>
                </div>
              </article>
            )
          }
          const rows = Object.entries(r.scores)
            .map(([k, v]) => ({ label: t.factors.find((f) => f.key === k)?.label ?? k, value: v }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
          const read = readoutFor(r, (k) => t.factors.find((f) => f.key === k)?.label ?? k)
          return (
            <article key={t.id} data-reveal className="rounded-2xl border border-border p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-ink-600"><IsoGlyph id={glyph} className="size-9" /></span>
                  <div>
                    <p className="text-[15.5px] font-medium text-foreground">{t.name}</p>
                    <p className="text-[12.5px] text-ink-500">Taken {fmtDate(r.takenAt)}</p>
                  </div>
                </div>
                <Link
                  to={`/portal/reports/test/${t.id}`}
                  className="rounded-full border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary"
                >
                  Full report
                </Link>
              </div>

              <ScoreBars rows={rows} />
              {Object.keys(r.scores).length > rows.length && (
                <p className="mt-2 text-[11.5px] text-ink-400">
                  Showing the {rows.length} highest of {Object.keys(r.scores).length} — the full set is in the report.
                </p>
              )}

              <p className="mt-4 max-w-[68ch] border-t border-border pt-3.5 text-[14px] leading-relaxed text-foreground">{read.body}</p>
              {read.caveat && (
                <p className="mt-2 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-600">{read.caveat}</p>
              )}
            </article>
          )
        })}
      </section>

      {/* where the counsellor's document lives — kept explicitly separate */}
      <section data-reveal className="mt-10 rounded-2xl border border-border p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">This isn't your final report</p>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-ink-700">
          What you're reading is the measurement layer — scores, and what they generally indicate. Your Career
          Intelligence Report is written by your counsellor after your sessions, reads these results against your
          subjects, circumstances and plans, and lands under Reports when they publish it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary"
          >
            <Printer className="size-3.5" /> Print / save as PDF
          </button>
          <Link
            to="/portal/therapy"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
          >
            <Sparkles className="size-3.5" /> Ask Compass about these results
          </Link>
        </div>
      </section>
    </div>
  )
}
