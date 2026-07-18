// Counsellor reference — "What we offer the client". A read-only study sheet of
// the full SetMyCareer catalogue (same source as the client side, so it can never
// drift), for counsellors to learn during onboarding what a member is being sold,
// what's in each package, and the price.

import { useGsap, revealChildren } from "@/lib/gsap"
import { PRODUCTS, PRODUCT_GROUPS, fmtINR, type Product } from "@/portal/products"
import { OFFERINGS_2026 } from "@/server/offerings-2026"
import { PackageGradient } from "@/portal/product/PackageGradient"

// The 2026 line, exactly as the client sees it — gradient plates first, so a
// counsellor recognises the product a member mentions on sight.
function Line2026() {
  return (
    <section className="mt-2">
      <h2 data-reveal className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">The 2026 line</h2>
      <div data-reveal className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OFFERINGS_2026.map((o) => (
          <div key={o.id} className="relative overflow-hidden rounded-2xl">
            <div className="relative aspect-[16/9]">
              <PackageGradient offeringId={o.id} className="absolute inset-0" interactive={false} />
              <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">{o.track}</span>
                  {o.featured && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-sm">Most chosen</span>}
                </div>
                <div>
                  <p className="text-[15px] font-semibold leading-tight text-white">{o.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/75">
                    {o.inr > 0 ? fmtINR(o.inr) : "Free"}
                    {o.sessions > 0 && ` · ${o.sessions} session${o.sessions === 1 ? "" : "s"}`}
                    {(o.careerCredits > 0 || o.voiceCredits > 0) && ` · ${o.careerCredits}cc/${o.voiceCredits}vc`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductBlock({ p }: { p: Product }) {
  return (
    <div data-reveal className="border-t border-border py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{p.name}</h3>
        <span className="text-[13px] font-medium tabular-nums text-brand-600">
          {p.priceLabel ?? (p.priceFrom === 0 ? "Free" : `from ${fmtINR(p.priceFrom)}`)}
        </span>
      </div>
      <p className="mt-1 max-w-[80ch] text-[13px] text-muted-foreground">{p.tagline}</p>

      {(p.forWhom || p.whatYouGet || p.benefits) && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          {[["For whom", p.forWhom], ["What you get", p.whatYouGet], ["Benefit", p.benefits]]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-secondary/50 px-3 py-2">
                <dt className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className="mt-0.5 text-[12px] leading-relaxed text-ink-600">{v}</dd>
              </div>
            ))}
        </dl>
      )}

      {p.tiers && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12px]">
            <thead>
              <tr className="text-left text-ink-400">
                <th className="py-1.5 pr-3 font-medium">Tier</th>
                <th className="py-1.5 pr-3 font-medium">Price</th>
                <th className="py-1.5 font-medium">What's included</th>
              </tr>
            </thead>
            <tbody>
              {p.tiers.map((t) => (
                <tr key={t.id} className="border-t border-border/60 align-top">
                  <td className="py-2 pr-3 font-medium text-foreground">{t.name}</td>
                  <td className="py-2 pr-3 tabular-nums text-foreground">{fmtINR(t.price)}</td>
                  <td className="py-2 text-ink-600">
                    {t.summary} <span className="text-ink-400">— {t.features.map((f) => `${f.label}: ${f.value}`).join(" · ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {p.features && !p.tiers && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {p.features.map((f) => (
            <li key={f} className="text-[12px] text-ink-600">• {f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Offerings() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="mx-auto max-w-[860px]">
      <header data-reveal className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Reference</p>
        <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">What we offer clients</h1>
        <p className="mt-2 max-w-[70ch] text-[13.5px] text-muted-foreground">
          The full SetMyCareer catalogue a member sees on their side — products, what's in each package, and pricing.
          Use it to know exactly what the client has been offered or has bought.
        </p>
      </header>

      <Line2026 />

      {PRODUCT_GROUPS.map((g) => {
        const items = PRODUCTS.filter((p) => p.category === g.key)
        if (!items.length) return null
        return (
          <section key={g.key} className="mt-8">
            <h2 data-reveal className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h2>
            <div>{items.map((p) => <ProductBlock key={p.id} p={p} />)}</div>
          </section>
        )
      })}
    </div>
  )
}
