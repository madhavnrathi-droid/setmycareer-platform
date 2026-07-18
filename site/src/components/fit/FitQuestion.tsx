import { useEffect, useRef } from "react"
import { ArrowLeft, ArrowUpRight } from "@carbon/icons-react"
import { LIKERT_SCALE, type FlowItem } from "@/content/fit-test"

/* One item per view. Scored questions (likert/choice) are 44px+ tap targets with
   number-key shortcuts; the open reflections render a textarea with Continue /
   Skip. The slide/fade entrance is a transform/opacity-only keyframe keyed per
   item; reduced motion disables the animation (everything is instantly visible). */
export function FitQuestionView({ q, index, total, value, textValue, dir, onPick, onText, onContinue, onBack }: {
  q: FlowItem
  index: number
  total: number
  /** likert: 1–5 · choice: option index · undefined when unanswered */
  value?: number
  /** the current free-text for a reflection item */
  textValue?: string
  dir: "fwd" | "back"
  onPick: (v: number) => void
  onText: (v: string) => void
  onContinue: () => void
  onBack: () => void
}) {
  // a11y: move focus to the fresh item so SR + keyboard users track the swap
  const headRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true })
  }, [q.id])

  const isText = q.kind === "text"

  const options: { key: number; label: string; hint: string; on: boolean }[] = isText
    ? []
    : q.kind === "likert"
      ? LIKERT_SCALE.map((s) => ({ key: s.v, label: s.label, hint: String(s.v), on: value === s.v }))
      : q.options.map((o, i) => ({ key: i, label: o.label, hint: String(i + 1), on: value === i }))

  return (
    <div key={q.id} className={dir === "fwd" ? "fit-in-r" : "fit-in-l"}>
      <div className="flex items-center justify-between gap-6">
        <span className="mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
          {isText ? "Reflection" : "Q"} {String(index + 1).padStart(2, "0")} / {total}
        </span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] text-paper/50 transition-colors hover:text-paper"
        >
          <ArrowLeft size={14} /> <span>Back</span>
        </button>
      </div>

      <p
        ref={headRef}
        tabIndex={-1}
        className="mt-8 min-h-[3.2em] max-w-3xl text-[clamp(1.4rem,3vw,2.2rem)] font-semibold leading-[1.22] tracking-[-0.02em] text-paper outline-none"
      >
        {q.text}
      </p>

      {isText ? (
        <div className="mt-7 max-w-2xl">
          <textarea
            value={textValue ?? ""}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={(e) => {
              // ⌘/Ctrl+Enter continues; plain Enter makes new lines (it's prose)
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onContinue() }
            }}
            rows={4}
            placeholder={q.placeholder}
            className="w-full resize-none border border-paper/25 bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-paper placeholder:text-paper/35 focus:border-paper/70 focus:outline-none"
          />
          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
            <button type="button" onClick={onContinue} className="btn btn--solid-dark">
              <span>{(textValue ?? "").trim() ? "Continue" : q.optional ? "Skip this one" : "Continue"}</span>
              <ArrowUpRight size={15} className="btn-arrow" />
            </button>
            <p className="mono text-[10px] uppercase tracking-[0.13em] text-paper/40">
              Optional · ⌘/Ctrl + Enter to continue · your words help us tailor the result
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid max-w-2xl gap-2" role="group" aria-label="Answer options">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => onPick(o.key)}
                aria-pressed={o.on}
                className={`group flex min-h-[52px] items-center justify-between gap-4 border px-5 py-3.5 text-left text-[14.5px] transition-colors ${
                  o.on
                    ? "border-paper bg-paper text-ink"
                    : "border-paper/25 text-paper/85 hover:border-paper/70"
                }`}
              >
                <span>{o.label}</span>
                <span className={`mono text-[11px] tabular-nums ${o.on ? "text-ink/50" : "text-paper/30 group-hover:text-paper/60"}`}>
                  {o.hint}
                </span>
              </button>
            ))}
          </div>

          <p className="mono mt-6 text-[10px] uppercase tracking-[0.13em] text-paper/40">
            Keys {q.kind === "likert" ? "1–5" : `1–${options.length}`} pick · Enter advances · first instinct is the honest answer
          </p>
        </>
      )}
    </div>
  )
}
