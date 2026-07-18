import { useState, useRef, useEffect, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, ArrowRight } from "@carbon/icons-react"
import { Kicker, Magnetic, NaviPortrait, SplitReveal } from "@/components/bits"
import { useReveals, useCounter } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { useNavigators, useStats, naviImage, naviExpertise, naviYears, naviServices, cleanField, PORTAL_URL, COUNSELLOR_URL, type Navigator } from "@/lib/api"

// The network, in full: every active counsellor from the live roster, the paid
// domain-expert sessions offering, and the two ways to join — train as a
// counsellor (then auto-assigned) or apply as a domain expert.

function Stat({ value, label }: { value: number; label: string }) {
  const ref = useCounter(value)
  return (
    <div data-reveal className="border-t border-line pt-5">
      <div className="display !text-[clamp(2.2rem,5vw,3.6rem)] font-extralight leading-none tabular-nums"><span ref={ref}>0</span><span className="text-ink-40">+</span></div>
      <p className="mono mt-2 text-[10.5px] uppercase tracking-[0.13em] text-ink-40">{label}</p>
    </div>
  )
}

// A roster card. On hover/focus the photo fades into a short description of what
// the counsellor does, with a "Book a session" button; the whole photo links to
// the profile. The grid parts its neighbours around it. Photos are only ever
// uniformly scaled/translated — never skewed or distorted. No nested anchors:
// the profile link fills the photo, the Book link re-enables pointer events
// inside an otherwise click-through overlay.
function RosterCard({ n, style, active, onEnter, onLeave }: {
  n: Navigator; style: CSSProperties; active: boolean; onEnter: () => void; onLeave: () => void
}) {
  const name = cleanField(n.name) ?? "Counsellor"
  const img = naviImage(n) // undefined → NaviPortrait renders an initials monogram, never a stranger
  const yrs = naviYears(n)
  const loc = cleanField(n.location)
  const meta = [yrs && `${yrs} yrs`, loc].filter(Boolean).join(" · ")
  const expertise = naviExpertise(n) ?? "Career Counsellor"
  const about = cleanField(n.about_navigator) ?? cleanField(n.short_Description)
  const svc = naviServices(n)
  const desc = about ? about.split(/(?<=[.!?])\s/)[0]
    : svc.length ? svc.slice(0, 3).join(" · ")
    : `${expertise}${yrs ? ` · ${yrs} years' experience` : ""}`
  return (
    <article
      onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onEnter} onBlur={onLeave}
      style={style}
      className="group relative block origin-center transition-[transform,opacity] duration-[420ms] ease-out will-change-transform"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-ink-20">
        <NaviPortrait src={img} name={name} />
        {/* whole photo → profile (the big target; stays clickable under the overlay) */}
        <Link to={`/experts/${n.id}`} aria-label={`${name} — view profile`}
          className="absolute inset-0 z-10 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper" />
        {/* hover/focus reveal — fades the photo into what they do; the whole card
            links to the profile (no get-matched CTA). */}
        <div className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-ink/92 via-ink/45 to-transparent p-3 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
          <span className="mono text-[9px] uppercase tracking-[0.12em] text-paper/70">{expertise}</span>
          <p className="line-clamp-4 text-[11.5px] leading-snug text-paper/85">{desc}</p>
          <span className="mono mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-paper/70">View profile <ArrowUpRight size={11} /></span>
        </div>
      </div>
      <div className="mt-3 pr-2">
        <p className="text-[14px] font-medium tracking-tight">{name}</p>
        <p className="mono mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-40">{expertise}</p>
        {meta && <p className="mono mt-1 text-[10.5px] tracking-[0.02em] text-ink-60">{meta}</p>}
      </div>
    </article>
  )
}

