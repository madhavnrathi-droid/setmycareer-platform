import { useState } from "react"
import { Add } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { FAQ } from "@/content/faq"

// Answer-first FAQ — objection handling before the funnel ends, and the visible
// half of the FAQPage schema baked into index.html. Click to open; answers stay in
// the DOM either way so answer engines can read them.
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="hair-t">
      <div className="wrap grid gap-12 py-24 md:grid-cols-[0.8fr_1.2fr] md:py-32">
        <div>
          <Kicker>Questions</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[12ch]">Answers, before <span className="b">you ask</span>.</SplitReveal>
          <p data-reveal className="lead mt-7 max-w-sm text-ink-60">The questions students and parents bring us most — answered plainly.</p>
        </div>
        <div>
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} className="border-t border-line last:border-b">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <h3 className="text-[clamp(1.05rem,1.9vw,1.4rem)] font-medium tracking-tight">{item.q}</h3>
                  <Add size={22} className="shrink-0 text-ink-40 transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : "none" }} />
                </button>
                <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <p className="serif max-w-2xl pb-7 text-[1.02rem] leading-relaxed text-ink-80">{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
