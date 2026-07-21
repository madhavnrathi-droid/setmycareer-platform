// TestRunner v2 — the full-screen testing room, built to the founder's
// "research-grade assessment platform" spec. No sidebar, no topbar, no AI bar:
// the instrument owns the whole screen (the route mounts outside PortalAppShell).
//
// The room should feel like a professional psychological evaluation, not a
// quiz: countdown progress ("N questions remaining"), a per-instrument context
// line, one-touch ⓘ Clarifications (vocabulary only), a visible autosave
// signal, full keyboard operation (1-5 / ↑↓ / wheel / Enter / ← → / Esc), a
// calm exit dialog, rotating reassurance notes, and a completion sequence that
// hands straight into the next instrument. The ShaderGradient dawn stays low —
// it never touches the middle of the screen.
//
// Movements: BRIEF → QUESTIONS → REFLECT (qualitative, never scored) → REVIEW
// (honesty check) → COMPLETE (analysis sequence → next instrument). One take
// only: a finished instrument shows the completed state.

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, Clock, Info, ListChecks, Lock, PenLine, ShieldCheck } from "lucide-react"
import { gsap, prefersReducedMotion, EASE } from "@/lib/gsap"
import { getTestFor, testsFor, type LikertItem, type AptitudeItem, type TestDef, type ReflectionItem } from "../tests/catalog"
import { clarifyFor } from "../tests/clarifications"
import { saveTestResult, saveBatteryResult, isUnlocked, getTestResult } from "../tests/results-store"
import { usePortalAccount, profileComplete, profileCompleteness, accountTrack, type PortalAccount } from "../portal-store"
import { useGuest, getGuest, updateGuest, itemOrder } from "@/guest/guest-store"
import { AbilityRunner } from "@/guest/AbilityRunner"
import { GThemeProvider, guestVars } from "@/guest/GuestFlow"
import { CcpaRunner } from "@/guest/CcpaRunner"
import { ABILITY_SECTIONS, rawScore } from "@/guest/ability-bank"
import { ABILITY_MAX, GRADE_PERCENTILE, gradeBand, standardScore, type AbilityKey, type Grade } from "@/guest/ability-norms"
import { scoreCcpa, type MostLeast } from "@/guest/ccpa"
import { SunriseField } from "../art/SunriseField"
import { LogoLockup } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

// Each instrument gets its own dawn — a three-stop palette fed to the
// ShaderGradient scene behind every stage. The per-test COLOUR lives entirely
// in the shader; foreground copy stays monochrome white-on-black so it never
// has to win a contrast fight with the glow it floats over.
const SUNRISE: Record<string, { deep: string; mid: string; bright: string }> = {
  sigma_personality: { deep: "#1e1b4b", mid: "#7c3aed", bright: "#c4b5fd" }, // violet dawn — the inner life
  sigma_interest: { deep: "#3b0a2e", mid: "#c2410c", bright: "#fbbf24" },     // fire sunrise — what pulls
  aptitude: { deep: "#083344", mid: "#0891b2", bright: "#67e8f9" },           // teal dawn — precision
}
const sunriseFor = (id: string) => SUNRISE[id] ?? SUNRISE.sigma_personality

// One contextual instruction per instrument — shown above every question so
// the taker always knows the honest frame to answer in (max 2 lines).
const CONTEXT: Record<string, { cat: string; line: string }> = {
  sigma_interest: { cat: "Interests", line: "Answer according to what naturally interests you — not what you think you're good at." },
  sigma_personality: { cat: "Personality", line: "Think about how you usually behave, even when the situation isn't ideal." },
  aptitude: { cat: "Aptitude", line: "Reason each one out at your own pace — if unsure, choose the most likely option and move on." },
}

// Rotating reassurance — one subtle note every ~7 questions, never a constant
// nag. Aptitude has objectively correct answers, so it NEVER gets the
// "no right or wrong answers" line (honesty over comfort).
const NOTES_LIKERT = [
  "There are no right or wrong answers.",
  "Your first instinct is usually the most accurate.",
  "Answer honestly rather than strategically.",
  "Every answer contributes equally to your profile.",
  "Your responses stay confidential.",
]
const NOTES_APTITUDE = [
  "Untimed — work at your own pace.",
  "If unsure, choose the most likely option and move on.",
  "Accuracy matters more than speed.",
]

type Stage = "brief" | "questions" | "reflect" | "review" | "complete"

// Module scope, NOT inside the component — an inline component type would make
// React unmount/remount the whole full-screen subtree on every answer.
function Frame({ children, aura, vars }: { children: React.ReactNode; aura?: string; vars?: React.CSSProperties }) {
  const pal = aura ? sunriseFor(aura) : null
  return (
    // `testroom` = IBM Plex Sans/Mono inside (matches the marketing fit test).
    // Surface comes from the guest CSS vars when a stage supplies them (the
    // battery, which has a light/dark toggle) and falls back to the room's dark
    // otherwise. The vars MUST live here, not on a child — they cascade down.
    <div
      className="testroom fixed inset-0 z-50 overflow-y-auto"
      style={{ ...vars, background: "var(--gbg, #08090b)", color: "var(--gfg, #ffffff)" }}
    >
      {pal && <SunriseField palette={[pal.deep, pal.mid, pal.bright]} className="fixed inset-0" />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// A sitting in progress survives refresh, accidental navigation, a closed tab
// and even a browser crash — the draft lives in localStorage (per client +
// instrument) until the result is turned in. Losing 72 honest answers to a
// stray swipe or a dead battery would be unforgivable on a one-take test.
interface Draft { i: number; answers: number[]; stage: Stage; refl?: Record<string, string | number>; times?: (number | null)[] }
const draftKey = (clientId: string, testId: string) => `smc.testdraft.${clientId}.${testId}`
function loadDraft(clientId: string, testId: string): Draft | null {
  try {
    const key = draftKey(clientId, testId)
    let raw = localStorage.getItem(key)
    if (!raw) {
      // drafts from before durability lived in sessionStorage — carry one forward
      raw = sessionStorage.getItem(key)
      if (raw) { localStorage.setItem(key, raw); sessionStorage.removeItem(key) }
    }
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    return Array.isArray(d.answers) ? d : null
  } catch { return null }
}

/* ── small kit ───────────────────────────────────────────────────────────── */

// The countdown number tweens down after every answer — humans read countdowns
// far better than "8/96".
function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const prevRef = useRef(value)
  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value || prefersReducedMotion()) { setShown(value); return }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 320)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="tabular-nums">{shown}</span>
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[11px] text-white/60">{children}</kbd>
}

