import { band } from "@/lib/sigma"
import { cn } from "@/lib/utils"

/* Bipolar trait row (Sigma personality). A center-origin track running between a
   low pole (left) and high pole (right), with a marker dot placed at the 0–99
   score. The dominant half tints brand; a moderate score (40–59) reads centered
   and stays neutral. Truthful — the dot's offset reflects absolute position.
   Direct-labelled, tabular, aria-described. */
export function BipolarBar({
  low,
  high,
  score,
  className,
}: {
  low: string
  high: string
  score: number // 0–99
  className?: string
}) {
  const b = band(score, "personality")
  // marker position across the full track (0 = far left/low, 100 = far right/high)
  const pos = Math.max(0, Math.min(100, (score / 99) * 100))
  const leftLead = b === "low"
  const rightLead = b === "high"

  return (
    <div className={cn("group/bp", className)}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[12px] leading-tight transition-colors",
            leftLead ? "font-medium text-foreground" : "text-ink-300",
          )}
        >
          {low}
        </span>
        <span
          className={cn(
            "text-[12px] leading-tight transition-colors",
            rightLead ? "font-medium text-foreground" : "text-ink-300",
          )}
        >
          {high}
        </span>
      </div>

      <div
        className="relative mt-2 h-1.5"
        role="img"
        aria-label={`${low} to ${high}: score ${score} of 99 — leaning ${b === "moderate" ? "balanced" : b === "high" ? high : low}`}
      >
        {/* full track */}
        <div className="absolute inset-0 rounded-full bg-ink-100" />
        {/* tinted span from center to the marker, showing the lean */}
        {!leftLead && !rightLead ? null : (
          <div
            className="absolute top-0 h-full rounded-full bg-brand-500/30"
            style={
              pos >= 50
                ? { left: "50%", width: `${pos - 50}%` }
                : { left: `${pos}%`, width: `${50 - pos}%` }
            }
          />
        )}
        {/* center origin tick */}
        <div className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-ink-200" />
        {/* marker dot */}
        <div
          className={cn(
            "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-colors",
            b === "moderate" ? "bg-ink-300" : "bg-brand-500",
          )}
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  )
}
