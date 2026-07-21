// The timed ability battery — eight chapters in the product's REAL test layout:
// "QUESTION N" + countdown header, hairline + section context line, big display
// question, stacked option boxes with the key number on the right, keyboard-hint
// footer. The clock sits quietly beside the theme toggle (mono digits, amber in
// the last minute, red in the last 15 s, never blinking). A section closes itself
// when its time is up; unanswered items score zero.

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, Sun, Moon } from "lucide-react"
import { GlowField, TopBar, Kbd, TEST_HUE } from "./GuestFlow"
import {
  ABILITY_SECTIONS, SPATIAL_SHAPES, SPATIAL_TRIALS, CLERICAL_PAIRS,
  sectionItemCount, type AbilitySection,
} from "./ability-bank"
import { AbilityFigure, SpatialFigure } from "./ability-assets"
import { useGuest, updateGuest, getGuest, type AbilityProgress } from "./guest-store"

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

function emptyProgress(): AbilityProgress { return { answers: {}, secondsLeft: {}, done: [] } }

export function AbilityRunner({ token, dark, onToggle }: { token: string; dark: boolean; onToggle: () => void }) {
  const state = useGuest(token)
  const prog: AbilityProgress = state.ability ?? emptyProgress()
  const nextIdx = ABILITY_SECTIONS.findIndex((s) => !prog.done.includes(s.key))
  const section = nextIdx >= 0 ? ABILITY_SECTIONS[nextIdx] : null
  const [betweenFor, setBetweenFor] = useState<string | null>(null)
  const resuming = section != null && prog.secondsLeft[section.key] != null && !betweenFor
  const [running, setRunning] = useState(resuming)

  if (!section) return null

  const startSection = () => { setBetweenFor(null); setRunning(true) }

  const closeSection = (answers: (number | string | null)[], secondsUsedUp: boolean) => {
    const nextProg: AbilityProgress = {
      answers: { ...prog.answers, [section.key]: answers },
      secondsLeft: { ...prog.secondsLeft },
      done: [...prog.done, section.key],
    }
    delete nextProg.secondsLeft[section.key]
    const isLast = nextIdx === ABILITY_SECTIONS.length - 1
    updateGuest(token, {
      ability: nextProg,
      ...(isLast ? { abilityDoneAt: new Date().toISOString() } : {}),
    })
    setRunning(false)
    if (!isLast) setBetweenFor(secondsUsedUp ? "time" : "done")
  }

  if (!running) {
    const idxLabel = `Section ${nextIdx + 1} of ${ABILITY_SECTIONS.length}`
    return (
      <>
        <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={{ color: "var(--gmut)" }}>{idxLabel}</span>} />
        <GlowField hues={TEST_HUE.ability} strong />
        <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-[clamp(24px,6vw,110px)] pb-24">
          {betweenFor && (
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px]"
              style={{ borderColor: "var(--gline)", background: "var(--gcard)", color: "var(--gmut)" }}>
              <Check className="size-3.5" /> {betweenFor === "time" ? "Time — that section is closed." : "Section complete."} Take a breath.
            </p>
          )}
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--gmut)" }}>
            {idxLabel} · {sectionItemCount(section)} items{section.hideTimer ? " · speed test" : ` · ${section.minutes} minutes`}
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,4.6vw,40px)] font-semibold leading-[1.1] tracking-tight">{section.label}</h1>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed" style={{ color: "var(--gmut)" }}>{section.measures}</p>
          <div className="mt-6 max-w-3xl rounded-[10px] border p-5 text-[14px] leading-relaxed" style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--gmut)" }}>How to answer</p>
            <p className="mt-2">{section.how}</p>
            {!section.normed && (
              <p className="mt-2" style={{ color: "var(--gmut)" }}>This section is reported as a raw score only.</p>
            )}
          </div>
          <button onClick={startSection}
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
            Start — the clock begins now
          </button>
        </main>
      </>
    )
  }

  return (
    <SectionRun
      key={section.key}
      token={token} dark={dark} onToggle={onToggle}
      section={section}
      initialAnswers={prog.answers[section.key] ?? Array(sectionItemCount(section)).fill(null)}
      initialSeconds={prog.secondsLeft[section.key] ?? section.minutes * 60}
      onClose={closeSection}
    />
  )
}

