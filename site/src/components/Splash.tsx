import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { LogoMark } from "@/components/Brand"

// A single, simple, mechanical overture: a precise loading rule fills left→right
// while a mono counter ticks 000→100 and the mark quarter-turns in steps, then the
// screen wipes up. One animation every load — only the aphorism changes.

const APHORISMS = [
  "Find your true north.",
  "Decisions, not guesses.",
  "Orientation before ambition.",
  "Measure, then move.",
  "A direction is a decision held still.",
  "Clarity is a kind of courage.",
  "Know the map before the march.",
  "Aim is the better half of effort.",
]

export function Splash() {
  const [hidden, setHidden] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const aph = useRef(APHORISMS[Math.floor(Math.random() * APHORISMS.length)])

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const done = () => setHidden(true)
    // hard escape hatch: never leave a visitor stuck on the splash, whatever happens
    // to the (rAF-driven) timeline — setTimeout fires regardless.
    const guard = window.setTimeout(done, reduce ? 1400 : 3200)

    if (reduce) {
      const t = gsap.to(root.current, { yPercent: -100, duration: 0.5, delay: 0.4, ease: "power3.inOut", onComplete: done })
      return () => { t.kill(); window.clearTimeout(guard) }
    }

    const n = { v: 0 }
    const tl = gsap.timeline()
    tl.to(bar.current, { scaleX: 1, duration: 1.5, ease: "none" }, 0)
      .to(mark.current, { rotation: 90, duration: 1.5, ease: "steps(6)", transformOrigin: "50% 50%" }, 0)
      .to(n, {
        v: 100, duration: 1.5, ease: "none",
        onUpdate: () => { if (counter.current) counter.current.textContent = String(Math.round(n.v)).padStart(3, "0") },
      }, 0)
      // mechanical wipe up
      .to(root.current, { yPercent: -100, duration: 0.66, ease: "power3.in", onComplete: done }, "+=0.2")

    return () => { tl.kill(); window.clearTimeout(guard) }
  }, [])

  if (hidden) return null
  return (
    <div ref={root} className="splash">
      <div className="flex h-full flex-col items-center justify-center text-paper">
        <span ref={mark} className="block"><LogoMark size={44} className="text-paper opacity-90" /></span>
        <span className="font-wordmark mt-5 text-[26px] text-paper">Setmycareer</span>
        <span className="kicker mt-3 text-paper/55">{aph.current}</span>
        <div className="mt-9 flex items-center gap-3">
          <span ref={counter} className="mono text-[11px] tabular-nums text-paper/45">000</span>
          <span className="relative block h-px w-[200px] bg-paper/20">
            <span ref={bar} className="absolute inset-y-0 left-0 block w-full origin-left scale-x-0 bg-paper" />
          </span>
          <span className="mono text-[11px] text-paper/45">100</span>
        </div>
      </div>
    </div>
  )
}
