import { Sparkles } from "lucide-react"

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-2xl border border-border bg-card">
          <Sparkles className="size-5 stroke-[1.25] text-ink-300" />
        </div>
        <h1 className="font-display text-[24px] font-light tracking-tight">{title}</h1>
        <p className="max-w-sm text-[13px] text-muted-foreground">{note ?? "This view is part of the build and lands next."}</p>
      </div>
    </div>
  )
}
