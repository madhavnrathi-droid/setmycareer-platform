import { useEffect, useMemo, useRef, useState } from "react"
import { LogoMark } from "@/components/Brand"
import { scrollToTop } from "@/lib/motion"
import {
  buildReport, computeFit, flowFor, leadMessage, recCard, stageById,
  type AnswerMap, type FitComputed, type FitReport, type TextAnswerMap,
} from "@/content/fit-test"
import { FitIntake, type IntakeData } from "./FitIntake"
import { FitQuestionView } from "./FitQuestion"
import { FitResult } from "./FitResult"

type Step = "intake" | "quiz" | "scoring" | "result"

// The AI writer lives on the counselor project (it holds the provider keys); the
// site calls it cross-origin, exactly like the visitor guide calls /api/assistant.
const FIT_REPORT_URL = "https://setmycareer-counselor.vercel.app/api/fit-report"

const SCORING_STAGES = [
  "Scoring six dimensions",
  "Measuring distance to every programme",
  "Reading your words",
  "Writing your fit report",
]

/* The Package-Fit Test state machine. All state lives here (one component,
   plain useState) — refresh restarts, nothing persists beyond the single
   fire-and-forget lead POST after the result is computed. The result renders
   instantly from the deterministic report; the AI enriches its prose in place
   when it lands, and the screen never blocks on it. */
