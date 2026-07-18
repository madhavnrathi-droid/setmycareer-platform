import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"

/* Counsellor console — the live session room, full-bleed. The call surface
   fills the entire stage as its own dark screen: top bar (LIVE dot + ticking
   timer, session label), two video tiles side by side (drifting feed-sheen,
   name chips, speaking waveform), a one-line live-transcript strip, and a
   bottom-center control bar. The payoff is a "Noted · 24:10" chip that stamps
   into the control bar — timestamped notes write themselves. Authored in its
   resolved state; GSAP animates INTO it and loops. Transforms + opacity only.
   Reduced-motion holds the finished frame. */

function Mic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[10px]" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

function Cam() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[11px]" aria-hidden>
      <rect x="2" y="6" width="13" height="12" rx="2.5" />
      <path d="m15 10 6-3.5v11L15 14" />
    </svg>
  )
}

function Dots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[11px]" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

function Leave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-[11px]" aria-hidden>
      <path d="M3 14.5c5.5-5 12.5-5 18 0" />
      <path d="M3 14.5v3.2l4-1v-3.4M21 14.5v3.2l-4-1v-3.4" />
    </svg>
  )
}

/* a fake camera feed: gradient ground, drifting sheen, head + shoulders */
function Feed({ tone }: { tone: [string, string, string, string] }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(160deg,${tone[0]},${tone[1]} 72%)` }} />
      <span aria-hidden className="sheen absolute inset-0" style={{ background: "radial-gradient(46% 50% at 50% 38%, rgba(255,255,255,0.16), transparent 70%)" }} />
      <span aria-hidden className="absolute left-1/2 top-[56%] h-[58%] w-[62%] -translate-x-1/2 rounded-t-[999px]" style={{ background: `linear-gradient(180deg,${tone[2]},${tone[3]})` }} />
      <span aria-hidden className="absolute left-1/2 top-[26%] size-[24%] -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(160deg,${tone[2]},${tone[3]})` }} />
    </>
  )
}

