// /t/:token — the shareable, no-account assessment flow.
// One person per link: details form → Personality → Interest → Ability → report.
// Dark by default (black with per-test gradient glows, matching the product's test
// experience); a sun/moon toggle switches to light. Everything is stored locally
// against the token — nothing goes to a server in this credibility-testing phase.

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Sun, Moon, Clock, ListChecks, ShieldCheck, ArrowRight, Check, RotateCcw } from "lucide-react"
import { pfinItems, PFIN_SCALE } from "./personality-final"
import { ifinItems, IFIN_SCALE } from "./interest-final"
import { ABILITY_SECTIONS, ABILITY_TOTAL_MINUTES, sectionItemCount } from "./ability-bank"
import { SJTS, FC_BLOCKS, CCPA_LIK } from "./ccpa"
import { useGuest, updateGuest, resetGuest, guestStage, itemOrder, pendingClosure, type GuestDetails, type GuestState, type GuestTestId, type GuestTrack } from "./guest-store"
import { LikertRunner } from "./LikertRunner"
import { AbilityRunner } from "./AbilityRunner"
import { CcpaRunner } from "./CcpaRunner"
import { GuestReview } from "./GuestReview"
import { GuestReport } from "./GuestReport"

/** Single-test scoping for the TESTING links — /t/<token>?only=<test>. */
export type OnlyTest = "personality" | "interest" | "ability" | "competency"
const ONLY_TESTS: OnlyTest[] = ["personality", "interest", "ability", "competency"]

// ── theme ─────────────────────────────────────────────────────────────────────
export interface GTheme { dark: boolean }
const ThemeCtx = createContext<GTheme>({ dark: true })
export const useGTheme = () => useContext(ThemeCtx)

/** Lets a HOST app (the portal test room embeds these runners) drive the guest
 *  theme. Without it the runners fall back to the dark default and the glow
 *  ignores a light toggle. */
export function GThemeProvider({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return <ThemeCtx.Provider value={{ dark }}>{children}</ThemeCtx.Provider>
}

/** The guest palette as CSS vars — the single source for both themes, so the
 *  portal room and the /t guest flow can never drift apart. */
export const guestVars = (dark: boolean): React.CSSProperties =>
  (dark
    ? { "--gbg": "#08090b", "--gfg": "#f6f6f7", "--gmut": "#8a8a92", "--gline": "rgba(255,255,255,0.11)", "--gcard": "#121316", "--gopt": "rgba(0,0,0,0.30)", "--goptline": "rgba(255,255,255,0.22)" }
    : { "--gbg": "#faf9f7", "--gfg": "#141414", "--gmut": "#6d6c68", "--gline": "#e7e5e0", "--gcard": "#ffffff", "--gopt": "#ffffff", "--goptline": "#d6d4ce" }
  ) as React.CSSProperties

/** Per-test signature glow hues (kept off the middle of the screen). */
export const TEST_HUE: Record<GuestTestId, [string, string]> = {
  personality: ["#ff5005", "#dbba95"], // sunrise — matches the product's test art
  interest: ["#7c5cff", "#48a7ff"], // violet → blue
  ability: ["#00b3a4", "#7fd069"], // teal → green
}

/** Darken a hex hue toward black. Light mode wants the corner to read as a DEEP
 *  shade, not a washed-out bright glow — the value inverts (bright-on-dark →
 *  dark-on-light) while the hue is kept. */
function darkenHue(hex: string, factor = 0.42): string {
  const h = hex.replace("#", "")
  if (h.length < 6) return hex
  const ch = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * factor)))
  const to2 = (n: number) => ch(n).toString(16).padStart(2, "0")
  return `#${to2(0)}${to2(2)}${to2(4)}`
}

export function GlowField({ hues, strong = false }: { hues: [string, string]; strong?: boolean }) {
  const { dark } = useGTheme()
  // dark → the bright per-test glow; light → the same hue driven dark so it reads
  // as a rich shaded corner against the paper background
  const [a, b] = dark ? hues : [darkenHue(hues[0]), darkenHue(hues[1])]
  const opacity = dark ? (strong ? 0.95 : 0.75) : (strong ? 0.72 : 0.55)
  return (
    // the product's test-room signature: a diffuse glow rising from the bottom-right
    // corner — it never touches the middle of the screen
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-[52vh] overflow-hidden">
      <div
        className="absolute inset-0 gt-drift"
        style={{
          opacity,
          background: [
            `radial-gradient(75% 95% at 88% 122%, ${b}b3 0%, ${a}59 34%, ${a}1a 56%, transparent 72%)`,
            `radial-gradient(45% 60% at 99% 112%, ${b}cc 0%, transparent 60%)`,
            `radial-gradient(120% 55% at 45% 135%, ${a}33 0%, transparent 58%)`,
          ].join(","),
        }}
      />
    </div>
  )
}

