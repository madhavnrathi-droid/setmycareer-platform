import { useLayoutEffect, useRef, type JSX } from "react"
import { gsap } from "gsap"
import { PortalFrame, FrameChip } from "./AppFrame"

/* Step 02 — taking a validated assessment, full-frame in the REAL portal shell.
   Mirrors the actual test screen: back glyph + thin progress rail + "12 / 72",
   the item prompt large, five stacked Likert option rows. A travelling
   selection ring slides DOWN the stack (offset measured once, at build) and
   lands on "Agree" — that row's radio fills purple and its border flicks ink —
   then the rail ticks 12/72→13/72 and the question crossfades to the next
   item. Authored in its finished state; GSAP animates INTO it and loops
   (reduced-motion holds the finished frame). Transforms + opacity only. */

const OPTIONS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] as const

const PICK = 3 // the row the ring lands on ("Agree")

export function StepAssess({ active }: { active: boolean }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context((self) => {
      const root = self.selector!
      const rows = root(".opt-row") as HTMLElement[]
      const ring = root(".sel-ring")[0] as HTMLElement | undefined
      const qno = root(".qno")[0] as HTMLElement | undefined
      // one layout read at build time: the ring's row-height + how far it rides down the stack
      const dy = ring && rows[PICK] && rows[0] ? rows[PICK].offsetTop - rows[0].offsetTop : 0
      if (ring && rows[0]) gsap.set(ring, { height: rows[0].offsetHeight })

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: "power3.out" } })
      // reset the swappable bits to their loop-start state
      tl.set(".q2", { autoAlpha: 0 }, 0)
        .set(".pick-ring", { autoAlpha: 0 }, 0)
        .set(".pick-border", { autoAlpha: 0 }, 0)
        .set(".sel-fill", { scale: 0 }, 0)
        .set(".sel-ring", { autoAlpha: 0, y: 0 }, 0)
        .set(".prog", { scaleX: 12 / 72, transformOrigin: "left" }, 0)
        .add(() => { if (qno) qno.textContent = "12" }, 0)
        // build in
        .from(".head", { y: -8, autoAlpha: 0, duration: 0.4 }, 0.05)
        .from(".eyebrow", { autoAlpha: 0, duration: 0.35 }, "<0.06")
        .fromTo(".q1", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45 }, "<0.06")
        .from(".foot", { autoAlpha: 0, duration: 0.4 }, "<")
        // the option rows cascade in
        .from(".opt-row", { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.06 }, "<0.08")
        // the travelling ring rides DOWN the stack and lands on the pick
        .to(".sel-ring", { autoAlpha: 1, duration: 0.18 }, ">0.15")
        .to(".sel-ring", { y: dy, duration: 0.85, ease: "back.out(1.1)" }, ">0.1")
        .set(".sel-ring", { autoAlpha: 0 })
        .to(".pick-border", { autoAlpha: 1, duration: 0.15 }, "<")
        .to(".pick-ring", { autoAlpha: 1, duration: 0.14 }, "<")
        .fromTo(".sel-fill", { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(2.4)" }, "<0.04")
        // scored the moment they answer: the rail ticks + the counter swaps
        .to(".prog", { scaleX: 13 / 72, duration: 0.45, transformOrigin: "left", ease: "power2.inOut" }, ">0.15")
        .add(() => { if (qno) qno.textContent = "13" }, "<0.22")
        // the next item slides up in
        .to(".q1", { yPercent: -60, autoAlpha: 0, duration: 0.36, ease: "power2.in" }, "<")
        .fromTo(".q2", { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.42 }, ">-0.05")
      // repeatDelay holds the finished frame before it loops
    }, rootRef)
    return () => ctx.revert()
  }, [active])

  return (
    <PortalFrame
      activeItem="Assessments"
      title="Assessment"
      chips={<><FrameChip>2 · 90m</FrameChip><FrameChip accent>Book session</FrameChip></>}
    >
      <div ref={rootRef} className="flex h-full w-full flex-col px-6 py-4 sm:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col">
          {/* ── top row: back glyph + progress rail + counter ── */}
          <div className="head flex shrink-0 items-center gap-3">
            <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M13 8H3.5M7.5 4 3.5 8l4 4" />
            </svg>
            <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="prog h-full w-full rounded-full bg-ink" style={{ transform: `scaleX(${13 / 72})`, transformOrigin: "left" }} />
            </div>
            <span className="mono shrink-0 text-[10.5px] tabular-nums text-ink-60"><span className="qno">13</span> / 72</span>
          </div>

          {/* ── the item ── */}
          <div className="flex min-h-0 flex-1 flex-col justify-center py-3">
            <div className="eyebrow flex items-baseline justify-between gap-3">
              <span className="mono text-[9px] uppercase tracking-[0.16em] text-ink-40">How well does this describe you?</span>
              <span className="mono hidden shrink-0 text-[8.5px] uppercase tracking-[0.12em] text-ink-20 sm:block">Section 2 · Personality</span>
            </div>
            {/* q1 swaps to q2 mid-loop (q2 is the resting frame) */}
            <div className="relative mt-2 h-[56px]">
              <p className="q1 invisible absolute inset-x-0 top-0 text-[clamp(16px,2.2vw,22px)] font-semibold leading-snug tracking-tight text-ink">I enjoy meeting new people and starting conversations.</p>
              <p className="q2 absolute inset-x-0 top-0 text-[clamp(16px,2.2vw,22px)] font-semibold leading-snug tracking-tight text-ink">I prefer a plan to an improvisation.</p>
            </div>

            {/* ── five stacked option rows — the travelling ring rides the stack ── */}
            <div className="opts relative mt-2 flex flex-col gap-2">
              {OPTIONS.map((label, i) => (
                <div key={label} className="opt-row relative flex items-center gap-3 rounded-[12px] border border-line bg-white px-4 py-2.5">
                  <span className="relative grid size-4 shrink-0 place-items-center rounded-full border border-line bg-paper">
                    {i === PICK && (
                      <>
                        <span className="pick-ring pointer-events-none absolute -inset-[2px] rounded-full border-[1.5px] border-growth" aria-hidden />
                        <span className="sel-fill size-2 rounded-full bg-growth" />
                      </>
                    )}
                  </span>
                  <span className="truncate text-[12px] text-ink-80">{label}</span>
                  {/* the picked row's border flicks ink — an opacity-only overlay */}
                  {i === PICK && <span className="pick-border pointer-events-none absolute inset-0 rounded-[12px] border border-ink" aria-hidden />}
                </div>
              ))}
              {/* the travelling selection ring — animation-only; hidden at rest */}
              <span className="sel-ring invisible pointer-events-none absolute inset-x-0 top-0 rounded-[12px] border-2 border-growth" aria-hidden />
            </div>
          </div>

          {/* ── footer ── */}
          <div className="foot flex shrink-0 items-center justify-between gap-3 border-t border-line pt-2.5">
            <span className="mono min-w-0 truncate text-[9px] text-ink-40">Setmycareer Sigma · 72 items, norm-referenced · saved to your profile</span>
            <span className="mono hidden shrink-0 text-[9px] text-ink-40 sm:block">⏎ Next</span>
          </div>
        </div>
      </div>
    </PortalFrame>
  )
}
