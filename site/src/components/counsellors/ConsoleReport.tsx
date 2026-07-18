import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { ConsoleFrame, FrameChip } from "../tour/AppFrame"

// ── Console tour · Report screen ─────────────────────────────────────────────
// FULL-FRAME: the counsellor console shell (sidebar + topbar) with the report
// editor filling the whole canvas — a believable full screen, edge to edge.
// The AI drafts the career report; the counsellor owns it. Match ring draws to
// 92%, strength bars fill, paragraph placeholder lines stream in like typing,
// a caret blinks while one line is edited by the human, then the in-canvas
// purple "Share to client" pill presses and a "Sent ✓" chip pops.
// Authored in its finished state; GSAP animates into it and loops.

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R // ≈ 163.36
const MATCH = 0.92

const BARS = [
  { label: "w-16", level: "w-[88%]", pct: "88" },
  { label: "w-12", level: "w-[72%]", pct: "72" },
  { label: "w-14", level: "w-[61%]", pct: "61" },
  { label: "w-10", level: "w-[54%]", pct: "54" },
]

export function ConsoleReport({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      const pctEl = rootRef.current?.querySelector(".pct")
      const pct = { v: MATCH * 100 }

      // ambience — the footer's "AI" dot breathes forever, independent of the loop
      gsap.to(".pulse-dot", { autoAlpha: 0.25, duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut" })

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9, defaults: { ease: "power3.out" } })

      // 1 · document header row drops in
      tl.from(".tb", { autoAlpha: 0, y: -8, duration: 0.45, stagger: 0.06 })
        // 2 · page sections rise
        .from(".seg", { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.08 }, "<0.15")
        // 3 · AI drafting — paragraph lines stream in like typed text
        .fromTo(
          ".tline",
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 0.3, ease: "power1.out", stagger: 0.055 },
          "<0.25",
        )
        // 4 · match ring draws to 92% while the number counts, strength bars fill
        .fromTo(
          ".ring-arc",
          { strokeDashoffset: RING_C },
          { strokeDashoffset: RING_C * (1 - MATCH), duration: 0.9, ease: "power2.inOut" },
          "<0.35",
        )
        .fromTo(
          pct,
          { v: 0 },
          {
            v: MATCH * 100,
            duration: 0.9,
            ease: "power2.inOut",
            onUpdate: () => {
              if (pctEl) pctEl.textContent = `${Math.round(pct.v)}%`
            },
          },
          "<",
        )
        .fromTo(
          ".fill",
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 0.7, stagger: 0.08 },
          "<0.1",
        )
        // 5 · the human touch — caret blinks, the edited line grows a little
        .to(".caret", { autoAlpha: 0, duration: 0.22, repeat: 5, yoyo: true, ease: "steps(1)" }, "+=0.3")
        .to(".edited-bar", { scaleX: 1.06, transformOrigin: "left center", duration: 0.45, ease: "power2.out" }, "<0.4")
        // 6 · share — the purple pill presses, "Sent ✓" pops beside it
        .to(".share-pill", { scale: 0.94, duration: 0.12, ease: "power2.in" }, "+=0.25")
        .to(".share-pill", { scale: 1, duration: 0.32, ease: "back.out(3)" })
        .fromTo(
          ".sent-chip",
          { autoAlpha: 0, scale: 0.6, x: -4 },
          { autoAlpha: 1, scale: 1, x: 0, duration: 0.4, ease: "back.out(2.4)" },
          "<0.05",
        )
        // short hold before the loop repeats
        .to({}, { duration: 0.6 })
    }, rootRef)
    return () => ctx.revert()
  }, [active])

  return (
    <ConsoleFrame
      activeItem="Reports"
      title="Career Intelligence Report — Ananya S"
      chips={<FrameChip accent>Share to client</FrameChip>}
    >
      <div ref={rootRef} className="flex h-full w-full flex-col bg-white px-4 py-3 sm:px-6 sm:py-4">
        {/* ── document header row ── */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line pb-2.5 sm:pb-3">
          <svg className="tb size-3.5 shrink-0 text-ink-60" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M9.5 3.5 5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="tb mono truncate text-[10px] uppercase tracking-[0.14em] text-ink-60">
            Career Intelligence Report
          </span>
          <span className="tb mono hidden rounded-full border border-line bg-paper px-2 py-0.5 text-[8.5px] text-ink-40 sm:block">
            Draft v3
          </span>
          <span className="flex-1" />
          <span className="tb mono hidden text-[9px] text-ink-40 md:block">Autosaved · 2m</span>
          <span className="sent-chip mono flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[9px] text-ink-60">
            Sent ✓
          </span>
          <button
            type="button"
            tabIndex={-1}
            className="share-pill tb shrink-0 rounded-full bg-growth px-3 py-1 text-[10px] font-medium text-white"
          >
            Share to client
          </button>
        </div>

        {/* ── match ring + strength bars ── */}
        <div className="seg mt-3 grid grid-cols-[auto_1fr] items-center gap-4 sm:mt-4 sm:gap-6">
          <div className="shrink-0">
            <div className="relative size-16 sm:size-20">
              <svg className="size-16 -rotate-90 sm:size-20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <circle cx="32" cy="32" r={RING_R} className="text-ink/10" stroke="currentColor" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r={RING_R}
                  className="ring-arc text-ink"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - MATCH)}
                />
              </svg>
              <span className="pct mono absolute inset-0 grid place-items-center text-[13px] font-medium tabular-nums text-ink sm:text-[15px]">
                92%
              </span>
            </div>
            <p className="mono mt-1.5 text-center text-[8.5px] uppercase tracking-[0.14em] text-ink-40">Top match</p>
            <p className="mt-0.5 text-center text-[10px] font-medium text-ink">UX Engineering</p>
          </div>
          <div className="min-w-0">
            <p className="mono mb-2 text-[8.5px] uppercase tracking-[0.14em] text-ink-40">Strength profile</p>
            <div className="space-y-2 sm:space-y-2.5">
              {BARS.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`h-1.5 shrink-0 rounded-full bg-ink/15 ${b.label}`} />
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span className={`fill absolute inset-y-0 left-0 block rounded-full bg-ink ${b.level}`} />
                  </span>
                  <span className="mono w-5 shrink-0 text-right text-[8.5px] tabular-nums text-ink-40">{b.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── drafted paragraphs — placeholder line groups ── */}
        <div className="mt-4 min-h-0 flex-1 space-y-3.5 overflow-hidden sm:mt-5 sm:space-y-4">
          <div className="seg space-y-1.5">
            <p className="mono text-[8.5px] uppercase tracking-[0.14em] text-ink-40">01 · Snapshot</p>
            <span className="tline block h-2 w-[94%] rounded-full bg-ink/10" />
            <span className="tline block h-2 w-full rounded-full bg-ink/10" />
            <span className="tline block h-2 w-[72%] rounded-full bg-ink/10" />
          </div>
          {/* the middle group carries the human edit: darker bar + blinking caret */}
          <div className="seg space-y-1.5">
            <p className="mono text-[8.5px] uppercase tracking-[0.14em] text-ink-40">02 · Strengths &amp; fit</p>
            <span className="tline block h-2 w-[88%] rounded-full bg-ink/10" />
            <span className="flex items-center gap-1.5">
              <span className="tline edited-bar block h-2 w-[58%] rounded-full bg-ink/25" />
              <span className="caret block h-3 w-[1.5px] shrink-0 bg-ink" />
              <span className="mono text-[8.5px] uppercase tracking-[0.12em] text-ink-40">edited</span>
            </span>
            <span className="tline block h-2 w-[66%] rounded-full bg-ink/10" />
          </div>
          <div className="seg space-y-1.5">
            <p className="mono text-[8.5px] uppercase tracking-[0.14em] text-ink-40">03 · Recommended path</p>
            <span className="tline block h-2 w-full rounded-full bg-ink/10" />
            <span className="tline block h-2 w-[82%] rounded-full bg-ink/10" />
            <span className="tline block h-2 w-[60%] rounded-full bg-ink/10" />
          </div>
        </div>

        {/* ── footer strip ── */}
        <div className="seg mt-auto flex shrink-0 items-center gap-2 border-t border-line pt-2 sm:pt-2.5">
          <span className="pulse-dot size-1.5 rounded-full bg-ink-40" />
          <span className="mono text-[9px] uppercase tracking-[0.12em] text-ink-40">Drafted by AI · owned by you</span>
          <span className="mono ml-auto hidden text-[8.5px] uppercase tracking-[0.12em] text-ink-20 sm:block">
            SMC-1042 · v3
          </span>
        </div>
      </div>
    </ConsoleFrame>
  )
}
