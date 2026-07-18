// My Best Fit — "connect the dots". The member's own results, laid side by side
// and joined into one picture: a big FIT gauge on their strongest job family
// (topGroup — a real JCE number), the four readings that produced it, and the
// rising careers it points at. Everything is DERIVED from the tests + reports +
// live market; nothing is generated. Cold start invites the instruments.

import { Link } from "react-router-dom"
import { ArrowRight, Compass, Brain, Gauge, TrendingUp } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Pane, Eyebrow, Chip, FitGauge, MarketRow, type CareerViz } from "@/components/custom/ui-kit"
import { usePortalAccount } from "../portal-store"
import { hasRealAssessments, realPersonalityFor, realAbilitiesFor } from "../tests/report-bridge"
import { careersForMember, trendPctOf } from "../tests/market-match"
import { getTestResult } from "../tests/results-store"
import { scoreInterest } from "@/lib/sigma/engine"
import { FACTOR_READS, readFor } from "@/lib/sigma/descriptions"
import { cn } from "@/lib/utils"

const PANE =
  "rounded-[20px] bg-card ring-1 ring-[rgba(24,24,27,0.06)] shadow-[0_1px_2px_rgba(24,24,27,0.03),0_12px_32px_-20px_rgba(24,24,27,0.20)]"

interface Read { icon: typeof Compass; source: string; big: string; detail: string; accent: string }