// ── one timed section ─────────────────────────────────────────────────────────
function SectionRun({ token, dark, onToggle, section, initialAnswers, initialSeconds, onClose }: {
  token: string
  dark: boolean
  onToggle: () => void
  section: AbilitySection
  initialAnswers: (number | string | null)[]
  initialSeconds: number
  onClose: (answers: (number | string | null)[], timedOut: boolean) => void
}) {
  const n = sectionItemCount(section)
  const [answers, setAnswers] = useState(initialAnswers)
  const answersRef = useRef(answers); answersRef.current = answers
  const [i, setI] = useState(() => { const f = initialAnswers.findIndex((a) => a == null); return f < 0 ? 0 : f })
  const iRef = useRef(i); iRef.current = i
  const [left, setLeft] = useState(Math.max(1, Math.round(initialSeconds)))
  const leftRef = useRef(left); leftRef.current = left
  const closedRef = useRef(false)
  const advTimer = useRef<number | null>(null)

  const persist = (nextAnswers: (number | string | null)[], secondsLeft: number) => {
    const s = getGuest(token)
    updateGuest(token, {
      ability: {
        answers: { ...(s.ability?.answers ?? {}), [section.key]: nextAnswers },
        secondsLeft: { ...(s.ability?.secondsLeft ?? {}), [section.key]: secondsLeft },
        done: s.ability?.done ?? [],
      },
    })
  }

  const finish = (timedOut: boolean) => {
    if (closedRef.current) return
    closedRef.current = true
    if (advTimer.current) window.clearTimeout(advTimer.current)
    onClose(answersRef.current, timedOut)
  }

  // the clock — 1 s ticks, persisted every 5 s so a reload resumes honestly
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = leftRef.current - 1
      setLeft(next)
      if (next <= 0) { persist(answersRef.current, 0); finish(true); return }
      if (next % 5 === 0) persist(answersRef.current, next)
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remaining = n - (i + 1)

  const record = (val: number | string, confirm: boolean) => {
    if (closedRef.current) return
    const next = [...answersRef.current]
    next[iRef.current] = val
    setAnswers(next)
    persist(next, leftRef.current)
    if (!confirm) return
    if (advTimer.current) window.clearTimeout(advTimer.current)
    advTimer.current = window.setTimeout(() => advance(next), section.kind === "mcq" || section.kind === "closure" ? 190 : 100)
  }

  const advance = (current = answersRef.current) => {
    if (closedRef.current) return
    const allDone = current.every((a) => a != null)
    if (allDone) { finish(false); return }
    if (iRef.current < n - 1) setI(iRef.current + 1)
    else { const f = current.findIndex((a) => a == null); if (f >= 0) setI(f) }
  }

  // keyboard — matches the portal runner's model
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (section.kind === "mcq" || section.kind === "closure") {
        const opts = section.items![iRef.current].options.length
        const cur = answersRef.current[iRef.current] as number | null
        if (/^[1-9]$/.test(e.key) && Number(e.key) <= opts) { e.preventDefault(); record(Number(e.key) - 1, false) }
        else if (e.key === "ArrowDown") { e.preventDefault(); record(Math.min(opts - 1, (cur ?? -1) + 1), false) }
        else if (e.key === "ArrowUp") { e.preventDefault(); record(Math.max(0, (cur ?? 1) - 1), false) }
        else if (e.key === "Enter") { e.preventDefault(); if (cur != null) advance() }
      } else if (section.kind === "spatial") {
        if (k === "s" || e.key === "1") { e.preventDefault(); record("S", true) }
        if (k === "r" || e.key === "2") { e.preventDefault(); record("R", true) }
      } else {
        if (k === "s" || e.key === "1") { e.preventDefault(); record("S", true) }
        if (k === "d" || e.key === "2") { e.preventDefault(); record("D", true) }
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); setI(Math.max(0, iRef.current - 1)) }
      if (e.key === "ArrowRight") { e.preventDefault(); setI(Math.min(n - 1, iRef.current + 1)) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  useEffect(() => () => { if (advTimer.current) window.clearTimeout(advTimer.current) }, [])

  // Time pressure reads as colour, proportional to the section (not a fixed
  // number of seconds — a 3-minute and a 12-minute section should warn at the
  // same *felt* moment): amber inside the last 10%, red inside the last 5%.
  // Tones are picked per theme so both stay legible on paper and on black.
  const totalSecs = Math.max(1, Math.round(section.minutes * 60))
  const fracLeft = left / totalSecs
  const timeTone =
    fracLeft <= 0.05 ? (dark ? "#f87171" : "#dc2626")
      : fracLeft <= 0.10 ? (dark ? "#facc15" : "#ca8a04")
      : "var(--gmut)"
  const mut = { color: "var(--gmut)" }

  return (
    <>
      <GlowField hues={TEST_HUE.ability} />
      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col px-6 pb-6 pt-6 sm:px-10 lg:px-24">
        {/* header — Back on the left; the theme toggle on the right */}
        <div className="flex items-center justify-between gap-6">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] transition-colors disabled:opacity-30" style={mut}>
            <ArrowLeft className="size-4" /> Back
          </button>
          <button onClick={onToggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="grid size-8 place-items-center rounded-full border transition-colors"
            style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
            {dark ? <Sun className="size-3.5 stroke-[1.75]" /> : <Moon className="size-3.5 stroke-[1.75]" />}
          </button>
        </div>

        {/* countdown header — the clock sits on the QUESTION line, right-aligned
            and set at the same scale, so time-left reads as a peer of progress
            rather than a footnote in the chrome above. */}
        {/* the clock is the block's twin: it fills the same height as the
            Question line + the count beneath it, so time-left carries equal
            weight to progress instead of hiding in the chrome. */}
        <div className="mt-6 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[17px] font-medium uppercase tracking-[0.12em] sm:text-[18px]">Question {i + 1}</p>
            <p className="mt-1.5 text-[15px]" style={mut}>{remaining} question{remaining === 1 ? "" : "s"} remaining</p>
          </div>
          {!section.hideTimer && (
            <span
              aria-label="Time remaining in this section"
              className="shrink-0 font-mono text-[40px] leading-none tabular-nums tracking-tight transition-colors duration-500 sm:text-[48px]"
              style={{ color: timeTone }}
            >
              {fmt(Math.max(0, left))}
            </span>
          )}
        </div>

        {/* section context */}
        <div className="mt-5 max-w-3xl border-t pt-4" style={{ borderColor: "var(--gline)" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>{section.label}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: "var(--gmut)" }}>{section.measures}</p>
        </div>

        {(section.kind === "mcq" || section.kind === "closure") && <McqView key={i} section={section} i={i} value={answers[i] as number | null} onPick={(v) => record(v, true)} />}
        {section.kind === "spatial" && <SpatialView key={i} i={i} value={answers[i] as string | null} onPick={(v) => record(v, true)} />}
        {section.kind === "clerical" && <ClericalView key={i} i={i} value={answers[i] as string | null} onPick={(v) => record(v, true)} />}

        {/* footer */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: "var(--gline)" }}>
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors disabled:opacity-30" style={mut}>
            <ArrowLeft className="size-3.5" /> Previous
          </button>
          <div className="hidden items-center gap-5 md:flex" style={mut}>
            {section.kind === "mcq" || section.kind === "closure" ? (
              <>
                <span className="flex items-center gap-1.5"><Kbd>1–{section.items![i].options.length}</Kbd> Select</span>
                <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> Navigate</span>
                <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> Confirm & next</span>
              </>
            ) : section.kind === "spatial" ? (
              <>
                <span className="flex items-center gap-1.5"><Kbd>S</Kbd> Same</span>
                <span className="flex items-center gap-1.5"><Kbd>R</Kbd> Reversed</span>
                <span className="flex items-center gap-1.5"><Kbd>←→</Kbd> Move</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><Kbd>S</Kbd> Same</span>
                <span className="flex items-center gap-1.5"><Kbd>D</Kbd> Different</span>
                <span className="flex items-center gap-1.5"><Kbd>←→</Kbd> Move</span>
              </>
            )}
          </div>
          <button onClick={() => finish(false)} className="min-h-[44px] transition-colors" style={mut}>
            Finish section early
          </button>
        </div>
      </main>
    </>
  )
}