/** Keyboard-hint chip — same treatment as the portal test room. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border px-1.5 py-0.5 font-mono text-[11px]"
      style={{ borderColor: "var(--gline)", color: "var(--gmut)" }}>
      {children}
    </kbd>
  )
}

// ── shared chrome ─────────────────────────────────────────────────────────────
function TopBar({ dark, onToggle, right }: { dark: boolean; onToggle: () => void; right?: React.ReactNode }) {
  return (
    <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
      <span className="font-display text-[17px] font-medium tracking-tight">Setmycareer</span>
      <div className="flex items-center gap-3">
        {right}
        <button
          onClick={onToggle}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="grid size-9 place-items-center rounded-full border transition-colors"
          style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}
        >
          {dark ? <Sun className="size-4 stroke-[1.75]" /> : <Moon className="size-4 stroke-[1.75]" />}
        </button>
      </div>
    </header>
  )
}

interface TestMeta { id: GuestTestId; name: string; items: number; minutes: number; blurb: string }
const META_PERSONALITY: TestMeta = { id: "personality", name: "Personality Assessment", items: pfinItems().length, minutes: 12, blurb: "How you usually work and learn — six factors, eighteen facets. There are no right answers; answer as you actually are." }
const META_INTEREST: TestMeta = { id: "interest", name: "Career Interest Assessment", items: ifinItems().length, minutes: 26, blurb: "What attracts you AND what you'd enjoy doing repeatedly — 34 career clusters, plus your preferred working conditions and ways of working." }
const META_ABILITY: TestMeta = { id: "ability", name: "Ability Test", items: ABILITY_SECTIONS.reduce((a, s) => a + sectionItemCount(s), 0), minutes: ABILITY_TOTAL_MINUTES, blurb: "Seven timed DBDA sections — closure, verbal, numerical, reasoning, spatial, mechanical and clerical." }
const META_COMPETENCY: TestMeta = { id: "ability", name: "Competency & Potential", items: SJTS.length + FC_BLOCKS.length + CCPA_LIK.length, minutes: 30, blurb: "How you handle real work demands — 16 scenarios, 24 most/least choices and 48 statements across twelve competencies." }
/** The battery for a track — the third test swaps by student vs executive. */
function testsFor(track: GuestTrack | undefined): TestMeta[] {
  return [META_PERSONALITY, META_INTEREST, track === "executive" ? META_COMPETENCY : META_ABILITY]
}
const metaForOnly = (only: OnlyTest): TestMeta =>
  only === "personality" ? META_PERSONALITY : only === "interest" ? META_INTEREST : only === "ability" ? META_ABILITY : META_COMPETENCY

