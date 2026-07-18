import { Link } from "react-router-dom"
import { ArrowRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { TalkToExpert } from "@/components/LeadForm"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { IA_CONTENT } from "@/content/ia"
import { PORTAL_URL } from "@/lib/api"

const B = IA_CONTENT.book

// Book Session — the shortest page on the site, on purpose. Three named steps
// (goal-gradient: the path looks as short as it is), one CTA, one reassurance.
export function Book() {
  const ref = useReveals()
  useSeo({
    title: "Book a Session — SetMyCareer",
    description: "Three steps from here to a video session with a certified career counsellor — create an account, pick a time, and come as you are. No commitment beyond the conversation.",
    path: "/book",
  })
  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-16 pt-12 md:pt-24">
        <Kicker>Book Session</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[13ch]">Talk to a <span className="b">counsellor</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">{B.reassurance}</p>
        <div data-reveal className="mt-10 flex flex-wrap items-center gap-6">
          <Magnetic href={PORTAL_URL} solid>Book in the portal</Magnetic>
          <Link to="/contact" className="ul inline-flex items-center gap-2 text-[13.5px] text-ink-60">Or talk to us first <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="hair-t bg-paper-pure">
        <div className="wrap grid gap-px py-16 md:grid-cols-3 md:py-24">
          {B.steps.map((s, i) => (
            <div data-reveal key={s.title} className="border-t border-line py-8 md:pr-10">
              <span className="display !text-[clamp(2.4rem,5vw,4rem)] font-extralight text-ink-20">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-4 text-[20px] font-medium tracking-tight">{s.title}</h2>
              <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap grid gap-10 py-16 md:grid-cols-3 md:py-20">
        <Link data-reveal to="/pricing" className="group border-t border-line py-6">
          <p className="kicker text-ink-40">Before you book</p>
          <h3 className="ul mt-3 inline-block text-[17px] font-medium tracking-tight">What it costs</h3>
          <p className="mt-2 text-[13.5px] text-ink-60">Four tiers, itemised — starting free.</p>
        </Link>
        <Link data-reveal to="/experts" className="group border-t border-line py-6">
          <p className="kicker text-ink-40">Who you'll meet</p>
          <h3 className="ul mt-3 inline-block text-[17px] font-medium tracking-tight">The counsellors</h3>
          <p className="mt-2 text-[13.5px] text-ink-60">The live roster — certified, named, real.</p>
        </Link>
        <Link data-reveal to="/framework" className="group border-t border-line py-6">
          <p className="kicker text-ink-40">What happens inside</p>
          <h3 className="ul mt-3 inline-block text-[17px] font-medium tracking-tight">The method</h3>
          <p className="mt-2 text-[13.5px] text-ink-60">Assess, interpret, map, decide, support.</p>
        </Link>
      </section>

      <TalkToExpert
        source="book page"
        eyebrow="Not ready to commit?"
        heading={<>Talk it through <span className="b">first</span>.</>}
        blurb="A session isn't the only door. Leave your details and a counsellor will reach out — to answer the questions you'd want answered before you ever book."
      />
    </main>
  )
}
