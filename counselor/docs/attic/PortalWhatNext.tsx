// What Next — a job-match product built entirely from the member's own tests +
// reports + the live Career Terminal market. Pick ONE target, then it reads like
// an Orion match card: a big FIT gauge (honest — the member's measured fit for
// the job FAMILY the target belongs to, via careerFitFor → real JCE data, never
// a fabricated per-career %), a pay-band rail, a 10-year demand sparkline and an
// AI-exposure read. Then the measured readings, then the six things only the
// member can answer, then the build list.

import { Link } from "react-router-dom"
import { ArrowRight, Check, CircleDashed, Target, RotateCcw, Lock } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import {
  Pane, Eyebrow, Chip, JobMatchCard, DemandSpark, type CareerViz,
} from "@/components/custom/ui-kit"
import {
  usePortalAccount, useTargetCareer, setTargetCareer,
  useCareerGaps, setCareerGap, type GapLevel,
} from "../portal-store"
import { hasRealAssessments } from "../tests/report-bridge"
import { careersForMember, careerFitFor, topRisingCareers, trendPctOf } from "../tests/market-match"
import { rowById, type Row } from "../terminal/careers-all"
import {
  SELF_DIMENSIONS, motivationReading, personalityReading, abilityReading,
} from "../tests/gap-model"
import { cn } from "@/lib/utils"

const PANE =
  "rounded-[20px] bg-card ring-1 ring-[rgba(24,24,27,0.06)] shadow-[0_1px_2px_rgba(24,24,27,0.03),0_12px_32px_-20px_rgba(24,24,27,0.20)]"

const LEVELS: { key: GapLevel; label: string; tone: string }[] = [
  { key: "have", label: "Have it", tone: "bg-well-600 text-white border-well-600" },
  { key: "partly", label: "Partly", tone: "bg-warn-500 text-white border-warn-500" },
  { key: "build", label: "To build", tone: "bg-foreground text-background border-foreground" },
]

/** Row → the plain CareerViz the kit consumes. fitPct is the member's real
 *  job-family fit for THIS target's cluster (undefined until the interest test). */
function toViz(clientId: string, r: Row, to?: string): CareerViz & { group?: string } {
  const fit = careerFitFor(clientId, r.cluster)
  return {
    name: r.name, cluster: r.cluster, oneLine: r.oneLine,
    fitPct: fit.fitPct, band: fit.band, group: fit.group,
    payLo: r.payLo, payHi: r.payHi,
    demand: r.demandTrend, demandPct: trendPctOf(r), aiLevel: r.aiLevel, to,
  }
}

function Masthead({ sub }: { sub: string }) {
  return (
    <div data-reveal className="border-b border-border pb-8">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">The distance</p>
      <h1 className="mt-3 font-editorial text-[34px] font-light leading-[1.05] tracking-tight sm:text-[44px]">What Next</h1>
      <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  )
}

/* ── state 1 · CHOOSE ─────────────────────────────────────────────────────── */
function ChooseTarget({ clientId, options, matched }: { clientId: string; options: Row[]; matched: boolean }) {
  return (
    <>
      <Masthead sub="Pick the one career you're actually aiming at. Everything after this is measured against that choice — so choose the real one, not the safe one." />
      <Pane className="mt-8">
        <Eyebrow right={<Link to="/portal/terminal" className="shrink-0 text-[12.5px] font-medium text-brand-600 hover:underline">Browse every career →</Link>}>
          {matched ? "Your options" : "The market at large"}
        </Eyebrow>
        {!matched && (
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            We haven't matched the market to your results yet, so these are the fastest-rising careers overall.
          </p>
        )}
        <div className="divide-y divide-border border-y border-border">
          {options.map((r, i) => (
            <button key={r.id} onClick={() => setTargetCareer(clientId, r.id)} className="flex w-full items-center gap-3.5 py-3.5 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[12px] tabular-nums text-ink-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-editorial text-[16px] font-normal tracking-tight text-foreground">{r.name}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{r.cluster} · ₹{r.payLo}–{r.payHi}L</p>
              </div>
              <div className="hidden sm:block"><DemandSpark series={r.demandTrend} pct={trendPctOf(r)} /></div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-semibold text-background">
                <Target className="size-3" /> Aim here
              </span>
            </button>
          ))}
        </div>
      </Pane>
    </>
  )
}