// The roster grid with the "dock" hover: the hovered card grows and its
// neighbours move to make room. Column count is read from the live computed
// grid so the geometry is correct at every breakpoint; reduced-motion opts out.
function RosterGrid({ data }: { data: Navigator[] }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [cols, setCols] = useState(5)
  const reduce = useRef(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches).current

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    // count columns from LAYOUT (children sharing the first row's offsetTop) —
    // robust across breakpoints and immune to how grid-template-columns computes.
    // Transforms don't affect offsetTop, so a mid-hover measure is still correct.
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[]
      if (!kids.length) return
      const top0 = kids[0].offsetTop
      let c = 0
      for (const k of kids) { if (k.offsetTop === top0) c++; else break }
      if (c) setCols(c)
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const styleFor = (i: number): CSSProperties => {
    if (hovered == null || reduce) return {}
    if (i === hovered) return { transform: "scale(1.13)", zIndex: 30 }
    const r = Math.floor(i / cols), c = i % cols, hr = Math.floor(hovered / cols), hc = hovered % cols
    if (r === hr) return { transform: `translateX(${Math.sign(c - hc) * 24}px) scale(0.975)`, opacity: 0.8, zIndex: 1 }
    return { transform: `translateY(${Math.sign(r - hr) * 6}px) scale(0.985)`, opacity: 0.82, zIndex: 1 }
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {data.map((n, i) => (
        <RosterCard
          key={String(n.id)} n={n} style={styleFor(i)} active={hovered === i}
          onEnter={() => setHovered(i)} onLeave={() => setHovered((h) => (h === i ? null : h))}
        />
      ))}
    </div>
  )
}

