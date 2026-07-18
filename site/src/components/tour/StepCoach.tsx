import { type JSX, useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { PortalFrame, FrameChip } from "./AppFrame"

/* Step 03 — the AI career coach, staged as the client portal's full "AI guide"
   screen: portal shell (sidebar + topbar), a slim coach status strip, a
   bottom-anchored transcript column, and a composer pinned to the bottom edge.
   The beats are unchanged: the client asks one short question, the coach
   "thinks" for a beat, then answers with a grounded match card (Data Science ·
   92%, a filling bar) plus one line. A 5-bar voice waveform pulses continuously
   to signal "chat or talk". The single purple accent is the mic/send pill.
   Authored in its finished frame; GSAP animates INTO it and loops.
   Reduced-motion holds the resolved DOM. */

export function StepCoach({ active }: { active: boolean }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef)
      const pctEl = q(".match-pct")[0] as HTMLElement | undefined
      const pct = { v: 0 }

      // continuous voice waveform — bars bob from the input baseline, staggered from centre
      gsap.fromTo(
        ".wave-bar",
        { scaleY: 0.32 },
        { scaleY: 1, transformOrigin: "50% 100%", ease: "sine.inOut", duration: 0.5, repeat: -1, yoyo: true, stagger: { each: 0.09, from: "center" } },
      )
      // the purple pill breathes gently to read as the live action
      gsap.to(".send-pill", { scale: 1.06, transformOrigin: "center", ease: "sine.inOut", duration: 1.1, repeat: -1, yoyo: true })

      // narrative: question → typing beat → grounded answer → hold → repeat
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: "power3.out" } })
      tl.set(".typing", { autoAlpha: 0 })
        .from(".msg-user", { autoAlpha: 0, y: 12, duration: 0.5 })
        // typing indicator appears and the three dots bounce for a beat
        .to(".typing", { autoAlpha: 1, duration: 0.3 }, "+=0.25")
        .fromTo(
          ".typing-dot",
          { opacity: 0.3, y: 0 },
          { opacity: 1, y: -3, duration: 0.34, ease: "sine.inOut", stagger: { each: 0.12, repeat: 3, yoyo: true } },
          "<",
        )
        .to(".typing", { autoAlpha: 0, duration: 0.25 }, "+=0.35")
        // the grounded answer rises in
        .from(
          ".msg-ai",
          {
            autoAlpha: 0,
            y: 12,
            duration: 0.5,
            onStart: () => {
              pct.v = 0
              if (pctEl) pctEl.textContent = "0%"
            },
          },
          "-=0.05",
        )
        // match bar fills + percentage counts up
        .fromTo(".match-bar", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 0.8 }, "<0.15")
        .to(
          pct,
          {
            v: 92,
            duration: 0.8,
            ease: "power2.out",
            onUpdate: () => {
              if (pctEl) pctEl.textContent = Math.round(pct.v) + "%"
            },
          },
          "<",
        )
        // suggestion chips settle in under the answer
        .from(".coach-chip", { autoAlpha: 0, y: 6, duration: 0.35, stagger: 0.08 }, "-=0.25")
        // hold on the finished frame before the loop resets
        .to({}, { duration: 1.4 })
    }, rootRef)
    return () => ctx.revert()
  }, [active])

  return (
    <PortalFrame activeItem="AI guide" title="AI career guide" chips={<FrameChip>Grounded in your results</FrameChip>}>
      <div ref={rootRef} className="flex h-full w-full flex-col bg-paper">
        {/* ── coach status strip ── */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-paper-pure px-4 py-2 sm:px-6">
          <span className="mono grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-medium text-paper">AI</span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11.5px] font-medium tracking-tight text-ink">Career coach</div>
            <div className="mono truncate text-[8.5px] uppercase tracking-[0.12em] text-ink-40">Aptitude · interests · report</div>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-decline" />
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-ink-40">Live</span>
          </span>
        </div>

        {/* ── transcript — bottom-anchored like a real chat ── */}
        <div className="mx-auto flex min-h-0 w-full max-w-[620px] flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-4 sm:px-6">
          {/* day divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="mono text-[9px] uppercase tracking-[0.14em] text-ink-40">Today</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* earlier coach turn — placeholder bars, reads as prior conversation */}
          <div className="flex justify-start">
            <div className="w-[62%] max-w-[300px] space-y-2 rounded-[12px] rounded-tl-[4px] border border-line bg-paper-pure px-3.5 py-2.5 shadow-[0_1px_4px_rgba(11,11,11,0.04)]">
              <span className="block h-2 w-full rounded-full bg-ink/10" />
              <span className="block h-2 w-3/4 rounded-full bg-ink/10" />
            </div>
          </div>

          {/* client question (right, ink) */}
          <div className="msg-user flex justify-end">
            <div className="max-w-[75%] rounded-[12px] rounded-tr-[4px] bg-ink px-4 py-2 text-[13.5px] leading-snug text-paper shadow-[0_2px_8px_rgba(11,11,11,0.12)]">
              Which stream fits me?
            </div>
          </div>

          {/* typing indicator — hidden in the resolved frame, shown mid-motion */}
          <div className="typing flex justify-start opacity-0">
            <div className="flex items-center gap-1.5 rounded-[12px] rounded-tl-[4px] border border-line bg-paper-pure px-3 py-2.5">
              <span className="typing-dot size-2 rounded-full bg-ink-40" />
              <span className="typing-dot size-2 rounded-full bg-ink-40" />
              <span className="typing-dot size-2 rounded-full bg-ink-40" />
            </div>
          </div>

          {/* the answer (left, paper card) with the grounded match card */}
          <div className="msg-ai flex justify-start">
            <div className="max-w-[86%] space-y-2.5 rounded-[12px] rounded-tl-[4px] border border-line bg-paper-pure px-3.5 py-3 shadow-[0_2px_10px_rgba(11,11,11,0.05)] sm:max-w-[78%]">
              <div className="rounded-[10px] border border-line bg-paper px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium tracking-tight text-ink">Data Science</span>
                  <span className="match-pct mono text-[13px] font-medium tabular-nums text-ink">92%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                  <div className="match-bar h-full w-[92%] origin-left rounded-full bg-ink" />
                </div>
                <div className="mono mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-ink-40">
                  <span>Top match</span>
                  <span>Report · p.14</span>
                </div>
              </div>
              <p className="text-[12.5px] leading-snug text-ink-60">Your aptitude and interests point here.</p>
            </div>
          </div>

          {/* quick follow-up chips */}
          <div className="flex justify-start gap-1.5 pl-0.5">
            <span className="coach-chip rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-medium text-ink-60">Why this match</span>
            <span className="coach-chip rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-medium text-ink-60">Other options</span>
          </div>
        </div>

        {/* ── composer — pinned to the bottom edge ── */}
        <div className="shrink-0 border-t border-line bg-paper-pure px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-[620px] items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-paper px-3 py-2.5">
              <span className="h-2 min-w-0 flex-1 rounded-full bg-ink/10" />
              {/* 5-bar voice waveform */}
              <span className="flex h-5 shrink-0 items-end gap-[3px]" aria-hidden>
                <span className="wave-bar w-[3px] rounded-full bg-ink-40" style={{ height: 8 }} />
                <span className="wave-bar w-[3px] rounded-full bg-ink-40" style={{ height: 13 }} />
                <span className="wave-bar w-[3px] rounded-full bg-ink-40" style={{ height: 19 }} />
                <span className="wave-bar w-[3px] rounded-full bg-ink-40" style={{ height: 13 }} />
                <span className="wave-bar w-[3px] rounded-full bg-ink-40" style={{ height: 8 }} />
              </span>
            </div>
            <button className="send-pill grid size-9 shrink-0 place-items-center rounded-full bg-growth text-paper" aria-label="Talk to coach">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0" />
                <path d="M12 17v3.2" />
              </svg>
            </button>
          </div>
          <div className="mono mx-auto mt-1.5 w-full max-w-[620px] text-[8.5px] uppercase tracking-[0.12em] text-ink-20">Chat or talk · answers cite your report</div>
        </div>
      </div>
    </PortalFrame>
  )
}
