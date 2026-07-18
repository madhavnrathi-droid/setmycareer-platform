import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { ConsoleTour } from "@/components/counsellors/ConsoleTour"
import { ProductShot } from "@/components/product/ProductShot"
import { useReveals, useCounter } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { COUNSELLOR_URL, useStats } from "@/lib/api"

/* The counsellor landing — the night-shift twin of the client site. Same
   editorial system, inverted: a dark, console-native page that sells the
   PRACTICE (the counsellor console) to experienced counsellors and domain
   experts. Minimal text; the animated console demos do the persuading.
   Reached only through quiet doors (footer, /experts, /experts/apply) so it
   never interrupts a client exploring the product. */

const CARRIES = [
  { k: "Clients arrive booked", v: "Marketing, matching and scheduling run upstream — your calendar fills without the chase." },
  { k: "The paperwork writes itself", v: "Live transcripts, timestamped notes and AI-drafted reports. You keep the judgement, not the typing." },
  { k: "Instruments included", v: "Validated aptitude, interest and personality batteries — assigned in a click, scored live." },
  { k: "Payments handled", v: "Packages, billing and refunds are the platform's problem. Your session is yours." },
]

const PATHS = [
  {
    tag: "Path one", name: "Career counsellor",
    body: "Certified counsellors who run full journeys — assessments, sessions, the report. The console is your practice.",
    points: ["Full caseload tooling", "AI-drafted reports you own", "SMC training & method"],
  },
  {
    tag: "Path two", name: "Domain expert",
    body: "Practitioners who've done the career — engineers, doctors, designers — taking one-off expert sessions.",
    points: ["Single-session format", "Your hours, your rate", "No admin, just the conversation"],
  },
]

const STEPS = [
  { no: "01", t: "Apply", d: "Ten minutes — credentials, expertise, availability." },
  { no: "02", t: "Review", d: "A real person reads it. We reply within days, not weeks." },
  { no: "03", t: "Onboard", d: "Verification, the method, and your console — guided." },
  { no: "04", t: "First client", d: "Matched to your expertise. The calendar does the rest." },
]

