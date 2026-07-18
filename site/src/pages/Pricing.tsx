import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Add, ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { STUDENT_JOURNEY, PROFESSIONAL, MARKETPLACE, CREDIT_PACKS, fmtINR, type Offering } from "@/content/offerings"
import { GradientCard, type CardSize } from "@/components/pricing/GradientCard"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { CompareTable } from "@/components/pricing/CompareTable"
import { LongTermSection } from "@/components/pricing/LongTermSection"
import { CostLadder } from "@/components/CostLadder"

/* The pricing page, v2 — the poster system. No alternating editorial grids:
   every programme speaks the SAME card grammar (a dark gradient plate, big
   grotesk name, huge tabular price, small mono metadata in the corners), and
   the two tracks are separated by full-width intro bands you cannot miss —
   massive sans titles keyed by each track's flagship gradient sliver. Sans-led
   throughout; data comes from content/offerings.ts; checkout at /checkout/<id>. */

const NAV = [
  { n: "01", label: "Students & parents", hash: "#students" },
  { n: "02", label: "Working professionals", hash: "#professionals" },
  { n: "03", label: "Marketplace", hash: "#marketplace" },
  { n: "04", label: "Long-term programmes", hash: "#longterm" },
  { n: "05", label: "Find your fit", hash: "#fit" },
]

const studentSize = (o: Offering): CardSize =>
  o.id === "free_cri" ? "compact" : o.featured ? "feature" : "standard"

