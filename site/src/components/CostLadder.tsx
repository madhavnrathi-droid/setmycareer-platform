import { Kicker, SplitReveal } from "@/components/bits"

// THE ARITHMETIC — the decision-insurance device. Families already spend a fortune on the
// PATH (coaching, degree, higher study); almost nothing on the DIRECTION. The counselling is
// the smallest line — the diligence that protects every larger one. Figures are honest market
// RANGES, framed as arithmetic, not cited statistics. Monochrome, paper-on-ink, same grammar
// as Stakes. Reusable: rendered inside the dark Stakes section (Home) and as a standalone dark
// band on /pricing.

const ROWS: { label: string; figure: string; smc?: boolean }[] = [
  { label: "JEE or NEET coaching", figure: "₹1–4 lakh" },
  { label: "A degree", figure: "₹10–40 lakh" },
  { label: "Higher study — an MBA, or abroad", figure: "₹25 lakh–1 crore" },
  { label: "The decision behind all of it", figure: "from free", smc: true },
]

export function CostLadder({ standalone = false }: { standalone?: boolean }) {
  const body = (
    <>
      <Kicker className="!text-paper/50">The arithmetic</Kicker>
      <SplitReveal className="h-xl mt-5 max-w-[20ch] text-paper">
        Everyone pays for the path. Almost no one pays for the <span className="b">direction</span>.
      </SplitReveal>
      <ul className="mt-12 border-t border-paper/15">
        {ROWS.map((r) => (
          <li
            key={r.label}
            data-reveal
            className="flex items-baseline justify-between gap-6 border-b border-paper/15 py-5 md:py-6"
          >
            <span className={`text-[14.5px] sm:text-[17px] ${r.smc ? "text-paper" : "text-paper/70"}`}>{r.label}</span>
            <span
              className={`mono shrink-0 tabular-nums font-extralight leading-none text-[clamp(1.1rem,3.4vw,1.9rem)] ${r.smc ? "text-paper" : "text-paper/55"}`}
            >
              {r.figure}
            </span>
          </li>
        ))}
      </ul>
      <p data-reveal className="mono mt-6 max-w-[40ch] text-[11px] uppercase leading-relaxed tracking-[0.13em] text-paper/45">
        One of these decides whether the other three were worth it.
      </p>
    </>
  )
  if (!standalone) return <div className="mt-16 border-t border-paper/15 pt-12">{body}</div>
  return (
    <section className="plate-dark hair-t">
      <div className="wrap py-24 md:py-32">{body}</div>
    </section>
  )
}