export function ConsoleSession({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      /* ── continuous ambience (independent of the beat timeline) ── */
      // LIVE + transcript dots pulse
      gsap.to(".pulse-dot", { autoAlpha: 0.3, scale: 0.7, duration: 0.7, ease: "sine.inOut", repeat: -1, yoyo: true, transformOrigin: "center" })
      // session timer ticks up from 24:12
      const timerEl = rootRef.current?.querySelector<HTMLElement>(".timer") ?? null
      const clock = { t: 1452 } // 24:12
      gsap.to(clock, {
        t: 1512, duration: 60, ease: "none", repeat: -1,
        onUpdate: () => {
          if (timerEl) timerEl.textContent = `${Math.floor(clock.t / 60)}:${String(Math.floor(clock.t % 60)).padStart(2, "0")}`
        },
      })
      // camera-feed sheens drift across the tiles (slightly out of phase)
      gsap.fromTo(".sheen", { xPercent: -16, yPercent: -10 }, { xPercent: 18, yPercent: 12, duration: 3.8, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.9 })
      // speaking waveform in Ananya's name chip
      gsap.to(".wave-bar", { scaleY: 0.3, duration: 0.32, ease: "sine.inOut", repeat: -1, yoyo: true, transformOrigin: "center bottom", stagger: { each: 0.08, from: "center" } })

      /* ── the beat timeline ── */
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7, defaults: { ease: "power3.out" } })
      tl.from(".call-top", { autoAlpha: 0, y: -10, duration: 0.45 })
        .from(".vid-tile", { autoAlpha: 0, y: 14, scale: 0.96, duration: 0.55, stagger: 0.12 }, "<0.1")
        .from(".wave-row", { autoAlpha: 0, y: 6, duration: 0.4 }, "<0.3")
        .from(".t-strip", { autoAlpha: 0, y: 10, duration: 0.5 }, "<0.05")
        // caption segments arrive one by one, like live captions
        .from(".t-seg", { autoAlpha: 0, y: 8, duration: 0.45, stagger: 0.5 }, "<0.3")
        .from(".call-bar", { autoAlpha: 0, y: 12, duration: 0.5 }, "<0.2")
        // payoff — the note stamps itself into the control bar
        .fromTo(".note-chip", { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.4)" }, "+=0.35")
        .to({}, { duration: 1.6 }) // hold, then loop
    }, rootRef)

    return () => ctx.revert()
  }, [active])

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Live counselling session room: two-way video call with a live transcript strip and an automatically captured, timestamped note"
      className="flex h-full w-full flex-col bg-[#161615] text-left"
    >
      {/* ── top bar — LIVE, ticking timer, session label ── */}
      <div className="call-top flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-[3px]">
          <span className="pulse-dot size-1.5 rounded-full bg-decline" />
          <span className="mono text-[8.5px] uppercase tracking-[0.14em] text-white/50">Live</span>
          <span className="mono timer text-[10px] tabular-nums text-white/70">24:12</span>
        </span>
        <span className="mono hidden text-[8.5px] uppercase tracking-[0.14em] text-white/25 sm:block">Discovery session · encrypted</span>
        <span className="ml-auto truncate text-[11px] font-medium text-white/60">Ananya S · Session 4</span>
      </div>

      {/* ── the call — two video tiles side by side ── */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2 sm:gap-2.5 sm:p-3">
        {/* Ananya — speaking */}
        <div className="vid-tile relative h-full min-h-0 overflow-hidden rounded-[10px] border border-white/10 bg-ink">
          <Feed tone={["#2c2c2c", "#101010", "#3a3a3a", "#1c1c1c"]} />
          {/* connection bars */}
          <span aria-hidden className="absolute right-2 top-2 flex items-end gap-[2px]">
            <span className="block h-[4px] w-[2.5px] rounded-full bg-white/40" />
            <span className="block h-[6px] w-[2.5px] rounded-full bg-white/40" />
            <span className="block h-[8px] w-[2.5px] rounded-full bg-white/40" />
          </span>
          {/* name chip + speaking waveform */}
          <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full bg-ink/70 py-[4px] pl-2 pr-2.5 backdrop-blur-sm">
            <span className="text-white/80"><Mic /></span>
            <span className="truncate text-[10px] font-medium text-white">Ananya S</span>
            <span className="wave-row flex h-[10px] shrink-0 items-end gap-[2px]" aria-hidden>
              <span className="wave-bar block w-[2px] rounded-full bg-white/80" style={{ height: 4 }} />
              <span className="wave-bar block w-[2px] rounded-full bg-white/80" style={{ height: 8 }} />
              <span className="wave-bar block w-[2px] rounded-full bg-white/80" style={{ height: 10 }} />
              <span className="wave-bar block w-[2px] rounded-full bg-white/80" style={{ height: 6 }} />
              <span className="wave-bar block w-[2px] rounded-full bg-white/80" style={{ height: 4 }} />
            </span>
          </span>
        </div>

        {/* Dr. Meera — the navigator's own feed */}
        <div className="vid-tile relative h-full min-h-0 overflow-hidden rounded-[10px] border border-white/10 bg-ink">
          <Feed tone={["#262624", "#0e0e0d", "#33332f", "#191918"]} />
          <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full bg-ink/70 py-[4px] pl-2 pr-2.5 backdrop-blur-sm">
            <span className="text-white/80"><Mic /></span>
            <span className="truncate text-[10px] font-medium text-white">Dr. Meera · You</span>
          </span>
        </div>
      </div>

      {/* ── one-line live transcript strip ── */}
      <div className="t-strip flex shrink-0 items-center gap-2 px-3 pb-2 sm:px-4">
        <span className="pulse-dot size-1 shrink-0 rounded-full bg-decline" />
        <span className="mono shrink-0 text-[8.5px] uppercase tracking-[0.14em] text-white/40">Transcript</span>
        <span className="mono shrink-0 text-[9px] tabular-nums text-white/50">24:10</span>
        <span aria-hidden className="t-seg h-1.5 w-[26%] rounded-full bg-white/15" />
        <span aria-hidden className="t-seg h-1.5 w-[18%] rounded-full bg-white/15" />
        {/* the marked span — the moment the note captures */}
        <span aria-hidden className="t-seg h-1.5 w-[30%] rounded-full bg-white/30" />
      </div>

      {/* ── bottom control bar — controls centered, the note stamps in right ── */}
      <div className="call-bar grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-white/10 px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="mono hidden text-[8.5px] uppercase tracking-[0.14em] text-white/25 sm:block">Room smc-4f2a</span>
        <span className="col-start-2 flex items-center gap-1.5 sm:gap-2">
          <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/80"><Mic /></span>
          <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/80"><Cam /></span>
          <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/60"><Dots /></span>
          <span className="grid h-7 w-10 place-items-center rounded-full bg-decline text-white"><Leave /></span>
        </span>
        {/* payoff — the note writes itself */}
        <span className="note-chip col-start-3 flex min-w-0 items-center gap-1.5 justify-self-end rounded-full border border-white/15 bg-white/[0.06] py-[4px] pl-1.5 pr-2.5">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-growth text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-[8px]" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span className="mono shrink-0 text-[8.5px] uppercase tracking-[0.12em] text-white/60">Noted · 24:10</span>
          <span className="hidden truncate text-[10px] font-medium text-growth md:block">aptitude: analytical</span>
        </span>
      </div>
    </div>
  )
}
