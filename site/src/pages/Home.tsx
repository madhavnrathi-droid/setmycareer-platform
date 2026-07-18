import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Chat, Microphone, Document, Analytics, ArrowDown, ArrowUpRight, ArrowRight } from "@carbon/icons-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { HalftoneHero } from "@/three/HalftoneHero"
import { COPY, ARTICLES } from "@/content/site"
import { IMG, avatar } from "@/lib/images"
import { useNavigators, useStats, naviImage, naviExpertise, cleanField, PORTAL_URL } from "@/lib/api"
import { Kicker, Magnetic, Marquee, NaviPortrait, SplitReveal } from "@/components/bits"
import { TalkToExpert } from "@/components/LeadForm"
import { Stakes } from "@/components/Stakes"
import { Founder } from "@/components/Founder"
import { Clients } from "@/components/Clients"
import { StudentJourney } from "@/components/StudentJourney"
import { Faq } from "@/components/Faq"
import { useReveals, useCounter, scrollToSelector, scrollByImmediate, scrollToY } from "@/lib/motion"

gsap.registerPlugin(ScrollTrigger)
import { useSeo } from "@/lib/seo"

const PRODUCT_ICONS = [Chat, Microphone, Document, Analytics]
const PRODUCT_MORE = [
  "Chat + voice · grounded in your results · any hour",
  "Big Five · RIASEC interests · aptitude · scored live",
  "Matched paths · strengths · the reasoning behind each",
  "Admission odds · ROI · scholarships, against your profile",
]

const STARTERS = [
  { name: "Career Clarity Index", price: "Free", note: "A four-minute readiness check, scored on the spot.", more: "20 statements · 5 factor indices · report on screen", href: "/cri" },
  { name: "Stream Selector", price: "₹1,990", note: "Seven streams, one right fit.", more: "Science · Commerce · Arts and four more, scored to you" },
  { name: "Job Domain Selector", price: "₹2,490", note: "Twenty-two domains analysed.", more: "Domains ranked · strengths mapped · clear next steps" },
  { name: "Full Career Counselling", price: "Talk to us", note: "Assessment with an expert, end to end.", more: "Assessments + live sessions + a full written report" },
]

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

export function Home() {
  const ref = useReveals()
  useSeo({
    title: "SetMyCareer — Science-Backed Career Counselling & Assessment, India",
    description: "Career decisions, decided with evidence. Validated aptitude, interest and personality assessments, an AI career counsellor, and trained experts — for students and professionals across India.",
    path: "/",
  })
  return (
    <main ref={ref}>
      <Hero />
      <Marquee text="DECISIONS, NOT GUESSES" />
      <Problem />
      <Stakes />
      <Method />
      <Product />
      <Experts />
      <Founder />
      <Proof />
      <Clients />
      <StudentJourney />
      <Start />
      <Faq />
      <Insights />
      <TalkToExpert source="home" ground="dark" />
    </main>
  )
}

/* ── 01 · Hero ─────────────────────────────────────────────────────────── */
function Hero() {
  const [l1, l2] = COPY.heroHeadline.split("\n")
  return (
    <section data-cursor="logo" className="plate-dark relative flex h-svh min-h-[640px] flex-col">
      <HalftoneHero src={IMG.hero} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/35 to-ink" />
      <div className="wrap relative z-10 flex flex-1 flex-col justify-end pb-16 pt-28">
        <Kicker className="!text-paper/60">{COPY.heroKicker}</Kicker>
        <h1 className="display mt-5 text-paper">
          {l1}<br /><span className="b">{l2}</span>
        </h1>
        <div className="mt-8 flex max-w-3xl flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <p className="lead max-w-md text-paper/70">{COPY.heroSub}</p>
          <div className="pointer-events-auto flex shrink-0 items-center gap-3">
            <Magnetic href={PORTAL_URL} dark>{COPY.ctaPrimary}</Magnetic>
            <button onClick={() => scrollToSelector("#method")} className="ul text-[13px] text-paper/80">{COPY.ctaSecondary}</button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-paper/50"><ArrowDown size={18} className="animate-bounce" /></div>
    </section>
  )
}

