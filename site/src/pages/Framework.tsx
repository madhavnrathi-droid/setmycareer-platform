import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { IA_CONTENT } from "@/content/ia"
import { COPY, ARTICLES } from "@/content/site"
import { ProcessLadder, OverlapVenn, DecisionFan } from "@/components/diagrams"
import { PORTAL_URL } from "@/lib/api"

const F = IA_CONTENT.framework

// the method as a mind-map: the real five steps + their real sub-activities
const LADDER_CAPTIONS = ["Measured, not guessed", "Read by a counsellor", "Options, not opinions", "A shortlist you can explain", "Through the whole decision"]
const LADDER_BRANCHES = [
  ["Aptitude battery", "RIASEC interest", "Big Five personality"],
  ["Scored live", "Cross-checked", "Pattern read"],
  ["Streams & degrees", "Job domains", "ROI & admission odds"],
  ["Ranked shortlist", "Reasoning shown", "Trade-offs named"],
  ["Exams & admissions", "Second thoughts", "As long as it takes"],
]
const LADDER = COPY.method.map((s, i) => ({ no: s.no, title: s.title, caption: LADDER_CAPTIONS[i], branches: LADDER_BRANCHES[i] }))

// The framework, argued in order (a page is an argument): the five steps →
// how decisions actually go wrong → the four-factor model → the science →
// the research library. Each section is an IA anchor.
export function Framework() {
  const ref = useReveals()
  useSeo({
    title: "The Framework — SetMyCareer",
    description: "How career decisions actually work, the four-factor decision model (aptitude, interest, personality, market reality), and the science underneath — RIASEC, Big Five, aptitude testing.",
    path: "/framework",
  })
  return (
    <main ref={ref} className="pt-28">
      {/* 01 · the framework */}
      <section id="framework" className="wrap pb-16 pt-12 md:pt-20">
        <Kicker>The SetMyCareer Framework</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[13ch]">Decisions have <span className="b">a method</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">Five steps, refined over fifteen years. Not a quiz and a PDF — a measured argument that ends in a decision you can explain.</p>
        <div data-reveal className="mx-auto mt-12 hidden max-w-2xl md:block"><ProcessLadder steps={LADDER} className="w-full" /></div>
        <ol data-reveal className="mt-12 grid gap-px border-t border-line md:grid-cols-5">
          {COPY.method.map((s) => (
            <li key={s.no} className="border-b border-line py-6 md:border-b-0 md:border-r md:pr-6 md:last:border-r-0">
              <span className="mono text-[11px] text-ink-40">{s.no}</span>
              <h3 className="mt-2 text-[18px] font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-60">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 02 · how decisions actually work */}
      <section id="how" className="hair-t bg-paper-pure">
        <div className="wrap grid gap-12 py-20 md:grid-cols-[0.8fr_1.2fr] md:py-28">
          <div>
            <Kicker>02 — The honest mechanics</Kicker>
            <SplitReveal className="h-xl mt-5 max-w-[13ch]">How career decisions <span className="b">actually work</span>.</SplitReveal>
          </div>
          <div className="serif max-w-2xl space-y-6 text-[1.08rem] leading-relaxed text-ink-80">
            {F.how.map((p, i) => <p data-reveal key={i}>{p}</p>)}
          </div>
        </div>
        {/* the true-north metaphor, made geometric — four readings, one direction */}
        <div className="wrap border-t border-line pb-20 pt-14 md:pb-28">
          <div data-reveal className="mx-auto max-w-2xl"><DecisionFan className="w-full" /></div>
        </div>
      </section>

      {/* 03 · decision model */}
      <section id="model" className="plate-dark">
        <div className="wrap py-20 md:py-28">
          <Kicker className="!text-paper/50">03 — Decision model</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[16ch] text-paper">Four factors. Trust the <span className="b">overlap</span>.</SplitReveal>
          <p data-reveal className="lead mt-6 max-w-xl text-paper/60">{F.model.intro}</p>
          {/* the model, as an overlap — inverted onto a paper panel for the dark plate */}
          <div data-reveal className="mx-auto mt-12 max-w-2xl border border-paper/15 bg-paper-pure p-6 md:p-8"><OverlapVenn className="w-full" /></div>
          <div className="mt-14 grid gap-px md:grid-cols-2 xl:grid-cols-4">
            {F.model.factors.map((f, i) => (
              <div data-reveal key={f.name} className="border-t border-paper/15 py-7 md:pr-8">
                <span className="mono text-[11px] tabular-nums text-paper/35">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-[20px] font-medium tracking-tight">{f.name}</h3>
                <p className="serif mt-2 text-[15px] italic text-paper/70">{f.question}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-paper/55">{f.instrument}</p>
              </div>
            ))}
          </div>
          <p data-reveal className="serif mt-12 max-w-2xl border-l-2 border-paper/40 pl-5 text-[1.05rem] leading-relaxed text-paper/80">{F.model.synthesis}</p>
        </div>
      </section>

      {/* 04 · scientific foundation */}
      <section id="science" className="wrap py-20 md:py-28">
        <Kicker>04 — Scientific foundation</Kicker>
        <SplitReveal className="h-xl mt-5 max-w-[14ch]">Old science, <span className="b">honestly used</span>.</SplitReveal>
        <p data-reveal className="lead mt-6 max-w-xl text-ink-60">{F.science.intro}</p>
        <div className="mt-12">
          {F.science.pillars.map((p) => (
            <div data-reveal key={p.name} className="grid gap-4 border-t border-line py-8 md:grid-cols-[240px_1fr_1fr] md:gap-10">
              <h3 className="text-[19px] font-medium tracking-tight">{p.name}</h3>
              <p className="text-[14.5px] leading-relaxed text-ink-80">{p.what}</p>
              <p className="text-[13.5px] leading-relaxed text-ink-60">{p.evidence}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 05 · research library */}
      <section id="research" className="hair-t bg-paper-pure">
        <div className="wrap py-20 md:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Kicker>05 — Research library</Kicker>
              <SplitReveal className="h-xl mt-5 max-w-[14ch]">Read the <span className="b">thinking</span>.</SplitReveal>
            </div>
            <Link to="/trust#research" className="ul inline-flex items-center gap-2 text-[13.5px] text-ink-60">Every source we cite <ArrowUpRight size={15} /></Link>
          </div>
          <div>
            {ARTICLES.filter((a) => a.category === "Method").map((a) => (
              <Link key={a.slug} to={`/blog/${a.slug}`} data-reveal className="group grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-line py-5 transition-colors last:border-b hover:bg-paper">
                <h3 className="text-[clamp(1.1rem,2vw,1.5rem)] font-light tracking-tight">{a.title}</h3>
                <ArrowRight size={18} className="text-ink-40 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-20 text-center md:py-28">
        <SplitReveal className="h-xl mx-auto max-w-[18ch]">See the framework applied to <span className="b">you</span>.</SplitReveal>
        <div data-reveal className="mt-9 flex justify-center"><Magnetic href={PORTAL_URL} solid>Start with the free index</Magnetic></div>
      </section>
    </main>
  )
}
