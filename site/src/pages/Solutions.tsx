import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { IA_CONTENT } from "@/content/ia"
import { PORTAL_URL } from "@/lib/api"

const SEGMENTS = IA_CONTENT.solutions.segments
const INSTITUTIONAL = new Set(["schools", "colleges", "organizations"])

// One page, seven audiences — each segment is an IA anchor with its own
// headline, what-you-get, and the honest place to start (goal-gradient: the
// first step is always small and named).
export function Solutions() {
  const ref = useReveals()
  useSeo({
    title: "Solutions — SetMyCareer",
    description: "Career guidance for students, parents, graduates, professionals, schools, colleges and organizations — measured assessments, certified counsellors, and a clear place to start for each.",
    path: "/solutions",
  })
  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-14 pt-12 md:pt-20">
        <Kicker>Solutions</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[14ch]">Whoever is deciding, <span className="b">we meet them</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">The method is the same — measure, interpret, decide. What changes is the decision in front of you.</p>
        {/* in-page index — Hick's law: see all seven before scrolling */}
        <nav data-reveal aria-label="Audiences" className="mt-10 flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="border border-line px-3.5 py-1.5 text-[12.5px] text-ink-80 transition-colors hover:border-ink hover:text-ink">{s.label}</a>
          ))}
        </nav>
      </section>

      {SEGMENTS.map((s, i) => (
        <section key={s.id} id={s.id} className={`hair-t ${i % 2 === 0 ? "bg-paper-pure" : ""}`}>
          <div className="wrap grid gap-10 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
            <div>
              <Kicker>{String(i + 1).padStart(2, "0")} — {s.label}</Kicker>
              <SplitReveal className="h-lg mt-4 max-w-[18ch]">{s.headline}</SplitReveal>
              <p data-reveal className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-60">{s.body}</p>
            </div>
            <div data-reveal>
              <p className="kicker text-ink-40">What you get</p>
              <ul className="mt-4">
                {s.gets.map((g) => (
                  <li key={g} className="flex items-baseline gap-4 border-t border-line py-3.5 text-[14.5px] leading-relaxed text-ink-80">
                    <span className="mono text-[11px] text-ink-40">—</span>{g}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-5 text-[13.5px] leading-relaxed text-ink-60">{s.start}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                {INSTITUTIONAL.has(s.id)
                  ? <Magnetic href="/contact">Talk to us</Magnetic>
                  : <Magnetic href={PORTAL_URL}>Begin free</Magnetic>}
                <Link to="/pricing" className="ul text-[13px] text-ink-60">See pricing</Link>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="wrap py-20 text-center md:py-24">
        <SplitReveal className="h-xl mx-auto max-w-[16ch]">Not sure which you are? <span className="b">Start free.</span></SplitReveal>
        <div data-reveal className="mt-9 flex items-center justify-center gap-6">
          <Magnetic href={PORTAL_URL} solid>Career Clarity Index</Magnetic>
          <Link to="/book" className="ul inline-flex items-center gap-2 text-[13.5px] text-ink-60">Or book a session <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </main>
  )
}
