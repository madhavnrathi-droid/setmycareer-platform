import { useEffect, useRef } from "react"
import gsap from "gsap"

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const EASE = { soft: "power3.out", quart: "power4.out", inOut: "power2.inOut" }
export const DUR = { micro: 0.12, base: 0.24, enter: 0.4, draw: 0.7 }

/** Scoped GSAP context that reverts on unmount; under reduced-motion it no-ops
 *  so elements simply render at their CSS end-state (never hidden). */
export function useGsap<T extends HTMLElement = HTMLDivElement>(
  fn: (self: T) => void,
  deps: unknown[] = [],
) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => fn(el), el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Staggered entrance for [data-reveal] children — mount/route only.
 *  Uses fromTo with an explicit visible end-state + clearProps so a React
 *  StrictMode double-mount (which can otherwise record the opacity:0 "from" as
 *  the original and strand elements hidden) always resolves to fully visible. */
export function revealChildren(scope: ParentNode) {
  const items = scope.querySelectorAll("[data-reveal]")
  if (!items.length) return
  gsap.fromTo(
    items,
    { y: 12, opacity: 0 },
    { y: 0, opacity: 1, duration: DUR.enter, ease: EASE.soft, stagger: 0.05, clearProps: "opacity,transform" },
  )
  // Safety net: if the rAF ticker stalls (backgrounded / headless tabs), the
  // entrance tween can freeze at opacity:0 and strand content. After the
  // animation's expected lifetime, force-clear the inline styles with gsap.set,
  // which applies SYNCHRONOUSLY (no ticker needed) — a no-op if it already ran.
  const settle = DUR.enter * 1000 + items.length * 75 + 500
  setTimeout(() => { try { gsap.set(items, { clearProps: "opacity,transform" }) } catch { /* unmounted */ } }, settle)
}

/** Count a number element up to `to` (quart ease). */
export function countUp(el: HTMLElement | null, to: number, dur = 0.9, suffix = "") {
  if (!el) return
  if (prefersReducedMotion()) { el.textContent = `${Math.round(to)}${suffix}`; return }
  const obj = { v: 0 }
  gsap.to(obj, {
    v: to, duration: dur, ease: EASE.quart,
    onUpdate: () => { el.textContent = `${Math.round(obj.v)}${suffix}` },
  })
}

export { gsap }
