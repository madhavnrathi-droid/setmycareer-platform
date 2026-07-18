import { useEffect, useRef, useState, type ComponentType } from "react"
import { StepSignup } from "./StepSignup"
import { StepAssess } from "./StepAssess"
import { StepCoach } from "./StepCoach"
import { StepSession } from "./StepSession"
import { StepReport } from "./StepReport"

/* The product tour, made interactive (the Stripe/Vercel move). Five step tabs;
   hover (or focus, or let it auto-advance) and the stage below DROPS the matching
   mini-UI into place and plays it — a live, motion-graphic preview built from real
   UI elements, so the process sells itself. Minimal text, maximum movement.
   Monochrome, one purple accent on the progress rail; reduced-motion holds the
   final frame. */

type Step = { key: string; no: string; name: string; url: string; Comp: ComponentType<{ active: boolean }> }

const STEPS: Step[] = [
  { key: "signup", no: "01", name: "Sign up", url: "app.setmycareer.com/portal", Comp: StepSignup },
  { key: "assess", no: "02", name: "Assess", url: "app.setmycareer.com/portal/assessments", Comp: StepAssess },
  { key: "coach", no: "03", name: "AI coach", url: "app.setmycareer.com/portal/coach", Comp: StepCoach },
  { key: "session", no: "04", name: "Counsellor session", url: "app.setmycareer.com/portal/session", Comp: StepSession },
  { key: "report", no: "05", name: "Report", url: "app.setmycareer.com/portal/report", Comp: StepReport },
]

const DWELL = 5200 // ms per step before auto-advancing

export function ProductTour() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const paused = useRef(false)
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce.current) return
    let raf = 0, start = performance.now()
    const p0 = { current: 0 }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (paused.current) { start = now - p0.current * DWELL; return }
      const p = Math.min(1, (now - start) / DWELL)
      p0.current = p
      setProgress(p)
      if (p >= 1) { start = now; p0.current = 0; setActive((a) => (a + 1) % STEPS.length) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const pick = (i: number) => { setActive(i); setProgress(0) }
  const s = STEPS[active]

  return (
    <div
      className="mt-10"
      onMouseLeave={() => (paused.current = false)}
    >
      {/* ── the step tabs — hover / focus to preview ── */}
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 md:grid-cols-5">
        {STEPS.map((st, i) => {
          const on = i === active
          return (
            <button
              key={st.key}
              onMouseEnter={() => { paused.current = true; pick(i) }}
              onFocus={() => { paused.current = true; pick(i) }}
              onClick={() => pick(i)}
              aria-pressed={on}
              className={`group relative border-t py-5 pr-4 text-left transition-colors duration-300 ${on ? "border-ink" : "border-line hover:border-ink-40"}`}
            >
              <span className={`mono text-[11px] tabular-nums transition-colors ${on ? "text-growth" : "text-ink-40"}`}>{st.no}</span>
              <h3 className={`mt-1.5 text-[15px] font-medium tracking-tight transition-colors ${on ? "text-ink" : "text-ink-60 group-hover:text-ink"}`}>{st.name}</h3>
              {/* progress rail — fills only under the active tab */}
              <span className="absolute inset-x-0 top-0 h-[2px] origin-left bg-growth" style={{ transform: `scaleX(${on ? (reduce.current ? 1 : progress) : 0})` }} />
            </button>
          )
        })}
      </div>

      {/* ── the stage — the active preview drops in ── */}
      <div className="mx-auto mt-8 w-full max-w-4xl overflow-hidden rounded-[16px] border border-line bg-paper-pure elev">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-ink/15" />
            <span className="size-2.5 rounded-full bg-ink/15" />
            <span className="size-2.5 rounded-full bg-ink/15" />
          </span>
          <span key={s.url} className="ml-2 truncate rounded-full border border-line px-3 py-1 text-[11px] text-ink-40 motion-safe:animate-[fpfade_.4s_ease-out]">{s.url}</span>
          <span className="mono ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-40">{s.no} · {s.name}</span>
        </div>

        {/* the screen — each preview stacked, the active one dropped in + playing */}
        <div className="relative aspect-[16/10] overflow-hidden bg-paper">
          {/* faint dotted ground so the mini-UI reads as a real surface */}
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(rgba(11,11,11,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          {STEPS.map((st, i) => {
            const on = i === active
            return (
              <div
                key={st.key}
                aria-hidden={!on}
                className={`absolute inset-0 transition-[opacity,transform] duration-500 ${on ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-3 opacity-0"}`}
                style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
              >
                <st.Comp active={on} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
