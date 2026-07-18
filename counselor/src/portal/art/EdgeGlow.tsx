// EdgeGlow — a living gradient that breathes in from the EDGES of the surface
// while the centre stays clean and whitish (the conversation is never painted
// over). A four-colour field flows around the perimeter (fbm-warped), and a
// single ENERGY value drives how far in, how bright and how fast it moves.
//
// Energy is fed by the parent through a mutable ref: bump `energyRef.current`
// on keystrokes, streamed AI tokens, or microphone level — the shader eases
// toward it and the component decays it back toward the idle floor every
// frame, so pulses feel alive without any React re-renders.
//
// NOTE: no loseContext() in cleanup — a persistent canvas keeps ONE WebGL
// context forever and React StrictMode double-mounts effects in dev (the
// AuthShader lesson).

import { useEffect, useRef, type MutableRefObject } from "react"
import { cn } from "@/lib/utils"

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_e;   // energy 0..1.6
uniform vec3 u_c0, u_c1, u_c2, u_c3;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.55;
  for(int k = 0; k < 3; k++){ v += a * noise(p); p = p * 2.03 + vec2(7.3, 3.1); a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  // the centre is always fully transparent — skip the field math there
  float edEarly = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  if (edEarly > 0.46) { gl_FragColor = vec4(0.0); return; }
  vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_t * (0.10 + 0.28 * u_e);

  // colour flows around the perimeter, warped by the field
  vec2 c = vec2(0.5 * u_res.x / u_res.y, 0.5);
  float ang = atan(p.y - c.y, p.x - c.x);
  float n = fbm(p * 2.1 + vec2(t, -t * 0.7));
  float hue = fract(ang / 6.28318 + n * 0.38 + u_t * 0.018);
  float h4 = hue * 4.0;
  vec3 col = h4 < 1.0 ? mix(u_c0, u_c1, fract(h4))
           : h4 < 2.0 ? mix(u_c1, u_c2, fract(h4))
           : h4 < 3.0 ? mix(u_c2, u_c3, fract(h4))
           : mix(u_c3, u_c0, fract(h4));

  // the glow lives at the edges; the centre stays clear
  float ed = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float width = 0.13 + 0.15 * u_e + 0.06 * (n - 0.5);
  float m = 1.0 - smoothstep(0.0, max(width, 0.02), ed);
  m = pow(m, 1.55);
  float a = m * (0.42 + 0.5 * min(u_e, 1.2));
  gl_FragColor = vec4(col * a, a); // premultiplied over the light page
}`

const hexToVec = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function EdgeGlow({
  palette,
  energyRef,
  idle = 0.14,
  className,
}: {
  /** four perimeter colours, flowing into each other */
  palette: [string, string, string, string]
  /** bump this (e.g. += 0.2) on keystrokes / tokens / mic level; the glow eases + decays */
  energyRef: MutableRefObject<number>
  /** resting energy floor when nothing is happening */
  idle?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true })
    if (!gl) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let live = true

    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "p")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "u_res")
    const uT = gl.getUniformLocation(prog, "u_t")
    const uE = gl.getUniformLocation(prog, "u_e")
    ;(["u_c0", "u_c1", "u_c2", "u_c3"] as const).forEach((name, k) => {
      gl.uniform3fv(gl.getUniformLocation(prog, name), hexToVec(palette[k]))
    })

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    let e = idle
    const paint = (t: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uT, t)
      gl.uniform1f(uE, e)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(2, Math.round(rect.width * dpr))
      const h = Math.max(2, Math.round(rect.height * dpr))
      if (w === canvas.width && h === canvas.height) return // no-op resizes must not touch the buffer
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      // with no draw loop (reduced motion), a real resize clears the buffer —
      // repaint the still frame or the glow would stay blank forever
      if (reduced) paint(4)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (ms: number) => {
      if (!live) return
      if (!document.hidden) {
        // ease toward the bumped energy, then decay it back to the idle floor
        const target = Math.max(idle, Math.min(energyRef.current, 1.6))
        e += (target - e) * 0.075
        energyRef.current = idle + (target - idle) * 0.955
        paint(ms * 0.001)
      }
      raf = requestAnimationFrame(draw)
    }
    if (reduced) {
      paint(4)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      live = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.join(","), idle])

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />
}
