import { useLayoutEffect, useRef, type JSX } from "react"
import { gsap } from "gsap"
import { PortalFrame, FrameChip } from "./AppFrame"

/* Step 04 — a live counsellor video session (LiveKit-style), full-frame in the
   REAL portal shell. Two 16:9 "camera feed" tiles fill the canvas (counsellor +
   you), an in-canvas LIVE badge + running timer, a control bar, and a one-line
   transcript that types in then swaps. Monochrome except the LIVE dot + leave
   button (bg-decline). Authored in its resolved look; GSAP animates INTO it and
   loops (reduced-motion holds it). Transforms + opacity only. */

const LINE_1 = ["So", "your", "aptitude", "leans", "analytical—"]
const LINE_2 = ["—which", "points", "toward", "research", "roles."]

function Mic({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[11px]" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      {muted && <path d="M4 3l16 16" />}
    </svg>
  )
}

export function StepSession({ active }: { active: boolean }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const timerEl = rootRef.current?.querySelector<HTMLElement>(".timer") ?? null
      const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`

      /* ── ambient loops (independent of the beat timeline) ── */
      const clock = { t: 724 }
      gsap.to(clock, { t: 784, duration: 60, ease: "none", repeat: -1, onUpdate: () => { if (timerEl) timerEl.textContent = fmt(clock.t) } })
      gsap.to(".live-dot", { autoAlpha: 0.3, scale: 0.75, duration: 0.75, ease: "sine.inOut", repeat: -1, yoyo: true, transformOrigin: "center" })
      gsap.fromTo(".sheen-a", { xPercent: -18, yPercent: -10 }, { xPercent: 20, yPercent: 12, duration: 3.6, ease: "sine.inOut", repeat: -1, yoyo: true })
      gsap.fromTo(".sheen-b", { xPercent: 16, yPercent: 12 }, { xPercent: -20, yPercent: -8, duration: 4.2, ease: "sine.inOut", repeat: -1, yoyo: true })
      gsap.to(".wave-bar", { scaleY: 0.32, duration: 0.34, ease: "sine.inOut", repeat: -1, yoyo: true, transformOrigin: "center bottom", stagger: { each: 0.08, from: "center" } })

      /* ── the beat timeline ── */
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, defaults: { ease: "power3.out" } })
      tl.set(".line-1", { autoAlpha: 1, y: 0 })
        .set(".line-2", { autoAlpha: 0 }, 0)
        .from(".t-head", { autoAlpha: 0, y: -6, duration: 0.45 }, 0)
        .from(".tile", { autoAlpha: 0, scale: 0.96, y: 12, duration: 0.55, stagger: 0.12 }, 0.05)
        .from(".tstrip", { autoAlpha: 0, y: 10, duration: 0.45 }, "<0.15")
        .from(".ctl", { autoAlpha: 0, y: 8, scale: 0.9, duration: 0.4, stagger: 0.06 }, "<0.05")
        .fromTo(".w1", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05 }, "+=0.05")
        .to({}, { duration: 1.5 })
        .to(".line-1", { autoAlpha: 0, y: -5, duration: 0.4 })
        .set(".line-2", { autoAlpha: 1 }, "<0.12")
        .fromTo(".w2", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05 }, "<")
        .to({}, { duration: 1.7 })
    }, rootRef)

    return () => ctx.revert()
  }, [active])

  const tileBase = "tile relative min-h-0 overflow-hidden rounded-[10px] border border-line bg-ink"

  return (
    <PortalFrame activeItem="Sessions" title="Counsellor session" chips={<FrameChip>60 min</FrameChip>}>
      <div ref={rootRef} className="flex h-full w-full flex-col p-3 sm:p-4 md:p-5">

        {/* ── status row: LIVE + who + timer ── */}
        <div className="t-head flex shrink-0 items-center justify-between pb-2.5">
          <span className="flex items-center gap-1.5">
            <span className="live-dot size-1.5 rounded-full bg-decline" />
            <span className="mono text-[10px] uppercase tracking-[0.16em] text-ink-60">Live</span>
            <span className="mono ml-1.5 text-[10px] text-ink-40">· Session 4 · Ananya S</span>
          </span>
          <span className="mono timer text-[11.5px] tabular-nums text-ink-60">12:04</span>
        </div>

        {/* ── two camera-feed tiles, filling the canvas ── */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 sm:gap-3">
          {/* counsellor (active speaker) */}
          <div className={tileBase}>
            <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(160deg,#2c2c2c,#101010 72%)" }} />
            <span aria-hidden className="sheen-a absolute inset-0" style={{ background: "radial-gradient(42% 46% at 50% 38%, rgba(255,255,255,0.20), transparent 70%)" }} />
            <span aria-hidden className="absolute left-1/2 top-[52%] h-[58%] w-[64%] -translate-x-1/2 rounded-t-[999px]" style={{ background: "linear-gradient(180deg,#3a3a3a,#1c1c1c)" }} />
            <span aria-hidden className="absolute left-1/2 top-[22%] size-[24%] -translate-x-1/2 rounded-full" style={{ background: "linear-gradient(160deg,#454545,#242424)" }} />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink/70 py-[3px] pl-1.5 pr-2 backdrop-blur-sm">
              <span className="text-paper-pure"><Mic /></span>
              <span className="text-[9.5px] font-medium text-paper-pure">Counsellor</span>
              <span aria-hidden className="ml-0.5 flex items-end gap-[2px]">
                {[6, 10, 13, 9, 6].map((h, i) => <span key={i} className="wave-bar block w-[2px] rounded-full bg-paper-pure/90" style={{ height: h }} />)}
              </span>
            </span>
          </div>

          {/* you */}
          <div className={tileBase}>
            <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(150deg,#272727,#0d0d0d 72%)" }} />
            <span aria-hidden className="sheen-b absolute inset-0" style={{ background: "radial-gradient(44% 48% at 54% 40%, rgba(255,255,255,0.16), transparent 70%)" }} />
            <span aria-hidden className="absolute left-1/2 top-[54%] h-[56%] w-[62%] -translate-x-1/2 rounded-t-[999px]" style={{ background: "linear-gradient(180deg,#343434,#181818)" }} />
            <span aria-hidden className="absolute left-1/2 top-[24%] size-[23%] -translate-x-1/2 rounded-full" style={{ background: "linear-gradient(160deg,#3f3f3f,#202020)" }} />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink/70 py-[3px] pl-1.5 pr-2 backdrop-blur-sm">
              <span className="text-paper-pure/70"><Mic muted /></span>
              <span className="text-[9.5px] font-medium text-paper-pure">You</span>
            </span>
          </div>
        </div>

        {/* ── transcript strip (full-width) ── */}
        <div className="tstrip mt-2.5 shrink-0 rounded-[8px] border border-line bg-paper px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="mono shrink-0 text-[8.5px] uppercase tracking-[0.14em] text-ink-40">Live transcript</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="relative mt-1 min-h-[1.6em]">
            <p className="line-1 absolute inset-x-0 top-0 text-[12px] leading-snug text-ink-80">
              <span className="mr-1 text-ink-40">Counsellor</span>
              {LINE_1.map((w, i) => <span key={i} className="w1 inline-block">{w}&nbsp;</span>)}
            </p>
            <p className="line-2 absolute inset-x-0 top-0 text-[12px] leading-snug text-ink-80" style={{ opacity: 0 }}>
              <span className="mr-1 text-ink-40">Counsellor</span>
              {LINE_2.map((w, i) => <span key={i} className="w2 inline-block">{w}&nbsp;</span>)}
            </p>
          </div>
        </div>

        {/* ── control bar ── */}
        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-2.5">
          <span className="ctl grid size-8 place-items-center rounded-full border border-line bg-paper-pure text-ink-60"><Mic /></span>
          <span className="ctl grid size-8 place-items-center rounded-full border border-line bg-paper-pure text-ink-60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[12px]" aria-hidden>
              <rect x="2" y="6" width="13" height="12" rx="2" /><path d="M22 8l-5 4 5 4V8z" />
            </svg>
          </span>
          <span className="ctl grid size-8 place-items-center rounded-full bg-decline text-paper-pure">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[13px]" style={{ transform: "rotate(135deg)" }} aria-hidden>
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" />
            </svg>
          </span>
        </div>

      </div>
    </PortalFrame>
  )
}
