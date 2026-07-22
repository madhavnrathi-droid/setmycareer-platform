import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowUpRight } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { offeringById, fmtINR } from "@/content/offerings"
import {
  READINESS_SCALE, CCRI_SCALE, READINESS_CLOSING,
  CCRI, scoreCcri, CDRA, scoreCdra, ECCRI, scoreEccri, eccriQuadrant,
  type ReadinessTrack, type RItem, type RFactor,
} from "@/content/readiness"

type Stage = "intro" | "details" | "quiz" | "loading" | "report"

interface Part { label: string; title: string; items: RItem[]; groups: RFactor[] }

const partsFor = (track: ReadinessTrack): Part[] =>
  track === "student"
    ? [{ label: "The check", title: CCRI.title, items: CCRI.items, groups: CCRI.factors }]
    : [
        { label: "Part 1", title: CDRA.title, items: CDRA.items, groups: CDRA.factors },
        { label: "Part 2", title: ECCRI.title, items: ECCRI.items, groups: ECCRI.dims },
      ]

/* a chapter break sits on the FIRST item of each factor/dimension */
const chapterAt = (items: RItem[], idx: number): string | null => {
  const f = items[idx]?.factor
  if (!f) return null
  return items.findIndex((it) => it.factor === f) === idx ? f : null
}

/* scores are 0–100 throughout the readiness module; bars just clamp */
const pct = (s: number | null): number => (s == null ? 0 : Math.max(0, Math.min(100, s)))
const fmt = (s: number | null): string => (s == null ? "—" : Number.isInteger(s) ? String(s) : s.toFixed(1))

const LOADING_STAGES = [
  "Scoring your responses…",
  "Computing factor scores…",
  "Reading the pattern…",
  "Writing your report…",
]

const DISCLAIMER =
  "These scores summarise your own answers to a structured self-report. They read readiness and self-perception — not aptitude, interest or personality, which require a psychometric assessment and a certified expert. Treat this as the diagnosis of how urgently you need that measurement, not as the measurement itself."

/* ── shared report atoms ── */

