// Motion foundation — GSAP choreography that stays out of the way of the flat
// two-blue aesthetic. Every helper honors prefers-reduced-motion and the
// ?e2e=1 test flag (jump straight to the final state so screenshots are stable).
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export const isStatic = () =>
  (typeof location !== 'undefined' && new URLSearchParams(location.search).has('e2e')) ||
  (typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// WebGL capability check (no three import — safe to call before lazy-loading it)
export function hasWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch { return false }
}

// Setmycareer's signature easing — calm, water-like (matches the Carbon/Karya tokens)
export const EASE = 'power3.out'
export const EASE_SOFT = 'power2.out'

/**
 * Reveal children on mount with a choreographed clip + rise + fade.
 * Children with [data-reveal] stagger; otherwise the container itself reveals.
 * Usage: <Reveal><div data-reveal/>…</Reveal>
 */
export function useReveal(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll('[data-reveal]')
    const targets = items.length ? items : [el]
    if (isStatic()) {
      gsap.set(targets, { clearProps: 'all', opacity: 1, y: 0 })
      return
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(targets,
        { opacity: 0, y: 18, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: EASE,
          stagger: 0.06, clearProps: 'filter' })
    }, el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/**
 * Reveal-on-scroll: the element rises/fades/scales the first time it enters the
 * viewport, and `inView` flips true so children (charts, counters) can perform
 * their own draw in sync. IntersectionObserver + a GSAP tween. Honors static.
 */
export function useInViewReveal() {
  const ref = useRef(null)
  const [inView, setInView] = useState(() => isStatic())
  useEffect(() => {
    const el = ref.current
    if (!el || isStatic()) { setInView(true); return }
    el.classList.add('reveal-init')   // CSS sets the hidden start state
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      setInView(true)
      el.classList.add('revealed')    // CSS transition → snaps to end state
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        reveal(); io.disconnect(); break
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    io.observe(el)
    // Safety: never let the hidden start state persist if the observer never
    // fires (e.g. a throttled/headless environment) — force the reveal so the
    // gauge and score can't be stuck invisible.
    const t = setTimeout(reveal, 1200)
    return () => { io.disconnect(); clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { ref, inView }
}

/** Animated number — counts up with GSAP (snaps integer). */
export function useCountUp(value, deps = [value]) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || value == null) return
    if (isStatic()) { el.textContent = String(value); return }
    const obj = { n: 0 }
    const tween = gsap.to(obj, {
      n: value, duration: 1, ease: EASE,
      onUpdate: () => { el.textContent = String(Math.round(obj.n)) },
    })
    return () => tween.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/**
 * Magnetic press — subtle scale + lift on pointer, snappy release. Returns
 * props to spread onto any element. Pure transform (no layout cost).
 */
export function useMagnetic({ scale = 0.97, lift = 0 } = {}) {
  const ref = useRef(null)
  const down = () => {
    if (isStatic() || !ref.current) return
    gsap.to(ref.current, { scale, y: lift, duration: 0.18, ease: EASE_SOFT })
  }
  const up = () => {
    if (!ref.current) return
    gsap.to(ref.current, { scale: 1, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' })
  }
  return { ref, onPointerDown: down, onPointerUp: up, onPointerLeave: up }
}

export { gsap }
