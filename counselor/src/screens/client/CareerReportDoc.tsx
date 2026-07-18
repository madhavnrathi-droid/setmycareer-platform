import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ShieldCheck, Quote } from "lucide-react"
import {
  getClient, clients, clientSessions, clientTests, clientIndexHistory,
  transcript, counselor, scaffoldClient,
} from "@/lib/mock"
import {
  buildReport, CONFIDENCE_WEIGHT,
  type JobGroup, type WorkRole, type ClusterRead,
} from "@/lib/report-content"
import { fetchReportNarrative, type AINarrative } from "@/lib/report"
import { dossierText, transcriptText } from "@/lib/client-dossier"
import { realRadarFor, assessmentSummary, realAbilitiesFor } from "@/portal/tests/report-bridge"
import type { Client, TestResult, Confidence, Session } from "@/lib/types"
import { Radar } from "@/components/custom/Radar"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { Bars } from "@/components/custom/Bars"
import { BipolarBar } from "@/components/custom/BipolarBar"
import { Gauge } from "@/components/custom/Gauge"
import { DeltaPill } from "@/components/custom/DeltaPill"
import { LogoMark } from "@/components/brand/Logo"
import {
  ReflectionMoment, SignatureInsight, TrajectoryMap, FutureScenarios,
  GrowthTimeline, PsychLandscape, InfluenceMap,
  type Milestone, type InfluenceNode, type InfluenceKind,
} from "@/components/report"
import { EditableProse } from "@/components/report/EditableProse"
import { ReportActions } from "@/components/report/ReportActions"
import {
  useIsShared, setShared, useProseEdits, getProseEdits, saveProseEdit,
} from "@/lib/report-share"
import { cn } from "@/lib/utils"

/* ════════════════════════════════════════════════════════════════════════════
   Career Intelligence Report — a continuous-scroll, deeply PERSONAL deliverable.

   The report MERGES two sources:
     • the deterministic SCAFFOLD from buildReport(client) — every number, score,
       chart series, route probability, job group and journey fact. Built
       synchronously so the figures and charts paint immediately.
     • an AI NARRATIVE fetched live via fetchReportNarrative(payload) — the prose:
       framing thesis, executive summary, journey beats, section essays, route
       rationales, the counsellor's synthesis and the pull-quotes. While it streams
       a calm LOADING state shows. If it fails or returns null, the report FALLS
       BACK to the scaffold's own deterministic prose so it ALWAYS renders.

   The reading model is ONE continuous scroll with a fixed section-jump rail that
   scroll-spies the active section. Every AI prose block is wrapped in
   EditableProse and persists counselor edits via the report-share store; a saved
   edit is PREFERRED over the AI text, falling back to AI, then to scaffold prose.

   Detailed view only. Print-perfect: page breaks, an @media print block that hides
   the app chrome + the rail + the actions bar, and a "Back to reports" link.
   ════════════════════════════════════════════════════════════════════════════ */

// ── date helpers ───────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" })
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })

// ── print + motion CSS ─────────────────────────────────────────────────────────

const PRINT_CSS = `
@keyframes smc-shimmer { 0% { background-position: -120% 0; } 100% { background-position: 220% 0; } }
@keyframes smc-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.smc-rise { animation: smc-rise .6s cubic-bezier(.22,.61,.36,1) both; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .smc-rise { animation: none; }
  .smc-shimmer-bar::after { animation: none !important; }
}
@media print {
  @page { margin: 13mm; }
  html, body { background: #ffffff !important; }
  aside, header, [role="toolbar"][aria-label="Compass"], [data-print-hide] { display: none !important; }
  main, main > div { padding: 0 !important; max-width: none !important; }
  .career-doc { max-width: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
  .career-page { box-shadow: none !important; border-color: #e7e5e3 !important; }
  .smc-rise { animation: none !important; }
  .break-before-page { break-before: page; }
  .avoid-break { break-inside: avoid; }
}
`

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  none: "No read", low: "Low", tentative: "Tentative", moderate: "Moderate", high: "High",
}

// ════════════════════════════════════════════════════════════════════════════
//  Section catalogue — the narrative spine. Drives the contents AND the rail, so
//  they can never drift. Reorganised from the scaffold sections to read as a
//  STORY rather than a battery of exhibits.
// ════════════════════════════════════════════════════════════════════════════

interface SectionDef { no: string; id: string; title: string; rail: string }
const SECTIONS: SectionDef[] = [
  { no: "01", id: "thesis", title: "The Through-Line", rail: "Thesis" },
  { no: "02", id: "summary", title: "Executive Summary", rail: "Summary" },
  { no: "03", id: "personality", title: "Who You Are", rail: "Personality" },
  { no: "04", id: "interests", title: "Interests & Strengths", rail: "Interests" },
  { no: "05", id: "journey", title: "The Journey So Far", rail: "Journey" },
  { no: "06", id: "career-index", title: "Career Index & Clusters", rail: "Index" },
  { no: "07", id: "wellbeing", title: "Wellbeing & Reserves", rail: "Wellbeing" },
  { no: "08", id: "market", title: "Where the Market Meets You", rail: "Market" },
  { no: "09", id: "futures", title: "Your Possible Futures", rail: "Futures" },
  { no: "10", id: "people", title: "People & Environment", rail: "People" },
  { no: "11", id: "plan", title: "The Plan", rail: "Plan" },
  { no: "12", id: "reflection", title: "The Counsellor's Reflection", rail: "Close" },
]

// ── band display maps (typed against the real scaffold contracts) ───────────────

const BAND3_META: Record<JobGroup["band"], { label: string; tone: "brand" | "warn" | "risk" }> = {
  similar: { label: "Similar", tone: "brand" },
  midrange: { label: "Midrange", tone: "warn" },
  dissimilar: { label: "Dissimilar", tone: "risk" },
}
const ROLEBAND_META: Record<WorkRole["band"], { label: string; tone: "brand" | "warn" | "risk" }> = {
  high: { label: "High", tone: "brand" },
  average: { label: "Average", tone: "warn" },
  low: { label: "Low", tone: "risk" },
}

type SectionKey = keyof AINarrative["sectionNarratives"]

// ── safe accessors over the AI narrative (treats empty string/array as absent) ───

const asStr = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined)
/** Pull just the leading duration phrase out of a horizon string for tight stat
 *  callouts — e.g. "4–7 months, with stronger compounding after" → "4–7 months".
 *  Falls back to a clean truncation, then a sensible default. */
const shortHorizon = (h: string | undefined): string => {
  const s = (h ?? "").trim()
  const m = s.match(/^[\d.\s–—-]+(?:day|week|month|quarter|year)s?/i)
  if (m) return m[0].trim()
  return s.split(/[,—]| to /i)[0].trim() || "3–5 mo"
}
const asStrArr = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  return out.length ? out : undefined
}

/** AI prose for a named section as a single plain-text string (paragraphs joined
 *  with blank lines), falling back to scaffold paragraphs. Pairs with EditableProse
 *  which round-trips plain text. */
function sectionText(ai: AINarrative | null, key: SectionKey, fallback: string[]): string {
  const s = asStr(ai?.sectionNarratives?.[key])
  return s ?? fallback.join("\n\n")
}

// ── layout primitives ───────────────────────────────────────────────────────────