export function Counsellors() {
  const ref = useReveals()
  const stats = useStats()
  const navs = Number(stats?.NavigatorCount) || 55
  useSeo({
    title: "For Counsellors — The SetMyCareer Console | SetMyCareer",
    description: "The counsellor console: clients arrive booked, transcripts and notes write themselves, AI drafts the report and you own the judgement. Apply to join India's science-backed career counselling network.",
    path: "/counsellors",
  })

  return (
    <main ref={ref} className="plate-dark">
      {/* ── hero — the pitch in nine words ── */}
      <section className="wrap pb-10 pt-40 md:pt-48">
        <Kicker className="!text-paper/50">For counsellors &amp; career experts</Kicker>
        <SplitReveal as="h1" className="display mt-6 max-w-[13ch] text-paper">Run the practice. <span className="b">We carry the rest.</span></SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-paper/60">One console for the whole practice — clients, sessions, instruments, reports. You bring the judgement; the machine does the drudgery.</p>
        <div data-reveal className="mt-10 flex flex-wrap items-center gap-6">
          <Magnetic href="/experts/apply" dark>Apply to join</Magnetic>
          <a href={COUNSELLOR_URL} className="ul inline-flex items-center gap-2 text-[13.5px] text-paper/70">Sign in to the console <ArrowUpRight size={15} /></a>
        </div>
        {/* real numbers, quietly */}
        <div data-reveal className="mt-14 flex flex-wrap gap-x-12 gap-y-5 border-t border-paper/15 pt-7">
          <HeroStat value={navs} label="Certified counsellors" />
          <HeroStat value={101780} label="Hours of counselling" />
          <HeroStat value={71537} label="Assessments taken" />
        </div>
      </section>

      {/* ── the console tour — the demos do the selling ── */}
      <section id="console" className="hair-t border-paper/15">
        <div className="wrap py-16 md:py-24">
          <Kicker className="!text-paper/50">The console</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[15ch] text-paper">A day inside, in <span className="b">five screens</span>.</SplitReveal>
          <p data-reveal className="lead mt-6 max-w-xl text-paper/60">Hover a step — the screen drops in and plays.</p>
          <ConsoleTour />
        </div>
      </section>

      {/* ── the real thing — actual console screenshots (framed like the client shots) ── */}
      <section id="real" className="hair-t border-paper/15">
        <div className="wrap py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Kicker className="!text-paper/50">The real thing</Kicker>
              <SplitReveal className="h-xl mt-5 max-w-[16ch] text-paper">Not a mockup. The <span className="b">console itself</span>.</SplitReveal>
            </div>
            <a data-reveal href={COUNSELLOR_URL} className="ul inline-flex shrink-0 items-center gap-2 text-[13.5px] text-paper/70">Sign in to the live console <ArrowUpRight size={15} /></a>
          </div>
          <p data-reveal className="lead mt-6 max-w-xl text-paper/60">Your caseload, your morning, your reports — the actual screens, shown here with a sample caseload.</p>

          <div className="mt-12">
            <ProductShot src="/product/console-overview.png" alt="The counsellor console dashboard — active clients, caseload by package, delivery mode and the day's sessions" chrome="app.setmycareer.com/overview" label="Dashboard" />
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <ProductShot src="/product/console-clients.png" alt="The counsellor caseload — every client, their packages and last session, searchable" chrome="app.setmycareer.com/clients" label="Caseload" imgClassName="object-top" />
            <ProductShot src="/product/console-reports.png" alt="The reports workspace — build a Career Intelligence Report from any client's blueprint" chrome="app.setmycareer.com/reports" label="Reports" imgClassName="object-top" />
          </div>
          <p data-reveal className="mono mt-6 text-[10px] uppercase tracking-[0.14em] text-paper/35">Sample caseload · no real client data shown</p>
        </div>
      </section>

      {/* ── what the platform carries — four quiet rows ── */}
      <section className="hair-t border-paper/15">
        <div className="wrap grid gap-x-12 gap-y-4 py-16 md:grid-cols-2 md:py-24">
          <div className="md:sticky md:top-28 md:self-start">
            <Kicker className="!text-paper/50">What we carry</Kicker>
            <SplitReveal className="h-xl mt-5 max-w-[12ch] text-paper">You counsel. <span className="b">That's it.</span></SplitReveal>
          </div>
          <div>
            {CARRIES.map((c) => (
              <div data-reveal key={c.k} className="border-t border-paper/15 py-6">
                <h3 className="text-[17px] font-medium tracking-tight text-paper">{c.k}</h3>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-paper/55">{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── two ways in ── */}
      <section className="hair-t border-paper/15">
        <div className="wrap py-16 md:py-24">
          <Kicker className="!text-paper/50">Two ways to join</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[16ch] text-paper">Counsellor, or <span className="b">expert</span>.</SplitReveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[14px] border border-paper/15 bg-paper/15 md:grid-cols-2">
            {PATHS.map((p) => (
              <Link data-reveal key={p.name} to="/experts/apply" className="group bg-[#111110] p-8 transition-colors hover:bg-[#161615]">
                <p className="mono text-[10.5px] uppercase tracking-[0.14em] text-paper/40">{p.tag}</p>
                <h3 className="mt-3 text-[22px] font-medium tracking-tight text-paper">{p.name}</h3>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-paper/55">{p.body}</p>
                <ul className="mt-5 flex flex-col gap-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-baseline gap-2.5 text-[12.5px] text-paper/70">
                      <span className="mono text-[10px] text-paper/35">—</span>{pt}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-paper transition-colors group-hover:text-paper/60">
                  Apply <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── onboarding — four short steps ── */}
      <section className="hair-t border-paper/15">
        <div className="wrap py-16 md:py-24">
          <Kicker className="!text-paper/50">Onboarding</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[14ch] text-paper">Apply to first client, <span className="b">guided</span>.</SplitReveal>
          <div className="mt-12 grid gap-px md:grid-cols-4">
            {STEPS.map((s) => (
              <div data-reveal key={s.no} className="border-t border-paper/15 py-6 md:border-t-0 md:border-l md:pl-6 md:first:border-l-0 md:first:pl-0">
                <span className="mono text-[11px] tabular-nums text-paper/40">{s.no}</span>
                <h3 className="mt-2 text-[16px] font-medium tracking-tight text-paper">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-paper/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── close — one door in, one door back ── */}
      <section className="hair-t border-paper/15">
        <div className="wrap flex flex-col items-center py-20 text-center md:py-28">
          <SplitReveal className="h-xl mx-auto max-w-[18ch] text-paper">The best counsellors deserve <span className="b">better tools</span>.</SplitReveal>
          <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <Magnetic href="/experts/apply" dark>Apply to join</Magnetic>
            <Link to="/experts" className="ul inline-flex items-center gap-2 text-[13.5px] text-paper/70">Meet the network <ArrowRight size={15} /></Link>
          </div>
          <p data-reveal className="mono mt-10 text-[10.5px] uppercase tracking-[0.14em] text-paper/40">Questions first? <Link to="/contact" className="ul text-paper/70">Talk to us</Link></p>
        </div>
      </section>
    </main>
  )
}

/* an animated counter stat for the dark hero */
function HeroStat({ value, label }: { value: number; label: string }) {
  const ref = useCounter(value)
  return (
    <div>
      <p className="text-[clamp(1.6rem,3vw,2.4rem)] font-extralight tabular-nums tracking-tight text-paper"><span ref={ref}>{value.toLocaleString("en-IN")}</span>+</p>
      <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-paper/45">{label}</p>
    </div>
  )
}
