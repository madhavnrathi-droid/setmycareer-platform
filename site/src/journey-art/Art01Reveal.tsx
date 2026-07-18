// ARTWORK 01 — "Read the child, not the rank."
// La Gioconda, in colour, sits behind a veil of mosaic blocks and ordered
// dither inside a real carved gilt frame (Rijksmuseum, public domain, knocked
// out to a transparent window). The cursor is a feathered lens of attention:
// wherever it rests, the full painting quietly resolves; wherever it leaves,
// the veil re-forms over ~1.5 seconds. A persistent GPU reveal-mask (ping-pong
// render targets) lets each region remember being seen and dissolve
// independently — the reveal edge is pure feathered blend, no tint. When no
// hand is present the lens wanders on its own slow Lissajous path.
//
// Lifecycle mirrors JourneyObject: IO-gated loop, reduced-motion still frame
// (face revealed, rest veiled), resize repaint on non-looping paths, full
// dispose. Zero per-frame allocation; DPR capped at 2; WebGL failure → null.

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

const SRC = "/art/mona.jpg"
const MASK_SIZE = 512 // reveal-mask resolution (stored in canvas-UV space)

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`

// ---- pass 1: persistent reveal mask -----------------------------------------
// mask = max(previous - dt/1.5, lensFalloff)  → regions remember being seen,
// then dissolve back linearly and independently once the lens moves on.
const MASK_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2 uRes;      // canvas CSS px
  uniform vec2 uLens;     // lens centre, canvas UV
  uniform float uRadius;  // lens radius, CSS px
  uniform float uStrength;
  uniform float uDt;

  void main() {
    float prev = texture2D(uPrev, vUv).r;
    float m = prev - uDt * 1.6; // snappy re-veil (~0.6 s)
    float dist = length((vUv - uLens) * uRes);
    float lens = smoothstep(uRadius, uRadius * 0.72, dist) * uStrength;
    gl_FragColor = vec4(clamp(max(m, lens), 0.0, 1.0), 0.0, 0.0, 1.0);
  }
`

// ---- pass 2: display ---------------------------------------------------------
// Outside the mask: colour mosaic blocks, gently posterised through a 4×4 Bayer
// matrix (per-block, so the dither reads chunky and mechanical). Inside: the
// full-resolution painting in colour. The blend edge is pure feathered alpha —
// no tint, no ring. Subtle film grain; premultiplied output.
const DISPLAY_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform sampler2D uMask;
  uniform vec2 uRes;   // canvas CSS px
  uniform vec2 uImg;   // image px
  uniform float uTime;
  uniform float uBlock; // mosaic block size, CSS px
  uniform float uFade;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // compact recursive Bayer (2x2 → 4x4), range ~[0,1)
  float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

  // object-cover UV mapping (canvas → image)
  vec2 cover(vec2 uv) {
    float ca = uRes.x / uRes.y;
    float ia = uImg.x / uImg.y;
    vec2 s = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  void main() {
    vec2 px = vUv * uRes;

    // veiled version: one colour sample per mosaic block, dither-posterised
    vec2 bId = floor(px / uBlock);
    vec2 bUv = ((bId + 0.5) * uBlock) / uRes;
    // sample the reveal mask at the BLOCK centre so the activation edge is
    // pixelated — it snaps to whole mosaic blocks as the lens moves.
    float m = texture2D(uMask, bUv).r;
    vec3 cVeil = texture2D(uTex, cover(bUv)).rgb;
    float dith = bayer4(bId) - 0.5;
    cVeil = clamp(floor(cVeil * 6.0 + 0.5 + dith * 0.9) / 6.0, 0.0, 1.0);

    // revealed version: the painting, full resolution and colour
    vec3 cFull = texture2D(uTex, cover(vUv)).rgb;

    vec3 col = mix(cVeil, cFull, smoothstep(0.40, 0.62, m)); // snappy veil↔painting switch
    col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.80); // ease the saturation back
    col += (hash(px + fract(uTime) * 61.7) - 0.5) * 0.03; // film grain
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col * uFade, uFade); // premultiplied; opaque within the frame
  }
