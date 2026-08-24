import { Link, useLocation, Navigate } from "react-router-dom"
import { ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, Magnetic, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { faqSchema, itemListSchema } from "@/lib/schema"
import { kwCopyFor } from "@/content/kw/copy"
import {
  KW_PAGES, kwFor, KW_HUB, STUDENT_CHAIN, PROFESSIONAL_CHAIN, VCLP_BACKLINKS,
} from "@/content/kw-map"

/* The twelve keyword-mapped pages from the founder's KW + Link Mapping strategy.
 *
 * The doc's first two priorities are structural, not editorial: link the hub to all
 * eleven other pages so authority flows outward from the page holding the head term,
 * and chain the student journey (Class 8 -> 9 -> 10 -> 11 -> 12 -> graduation) so the
 * sequence a family actually walks is also the sequence a crawler walks. Both are
 * built below from src/content/kw-map.ts rather than hand-written per page, so a link
 * can never go stale against the map. */

const label = (route: string) => kwFor(route)?.primary ?? route

function Chain({ route }: { route: string }) {
  const chains = [STUDENT_CHAIN, PROFESSIONAL_CHAIN]
  const chain = chains.find((c) => c.includes(route))
  if (!chain) return null
  const i = chain.indexOf(route)
  const prev = i > 0 ? chain[i - 1] : null
  const next = i < chain.length - 1 ? chain[i + 1] : null
  if (!prev && !next) return null
  return (
    <nav aria-label="Stage" className="hair-t bg-paper-pure">
      <div className="wrap grid gap-px py-10 sm:grid-cols-2">
        {prev ? (
          <Link to={prev} className="group border-t border-line py-5 md:pr-8">
            <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">The stage before</p>
            <p className="mt-2 text-[17px] font-medium capitalize tracking-tight transition-colors group-hover:text-ink-40">{label(prev)}</p>
          </Link>
        ) : <span />}
        {next && (
          <Link to={next} className="group border-t border-line py-5 sm:text-right">
            <p className="mono text-[10.5px] uppercase tracking-[0.12em] text-ink-40">The stage after</p>
            <p className="mt-2 text-[17px] font-medium capitalize tracking-tight transition-colors group-hover:text-ink-40">{label(next)}</p>
          </Link>
        )}
      </div>
    </nav>
  )
}

/** The hub links to every other page in the map — the doc's highest-priority action. */
function HubGrid({ current }: { current: string }) {
  const others = KW_PAGES.filter((p) => p.route !== current)
  return (
    <section className="wrap py-14">
      <Kicker>Every stage, and every audience</Kicker>
      <div className="mt-8 grid gap-px border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {others.map((p) => (
          <Link key={p.route} to={p.route} data-reveal
            className="group border-b border-line py-5 transition-colors hover:bg-paper md:pr-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium capitalize tracking-tight">{p.primary}</span>
              <ArrowUpRight size={14} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{p.intent}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function CareerCounselling() {
  const { pathname } = useLocation()
  const route = pathname.replace(/\/+$/, "") || "/"
  const copy = kwCopyFor(route)
  const kw = kwFor(route)
  const ref = useReveals([route])

  useSeo({
    title: kw?.title ?? "Career Counselling — SetMyCareer",
    description: kw?.description ?? "",
    path: route,
    jsonLd: [
      copy ? faqSchema(copy.faq) : null,
      route === KW_HUB
        ? itemListSchema(
            KW_PAGES.filter((p) => p.route !== KW_HUB).map((p) => ({ name: p.primary, path: p.route })),
            { name: "Career counselling by stage" },
          )
        : null,
    ].filter(Boolean) as object[],
  })

  if (!copy || !kw) return <Navigate to={KW_HUB} replace />
  const isHub = route === KW_HUB
  const backlink = VCLP_BACKLINKS[route]

  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-14 pt-12 md:pt-20">
        <Kicker>{isHub ? "Career counselling" : kw.intent.split("-")[0].trim()}</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[16ch]">{copy.h1}</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">{copy.dek}</p>
        <p data-reveal className="mt-6 max-w-[64ch] text-[15px] leading-relaxed text-ink-60">{copy.intro}</p>
        <div data-reveal className="mt-9 flex flex-wrap items-center gap-3">
          <Magnetic href={copy.cta.to} solid>
            <span>{copy.cta.label}</span> <ArrowRight size={15} className="btn-arrow" />
          </Magnetic>
          <span className="text-[13px] text-ink-40">{copy.cta.note}</span>
        </div>
      </section>

      <section className="wrap pb-4">
        {copy.sections.map((s) => (
          <div key={s.h2} data-reveal className="grid gap-4 border-t border-line py-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-10">
            <h2 className="text-[19px] font-medium leading-snug tracking-tight md:text-[21px]">{s.h2}</h2>
            <div>
              <p className="text-[15.5px] leading-relaxed text-ink-80">{s.answer}</p>
              {s.body?.map((b) => <p key={b} className="mt-4 text-[14.5px] leading-relaxed text-ink-60">{b}</p>)}
            </div>
          </div>
        ))}
      </section>

      {copy.limits && (
        <section className="hair-t bg-paper-pure">
          <div className="wrap py-14">
            <Kicker>{copy.limits.title}</Kicker>
            <ul data-reveal className="mt-6 max-w-[70ch] border-t border-line">
              {copy.limits.items.map((it) => (
                <li key={it} className="border-b border-line py-3.5 text-[14.5px] leading-relaxed text-ink-60">{it}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Chain route={route} />

      <section className="hair-t bg-paper-pure">
        <div className="wrap py-14">
          <Kicker>Questions</Kicker>
          <div className="mt-8">
            {copy.faq.map((qa) => (
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

      {isHub ? <HubGrid current={route} /> : (
        <section className="wrap py-14">
          <Kicker>Read next</Kicker>
          <div className="mt-7 grid gap-px border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {[KW_HUB, backlink, ...KW_PAGES.map((p) => p.route)]
              .filter((r): r is string => Boolean(r) && r !== route)
              .filter((r, i, a) => a.indexOf(r) === i)
              .slice(0, 6)
              .map((r) => (
                <Link key={r} to={r} data-reveal
                  className="group border-b border-line py-5 transition-colors hover:bg-paper md:pr-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-medium capitalize tracking-tight">{r === KW_HUB ? "Career counselling" : label(r)}</span>
                    <ArrowUpRight size={14} className="shrink-0 text-ink-40" />
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
    </main>
  )
}
