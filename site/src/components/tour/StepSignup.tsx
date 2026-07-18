import { useLayoutEffect, useRef, type JSX } from "react"
import { gsap } from "gsap"
import { LogoMark, Wordmark, TAGLINE } from "../Brand"

/* Step 01 — portal SIGN-UP / OTP login, staged as the REAL pre-login page:
   a full-bleed split screen. Left half is the ink brand panel (logomark +
   wordmark, tagline, placeholder copy bars, mono micro-footer); right half
   is the paper auth pane with the OTP card centered. The card keeps its
   approved beats exactly: phone slides in, caret blinks, purple "Send code"
   presses, six digits pop, tick draws, "Welcome" chip. Authored in its
   finished state; GSAP animates INTO it and loops. Transforms + opacity only;
   the button is the single purple accent. Left panel hides <sm. */

const OTP = ["7", "1", "9", "3", "0", "5"] as const
const CHECK_LEN = 16 // ≥ path length so offset:LEN fully hides the tick

export function StepSignup({ active }: { active: boolean }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      // the field caret — an independent, continuous blink
      gsap.to(".caret", { autoAlpha: 0, duration: 0.5, repeat: -1, yoyo: true, ease: "steps(1)" })

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: "power3.out" } })
      // the ink brand panel settles first — a quiet cascade
      tl.from(".pane-item", { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.07 })
        .from(".brand", { y: -8, autoAlpha: 0, duration: 0.4 }, "<0.18")
        // phone field drops in, then its number slides across
        .from(".field", { y: 10, autoAlpha: 0, duration: 0.42 }, "<0.06")
        .from(".phone-val", { xPercent: -9, autoAlpha: 0, duration: 0.5 }, ">-0.14")
        // the purple button appears, then presses
        .from(".send", { y: 10, autoAlpha: 0, duration: 0.4 }, "<0.05")
        .to(".send", { scale: 0.96, duration: 0.12, ease: "power2.in" }, ">0.3")
        .to(".send", { scale: 1, duration: 0.26, ease: "back.out(3)" })
        // OTP boxes fill one digit at a time — each pops + its ink border flicks on
        .from(".otp", { scale: 0.6, autoAlpha: 0, duration: 0.32, stagger: 0.09, ease: "back.out(2)" }, ">0.04")
        // success — chip rises, tick pops + draws, label reveals
        .from(".chip", { y: 12, autoAlpha: 0, duration: 0.42 }, ">0.08")
        .from(".tick", { scale: 0.4, autoAlpha: 0, duration: 0.34, ease: "back.out(2.6)" }, "<0.1")
        .fromTo(".tick-path", { strokeDashoffset: CHECK_LEN }, { strokeDashoffset: 0, duration: 0.46 }, "<0.14")
        .from(".chip-label", { xPercent: -10, autoAlpha: 0, duration: 0.34 }, "<0.06")
      // repeatDelay holds the finished frame before it loops
    }, rootRef)
    return () => ctx.revert()
  }, [active])

  return (
    <div ref={rootRef} className="flex h-full w-full">
      {/* ── left — ink brand panel (the real split-screen login) ── */}
      <div className="hidden w-[46%] shrink-0 flex-col justify-between bg-ink p-6 text-paper sm:flex md:p-8">
        <div className="pane-item flex items-center gap-2.5">
          <LogoMark size={26} className="shrink-0" />
          <Wordmark size={17} className="text-paper" />
        </div>

        <div>
          <p className="pane-item text-[15px] font-light leading-snug text-paper/85 md:text-[17px]">{TAGLINE}</p>
          <div className="pane-item mt-3.5 h-[5px] w-[72%] rounded-full bg-paper/15" />
          <div className="pane-item mt-2 h-[5px] w-[52%] rounded-full bg-paper/10" />
        </div>

        <div className="pane-item flex items-center justify-between gap-3 border-t border-paper/10 pt-3.5">
          <span className="mono text-[7.5px] uppercase tracking-[0.16em] text-paper/40">Client portal</span>
          <span className="mono text-[7.5px] uppercase tracking-[0.16em] text-paper/40">Secure OTP</span>
        </div>
      </div>

      {/* ── right — paper auth pane with the OTP card centered ── */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-paper p-4 sm:p-6">
        <div className="w-full max-w-[300px] rounded-[12px] border border-line bg-paper-pure p-5 shadow-[0_14px_34px_-18px_rgba(11,11,11,0.28)]">
          {/* brand row — monochrome logomark + micro wordmark */}
          <div className="brand mb-4 flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded-[6px] bg-ink">
              <span className="size-1.5 rounded-full bg-paper-pure" />
            </span>
            <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-60">SetMyCareer</span>
          </div>

          {/* phone field — value slides in, caret blinks */}
          <div className="field mb-3 flex items-center gap-2 rounded-[8px] border border-line px-3 py-2.5">
            <span className="mono text-[11px] text-ink-40">+91</span>
            <span className="h-3.5 w-px bg-line" />
            <span className="phone-val mono text-[13px] tracking-wide text-ink-80">91085 10058</span>
            <span className="caret ml-0.5 inline-block h-[15px] w-px self-center bg-ink" />
          </div>

          {/* the single purple accent — the primary action */}
          <div className="send mb-4 flex w-full items-center justify-center rounded-[8px] bg-growth px-3 py-2.5 text-[12px] font-medium text-paper-pure">
            <span>Send code</span>
          </div>

          {/* six OTP boxes, each with an ink border ring + digit */}
          <div className="mb-4 flex justify-between gap-[6px]">
            {OTP.map((d, i) => (
              <div key={i} className="otp relative grid size-8 place-items-center rounded-[8px] border border-line">
                <span className="pointer-events-none absolute inset-0 rounded-[8px] border border-ink" />
                <span className="mono text-[13px] font-medium tabular-nums text-ink">{d}</span>
              </div>
            ))}
          </div>

          {/* success — a compact chip with a drawn tick */}
          <div className="border-t border-line pt-4">
            <div className="chip mx-auto flex w-fit items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1">
              <span className="tick grid size-4 place-items-center">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" className="stroke-ink" strokeWidth="2" />
                  <path
                    className="tick-path stroke-ink"
                    d="M7 12.4 L10.6 16 L17 8.4"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ strokeDasharray: CHECK_LEN }}
                  />
                </svg>
              </span>
              <span className="chip-label text-[11px] font-medium text-ink-80">Welcome</span>
            </div>
          </div>
        </div>

        {/* page furniture under the card — the real screen has a footer line */}
        <div className="mt-4 flex items-center gap-2">
          <span className="mono text-[8px] uppercase tracking-[0.14em] text-ink-40">New here?</span>
          <span className="h-[4px] w-14 rounded-full bg-ink/10" />
        </div>
      </div>
    </div>
  )
}