/** A page-like white block with a numbered, ruled header. The anchor for a section. */
function Page({
  id, no, title, kicker, breakBefore = false, children,
}: {
  id?: string; no?: string; title?: string; kicker?: string; breakBefore?: boolean; children: React.ReactNode
}) {
  return (
    <section
      id={id}
      data-section={id}
      className={cn(
        "career-page scroll-mt-28 rounded-2xl border border-hairline bg-card p-7 shadow-[var(--shadow-e1)] sm:p-9",
        breakBefore && "break-before-page",
      )}
    >
      {title && (
        <header className="flex items-baseline gap-3 border-b-2 border-foreground pb-2.5">
          {no && <span className="font-mono text-[12px] tabular-nums text-ink-300">{no}</span>}
          <h3 className="font-display text-[18px] font-semibold tracking-tight text-foreground">{title}</h3>
          {kicker && (
            <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{kicker}</span>
          )}
        </header>
      )}
      <div className={title ? "mt-5" : undefined}>{children}</div>
    </section>
  )
}

/** A full-width section opener: the number, a warm editorial title + standfirst.
 *  An anchor target; the rail scroll-spies these. */
function SectionOpener({ no, id, title, sub }: { no: string; id: string; title: string; sub?: string }) {
  return (
    <section id={id} data-section={id} className="break-before-page avoid-break scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl bg-foreground px-7 py-9 text-background shadow-[var(--shadow-e2)] sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[150px] font-extralight leading-none text-background/[0.06] sm:text-[200px]">
          {no}
        </span>
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-brand-300">Chapter {no}</p>
          <h2 className="mt-2 font-display text-[30px] font-light leading-tight tracking-tight sm:text-[40px]">{title}</h2>
          {sub && <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-background/70">{sub}</p>}
        </div>
      </div>
    </section>
  )
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[13.5px] leading-[1.75] text-ink-700", className)}>{children}</p>
}

function Label({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">{children}</h4>
}

function ConfBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-050 px-2 py-0.5 text-[10px] font-medium text-ink-500">
      <span className="size-1.5 rounded-full bg-brand-500" style={{ opacity: CONFIDENCE_WEIGHT[confidence] }} />
      {CONFIDENCE_LABEL[confidence]}
    </span>
  )
}

function Track({ value, tone = "ink" }: { value: number; tone?: "ink" | "brand" | "warn" | "risk" }) {
  const fill =
    tone === "brand" ? "bg-brand-500" : tone === "warn" ? "bg-warn-600" : tone === "risk" ? "bg-risk-500" : "bg-ink-700"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}

function toneForScore(v: number): "brand" | "warn" | "risk" {
  return v >= 65 ? "brand" : v >= 45 ? "warn" : "risk"
}

/** Oversized proof statistic — the quiet callout. */
function StatCallout({ value, unit, label, sub, tone = "ink" }: {
  value: string | number; unit?: string; label: string; sub?: string; tone?: "ink" | "brand"
}) {
  return (
    <div className="avoid-break rounded-2xl border border-hairline bg-ink-050 p-5">
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "font-display text-[44px] font-extralight leading-none tracking-tight tabular-nums",
          tone === "brand" ? "text-brand-600" : "text-foreground",
        )}>{value}</span>
        {unit && <span className="font-display text-[16px] font-light text-ink-300">{unit}</span>}
      </div>
      <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{sub}</p>}
    </div>
  )
}

/** An insight-titled exhibit caption (states the finding, not "Figure 1"). */
function ExhibitCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-l-2 border-brand-500 pl-3 text-[11.5px] leading-snug text-ink-500">
      <span className="font-semibold uppercase tracking-[0.07em] text-ink-400">Exhibit · </span>{children}
    </p>
  )
}

// ── abilities (derived from the client's test battery) ───────────────────────────

function abilityMetrics(tests: TestResult[]): { label: string; value: number; highlight?: boolean; meta: string }[] {
  const rows = tests.map((t) => {
    const pct = t.result.match(/(\d{1,3})\s*%/)
    const value =
      t.score != null ? (t.score <= 10 ? t.score * 10 : t.score)
      : pct ? Number(pct[1])
      : t.status === "completed" ? 60 : 40
    return { label: t.name.replace(/\s*\(.*\)/, ""), value: Math.max(0, Math.min(100, value)), meta: t.result }
  })
  const top = Math.max(...rows.map((r) => r.value))
  return rows.map((r) => ({ ...r, highlight: r.value === top }))
}

// ── influence-map derivation (from the network/environment cluster + signals) ────
// Each surrounding force is read as support / strain / opportunity by the shape of
// the underlying signal, with its strength from the signal score. Deterministic —
// no fabrication beyond a light semantic mapping of real signals to people/forces.

function influenceKindFor(name: string, score: number): InfluenceKind {
  const n = name.toLowerCase()
  if (/(workload|sustainab|strain|stress|isolation|burnout)/.test(n)) return "strain"
  if (/(network|momentum|opportunit|market|visib|outreach|pipeline)/.test(n)) return "opportunity"
  if (score < 45) return "strain"
  if (score >= 65) return "support"
  return "opportunity"
}

function influenceNodes(clusters: ClusterRead[], firstName: string): InfluenceNode[] {
  const nodes: InfluenceNode[] = []
  const net = clusters.find((c) => c.key === "network_environment")
  // the cluster's own signals become the primary forces
  for (const s of net?.signals ?? []) {
    if (s.score == null) continue
    nodes.push({ label: s.name, strength: Math.round(s.score), kind: influenceKindFor(s.name, s.score) })
  }
  // the counsellor relationship is a real, present source of support
  nodes.push({ label: "Counsellor", strength: 78, kind: "support" })
  // the network/environment cluster as a whole, as the standing "field" around them
  if (net) {
    nodes.push({
      label: `${firstName}'s wider field`,
      strength: Math.round(net.score),
      kind: net.score >= 55 ? "opportunity" : "strain",
    })
  }
  // de-dup by label, keep the first (signal-derived) reading
  const seen = new Set<string>()
  return nodes.filter((n) => (seen.has(n.label) ? false : (seen.add(n.label), true))).slice(0, 6)
}

// ── growth-timeline derivation (journey beats + dated sessions) ───────────────────

function growthMilestones(
  journey: { key: string; title: string; facts: string[] }[],
  sessions: Session[],
  generatedOn: string,
): Milestone[] {
  const out: Milestone[] = []
  const dated = [...sessions].filter((s) => s.summary).sort((a, b) => +new Date(a.date) - +new Date(b.date))

  // open with the "problem" beat, dated to the first session (or issue date)
  const problem = journey.find((j) => j.key === "problem")
  const firstDate = dated[0]?.date ?? generatedOn
  if (problem) {
    out.push({ date: firstDate, label: problem.title, detail: problem.facts[0] })
  }
  // each attended session becomes a milestone
  for (const s of dated) {
    out.push({
      date: s.date,
      label: s.summary ?? "Session",
      detail: s.snippet ? `“${s.snippet}”` : undefined,
    })
  }
  // close with the forward-looking "future" beat, dated to the report
  const future = journey.find((j) => j.key === "future")
  if (future) {
    out.push({ date: generatedOn, label: future.title, detail: future.facts[0] })
  }
  return out
}

// ════════════════════════════════════════════════════════════════════════════
//  Loading state — calm, branded, with charts already visible below.
// ════════════════════════════════════════════════════════════════════════════

