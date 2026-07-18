import { useState } from "react"
import { ArrowUpRight } from "@carbon/icons-react"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { AGE_BANDS, STAGES, stageById, type AgeBand } from "@/content/fit-test"

export interface IntakeData {
  name: string
  email: string
  ageBand: AgeBand | ""
  stageId: string
  city: string
}

const EMAIL_RE = /^\S+@\S+\.\S+$/

/* Chip — a 44px-min selectable pill-less rectangle (Fitts), inverted when on. */
function Chip({ on, label, onPick }: { on: boolean; label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={`min-h-[44px] border px-4 py-2 text-[13px] transition-colors ${
        on ? "border-paper bg-paper text-ink" : "border-paper/30 text-paper/80 hover:border-paper/70"
      }`}
    >
      <span>{label}</span>
    </button>
  )
}

/* The intake — the /fit hero itself: the fit_test gradient band carrying the
   headline and the four fields the instrument needs before question one. */
export function FitIntake({ data, onPatch, onStart }: {
  data: IntakeData
  /** functional patch — safe against batched updates (two chips in one tick) */
  onPatch: (patch: Partial<IntakeData>) => void
  onStart: () => void
}) {
  const [err, setErr] = useState("")
  const set = onPatch

  const begin = () => {
    if (data.name.trim().length < 2) { setErr("Add your first name — the report addresses you by it."); return }
    if (!EMAIL_RE.test(data.email.trim())) { setErr("That email doesn't look complete — we need a way to send your result."); return }
    if (!data.ageBand) { setErr("Pick your age band — it calibrates the questions."); return }
    if (!data.stageId) { setErr("Pick where you are right now — it decides which track you get."); return }
    setErr("")
    onStart()
  }

  const isParent = data.stageId === "parent"
  const stage = stageById(data.stageId)

  return (
    <section className="relative overflow-hidden">
      <PackageGradient offeringId="fit_test" interactive scrim />
      <div className="wrap relative pb-16 pt-36 md:pb-24 md:pt-44">
        <p className="kicker !text-paper/60">The Package-Fit Test · Free · ~5 minutes</p>
        <h1 className="mt-5 max-w-[16ch] text-[clamp(2.1rem,6vw,4.6rem)] font-extralight leading-[1.02] tracking-[-0.03em] text-paper">
          Which programme is <span className="font-semibold">actually yours?</span>
        </h1>
        <p className="mt-6 max-w-xl text-[clamp(1rem,1.5vw,1.25rem)] font-light leading-relaxed text-paper/70">
          A few honest questions and two in your own words. We read all of it, match it against
          every SetMyCareer programme, and write you a plan — your best fit, a journey, and the
          moves to make next. On screen, free.
        </p>

        <div className="mt-12 max-w-3xl border-t border-paper/20 pt-9">
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <label className="block">
              <span className="kicker !text-paper/60">First name</span>
              <input
                value={data.name}
                onChange={(e) => set({ name: e.target.value })}
                autoComplete="given-name"
                placeholder="What should the report call you?"
                className="mt-2.5 w-full border-b border-paper/30 bg-transparent py-2.5 text-[15px] text-paper placeholder:text-paper/35"
              />
            </label>
            <label className="block">
              <span className="kicker !text-paper/60">Email</span>
              <input
                value={data.email}
                onChange={(e) => set({ email: e.target.value })}
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="mt-2.5 w-full border-b border-paper/30 bg-transparent py-2.5 text-[15px] text-paper placeholder:text-paper/35"
              />
            </label>
          </div>

          <div className="mt-8">
            <span className="kicker !text-paper/60">Age band</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {AGE_BANDS.map((a) => (
                <Chip key={a} on={data.ageBand === a} label={a} onPick={() => set({ ageBand: a })} />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <span className="kicker !text-paper/60">Where you are right now</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Chip key={s.id} on={data.stageId === s.id} label={s.label} onPick={() => set({ stageId: s.id })} />
              ))}
            </div>
            {isParent && (
              <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-paper/55">
                Answer the 24 questions as your child's situation — the test places their decision, with you in it.
              </p>
            )}
            {stage?.track === "professional" && (
              <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-paper/55">
                You'll get the professional instrument — switch, promotion and restart phrasing included.
              </p>
            )}
          </div>

          <div className="mt-7 max-w-sm">
            <label className="block">
              <span className="kicker !text-paper/60">City · optional</span>
              <input
                value={data.city}
                onChange={(e) => set({ city: e.target.value })}
                autoComplete="address-level2"
                placeholder="Helps us route the right counsellor"
                className="mt-2.5 w-full border-b border-paper/30 bg-transparent py-2.5 text-[15px] text-paper placeholder:text-paper/35"
              />
            </label>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <button type="button" onClick={begin} className="btn btn--solid-dark">
              <span>Start the test</span> <ArrowUpRight size={15} className="btn-arrow" />
            </button>
            <p className="mono text-[10.5px] uppercase tracking-[0.13em] text-paper/45">
              No account · nothing stored · result on screen
            </p>
          </div>
          {err && (
            <p role="alert" className="mt-4 text-[13px] font-medium text-paper/90">{err}</p>
          )}
        </div>
      </div>
    </section>
  )
}
