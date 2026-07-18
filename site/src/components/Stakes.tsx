import { useEffect, useRef, useState, type ReactNode } from "react"
import { Kicker, SplitReveal } from "@/components/bits"
import { CostLadder } from "@/components/CostLadder"
import { useCounter } from "@/lib/motion"

// THE STAKES — a sourced data-narrative that makes "chosen blind" concrete before
// the Method answers it. Every figure is real and cited. Monochrome, scroll-revealed.

// a 10×10 proportion grid that fills to `filled`/100 when it enters view
function DotGrid({ filled }: { filled: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShown(true); io.disconnect() } }, { threshold: 0.3 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="grid w-[210px] max-w-full grid-cols-10 gap-[5px]">
      {Array.from({ length: 100 }).map((_, i) => (
        <span key={i} className="aspect-square rounded-[1px]" style={{ background: shown && i < filled ? "var(--color-paper)" : "rgba(255,255,255,0.14)", transition: "background 0.5s var(--ease-out)", transitionDelay: `${(i % 10) * 0.012 + Math.floor(i / 10) * 0.018}s` }} />
      ))}
    </div>
  )
}

function BigNum({ value, suffix = "", cls = "!text-[clamp(2.2rem,4.6vw,3.3rem)]" }: { value: number; suffix?: string; cls?: string }) {
  const ref = useCounter(value)
  return (
    <div className={`display ${cls} font-extralight leading-[0.9] tabular-nums text-paper`}>
      <span ref={ref}>0</span><span className="text-paper/40">{suffix}</span>
    </div>
  )
}

function Stat({ children, source }: { children: ReactNode; source: string }) {
  return (
    <div data-reveal className="border-t border-paper/15 pt-6">
      {children}
      <p className="mono mt-4 text-[10px] uppercase tracking-[0.13em] text-paper/35">{source}</p>
    </div>
  )
}

export function Stakes() {
  return (
    <section className="plate-dark">
      <div className="wrap py-24 md:py-32">
        <Kicker className="!text-paper/50">The stakes</Kicker>
        <SplitReveal className="h-xl mt-5 max-w-[18ch] text-paper">Most of this decision is made <span className="b">without help</span>.</SplitReveal>
        <p data-reveal className="lead mt-6 max-w-xl text-paper/60">This is not a rare failure. It is how most students decide — and the numbers below show why.</p>

        {/* hero stat — big number + a tight proportion grid */}
        <div className="mt-16 grid items-center gap-10 border-t border-paper/15 pt-12 md:grid-cols-[1fr_auto] md:gap-16">
          <div data-reveal>
            <BigNum value={93} suffix="%" cls="!text-[clamp(2.8rem,6.5vw,5rem)]" />
            <p className="mt-4 max-w-sm text-[1.1rem] leading-snug text-paper/80">of Indian schools have no dedicated career counsellor.</p>
            <p className="mono mt-3 text-[10px] uppercase tracking-[0.13em] text-paper/35">Higher Education Digest, 2023</p>
          </div>
          <div data-reveal className="md:justify-self-end"><DotGrid filled={93} /></div>
        </div>

        {/* three supporting figures */}
        <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
          <Stat source="Global Career Counsellor, 2023">
            <div className="display !text-[clamp(2.2rem,4.6vw,3.3rem)] font-extralight leading-none tabular-nums text-paper">1 : 3,000</div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-paper/70">counsellor-to-student ratio in India. The international guideline is one to 250 — a twelve-fold gap.</p>
          </Stat>
          <Stat source="NTA, 2024">
            <BigNum value={23} suffix=" lakh" />
            <p className="mt-4 text-[14.5px] leading-relaxed text-paper/70">students sat NEET — a single entrance exam — in 2024, most deciding under pressure.</p>
          </Stat>
          <Stat source="India Skills Report, 2024">
            <BigNum value={51} suffix="%" />
            <p className="mt-4 text-[14.5px] leading-relaxed text-paper/70">of Indian graduates are assessed as employable — barely half, years and fees later.</p>
          </Stat>
        </div>

        {/* the human cost */}
        <div className="mt-14 grid items-end gap-10 border-t border-paper/15 pt-12 md:grid-cols-[auto_1fr]">
          <div data-reveal>
            <BigNum value={47} suffix="%" cls="!text-[clamp(2.6rem,5.5vw,4.2rem)]" />
            <p className="mt-4 max-w-md text-[1.1rem] leading-snug text-paper/80">of adults wish they had chosen a different career path.</p>
            <p className="mono mt-3 text-[10px] uppercase tracking-[0.13em] text-paper/35">Harris Poll for CNBC, 2021</p>
          </div>
          <p data-reveal className="max-w-xs text-[14px] leading-relaxed text-paper/50 md:justify-self-end md:text-right">Regret is the quiet tax on a choice made without evidence — paid across a working life, not a year.</p>
        </div>

        {/* the arithmetic — money on the path vs. the direction */}
        <CostLadder />

        {/* bridge to the method */}
        <p data-reveal className="h-lg mt-16 max-w-[20ch] text-paper">Everyone measured the exam. No one measured the <span className="b">student</span>.</p>
      </div>
    </section>
  )
}
