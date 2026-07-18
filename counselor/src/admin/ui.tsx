// Small shared building blocks for the admin screens — an inline sparkline, a
// filled area chart, delta tag, modal, form fields and table primitives. Kept
// dependency-free and de-boxed by default.

import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowDownRight, ArrowUpRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const TONE_STROKE: Record<string, string> = {
  brand: "stroke-brand-500", well: "stroke-well-600", mind: "stroke-mind-500", warn: "stroke-warn-600", risk: "stroke-risk-500",
}
const TONE_FILL: Record<string, string> = {
  brand: "fill-brand-500/15", well: "fill-well-500/15", mind: "fill-mind-500/15", warn: "fill-warn-500/15", risk: "fill-risk-500/15",
}

export function Spark({ data, tone = "brand", w = 80, h = 26 }: { data: number[]; tone?: string; w?: number; h?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" className={cn(TONE_STROKE[tone] ?? "stroke-brand-500")} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Filled area chart that scales to its container — used by the bento feature tiles. */
export function Area({ data, tone = "brand", className }: { data: number[]; tone?: string; className?: string }) {
  if (data.length < 2) return null
  const w = 100, h = 40
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 6) - 3])
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ")
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("w-full", className)}>
      <polygon points={area} className={cn(TONE_FILL[tone] ?? "fill-brand-500/15")} stroke="none" />
      <polyline points={line} fill="none" className={cn(TONE_STROKE[tone] ?? "stroke-brand-500")} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function DeltaTag({ value, invert }: { value: number; invert?: boolean }) {
  if (!value) return <span className="text-[11.5px] text-ink-300">—</span>
  const up = value > 0
  const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums", good ? "text-well-600" : "text-risk-500")}>
      <Icon className="size-3" />{Math.abs(value).toFixed(1)}%
    </span>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export const tableHead = "border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-ink-400"
export const td = "py-3 pr-4 text-[13px] text-foreground align-middle"

// ── modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, subtitle, onClose, children, footer, wide }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev }
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-e4)]", wide ? "max-w-[620px]" : "max-w-[460px]")}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ── form fields ────────────────────────────────────────────────────────────────
export const fieldLabel = "mb-1 block text-[12px] font-medium text-foreground"
export const fieldBox = "w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-ink-300 focus:border-brand-400"

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className={fieldLabel}>{label}</span>{children}</label>
}

export const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-40"
export const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary"
