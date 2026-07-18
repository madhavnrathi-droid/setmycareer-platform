// CCPA runner — the executive third test, in the portal test-room layout.
// Three parts in one sitting:
//   A  16 situational scenarios — pick the MOST likely and LEAST likely response
//   B  24 forced-choice blocks  — pick the MOST and LEAST descriptive statement
//   C  48 agree-scale statements — rendered through the shared LikertRunner
// MOST/LEAST rows follow the portal BestWorst pattern: two pick-circles on the
// right of every option; the same option can never be both. Auto-advances a
// beat after both picks land.

import { useMemo, useRef, useState, useEffect } from "react"
import { ArrowLeft, Check, Sun, Moon } from "lucide-react"
import { GlowField, TopBar, Kbd, TEST_HUE } from "./GuestFlow"
import { SJTS, FC_BLOCKS, CCPA_LIK, CCPA_SCALE, OPTION_KEYS, type OptionKey } from "./ccpa"
import { LikertRunner } from "./LikertRunner"
import { useGuest, updateGuest, getGuest, type CompetencyProgress } from "./guest-store"

const empty = (): CompetencyProgress => ({
  sjt: Array(SJTS.length).fill(null),
  fc: Array(FC_BLOCKS.length).fill(null),
  lik: Array(CCPA_LIK.length).fill(null),
})

type Part = "sjt" | "fc" | "lik"

function partFor(p: CompetencyProgress): Part {
  if (p.sjt.some((a) => a == null)) return "sjt"
  if (p.fc.some((a) => a == null)) return "fc"
  return "lik"
}

export function CcpaRunner({ token, dark, onToggle }: { token: string; dark: boolean; onToggle: () => void }) {
  const state = useGuest(token)
  const prog: CompetencyProgress = state.competency ?? empty()
  const [part, setPart] = useState<Part>(() => partFor(prog))
  const [intro, setIntro] = useState(() => prog.sjt.every((a) => a == null) && prog.fc.every((a) => a == null) && prog.lik.every((a) => a == null))

  const persist = (patch: Partial<CompetencyProgress>, done = false) => {
    const s = getGuest(token)
    const next: CompetencyProgress = { ...(s.competency ?? empty()), ...patch }
    updateGuest(token, { competency: next, ...(done ? { competencyDoneAt: new Date().toISOString() } : {}) })
    return next
  }

  const mut = { color: "var(--gmut)" }

  if (intro) {
    return (
      <>
        <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={mut}>Competency · CCPA</span>} />
        <GlowField hues={TEST_HUE.ability} strong />
        <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 pb-24 sm:px-10 lg:px-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>Three parts · one sitting</p>
          <h1 className="mt-3 max-w-[26ch] font-display text-[clamp(28px,4.6vw,40px)] font-semibold leading-[1.1] tracking-tight">
            Competency &amp; potential.
          </h1>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed" style={mut}>
            How you handle real work demands — measured three ways so no single answering style decides the result.
          </p>
          <ol className="mt-6 flex max-w-[60ch] flex-col gap-3 text-[13.5px]" style={mut}>
            <li><span className="font-medium" style={{ color: "var(--gfg)" }}>Part A — 16 work scenarios.</span> Pick what you would MOST likely do, and LEAST likely do.</li>
            <li><span className="font-medium" style={{ color: "var(--gfg)" }}>Part B — 24 quick choices.</span> From four statements, pick the MOST like you and the LEAST like you.</li>
            <li><span className="font-medium" style={{ color: "var(--gfg)" }}>Part C — 48 statements.</span> Rate how well each describes you at work.</li>
          </ol>
          <button onClick={() => setIntro(false)}
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
            Start Part A
          </button>
        </main>
      </>
    )
  }

  if (part === "lik") {
    return (
      <LikertRunner
        key="ccpa-lik"
        dark={dark} onToggle={onToggle}
        title="Part C · How you work"
        hues={TEST_HUE.ability}
        items={CCPA_LIK.map((it) => ({ text: it.text, context: "Rate how well this describes you at work — as you are, not as you'd like to be." }))}
        scale={CCPA_SCALE}
        answers={prog.lik}
        chaptered={false}
        onSave={(answers) => persist({ lik: answers })}
        onDone={(answers) => persist({ lik: answers }, true)}
      />
    )
  }

  return (
    <MostLeastPart
      key={part}
      part={part}
      dark={dark} onToggle={onToggle}
      answers={part === "sjt" ? prog.sjt : prog.fc}
      onSave={(answers) => persist(part === "sjt" ? { sjt: answers } : { fc: answers })}
      onDone={(answers) => {
        persist(part === "sjt" ? { sjt: answers } : { fc: answers })
        setPart(part === "sjt" ? "fc" : "lik")
      }}
    />
  )
}

