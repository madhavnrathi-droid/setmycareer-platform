import { Kicker } from "@/components/bits"

// The method has an author. A real, high-credibility founder moment — the quote and
// credentials are verbatim from setmycareer.com (no fabricated testimonials). Builds
// trust the honest way: the person, named, with provable standing.
const CREDS = [
  "Ph.D., IIT Bombay",
  "Mercer Asia Award",
  "40+ years in industry",
  "Campus hiring across 12 Asia-Pacific countries",
  "Trained 100+ counsellors",
]

export function Founder() {
  return (
    <section className="hair-t bg-paper-pure">
      <div className="wrap py-24 md:py-32">
        <Kicker>Behind the method</Kicker>
        <blockquote data-reveal className="serif mt-7 max-w-[24ch] text-[clamp(1.7rem,3.8vw,3rem)] font-light italic leading-[1.15] tracking-tight text-ink">
          “True leadership begins when someone sees your potential more clearly than you do — and refuses to let it go unseen.”
        </blockquote>
        <div data-reveal className="mt-10 grid gap-6 border-t border-line pt-7 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
          <div>
            <p className="text-[17px] font-medium tracking-tight">Dr. Nandkishore Rathi</p>
            <p className="mono mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-40">Founder &amp; Chief Expert</p>
          </div>
          <ul className="flex flex-wrap gap-x-7 gap-y-2.5 md:justify-end">
            {CREDS.map((c) => (
              <li key={c} className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-60">{c}</li>
            ))}
          </ul>
        </div>
        <p data-reveal className="lead mt-12 max-w-xl text-ink-60">The science behind SetMyCareer is his life's work — fifteen years of it, turned into instruments anyone can pick up. Over a thousand students are placed into leading firms each year on the back of it.</p>
      </div>
    </section>
  )
}
