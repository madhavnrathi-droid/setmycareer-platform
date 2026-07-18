// The Reports hub — a full-width bento of evidence. A KPI strip counts what we
// hold; the Career Intelligence Report leads as a dark feature card wearing the
// product's signature liquid-metal field, paired with a "how it's built" method
// rail; each Career Test report carries its instrument's metallic swatch; and
// the counsellor's documents + notes sit side by side beneath. Everything is
// real — instruments taken, documents published, notes written — so an empty
// account reads as a designed starting line, never as fabricated data.

import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, FileText, ClipboardList, Download, NotebookPen, CalendarDays, Hourglass,
  Compass, Brain, Gauge, Sparkles, Check, Upload,
} from "lucide-react"
import { toast } from "sonner"
import { useIsShared } from "@/lib/report-share"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Pane, Eyebrow, Chip, GlassStat } from "@/components/custom/ui-kit"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { PackageGradient } from "../product/PackageGradient"
import { usePortalAccount, accountTrack } from "../portal-store"
import { useUserReports, useUserNotes, invalidateUser } from "@/lib/live-queries"
import { uploadReport } from "@/lib/smc-live-api"
import { SMC_WRITES_ENABLED } from "@/lib/smc-api"
import { useTestResults } from "../tests/results-store"
import { testsFor, getTest } from "../tests/catalog"
import { IsoGlyph } from "../components/IsoGlyphs"
import { cn } from "@/lib/utils"

/* ── upload your own documents — mark sheets, other test reports, certificates.
      They land on the member's live SetMyCareer record via the same rail the
      test reports use, so their counsellor and the admin team see them in the
      client-detail report lists they already have. ─────────────────────────── */
function UploadDocRow({ clientId }: { clientId: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 15 * 1024 * 1024) { toast.error("That file is over 15 MB — please compress it first."); return }
    if (!SMC_WRITES_ENABLED) { toast("Uploads aren't enabled in this environment."); return }
    const suggested = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")
    const title = window.prompt("Name this document (shown to your counsellor):", suggested)
    if (title == null) return
    setBusy(true)
    try {
      await uploadReport(clientId, title.trim() || suggested, f)
      invalidateUser(clientId)
      toast.success("Uploaded — your counsellor and the SetMyCareer team can now see it.")
    } catch (e) {
      toast.error((e as Error).message || "Couldn't upload that file. Please try again.")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-ink-200 px-4 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-ink-600"><Upload className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-normal text-foreground">Add your own documents</p>
        <p className="text-[11.5px] font-light leading-snug text-muted-foreground">
          Mark sheets, other test reports, certificates — anything that helps your counsellor read you better.
        </p>
      </div>
      <input
        ref={fileRef} type="file" className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="shrink-0 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </div>
  )
}

const glyphId = (t: { id: string; kind: string }) => (t.kind === "ccpa" ? "aptitude_ccpa" : t.kind === "dbda" ? "aptitude_dbda" : t.id)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })

// the three instruments that feed the synthesis, in the order the report reads
// them — icon per instrument so the method rail is recognisable at a glance
// keyed by the REAL catalog ids (the Ability test's id is "aptitude", not
// "sigma_aptitude") so done-state + icons can never drift from the store
const INSTRUMENT_ICON: Record<string, typeof Compass> = {
  sigma_interest: Compass, sigma_personality: Brain, aptitude: Gauge,
}
const INSTRUMENT_SHORT: Record<string, string> = {
  sigma_interest: "Interests", sigma_personality: "Personality", aptitude: "Ability",
}
// reading order of the synthesis inputs (real ids)
const INSTRUMENT_ORDER = ["sigma_interest", "sigma_personality", "aptitude"]

