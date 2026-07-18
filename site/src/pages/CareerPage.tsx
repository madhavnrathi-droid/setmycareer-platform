import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo, SITE_URL } from "@/lib/seo"
import {
  careerById, trendPct, recentPct, projectDemand, demandYears, DEMAND_END_YEAR,
  METHOD, AI_LEVEL, TRAJ_HUE, TRAJ_GLYPH, TRAJ_LABEL, type Career, type Trajectory,
} from "@/content/careers"
import { extById, type ExtCareer } from "@/content/careers-ext"
import { rowIdByName, rowById } from "@/content/careers-all"
import { FinChart } from "@/components/terminal/FinChart"
import { Spark, Delta, ExposureDots, lpa } from "@/components/terminal/parts"
import { getProduct, fmtINR, buyHref, type Product } from "@/content/packages"

// A career's deep-dive — a stock/instrument detail page, de-boxed: whitespace,
// type scale and hairlines do the structure, not bordered cards. Works for both
// the India-deep curated set and the broad O*NET/BLS universe. Trajectory is the
// one colour axis, and the demand line flows purple→red→blue by its own slope.

const VERDICT: Record<Trajectory, { label: string; pos: number }> = {
  up: { label: "Strong outlook", pos: 0.82 }, flat: { label: "Stable", pos: 0.5 }, down: { label: "Under pressure", pos: 0.2 },
}
const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export function CareerPage() {
  const { id } = useParams()
  const ref = useReveals([id])
  const c = careerById(id)
  const e = c ? undefined : extById(id)
  const name = c?.name ?? e?.name

  useSeo({
    title: name ? `${name} — Career Terminal · SetMyCareer` : "Career — SetMyCareer",
    description: (c ?? e) ? `${name}: ${(c ?? e)!.oneLine}. Demand trajectory, pay, a 2030 outlook and adjacent careers — grounded in WEF, BLS, O*NET and NASSCOM data.` : "A career on the SetMyCareer terminal.",
    path: `/library/${id ?? ""}`,
    jsonLd: name ? {
      "@context": "https://schema.org", "@type": "Occupation",
      name, description: (c ?? e)!.oneLine, occupationalCategory: (c ?? e)!.cluster,
      url: `${SITE_URL}/library/${id}`,
    } : null,
  })

  if (!c && !e) return (
    <main className="wrap flex min-h-[70vh] flex-col items-center justify-center py-28 text-center">
      <Kicker>Not found</Kicker>
      <h1 className="h-xl mt-4 max-w-[16ch]">That position isn't on the board.</h1>
      <Link to="/library" className="btn btn--solid mt-8"><span>Back to the terminal</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
    </main>
  )

  return <main ref={ref} className="pt-24">{c ? <Curated c={c} /> : <Extended e={e!} />}</main>
}

/* ── shared pieces ─────────────────────────────────────────────────── */

function Header({ cluster, trajectory, name, oneLine, nowV, growth, recent }: {
  cluster: string; trajectory: Trajectory; name: string; oneLine: string; nowV: number; growth: number; recent: number
}) {
  const hue = TRAJ_HUE[trajectory]
  return (
    <section className="wrap pt-8">
      <Link to="/library" className="inline-flex items-center gap-1.5 text-[12px] text-ink-40 transition-colors hover:text-ink"><ArrowLeft size={14} /> Career terminal</Link>
      <div className="mono mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.1em]">
        <span className="text-ink-40">{cluster}</span>
        <span className="text-ink-20">·</span>
        <span className="font-medium" style={{ color: hue }}>{TRAJ_GLYPH[trajectory]} {TRAJ_LABEL[trajectory]}</span>
      </div>
      <SplitReveal as="h1" className="mt-3 text-[clamp(2.4rem,5.5vw,4rem)] font-light leading-[1.02] tracking-tight">{name}</SplitReveal>
      <p data-reveal className="serif mt-5 max-w-[58ch] text-[clamp(1.05rem,1.6vw,1.2rem)] leading-[1.55] text-ink-80">{oneLine}.</p>
      {/* stat strip — no boxes, just hierarchy */}
      <div className="mt-8 flex flex-wrap items-end gap-x-12 gap-y-4 border-t border-line pt-6">
        <div>
          <div className="mono text-[9.5px] uppercase tracking-[0.12em] text-ink-40">Demand index</div>
          <div className="mt-1 flex items-end gap-2"><span className="text-[clamp(2.6rem,6vw,3.4rem)] font-extralight leading-none tabular-nums">{nowV}</span><span className="mono mb-1.5 text-[11px] text-ink-40">/ 100</span></div>
        </div>
        <div className="mb-2 flex gap-x-10">
          <div><div className="mono text-[9.5px] uppercase tracking-[0.1em] text-ink-40">Δ 10Y</div><div className="mt-1"><Delta pct={growth} hue={hue} className="text-[16px]" /></div></div>
          <div><div className="mono text-[9.5px] uppercase tracking-[0.1em] text-ink-40">Δ 5Y</div><div className="mt-1"><Delta pct={recent} hue={hue} className="text-[16px]" /></div></div>
        </div>
      </div>
    </section>
  )
}

