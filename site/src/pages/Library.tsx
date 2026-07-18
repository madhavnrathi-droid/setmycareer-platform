import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { MACRO } from "@/content/careers"
import { TOTAL_CAREERS } from "@/content/careers-all"
import { CareerTerminal } from "@/components/terminal/CareerTerminal"
import { ProjectionModel, RingsDiagram } from "@/components/terminal/Projection"
import { NewsFeed } from "@/components/terminal/NewsFeed"

// The Career Terminal — the Career Library, rebuilt as a career market. Every
// path is a position with a trend, a pay trajectory and an AI-exposure read.
// Search it, open it, hold it. Palantir/Goldman information design in the site's
// monochrome system — Rams restraint: the data is the ornament.

export function Library() {
  const ref = useReveals()
  useSeo({
    title: "Career Terminal — SetMyCareer",
    description: "The career market on one screen: search any career and read its demand trend, pay trajectory, AI-exposure and the moves adjacent to it — grounded in WEF, BLS, NASSCOM and India Skills Report data. Positions, not guesses.",
    path: "/library",
  })
  return (
    <main ref={ref} className="pt-24">
      {/* header — the market, open */}
      <section className="wrap pb-8 pt-10 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker>Career Terminal</Kicker>
            <SplitReveal as="h1" className="display mt-4 max-w-[15ch]">The career market, on <span className="b">one screen</span>.</SplitReveal>
          </div>
          <p data-reveal className="mono max-w-[30ch] text-[12px] leading-relaxed text-ink-40">
            Positions, not guesses. Search any career, read its trajectory, and see exactly where it leads — no abstraction, no hearsay.
          </p>
        </div>

        {/* macro strip — the ticker at the open */}
        <div data-reveal className="mt-9 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {MACRO.map((m) => (
            <div key={m.label} className="bg-paper-pure p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-[clamp(1.6rem,3vw,2.1rem)] font-extralight leading-none tabular-nums">{m.value}</span>
                <span className="mono text-[12px] text-ink-60">{m.unit}</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-60">{m.label}</p>
              <p className="mono mt-1 text-[9px] uppercase tracking-[0.1em] text-ink-40">{m.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* the board + instrument sheet — paper-pure terminal plate on the darker body */}
      <section className="hair-t bg-paper">
        <div className="wrap py-12 md:py-16">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="h-lg">The board, <span className="b">live</span>.</h2>
            <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">{TOTAL_CAREERS} careers · press / to search · any occupation</p>
          </div>
          {/* full-bleed to the viewport edges on phones */}
          <div className="max-sm:mx-[calc(50%-50vw)]"><CareerTerminal /></div>
        </div>
      </section>

      {/* the model — what counselling changes (measured vs guesswork) */}
      <section className="plate-dark">
        <div className="wrap py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
            <div>
              <Kicker className="!text-paper/50">The model</Kicker>
              <SplitReveal className="h-xl mt-4 max-w-[15ch] text-paper">A first decision <span className="b">compounds</span>.</SplitReveal>
              <p data-reveal className="lead mt-6 max-w-md text-paper/60">
                A career is a position you hold for decades. Start it on evidence and it compounds; start it on a guess and an early wrong turn costs years to unwind. Counselling is the reconnaissance before you commit.
              </p>
              <div data-reveal className="mt-8"><Magnetic href="/cri" dark>Run your own read</Magnetic></div>
            </div>
            <div data-reveal className="border border-paper/15 bg-paper-pure p-6 md:p-8">
              <ProjectionModel />
            </div>
          </div>
        </div>
      </section>

      {/* the moves — noise to a position */}
      <section className="wrap py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-14">
          <div>
            <Kicker>The moves</Kicker>
            <SplitReveal className="h-xl mt-4 max-w-[16ch]">From market noise to a <span className="b">position you can hold</span>.</SplitReveal>
            <p data-reveal className="mt-6 max-w-md text-[14.5px] leading-relaxed text-ink-60">
              Five layers inward. The outer rings are everyone else's opinion; the centre is a decision you can defend — to a parent, an interviewer, and yourself at forty.
            </p>
          </div>
          <div data-reveal><RingsDiagram /></div>
        </div>
      </section>

      {/* the wire — live feed */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap py-14 md:py-20">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="h-lg">The <span className="b">wire</span>.</h2>
            <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">Jobs · skills · education · scraped daily</p>
          </div>
          <NewsFeed />
        </div>
      </section>

      {/* close — one position to take */}
      <section className="wrap py-20 text-center md:py-24">
        <SplitReveal className="h-xl mx-auto max-w-[20ch]">The board shows every position. The index shows <span className="b">the one that's yours</span>.</SplitReveal>
        <div data-reveal className="mt-9 flex items-center justify-center gap-6">
          <Magnetic href="/cri" solid>Take your position</Magnetic>
          <Link to="/framework" className="ul inline-flex items-center gap-2 text-[13.5px] text-ink-60">How we match <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </main>
  )
}
