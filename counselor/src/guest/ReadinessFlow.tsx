// /r/:token — the two custom READINESS links (no account, local-only).
//   ?track=student   → Child Career Readiness Index (CCRI), answered by a
//                      parent about one child aged 10–18.
//   ?track=executive → Career Decision Readiness Assessment (CDRA) followed by
//                      the Circumstantial Readiness Index (ECCRI) — one
//                      combined report.
// A stored doc's track wins over the query so a link keeps working when
// re-opened. Visual system and question UI are borrowed from the guest flow
// (/t): TopBar, glow field, LikertRunner. The report is print-first —
// "Download PDF" is window.print() with a dedicated print stylesheet.

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { ArrowRight, Check, Clock, Download, ListChecks, RotateCcw, ShieldCheck, Users } from "lucide-react"
import { GlowField, GThemeProvider, TopBar, guestVars } from "./GuestFlow"
import { LikertRunner } from "./LikertRunner"
import {
  READINESS_SCALE, CCRI_SCALE, READINESS_CLOSING,
  CCRI, scoreCcri, type CcriResult,
  CDRA, scoreCdra, type CdraResult,
  ECCRI, scoreEccri, eccriQuadrant, type EccriResult,
  type ReadinessTrack, type RItem, type RFactor,
} from "./readiness"
import {
  useReadiness, updateReadiness, patchReadinessAnswers, resetReadiness, readinessStage,
  type ReadinessDetails, type ReadinessState,
} from "./readiness-store"

// per-stage glow hues (same family as the guest flow's test hues)
const HUE_CCRI: [string, string] = ["#ff5005", "#dbba95"] // sunrise
const HUE_CDRA: [string, string] = ["#7c5cff", "#48a7ff"] // violet → blue
const HUE_ECCRI: [string, string] = ["#00b3a4", "#7fd069"] // teal → green

const MUT: React.CSSProperties = { color: "var(--gmut)" }
const LINE: React.CSSProperties = { borderColor: "var(--gline)" }
const CARD: React.CSSProperties = { borderColor: "var(--gline)", background: "var(--gcard)" }

/** ~6 statements a minute is a comfortable Likert pace. */
const minutesFor = (n: number) => Math.max(5, Math.round(n / 6))

/** Map an instrument's items to the LikertRunner shape, chaptered by factor. */
function runnerItems(items: RItem[], groups: RFactor[], context: string) {
  const names = new Map(groups.map((g) => [g.key, g.name]))
  return items.map((it) => ({ text: it.text, chapter: names.get(it.factor) ?? it.factor, context }))
}

function fitAnswers(stored: (number | null)[] | undefined, n: number): (number | null)[] {
  return Array.from({ length: n }, (_, i) => stored?.[i] ?? null)
}

// ── the flow ──────────────────────────────────────────────────────────────────
export default function ReadinessFlow() {
  const { token = "" } = useParams()
  const [search] = useSearchParams()
  const state = useReadiness(token)
  const dark = state.theme !== "light"

  const rawTrack = search.get("track")
  const paramTrack: ReadinessTrack | null = rawTrack === "student" || rawTrack === "executive" ? rawTrack : null
  // persist the link's track on first visit; a stored doc's track always wins
  useEffect(() => {
    if (token && !state.track && paramTrack) updateReadiness(token, { track: paramTrack })
  }, [token, state.track, paramTrack])
  const track: ReadinessTrack | null = state.track ?? paramTrack

  useEffect(() => { document.title = "SetMyCareer · Readiness check" }, [])

  if (!token || token.length < 6) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#060607] px-6 text-center text-white">
        <div>
          <p className="font-display text-[22px]">This readiness link isn't valid.</p>
          <p className="mt-2 text-[13.5px] text-white/60">Check the link you were sent, or ask SetMyCareer for a fresh one.</p>
        </div>
      </div>
    )
  }

  const toggle = () => updateReadiness(token, { theme: dark ? "light" : "dark" })
  const stage = readinessStage(state, track ?? "student")

  return (
    <GThemeProvider dark={dark}>
      <div
        className="testroom relative flex min-h-svh flex-col antialiased"
        style={{ ...guestVars(dark), background: "var(--gbg)", color: "var(--gfg)" }}
      >
        {stage === "welcome" && <Welcome token={token} dark={dark} onToggle={toggle} track={track} />}
        {stage === "details" && <Details token={token} dark={dark} onToggle={toggle} track={track ?? "student"} />}
        {stage === "ccri" && <CcriStage token={token} state={state} dark={dark} onToggle={toggle} />}
        {stage === "cdra" && <CdraStage token={token} state={state} dark={dark} onToggle={toggle} />}
        {stage === "handoff" && <Handoff token={token} dark={dark} onToggle={toggle} />}
        {stage === "eccri" && <EccriStage token={token} state={state} dark={dark} onToggle={toggle} />}
        {stage === "report" && (track === "executive"
          ? <ExecReport token={token} state={state} dark={dark} onToggle={toggle} />
          : <StudentReport token={token} state={state} dark={dark} onToggle={toggle} />)}
        <RestartChip token={token} state={state} />
      </div>
    </GThemeProvider>
  )
}

