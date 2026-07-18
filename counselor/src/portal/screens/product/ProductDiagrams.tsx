// Signature graphics for the 2026 product pages — a framework PIPELINE (how the
// instruments become a decision) and a numbered METHOD RAIL (how the programme
// runs over time). Both are flex/CSS diagrams (responsive, no raw-SVG reflow
// pain), tuned to the craft rules: hairline structure, one rationed accent, the
// editorial serif for the nodes, tabular figures.

import type { ComponentType } from "react"
import type { Offering2026 } from "@/server/offerings-2026"
import {
  Brain, Compass, Gauge, Network, FileText, UserCheck, Sparkles, CalendarCheck, Route, ArrowRight,
} from "lucide-react"

type Stage = { icon: ComponentType<{ className?: string }>; label: string; sub: string; accent: boolean }

// The pipeline is built from what THIS offering actually includes, so a
// marketplace session and a full journey draw different (honest) diagrams.
function stagesFor(o: Offering2026): Stage[] {
  if (o.track === "marketplace") {
    return [
      { icon: CalendarCheck, label: "Book", sub: "instant confirm", accent: false },
      { icon: UserCheck, label: o.id === "mk_meet_expert" ? "A practitioner" : "Your counsellor", sub: "60 focused minutes", accent: true },
      { icon: FileText, label: "Notes", sub: "into your journey", accent: false },
    ]
  }
  const instruments: string[] = ["Personality", "Interests"]
  if (o.track === "student") instruments.push("Aptitude")
  const s: Stage[] = [
    { icon: Brain, label: "Instruments", sub: instruments.join(" · "), accent: false },
    { icon: Network, label: "Career-fit engine", sub: "JCE + ontology", accent: false },
    { icon: FileText, label: "Your report", sub: "career fit, scored", accent: true },
  ]
  if (o.sessions > 0) s.push({ icon: UserCheck, label: "Counsellor", sub: `${o.sessions} session${o.sessions === 1 ? "" : "s"}`, accent: false })
  if (o.careerCredits > 0 || o.voiceCredits > 0) s.push({ icon: Compass, label: "Compass", sub: "AI, between sessions", accent: false })
  s.push({ icon: Route, label: "Your plan", sub: "defensible at home", accent: false })
  return s
}

export function PipelineDiagram({ o }: { o: Offering2026 }) {
  const stages = stagesFor(o)
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      {/* mobile: a vertical list with down-arrows. sm+: a row where each node
          and each connector are SIBLINGS (so the connector bridges nodes,
          never stacks under one). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
        {stages.map((st, i) => {
          const Icon = st.icon
          return (
            <div key={st.label} className="contents sm:flex sm:min-w-0 sm:flex-1 sm:items-start">
              <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                <span
                  className={
                    "grid size-10 shrink-0 place-items-center rounded-xl " +
                    (st.accent ? "bg-foreground text-background" : "border border-border bg-secondary text-ink-600")
                  }
                >
                  <Icon className="size-[18px] stroke-[1.5]" />
                </span>
                <div className="min-w-0 sm:mt-3">
                  <p className="font-editorial text-[16px] font-medium leading-none tracking-tight text-foreground">{st.label}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{st.sub}</p>
                </div>
                {/* mobile down-arrow */}
                {i < stages.length - 1 && <ArrowRight className="ml-auto size-4 shrink-0 rotate-90 text-ink-300 sm:hidden" />}
              </div>
              {/* sm+ connector — a hairline that bridges this node's icon to the
                  next, vertically centred on the 40px icon (top-5 = 20px) */}
              {i < stages.length - 1 && (
                <span aria-hidden className="relative top-5 mx-2 hidden h-px min-w-4 flex-1 self-start bg-border sm:block" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// The numbered rail — the programme's arc over time. Each step (bar the last)
// draws a hairline from its badge to the NEXT badge, so the line spans exactly
// the nodes with no dangling tail past the final step.
export function MethodRail({ steps }: { steps: { t: string; d: string }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <div key={s.t} className="relative">
          {/* connector to the next badge (lg only; badge bg-card paints over its start) */}
          {i < steps.length - 1 && (
            <span aria-hidden className="pointer-events-none absolute left-3 top-3 hidden h-px w-[calc(100%+1.5rem)] bg-border lg:block" />
          )}
          <span className="relative grid size-6 place-items-center rounded-full border border-border bg-card font-mono text-[10px] tabular-nums text-ink-500">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="mt-3 font-editorial text-[19px] font-light tracking-tight text-foreground">{s.t}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.d}</p>
        </div>
      ))}
    </div>
  )
}

// The instruments detail — kept as a precise list UNDER the pipeline, for the
// reader who wants the exact item counts and models (graphic + evidence).
export function InstrumentList({ rows }: { rows: { n: string; t: string; d: string }[] }) {
  const ICON: Record<string, ComponentType<{ className?: string }>> = {
    "Personality Test": Brain,
    "Interest Pattern Test": Compass,
    "Ability Test": Gauge,
    "Career ontology": Network,
    "A human counsellor": UserCheck,
    "AI Career Copilot": Sparkles,
    "A practitioner, not a counsellor": UserCheck,
  }
  return (
    <div className="divide-y divide-border border-y border-border">
      {rows.map((m) => {
        const Icon = ICON[m.t] ?? Sparkles
        return (
          <div key={m.n} className="flex items-baseline gap-4 py-4">
            <span className="mt-0.5 grid size-7 shrink-0 -translate-y-0.5 place-items-center rounded-lg border border-border bg-secondary text-ink-600">
              <Icon className="size-3.5 stroke-[1.5]" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-foreground">{m.t}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{m.d}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
