// The scrollable sales narrative beside the checkout rail. A buyer scrolls
// through: the package hero, a "how it works" map, an INTERACTIVE preview of the
// report they'll get, a real sample test question, why it matters, and which
// products pair with it. Sections fade/slide in on scroll (IntersectionObserver,
// reduced-motion safe). Content is data-driven from product-story.ts.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, Cpu, FileText, ArrowRight, Sparkles, TrendingUp, Quote } from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { prefersReducedMotion } from "@/lib/gsap"
import { fmtINR, type Product } from "../../products"
import { pairedProducts, type ProductStory, type MockBar } from "../../product-story"
import { cn } from "@/lib/utils"

const STEP_ICONS = [ClipboardList, Cpu, FileText]

/** Fade + slide a block in the first time it scrolls into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) { setShown(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-all duration-700 ease-out will-change-transform", shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0", className)}>
      {children}
    </div>
  )
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-brand-600">{kicker}</p>
      <h2 className="mt-1.5 font-display text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h2>
    </div>
  )
}

// ── hero — branded artwork band (placeholder for client-supplied artwork) ─────
function Hero({ product, story }: { product: Product; story: ProductStory }) {
  return (
    <header>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700">
        <Sparkles className="size-3.5" /> {story.hero.kicker}
      </span>
      <h1 className="mt-4 font-display text-[36px] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-[46px]">{product.name}</h1>
      <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">{story.hero.promise}</p>

      {/* artwork band — a branded panel until the client's artwork is dropped in */}
      <div className="relative mt-7 aspect-[16/8] overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-mind-600">
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 35%)" }} />
        <LogoMark size={220} className="absolute -right-10 -top-10 text-white/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {story.process.map((s) => (
              <span key={s.title} className="rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-medium text-white backdrop-blur">{s.title}</span>
            ))}
          </div>
          <p className="mt-3 max-w-[40ch] font-display text-[18px] font-medium leading-snug text-white sm:text-[20px]">{product.tagline}</p>
        </div>
      </div>

      {(product.duration || product.mode) && (
        <div className="mt-4 flex flex-wrap gap-2 text-[12.5px] text-muted-foreground">
          {product.duration && <span className="rounded-full bg-secondary px-3 py-1">{product.duration}</span>}
          {product.mode && <span className="rounded-full bg-secondary px-3 py-1">{product.mode}</span>}
        </div>
      )}
    </header>
  )
}

