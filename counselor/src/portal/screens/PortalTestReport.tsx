// The Test report viewer — renders the FINAL engine output for whichever test
// was taken:
//   • Personality → 6-factor radar + banded reads + the 18 facets with their
//     workbook interpretations.
//   • Interests   → the two decision graphs: career-level ranking (what could
//     sustain a career, with categories) and raw attraction (what pulls).
//   • Third test  → DBDA section grades (students) or CCPA competency
//     composites (professionals), from the stored battery payload.
// De-boxed: a reading column with type hierarchy and hairline dividers.

import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, ShieldCheck, Briefcase, Sparkles, Mic, Save } from "lucide-react"
import { Radar } from "@/components/custom/Radar"
import { useGsap, revealChildren } from "@/lib/gsap"
import { getTestFor } from "../tests/catalog"
import { useTestResult } from "../tests/results-store"
import { readoutFor } from "../tests/interpretations"
import { uploadTestReport } from "../tests/test-report-upload"
import { usePortalAccount, accountTrack } from "../portal-store"
import { scorePfin } from "@/guest/personality-final"
import { scoreIfin } from "@/guest/interest-final"
import { cn } from "@/lib/utils"

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })

// the final engines band on 5 levels — tone by direction
const bandTone = (b: string | null | undefined) =>
  /Very pronounced|Pronounced|Very strong|Strong/.test(b ?? "") ? "text-well-600"
    : /Much less|Less|Very low|Low/.test(b ?? "") ? "text-ink-400"
    : "text-warn-600"
const barTone = (v: number) => (v >= 65 ? "bg-well-500" : v <= 35 ? "bg-ink-300" : "bg-brand-500")
const catTone = (c: string | null | undefined) =>
  /Strongly Supported|Supported/.test(c ?? "") ? "bg-well-500" : /Not Currently/.test(c ?? "") ? "bg-ink-300" : "bg-brand-500"