/* ── 02 · Problem ──────────────────────────────────────────────────────── */
function Problem() {
  return (
    <section className="wrap py-24 md:py-40">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <Kicker>{COPY.problemKicker}</Kicker>
          <SplitReveal className="h-xl mt-6 max-w-[16ch]">Most careers are <span className="b">chosen blind</span>.</SplitReveal>
          <p data-reveal data-delay="0.1" className="lead mt-8 max-w-xl text-ink-60">{COPY.problemBody}</p>
        </div>
        <div className="relative md:col-span-5">
          <div data-reveal className="ml-auto aspect-[4/5] w-[78%] overflow-hidden">
            <img src={IMG.fragments[0]} alt="A student weighing a career decision" className="size-full object-cover bw-hi" loading="lazy" />
          </div>
          <div data-reveal data-delay="0.15" className="absolute -bottom-10 left-0 aspect-square w-[46%] overflow-hidden border-8 border-paper">
            <img src={IMG.fragments[1]} alt="A counsellor and student in conversation" className="size-full object-cover bw-hi" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 03 · Method — a scroll-pinned compass ───────────────────────────────────
   The FIRST time you reach it, it pins and the needle scrubs 01→05 as you scroll
   (stop-and-scroll). Once completed, it RELEASES — un-pins (with scroll compensated
   so the page doesn't jump) so scrolling back up/down is free, never re-trapping.
   Per-step B/W imagery + a ghost step-number add depth. Static + click-to-revisit
   on mobile / reduced-motion. */
const STEP_ANGLE = (i: number) => -90 + i * 72 // ticks evenly around the dial, top first

function Method() {
  const wrap = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const needle = useRef<SVGGElement>(null)
  const stRef = useRef<ScrollTrigger | undefined>(undefined)
  const released = useRef(false)
  const [active, setActive] = useState(0)
  const steps = COPY.method
  // With motion off, the scrub never runs, so `active` would stay 0 and the other
  // four steps (absolutely stacked, opacity-gated) leave an empty band. Render all
  // five as a static list instead — content is never gated behind motion.
  const reduce = useRef(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches).current

  const go = useCallback((i: number) => {
    // while still pinned, a click scrolls the scrub to that step; once released it
    // just sets the step directly.
    const s = stRef.current
    if (s && !released.current) { scrollToY(s.start + (i / (steps.length - 1)) * (s.end - s.start)); return }
    setActive(i)
    if (needle.current) gsap.to(needle.current, { rotation: i * 72, svgOrigin: "200 200", duration: 0.6, ease: "power3.inOut" })
  }, [steps.length])

  // desktop: pin + scrub once, then release so it never traps you again.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const mm = gsap.matchMedia()
    mm.add("(min-width: 768px)", () => {
      const st = ScrollTrigger.create({
        trigger: wrap.current!, start: "top top", end: "+=220%", pin: stage.current!, scrub: 0.6,
        onUpdate: (self) => {
          if (released.current) return
          if (needle.current) needle.current.setAttribute("transform", `rotate(${self.progress * 288} 200 200)`)
          setActive(Math.min(4, Math.round(self.progress * 4)))
        },
        onLeave: () => {
          if (released.current) return
          released.current = true
          setActive(4)
          const spacer = st.end - st.start
          st.kill(); stRef.current = undefined
          ScrollTrigger.refresh()
          scrollByImmediate(-spacer) // compensate the removed pin spacer → no jump
        },
      })
      stRef.current = st
      return () => { st.kill(); stRef.current = undefined }
    })
    return () => mm.revert()
  }, [])

  return (
    <section id="method" ref={wrap} className="hair-t bg-paper-pure">
      <div ref={stage} className="flex flex-col justify-center py-24 md:min-h-svh md:py-0">
        <div className="wrap w-full">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><Kicker>{COPY.methodKicker}</Kicker><h2 className="h-xl mt-4 max-w-[12ch]">Five steps,<br /><span className="b">one decision</span>.</h2></div>
            <p className="mono text-[12px] text-ink-40">{steps[active].no} / 05</p>
          </div>
          <div className="mt-14 grid items-center gap-12 md:grid-cols-2">
            {/* the dial */}
            <div className="relative mx-auto w-full max-w-[440px]">
              <svg viewBox="0 0 400 400" className="w-full">
                <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-line)" />
                <circle cx="200" cy="200" r="4" fill="var(--color-ink)" />
                {steps.map((s, i) => {
                  const a = (STEP_ANGLE(i) * Math.PI) / 180
                  const tx = 200 + Math.cos(a) * 150, ty = 200 + Math.sin(a) * 150
                  const lx = 200 + Math.cos(a) * 178, ly = 200 + Math.sin(a) * 178
                  const on = i === active
                  return (
                    <g key={s.no} data-cursor="dot" onClick={() => go(i)}>
                      <title>{`Step ${s.no} — ${s.title}`}</title>
                      <circle cx={tx} cy={ty} r={22} fill="transparent" />
                      <circle cx={tx} cy={ty} r={on ? 6 : 3} fill={on ? "var(--color-ink)" : "var(--color-ink-20)"} style={{ transition: "all .4s" }} />
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="mono" fontSize="13" fill={on ? "var(--color-ink)" : "var(--color-ink-40)"} style={{ transition: "fill .4s" }}>{s.no}</text>
                    </g>
                  )
                })}
                <g ref={needle}>
                  <line x1="200" y1="200" x2="200" y2="62" stroke="var(--color-ink)" strokeWidth="2" />
                  <path d="M200 50 L206 70 L200 64 L194 70 Z" fill="var(--color-ink)" />
                </g>
              </svg>
              <p className="mono mt-5 text-center text-[10.5px] uppercase tracking-[0.13em] text-ink-40">Scroll to advance · tap a point to revisit</p>
            </div>
            {/* the active step (motion) — or all five stacked (reduced-motion) */}
            {reduce ? (
              <ul className="flex flex-col gap-9">
                {steps.map((s) => (
                  <li key={s.no}>
                    <span className="kicker text-ink-40">Step {s.no}</span>
                    <h3 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-light leading-none tracking-tight">{s.title}</h3>
                    <p className="lead mt-3 max-w-md text-ink-60">{s.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="relative min-h-[230px]">
                {steps.map((s, i) => (
                  <div key={s.no} className="absolute inset-0 flex flex-col justify-center transition-all duration-500" style={{ opacity: i === active ? 1 : 0, transform: i === active ? "translateY(0)" : "translateY(14px)", pointerEvents: i === active ? "auto" : "none" }}>
                    <span className="kicker text-ink-40">Step {s.no}</span>
                    <h3 className="mt-3 text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-none tracking-tight">{s.title}</h3>
                    <p className="lead mt-5 max-w-md text-ink-60">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 04 · Product ──────────────────────────────────────────────────────── */
function Product() {
  return (
    <section id="product" className="plate-dark">
      <div className="wrap py-24 md:py-40">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Kicker className="!text-paper/50">{COPY.productKicker}</Kicker>
            <SplitReveal className="h-xl mt-6">Counsel, now <span className="b">instrumented</span>.</SplitReveal>
            <p data-reveal data-delay="0.1" className="lead mt-7 max-w-md text-paper/60">{COPY.productBody}</p>
            <div data-reveal data-delay="0.15" className="mt-10 flex items-center gap-6">
              <Magnetic href={PORTAL_URL} dark>Open the app</Magnetic>
              <Link to="/product" className="ul text-[13px] text-paper/80">See it work →</Link>
            </div>
          </div>
          <div className="md:col-span-7 md:pl-10">
            {COPY.product.map((p, i) => {
              const Icon = PRODUCT_ICONS[i]
              return (
                <div key={p.title} data-reveal data-delay={`${i * 0.06}`} tabIndex={0} className="unlock group grid grid-cols-[auto_1fr_auto] items-start gap-5 border-t border-paper/15 py-7 outline-none">
                  <Icon size={24} className="mt-1 text-paper/70 transition-colors group-hover:text-paper" />
                  <div>
                    <h3 className="text-[20px] font-medium tracking-tight">{p.title}</h3>
                    <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-paper/55">{p.body}</p>
                    <div className="more"><span className="mono text-[11px] uppercase tracking-[0.14em] text-paper/45">{PRODUCT_MORE[i]}</span></div>
                  </div>
                  <span className="lockmark mono self-center text-[20px] leading-none text-paper">+</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 05 · Experts / network ────────────────────────────────────────────── */
function Experts() {
  const { data } = useNavigators(200) // the whole active roster, in one rail
  const railRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)
  const paused = useRef(false)

  // seamless continuous auto-scroll — the roster is rendered twice, and each frame
  // drifts scrollLeft, wrapping by exactly ONE set's width (measured from the
  // duplicate's offset so padding never causes a jump). Paused while the pointer is
  // over the rail or dragging, so the visitor takes control on hover.
  useEffect(() => {
    const el = railRef.current
    if (!el || data.length === 0) return
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const step = () => {
      const kids = el.children
      const wrap = kids.length > data.length ? (kids[data.length] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft : 0
      if (wrap > 0) {
        if (!paused.current && !drag.current) el.scrollLeft += 0.4
        if (el.scrollLeft >= wrap) el.scrollLeft -= wrap
        else if (el.scrollLeft < 0) el.scrollLeft += wrap
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [data.length])

  // hover + wheel → horizontal scroll ONLY. `data-lenis-prevent` stops Lenis from
  // scrolling the PAGE while the pointer is over the rail; this native non-passive
  // listener maps the wheel delta to scrollLeft (React onWheel is passive, so
  // preventDefault wouldn't hold). The infinite wrap means there's always room.
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      // normalise deltaMode — line-mode (Firefox / many mice) and page-mode
      // report tiny counts, not pixels, so the raw delta barely moves the rail
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1
      el.scrollLeft += d * unit
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [data.length])

  const onDown = (e: React.PointerEvent) => {
    const el = railRef.current; if (!el) return
    swallowClick.current = false // a fresh gesture starts clean — never carry a stale guard from a drag that ended off-rail
    paused.current = true
    // capture so a drag survives the pointer leaving the (short) rail mid-gesture
    try { el.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const el = railRef.current; if (!el || !drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) { drag.current.moved = true; swallowClick.current = true }
    el.scrollLeft = drag.current.left - dx
  }
  const onUp = (e?: React.PointerEvent) => {
    if (e) { try { railRef.current?.releasePointerCapture(e.pointerId) } catch { /* not captured */ } }
    drag.current = null // the auto-scroll loop only drifts while drag is null, so this also un-pauses it
  }

  const loop = data.length > 0 ? [...data, ...data] : []

  return (
    <section id="network" className="py-24 md:py-36">
      <div className="wrap mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Kicker>{COPY.expertsKicker}</Kicker>
          <SplitReveal className="h-xl mt-5 max-w-[14ch]">People behind <span className="b">the method</span>.</SplitReveal>
        </div>
        <div className="max-w-sm">
          <p data-reveal className="lead text-ink-60">{COPY.expertsBody}</p>
          <p data-reveal className="mono mt-4 text-[10.5px] uppercase tracking-[0.14em] text-ink-40">Hover to take control — scroll or drag to move the roster →</p>
        </div>
      </div>

      {data.length > 0 ? (
        <div
          ref={railRef}
          data-reveal
          data-lenis-prevent
          onPointerEnter={() => { paused.current = true }}
          onPointerLeave={() => { paused.current = false }} // a captured drag keeps going; the loop's !drag guard pauses auto-scroll meanwhile
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClickCapture={(e) => { if (swallowClick.current) { e.preventDefault(); e.stopPropagation(); swallowClick.current = false } }}
          className="roster-rail flex cursor-grab gap-5 overflow-x-auto px-[clamp(20px,5vw,88px)] pb-3 pt-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loop.map((n, i) => {
            const dup = i >= data.length
            const img = naviImage(n) // undefined → NaviPortrait shows an initials monogram, not a stranger
            return (
              <Link
                key={`${n.id}-${i}`}
                to={`/experts/${n.id}`}
                draggable={false}
                aria-hidden={dup}
                tabIndex={dup ? -1 : undefined}
                className="group/card relative w-[210px] shrink-0 origin-center transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.06]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-ink-20">
                  <NaviPortrait src={img} name={cleanField(n.name)} className="transition-[filter] duration-300 group-hover/card:grayscale-0" />
                </div>
                <figcaption className="mt-3 pr-2">
                  <p className="truncate text-[14px] font-medium tracking-tight">{cleanField(n.name)}</p>
                  <p className="mono mt-0.5 truncate text-[10.5px] uppercase tracking-[0.1em] text-ink-40">{naviExpertise(n) ?? "Career Counsellor"}</p>
                </figcaption>
              </Link>
            )
          })}
        </div>
      ) : (
        <div data-reveal className="wrap grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] overflow-hidden bg-ink-20"><img src={avatar(`ph${i}`)} alt="" className="size-full object-cover bw" loading="lazy" /></div>
          ))}
        </div>
      )}

      <div data-reveal className="wrap mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-8">
        <p className="lead max-w-lg">Certified counsellor, or domain expert? <span className="text-ink-40">Two ways to join the network.</span></p>
        <div className="flex items-center gap-7">
          <Link to="/experts" className="ul inline-flex items-center gap-2 text-[14px] text-ink-60">Meet the network <ArrowRight size={16} /></Link>
          <Link to="/experts#apply" className="ul inline-flex items-center gap-2 text-[14px] font-medium">Join us <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </section>
  )
}

/* ── 06 · Proof (live counters) ────────────────────────────────────────── */
function Proof() {
  const stats = useStats()
  const clients = Number(stats?.ClientCount) || 60000
  const navs = Number(stats?.NavigatorCount) || 80
  const sessions = Number(stats?.SessionCount) || 100000
  return (
    <section className="plate-dark hair-t">
      <div className="wrap py-20 md:py-28">
        <p data-reveal className="h-lg max-w-[24ch]">{COPY.proofHeadline}</p>
        <div className="mt-14 grid grid-cols-1 gap-px sm:grid-cols-3">
          <Stat value={clients} label="Students & professionals guided" suffix="+" />
          <Stat value={navs} label="Trained counsellors" suffix="+" />
          <Stat value={sessions} label="Hours of counselling" suffix="+" />
        </div>
      </div>
    </section>
  )
}
function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  const ref = useCounter(value)
  return (
    <div data-reveal className="border-t border-paper/15 pt-6">
      <div className="display !text-[clamp(2.6rem,7vw,5.5rem)] font-extralight tabular-nums">
        <span ref={ref}>0</span><span className="text-paper/40">{suffix}</span>
      </div>
      <p className="mono mt-2 text-[11px] uppercase tracking-[0.12em] text-paper/50">{label}</p>
    </div>
  )
}

/* ── 07 · Start (low-friction) ─────────────────────────────────────────── */
function Start() {
  return (
    <section className="wrap py-24 md:py-36">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Kicker>{COPY.startKicker}</Kicker>
          <SplitReveal className="h-xl mt-6">A few minutes<br />is <span className="b">enough</span>.</SplitReveal>
          <p data-reveal data-delay="0.1" className="lead mt-7 max-w-md text-ink-60">{COPY.startBody}</p>
          <div data-reveal data-delay="0.15" className="mt-9"><Magnetic href={PORTAL_URL}>{COPY.ctaPrimary}</Magnetic></div>
        </div>
        <div className="md:col-span-6 md:col-start-7">
          {STARTERS.map((s, i) => (
            <StarterRow key={s.name} href={"href" in s ? (s as { href: string }).href : PORTAL_URL} data-reveal className="unlock group grid grid-cols-[auto_1fr_auto] items-baseline gap-5 border-t border-line py-6 transition-colors last:border-b hover:bg-paper-pure">
              <span className="mono pt-1 text-[11px] tabular-nums text-ink-20 transition-colors group-hover:text-ink-40">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[19px] font-medium tracking-tight">{s.name}</h3>
                <p className="mt-1 text-[13.5px] text-ink-60">{s.note}</p>
                <div className="more"><span className="mono text-[11px] uppercase tracking-[0.13em] text-ink-40">{s.more}</span></div>
              </div>
              <div className="flex items-center gap-4">
                <span className="mono text-[14px] text-ink-80">{s.price}</span>
                <ArrowRight size={18} className="text-ink-40 transition-transform group-hover:translate-x-1" />
              </div>
            </StarterRow>
          ))}
        </div>
      </div>
    </section>
  )
}

/* internal starters route in-app; external ones go to the portal */
function StarterRow({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) {
  if (href.startsWith("/")) return <Link to={href} {...rest}>{children}</Link>
  return <a href={href} {...rest}>{children}</a>
}

/* ── 08 · Insights (blog preview) ──────────────────────────────────────── */
function Insights() {
  const latest = ARTICLES.slice(0, 4)
  return (
    <section className="hair-t bg-paper-pure">
      <div className="wrap py-24 md:py-32">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <Kicker>{COPY.insightsKicker}</Kicker>
            <h2 data-reveal className="h-xl mt-5 max-w-[16ch]">{COPY.insightsHeadline}</h2>
          </div>
          <Link to="/blog" className="ul hidden items-center gap-2 text-[14px] font-medium md:inline-flex">All notes <ArrowUpRight size={16} /></Link>
        </div>
        <div>
          {latest.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}`} data-reveal className="group grid grid-cols-12 items-baseline gap-4 border-t border-line py-7 transition-colors hover:bg-paper">
              <div className="col-span-12 flex items-center gap-4 md:col-span-3">
                <span className="mono text-[11px] uppercase tracking-[0.1em] text-ink-40">{a.category}</span>
                <span className="mono text-[11px] text-ink-40">{fmtDate(a.date)}</span>
              </div>
              <h3 className="col-span-12 text-[clamp(1.3rem,2.4vw,2rem)] font-light tracking-tight md:col-span-7">{a.title}</h3>
              <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-end">
                <span className="mono text-[11px] text-ink-40">{a.readMin} min</span>
                <ArrowUpRight size={18} className="text-ink-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
