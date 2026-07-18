import { TriangleAlert, Lock } from "lucide-react"
import type { Client } from "@/lib/types"
import { CLUSTER_LABELS } from "@/lib/mock"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { Radar } from "@/components/custom/Radar"
import { TrendArea } from "@/components/custom/TrendArea"
import { MetricInfo } from "@/components/custom/MetricInfo"
import { CareerSignalPanel } from "@/components/custom/CareerSignalPanel"
import { useGsap, revealChildren } from "@/lib/gsap"

function Vital({
  label,
  ring,
  info,
}: {
  label: string
  ring: number | null
  info?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div className="inline-flex items-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
        {label}
        {info}
      </div>
      <ScoreRing value={ring} size={64} stroke={4} />
    </div>
  )
}

export function ClientOverview({ client }: { client: Client }) {
  const ref = useGsap((s) => revealChildren(s), [client.id])
  const bp = client.blueprint
  const clusters = Object.keys(CLUSTER_LABELS) as (keyof typeof CLUSTER_LABELS)[]
  const exec = bp.signals.find((s) => s.id === "pc.execution_momentum")

  // Career fingerprint: each of the 5 clusters averaged from its signals' scores.
  const clusterRadar = clusters
    .map((ck) => {
      const scored = bp.signals
        .filter((s) => s.cluster === ck && s.score != null)
        .map((s) => s.score as number)
      if (!scored.length) return null
      const avg = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      return { axis: CLUSTER_LABELS[ck], value: avg }
    })
    .filter((d): d is { axis: string; value: number } => d !== null)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {/* headline + vitals — the numbers the client sees (REF-A) */}
      <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Current read · shared with client</p>
        <h2 className="mt-1.5 font-display text-[clamp(22px,3vw,28px)] font-extralight tracking-tight">{bp.headline}</h2>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Vital
            label="Career index"
            ring={bp.careerIndex}
            info={<MetricInfo id="cx.career_index" />}
          />
          <Vital
            label="Life-performance"
            ring={bp.bloomIndex}
            info={<MetricInfo id="cx.bloom_index" />}
          />
          <Vital
            label="Execution"
            ring={exec?.score ?? null}
            info={
              <MetricInfo
                title="Execution & momentum"
                flow={["Follow-through cues", "Across recent sessions", "Execution 0–100"]}
              >
                How consistently the client turns intent into action — applications sent,
                steps taken, commitments kept — read across recent sessions. It tracks
                momentum more than any single week.
              </MetricInfo>
            }
          />
          <div>
            <div className="inline-flex items-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
              Wellbeing
              <MetricInfo id="wellbeing" />
            </div>
            <div className="mt-2 font-display text-[24px] font-extralight text-mind-600">{client.wellbeingBand ?? "—"}</div>
            <div className="text-[11px] tabular-nums text-muted-foreground">{client.clinical.wellbeingIndex ?? "—"}/100</div>
          </div>
        </div>
      </section>

      {/* career fingerprint + trajectory — radar of the 5 clusters and the
          "climbing, and at what cost" trend (career index w/ wellbeing overlaid) */}
      <section data-reveal className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Career fingerprint</p>
          <p className="mt-1 text-[12.5px] text-ink-500">Five clusters, averaged from their signals</p>
          {clusterRadar.length ? (
            <Radar
              data={clusterRadar}
              max={100}
              size={260}
              tone="brand"
              label="Cluster score"
              className="mt-2"
            />
          ) : (
            <div className="mt-6 text-[12.5px] text-muted-foreground">Not enough signal yet</div>
          )}
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
          <p className="inline-flex items-center text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
            Trajectory
            <MetricInfo id="cx.career_index" />
          </p>
          <p className="mt-1 text-[12.5px] text-ink-500">Career index over sessions, wellbeing overlaid</p>
          <div className="mt-4 flex items-center gap-5 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-ink-600">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
              Career index
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-600">
              <span className="inline-block h-0.5 w-3.5 rounded-full bg-mind-500" />
              Wellbeing
            </span>
          </div>
          <TrendArea
            data={client.indexHistory.map(
              (p): Record<string, number | string> => ({
                label: p.label,
                careerIndex: p.careerIndex,
                wellbeing: p.wellbeing,
              }),
            )}
            dataKey="careerIndex"
            xKey="label"
            series2="wellbeing"
            series2Tone="mind"
            height={208}
            label="Career index"
            className="mt-2"
          />
        </div>
      </section>

      {/* career market — the live job-match viz, in this screen's own card so it
          matches its neighbours; the client's measured fit lives on My Best Fit */}
      <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
        <CareerSignalPanel bare name={client.name} />
      </section>

      {/* counselor-only clinical layer */}
      <section
        data-reveal
        className="rounded-2xl border-l-2 bg-card p-5 shadow-[var(--shadow-e2)]"
        style={{ borderLeftColor: "var(--color-mind-500)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock className="size-3.5 stroke-[1.5] text-mind-600" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mind-600">Clinical · counselor only</span>
        </div>

        {bp.contradiction && (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-warn-100 px-4 py-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-warn-600" />
            <div>
              <div className="inline-flex items-center text-[12px] font-medium text-warn-600">
                Career × wellbeing
                <MetricInfo id="contradiction" />
              </div>
              <p className="mt-0.5 text-[12.5px] text-foreground">{bp.contradiction.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Vital label="Wellbeing index" ring={client.clinical.wellbeingIndex} />
          <Vital label="Alliance" ring={client.clinical.alliance} />
          <Vital label="Engagement" ring={client.clinical.engagement} />
          <Vital label="Adherence" ring={client.clinical.adherence} />
        </div>

        {client.clinical.notes.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Clinical notes</div>
            <ul className="flex flex-col gap-1.5">
              {client.clinical.notes.map((n, i) => (
                <li key={i} className="text-[12.5px] text-ink-600">· {n}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
