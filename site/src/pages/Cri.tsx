import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { CriFlow } from "@/components/cri/CriFlow"
import { CriPath } from "@/components/diagrams"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"

// The Career Clarity Index — the site's free front door. The whole page exists
// to get one honest signal: how urgently do you need guidance?
export function Cri() {
  const ref = useReveals()
  useSeo({
    title: "Career Clarity Index — free readiness check | SetMyCareer",
    description: "A free structured readiness check, scored on screen: one instrument for parents of students aged 10–18 (about 10 minutes) and a two-part decision-readiness diagnostic for working executives (about 20 minutes).",
    path: "/cri",
  })
  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-10 pt-12 md:pt-20">
        <Kicker>Career Clarity Index · Free</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[14ch]">Do you actually need <span className="b">guidance</span>?</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">Most people can't answer that honestly from the inside. A structured self-report can — one instrument for parents of students aged 10 to 18, and a two-part diagnostic for working executives. The same screening our counsellors use, free and scored on the spot.</p>
        <div data-reveal className="mt-10 max-w-3xl"><CriPath className="w-full" /></div>
      </section>

      <section id="test" className="wrap pb-20 md:pb-28">
        <CriFlow />
        <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2">
          <p className="mono text-[10.5px] uppercase tracking-[0.13em] text-ink-40">71,537+ assessments taken · 55+ certified counsellors behind it</p>
          <Link to="/trust#methodology" className="ul inline-flex items-center gap-1.5 text-[12.5px] text-ink-60">How scoring works <ArrowUpRight size={14} /></Link>
        </div>
      </section>
    </main>
  )
}
