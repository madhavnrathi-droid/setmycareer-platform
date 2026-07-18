import { Kicker, SplitReveal } from "@/components/bits"
import { LogoWall } from "@/components/LogoWall"
import { CLIENT_COMPANIES } from "@/content/logos"

// Where clients land — the monochrome marks of the companies SMC clients now
// work at, no boxes, in a band that breaks the standard margins. (The education
// side — schools + the path that leads there — lives in the StudentJourney
// section, where the crests are woven into the flow.)
export function Clients() {
  return (
    <section className="pt-24 md:pt-32 pb-14 md:pb-20">
      {/* header, in the standard column */}
      <div className="wrap flex flex-wrap items-end justify-between gap-6">
        <div>
          <Kicker>The outcomes</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[15ch]">Our clients go <span className="b">everywhere</span>.</SplitReveal>
        </div>
        <p data-reveal className="max-w-sm text-[14px] leading-relaxed text-ink-60">Fifteen years of decisions, decided well. A sample of where SetMyCareer clients now work.</p>
      </div>

      {/* the logos break the margins — a wider band that uses more of the screen */}
      <div className="mx-auto mt-16 w-full max-w-[1780px] px-[clamp(20px,4vw,72px)] md:mt-20">
        <SectionLabel>Where they work</SectionLabel>
        <LogoWall items={CLIENT_COMPANIES} />
      </div>

      <p className="wrap mt-12 text-[11.5px] leading-relaxed text-ink-40">
        Marks belong to their respective owners and are shown as reference, not endorsement or partnership.
      </p>
    </section>
  )
}

/* a clear, ruled section label — small-caps, wide tracking, hairline rule */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-center gap-5">
      <h3 className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-60">{children}</h3>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
