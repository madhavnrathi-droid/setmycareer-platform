import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { type Offering } from "@/content/offerings"
import { PackageGradient } from "./PackageGradient"

/* The ONE card grammar of the pricing page (v4 — full-bleed gradient cover,
   never alternated): each programme is an Apple-rounded plate filled edge-to-edge
   with its own interactive flowing gradient (hover → the field leans toward the
   cursor), white type on top. Readability first: a bottom-and-top-weighted scrim
   darkens the label corners and the dense content band while colour glows through
   the middle, so every line clears contrast on any palette. Avant-garde minimal:
   a mono eyebrow, a superscript-₹ price, a big name pushed low, a hairline list,
   and one CTA — lots of air between. Only the CTA is a link. */

/** Where an offering's CTA goes: free → the free index, Meet an Expert → the
 *  expert roster, everything else → its checkout route. */
export const checkoutHref = (o: Offering): string =>
  o.price.inr === 0 ? "/cri" : o.id === "mk_meet_expert" ? "/experts" : `/checkout/${o.id}`

export type CardSize = "compact" | "standard" | "feature" | "market"

const MIN_H: Record<CardSize, string> = {
  compact: "min-h-[240px]",
  standard: "min-h-[380px] md:min-h-[440px]",
  feature: "min-h-[460px] md:min-h-[560px]",
  market: "min-h-[300px]",
}

const NAME: Record<CardSize, string> = {
  compact: "text-[clamp(1.5rem,2.2vw,2rem)]",
  standard: "text-[clamp(1.9rem,2.9vw,2.7rem)]",
  feature: "text-[clamp(2.3rem,3.6vw,3.4rem)]",
  market: "text-[clamp(1.5rem,1.9vw,1.8rem)]",
}

/* the scrim that guarantees readability over a luminous gradient: dark at the
   top corners (labels) and the lower content band, luminous through the middle */
const SCRIM =
  "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.22) 22%, rgba(0,0,0,0.20) 42%, rgba(0,0,0,0.52) 70%, rgba(0,0,0,0.76) 100%)"

/* sessions · AI allowance · certificates — one quiet tabular line. AI renders
   ONLY as the copilot + Career/Voice Credits (never messages or minutes). */
const metaParts = (o: Offering): string[] => {
  const parts: string[] = [
    o.sessions > 0 ? `${o.sessions} counselling session${o.sessions > 1 ? "s" : ""}` : "Self-serve",
  ]
  if (o.ai && (o.ai.careerCredits > 0 || o.ai.voiceCredits > 0))
    parts.push(`AI Career Copilot included — ${o.ai.careerCredits} Career Credits · ${o.ai.voiceCredits} Voice Credits`)
  if (o.certificates?.length) parts.push(`${o.certificates.length} certificate${o.certificates.length > 1 ? "s" : ""}`)
  return parts
}

/* editorial price — a superscript ₹ beside thin, mature numerals (never bulky) */
function PriceCorner({ o }: { o: Offering }) {
  const notes = [
    o.priceNote,
    o.price.usd != null ? `$${o.price.usd.toLocaleString("en-US")} USD` : null,
    o.price.inr === 0 ? "four minutes" : null,
  ].filter(Boolean)
  return (
    <div className="shrink-0 sm:text-right">
      <p className="text-[clamp(1.7rem,2.5vw,2.3rem)] font-light leading-none tabular-nums tracking-tight text-paper">
        {o.price.inr === 0 ? (
          "Free"
        ) : (
          <>
            <sup className="mr-0.5 align-super text-[0.52em] font-normal text-paper/70">₹</sup>
            {o.price.inr.toLocaleString("en-IN")}
          </>
        )}
      </p>
      {notes.length > 0 && (
        <p className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-paper/65">{notes.join(" · ")}</p>
      )}
    </div>
  )
}