// "Leave assessment?" — the only dialog in the room. Esc toggles it. Focus is
// trapped between its two buttons while open (aria-modal hides the background
// from AT, so focus must never wander there) and restored on close.
function ExitDialog({ open, onClose, onExit }: { open: boolean; onClose: () => void; onExit: () => void }) {
  const primaryRef = useRef<HTMLButtonElement>(null)
  const secondaryRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement | null
      primaryRef.current?.focus()
    } else if (restoreRef.current) {
      restoreRef.current.focus?.()
      restoreRef.current = null
    }
  }, [open])
  if (!open) return null
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return
    e.preventDefault()
    const next = document.activeElement === primaryRef.current ? secondaryRef.current : primaryRef.current
    next?.focus()
  }
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="exit-title"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={trapTab}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101114] p-7" onClick={(e) => e.stopPropagation()}>
        <h2 id="exit-title" className="text-[20px] font-semibold tracking-tight text-white">Leave assessment?</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
          Your answers are saved on this device — even if the tab closes, you'll continue from where you stopped.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            ref={primaryRef} onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Continue
          </button>
          <button
            ref={secondaryRef} onClick={onExit}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-medium text-white/80 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

// Best/Worst picker — pick MOST and LEAST like you (unscored, reflect stage).
// Stores the two picks as side keys and a readable composite under the item id
// (report-bridge reads the id value as the client's words).
function BestWorst({ it, refl, set }: {
  it: ReflectionItem
  refl: Record<string, string | number>
  set: (id: string, v: string | number) => void
}) {
  const most = String(refl[`${it.id}__most`] ?? "")
  const least = String(refl[`${it.id}__least`] ?? "")
  const pick = (slot: "most" | "least", label: string) => {
    const nextMost = slot === "most" ? label : most === label ? "" : most
    const nextLeast = slot === "least" ? label : least === label ? "" : least
    set(`${it.id}__most`, nextMost)
    set(`${it.id}__least`, nextLeast)
    set(it.id, nextMost && nextLeast ? `Most like me: ${nextMost} · Least like me: ${nextLeast}` : "")
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/12">
      <div className="flex items-center justify-end gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="w-14 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Most</span>
        <span className="w-14 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Least</span>
      </div>
      {(it.choices ?? []).map((c) => (
        <div key={c} className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0">
          <span className="flex-1 text-[14px] leading-snug text-white/85">{c}</span>
          {(["most", "least"] as const).map((slot) => {
            const on = (slot === "most" ? most : least) === c
            return (
              <button
                key={slot} onClick={() => pick(slot, c)} aria-pressed={on}
                aria-label={`${slot === "most" ? "Most" : "Least"} like me: ${c}`}
                className={cn(
                  "grid w-14 place-items-center py-1 transition-colors",
                  on ? "text-white" : "text-white/25 hover:text-white/60",
                )}
              >
                <span className={cn("grid size-5 place-items-center rounded-full border transition-colors", on ? "border-white bg-white" : "border-current")}>
                  {on && <Check className="size-3 stroke-[3] text-black" />}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// The completion sequence — a short, honest processing beat (every line names
// something that really ran: scoring happens inside saveTestResult, the result
// is stored to the profile, the report derives from it), then a straight
// handoff into the next instrument so the battery keeps its momentum.
function CompletionStage({ def, clientId, track, go }: { def: TestDef; clientId: string; track: "student" | "professional"; go: (path: string) => void }) {
  const LINES = ["Analysing response patterns…", "Scoring your responses…", "Saving to your profile…", "Preparing your report…"]
  const reduced = prefersReducedMotion()
  const [step, setStep] = useState(reduced ? LINES.length : 0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (reduced) { const t = window.setTimeout(() => setDone(true), 700); return () => window.clearTimeout(t) }
    const timers = LINES.map((_, k) => window.setTimeout(() => setStep(k + 1), 350 + k * 1450))
    timers.push(window.setTimeout(() => setDone(true), 350 + LINES.length * 1450 + 400))
    return () => timers.forEach((t) => window.clearTimeout(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const next = testsFor(track).find((t) => t.id !== def.id && isUnlocked(clientId, t.id) && !getTestResult(clientId, t.id))
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16">
      {!done ? (
        <div aria-live="polite">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Assessment complete</p>
          <div className="mt-8 flex flex-col gap-4">
            {/* lines MOUNT as they appear (a live region announces DOM changes,
                not opacity swaps) — .fade-line is the testroom keyframe */}
            {LINES.slice(0, step).map((l, k) => (
              <p key={l} className="fade-line flex items-center gap-3 text-[15px]">
                <span className={cn("grid size-5 place-items-center rounded-full border", k < step - 1 ? "border-white/30 text-white/70" : "border-white/20 text-white/40")}>
                  {k < step - 1 ? <Check className="size-3 stroke-[2.5]" /> : <span className="size-1.5 animate-pulse rounded-full bg-current" />}
                </span>
                <span className="text-white/75">{l}</span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <span className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><Check className="size-5" /></span>
          <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-white">
            {def.name.split("—")[0].trim()} complete
          </h1>
          {next ? (
            <>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Continue your profile with</p>
              <p className="mt-2 text-[20px] font-semibold text-white">{next.name.split("—")[0].trim()}</p>
              <p className="mt-1 text-[14px] text-white/55">Estimated time · {next.minutes} minutes</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => go(`/portal/assessments/${next.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-black transition hover:opacity-90"
                >
                  Start the next test <ArrowRight className="size-4" />
                </button>
                <button
                  onClick={() => go("/portal/assessments")}
                  className="rounded-full border border-white/15 px-5 py-3 text-[13.5px] font-medium text-white/85 transition hover:bg-white/10"
                >
                  Back to assessments
                </button>
              </div>
              <button onClick={() => go(`/portal/reports/test/${def.id}`)} className="mt-4 text-[13px] text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline">
                View this test's report
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-white/60">
                Your assessment battery is complete. Everything now feeds your report and your counsellor's read of it.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => go(`/portal/reports/test/${def.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-black transition hover:opacity-90"
                >
                  View your report <ArrowRight className="size-4" />
                </button>
                <button
                  onClick={() => go("/portal/assessments")}
                  className="rounded-full border border-white/15 px-5 py-3 text-[13.5px] font-medium text-white/85 transition hover:bg-white/10"
                >
                  Back to assessments
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// The splash briefing, per instrument — what it measures, the frame of mind to
// answer in, and what it does for the report and the career decision. Shown on
// the brief screen before every test; the taker proceeds or goes back from here.
// Deliberately short. A wall of text before a 30-minute test goes unread and
// delays the start; two lines — what it measures, how to answer — is what a
// taker actually needs. The full methodology lives in the report, not here.
const BRIEF_ABOUT: Record<string, { measures: string; method: string }> = {
  sigma_personality: {
    measures: "Six personality factors — how you take on goals, lead, learn, work with people and handle pressure.",
    method: "Answer as you usually are, not on your best or worst day. First instinct. No right answers.",
  },
  sigma_interest: {
    measures: "34 interest areas — what attracts you, and what you'd genuinely do again and again.",
    method: "Answer by what you'd enjoy — not what you're good at, what pays, or what others expect.",
  },
  aptitude_dbda: {
    measures: "Seven timed sections — verbal, numerical, spatial, reasoning, mechanical, clerical and closure ability.",
    method: "These have right answers and each section is timed. Keep moving — blanks score zero.",
  },
  aptitude_ccpa: {
    measures: "Twelve workplace competencies, each measured three different ways.",
    method: "Pick what you'd genuinely do, not what sounds impressive. There are no trick options.",
  },
}
const aboutFor = (def: TestDef) =>
  (def.kind === "dbda" ? BRIEF_ABOUT.aptitude_dbda
    : def.kind === "ccpa" ? BRIEF_ABOUT.aptitude_ccpa
    : BRIEF_ABOUT[def.id]) ?? BRIEF_ABOUT.sigma_personality

/* ── the third-test battery stage — the guest DBDA / CCPA runners embedded in
      the portal room. They keep their own crash-safe persistence (guest-store,
      localStorage) under a portal-namespaced token; on completion the final
      engines score the sitting and the result lands in the portal results
      store like any other instrument. ───────────────────────────────────────── */

// the guest runners style through CSS vars (`guestVars`, shared with the /t flow
// so the two rooms can never drift); the member's light/dark choice lives here
const ROOM_THEME_KEY = "smc.portal.testroom.theme"

/** The test room's light/dark choice. Persisted, so a reload mid-battery — or
 *  moving to the next timed section — keeps the light the member picked. */
function useRoomTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem(ROOM_THEME_KEY) !== "light" } catch { return true }
  })
  const toggle = () => setDark((d) => {
    const next = !d
    try { localStorage.setItem(ROOM_THEME_KEY, next ? "dark" : "light") } catch { /* private mode */ }
    return next
  })
  return { dark, toggle }
}

const batteryToken = (clientId: string) => `portal-${clientId}`

function BatteryStage({ def, account, onDone, dark, onToggleTheme }: {
  def: TestDef
  account: PortalAccount
  onDone: (scores: Record<string, number>, overall: number, payload: unknown) => void
  /** Theme is owned by the parent so the full-screen Frame can paint it too. */
  dark: boolean
  onToggleTheme: () => void
}) {
  const token = batteryToken(account.clientId)
  const isCcpa = def.kind === "ccpa"

  // seed the guest sitting from the PROFILE (the gate guarantees age/gender)
  useEffect(() => {
    const s = getGuest(token)
    if (!s.details) {
      const p = account.profile ?? {}
      updateGuest(token, {
        startedAt: new Date().toISOString(),
        details: {
          name: p.fullName ?? account.name,
          age: p.age ?? 16,
          gender: p.gender === "male" ? "male" : "female",
          track: isCcpa ? "executive" : "student",
          grade: p.stage ?? "",
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isCcpa])

  const gs = useGuest(token)
  const done = isCcpa ? !!gs.competencyDoneAt : !!gs.abilityDoneAt
  const firedRef = useRef(false)

  useEffect(() => {
    if (!done || firedRef.current) return
    firedRef.current = true
    const p = account.profile ?? {}
    if (isCcpa) {
      const c = gs.competency
      const r = scoreCcpa(
        (c?.sjt ?? []) as (MostLeast | null)[],
        (c?.fc ?? []) as (MostLeast | null)[],
        c?.lik ?? [],
      )
      const scores: Record<string, number> = {}
      r.comps.forEach((comp) => { scores[comp.code] = comp.composite ?? 0 })
      const vals = r.comps.map((x) => x.composite ?? 0)
      onDone(scores, Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)), { kind: "ccpa", comps: r.comps, flags: r.flags })
    } else {
      const age = p.age ?? 16
      const gender = p.gender === "male" ? "male" as const : "female" as const
      const scores: Record<string, number> = {}
      const sections = ABILITY_SECTIONS.map((s) => {
        const answers = gs.ability?.answers[s.key] ?? []
        const { raw, attempted } = rawScore(s, answers)
        const grade: Grade = standardScore(s.key as AbilityKey, raw, age, gender)
        scores[s.key] = GRADE_PERCENTILE[grade]
        return { key: s.key, label: s.label, raw, max: ABILITY_MAX[s.key as AbilityKey], attempted, grade, band: gradeBand(grade).label }
      })
      const vals = Object.values(scores)
      onDone(scores, Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)), { kind: "dbda", age, gender, sections })
    }
    // clear the guest sitting — the portal result is now the record
    try { localStorage.removeItem(`smc.guesttest.${token}`) } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  return (
    // The room's theme is REAL: the sun/moon button flips the CSS vars (painted
    // by the Frame above) and the glow context together.
    <GThemeProvider dark={dark}>
      <div className="flex min-h-svh flex-col">
        {isCcpa
          ? <CcpaRunner token={token} dark={dark} onToggle={onToggleTheme} />
          : <AbilityRunner token={token} dark={dark} onToggle={onToggleTheme} />}
      </div>
    </GThemeProvider>
  )
}

/* ── the ground rules, per instrument kind ───────────────────────────────── */
// Two points, never more. Everything else (norms, methodology, how it feeds the
// report) belongs in the report — not in front of someone about to start.
function briefPoints(def: TestDef): { t: string; d: string }[] {
  if (def.kind === "dbda") return [
    { t: "Every section is timed", d: "Two are speed tests most people don't finish — that's by design. Keep moving; blanks score zero." },
    { t: "One take only", d: "You can't retake this, so give it a clear run." },
  ]
  if (def.kind === "ccpa") return [
    { t: "Three parts, no trick options", d: "Scenarios, quick most/least picks, then self-ratings. Answer as you'd actually behave." },
    { t: "One take only", d: "You can't retake this, so give it a clear run." },
  ]
  const likert = def.kind === "likert"
  return [
    likert
      ? { t: "There are no right answers", d: "Answer as you are, not as you'd like to be seen. First instinct is usually truest." }
      : { t: "One option is correct", d: "Work it out; if unsure, take your best read and move on." },
    { t: "One take, but you can revise", d: "Step back to any question and review everything before you turn it in." },
  ]
}

export function TestRunner() {
  const { testId } = useParams()
  const nav = useNavigate()
  const account = usePortalAccount()
  // the THIRD test resolves by the member's track — students get the DBDA
  // ability battery, professionals get the CCPA — same id, automatic
  const track = accountTrack(account)
  const def = testId ? getTestFor(track, testId) : undefined
  const isBattery = def?.kind === "dbda" || def?.kind === "ccpa"
  // owned here so the full-screen Frame can paint the chosen theme
  const room = useRoomTheme()

  // resume a sitting in progress (refresh, accidental back) — one-take tests
  // must never silently eat answers
  const draft = account && def ? loadDraft(account.clientId, def.id) : null
  const [stage, setStage] = useState<Stage>(draft ? draft.stage : "brief")
  const [i, setI] = useState(draft?.i ?? 0)
  const [answers, setAnswers] = useState<number[]>(draft?.answers ?? [])
  const [refl, setRefl] = useState<Record<string, string | number>>(draft?.refl ?? {})
  // per-item first-exposure response times (interest instrument only — its
  // reliability read uses them; portal parity with the guest runner). Stored at
  // the ORIGINAL item index, survives a resumed sitting via the draft.
  const [times, setTimes] = useState<(number | null)[]>(draft?.times ?? [])
  const shownAtRef = useRef(0)
  const [fromReview, setFromReview] = useState(false)
  const [highlight, setHighlight] = useState<number | null>(null) // keyboard/wheel focus, not yet the answer
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const qRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const advanceRef = useRef<number>(0) // the pending auto-advance beat — always cancellable
  const saveTimerRef = useRef<number>(0)
  const interactedRef = useRef(false) // the save signal only speaks after a REAL user change
  const lastWheelRef = useRef(0)

  const total = def?.items.length ?? 0
  const answered = answers.filter((a) => a != null).length
  const existing = account && def ? getTestResult(account.clientId, def.id) : undefined

  // per-member RANDOMISED item order for the Likert instruments (both manuals
  // require it — blocked items telegraph the scale). Deterministic per client +
  // instrument so a resumed sitting shows the same order; answers are stored at
  // the ORIGINAL index, so the scoring engines never see the shuffle.
  const perm = useMemo(
    () => (def && def.kind === "likert" && account ? itemOrder(`${account.clientId}:${def.id}`, def.items.length) : null),
    [def, account],
  )
  const oi = (displayPos: number) => (perm ? (perm[displayPos] ?? displayPos) : displayPos)

  const idxToValue = (idx: number) => (def?.kind === "likert" ? idx + 1 : idx)
  const valueToIdx = (v: number | null | undefined): number | null =>
    v == null ? null : def?.kind === "likert" ? v - 1 : v

  // moving Begin→ from one instrument's completion screen into the next keeps
  // this component mounted with a new :testId — re-initialise the sitting
  useEffect(() => {
    if (!account || !def) return
    const d = loadDraft(account.clientId, def.id)
    setStage(d ? d.stage : "brief")
    setI(d?.i ?? 0)
    setAnswers(d?.answers ?? [])
    setRefl(d?.refl ?? {})
    setTimes(d?.times ?? [])
    setFromReview(false)
    setExitOpen(false)
    interactedRef.current = false
    setSaveState("idle")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.id])

  // the dialog belongs to the questions stage only — never let a stuck-open
  // flag greet the user when they step back in from reflect/review
  useEffect(() => { setExitOpen(false) }, [stage])

  // persist the sitting while it's live; cleared on submit. The save signal is
  // set HERE, from the actual sessionStorage write outcome — "Responses saved"
  // must never be a timer pretending to be a persistence signal.
  useEffect(() => {
    // battery kinds persist inside their own runner (guest-store) — no draft here
    if (!account || !def || existing || isBattery || stage === "brief" || stage === "complete") return
    let ok = true
    try {
      localStorage.setItem(draftKey(account.clientId, def.id), JSON.stringify({ i, answers, stage, refl, times } satisfies Draft))
    } catch { ok = false /* storage full/blocked — the sitting still works, it just won't survive an interruption */ }
    if (!interactedRef.current) return // mount/reset identity churn is not a save event
    setSaveState("saving")
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => setSaveState(ok ? "saved" : "failed"), 450)
    return () => window.clearTimeout(saveTimerRef.current)
  }, [i, answers, stage, refl, times, account, def, existing])

  useEffect(() => () => { window.clearTimeout(advanceRef.current); window.clearTimeout(saveTimerRef.current) }, [])

  // every question/stage change starts at the top of the room, with focus on
  // the prompt — keyboard users don't re-Tab from the page top 96 times, and
  // screen readers hear each new question announced (SPA route-focus pattern)
  useEffect(() => {
    document.querySelector(".testroom")?.scrollTo({ top: 0 })
    if (stage === "questions") {
      headRef.current?.focus({ preventScroll: true })
      shownAtRef.current = performance.now() // start this item's exposure clock
    }
  }, [i, stage])

  // animate each question in — 150ms fade + 20px upward slide, ease-out cubic
  useEffect(() => {
    if (!qRef.current || prefersReducedMotion()) return
    const t = gsap.fromTo(qRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.15, ease: "power3.out" })
    return () => { t.kill() }
  }, [i, stage])

  // animate stage changes
  useEffect(() => {
    if (!stageRef.current || prefersReducedMotion()) return
    const t = gsap.fromTo(stageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: EASE.soft })
    return () => { t.kill() }
  }, [stage])

  const options = useMemo(() => {
    if (!def) return []
    if (def.kind === "likert") return def.scale ?? []
    return (def.items[oi(i)] as AptitudeItem)?.options ?? []
  }, [def, i])

  // per-question reset: clarification closed, highlight lands on the existing
  // answer when stepping back through answered questions
  useEffect(() => {
    setClarifyOpen(false)
    setHighlight(valueToIdx(answers[oi(i)]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, def?.id])

  // select = record the answer (draft autosaves); it does NOT advance
  const select = (value: number) => {
    if (!def) return
    window.clearTimeout(advanceRef.current)
    interactedRef.current = true
    const next = [...answers]
    next[oi(i)] = value
    setAnswers(next)
    // interest reliability: keep the FIRST-exposure response time per item
    if (def.id === "sigma_interest" && shownAtRef.current && times[oi(i)] == null) {
      const t = [...times]
      t[oi(i)] = Math.round(performance.now() - shownAtRef.current)
      setTimes(t)
    }
    setHighlight(valueToIdx(value))
  }

  const advance = () => {
    if (!def) return
    window.clearTimeout(advanceRef.current)
    // reset the highlight SYNCHRONOUSLY (batched with setI in this same event):
    // the window keydown listener re-registers in a later passive flush, so a
    // rapid second Enter would otherwise see {new i, old highlight, no answer}
    // and silently record the previous question's highlight on this one
    setHighlight(null)
    if (fromReview) { setFromReview(false); setStage("review") }
    else if (i < total - 1) setI(i + 1)
    else setStage(def.reflections?.length ? "reflect" : "review")
  }

  // the mouse fast path: a click is deliberate, so it confirms — one short
  // beat to show the selection, then advance (keyboard selection waits for
  // Enter per the spec; forcing mouse users through Enter would double the
  // effort of a 96-item sitting)
  const clickChoose = (value: number) => {
    select(value)
    advanceRef.current = window.setTimeout(advance, 200)
  }

  const goBack = () => {
    window.clearTimeout(advanceRef.current)
    setHighlight(null) // same stale-closure guard as advance()
    if (fromReview) { setFromReview(false); setStage("review") }
    else if (i > 0) setI(i - 1)
    else setStage("brief")
  }

  // full keyboard operation: 1-N select · ↑↓ navigate · Enter confirm & next ·
  // ← previous · → next (once answered) · Esc exit dialog
  useEffect(() => {
    if (stage !== "questions" || !def) return
    const onKey = (e: KeyboardEvent) => {
      // browser shortcuts (Cmd/Ctrl+1..9 tab switch, Alt+← history) reach the
      // page before the browser acts — they must never touch answers
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (exitOpen) {
        if (e.key === "Escape") { e.preventDefault(); setExitOpen(false) }
        return
      }
      const target = e.target as HTMLElement | null
      const onFocusedControl = !!(target && target.closest && target.closest("button, a, input, textarea"))
      const k = Number(e.key)
      if (e.key.trim() !== "" && k >= 1 && k <= options.length) {
        select(idxToValue(k - 1))
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        setHighlight((h) => {
          const cur = h ?? valueToIdx(answers[oi(i)]) ?? (e.key === "ArrowDown" ? -1 : options.length)
          return e.key === "ArrowDown" ? Math.min(options.length - 1, cur + 1) : Math.max(0, cur - 1)
        })
      } else if (e.key === "Enter") {
        // a Tab-focused control (incl. an option row) must activate natively —
        // hijacking Enter here would break Exit/Back/Clarification for keyboard
        // users and answer with the arrow-highlight instead of the focused row
        if (onFocusedControl) return
        e.preventDefault()
        if (highlight != null && highlight !== valueToIdx(answers[oi(i)])) {
          select(idxToValue(highlight))
          advance()
        } else if (answers[oi(i)] != null) {
          advance()
        }
      } else if (e.key === "ArrowRight") {
        if (answers[oi(i)] != null) { e.preventDefault(); advance() }
      } else if (e.key === "ArrowLeft") {
        goBack() // clears pending auto-advance + honours fromReview
      } else if (e.key === "Escape") {
        e.preventDefault()
        window.clearTimeout(advanceRef.current) // a click's pending advance must not fire under the dialog
        setExitOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i, options.length, answers, fromReview, def?.id, highlight, exitOpen])

  // mouse wheel over the answer list walks the highlight (fine pointers only —
  // and a native non-passive listener, because React's synthetic onWheel can't
  // preventDefault). Enter confirms, per the spec.
  useEffect(() => {
    const el = optionsRef.current
    if (!el || stage !== "questions") return
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 6) return
      // if the room itself scrolls (short viewport), the wheel must keep
      // scrolling the page — only steal it when everything already fits
      const room = el.closest(".testroom")
      if (room && room.scrollHeight > room.clientHeight + 2) return
      e.preventDefault()
      const now = performance.now()
      if (now - lastWheelRef.current < 90) return
      lastWheelRef.current = now
      const dir = e.deltaY > 0 ? 1 : -1
      setHighlight((h) => {
        const cur = h ?? valueToIdx(answers[oi(i)]) ?? (dir > 0 ? -1 : options.length)
        return Math.max(0, Math.min(options.length - 1, cur + dir))
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i, options.length, def?.id])

  if (!account) return null

  /* ── guard screens (full-screen, quiet) ─────────────────────────────────── */
  if (!def) {
    return (
      <Frame>
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="text-[14px] text-white/55">That assessment doesn't exist.</p>
          <button onClick={() => nav("/portal/assessments")} className="mt-5 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black hover:opacity-90">Back to assessments</button>
        </div>
      </Frame>
    )
  }
  if (!isUnlocked(account.clientId, def.id)) {
    return (
      <Frame aura={def.id}>
        <div className="mx-auto max-w-md py-24 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10 text-white/70"><Lock className="size-5" /></span>
          <h1 className="mt-4 font-display text-[22px] font-semibold tracking-tight">This is a premium assessment</h1>
          <p className="mt-2 text-[14px] text-white/60">Unlock {def.name} from your assessments to take it.</p>
          <button onClick={() => nav("/portal/assessments")} className="mt-5 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black hover:opacity-90">Back to assessments</button>
        </div>
      </Frame>
    )
  }
  // profile gate — the norm tables (age/gender), the counsellor match and the
  // report all read the intake, so no instrument starts before it's complete
  if (!profileComplete(account)) {
    const pct = profileCompleteness(account)
    return (
      <Frame aura={def.id}>
        <div className="mx-auto max-w-md py-24 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10 text-white/70"><Lock className="size-5" /></span>
          <h1 className="mt-4 font-display text-[22px] font-semibold tracking-tight">Your profile comes first</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-[14px] leading-relaxed text-white/60">
            Your age and gender pick the score tables this test is compared against, and your answers
            brief your counsellor — four minutes on your profile, then every test unlocks.
          </p>
          <div className="mx-auto mt-5 flex max-w-[220px] items-center gap-3">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/60">{pct}%</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => nav("/portal/account#profile")} className="rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black hover:opacity-90">Complete your profile</button>
            <button onClick={() => nav("/portal/assessments")} className="rounded-full border border-white/15 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-white/10">Back</button>
          </div>
        </div>
      </Frame>
    )
  }

  /* ── COMPLETE — before the one-take guard: the result was just written ───── */
  if (stage === "complete") {
    // Begin → the next instrument keeps this component mounted with a new
    // :testId — reset the sitting SYNCHRONOUSLY so its first frame is the
    // brief, never a stale "complete" screen for a test not yet taken.
    // (key={def.id} also remounts CompletionStage so its done-state can't leak.)
    const goNext = (p: string) => {
      setStage("brief"); setI(0); setAnswers([]); setRefl({}); setFromReview(false)
      nav(p, { replace: true })
    }
    return (
      <Frame aura={def.id}>
        <CompletionStage key={def.id} def={def} clientId={account.clientId} track={track} go={goNext} />
      </Frame>
    )
  }

  // one take only — a finished instrument stays finished
  if (existing) {
    return (
      <Frame aura={def.id}>
        <div className="mx-auto max-w-md py-24 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><Check className="size-5" /></span>
          <h1 className="mt-4 font-display text-[22px] font-semibold tracking-tight">Already completed</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/60">
            You took {def.name} on {new Date(existing.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.
            Each instrument is taken once so your report stays true.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => nav(`/portal/reports/test/${def.id}`)} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black hover:opacity-90">View your report</button>
            <button onClick={() => nav("/portal/assessments")} className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/10">All assessments</button>
          </div>
        </div>
      </Frame>
    )
  }

  /* ── the third-test battery — the dedicated DBDA / CCPA runner owns every
        stage after the brief; it persists its own sitting and reports back
        scored, at which point the normal completion sequence takes over ────── */
  if (isBattery && stage !== "brief") {
    return (
      // vars on the Frame (they cascade DOWN to the runner); no `aura` here —
      // the guest runner paints its own GlowField, which follows the theme
      <Frame vars={guestVars(room.dark)}>
        <BatteryStage
          def={def}
          account={account}
          dark={room.dark}
          onToggleTheme={room.toggle}
          onDone={(scores, overall, payload) => {
            const already = getTestResult(account.clientId, def.id)
            if (!already) saveBatteryResult(account.clientId, def.id, def.kind as "dbda" | "ccpa", scores, overall, payload)
            setStage("complete")
          }}
        />
      </Frame>
    )
  }

  const finish = () => {
    // one-take, re-checked at the moment of writing — never overwrite a result
    // that appeared while this sitting was open (another tab, a synced device)
    const already = getTestResult(account.clientId, def.id)
    if (!already) saveTestResult(account.clientId, def.id, answers, refl, def.id === "sigma_interest" ? { interestTimes: times } : undefined)
    try {
      localStorage.removeItem(draftKey(account.clientId, def.id))
      sessionStorage.removeItem(draftKey(account.clientId, def.id))
    } catch { /* noop */ }
    // if a concurrent result won, playing an "analysing…" sequence for a write
    // that never happened would be a lie — go straight to the standing report
    if (already) nav(`/portal/reports/test/${def.id}`, { replace: true })
    else setStage("complete")
  }

  const left = total - answered

  /* ── BRIEF ──────────────────────────────────────────────────────────────── */
  if (stage === "brief") {
    return (
      <Frame aura={def.id}>
        <div
          ref={stageRef}
          className="mx-auto flex min-h-svh max-w-[1080px] flex-col justify-center gap-10 px-6 py-16 sm:px-10 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-14"
        >
          {/* the instrument — its name, what it measures, and what it does for
              the decision — over the dawn */}
          <div>
            <LogoLockup size={20} tone="light" />
            <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
              {def.kind === "likert" ? "Self-report instrument" : "Objective battery"} · {def.source}
            </p>
            <h1 className="mt-3 max-w-[14ch] font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-white">
              {def.name.split("—")[0].trim()}
            </h1>
            <p className="mt-4 max-w-[42ch] text-[14px] font-light leading-relaxed text-white/65">{def.tagline}</p>

            <div className="mt-8 flex max-w-[46ch] flex-col gap-5 border-t border-white/10 pt-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">What this measures</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{aboutFor(def).measures}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">How to answer</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{aboutFor(def).method}</p>
              </div>
            </div>
          </div>

          {/* the ground rules — a glass card that keeps its copy crisp over the glow */}
          <div className="w-full max-w-[470px] rounded-[24px] border border-white/10 bg-black/35 p-6 backdrop-blur-xl sm:p-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/55">Before you begin</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/70">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> ~{def.minutes} min</span>
              <span className="inline-flex items-center gap-1.5"><ListChecks className="size-3.5" /> {def.itemCount ?? total} questions</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> One take</span>
            </div>

            <ol className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6">
              {briefPoints(def).map((p, idx) => (
                <li key={p.t} className="flex gap-3.5">
                  <span className="font-mono text-[10px] tabular-nums leading-[1.9] text-white/45">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[13.5px] font-medium leading-snug text-white">{p.t}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/60">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={() => setStage("questions")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-black transition hover:opacity-90"
              >
                Begin <ArrowRight className="size-4" />
              </button>
              <button onClick={() => nav("/portal/assessments")} className="rounded-full px-4 py-3 text-[13px] text-white/55 hover:text-white">
                Back to assessments
              </button>
            </div>
            <p className="mt-5 text-[11.5px] leading-relaxed text-white/55">
              Answers save to your profile and your counsellor reads them with you. No AI assistant runs during the test.
            </p>
          </div>
        </div>
      </Frame>
    )
  }

  /* ── REFLECT — situational + subjective, qualitative (never scored) ──────── */
  if (stage === "reflect") {
    const items = def.reflections ?? []
    const set = (id: string, v: string | number) => { interactedRef.current = true; setRefl((r) => ({ ...r, [id]: v })) }
    const shared = items.filter((it) => { const v = refl[it.id]; return v != null && v !== "" }).length
    const followUpBlock = (it: ReflectionItem) => (
      <div className="mt-3">
        <label className="text-[12.5px] font-medium text-white">{it.followUp}</label>
        <textarea
          value={String(refl[`${it.id}__why`] ?? "")}
          onChange={(e) => set(`${it.id}__why`, e.target.value)}
          rows={2}
          className="mt-1.5 w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[14px] leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus-visible:ring-2 focus-visible:ring-white/25"
          placeholder="A sentence is plenty…"
        />
      </div>
    )
    return (
      <Frame aura={def.id}>
        <div ref={stageRef} className="flex min-h-svh flex-col px-6 pb-40 pt-14 sm:px-10 lg:px-16">
          <div className="w-full max-w-3xl">
            <button
              onClick={() => { setI(total - 1); setStage("questions") }}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Back to questions
            </button>

            <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/60">In your own words · optional</p>
            <h1 className="mt-2 font-editorial text-[30px] font-light leading-tight tracking-tight text-white sm:text-[36px]">
              A few things a scale can't measure.
            </h1>
            <p className="mt-2.5 max-w-[54ch] text-[13.5px] leading-relaxed text-white/60">
              These aren't scored — they're yours, in your own words, and they make your report and your counsellor's read of you far richer. Skip any that don't land.
            </p>

            <div className="mt-10 flex flex-col gap-10">
              {items.map((it, idx) => {
                const val = refl[it.id]
                return (
                  <div key={it.id} className={idx > 0 ? "border-t border-white/10 pt-9" : ""}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Reflection {String(idx + 1).padStart(2, "0")}</p>
                    {it.scenario && (
                      <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13.5px] leading-relaxed text-white/85">
                        {it.scenario}
                      </p>
                    )}
                    <h2 className="mt-3 font-display text-[20px] font-semibold leading-snug tracking-tight text-white sm:text-[22px]">{it.prompt}</h2>
                    {it.note && (
                      <p className="mt-2 text-[12px] italic leading-relaxed text-white/50">{it.note}</p>
                    )}

                    {it.kind === "scenario" ? (
                      <div className="mt-4 flex flex-col gap-2.5">
                        {(it.choices ?? []).map((c, ci) => {
                          const sel = val === ci
                          return (
                            <button
                              key={ci} onClick={() => set(it.id, ci)}
                              aria-pressed={sel}
                              className={cn(
                                "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition-colors",
                                sel ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.03] text-white hover:border-white/35",
                              )}
                            >
                              <span className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                                sel ? "border-black/25 bg-black/10 text-black" : "border-white/28 text-white/50",
                              )}>
                                {sel ? <Check className="size-3 stroke-[3]" /> : ci + 1}
                              </span>
                              <span className="flex-1">{c}</span>
                            </button>
                          )
                        })}
                        {it.followUp && val != null && <div className="pl-1">{followUpBlock(it)}</div>}
                      </div>
                    ) : it.kind === "pair" ? (
                      <>
                        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                          {(it.choices ?? []).map((c) => {
                            const sel = val === c
                            return (
                              <button
                                key={c} onClick={() => set(it.id, c)} aria-pressed={sel}
                                className={cn(
                                  "min-h-[64px] rounded-xl border px-4 py-4 text-left text-[14.5px] leading-snug transition-colors",
                                  sel ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.03] text-white hover:border-white/35",
                                )}
                              >
                                {c}
                              </button>
                            )
                          })}
                        </div>
                        {it.followUp && val != null && val !== "" && followUpBlock(it)}
                      </>
                    ) : it.kind === "bestworst" ? (
                      <>
                        <BestWorst it={it} refl={refl} set={set} />
                        {it.followUp && val != null && val !== "" && followUpBlock(it)}
                      </>
                    ) : (
                      <>
                        <textarea
                          value={String(val ?? "")}
                          onChange={(e) => set(it.id, e.target.value)}
                          rows={3}
                          className="mt-4 w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus-visible:ring-2 focus-visible:ring-white/25"
                          placeholder={it.placeholder ?? "In your own words…"}
                        />
                        {/* the deeper sub-question — revealed once they've written
                            something, so the probe lands on a real answer */}
                        {it.followUp && String(val ?? "").trim() !== "" && followUpBlock(it)}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-black/55 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:px-10">
              <p className="flex-1 text-[12px] leading-relaxed text-white/60">
                <span className="font-medium text-white">{shared} of {items.length} shared.</span>{" "}
                Every one adds colour to your report — but skip freely.
              </p>
              <button
                onClick={() => setStage("review")}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-black transition hover:opacity-90"
              >
                Continue to review <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Frame>
    )
  }

  /* ── REVIEW ─────────────────────────────────────────────────────────────── */
  if (stage === "review") {
    const answerLabel = (idx: number): string | null => {
      const v = answers[idx]
      if (v == null) return null
      if (def.kind === "likert") return def.scale?.[v - 1] ?? String(v)
      return (def.items[idx] as AptitudeItem).options[v] ?? String(v)
    }
    return (
      <Frame aura={def.id}>
        <div ref={stageRef} className="flex min-h-svh flex-col px-6 pb-44 pt-14 sm:px-10 lg:px-16">
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => { setFromReview(false); setStage("questions") }}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white"
              >
                <ArrowLeft className="size-3.5" /> Keep answering
              </button>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">Review · {answered}/{total} answered</span>
            </div>

            <h1 className="mt-6 font-editorial text-[30px] font-light leading-tight tracking-tight text-white sm:text-[36px]">
              Read it back before you turn it in.
            </h1>
            <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-white/60">
              Tap any answer to change it. {left > 0 ? `${left} question${left === 1 ? "" : "s"} still need${left === 1 ? "s" : ""} an answer.` : "Everything is answered."}
            </p>

            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {def.items.map((item, idx) => {
                const label = answerLabel(idx)
                const prompt = def.kind === "likert" ? (item as LikertItem).text : (item as AptitudeItem).q
                return (
                  <button
                    key={idx}
                    onClick={() => { setI(perm ? perm.indexOf(idx) : idx); setFromReview(true); setStage("questions") }}
                    className="group flex w-full items-baseline gap-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="w-7 shrink-0 font-mono text-[10.5px] tabular-nums text-white/40">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-white/60">{prompt}</span>
                      {label ? (
                        <span className="mt-1 block text-[13px] font-medium text-white">{label}</span>
                      ) : (
                        <span className="mt-1 block text-[12.5px] font-medium text-amber-400">Not answered — tap to answer</span>
                      )}
                    </span>
                    <PenLine className="size-3.5 shrink-0 self-center text-transparent transition-colors group-hover:text-white/40" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* the honesty check — the last thing read before the test is turned in */}
          <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-black/55 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:px-10">
              <p className="flex-1 text-[12px] leading-relaxed text-white/60">
                <span className="font-medium text-white">Did you answer as yourself?</span>{" "}
                Your report is only as true as your answers — and this instrument is taken once.
              </p>
              <button
                onClick={finish}
                disabled={answered < total}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-medium transition",
                  answered < total
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-white text-black hover:opacity-90",
                )}
              >
                {answered < total ? `${left} left to answer` : <>Turn it in <Check className="size-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </Frame>
    )
  }

  /* ── QUESTIONS ───────────────────────────────────────────────────────────── */
  const item = def.items[oi(i)]
  const prompt = def.kind === "likert" ? (item as LikertItem).text : (item as AptitudeItem).q
  const ctx = CONTEXT[def.id] ?? CONTEXT.sigma_personality
  // vocabulary clarifications only for self-report items — an aptitude
  // clarification could hint at the solution, so those use hand-written notes
  const clarify = item.note ?? (def.kind === "likert" ? clarifyFor(prompt) : undefined)
  const notes = def.kind === "likert" ? NOTES_LIKERT : NOTES_APTITUDE
  const reassure = i % 7 === 3 ? notes[Math.floor(i / 7) % notes.length] : null

  return (
    <Frame aura={def.id}>
      {/* the whole frame — header to footer — must fit a laptop viewport
          without scrolling, so the vertical rhythm runs slightly tighter than
          the 8pt ideal (footer clipping = spec violation worse than density) */}
      <div className="flex min-h-svh flex-col px-6 pb-6 pt-6 sm:px-10 lg:px-24">
        {/* header: Back on the left, the (truthful) autosave signal on the right */}
        <div className="flex items-center justify-between gap-6">
          <button
            onClick={goBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {/* aria-hidden: ~190 polite announcements over a 96-item sitting would
              drown a screen reader — SR users get one static sentence instead */}
          <span className="text-[12.5px] text-white/50">
            <span className="sr-only">Answers save automatically during this sitting.</span>
            <span aria-hidden>
              {saveState === "saving" ? "Saving…"
                : saveState === "saved" ? <><Check className="mr-1 inline size-3.5 text-white/70" />Responses saved</>
                : saveState === "failed" ? <span className="text-amber-300/90">Autosave unavailable — keep this tab open</span>
                : null}
            </span>
          </span>
        </div>

        <div ref={qRef} className="w-full">
          {/* countdown progress — remaining reads better than "8/96" */}
          <div className="mt-6">
            <p className="text-[17px] font-medium uppercase tracking-[0.12em] text-white sm:text-[18px]">
              Question {i + 1}
            </p>
            <p className="mt-1.5 text-[15px] text-white/50" aria-label={`${total - (i + 1)} questions remaining`}>
              <AnimatedNumber value={total - (i + 1)} /> question{total - (i + 1) === 1 ? "" : "s"} remaining
            </p>
          </div>

          {/* the frame of mind for THIS instrument — wide measure so it stays
              one line on desktop and the stack keeps its height budget */}
          <div className="mt-5 max-w-3xl border-t border-white/10 pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{ctx.cat}</p>
            {/* no ch-cap: 72ch computes NARROWER than the 3xl column and forced
                a second line — the column itself is the measure */}
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{ctx.line}</p>
          </div>

          {/* tabIndex -1: the per-question focus target — announces the new
              question to screen readers and puts Tab right above the options */}
          <h1
            ref={headRef}
            tabIndex={-1}
            className="mt-5 max-w-3xl text-[clamp(1.45rem,2.8vw,2.2rem)] font-semibold leading-[1.18] tracking-[-0.02em] text-white outline-none"
          >
            {prompt}
          </h1>

          {/* one-touch clarification — vocabulary and scope only, hidden until asked */}
          {clarify && (
            <div className="mt-4">
              <button
                onClick={() => setClarifyOpen((o) => !o)}
                aria-expanded={clarifyOpen}
                className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-white"
              >
                <Info className="size-3.5" /> Clarification
              </button>
              {clarifyOpen && <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/65">{clarify}</p>}
            </div>
          )}

          {/* key={i}: remount the rows on every question — reused DOM nodes otherwise
              carry the previous selection's white fill (and its transition ghost, and
              button :focus) onto the next question */}
          <div key={i} ref={optionsRef} className="mt-5 grid max-w-2xl gap-2.5" role="group" aria-label="Answer options">
            {options.map((opt, idx) => {
              const value = idxToValue(idx)
              const selected = answers[oi(i)] === value
              const lit = highlight === idx && !selected
              return (
                <button
                  key={opt}
                  onClick={() => clickChoose(value)}
                  aria-pressed={selected}
                  className={cn(
                    "group flex min-h-[52px] items-center justify-between gap-4 border px-5 py-2.5 text-left text-[15.5px] font-medium transition-colors duration-120 sm:text-[16.5px]",
                    selected
                      ? "border-white bg-white text-black"
                      : lit
                        ? "border-white/70 bg-white/[0.08] text-white"
                        : "border-white/25 bg-black/30 text-white/85 hover:border-white/70", // faint dark backing keeps labels readable over the glow
                  )}
                >
                  <span>{opt}</span>
                  <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", selected ? "text-black/60" : "text-white/30 group-hover:text-white/60")}>
                    {selected ? <Check className="size-4 stroke-[2.5]" /> : idx + 1}
                  </span>
                </button>
              )
            })}
          </div>

          {/* one rotating reassurance every ~7 questions — never a constant nag.
              Rendered only when it has content: an empty placeholder row cost
              37px of the one-frame height budget on every other question */}
          {(reassure || answered === total) && (
            <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2">
              {reassure && <p className="text-[13px] leading-relaxed text-white/45">{reassure}</p>}
              {answered === total && (
                <button
                  onClick={() => setStage("review")}
                  className="ml-auto text-[13.5px] font-medium text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Review all answers →
                </button>
              )}
            </div>
          )}
        </div>

        {/* footer — one muted line: previous · shortcut legend · exit */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-[13px]">
          <button
            onClick={goBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> Previous
          </button>
          <div className="hidden items-center gap-5 text-white/40 md:flex">
            <span className="flex items-center gap-1.5"><Kbd>1–{options.length}</Kbd> Select</span>
            <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> Navigate</span>
            <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> Confirm & next</span>
            <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> Exit</span>
          </div>
          <button
            onClick={() => { window.clearTimeout(advanceRef.current); setExitOpen(true) }}
            className="min-h-[44px] text-white/50 transition-colors hover:text-white"
          >
            Exit assessment
          </button>
        </div>
      </div>

      <ExitDialog open={exitOpen} onClose={() => setExitOpen(false)} onExit={() => nav("/portal/assessments")} />
    </Frame>
  )
}