export function Pricing() {
  const ref = useReveals()
  useSeo({
    title: "Programmes & Pricing — SetMyCareer",
    description:
      "The 2026 SetMyCareer catalogue: a free Career Clarity Index, the student journey from Career Navigator to True North, professional programmes up to Director's Cut, an expert marketplace, and the application-only long-term programmes Blueprint & Autobiography — every price stated, AI Career Copilot included.",
    path: "/pricing",
  })

  return (
    <main ref={ref} className="pt-28">
      {/* ── hero — short and huge, then the section index ── */}
      <section className="wrap pb-12 pt-12 md:pb-16 md:pt-20">
        <Kicker>The 2026 catalogue</Kicker>
        <SplitReveal as="h1" className="h-xl mt-6 max-w-[14ch]">
          Programmes &amp; <span className="b">pricing</span>.
        </SplitReveal>
        <p data-reveal className="mt-6 max-w-2xl text-[clamp(1.05rem,1.5vw,1.3rem)] font-light leading-relaxed text-ink-60">
          Every fee on this page is a rounding error against the cost of the wrong degree — lakhs of rupees, and a decade you do not get back. The cheapest line on this page is clarity.
        </p>
        <nav data-reveal aria-label="Page sections" className="hair-t hair-b mt-10 flex flex-wrap gap-x-9 gap-y-1">
          {NAV.map((s) => (
            <Link
              key={s.hash}
              to={`/pricing${s.hash}`}
              className="mono inline-flex items-baseline gap-2.5 py-4 text-[11.5px] uppercase tracking-[0.14em] text-ink-60 transition-colors hover:text-ink"
            >
              <span className="tabular-nums text-ink-40">{s.n}</span>
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
      </section>

      {/* ── the arithmetic — reframe every price below against the stakes ── */}
      <CostLadder standalone />

      {/* ── find your fit — unmissable, right up front (rounded plate) ── */}
      {/* pt gap keeps the full-bleed CostLadder dark band off the rounded dark fit plate */}
      <section id="fit" className="wrap pt-14 md:pt-20">
        <div className="relative overflow-hidden rounded-[28px] bg-ink text-paper">
          <PackageGradient offeringId="fit_test" interactive scrim />
          <div className="relative z-[1] grid items-end gap-x-14 gap-y-9 px-6 py-14 sm:px-10 md:px-14 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p data-reveal className="mono text-[10.5px] uppercase tracking-[0.18em] text-paper/60">05 · Find your fit</p>
            <h2 data-reveal className="mt-5 max-w-[18ch] text-[clamp(2rem,4.4vw,3.6rem)] font-extralight leading-[1.02] tracking-[-0.02em] text-paper">
              Don't know which package suits you?
            </h2>
            <p data-reveal className="mono mt-6 text-[11.5px] uppercase tracking-[0.14em] leading-relaxed text-paper/70">
              A few reflective questions · ~5 minutes · an AI-written plan tells you exactly which one fits
            </p>
          </div>
          <div data-reveal className="lg:col-span-4 lg:justify-self-end">
            <Link to="/fit" className="btn btn--solid-dark">
              <span>Take the free test</span> <ArrowUpRight size={15} className="btn-arrow" />
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* ── 01 · students & parents ── */}
      <section id="students">
        <TrackIntro
          index="01 · Track one"
          title={<>Students &amp; <span className="b">parents</span>.</>}
          who="School and college students — and the families deciding with them — from a first honest read to complete career architecture."
        />
        <div className="wrap grid gap-5 md:gap-6">
          {STUDENT_JOURNEY.map((o) => (
            <GradientCard
              key={o.id}
              o={o}
              size={studentSize(o)}
              eyebrow={`${String(o.order).padStart(2, "0")} · Student journey`}
            />
          ))}
        </div>

        {/* side by side — the student journey only */}
        <div className="wrap pb-16 pt-16 md:pb-24 md:pt-20" id="compare">
          <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">Side by side</p>
          <h2 data-reveal className="mt-4 max-w-[18ch] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
            The journey, <span className="b">compared</span>.
          </h2>
          <div className="mt-10"><CompareTable /></div>
        </div>
      </section>

      {/* ── 02 · working professionals ── */}
      <section id="professionals" className="hair-t">
        <TrackIntro
          index="02 · Track two"
          title={<>Working <span className="b">professionals</span>.</>}
          who="Senior counsellors only — a diagnosis first, then a structured switch, or reinvention at the leadership level."
        />
        <div className="wrap grid gap-5 pb-16 md:gap-6 md:pb-24 xl:grid-cols-3">
          {PROFESSIONAL.map((o) => (
            <GradientCard
              key={o.id}
              o={o}
              split={false}
              eyebrow={`${String(o.order).padStart(2, "0")} · Professional`}
            />
          ))}
        </div>
      </section>

      {/* ── 03 · marketplace — standalone or add-on ── */}
      <section id="marketplace" className="hair-t">
        <div className="wrap pb-10 pt-16 md:pb-12 md:pt-24">
          <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">03 · Marketplace</p>
          <SplitReveal className="mt-4 max-w-[18ch] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
            Standalone, or <span className="b">added on</span>.
          </SplitReveal>
          <p data-reveal className="mt-4 max-w-2xl text-[15px] font-light leading-relaxed text-ink-60">
            Sessions you can buy on their own — or bolt onto any programme.
          </p>
        </div>
        <div className="wrap grid gap-5 pb-16 sm:grid-cols-2 md:pb-24 lg:grid-cols-3">
          {MARKETPLACE.map((o, i) => (
            <GradientCard
              key={o.id}
              o={o}
              size="market"
              eyebrow={`${String(i + 1).padStart(2, "0")} · Marketplace`}
            />
          ))}
        </div>
      </section>

      {/* ── long-term programmes — the aspirational anchors, application only ── */}
      <LongTermSection />

      {/* ── AI credits — add more, anytime. No hard sell. ── */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap grid items-start gap-x-14 gap-y-8 py-14 md:grid-cols-[0.8fr_1.2fr] md:py-16">
          <div>
            <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">AI credits</p>
            <h2 data-reveal className="mt-4 max-w-[12ch] text-[clamp(1.7rem,3vw,2.4rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
              Add more, anytime.
            </h2>
            <p data-reveal className="mt-4 max-w-sm text-[14px] font-light leading-relaxed text-ink-60">
              Every programme ships with its own copilot allowance. If a season runs long, top up in a
              minute — from {fmtINR(499)}. Credits are a usage allowance for AI services; the fine print
              lives in the <Link to="/legal/terms-of-service" className="ul">terms</Link>.
            </p>
          </div>
          <ul data-reveal>
            {CREDIT_PACKS.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-6 border-t border-line py-4 last:border-b">
                <span className="text-[14.5px]">{p.name}</span>
                <span className="flex items-baseline gap-6">
                  <span className="mono text-[13px] tabular-nums">{fmtINR(p.price.inr)}</span>
                  <Link to={`/checkout/${p.id}`} className="ul mono text-[10.5px] uppercase tracking-[0.12em] text-ink-60">
                    Add<span className="sr-only"> {p.name}</span>
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── the questions ── */}
      <section className="hair-t">
        <div className="wrap grid gap-12 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">Questions about paying</p>
            <h2 data-reveal className="mt-4 max-w-[14ch] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
              Before you commit.
            </h2>
            <Link data-reveal to="/trust#faq" className="ul mt-6 inline-flex items-center gap-2 text-[14px] text-ink-60">
              All questions <ArrowUpRight size={15} />
            </Link>
          </div>
          <div>{FAQ.map((f, i) => <Qa key={f.q} q={f.q} a={f.a} first={i === 0} />)}</div>
        </div>
      </section>

      {/* ── close — the free door, once more, quietly ── */}
      <section className="hair-t">
        <div className="wrap py-20 text-center md:py-24">
          <SplitReveal className="h-lg mx-auto max-w-[22ch]">
            Four minutes tells you where you stand — <span className="b">free</span>.
          </SplitReveal>
          <div data-reveal className="mt-9 flex flex-col items-center gap-5">
            <Link to="/cri" className="btn"><span>Take the free index</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
            <Link to="/contact" className="ul inline-flex items-center gap-2 text-[14px] text-ink-60">
              Still weighing a programme? Talk to us <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

/* ── the track intro band — the distinction you cannot miss: a massive sans
      title, one who-it's-for line, and the track's flagship gradient as a thin
      key-line strip. ── */
function TrackIntro({ index, title, who }: { index: string; title: ReactNode; who: string }) {
  return (
    <header className="wrap pb-10 pt-16 md:pb-12 md:pt-24">
      <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">{index}</p>
      <SplitReveal className="h-xl mt-4 max-w-[16ch]">
        {title}
      </SplitReveal>
      <p data-reveal className="mt-5 max-w-2xl text-[15px] font-light leading-relaxed text-ink-60">{who}</p>
    </header>
  )
}

/* ── FAQ — the questions people actually ask before paying ── */
const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "How do I know which programme fits?",
    a: (
      <>
        Take the <Link to="/fit" className="ul">fit test</Link> — a few reflective questions and two in
        your own words, about five minutes. It weighs everything on this page against your situation and
        writes you a plan: your best fit, a recommended journey and your next moves. If you'd rather talk
        it through, book a consultation and let the diagnosis decide.
      </>
    ),
  },
  {
    q: "How do I choose between Navigator, Accelerator and Big Picture?",
    a: (
      <>
        Ask how much of the decision is still open. Career Navigator is the self-serve toolkit —
        assessments, reports and the copilot, no counsellor. Accelerator settles one named decision
        with a counsellor beside you. Big Picture is for the full map: several options, parents
        in the room, a plan that reaches past a single choice. Still unsure? Take the free index, or
        book a consultation and let the diagnosis decide.
      </>
    ),
  },
  {
    q: "What are Career Credits and Voice Credits?",
    a: (
      <>
        A usage allowance for the AI services in your plan — Career Credits power the copilot's chat,
        Voice Credits its voice sessions. Every paid programme includes an allowance sized for its
        journey, and you can top up from {fmtINR(499)} whenever you run low. The exact consumption
        rules live in the <Link to="/legal/terms-of-service" className="ul">terms of service</Link>.
      </>
    ),
  },
  {
    q: "Can I upgrade to a bigger programme later?",
    a: (
      <>
        Yes — you pay the difference, and everything carries over: your assessments, reports and the
        copilot's memory. <Link to="/contact" className="ul">Talk to us</Link> and we'll move you across.
      </>
    ),
  },
  {
    q: "Does a consultation count toward a programme?",
    a: (
      <>
        It does. If you continue into a programme after your consultation, the consultation fee is
        adjusted against it — your counsellor sets this up at the end of the session.
      </>
    ),
  },
  {
    q: "What's the refund policy?",
    a: (
      <>
        Stated plainly and in full in our{" "}
        <Link to="/legal/refund-cancellation-policy" className="ul">refund &amp; cancellation policy</Link> —
        no surprises in fine print. It's short; read it before you buy.
      </>
    ),
  },
  {
    q: "How do the long-term programmes (Blueprint & Autobiography) work?",
    a: (
      <>
        They're application-only. You apply from the{" "}
        <Link to="/programs/blueprint" className="ul">Blueprint</Link> (students) or{" "}
        <Link to="/programs/autobiography" className="ul">Autobiography</Link> (executives) page, we map
        your situation in a discovery conversation, then send a tailored proposal — scope, duration and a
        custom quote. No obligation either way; if a smaller programme fits better, we'll say so.
      </>
    ),
  },
  {
    q: "We're not in India — can we still work with you?",
    a: (
      <>
        Yes — everything runs online. Billing is in Indian rupees; the dollar figures on this page are
        indicative for families abroad. <Link to="/contact" className="ul">Write to us</Link> if you'd
        like help choosing across time zones.
      </>
    ),
  },
]

function Qa({ q, a, first }: { q: string; a: ReactNode; first: boolean }) {
  const [open, setOpen] = useState(first)
  return (
    <div className="border-t border-line last:border-b">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-6 py-5 text-left">
        <h3 className="text-[17px] font-medium tracking-tight">{q}</h3>
        <Add size={20} className="shrink-0 text-ink-40 transition-transform duration-300" style={{ transform: open ? "rotate(45deg)" : "none" }} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden"><p className="max-w-[62ch] pb-6 text-[15px] font-light leading-relaxed text-ink-80">{a}</p></div>
      </div>
    </div>
  )
}