/* ── the MOST/LEAST screen (parts A + B) ─────────────────────────────────────── */
function MostLeastPart({ part, answers: initial, onSave, onDone, dark, onToggle }: {
  part: "sjt" | "fc"
  answers: ({ m: string; l: string } | null)[]
  onSave: (a: ({ m: string; l: string } | null)[]) => void
  onDone: (a: ({ m: string; l: string } | null)[]) => void
  dark: boolean
  onToggle: () => void
}) {
  const n = part === "sjt" ? SJTS.length : FC_BLOCKS.length
  const [answers, setAnswers] = useState(initial.length === n ? initial : Array(n).fill(null))
  const answersRef = useRef(answers); answersRef.current = answers
  const firstOpen = useMemo(() => { const i = answers.findIndex((a) => a == null); return i < 0 ? n - 1 : i }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(firstOpen)
  const iRef = useRef(i); iRef.current = i
  // in-progress picks for the CURRENT block (before both are chosen)
  const [most, setMost] = useState<OptionKey | null>(() => (initial[firstOpen]?.m as OptionKey) ?? null)
  const [least, setLeast] = useState<OptionKey | null>(() => (initial[firstOpen]?.l as OptionKey) ?? null)
  const advTimer = useRef<number | null>(null)

  const remaining = n - (i + 1)
  const done = answers.every((a) => a != null)

  const goTo = (to: number) => {
    const clamped = Math.max(0, Math.min(n - 1, to))
    if (clamped === iRef.current) return
    setI(clamped)
    const a = answersRef.current[clamped]
    setMost((a?.m as OptionKey) ?? null)
    setLeast((a?.l as OptionKey) ?? null)
  }

  const commit = (m: OptionKey, l: OptionKey) => {
    const next = [...answersRef.current]
    next[iRef.current] = { m, l }
    setAnswers(next)
    onSave(next)
    if (advTimer.current) window.clearTimeout(advTimer.current)
    advTimer.current = window.setTimeout(() => {
      if (iRef.current < n - 1) goTo(iRef.current + 1)
      else if (next.every((a) => a != null)) onDone(next)
      else { const f = next.findIndex((a) => a == null); if (f >= 0) goTo(f) }
    }, 260)
  }

  const pick = (slot: "m" | "l", opt: OptionKey) => {
    if (advTimer.current) window.clearTimeout(advTimer.current)
    let m = most, l = least
    if (slot === "m") { m = opt; if (l === opt) l = null }
    else { l = opt; if (m === opt) m = null }
    setMost(m); setLeast(l)
    if (m && l) commit(m, l)
  }

  useEffect(() => () => { if (advTimer.current) window.clearTimeout(advTimer.current) }, [])

  const mut = { color: "var(--gmut)" }
  const sjt = part === "sjt" ? SJTS[i] : null
  const fcb = part === "fc" ? FC_BLOCKS[i] : null
  const options: Record<OptionKey, string> = (sjt ? sjt.options : fcb!.statements)

  return (
    <>
      <GlowField hues={TEST_HUE.ability} />
      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col px-6 pb-6 pt-6 sm:px-10 lg:px-24">
        {/* header */}
        <div className="flex items-center justify-between gap-6">
          <button onClick={() => goTo(i - 1)} disabled={i === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] transition-colors disabled:opacity-30" style={mut}>
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12.5px] sm:inline" style={mut}>
              <Check className="mr-1 inline size-3.5" />Saved on this device
            </span>
            <button onClick={onToggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="grid size-8 place-items-center rounded-full border transition-colors"
              style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
              {dark ? <Sun className="size-3.5 stroke-[1.75]" /> : <Moon className="size-3.5 stroke-[1.75]" />}
            </button>
          </div>
        </div>

        <div key={`${part}-${i}`} className="w-full">
          <div className="mt-6">
            <p className="text-[17px] font-medium uppercase tracking-[0.12em] sm:text-[18px]">
              {part === "sjt" ? `Scenario ${i + 1}` : `Choice ${i + 1}`}
            </p>
            <p className="mt-1.5 text-[15px]" style={mut}>{remaining} remaining · Part {part === "sjt" ? "A" : "B"} of 3</p>
          </div>

          <div className="mt-5 max-w-3xl border-t pt-4" style={{ borderColor: "var(--gline)" }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>
              {part === "sjt" ? "Situational judgement" : "Most and least like you"}
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed" style={mut}>
              {part === "sjt"
                ? "Pick the response you would MOST likely take, and the one you would LEAST likely take."
                : "Pick the statement MOST like you, and the one LEAST like you."}
            </p>
          </div>

          {/* the scenario / prompt */}
          {sjt ? (
            <div className="mt-5 max-w-3xl rounded-[10px] border px-4 py-3.5 text-[14.5px] leading-relaxed"
              style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
              {sjt.scenario}
            </div>
          ) : (
            <h1 className="mt-5 max-w-3xl text-[clamp(1.3rem,2.4vw,1.8rem)] font-semibold leading-[1.2] tracking-[-0.02em]">
              Which is most — and least — like you?
            </h1>
          )}

          {/* option rows with Most / Least pickers */}
          <div className="mt-5 max-w-3xl overflow-hidden border" style={{ borderColor: "var(--goptline)", background: "var(--gopt)" }}>
            <div className="flex items-center justify-end gap-2 border-b px-4 py-2" style={{ borderColor: "var(--gline)" }}>
              <span className="w-14 text-center font-mono text-[10px] uppercase tracking-[0.12em]" style={mut}>Most</span>
              <span className="w-14 text-center font-mono text-[10px] uppercase tracking-[0.12em]" style={mut}>Least</span>
            </div>
            {OPTION_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--gline)" }}>
                <span className="w-5 shrink-0 font-mono text-[11px]" style={mut}>{k}</span>
                <span className="flex-1 text-[14px] leading-snug">{options[k]}</span>
                {(["m", "l"] as const).map((slot) => {
                  const on = (slot === "m" ? most : least) === k
                  return (
                    <button
                      key={slot} onClick={() => pick(slot, k)} aria-pressed={on}
                      aria-label={`${slot === "m" ? "Most" : "Least"}: option ${k}`}
                      className="grid w-14 place-items-center py-1 transition-colors"
                      style={{ color: on ? "var(--gfg)" : "var(--gmut)", opacity: on ? 1 : 0.55 }}
                    >
                      <span className="grid size-5 place-items-center rounded-full border transition-colors"
                        style={on ? { borderColor: "var(--gfg)", background: "var(--gfg)" } : { borderColor: "currentColor" }}>
                        {on && <Check className="size-3 stroke-[3]" style={{ color: "var(--gbg)" }} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: "var(--gline)" }}>
          <button onClick={() => goTo(i - 1)} disabled={i === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors disabled:opacity-30" style={mut}>
            <ArrowLeft className="size-3.5" /> Previous
          </button>
          <div className="hidden items-center gap-5 md:flex" style={mut}>
            <span className="flex items-center gap-1.5"><Kbd>Most</Kbd> then <Kbd>Least</Kbd> — one each</span>
            <span className="flex items-center gap-1.5">Advances when both are picked</span>
          </div>
          {done ? (
            <button onClick={() => onDone(answersRef.current)} className="min-h-[44px] font-medium" style={{ color: "var(--gfg)" }}>
              Continue →
            </button>
          ) : (
            <span className="min-h-[44px] content-center text-[12px]" style={mut}>Saves as you go</span>
          )}
        </div>
      </main>
    </>
  )
}
