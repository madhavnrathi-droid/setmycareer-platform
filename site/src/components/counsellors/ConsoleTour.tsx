import { useEffect, useRef, useState, type ComponentType } from "react"
import { ConsoleCaseload } from "./ConsoleCaseload"
import { ConsoleSession } from "./ConsoleSession"
import { ConsoleReport } from "./ConsoleReport"
import { ConsoleCalendar } from "./ConsoleCalendar"
import { ConsoleCompass } from "./ConsoleCompass"

/* The console tour — the dark twin of the client-side ProductTour. Five step
   tabs; hover (or focus, or let it auto-advance) and the stage drops the matching
   LIGHT console mini-UI onto the dark ground and plays it. The console is a light
   app, so the demos float as lit screens on the night-shift page — maximum motion,
   minimum words. Progress rail is paper (purple lives inside the light demos);
   reduced-motion holds the finished frame. */

type Step = { key: string; no: string; name: string; url: string; Comp: ComponentType<{ active: boolean }> }

const STEPS: Step[] = [
  { key: "caseload", no: "01", name: "Caseload", url: "app.setmycareer.com/overview", Comp: ConsoleCaseload },
  { key: "session", no: "02", name: "Live session", url: "app.setmycareer.com/session", Comp: ConsoleSession },
  { key: "report", no: "03", name: "Reports", url: "app.setmycareer.com/reports", Comp: ConsoleReport },
  { key: "calendar", no: "04", name: "Calendar", url: "app.setmycareer.com/calendar", Comp: ConsoleCalendar },
  { key: "compass", no: "05", name: "Compass AI", url: "app.setmycareer.com/compass", Comp: ConsoleCompass },
]

const DWELL = 5200

export function ConsoleTour() {
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
    <div className="mt-10" onMouseLeave={() => (paused.current = false)}>
      {/* ── step tabs — hover / focus to preview ── */}
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
              className={`group relative border-t py-5 pr-4 text-left transition-colors duration-300 ${on ? "border-paper" : "border-paper/15 hover:border-paper/45"}`}
            >
              <span className={`mono text-[11px] tabular-nums transition-colors ${on ? "text-paper" : "text-paper/40"}`}>{st.no}</span>
              <h3 className={`mt-1.5 text-[15px] font-medium tracking-tight transition-colors ${on ? "text-paper" : "text-paper/55 group-hover:text-paper/85"}`}>{st.name}</h3>
              <span className="absolute inset-x-0 top-0 h-[2px] origin-left bg-paper" style={{ transform: `scaleX(${on ? (reduce.current ? 1 : progress) : 0})` }} />
            </button>
          )
        })}
      </div>

      {/* ── the stage — the active console screen drops in, lit, on the dark ground ── */}
      <div className="mx-auto mt-8 w-full max-w-4xl overflow-hidden rounded-[16px] border border-paper/15 bg-[#111110] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
        {/* browser chrome (dark) */}
        <div className="flex items-center gap-2 border-b border-paper/10 px-4 py-2.5">
          <span className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-paper/15" />
            <span className="size-2.5 rounded-full bg-paper/15" />
            <span className="size-2.5 rounded-full bg-paper/15" />
          </span>
          <span key={s.url} className="ml-2 truncate rounded-full border border-paper/15 px-3 py-1 text-[11px] text-paper/45 motion-safe:animate-[fpfade_.4s_ease-out]">{s.url}</span>
          <span className="mono ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-paper/40">{s.no} · {s.name}</span>
        </div>

        {/* the screen */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {/* faint paper dot-grid so the lit demo reads as a surface */}
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(rgba(243,242,238,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          {STEPS.map((st, i) => {
            const on = i === active
            return (
              <div
                key={st.key}
                aria-hidden={!on}
                className={`absolute inset-0 transition-[opacity,transform] duration-500 ${on ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}
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
