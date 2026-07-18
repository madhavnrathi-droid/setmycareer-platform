import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { LONGTERM, fmtINR, type LongTermProgram } from "@/content/offerings"
import { PackageGradient } from "./PackageGradient"

/* The long-term programmes — the aspirational anchors, application only. Two
   full-bleed gradient plates (Blueprint for students, Autobiography for
   executives), each linking to its own /programs/<slug> page and application.
   No price table, no checkout: a custom proposal follows a conversation. */

function ProgramPlate({ p }: { p: LongTermProgram }) {
  return (
    <article data-reveal className="relative flex flex-col overflow-hidden rounded-[28px] bg-ink text-paper">
      <PackageGradient offeringId={p.offeringId} interactive scrim={false} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.24) 30%, rgba(0,0,0,0.30) 60%, rgba(0,0,0,0.72) 100%)" }}
      />
      <div className="relative z-[2] flex grow flex-col p-7 sm:p-9 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-paper/65">{p.eyebrow}</p>
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-paper/65">Application only</p>
        </div>

        <h3 className="mt-8 text-[clamp(2rem,3.4vw,2.8rem)] font-semibold leading-[1.02] tracking-tight text-paper">{p.name}</h3>
        <p className="mt-3 max-w-md text-[15px] font-light leading-relaxed text-paper/85">{p.tagline}</p>

        <ul className="mt-7">
          {p.pillars.slice(0, 3).map((pl) => (
            <li key={pl.title} className="border-t border-paper/20 py-2.5 text-[13px] leading-relaxed text-paper/85 first:border-t-0">
              {pl.title}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-9">
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-paper/70">
            {p.horizon} · from {fmtINR(p.priceFrom)}
          </p>
          <div className="mt-5">
            <Link to={`/programs/${p.slug}`} className="btn btn--dark">
              <span>Explore {p.name}</span> <ArrowUpRight size={15} className="btn-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export function LongTermSection() {
  return (
    <section id="longterm" className="hair-t">
      <div className="wrap pb-6 pt-16 md:pb-8 md:pt-24">
        <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">Long-term programmes · application only</p>
        <h2 data-reveal className="mt-4 max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
          When a career needs <span className="b">years</span>, not a session.
        </h2>
        <p data-reveal className="mt-4 max-w-2xl text-[15px] font-light leading-relaxed text-ink-60">
          Two multi-year engagements that grew out of our Visionary Career Leadership Program — a dedicated mentor
          who walks the whole way. Priced by bespoke proposal after a conversation, never bought online.
        </p>
      </div>
      <div className="wrap grid gap-5 pb-16 md:gap-6 md:pb-24 lg:grid-cols-2">
        {LONGTERM.map((p) => <ProgramPlate key={p.id} p={p} />)}
      </div>
    </section>
  )
}
