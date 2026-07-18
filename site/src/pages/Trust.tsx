import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { Faq } from "@/components/Faq"
import { useReveals, useCounter } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { IA_CONTENT } from "@/content/ia"
import { PORTAL_URL } from "@/lib/api"

const T = IA_CONTENT.trust

function Num({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useCounter(value)
  return (
    <div data-reveal className="border-t border-line pt-5">
      <div className="display !text-[clamp(2rem,4.5vw,3.2rem)] font-extralight leading-none tabular-nums"><span ref={ref}>0</span><span className="text-ink-40">{suffix ?? "+"}</span></div>
      <p className="mono mt-2 text-[10.5px] uppercase tracking-[0.13em] text-ink-40">{label}</p>
    </div>
  )
}

// The Trust Center — the receipts behind the claims. Methodology, sources,
// privacy, AI red lines, the FAQ, and the honest record (no invented reviews).
export function Trust() {
  const ref = useReveals()
  useSeo({
    title: "Ontology — SetMyCareer",
    description: "What SetMyCareer is, what career counselling actually means, how recommendations are produced and checked, every source we cite, our privacy and AI red lines — stated plainly.",
    path: "/trust",
  })
  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-14 pt-12 md:pt-20">
        <Kicker>Ontology</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[15ch]">What we are, and the <span className="b">receipts</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">A counselling service asks for trust before it can prove anything. This page says plainly what we are, what career counselling means, and the evidence behind every claim.</p>
      </section>

      {/* about — plainly, what SetMyCareer is */}
      <section id="about" className="hair-t scroll-mt-24">
        <div className="wrap grid gap-12 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <Kicker>About us</Kicker>
            <SplitReveal className="h-lg mt-4 max-w-[13ch]">A decision, made on <span className="b">evidence</span>.</SplitReveal>
          </div>
          <div className="serif max-w-2xl space-y-6 text-[1.05rem] leading-relaxed text-ink-80">
            <p data-reveal>SetMyCareer is a career-counselling service, refined since 2010. We pair validated psychometrics with certified human counsellors so a person can choose a stream, a degree or a career on evidence — not pressure, hearsay or a coaching-class default.</p>
            <p data-reveal>The method is the same every time: measure who you are and what you're drawn to, interpret it with a trained counsellor, and hand you a written plan that connects your profile to real, in-demand paths. Fifty-five counsellors; 60,000+ people guided; every recommendation owned by a human, not a machine.</p>
          </div>
        </div>
      </section>

      {/* what career counselling is — for anyone new to the idea */}
      <section id="counselling" className="hair-t scroll-mt-24 bg-paper-pure">
        <div className="wrap py-16 md:py-24">
          <Kicker>New to this?</Kicker>
          <SplitReveal className="h-lg mt-4 max-w-[20ch]">What career counselling <span className="b">actually is</span>.</SplitReveal>
          <p data-reveal className="lead mt-6 max-w-2xl text-ink-60">Career counselling is a structured way to answer one question — <span className="text-ink">“what should I do, and why?”</span> It isn't a personality quiz, a horoscope, or someone telling you what to become.</p>
          <div className="mt-12 grid gap-px md:grid-cols-3">
            {[
              { n: "Measure", b: "You sit a few validated assessments — how you're wired, what genuinely pulls you, how you reason. Scored the same way for everyone." },
              { n: "Interpret", b: "A certified counsellor reads the results with you, in plain language — what fits, what to watch, what to try next." },
              { n: "Decide", b: "You leave with a written plan linking who you are to real paths and their demand. It informs your decision; it never makes it for you." },
            ].map((s, i) => (
              <div data-reveal key={s.n} className="border-t border-line py-6 md:border-t-0 md:border-l md:pl-6 md:first:border-l-0 md:first:pl-0">
                <span className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-[17px] font-medium tracking-tight">{s.n}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-60">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* methodology */}
      <section id="methodology" className="hair-t bg-paper-pure">
        <div className="wrap grid gap-12 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <Kicker>01 — Methodology</Kicker>
            <SplitReveal className="h-lg mt-4 max-w-[14ch]">How a recommendation is <span className="b">made</span>.</SplitReveal>
            <Link data-reveal to="/framework" className="ul mt-6 inline-flex items-center gap-2 text-[13.5px] font-medium">The full framework <ArrowUpRight size={15} /></Link>
          </div>
          <div className="serif max-w-2xl space-y-6 text-[1.05rem] leading-relaxed text-ink-80">
            {T.methodology.map((p, i) => <p data-reveal key={i}>{p}</p>)}
          </div>
        </div>
      </section>

      {/* research sources */}
      <section id="research" className="wrap py-16 md:py-24">
        <Kicker>02 — Research</Kicker>
        <SplitReveal className="h-lg mt-4 max-w-[18ch]">Every source we cite, and what it <span className="b">grounds</span>.</SplitReveal>
        <div className="mt-10">
          {T.research.map((r) => (
            <div data-reveal key={r.source} className="grid gap-2 border-t border-line py-5 md:grid-cols-[320px_1fr] md:gap-10">
              <h3 className="text-[15px] font-medium tracking-tight">{r.source}</h3>
              <p className="text-[13.5px] leading-relaxed text-ink-60">{r.grounds}</p>
            </div>
          ))}
          <div className="border-t border-line" />
        </div>
      </section>

      {/* privacy */}
      <section id="privacy" className="plate-dark">
        <div className="wrap grid gap-12 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <Kicker className="!text-paper/50">03 — Privacy</Kicker>
            <SplitReveal className="h-lg mt-4 max-w-[14ch] text-paper">Your data is the <span className="b">session's</span>, not ours.</SplitReveal>
          </div>
          <ul className="max-w-2xl">
            {T.privacy.map((p, i) => (
              <li data-reveal key={i} className="flex items-baseline gap-5 border-t border-paper/15 py-4.5 py-5">
                <span className="mono text-[11px] tabular-nums text-paper/35">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-[14.5px] leading-relaxed text-paper/75">{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI ethics */}
      <section id="ethics" className="wrap py-16 md:py-24">
        <Kicker>04 — AI ethics</Kicker>
        <SplitReveal className="h-lg mt-4 max-w-[18ch]">The machine measures. It does not <span className="b">decide</span>.</SplitReveal>
        <p data-reveal className="serif mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-ink-80">{T.ethics.stance}</p>
        <div className="mt-10 max-w-2xl">
          <p className="kicker text-ink-40">Red lines</p>
          <ul className="mt-3">
            {T.ethics.lines.map((l, i) => (
              <li data-reveal key={i} className="flex items-baseline gap-5 border-t border-line py-4">
                <span className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-[14.5px] leading-relaxed text-ink-80">{l}</p>
              </li>
            ))}
          </ul>
        </div>
        <p data-reveal className="mt-8 text-[13.5px] text-ink-60">
          The long version: <Link to="/blog/what-to-automate-and-what-to-keep-human" className="ul font-medium text-ink">what to automate, and what to keep human</Link>
        </p>
      </section>

      {/* FAQ (the shared component carries its own heading) */}
      <div id="faq"><Faq /></div>

      {/* success stories — the honest record */}
      <section id="stories" className="plate-dark">
        <div className="wrap py-16 md:py-24">
          <Kicker className="!text-paper/50">06 — The record</Kicker>
          <SplitReveal className="h-lg mt-4 max-w-[18ch] text-paper">Fifteen years, counted <span className="b">not claimed</span>.</SplitReveal>
          <p data-reveal className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-paper/60">We don't publish invented testimonials — video stories from real clients live on setmycareer.com. Here is what the ledger says.</p>
          <div className="mt-12 grid grid-cols-2 gap-8 [&_.border-t]:border-paper/15 [&_.display]:text-paper [&_.mono]:text-paper/50 md:grid-cols-4">
            <Num value={60230} label="Clients guided" />
            <Num value={101780} label="Hours of counselling" />
            <Num value={71537} label="Assessments taken" />
            <Num value={1000} label="Placed yearly into top firms" />
          </div>
          <div data-reveal className="mt-12 flex flex-wrap items-center gap-6 border-t border-paper/15 pt-8">
            <Magnetic href={PORTAL_URL} dark>Add your line to it</Magnetic>
            <a href="https://setmycareer.com" className="ul text-[13.5px] text-paper/75">Client stories on setmycareer.com →</a>
          </div>
        </div>
      </section>
    </main>
  )
}