// ── how it works ─────────────────────────────────────────────────────────────
function Process({ story }: { story: ProductStory }) {
  return (
    <section className="mt-16">
      <Reveal><SectionHeading kicker="How it works" title="A clear path, start to finish" /></Reveal>
      <div className="grid gap-4 sm:grid-cols-3">
        {story.process.map((s, i) => {
          const Icon = STEP_ICONS[i] ?? Sparkles
          return (
            <Reveal key={s.title} delay={i * 90}>
              <div className="relative h-full rounded-2xl border border-border bg-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="size-5" /></span>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-300">{s.kicker}</p>
                <p className="mt-1 text-[15px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

// ── interactive mock report ──────────────────────────────────────────────────
function ReportPreview({ story }: { story: ProductStory }) {
  const report = story.report!
  const [active, setActive] = useState(0)
  const top = report.bars.reduce((m, b, i) => (b.value > report.bars[m].value ? i : m), 0)
  const activeBar: MockBar = report.bars[active]

  return (
    <section className="mt-16">
      <Reveal><SectionHeading kicker="What you'll get" title="See your report before you buy" /></Reveal>
      <Reveal>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* the interactive chart card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-foreground">{report.title}</p>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-400">{report.subtitle}</span>
            </div>
            <div className="mt-5 space-y-2.5">
              {report.bars.map((b, i) => {
                const isActive = i === active
                return (
                  <button
                    key={b.label}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="group block w-full text-left"
                  >
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className={cn("flex items-center gap-1.5 font-medium transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>
                        {b.label}
                        {i === top && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Best fit</span>}
                      </span>
                      <span className={cn("tabular-nums transition-colors", isActive ? "text-foreground" : "text-ink-300")}>{b.value}</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", i === top ? "bg-brand-600" : isActive ? "bg-brand-400" : "bg-ink-200 group-hover:bg-brand-300")}
                        style={{ width: `${b.value}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-brand-50/70 p-3.5">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <p className="text-[12.5px] leading-relaxed text-ink-600"><span className="font-semibold text-foreground">{activeBar.label}</span> — {activeBar.note}</p>
            </div>
          </div>

          {/* why this report matters */}
          <div className="space-y-3">
            {report.callouts.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[13.5px] font-semibold text-foreground">{c.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ── mock test question ───────────────────────────────────────────────────────
function TestPreview({ story }: { story: ProductStory }) {
  const test = story.test!
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <section className="mt-16">
      <Reveal><SectionHeading kicker="The experience" title="Try a question from the test" /></Reveal>
      <Reveal>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3 sm:px-6">
            <span className="text-[12px] font-medium text-muted-foreground">{test.progress}</span>
            <span className="text-[11px] text-ink-300">{test.intro}</span>
          </div>
          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <p className="mx-auto max-w-[44ch] text-center font-display text-[20px] font-medium leading-snug text-foreground sm:text-[22px]">“{test.question}”</p>
            <div className="mx-auto mt-7 flex max-w-lg flex-wrap items-center justify-center gap-2">
              {test.options.map((o, i) => (
                <button
                  key={o}
                  onClick={() => setPicked(i)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition",
                    picked === i ? "border-brand-500 bg-brand-600 text-white" : "border-border bg-background text-ink-600 hover:border-brand-300 hover:text-foreground",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            <p className="mt-7 text-center text-[11.5px] text-ink-300">A preview — the full test adapts to your answers, no right or wrong.</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ── why it matters ───────────────────────────────────────────────────────────
function WhyItMatters({ story }: { story: ProductStory }) {
  return (
    <section className="mt-16">
      <Reveal><SectionHeading kicker="The stakes" title={story.whyTitle} /></Reveal>
      <Reveal>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-secondary/60 to-card p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-4">
            {story.stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-[28px] font-semibold tracking-tight text-brand-600 sm:text-[36px]">{s.value}</p>
                <p className="mx-auto mt-1 max-w-[18ch] text-[11.5px] leading-snug text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 border-t border-border pt-6">
            <Quote className="mt-0.5 size-5 shrink-0 text-brand-300" />
            <p className="text-[14.5px] leading-relaxed text-ink-600">{story.whyBody}</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ── pairs well with (cross-sell) ─────────────────────────────────────────────
function PairsWith({ story }: { story: ProductStory }) {
  const pairs = pairedProducts(story)
  if (!pairs.length) return null
  return (
    <section className="mt-16">
      <Reveal><SectionHeading kicker="Go further" title={story.pairsTitle} /></Reveal>
      <div className="grid gap-3 sm:grid-cols-3">
        {pairs.map(({ product: p, why }, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <Link to={`/portal/services/${p.id}`} className="group block h-full rounded-2xl border border-border bg-card p-4 transition hover:border-brand-300 hover:shadow-[var(--shadow-e1)]">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-foreground">{p.name}</p>
                <ArrowRight className="size-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{why}</p>
              <p className="mt-3 text-[12px] font-medium text-brand-600">{p.priceFrom === 0 ? "Free" : `from ${fmtINR(p.priceFrom)}`}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function StorySections({ product, story }: { product: Product; story: ProductStory }) {
  return (
    <div>
      <Hero product={product} story={story} />
      <Process story={story} />
      {story.report && <ReportPreview story={story} />}
      {story.test && <TestPreview story={story} />}
      <WhyItMatters story={story} />
      <PairsWith story={story} />
    </div>
  )
}
