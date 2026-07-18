import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle2, Clock, CircleDashed, ArrowRight, FlaskConical, Plus,
  FileDown, ChevronDown, LayoutGrid, Hexagon,
} from "lucide-react"
import { Gauge } from "@/components/custom/Gauge"
import { toast } from "sonner"
import type { Client, RadarAxis, TestResult } from "@/lib/types"
import {
  sigmaProfile, band, BAND_LABEL,
  type SigmaDimension, type SigmaAptitude, type SigmaScaleItem,
  type SigmaJobGroup, type JobGroupTone,
} from "@/lib/sigma"
import { clientTests } from "@/lib/mock"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { Radar } from "@/components/custom/Radar"
import { BipolarBar } from "@/components/custom/BipolarBar"
import { MetricInfo } from "@/components/custom/MetricInfo"
import { useGsap, revealChildren, gsap, EASE, DUR, prefersReducedMotion } from "@/lib/gsap"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STATUS_META: Record<TestResult["status"], { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", tone: "text-well-600", icon: CheckCircle2 },
  in_progress: { label: "In progress", tone: "text-brand-600", icon: Clock },
  assigned: { label: "Assigned", tone: "text-ink-300", icon: CircleDashed },
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

// Mock interpretation + sub-scores derived from result band (UI-only; real values arrive from the engine).
function detailFor(t: TestResult): { interpretation: string; subScores: { label: string; value: number }[] } {
  switch (t.id) {
    case "ts_riasec":
      return {
        interpretation: "Investigative–Enterprising profile: gravitates to problem-solving and analysis, paired with drive to lead and influence. Aligns with product/strategy roles over pure execution tracks.",
        subScores: [
          { label: "Investigative", value: 84 }, { label: "Enterprising", value: 71 },
          { label: "Artistic", value: 52 }, { label: "Social", value: 48 },
          { label: "Conventional", value: 33 }, { label: "Realistic", value: 21 },
        ],
      }
    case "ts_bigfive":
      return {
        interpretation: "High Openness and Conscientiousness indicate strong learning agility and follow-through. Watch for perfectionism under load — couple stretch goals with explicit done-criteria.",
        subScores: [
          { label: "Openness", value: 82 }, { label: "Conscientiousness", value: 78 },
          { label: "Extraversion", value: 55 }, { label: "Agreeableness", value: 61 },
          { label: "Neuroticism", value: 44 },
        ],
      }
    case "ts_skills":
      return {
        interpretation: "72% coverage against the target PM competency map. Strongest in discovery and analytics; the gap is concentrated in stakeholder influence and roadmap prioritisation.",
        subScores: [
          { label: "Discovery", value: 86 }, { label: "Analytics", value: 80 },
          { label: "Delivery", value: 70 }, { label: "Prioritisation", value: 58 },
          { label: "Stakeholder influence", value: 54 },
        ],
      }
    case "ts_gad":
      return {
        interpretation: "GAD-7 score of 8 falls in the mild anxiety band. Sub-threshold for clinical action; monitor alongside workload-sustainability signal. Re-administer in 2–3 weeks.",
        subScores: [
          { label: "Worry control", value: 42 }, { label: "Restlessness", value: 38 },
          { label: "Irritability", value: 30 },
        ],
      }
    default:
      return { interpretation: "Detailed interpretation will appear here once the assessment is scored.", subScores: [] }
  }
}

// "feeds" is a pc.*/wellbeing key — render a friendly label.
const feedLabel = (feeds: string) =>
  feeds === "wellbeing" ? "Wellbeing index" : feeds.replace(/^pc\./, "").replace(/_/g, " ")

function FeedTag({ feeds }: { feeds: string }) {
  const clinical = feeds === "wellbeing"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        clinical ? "bg-mind-100 text-mind-600" : "bg-brand-100 text-brand-600",
      )}
    >
      <ArrowRight className="size-3 stroke-[1.75]" />
      <span className="capitalize">{feedLabel(feeds)}</span>
    </span>
  )
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
      <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
    </div>
  )
}

// Truthful headline derived from the radar data itself: the two strongest axes,
// in descending order. No fabricated copy — the read follows the numbers.
function topAxesTakeaway(data: RadarAxis[], lead: string): string {
  const [a, b] = [...data].sort((x, y) => y.value - x.value)
  if (!a) return ""
  return b ? `${lead}: ${a.axis} and ${b.axis} lead the profile.` : `${lead}: ${a.axis} leads.`
}

