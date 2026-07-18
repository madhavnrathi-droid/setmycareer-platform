import { Link, useParams } from "react-router-dom"
import { ArrowRight, ArrowLeft } from "@carbon/icons-react"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { Kicker } from "@/components/bits"
import { LegalMarkdown, headings } from "@/components/LegalMarkdown"
import { ALL_LEGAL, LEGAL_GROUPS, getLegalDoc, legalLabel } from "@/lib/legal"
import { NotFound } from "@/pages/NotFound"

/* /legal — the index of every policy, grouped. */
export function LegalIndex() {
  const ref = useReveals()
  useSeo({
    title: "Legal & Policies — SetMyCareer",
    description: "SetMyCareer's policies — privacy, terms, refunds, cookies, disclaimers, consents, and grievance redressal — for India (DPDP Act) and the United States (CCPA).",
    path: "/legal",
  })
  return (
    <main ref={ref} className="wrap pt-32 md:pt-40">
      <header className="max-w-3xl">
        <Kicker>Legal &amp; policies</Kicker>
        <h1 data-reveal className="display mt-5 max-w-[16ch] text-[clamp(2.2rem,5.5vw,3.7rem)] leading-[1.02]">The rules of the road, <span className="b">stated plainly</span>.</h1>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">
          Everything that governs your use of SetMyCareer — how we handle your data, what you're paying for, and how to reach us if something's wrong. Written for India (DPDP Act, 2023) and the United States (CCPA/CPRA).
        </p>
        <p data-reveal className="mono mt-5 text-[11px] uppercase tracking-[0.12em] text-ink-40">Loratis SetMyCareer.Net India Pvt Ltd · Bengaluru 560095</p>
      </header>

      <div className="mt-16 flex flex-col gap-14 border-t border-line pt-14 md:mt-24">
        {LEGAL_GROUPS.map((g) => {
          const docs = g.slugs.map(getLegalDoc).filter(Boolean)
          if (!docs.length) return null
          return (
            <section key={g.title} data-reveal>
              <p className="kicker mb-6 text-ink-40">{g.title}</p>
              <div className="grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2">
                {docs.map((d) => (
                  <Link key={d!.slug} to={`/legal/${d!.slug}`} className="group flex flex-col bg-paper-pure p-6 transition-colors hover:bg-paper">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-[17px] font-medium tracking-tight">{legalLabel(d!.slug)}</h2>
                      <ArrowRight size={16} className="mt-1 shrink-0 -translate-x-1 text-ink-40 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                    {d!.summary && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-60">{d!.summary}</p>}
                    {d!.updated && <p className="mono mt-4 text-[10.5px] uppercase tracking-[0.1em] text-ink-40">Updated {d!.updated}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-16 max-w-2xl border-t border-line pt-8 text-[13px] leading-relaxed text-ink-50">
        Questions about any of these? Write to <a href="mailto:info@setmycareer.com" className="ul">info@setmycareer.com</a> or our Grievance Officer at <a href="mailto:grievance@setmycareer.com" className="ul">grievance@setmycareer.com</a>. See <Link to="/legal/grievance-redressal" className="ul">Grievance Redressal</Link> for the full process.
      </p>
    </main>
  )
}

/* /legal/:slug — a single document with an on-page contents rail. */
export function LegalPage() {
  const { slug = "" } = useParams()
  const ref = useReveals()
  const doc = getLegalDoc(slug)
  useSeo({
    title: doc ? `${legalLabel(slug)} — SetMyCareer` : "Legal — SetMyCareer",
    description: doc?.summary || "SetMyCareer legal policy.",
    path: `/legal/${slug}`,
  })
  if (!doc) return <NotFound />
  const toc = headings(doc.body)
  const idx = ALL_LEGAL.findIndex((d) => d.slug === slug)
  const prev = idx > 0 ? ALL_LEGAL[idx - 1] : null
  const next = idx >= 0 && idx < ALL_LEGAL.length - 1 ? ALL_LEGAL[idx + 1] : null

  return (
    <main ref={ref} className="wrap pt-32 md:pt-40">
      <Link to="/legal" className="ul inline-flex items-center gap-1.5 text-[12.5px] text-ink-50"><ArrowLeft size={14} /> All policies</Link>
      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_260px]">
        <article>
          <header className="border-b border-line pb-8">
            <h1 className="display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.05]">{doc.title}</h1>
            <div className="mono mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-ink-40">
              {doc.updated && <span>Last updated {doc.updated}</span>}
              <span>{doc.jurisdiction}</span>
            </div>
          </header>
          <div className="mt-8"><LegalMarkdown body={doc.body} /></div>

          <div className="mt-14 rounded-[12px] border border-line bg-paper-pure p-6 text-[13px] leading-relaxed text-ink-60">
            <p className="kicker mb-2 text-ink-40">Questions or a complaint?</p>
            Contact <a href="mailto:info@setmycareer.com" className="ul">info@setmycareer.com</a> · Grievance Officer <a href="mailto:grievance@setmycareer.com" className="ul">grievance@setmycareer.com</a> · +91 91085 10058 · Loratis SetMyCareer.Net India Pvt Ltd, Koramangala 8th Block, Bengaluru 560095.
          </div>

          <nav className="mt-12 flex flex-col justify-between gap-4 border-t border-line pt-8 sm:flex-row">
            {prev ? <Link to={`/legal/${prev.slug}`} className="ul inline-flex items-center gap-1.5 text-[13px] text-ink-60"><ArrowLeft size={14} /> {legalLabel(prev.slug)}</Link> : <span />}
            {next && <Link to={`/legal/${next.slug}`} className="ul inline-flex items-center gap-1.5 text-[13px] text-ink-60">{legalLabel(next.slug)} <ArrowRight size={14} /></Link>}
          </nav>
        </article>

        {toc.length > 2 && (
          <aside className="order-first lg:order-last">
            <div className="lg:sticky lg:top-28">
              <p className="kicker mb-4 text-ink-40">On this page</p>
              <ul className="flex flex-col gap-2 border-l border-line">
                {toc.map((h) => (
                  <li key={h.id} style={{ paddingLeft: h.level === 3 ? 22 : 12 }}>
                    <a href={`#${h.id}`} className="block py-0.5 text-[12.5px] leading-snug text-ink-50 transition-colors hover:text-ink">{h.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </main>
  )
}