export function PortalBestFit() {
  const account = usePortalAccount()
  const clientId = account?.clientId ?? ""
  const root = useGsap((s) => revealChildren(s), [clientId])
  if (!account) return null

  const has = hasRealAssessments(clientId)
  const market = careersForMember(clientId, 5)
  const pers = realPersonalityFor(clientId)
  const abilities = realAbilitiesFor(clientId)
  const topGroup = market.topGroup

  // the shape of the interest signal — the strongest pulls, as real bars
  const intr = getTestResult(clientId, "sigma_interest")
  const interestBars = intr
    ? [...scoreInterest(intr.answers).clusters].sort((a, b) => b.score - a.score).slice(0, 6)
    : []

  // the four readings, one per instrument with data
  const reads: Read[] = []
  if (market.clusters.length) {
    reads.push({
      icon: Compass, source: "Interest Pattern Test", accent: "text-mind-600",
      big: market.clusters[0].label,
      detail: `Your strongest pull, ${Math.round(market.clusters[0].score)} of 100${market.clusters[1] ? ` — ahead of ${market.clusters[1].label}` : ""}.`,
    })
  }
  if (pers) {
    const lead = [...pers.factors].sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50))[0]
    if (lead) reads.push({
      icon: Brain, source: "Personality Assessment", accent: "text-foreground",
      big: `${lead.label} · ${lead.percentile}`,
      // the final engine's bands are 5-level; the read table keys on 3
      detail: readFor(FACTOR_READS[lead.key], lead.percentile >= 65 ? "High" : lead.percentile <= 35 ? "Low" : "Average") || lead.band,
    })
  }
  if (abilities) {
    const top = [...abilities].sort((a, b) => b.value - a.value)[0]
    if (top) reads.push({
      icon: Gauge, source: "Ability Test", accent: "text-well-600",
      big: `${top.label} reasoning`, detail: `Your strongest faculty at ${top.value}/100 — what this path leans on.`,
    })
  }
  if (market.matched && market.careers[0]) {
    const r = market.careers[0]
    reads.push({
      icon: TrendingUp, source: "Live career market", accent: "text-warn-600",
      big: r.name, detail: `The fastest-rising path matching your signal — ${Math.round(trendPctOf(r))}% ten-year demand.`,
    })
  }

  const toViz = (r: (typeof market.careers)[number]): CareerViz => ({
    name: r.name, cluster: r.cluster, payLo: r.payLo, payHi: r.payHi,
    demand: r.demandTrend, demandPct: trendPctOf(r), aiLevel: r.aiLevel, to: "/portal/terminal", oneLine: r.oneLine,
  })

  return (
    <div ref={root} className="mx-auto w-full max-w-[1060px]">
      {/* masthead */}
      <div data-reveal className="border-b border-border pb-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">Connect the dots</p>
        <h1 className="mt-3 font-editorial text-[34px] font-light leading-[1.05] tracking-tight sm:text-[44px]">My Best Fit</h1>
        <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
          Four readings, taken separately. Here they are side by side — and what your strongest signal points to.
        </p>
      </div>

      {!has ? (
        <div data-reveal className={cn(PANE, "mt-8 p-6 sm:p-8")}>
          <p className="font-editorial text-[22px] font-light leading-snug tracking-tight text-foreground sm:text-[25px]">There are no dots to connect yet.</p>
          <p className="mt-2.5 max-w-[54ch] text-[13.5px] text-muted-foreground">Your best fit is worked out from your own results — what pulls you, how you're wired, what you reason with. Take the Career Tests and this fills itself in.</p>
          <Link to="/portal/assessments" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90">
            Take the Career Tests <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* THE CONVERGENCE — big gauge + synthesis */}
          {topGroup && (
            <Pane className="mt-8">
              <Eyebrow>Your strongest fit</Eyebrow>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <FitGauge value={topGroup.fitPct} size={140} stroke={12} label="Best fit" />
                <div className="min-w-0 flex-1">
                  <p className="font-editorial text-[27px] font-light leading-tight tracking-tight text-foreground sm:text-[30px]">{topGroup.group}</p>
                  <p className="mt-1"><Chip tone="brand">{topGroup.band} fit</Chip></p>
                  <p className="mt-4 max-w-[58ch] font-editorial text-[17px] font-light leading-relaxed tracking-tight text-foreground">
                    Your interests pull hardest toward <span className="text-mind-700">{market.clusters[0]?.label ?? "your top cluster"}</span> — which is why your measured fit lands strongest on <span className="text-brand-700">{topGroup.group}</span>.
                    {(pers || abilities) && <> Your personality and ability readings are laid out below, alongside it — they add colour to the picture, not to this one number.</>}
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-[11.5px] leading-relaxed text-ink-400">
                Fit% is the correlation between your interest profile and this job group's profile, rescaled 0–100. It describes alignment, not ability — the gap between here and a specific job is what <Link to="/portal/what-next" className="font-medium text-brand-600 hover:underline">What Next</Link> is for.
              </p>
            </Pane>
          )}

          {/* the shape of the interest signal — real cluster scores as bars */}
          {interestBars.length > 0 && (
            <Pane className="mt-6 p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>The shape of your interests</Eyebrow>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                  {interestBars.length} strongest pulls
                </span>
              </div>
              <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
                Not a ranking of ability — the directions your curiosity leans hardest. The families
                above are where these pulls point in the world of work.
              </p>
              <div className="mt-5 space-y-2.5">
                {interestBars.map((c, i) => {
                  const pct = Number.isFinite(c.score) ? Math.round(c.score) : 0
                  return (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className="w-[132px] shrink-0 truncate text-[12.5px] font-medium text-foreground" title={c.label}>
                        {c.label}
                      </div>
                      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(24,24,27,0.05)]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${Math.max(6, pct)}%`,
                            background:
                              i === 0
                                ? "linear-gradient(90deg,#fb7185,#f97316)"
                                : "rgba(251,113,133,0.5)",
                          }}
                        />
                      </div>
                      <div className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-500">
                        {pct}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Pane>
          )}

          {/* the four readings */}
          <section data-reveal className="mt-6">
            <Eyebrow>The four readings</Eyebrow>
            <div className="grid gap-4 sm:grid-cols-2">
              {reads.map((d) => {
                const Icon = d.icon
                return (
                  <div key={d.source} className={cn(PANE, "p-5")}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4 stroke-[1.75]", d.accent)} />
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">{d.source}</p>
                    </div>
                    <p className="mt-3 font-editorial text-[20px] font-light leading-tight tracking-tight text-foreground">{d.big}</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{d.detail}</p>
                  </div>
                )
              })}
            </div>
            {reads.length < 4 && (
              <p className="mt-4 text-[12.5px] text-muted-foreground">
                {4 - reads.length} reading{4 - reads.length === 1 ? "" : "s"} still missing.{" "}
                <Link to="/portal/assessments" className="font-medium text-brand-600 hover:underline">Complete your Career Tests</Link> to finish the picture.
              </p>
            )}
          </section>

          {/* what it points at — market shortlist as job rows */}
          {market.careers.length > 0 && (
            <Pane className="mt-6">
              <Eyebrow right={<Link to="/portal/what-next" className="shrink-0 text-[12.5px] font-medium text-brand-600 hover:underline">Pick a target →</Link>}>
                {market.matched ? "What this points at" : "The market at large"}
              </Eyebrow>
              {!market.matched && <p className="mb-2 text-[12.5px] text-muted-foreground">We couldn't narrow the market to your signal yet — these are the fastest-rising careers overall.</p>}
              <div className="divide-y divide-border border-y border-border">
                {market.careers.map((r, i) => <MarketRow key={r.id} c={toViz(r)} rank={i + 1} />)}
              </div>
            </Pane>
          )}
        </>
      )}
    </div>
  )
}