// ── the flow ──────────────────────────────────────────────────────────────────
export default function GuestFlow() {
  const { token = "" } = useParams()
  const [search] = useSearchParams()
  const state = useGuest(token)
  const dark = state.theme !== "light"
  // TESTING links can scope the battery to a single instrument via ?only=…
  const onlyRaw = search.get("only")
  const only: OnlyTest | null = ONLY_TESTS.includes(onlyRaw as OnlyTest) ? (onlyRaw as OnlyTest) : null
  const fullStage = guestStage(state)
  // single-test flow: details → the one test → review → report
  const onlyDone = only == null ? false
    : only === "personality" ? !!state.personalityDoneAt
    : only === "interest" ? !!state.interestDoneAt
    : only === "ability" ? !!state.abilityDoneAt
    : !!state.competencyDoneAt
  const stage = only == null ? fullStage
    : !state.details ? (state.startedAt ? "details" : "welcome")
    : !onlyDone ? (only === "competency" ? "ability" : only)
    : !state.reviewedAt ? "review"
    : "report"

  // Links are REUSABLE — the same link goes to many people. Each device keeps its
  // own session, so a fresh system always starts at the welcome page. On a SHARED
  // device, this gate catches a page-load where a previous person's session exists
  // and offers "continue" or "start fresh for someone new" (once per tab).
  const gateKey = `smc.guestgate.${token}`
  const [gateAcked, setGateAcked] = useState(() => {
    try { return sessionStorage.getItem(gateKey) === "1" } catch { return true }
  })
  const showGate = !gateAcked && !!state.details
  const ackGate = () => {
    try { sessionStorage.setItem(gateKey, "1") } catch { /* ignore */ }
    setGateAcked(true)
  }
  const startFresh = () => {
    const finished = stage === "report"
    const ok = window.confirm(
      finished
        ? `Start a fresh test for a new person? ${state.details?.name ?? "The previous taker"}'s results exist only on this device — make sure their PDF was downloaded first.`
        : `Start a fresh test for a new person? ${state.details?.name ?? "The previous taker"}'s unfinished answers on this device will be erased.`,
    )
    if (!ok) return
    resetGuest(token)
    ackGate()
  }

  useEffect(() => {
    document.title = "SetMyCareer · Assessment"
  }, [])

  // theme variables — the whole flow reads these
  // palette tuned to the portal test room exactly (bg #08090b, near-white ink,
  // white/10 hairlines). --gopt/--goptline drive the answer boxes: a faint dark
  // backing + a brighter white/25 border, so a selected box (paper --gfg) reads
  // as the one lit element — identical to TestRunner's option stack.
  const vars = dark
    ? { "--gbg": "#08090b", "--gfg": "#f6f6f7", "--gmut": "#8a8a92", "--gline": "rgba(255,255,255,0.11)", "--gcard": "#121316", "--gopt": "rgba(0,0,0,0.30)", "--goptline": "rgba(255,255,255,0.22)" }
    : { "--gbg": "#faf9f7", "--gfg": "#141414", "--gmut": "#6d6c68", "--gline": "#e7e5e0", "--gcard": "#ffffff", "--gopt": "#ffffff", "--goptline": "#d6d4ce" }

  if (!token || token.length < 6) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#060607] px-6 text-center text-white">
        <div>
          <p className="font-display text-[22px]">This assessment link isn't valid.</p>
          <p className="mt-2 text-[13.5px] text-white/60">Check the link you were sent, or ask SetMyCareer for a fresh one.</p>
        </div>
      </div>
    )
  }

  const toggle = () => updateGuest(token, { theme: dark ? "light" : "dark" })

  return (
    <ThemeCtx.Provider value={{ dark }}>
      <div
        className="testroom relative flex min-h-svh flex-col antialiased"
        style={{ ...(vars as React.CSSProperties), background: "var(--gbg)", color: "var(--gfg)" }}
      >
        {showGate ? (
          <ResumeGate
            dark={dark} onToggle={toggle}
            name={state.details?.name ?? "the previous taker"}
            stage={stage}
            onContinue={ackGate}
            onFresh={startFresh}
          />
        ) : only == null && pendingClosure(state) ? (
          <ClosureCard token={token} dark={dark} onToggle={toggle} slot={pendingClosure(state)!} track={state.details?.track} celebrated={state.celebrated} />
        ) : (
          <>
            {stage === "welcome" && <Welcome token={token} dark={dark} onToggle={toggle} only={only} />}
            {stage === "details" && <Details token={token} dark={dark} onToggle={toggle} only={only} />}
            {stage === "personality" && <TestGate token={token} dark={dark} onToggle={toggle} test="personality" only={only} />}
            {stage === "interest" && <TestGate token={token} dark={dark} onToggle={toggle} test="interest" only={only} />}
            {stage === "ability" && <TestGate token={token} dark={dark} onToggle={toggle} test="ability" only={only} />}
            {stage === "review" && <GuestReview token={token} dark={dark} onToggle={toggle} only={only} />}
            {stage === "report" && <GuestReport token={token} dark={dark} onToggle={toggle} only={only} />}
          </>
        )}
        {/* TESTING affordance — restart this device's sitting from any screen */}
        <RestartChip token={token} name={state.details?.name} />
      </div>
    </ThemeCtx.Provider>
  )
}

/* ── testing-only restart — a quiet fixed chip, available on every screen ───── */
function RestartChip({ token, name }: { token: string; name?: string }) {
  const restart = () => {
    const ok = window.confirm(
      `Start this test over from the beginning?${name ? ` ${name}'s` : " All"} answers on this device will be erased.`,
    )
    if (!ok) return
    resetGuest(token)
    window.location.reload()
  }
  return (
    <button
      onClick={restart}
      title="Start over (testing)"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium opacity-60 transition hover:opacity-100"
      style={{ borderColor: "var(--gline)", background: "var(--gcard)", color: "var(--gmut)" }}
    >
      <RotateCcw className="size-3" /> Start over
    </button>
  )
}

