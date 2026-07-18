import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { ConsoleFrame, FrameChip } from "../tour/AppFrame"

/* Counsellor-console — the booking calendar, FULL FRAME. The real console shell
   (sidebar + topbar via ConsoleFrame) with the week grid filling the whole
   canvas: toolbar (JUL 6–10 + arrows + Day/Week toggle), MON–FRI day header,
   hour-ruled grid with a gutter of hour labels, and a status footer. Clients
   land themselves in the week: hairlines draw, session blocks pop in, a NEW
   purple booking drops into Thursday 4:30 with a ring ripple while "sessions
   today" ticks 2→3, one block glides Tue→Wed (a reschedule) and the red
   now-line sweeps across today. Authored in its resolved state; GSAP animates
   INTO it and loops. Transforms + opacity only. Reduced-motion holds the
   finished frame. */

const DAYS = [
  { d: "MON", n: "6" },
  { d: "TUE", n: "7" },
  { d: "WED", n: "8" },
  { d: "THU", n: "9", today: true },
  { d: "FRI", n: "10" },
]

/* vertical scale: 0% = 8:00, 10% per hour → hour rules 9 AM … 5 PM */
const RULES = [
  { top: "10%", label: "9 AM" },
  { top: "20%", label: "10 AM" },
  { top: "30%", label: "11 AM" },
  { top: "40%", label: "12 PM" },
  { top: "50%", label: "1 PM" },
  { top: "60%", label: "2 PM" },
  { top: "70%", label: "3 PM" },
  { top: "80%", label: "4 PM" },
  { top: "90%", label: "5 PM" },
]

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={`size-[10px]${flip ? " rotate-180" : ""}`} aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/* a booked session block — col: 0–4 · top/h: % of the 8:00–6:00 scale */
function SessionBlock({ col, top, h, name, time, extra = "" }: { col: number; top: string; h: string; name: string; time: string; extra?: string }) {
  return (
    <div
      className={`chip-pop ${extra} absolute overflow-hidden rounded-[7px] border border-ink/10 bg-ink/[0.06] px-1.5 py-1 sm:px-2`}
      style={{ left: `calc(${col * 20}% + 4px)`, width: "calc(20% - 8px)", top, height: h }}
    >
      <span className="absolute inset-y-1 left-[3px] w-[2px] rounded-full bg-ink/25" aria-hidden />
      <span className="block truncate pl-1.5 text-[9.5px] font-medium leading-tight text-ink-80 sm:text-[10px]">{name}</span>
      <span className="mono block truncate pl-1.5 text-[8px] leading-tight text-ink-40">{time}</span>
    </div>
  )
}

