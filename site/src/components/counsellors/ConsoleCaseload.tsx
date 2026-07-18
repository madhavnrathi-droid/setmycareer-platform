import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { ConsoleFrame, FrameChip } from "../tour/AppFrame"

/*
  ConsoleCaseload — the counsellor's morning, full frame.
  The real console Overview screen inside ConsoleFrame: a full-width
  3-stat row (counters + sparkline), a full-width client table with
  status chips, and a live booking notification that drops in over
  the canvas top-right. Edge to edge — no floating card.
*/

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/10 text-[9px] font-medium text-ink-60">
      {initials}
    </span>
  )
}

const ROWS = [
  { initials: "AR", w1: "w-24", w2: "w-14", mid: "Assessment 2/2", status: "Report ready", hero: false },
  { initials: "KM", w1: "w-28", w2: "w-16", mid: "Session 4:30", status: "Confirmed", hero: true },
  { initials: "DS", w1: "w-20", w2: "w-12", mid: "Intake call", status: "New", hero: false },
  { initials: "PL", w1: "w-24", w2: "w-16", mid: "Report draft", status: "Due Thu", hero: false },
]

export function ConsoleCaseload({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: "power3.out" } })

      // (1) canvas head line, then the stat cards rise in as a row
      tl.from(".cl-head", { autoAlpha: 0, y: 8, duration: 0.4 })
        .from(".cl-stat", { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.08 }, "<0.12")

      // stat numbers count up (proxy tweens)
      gsap.utils.toArray<HTMLElement>(".cl-num").forEach((el, i) => {
        const target = Number(el.dataset.count ?? "0")
        const proxy = { v: 0 }
        tl.fromTo(
          proxy,
          { v: 0 },
          {
            v: target,
            duration: 0.9,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = String(Math.round(proxy.v))
            },
          },
          0.4 + i * 0.09,
        )
      })

      // sparkline draws in the third card
      tl.fromTo(
        ".cl-spark",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" },
        0.5,
      )

      // (2) client table lands, rows cascade in
      tl.from(".cl-panel", { autoAlpha: 0, y: 14, duration: 0.5 }, 0.55)
        .from(".cl-row", { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.09 }, "<0.12")

      // (3) notification drops in top-right with overshoot
      tl.fromTo(
        ".cl-note",
        { autoAlpha: 0, y: -12 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: "back.out(1.4)" },
        "+=0.3",
      )

      // (4) the purple session chip acknowledges with one subtle pulse
      tl.fromTo(
        ".cl-chip-hero",
        { scale: 1 },
        { scale: 1.07, duration: 0.22, repeat: 1, yoyo: true, ease: "power2.inOut" },
        "+=0.2",
      )

      // ambience — the notification dot never stops breathing
      gsap.to(".cl-dot", {
        scale: 1.5,
        opacity: 0.55,
        duration: 0.85,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    }, rootRef)

    return () => ctx.revert()
  }, [active])

  return (
    <ConsoleFrame activeItem="Overview" title="Good morning" chips={<FrameChip>Tue 8 Jul</FrameChip>}>
      <div ref={rootRef} className="relative flex h-full w-full flex-col gap-3 px-5 py-4">
        {/* canvas head line */}
        <div className="cl-head flex items-center gap-2">
          <span className="mono text-[9px] uppercase tracking-[0.14em] text-ink-40">Tue 08 Jul · 09:04</span>
          <span className="hidden h-px w-4 bg-line sm:block" />
          <span className="mono hidden text-[9px] text-ink-40 sm:block">3 sessions ahead</span>
        </div>

        {/* full-width 3-stat row */}
        <div className="grid shrink-0 grid-cols-3 gap-3">
          <div className="cl-stat rounded-[10px] border border-line bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(11,11,11,0.04)]">
            <span className="mono block text-[8px] uppercase tracking-[0.12em] text-ink-40">Active clients</span>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <span className="cl-num text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums" data-count="14">
                14
              </span>
              <span className="mono pb-px text-[8px] text-ink-40">+2 wk</span>
            </div>
          </div>
          <div className="cl-stat rounded-[10px] border border-line bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(11,11,11,0.04)]">
            <span className="mono block text-[8px] uppercase tracking-[0.12em] text-ink-40">Today</span>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <span className="cl-num text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums" data-count="3">
                3
              </span>
              <span className="mono pb-px text-[8px] text-ink-40">next 4:30</span>
            </div>
          </div>
          <div className="cl-stat rounded-[10px] border border-line bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(11,11,11,0.04)]">
            <span className="mono block text-[8px] uppercase tracking-[0.12em] text-ink-40">Reports due</span>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <span className="cl-num text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums" data-count="2">
                2
              </span>
              <svg className="h-6 w-12 shrink-0 text-ink-20 sm:w-16" viewBox="0 0 64 24" fill="none" aria-hidden="true">
                <path
                  className="cl-spark"
                  d="M2 19 L11 14 L20 16 L30 9 L40 12 L51 5 L62 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray="1"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* full-width client table */}
        <div className="cl-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_1px_3px_rgba(11,11,11,0.04)]">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-3.5 py-2">
            <span className="mono text-[8px] uppercase tracking-[0.14em] text-ink-40">Clients</span>
            <span className="mono text-[8px] uppercase tracking-[0.14em] text-ink-40">4 of 14</span>
          </div>
          <div className="divide-y divide-line">
            {ROWS.map((r) => (
              <div key={r.initials} className="cl-row flex items-center gap-2.5 px-3.5 py-[9px]">
                <Avatar initials={r.initials} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={`h-2 rounded-full bg-ink/10 ${r.w1}`} />
                  <span className={`h-1.5 rounded-full bg-ink/5 ${r.w2}`} />
                </div>
                <span className={`${r.hero ? "flex" : "hidden sm:flex"} flex-1 justify-center`}>
                  {r.hero ? (
                    <span className="cl-chip-hero mono whitespace-nowrap rounded-full bg-growth px-2 py-0.5 text-[9px] font-medium text-white">
                      {r.mid}
                    </span>
                  ) : (
                    <span className="mono whitespace-nowrap rounded-full bg-ink/5 px-2 py-0.5 text-[9px] text-ink-40">{r.mid}</span>
                  )}
                </span>
                <span className="mono ml-auto whitespace-nowrap rounded-full border border-line bg-paper px-2 py-0.5 text-[9px] text-ink-60">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex shrink-0 items-center justify-between border-t border-line px-3.5 py-2">
            <span className="mono text-[8px] uppercase tracking-[0.12em] text-ink-40">Sorted · next session</span>
            <span className="mono text-[8px] text-ink-40">View all →</span>
          </div>
        </div>

        {/* notification — drops in top-right over the canvas */}
        <div className="cl-note absolute right-4 top-3 z-10 flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2 shadow-[0_14px_30px_-14px_rgba(11,11,11,0.3)]">
          <span className="cl-dot size-1.5 rounded-full bg-decline" />
          <span className="mono text-[9px] text-ink-60">New booking · Ananya, 4:30</span>
        </div>
      </div>
    </ConsoleFrame>
  )
}
