import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { recCard, type FitComputed, type FitReport } from "@/content/fit-test"

/* ── the six-bar dimension profile — bars grow via transform scaleX only,
      staggered; reduced motion renders them full-grown instantly ── */
function DimProfile({ r }: { r: FitComputed }) {
  const [grown, setGrown] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    if (grown) return
    const t = window.setTimeout(() => setGrown(true), 120)
    return () => window.clearTimeout(t)
  }, [grown])

  return (
    <div>
      {r.dims.map((d, i) => (
        <div key={d.key} className="grid items-center gap-x-6 gap-y-1.5 border-t border-paper/15 py-4 md:grid-cols-[150px_1fr_auto]">
          <div className="flex items-baseline gap-2.5">
            <span className="mono w-6 text-[10px] uppercase text-paper/40">{d.short}</span>
            <span className="text-[14px] font-medium tracking-tight text-paper">{d.label}</span>
          </div>
          <div>
            <div className="h-px w-full bg-paper/20">
              <div
                className="fit-bar h-[3px] w-full -translate-y-px bg-paper"
                style={{
                  transform: `scaleX(${grown ? d.value / 100 : 0})`,
                  transitionDelay: `${i * 90}ms`,
                }}
              />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-paper/50">{d.read}</p>
          </div>
          <span className="mono text-[14px] tabular-nums text-paper/80">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── the result — a conversion report: the recommendation on its own gradient,
      the named JOURNEY, a phased FUTURE PLAN, a staged BUYING PLAN, the six
      dimensions behind the placement, the runner-up, and the honest exits.
      The deterministic report renders instantly; the AI enriches its prose in
      place when it lands (the `enriching` flag drives a quiet status line). ── */
export function FitResult({ name, stageLabel, r, report, enriching, onRetake }: {
  name: string
  stageLabel: string
  r: FitComputed
  report: FitReport
  enriching: boolean
  onRetake: () => void
}) {
  const primary = recCard(r.primary.id)
  const runner = recCard(r.runnerUp.id)
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="fit-in-r">
      {/* dossier head */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/15 pb-4">
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-paper/50">Package-fit report</span>
        <div className="flex items-center gap-4">
          {enriching ? (
            <span className="mono inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-paper/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper/70" /> Personalising your report
            </span>
          ) : report.ai ? (
            <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-paper/45">Personalised for you</span>
          ) : null}
          <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-paper/50">{name} · {stageLabel} · {date}</span>
        </div>
      </div>

      {/* ── the recommendation — a hero card on its own living gradient ── */}
      <div className="relative mt-8 overflow-hidden border border-paper/20">
        <PackageGradient offeringId={primary.id} interactive scrim />
        <div className="relative p-7 md:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mono border border-paper/40 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.14em] text-paper/90">
              Your best fit
            </span>
            <span className="mono text-[11px] tabular-nums uppercase tracking-[0.14em] text-paper/70">
              {r.primary.fitPct}% match
            </span>
          </div>

          <h2 className="mt-6 max-w-[18ch] text-[clamp(1.9rem,4.4vw,3.4rem)] font-extralight leading-[1.04] tracking-[-0.025em] text-paper">
            {name}, start with <span className="font-semibold">{primary.name}</span>.
          </h2>
          <p className="mt-5 max-w-2xl text-[clamp(0.98rem,1.4vw,1.15rem)] font-light leading-relaxed text-paper/85">{report.summary}</p>

          <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[clamp(1.7rem,3vw,2.4rem)] font-extralight tabular-nums tracking-tight text-paper">{primary.priceLine}</span>
            {primary.priceNote && (
              <span className="mono text-[11px] uppercase tracking-[0.1em] text-paper/55">{primary.priceNote}</span>
            )}
          </div>

          <ul className="mt-8 max-w-2xl">
            {r.primary.why.map((w) => (
              <li key={w} className="flex items-baseline gap-2.5 border-t border-paper/15 py-3 text-[13.5px] leading-relaxed text-paper/85 first:border-t-0">
                <span className="mono text-[10px] text-paper/40">—</span>
                {w}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link to={primary.to} className="btn btn--solid-dark">
              <span>{primary.cta}</span> <ArrowUpRight size={15} className="btn-arrow" />
            </Link>
            {primary.isLongTerm && (
              <p className="mono max-w-xs text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-paper/55">
                Application only — a discovery conversation is where every engagement begins
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── the recommended journey ── */}
      <div className="mt-14">
        <span className="kicker !text-paper/50">Your recommended journey</span>
        <h3 className="mt-3 max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.2rem)] font-extralight leading-[1.1] tracking-[-0.02em] text-paper">
          {report.journeyTitle}
        </h3>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-paper/70">{report.journeyWhy}</p>

        <ol className="mt-8">
          {report.journey.map((s, i) => (
            <li key={`${s.name}-${i}`} className="grid gap-x-6 gap-y-2 border-t border-paper/15 py-6 md:grid-cols-[auto_1fr_auto] md:items-start">
              <span className="mono text-[12px] tabular-nums text-paper/40">{String(i + 1).padStart(2, "0")}</span>
              <div className="max-w-xl">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[16px] font-semibold tracking-tight text-paper">{s.name}</span>
                  {s.meta && <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-paper/50">{s.meta}</span>}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-paper/70">{s.why}</p>
              </div>
              {s.to && s.cta && (
                <Link to={s.to} className="ul inline-flex shrink-0 items-center gap-1.5 self-center text-[13px] text-paper/80">
                  {s.cta} <ArrowUpRight size={14} />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* ── the two plans: a future plan (life) + a buying plan (spend) ── */}
      <div className="mt-14 grid gap-x-14 gap-y-12 lg:grid-cols-2">
        <div>
          <span className="kicker !text-paper/50">A plan for your future</span>
          <ul className="mt-5">
            {report.futurePlan.map((f) => (
              <li key={f.horizon} className="grid gap-x-5 gap-y-1 border-t border-paper/15 py-4 sm:grid-cols-[130px_1fr]">
                <span className="mono text-[11px] uppercase tracking-[0.1em] text-paper/55">{f.horizon}</span>
                <p className="text-[13.5px] leading-relaxed text-paper/80">{f.move}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="kicker !text-paper/50">How to invest — start small</span>
          <ul className="mt-5">
            {report.buyingPlan.map((b, i) => (
              <li key={`${b.item}-${i}`} className="border-t border-paper/15 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="flex items-baseline gap-2.5">
                    <span className="mono text-[10px] uppercase tracking-[0.1em] text-paper/45">{b.when}</span>
                    <span className="text-[14.5px] font-medium tracking-tight text-paper">{b.item}</span>
                  </span>
                  {b.meta && <span className="mono text-[11px] tabular-nums text-paper/60">{b.meta}</span>}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-paper/65">{b.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── the profile behind the placement ── */}
      <div className="mt-14">
        <span className="kicker !text-paper/50">Your six dimensions</span>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-paper/60">
          The placement is computed from these — the distance between your profile and each programme's design profile.
        </p>
        <div className="mt-5"><DimProfile r={r} /></div>
      </div>

      {/* ── runner-up ── */}
      <div className="relative mt-12 overflow-hidden border border-paper/15">
        <PackageGradient offeringId={runner.id} interactive scrim />
        <div className="relative flex flex-col gap-x-10 gap-y-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono text-[9.5px] uppercase tracking-[0.14em] text-paper/60">Runner-up</span>
              <span className="mono text-[10.5px] tabular-nums uppercase tracking-[0.14em] text-paper/50">{r.runnerUp.fitPct}% match</span>
            </div>
            <h3 className="mt-3 text-[clamp(1.3rem,2.4vw,1.8rem)] font-medium tracking-tight text-paper">{runner.name}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-paper/65">{runner.tagline}</p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[20px] font-light tabular-nums tracking-tight text-paper">{runner.priceLine}</span>
              {runner.priceNote && <span className="mono text-[10px] uppercase tracking-[0.1em] text-paper/50">{runner.priceNote}</span>}
            </p>
          </div>
          <Link to={runner.to} className="btn btn--dark shrink-0">
            <span>{runner.cta}</span> <ArrowUpRight size={15} className="btn-arrow" />
          </Link>
        </div>
      </div>

      {/* ── the closing nudge ── */}
      <p className="mt-12 max-w-2xl text-[clamp(1.05rem,1.6vw,1.35rem)] font-light leading-relaxed text-paper/85">
        {report.closing}
      </p>

      {/* ── exits + honest small print ── */}
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Link to={primary.to} className="btn btn--solid-dark">
          <span>{primary.cta}</span> <ArrowUpRight size={15} className="btn-arrow" />
        </Link>
        <Link to="/pricing" className="ul inline-flex items-center gap-1.5 text-[13.5px] text-paper/75">
          See the full catalogue <ArrowUpRight size={14} />
        </Link>
        <button type="button" onClick={onRetake} className="ul text-[13px] text-paper/55">
          <span>Retake the test</span>
        </button>
      </div>
      <p className="mt-8 max-w-2xl border-t border-paper/15 pt-5 text-[11.5px] leading-relaxed text-paper/45">
        Your best-fit percentage is deterministic — the weighted distance between your six dimension scores and each
        programme's design profile, capped at 96% because no short instrument should pretend to certainty. The journey and
        plan are a starting recommendation, not a psychometric verdict; a counsellor can refine it in one conversation.
      </p>
    </div>
  )
}