export function Experts() {
  const ref = useReveals()
  const { data, loading, error, retry } = useNavigators(120)
  const stats = useStats()
  const navs = Number(stats?.NavigatorCount) || data.length || 55
  useSeo({
    title: "The Network — SetMyCareer",
    description: "Every SetMyCareer counsellor, live from the roster — trained to read assessments with care. And the case for joining them: reach, instruments, and a method refined over fifteen years.",
    path: "/experts",
  })

  return (
    <main ref={ref} className="pt-28">
      {/* intro */}
      <section className="wrap pb-12 pt-12 md:pt-20">
        <Kicker>The network</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[13ch]">People behind <span className="b">the method</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-xl text-ink-60">Two kinds of people guide you here. <span className="text-ink-80">Certified counsellors</span> — trained in our method, matched to you from your results. And <span className="text-ink-80">domain experts</span> — practitioners you book by field, for advice from inside the work. The technology widens their reach; the judgement stays theirs.</p>
        <div data-reveal className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Stat value={navs} label="Certified counsellors" />
          <Stat value={101780} label="Hours of counselling" />
          <Stat value={71537} label="Assessments taken" />
        </div>
      </section>

      {/* the full roster, live */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap py-16 md:py-20">
          <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="h-lg">The roster, <span className="b">live</span>.</h2>
            <p className="mono text-[11px] uppercase tracking-[0.13em] text-ink-40">
              {loading ? "Loading the live roster…" : error && data.length === 0 ? "Roster unreachable" : `${data.length} counsellors · from the production roster`}
            </p>
          </div>
          {data.length > 0 ? (
            <RosterGrid data={data} />
          ) : loading ? (
            /* skeleton while the ~117KB roster payload arrives — shaped like the
               real cards so the page doesn't jump when they land */
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-busy="true" aria-label="Loading counsellors">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="aspect-[3/4] bg-ink-20" />
                  <div className="mt-3 h-3 w-3/4 bg-ink-20" />
                  <div className="mt-2 h-2.5 w-1/2 bg-ink-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-line bg-paper px-8 py-14 text-center">
              <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-80">The live roster didn’t come through — the connection to the SetMyCareer server dropped mid-load.</p>
              <button onClick={retry} className="btn mt-6"><span>Retry loading the roster</span></button>
            </div>
          )}
        </div>
      </section>

      {/* expert sessions — the paid specialist offering, distinct from counselling */}
      <section id="expert-sessions" className="hair-t scroll-mt-24">
        <div className="wrap grid items-center gap-12 py-20 md:grid-cols-[0.95fr_1.05fr] md:py-28">
          <div>
            <Kicker>Expert sessions</Kicker>
            <SplitReveal className="h-xl mt-5 max-w-[13ch]">Talk to someone who's <span className="b">done it</span>.</SplitReveal>
            <p data-reveal className="lead mt-7 max-w-md text-ink-60">Counselling sets your direction. An expert session goes narrow and deep — 45 minutes with a domain specialist in the exact role, industry or move you're weighing. Book one on its own, or add it to any package.</p>
            <div data-reveal className="mt-9 flex flex-wrap items-center gap-5">
              <Link to="/book" className="btn btn--solid"><span>Book an expert · ₹2,990</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
              <Link to="/pricing" className="ul text-[13px] text-ink-60">All sessions & pricing →</Link>
            </div>
          </div>
          <div data-reveal className="grid gap-px border border-line bg-line">
            {[
              { k: "Certified counsellor", a: "Auto-assigned from your results", b: "Your overall direction — streams, courses, fields, the plan." },
              { k: "Domain expert", a: "You book the specialist", b: "Field-level detail — one role, industry or transition, from the inside." },
            ].map((r) => (
              <div key={r.k} className="bg-paper-pure p-6 md:p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[16px] font-medium tracking-tight">{r.k}</h3>
                  <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-40">{r.a}</span>
                </div>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-60">{r.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* join — two distinct paths: train as a counsellor, or apply as a domain expert */}
      <section id="apply" className="plate-dark scroll-mt-24">
        <div className="wrap py-20 md:py-28">
          <Kicker className="!text-paper/50">Join the network</Kicker>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SplitReveal className="h-xl mt-5 max-w-[16ch] text-paper">Two ways <span className="b">to join</span>.</SplitReveal>
            <Link data-reveal to="/counsellors" className="ul inline-flex items-center gap-2 text-[13.5px] text-paper/70">See the console you'd work in <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-12 grid gap-px border border-paper/15 bg-paper/15 md:grid-cols-2">
            {/* counsellor path — certified through training, then auto-assigned */}
            <div className="bg-ink p-8 md:p-10">
              <span className="kicker !text-paper/50">Become a counsellor</span>
              <h3 className="mt-3 text-[22px] font-medium tracking-tight text-paper">Train, certify, get assigned.</h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-paper/60">Counsellors earn certification through our training program — the method the founder taught a hundred counsellors before you. Once certified, you're onboarded and auto-assigned to students from their results.</p>
              <ul className="mt-5 space-y-1.5">
                {["A fifteen-year methodology, taught properly", "Students matched to you — no marketing of your own", "Scheduling, video and reports run on the platform"].map((t) => (
                  <li key={t} className="flex items-baseline gap-2.5 text-[13px] leading-relaxed text-paper/70"><span className="mono text-[10px] text-paper/40">—</span>{t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link to="/contact" className="btn btn--dark"><span>Enquire about training</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
                <a href={COUNSELLOR_URL} className="ul text-[13px] text-paper/80">Already certified? Sign in →</a>
              </div>
            </div>
            {/* domain expert path — apply to offer paid expert sessions */}
            <div className="bg-ink p-8 md:p-10">
              <span className="kicker !text-paper/50">Become a domain expert</span>
              <h3 className="mt-3 text-[22px] font-medium tracking-tight text-paper">Offer paid expert sessions.</h3>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-paper/60">A senior practitioner in your field? Apply to offer 45-minute expert sessions. Students and professionals are matched to you by expertise; scheduling, video and payment run on the platform. You bring the experience.</p>
              <ul className="mt-5 space-y-1.5">
                {["Set your functional expertise and industries", "Booked by clients who need your exact field", "Paid per session — standalone or as an add-on"].map((t) => (
                  <li key={t} className="flex items-baseline gap-2.5 text-[13px] leading-relaxed text-paper/70"><span className="mono text-[10px] text-paper/40">—</span>{t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link to="/experts/apply" className="btn btn--dark"><span>Apply as an expert</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
                <span className="mono text-[10px] uppercase tracking-[0.12em] text-paper/40">Reviewed by our team · no fee to apply</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* close */}
      <section className="wrap py-20 text-center md:py-28">
        <SplitReveal className="h-xl mx-auto max-w-[20ch]">Choose a person, not <span className="b">a brochure</span>.</SplitReveal>
        <div data-reveal className="mt-9 flex justify-center"><Magnetic href={PORTAL_URL}>Begin with a counsellor</Magnetic></div>
        <Link data-reveal to="/experts/apply" className="ul mt-6 inline-flex items-center gap-2 text-[13px] text-ink-60">Or apply as a domain expert <ArrowUpRight size={15} /></Link>
      </section>
    </main>
  )
}

