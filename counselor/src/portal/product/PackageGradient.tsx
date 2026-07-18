import { useEffect, useRef, useState, type JSX } from "react"

// Package gradient artwork engine — one dark, slowly flowing three-colour field
// per pricing card. Raw WebGL in the ShaderFlow lineage (domain-warped fbm,
// DPR cap, reduced-motion still frame, visibilitychange + IntersectionObserver
// pauses, lose_context cleanup) but tuned toward the shadergradient.co
// waterPlane look: organic liquid colour pooling on near-black, a whisper of
// film grain, premium never busy. The PARENT hosts hover — on pointerenter the
// flow speed and warp strength lerp up, on pointerleave they glide back (never
// snap). Each offering id is hashed into a phase + rotation so no two cards
// show the same field. If WebGL is unavailable (or the context is lost under
// pressure — ~14 instances share one page) a static CSS gradient built from
// the same palette renders instead: never a blank box.

// ---------------------------------------------------------------------------
// Palettes — [flow, counter-flow, accent] over a near-black base.
// Students: saturated, energetic. Executives: velvety, mature, lush.
// Marketplace: quieter duotones. VCLP: near-black with a deep shimmer.
// Saturated mid-to-deep fields (NO pale creams as pool colours — white text must
// read on every full-bleed card). STUDENTS = bright, high-sat MATTE; EXECUTIVES =
// deep, lush hues whose shine comes from the METALLIC sheen, not pale entries.
// The shader derives its base tone from each palette's own darkest colour, so a
// card reads as coloured light, and the scrim guarantees the white type.
export const GRADIENT_PALETTES: Record<string, [string, string, string]> = {
  // students — luminous, high-sat, matte
  free_cri: ["#2dd4a8", "#38bdf8", "#0e5e4a"],           // fresh mint + sky over deep green
  sj_navigator: ["#7c9bf0", "#4f46e5", "#1e2a6b"],       // periwinkle + indigo over deep navy
  sj_consult_student: ["#22c1c3", "#f97316", "#123a56"], // teal + orange over deep blue
  sj_accelerator: ["#ff7a18", "#fbbf24", "#7a2e0e"],     // habañero + amber over deep sienna
  sj_big_picture: ["#a855f7", "#ec4899", "#6d28d9"],     // the flagship — electric violet↔magenta
  sj_true_north: ["#10b981", "#22d3ee", "#075045"],      // emerald + cyan over deep green
  // executives — deep, mature; the metallic sheen supplies the light
  pro_consult: ["#64748b", "#94a3b8", "#1e293b"],        // brushed steel slate
  pro_pivot: ["#a855f7", "#7c3aed", "#3a1856"],          // royal purple, deep
  pro_directors_cut: ["#f59e0b", "#7c3aed", "#251440"],  // amber + violet over aubergine — lush
  // marketplace — quieter, still warm
  mk_meet_expert: ["#f59e0b", "#65a30d", "#1f3d0f"],     // amber + green over deep forest
  sj_extra_session: ["#60a5fa", "#3b82f6", "#1e3a6b"],   // clean blues
  pro_extra_session: ["#8b5cf6", "#6d28d9", "#2b1a48"],  // violet steel (metallic)
  // long-term programs
  lt_blueprint: ["#6366f1", "#22d3ee", "#1a1c4a"],        // indigo + cyan (student long-term — matte)
  lt_autobiography: ["#c084fc", "#f59e0b", "#180f2e"],    // violet + amber over aubergine (metallic)
  // utility surfaces
  fit_test: ["#2dd4a8", "#34d399", "#0f4e3e"],            // bright mint
  // ── the Career Tests — one liquid-metal field each, colours chosen to SAY
  //    something about the instrument. No hex here repeats anywhere above.
  sigma_personality: ["#9333ea", "#d946ef", "#4a1d6e"],   // amethyst ↔ orchid — the inner life, introspection
  sigma_interest: ["#fb7185", "#ea580c", "#5f1a1a"],      // molten copper-rose — pull, warmth, desire
  aptitude: ["#0284c7", "#475569", "#0c2340"],            // polished cobalt-steel — objectivity, precision
  // the Career Intelligence Report — the product's own signature blend
  report_career: ["#0574a9", "#3f4bb8", "#65368f"],       // Compass blue → indigo → violet
}

// Unknown offering ids get a tasteful neutral dark — never a crash.
const NEUTRAL_PALETTE: [string, string, string] = ["#262d3c", "#55627a", "#9aa7bd"]

