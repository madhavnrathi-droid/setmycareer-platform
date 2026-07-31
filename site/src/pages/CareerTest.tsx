import { Link, useParams, Navigate } from "react-router-dom"
import { ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { faqSchema, itemListSchema } from "@/lib/schema"
import {
  CAREER_TEST_HUB, CAREER_TEST_AUDIENCES, CAREER_TEST_HONESTY,
  careerTestBySlug, type CareerTestPage as CtPage,
} from "@/content/career-test"

/* /career-test — the assessment-intent cluster.
 *
 * The competitive teardown found this is the highest-converting shape in the
 * category and the one page type the site had no route for: people search "free
 * career test" and "career test for class 10 students" in volume, and every one of
 * those queries was landing on a competitor. One hub, four audience pages.
 *
 * The section that does the real work is `limits` — an honest account of what a
 * free self-report cannot tell you. Nobody else in the category publishes that, it
 * is what stops the wrong purchase, and it is the kind of passage answer engines
 * quote. */

function Answer({ h2, answer, body }: { h2: string; answer: string; body?: string[] }) {
  return (
    <div data-reveal className="grid gap-4 border-t border-line py-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-10">
      {/* question-formatted h2 + a 40-60 word direct answer: the shape that gets
          pulled into featured snippets and quoted by ChatGPT/Perplexity */}
      <h2 className="text-[19px] font-medium leading-snug tracking-tight md:text-[21px]">{h2}</h2>
      <div>
        <p className="text-[15.5px] leading-relaxed text-ink-80">{answer}</p>
        {body?.map((p) => (
          <p key={p} className="mt-4 text-[14.5px] leading-relaxed text-ink-60">{p}</p>
        ))}
      </div>
    </div>
  )
}

function CtBody({ p }: { p: CtPage }) {
  const ref = useReveals([p.slug])
  const isHub = p.slug === CAREER_TEST_HUB.slug

  useSeo({
    title: p.title,
    description: p.description,
    path: p.slug,
    jsonLd: [
      faqSchema(p.faq),
      isHub
        ? itemListSchema(
            CAREER_TEST_AUDIENCES.map((a) => ({ name: a.audience, path: a.slug, description: a.dek })),
            { name: "Career tests by stage", description: CAREER_TEST_HUB.dek },
          )
        : null,
    ].filter(Boolean) as object[],
  })

  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-14 pt-12 md:pt-20">
        <Kicker>{p.audience}</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[15ch]">{p.h1}</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">{p.dek}</p>
        <p data-reveal className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-ink-60">{p.intro}</p>
        <div data-reveal className="mt-9 flex flex-wrap items-center gap-3">
          <Magnetic href={p.instruments[0]?.to ?? "/cri"} solid>
            <span>Take the {p.instruments[0]?.name ?? "Career Clarity Index"}</span> <ArrowRight size={15} className="btn-arrow" />
          </Magnetic>
          <Magnetic href="/pricing"><span>See what the full assessment costs</span></Magnetic>
        </div>
      </section>

      {/* the instruments that actually exist, with the sentence that stops a wrong click */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap py-14">
          <Kicker>What you can take</Kicker>
          <div className="mt-8 grid gap-px border-t border-line md:grid-cols-2">
            {p.instruments.map((i) => (
              <Link key={i.name} to={i.to} data-reveal
                className="group border-b border-line py-7 transition-colors hover:bg-paper md:pr-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[19px] font-medium tracking-tight">{i.name}</h3>
                  <ArrowUpRight size={16} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mono mt-2 text-[11px] uppercase tracking-[0.1em] text-ink-40">{i.who} · {i.length} · {i.cost}</p>
                <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-ink-60">{i.gives}</p>
                {i.notFor && <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-40">Not for: {i.notFor}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-14">
        {p.sections.map((s) => <Answer key={s.h2} {...s} />)}
      </section>

      {/* measures vs does-not-measure, side by side. the right column is the point */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap py-14">
          <div className="grid gap-10 md:grid-cols-2">
            <div data-reveal>
              <Kicker>What this measures</Kicker>
              <ul className="mt-6 border-t border-line">
                {p.measures.map((m) => (
                  <li key={m} className="border-b border-line py-3.5 text-[14.5px] leading-relaxed">{m}</li>
                ))}
              </ul>
            </div>
            <div data-reveal>
              <Kicker>What it does not</Kicker>
              <ul className="mt-6 border-t border-line">
                {p.limits.map((m) => (
                  <li key={m} className="border-b border-line py-3.5 text-[14.5px] leading-relaxed text-ink-60">{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <p data-reveal className="mt-10 max-w-[70ch] border-t border-line pt-6 text-[13.5px] leading-relaxed text-ink-60">
            {CAREER_TEST_HONESTY}
          </p>
        </div>
      </section>

      {/* hub: the four audience pages */}
      {isHub && (
        <section className="wrap py-14">
          <Kicker>By stage</Kicker>
          <div className="mt-8 grid gap-px border-t border-line md:grid-cols-2">
            {CAREER_TEST_AUDIENCES.map((a) => (
              <Link key={a.slug} to={a.slug} data-reveal
                className="group border-b border-line py-7 transition-colors hover:bg-paper md:pr-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[20px] font-medium tracking-tight">{a.audience}</h3>
                  <ArrowUpRight size={16} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-60">{a.dek}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="hair-t bg-paper-pure">
        <div className="wrap py-14">
          <Kicker>Questions</Kicker>
          <div className="mt-8">
            {p.faq.map((qa) => (
              <details key={qa.q} data-reveal className="group border-t border-line last:border-b">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5">
                  <span className="text-[16px] font-medium leading-snug tracking-tight">{qa.q}</span>
                  <span className="mono shrink-0 text-[13px] text-ink-40 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-[68ch] pb-6 text-[14.5px] leading-relaxed text-ink-60">{qa.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* real internal links in the server HTML — the thing the crawl found missing */}
      <section className="wrap py-14">
        <Kicker>Read next</Kicker>
        <div className="mt-7 grid gap-px border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {p.links.map((l) => (
            <Link key={l.to} to={l.to} data-reveal
              className="group border-b border-line py-5 transition-colors hover:bg-paper md:pr-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium tracking-tight">{l.label}</span>
                <ArrowUpRight size={14} className="shrink-0 text-ink-40" />
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{l.hint}</p>
            </Link>
          ))}
          {!isHub && (
            <Link to={CAREER_TEST_HUB.slug} data-reveal
              className="group border-b border-line py-5 transition-colors hover:bg-paper md:pr-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium tracking-tight">All career tests</span>
                <ArrowUpRight size={14} className="shrink-0 text-ink-40" />
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">The hub, and the other stages</p>
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}

/** /career-test */
export function CareerTestHub() {
  return <CtBody p={CAREER_TEST_HUB} />
}

/** /career-test/:audience */
export function CareerTestAudience() {
  const { audience } = useParams<{ audience: string }>()
  const p = careerTestBySlug(`/career-test/${audience ?? ""}`)
  if (!p) return <Navigate to="/career-test" replace />
  return <CtBody p={p} />
}
