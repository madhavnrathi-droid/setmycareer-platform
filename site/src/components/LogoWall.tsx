import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { Brand } from "@/content/logos"

gsap.registerPlugin(ScrollTrigger)

/* one mark — a crisp, full-colour self-hosted SVG, object-contained in a fixed
   box (no bounding box drawn). A tooltip bubble reveals the name on hover. */
function LogoCell({ brand, size, className }: { brand: Brand; size: number; className: string }) {
  const art = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = art.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(500px) rotateY(${px * 14}deg) rotateX(${-py * 14}deg) scale(1.12)`
  }
  const reset = () => { if (art.current) art.current.style.transform = "" }
  return (
    <div className={`logo-cell group/cell relative flex items-center justify-center ${className}`} onMouseMove={onMove} onMouseLeave={reset}>
      <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium tracking-tight text-paper opacity-0 shadow-[0_6px_18px_-8px_rgba(11,11,11,0.5)] transition-all duration-200 group-hover/cell:translate-y-0 group-hover/cell:opacity-100">
        {brand.name}
      </span>
      <div ref={art} className="logo-art flex items-center justify-center transition-transform duration-300 ease-out">
        <img src={brand.src} alt={brand.name} loading="lazy" style={{ height: size, maxWidth: "100%" }}
          className="w-auto object-contain" />
      </div>
    </div>
  )
}

/* Grid wall — full-colour marks, no boxes; stagger-reveals on scroll-in. */
export function LogoWall({ items, size = 38 }: { items: Brand[]; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const cells = el.querySelectorAll(".logo-cell")
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { gsap.set(cells, { opacity: 1 }); return }
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => gsap.fromTo(cells, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.03, ease: "power2.out" }),
    })
    return () => st.kill()
  }, [items])
  return (
    <div ref={ref} className="grid grid-cols-3 gap-x-6 gap-y-12 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7" style={{ perspective: 1000 }}>
      {items.map((it) => <LogoCell key={it.name} brand={it} size={size} className="h-[56px] px-2" />)}
    </div>
  )
}