// Finish by audience: executives (professional track) + VCLP read METALLIC
// (specular sheen, brushed micro-texture); students / marketplace / free are MATTE.
const METALLIC = new Set<string>([
  "pro_consult", "pro_pivot", "pro_directors_cut", "pro_extra_session", "lt_autobiography",
  // the Career Tests + the report read as liquid metal — the instruments are
  // the product's precision hardware, and the sheen says so
  "sigma_personality", "sigma_interest", "aptitude", "report_career",
])

// ---------------------------------------------------------------------------
// Shader — kept cheap on purpose (mediump, fbm ≤ 4 octaves, 3 fbm taps total)
// because many instances render on one page.
const FRAG = `
precision mediump float;
uniform float u_t;
uniform vec2 u_r;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform float u_warp;
uniform vec2 u_ph;
uniform float u_cr;
uniform float u_sr;
uniform vec2 u_m;   // cursor in the same aspect-normalized space as uv
uniform float u_ma; // cursor influence 0..1 (lerped on hover enter/leave)
uniform vec3 u_bg;  // base tone — the palette's own darkest hue, never plain black
uniform float u_metal; // 0 = matte (students), 1 = metallic sheen (executives)
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x),
             mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + 11.17; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_r) / min(u_r.x, u_r.y);
  vec2 p = mat2(u_cr, -u_sr, u_sr, u_cr) * uv * 1.7 + u_ph;
  float t = u_t;
  // domain warp: two slow fbm fields push the sampling point around — the richer,
  // marbled flow (liquid colour, more movement + merging), kept luminous
  vec2 q = vec2(fbm(p + vec2(t * 0.055, -t * 0.040)),
                fbm(p + vec2(4.7, 9.2) + vec2(-t * 0.035, t * 0.050)));
  // cursor reaction: the field bends toward the pointer, strongest close to it
  vec2 dm = u_m - uv;
  float pull = u_ma * smoothstep(0.85, 0.0, length(dm));
  float f = fbm(p + u_warp * (q - 0.5) * 2.6 + dm * pull * 0.9 + vec2(t * 0.020, -t * 0.030));
  // liquid colour pools over the palette's own deep tone — luminous, never sad
  vec3 col = u_bg;
  col = mix(col, u_c0 * 0.96, smoothstep(0.22, 0.88, f));
  col = mix(col, u_c1 * 1.00, smoothstep(0.34, 0.96, q.x) * 0.85);
  col = mix(col, u_c2 * 1.02, smoothstep(0.50, 1.00, q.y * 0.7 + f * 0.45) * 0.72);
  // the colour quietly gathers under the cursor (palette light, no blur/glow filter)
  col += pull * 0.10 * (u_c1 + u_c2) * 0.5;
  // ── material finish ─────────────────────────────────────────────────────
  // METALLIC (executives): SMOOTH chromed sheen — a tight specular highlight
  // riding the flow + a broad soft sheen band + polished contrast. Liquid metal
  // / silk, NO striations or brushed lines. MATTE (students): none of this.
  float spec = pow(smoothstep(0.55, 1.0, f), 4.0);          // tight bright highlight
  vec3 metal = mix(col, mix(u_c2, vec3(1.0), 0.55), spec * 0.55);
  float sheen = smoothstep(0.30, 0.72, q.x) * (1.0 - smoothstep(0.72, 1.0, q.x)); // broad soft band
  metal += sheen * 0.10;
  metal = (metal - 0.5) * 1.12 + 0.52;                      // polished contrast
  col = mix(col, metal, u_metal);
  // whisper of a vignette — shape, not gloom
  col *= 0.98 - 0.14 * dot(uv, uv);
  // grain — matte is velvety-soft, metal keeps a fine brushed micro-texture
  col += (h(gl_FragCoord.xy + vec2(fract(t * 3.7) * 31.0)) - 0.5) * mix(0.035, 0.06, u_metal);
  gl_FragColor = vec4(col, 1.0);
}`

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

