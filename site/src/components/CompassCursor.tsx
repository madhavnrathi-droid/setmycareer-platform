import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { LogoMark } from "@/components/Brand"

// The compass cursor. A CIRCLE rides the pointer (the click hotspot) with the
// split-fill navigation arrow pivoting around it to aim at the nearest control —
// which also gets .magnet-hover (its hover state) and can be activated by a
// nearby click. Over the hero ([data-cursor="logo"]) the cursor becomes the
// LOGOMARK with a true shooting-star tail: marks are STAMPED along the path and
// fade/shrink behind the lead (spawn-based, so no stale-tween state can kill it).
// Visibility failsafe: every pointermove force-restores opacity — the cursor can
// track but never be invisible.

const RADIUS = 175 // aim + hover + click share one target range
const TRAIL = 4    // comet dots (normal mode)
const STARS = 10   // shooting-star stamp pool (hero)
const STAR_GAP = 26 // px travelled between stamps

const dotOpacity = (i: number) => 0.45 * (1 - i / TRAIL)

type Hit = { el: HTMLElement; left: number; top: number; right: number; bottom: number; cx: number; cy: number }

export function CompassCursor() {
  const root = useRef<HTMLDivElement>(null)
  const arm = useRef<HTMLDivElement>(null)
  const lead = useRef<HTMLSpanElement>(null)
  const trail = useRef<(HTMLSpanElement | null)[]>([])
  const stars = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    // ACTIVATION IS EVENT-DRIVEN, NOT MEDIA-QUERY-DRIVEN. Every media-query gate
    // we tried ((hover)/(pointer), then any-*) misreported on someone's machine
    // (touchscreen laptops, exotic input stacks, remote desktops) — so some users
    // never got the cursor. An actual mouse movement cannot lie: the first
    // pointer/mouse move that isn't a touch initialises everything and takes over
    // the native cursor in the same frame. Touch-only devices never activate.
    let cleanup: (() => void) | null = null
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return // touch never wakes the compass
      teardownProbes()
      cleanup = init(e.clientX, e.clientY)
    }
    // pre-PointerEvent browsers only — where PointerEvent exists we ignore
    // mousemove (touch browsers synthesise it after taps, which would mis-activate)
    const onMouse = (e: MouseEvent) => {
      if (window.PointerEvent) return
      teardownProbes()
      cleanup = init(e.clientX, e.clientY)
    }
    const teardownProbes = () => {
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("mousemove", onMouse)
    }
    window.addEventListener("pointermove", onPointer, { passive: true })
    window.addEventListener("mousemove", onMouse, { passive: true })
    return () => { teardownProbes(); cleanup?.() }
  }, [])

  // Full cursor setup — runs once, seeded with the activating pointer position.
  const init = (seedX: number, seedY: number): (() => void) => {
    const el = root.current!, armEl = arm.current!, leadEl = lead.current!

    const xTo = gsap.quickTo(el, "x", { duration: 0.06, ease: "power2" })
    const yTo = gsap.quickTo(el, "y", { duration: 0.06, ease: "power2" })
    const rTo = gsap.quickTo(armEl, "rotation", { duration: 0.4, ease: "power3" })
    const lxTo = gsap.quickTo(leadEl, "x", { duration: 0.08, ease: "power2" })
    const lyTo = gsap.quickTo(leadEl, "y", { duration: 0.08, ease: "power2" })

    const dots = trail.current.filter(Boolean) as HTMLSpanElement[]
    const dotTo = dots.map((d, i) => ({
      x: gsap.quickTo(d, "x", { duration: 0.2 + i * 0.08, ease: "power2" }),
      y: gsap.quickTo(d, "y", { duration: 0.2 + i * 0.08, ease: "power2" }),
    }))
    dots.forEach((d, i) => gsap.set(d, { opacity: dotOpacity(i), scale: 1 - i / (TRAIL + 2) }))

    // shooting-star stamps — a pool we cycle through; each stamp is set at the
    // pointer's path and tweens out (fade + shrink + slight drift back)
    const sEls = stars.current.filter(Boolean) as HTMLSpanElement[]
    gsap.set(sEls, { xPercent: -50, yPercent: -50, opacity: 0 })
    let starIdx = 0
    const stamp = (x: number, y: number, dx: number, dy: number) => {
      const s = sEls[starIdx % sEls.length]; starIdx++
      if (!s) return
      gsap.killTweensOf(s)
      gsap.set(s, { x, y, opacity: 0.85, scale: 0.85, rotation: (Math.atan2(dy, dx) * 180) / Math.PI + 90 })
      gsap.to(s, { opacity: 0, scale: 0.3, x: x - dx * 1.6, y: y - dy * 1.6, duration: 0.6, ease: "power2.out" })
    }

    let cache: Hit[] = []
    const refresh = () => {
      cache = []
      document.querySelectorAll<HTMLElement>("a, button, [data-cursor]:not([data-cursor='logo']), input, textarea, [role='button']").forEach((t) => {
        const r = t.getBoundingClientRect()
        if (r.width && r.height && r.bottom > 0 && r.top < innerHeight) cache.push({ el: t, left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 })
      })
    }
    refresh()
    const refreshId = window.setInterval(refresh, 600)
    const nearest = (x: number, y: number, max: number): Hit | null => {
      let best: { dr: number; hit: Hit } | null = null
      for (const c of cache) {
        const dx = Math.max(c.left - x, 0, x - c.right)
        const dy = Math.max(c.top - y, 0, y - c.bottom)
        const dr = Math.hypot(dx, dy)
        if (dr < max && (!best || dr < best.dr)) best = { dr, hit: c }
      }
      return best ? best.hit : null
    }

    let lastA = 0, hoverEl: HTMLElement | null = null
    let lx = 0, ly = 0, travelled = 0
    let curX = -1, curY = -1 // last known pointer position, for scroll re-evaluation

    // The cursor's MODE (logo/text/near + aim + magnet hover) for a pointer at
    // (x,y) over `tgt`. Split out of `move` so a SCROLL can re-evaluate it at the
    // resting pointer position — otherwise the compass keeps the previous section's
    // look (e.g. stays the hero logomark) until the mouse jiggles.
    const applyMode = (x: number, y: number, tgt: Element | null): boolean => {
      const t = tgt as HTMLElement | null
      const best = nearest(x, y, RADIUS)
      const overText = !!t?.closest?.("input, textarea")
      const overInteractive = !!t?.closest?.("a, button, [data-cursor]:not([data-cursor='logo']), [role='button']")
      const logoMode = !!t?.closest?.('[data-cursor="logo"]') && !overText && !overInteractive
      el.classList.toggle("is-text", overText)
      el.classList.toggle("is-logo", logoMode)
      el.classList.toggle("near", !!best && !overText && !logoMode)
      document.documentElement.classList.toggle("hero-cursor", logoMode)
      const targetEl = overText || logoMode ? null : (best?.el ?? null)
      if (targetEl !== hoverEl) {
        hoverEl?.classList.remove("magnet-hover")
        targetEl?.classList.add("magnet-hover")
        hoverEl = targetEl
      }
      const angle = overInteractive ? 0 : best ? (Math.atan2(best.cy - y, best.cx - x) * 180) / Math.PI + 90 : 0
      let delta = (angle - lastA) % 360
      if (delta > 180) delta -= 360; if (delta < -180) delta += 360
      lastA += delta; rTo(lastA)
      return logoMode
    }

    let scrollQueued = false
    const onScroll = () => {
      if (scrollQueued) return
      scrollQueued = true
      requestAnimationFrame(() => {
        refresh()
        // re-evaluate at the resting position — the section under the cursor may
        // have changed even though the pointer itself never moved.
        if (curX >= 0) applyMode(curX, curY, document.elementFromPoint(curX, curY))
        scrollQueued = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", refresh)

    const handle = (x: number, y: number, target: Element | null) => {
      curX = x; curY = y
      // every move re-asserts visibility + native-cursor takeover. Hide/show is a
      // CSS class ONLY — a gsap opacity tween would kill the quickTo position
      // tweens (the "cursor stuck, dots frozen in a row" bug).
      document.documentElement.classList.remove("cursor-out")
      document.documentElement.classList.add("cursor-on")
      xTo(x); yTo(y); lxTo(x); lyTo(y)
      for (const t of dotTo) { t.x(x); t.y(y) }

      const logoMode = applyMode(x, y, target)

      // shooting-star: stamp the tail every STAR_GAP px while in logo mode
      const dx = x - lx, dy = y - ly
      travelled += Math.hypot(dx, dy)
      if (logoMode && travelled >= STAR_GAP) { stamp(x, y, dx, dy); travelled = 0 }
      lx = x; ly = y
    }
    const move = (e: PointerEvent | MouseEvent) => {
      // a touch pointer must never drive the compass (or hide the native cursor)
      if ((e as PointerEvent).pointerType === "touch") return
      handle(e.clientX, e.clientY, e.target as Element | null)
    }

    // clicking near (not on) a control activates the targeted one — the arrow clicks too
    const onClick = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement | null
      if (tgt?.closest?.("a, button, [role='button'], input, textarea, select, label, [contenteditable='true'], [data-cursor='dot']")) return
      const hit = nearest(e.clientX, e.clientY, RADIUS)
      if (!hit?.el) return
      const target = hit.el as HTMLElement
      if (typeof target.click === "function") target.click()
      else hit.el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }))
    }
    window.addEventListener("click", onClick)

    const leave = (e: PointerEvent) => {
      // only hide when the pointer truly exits the window — and via CSS class,
      // never a tween (see the failsafe note above)
      if (e.relatedTarget || (e.clientX > 0 && e.clientY > 0 && e.clientX < innerWidth && e.clientY < innerHeight)) return
      document.documentElement.classList.add("cursor-out")
    }
    // pointer events where available; plain mouse events on ancient browsers
    const moveEvent = window.PointerEvent ? "pointermove" : "mousemove"
    window.addEventListener(moveEvent, move as EventListener)
    document.addEventListener("pointerout", leave)

    // seed with the activating position so the compass appears exactly where the
    // mouse already is (not gliding in from 0,0)
    lx = seedX; ly = seedY
    gsap.set(el, { x: seedX, y: seedY })
    gsap.set(leadEl, { x: seedX, y: seedY })
    dots.forEach((d) => gsap.set(d, { x: seedX, y: seedY }))
    handle(seedX, seedY, document.elementFromPoint(seedX, seedY))

    return () => {
      window.clearInterval(refreshId)
      hoverEl?.classList.remove("magnet-hover")
      window.removeEventListener(moveEvent, move as EventListener)
      window.removeEventListener("click", onClick)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", refresh)
      document.removeEventListener("pointerout", leave)
      document.documentElement.classList.remove("cursor-on", "hero-cursor", "cursor-out")
    }
  }

  return (
    <>
      {Array.from({ length: STARS }).map((_, i) => (
        <span key={i} ref={(n) => { stars.current[i] = n }} className="logostar" aria-hidden><LogoMark size={26} /></span>
      ))}
      {Array.from({ length: TRAIL }).map((_, i) => (
        <span key={i} ref={(n) => { trail.current[i] = n }} className="ctrail" aria-hidden />
      ))}
      {/* the lead logomark — the cursor itself while over the hero */}
      <span ref={lead} className="logolead" aria-hidden><LogoMark size={34} /></span>
      <div ref={root} className="compass" aria-hidden>
        <span className="ring" />
        <div ref={arm} className="arm">
          <svg className="needle" viewBox="0 0 44 56" fill="none">
            <path d="M22 2 L42 54 L22 42 Z" fill="currentColor" />
            <path d="M22 2 L2 54 L22 42 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="caret" />
      </div>
    </>
  )
}