// the interactive demand chart with range chips + a 2030 projection — no border box
function DemandSection({ name, trajectory, demandTrend, caption }: { name: string; trajectory: Trajectory; demandTrend: number[]; caption: string }) {
  const RANGES = ["1Y", "3Y", "5Y", "10Y", "2030P"] as const
  const FROM: Record<string, number> = { "1Y": 1, "3Y": 3, "5Y": 5, "10Y": 10, "2030P": 10 }
  const [range, setRange] = useState<string>("2030P") // default view = the 2030 projection
  const hue = TRAJ_HUE[trajectory]
  const years = demandYears(demandTrend.length)
  const proj = projectDemand(demandTrend, trajectory)
  const isProj = range === "2030P"
  const from = Math.max(0, demandTrend.length - 1 - FROM[range])
  const shown = demandTrend.slice(from)
  const shownYears = years.slice(from)
  const projYears = Array.from({ length: proj.length }, (_, i) => DEMAND_END_YEAR + 1 + i)
  const allYears = [...shownYears, ...(isProj ? projYears : [])]
  const total = allYears.length
  const stride = Math.max(1, Math.ceil(total / 6))
  const labels = allYears.map((yr, i) => (i % stride === 0 || i === total - 1) ? `’${String(yr).slice(2)}` : "")
  const chartTag = isProj ? String(proj[proj.length - 1]) : String(demandTrend[demandTrend.length - 1])
  return (
    <section className="hair-t mt-12 bg-paper">
      <div className="wrap py-10 md:py-14">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-40">Demand history · index 0–100</span>
            <span className="mono ml-3 text-[10.5px] text-ink-40">{isProj ? "2015 → 2030 (dashed = model)" : `${shownYears[0]} → ${DEMAND_END_YEAR}`}</span>
          </div>
          <div className="mono flex items-center gap-3 text-[11px] uppercase tracking-[0.08em]">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`transition-colors ${range === r ? "text-ink underline underline-offset-[5px]" : "text-ink-40 hover:text-ink"}`}>{r}</button>
            ))}
          </div>
        </div>
        <FinChart line={shown} projection={isProj ? proj : undefined} xLabels={labels} hue={hue} baseline tag={chartTag} height={340}
          ariaLabel={`Demand index for ${name}, ${range}`}
          tooltip={(i) => {
            const p = i >= shown.length
            const v = p ? proj[i - shown.length] : shown[i]
            return { title: `${allYears[i]}${p ? " · projected" : ""}`, rows: [["Index", String(v)], p ? ["Basis", "model"] : ["vs start", `${v >= shown[0] ? "+" : ""}${Math.round(((v - shown[0]) / shown[0]) * 100)}%`]] }
          }} />
        <p className="mono mt-3 text-[10px] leading-relaxed text-ink-40">{caption}</p>
      </div>
    </section>
  )
}