function FactorBars({ rows }: { rows: { key: string; name: string; score: number | null; weightPct: number }[] }) {
  return (
    <div className="mt-4">
      {rows.map((f) => (
        <div key={f.key} className="grid gap-2 border-t border-line py-4 md:grid-cols-[230px_1fr_auto] md:items-center md:gap-8">
          <div>
            <h4 className="text-[15px] font-medium tracking-tight">{f.name}</h4>
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-ink-40">{f.weightPct}% of the composite</span>
          </div>
          <div className="h-px w-full bg-line">
            <div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${pct(f.score)}%`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
          <span className="mono text-[15px] tabular-nums text-ink-80">{fmt(f.score)}</span>
        </div>
      ))}
    </div>
  )
}

function RecCard({ offeringId, why, cta, to }: { offeringId: string; why: string; cta: string; to: string }) {
  const o = offeringById(offeringId)
  const price = o ? (o.price.inr === 0 ? "Free" : fmtINR(o.price.inr)) : "Talk to us"
  return (
    <div className="relative mt-6 overflow-hidden rounded-[24px] bg-ink text-paper">
      <PackageGradient offeringId={offeringId} interactive scrim />
      <div className="relative z-[1] p-6 md:p-8">
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-paper/60">Recommended next step</span>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h4 className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-medium tracking-tight text-paper">{o?.name ?? offeringId}</h4>
          <span className="mono text-[14px] text-paper/85">{price}</span>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-paper/75">{why}</p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Link to={to} className="btn btn--solid-dark"><span>{cta}</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
          <Link to="/framework" className="ul text-[13px] text-paper/70">See the method behind this</Link>
        </div>
      </div>
    </div>
  )
}

// The Career Clarity Index, on the new instruments: CCRI for parents of
// students (10–18); CDRA then ECCRI for working executives. Every figure in the
// report comes from the scoring functions — nothing invented.
export function CriFlow() {
  const [stage, setStage] = useState<Stage>("intro")
  const [track, setTrack] = useState<ReadinessTrack>("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [part, setPart] = useState(0)
  const [answers1, setAnswers1] = useState<(number | null)[]>([])
  const [answers2, setAnswers2] = useState<(number | null)[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [chapter, setChapter] = useState<string | null>(null)
  const [handoff, setHandoff] = useState(false)
  const [loadStep, setLoadStep] = useState(0)

  const parts = useMemo(() => partsFor(track), [track])
  const totalItems = parts.reduce((a, p) => a + p.items.length, 0)
  const doneBefore = parts.slice(0, part).reduce((a, p) => a + p.items.length, 0)

  const begin = (t: ReadinessTrack) => {
    const ps = partsFor(t)
    setTrack(t)
    setAnswers1(Array<number | null>(ps[0].items.length).fill(null))
    setAnswers2(ps[1] ? Array<number | null>(ps[1].items.length).fill(null) : [])
    setPart(0); setQIdx(0); setHandoff(false)
    setChapter(chapterAt(ps[0].items, 0))
    setStage("quiz")
  }

  const saveLead = () => {
    try {
      localStorage.setItem("smc-cri-lead", JSON.stringify({ name, email, phone, track, at: new Date().toISOString() }))
    } catch { /* private mode */ }
  }

  const advance = () => {
    const items = parts[part].items
    if (qIdx < items.length - 1) {
      const nx = qIdx + 1
      setQIdx(nx)
      setChapter(chapterAt(items, nx))
    } else if (part < parts.length - 1) {
      setHandoff(true)
    } else {
      saveLead(); setLoadStep(0); setStage("loading")
    }
  }

  const pick = (v: number) => {
    if (part === 0) { const a = [...answers1]; a[qIdx] = v; setAnswers1(a) }
    else { const a = [...answers2]; a[qIdx] = v; setAnswers2(a) }
    advance()
  }

  const continueHandoff = () => { setHandoff(false); setPart(1); setQIdx(0); setChapter(null) }

  /* loading — staged, then the report */
  useEffect(() => {
    if (stage !== "loading") return
    if (loadStep >= LOADING_STAGES.length) { setStage("report"); return }
    const t = window.setTimeout(() => setLoadStep((s) => s + 1), 700)
    return () => window.clearTimeout(t)
  }, [stage, loadStep])

  /* keyboard: 1–5 answers; Enter continues chapters and the part hand-off */
  useEffect(() => {
    if (stage !== "quiz") return
    const onKey = (e: KeyboardEvent) => {
      if (handoff) { if (e.key === "Enter") continueHandoff(); return }
      if (chapter) { if (e.key === "Enter") setChapter(null); return }
      const n = Number(e.key)
      if (n >= 1 && n <= READINESS_SCALE.length) pick(n)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIdx, part, chapter, handoff])

  const report = useMemo(() => {
    if (stage !== "report") return null
    return track === "student"
      ? { kind: "student" as const, ccri: scoreCcri(answers1) }
      : { kind: "executive" as const, cdra: scoreCdra(answers1), eccri: scoreEccri(answers2) }
  }, [stage, track, answers1, answers2])

  const reset = () => { setStage("intro"); setAnswers1([]); setAnswers2([]); setPart(0); setQIdx(0); setChapter(null); setHandoff(false) }

  /* ── intro: who is this for? ── */
  if (stage === "intro") return (
    <div className="border border-line bg-paper-pure p-7 md:p-10">
      <span className="kicker text-ink-40">Free · structured self-report · scored on screen</span>
      <h3 className="mt-3 text-[clamp(1.5rem,2.8vw,2.2rem)] font-light leading-tight tracking-tight">Who is this for?</h3>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-60">Two different instruments for two different seats. Pick yours — the questions, the scoring and the report change with it.</p>
      <div className="mt-7 grid gap-px md:grid-cols-2">
        {([
          { t: "student" as ReadinessTrack, h: "Parent of a student (10–18)", d: "You answer about how the career decision is being made at home — clarity, pressure, misconceptions. One part, about 10 minutes." },
          { t: "executive" as ReadinessTrack, h: "Working executive", d: "You answer about your own position — decision readiness first, then the circumstances around making a move. Two parts, about 20 minutes." },
        ]).map((o) => (
          <button key={o.t} onClick={() => { setTrack(o.t); setStage("details") }}
            className="group border border-line p-6 text-left transition-colors hover:border-ink">
            <h4 className="text-[18px] font-medium tracking-tight">{o.h}</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{o.d}</p>
            <span className="ul mt-4 inline-block text-[13px] font-medium">Start here</span>
          </button>
        ))}
      </div>
    </div>
  )

  /* ── details: the lead-capture step, plus an honest map of what follows ── */
  if (stage === "details") {
    const ok = name.trim().length >= 2 && /.+@.+\..+/.test(email)
    const plan = track === "student"
      ? [{ t: CCRI.title, s: "About 10 minutes" }]
      : [{ t: CDRA.title, s: "Part 1 · about 10 minutes" }, { t: ECCRI.title, s: "Part 2 · about 10 minutes" }]
    return (
      <div className="border border-line bg-paper-pure p-7 md:p-10">
        <button onClick={() => setStage("intro")} className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-40"><ArrowLeft size={14} /> Back</button>
        <h3 className="text-[clamp(1.4rem,2.6vw,2rem)] font-light leading-tight tracking-tight">{track === "student" ? CCRI.title : "The executive readiness diagnostic"}</h3>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-60">
          {track === "student"
            ? CCRI.tagline
            : "Two parts: first how ready your career decision actually is, then the circumstances and constraints around making it. Answer as things are, not as they should be."}
        </p>
        <div className="mt-6 grid gap-px sm:grid-cols-2">
          {plan.map((p) => (
            <div key={p.t} className="border border-line p-4">
              <span className="mono text-[10px] uppercase tracking-[0.13em] text-ink-40">{p.s}</span>
              <p className="mt-1.5 text-[14px] font-medium tracking-tight">{p.t}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          <label className="block"><span className="kicker text-ink-40">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
          <label className="block"><span className="kicker text-ink-40">Email — your report lands here too</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
          <label className="block"><span className="kicker text-ink-40">Phone (optional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="For a counsellor call-back" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button disabled={!ok} onClick={() => begin(track)} className="btn btn--solid disabled:opacity-40"><span>Begin</span></button>
          <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">Free · no card · report on screen instantly</p>
        </div>
      </div>
    )
  }

  /* ── quiz ── */
  if (stage === "quiz") {
    const p = parts[part]
    const globalIdx = doneBefore + qIdx

    /* part hand-off: Part 1 done, Part 2 next */
    if (handoff) return (
      <div className="border border-line bg-paper-pure p-7 md:p-10">
        <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">Part 1 complete</span>
        <h3 className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)] font-light leading-tight tracking-tight">{CDRA.title} — done.</h3>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-60">
          Next: <span className="font-medium text-ink">{ECCRI.title}</span> — the circumstances, constraints and drivers around your decision. About 10 more minutes; your report needs both halves.
        </p>
        <div className="mt-3 h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${(doneBefore + qIdx + 1) / totalItems * 100}%`, transition: "width 0.3s" }} /></div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button onClick={continueHandoff} className="btn btn--solid"><span>Start Part 2</span></button>
          <p className="mono text-[10px] uppercase tracking-[0.13em] text-ink-40">Enter works too</p>
        </div>
      </div>
    )

    /* chapter interstitial at each factor/dimension boundary */
    if (chapter) {
      const g = p.groups.find((x) => x.key === chapter)
      const chNum = Math.max(1, p.groups.findIndex((x) => x.key === chapter) + 1)
      return (
        <div className="border border-line bg-paper-pure p-7 md:p-10">
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">
            {parts.length > 1 ? `${p.label} · ` : ""}Section {chNum} of {p.groups.length}
          </span>
          <h3 className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)] font-light leading-tight tracking-tight">{g?.name ?? chapter}</h3>
          {g?.note && <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-60">{g.note}</p>}
          <div className="mt-6 h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${(globalIdx / totalItems) * 100}%`, transition: "width 0.3s" }} /></div>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button onClick={() => setChapter(null)} className="btn btn--solid"><span>Continue</span></button>
            <p className="mono text-[10px] uppercase tracking-[0.13em] text-ink-40">Enter works too</p>
          </div>
        </div>
      )
    }

    const item = p.items[qIdx]
    const current = part === 0 ? answers1[qIdx] : answers2[qIdx]
    return (
      <div className="border border-line bg-paper-pure p-7 md:p-10">
        <div className="flex items-center justify-between gap-6">
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">
            {parts.length > 1 ? `${p.label} · ` : ""}{String(qIdx + 1).padStart(2, "0")} / {p.items.length}
          </span>
          {qIdx > 0 && <button onClick={() => { setQIdx(qIdx - 1); setChapter(null) }} className="inline-flex items-center gap-1.5 text-[12px] text-ink-40"><ArrowLeft size={14} /> Previous</button>}
        </div>
        <div className="mt-3 h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink transition-[width] duration-300" style={{ width: `${(globalIdx / totalItems) * 100}%` }} /></div>
        <p className="mt-8 min-h-[96px] text-[clamp(1.25rem,2.4vw,1.9rem)] font-light leading-snug tracking-tight">{item.text}</p>
        <div className="mt-6 grid gap-2">
          {(track === "student" ? CCRI_SCALE : READINESS_SCALE).map((label, i) => {
            const v = i + 1
            return (
              <button key={v} onClick={() => pick(v)}
                className={`group flex items-center justify-between border px-5 py-3.5 text-left text-[14.5px] transition-colors ${current === v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}>
                <span>{label}</span>
                <span className={`mono text-[11px] ${current === v ? "text-paper/60" : "text-ink-20 group-hover:text-ink-40"}`}>{v}</span>
              </button>
            )
          })}
        </div>
        <p className="mono mt-5 text-[10px] uppercase tracking-[0.13em] text-ink-40">Keys 1–{READINESS_SCALE.length} work too · first instinct is the honest answer</p>
      </div>
    )
  }

  /* ── loading ── */
  if (stage === "loading") return (
    <div className="flex min-h-[380px] flex-col items-center justify-center border border-line bg-ink p-10 text-center">
      <LogoMark size={36} className="text-paper/90" />
      <div className="mt-8 h-px w-56 bg-paper/20"><div className="h-[2px] -translate-y-px bg-paper transition-[width] duration-500" style={{ width: `${(loadStep / LOADING_STAGES.length) * 100}%` }} /></div>
      <p className="mono mt-5 min-h-[18px] text-[11px] uppercase tracking-[0.16em] text-paper/60">{LOADING_STAGES[Math.min(loadStep, LOADING_STAGES.length - 1)]}</p>
    </div>
  )

  /* ── report ── */
  if (!report) return null
  const dateLine = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  /* student: CCRI — four pillars, factor bars, CRI, misconceptions, final insight */
  if (report.kind === "student") {
    const r = report.ccri
    const endorsed = r.misconceptions.filter((m) => m.endorsed)
    return (
      <div className="border border-line bg-paper-pure">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-10">
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{CCRI.title} · Report</span>
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{name} · {dateLine}</span>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          {/* composite + pillars */}
          <div className="grid items-start gap-10 md:grid-cols-[auto_1fr]">
            <div>
              <div className="display !text-[3.4rem] font-extralight leading-none tabular-nums">{fmt(r.cri)}</div>
              <p className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-40">Composite readiness (CRI)</p>
            </div>
            <div className="grid gap-px sm:grid-cols-2">
              {r.pillars.map((pl) => (
                <div key={pl.key} className="border border-line p-5">
                  <span className="mono text-[10px] uppercase tracking-[0.12em] text-ink-40">{pl.question}</span>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-[15px] font-medium tracking-tight">{pl.name}</h4>
                    <span className="mono text-[14px] tabular-nums text-ink-80">{fmt(pl.score)} <span className="text-[10px] uppercase tracking-[0.1em] text-ink-40">· {pl.band}</span></span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">{pl.read}</p>
                </div>
              ))}
            </div>
          </div>

          {/* factor bars */}
          <div className="mt-12">
            <span className="kicker text-ink-40">The factors behind the score</span>
            <FactorBars rows={r.factors} />
          </div>

          {/* endorsed misconceptions */}
          <div className="mt-12 border border-line p-6">
            <span className="kicker text-ink-40">Misconceptions you endorsed</span>
            {endorsed.length ? (
              <ul className="mt-4 max-w-2xl space-y-3">
                {endorsed.map((m) => (
                  <li key={m.text} className="border-l-2 border-ink pl-4 text-[14px] leading-relaxed text-ink-80">{m.text}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-60">None. You endorsed none of the common misconceptions this check screens for — a genuinely good sign for the quality of the decision being made at home.</p>
            )}
          </div>

          {/* final insight */}
          <div className="mt-12">
            <span className="kicker text-ink-40">The read</span>
            <p className="serif mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-80">{r.finalInsight}</p>
          </div>

          {/* closing + next step */}
          <div className="mt-12 border-t border-line pt-8">
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink-80">{READINESS_CLOSING.student}</p>
            <RecCard offeringId="sj_navigator" to="/checkout/sj_navigator" cta="See what it includes"
              why="This check reads how ready the decision is; the Navigator measures the decision itself — interest, personality and ability, scored and mapped to the careers and degrees that actually fit. It is the step the report above points to." />
          </div>

          <p className="mt-10 max-w-2xl border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-40">{DISCLAIMER}</p>
          <button onClick={reset} className="ul mt-4 text-[12.5px] text-ink-60">Retake the check</button>
        </div>
      </div>
    )
  }

  /* executive: CDRA (CDRS + band + factors + gap) then ECCRI (six scores + quadrant) */
  const cd = report.cdra
  const ec = report.eccri
  /* the quadrant crosses circumstantial readiness (the ECCRI composite) with
     the CDRA Self Awareness factor — both on the module's 0–100 scale */
  const circ = { name: "Circumstantial readiness", score: ec.overall }
  const aware = cd.factors.find((f) => /self.?aware/i.test(f.name)) ?? null
  const quad = circ.score != null && aware?.score != null ? eccriQuadrant(circ.score, aware.score) : null
  /* label all four cells by probing the quadrant function at its corners,
     so the names always come from the scoring module */
  const cells = quad
    ? ([
        { c: 100, a: 0 }, { c: 100, a: 100 },
        { c: 0, a: 0 }, { c: 0, a: 100 },
      ] as const).map(({ c, a }) => eccriQuadrant(c, a).name)
    : []

  return (
    <div className="border border-line bg-paper-pure">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-10">
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{CDRA.title} · Report</span>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{name} · {dateLine}</span>
      </div>
      <div className="px-6 py-8 md:px-10 md:py-10">
        {/* CDRS + band, verbatim */}
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div>
            <div className="display !text-[3.4rem] font-extralight leading-none tabular-nums">{fmt(cd.cdrs)}</div>
            <p className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-40">Career decision readiness (CDRS)</p>
          </div>
          <div>
            {cd.band && <h3 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-light leading-tight tracking-tight">{name}, you are in the <span className="font-semibold">{cd.band.name}</span>.</h3>}
            {cd.band && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-60">{cd.band.note}</p>}
          </div>
        </div>

        {/* CDRA factors */}
        <div className="mt-12">
          <span className="kicker text-ink-40">Part 1 · The factors behind the score</span>
          <FactorBars rows={cd.factors} />
        </div>

        {/* perception vs evidence gap */}
        <div className="mt-12 border border-line p-6">
          <span className="kicker text-ink-40">Perception vs evidence</span>
          <div className="mt-4 grid gap-px sm:grid-cols-3">
            {([
              { l: "Perceived readiness", v: cd.gap.perception },
              { l: "Evidence-based readiness", v: cd.gap.evidence },
              { l: "The gap", v: cd.gap.gap },
            ]).map((x) => (
              <div key={x.l} className="border border-line p-4">
                <span className="mono text-[10px] uppercase tracking-[0.12em] text-ink-40">{x.l}</span>
                <div className="mt-1.5 text-[1.7rem] font-extralight tabular-nums">{fmt(x.v)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-80">{cd.gap.read}</p>
        </div>

        {/* ECCRI final scores */}
        <div className="mt-12">
          <span className="kicker text-ink-40">Part 2 · {ECCRI.title}</span>
          <div className="mt-4">
            {ec.finalScores.map((f) => (
              <div key={f.key} className="grid gap-2 border-t border-line py-4 md:grid-cols-[230px_1fr_auto] md:items-center md:gap-8">
                <h4 className="text-[15px] font-medium tracking-tight">{f.name}</h4>
                <div>
                  <div className="h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${pct(f.score)}%`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} /></div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">{f.question}</p>
                </div>
                <span className="mono text-[15px] tabular-nums text-ink-80">{fmt(f.score)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* quadrant 2×2 */}
        {quad && aware && (
          <div className="mt-12">
            <span className="kicker text-ink-40">Where you sit</span>
            <p className="mono mt-3 text-[10px] uppercase tracking-[0.12em] text-ink-40">{circ.name} {fmt(circ.score)} × {aware.name.toLowerCase()} {fmt(aware.score)}</p>
            <div className="mt-3 grid max-w-xl grid-cols-[auto_1fr_1fr] gap-px">
              <div />
              <p className="mono px-3 pb-2 text-[10px] uppercase tracking-[0.12em] text-ink-40">Lower {aware.name.toLowerCase()}</p>
              <p className="mono px-3 pb-2 text-[10px] uppercase tracking-[0.12em] text-ink-40">Higher {aware.name.toLowerCase()}</p>
              {cells.map((cellName, i) => {
                const active = cellName === quad.name
                const rowLabel = i % 2 === 0
                  ? <p key={`r${i}`} className="mono flex items-center pr-3 text-[10px] uppercase tracking-[0.12em] text-ink-40" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{i === 0 ? "Higher circumstantial" : "Lower circumstantial"}</p>
                  : null
                return [
                  rowLabel,
                  <div key={i} className={`border p-5 ${active ? "border-ink bg-ink text-paper" : "border-line text-ink-60"}`}>
                    <p className="text-[14px] font-medium tracking-tight">{cellName}</p>
                    {active && <p className="mono mt-1 text-[9.5px] uppercase tracking-[0.12em] text-paper/60">You are here</p>}
                  </div>,
                ]
              })}
            </div>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-80">{quad.read}</p>
          </div>
        )}

        {/* closing + next step */}
        <div className="mt-12 border-t border-line pt-8">
          <p className="serif max-w-2xl text-[1.02rem] leading-relaxed text-ink-80">{READINESS_CLOSING.executive}</p>
          <RecCard offeringId="pro_consult" to="/checkout/pro_consult" cta="Book a consultation"
            why="One working session with a senior counsellor turns the gaps this report names into a plan — evidence first, then the move. If the report reads clean, the session simply confirms it faster than a year of second-guessing." />
        </div>

        <p className="mt-10 max-w-2xl border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-40">{DISCLAIMER}</p>
        <button onClick={reset} className="ul mt-4 text-[12.5px] text-ink-60">Retake the diagnostic</button>
      </div>
    </div>
  )
}
