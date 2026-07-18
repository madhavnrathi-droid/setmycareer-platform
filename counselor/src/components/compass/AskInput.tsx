import { forwardRef } from "react"
import { SendHorizontal, X } from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

/* The Ask entry for the Compass Bar. The Ask sits on the glass pill (idle = a
   pill button, asking = an input row), with the brand logomark as its glyph —
   a bare black mark, no circle, no gradient. */

/** The launcher glyph — the brand logomark as a plain black mark (no chip). */
function SparkGlyph({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center text-foreground"
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.64)} className="text-foreground" />
    </span>
  )
}

type AskInputProps = {
  asking: boolean
  value: string
  onChange: (v: string) => void
  onOpen: () => void
  onSubmit: () => void
  onClose: () => void
  busy?: boolean
  placeholder?: string
  /** Slimmer bar — smaller glyph + height (used by the admin Mission Control bar). */
  compact?: boolean
}

export const AskInput = forwardRef<HTMLInputElement, AskInputProps>(function AskInput(
  { asking, value, onChange, onOpen, onSubmit, onClose, busy, placeholder = "Ask a question…", compact },
  ref,
) {
  const h = compact ? "h-9" : "h-11"
  const glyph = compact ? 28 : 34
  if (!asking) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Ask Compass a question"
        className={cn(
          "group flex cursor-text items-center gap-2.5 rounded-full pl-1 pr-4 text-left", h,
          "transition-transform duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-px",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SparkGlyph size={glyph} />
        <span className="whitespace-nowrap text-[13.5px] text-muted-foreground transition-colors group-hover:text-ink-600">
          {placeholder}
        </span>
      </button>
    )
  }

  return (
    <div className={cn("flex flex-1 items-center gap-2 rounded-full pl-1 pr-1", h)}>
      <SparkGlyph size={glyph} />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
        aria-label="Ask Compass"
        placeholder={placeholder}
        className="h-full flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim() || busy}
        aria-label="Send"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background",
          "transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30",
        )}
      >
        <SendHorizontal className="size-4 stroke-[1.75]" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close Compass"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground",
          "transition-colors hover:bg-secondary hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <X className="size-4 stroke-[1.75]" />
      </button>
    </div>
  )
})
