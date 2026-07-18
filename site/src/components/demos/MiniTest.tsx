import { useState } from "react"
import { ArrowUpRight } from "@carbon/icons-react"
import { DEMOS, type RiasecType } from "@/content/demos"
import { PORTAL_URL } from "@/lib/api"

const { questions, results } = DEMOS.test
const ORDER: RiasecType[] = ["R", "I", "A", "S", "E", "C"]
const zero = () => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }) as Record<RiasecType, number>

// A genuine (if miniature) RIASEC interest scorer: six forced choices, tallied
// live into a Holland type. Real instrument logic, marketing-site scale.
export function MiniTest() {
  const [step, setStep] = useState(0)
  const [tally, setTally] = useState<Record<RiasecType, number>>(zero)
  const done = step >= questions.length

  const pick = (t: RiasecType) => { setTally((p) => ({ ...p, [t]: p[t] + 1 })); setStep((s) => s + 1) }
  const reset = () => { setTally(zero()); setStep(0) }

  if (done) {
    const top = ORDER.slice().sort((a, b) => tally[b] - tally[a])[0]
    const result = results.find((r) => r.type === top)!
    const max = Math.max(1, ...ORDER.map((t) => tally[t]))
    return (
      <div className="border border-line bg-paper-pure p-7 md:p-9">
        <span className="kicker text-ink-40">Your strongest leaning</span>
        <h3 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-light leading-none tracking-tight">{result.name}</h3>
        <p className="lead mt-4 max-w-md text-ink-60">{result.blurb}</p>
        <div className="mt-7 grid grid-cols-6 items-end gap-2" style={{ height: 84 }}>
          {ORDER.map((t) => (
            <div key={t} className="flex flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full bg-ink" style={{ height: `${(tally[t] / max) * 64 + 2}px`, opacity: t === top ? 1 : 0.25, transition: "height .6s var(--ease-out)" }} />
              </div>
              <span className="mono text-[10px] text-ink-40">{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          {result.careers.map((c) => (
            <span key={c} className="border border-line px-3 py-1.5 text-[12.5px] text-ink-80">{c}</span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <a href={PORTAL_URL} className="group inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-[12.5px] font-medium text-paper transition-opacity hover:opacity-80">
            Take the full assessment <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <button onClick={reset} className="ul text-[13px] text-ink-60">Try again</button>
        </div>
      </div>
    )
  }

  const q = questions[step]
  return (
    <div className="border border-line bg-paper-pure p-7 md:p-9">
      <div className="flex items-center justify-between">
        <span className="mono text-[11px] uppercase tracking-[0.16em] text-ink-40">Question {step + 1} / {questions.length}</span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => <span key={i} className="h-1 w-5 transition-colors duration-300" style={{ background: i <= step ? "var(--color-ink)" : "var(--color-ink-20)" }} />)}
        </div>
      </div>
      <p className="mt-7 text-[clamp(1.3rem,2.6vw,2rem)] font-light leading-snug tracking-tight">{q.prompt}</p>
      <div className="mt-7 grid gap-3">
        {[q.a, q.b].map((opt, i) => (
          <button key={i} onClick={() => pick(opt.type)} className="group flex items-center justify-between border border-line px-5 py-4 text-left text-[15px] transition-colors hover:bg-ink hover:text-paper">
            <span>{opt.label}</span>
            <ArrowUpRight size={16} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}