type Stat = { label: string; big: string; sub: string; hue?: string; dots?: number }
function KeyGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-9 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} data-reveal className="border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="mono text-[9.5px] uppercase tracking-[0.1em] text-ink-40">{s.label}</span>
            {s.dots != null && <ExposureDots level={s.dots} />}
          </div>
          <p className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-light leading-none tracking-tight tabular-nums" style={s.hue ? { color: s.hue } : undefined}>{s.big}</p>
          <p className="mt-2.5 max-w-[30ch] text-[11.5px] leading-snug text-ink-60">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

function MetaList({ pairs }: { pairs: [string, string][] }) {
  return (
    <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
      {pairs.map(([k, v]) => (
        <div key={k} className="border-t border-line pt-2.5">
          <dt className="mono text-[9px] uppercase tracking-[0.1em] text-ink-40">{k}</dt>
          <dd className="mt-1 text-[13px] leading-snug text-ink-80">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function RelatedList({ names }: { names: string[] }) {
  const items = names.map((n) => { const rid = rowIdByName(n); return { name: n, row: rid ? rowById(rid) : undefined } })
  return (
    <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => it.row ? (
        <Link key={it.name} to={`/library/${it.row.id}`} className="group flex items-center justify-between gap-3 border-t border-line py-3.5 transition-[padding] hover:pl-1">
          <div className="min-w-0">
            <span className="block truncate text-[14px] font-medium tracking-tight text-ink">{it.row.name}</span>
            <Delta pct={trendPct(it.row.demandTrend)} hue={TRAJ_HUE[it.row.trajectory]} className="mt-0.5 text-[10.5px]" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Spark data={it.row.demandTrend} hue={TRAJ_HUE[it.row.trajectory]} w={54} h={22} area baseline />
            <ArrowRight size={13} className="text-ink-20 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-60" />
          </div>
        </Link>
      ) : (
        <div key={it.name} className="flex items-center justify-between gap-3 border-t border-line py-3.5">
          <span className="text-[14px] text-ink-60">{it.name}</span>
          <span className="mono text-[9px] uppercase tracking-[0.1em] text-ink-20">Off-board</span>
        </div>
      ))}
    </div>
  )
}

function CloseCta({ short }: { short: string }) {
  return (
    <section className="plate-dark">
      <div className="wrap py-16 text-center md:py-20">
        <SplitReveal className="h-xl mx-auto max-w-[22ch] text-paper">The board shows the position. The index shows if it's <span className="b">yours</span>.</SplitReveal>
        <div data-reveal className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <Link to="/cri" className="btn btn--dark"><span>Model your fit for {short}</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
          <Link to="/library" className="ul text-[13px] text-paper/80">Back to the board</Link>
        </div>
      </div>
    </section>
  )
}

function Section({ children, kicker, dark = false, right }: { children: ReactNode; kicker?: string; dark?: boolean; right?: ReactNode }) {
  return (
    <section className={dark ? "hair-t bg-paper" : "wrap border-t border-line"}>
      <div className={dark ? "wrap py-12 md:py-16" : "py-12 md:py-16"}>
        {kicker && (
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <Kicker>{kicker}</Kicker>{right}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

/* ── curated deep-dive (India-deep) ─────────────────────────────────── */

function Curated({ c }: { c: Career }) {
  const hue = TRAJ_HUE[c.trajectory]
  const growth = trendPct(c.demandTrend)
  const recent = recentPct(c.demandTrend)
  const nowV = c.demandTrend[c.demandTrend.length - 1]
  const proj = projectDemand(c.demandTrend, c.trajectory)
  const proj2030 = proj[proj.length - 1]
  const projDelta = Math.round(((proj2030 - nowV) / nowV) * 100)
  const medianPay = Math.round((c.payMid[0] + c.payMid[1]) / 2)
  const payCeiling = (c.paySenior[1] / c.payEntry[0]).toFixed(1)
  const bands = c.stages.map((s) => ({ lo: s.payLo, hi: s.payHi, mid: (s.payLo + s.payHi) / 2 }))
  const verdict = VERDICT[c.trajectory]
  const offer = [getProduct("career_clarity"), getProduct("job_domain"), getProduct("success_package")].filter(Boolean) as Product[]
  const short = c.name.split(" / ")[0]

  return (
    <>
      <Header cluster={c.cluster} trajectory={c.trajectory} name={c.name} oneLine={c.oneLine} nowV={nowV} growth={growth} recent={recent} />
      <DemandSection name={c.name} trajectory={c.trajectory} demandTrend={c.demandTrend} caption={`${c.growthNote}.`} />

      <Section kicker="Key statistics">
        <KeyGrid stats={[
          { label: "Demand index", big: String(nowV), sub: `0–100 composite · ${DEMAND_END_YEAR}` },
          { label: "Δ decade", big: `${growth >= 0 ? "+" : ""}${growth}%`, sub: "2015 → 2025", hue },
          { label: "2030 outlook", big: String(proj2030), sub: `model · ${projDelta >= 0 ? "+" : ""}${projDelta}% vs now`, hue },
          { label: "AI exposure", big: c.aiExposure, sub: "automation volatility", dots: AI_LEVEL[c.aiExposure] },
          { label: "Entry pay", big: lpa(...c.payEntry), sub: "first role · India" },
          { label: "Median pay", big: `₹${medianPay}L`, sub: "mid-career" },
          { label: "Senior pay", big: lpa(...c.paySenior), sub: "7–10 years in" },
          { label: "Pay ceiling", big: `${payCeiling}×`, sub: "entry floor → lead" },
        ]} />
      </Section>

      {/* about + outlook verdict — no boxes */}
      <section className="wrap grid gap-10 border-t border-line py-12 md:grid-cols-[1.3fr_1fr] md:gap-16 md:py-16">
        <div>
          <Kicker>About this role</Kicker>
          <p className="mt-4 text-[clamp(1.05rem,1.5vw,1.25rem)] font-light leading-[1.5] text-ink-80">{c.oneLine}.</p>
          <MetaList pairs={[["Sector", c.cluster], ["Outlook", c.outlook], ["Entry route", c.education[0]], ["Time to senior", c.stages[2].years]]} />
          <p className="mono mt-6 text-[11.5px] leading-relaxed text-ink-60"><span className="text-ink">AI ·</span> {c.aiNote}</p>
        </div>
        <div data-reveal>
          <Kicker>Outlook verdict</Kicker>
          <div className="mt-3 text-[28px] font-light tracking-tight" style={{ color: hue }}>{verdict.label}</div>
          <div className="relative mt-4 h-1.5 bg-line">
            <div className="absolute inset-y-0 left-0" style={{ width: `${verdict.pos * 100}%`, background: hue, opacity: 0.25 }} />
            <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${verdict.pos * 100}%`, background: hue }} />
          </div>
          <div className="mono mt-1.5 flex justify-between text-[8.5px] uppercase tracking-[0.1em] text-ink-40"><span>At risk</span><span>Stable</span><span>Hot</span></div>
          <div className="mt-6 flex gap-x-10">
            <div><div className="mono text-[9px] uppercase tracking-[0.1em] text-ink-40">2030 index</div><div className="mt-1 text-[19px] font-light tabular-nums">{proj2030}</div></div>
            <div><div className="mono text-[9px] uppercase tracking-[0.1em] text-ink-40">2030 vs now</div><div className="mt-1 text-[19px] font-light tabular-nums" style={{ color: hue }}>{projDelta >= 0 ? "+" : ""}{projDelta}%</div></div>
          </div>
          <p className="mono mt-5 text-[10.5px] leading-relaxed text-ink-40">Model projection from recent momentum, damped to the mean. Directional, not a forecast.</p>
        </div>
      </section>

      {/* pay ladder / fundamentals — no boxes */}
      <Section kicker="The pay ladder" dark right={<span className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-40">₹ LPA · India · indicative</span>}>
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <figure>
            <figcaption className="mb-3 mono text-[10.5px] uppercase tracking-[0.1em] text-ink-40">Pay trajectory · entry → lead</figcaption>
            <FinChart bands={bands} xLabels={c.stages.map((s) => s.label)} tag={`₹${c.stages[3].payHi}L`} height={300}
              ariaLabel={`Pay trajectory for ${c.name}, entry to lead, in lakh per annum`}
              tooltip={(i) => ({ title: `${c.stages[i].label} · ${c.stages[i].years}`, rows: [["Pay", lpa(c.stages[i].payLo, c.stages[i].payHi)], ["Median", `₹${Math.round((c.stages[i].payLo + c.stages[i].payHi) / 2)}L`]] })} />
          </figure>
          <div className="self-start">
            {c.stages.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between gap-4 border-t border-line py-3.5">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2"><span className="mono text-[10px] text-ink-40">{String(i + 1).padStart(2, "0")}</span><span className="text-[14px] font-medium tracking-tight">{s.label}</span><span className="mono text-[9.5px] uppercase tracking-[0.08em] text-ink-40">{s.years}</span></div>
                  <p className="mt-0.5 max-w-[34ch] text-[11.5px] leading-snug text-ink-60">{s.shift}</p>
                </div>
                <span className="mono shrink-0 text-[13px] tabular-nums">{lpa(s.payLo, s.payHi)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mono mt-6 text-[10px] leading-relaxed text-ink-40">{METHOD}</p>
      </Section>

      {/* skills / routes */}
      <section className="wrap grid gap-10 border-t border-line py-12 md:grid-cols-2 md:gap-16 md:py-16">
        <div>
          <Kicker>Skills that pay</Kicker>
          <ul className="mt-4">
            {c.skills.map((s, i) => (
              <li key={s} data-reveal className="flex items-baseline gap-3 border-t border-line-faint py-2.5 text-[14px] text-ink-80 transition-[padding] duration-200 hover:pl-1.5"><span className="mono text-[10px] text-ink-40">{String(i + 1).padStart(2, "0")}</span>{s}</li>
            ))}
          </ul>
          <Link to="/cri" className="ul mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium">Measure yours — free index <ArrowUpRight size={13} /></Link>
        </div>
        <div>
          <Kicker>Routes in</Kicker>
          <ul className="mt-4">
            {c.education.map((s, i) => (
              <li key={s} data-reveal className="flex items-baseline gap-3 border-t border-line-faint py-2.5 text-[14px] text-ink-80 transition-[padding] duration-200 hover:pl-1.5"><span className="mono text-[10px] text-ink-40">{String(i + 1).padStart(2, "0")}</span>{s}</li>
            ))}
          </ul>
          <Link to="/pricing" className="ul mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium">Which route fits me? <ArrowRight size={13} /></Link>
        </div>
      </section>

      <Section kicker="Also considered" dark right={<Link to="/library" className="ul text-[13px] text-ink-60">The whole board →</Link>}>
        <RelatedList names={c.related} />
      </Section>

      {/* packages — de-boxed columns */}
      <section className="wrap border-t border-line py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="h-lg">Act on <span className="b">{short}</span>.</h2>
          <Link to="/pricing" className="ul text-[13px] text-ink-60">See all offerings →</Link>
        </div>
        <div className="grid gap-x-10 md:grid-cols-3">
          {offer.map((p) => <PackageMini key={p.id} p={p} />)}
        </div>
        <p className="mono mt-6 text-[10px] text-ink-40">Free to start · paid plans complete securely in your SetMyCareer portal.</p>
      </section>

      <CloseCta short={short} />
    </>
  )
}

/* ── extended deep-dive (O*NET / BLS + indicative India) ────────────── */

function Extended({ e }: { e: ExtCareer }) {
  const hue = TRAJ_HUE[e.trajectory]
  const growth = trendPct(e.demandTrend)
  const recent = recentPct(e.demandTrend)
  const nowV = e.demandTrend[e.demandTrend.length - 1]
  const proj = projectDemand(e.demandTrend, e.trajectory)
  const proj2030 = proj[proj.length - 1]
  const projDelta = Math.round(((proj2030 - nowV) / nowV) * 100)
  const short = e.name.split(" / ")[0]

  return (
    <>
      <Header cluster={e.cluster} trajectory={e.trajectory} name={e.name} oneLine={e.oneLine} nowV={nowV} growth={growth} recent={recent} />
      <DemandSection name={e.name} trajectory={e.trajectory} demandTrend={e.demandTrend} caption={`${e.note}. Demand path modelled from the BLS projection; India pay indicative.`} />

      <Section kicker="Key statistics">
        <KeyGrid stats={[
          { label: "Demand index", big: String(nowV), sub: `0–100 modelled · ${DEMAND_END_YEAR}` },
          { label: "Δ decade", big: `${growth >= 0 ? "+" : ""}${growth}%`, sub: "2015 → 2025 (modelled)", hue },
          { label: "BLS growth", big: `${e.growthPct >= 0 ? "+" : ""}${e.growthPct}%`, sub: "US, 2024–34 (real)", hue },
          { label: "2030 outlook", big: String(proj2030), sub: `model · ${projDelta >= 0 ? "+" : ""}${projDelta}% vs now`, hue },
          { label: "US median pay", big: fmtUSD(e.medianWageUSD), sub: "BLS annual median" },
          { label: "Entry pay", big: `₹${e.indiaEntry}L`, sub: "India · indicative" },
          { label: "Mid pay", big: `₹${e.indiaMid}L`, sub: "India · indicative" },
          { label: "Senior pay", big: `₹${e.indiaSenior}L`, sub: "India · indicative" },
        ]} />
      </Section>

      <section className="wrap grid gap-10 border-t border-line py-12 md:grid-cols-[1.3fr_1fr] md:gap-16 md:py-16">
        <div>
          <Kicker>About this role</Kicker>
          <p className="mt-4 text-[clamp(1.05rem,1.5vw,1.25rem)] font-light leading-[1.5] text-ink-80">{e.oneLine}.</p>
          <MetaList pairs={[["Sector", e.cluster], ["O*NET-SOC", e.soc], ["US median", fmtUSD(e.medianWageUSD)], ["BLS growth", `${e.growthPct >= 0 ? "+" : ""}${e.growthPct}% (2024–34)`]]} />
          <p className="mono mt-6 text-[11.5px] leading-relaxed text-ink-60"><span className="text-ink">Source ·</span> {e.source}. India pay figures are directional estimates for the 2024-25 market, not a quote.</p>
        </div>
        <div data-reveal>
          <Kicker>Go deeper</Kicker>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-80">Want a pay ladder, skills map and personalised fit for {short}? The free Career Clarity Index scores you against it, and a counsellor can build the full plan.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/cri" className="ul inline-flex items-center gap-1.5 text-[13px] font-medium">Model your fit — free index <ArrowUpRight size={14} /></Link>
            <Link to="/book" className="ul inline-flex items-center gap-1.5 text-[13px] text-ink-60">Talk to a counsellor <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      {e.related.length > 0 && (
        <Section kicker="Also considered" dark right={<Link to="/library" className="ul text-[13px] text-ink-60">The whole board →</Link>}>
          <RelatedList names={e.related} />
        </Section>
      )}

      <CloseCta short={short} />
    </>
  )
}

function PackageMini({ p }: { p: Product }) {
  const href = buyHref(p)
  const external = href.startsWith("http")
  const price = p.priceFrom === 0 ? "Free" : `${p.tiers ? "From " : ""}${fmtINR(p.priceFrom)}`
  const inner = <>{p.cta} <ArrowUpRight size={13} className="btn-arrow" /></>
  return (
    <div className="flex flex-col border-t border-line pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-medium tracking-tight">{p.name}</h3>
        <span className="mono text-[13px] tabular-nums text-ink-80">{price}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">{p.tagline}</p>
      <div className="mt-auto pt-5">
        {external
          ? <a href={href} className="ul inline-flex items-center gap-1.5 text-[12.5px] font-medium">{inner}</a>
          : <Link to={href} className="ul inline-flex items-center gap-1.5 text-[12.5px] font-medium">{inner}</Link>}
      </div>
    </div>
  )
}