export function GradientCard({
  o,
  eyebrow,
  size = "standard",
  split = size === "standard" || size === "feature",
  priceless = false,
  wholeCard = false,
}: {
  o: Offering
  /** mono corner label, e.g. "01 · Student journey" */
  eyebrow: string
  size?: CardSize
  /** two-column body (name left, inclusions right) — for full-width cards only */
  split?: boolean
  /** hide the price corner — the product page pitches the programme, not the fee */
  priceless?: boolean
  /** the WHOLE card is one link to its detail (a stretched-link overlay, so no
   *  nested anchors); the CTA button is replaced by a quiet "see it" cue */
  wholeCard?: boolean
}) {
  const includes = o.includes.slice(0, 4)
  return (
    <article
      data-reveal
      className={`group relative flex flex-col overflow-hidden rounded-[28px] bg-ink text-paper ${MIN_H[size]} ${wholeCard ? "transition-transform duration-500 hover:-translate-y-1" : ""}`}
    >
      {/* the full-bleed cover — its own flowing gradient (no built-in scrim; we
          layer our readability scrim next so we control contrast precisely) */}
      <PackageGradient offeringId={o.id} interactive scrim={false} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]" style={{ background: SCRIM }} />

      {/* whole-card link — stretched over everything; the visible CTA is dropped.
          Uses an INSET focus ring so the card's overflow-hidden can't clip it. */}
      {wholeCard && (
        <Link
          to={checkoutHref(o)}
          aria-label={`${o.name} — see the programme in full`}
          className="absolute inset-0 z-[3] rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paper/90"
        />
      )}

      {o.featured && (
        <p className="pointer-events-none absolute left-1/2 top-0 z-[2] -translate-x-1/2 rounded-b-[10px] bg-paper px-3.5 py-1.5">
          <span className="mono text-[9.5px] uppercase tracking-[0.18em] text-ink">Most popular</span>
        </p>
      )}

      <div className={`relative z-[2] flex w-full grow flex-col p-6 sm:p-8 ${size === "feature" ? "md:p-11" : "md:p-9"}`}>
        {/* corners — mono eyebrow left, the big number right */}
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-paper/70">{eyebrow}</p>
          {!priceless && <PriceCorner o={o} />}
        </div>

        {/* body — pushed low; the luminous middle is the poster's air */}
        <div className={`mt-auto grid gap-x-14 gap-y-6 pt-12 ${split ? "lg:grid-cols-12 lg:items-end" : ""}`}>
          <div className={split ? "lg:col-span-7" : ""}>
            <h3 className={`font-semibold leading-[1.04] tracking-tight text-paper ${NAME[size]}`}>{o.name}</h3>
            <p className={`mt-3 max-w-xl leading-relaxed text-paper/85 ${size === "feature" ? "text-[16px]" : "text-[15px]"}`}>
              {o.tagline}
            </p>
            <p className="mono mt-5 flex max-w-xl flex-wrap gap-x-5 gap-y-1.5 text-[11px] tabular-nums leading-relaxed text-paper/70">
              {metaParts(o).map((m) => <span key={m}>{m}</span>)}
            </p>
          </div>
          {size === "compact" ? (
            <p className="max-w-2xl text-[13px] leading-relaxed text-paper/85 lg:col-span-5">{includes.join(" · ")}</p>
          ) : (
            <ul className={split ? "lg:col-span-5" : "max-w-xl"}>
              {includes.map((x) => (
                <li key={x} className="border-t border-paper/25 py-2.5 text-[13px] leading-relaxed text-paper/90 first:border-t-0">
                  {x}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CTA row — a real button on pricing; a quiet cue when the whole card links */}
        <div className="mt-8 flex flex-wrap items-center gap-5">
          {wholeCard ? (
            <span className="mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-paper/80 transition-transform group-hover:translate-x-0.5">
              See the programme <ArrowUpRight size={14} />
            </span>
          ) : (
            <Link to={checkoutHref(o)} className={o.featured ? "btn btn--solid-dark" : "btn btn--dark"}>
              <span>{o.cta}</span> <ArrowUpRight size={15} className="btn-arrow" />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
