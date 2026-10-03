// Motion core — Lenis smooth scroll wired into GSAP ScrollTrigger, plus small
// reveal/counter hooks. GSAP (incl. ScrollTrigger + SplitText) is fully free.

import { useEffect, useLayoutEffect, useRef } from "react"
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

/** Reveal any [data-reveal] descendants on scroll (adds .is-in, staggered).
 *
 *  Progressive enhancement. Content is VISIBLE by default; only this hook hides it,
 *  and only content that has not been seen yet. The old rule hid every [data-reveal]
 *  from the moment an inline <head> script ran — before the bundle had downloaded —
 *  and nothing unhid the in-view ones until React booted. On a phone that held the
 *  prerendered LCP paragraph of /pricing invisible for 3.2s while the browser already
 *  had its text. Now:
 *   • initial document load (location.key === "default"): anything already in view
 *     was painted from the prerender — it stays put, no hide, no replay;
 *   • everything below the fold is marked pending and animates in on scroll;
 *   • after an in-app navigation the page is new, so in-view items animate too.
 *  Marking happens in a layout effect, before paint, so nothing flashes. */
export function useReveals(deps: unknown[] = []) {
  const ref = useRef<HTMLElement>(null)
  const { key } = useLocation()
  const initialDocument = key === "default"
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const vh = window.innerHeight
    const inView = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top < vh * 0.9 && r.bottom > -40 }
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
      .filter((el) => !el.classList.contains("is-in"))
      .filter((el) => !(initialDocument && inView(el)))
    els.forEach((el) => el.classList.add("reveal-pending"))
    const reveal = (el: HTMLElement) => gsap.delayedCall(Number(el.dataset.delay ?? 0), () => el.classList.add("is-in"))
    const triggers = els.map((el) =>
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => reveal(el) }),
    )
    // After an in-app navigation, whatever lands in view animates in. A timeout rather
    // than rAF + a GSAP tick: both of those pause in throttled/background tabs, and an
    // in-view element must never be left hidden waiting on a frame that never comes.
    const timers = els.filter(inView).map((el) =>
      window.setTimeout(() => el.classList.add("is-in"), 30 + Number(el.dataset.delay ?? 0) * 1000))
    ScrollTrigger.refresh()
    return () => { timers.forEach((t) => window.clearTimeout(t)); triggers.forEach((t) => t.kill()) }
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