/* ── state 2 · PLAN ───────────────────────────────────────────────────────── */
function Plan({ clientId, target }: { clientId: string; target: Row }) {
  const gaps = useCareerGaps(clientId, target.id)
  const viz = toViz(clientId, target)
  const motivation = motivationReading(clientId, target)
  const readings = [motivation, personalityReading(clientId), abilityReading(clientId)].filter(Boolean)
  const answered = SELF_DIMENSIONS.filter((d) => gaps[d.key]).length
  const toBuild = SELF_DIMENSIONS.filter((d) => gaps[d.key] === "build" || gaps[d.key] === "partly")

  return (
    <>
      <Masthead sub="Your fit for this path, what the market pays and where it's heading — then the six things only you can answer, and what to do first." />

      {/* THE MATCH CARD — the premium hero */}
      <div data-reveal className="mt-8">
        <JobMatchCard
          c={viz}
          headline={viz.group ? `Job-family fit · ${viz.group}` : "Your target"}
          tags={[target.cluster, ...(target.trajectory === "up" ? ["Rising"] : []), ...(target.kind === "curated" ? ["Deep-dive available"] : [])]}
          action={
            <button
              onClick={() => setTargetCareer(clientId, undefined)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-medium text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
            >
              <RotateCcw className="size-3.5" /> Change target
            </button>
          }
        />
        {/* honesty line under the gauge */}
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-400">
          {viz.fitPct != null
            ? <>The gauge is your measured fit for <span className="text-ink-600">{viz.group}</span> — the job family this role sits in — from your interest profile. It describes alignment, not ability.</>
            : <>Take the interest test and this gauge fills with your measured fit for this job family.</>}
        </p>
      </div>

      {/* what we measured — evidence, never a deficit */}
      {readings.length > 0 && (
        <section data-reveal className="mt-6">
          <Eyebrow>What we measured</Eyebrow>
          <p className="mb-4 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-400">
            From your Career Tests. They describe you — what pulls you, how you work, what you reason with — and we don't score them against the job.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {readings.map((r) => r && (
              <div key={r.key} className={cn(PANE, "p-5")}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
                  {r.key === "ability" ? "Reasoning" : r.key === "personality" ? "Personality" : "Motivation"}
                </p>
                <p className={cn("mt-2 font-editorial text-[19px] font-light leading-tight tracking-tight", r.supportive ? "text-foreground" : "text-warn-700")}>
                  {r.headline}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{r.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* what only you know */}
      <Pane className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-300">What only you can answer</p>
          <Chip tone="outline" className="tabular-nums">{answered} of {SELF_DIMENSIONS.length}</Chip>
        </div>
        <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-400">
          We don't hold a list of what this career requires, and we won't invent one. Mark where you honestly stand — your counsellor will pressure-test it.
        </p>

        <div className="mt-5 space-y-2">
          {SELF_DIMENSIONS.map((d) => {
            const Icon = d.icon
            const level = gaps[d.key]
            return (
              <div key={d.key} className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-4 py-3.5 transition-colors",
                level === "have" && "bg-well-50/70 ring-1 ring-well-100",
                level === "partly" && "bg-warn-100/50 ring-1 ring-warn-100",
                level === "build" && "bg-secondary/70 ring-1 ring-border",
                !level && "ring-1 ring-border",
              )}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl",
                  level === "have" ? "bg-well-50 text-well-700" : level ? "bg-secondary text-ink-600" : "bg-secondary text-ink-300")}>
                  <Icon className="size-4 stroke-[1.75]" />
                </span>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[14px] font-medium text-foreground">{d.label}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{d.prompt ?? d.blurb}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {LEVELS.map((l) => (
                    <button key={l.key} onClick={() => setCareerGap(clientId, target.id, d.key, l.key)} aria-pressed={level === l.key}
                      className={cn("rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                        level === l.key ? l.tone : "border-border text-muted-foreground hover:bg-secondary")}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Pane>

      {/* the build list */}
      <Pane className="mt-6">
        <Eyebrow>What to do first</Eyebrow>
        {answered === 0 ? (
          <p className="text-[13.5px] text-muted-foreground">Answer the six above and your build list appears here — ordered, and short enough to start.</p>
        ) : toBuild.length === 0 ? (
          <>
            <p className="flex items-center gap-2 text-[15px] font-medium text-foreground"><Check className="size-4 text-well-600" /> Nothing is missing on your own reckoning.</p>
            <p className="mt-1.5 max-w-[58ch] text-[13px] text-muted-foreground">Worth testing with a human — the gaps people can't see are the ones that cost them.</p>
            <Link to="/portal/sessions" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90">Book a session <ArrowRight className="size-3.5" /></Link>
          </>
        ) : (
          <>
            <ol className="space-y-3">
              {toBuild.map((d, i) => {
                const partial = gaps[d.key] === "partly"
                return (
                  <li key={d.key} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border font-mono text-[10px] tabular-nums text-ink-500">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground">{partial ? `Strengthen your ${d.label.toLowerCase()}` : `Build your ${d.label.toLowerCase()}`}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{d.blurb}</p>
                    </div>
                    <CircleDashed className={cn("ml-auto mt-1 size-4 shrink-0", partial ? "text-warn-500" : "text-ink-300")} />
                  </li>
                )
              })}
            </ol>
            <p className="mt-4 text-[12.5px] text-muted-foreground">Take this list into your next session — it's the agenda. <Link to="/portal/sessions" className="font-medium text-brand-600 hover:underline">Book one →</Link></p>
          </>
        )}
      </Pane>
    </>
  )
}

/* ── the screen ───────────────────────────────────────────────────────────── */
export function PortalWhatNext() {
  const account = usePortalAccount()
  const clientId = account?.clientId ?? ""
  const targetId = useTargetCareer(clientId)
  const root = useGsap((s) => revealChildren(s), [clientId, targetId])
  if (!account) return null

  const has = hasRealAssessments(clientId)
  if (!has) {
    return (
      <div ref={root} className="mx-auto w-full max-w-[1060px]">
        <Masthead sub="Aim at one career, and we'll show you the distance to it." />
        <div data-reveal className={cn(PANE, "mt-8 p-6 sm:p-8")}>
          <p className="flex items-center gap-2 font-editorial text-[22px] font-light leading-snug tracking-tight text-foreground sm:text-[25px]">
            <Lock className="size-5 shrink-0 text-ink-300" /> Take your Career Tests first.
          </p>
          <p className="mt-2.5 max-w-[54ch] text-[13.5px] text-muted-foreground">
            Your shortlist and your fit are built from your own results. Without them we'd hand you the same generic list as everyone else — which is what this exists to avoid.
          </p>
          <Link to="/portal/assessments" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90">
            Take the Career Tests <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  const market = careersForMember(clientId, 8)
  const target = targetId ? rowById(targetId) : undefined
  const options = market.careers.length ? market.careers : topRisingCareers(8)
  const matched = market.careers.length ? market.matched : false

  return (
    <div ref={root} className="mx-auto w-full max-w-[1060px]">
      {target
        ? <Plan clientId={clientId} target={target} />
        : <ChooseTarget clientId={clientId} options={options} matched={matched} />}
    </div>
  )
}