/* ── testing-only restart — quiet fixed chip on every screen ─────────────────── */
function RestartChip({ token, state }: { token: string; state: ReadinessState }) {
  const who = state.details?.parentName ?? state.details?.name
  const restart = () => {
    const ok = window.confirm(
      `Start this readiness check over from the beginning?${who ? ` ${who}'s` : " All"} answers on this device will be erased.`,
    )
    if (!ok) return
    resetReadiness(token)
    window.location.reload()
  }
  return (
    <button
      onClick={restart}
      title="Start over (testing)"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium opacity-60 transition hover:opacity-100"
      style={{ ...CARD, color: "var(--gmut)" }}
    >
      <RotateCcw className="size-3" /> Start over
    </button>
  )
}

// ── stage: welcome ────────────────────────────────────────────────────────────
function Welcome({ token, dark, onToggle, track }: { token: string; dark: boolean; onToggle: () => void; track: ReadinessTrack | null }) {
  // when the link carries no ?track= and nothing is stored, let the taker pick
  const [pick, setPick] = useState<ReadinessTrack | null>(null)
  const eff = track ?? pick
  const isExec = eff === "executive"

  const ccriMin = minutesFor(CCRI.items.length)
  const execItems = CDRA.items.length + ECCRI.items.length
  const execMin = minutesFor(CDRA.items.length) + minutesFor(ECCRI.items.length)

  const begin = () => {
    if (!eff) return
    updateReadiness(token, { track: eff, startedAt: new Date().toISOString() })
  }

  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} />
      <GlowField hues={isExec ? HUE_CDRA : HUE_CCRI} strong />
      <main className="relative z-10 mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={MUT}>
          SetMyCareer · Readiness check
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4.8vw,42px)] font-light leading-[1.1] tracking-tight">
          {eff == null ? <>Two readiness checks.<br />Which one is yours?</>
            : isExec ? <>Career Decision &amp; Circumstantial Readiness.</>
            : <>{CCRI.title}.</>}
        </h1>
        {eff != null && (
          <p className="mt-3 max-w-[54ch] text-[15px] italic leading-relaxed" style={MUT}>
            {isExec ? "How ready are you — and how ready is your life — for your next career move?" : CCRI.tagline}
          </p>
        )}
        <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed" style={MUT}>
          {eff == null ? (
            <>One link, two instruments. Parents answer the {CCRI.title} about their child; working
              professionals take the combined decision-and-circumstances readiness check. Pick the one
              that matches you to continue.</>
          ) : isExec ? (
            <>Two short instruments in one sitting. Part 1 — {CDRA.title}: how ready you are to make
              evidence-based career decisions. Part 2 — {ECCRI.title}: whether your current life
              circumstances support the career you want. You get one combined report at the end.</>
          ) : (
            <>This index is answered by a parent, about one child aged 10–18. You will rate {CCRI.items.length} statements
              about how well your family understands your child, how education decisions get made, and how
              prepared you are for what work will look like. There are no right answers — answer from what
              you actually observe, not what you hope.</>
          )}
        </p>

        {eff == null && (
          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([["student", "I'm a parent", `About my child · ${CCRI.items.length} statements · ~${ccriMin} min`],
               ["executive", "I'm a working professional", `About my career · ${execItems} statements · ~${execMin} min`]] as const).map(([t, title, sub]) => (
              <button key={t} onClick={() => setPick(t)}
                className="rounded-xl border px-4 py-3.5 text-left transition-colors"
                style={CARD}>
                <span className="block text-[14px] font-medium">{title}</span>
                <span className="mt-0.5 block text-[11.5px]" style={MUT}>{sub}</span>
              </button>
            ))}
          </div>
        )}

        {eff != null && (
          <ul className="mt-7 flex flex-col gap-3 text-[13.5px]" style={MUT}>
            {isExec ? (
              <>
                <li className="flex items-center gap-2.5"><ListChecks className="size-4 shrink-0" /> {CDRA.items.length} + {ECCRI.items.length} statements, rated on a five-point scale</li>
                <li className="flex items-center gap-2.5"><Clock className="size-4 shrink-0" /> About {execMin} minutes — you can pause between the two parts</li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2.5"><Users className="size-4 shrink-0" /> Answered by a parent, about the child — one parent per child</li>
                <li className="flex items-center gap-2.5"><ListChecks className="size-4 shrink-0" /> {CCRI.items.length} statements · about {ccriMin} minutes, in one calm sitting</li>
              </>
            )}
            <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 shrink-0" /> Nothing is uploaded — your answers and report stay on this device</li>
          </ul>
        )}

        <button
          onClick={begin}
          disabled={eff == null}
          className="mt-9 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02] disabled:opacity-40"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Begin <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── stage: details ────────────────────────────────────────────────────────────