export function FitFlow() {
  const [step, setStep] = useState<Step>("intake")
  const [intake, setIntake] = useState<IntakeData>({ name: "", email: "", ageBand: "", stageId: "", city: "" })
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [texts, setTexts] = useState<TextAnswerMap>({})
  const [qIdx, setQIdx] = useState(0)
  const [dir, setDir] = useState<"fwd" | "back">("fwd")
  const [loadStep, setLoadStep] = useState(0)
  const [result, setResult] = useState<FitComputed | null>(null)
  const [report, setReport] = useState<FitReport | null>(null)
  const [enriching, setEnriching] = useState(false)

  const stage = stageById(intake.stageId)
  const flow = useMemo(() => flowFor(stage?.track ?? "student"), [stage?.track])
  const q = flow[qIdx]

  /* ── advancing ── */
  const advanceTimer = useRef(0)
  const advance = () => {
    window.clearTimeout(advanceTimer.current)
    setDir("fwd")
    if (qIdx < flow.length - 1) setQIdx((i) => i + 1)
    else { setLoadStep(0); setStep("scoring") }
  }
  const pick = (v: number) => {
    setAnswers((a) => ({ ...a, [q.id]: v }))
    // a short beat so the selected state is seen before the slide (never jarring)
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(advance, 220)
  }
  const setText = (v: string) => setTexts((t) => ({ ...t, [q.id]: v }))
  const back = () => {
    window.clearTimeout(advanceTimer.current)
    setDir("back")
    if (qIdx > 0) setQIdx((i) => i - 1)
    else setStep("intake")
  }
  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  /* ── keyboard: number keys pick, Enter advances — SCORED questions only ── */
  useEffect(() => {
    if (step !== "quiz" || q.kind === "text") return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "Enter") {
        if (answers[q.id] != null) { e.preventDefault(); advance() }
        return
      }
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      if (q.kind === "likert") { if (n <= 5) pick(n) }
      else if (n <= q.options.length) pick(n - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qIdx, q, answers])

  /* ── scoring interstitial → compute → build report → result ── */
  useEffect(() => {
    if (step !== "scoring") return
    if (loadStep >= SCORING_STAGES.length) {
      const r = computeFit(intake.stageId, answers)
      setResult(r)
      setReport(buildReport(r, intake.name, texts))
      setStep("result")
      return
    }
    const t = window.setTimeout(() => setLoadStep((s) => s + 1), 560)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loadStep])

  /* ── on result: fire the lead + ask the AI to enrich the report prose ── */
  const doneOnce = useRef(false)
  useEffect(() => {
    if (step !== "result" || !result || !report || doneOnce.current) return
    doneOnce.current = true

    // fire-and-forget lead — the report shows regardless of whether this lands
    try {
      void fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: intake.name.trim(),
          email: intake.email.trim(),
          audience: stage?.label ?? "",
          city: intake.city.trim(),
          message: leadMessage(result, texts),
          source: "package-fit test",
        }),
      }).catch(() => {})
    } catch { /* fetch unavailable — same policy */ }

    // AI enrichment — replace the deterministic prose in place when it returns
    const primary = recCard(result.primary.id)
    const runner = recCard(result.runnerUp.id)
    setEnriching(true)
    const ctrl = new AbortController()
    // the deterministic report is already on screen; this only swaps in richer
    // prose when it lands, so we can wait comfortably (Groq can take ~20s)
    const timeout = window.setTimeout(() => ctrl.abort(), 30000)
    void fetch(FIT_REPORT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        report,
        context: {
          firstName: intake.name.trim(),
          stageLabel: stage?.label ?? "",
          track: result.track,
          dims: result.dims.map((d) => ({ key: d.key, label: d.label, value: d.value, read: d.read })),
          signals: result.signals,
          primaryName: primary.name,
          primaryFit: result.primary.fitPct,
          runnerUpName: runner.name,
          reflections: { r_crux: texts.r_crux, r_future: texts.r_future },
        },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; report?: FitReport } | null) => {
        if (data?.ok && data.report && Array.isArray(data.report.journey)) setReport(data.report)
      })
      .catch(() => { /* keep the deterministic report */ })
      .finally(() => { window.clearTimeout(timeout); setEnriching(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result, report])

  /* ── step transitions land at the top of the page ── */
  useEffect(() => {
    if (step === "quiz" || step === "result") scrollToTop()
  }, [step])

  const retake = () => {
    doneOnce.current = false
    setAnswers({})
    setTexts({})
    setQIdx(0)
    setResult(null)
    setReport(null)
    setEnriching(false)
    setDir("fwd")
    setStep("intake")
  }

  /* ── views ── */
  if (step === "intake") {
    return (
      <FitIntake
        data={intake}
        onPatch={(patch) => setIntake((d) => ({ ...d, ...patch }))}
        onStart={() => { setAnswers({}); setTexts({}); setQIdx(0); setDir("fwd"); setStep("quiz") }}
      />
    )
  }

  if (step === "quiz") {
    const done = qIdx / flow.length
    return (
      <section className="wrap pb-20 pt-32 md:pt-40">
        {/* progress rail — Q n/total + a thin scaleX bar (transform-only) */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={flow.length}
          aria-valuenow={qIdx}
          aria-label={`Question ${qIdx + 1} of ${flow.length}`}
          className="h-px w-full bg-paper/15"
        >
          <div
            className="h-[3px] w-full origin-left -translate-y-px bg-paper transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `scaleX(${done})` }}
          />
        </div>
        <div className="mt-10 min-h-[60svh]">
          <FitQuestionView
            q={q}
            index={qIdx}
            total={flow.length}
            value={answers[q.id]}
            textValue={texts[q.id]}
            dir={dir}
            onPick={pick}
            onText={setText}
            onContinue={advance}
            onBack={back}
          />
        </div>
      </section>
    )
  }

  if (step === "scoring") {
    return (
      <section className="wrap flex min-h-[70svh] flex-col items-center justify-center pb-20 pt-32 text-center">
        <LogoMark size={36} className="text-paper/90" />
        <div className="mt-8 h-px w-56 bg-paper/20">
          <div
            className="h-[2px] w-full origin-left -translate-y-px bg-paper transition-transform duration-500"
            style={{ transform: `scaleX(${loadStep / SCORING_STAGES.length})` }}
          />
        </div>
        <p aria-live="polite" className="mono mt-5 min-h-[18px] text-[11px] uppercase tracking-[0.16em] text-paper/60">
          {SCORING_STAGES[Math.min(loadStep, SCORING_STAGES.length - 1)]}
        </p>
      </section>
    )
  }

  if (!result || !report) return null
  return (
    <section className="wrap pb-24 pt-32 md:pt-40">
      <FitResult
        name={intake.name.trim()}
        stageLabel={stage?.label ?? ""}
        r={result}
        report={report}
        enriching={enriching}
        onRetake={retake}
      />
    </section>
  )
}
