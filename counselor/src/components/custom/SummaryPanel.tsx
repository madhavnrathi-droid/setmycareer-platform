import { cn } from "@/lib/utils"

/* Right-rail stacked summary card (REF-C): a titled container for session/transcript
   review. Sections inside are hairline-divided, each with a tiny uppercase label. */
export function SummaryPanel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <aside className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-medium text-foreground">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </aside>
  )
}

/* One stacked section: tiny eyebrow label over its content. Stacks under hairlines. */
export function SummarySection({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("py-4 first:pt-3 last:pb-0", className)}>
      <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</div>
      <div className="text-[12.5px] leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}
