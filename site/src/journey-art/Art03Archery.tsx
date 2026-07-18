// Artwork 03 — "One target, a funded Plan B"
// A minimalist archery range in ink on paper. Grab the bowstring and draw it
// back: the limbs flex, a dotted prediction arc appears — faint ink until the
// shot would land, purple the moment it becomes the right choice. Release, and
// the arrow flies under real gravity + wind (semi-implicit Euler, hand-tuned
// drag); it thuds into the straw rings with a damped vibration and a ripple,
// or buries itself in the ground on a miss. Drifting dust and a small needle
// in the corner make the wind legible. Everything decays back to rest; a new
// arrow nocks itself ~1.8s after every impact. Canvas2D, zero per-frame
// allocation, IntersectionObserver-gated, reduced-motion renders one still:
// an arrow already home in the bullseye with its purple arc traced.

import { useEffect, useRef } from "react"

const INK = "#0b0b0b"
const PURPLE = "#5b28b8"
const PRED = 150 // max predicted-arc samples
const TRAIL = 240 // max recorded flight samples
const NPART = 26 // drifting dust motes

export function Art03Archery({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const off = document.createElement("canvas")
    const octx = off.getContext("2d")
    if (!octx) return

    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    mount.style.touchAction = "none" // the string is draggable — we own the gesture
    mount.appendChild(canvas)

    // ---- geometry (recomputed on layout) ------------------------------------
    let W = 1, H = 1, dpr = 1, hair = 1
    let groundY = 0, bx = 0, by = 0, limbHalf = 0
    let tx = 0, ty = 0, R = 0
    let nx = 0, ny = 0 // nock rest point (string centre)
    let La = 0, maxDraw = 0, grabR = 0, g = 0

    // ---- preallocated state --------------------------------------------------
    const trail = new Float32Array(TRAIL * 2)
    const pred = new Float32Array(PRED * 2)
    const ppx = new Float32Array(NPART)
    const ppy = new Float32Array(NPART)
    const psp = new Float32Array(NPART)
    const pph = new Float32Array(NPART)
    const pal = new Float32Array(NPART)

    // phases: 0 nocked · 1 drawing · 2 flying · 3 stuck in target · 4 stuck in ground · 5 flew past
    let phase = 0
    let drawL = 0, aimA = 0
    let tipX = 0, tipY = 0, vx = 0, vy = 0
    let flex = 0, flexV = 0 // bow-limb flex, stiff spring follower (snaps forward on loose)
    let oscA = 0, oscT = 9 // string oscillation amplitude / clock after release
    let vibT = 9, stickA = 0 // embedded-arrow vibration clock / impact angle
    let resetT = 0, nockIn = 1 // post-impact reset clock / new-arrow fade-in
    let hit = false // did this arrow land in the rings (purple earned)
    let trailN = 0, predN = 0
    let predHit = false
    let windVal = 0, tNow = Math.random() * 90 // seeded weather, deterministic law
    const ptr = { x: 0, y: 0, id: -1 }

    const windAt = (t: number) =>
      0.55 * Math.sin(t * 0.11 + 1.7) + 0.3 * Math.sin(t * 0.313 + 0.9) + 0.15 * Math.sin(t * 0.71 + 4.2)

    // ---- static plate: ground, ticks, target + stand (painted once per layout)
    const paintStatic = () => {
      off.width = Math.max(1, Math.round(W * dpr))
      off.height = Math.max(1, Math.round(H * dpr))
      octx.setTransform(dpr, 0, 0, dpr, 0, 0)
      octx.clearRect(0, 0, W, H)
      octx.strokeStyle = INK
      octx.lineWidth = hair
      // ground hairline
      octx.globalAlpha = 0.5
      octx.beginPath()
      octx.moveTo(W * 0.05, groundY)
      octx.lineTo(W * 0.95, groundY)
      octx.stroke()
      // distance ticks between bow and target
      octx.globalAlpha = 0.18
      octx.beginPath()
      for (let i = 1; i <= 5; i++) {
        const x = bx + ((tx - bx) * i) / 6
        octx.moveTo(x, groundY - 3)
        octx.lineTo(x, groundY + 3)
      }
      octx.stroke()
      // stand legs (slight A-frame)
      octx.globalAlpha = 0.45
      octx.beginPath()
      octx.moveTo(tx - R * 0.3, ty + R * 0.9)
      octx.lineTo(tx - R * 0.55, groundY)
      octx.moveTo(tx + R * 0.3, ty + R * 0.9)
      octx.lineTo(tx + R * 0.55, groundY)
      octx.stroke()
      // rings — outer crisp, inner faint
      octx.globalAlpha = 0.8
      octx.beginPath()
      octx.arc(tx, ty, R, 0, Math.PI * 2)
      octx.stroke()
      octx.globalAlpha = 0.28
      octx.beginPath()
      octx.arc(tx, ty, R * 0.74, 0, Math.PI * 2)
      octx.moveTo(tx + R * 0.5, ty)
      octx.arc(tx, ty, R * 0.5, 0, Math.PI * 2)
      octx.moveTo(tx + R * 0.27, ty)
      octx.arc(tx, ty, R * 0.27, 0, Math.PI * 2)
      octx.stroke()
      // bullseye — ink, not purple; purple is only ever the earned trajectory
      octx.globalAlpha = 0.9
      octx.fillStyle = INK
      octx.beginPath()
      octx.arc(tx, ty, 2.6, 0, Math.PI * 2)
      octx.fill()
      octx.globalAlpha = 1
    }

    const layout = () => {
      W = Math.max(1, mount.clientWidth)
      H = Math.max(1, mount.clientHeight)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      hair = 1 / dpr
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
      groundY = H * 0.86
      bx = W * 0.16
      by = H * 0.48
      limbHalf = Math.max(34, Math.min(H * 0.26, W * 0.17))
      R = Math.max(26, Math.min(Math.min(W, H) * 0.16, limbHalf))
      tx = W * 0.84
      ty = Math.min(by + H * 0.05, groundY - R - H * 0.04)
      nx = bx
      ny = by
      La = Math.max(44, Math.min(W * 0.1, 84))
      maxDraw = Math.max(64, Math.min(W * 0.15, 130))
      grabR = Math.max(44, W * 0.07)
      g = H * 2.3
      for (let i = 0; i < NPART; i++) {
        ppx[i] = Math.random() * W
        ppy[i] = H * (0.06 + 0.78 * Math.random())
        psp[i] = 0.4 + Math.random()
        pph[i] = Math.random() * 6.283
        pal[i] = 0.07 + Math.random() * 0.13
      }
      paintStatic()
    }
    layout()

    // ---- physics -------------------------------------------------------------
    const predict = () => {
      predN = 0
      predHit = false
      if (drawL < 10) return
      const c = Math.cos(aimA), s = Math.sin(aimA)
      const speed = W * 0.45 + (drawL / maxDraw) * W * 1.25
      let sx = nx + c * (La - drawL)
      let sy = ny + s * (La - drawL)
      let svx = c * speed
      let svy = s * speed
      const hdt = 1 / 50
      const wax = windVal * W * 0.18
      for (let i = 0; i < PRED; i++) {
        svx += wax * hdt
        svy += g * hdt
        const dr = 1 - 0.06 * hdt
        svx *= dr
        svy *= dr
        const px0 = sx, py0 = sy
        sx += svx * hdt
        sy += svy * hdt
        pred[predN * 2] = sx
        pred[predN * 2 + 1] = sy
        predN++
        if (px0 < tx && sx >= tx && svx > 0) {
          const f = (tx - px0) / (sx - px0)
          const yc = py0 + (sy - py0) * f
          if (Math.abs(yc - ty) <= R * 0.92) predHit = true
          if (predHit) break
        }
        if (sy >= groundY || sx > W + 40) break
      }
    }

    const release = () => {
      const d = drawL
      drawL = 0
      if (d < 10) {
        // not enough draw — the string just slips home and hums
        oscA = 1.2 + d * 0.15
        oscT = 0
        phase = 0
        predN = 0
        return
      }
      const c = Math.cos(aimA), s = Math.sin(aimA)
      const speed = W * 0.45 + (d / maxDraw) * W * 1.25
      tipX = nx + c * (La - d)
      tipY = ny + s * (La - d)
      vx = c * speed
      vy = s * speed
      phase = 2
      trailN = 0
      hit = false
      predN = 0
      oscA = Math.min(10, 3 + d * 0.08)
      oscT = 0
    }

    const respawn = () => {
      phase = 0
      drawL = 0
      trailN = 0
      hit = false
      predN = 0
      nockIn = 0
      resetT = 0
    }

    const step = (dt: number) => {
      tNow += dt
      windVal = windAt(tNow)
      // dust drifts with the wind (wraps both ways)
      for (let i = 0; i < NPART; i++) {
        ppx[i] += (windVal * W * 0.1 + psp[i] * W * 0.016) * dt
        if (ppx[i] > W + 8) ppx[i] -= W + 16
        else if (ppx[i] < -8) ppx[i] += W + 16
      }
      // bow flex chases the draw with a stiff, snappy spring
      const ft = phase === 1 ? drawL / maxDraw : 0
      flexV += ((ft - flex) * 340 - flexV * 24) * dt
      flex += flexV * dt
      oscT += dt
      vibT += dt
      if (nockIn < 1) nockIn = Math.min(1, nockIn + dt * 3.2)

      if (phase === 1) {
        const px = ptr.x - nx
        const py = ptr.y - ny
        let a = Math.atan2(-py, -px)
        if (a > 1.15) a = 1.15
        else if (a < -1.15) a = -1.15
        aimA = a
        const d = -(px * Math.cos(a) + py * Math.sin(a))
        drawL = Math.min(maxDraw, Math.max(0, d))
        predict()
      } else if (phase === 2) {
        const h2 = dt * 0.5
        const wax = windVal * W * 0.18
        for (let k = 0; k < 2 && phase === 2; k++) {
          vx += wax * h2
          vy += g * h2
          const dr = 1 - 0.06 * h2
          vx *= dr
          vy *= dr
          const px0 = tipX, py0 = tipY
          tipX += vx * h2
          tipY += vy * h2
          if (px0 < tx && tipX >= tx && vx > 0) {
            const f = (tx - px0) / (tipX - px0)
            const yc = py0 + (tipY - py0) * f
            if (Math.abs(yc - ty) <= R * 0.92) {
              tipX = tx
              tipY = yc
              stickA = Math.atan2(vy, vx)
              phase = 3
              hit = true
              vibT = 0
              resetT = 0
            }
          }
          if (phase === 2 && tipY >= groundY) {
            tipY = groundY
            stickA = Math.atan2(vy, vx)
            phase = 4
            vibT = 0
            resetT = 0
          }
          if (phase === 2 && tipX > W + La * 2) {
            phase = 5
            resetT = 0
          }
        }
        if (phase === 2 && trailN < TRAIL) {
          trail[trailN * 2] = tipX
          trail[trailN * 2 + 1] = tipY
          trailN++
        }
      }
      if (phase >= 3) {
        resetT += dt
        if (resetT >= 1.8) respawn()
      }
    }

    // ---- drawing -------------------------------------------------------------
    const drawArrow = (x: number, y: number, ang: number, al: number, vis: number, head: boolean) => {
      const c = Math.cos(ang), s = Math.sin(ang)
      ctx.strokeStyle = INK
      ctx.globalAlpha = al
      ctx.lineWidth = hair * 1.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - c * vis, y - s * vis)
      if (head) {
        const hl = 6.5
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(ang + 0.42) * hl, y - Math.sin(ang + 0.42) * hl)
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(ang - 0.42) * hl, y - Math.sin(ang - 0.42) * hl)
      }
      // fletching — two vane pairs near the tail
      const t1 = vis - 3, t2 = vis - 9
      const fx1 = x - c * t1, fy1 = y - s * t1
      const fx2 = x - c * t2, fy2 = y - s * t2
      ctx.moveTo(fx1, fy1)
      ctx.lineTo(fx1 - Math.cos(ang + 0.62) * 6, fy1 - Math.sin(ang + 0.62) * 6)
      ctx.moveTo(fx1, fy1)
      ctx.lineTo(fx1 - Math.cos(ang - 0.62) * 6, fy1 - Math.sin(ang - 0.62) * 6)
      ctx.moveTo(fx2, fy2)
      ctx.lineTo(fx2 - Math.cos(ang + 0.62) * 6, fy2 - Math.sin(ang + 0.62) * 6)
      ctx.moveTo(fx2, fy2)
      ctx.lineTo(fx2 - Math.cos(ang - 0.62) * 6, fy2 - Math.sin(ang - 0.62) * 6)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(off, 0, 0, W, H)

      // dust motes — short streaks stretched by the wind
      ctx.strokeStyle = INK
      ctx.lineWidth = hair
      for (let i = 0; i < NPART; i++) {
        const y = ppy[i] + Math.sin(tNow * 0.55 + pph[i]) * 3.5
        ctx.globalAlpha = pal[i]
        ctx.beginPath()
        ctx.moveTo(ppx[i], y)
        ctx.lineTo(ppx[i] - (2 + windVal * 7), y)
        ctx.stroke()
      }

      // wind needle, top corner: baseline + magnitude ticks + a live arrow
      const ix = W - Math.max(44, Math.min(64, W * 0.14))
      const iy = Math.max(18, H * 0.07)
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.moveTo(ix - 20, iy)
      ctx.lineTo(ix + 20, iy)
      ctx.moveTo(ix - 20, iy - 3)
      ctx.lineTo(ix - 20, iy + 3)
      ctx.moveTo(ix + 20, iy - 3)
      ctx.lineTo(ix + 20, iy + 3)
      ctx.moveTo(ix - 10, iy - 2)
      ctx.lineTo(ix - 10, iy + 2)
      ctx.moveTo(ix + 10, iy - 2)
      ctx.lineTo(ix + 10, iy + 2)
      ctx.stroke()
      const wl = windVal * 18
      const ws = wl >= 0 ? 1 : -1
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(ix, iy)
      ctx.lineTo(ix + wl, iy)
      ctx.lineTo(ix + wl - ws * 3, iy - 2.4)
      ctx.moveTo(ix + wl, iy)
      ctx.lineTo(ix + wl - ws * 3, iy + 2.4)
      ctx.stroke()
      ctx.globalAlpha = 1

      // bow — two quadratic limbs, flexing with the draw
      const f = flex
      const ttx = bx - f * 15, tty = by - limbHalf * (1 - f * 0.06)
      const tbx = bx - f * 15, tby = by + limbHalf * (1 - f * 0.06)
      ctx.globalAlpha = 0.92
      ctx.lineWidth = hair * 1.8
      ctx.beginPath()
      ctx.moveTo(ttx, tty)
      ctx.quadraticCurveTo(bx + 16 - f * 9, by - limbHalf * 0.5, bx + 9, by - 9)
      ctx.lineTo(bx + 9, by + 9)
      ctx.quadraticCurveTo(bx + 16 - f * 9, by + limbHalf * 0.5, tbx, tby)
      ctx.stroke()

      // string — pulled taut while drawing, else humming through its idle sway
      const sway = 0.6 * Math.sin(tNow * 0.9)
      const osc = oscA * Math.exp(-6 * oscT) * Math.sin(46 * oscT)
      const stringOff = sway + osc
      ctx.globalAlpha = 0.8
      ctx.lineWidth = hair
      ctx.beginPath()
      ctx.moveTo(ttx, tty)
      if (phase === 1) {
        const nxp = nx - Math.cos(aimA) * drawL
        const nyp = ny - Math.sin(aimA) * drawL
        ctx.lineTo(nxp, nyp)
        ctx.lineTo(tbx, tby)
      } else {
        ctx.quadraticCurveTo(nx + stringOff * 2, ny, tbx, tby)
      }
      ctx.stroke()
      ctx.globalAlpha = 1

      // predicted arc — faint ink; purple only when the shot would land
      if (phase === 1 && predN > 2) {
        ctx.fillStyle = predHit ? PURPLE : INK
        ctx.globalAlpha = predHit ? 0.85 : 0.3
        ctx.beginPath()
        for (let i = 2; i < predN; i += 3) {
          const x = pred[i * 2], y = pred[i * 2 + 1]
          ctx.moveTo(x + 1.3, y)
          ctx.arc(x, y, 1.3, 0, Math.PI * 2)
        }
        ctx.fill()
        ctx.globalAlpha = 1
      }

      const fadeMul = phase >= 3 ? (resetT < 1.4 ? 1 : Math.max(0, 1 - (resetT - 1.4) / 0.4)) : 1

      // the earned trajectory — traced in purple after a true hit
      if (hit && trailN > 2) {
        ctx.fillStyle = PURPLE
        ctx.globalAlpha = 0.85 * fadeMul
        ctx.beginPath()
        for (let i = 1; i < trailN; i += 2) {
          const x = trail[i * 2], y = trail[i * 2 + 1]
          ctx.moveTo(x + 1.3, y)
          ctx.arc(x, y, 1.3, 0, Math.PI * 2)
        }
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // impact ripple on the target face
      if (phase === 3 && vibT < 0.7) {
        ctx.strokeStyle = INK
        ctx.globalAlpha = 0.28 * (1 - vibT / 0.7)
        ctx.lineWidth = hair
        ctx.beginPath()
        ctx.arc(tipX, tipY, R * 0.12 + vibT * R * 1.1, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // the arrow itself
      if (phase === 0) {
        drawArrow(nx + stringOff + La, ny, 0, 0.92 * nockIn, La, true)
      } else if (phase === 1) {
        const nxp = nx - Math.cos(aimA) * drawL
        const nyp = ny - Math.sin(aimA) * drawL
        drawArrow(nxp + Math.cos(aimA) * La, nyp + Math.sin(aimA) * La, aimA, 0.95, La, true)
      } else if (phase === 2) {
        drawArrow(tipX, tipY, Math.atan2(vy, vx), 0.95, La, true)
      } else if (phase === 3 || phase === 4) {
        // embedded: tip hidden, shaft quivering about the impact point
        const vib = 0.07 * Math.exp(-5 * vibT) * Math.sin(40 * vibT)
        const embed = phase === 3 ? 0.7 : 0.84
        drawArrow(tipX, tipY, stickA + vib, 0.95 * fadeMul, La * embed, false)
      }
    }

    // ---- reduced-motion still: arrow home in the bullseye, purple arc traced --
    const setupStill = () => {
      const T = 0.6
      const sx = nx + La, sy = ny
      const vX = (tx - sx) / T
      const vY = (ty - sy) / T - 0.5 * g * T
      trailN = 0
      for (let i = 1; i <= 30; i++) {
        const t = (T * i) / 30
        trail[trailN * 2] = sx + vX * t
        trail[trailN * 2 + 1] = sy + vY * t + 0.5 * g * t * t
        trailN++
      }
      tipX = tx
      tipY = ty
      stickA = Math.atan2(vY + g * T, vX)
      phase = 3
      hit = true
      vibT = 9
      resetT = 0
      windVal = 0.4
      tNow = 0
      render()
    }

    // ---- lifecycle (mirrors JourneyObject) -------------------------------------
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let running = false
    let last = 0

    const frame = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000))
      last = now
      step(dt)
      render()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (running) return
      running = true
      if (reduce) {
        setupStill()
      } else {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? start() : stop() }, { threshold: 0.05 })
    io.observe(mount)

    const onResize = () => {
      layout()
      if (reduce) setupStill()
      else if (!running) render()
    }
    window.addEventListener("resize", onResize)

    // ---- pointer: the hand on the string ---------------------------------------
    const toLocal = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      ptr.x = e.clientX - r.left
      ptr.y = e.clientY - r.top
    }
    const onDown = (e: PointerEvent) => {
      if (reduce || phase !== 0) return
      toLocal(e)
      const dx = ptr.x - nx
      const dy = ptr.y - ny
      if (dx * dx + dy * dy < grabR * grabR) {
        phase = 1
        drawL = 0
        ptr.id = e.pointerId
        try { mount.setPointerCapture(e.pointerId) } catch { /* capture unsupported */ }
      }
    }
    const onMove = (e: PointerEvent) => { toLocal(e) }
    const onUp = (e: PointerEvent) => {
      if (phase === 1 && e.pointerId === ptr.id) {
        try { mount.releasePointerCapture(e.pointerId) } catch { /* already released */ }
        ptr.id = -1
        release()
      }
    }
    mount.addEventListener("pointerdown", onDown)
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerup", onUp)
    mount.addEventListener("pointercancel", onUp)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointerdown", onDown)
      mount.removeEventListener("pointermove", onMove)
      mount.removeEventListener("pointerup", onUp)
      mount.removeEventListener("pointercancel", onUp)
      mount.style.touchAction = ""
      canvas.width = canvas.height = 0
      off.width = off.height = 0
      if (canvas.parentNode === mount) mount.removeChild(canvas)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden />
}