export function PortalReports() {
  const account = usePortalAccount()
  const shared = useIsShared(account?.clientId ?? "")
  const results = useTestResults(account?.clientId ?? "")
  const liveReports = useUserReports(account?.clientId)
  const liveNotes = useUserNotes(account?.clientId)
  const root = useGsap((s) => revealChildren(s), [account?.clientId, results.length, liveReports.data?.length])
  if (!account) return null

  const TESTS = testsFor(accountTrack(account))
  const reports = liveReports.data ?? []
  const notes = (liveNotes.data ?? []).filter((n) => n.comment)
  const careerReady = shared || reports.length > 0

  const takenIds = new Set(results.map((r) => r.testId))
  const instrDone = TESTS.filter((t) => takenIds.has(t.id)).length
  const total = TESTS.length
  // "evidence base" = share of instruments in hand. Real, catalog-driven — the
  // synthesis needs these inputs, so this is how complete the base is.
  const evidencePct = Math.round((instrDone / total) * 100)

  // the report's inputs, in reading order, each with its real done/pending state
  // (keyed by real catalog ids, so a completed instrument always reads as done)
  const inputs = INSTRUMENT_ORDER.map((id) => ({
    id, label: INSTRUMENT_SHORT[id] ?? getTest(id)?.name ?? id, Icon: INSTRUMENT_ICON[id] ?? ClipboardList, done: takenIds.has(id),
  }))

  return (
    <div ref={root} className="space-y-6">
      {/* masthead — full width, state on the right */}
      <header data-reveal className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-500">The evidence</p>
          <h1 className="mt-2 font-editorial text-[32px] font-light tracking-tight sm:text-[38px]">Reports</h1>
          <p className="mt-1.5 max-w-[54ch] text-[14px] text-muted-foreground">Everything we've learned about you — instruments, synthesis and the documents your counsellor publishes, in one place.</p>
        </div>
        <Chip tone={careerReady ? "well" : "dashed"} icon={careerReady ? Check : Hourglass}>
          {careerReady ? "Synthesis ready" : "Synthesis in progress"}
        </Chip>
      </header>

      {/* KPI strip — what we hold, counted */}
      <div data-reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GlassStat label="Instruments" value={String(instrDone)} unit={`/${total}`} />
        <GlassStat label="Published documents" value={String(reports.length)} />
        <GlassStat label="Counsellor notes" value={String(notes.length)} />
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-[rgba(24,24,27,0.06)]">
          <ScoreRing value={evidencePct} size={54} stroke={5} tone="progress" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-muted-foreground">Evidence base</p>
            <p className="mt-0.5 text-[13px] font-semibold text-foreground">{instrDone === total ? "Complete" : instrDone === 0 ? "Not started" : "Building"}</p>
          </div>
        </div>
      </div>

      {/* the headline synthesis + how it's built */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* dark feature card wearing the product's signature field */}
        <Link
          data-reveal
          to={careerReady ? "/portal/reports/career" : "#"}
          className={cn(
            "group relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-white lg:col-span-8 sm:p-7",
            !careerReady && "pointer-events-none",
          )}
        >
          <PackageGradient offeringId="report_career" />
          <div className="relative flex items-start justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">Career Intelligence Report</span>
            {careerReady
              ? <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-medium backdrop-blur-sm">Ready</span>
              : <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/40 px-2.5 py-1 text-[10.5px] font-medium text-white/80"><Hourglass className="size-3" /> In progress</span>}
          </div>
          <div className="relative">
            <p className="font-editorial text-[28px] font-light leading-tight tracking-tight sm:text-[34px]">
              {careerReady ? "Your full synthesis is ready." : "Being written from your results."}
            </p>
            <p className="mt-1.5 max-w-[48ch] text-[13px] font-light text-white/75">
              Personality, interests, direction and what's next — one document, defensible at home.
            </p>
            {/* the inputs feeding it, as a strip — real done/pending state */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {inputs.map((n) => (
                <span key={n.id} className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
                  n.done ? "bg-white/18 text-white" : "border border-dashed border-white/30 text-white/60",
                )}>
                  {n.done ? <Check className="size-3 stroke-[2.5]" /> : <n.Icon className="size-3" />} {n.label}
                </span>
              ))}
              <ArrowRight className="size-3.5 text-white/40" />
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                careerReady ? "bg-white/18 text-white" : "border border-dashed border-white/30 text-white/60")}><Sparkles className="size-3" /> Synthesis</span>
            </div>
            {careerReady && (
              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-foreground transition group-hover:gap-2.5">
                Read the report <ArrowRight className="size-3.5" />
              </span>
            )}
          </div>
        </Link>

        {/* method rail — what the report contains, as a numbered flow */}
        <Pane className="lg:col-span-4">
          <Eyebrow>Inside the report</Eyebrow>
          <ol className="relative space-y-0">
            <span aria-hidden className="absolute bottom-4 left-[13px] top-4 w-px bg-border" />
            {[
              "Who you are — personality & interests",
              "Your best-fit careers, ranked",
              "The gap between here and there",
              "What to do next — your plan",
            ].map((t, i) => (
              <li key={i} className="relative flex items-start gap-3 py-2">
                <span className="relative z-10 grid size-[26px] shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-ink-500">{i + 1}</span>
                <p className="pt-1 text-[12.5px] leading-snug text-foreground">{t}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 border-t border-border pt-3 text-[11.5px] leading-relaxed text-ink-400">
            {careerReady ? "Written by your counsellor from your measured results." : "Fills in as you complete your instruments and sessions."}
          </p>
        </Pane>
      </div>

      {/* Consolidated results — the measurement layer, available the moment the
          battery is done. Deliberately distinct from the counsellor's report. */}
      {results.length > 0 && (
        <Link
          to="/portal/reports/results"
          className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-5 transition hover:border-ink-300"
        >
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
              {results.length === TESTS.length ? "All tests complete" : `${results.length} of ${TESTS.length} tests complete`}
            </p>
            <p className="mt-1.5 text-[16px] font-semibold tracking-tight text-foreground">Your results, together</p>
            <p className="mt-1 max-w-[56ch] text-[13px] leading-relaxed text-ink-600">
              {results.length === TESTS.length
                ? "Every score in one place, plus a plain-language read of what the three instruments say when compared."
                : "Your scores so far in one place. The consolidated read unlocks when the battery is finished."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition group-hover:opacity-90">
            Open <ArrowRight className="size-3.5" />
          </span>
        </Link>
      )}

      {/* test reports — each wearing its instrument's metallic swatch */}
      <Pane>
        <Eyebrow right={<Link to="/portal/assessments" className="text-[12.5px] font-medium text-brand-600 hover:underline">Take more →</Link>}>
          Career Test reports
        </Eyebrow>
        {results.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
              const def = getTest(r.testId)
              if (!def) return null
              const top = def.factors
                .map((f) => ({ label: f.label, v: r.scores[f.key] ?? 0 }))
                .sort((a, b) => b.v - a.v)[0]
              return (
                <Link
                  key={r.testId}
                  to={`/portal/reports/test/${r.testId}`}
                  className="group flex items-center gap-3.5 rounded-2xl p-3 ring-1 ring-border transition hover:ring-ink-200"
                >
                  <span className="relative isolate size-14 shrink-0 overflow-hidden rounded-xl">
                    <PackageGradient offeringId={r.testId} interactive={false} scrim={false} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{def.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {fmtDate(r.takenAt)}{top ? ` · strongest: ${top.label}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </Link>
              )
            })}
            {/* the instruments still to take, as dashed prompts — completes the set */}
            {TESTS.filter((t) => !takenIds.has(t.id)).map((t) => {
              return (
                <Link key={t.id} to={`/portal/assessments/${t.id}`}
                  className="group flex items-center gap-3.5 rounded-2xl border border-dashed border-ink-200 p-3 transition hover:border-brand-300">
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-ink-600"><IsoGlyph id={glyphId(t)} className="size-9" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink-500">{t.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Not taken yet</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[11.5px] font-medium text-foreground transition group-hover:bg-muted">Take</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {TESTS.map((t) => {
              return (
                <Link key={t.id} to={`/portal/assessments/${t.id}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-dashed border-ink-200 p-4 transition hover:border-brand-300 hover:bg-secondary/30">
                  <span className="text-ink-600"><IsoGlyph id={glyphId(t)} className="size-12" /></span>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{t.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">Produces its own report — and feeds the synthesis.</p>
                  </div>
                  <span className="mt-auto inline-flex w-fit items-center gap-1 text-[12.5px] font-semibold text-brand-600">Take it <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
                </Link>
              )
            })}
          </div>
        )}
      </Pane>

      {/* documents + notes — side by side, using the width */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Pane>
          <Eyebrow>Documents</Eyebrow>
          <UploadDocRow clientId={account.clientId} />
          {liveReports.loading ? (
            <div className="h-16 animate-pulse rounded-2xl bg-secondary" />
          ) : reports.length > 0 ? (
            <div className="divide-y divide-border">
              {reports.map((r) => (
                <a key={String(r.id)} href={r.report_location ?? undefined} target="_blank" rel="noreferrer" className="group flex items-center gap-4 py-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-well-50 text-well-700"><FileText className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{r.report_name}</p>
                    {r.created_at && <Chip tone="neutral" icon={CalendarDays} className="mt-1">{fmtDate(r.created_at)}</Chip>}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                    Open <Download className="size-3" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-ink-400 ring-1 ring-border"><FileText className="size-[18px]" /></span>
              <p className="text-[13px] text-muted-foreground">Documents live here — the ones your counsellor publishes, and the ones you upload above.</p>
            </div>
          )}
        </Pane>

        <Pane>
          <Eyebrow><span className="inline-flex items-center gap-1.5"><NotebookPen className="size-3.5" /> Notes from your counsellor</span></Eyebrow>
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={i} className="rounded-2xl bg-secondary/60 p-4 ring-1 ring-border">
                  <p className="text-[13.5px] leading-relaxed text-foreground">{n.comment}</p>
                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                    {n.navigator_name ?? "Counsellor"}{n.date ? ` · ${n.date}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-ink-400 ring-1 ring-border"><NotebookPen className="size-[18px]" /></span>
              <p className="text-[13px] text-muted-foreground">After your sessions, your counsellor's notes to you land here.</p>
            </div>
          )}
        </Pane>
      </div>
    </div>
  )
}
