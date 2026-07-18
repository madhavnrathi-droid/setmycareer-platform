// Assessments — the instruments, presented like the cover stories they are.
// Every instrument is INCLUDED with the programme — nothing here is sold
// separately, so the only states are Begin / Read your report. Each card ends
// in a single meta+action line pinned to a shared baseline, so the three CTAs
// sit on one line across the row whatever the copy above them does.

import { Link } from "react-router-dom"
import { ArrowRight, Check, ShieldCheck } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { usePortalAccount, accountTrack } from "../portal-store"
import { testsFor } from "../tests/catalog"
import { useTestResults } from "../tests/results-store"
import { PackageGradient } from "../product/PackageGradient"

const READ: Record<string, string> = {
  sigma_personality: "Six factors, eighteen facets — how you usually work and learn, scored per the SetMyCareer workbook. No right answers.",
  sigma_interest: "Thirty-four interest clusters measured two ways — what attracts you and what you'd genuinely do — ranked at career level.",
  aptitude_dbda: "Seven timed DBDA sections — words, numbers, shapes and detail — graded A–J against your age and gender norm group.",
  aptitude_ccpa: "Twelve workplace competencies measured three ways — scenarios, forced choices and self-ratings. Behavioural, not IQ.",
}
const readFor = (t: { id: string; kind: string }) =>
  READ[t.kind === "dbda" ? "aptitude_dbda" : t.kind === "ccpa" ? "aptitude_ccpa" : t.id]

export function PortalAssessments() {
  const account = usePortalAccount()
  const results = useTestResults(account?.clientId ?? "")
  const root = useGsap((s) => revealChildren(s), [account?.clientId, results.length])
  if (!account) return null
  // the third card follows the member's track — ability battery for students,
  // Competency & Potential for working professionals. Same slot, automatic.
  const TESTS = testsFor(accountTrack(account))

  const resultFor = (id: string) => results.find((r) => r.testId === id)

  return (
    <div ref={root}>
      {/* masthead */}
      <div data-reveal className="border-b border-border pb-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">The instruments</p>
        <h1 className="mt-3 font-editorial text-[34px] font-light leading-[1.05] tracking-tight sm:text-[44px]">
          Measured properly,
          <br />
          once.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
          All three instruments come with your programme. Every result is scored with our own engines and
          feeds straight into your Career Intelligence Report. Each is taken a single time — so take it
          rested, honest, and unhurried.
        </p>
      </div>

      {/* the plates — three instruments, one line. Equal cards read as equal
          choices; they may be taken in any order. */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TESTS.map((t, idx) => {
          const res = resultFor(t.id)
          return (
            <article
              key={t.id}
              data-reveal
              className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card"
            >
              {/* metallic plate — one liquid-metal field per instrument, its
                  colours chosen to say what the test measures. The name and
                  promise live ON the plate, like the pricing cards. */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <PackageGradient offeringId={t.id} />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  <span className="font-mono text-[10px] tabular-nums text-white/55">{String(idx + 1).padStart(2, "0")}</span>
                  {res && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                      <Check className="size-2.5" /> Completed
                    </span>
                  )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                  <h2 className="font-editorial text-[24px] font-light leading-tight tracking-tight text-white">
                    {t.name.split("—")[0].trim()}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
                    ~{t.minutes} min · {t.itemCount ?? t.items.length} questions
                  </p>
                </div>
              </div>

              {/* editorial body */}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[12.5px] leading-relaxed text-ink-600">{readFor(t) ?? t.tagline}</p>

                {/* ONE bottom line — the one-take fact on the left, the action on
                    the right. mt-auto pins the row so all three cards' CTAs sit
                    on the same baseline whatever the copy above them does. */}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-600">
                    <ShieldCheck className="size-3 shrink-0 text-ink-300" />
                    <span className="truncate">
                      One take
                      {res && <> · taken {new Date(res.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
                    </span>
                  </p>
                  {res ? (
                    <Link
                      to={`/portal/reports/test/${t.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
                    >
                      Read report <ArrowRight className="size-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to={`/portal/assessments/${t.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90"
                    >
                      Begin <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p data-reveal className="mt-8 text-[11.5px] leading-relaxed text-ink-300">
        All four final instruments are scored by SetMyCareer's own engines; your third test follows your track automatically.
        Results are one-take so your report reflects a true first reading.
      </p>
    </div>
  )
}