// ── item views ────────────────────────────────────────────────────────────────
function McqView({ section, i, value, onPick }: { section: AbilitySection; i: number; value: number | null; onPick: (v: number) => void }) {
  const item = section.items![i]
  const question = (
    <>
      {item.passage && (
        <p className="mt-5 max-w-3xl rounded-[10px] border px-4 py-3 text-[14px] italic leading-relaxed"
          style={{ borderColor: "var(--gline)", background: "var(--gcard)", color: "var(--gmut)" }}>
          “{item.passage}”
        </p>
      )}
      {item.word ? (
        // Closure (CA): the target word shown DEGRADED (parts of the letters
        // clipped away, like the paper booklet) — recognise it, then pick the
        // jumble with the same letters.
        <div className="mt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--gmut)" }}>Which jumble uses the same letters?</p>
          <div className="mt-3 select-none font-mono text-[clamp(2.4rem,6vw,3.6rem)] font-bold lowercase tracking-[0.12em]"
            style={{ WebkitMaskImage: "linear-gradient(180deg, #000 0, #000 50%, transparent 80%)", maskImage: "linear-gradient(180deg, #000 0, #000 50%, transparent 80%)" }}>
            {item.word}
          </div>
        </div>
      ) : (
        <h2 className="mt-6 max-w-3xl text-[clamp(1.45rem,2.8vw,2.2rem)] font-semibold leading-[1.18] tracking-[-0.02em]">{item.text}</h2>
      )}
      <div className="mt-6 grid max-w-2xl gap-2.5">
        {item.options.map((o, vi) => {
          const active = value === vi
          return (
            <button key={vi} onClick={() => onPick(vi)} aria-pressed={active}
              className="flex min-h-[52px] items-center justify-between gap-4 border px-5 py-2.5 text-left text-[15.5px] font-medium transition-colors sm:text-[16.5px]"
              style={active
                ? { borderColor: "var(--gfg)", background: "var(--gfg)", color: "var(--gbg)" }
                : { borderColor: "var(--goptline)", background: "var(--gopt)", color: "var(--gfg)" }}>
              <span>{o}</span>
              {active
                ? <Check className="size-4 shrink-0 stroke-[2.5]" style={{ opacity: 0.6 }} />
                : <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--gmut)" }}>{vi + 1}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
  if (!item.figure) return question
  // Items with a booklet figure: question + options on the left, the figure
  // panel on the right ~40% on large screens (the paper layout); stacked on
  // small screens with the figure between the stem and the options.
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 lg:flex-[3]">{question}</div>
      <div className="w-full lg:mt-6 lg:w-[40%] lg:max-w-[460px] lg:flex-[2]">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--gmut)" }}>Figure</p>
        <AbilityFigure id={item.figure} placeholder={item.requiresAsset} />
      </div>
    </div>
  )
}

function ChoiceRow({ k, label, active, onPick }: { k: string; label: string; active: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} aria-pressed={active}
      className="flex min-h-[52px] items-center justify-between gap-4 border px-5 py-2.5 text-left text-[15.5px] font-medium transition-colors sm:text-[16.5px]"
      style={active
        ? { borderColor: "var(--gfg)", background: "var(--gfg)", color: "var(--gbg)" }
        : { borderColor: "var(--goptline)", background: "var(--gopt)", color: "var(--gfg)" }}>
      <span>{label}</span>
      {active
        ? <Check className="size-4 shrink-0 stroke-[2.5]" style={{ opacity: 0.6 }} />
        : <span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--gmut)" }}>{k}</span>}
    </button>
  )
}