// ── resume / switch-person gate (shared devices) ──────────────────────────────
function ResumeGate({ dark, onToggle, name, stage, onContinue, onFresh }: {
  dark: boolean
  onToggle: () => void
  name: string
  stage: string
  onContinue: () => void
  onFresh: () => void
}) {
  const where = stage === "report" ? "has a finished report on this device"
    : stage === "review" ? "has finished the tests and is reviewing answers on this device"
    : stage === "ability" ? "is partway through the third test"
    : stage === "interest" ? "is partway through the interest test"
    : stage === "personality" ? "is partway through the personality test"
    : "has a session on this device"
  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} />
      <GlowField hues={TEST_HUE.personality} strong />
      <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-[clamp(24px,6vw,110px)] pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--gmut)" }}>Shared link · this device</p>
        <h1 className="mt-3 max-w-[24ch] font-display text-[clamp(26px,4.2vw,38px)] font-semibold leading-[1.12] tracking-tight">
          {name} {where}.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: "var(--gmut)" }}>
          This link can be used by many people — each person's answers stay on the device they used.
          Continue as {name}, or start a fresh test for someone new on this device.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
            Continue as {name.split(" ")[0]} <ArrowRight className="size-4" />
          </button>
          <button onClick={onFresh}
            className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[14px] font-medium"
            style={{ borderColor: "var(--gline)", background: "var(--gcard)", color: "var(--gfg)" }}>
            Someone new — start fresh
          </button>
        </div>
        {stage === "report" && (
          <p className="mt-4 text-[12.5px]" style={{ color: "var(--gmut)" }}>
            Starting fresh erases {name.split(" ")[0]}'s local results — download their PDF first if you haven't.
          </p>
        )}
      </main>
    </>
  )
}

// ── per-test closure ("Great! You've completed …") ─────────────────────────────
function ClosureCard({ token, dark, onToggle, slot, track, celebrated }: {
  token: string
  dark: boolean
  onToggle: () => void
  slot: "personality" | "interest" | "third"
  track?: GuestTrack
  celebrated?: GuestState["celebrated"]
}) {
  const thirdName = track === "executive" ? "Competency" : "Ability"
  const copy = slot === "personality"
    ? { hue: TEST_HUE.personality, eyebrow: "Test 1 of 3 complete", title: "Personality test — done.", body: "Great work. Your responses are saved and your report is being prepared. Take a short break, or start the Interest test right away.", cta: "Start the Interest test" }
    : slot === "interest"
      ? { hue: TEST_HUE.interest, eyebrow: "Test 2 of 3 complete", title: "Interest test — done.", body: `Nicely done — two of three finished. Take a breather, or continue to the ${thirdName} test whenever you're ready.`, cta: `Start the ${thirdName} test` }
      : { hue: TEST_HUE.ability, eyebrow: "All three tests complete", title: `${thirdName} test — done.`, body: "That's the full battery — excellent work. Your report is being prepared. Next, review the answers you chose before we build it.", cta: "Review my answers" }
  const go = () => updateGuest(token, { celebrated: { ...(celebrated ?? {}), [slot]: true } })
  const mut = { color: "var(--gmut)" }
  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={mut}>Saved on this device</span>} />
      <GlowField hues={copy.hue} strong />
      <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-[clamp(24px,6vw,110px)] pb-24">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px]"
          style={{ borderColor: "var(--gline)", background: "var(--gcard)", color: "var(--gmut)" }}>
          <Check className="size-3.5" /> {copy.eyebrow}
        </span>
        <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(30px,5vw,46px)] font-semibold leading-[1.08] tracking-tight">{copy.title}</h1>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed" style={mut}>{copy.body}</p>
        <button onClick={go}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
          {copy.cta} <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── stage: welcome ────────────────────────────────────────────────────────────