// A titled rounded-2xl card framing one Radar (eyebrow + headline + chart).
function RadarCard({
  eyebrow,
  data,
  takeaway,
  tone,
  label,
}: {
  eyebrow: string
  data: RadarAxis[]
  takeaway: string
  tone: "brand" | "mind"
  label: string
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
        {eyebrow} · {data.length} axes
      </p>
      <p className="mt-1.5 max-w-[34ch] text-[13.5px] font-medium leading-snug text-ink-700">
        {takeaway}
      </p>
      <div className="mt-3">
        <Radar data={data} tone={tone} label={label} size={236} />
      </div>
    </div>
  )
}

/* Shared bits ───────────────────────────────────────────────────────────── */

const EYEBROW = "text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300"

// Scoped stagger for the Sigma sub-views. Uses a distinct marker (`data-sreveal`)
// so it never collides with the outer ClientTests `revealChildren` pass — that
// double-tween was leaving cards stuck at opacity:0. Re-runs on sub-tab change.
function revealSigma(scope: ParentNode) {
  if (prefersReducedMotion()) return
  const items = scope.querySelectorAll("[data-sreveal]")
  if (items.length) {
    gsap.from(items, { y: 12, opacity: 0, duration: DUR.enter, ease: EASE.soft, stagger: 0.05 })
  }
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={EYEBROW}>{children}</p>
}

// One-line takeaway header that opens each sub-test view. `right` hosts the
// per-section view toggle.
function Takeaway({ label, text, info, right }: { label: string; text: string; info?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="flex items-center gap-1">
        <Eyebrow>{label} · summary</Eyebrow>
        {info}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <p className="mt-1.5 max-w-[60ch] text-[14px] font-medium leading-snug text-ink-700">{text}</p>
    </div>
  )
}

// Small segmented icon toggle for switching how a section is visualised.
function ViewToggle<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { key: T; icon: React.ElementType; label: string }[]
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5" role="tablist" aria-label="View">
      {options.map((o) => {
        const Icon = o.icon
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={value === o.key}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.key)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.key ? "bg-card text-foreground shadow-[var(--shadow-e1)]" : "text-ink-400 hover:text-foreground",
            )}
          >
            <Icon className="size-4 stroke-[1.5]" />
          </button>
        )
      })}
    </div>
  )
}

// Tone classes for low/moderate/high band chips.
const BAND_CHIP: Record<"low" | "moderate" | "high", string> = {
  low: "bg-ink-100 text-ink-600",
  moderate: "bg-warn-100 text-warn-600",
  high: "bg-well-100 text-well-600",
}

/* ── SetMyCareer view (unchanged content, just extracted) ─────────────────── */

