import { Link } from "react-router-dom"
import { Printer, ArrowLeft } from "lucide-react"
import type { Client } from "@/lib/types"
import {
  sigmaProfile, band, BAND_LABEL,
  type SigmaScaleItem, type SigmaJobGroup, type JobGroupTone,
} from "@/lib/sigma"
import { LogoMark } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* Sigma psychometric profile — print-optimized assessment document.
   Renders as its own clean white A4-ish page (max-w-[820px], centered). A
   screen-only action row offers Print/Save-as-PDF + a back link; a scoped
   @media print block hides the app chrome (sidebar, top bar, compass bar,
   client header + pill-nav, the action row) and tightens margins so the
   exported PDF reads like a professional report — restrained, medical. */

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" })

const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  html, body { background: #ffffff !important; }
  /* hide app chrome that lives outside this document */
  aside, header, [role="toolbar"][aria-label="Compass"],
  [data-print-hide] { display: none !important; }
  /* the client hub renders a sticky context header + pill-nav above the route;
     hide them so the page starts clean */
  [data-test-report] { box-shadow: none !important; }
  main, main > div { padding: 0 !important; max-width: none !important; }
  .sigma-doc { max-width: none !important; box-shadow: none !important; margin: 0 !important; }
}
`

// ── small print primitives ───────────────────────────────────────────────────

function Section({
  title, no, children,
}: { title: string; no: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <div className="flex items-baseline gap-2 border-b border-ink-200 pb-1.5">
        <span className="font-mono text-[11px] tabular-nums text-ink-300">{no}</span>
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const BAND_TEXT: Record<"low" | "moderate" | "high", string> = {
  low: "text-ink-500",
  moderate: "text-warn-600",
  high: "text-well-600",
}

function ScoreCell({ value, suffix }: { value: number; suffix: string }) {
  return (
    <span className="font-display font-light tabular-nums text-foreground">
      {value}
      <span className="text-[11px] text-ink-300">{suffix}</span>
    </span>
  )
}

// horizontal track used in the report tables
function Track({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "brand" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100 print:border print:border-ink-200">
      <div
        className={cn("h-full rounded-full", tone === "brand" ? "bg-brand-500" : "bg-ink-700")}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

function PercentileLine({ item, showCode }: { item: SigmaScaleItem; showCode?: boolean }) {
  const b = band(item.value, "percentile")
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 break-inside-avoid">
      <div className="flex min-w-0 items-center gap-1.5">
        {showCode && item.code && (
          <span className="shrink-0 font-mono text-[9px] text-ink-300">{item.code}</span>
        )}
        <span className="truncate text-[11.5px] text-ink-700">{item.label}</span>
      </div>
      <span className={cn("text-[11.5px] font-medium tabular-nums", BAND_TEXT[b])}>{item.value}</span>
      <div className="col-span-2">
        <Track value={item.value} max={99} tone={b === "high" ? "brand" : "ink"} />
      </div>
    </div>
  )
}

const JOB_TONE: Record<JobGroupTone, { dot: string; label: string }> = {
  similar: { dot: "bg-well-600", label: "Similar" },
  neutral: { dot: "bg-ink-300", label: "Neutral" },
  dissimilar: { dot: "bg-risk-500", label: "Dissimilar" },
}

function JobGroupLine({ g }: { g: SigmaJobGroup }) {
  const t = JOB_TONE[g.tone]
  return (
    <div className="flex items-center justify-between gap-3 break-inside-avoid border-b border-hairline py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full print:border print:border-ink-300", t.dot)} />
        <span className="truncate text-[11.5px] text-ink-700">{g.label}</span>
      </div>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.06em] text-ink-300">{t.label}</span>
    </div>
  )
}

// ── document ─────────────────────────────────────────────────────────────────

export function TestReportDoc({ client }: { client: Client }) {
  const p = sigmaProfile(client.id)
  const topAptitude = [...p.ability.aptitudes].sort((a, b) => b.score - a.score)[0]

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* sticky screen-only action row */}
      <div
        data-print-hide
        className="sticky top-16 z-10 -mx-8 mb-6 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-8 py-3 backdrop-blur"
      >
        <Link
          to={`/clients/${client.id}/tests`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" /> Back to tests
        </Link>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => window.print()}>
          <Printer className="size-3.5 stroke-[1.5]" /> Print / Save as PDF
        </Button>
      </div>

      <article
        data-test-report
        className="sigma-doc mx-auto w-full max-w-[820px] rounded-2xl bg-white p-8 text-foreground shadow-[var(--shadow-e2)] print:rounded-none print:p-0 print:shadow-none sm:p-10"
      >
        {/* branded header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
              <LogoMark size={20} />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-foreground">Setmycareer</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-300">Psychometric Profile</p>
            </div>
          </div>
          <div className="text-right text-[11px] leading-relaxed text-ink-500">
            <p className="font-mono tabular-nums">Career Test · {p.testId}</p>
            <p className="tabular-nums">{fmtDate(p.takenAt)}</p>
          </div>
        </div>

        {/* subject block */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
          <Field label="Candidate" value={client.name} />
          <Field label="Age" value={String(client.age)} />
          <Field label="Reference" value={client.headline} />
          <Field label="Battery" value="Personality · Ability · Interest" />
        </div>

        {/* ── Personality ── */}
        <Section no="01" title="Personality">
          <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{p.personality.takeaway}</p>
          <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {p.personality.dimensions.map((d) => (
              <div key={d.key} className="break-inside-avoid">
                <h3 className="text-[12px] font-semibold text-foreground">{d.label}</h3>
                <p className="mt-0.5 text-[10.5px] leading-snug text-ink-300">{d.summary}</p>
                <div className="mt-2 flex flex-col gap-2.5">
                  {d.subs.map((s) => {
                    const b = band(s.score, "personality")
                    const lean = b === "high" ? s.high.label : b === "low" ? s.low.label : "Balanced"
                    return (
                      <div key={s.key} className="break-inside-avoid">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-medium text-ink-700">{s.name}</span>
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-[10px] font-medium", BAND_TEXT[b])}>{lean}</span>
                            <ScoreCell value={s.score} suffix="/99" />
                          </div>
                        </div>
                        {/* center-origin bipolar track */}
                        <div className="relative mt-1 h-1.5">
                          <div className="absolute inset-0 rounded-full bg-ink-100 print:border print:border-ink-200" />
                          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink-300" />
                          <div
                            className={cn("absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white print:ring-0", b === "moderate" ? "bg-ink-300" : "bg-brand-500")}
                            style={{ left: `${(s.score / 99) * 100}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[9px] text-ink-300">
                          <span>{s.low.label}</span>
                          <span>{s.high.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Ability ── */}
        <Section no="02" title="Ability">
          <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{p.ability.takeaway}</p>
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-200 text-[9.5px] uppercase tracking-[0.08em] text-ink-300">
                <th className="py-1.5 pr-2 font-medium">Aptitude</th>
                <th className="px-2 py-1.5 font-medium">Definition</th>
                <th className="w-24 px-2 py-1.5 font-medium">Level</th>
                <th className="w-10 py-1.5 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {p.ability.aptitudes.map((a) => {
                const b = band(a.score, "ability")
                return (
                  <tr key={a.code} className="break-inside-avoid border-b border-hairline align-top">
                    <td className="py-2 pr-2">
                      <span className="font-mono text-[9px] text-ink-300">{a.code}</span>{" "}
                      <span className="text-[11.5px] font-medium text-foreground">{a.label}</span>
                    </td>
                    <td className="px-2 py-2 text-[11px] leading-snug text-ink-600">
                      {a.definition}
                      <span className="block text-[10px] text-ink-300">{a.examples}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Track value={a.score} max={10} tone={b === "high" ? "brand" : "ink"} />
                      </div>
                      <span className={cn("mt-1 block text-[9.5px] font-medium", BAND_TEXT[b])}>{BAND_LABEL.ability[b]}</span>
                    </td>
                    <td className="py-2 text-right">
                      <ScoreCell value={a.score} suffix="/10" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {topAptitude && (
            <p className="mt-2 text-[11px] italic leading-relaxed text-ink-500">
              {topAptitude.label} ({topAptitude.score}/10) is the standout aptitude and a natural anchor for role direction.
            </p>
          )}
        </Section>

        {/* ── Interest ── */}
        <Section no="03" title="Interest">
          <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{p.interest.takeaway}</p>

          <div className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="break-inside-avoid">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">Top work roles · percentile</h3>
              <div className="grid gap-2">
                {p.interest.workRoles.slice(0, 12).map((r) => (
                  <PercentileLine key={r.label} item={r} />
                ))}
              </div>
            </div>

            <div className="break-inside-avoid">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">Work styles · percentile</h3>
              <div className="grid gap-2">
                {p.interest.workStyles.map((s) => (
                  <PercentileLine key={s.label} item={s} />
                ))}
              </div>

              <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">Personal styles · percentile</h3>
              <div className="grid gap-2">
                {p.interest.personalStyles.map((s) => (
                  <PercentileLine key={s.label} item={s} showCode />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 break-inside-avoid">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">Job groups · similarity</h3>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {p.interest.jobGroups.map((g) => (
                <JobGroupLine key={g.label} g={g} />
              ))}
            </div>
          </div>
        </Section>

        {/* footer */}
        <footer className="mt-8 border-t border-ink-200 pt-3">
          <p className="text-[10px] leading-relaxed text-ink-300">
            Scores are illustrative and norm-referenced. This profile is a structured aid for discussion, not a diagnosis;
            interpretation should be carried out by a qualified counselor alongside interview and history.
          </p>
          <p className="mt-1.5 text-[10px] tabular-nums text-ink-300">
            Setmycareer · Career Test {p.testId} · {fmtDate(p.takenAt)} · {client.name}
          </p>
        </footer>
      </article>
    </>
  )
}

// Compact labelled field for the subject block (Candidate / Age / Reference / Battery).
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</p>
      <p className="mt-0.5 text-[12px] font-medium leading-snug text-foreground">{value}</p>
    </div>
  )
}
