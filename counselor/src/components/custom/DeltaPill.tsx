import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

/* Semantic delta chip (REF "team performance" / signal deltas): a small rounded
   pill carrying ↑/↓ + the absolute change, tinted well (up) or risk (down). Used
   inline next to scores and per-session signal movements. Tabular, AA-contrast.
   Renders nothing for null / 0 so a flat signal stays quiet (Rams: unobtrusive). */
export function DeltaPill({
  value,
  className,
}: {
  value: number | null | undefined
  className?: string
}) {
  if (value == null || value === 0) return null
  const up = value > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      role="img"
      aria-label={`${up ? "up" : "down"} ${Math.abs(value)}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums",
        up ? "bg-well-100 text-well-600" : "bg-risk-100 text-risk-600",
        className,
      )}
    >
      <Icon className="size-3 stroke-[2]" aria-hidden="true" />
      {Math.abs(value)}
    </span>
  )
}