function Welcome({ token, dark, onToggle, only }: { token: string; dark: boolean; onToggle: () => void; only: OnlyTest | null }) {
  const solo = only ? metaForOnly(only) : null
  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} />
      <GlowField hues={TEST_HUE.personality} strong />
      <main className="relative z-10 mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--gmut)" }}>
          SetMyCareer · Career assessment
        </p>
        <h1 className="mt-3 font-display text-[clamp(30px,5vw,44px)] font-light leading-[1.08] tracking-tight">
          {solo ? <>{solo.name}.</> : <>Three instruments.<br />One honest picture of you.</>}
        </h1>
        <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed" style={{ color: "var(--gmut)" }}>
          {solo
            ? <>You've been invited to take SetMyCareer's {solo.name} — {solo.blurb.charAt(0).toLowerCase() + solo.blurb.slice(1)} Plan for about {solo.minutes} minutes in one calm sitting.</>
            : <>You've been invited to take SetMyCareer's assessment battery — a personality profile, an
              interest inventory, and a third test matched to you. On the next screen you'll pick student or
              working professional; that choice sets the third test. Plan for roughly 60–130 minutes, and you
              can pause between tests — each test is one sitting.</>}
        </p>
        <ul className="mt-7 flex flex-col gap-3 text-[13.5px]" style={{ color: "var(--gmut)" }}>
          {solo ? (
            <li className="flex items-center gap-2.5"><ListChecks className="size-4 shrink-0" /> {solo.items} items · about {solo.minutes} minutes</li>
          ) : (
            <>
              <li className="flex items-center gap-2.5"><ListChecks className="size-4 shrink-0" /> Personality · Career Interest · a third test matched to you</li>
              <li className="flex items-center gap-2.5"><Clock className="size-4 shrink-0" /> Students take a timed ability battery ({ABILITY_TOTAL_MINUTES} min of quiet focus); working professionals take the Competency &amp; Potential assessment</li>
            </>
          )}
          <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 shrink-0" /> Nothing is uploaded — your results live on this device until you download your PDF report</li>
        </ul>
        <button
          onClick={() => updateGuest(token, { startedAt: new Date().toISOString() })}
          className="mt-9 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Begin <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── stage: details ────────────────────────────────────────────────────────────