// ---------------------------------------------------------------------------
const hexRgb = (c: string): [number, number, number] => {
  const v = parseInt(c.slice(1), 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

const rgba = (c: string, a: number): string => {
  const [r, g, b] = hexRgb(c)
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
}

// The gradient's resting depth: the palette's own darkest colour, pulled down
// to a deep-but-TINTED tone (luminance-capped) — coloured light instead of a
// black hole. Light palettes (executive creams) get a floor so type contrast
// on scrimmed surfaces still holds.
const baseTone = (p: [string, string, string]): [number, number, number] => {
  const rgbs = p.map(hexRgb)
  const lum = (c: [number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  const darkest = rgbs.reduce((a, b) => (lum(a) <= lum(b) ? a : b))
  const L = lum(darkest)
  const k = L > 0.2 ? 0.2 / L : 1 // cap depth at L≈0.20 — deep, never gloomy
  return [darkest[0] * k, darkest[1] * k, darkest[2] * k]
}

const baseHex = (p: [string, string, string]): string => {
  const [r, g, b] = baseTone(p)
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

// FNV-1a — stable per-offering seed for phase / rotation / focal points
const hashId = (s: string): number => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return x >>> 0
}

// Static CSS stand-in (resting state + WebGL fallback) — same palette, same
// luminous read as the shader: colour pools over the palette's own deep tone.
const fallbackCss = (p: [string, string, string], seed: number, metal: boolean): string => {
  const x = 12 + (seed % 46)
  const y = 8 + ((seed >>> 6) % 30)
  const base = baseHex(p)
  const layers = [
    `radial-gradient(120% 90% at ${x}% ${y}%, ${rgba(p[0], 0.78)} 0%, rgba(0,0,0,0) 64%)`,
    `radial-gradient(140% 110% at ${96 - x}% ${30 + ((seed >>> 3) % 25)}%, ${rgba(p[1], 0.66)} 0%, rgba(0,0,0,0) 68%)`,
    `radial-gradient(130% 120% at 50% 112%, ${rgba(p[2], 0.55)} 0%, rgba(0,0,0,0) 60%)`,
  ]
  // metallic: a diagonal specular sheen streak (chrome / anodized read)
  if (metal) layers.push(`linear-gradient(120deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 62%)`)
  layers.push(`linear-gradient(180deg, ${base} 0%, ${base} 100%)`)
  return layers.join(", ")
}

const SCRIM =
  "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.34) 55%, rgba(0,0,0,0.55) 100%)"

// ---------------------------------------------------------------------------
export function PackageGradient({
  offeringId,
  className = "",
  interactive = true,
  scrim = true,
}: {
  offeringId: string
  className?: string
  interactive?: boolean
  scrim?: boolean
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)
  // A page shows ~14 of these; browsers cap live WebGL contexts (~16/page) and
  // evict the rest — which would freeze every card. So the canvas only MOUNTS
  // while its card is near the viewport (the palette-matched CSS layer shows
  // otherwise), keeping the live-context pool at viewport size (~4–5) and the
  // animation genuinely running on every card you can see.
  const [live, setLive] = useState(false)

  const palette = GRADIENT_PALETTES[offeringId] ?? NEUTRAL_PALETTE
  const seed = hashId(offeringId)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    // seed visibility immediately (IntersectionObserver can lag the first paint)
    const r = wrap.getBoundingClientRect()
    if (r.bottom > -200 && r.top < innerHeight + 200) setLive(true)
    const io = new IntersectionObserver(
      ([entry]) => setLive(!!entry?.isIntersecting),
      { rootMargin: "35% 0px" },
    )
    io.observe(wrap)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!live) return // far offscreen — the CSS layer holds the fort, no context burned
    const canvas = ref.current
    if (!canvas) return // fallback mode — nothing to boot

    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      alpha: false,
      powerPreference: "low-power",
    })
    if (!gl) {
      setFallback(true)
      return
    }

    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      setFallback(true)
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uT = gl.getUniformLocation(prog, "u_t")
    const uR = gl.getUniformLocation(prog, "u_r")
    const uWarp = gl.getUniformLocation(prog, "u_warp")
    const [c0, c1, c2] = [palette[0], palette[1], palette[2]].map(hexRgb)
    gl.uniform3f(gl.getUniformLocation(prog, "u_c0"), c0[0], c0[1], c0[2])
    gl.uniform3f(gl.getUniformLocation(prog, "u_c1"), c1[0], c1[1], c1[2])
    gl.uniform3f(gl.getUniformLocation(prog, "u_c2"), c2[0], c2[1], c2[2])
    const bg = baseTone(palette)
    gl.uniform3f(gl.getUniformLocation(prog, "u_bg"), bg[0], bg[1], bg[2])
    // EXECUTIVES (professional track) + the aspirational VCLP get a metallic
    // sheen; students / marketplace / free stay matte.
    gl.uniform1f(gl.getUniformLocation(prog, "u_metal"), METALLIC.has(offeringId) ? 1 : 0)
    // per-offering flow field: hash the id into a phase offset + rotation so
    // no two cards look identical even with related palettes
    const rot = ((seed % 360) / 360) * Math.PI * 2
    gl.uniform1f(gl.getUniformLocation(prog, "u_cr"), Math.cos(rot))
    gl.uniform1f(gl.getUniformLocation(prog, "u_sr"), Math.sin(rot))
    gl.uniform2f(
      gl.getUniformLocation(prog, "u_ph"),
      (((seed >>> 8) % 1000) / 1000) * 19,
      (((seed >>> 16) % 1000) / 1000) * 19,
    )

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(devicePixelRatio || 1, 1.5)

    // returns true when the backing store was reallocated (WebGL clears it, so
    // the caller must repaint)
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const hgt = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== hgt) {
        canvas.width = w
        canvas.height = hgt
        gl.viewport(0, 0, w, hgt)
        return true
      }
      return false
    }

    const uM = gl.getUniformLocation(prog, "u_m")
    const uMa = gl.getUniformLocation(prog, "u_ma")

    // hover state lerps — flow speed, warp strength AND the cursor position/
    // influence ease toward their targets every frame, so everything glides
    let speed = 1
    let speedTarget = 1
    let warp = 1
    let warpTarget = 1
    let mx = 0, my = 0, mtx = 0, mty = 0 // cursor in shader uv space (lerped)
    let ma = 0, maTarget = 0             // cursor influence 0..1
    // start mid-flow (t≈8, nudged per offering) so the first frame — and the
    // reduced-motion still — already looks composed
    let flowT = 8 + ((seed >>> 4) % 60) * 0.35
    let raf = 0
    let last = 0
    let inView = true

    const paint = () => {
      resize()
      gl.uniform1f(uT, flowT)
      gl.uniform1f(uWarp, warp)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.uniform2f(uM, mx, my)
      gl.uniform1f(uMa, ma)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const k = 1 - Math.exp(-dt * 3.5)
      speed += (speedTarget - speed) * k
      warp += (warpTarget - warp) * k
      const km = 1 - Math.exp(-dt * 6) // cursor follows a touch quicker
      mx += (mtx - mx) * km
      my += (mty - my) * km
      ma += (maTarget - ma) * k
      flowT += dt * speed
      paint()
      raf = requestAnimationFrame(draw)
    }

    // run only while on-screen, on a visible tab, without reduced motion
    const sync = () => {
      const should = inView && !document.hidden && !reduce
      if (should && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(draw)
      } else if (!should && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = !!entry?.isIntersecting
        sync()
      },
      { rootMargin: "96px" },
    )
    io.observe(canvas)

    const onVis = () => sync()
    document.addEventListener("visibilitychange", onVis)

    // reduced motion has no rAF loop, so a resize that clears the buffer would
    // leave the card blank — repaint the one still frame here
    const ro = new ResizeObserver(() => {
      if (resize() && reduce) paint()
    })
    ro.observe(canvas)

    // the CARD hosts hover (the canvas + wrapper are pointer-events-none) —
    // the wrapper's parent is the card element
    const parent = canvas.parentElement?.parentElement ?? canvas.parentElement
    const onEnter = () => {
      speedTarget = 2.5
      warpTarget = 1.4
      maTarget = 1
    }
    const onLeave = () => {
      speedTarget = 1
      warpTarget = 1
      maTarget = 0
    }
    // map the pointer into the SAME aspect-normalized space the shader uses for
    // uv ((frag - 0.5*res) / min(res)); note gl_FragCoord's y runs bottom-up
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      const m = Math.min(r.width, r.height)
      mtx = (e.clientX - r.left - r.width / 2) / m
      mty = (r.height / 2 - (e.clientY - r.top)) / m
    }
    const hover = interactive && !reduce && parent
    if (hover) {
      parent.addEventListener("pointerenter", onEnter)
      parent.addEventListener("pointerleave", onLeave)
      parent.addEventListener("pointermove", onMove)
    }

    // under context pressure (~14 canvases) the browser may evict us — swap to
    // the CSS gradient instead of leaving a black hole
    const onLost = (e: Event) => {
      e.preventDefault()
      setFallback(true)
    }
    canvas.addEventListener("webglcontextlost", onLost)

    resize()
    paint() // first frame (and the only frame under reduced motion)
    sync()

    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      document.removeEventListener("visibilitychange", onVis)
      if (hover) {
        parent.removeEventListener("pointerenter", onEnter)
        parent.removeEventListener("pointerleave", onLeave)
        parent.removeEventListener("pointermove", onMove)
      }
      canvas.removeEventListener("webglcontextlost", onLost)
      io.disconnect()
      ro.disconnect()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- palette/seed derive from offeringId
  }, [offeringId, interactive, fallback, live])

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* palette-matched CSS layer always renders beneath — the resting state
          while the card is far offscreen, and the safety net if WebGL dies */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{ background: fallbackCss(palette, seed, METALLIC.has(offeringId)) }}
      />
      {live && !fallback && (
        <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      )}
      {scrim && (
        <div className="absolute inset-0" style={{ background: SCRIM }} />
      )}
    </div>
  )
}
