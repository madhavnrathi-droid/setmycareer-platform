import { useEffect, useRef, useState, type ReactNode } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { ArrowUpRight } from "@carbon/icons-react"

gsap.registerPlugin(ScrollTrigger, SplitText)

/* A counsellor portrait that degrades honestly. When the live roster has no photo
   (or the URL 404s) we do NOT substitute a random stock face for a real, named
   person — we render a deterministic initials monogram in the brand's own type.
   Never blank, never a stranger, never a network round-trip. */
export function NaviPortrait({ src, name, className = "" }: { src?: string; name?: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  const label = name?.trim() || "Counsellor"
  const initials =
    label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "SMC"
  if (!src || broken) {
    return (
      <div role="img" aria-label={label} className="flex size-full select-none items-center justify-center bg-ink-10">
        <span className="display text-[clamp(1.6rem,4vw,2.6rem)] font-extralight tracking-tight text-ink-40">{initials}</span>
      </div>
    )
  }
  return (
    <img
      src={src} alt={label} loading="lazy" draggable={false}
      onError={() => setBroken(true)}
      className={`size-full select-none object-cover bw ${className}`}
    />
  )
}

/* kinetic headline — masked line-by-line reveal on scroll. Defensive: if SplitText
   can't run, the text simply shows normally (never blanks). */
export function SplitReveal({ children, as = "h2", className = "" }: { children: ReactNode; as?: "h1" | "h2"; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let split: SplitText | undefined, st: ScrollTrigger | undefined
    const id = window.setTimeout(() => {
      try {
        split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "sr-line" })
        gsap.set(split.lines, { yPercent: 115 })
        st = ScrollTrigger.create({
          trigger: el, start: "top 88%", once: true,
          onEnter: () => gsap.to(split!.lines, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: "power4.out",
            // restore the natural text once settled — the line masks clip
            // descenders (g/y/p) at tight line-heights if left in place
            onComplete: () => { split?.revert(); split = undefined },
          }),
        })
        ScrollTrigger.refresh()
      } catch { /* fall back to plain visible text */ }
    }, 80)
    return () => { window.clearTimeout(id); st?.kill(); split?.revert() }
  }, [])
  const Tag = as
  return <Tag ref={ref} className={className}>{children}</Tag>
}

/* mono kicker label */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`kicker text-ink-40 ${className}`}>{children}</span>
}

/* magnetic CTA — the .btn system (outline; ink fill sweeps up on hover; solid =
   the one act-here CTA per view, Von Restorff) that also leans toward the cursor */
export function Magnetic({ href, children, dark, solid, onClick }: { href?: string; children: ReactNode; dark?: boolean; solid?: boolean; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current!; const r = el.getBoundingClientRect()
    gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.25, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: "power3" })
  }
  const reset = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.4)" })
  const cls = `btn ${dark ? "btn--dark" : ""} ${solid ? "btn--solid" : ""}`
  return (
    <a ref={ref} href={href} onClick={onClick} onPointerMove={onMove} onPointerLeave={reset} className={cls}>
      <span>{children}</span> <ArrowUpRight size={16} className="btn-arrow" />
    </a>
  )
}

/* infinite monochrome ticker — skews with scroll velocity (kinetic type) */
export function Marquee({ text, dark }: { text: string; dark?: boolean }) {
  const skew = useRef<HTMLDivElement>(null)
  const items = Array.from({ length: 4 })
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const el = skew.current!
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-14, 14, self.getVelocity() / -260)
        gsap.to(el, { skewX: v, duration: 0.5, ease: "power3", overwrite: true })
      },
    })
    return () => st.kill()
  }, [])
  return (
    <div className={`overflow-hidden border-y py-5 ${dark ? "border-paper/15" : "hair"}`}>
      <div ref={skew} style={{ transformOrigin: "center" }}>
        <div className="marquee" style={{ animation: "smc-marquee 32s linear infinite" }}>
          {items.map((_, i) => (
            <span key={i} className="display !text-[clamp(2rem,7vw,6rem)] pr-10 font-extralight tracking-tight">
              {text}<span className="px-10 align-middle text-[0.3em]">✳</span>
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes smc-marquee { to { transform: translateX(-50%); } }`}</style>
    </div>
  )
}

/* tiny markdown: ## headings + paragraphs */
export function MarkdownLite({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/)
  return (
    <div className="editorial">
      {blocks.map((b, i) => {
        const t = b.trim()
        if (t.startsWith("## ")) return <h2 key={i}>{t.slice(3)}</h2>
        return <p key={i}>{t}</p>
      })}
    </div>
  )
}