function Details({ token, dark, onToggle, track }: { token: string; dark: boolean; onToggle: () => void; track: ReadinessTrack }) {
  const isExec = track === "executive"
  const [f, setF] = useState({ parentName: "", childName: "", childAge: "", grade: "", name: "", age: "", role: "", city: "", email: "", phone: "" })
  const [err, setErr] = useState<string | null>(null)

  const childAgeN = Number(f.childAge)
  const ageN = Number(f.age)
  const valid = isExec
    ? f.name.trim().length >= 2 && ageN >= 21 && ageN <= 70 && f.role.trim().length >= 2 && f.city.trim().length >= 2
    : f.parentName.trim().length >= 2 && f.childName.trim().length >= 2 && childAgeN >= 10 && childAgeN <= 18 && f.grade.trim().length >= 1 && f.city.trim().length >= 2

  const submit = () => {
    if (!valid) {
      setErr(isExec
        ? (!(f.name.trim().length >= 2) ? "Please enter your full name."
          : !(ageN >= 21 && ageN <= 70) ? "Age must be between 21 and 70."
          : !(f.role.trim().length >= 2) ? "Please enter your role level."
          : "Please enter your city.")
        : (!(f.parentName.trim().length >= 2) ? "Please enter your name."
          : !(f.childName.trim().length >= 2) ? "Please enter your child's name."
          : !(childAgeN >= 10 && childAgeN <= 18) ? "This index is designed for children aged 10–18."
          : !(f.grade.trim().length >= 1) ? "Please enter your child's class."
          : "Please enter your city."))
      return
    }
    const details: ReadinessDetails = isExec
      ? { name: f.name.trim(), age: ageN, role: f.role.trim(), city: f.city.trim() }
      : { parentName: f.parentName.trim(), childName: f.childName.trim(), childAge: childAgeN, grade: f.grade.trim(), city: f.city.trim() }
    if (f.email.trim()) details.email = f.email.trim()
    if (f.phone.trim()) details.phone = f.phone.trim()
    updateReadiness(token, { details })
  }

  const input = "w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-current"
  const label = "text-[11.5px] font-medium uppercase tracking-[0.1em]"

  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} />
      <GlowField hues={isExec ? HUE_CDRA : HUE_CCRI} />
      <main className="relative z-10 mx-auto w-full max-w-[560px] flex-1 px-6 pb-28 pt-6">
        <h1 className="font-display text-[clamp(24px,4vw,32px)] font-light tracking-tight">First, a few details.</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={MUT}>
          {isExec
            ? "These go on the cover of your report — nothing more. Email and phone are optional."
            : "These go on the cover of the report. You answer as the parent; the report is about your child. Email and phone are optional."}
        </p>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isExec ? (
            <>
              <div className="sm:col-span-2">
                <p className={label} style={MUT}>Full name *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" autoFocus />
              </div>
              <div>
                <p className={label} style={MUT}>Age *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="38" />
              </div>
              <div>
                <p className={label} style={MUT}>City *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Bengaluru" />
              </div>
              <div className="sm:col-span-2">
                <p className={label} style={MUT}>Role level *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="e.g. Senior Manager · Infosys" />
              </div>
            </>
          ) : (
            <>
              <div className="sm:col-span-2">
                <p className={label} style={MUT}>Your name (parent) *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.parentName} onChange={(e) => setF({ ...f, parentName: e.target.value })} placeholder="Your name" autoFocus />
              </div>
              <div className="sm:col-span-2">
                <p className={label} style={MUT}>Child's name *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.childName} onChange={(e) => setF({ ...f, childName: e.target.value })} placeholder="Your child's name" />
              </div>
              <div>
                <p className={label} style={MUT}>Child's age (10–18) *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.childAge} onChange={(e) => setF({ ...f, childAge: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="14" />
              </div>
              <div>
                <p className={label} style={MUT}>Class *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="e.g. Class 9" />
              </div>
              <div className="sm:col-span-2">
                <p className={label} style={MUT}>City *</p>
                <input className={`${input} mt-1.5`} style={CARD} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Bengaluru" />
              </div>
            </>
          )}
          <div>
            <p className={label} style={MUT}>Email (optional)</p>
            <input className={`${input} mt-1.5`} style={CARD} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div>
            <p className={label} style={MUT}>Phone (optional)</p>
            <input className={`${input} mt-1.5`} style={CARD} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98xxxxxxxx" />
          </div>
        </div>
        {err && <p className="mt-4 text-[13px] text-red-400">{err}</p>}
        <button
          onClick={submit}
          className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Continue <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── questionnaire stages — LikertRunner in chapter (factor) order ─────────────