function Details({ token, dark, onToggle, only }: { token: string; dark: boolean; onToggle: () => void; only: OnlyTest | null }) {
  const [f, setF] = useState({ name: "", age: "", gender: "" as "" | "male" | "female", track: "" as "" | GuestTrack, grade: "", email: "", phone: "", city: "" })
  const [err, setErr] = useState<string | null>(null)
  const ageN = Number(f.age)
  // single-test links imply the track (competency → professional; else student),
  // so the selector is hidden and the value is forced at submit
  const impliedTrack: GuestTrack | null = only == null ? null : only === "competency" ? "executive" : "student"
  const effTrack = impliedTrack ?? f.track
  const isExec = effTrack === "executive"
  const valid = f.name.trim().length >= 2 && ageN >= 12 && ageN <= 70 && (f.gender === "male" || f.gender === "female") && (effTrack === "student" || effTrack === "executive") && f.grade.trim().length >= 1

  const submit = () => {
    if (!valid) {
      setErr(
        !(f.name.trim().length >= 2) ? "Please enter your full name."
        : !(ageN >= 12 && ageN <= 70) ? "Age must be between 12 and 70."
        : !f.gender ? "Select the option used for your score norms."
        : !effTrack ? "Choose whether you're taking this as a student or a working professional."
        : isExec ? "Please enter your role or organisation."
        : "Please enter your class or qualification.")
      return
    }
    const details: GuestDetails = {
      name: f.name.trim(), age: ageN, gender: f.gender as "male" | "female", track: effTrack as GuestTrack, grade: f.grade.trim(),
      ...(f.email.trim() ? { email: f.email.trim() } : {}),
      ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
      ...(f.city.trim() ? { city: f.city.trim() } : {}),
    }
    updateGuest(token, { details })
  }

  const input = "w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-current"
  const inputStyle = { borderColor: "var(--gline)", background: "var(--gcard)" }
  const label = "text-[11.5px] font-medium uppercase tracking-[0.1em]"

  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} />
      <GlowField hues={TEST_HUE.interest} />
      <main className="relative z-10 mx-auto w-full max-w-[560px] flex-1 px-6 pb-28 pt-6">
        <h1 className="font-display text-[clamp(24px,4vw,32px)] font-light tracking-tight">First, a few details.</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--gmut)" }}>
          Your name goes on the report. Age and the norms option decide which score table your
          results use, and the student / professional choice decides your third test — they change
          your scores, so please be exact.
        </p>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {impliedTrack == null && (
            <div className="sm:col-span-2">
              <p className={label} style={{ color: "var(--gmut)" }}>I'm taking this as a *</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {([["student", "Student", "Third test: timed ability battery"], ["executive", "Working professional", "Third test: Competency & Potential"]] as const).map(([t, title, sub]) => (
                  <button key={t} onClick={() => setF({ ...f, track: t })}
                    className="rounded-xl border px-3.5 py-3 text-left transition-colors"
                    style={{ borderColor: f.track === t ? "var(--gfg)" : "var(--gline)", background: f.track === t ? "var(--gfg)" : "var(--gcard)", color: f.track === t ? "var(--gbg)" : "var(--gfg)" }}>
                    <span className="block text-[13.5px] font-medium">{title}</span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: f.track === t ? "var(--gbg)" : "var(--gmut)", opacity: f.track === t ? 0.72 : 1 }}>{sub}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "var(--gmut)" }}>Personality and interest are the same for everyone; only the third test differs.</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className={label} style={{ color: "var(--gmut)" }}>Full name *</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" autoFocus />
          </div>
          <div>
            <p className={label} style={{ color: "var(--gmut)" }}>Age *</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="16" />
          </div>
          <div>
            <p className={label} style={{ color: "var(--gmut)" }}>Score norms *</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button key={g} onClick={() => setF({ ...f, gender: g })}
                  className="rounded-xl border px-3 py-2.5 text-[13.5px] capitalize transition-colors"
                  style={{ borderColor: f.gender === g ? "var(--gfg)" : "var(--gline)", background: f.gender === g ? "var(--gfg)" : "var(--gcard)", color: f.gender === g ? "var(--gbg)" : "var(--gfg)" }}>
                  {g}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px]" style={{ color: "var(--gmut)" }}>The ability norm tables are published for male / female groups.</p>
          </div>
          <div className="sm:col-span-2">
            <p className={label} style={{ color: "var(--gmut)" }}>{isExec ? "Role / organisation *" : "Class / qualification *"}</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}
              placeholder={isExec ? "e.g. Product Manager · Infosys" : "e.g. Class 11 · Science, or B.Com 2nd year"} />
          </div>
          <div>
            <p className={label} style={{ color: "var(--gmut)" }}>Email (optional)</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div>
            <p className={label} style={{ color: "var(--gmut)" }}>Phone (optional)</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98xxxxxxx" />
          </div>
          <div className="sm:col-span-2">
            <p className={label} style={{ color: "var(--gmut)" }}>City (optional)</p>
            <input className={`${input} mt-1.5`} style={inputStyle} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Bengaluru" />
          </div>
        </div>
        {err && <p className="mt-4 text-[13px] text-red-400">{err}</p>}
        <button
          onClick={submit}
          className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02] disabled:opacity-40"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Continue to the tests <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── stage: per-test info page → runner ───────────────────────────────────────