`

export function Art01Reveal({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" })
    } catch { setFailed(true); return }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    const sizeTo = () => renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight), false)
    sizeTo()
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // ---- shared state & uniforms (all preallocated) -------------------------
    const resVec = new THREE.Vector2(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight))
    const imgVec = new THREE.Vector2(960, 1431)
    const lensVec = new THREE.Vector2(0.5, 0.55)

    const maskU = {
      uPrev: { value: null as THREE.Texture | null },
      uRes: { value: resVec },
      uLens: { value: lensVec },
      uRadius: { value: 160 },
      uStrength: { value: 0 },
      uDt: { value: 0 },
    }
    const dispU = {
      uTex: { value: null as THREE.Texture | null },
      uMask: { value: null as THREE.Texture | null },
      uRes: { value: resVec },
      uImg: { value: imgVec },
      uTime: { value: 0 },
      uBlock: { value: 14 },
      uFade: { value: 0 },
    }
    const maskMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: MASK_FRAG, uniforms: maskU, depthTest: false, depthWrite: false })
    const dispMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: DISPLAY_FRAG, uniforms: dispU, depthTest: false, depthWrite: false })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dispMat)
    quad.frustumCulled = false
    scene.add(quad)

    const rtOpts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    }
    let rtPrev = new THREE.WebGLRenderTarget(MASK_SIZE, MASK_SIZE, rtOpts)
    let rtNext = new THREE.WebGLRenderTarget(MASK_SIZE, MASK_SIZE, rtOpts)
    renderer.setRenderTarget(rtPrev); renderer.clear()
    renderer.setRenderTarget(rtNext); renderer.clear()
    renderer.setRenderTarget(null)

    // geometry-dependent tuning
    const retune = () => {
      const minDim = Math.max(1, Math.min(mount.clientWidth, mount.clientHeight))
      maskU.uRadius.value = Math.min(130, Math.max(56, minDim * 0.22)) // smaller reveal lens
      dispU.uBlock.value = Math.min(30, Math.max(15, Math.round(minDim / 19))) // heavier mosaic blocks
    }
    retune()

    // where the face sits on the canvas (inverse of the cover() mapping);
    // used for the reduced-motion still. Image UV of the face ≈ (0.5, 0.72).
    const faceUv = (out: THREE.Vector2) => {
      const ca = Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight)
      const ia = imgVec.x / imgVec.y
      const sy = ca > ia ? ia / ca : 1
      out.set(0.5, Math.min(0.85, Math.max(0.15, 0.22 / sy + 0.5)))
    }
    const faceVec = new THREE.Vector2()

    // ---- physics: the lens is a mass on a spring ----------------------------
    let lensX = 0.5, lensY = 0.55, velX = 0, velY = 0
    let targetX = 0.5, targetY = 0.55
    let strength = 0, strengthT = 0
    let pointerIn = false
    let pointerX = 0.5, pointerY = 0.55
    let simTime = 0
    let lastActive = -10 // never touched → autonomous lens from first view
    let ready = false

    // ---- render passes -------------------------------------------------------
    const renderMask = (dt: number) => {
      maskU.uPrev.value = rtPrev.texture
      maskU.uDt.value = dt
      quad.material = maskMat
      renderer.setRenderTarget(rtNext)
      renderer.render(scene, camera)
    }
    const renderDisplay = () => {
      dispU.uMask.value = rtNext.texture
      quad.material = dispMat
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
    }
    const swap = () => { const t = rtPrev; rtPrev = rtNext; rtNext = t }

    const renderStill = () => {
      if (!ready) return
      faceUv(faceVec)
      lensVec.copy(faceVec)
      maskU.uStrength.value = 1
      maskU.uRadius.value = Math.min(150, Math.max(70, Math.min(mount.clientWidth, mount.clientHeight) * 0.28))
      dispU.uTime.value = 0.37
      dispU.uFade.value = 1
      renderMask(0)
      renderDisplay()
      swap()
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const clock = new THREE.Clock()
    let raf = 0
    let running = false

    const frame = () => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(clock.getDelta(), 0.05)
      simTime += dt

      // intent: the hand if present; the wandering eye after 2 s of stillness
      if (pointerIn) {
        targetX = pointerX; targetY = pointerY; strengthT = 1
      } else if (simTime - lastActive > 2) {
        targetX = 0.5 + 0.33 * Math.sin(simTime * 0.23)
        targetY = 0.55 + 0.26 * Math.sin(simTime * 0.37 + 1.4)
        strengthT = 1
      } else {
        strengthT = 0 // hand just left: let the veil re-form
      }

      // semi-implicit Euler; k/c tuned for weight with a whisper of overshoot
      velX += (42 * (targetX - lensX) - 11.5 * velX) * dt
      velY += (42 * (targetY - lensY) - 11.5 * velY) * dt
      lensX += velX * dt
      lensY += velY * dt
      strength += (strengthT - strength) * Math.min(1, dt * 4.5)

      if (!ready) return
      if (dispU.uFade.value < 1) dispU.uFade.value = Math.min(1, dispU.uFade.value + dt * 1.2)

      lensVec.set(lensX, lensY)
      maskU.uStrength.value = strength
      dispU.uTime.value = simTime
      renderMask(dt)
      renderDisplay()
      swap()
    }

    const start = () => {
      if (running) return
      running = true
      if (reduce) { renderStill() } else { clock.getDelta(); raf = requestAnimationFrame(frame) }
    }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? start() : stop() }, { threshold: 0.05 })
    io.observe(mount)

    // ---- pointer: hover-only force (touchAction left default → page scrolls) -
    const toUv = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      pointerX = (e.clientX - r.left) / Math.max(1, r.width)
      pointerY = 1 - (e.clientY - r.top) / Math.max(1, r.height)
    }
    const onMove = (e: PointerEvent) => { toUv(e); pointerIn = true; lastActive = simTime }
    const onDown = (e: PointerEvent) => { toUv(e); pointerIn = true; lastActive = simTime } // a tap places the lens
    const onLeave = () => { pointerIn = false; lastActive = simTime }
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerdown", onDown)
    mount.addEventListener("pointerleave", onLeave)
    mount.addEventListener("pointercancel", onLeave)

    const onResize = () => {
      sizeTo()
      resVec.set(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight))
      retune()
      if (reduce) renderStill()
      else if (!running && ready) renderDisplay() // repaint the buffer setSize cleared
    }
    window.addEventListener("resize", onResize)

    new THREE.TextureLoader().load(
      SRC,
      (tex) => {
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        dispU.uTex.value = tex
        imgVec.set(tex.image.width, tex.image.height)
        ready = true
        if (reduce && running) renderStill()
      },
      undefined,
      () => setFailed(true),
    )

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointermove", onMove)
      mount.removeEventListener("pointerdown", onDown)
      mount.removeEventListener("pointerleave", onLeave)
      mount.removeEventListener("pointercancel", onLeave)
      rtPrev.dispose()
      rtNext.dispose()
      dispU.uTex.value?.dispose()
      maskMat.dispose()
      dispMat.dispose()
      quad.geometry.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  if (failed) return null
  // The painting sits inside a real carved gilt frame (Rijksmuseum SK-L-1592,
  // public domain; interior knocked out). The canvas extends slightly under the
  // gold sight edge (insets ~0.45% tighter than the measured window: L 7.66 /
  // T 6.36 / R 7.59 / B 7.85) so no paper gap ever shows at the join.
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div ref={mountRef} className="absolute" style={{ left: "7.2%", top: "5.9%", right: "7.15%", bottom: "7.4%" }} />
      <img src="/art/frame.webp" alt="" draggable={false} loading="lazy"
        className="pointer-events-none absolute inset-0 size-full select-none" style={{ objectFit: "fill" }} />
    </div>
  )
}