function CcriStage({ token, state, dark, onToggle }: { token: string; state: ReadinessState; dark: boolean; onToggle: () => void }) {
  const items = useMemo(
    () => runnerItems(CCRI.items, CCRI.factors, "Answer about your child and your family as things are today — not as you hope they will be."),
    [],
  )
  return (
    <LikertRunner
      title="Child Career Readiness"
      hues={HUE_CCRI}
      items={items}
      scale={CCRI_SCALE}
      answers={fitAnswers(state.answers.ccri, items.length)}
      chaptered
      dark={dark} onToggle={onToggle}
      onSave={(a) => patchReadinessAnswers(token, "ccri", a)}
      onDone={(a) => patchReadinessAnswers(token, "ccri", a, { doneAt: new Date().toISOString() })}
    />
  )
}

function CdraStage({ token, state, dark, onToggle }: { token: string; state: ReadinessState; dark: boolean; onToggle: () => void }) {
  const items = useMemo(
    () => runnerItems(CDRA.items, CDRA.factors, "Answer as things actually stand today — not as you would like them to be."),
    [],
  )
  return (
    <LikertRunner
      title="Part 1 · Career decisions"
      hues={HUE_CDRA}
      items={items}
      scale={READINESS_SCALE}
      answers={fitAnswers(state.answers.cdra, items.length)}
      chaptered
      dark={dark} onToggle={onToggle}
      onSave={(a) => patchReadinessAnswers(token, "cdra", a)}
      onDone={(a) => patchReadinessAnswers(token, "cdra", a, { cdraDoneAt: new Date().toISOString() })}
    />
  )
}

function EccriStage({ token, state, dark, onToggle }: { token: string; state: ReadinessState; dark: boolean; onToggle: () => void }) {
  const items = useMemo(
    () => runnerItems(ECCRI.items, ECCRI.dims, "Describe your current life circumstances honestly — this part measures your situation, not your ability."),
    [],
  )
  return (
    <LikertRunner
      title="Part 2 · Your circumstances"
      hues={HUE_ECCRI}
      items={items}
      scale={READINESS_SCALE}
      answers={fitAnswers(state.answers.eccri, items.length)}
      chaptered
      dark={dark} onToggle={onToggle}
      onSave={(a) => patchReadinessAnswers(token, "eccri", a)}
      onDone={(a) => patchReadinessAnswers(token, "eccri", a, { doneAt: new Date().toISOString() })}
    />
  )
}