function TestGate({ token, dark, onToggle, test, only }: { token: string; dark: boolean; onToggle: () => void; test: GuestTestId; only: OnlyTest | null }) {
  const [started, setStarted] = useState(false)
  const state = useGuest(token)
  const track = state.details?.track
  const isCompetencyThird = test === "ability" && track === "executive"
  const metas = testsFor(track)
  const meta = isCompetencyThird ? META_COMPETENCY : metas.find((t) => t.id === test)!
  const idx = metas.findIndex((t) => t.id === test)
  const posLabel = only ? "Your test" : `Test ${idx + 1} of 3`
  // resume mid-test without re-showing the info page
  const hasProgress = test === "personality" ? !!state.personality?.some((a) => a != null)
    : test === "interest" ? !!state.interest?.some((a) => a != null)
    : isCompetencyThird ? !!state.competency && (state.competency.sjt.some((a) => a != null) || state.competency.fc.some((a) => a != null) || state.competency.lik.some((a) => a != null))
    : !!state.ability && (state.ability.done.length > 0 || Object.keys(state.ability.answers).length > 0)
  const showInfo = !started && !hasProgress

  const know: string[] = useMemo(() => {
    if (test === "personality") return [
      "There are no right or wrong answers — describe yourself as you usually behave, not as you wish to appear.",
      "72 statements across six factors: achievement, leadership, people, team, learning and system orientation.",
      "Answer with the keys 1–5 or by clicking. You can go back and change an answer.",
    ]
    if (test === "interest") return [
      "Answer by genuine preference — not marks, salary, prestige or what others approve of.",
      "Do not answer on the basis of whether you're already skilled at the activity.",
      "If a statement is unfamiliar, choose the response that best reflects your likely preference.",
      "'Unsure / moderately true' is a valid answer — use the full scale.",
    ]
    if (isCompetencyThird) return [
      "Three parts: 16 work scenarios (pick MOST + LEAST likely), 24 quick most/least choices, and 48 statements to rate.",
      "There are no trick options — choose what you would genuinely do, not what sounds impressive.",
      "Scores describe behavioural tendencies, not technical skill or intelligence.",
    ]
    return [
      "Seven sections, each with its own clock. Once a section's time is up it closes — unanswered items simply score zero, so keep moving.",
      "No calculators, no help. Rough paper is fine for the numerical section.",
      "Two sections are speed tests (Spatial and Clerical) — most people do NOT finish them. That is by design.",
      "Answer with the number keys, or R/S and S/D in the speed sections.",
    ]
  }, [test, isCompetencyThird])

  if (!showInfo) {
    if (isCompetencyThird) return <CcpaRunner token={token} dark={dark} onToggle={onToggle} />
    if (test === "ability") return <AbilityRunner token={token} dark={dark} onToggle={onToggle} />
    return <GuestLikert token={token} test={test} dark={dark} onToggle={onToggle} />
  }

  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={{ color: "var(--gmut)" }}>{posLabel}</span>} />
      <GlowField hues={TEST_HUE[test]} strong />
      <main className="relative z-10 mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--gmut)" }}>
          {posLabel} · {meta.items} items · about {meta.minutes} min
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4.6vw,40px)] font-light leading-[1.1] tracking-tight">{meta.name}</h1>
        <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed" style={{ color: "var(--gmut)" }}>{meta.blurb}</p>
        <div className="mt-7 rounded-2xl border p-5" style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--gmut)" }}>Before you start</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {know.map((k, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: "var(--gmut)" }} />
                {k}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Start {meta.name.toLowerCase()} <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

/** Personality + Interest — the untimed Likert instruments (the competency test
 *  has its own three-part runner). Item order is RANDOMISED per taker (seeded by
 *  token+test) so adjacent items never reveal the scale — per both manuals'
 *  administration rules. Answers are un-permuted back to original order before
 *  saving, so the scoring engines are untouched. */
function GuestLikert({ token, test, dark, onToggle }: { token: string; test: "personality" | "interest"; dark: boolean; onToggle: () => void }) {
  const state = useGuest(token)

  let title: string, hues: [string, string], scale: string[]
  let items: { text: string; chapter?: string; context?: string }[]
  let key: "personality" | "interest", doneKey: "personalityDoneAt" | "interestDoneAt"

  if (test === "personality") {
    items = pfinItems().map((it) => ({ text: it.text, context: "Select the answer that is most true for you in general — as you usually behave, not as you wish to appear." }))
    title = "Personality"; hues = TEST_HUE.personality; scale = PFIN_SCALE; key = "personality"; doneKey = "personalityDoneAt"
  } else {
    items = ifinItems().map((it) => ({ text: it.text, context: "Choose what you genuinely like or would willingly do — not what you're already skilled at." }))
    title = "Career Interest"; hues = TEST_HUE.interest; scale = IFIN_SCALE; key = "interest"; doneKey = "interestDoneAt"
  }

  const n = items.length
  const perm = itemOrder(`${token}:${test}`, n) // perm[displayPos] = originalIndex
  const stored = ((state[key] as (number | null)[] | undefined) ?? Array(n).fill(null))
  const displayItems = perm.map((oi) => items[oi])
  const displayAnswers = perm.map((oi) => stored[oi] ?? null)
  const toOriginal = (disp: (number | null)[]): (number | null)[] => {
    const out: (number | null)[] = Array(n).fill(null)
    perm.forEach((oi, dp) => { out[oi] = disp[dp] ?? null })
    return out
  }

  return (
    <LikertRunner
      key={test}
      dark={dark} onToggle={onToggle}
      title={title}
      hues={hues}
      items={displayItems}
      scale={scale}
      answers={displayAnswers}
      chaptered={false}
      onSave={(answers) => updateGuest(token, { [key]: toOriginal(answers) } as Partial<GuestState>)}
      onDone={(answers) => updateGuest(token, { [key]: toOriginal(answers), [doneKey]: new Date().toISOString() } as Partial<GuestState>)}
    />
  )
}

export { TopBar }