function SpatialView({ i, value, onPick }: { i: number; value: string | null; onPick: (v: string) => void }) {
  // Booklet model: each ROW of six test figures shares one Sample Figure. The
  // sample card sits on the left (labelled), the current test figure on the
  // right — S = same, merely turned around; R = reversed (turned over).
  const t = SPATIAL_TRIALS[i]
  const def = SPATIAL_SHAPES[t.shape]
  const row = t.shape + 1
  const posInRow = (i % 6) + 1
  return (
    <>
      <h2 className="mt-6 max-w-3xl text-[clamp(1.35rem,2.6vw,2rem)] font-semibold leading-[1.2] tracking-[-0.02em]">
        Is the Test Figure the Sample Figure turned around — or reversed?
      </h2>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--gmut)" }}>
        Row {row} · figure {posInRow} of 6 with this sample
      </p>
      <div className="mt-5 flex max-w-3xl items-stretch gap-3">
        <div className="grid flex-1 place-items-center rounded-[10px] border px-4 py-5"
          style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
          <SpatialFigure def={def} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--gmut)" }}>Sample figure</p>
        </div>
        <div className="grid flex-1 place-items-center rounded-[10px] border px-4 py-5"
          style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
          <SpatialFigure def={def} rot={t.rot} mirrored={t.mirrored} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--gmut)" }}>Test figure</p>
        </div>
      </div>
      <div className="mt-4 flex max-w-3xl flex-col gap-2.5">
        <ChoiceRow k="S" label="Same — only turned around" active={value === "S"} onPick={() => onPick("S")} />
        <ChoiceRow k="R" label="Reversed — turned over (mirror), maybe also turned" active={value === "R"} onPick={() => onPick("R")} />
      </div>
    </>
  )
}

function ClericalView({ i, value, onPick }: { i: number; value: string | null; onPick: (v: string) => void }) {
  const p = CLERICAL_PAIRS[i]
  return (
    <>
      <h2 className="mt-6 max-w-3xl text-[clamp(1.35rem,2.6vw,2rem)] font-semibold leading-[1.2] tracking-[-0.02em]">
        Are these two entries exactly the same?
      </h2>
      <div className="mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {[p.left, p.right].map((s, k) => (
          <div key={k} className="grid min-h-[84px] place-items-center rounded-[10px] border px-4 py-5"
            style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
            <span className="break-all text-center font-mono text-[clamp(17px,2.4vw,21px)] tracking-wide">{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex max-w-3xl flex-col gap-2.5">
        <ChoiceRow k="S" label="Same — identical, character for character" active={value === "S"} onPick={() => onPick("S")} />
        <ChoiceRow k="D" label="Different — something doesn't match" active={value === "D"} onPick={() => onPick("D")} />
      </div>
    </>
  )
}
