// Untimed Likert runner — personality + interest + the executive scale — rendered
// to COPY the portal test room (src/portal/screens/TestRunner.tsx) exactly:
// "← Back" header + truthful save signal, "Question N" + countdown, a hairline with
// the instrument's mono eyebrow + context line, a big IBM Plex Sans question, a
// one-touch ⓘ Clarification, sharp-cornered option boxes (selected = paper, the key
// number on the right), and the keyboard-hint footer. The bottom-right glow stays.
// Keyboard model matches the portal runner: 1–5 select, ↑↓ move, Enter confirm &
// next, ←/→ navigate; clicking an option confirms it after a short beat.

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Check, Info, Sun, Moon } from "lucide-react"
import { GlowField, TopBar, Kbd } from "./GuestFlow"
import { clarifyFor } from "@/portal/tests/clarifications"

export interface LikertRunnerProps {
  title: string
  hues: [string, string]
  items: { text: string; chapter?: string; context?: string }[]
  scale: string[]
  answers: (number | null)[]
  onSave: (answers: (number | null)[]) => void
  onDone: (answers: (number | null)[]) => void
  /** Per-item response times, ms, in ITEM prop order (the caller maps back to
   *  storage order exactly like answers). Called alongside onSave whenever a
   *  new first-answer time lands. Only the FIRST commit of an item records a
   *  time — first-exposure reading time is the honest metric; revisits and
   *  answer changes never overwrite it. */
  onTimes?: (times: (number | null)[]) => void
  dark: boolean
  onToggle: () => void
  /** show the "new chapter" interstitials; off when items are randomised (mixed chapters) */
  chaptered?: boolean
}

