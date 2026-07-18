import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/* Inline metric explainer. A tiny superscript Info icon that opens a Popover with
   a short, plain-language description of what a score represents plus a conceptual
   inputs → weighting → score funnel. It NEVER exposes exact algorithms or weights
   — only the shape of how signals flow into a number, so counselors can explain
   the read to a client without over-claiming precision.

   Usage:
     <span className="inline-flex items-center gap-0.5">
       Career index<MetricInfo id="cx.career_index" />
     </span>
*/

export type Explainer = {
  title: string
  blurb: string
  steps: string[]
}

export const EXPLAINERS: Record<string, Explainer> = {
  "cx.career_index": {
    title: "Career index",
    blurb:
      "A single read of how ready and directed a client is in their career, blending the strongest signals across clarity, market fit, momentum and confidence. It is a guide for the conversation, not a verdict.",
    steps: [
      "Session signals + assessments",
      "Weighted by confidence",
      "Career index 0–100",
    ],
  },
  "pc.market_readiness": {
    title: "Market readiness",
    blurb:
      "How prepared a client looks to compete for the roles they want right now — skills on hand, portfolio evidence, and gaps still open. Higher means closer to applying with conviction.",
    steps: [
      "Skill coverage + evidence",
      "Compared to role demands",
      "Readiness 0–100",
    ],
  },
  wellbeing: {
    title: "Wellbeing index",
    blurb:
      "A clinical-side read of how the client is coping — mood, load and sustainability cues drawn from how they speak across sessions. It tracks change over time more than any single number.",
    steps: [
      "Wellbeing cues in sessions",
      "Smoothed across sessions",
      "Wellbeing band + index",
    ],
  },
  "cx.bloom_index": {
    title: "Life-performance index",
    blurb:
      "A broader view of how the client is functioning across work and life — energy, follow-through and balance — sitting alongside the career read rather than inside it.",
    steps: [
      "Career + wellbeing signals",
      "Balanced together",
      "Life-performance 0–100",
    ],
  },
  contradiction: {
    title: "Contradiction flag",
    blurb:
      "Raised when two reads point in opposite directions — for example, strong career momentum while wellbeing is dropping. It is a prompt to look closer, never an automatic conclusion.",
    steps: [
      "Career read",
      "Checked against wellbeing",
      "Flag if they diverge",
    ],
  },
}

/* Thin conceptual funnel: inputs → weighting → score, drawn as box + chevron
   stages. Encodes flow only — no numbers, no weights. */
function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="mt-3 flex items-stretch gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-1 items-center gap-1">
          <div
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-center text-[10px] leading-tight",
              i === steps.length - 1
                ? "border-brand-500/40 bg-brand-100 text-brand-600"
                : "border-border bg-secondary text-ink-600",
            )}
          >
            {step}
          </div>
          {i < steps.length - 1 && (
            <svg
              width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"
              className="shrink-0 text-ink-300"
            >
              <path
                d="M1 1l5 4-5 4" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

export function MetricInfo({
  id,
  title,
  children,
  flow,
  className,
}: {
  id?: string
  title?: string
  children?: React.ReactNode
  /** override the funnel stages; defaults to the explainer's steps */
  flow?: string[]
  className?: string
}) {
  const explainer = id ? EXPLAINERS[id] : undefined
  const heading = title ?? explainer?.title ?? "About this score"
  const steps = flow ?? explainer?.steps

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What does ${heading} mean?`}
          className={cn(
            "ml-0.5 inline-grid size-4 -translate-y-1 place-items-center rounded-full align-super text-ink-300 transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Info className="size-3 stroke-[1.5]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
          What this means
        </div>
        <h3 className="mt-1 text-[14px] font-medium text-foreground">{heading}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
          {children ?? explainer?.blurb}
        </p>
        {steps && steps.length > 0 && (
          <>
            <div className="mt-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
              How it is built
            </div>
            <FlowDiagram steps={steps} />
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500">
              Conceptual flow only — exact weighting is not shown.
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
