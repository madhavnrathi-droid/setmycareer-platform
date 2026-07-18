// ARTWORK 02 — "The stream you can win in."
// An unseen activation zone: paper, blank and still. When a hand crosses it, a
// smooth broad-nib calligraphy brush picks up under the cursor and draws — the
// stroke swells and thins with the direction of travel, carries a dry-brush
// texture, and its wet head glows purple (the current you can win in) before it
// settles to ink. Every mark fades out one second after it is laid. Lift the
// hand and the paper returns to blank.
//
// Canvas2D. Real broad-nib geometry (the swept quad between the nib at each pen
// sample) + spring-smoothed pen. Lifecycle mirrors JourneyObject: IO-gated loop,
// reduced-motion still (one pre-composed stroke), resize repaint, full teardown.
// Preallocated ring buffer; zero per-frame allocation; DPR capped at 2.

import { useEffect, useRef } from "react"

const FADE = 1.0            // seconds a mark lives after it is drawn
const NIB_ANGLE = -0.62     // broad-nib angle (radians), classic calligraphy tilt
const MAX = 320             // ring-buffer capacity (~5s of samples)

export function Art02Stream({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    mount.appendChild(canvas)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 1, H = 1, nib = 12
    const sizeTo = () => {
      W = Math.max(1, mount.clientWidth); H = Math.max(1, mount.clientHeight)
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      nib = Math.min(W, H) * 0.05
    }
    sizeTo()

    // ring buffer of pen samples
    const xs = new Float64Array(MAX), ys = new Float64Array(MAX), ts = new Float64Array(MAX)
    const brk = new Uint8Array(MAX) // 1 = pen-lift before this sample (don't connect)
    let head = 0, count = 0
    let simT = 0

    // spring-smoothed pen
    let penX = 0, penY = 0, penInit = false
    let ptrX = 0, ptrY = 0, ptrIn = false, lastPushX = 0, lastPushY = 0, liftPending = false

    const pushSample = (x: number, y: number, isBreak: boolean) => {
      xs[head] = x; ys[head] = y; ts[head] = simT; brk[head] = isBreak ? 1 : 0
      head = (head + 1) % MAX; if (count < MAX) count++
      lastPushX = x; lastPushY = y
    }

    // quad between the nib at p0 and p1, coloured + faded by age
    const nx = Math.cos(NIB_ANGLE), ny = Math.sin(NIB_ANGLE)
    const drawSeg = (x0: number, y0: number, x1: number, y1: number, age: number) => {
      const a = 1 - age / FADE
      if (a <= 0) return
      const hx = nx * nib * 0.5, hy = ny * nib * 0.5
      // wet head glows purple, settling to ink over ~0.22s
      const wet = Math.max(0, 1 - age / 0.22)
      const r = Math.round(11 + (91 - 11) * wet), g = Math.round(11 + (40 - 11) * wet), b = Math.round(11 + (184 - 11) * wet)
      ctx.fillStyle = `rgba(${r},${g},${b},${(a * 0.9).toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(x0 - hx, y0 - hy); ctx.lineTo(x0 + hx, y0 + hy)
      ctx.lineTo(x1 + hx, y1 + hy); ctx.lineTo(x1 - hx, y1 - hy)
      ctx.closePath(); ctx.fill()
      // dry-brush split: two hairlines within the nib for texture
      ctx.strokeStyle = `rgba(11,11,11,${(a * 0.28).toFixed(3)})`
      ctx.lineWidth = Math.max(0.6, nib * 0.06)
      ctx.beginPath()
      ctx.moveTo(x0 - hx * 0.4, y0 - hy * 0.4); ctx.lineTo(x1 - hx * 0.4, y1 - hy * 0.4)
      ctx.moveTo(x0 + hx * 0.55, y0 + hy * 0.55); ctx.lineTo(x1 + hx * 0.55, y1 + hy * 0.55)
      ctx.stroke()
    }

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = "round"; ctx.lineJoin = "round"
      const start = (head - count + MAX) % MAX
      for (let j = 0; j < count - 1; j++) {
        const i0 = (start + j) % MAX, i1 = (start + j + 1) % MAX
        if (brk[i1]) continue // pen was lifted here
        const age = simT - ts[i1]
        if (age > FADE) continue
        drawSeg(xs[i0], ys[i0], xs[i1], ys[i1], age)
      }
    }

    // ---- loop / lifecycle ------------------------------------------------------
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0, running = false, last = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((t - last) / 1000 || 0.016, 0.033); last = t
      simT += dt
      if (ptrIn) {
        if (!penInit) { penX = ptrX; penY = ptrY; penInit = true; lastPushX = penX; lastPushY = penY }
        penX += (ptrX - penX) * 0.34
        penY += (ptrY - penY) * 0.34
        if (Math.hypot(penX - lastPushX, penY - lastPushY) > 0.9) pushSample(penX, penY, liftPending), (liftPending = false)
      }
      draw()
    }
    const still = () => {
      // one pre-composed calligraphy S-stroke, so a reduced-motion frame still reads
      count = 0; head = 0; simT = 10
      const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.32
      for (let k = 0; k <= 60; k++) {
        const u = k / 60
        const x = cx + Math.sin(u * Math.PI * 1.6 - 0.8) * s
        const y = cy - s + u * 2 * s
        xs[head] = x; ys[head] = y; ts[head] = 10; brk[head] = k === 0 ? 1 : 0
        head = (head + 1) % MAX; if (count < MAX) count++
      }
      // draw with age 0 (fully inked, no fade)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
      ctx.lineCap = "round"; ctx.lineJoin = "round"
      const start = (head - count + MAX) % MAX
      for (let j = 0; j < count - 1; j++) { const i1 = (start + j + 1) % MAX; if (brk[i1]) continue; drawSeg(xs[(start + j) % MAX], ys[(start + j) % MAX], xs[i1], ys[i1], 0.25) }
    }
    const startLoop = () => { if (running) return; running = true; if (reduce) still(); else { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const stopLoop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? startLoop() : stopLoop()), { threshold: 0.05 })
    io.observe(mount)

    // ---- pointer (hover-driven; touchAction default so the page still scrolls) -
    const toLocal = (e: PointerEvent) => { const r = mount.getBoundingClientRect(); ptrX = e.clientX - r.left; ptrY = e.clientY - r.top }
    const onEnter = (e: PointerEvent) => { toLocal(e); ptrIn = true; penInit = false; liftPending = true }
    const onMove = (e: PointerEvent) => { toLocal(e); ptrIn = true }
    const onLeave = () => { ptrIn = false; penInit = false; liftPending = true }
    mount.addEventListener("pointerenter", onEnter)
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerleave", onLeave)
    mount.addEventListener("pointercancel", onLeave)

    const onResize = () => { sizeTo(); if (reduce) still(); else if (!running) draw() }
    window.addEventListener("resize", onResize)

    return () => {
      stopLoop(); io.disconnect(); window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointerenter", onEnter)
      mount.removeEventListener("pointermove", onMove)
      mount.removeEventListener("pointerleave", onLeave)
      mount.removeEventListener("pointercancel", onLeave)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden />
}