// ── executive hand-off between the two parts ─────────────────────────────────
function Handoff({ token, dark, onToggle }: { token: string; dark: boolean; onToggle: () => void }) {
  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={MUT}>Saved on this device</span>} />
      <GlowField hues={HUE_ECCRI} strong />
      <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-[clamp(24px,6vw,110px)] pb-24">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px]" style={{ ...CARD, color: "var(--gmut)" }}>
          <Check className="size-3.5" /> Part 1 of 2 complete
        </span>
        <h1 className="mt-5 max-w-[22ch] font-display text-[clamp(30px,5vw,46px)] font-semibold leading-[1.08] tracking-tight">
          Part 2 — your circumstances.
        </h1>
        <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed" style={MUT}>
          The first part measured how you make career decisions. This part measures what your life
          currently allows — finances, family, location, time, energy. {ECCRI.items.length} statements,
          about {minutesFor(ECCRI.items.length)} minutes. Answer for your situation as it is, not as it should be.
        </p>
        <button
          onClick={() => updateReadiness(token, { part2AckAt: new Date().toISOString() })}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gfg)", color: "var(--gbg)" }}
        >
          Start Part 2 <ArrowRight className="size-4" />
        </button>
      </main>
    </>
  )
}

// ── report shell + shared bits ───────────────────────────────────────────────
const PRINT_CSS = `
  .rd-printonly { display: none; }
  @media print {
    .rd-noprint { display: none !important; }
    .rd-printonly { display: block !important; }
    .rd-root { background: #fff !important; color: #111 !important; }
    .rd-root * { --gbg: #fff; --gfg: #111; --gmut: #555; --gline: #ddd; --gcard: #fff; }
    .rd-section, .rd-row, .rd-block { break-inside: avoid; }
    .rd-break { break-after: page; }
    .rd-root .truncate { overflow: visible; white-space: normal; text-overflow: clip; }
    @page { margin: 14mm; }
  }
`

function ReportShell({ dark, onToggle, hue, children }: { dark: boolean; onToggle: () => void; hue: [string, string]; children: React.ReactNode }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="rd-root relative flex min-h-svh flex-col" style={{ background: "var(--gbg)", color: "var(--gfg)" }}>
        <div className="rd-noprint"><TopBar dark={dark} onToggle={onToggle} /></div>
        <div className="rd-noprint"><GlowField hues={hue} /></div>
        <div className="rd-noprint relative z-10 mx-auto w-full max-w-[760px] px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={CARD}>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" style={MUT} />
              <p className="max-w-[46ch] text-[13px] leading-relaxed" style={MUT}>
                This report exists only on this device — nothing is stored on our servers.
                <span style={{ color: "var(--gfg)" }}> Download the PDF to keep it.</span>
              </p>
            </div>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium"
              style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
              <Download className="size-4" /> Download PDF
            </button>
          </div>
        </div>
        <main className="relative z-10 mx-auto w-full max-w-[760px] flex-1 px-6 pb-24 pt-8">{children}</main>
      </div>
    </>
  )
}

function Meter({ value }: { value: number | null }) {
  return (
    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, background: "var(--gfg)" }} />
    </div>
  )
}

function BarRow({ i, label, value, right, sub }: { i: number; label: string; value: number | null; right?: React.ReactNode; sub?: string }) {
  return (
    <div className="rd-row px-4 py-2.5" style={{ borderTop: i ? "1px solid var(--gline)" : undefined }}>
      <div className="flex items-center gap-3">
        <p className="w-[38%] min-w-0 truncate text-[13px] font-medium">{label}</p>
        <Meter value={value} />
        <span className="w-9 shrink-0 text-right text-[13px] font-medium tabular-nums">{value == null ? "—" : Math.round(value)}</span>
        {right != null && <span className="w-[52px] shrink-0 text-right text-[11px]" style={MUT}>{right}</span>}
      </div>
      {sub && <p className="mt-1 text-[11.5px] leading-snug" style={MUT}>{sub}</p>}
    </div>
  )
}

