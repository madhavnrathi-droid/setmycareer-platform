import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/* Thin-line empty state: a hairline-ring icon, a quiet title + note, and at most
   one action. Mirrors the slice's restrained card language (no heavy fills). */
export function EmptyState({
  icon: Icon,
  title,
  note,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  note?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-11 place-items-center rounded-full border border-border text-ink-300">
          <Icon className="size-5 stroke-[1.5]" />
        </span>
      )}
      <div className="text-[14px] font-medium text-foreground">{title}</div>
      {note && <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">{note}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* Section heading: tiny uppercase eyebrow + thin display title, optional trailing
   action (link/button). Used to open sections across screens. */
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{eyebrow}</p>
        )}
        <h2 className="mt-1 truncate font-display text-[18px] font-light tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