export function LikertRunner({ title, hues, items, scale, answers: initial, onSave, onDone, onTimes, dark, onToggle, chaptered = true }: LikertRunnerProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    initial.length === items.length ? initial : Array(items.length).fill(null))
  const firstOpen = useMemo(() => { const i = answers.findIndex((a) => a == null); return i < 0 ? items.length - 1 : i }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(firstOpen)
  const [chapterCard, setChapterCard] = useState<string | null>(() => chaptered && items[firstOpen]?.chapter && firstOpen === 0 ? items[0].chapter! : null)
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const advTimer = useRef<number | null>(null)
  const answersRef = useRef(answers); answersRef.current = answers
  const iRef = useRef(i); iRef.current = i
  // Response-time capture (no UI): ms from an item becoming the active question
  // to its FIRST answer commit, in ITEM prop order. A ref, not state — nothing
  // renders from it. The clock restarts whenever the active item changes or a
  // chapter interstitial closes (the question isn't readable underneath it).
  const timesRef = useRef<(number | null)[]>(Array(items.length).fill(null))
  const shownAtRef = useRef<number>(performance.now())
  useEffect(() => { shownAtRef.current = performance.now() }, [i, chapterCard])

  const item = items[i]
  const answered = answers.filter((a) => a != null).length
  const remaining = items.length - (i + 1)
  const done = answered === items.length
  const clarify = clarifyFor(item.text)

  const goTo = (to: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, to))
    if (clamped === iRef.current) return
    if (chaptered && clamped > iRef.current && items[clamped].chapter && items[clamped].chapter !== items[iRef.current].chapter) {
      setChapterCard(items[clamped].chapter!)
    }
    setI(clamped)
  }

  const select = (v: number, confirm: boolean) => {
    // record the first-exposure time only when this is the item's FIRST answer
    // (a resumed sitting re-answering an old item must not fake a fresh read)
    if (answersRef.current[iRef.current] == null && timesRef.current[iRef.current] == null) {
      timesRef.current[iRef.current] = Math.max(0, Math.round(performance.now() - shownAtRef.current))
      onTimes?.(timesRef.current.slice())
    }
    const next = [...answersRef.current]
    next[iRef.current] = v
    setAnswers(next)
    onSave(next)
    if (advTimer.current) window.clearTimeout(advTimer.current)
    if (confirm) advTimer.current = window.setTimeout(() => advance(next), 200)
  }

  const advance = (current = answersRef.current) => {
    if (iRef.current < items.length - 1) goTo(iRef.current + 1)
    else if (current.every((a) => a != null)) onDone(current)
    else { const f = current.findIndex((a) => a == null); if (f >= 0) goTo(f) }
  }

  // clarification closes on every question change
  useEffect(() => { setClarifyOpen(false) }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (chapterCard) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChapterCard(null) } return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const cur = answersRef.current[iRef.current]
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); select(Number(e.key), false) }
      else if (e.key === "ArrowDown") { e.preventDefault(); select(Math.min(5, (cur ?? 0) + 1), false) }
      else if (e.key === "ArrowUp") { e.preventDefault(); select(Math.max(1, (cur ?? 2) - 1), false) }
      else if (e.key === "Enter") { e.preventDefault(); if (cur != null) advance() }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(iRef.current - 1) }
      else if (e.key === "ArrowRight") { e.preventDefault(); goTo(iRef.current + 1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  useEffect(() => () => { if (advTimer.current) window.clearTimeout(advTimer.current) }, [])

  const mut = { color: "var(--gmut)" }

  // chapter interstitial — a short brief before a new block (kept simple, over the glow)
  if (chapterCard) {
    return (
      <>
        <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px] tabular-nums" style={mut}>{answered} / {items.length} answered</span>} />
        <GlowField hues={hues} strong />
        <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 pb-24 sm:px-10 lg:px-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>{title}</p>
          <h2 className="mt-3 font-display text-[clamp(26px,4vw,38px)] font-semibold leading-[1.12] tracking-tight">{chapterCard}</h2>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed" style={mut}>
            {items[i]?.context ?? "Same scale as before — answer as you actually are."}
          </p>
          <button onClick={() => setChapterCard(null)}
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
            style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
            Continue
          </button>
          <p className="mt-5 text-[12px]" style={mut}><Kbd>Enter</Kbd> to continue</p>
        </main>
      </>
    )
  }

  return (
    <>
      <GlowField hues={hues} />
      {/* the whole frame — header to footer — fits one viewport, exactly like the
          portal room: header, question block, then the footer pinned by mt-auto */}
      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col px-6 pb-6 pt-6 sm:px-10 lg:px-24">
        {/* header — Back on the left, the (truthful) local-save signal + theme toggle on the right */}
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

        <div key={i} className="w-full">
          {/* countdown — remaining reads better than "8/96" */}
          <div className="mt-6">
            <p className="text-[17px] font-medium uppercase tracking-[0.12em] sm:text-[18px]">Question {i + 1}</p>
            <p className="mt-1.5 text-[15px]" style={mut}>{remaining} question{remaining === 1 ? "" : "s"} remaining</p>
          </div>

          {/* instrument frame of mind */}
          <div className="mt-5 max-w-3xl border-t pt-4" style={{ borderColor: "var(--gline)" }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>{item.chapter ?? title}</p>
            {item.context && <p className="mt-1.5 text-[15px] leading-relaxed" style={mut}>{item.context}</p>}
          </div>

          {/* the question — IBM Plex Sans, the hero */}
          <h1 className="mt-5 max-w-3xl text-[clamp(1.45rem,2.8vw,2.2rem)] font-semibold leading-[1.18] tracking-[-0.02em]">
            {item.text}
          </h1>

          {/* one-touch vocabulary clarification — hidden until asked */}
          {clarify && (
            <div className="mt-4">
              <button onClick={() => setClarifyOpen((o) => !o)} aria-expanded={clarifyOpen}
                className="inline-flex items-center gap-1.5 text-[13px] transition-colors" style={mut}>
                <Info className="size-3.5" /> Clarification
              </button>
              {clarifyOpen && <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed" style={mut}>{clarify}</p>}
            </div>
          )}

          {/* options — stacked boxes, key number on the right, check when chosen */}
          <div className="mt-5 grid max-w-2xl gap-2.5" role="group" aria-label="Answer options">
            {scale.map((s, vi) => {
              const v = vi + 1
              const active = answers[i] === v
              return (
                <button
                  key={vi}
                  onClick={() => select(v, true)}
                  aria-pressed={active}
                  className="flex min-h-[52px] items-center justify-between gap-4 border px-5 py-2.5 text-left text-[15.5px] font-medium transition-colors sm:text-[16.5px]"
                  style={active
                    ? { borderColor: "var(--gfg)", background: "var(--gfg)", color: "var(--gbg)" }
                    : { borderColor: "var(--goptline)", background: "var(--gopt)", color: "var(--gfg)" }}
                >
                  <span>{s}</span>
                  {active
                    ? <Check className="size-4 shrink-0 stroke-[2.5]" style={{ opacity: 0.6 }} />
                    : <span className="shrink-0 font-mono text-[11px]" style={mut}>{v}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* footer — Previous · shortcut legend · finish / save signal */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: "var(--gline)" }}>
          <button onClick={() => goTo(i - 1)} disabled={i === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors disabled:opacity-30" style={mut}>
            <ArrowLeft className="size-3.5" /> Previous
          </button>
          <div className="hidden items-center gap-5 md:flex" style={mut}>
            <span className="flex items-center gap-1.5"><Kbd>1–5</Kbd> Select</span>
            <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> Navigate</span>
            <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> Confirm &amp; next</span>
          </div>
          {done ? (
            <button onClick={() => onDone(answers)} className="min-h-[44px] font-medium" style={{ color: "var(--gfg)" }}>
              Finish test →
            </button>
          ) : (
            <span className="min-h-[44px] content-center text-[12px]" style={mut}>Saves as you go</span>
          )}
        </div>
      </main>
    </>
  )
}
