import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { ConsoleFrame, FrameChip } from "../tour/AppFrame"

/**
 * Compass — the AI copilot over the whole practice, staged as the real
 * Assistant screen in the counsellor console: answer thread top-centre,
 * command pill pinned to the bottom edge like the live product.
 * Authored in its finished state; the GSAP loop animates into it.
 */
export function ConsoleCompass({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      // ambient: sonar pulse behind the compass logomark — never stops
      gsap.fromTo(
        ".pulse",
        { scale: 0.5, autoAlpha: 0.6 },
        { scale: 2.1, autoAlpha: 0, duration: 1.8, repeat: -1, ease: "power1.out" },
      )

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9, defaults: { ease: "power3.out" } })

      // 1 — the command pill rises in, the hint row fading just behind it
      tl.from(".pill", { autoAlpha: 0, y: 20, duration: 0.55 })
        .from(".hint", { autoAlpha: 0, duration: 0.4 }, "<0.1")

        // 2 — the query types in character-groups, caret blinking at the edge
        .to(".caret", { autoAlpha: 1, duration: 0.1 }, "<0.35")
        .from(".q", { autoAlpha: 0, duration: 0.01, stagger: 0.17, ease: "none" }, "<0.05")
        .to(".caret", { autoAlpha: 0, duration: 0.3, repeat: 3, yoyo: true, ease: "steps(1)" }, "<")

        // 3 — send press: the query echoes into the thread, thinking dots breathe
        .to(".send", { scale: 0.78, duration: 0.12, ease: "power2.in" }, "+=0.3")
        .to(".send", { scale: 1, duration: 0.35, ease: "back.out(3)" })
        .set(".caret", { autoAlpha: 0 }, "<")
        .from(".bubble", { autoAlpha: 0, y: 10, duration: 0.45 }, "<")
        .to(".think", { autoAlpha: 1, duration: 0.18 }, "<")
        .to(".think-dot", {
          y: -3.5,
          duration: 0.24,
          ease: "sine.inOut",
          stagger: { each: 0.1, repeat: 3, yoyo: true },
        }, "<0.1")
        .to(".think", { autoAlpha: 0, duration: 0.16 })

        // 4 — the answer card lands with a slight overshoot
        .from(".card", { autoAlpha: 0, y: 22, scale: 0.97, duration: 0.6, ease: "back.out(1.5)" }, "<0.05")
        .from(".stat", { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.09 }, "<0.15")
        .addLabel("answer", "<0.05")

      // numbers count up (proxy → textContent; transforms/opacity elsewhere)
      gsap.utils.toArray<HTMLElement>(".num", rootRef.current!).forEach((el) => {
        const target = Number(el.getAttribute("data-n") ?? "0")
        const proxy = { v: 0 }
        tl.to(proxy, {
          v: target,
          duration: 0.7,
          ease: "power2.out",
          onUpdate: () => { el.textContent = String(Math.round(proxy.v)) },
        }, "answer")
      })

      // summary bars cascade, chips pop, the purple one pulses once
      tl.from(".sum", { scaleX: 0, transformOrigin: "left center", duration: 0.65, stagger: 0.12 }, "answer+=0.12")
        .from(".chip", { autoAlpha: 0, scale: 0.7, duration: 0.4, ease: "back.out(2.2)", stagger: 0.09 }, ">-0.2")
        .from(".foot", { autoAlpha: 0, duration: 0.45 }, "<0.1")
        .to(".chip-hero", { scale: 1.06, duration: 0.16, repeat: 1, yoyo: true, ease: "power2.inOut" }, "+=0.2")
    }, rootRef)
    return () => ctx.revert()
  }, [active])

  return (
    <ConsoleFrame
      activeItem="Assistant"
      title="Compass"
      chips={<FrameChip>Grounded in your caseload</FrameChip>}
    >
      <div ref={rootRef} className="flex h-full w-full flex-col px-4 sm:px-6">

        {/* ── answer thread — top-centre ─────────────────────────────── */}
        <div className="mx-auto mt-6 flex min-h-0 w-full max-w-[560px] flex-1 flex-col">

          {/* thread micro-header */}
          <div className="flex items-center justify-between">
            <span className="mono text-[8.5px] uppercase tracking-[0.12em] text-ink-40">Today · Tue</span>
            <span className="mono text-[8.5px] uppercase tracking-[0.12em] text-ink-20">⌘K</span>
          </div>

          {/* the sent query, echoed as a bubble */}
          <div className="bubble mt-3 self-end rounded-[10px] rounded-br-[3px] border border-line bg-white px-3 py-1.5 text-[11px] text-ink-60 shadow-[0_6px_16px_-10px_rgba(11,11,11,0.2)]">
            Summarise my day
          </div>

          {/* ── answer card ──────────────────────────────────────────── */}
          <div className="card mt-3 rounded-[12px] border border-line bg-paper-pure p-4 shadow-[0_14px_32px_-20px_rgba(11,11,11,0.3)] sm:p-5">
            {/* card header */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ink">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 0.6 6.2 3.8 9.4 5 6.2 6.2 5 9.4 3.8 6.2 0.6 5 3.8 3.8Z" fill="#faf9f6" />
                  </svg>
                </span>
                <span className="text-[10px] font-medium text-ink">Compass</span>
              </span>
              <span className="mono text-[8.5px] tabular-nums text-ink-40">09:12</span>
            </div>

            {/* the two big counted numbers */}
            <div className="mt-3.5 flex items-end gap-7">
              <div className="stat">
                <div className="mono text-[28px] font-medium leading-none tabular-nums text-ink">
                  <span className="num" data-n="3">3</span>
                </div>
                <div className="mt-1.5 text-[10px] text-ink-40">sessions today</div>
              </div>
              <div className="stat border-l border-line pl-7">
                <div className="mono text-[28px] font-medium leading-none tabular-nums text-ink">
                  <span className="num" data-n="2">2</span>
                </div>
                <div className="mt-1.5 text-[10px] text-ink-40">reports due</div>
              </div>
            </div>

            {/* placeholder summary lines */}
            <div className="mt-4 space-y-2">
              <div className="sum h-2 w-full rounded-full bg-ink/10" />
              <div className="sum h-2 w-11/12 rounded-full bg-ink/10" />
              <div className="sum h-2 w-3/4 rounded-full bg-ink/10" />
            </div>

            {/* quick actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip chip-hero inline-flex items-center gap-1.5 rounded-full bg-growth px-3 py-1.5 text-[11px] font-medium text-white">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 1.5 8.5 5 2 8.5V1.5Z" fill="currentColor" />
                </svg>
                Start session
              </span>
              <span className="chip inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink-60">
                Draft report
              </span>
              <span className="chip inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink-60">
                Open calendar
              </span>
            </div>

            <div className="foot mt-4 flex items-center justify-between border-t border-line pt-2.5">
              <span className="mono text-[9px] uppercase tracking-[0.08em] text-ink-40">
                Compass · grounded in your caseload
              </span>
              <span className="mono text-[8.5px] uppercase tracking-[0.08em] text-ink-20">3 sources</span>
            </div>
          </div>
        </div>

        {/* ── faint hint row above the pill ──────────────────────────── */}
        <div className="hint mx-auto mb-1.5 w-full max-w-[560px] px-1">
          <span className="mono text-[8.5px] uppercase tracking-[0.1em] text-ink-20">
            Answers cite sessions, notes &amp; reports
          </span>
        </div>

        {/* ── command pill — pinned bottom-centre ────────────────────── */}
        <div className="pill mx-auto mb-5 flex w-full max-w-[560px] items-center gap-3 rounded-full border border-line bg-white py-2.5 pl-4 pr-2.5 shadow-[0_14px_32px_-18px_rgba(11,11,11,0.35)]">
          {/* compass logomark with sonar pulse */}
          <span className="relative grid size-6 shrink-0 place-items-center">
            <span className="pulse absolute inset-0 rounded-full border border-growth/50 opacity-0" />
            <span className="grid size-6 place-items-center rounded-full bg-ink">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 0.6 6.2 3.8 9.4 5 6.2 6.2 5 9.4 3.8 6.2 0.6 5 3.8 3.8Z" fill="#faf9f6" />
              </svg>
            </span>
          </span>

          {/* typed query — revealed in character-groups */}
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px] text-ink">
            <span className="q">Summa</span>
            <span className="q">rise&nbsp;</span>
            <span className="q">my&nbsp;</span>
            <span className="q">day</span>
            <span className="caret ml-px inline-block h-[14px] w-px translate-y-[2.5px] bg-ink opacity-0" />
          </span>

          {/* thinking dots — transient, hidden at rest */}
          <span className="think flex items-center gap-1 opacity-0">
            <span className="think-dot size-1 rounded-full bg-ink-40" />
            <span className="think-dot size-1 rounded-full bg-ink-40" />
            <span className="think-dot size-1 rounded-full bg-ink-40" />
          </span>

          {/* send */}
          <span className="send grid size-7 shrink-0 place-items-center rounded-full bg-growth">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 9.5V2.5M6 2.5 2.8 5.7M6 2.5l3.2 3.2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

      </div>
    </ConsoleFrame>
  )
}