function ComposingBanner() {
  return (
    <div
      data-print-hide
      className="avoid-break overflow-hidden rounded-2xl border border-hairline bg-card p-7 shadow-[var(--shadow-e1)] sm:p-9"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 animate-pulse place-items-center rounded-xl bg-foreground text-background">
          <LogoMark size={20} />
        </span>
        <div>
          <p className="font-display text-[16px] font-medium text-foreground">Composing your report…</p>
          <p className="text-[11.5px] text-ink-400">
            Weaving the analysis into a written read — this can take up to half a minute.
          </p>
        </div>
      </div>
      <div className="smc-shimmer-bar relative mt-5 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className="absolute inset-0 w-1/2 rounded-full bg-brand-500/60" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, var(--color-brand-500), transparent)",
            backgroundSize: "60% 100%",
            backgroundRepeat: "no-repeat",
            animation: "smc-shimmer 1.6s ease-in-out infinite",
          }}
        />
      </div>
      <div className="mt-6 space-y-2.5" aria-hidden>
        {[100, 96, 88, 92, 70].map((w, i) => (
          <div key={i} className="relative h-3 overflow-hidden rounded bg-ink-050" style={{ width: `${w}%` }}>
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent, var(--color-ink-100), transparent)",
                backgroundSize: "50% 100%",
                backgroundRepeat: "no-repeat",
                animation: `smc-shimmer 1.8s ease-in-out ${i * 0.12}s infinite`,
              }}
            />
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[10.5px] uppercase tracking-[0.18em] text-ink-300">
        Your figures &amp; charts are ready below
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  The fixed section-jump rail (screen-only). Scroll-spies the active section,
//  click scrolls to it. Hidden in print + below xl.
// ════════════════════════════════════════════════════════════════════════════