function SetMyCareerView({
  client,
  tests,
  onOpen,
}: {
  client: Client
  tests: TestResult[]
  onOpen: (t: TestResult) => void
}) {
  const { riasec, bigFive } = client.radar
  return (
    <div className="flex flex-col gap-6">
      <section data-reveal aria-label="Personality and interest profiles">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
          Profiles
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <RadarCard
            eyebrow="RIASEC (Holland)"
            data={riasec}
            takeaway={topAxesTakeaway(riasec, "Interest profile")}
            tone="brand"
            label="RIASEC"
          />
          <RadarCard
            eyebrow="Big Five (Mini-IPIP)"
            data={bigFive}
            takeaway={topAxesTakeaway(bigFive, "Trait profile")}
            tone="mind"
            label="Big Five"
          />
        </div>
      </section>

      <section data-reveal>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
            Assessments · {tests.length}
          </p>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toastAssign()}>
            <Plus className="size-3.5 stroke-[1.5]" /> Assign test
          </Button>
        </div>

        {tests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <FlaskConical className="mx-auto size-6 stroke-[1.25] text-ink-300" />
            <p className="mt-3 text-[13px] text-muted-foreground">No assessments assigned yet.</p>
            <Button variant="outline" size="sm" className="mt-4 h-8 gap-1.5" onClick={() => toastAssign()}>
              <Plus className="size-3.5 stroke-[1.5]" /> Assign first test
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {tests.map((t) => {
              const m = STATUS_META[t.status]
              const Icon = m.icon
              const scored = typeof t.score === "number"
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onOpen(t)}
                    className="group flex w-full items-center gap-4 rounded-2xl bg-card p-5 text-left shadow-[var(--shadow-e2)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-e3)]"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100">
                      <FlaskConical className="size-4 stroke-[1.5] text-ink-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">{t.name}</span>
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", m.tone)}>
                          <Icon className="size-3 stroke-[1.75]" /> {m.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="text-[12.5px] text-ink-600">{t.result}</span>
                        <span className="text-[11.5px] tabular-nums text-muted-foreground">{fmtDate(t.date)}</span>
                      </div>
                      <div className="mt-2.5"><FeedTag feeds={t.feeds} /></div>
                    </div>

                    {scored ? (
                      <ScoreRing value={t.score!} size={56} stroke={4} sublabel="score" />
                    ) : (
                      <div className="grid size-14 shrink-0 place-items-center">
                        <span className="font-display text-[20px] font-extralight text-ink-300">—</span>
                      </div>
                    )}
                    <ArrowRight className="size-4 shrink-0 stroke-[1.5] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ── Sigma · Ability ──────────────────────────────────────────────────────── */

function AbilityCard({ a }: { a: SigmaAptitude }) {
  const b = band(a.score, "ability")
  return (
    <div className="flex flex-col rounded-2xl bg-card p-4 shadow-[var(--shadow-e2)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-ink-600">
            {a.code}
          </span>
          <p className="mt-1.5 text-[13.5px] font-medium leading-tight text-foreground">{a.label}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-display text-[26px] font-extralight leading-none tabular-nums text-foreground">{a.score}</span>
          <span className="text-[12px] font-light tabular-nums text-ink-300">/10</span>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full", b === "high" ? "bg-brand-500" : "bg-ink-700")}
          style={{ width: `${(a.score / 10) * 100}%` }}
        />
      </div>

      <span className={cn("mt-2 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium", BAND_CHIP[b])}>
        {BAND_LABEL.ability[b]}
      </span>

      <p className="mt-2.5 text-[12px] leading-snug text-ink-600">{a.definition}</p>
      <p className="mt-auto pt-2 text-[11px] leading-snug text-ink-300">{a.examples}</p>
    </div>
  )
}

function AbilityView({ profile }: { profile: ReturnType<typeof sigmaProfile> }) {
  const { aptitudes, takeaway } = profile.ability
  const radarData: RadarAxis[] = aptitudes.map((a) => ({ axis: a.label, value: a.score }))
  const top = [...aptitudes].sort((x, y) => y.score - x.score)[0]
  const [view, setView] = useState<"radar" | "gauges">("radar")

  return (
    <div className="flex flex-col gap-4">
      <div data-sreveal>
        <Takeaway
          label="Ability"
          text={takeaway}
          info={
            <MetricInfo
              title="Ability profile"
              flow={["Timed aptitude items", "Scored vs norms", "Aptitude 1–10"]}
            >
              Seven aptitudes scored 1–10 against age norms: 1–3 below moderate, 4–7 moderate, 8–10 high.
            </MetricInfo>
          }
          right={
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { key: "radar", icon: Hexagon, label: "Radar view" },
                { key: "gauges", icon: LayoutGrid, label: "Gauges view" },
              ]}
            />
          }
        />
      </div>

      {view === "radar" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div data-sreveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
            <Eyebrow>Aptitude radar · scale 1–10</Eyebrow>
            <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-ink-700">
              {top ? `${top.label} is the standout aptitude.` : ""}
            </p>
            <div className="mt-2">
              <Radar data={radarData} max={10} tone="brand" label="Aptitudes" size={300} />
            </div>
          </div>

          <div data-sreveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {aptitudes.map((a) => (
              <AbilityCard key={a.code} a={a} />
            ))}
          </div>
        </div>
      ) : (
        <div data-sreveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {aptitudes.map((a) => {
            const b = band(a.score, "ability")
            return (
              <div key={a.code} className="flex flex-col items-center rounded-2xl bg-card p-4 shadow-[var(--shadow-e2)]">
                <Gauge
                  value={a.score}
                  max={10}
                  ticks={10}
                  size={128}
                  stroke={8}
                  tone={b === "high" ? "brand" : "ink"}
                  band={BAND_LABEL.ability[b]}
                />
                <p className="mt-2 text-center text-[12.5px] font-medium leading-tight text-foreground">{a.label}</p>
                <span className="mt-0.5 font-mono text-[10px] text-ink-300">{a.code}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Sigma · Personality ──────────────────────────────────────────────────── */

function DimensionCard({ d }: { d: SigmaDimension }) {
  return (
    <div className="flex flex-col rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
      <h3 className="text-[14px] font-medium leading-tight text-foreground">{d.label}</h3>
      <p className="mt-1 text-[12px] leading-snug text-ink-500">{d.summary}</p>

      <div className="mt-4 flex flex-col gap-4">
        {d.subs.map((s) => {
          const b = band(s.score, "personality")
          return (
            <div key={s.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-ink-600">{s.name}</span>
                  <MetricInfo title={s.name} flow={[s.low.label, "Bipolar scale 0–99", s.high.label]}>
                    {`${s.low.label}: ${s.low.desc} ${s.high.label}: ${s.high.desc}`}
                  </MetricInfo>
                </div>
                <span className="font-display text-[14px] font-light tabular-nums text-foreground">
                  {s.score}
                  <span className="text-[10px] font-light text-ink-300">/99</span>
                </span>
              </div>
              <BipolarBar low={s.low.label} high={s.high.label} score={s.score} />
              <p className="mt-1.5 text-[10.5px] leading-snug text-ink-300">
                {b === "high" ? s.high.desc : b === "low" ? s.low.desc : "Balanced between both poles."}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PersonalityView({ profile }: { profile: ReturnType<typeof sigmaProfile> }) {
  const { dimensions, takeaway } = profile.personality
  return (
    <div className="flex flex-col gap-4">
      <div data-sreveal>
        <Takeaway
          label="Personality"
          text={takeaway}
          info={
            <MetricInfo
              title="Personality profile"
              flow={["Self-report items", "Bipolar scoring", "Trait position 0–99"]}
            >
              Six dimensions, each three bipolar traits scored 0–99: under 40 leans the low pole, over 59 the high pole, 40–59 mixed.
            </MetricInfo>
          }
        />
      </div>

      <div data-sreveal className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((d) => (
          <DimensionCard key={d.key} d={d} />
        ))}
      </div>
    </div>
  )
}

/* ── Sigma · Interest ─────────────────────────────────────────────────────── */

// Tone for percentile band: high = brand, average = ink-700, low = ink-300.
function percentileFill(value: number): string {
  const b = band(value, "percentile")
  return b === "high" ? "bg-brand-500" : b === "low" ? "bg-ink-300" : "bg-ink-700"
}

function PercentileRow({ item, showCode }: { item: SigmaScaleItem; showCode?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-1.5">
        {showCode && item.code && (
          <span className="shrink-0 rounded bg-ink-100 px-1 py-0.5 font-mono text-[9px] font-medium text-ink-500">
            {item.code}
          </span>
        )}
        <span className="truncate text-[12px] text-ink-600">{item.label}</span>
      </div>
      <span className="font-display text-[13px] font-light tabular-nums text-foreground">{item.value}</span>
      <div className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className={cn("h-full rounded-full", percentileFill(item.value))} style={{ width: `${item.value}%` }} />
      </div>
    </div>
  )
}

const JOB_TONE: Record<JobGroupTone, { dot: string; label: string }> = {
  similar: { dot: "bg-well-600", label: "Similar" },
  neutral: { dot: "bg-ink-300", label: "Neutral" },
  dissimilar: { dot: "bg-risk-500", label: "Dissimilar" },
}

function JobGroupRow({ g }: { g: SigmaJobGroup }) {
  const t = JOB_TONE[g.tone]
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
        <span className="truncate text-[12.5px] text-ink-700">{g.label}</span>
      </div>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-300">{t.label}</span>
    </li>
  )
}

function InterestView({ profile }: { profile: ReturnType<typeof sigmaProfile> }) {
  const { workRoles, workStyles, personalStyles, jobGroups, takeaway } = profile.interest
  const [allRoles, setAllRoles] = useState(false)
  const TOP = 12
  const roles = allRoles ? workRoles : workRoles.slice(0, TOP)

  return (
    <div className="flex flex-col gap-4">
      <div data-sreveal>
        <Takeaway
          label="Interest"
          text={takeaway}
          info={
            <MetricInfo
              title="Interest profile"
              flow={["Preference items", "Ranked vs norms", "Percentile 0–99"]}
            >
              Interests as percentiles against a norm group: under 34 low, 34–66 average, over 66 high.
            </MetricInfo>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top work roles — spans wider, with show-all toggle */}
        <div data-sreveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)] lg:col-span-2 lg:row-span-2">
          <div className="flex items-center justify-between">
            <Eyebrow>Top work roles · percentile</Eyebrow>
            <span className="text-[10px] tabular-nums text-ink-300">{workRoles.length} roles</span>
          </div>
          <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-ink-700">
            {workRoles[0] ? `${workRoles[0].label} sits at the top of the interest profile.` : ""}
          </p>
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {roles.map((r) => (
              <PercentileRow key={r.label} item={r} />
            ))}
          </div>
          {workRoles.length > TOP && (
            <button
              onClick={() => setAllRoles((v) => !v)}
              className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {allRoles ? "Show top 12" : `Show all ${workRoles.length}`}
              <ChevronDown className={cn("size-3.5 stroke-[1.75] transition-transform", allRoles && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Work styles */}
        <div data-sreveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
          <Eyebrow>Work styles · percentile</Eyebrow>
          <div className="mt-3.5 flex flex-col gap-3">
            {workStyles.map((s) => (
              <PercentileRow key={s.label} item={s} />
            ))}
          </div>
        </div>

        {/* Personal styles */}
        <div data-sreveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
          <Eyebrow>Personal styles · percentile</Eyebrow>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {personalStyles.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <PercentileRowWithInfo item={s} />
              </div>
            ))}
          </div>
        </div>

        {/* Job groups */}
        <div data-sreveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)] lg:col-span-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Job groups · similarity</Eyebrow>
            <div className="flex items-center gap-3">
              {(["similar", "neutral", "dissimilar"] as JobGroupTone[]).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[10px] text-ink-300">
                  <span className={cn("size-1.5 rounded-full", JOB_TONE[t].dot)} /> {JOB_TONE[t].label}
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-2 grid gap-x-8 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {jobGroups.map((g) => (
              <JobGroupRow key={g.label} g={g} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// Personal-style row that also carries a definition popover (kept separate to
// keep PercentileRow lean for the bulk lists).
function PercentileRowWithInfo({ item }: { item: SigmaScaleItem }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {item.code && (
            <span className="shrink-0 rounded bg-ink-100 px-1 py-0.5 font-mono text-[9px] font-medium text-ink-500">
              {item.code}
            </span>
          )}
          <span className="truncate text-[12px] text-ink-600">{item.label}</span>
          {item.desc && (
            <MetricInfo title={item.label}>{item.desc}</MetricInfo>
          )}
        </div>
        <span className="font-display text-[13px] font-light tabular-nums text-foreground">{item.value}</span>
        <div className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div className={cn("h-full rounded-full", percentileFill(item.value))} style={{ width: `${item.value}%` }} />
        </div>
      </div>
    </div>
  )
}

/* ── Sigma view (sub-nav + sections) ──────────────────────────────────────── */

type SigmaTab = "personality" | "interest" | "ability"

const SIGMA_SECTIONS: { key: SigmaTab; label: string }[] = [
  { key: "personality", label: "Personality" },
  { key: "interest", label: "Interest" },
  { key: "ability", label: "Ability" },
]

// All three sub-tests live in ONE continuous scroll; the pills are scroll-spy
// anchors (click → smooth-scroll, scroll → active highlight) and stick below the
// client header so they're always reachable.
function SigmaView({ client }: { client: Client }) {
  const profile = sigmaProfile(client.id)
  const navigate = useNavigate()
  const [active, setActive] = useState<SigmaTab>("personality")
  const containerRef = useGsap((s) => revealSigma(s), [client.id])

  const pRef = useRef<HTMLElement>(null)
  const iRef = useRef<HTMLElement>(null)
  const aRef = useRef<HTMLElement>(null)
  const refs: Record<SigmaTab, React.RefObject<HTMLElement | null>> = {
    personality: pRef, interest: iRef, ability: aRef,
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((x, y) => y.intersectionRatio - x.intersectionRatio)
        const id = vis[0]?.target.id
        if (id) setActive(id.replace("sigma-", "") as SigmaTab)
      },
      { rootMargin: "-170px 0px -55% 0px", threshold: [0.05, 0.3, 0.6] },
    )
    ;[pRef, iRef, aRef].forEach((r) => r.current && obs.observe(r.current))
    return () => obs.disconnect()
  }, [client.id])

  const scrollTo = (key: SigmaTab) =>
    refs[key].current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <div className="sticky top-[140px] z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-[var(--surface-frost-strong)] px-2.5 py-2 shadow-[var(--shadow-e2)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Career Tests">
          {SIGMA_SECTIONS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              onClick={() => scrollTo(t.key)}
              className={cn(
                "rounded-full px-3.5 h-8 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === t.key ? "bg-brand-100 text-brand-600 font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pr-0.5">
          <span className="hidden text-[11px] tabular-nums text-ink-300 sm:inline">
            Test {profile.testId} · {fmtDate(profile.takenAt)}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => navigate(`/clients/${client.id}/test-report`)}>
            <FileDown className="size-3.5 stroke-[1.5]" /> Export report
          </Button>
        </div>
      </div>

      <section ref={pRef} id="sigma-personality" className="scroll-mt-[160px]"><PersonalityView profile={profile} /></section>
      <section ref={iRef} id="sigma-interest" className="scroll-mt-[160px]"><InterestView profile={profile} /></section>
      <section ref={aRef} id="sigma-ability" className="scroll-mt-[160px]"><AbilityView profile={profile} /></section>
    </div>
  )
}

/* ── Screen root ──────────────────────────────────────────────────────────── */

type Provider = "sigma" | "all"

export function ClientTests({ client }: { client: Client }) {
  const tests = clientTests(client.id)
  const [open, setOpen] = useState<TestResult | null>(null)
  const [provider, setProvider] = useState<Provider>("sigma")
  const ref = useGsap((s) => revealChildren(s), [client.id, provider])

  const detail = open ? detailFor(open) : null
  const StatusIcon = open ? STATUS_META[open.status].icon : CheckCircle2

  // Sigma = the flagship 3-part assessment. All = the shorter / supplementary
  // tests (RIASEC, Big Five, skills, screeners) — not the flagship.
  const providers: { key: Provider; label: string }[] = [
    { key: "sigma", label: "Career Tests" },
    { key: "all", label: "All" },
  ]

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {/* Provider segmented control */}
      <div data-reveal className="flex items-center gap-1 self-start rounded-full bg-secondary p-1">
        {providers.map((p) => (
          <button
            key={p.key}
            onClick={() => setProvider(p.key)}
            aria-pressed={provider === p.key}
            className={cn(
              "rounded-full px-4 h-8 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              provider === p.key
                ? "bg-card font-medium text-foreground shadow-[var(--shadow-e1)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div data-reveal>
        {provider === "sigma" ? (
          <SigmaView client={client} />
        ) : (
          <SetMyCareerView client={client} tests={tests} onOpen={setOpen} />
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          {open && detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <FlaskConical className="size-4 stroke-[1.5] text-ink-700" />
                  <DialogTitle className="font-display text-[19px] font-light tracking-tight">{open.name}</DialogTitle>
                </div>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                  <span className={cn("inline-flex items-center gap-1 font-medium", STATUS_META[open.status].tone)}>
                    <StatusIcon className="size-3 stroke-[1.75]" /> {STATUS_META[open.status].label}
                  </span>
                  <span className="tabular-nums">{fmtDate(open.date)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-5 rounded-2xl bg-secondary/50 p-4">
                {typeof open.score === "number" ? (
                  <ScoreRing value={open.score} size={64} stroke={4} sublabel="score" />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-full bg-ink-100">
                    <span className="font-display text-[22px] font-extralight text-ink-300">—</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Result</div>
                  <div className="mt-0.5 text-[14px] font-medium">{open.result}</div>
                </div>
              </div>

              {detail.subScores.length > 0 && (
                <div>
                  <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Sub-scores</div>
                  <div className="flex flex-col gap-3">
                    {detail.subScores.map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="text-ink-600">{s.label}</span>
                          <span className="font-medium tabular-nums">{s.value}</span>
                        </div>
                        <div className="mt-1.5"><MiniBar value={s.value} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Interpretation</div>
                <p className="text-[13px] leading-relaxed text-foreground">{detail.interpretation}</p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Feeds into</div>
                <FeedTag feeds={open.feeds} />
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  This assessment informs the{" "}
                  <span className="font-medium text-foreground capitalize">{feedLabel(open.feeds)}</span>{" "}
                  signal. The console surfaces the result; the scoring engine owns the weighting.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function toastAssign() {
  toast("Opening test catalogue…")
}
