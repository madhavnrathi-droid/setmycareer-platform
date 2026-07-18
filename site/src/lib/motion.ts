// Motion core — Lenis smooth scroll wired into GSAP ScrollTrigger, plus small
// reveal/counter hooks. GSAP (incl. ScrollTrigger + SplitText) is fully free.

import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** Mount once at the app root. Buttery scroll + ScrollTrigger sync. */
export function useSmoothScroll() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
    lenis.on("scroll", ScrollTrigger.update)
    const raf = (time: number) => { lenis?.raf(time * 1000) }
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(raf); lenis?.destroy(); lenis = null }
  }, [])
  // route change: land on the hash target if there is one, else jump to top —
  // this is what makes the nested IA links (/framework#model) actually arrive.
  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => scrollToSelector(hash), 140) // let the page mount
      return () => window.clearTimeout(t)
    }
    lenis ? lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)
  }, [pathname, hash])
}

export function scrollToTop() { lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" }) }
export function scrollToY(y: number) { lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" }) }
/** Instantly shift scroll by `delta` px (Lenis-aware) — used to compensate when a
 *  pinned section is released so the viewport doesn't jump. */
export function scrollByImmediate(delta: number) {
  if (lenis) lenis.scrollTo(lenis.actualScroll + delta, { immediate: true, force: true })
  else window.scrollBy(0, delta)
}
export function scrollToSelector(sel: string) {
  const el = document.querySelector(sel)
  if (!el) return
  lenis ? lenis.scrollTo(el as HTMLElement, { offset: -20 }) : (el as HTMLElement).scrollIntoView({ behavior: "smooth" })
}

/** Reveal any [data-reveal] descendants on scroll (adds .is-in, staggered). */
export function useReveals(deps: unknown[] = []) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    const triggers = els.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          const delay = Number(el.dataset.delay ?? 0)
          gsap.delayedCall(delay, () => el.classList.add("is-in"))
        },
      }),
    )
    // reveal anything already in view synchronously — robust when content mounts
    // after an async load (the ref'd container swaps in), and independent of the
    // ScrollTrigger scheduler. The .is-in CSS transition still animates it in.
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.9 && r.bottom > -40) el.classList.add("is-in")
    })
    ScrollTrigger.refresh()
    return () => triggers.forEach((t) => t.kill())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Count a number up when it enters view. */
export function useCounter(target: number) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !target) return
    const final = () => { el.textContent = Math.round(target).toLocaleString("en-IN") }
    // Reduced-motion (and any non-animating render, e.g. a print/screenshot frame)
    // must show the FINAL figure, never a mid-count value — on a "counted, not
    // claimed" brand a half-counted stat reads as a wrong/contradictory number.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { final(); return }
    const obj = { v: 0 }
    const t = ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(obj, {
        v: target, duration: 1.8, ease: "power3.out",
        onUpdate: () => { el.textContent = Math.floor(obj.v).toLocaleString("en-IN") },
        onComplete: final, // land exactly on target, not floor() of the last frame
      }),
    })
    return () => t.kill()
  }, [target])
  return ref
}
