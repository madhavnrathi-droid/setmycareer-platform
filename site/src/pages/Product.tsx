import { Link } from "react-router-dom"
import { ArrowUpRight, ArrowRight, ArrowDown } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { offeringById, longTermBySlug, fmtINR } from "@/content/offerings"
import { GradientCard, checkoutHref } from "@/components/pricing/GradientCard"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { CriFlow } from "@/components/cri/CriFlow"
import { IntelViz } from "@/components/demos/IntelViz"
import { ChatDemo } from "@/components/product/ChatDemo"
import { TranscriptDemo } from "@/components/product/TranscriptDemo"
import { ProductShot, ShotChip } from "@/components/product/ProductShot"
import { IMacFrame } from "@/components/product/IMacFrame"

// The /product page, rebuilt to a single argument: the dashboard is the product;
// assessments, counsellors, Compass and reports are the inputs that make it
// smarter — and it only gets sharper the longer you use it. One idea per scroll,
// following the visitor's own questions: why this is hard → why the old way
// fails → can it be measured → the dashboard reveal → what it becomes → the human
// input → the adaptive layer → what it emits → three decisions → the chapters →
// the long game → begin. Editorial, monochrome, one solid CTA per view.
export function Product() {
  const ref = useReveals()
  useSeo({
    title: "Product — SetMyCareer",
    description: "Not a counselling service you finish — a career decision-intelligence system. Run the real index on the page, meet the dashboard the evidence builds, and see the chapters you can switch on.",
    path: "/product",
  })
  return (
    <main ref={ref} className="pt-28">
      {/* 01 · the problem — confusion. Type only; withhold the screen. */}
      <section id="the-hard-part" className="wrap pb-14 pt-10 md:pb-24 md:pt-16">
        <Kicker>01 — The problem</Kicker>
        <SplitReveal as="h1" className="display mt-6 max-w-[17ch]">
          The biggest bet most families make, made <span className="b">with almost no data</span>.
        </SplitReveal>
        <p data-reveal className="lead mt-8 max-w-2xl text-ink-60">
          Between Class 10 and a first job — or a first switch — a person makes a chain of decisions worth ₹10–40 lakh in fees alone, in a country with roughly one counsellor for every 3,000 students. The choice is enormous. The evidence behind it is usually a conversation and a hunch.
        </p>
        <div data-reveal className="mt-12 flex flex-wrap gap-x-12 gap-y-4 border-t border-line pt-6">
          {[
            ["₹10–40L", "on the degree alone"],
            ["1 : 3,000", "counsellors to students"],
            ["A hunch", "the usual basis for the call"],
          ].map(([n, l]) => (
            <div key={n}>
              <div className="text-[clamp(1.5rem,3vw,2.4rem)] font-extralight tracking-[-0.02em]">{n}</div>
              <div className="mono mt-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-40">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 02 · why the old way fails — recognition. The Big Idea, in words. */}
      <section id="why-methods-fail" className="plate-dark">
        <div className="wrap py-20 md:py-28">
          <Kicker className="!text-paper/50">02 — Why the old way fails</Kicker>
          <SplitReveal className="h-xl mt-6 max-w-[18ch] text-paper">
            Advice ends when the session does. A report <span className="b">dies as a PDF</span>.
          </SplitReveal>
          <p data-reveal className="lead mt-7 max-w-2xl text-paper/60">
            A counsellor gives you their read, then leaves. A test hands you a printout you file and forget. Both stop the moment they finish — exactly when the decision actually starts to play out, over years. SetMyCareer is built the other way round: it starts collecting evidence and never stops.
          </p>
          <div data-reveal className="mt-14 grid gap-px sm:grid-cols-3">
            {BIG_IDEA.map((row) => (
              <div key={row.old} className="border-t border-paper/15 py-6 pr-6">
                {/* paper/60 (~6.6:1 on ink) keeps the struck "before" line AA-legible */}
                <p className="text-[15px] leading-relaxed text-paper/60 line-through decoration-paper/30">{row.old}</p>
                <p className="mt-3 text-[16px] font-medium leading-snug text-paper">{row.new}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 · the premise — proof. The single kept "see it work" demo. */}
      <section id="can-it-be-measured" className="hair-t">
        <div className="wrap py-20 md:py-28">
          <div className="mb-10 max-w-2xl">
            <Kicker>03 — The premise</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[20ch]">
              A career decision <span className="b">can be measured</span> — scored the same way every time.
            </SplitReveal>
            <p data-reveal className="lead mt-7 text-ink-60">
              Not with one quiz. With validated instruments — interest, personality, aptitude — scored identically every time and weighed against real labour-market demand. Over 71,537 tests since 2010 sit behind the scoring. Run the real screening index now, on this page.
            </p>
          </div>
          <div data-reveal><CriFlow /></div>
        </div>
      </section>

      {/* ── THE PRODUCT · the reveal. Anticipation on dark, then the live surface.
            Moved here from the old section 06 — this is the anticipation peak,
            before any price. ── */}
      <section id="the-dashboard" className="plate-dark scroll-mt-24">
        <div className="wrap pt-20 text-center md:pt-28">
          <Kicker className="!text-paper/50">The product</Kicker>
          <SplitReveal className="h-xl mx-auto mt-6 max-w-[20ch] text-paper">
            Advice you can forget. <span className="b">Evidence you can return to</span>.
          </SplitReveal>
          <p data-reveal className="mx-auto mt-7 max-w-xl text-[15px] font-light leading-relaxed text-paper/60">
            This is the product. Not a report you file — a running record of one decision. Every test you take, every session you sit, every note a counsellor approves lands in one place and stays there, so the picture only ever gets sharper.
          </p>
        </div>
        <div className="wrap pb-20 pt-14 md:pb-28">
          {/* the reveal: the home scrolls itself, so it reads as a live surface */}
          <div className="[&_.b]:font-semibold">
            <IMacFrame
              src="/product/portal-dashboard.png"
              video="/product/dashboard-scroll.mp4"
              alt="The SetMyCareer client dashboard, scrolling itself — one home for every assessment, session and report"
            >
              <ShotChip className="bottom-16 -left-3 hidden max-w-[230px] sm:block md:-left-10">
                <p className="mono text-[10px] uppercase tracking-[0.14em] text-ink-40">The signal</p>
                <p className="mt-1 text-[13px] leading-snug">One number that moves as the evidence comes in — and a counsellor who stands behind it.</p>
              </ShotChip>
            </IMacFrame>
          </div>
        </div>
      </section>

      {/* the long view — what it BECOMES with use. A beat that didn't exist. */}
      <section id="what-it-becomes" className="wrap scroll-mt-24 py-16 md:py-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <Kicker>The long view</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[15ch]">
              Re-read at every turn — <span className="b">Class 10, the degree, the first switch</span>.
            </SplitReveal>
            <p data-reveal className="lead mt-7 max-w-md text-ink-60">
              One baseline, re-assessed as you grow. The reports library only gets longer; the recording, transcript and notes of every session stay in your account. The read at 16 and the read at 22, measured against the same yardstick.
            </p>
          </div>
          {/* the growing stack — two real report stills, fanned */}
          <div data-reveal className="relative mx-auto w-full max-w-[440px]">
            <ProductShot
              src="/product/portal-sigma-report.png"
              alt="The Sigma personality profile — norm-referenced percentiles and a factor radar"
              chrome=""
              label="A profile"
              className="rotate-[-3deg]"
            />
            <ProductShot
              src="/product/portal-report-cover.png"
              alt="A SetMyCareer Career Intelligence Report — a personal, continuous-scroll deliverable that re-generates as evidence arrives"
              chrome=""
              label="The record, growing"
              reveal={false}
              className="mt-[-14%] ml-[10%] rotate-[2deg]"
            />
          </div>
        </div>
      </section>

      {/* the human input — sessions as an INPUT that feeds the dashboard. */}
      <section id="counsellors" className="hair-t scroll-mt-24 bg-paper-pure">
        <div className="wrap py-16 md:py-24">
          <div className="mb-10 max-w-2xl">
            <Kicker>The human input</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[19ch]">
              A number no one owns is just a number. <span className="b">A counsellor owns every one</span>.
            </SplitReveal>
            <p data-reveal className="lead mt-7 text-ink-60">
              55+ certified counsellors read what the scores can't. Compass drafts; a counsellor interprets, edits and signs every recommendation before it reaches a family. Counsellor-led video runs in the browser — a live transcript, notes approved and saved to the record. It's the honesty line the whole system rests on.
            </p>
          </div>
          <div data-reveal><TranscriptDemo /></div>
        </div>
      </section>

      {/* the adaptive layer — Compass. Always on, between sessions. */}
      <section id="compass" className="scroll-mt-24">
        <div className="wrap grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Kicker>The adaptive layer</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[12ch]">
              <span className="b">Compass</span> — the part that's always on.
            </SplitReveal>
            <p data-reveal className="lead mt-7 max-w-md text-ink-60">
              Compass speaks only from your own results — your interests, personality and aptitude — in chat or voice, whenever you need to think something through. It keeps the record live between sessions, and hands the recommendation back to your counsellor.
            </p>
          </div>
          <div data-reveal><ChatDemo /></div>
        </div>
      </section>

      {/* what the system emits — the report, recast as one snapshot; the evidence
            engine (inputs → synthesis → dashboard) and cited demand. */}
      <section id="the-report" className="hair-t scroll-mt-24 bg-paper-pure">
        <div className="wrap py-16 md:py-24">
          <div className="mb-12 max-w-2xl">
            <Kicker>What the system emits</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[16ch]">
              The report isn't the end. It's <span className="b">one snapshot the system prints</span>.
            </SplitReveal>
            <p data-reveal className="lead mt-7 text-ink-60">
              Interest, personality, aptitude, session notes and cited market demand are weighed and cross-checked into one read — every figure traced to the instrument, or the moment in-session, that produced it. It re-generates as new evidence arrives.
            </p>
          </div>

          {/* the evidence engine — inputs funnel into the living record, not a PDF */}
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <div data-reveal className="grid gap-3">
              {REPORT_INPUTS.map((it, i) => (
                <div key={it.label} className="flex items-start gap-3.5 border-t border-line py-3.5">
                  <span className="mono pt-0.5 text-[10px] tabular-nums text-ink-30">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4 className="text-[14px] font-medium tracking-tight">{it.label}</h4>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-55">{it.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div data-reveal className="flex flex-col items-center gap-3 px-2 text-center">
              <ArrowDown size={18} className="text-ink-30 lg:hidden" />
              <ArrowRight size={18} className="hidden text-ink-30 lg:block" />
              <span className="grid size-16 place-items-center rounded-full border border-[color:var(--color-growth)] text-[color:var(--color-growth)]"><LogoMark size={26} /></span>
              <p className="mono max-w-[13ch] text-[9.5px] uppercase leading-relaxed tracking-[0.14em] text-ink-40">Weighed · cross-checked · synthesised</p>
              <ArrowDown size={18} className="text-ink-30 lg:hidden" />
              <ArrowRight size={18} className="hidden text-ink-30 lg:block" />
            </div>
            <div data-reveal>
              <div className="rounded-[14px] border border-line bg-ink p-6 text-paper">
                <p className="kicker !text-paper/60">Into the living record</p>
                <h4 className="h-lg mt-3 text-paper">Not a file. A screen you come back to.</h4>
                <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-paper/65">The snapshot lands in the dashboard and stays. Read it now, and re-read the sharper version a year from now.</p>
              </div>
              <a href="/product/sample-career-report.pdf" target="_blank" rel="noopener noreferrer" className="ul mt-4 inline-block text-[13px] font-medium text-ink-70">
                Read a full sample (PDF) →
              </a>
            </div>
          </div>

          {/* cited demand — the market the recommendations are weighed against */}
          <div data-reveal className="mt-16 border-t border-line pt-12">
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-40">Weighed against real demand</p>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-60">Every recommendation is set against the labour market. The figures below are real and cited — hover any to see the source.</p>
            <div className="mt-8"><IntelViz /></div>
          </div>
        </div>
      </section>

      {/* three decisions — surface all three audiences early. */}
      <section id="three-decisions" className="wrap scroll-mt-24 py-16 md:py-24">
        <Kicker>Three decisions</Kicker>
        <SplitReveal className="h-xl mt-6 max-w-[16ch]">
          One system. <span className="b">Three very different decisions</span>.
        </SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">
          A Class 12 student choosing a degree, a parent underwriting it, and a director weighing a founder's leap need the same evidence — and completely different depth. Pick your door.
        </p>
        <div data-reveal className="mt-10 max-w-3xl">
          {DOORS.map((d) => (
            <Link key={d.href} to={d.href} className="group flex items-center justify-between gap-6 border-t border-line py-5 last:border-b">
              <span className="min-w-0">
                <span className="text-[clamp(1.15rem,2.2vw,1.7rem)] font-extralight tracking-[-0.02em]">{d.label}</span>
                <span className="ml-4 hidden text-[13px] text-ink-55 sm:inline">{d.fear}</span>
              </span>
              <ArrowDown size={18} className="shrink-0 text-ink-40 transition-transform group-hover:translate-y-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* for parents — the highest-fear, highest-value buyer, its own arc. */}
      <AudienceBeat
        id="parents"
        eyebrow="For parents"
        head={<>Certainty before the <span className="b">₹10–40 lakh bet</span>.</>}
        body="You're not buying reassurance. You're buying evidence — gathered before the fees are paid, kept as your child grows, with a counsellor who sits with you, not only the student. Shared access means you read the same record they do."
        shot={{ src: "/product/portal-dashboard.png", label: "Shared access", chip: "One record, read by parent and student — and a dedicated parent session inside Big Picture." }}
      />

      {/* for students — clarity / relief. */}
      <AudienceBeat
        id="students"
        eyebrow="For students"
        head={<>Relief from guessing — <span className="b">evidence, not opinions</span>.</>}
        body="Not “follow your passion.” A measured read of where your interests, personality and aptitude actually point — so you spend the next years on purpose instead of by default."
        shot={{ src: "/product/portal-test.png", video: "/product/test-flow.mp4", label: "One question at a time", chip: "The instruments, taken clean — no pressure, one clear question at a time." }}
        flip
        tone="paper"
      />

      {/* for professionals — reinvention / strategy. Surfaced, not buried. */}
      <AudienceBeat
        id="professionals"
        eyebrow="For professionals"
        head={<>The switch has a <span className="b">payroll</span>. Move on evidence.</>}
        body="A change at 34 is nothing like one at 17 — a salary to protect, often a family on it, no year to waste. A diagnosis first, then a structured move: the same instruments, normed for professionals, read by a senior counsellor."
        shot={{ src: "/product/portal-call.png", label: "Senior counsel", chip: "A senior counsellor, in the browser — diagnosis first, then a structured move." }}
      />

      {/* the chapters — all commerce, consolidated. Explore → Master. */}
      <section id="chapters" className="hair-t scroll-mt-24 bg-paper-pure">
        <div className="wrap py-16 md:py-24">
          <div className="max-w-2xl">
            <Kicker>The chapters</Kicker>
            <SplitReveal className="h-xl mt-6 max-w-[15ch]">
              Not five products. <span className="b">Five chapters of one system</span>.
            </SplitReveal>
            <p data-reveal className="lead mt-7 text-ink-60">
              Each tier feeds the same dashboard; your results carry over; step up later and you pay only the difference. Explore → Understand → Navigate → Accelerate → Master — how much of the same system you turn on.
            </p>
          </div>

          {/* the student ladder — Big Picture is the anchor card, the rest are rows */}
          <div className="mt-12 grid items-start gap-x-14 gap-y-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              {STUDENT_CHAPTERS.map((c) => <ChapterRow key={c.chapter} {...c} />)}
              <div data-reveal className="mt-8">
                <Magnetic href="/cri" solid>Start with the free read</Magnetic>
                <p className="mono mt-4 text-[10px] uppercase tracking-[0.12em] text-ink-40">₹0 · ~4 minutes · the record starts here</p>
              </div>
            </div>
            <div className="lg:col-span-7">
              {BIG_PICTURE && <GradientCard o={BIG_PICTURE} size="feature" split={false} priceless wholeCard eyebrow="Accelerate · the anchor chapter" />}
            </div>
          </div>

          {/* the professional mirror — a smaller sub-ladder */}
          <div data-reveal className="mt-16 border-t border-line pt-10">
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-ink-40">For working professionals</p>
            <div className="mt-5 max-w-3xl">
              {PRO_CHAPTERS.map((c) => <ChapterRow key={c.chapter} {...c} />)}
            </div>
          </div>
        </div>
      </section>

      {/* the long game — application-only epilogue. No price race. */}
      <section id="long-game" className="wrap scroll-mt-24 py-16 md:py-24">
        <div className="mb-10 max-w-2xl">
          <Kicker>Epilogue</Kicker>
          <SplitReveal className="h-xl mt-6 max-w-[18ch]">
            For a decision measured in <span className="b">years, not sessions</span>.
          </SplitReveal>
          <p data-reveal className="lead mt-7 text-ink-60">
            Blueprint (students &amp; parents) and Autobiography (executives &amp; founders) are multi-year mentorships — the record kept and re-read across every milestone. No checkout: they begin with a conversation.
          </p>
        </div>
        <div className="grid gap-6">
          <LongGame slug="blueprint" />
          <LongGame slug="autobiography" />
        </div>
      </section>

      {/* begin — one solid CTA, the destination the inputs feed. */}
      <section className="wrap py-24 text-center md:py-32">
        <div data-reveal className="mx-auto mb-8 grid size-14 place-items-center rounded-full border border-line text-ink"><LogoMark size={26} /></div>
        <SplitReveal className="h-xl mx-auto max-w-[20ch]">
          You've seen what the inputs build. <span className="b">This is the system they build it in.</span>
        </SplitReveal>
        <p data-reveal className="lead mx-auto mt-7 max-w-md text-ink-60">Start free. The record begins the moment you do — and only gets sharper from there.</p>
        <div data-reveal className="mt-10 flex justify-center"><Magnetic href="/cri" solid>Take the free read</Magnetic></div>
        <p data-reveal className="mono mt-6 text-[11px] uppercase tracking-[0.16em] text-ink-40">₹0 · no commitment · a few minutes</p>
      </section>
    </main>
  )
}

/* ── the Big Idea, as a contrast triplet ─────────────────────────────────── */
const BIG_IDEA = [
  { old: "Counselling gives advice.", new: "SetMyCareer builds evidence." },
  { old: "Counselling ends.", new: "SetMyCareer keeps evolving." },
  { old: "A report becomes a PDF you forget.", new: "SetMyCareer becomes a record you return to." },
]

/* ── the evidence engine inputs ───────────────────────────────────────────── */
const REPORT_INPUTS = [
  { label: "Validated assessments", body: "Interest, personality and aptitude — scored by the same engine every time." },
  { label: "Sessions & transcripts", body: "Every counsellor conversation, captured verbatim — nothing lost between sessions." },
  { label: "Counsellor notes", body: "The human read the scores can't see — approved before it lands." },
  { label: "Cited market demand", body: "Your options weighed against real, sourced labour-market data — not vibes." },
]

/* ── the three doors ──────────────────────────────────────────────────────── */
const DOORS = [
  { href: "#parents", label: "For parents", fear: "“What if we spend on the wrong degree?”" },
  { href: "#students", label: "For students", fear: "“What am I actually good at?”" },
  { href: "#professionals", label: "For working professionals", fear: "“I've outgrown this — what's the strategy?”" },
]

/* ── an audience beat — one distinct emotional scroll per audience ─────────── */
function AudienceBeat({
  id, eyebrow, head, body, shot, flip = false, tone = "default",
}: {
  id: string
  eyebrow: string
  head: React.ReactNode
  body: string
  shot: { src: string; video?: string; label: string; chip: string }
  flip?: boolean
  tone?: "default" | "paper"
}) {
  return (
    <section id={id} className={`hair-t scroll-mt-24 ${tone === "paper" ? "bg-paper-pure" : ""}`}>
      <div className="wrap grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className={flip ? "md:order-2" : ""}>
          <Kicker>{eyebrow}</Kicker>
          <SplitReveal className="h-lg mt-5 max-w-[15ch]">{head}</SplitReveal>
          <p data-reveal className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-ink-60">{body}</p>
          <Link data-reveal to="#chapters" className="ul mt-7 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-80">
            See the chapters <ArrowRight size={14} />
          </Link>
        </div>
        <div className={flip ? "md:order-1" : ""}>
          <ProductShot src={shot.src} video={shot.video} alt={`${eyebrow} — ${shot.label}`} chrome="app.setmycareer.com/portal" label={shot.label}>
            <ShotChip className="bottom-6 -right-3 hidden max-w-[210px] sm:block md:-right-8">
              <p className="mono text-[10px] uppercase tracking-[0.14em] text-ink-40">{shot.label}</p>
              <p className="mt-1 text-[13px] leading-snug">{shot.chip}</p>
            </ShotChip>
          </ProductShot>
        </div>
      </div>
    </section>
  )
}

/* ── the chapter ladder — resolved from the canonical offerings catalog so the
   pitch can never drift from what's actually sold ── */
const BIG_PICTURE = offeringById("sj_big_picture")

interface Chapter { chapter: string; id: string; unlocks: string }
const STUDENT_CHAPTERS: Chapter[] = [
  { chapter: "Explore", id: "free_cri", unlocks: "A first honest read + a saved profile the dashboard begins from." },
  { chapter: "Understand", id: "sj_navigator", unlocks: "All three instruments, scored, the reports they produce, and Compass." },
  { chapter: "Navigate", id: "sj_accelerator", unlocks: "Adds one recorded, transcribed counsellor session + a written action plan." },
  { chapter: "Master", id: "sj_true_north", unlocks: "Adds up to 5 senior sessions, deeper reports and a six-month review." },
]
const PRO_CHAPTERS: Chapter[] = [
  { chapter: "Diagnose", id: "pro_consult", unlocks: "Sixty minutes with a senior counsellor — a situation diagnosis and the right next step." },
  { chapter: "Pivot", id: "pro_pivot", unlocks: "3 senior sessions, the battery on professional norms, an executive resume + transition plan." },
  { chapter: "Reinvent", id: "pro_directors_cut", unlocks: "5 sessions of executive strategy, a private dashboard, positioning and a leadership plan." },
]

function ChapterRow({ chapter, id, unlocks }: Chapter) {
  const o = offeringById(id)
  if (!o) return null
  return (
    <Link data-reveal to={checkoutHref(o)} className="group flex items-baseline gap-4 border-t border-line py-4 last:border-b">
      <span className="mono w-[4.5rem] shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-ink-40">{chapter}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          <span className="text-[15px] font-medium tracking-tight">{o.name}</span>
          <span className="mono text-[11px] tabular-nums text-ink-45">{o.price.inr === 0 ? "Free" : fmtINR(o.price.inr)}</span>
        </span>
        <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-55">{unlocks}</span>
      </span>
      <ArrowRight size={15} className="shrink-0 self-center text-ink-40 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

/* the epilogue band — each long-term programme, application only: its own
   gradient, one outline link, no price race. */
function LongGame({ slug }: { slug: "blueprint" | "autobiography" }) {
  const p = longTermBySlug(slug)
  if (!p) return null
  return (
    <div data-reveal className="relative overflow-hidden rounded-[28px] bg-ink text-paper">
      <PackageGradient offeringId={p.offeringId} interactive scrim />
      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-x-12 gap-y-7 px-6 py-10 sm:px-10 md:px-12">
        <div className="max-w-xl">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-paper/60">{p.eyebrow}</p>
          <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.3rem)] font-extralight leading-[1.05] tracking-[-0.02em] text-paper">
            <span className="b">{p.name}</span> — {p.tagline.replace(/\.$/, "")}.
          </h3>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-paper/70">
            {p.positioning} Application only — it begins with a conversation, not a checkout.
          </p>
        </div>
        <Link to={`/programs/${p.slug}`} className="btn btn--dark">
          <span>Read about {p.name}</span> <ArrowUpRight size={15} className="btn-arrow" />
        </Link>
      </div>
    </div>
  )
}