function reportDate(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

// ── STUDENT report — CCRI ────────────────────────────────────────────────────
function StudentReport({ token, state, dark, onToggle }: { token: string; state: ReadinessState; dark: boolean; onToggle: () => void }) {
  const d = state.details ?? {}
  const r: CcriResult = useMemo(() => scoreCcri(state.answers.ccri ?? []), [state.answers.ccri])
  const endorsed = r.misconceptions.filter((m) => m.endorsed)
  const child = d.childName?.split(" ")[0] ?? "your child"

  return (
    <ReportShell dark={dark} onToggle={onToggle} hue={HUE_CCRI}>
      {/* cover */}
      <header className="rd-section">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={MUT}>SetMyCareer · Readiness report</p>
        <h1 className="mt-2 font-display text-[clamp(28px,4.6vw,40px)] font-light tracking-tight">{CCRI.title}</h1>
        <p className="mt-2 max-w-[56ch] text-[14px] italic leading-relaxed" style={MUT}>{CCRI.tagline}</p>
        <p className="mt-3 text-[13px]" style={MUT}>
          {d.childName} · Age {d.childAge} · {d.grade}{d.city ? ` · ${d.city}` : ""} · Answered by {d.parentName} ·{" "}
          {reportDate()} · Ref {token}
        </p>
      </header>

      {/* the four pillars — the leading read */}
      <section className="rd-section mt-10">
        <h2 className="font-display text-[20px] font-light tracking-tight">The four pillars</h2>
        <p className="mt-1 max-w-[62ch] text-[12.5px]" style={MUT}>
          Your answers, read across the four questions every family faces. Scores run 0–100; the short
          read under each explains what the number means for your family — not for {child}'s ability.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {r.pillars.map((p) => (
            <div key={p.key} className="rd-block rounded-2xl border p-4" style={CARD}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14.5px] font-semibold">{p.name}</p>
                <span className="rounded-full border px-2.5 py-0.5 text-[11px]" style={LINE}>{p.band}</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed" style={MUT}>{p.question}</p>
              <div className="mt-3 flex items-center gap-3">
                <Meter value={p.score} />
                <span className="w-9 shrink-0 text-right text-[13.5px] font-medium tabular-nums">{p.score == null ? "—" : Math.round(p.score)}</span>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed" style={MUT}>{p.read}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the ten factors */}
      <section className="rd-section mt-10">
        <h2 className="font-display text-[20px] font-light tracking-tight">The ten factors</h2>
        <p className="mt-1 max-w-[62ch] text-[12.5px]" style={MUT}>
          Each factor is scored 0–100 from its statements. The percentage on the right is its weight in
          the overall index — the factors are not all equally important.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border" style={LINE}>
          {r.factors.map((f, i) => (
            <BarRow key={f.key} i={i} label={f.name} value={f.score} right={`${f.weightPct}%`} />
          ))}
        </div>
      </section>

      {/* overall CRI */}
      <section className="rd-section mt-10">
        <div className="rounded-2xl border p-5" style={CARD}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Overall Career Readiness Index</p>
          <p className="mt-2 font-display text-[44px] font-light leading-none tracking-tight">
            {r.cri == null ? "—" : Math.round(r.cri)}<span className="text-[18px]" style={MUT}> / 100</span>
          </p>
          <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed" style={MUT}>
            A weighted blend of the ten factors. It measures your family's current readiness to support
            {" "}{child}'s career development — it does not measure {child}'s abilities, interests,
            personality or potential. Those can only be established by assessing {child} directly.
          </p>
        </div>
      </section>

      {/* misconceptions — only when any were endorsed */}
      {endorsed.length > 0 && (
        <section className="rd-section mt-10">
          <div className="rounded-2xl border p-5" style={CARD}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Worth re-examining</p>
            <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed" style={MUT}>
              You agreed with {endorsed.length === 1 ? "one common belief" : `${endorsed.length} common beliefs`} about
              careers that the evidence generally does not support. None of this is a judgement — these
              views are widespread — but each is worth a second look before big decisions.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {endorsed.map((m, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: "var(--gmut)" }} />
                  {m.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* closing insight */}
      <section className="rd-section mt-10">
        <div className="rounded-2xl border p-5" style={CARD}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Closing note</p>
          <p className="mt-2 text-[13px] leading-relaxed">{r.finalInsight}</p>
        </div>
      </section>
    </ReportShell>
  )
}

// ── EXECUTIVE report — CDRA + ECCRI combined ─────────────────────────────────
const QUAD_CELLS: [string, string][] = [
  ["Future Builder", "Career Accelerator"], // circumstances support you (top row)
  ["Career Survivor", "Strategic Leader"], // circumstances constrain you
]
const qnorm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

function ExecReport({ token, state, dark, onToggle }: { token: string; state: ReadinessState; dark: boolean; onToggle: () => void }) {
  const d = state.details ?? {}
  const cdra: CdraResult = useMemo(() => scoreCdra(state.answers.cdra ?? []), [state.answers.cdra])
  const eccri: EccriResult = useMemo(() => scoreEccri(state.answers.eccri ?? []), [state.answers.eccri])

  // quadrant: circumstantial = ECCRI overall; self-awareness = CDRA Factor 1
  const selfAware = cdra.factors[0]?.score ?? null
  const quad = eccri.overall != null && selfAware != null ? eccriQuadrant(eccri.overall, selfAware) : null
  let mark: [number, number] | null = null
  if (quad) {
    for (let row = 0; row < 2 && !mark; row++)
      for (let col = 0; col < 2 && !mark; col++)
        if (qnorm(QUAD_CELLS[row][col]) === qnorm(quad.name)) mark = [row, col]
    if (!mark && eccri.overall != null && selfAware != null)
      mark = [eccri.overall >= 50 ? 0 : 1, selfAware >= 50 ? 1 : 0]
  }

  const dimGroups = [
    { name: "Enablers", kind: "enabler" as const, note: "Higher is better — these give you room to move." },
    { name: "Drivers", kind: "driver" as const, note: "Higher is better — these pull your career forward." },
    { name: "Constraints", kind: "constraint" as const, note: "Higher means a bigger brake on your options." },
  ].map((g) => ({ ...g, dims: eccri.dims.filter((x) => x.kind === g.kind) }))

  const g = cdra.gap

  return (
    <ReportShell dark={dark} onToggle={onToggle} hue={HUE_CDRA}>
      {/* cover */}
      <header className="rd-section">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={MUT}>SetMyCareer · Readiness report</p>
        <h1 className="mt-2 font-display text-[clamp(28px,4.6vw,40px)] font-light tracking-tight">Career Decision &amp; Circumstantial Readiness</h1>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed" style={MUT}>{CDRA.title} · {ECCRI.title}</p>
        <p className="mt-3 text-[13px]" style={MUT}>
          {d.name} · Age {d.age} · {d.role}{d.city ? ` · ${d.city}` : ""} · {reportDate()} · Ref {token}
        </p>
      </header>

      {/* CDRS */}
      <section className="rd-section mt-10">
        <h2 className="font-display text-[20px] font-light tracking-tight">{CDRA.title}</h2>
        <div className="mt-4 rounded-2xl border p-5" style={CARD}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Career Decision Readiness Score</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p className="font-display text-[44px] font-light leading-none tracking-tight">
              {cdra.cdrs == null ? "—" : Math.round(cdra.cdrs)}<span className="text-[18px]" style={MUT}> / 100</span>
            </p>
            {cdra.band && <span className="rounded-full border px-3 py-1 text-[12.5px] font-medium" style={LINE}>{cdra.band.name}</span>}
          </div>
          {cdra.band && <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed" style={MUT}>{cdra.band.note}</p>}
        </div>
      </section>

      {/* CDRA factor bars */}
      <section className="rd-section mt-8">
        <p className="max-w-[62ch] text-[12.5px]" style={MUT}>
          The eleven factors behind the score, each 0–100. The percentage on the right is the factor's
          weight in the overall score.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border" style={LINE}>
          {cdra.factors.map((f, i) => (
            <BarRow key={f.key} i={i} label={f.name} value={f.score} right={`${f.weightPct}%`} />
          ))}
        </div>
      </section>

      {/* perception vs evidence gap */}
      <section className="rd-section mt-8">
        <div className="rounded-2xl border p-5" style={CARD}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Perception vs evidence</p>
          <div className="mt-3 flex flex-col gap-3">
            {([["How prepared you feel", g.perception], ["What the evidence shows", g.evidence]] as const).map(([label, v]) => (
              <div key={label} className="flex items-center gap-3">
                <p className="w-[200px] shrink-0 text-[12.5px]" style={MUT}>{label}</p>
                <Meter value={v} />
                <span className="w-9 shrink-0 text-right text-[13px] font-medium tabular-nums">{v == null ? "—" : Math.round(v)}</span>
              </div>
            ))}
          </div>
          {g.gap != null && (
            <p className="mt-3 text-[12.5px]" style={MUT}>Gap: <span className="font-medium" style={{ color: "var(--gfg)" }}>{Math.round(g.gap)}</span> points</p>
          )}
          <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed" style={MUT}>{g.read}</p>
        </div>
      </section>

      {/* ECCRI */}
      <section className="rd-section mt-12">
        <h2 className="font-display text-[20px] font-light tracking-tight">{ECCRI.title}</h2>
        <p className="mt-1 max-w-[62ch] text-[12.5px]" style={MUT}>
          This part measures your circumstances, not your capability — the financial, family, location
          and time realities that decide how much room your career actually has.
        </p>
        {/* six final scores */}
        <div className="mt-4 overflow-hidden rounded-2xl border" style={LINE}>
          {eccri.finalScores.map((s, i) => (
            <BarRow key={s.key} i={i} label={s.name} value={s.score} sub={s.question} />
          ))}
        </div>
      </section>

      {/* dims grouped */}
      <section className="rd-section mt-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {dimGroups.map((grp) => (
            <div key={grp.kind} className="rd-block rounded-2xl border p-4" style={CARD}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>{grp.name}</p>
              <p className="mt-1 text-[11.5px] leading-snug" style={MUT}>{grp.note}</p>
              <div className="mt-3 flex flex-col gap-2.5">
                {grp.dims.length === 0 && <p className="text-[12px]" style={MUT}>—</p>}
                {grp.dims.map((x) => (
                  <div key={x.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-[12.5px]">{x.name}</p>
                      <span className="text-[12px] font-medium tabular-nums">{x.score == null ? "—" : Math.round(x.score)}</span>
                    </div>
                    <div className="mt-1"><Meter value={x.score} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* top constraints */}
      {eccri.constraintTop.length > 0 && (
        <section className="rd-section mt-8">
          <div className="rounded-2xl border p-5" style={CARD}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>What's limiting you most right now</p>
            <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed" style={MUT}>
              The barriers you rated highest, in your own assessment. These are circumstances — most can
              change, and naming them is the first step.
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {eccri.constraintTop.map((c) => {
                const pct = c.level <= 5 ? (c.level / 5) * 100 : Math.min(100, c.level)
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <p className="w-[160px] shrink-0 truncate text-[12.5px]">{c.name}</p>
                    <Meter value={pct} />
                    <span className="w-9 shrink-0 text-right text-[12.5px] font-medium tabular-nums">{c.level <= 5 ? `${c.level}/5` : Math.round(c.level)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* readiness quadrant */}
      <section className="rd-section mt-8">
        <h3 className="font-display text-[17px] font-light tracking-tight">Your readiness quadrant</h3>
        <p className="mt-1 max-w-[62ch] text-[12.5px]" style={MUT}>
          Vertical: how much your circumstances support a move (ECCRI overall). Horizontal: how well you
          know yourself professionally (self-awareness, from Part 1).
        </p>
        {quad ? (
          <>
            <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: "minmax(88px,auto) 1fr 1fr" }}>
              <span />
              <p className="pb-1 text-center text-[10.5px] uppercase tracking-[0.1em]" style={MUT}>Lower self-awareness</p>
              <p className="pb-1 text-center text-[10.5px] uppercase tracking-[0.1em]" style={MUT}>Higher self-awareness</p>
              {QUAD_CELLS.map((rowCells, row) => (
                <div key={row} className="contents">
                  <p className="self-center pr-2 text-right text-[10.5px] uppercase leading-snug tracking-[0.1em]" style={MUT}>
                    {row === 0 ? "Circumstances support you" : "Circumstances constrain you"}
                  </p>
                  {rowCells.map((name, col) => {
                    const active = mark?.[0] === row && mark?.[1] === col
                    return (
                      <div key={name} className="grid min-h-[72px] place-items-center rounded-xl border px-3 py-4 text-center"
                        style={active
                          ? { borderColor: "var(--gfg)", background: "var(--gfg)", color: "var(--gbg)" }
                          : CARD}>
                        <p className="text-[13px] font-medium leading-snug">{name}{active ? " · you" : ""}</p>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed" style={MUT}>
              <span className="font-medium" style={{ color: "var(--gfg)" }}>{quad.name}.</span> {quad.read}
            </p>
          </>
        ) : (
          <p className="mt-3 text-[12.5px]" style={MUT}>Not enough answers to place you on the quadrant.</p>
        )}
      </section>

      {/* closing */}
      <section className="rd-section mt-10">
        <div className="rounded-2xl border p-5" style={CARD}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={MUT}>Closing note</p>
          <p className="mt-2 text-[13px] leading-relaxed">{READINESS_CLOSING.executive}</p>
        </div>
      </section>
    </ReportShell>
  )
}