export function ConsoleCalendar({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const body = rootRef.current?.querySelector<HTMLElement>(".cal-body")
      const colW = body ? body.clientWidth / 5 : 100
      const countEl = rootRef.current?.querySelector<HTMLElement>(".count") ?? null

      /* ambient — the red "now" dot breathes so the frame never feels dead */
      gsap.to(".now-dot", { scale: 0.55, autoAlpha: 0.45, duration: 0.85, ease: "sine.inOut", repeat: -1, yoyo: true, transformOrigin: "center" })

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9, defaults: { ease: "power3.out" } })

      tl
        /* resolved state → starting state */
        .set(".chip-move", { x: -colW }, 0) // reschedule block starts one day left (Tue)
        .call(() => { if (countEl) countEl.textContent = "2" }, undefined, 0)
        /* 1 — toolbar rises in, week frame + hairlines draw */
        .from(".cal-head", { autoAlpha: 0, y: -10, duration: 0.45 }, 0.05)
        .from(".day", { autoAlpha: 0, y: 7, duration: 0.4, stagger: 0.06 }, "<0.1")
        .from(".today-wash", { autoAlpha: 0, duration: 0.5 }, "<")
        .from(".vline", { scaleY: 0, transformOrigin: "top", duration: 0.5, stagger: 0.07, ease: "power2.inOut" }, "<0.05")
        .from(".rule", { scaleX: 0, transformOrigin: "left", duration: 0.55, stagger: 0.04, ease: "power2.inOut" }, "<")
        .from(".hlab", { autoAlpha: 0, duration: 0.35 }, "<0.25")
        .from(".now-line", { scaleX: 0, transformOrigin: "left", duration: 0.4 }, "<0.1")
        .from(".cal-foot", { autoAlpha: 0, y: 8, duration: 0.4 }, "<")
        /* 2 — existing session blocks pop into their slots */
        .from(".chip-pop", { autoAlpha: 0, scale: 0.8, duration: 0.45, stagger: 0.08, transformOrigin: "center" }, "+=0.1")
        /* 3 — THE MOMENT: a new booking drops into Thursday 4:30 */
        .from(".chip-new", { autoAlpha: 0, y: -22, duration: 0.55, ease: "back.out(1.5)" }, "+=0.5")
        .fromTo(".ripple",
          { xPercent: -50, yPercent: -50, scale: 0.6, autoAlpha: 0.85 },
          { xPercent: -50, yPercent: -50, scale: 1.45, autoAlpha: 0, duration: 0.75, ease: "power2.out" }, "<0.05")
        .call(() => { if (countEl) countEl.textContent = "3" }, undefined, "<0.2")
        .fromTo(".count", { autoAlpha: 0, y: -5 }, { autoAlpha: 1, y: 0, duration: 0.3 }, "<")
        /* 4 — a reschedule: one block glides Tue → Wed */
        .to(".chip-move", { x: 0, duration: 0.65, ease: "power3.inOut" }, "+=0.55")
        /* 5 — short hold, then repeat */
        .to({}, { duration: 0.4 })
    }, rootRef)

    return () => ctx.revert()
  }, [active])

  return (
    <ConsoleFrame activeItem="Calendar" title="Calendar" chips={<FrameChip>This week</FrameChip>}>
      <div
        ref={rootRef}
        role="img"
        aria-label="Booking calendar — a new client booking lands itself in the counsellor's week"
        className="flex h-full w-full flex-col bg-paper"
      >
        {/* ── week toolbar ── */}
        <div className="cal-head flex shrink-0 items-center justify-between gap-2 border-b border-line bg-paper-pure px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex items-center gap-1" aria-hidden>
              <span className="grid size-5 place-items-center rounded-[6px] border border-line bg-white text-ink-60"><Chevron /></span>
              <span className="grid size-5 place-items-center rounded-[6px] border border-line bg-white text-ink-60"><Chevron flip /></span>
            </span>
            <span className="hidden rounded-[6px] border border-line bg-white px-2 py-[3px] text-[9.5px] font-medium text-ink-60 sm:inline">Today</span>
            <span className="truncate text-[12px] font-semibold tracking-tight text-ink">JUL 6–10</span>
            <span className="mono hidden text-[8.5px] tracking-[0.12em] text-ink-40 md:inline">WEEK 28 · 2026</span>
          </div>
          <div className="flex shrink-0 items-center gap-[2px] rounded-[7px] border border-line bg-paper p-[2px]">
            <span className="rounded-[5px] px-2 py-[3px] text-[9.5px] text-ink-40">Day</span>
            <span className="rounded-[5px] bg-white px-2 py-[3px] text-[9.5px] font-medium text-ink shadow-[0_1px_3px_rgba(11,11,11,0.08)]">Week</span>
          </div>
        </div>

        {/* ── day header row ── */}
        <div className="flex shrink-0 border-b border-line bg-paper-pure">
          <span className="mono flex w-8 shrink-0 items-end justify-center pb-1 text-[6.5px] tracking-[0.1em] text-ink-20 sm:w-10" aria-hidden>IST</span>
          <div className="grid flex-1 grid-cols-5">
            {DAYS.map((d) => (
              <div key={d.d} className="day flex items-center justify-center gap-1.5 py-1.5">
                <span className={`mono text-[8.5px] tracking-[0.12em] ${d.today ? "font-medium text-ink" : "text-ink-40"}`}>{d.d}</span>
                <span className={`text-[9.5px] tabular-nums leading-none ${d.today ? "grid size-4 place-items-center rounded-full bg-ink font-medium text-paper-pure" : "text-ink-60"}`}>{d.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── the week grid — fills everything left ── */}
        <div className="flex min-h-0 flex-1">
          {/* hour gutter */}
          <div className="relative w-8 shrink-0 sm:w-10">
            {RULES.map((r) => (
              <span key={r.label} className="hlab mono absolute right-1 -translate-y-1/2 whitespace-nowrap text-[7.5px] leading-none tracking-[0.04em] text-ink-40 sm:right-1.5" style={{ top: r.top }}>
                {r.label}
              </span>
            ))}
          </div>

          {/* columns */}
          <div className="cal-body relative flex-1 border-l border-line">
            {/* today wash (Thursday) */}
            <div className="today-wash absolute inset-y-0 bg-ink/[0.03]" style={{ left: "60%", width: "20%" }} aria-hidden />
            {/* hour ruling */}
            {RULES.map((r) => (
              <div key={r.top} className="rule absolute left-0 right-0 h-px bg-line-faint" style={{ top: r.top }} aria-hidden />
            ))}
            {/* column separators */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="vline absolute bottom-0 top-0 w-px bg-line" style={{ left: `${i * 20}%` }} aria-hidden />
            ))}

            {/* "now" indicator across Thursday (today) */}
            <div className="now-line absolute h-px bg-decline/60" style={{ left: "calc(60% + 1px)", width: "calc(20% - 2px)", top: "44%" }}>
              <span className="now-dot absolute -left-[2px] top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-decline" />
            </div>

            {/* existing sessions */}
            <SessionBlock col={0} top="25%" h="10%" name="Aarav R" time="10:30 · 60m" />
            <SessionBlock col={2} top="35%" h="10%" name="Mihir P" time="11:30 · 60m" extra="chip-move" />
            <SessionBlock col={3} top="25%" h="10%" name="Sana K" time="10:30 · 60m" />
            <SessionBlock col={3} top="55%" h="15%" name="Rhea V" time="1:30 · 90m" />

            {/* the new booking — Thursday 4:30 */}
            <div
              className="chip-new absolute rounded-[7px] bg-growth px-1.5 py-1 shadow-[0_8px_18px_-8px_rgba(91,40,184,0.6)] sm:px-2"
              style={{ left: "calc(60% + 4px)", width: "calc(20% - 8px)", top: "80%", height: "10%" }}
            >
              <span className="ripple pointer-events-none absolute left-1/2 top-1/2 size-16 rounded-full border border-growth opacity-0" aria-hidden />
              <span className="block text-[7px] font-semibold leading-none tracking-[0.16em] text-white/70">NEW</span>
              <span className="mono mt-1 block truncate text-[9px] leading-none text-white">Ananya · 4:30</span>
            </div>
          </div>
        </div>

        {/* ── status footer ── */}
        <div className="cal-foot flex shrink-0 items-center justify-between border-t border-line bg-paper-pure px-3 py-1.5 sm:px-4">
          <span className="mono text-[9px] tracking-[0.1em] text-ink-40">
            <span className="count inline-block text-ink">3</span> SESSIONS TODAY
          </span>
          <span className="mono text-[9px] tracking-[0.1em] text-ink-40">AUTO-SYNCED</span>
        </div>
      </div>
    </ConsoleFrame>
  )
}