function Bar({ label, value, sub, tone = "bg-brand-500" }: { label: string; value: number; sub?: string; tone?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{sub ?? value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

interface DbdaPayload { kind: "dbda"; sections: { key: string; label: string; raw: number; max: number; attempted: number; grade: string; band: string }[] }
interface CcpaPayload { kind: "ccpa"; comps: { code: string; label: string; composite: number | null; band: string | null; sjt: number | null; fc: number | null; lik: number | null }[] }

export function PortalTestReport() {
  const { testId } = useParams()
  const account = usePortalAccount()
  const def = testId ? getTestFor(accountTrack(account), testId) : undefined
  const result = useTestResult(account?.clientId ?? "", testId ?? "")
  const root = useGsap((s) => revealChildren(s), [testId, result?.takenAt])
  const [saving, setSaving] = useState(false)

  if (!account || !def) return null
  if (!result) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">You haven't taken this yet</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Take {def.name} to see your results here.</p>
        <Link to={`/portal/assessments/${def.id}`} className="mt-5 inline-flex rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90">Take it now</Link>
      </div>
    )
  }

  const firstName = account.name.split(" ")[0]

  // Save this completed test as a report on the client's live SetMyCareer record
  // (so it appears for them AND their counsellor). Confirm-gated inside.
  const saveToProfile = async () => {
    setSaving(true)
    await uploadTestReport(account.clientId, account.name, def, result)
    setSaving(false)
  }

  // ── per-type rendered body ───────────────────────────────────────────────
  let body: ReactNode = null

  if (def.id === "sigma_personality" && result.answers.length) {
    const p = scorePfin(result.answers)
    const radarData = p.factors.map((f) => ({ axis: f.label.split(" ")[0], value: f.score ?? 0 }))
    const sorted = [...p.factors].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    body = (
      <>
        <div data-reveal className="grid gap-10 sm:grid-cols-[260px_1fr] sm:items-center">
          <div className="grid place-items-center"><Radar data={radarData} size={240} tone="brand" /></div>
          <div className="space-y-3.5">
            {sorted.map((f) => (
              <Bar key={f.label} label={f.label} value={f.score ?? 0} sub={`${f.band ?? "—"} · ${f.score ?? "—"}`} tone={barTone(f.score ?? 0)} />
            ))}
          </div>
        </div>
        <div className="my-10 h-px bg-border" />
        <div data-reveal className="space-y-9">
          <div>
            <h2 className="font-display text-[22px] font-semibold tracking-tight">What this says about you, {firstName}</h2>
            <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-muted-foreground">
              Six factors, each with three facets, on a 0–100 developmental scale — higher means more
              characteristic of you, not better. Each facet carries the workbook's own reading of what a
              pronounced score looks like day-to-day.
            </p>
          </div>
          {sorted.map((f) => (
            <div key={f.label} className="border-l-2 border-border pl-4">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">{f.label}</h3>
                <span className={cn("text-[12px] font-medium", bandTone(f.band))}>{f.band ?? "—"} · {f.score ?? "—"}</span>
              </div>
              <div className="mt-4 space-y-3">
                {f.subs.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium text-foreground">{s.label}</span>
                      <span className={cn("shrink-0 text-[11.5px] tabular-nums", bandTone(s.band))}>
                        {s.band ?? "—"} · {s.score ?? "—"}{s.lowConfidence ? " · read with care" : ""}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={cn("h-full rounded-full", barTone(s.score ?? 0))} style={{ width: `${s.score ?? 0}%` }} />
                    </div>
                    <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{s.interp}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    )
  } else if (def.id === "sigma_interest" && result.answers.length) {
    const r = scoreIfin(result.answers)
    const byCareer = [...r.clusters].filter((c) => c.career != null).sort((a, b) => (b.career ?? 0) - (a.career ?? 0))
    const byAttraction = [...r.clusters].filter((c) => c.attraction != null).sort((a, b) => (b.attraction ?? 0) - (a.attraction ?? 0))
    const hobbies = r.clusters.filter((c) => c.hcg != null && (c.hcg ?? 0) > 20).sort((a, b) => (b.hcg ?? 0) - (a.hcg ?? 0)).slice(0, 3)
    body = (
      <>
        <div data-reveal>
          <div className="mb-4 flex items-center gap-2"><Briefcase className="size-4 text-brand-600" /><h2 className="text-[15px] font-semibold text-foreground">Where interest could sustain a career</h2></div>
          <p className="mb-4 max-w-[68ch] text-[13px] text-muted-foreground">
            Career-level score = 50% willingness to do the real work repeatedly + 25% work-environment fit +
            25% job-characteristic fit. Sustained preference, not ability or guaranteed success.
          </p>
          <div className="space-y-3">
            {byCareer.slice(0, 10).map((c) => (
              <Bar key={c.label} label={c.label} value={c.career ?? 0} sub={`${c.career} · ${c.category ?? "—"}`} tone={catTone(c.category)} />
            ))}
          </div>
        </div>
        <div className="my-10 h-px bg-border" />
        <div data-reveal>
          <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-mind-600" /><h2 className="text-[15px] font-semibold text-foreground">What naturally attracts you</h2></div>
          <p className="mb-4 max-w-[68ch] text-[13px] text-muted-foreground">Attraction alone — what pulls you, before the work behind it is weighed.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {byAttraction.slice(0, 10).map((c) => (
              <Bar key={c.label} label={c.label} value={c.attraction ?? 0} sub={`${c.attraction} · ${c.attractionBand ?? "—"}`} tone={barTone(c.attraction ?? 0)} />
            ))}
          </div>
        </div>
        {hobbies.length > 0 && (
          <>
            <div className="my-10 h-px bg-border" />
            <div data-reveal>
              <h2 className="mb-2 text-[15px] font-semibold text-foreground">Loved — but maybe not the job</h2>
              <p className="mb-3 max-w-[64ch] text-[13px] text-muted-foreground">
                These attract you strongly, but your appetite for the day-to-day work behind them is much
                lower. Often best kept as serious hobbies — worth discussing with your counsellor.
              </p>
              <div className="flex flex-wrap gap-2">
                {hobbies.map((c) => (
                  <span key={c.label} className="rounded-full bg-secondary px-3 py-1.5 text-[12.5px] font-medium text-ink-700">
                    {c.label} · gap {c.hcg}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </>
    )
  } else if (result.variant === "dbda" || (result.payload as DbdaPayload | undefined)?.kind === "dbda") {
    const payload = result.payload as DbdaPayload
    body = (
      <div data-reveal className="space-y-3 sm:max-w-xl">
        <p className="max-w-[64ch] text-[13px] text-muted-foreground">
          Seven timed DBDA sections, graded A (highest) to J against your age and gender norm group.
          Spatial and Clerical are speed tests — most people do not finish them, by design.
        </p>
        {payload.sections.map((s) => (
          <Bar
            key={s.key} label={s.label} value={result.scores[s.key] ?? 0}
            sub={`Grade ${s.grade} · ${s.band} · ${s.raw}/${s.max}`}
            tone={barTone(result.scores[s.key] ?? 0)}
          />
        ))}
      </div>
    )
  } else if (result.variant === "ccpa" || (result.payload as CcpaPayload | undefined)?.kind === "ccpa") {
    const payload = result.payload as CcpaPayload
    const sorted = [...payload.comps].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))
    body = (
      <div data-reveal className="space-y-3 sm:max-w-xl">
        <p className="max-w-[64ch] text-[13px] text-muted-foreground">
          Twelve competencies, each measured three ways — situational judgement (40%), most/least choices
          (30%) and self-ratings (30%). Behavioural tendency, not technical skill; a lower score is a
          growth area, never a verdict.
        </p>
        {sorted.map((c) => (
          <Bar
            key={c.code} label={c.label} value={c.composite ?? 0}
            sub={`${c.composite ?? "—"} · ${c.band ?? "—"}`}
            tone={barTone(c.composite ?? 0)}
          />
        ))}
      </div>
    )
  } else {
    // fallback — flat stored scores against the def's factor list
    const ranked = def.factors.map((f) => ({ ...f, value: result.scores[f.key] ?? 0 })).sort((a, b) => b.value - a.value)
    body = (
      <div data-reveal className="space-y-3 sm:max-w-md">
        {ranked.map((f) => (
          <Bar key={f.key} label={f.label} value={f.value} sub={`${f.value}/100`} tone={barTone(f.value)} />
        ))}
      </div>
    )
  }

  return (
    <div ref={root} className="mx-auto max-w-3xl">
      <Link to="/portal/reports" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> All reports
      </Link>

      <div data-reveal>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Test report</p>
        <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[40px]">{def.name}</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-600">{def.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-well-600" /> {def.source}</span>
          <span>Taken {fmtDate(result.takenAt)}</span>
          {def.id === "aptitude" && <span>Overall · <span className="font-medium text-foreground">{result.overall}/100</span></span>}
        </div>
      </div>

      <div className="my-10 h-px bg-border" />
      {body}

      {/* What it means — computed from these scores by rule, so it says the same
          thing every time and never overstates what one instrument can show. */}
      {(() => {
        const read = readoutFor(result, (k) => def.factors.find((f) => f.key === k)?.label ?? k)
        return (
          <section data-reveal className="mt-10 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">What this is telling you</p>
            <p className="mt-2.5 max-w-[68ch] text-[14.5px] leading-relaxed text-foreground">{read.body}</p>
            {read.caveat && (
              <p className="mt-3 max-w-[68ch] border-t border-border pt-3 text-[12.5px] leading-relaxed text-ink-600">
                <span className="font-medium text-ink-700">Worth knowing — </span>{read.caveat}
              </p>
            )}
          </section>
        )
      })()}

      <div className="my-10 h-px bg-border" />

      <div data-reveal className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[42ch] text-[14px] text-ink-600">These results feed your full Career Intelligence Report — and Compass can explain any of the logic behind them.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={saveToProfile} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50">
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save to my profile"}
          </button>
          <Link to="/portal/voice?report=1" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary">
            <Mic className="size-3.5 text-mind-600" /> Discuss by voice
          </Link>
          <Link to="/portal/reports/career" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-700">
            Read your full report <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