function SectionRail({ active }: { active: string }) {
  return (
    <nav
      data-print-hide
      aria-label="Report sections"
      className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
    >
      <ul className="flex flex-col gap-1">
        {SECTIONS.map((s) => {
          const on = s.id === active
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex items-center justify-end gap-2.5 py-1"
                aria-current={on ? "true" : undefined}
              >
                <span
                  className={cn(
                    "max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-medium tracking-tight opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100",
                    on ? "max-w-[160px] text-foreground opacity-100" : "text-ink-400",
                  )}
                >
                  {s.rail}
                </span>
                <span
                  className={cn(
                    "block size-2 shrink-0 rounded-full border transition-all",
                    on
                      ? "scale-125 border-brand-500 bg-brand-500"
                      : "border-ink-300 bg-transparent group-hover:border-brand-400 group-hover:bg-brand-200",
                  )}
                />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ════════════════════════════════════════════════════════════════════════════

export function CareerReportDoc({
  clientIdOverride,
  readOnly = false,
}: { clientIdOverride?: string; readOnly?: boolean } = {}) {
  const [params] = useSearchParams()
  const requested = clientIdOverride ?? params.get("client")
  // ?print=1 (the builder's PDF export) opens the browser's print → Save-as-PDF
  useEffect(() => {
    if (params.get("print") === "1") { const t = setTimeout(() => window.print(), 900); return () => clearTimeout(t) }
  }, [params])
  const client: Client = useMemo(() => {
    // demo personas are purged (clients = []), so for a real client id with no
    // seeded persona we scaffold a zero-state Client — never deref undefined.
    const base = (requested && getClient(requested)) || clients[0]
      || scaffoldClient(requested || "0", requested ? `Client ${requested}` : "Client")
    // If the client has completed the real Big Five + RIASEC tests, their actual
    // scores REPLACE the seeded radar so every chart and the AI narrative reflect
    // the assessments they took.
    const realRadar = realRadarFor(base.id, base.radar)
    return realRadar ? { ...base, radar: realRadar } : base
  }, [requested])

  // Bumped by "Regenerate" — re-runs the AI synthesis AND refreshes the structured
  // session/journey facts against the client's CURRENT transcripts & sessions, so a
  // counsellor can refresh the report after new sessions land. An intentional
  // cache-bust dep on the memos below (it re-reads the live session/transcript store).
  const [regenKey, setRegenKey] = useState(0)
  const generatedOn = "2026-06-19"
  const report = useMemo(() => buildReport(client, generatedOn), [client, regenKey])
  const {
    holland, bigFive, clusters, composites, routes, summary, jobMarket, plan, band,
    jobGroups, workRoles, journey, counsellorNotes,
  } = report

  const sessions = useMemo(() => clientSessions(client.id), [client.id, regenKey])
  const tests = useMemo(() => clientTests(client.id), [client.id])
  const indexHistory = useMemo(() => clientIndexHistory(client.id), [client.id])
  // Prefer the client's REAL aptitude result (chart, caption, battery list and AI
  // payload all read this single source) so they can never contradict each other.
  const realAbilities = useMemo(() => realAbilitiesFor(client.id), [client.id])
  const abilities = useMemo(() => realAbilities ?? abilityMetrics(tests), [realAbilities, tests])
  const clinical = client.clinical
  const firstName = client.preferredName ?? client.name.split(" ")[0]

  // derived visualization inputs
  const milestones = useMemo(
    () => growthMilestones(journey, sessions, generatedOn),
    [journey, sessions],
  )
  const influence = useMemo(() => influenceNodes(clusters, firstName), [clusters, firstName])

  // transcript quotes, when a real transcript exists for this client (otherwise
  // the report leans on counsellor notes + session summaries in the closing section).
  const quotes = transcript.filter((t) => t.speaker !== "Dr. Lin").slice(0, 2)
  const showTranscript = quotes.length > 0

  // ── editing + sharing ────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const shared = useIsShared(client.id)
  const edits = useProseEdits(client.id) // reactive — re-render when an edit is saved
  const reportTitle = `Career Intelligence Report · ${client.name}`

  const onToggleShare = useCallback(() => {
    const next = !shared
    setShared(client.id, next, { title: reportTitle })
    // lightweight toast
    showToast(next ? "Shared to client's profile" : "Sharing turned off")
  }, [shared, client.id, reportTitle])

  /** Resolve the text for an editable block: saved edit → AI/scaffold value. */
  const resolved = useCallback(
    (sectionId: string, value: string) => getProseEdits(client.id)[sectionId] ?? value,
    // depend on `edits` so a fresh save re-resolves
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client.id, edits],
  )
  const onEdit = useCallback(
    (sectionId: string) => (text: string) => saveProseEdit(client.id, sectionId, text),
    [client.id],
  )
  const onRegenerate = useCallback(() => {
    setResult({ id: client.id, ai: null, state: "loading" })
    setRegenKey((k) => k + 1)
    showToast("Regenerating from the latest sessions & transcripts…")
  }, [client.id])

  // ── AI narrative: fetch on mount, show loading, fall back gracefully ─────────────
  // One result object keyed by client id. The reset on client change happens during
  // render (React's "adjust state on prop change" pattern) so the effect body never
  // calls setState synchronously; the effect only kicks the async fetch.
  const [result, setResult] = useState<{ id: string; ai: AINarrative | null; state: "loading" | "done" | "error" }>(
    { id: client.id, ai: null, state: "loading" },
  )
  if (result.id !== client.id) {
    setResult({ id: client.id, ai: null, state: "loading" })
  }
  const ai = result.id === client.id && result.state === "done" ? result.ai : null
  const aiState = result.id === client.id ? result.state : "loading"

  useEffect(() => {
    let live = true

    const payload = {
      client: {
        id: client.id,
        name: client.name,
        preferredName: client.preferredName ?? firstName,
        pronouns: client.pronouns ?? "they/them",
        age: client.age,
        headline: client.headline,
        blueprintHeadline: client.blueprint.headline,
      },
      facts: {
        careerIndex: client.blueprint.careerIndex,
        band: band.label,
        confidence: client.blueprint.confidence,
        wellbeingIndex: clinical.wellbeingIndex,
        wellbeingBand: clinical.wellbeingBand,
        contradiction: client.blueprint.contradiction?.text ?? null,
      },
      scores: {
        bigFive: bigFive.map((t) => ({ axis: t.axis, value: t.value, level: t.level })),
        holland: { code: holland.code, top: holland.top },
        clusters: clusters.map((c) => ({ key: c.key, label: c.label, score: c.score })),
        composites: composites.map((c) => ({ id: c.id, name: c.name, score: c.score })),
        abilities: abilities.map((a) => ({ label: a.label, value: a.value })),
      },
      routes: routes.map((r) => ({
        id: r.id, title: r.title, fitTag: r.fitTag, probability: r.probability,
        horizon: r.horizon, confidence: r.confidence, moves: r.moves,
      })),
      jobGroups,
      workRoles,
      journey: journey.map((s) => ({ key: s.key, title: s.title, facts: s.facts })),
      sessions: sessions
        .filter((s) => s.summary)
        .map((s) => ({ date: s.date, summary: s.summary, snippet: s.snippet, indexDelta: s.indexDelta })),
      counsellorNotes,
      counsellorWeight: report.counsellorWeight,
      // the client's FULL record + complete session transcript, so the model
      // synthesises from and cites real evidence rather than a thin digest.
      // Real assessment results (Big Five / RIASEC / aptitude) are appended so
      // the narrative is grounded in the tests the client actually took.
      dossier: [dossierText(client), assessmentSummary(client.id)].filter(Boolean).join("\n\n"),
      transcript: transcriptText(client),
    }

    const cid = client.id
    Promise.resolve()
      .then(() => fetchReportNarrative(payload))
      .then((res) => {
        if (!live) return
        setResult({ id: cid, ai: res, state: res ? "done" : "error" })
      })
      .catch(() => {
        if (live) setResult({ id: cid, ai: null, state: "error" })
      })

    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, regenKey])

  const loading = aiState === "loading"

  // ── merged prose (AI preferred, scaffold fallback) ──────────────────────────────
  const framingThesis = asStr(ai?.framingThesis)
  const execText = (asStrArr(ai?.executiveSummary) ?? summary.paragraphs).join("\n\n")
  const jobMarketText = (asStrArr(ai?.jobMarket) ?? jobMarket).join("\n\n")
  const counsellorSynthesisText =
    asStr(ai?.counsellorSynthesis) ??
    [
      `Taken together, ${firstName}'s profile reads as a capability base that is ahead of the felt sense of it. The most useful thing I can say is that the work from here is consolidation and exposure, not more assessment: the evidence is on record, and what remains is conviction, packaging, and protected reserves.`,
      `My recommendation is to commit to ${routes[0]?.title.toLowerCase() ?? "the lead route"} as the primary bet while keeping one adjacent option warm, and to treat the 90-day plan as a sequence of reps rather than a checklist — each completed interview and each warm connection compounds.`,
    ].join("\n\n")
  const aiRecs = asStrArr(ai?.recommendations)
  // narrate-over lookups (the AI returns these as arrays keyed by id/stage key)
  const routeNarr = useMemo(
    () => new Map((ai?.routeNarratives ?? []).map((r) => [r.id, r.rationale])),
    [ai],
  )

  // fallback pull-quotes from real signals/quotes, so the editorial rhythm holds
  // even before / without the AI.
  const fallbackQuotes = useMemo(() => {
    const out: string[] = []
    const sigQuote = client.blueprint.signals.find((s) => s.quote)?.quote
    if (sigQuote) out.push(`${sigQuote[0].toUpperCase()}${sigQuote.slice(1)}.`)
    out.push(
      `The capability is already on record. What ${firstName} is closing is the distance between proof and self-belief.`,
    )
    if (routes[0]) out.push(`The data points one way first: ${routes[0].title.toLowerCase()} — the lowest-stretch, highest-base-rate move on the board.`)
    return out
  }, [client, firstName, routes])

  const pullQuotes = asStrArr(ai?.pullQuotes) ?? []
  const quoteAt = (i: number) => pullQuotes[i] ?? fallbackQuotes[i % Math.max(1, fallbackQuotes.length)]

  // a real client-voice line for a reflection moment (only if a transcript exists)
  const reflectionVoice = useMemo(() => {
    const t = transcript.find((x) => x.speaker !== "Dr. Lin" && x.text && x.text.length > 24)
    return t?.text
  }, [])

  // ── scroll-spy for the rail ──────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id)
  const activeRef = useRef(activeSection)
  activeRef.current = activeSection
  useEffect(() => {
    const els = SECTIONS
      .map((s) => document.querySelector<HTMLElement>(`[data-section="${s.id}"]`))
      .filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    const visible = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.getAttribute("data-section")
          if (!id) continue
          if (e.isIntersecting) visible.set(id, e.intersectionRatio)
          else visible.delete(id)
        }
        // pick the most-visible section, preserving DOM order on ties
        let best: string | null = null
        let bestRatio = -1
        for (const s of SECTIONS) {
          const r = visible.get(s.id)
          if (r != null && r > bestRatio) { bestRatio = r; best = s.id }
        }
        if (best && best !== activeRef.current) setActiveSection(best)
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [client.id])

  const get = (no: string) => SECTIONS.find((s) => s.no === no)!

  return (
    <>
      <style>{PRINT_CSS}</style>
      <SectionRail active={activeSection} />

      {/* sticky screen-only action row */}
      <div
        data-print-hide
        className="sticky top-16 z-10 -mx-8 mb-7 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-8 py-3 backdrop-blur"
      >
        {readOnly ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <ShieldCheck className="size-4 stroke-[1.5] text-well-600" /> Shared by your counsellor
          </span>
        ) : (
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 stroke-[1.5]" /> Back to reports
          </Link>
        )}
        <div className="flex items-center gap-3">
          {loading && (
            <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-400 sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-500" /> Composing…
            </span>
          )}
          {readOnly ? (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-muted"
            >
              Save as PDF
            </button>
          ) : (
            <ReportActions
              editing={editing}
              onToggleEdit={() => setEditing((v) => !v)}
              shared={shared}
              onToggleShare={onToggleShare}
              onPrint={() => window.print()}
              onRegenerate={onRegenerate}
              // only show the spinner state for a regen the counsellor triggered —
              // not the initial compose (which has its own "Composing…" indicator).
              regenerating={loading && regenKey > 0}
            />
          )}
        </div>
      </div>

      <div className="career-doc mx-auto w-full max-w-[880px] space-y-7 text-foreground">

        {/* editing hint banner (screen-only) */}
        {editing && (
          <div
            data-print-hide
            className="avoid-break flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-100/50 px-4 py-2.5 text-[12px] text-brand-600"
          >
            <span className="size-1.5 rounded-full bg-brand-500" />
            Editing on — click any written passage to revise it. Changes save automatically and replace the AI text for this client.
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            COVER — minimal, floating over a faint logomark watermark.
            ════════════════════════════════════════════════════════════════════ */}
        <section
          className="career-page avoid-break relative isolate overflow-hidden rounded-2xl border border-hairline bg-card px-9 py-16 shadow-[var(--shadow-e2)] sm:px-14 sm:py-24"
        >
          {/* logomark watermark — ONE joint shape: solid mark flattened by
              element opacity, so the five strokes never show their overlaps. */}
          <div className="pointer-events-none absolute -right-16 -top-10 -z-10 text-foreground opacity-[0.04] sm:-right-24" aria-hidden>
            <LogoMark size={560} />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-card/60" aria-hidden />

          <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-brand-500">Career Intelligence Report</p>
          <h1 className="mt-6 font-display text-[44px] font-light leading-[1.02] tracking-tight text-foreground sm:text-[68px]">
            {client.name}
          </h1>
          <div className="mt-7 h-px w-16 bg-foreground" />

          <p className="mt-9 max-w-md text-[14px] leading-relaxed text-ink-500">
            A considered read of where {firstName} stands, who {firstName} is, and the paths that open from here —
            prepared after time spent with the assessments, the sessions, and {firstName}'s own words.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-6">
            <CoverField label="Date of issue" value={fmtDate(generatedOn)} />
            <CoverField label="Counsellor" value={counselor.name} sub={counselor.title} />
          </div>

          <p className="mt-12 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-400">
            <ShieldCheck className="mt-px size-3.5 shrink-0 stroke-[1.5]" />
            <span>
              Strictly confidential. Prepared exclusively for {client.name} and {counselor.name}. A structured decision
              aid — not a diagnosis or a guarantee of outcome. Not for distribution beyond the intended recipients.
            </span>
          </p>
        </section>

        {/* contents — numbered, links into the scroll */}
        <Page id="contents" no="—" title="Contents" kicker={`${SECTIONS.length} chapters`}>
          <ol className="grid gap-x-12 gap-y-0 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-3 border-b border-hairline py-2.5 text-[13px] transition-colors hover:text-brand-500"
                >
                  <span className="font-mono text-[11px] tabular-nums text-ink-300">{s.no}</span>
                  <span className="text-ink-700 group-hover:text-brand-500">{s.title}</span>
                  <span className="mx-1 h-px flex-1 self-end bg-[repeating-linear-gradient(90deg,var(--color-ink-200)_0_1px,transparent_1px_4px)]" />
                  <span className="font-mono text-[11px] tabular-nums text-ink-300 group-hover:text-brand-500">{s.no}</span>
                </a>
              </li>
            ))}
          </ol>
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            01 · THE THROUGH-LINE — the framing thesis as a signature statement.
            ════════════════════════════════════════════════════════════════════ */}
        <SignatureInsight
          kicker="The through-line"
          insight={
            framingThesis ??
            `${firstName} arrived with a question and is leaving with a direction: a capability base that already clears the bar, waiting on conviction and packaging to catch up.`
          }
          sub={`${band.label} · Career Index ${client.blueprint.careerIndex ?? "—"}/100 · held at ${CONFIDENCE_LABEL[client.blueprint.confidence].toLowerCase()} confidence.`}
        />
        {/* anchor wrapper so the rail can target the thesis */}
        <div id="thesis" data-section="thesis" className="scroll-mt-28" aria-hidden />

        {/* ════════════════════════════════════════════════════════════════════
            02 · EXECUTIVE SUMMARY — the considered overview + proof stats.
            ════════════════════════════════════════════════════════════════════ */}
        <Page id={get("02").id} no={get("02").no} title={get("02").title} kicker="Synthesis" breakBefore>
          <div className="grid gap-8 lg:grid-cols-[1fr_248px]">
            <div>
              {loading ? (
                <ComposingBanner />
              ) : (
                <EditableProse
                  value={resolved("summary", execText)}
                  editable={editing}
                  onChange={onEdit("summary")}
                />
              )}
            </div>
            <aside className="space-y-5">
              <div className="rounded-2xl border border-hairline bg-ink-050 p-4 text-center">
                <Label>Headline outlook</Label>
                <div className="mt-3 grid place-items-center">
                  <Gauge value={summary.outlook.probability} unit="%" band="success odds" size={132} variant="ring" ticks={36} tone="brand" />
                </div>
                <p className="mt-2 text-[11px] leading-snug text-ink-500">{summary.outlook.label}</p>
              </div>
              <div>
                <Label>Top strengths</Label>
                <ul className="mt-2 space-y-1.5">
                  {summary.topStrengths.map((s) => (
                    <li key={s.label} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-ink-700">{s.label}</span>
                      <span className="font-medium tabular-nums text-foreground">{s.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label>Key risks</Label>
                <ul className="mt-2 space-y-2">
                  {summary.keyRisks.map((r) => (
                    <li key={r.label} className="text-[11.5px] leading-snug">
                      <span className="font-medium text-foreground">{r.label}.</span>{" "}
                      <span className="text-ink-500">{r.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCallout value={client.blueprint.careerIndex ?? "—"} unit="/100" label="Career Index" sub={band.label} tone="brand" />
            <StatCallout value={summary.outlook.probability} unit="%" label="Lead-route odds" sub="modelled" />
            <StatCallout value={routes.length} label="Routes modelled" sub="ranked by fit" />
            <StatCallout value={shortHorizon(routes[0]?.horizon)} label="Time-to-offer" sub="focused effort" />
          </div>
        </Page>

        <PullQuote text={quoteAt(0)} attrib={`${counselor.name}, on ${firstName}`} />

        {/* ════════════════════════════════════════════════════════════════════
            03 · WHO YOU ARE — personality as a soft landscape (replaces the radar
                 as the lead; the radar + bipolar stay as a supporting read).
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("03").no} id={get("03").id}
          title={get("03").title}
          sub="The stable temperament beneath the day-to-day — how you characteristically work, decide and relate." />
        <Page>
          {loading ? (
            <ComposingBanner />
          ) : (
            <EditableProse
              value={resolved("personality", sectionText(ai, "personality", [
                `The Big Five sketches how ${firstName} characteristically works, decides and relates. Read alongside interests and ability, it explains not just which roles fit but how to make any role sustainable.`,
              ]))}
              editable={editing}
              onChange={onEdit("personality")}
            />
          )}

          {/* the signature landscape — traits as a terrain, clusters as a sky */}
          <div className="mt-7">
            <PsychLandscape traits={bigFive} clusters={clusters} />
          </div>

          {/* the trait-by-trait read, with the radar as a compact companion */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="avoid-break grid place-items-center self-start rounded-2xl border border-hairline bg-ink-050 p-3">
              <Radar data={client.radar.bigFive} tone="mind" size={244} label="Big Five" />
            </div>
            <div className="space-y-4">
              {bigFive.map((t) => (
                <div key={t.axis} className="avoid-break">
                  <BipolarBar low={`Low ${t.axis}`} high={`High ${t.axis}`} score={Math.round((t.value / 100) * 99)} />
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{t.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
          <ExhibitCaption>
            The peaks are the levers — the high poles are where {firstName} works best with the grain;
            the low poles are where deliberate structure pays for itself.
          </ExhibitCaption>
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            04 · INTERESTS & STRENGTHS — RIASEC + work roles + job groups + abilities.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("04").no} id={get("04").id}
          title={get("04").title}
          sub={`Your interests resolve to a ${holland.code} (Holland) code — the compass needle — set against the role shapes, job families and aptitudes that play to it.`} />

        {/* interests */}
        <Page no="04·a" title="Interests" kicker={holland.code}>
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <div className="avoid-break grid place-items-center self-start rounded-2xl border border-hairline bg-ink-050 p-3">
              <Radar data={client.radar.riasec} tone="brand" size={262} label="RIASEC" />
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {holland.top.map((a, i) => (
                  <span
                    key={a.axis}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium",
                      i === 0 ? "border-brand-500 bg-brand-100 text-brand-600" : "border-hairline bg-ink-050 text-ink-700",
                    )}
                  >
                    {a.axis} <span className="tabular-nums text-ink-400">{a.value}</span>
                  </span>
                ))}
              </div>
              {loading ? (
                <ComposingBanner />
              ) : (
                <EditableProse
                  value={resolved("interests", sectionText(ai, "interests", [holland.narrative, holland.environments]))}
                  editable={editing}
                  onChange={onEdit("interests")}
                />
              )}
            </div>
          </div>
          <ExhibitCaption>
            Holland code {holland.code}: {holland.primary.axis} leads at {holland.primary.value}, {holland.secondary.axis} close
            behind at {holland.secondary.value} — best-fit work sits where rigour meets a visible payoff.
          </ExhibitCaption>
        </Page>

        {/* work roles */}
        <Page no="04·b" title="Work Roles" kicker="Percentile fit">
          {loading ? (
            <ComposingBanner />
          ) : (
            <EditableProse
              value={resolved("workRoles", sectionText(ai, "workRoles", [
                `Each role archetype below is scored as a percentile against the norm — a read of natural fit, not a ceiling. ${firstName}'s strongest archetypes are the ones to lead with; the lower bands name where a role would ask the most adaptation.`,
              ]))}
              editable={editing}
              onChange={onEdit("workRoles")}
            />
          )}
          <div className="mt-6 space-y-2.5">
            {workRoles.map((r) => {
              const meta = ROLEBAND_META[r.band]
              return (
                <div key={r.name} className="avoid-break grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-xl border border-hairline p-3.5">
                  <span className="text-[13px] font-medium text-foreground">{r.name}</span>
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      meta.tone === "brand" ? "bg-brand-100 text-brand-600" : meta.tone === "warn" ? "bg-warn-100 text-warn-600" : "bg-risk-100 text-risk-600",
                    )}>{meta.label}</span>
                    <span className="w-12 text-right font-display text-[16px] font-light tabular-nums text-foreground">{r.percentile}<span className="text-[10px] text-ink-300">th</span></span>
                  </span>
                  <div className="col-span-2"><Track value={r.percentile} tone={meta.tone} /></div>
                </div>
              )
            })}
          </div>
          <ExhibitCaption>
            {workRoles[0] && `${workRoles[0].name} is the highest-fit archetype at the ${workRoles[0].percentile}th percentile — the natural shape for a near-term move.`}
          </ExhibitCaption>
        </Page>

        {/* job groups */}
        <Page no="04·c" title="Job Groups" kicker={`${jobGroups.length} families`}>
          {loading ? (
            <ComposingBanner />
          ) : (
            <EditableProse
              value={resolved("jobGroups", sectionText(ai, "jobGroups", [
                `Job groups rank entire occupational families by their overlap with ${firstName}'s profile. The Similar band is where fit is strongest and the search should start; Midrange is workable with intent; Dissimilar is a deliberate stretch worth naming rather than drifting into.`,
              ]))}
              editable={editing}
              onChange={onEdit("jobGroups")}
            />
          )}
          <div className="mt-6 space-y-2.5">
            {jobGroups.map((g) => {
              const meta = BAND3_META[g.band]
              return (
                <div key={g.name} className="avoid-break grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-xl border border-hairline p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{g.name}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      meta.tone === "brand" ? "bg-brand-100 text-brand-600" : meta.tone === "warn" ? "bg-warn-100 text-warn-600" : "bg-risk-100 text-risk-600",
                    )}>{meta.label}</span>
                  </div>
                  <span className="w-12 text-right font-display text-[16px] font-light tabular-nums text-foreground">{g.similarity}<span className="text-[10px] text-ink-300">%</span></span>
                  <div className="col-span-2"><Track value={g.similarity} tone={meta.tone} /></div>
                </div>
              )
            })}
          </div>

          <div className="mt-7">
            <Label>The three closest families, in detail</Label>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {jobGroups.slice(0, 3).map((g, i) => (
                <div key={g.name} className="avoid-break flex flex-col rounded-2xl border border-hairline bg-ink-050 p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                    <h4 className="font-display text-[14px] font-medium text-foreground">{g.name}</h4>
                  </div>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-500">{g.similarity}% match · {BAND3_META[g.band].label}</p>
                  {g.topRoles.length ? (
                    <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
                      {g.topRoles.slice(0, 3).map((role) => (
                        <li key={role.name} className="flex items-center justify-between gap-2 text-[12px] text-ink-700">
                          <span className="flex items-center gap-2 truncate">
                            <span className="size-1 shrink-0 rounded-full bg-brand-500" />{role.name}
                          </span>
                          <span className={cn(
                            "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                            role.level === "High" ? "text-brand-600" : role.level === "Average" ? "text-warn-600" : "text-ink-400",
                          )}>{role.level}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <ExhibitCaption>
            {jobGroups[0] && `${jobGroups[0].name} is the closest family at ${jobGroups[0].similarity}% overlap — the most efficient place to concentrate the early search.`}
          </ExhibitCaption>
        </Page>

        {/* abilities */}
        <Page no="04·d" title="Abilities" kicker="Assessed">
          {loading ? (
            <ComposingBanner />
          ) : (
            <EditableProse
              value={resolved("abilities", sectionText(ai, "abilities", [
                `Aptitude evidence from the battery, normalised to a 0–100 scale. These figures describe demonstrated capability and feed directly into the market-readiness read.`,
              ]))}
              editable={editing}
              onChange={onEdit("abilities")}
            />
          )}
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="avoid-break self-start rounded-2xl border border-hairline bg-ink-050 p-4">
              <Bars data={abilities.map(({ label, value, highlight }) => ({ label, value, highlight }))} unit="/100" height={196} />
            </div>
            <div className="space-y-2.5">
              {(realAbilities
                ? realAbilities.map((a) => ({ id: a.label, name: a.label, detail: a.meta, done: true }))
                : tests.map((t) => ({ id: t.id, name: t.name, detail: `${t.result} · feeds ${t.feeds}`, done: t.status === "completed" }))
              ).map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 border-b border-hairline pb-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground">{row.name}</p>
                    <p className="text-[11px] text-ink-400">{row.detail}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    row.done ? "bg-well-100 text-well-600" : "bg-ink-050 text-ink-400",
                  )}>{row.done ? "Done" : "Pending"}</span>
                </div>
              ))}
            </div>
          </div>
          <ExhibitCaption>
            {abilities[0] &&
              `${[...abilities].sort((a, b) => b.value - a.value)[0].label} is the standout aptitude and a natural anchor for role direction; the lower bands flag where targeted upskilling would most move readiness.`}
          </ExhibitCaption>
        </Page>

        {/* a breath between strengths and the journey */}
        <ReflectionMoment
          quote={quoteAt(1)}
          kicker="A moment to reflect"
        />

        {/* ════════════════════════════════════════════════════════════════════
            05 · THE JOURNEY SO FAR — the growth timeline (journey + sessions).
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("05").no} id={get("05").id}
          title={get("05").title}
          sub={`From the question that brought ${firstName} here to the direction they leave with — the path, milestone by milestone.`} />
        <Page>
          <GrowthTimeline milestones={milestones} />
          <ExhibitCaption>
            {indexHistory.length > 1
              ? `Across ${indexHistory.length} measured points the Career Index moved from ${indexHistory[0].careerIndex} to ${indexHistory[indexHistory.length - 1].careerIndex} — the trajectory is plotted in full in “Your Possible Futures”.`
              : `The arc fills in as the sessions continue.`}
          </ExhibitCaption>

          {/* the dated session record stays as a precise companion */}
          <div className="mt-7">
            <Label>Session record</Label>
            <SessionTimeline sessions={sessions} />
          </div>
        </Page>

        {/* a second breath — a real client line where one exists */}
        {reflectionVoice && (
          <ReflectionMoment
            quote={reflectionVoice}
            attribution={`${firstName}, in session`}
            kicker="In their own words"
          />
        )}

        {/* ════════════════════════════════════════════════════════════════════
            06 · CAREER INDEX & CLUSTERS — the core model.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("06").no} id={get("06").id}
          title={get("06").title}
          sub="A single read of employability momentum, decomposed into where the strength and the constraint actually live." />
        <Page kicker="Core model">
          <div className="mb-6 flex flex-col items-center gap-6 rounded-2xl border border-hairline bg-ink-050 p-5 sm:flex-row sm:gap-8">
            <Gauge
              value={client.blueprint.careerIndex}
              unit="/100" band={band.label} size={154} variant="ring" ticks={40}
              tone={toneForScore(client.blueprint.careerIndex ?? 0)}
            />
            <div className="flex-1">
              <p className="font-display text-[18px] font-light text-foreground">{client.blueprint.headline}</p>
              <div className="mt-2">
                {loading ? (
                  <ComposingBanner />
                ) : (
                  <EditableProse
                    value={resolved("clusters", sectionText(ai, "clusters", [
                      `The Career Index aggregates 31 underlying signals into a single read of employability momentum, held at ${CONFIDENCE_LABEL[client.blueprint.confidence].toLowerCase()} confidence. The five clusters below decompose that headline into where the strength and the constraint actually live.`,
                    ]))}
                    editable={editing}
                    onChange={onEdit("clusters")}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {clusters.map((c) => (
              <div key={c.key} className="avoid-break rounded-2xl border border-hairline p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-display text-[15px] font-medium text-foreground">{c.label}</h4>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[15px] font-light tabular-nums text-foreground">{c.score}</span>
                    <span className="text-[11px] text-ink-300">/100</span>
                  </div>
                </div>
                <div className="mt-2"><Track value={c.score} tone={toneForScore(c.score)} /></div>
                <Prose className="mt-3 text-[12.5px]">{c.analysis}</Prose>
                <div className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {c.signals.map((s) => (
                    <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[11.5px]">
                      <span className="truncate text-ink-600">{s.name}</span>
                      {s.delta != null && s.delta !== 0 ? <DeltaPill value={s.delta} /> : <span />}
                      <span className="font-medium tabular-nums text-foreground">{s.score ?? "—"}</span>
                      <div className="col-span-3"><Track value={s.score ?? 0} tone={toneForScore(s.score ?? 0)} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <Label>Composite indices</Label>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {composites.map((c) => (
                <div key={c.id} className="avoid-break flex items-center gap-5 rounded-2xl border border-hairline p-4">
                  <ScoreRing value={c.score} size={80} sublabel={c.id.replace("cx.", "")} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                    <p className="font-mono text-[10.5px] text-ink-300">{c.id}</p>
                    <div className="mt-2"><ConfBadge confidence={c.confidence} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            07 · WELLBEING & RESERVES — the clinical layer.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("07").no} id={get("07").id}
          title={get("07").title}
          sub="Career gains rarely hold when reserves are depleted — the sustainability behind the numbers." />
        <Page kicker="Clinical layer">
          {loading ? (
            <ComposingBanner />
          ) : (
            <EditableProse
              value={resolved("wellbeing", sectionText(ai, "wellbeing", [
                `This layer reads the sustainability behind the numbers — handled sensitively, as proxies for capacity rather than a clinical verdict.`,
              ]))}
              editable={editing}
              onChange={onEdit("wellbeing")}
            />
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <WellStat label="Wellbeing" value={clinical.wellbeingIndex} band={clinical.wellbeingBand ?? "—"} tone="well" />
            <WellStat label="Alliance" value={clinical.alliance} band="rapport" tone="brand" />
            <WellStat label="Engagement" value={clinical.engagement} band="participation" tone="mind" />
            <WellStat label="Adherence" value={clinical.adherence} band="follow-through" tone="brand" />
          </div>

          {client.blueprint.contradiction && (
            <div className="avoid-break mt-6 rounded-2xl border border-warn-600/30 bg-warn-100 p-4">
              <Label>Career × wellbeing tension</Label>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">
                {client.blueprint.contradiction.text} Momentum and capacity pull in opposite directions here; the careful
                move is to bank the career gains while deliberately protecting recovery, so the climb stays survivable
                rather than costing the very reserves that make it possible.
              </p>
            </div>
          )}
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            08 · WHERE THE MARKET MEETS YOU — job-market outlook.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("08").no} id={get("08").id}
          title={get("08").title}
          sub="How the profile would land in the market today — readiness, demand, and a credible time-to-offer." />
        <Page kicker="Outlook">
          <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
            <div>
              {loading ? (
                <ComposingBanner />
              ) : (
                <EditableProse
                  value={resolved("jobMarket", jobMarketText)}
                  editable={editing}
                  onChange={onEdit("jobMarket")}
                />
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-hairline bg-ink-050 p-4">
                <Label>Readiness signal</Label>
                <div className="mt-3 grid place-items-center">
                  <Gauge
                    value={clusters.find((c) => c.key === "market_readiness")?.score ?? 0}
                    unit="/100" band="market readiness" size={130} variant="arc" tone="brand"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-hairline p-4">
                <Label>Time-to-offer</Label>
                <p className="mt-2 font-display text-[22px] font-light tabular-nums text-foreground">
                  {shortHorizon(routes[0]?.horizon)}
                </p>
                <p className="mt-1 text-[11px] text-ink-400">with the plan run as written</p>
              </div>
            </aside>
          </div>
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            09 · YOUR POSSIBLE FUTURES — trajectory map + future scenarios.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("09").no} id={get("09").id}
          title={get("09").title}
          sub={`Where you started, where you are, and the ${routes.length} routes that branch from here — ranked by a modelled probability of success.`} />
        <Page kicker="The map">
          {/* the signature trajectory map: past line → "you are here" → branches */}
          <TrajectoryMap
            history={indexHistory}
            routes={routes}
            currentLabel={`Now · index ${client.blueprint.careerIndex ?? "—"}`}
          />

          {/* the routes as divergent scenarios */}
          <div className="mt-9">
            <Label>The routes, as scenarios</Label>
            <div className="mt-4">
              <FutureScenarios routes={routes} />
            </div>
          </div>

          {/* the detailed route breakdown (required moves, horizon, confidence) */}
          <div className="mt-9 space-y-5">
            <Label>Each route, in detail</Label>
            {routes.map((r, i) => {
              const narr = asStr(routeNarr.get(r.id))
              return (
                <div key={r.id} className="avoid-break rounded-2xl border border-hairline p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="grid w-28 shrink-0 place-items-center">
                      <Gauge value={r.probability} unit="%" size={108} variant="ring" ticks={28} tone={toneForScore(r.probability)} />
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-ink-300">success odds</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                        <h4 className="font-display text-[16px] font-medium text-foreground">{r.title}</h4>
                      </div>
                      <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-brand-500">{r.fitTag}</p>
                      <Prose className="mt-2 text-[12.5px]">{narr ?? r.rationale}</Prose>
                      <div className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-[1fr_auto]">
                        <div>
                          <Label>Required moves</Label>
                          <ul className="mt-1.5 space-y-1">
                            {r.moves.map((m, j) => (
                              <li key={j} className="flex gap-2 text-[11.5px] text-ink-600">
                                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-500" />{m}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="shrink-0 text-right">
                          <Label>Horizon</Label>
                          <p className="mt-1.5 text-[12px] font-medium text-foreground">{r.horizon}</p>
                          <div className="mt-2 flex justify-end"><ConfBadge confidence={r.confidence} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[10.5px] leading-relaxed text-ink-300">
            Probabilities are modelled estimates on a 30–92% band, not guarantees. See the methodology footer for the exact weighting.
          </p>
        </Page>

        <PullQuote text={quoteAt(2)} />

        {/* ════════════════════════════════════════════════════════════════════
            10 · PEOPLE & ENVIRONMENT — the influence map.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("10").no} id={get("10").id}
          title={get("10").title}
          sub={`The forces around ${firstName} — who and what supports the move, what strains it, and where the open doors are.`} />
        <Page kicker="Orbit">
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="self-start">
              <InfluenceMap centerName={firstName} nodes={influence} />
            </div>
            <div className="space-y-3">
              <Prose className="text-[12.5px]">
                Closer forces pull harder. The map reads {firstName}'s network and environment cluster as a set of
                surrounding influences — support to lean on, strain to manage, and opportunity to convert.
              </Prose>
              <ul className="space-y-2.5">
                {influence.map((n) => (
                  <li key={n.label} className="flex items-center justify-between gap-3 rounded-xl border border-hairline p-3">
                    <span className="flex items-center gap-2 text-[12.5px] text-ink-700">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background:
                            n.kind === "support" ? "var(--color-well-600)"
                            : n.kind === "strain" ? "var(--color-warn-600)"
                            : "var(--color-brand-500)",
                        }}
                      />
                      {n.label}
                    </span>
                    <span className="font-display text-[14px] font-light tabular-nums text-foreground">{n.strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ExhibitCaption>
            The standing relationships are real leverage — protect the supports, name the strain early, and treat the
            open doors as the cheapest distance between {firstName} and the next offer.
          </ExhibitCaption>
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            11 · THE PLAN — the prioritised 90-day plan.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("11").no} id={get("11").id}
          title={get("11").title}
          sub="A prioritised, time-boxed plan — convert capability into visible evidence, build confidence through reps, protect the reserves." />
        <Page kicker="Action">
          {loading ? (
            <div className="mb-6"><ComposingBanner /></div>
          ) : aiRecs?.length ? (
            <div className="mb-6">
              <EditableProse
                value={resolved("recommendations", aiRecs.join("\n\n"))}
                editable={editing}
                onChange={onEdit("recommendations")}
              />
            </div>
          ) : null}
          {(["First 30 days", "Days 31–60", "Days 61–90"] as const).map((horizon) => (
            <div key={horizon} className="avoid-break mb-5">
              <div className="mb-2 flex items-center gap-3">
                <h4 className="font-display text-[14px] font-semibold text-foreground">{horizon}</h4>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              <div className="space-y-2.5">
                {plan.filter((p) => p.horizon === horizon).map((p) => (
                  <div key={p.title} className="flex items-start gap-3 rounded-xl border border-hairline p-3.5">
                    <span className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      p.priority === "P1" ? "bg-risk-100 text-risk-600" : p.priority === "P2" ? "bg-warn-100 text-warn-600" : "bg-ink-050 text-ink-500",
                    )}>{p.priority}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{p.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-600">{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Page>

        {/* ════════════════════════════════════════════════════════════════════
            12 · THE COUNSELLOR'S REFLECTION — the close.
            ════════════════════════════════════════════════════════════════════ */}
        <SectionOpener no={get("12").no} id={get("12").id}
          title={get("12").title}
          sub={`${counselor.name}'s integrated read — where the numbers, the sessions and the judgement meet.`} />
        <Page kicker="Integrated read">
          <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
            <div>
              {loading ? (
                <ComposingBanner />
              ) : (
                <EditableProse
                  value={resolved("counsellorSynthesis", counsellorSynthesisText)}
                  editable={editing}
                  onChange={onEdit("counsellorSynthesis")}
                />
              )}
            </div>
            <aside className="space-y-4">
              <div className="avoid-break rounded-2xl border border-hairline bg-ink-050 p-4">
                <Label>From the working notes</Label>
                <ul className="mt-3 space-y-2.5">
                  {counsellorNotes.slice(0, 5).map((n, i) => (
                    <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-ink-600">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {showTranscript && (
                <div className="avoid-break rounded-2xl border border-hairline p-4">
                  <Label>In their own words</Label>
                  <div className="mt-3 space-y-3">
                    {quotes.map((q, i) => (
                      <blockquote key={i} className="border-l-2 border-brand-500 pl-3">
                        <p className="text-[12px] italic leading-relaxed text-ink-700">“{q.text}”</p>
                        <p className="mt-1 text-[10px] text-ink-400">{q.speaker} · {q.ts}</p>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          <footer className="mt-8 border-t border-ink-200 pt-3">
            <p className="text-[10px] leading-relaxed text-ink-300">
              Setmycareer Career Intelligence · {client.name} · issued {fmtDate(generatedOn)} · {counselor.name}.
              Methodology: 31 pc.* signals → 5 confidence-weighted clusters → composite Career Index; route probabilities
              blend index, cluster, interest fit and stretch, discounted by confidence. Scores are point-in-time and
              rendered, never re-scored. A structured aid for discussion, not a diagnosis or a guarantee of outcome.
            </p>
          </footer>
        </Page>

        <div data-print-hide className="pb-10 text-center text-[11px] text-ink-300">
          End of report · {SECTIONS.length} chapters
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Large takeaway pull-quote set between sections.
// ════════════════════════════════════════════════════════════════════════════

function PullQuote({ text, attrib }: { text: string; attrib?: string }) {
  return (
    <figure className="avoid-break relative my-1 overflow-hidden rounded-2xl border border-hairline bg-card px-8 py-9 shadow-[var(--shadow-e1)] sm:px-12">
      <Quote className="absolute -left-1 -top-1 size-14 text-brand-100" aria-hidden />
      <blockquote className="relative">
        <p className="font-display text-[21px] font-light leading-[1.4] tracking-tight text-foreground sm:text-[26px]">
          “{text}”
        </p>
        {attrib && (
          <figcaption className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
            — {attrib}
          </figcaption>
        )}
      </blockquote>
    </figure>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Vertical dated session timeline.
// ════════════════════════════════════════════════════════════════════════════

function SessionTimeline({ sessions }: { sessions: Session[] }) {
  const ordered = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  if (!ordered.length) {
    return <Prose className="mt-2 italic text-ink-400">No sessions on record yet.</Prose>
  }
  return (
    <ol className="mt-3 space-y-0">
      {ordered.map((s, i) => {
        const last = i === ordered.length - 1
        return (
          <li key={s.id} className="avoid-break relative flex gap-4 pb-5 pl-1">
            {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-hairline" aria-hidden />}
            <span className={cn(
              "relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border bg-card",
              i === 0 ? "border-brand-500 ring-4 ring-brand-100" : "border-ink-300",
            )}>
              <span className={cn("absolute inset-1 rounded-full", i === 0 ? "bg-brand-500" : "bg-ink-300")} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-medium tabular-nums text-foreground">{fmtShort(s.date)}</span>
                <span className="text-[10.5px] text-ink-400">{s.durationMin} min</span>
                {s.indexDelta != null && s.indexDelta !== 0 && <DeltaPill value={s.indexDelta} />}
              </div>
              {s.summary && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-700">{s.summary}</p>}
              {s.snippet && <p className="mt-0.5 text-[11.5px] italic text-ink-400">“{s.snippet}”</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── tiny sub-components ──────────────────────────────────────────────────────────

function CoverField({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-300">{label}</p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">{value}</p>
      {sub && <p className="text-[10.5px] text-ink-400">{sub}</p>}
    </div>
  )
}

function WellStat({
  label, value, band, tone,
}: { label: string; value: number | null; band: string; tone: "well" | "brand" | "mind" }) {
  const ringTone = tone === "well" ? "well" : tone === "mind" ? "mind" : "brand"
  return (
    <div className="avoid-break flex flex-col items-center rounded-2xl border border-hairline p-4 text-center">
      <Gauge value={value} unit="" size={88} variant="radial" tone={ringTone} />
      <p className="mt-1 text-[12px] font-medium text-foreground">{label}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-300">{band}</p>
    </div>
  )
}

// ── lightweight toast (screen-only, no dependency) ───────────────────────────────

function showToast(message: string) {
  if (typeof document === "undefined") return
  const el = document.createElement("div")
  el.textContent = message
  el.setAttribute("role", "status")
  el.style.cssText = [
    "position:fixed", "left:50%", "bottom:28px", "transform:translateX(-50%) translateY(8px)",
    "z-index:60", "padding:9px 16px", "border-radius:10px",
    "background:var(--color-foreground,#1d1a15)", "color:var(--color-background,#fff)",
    "font-size:13px", "font-weight:500", "box-shadow:0 8px 30px rgba(0,0,0,0.18)",
    "opacity:0", "transition:opacity .2s ease, transform .2s ease", "pointer-events:none",
  ].join(";")
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = "1"
    el.style.transform = "translateX(-50%) translateY(0)"
  })
  setTimeout(() => {
    el.style.opacity = "0"
    el.style.transform = "translateX(-50%) translateY(8px)"
    setTimeout(() => el.remove(), 250)
  }, 2200)
}
