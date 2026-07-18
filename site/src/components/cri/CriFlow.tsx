import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowUpRight } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import {
  STUDENT, EXECUTIVE, SCALE, LOADING_STAGES, DISCLAIMER,
  STUDENT_STAGES, STUDENT_WORRIES, EXEC_LEVELS, EXEC_WORRIES, WORRY_LINES,
  factorLevel, FACTOR_READS, patternRead, recommend, type Audience,
} from "@/content/cri"

type Stage = "intro" | "details" | "quiz" | "loading" | "report"

// The Career Readiness Index, live. The instrument is the documented one (20
// statements, five indices, the CCI 0–1 report format); the reads are selected
// by the respondent's actual pattern. Goal-gradient: short named steps; Zeigarnik:
// visible progress; peak-end: the report is the peak AND the ending.
export function CriFlow() {
  const [stage, setStage] = useState<Stage>("intro")
  const [aud, setAud] = useState<Audience>("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [life, setLife] = useState("") // class/level
  const [worry, setWorry] = useState("")
  const [answers, setAnswers] = useState<number[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [loadStep, setLoadStep] = useState(0)

  const inst = aud === "student" ? STUDENT : EXECUTIVE
  const lifeOptions = aud === "student" ? STUDENT_STAGES : EXEC_LEVELS
  const worries = aud === "student" ? STUDENT_WORRIES : EXEC_WORRIES

  // loading — staged, then the report (setTimeout: reliable everywhere)
  useEffect(() => {
    if (stage !== "loading") return
    if (loadStep >= LOADING_STAGES.length) { setStage("report"); return }
    const t = window.setTimeout(() => setLoadStep((s) => s + 1), 750)
    return () => window.clearTimeout(t)
  }, [stage, loadStep])

  // keyboard 1–5 during the quiz (paradox of the active user: fastest path wins)
  useEffect(() => {
    if (stage !== "quiz") return
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 5) pick(n) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIdx])

  const pick = (v: number) => {
    const next = [...answers]; next[qIdx] = v
    setAnswers(next)
    if (qIdx < inst.questions.length - 1) setQIdx(qIdx + 1)
    else {
      try { localStorage.setItem("smc-cri-lead", JSON.stringify({ name, email, phone, aud, life, worry, at: new Date().toISOString() })) } catch { /* private mode */ }
      setLoadStep(0); setStage("loading")
    }
  }

  const result = useMemo(() => {
    if (stage !== "report") return null
    const total = answers.reduce((a, b) => a + (b || 0), 0) // 20–100
    const overall = total / 100
    const band = inst.bands.find((b) => total >= b.min)!
    const factors = inst.factors.map((f) => {
      const sum = f.qs.reduce((a, q) => a + (answers[q - 1] || 0), 0)
      const max = f.qs.length * 5
      return { ...f, sum, max, index: sum / max, level: factorLevel(sum, f.qs.length) }
    })
    const sorted = [...factors].sort((a, b) => a.index - b.index)
    const lows = factors.filter((f) => f.level === "Low")
    const reads = [
      FACTOR_READS[sorted[sorted.length - 1].key][sorted[sorted.length - 1].level],
      FACTOR_READS[sorted[0].key][sorted[0].level],
      patternRead(answers),
    ]
    const rec = recommend(aud, total, life, (lows.length ? lows : sorted.slice(0, 1)).map((f) => f.name))
    return { total, overall, band, factors, lows, weakest: sorted[0], strongest: sorted[sorted.length - 1], reads, rec }
  }, [stage, answers, inst, aud, life])

  /* ── intro ── */
  if (stage === "intro") return (
    <div className="border border-line bg-paper-pure p-7 md:p-10">
      <span className="kicker text-ink-40">Free · 20 statements · ~4 minutes</span>
      <h3 className="mt-3 text-[clamp(1.5rem,2.8vw,2.2rem)] font-light leading-tight tracking-tight">First: who is deciding?</h3>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-60">The index asks different questions of a student choosing a path and a professional questioning one. Pick your seat.</p>
      <div className="mt-7 grid gap-px md:grid-cols-2">
        {([
          { a: "student" as Audience, t: "Student", d: "Class 8 to college — streams, exams, degrees. The CRI™." },
          { a: "executive" as Audience, t: "Working professional", d: "IC to executive — growth, switches, AI risk. The ECRI™." },
        ]).map((o) => (
          <button key={o.a} onClick={() => { setAud(o.a); setStage("details") }}
            className="group border border-line p-6 text-left transition-colors hover:border-ink">
            <h4 className="text-[18px] font-medium tracking-tight">{o.t}</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{o.d}</p>
            <span className="ul mt-4 inline-block text-[13px] font-medium">Start here</span>
          </button>
        ))}
      </div>
    </div>
  )

  /* ── details (the free-info step; also personalises the report) ── */
  if (stage === "details") {
    const ok = name.trim().length >= 2 && /.+@.+\..+/.test(email) && life && worry
    return (
      <div className="border border-line bg-paper-pure p-7 md:p-10">
        <button onClick={() => setStage("intro")} className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-40"><ArrowLeft size={14} /> Back</button>
        <h3 className="text-[clamp(1.4rem,2.6vw,2rem)] font-light leading-tight tracking-tight">{inst.title}</h3>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-60">{inst.tagline}</p>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          <label className="block"><span className="kicker text-ink-40">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
          <label className="block"><span className="kicker text-ink-40">Email — your report lands here too</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
          <label className="block"><span className="kicker text-ink-40">Phone (optional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="For a counsellor call-back" className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px]" /></label>
        </div>
        <div className="mt-7">
          <span className="kicker text-ink-40">{aud === "student" ? "Where are you" : "Your level"}</span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {lifeOptions.map((s) => (
              <button key={s} onClick={() => setLife(s)} className={`border px-3.5 py-1.5 text-[12.5px] transition-colors ${life === s ? "border-ink bg-ink text-paper" : "border-line text-ink-80 hover:border-ink"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <span className="kicker text-ink-40">The question on your mind</span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {worries.map((w) => (
              <button key={w.id} onClick={() => setWorry(w.id)} className={`border px-3.5 py-1.5 text-[12.5px] transition-colors ${worry === w.id ? "border-ink bg-ink text-paper" : "border-line text-ink-80 hover:border-ink"}`}>{w.label}</button>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button disabled={!ok} onClick={() => { setAnswers([]); setQIdx(0); setStage("quiz") }} className="btn btn--solid disabled:opacity-40"><span>Begin the index</span></button>
          <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">Free · no card · report on screen instantly</p>
        </div>
      </div>
    )
  }

  /* ── quiz ── */
  if (stage === "quiz") {
    const q = inst.questions[qIdx]
    return (
      <div className="border border-line bg-paper-pure p-7 md:p-10">
        <div className="flex items-center justify-between gap-6">
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">{String(qIdx + 1).padStart(2, "0")} / {inst.questions.length}</span>
          {qIdx > 0 && <button onClick={() => setQIdx(qIdx - 1)} className="inline-flex items-center gap-1.5 text-[12px] text-ink-40"><ArrowLeft size={14} /> Previous</button>}
        </div>
        <div className="mt-3 h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink transition-[width] duration-300" style={{ width: `${(qIdx / inst.questions.length) * 100}%` }} /></div>
        <p className="mt-8 min-h-[96px] text-[clamp(1.25rem,2.4vw,1.9rem)] font-light leading-snug tracking-tight">{q}</p>
        <div className="mt-6 grid gap-2">
          {SCALE.map((s) => (
            <button key={s.v} onClick={() => pick(s.v)}
              className={`group flex items-center justify-between border px-5 py-3.5 text-left text-[14.5px] transition-colors ${answers[qIdx] === s.v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}>
              <span>{s.label}</span>
              <span className={`mono text-[11px] ${answers[qIdx] === s.v ? "text-paper/60" : "text-ink-20 group-hover:text-ink-40"}`}>{s.v}</span>
            </button>
          ))}
        </div>
        <p className="mono mt-5 text-[10px] uppercase tracking-[0.13em] text-ink-40">Keys 1–5 work too · first instinct is the honest answer</p>
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
  if (!result) return null
  const { overall, band, factors, lows, reads, rec } = result
  const worryLine = WORRY_LINES[worry]
  const arc = 251.33 //半circle r=80
  return (
    <div className="border border-line bg-paper-pure">
      {/* dossier head */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-10">
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{inst.title} · Report</span>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">{name} · {life} · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
      </div>

      <div className="px-6 py-8 md:px-10 md:py-10">
        {/* overall dial */}
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div className="relative mx-auto w-[240px]">
            <svg viewBox="0 0 200 118" className="w-full">
              <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="var(--color-line)" strokeWidth="6" />
              <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="butt"
                strokeDasharray={arc} strokeDashoffset={arc * (1 - overall)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </svg>
            <div className="absolute inset-x-0 bottom-1 text-center">
              <div className="display !text-[3.4rem] font-extralight leading-none tabular-nums">{overall.toFixed(2)}</div>
              <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-40">Overall index / 1.00</p>
            </div>
          </div>
          <div>
            <h3 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-light leading-tight tracking-tight">{name}, you are in the <span className="font-semibold">{band.name}</span>.</h3>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-60">{band.note}</p>
            {lows.length >= 2 && (
              <p className="mt-4 max-w-xl border-l-2 border-ink pl-4 text-[13.5px] leading-relaxed text-ink-80">
                <span className="font-medium">Career guidance trigger: </span>
                two or more of your indices sit in the low zone ({lows.map((l) => l.name).join(", ")}) — the documented threshold at which structured guidance is {aud === "student" ? "strongly recommended before major educational decisions" : "strongly recommended before major career decisions"}.
              </p>
            )}
          </div>
        </div>

        {/* factor indices */}
        <div className="mt-12">
          <span className="kicker text-ink-40">Your five indices</span>
          <div className="mt-4">
            {factors.map((f) => (
              <div key={f.key} className="grid gap-2 border-t border-line py-4 md:grid-cols-[210px_1fr_auto] md:items-center md:gap-8">
                <div>
                  <h4 className="text-[15px] font-medium tracking-tight">{f.name}</h4>
                  <span className={`mono text-[10px] uppercase tracking-[0.12em] ${f.level === "Low" ? "text-ink" : "text-ink-40"}`}>{f.level}{f.level === "Low" ? " — attention" : ""}</span>
                </div>
                <div>
                  <div className="h-px w-full bg-line"><div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${f.index * 100}%`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} /></div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">{f.meaning}</p>
                </div>
                <span className="mono text-[15px] tabular-nums text-ink-80">{f.index.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* what the answers say */}
        <div className="mt-12">
          <span className="kicker text-ink-40">What your answers say about you</span>
          <div className="serif mt-4 max-w-2xl space-y-4 text-[1.02rem] leading-relaxed text-ink-80">
            {reads.map((r, i) => <p key={i}>{r}</p>)}
          </div>
        </div>

        {/* the problem, named */}
        {worryLine && (
          <div className="mt-12 border-t border-line pt-8">
            <span className="kicker text-ink-40">The problem, named</span>
            <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-80">
              You told us the live question is <span className="font-medium">{worryLine}</span>. Your index puts the bottleneck at <span className="font-medium">{result.weakest.name.toLowerCase()}</span> ({result.weakest.index.toFixed(2)}) — which means the fastest way through your question is not more opinions, it is closing that specific gap with measurement.
            </p>
          </div>
        )}

        {/* recommendation — the recommended product, in its own gradient (the
            same light it carries everywhere it's listed) */}
        <div className="relative mt-12 overflow-hidden rounded-[24px] bg-ink text-paper">
          <PackageGradient offeringId={rec.offeringId} interactive scrim />
          <div className="relative z-[1] p-6 md:p-8">
            <span className="mono text-[10px] uppercase tracking-[0.18em] text-paper/60">Recommended next step</span>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
              <h4 className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-medium tracking-tight text-paper">{rec.package}</h4>
              <span className="mono text-[14px] text-paper/85">{rec.price}</span>
            </div>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-paper/75">{rec.why}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link to={rec.to} className="btn btn--solid-dark"><span>{rec.cta}</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
              <Link to="/framework" className="ul text-[13px] text-paper/70">See the method behind this</Link>
            </div>
          </div>
        </div>

        {/* honest small print */}
        <p className="mt-10 max-w-2xl border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-40">{DISCLAIMER}</p>
        <button onClick={() => { setStage("intro"); setAnswers([]); setQIdx(0) }} className="ul mt-4 text-[12.5px] text-ink-60">Retake the index</button>
      </div>
    </div>
  )
}
