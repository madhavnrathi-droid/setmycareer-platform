// Monochrome halftone hero. A full-viewport WebGL plane renders a B/W photograph
// as a field of halftone dots that swell where the image is dark, drift with the
// cursor, and dilate as you scroll — CDG/Margiela grain meets antimetal restraint.
// Degrades to a plain grayscale image if WebGL is unavailable.

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uRes;      // canvas px
  uniform vec2 uImg;      // image px
  uniform vec2 uMouse;    // -1..1
  uniform float uTime;
  uniform float uScroll;  // 0..1
  uniform float uReveal;  // 0..1 intro

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

  // object-cover UV
  vec2 cover(vec2 uv){
    float ca = uRes.x / uRes.y;
    float ia = uImg.x / uImg.y;
    vec2 s = ca > ia ? vec2(1.0, ia/ca) : vec2(ca/ia, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  void main(){
    vec2 uv = cover(vUv);
    // gentle parallax + scroll drift
    uv += uMouse * 0.012;
    uv.y += uScroll * 0.04;

    float lum = dot(texture2D(uTex, uv).rgb, vec3(0.299, 0.587, 0.114));

    // halftone grid (denser by default, looser near the cursor)
    float cells = mix(170.0, 120.0, smoothstep(0.0, 0.4, length(uMouse)));
    cells *= mix(1.0, 0.82, uScroll);
    vec2 gp = vUv * cells * vec2(uRes.x/uRes.y, 1.0);
    vec2 cell = fract(gp) - 0.5;
    float d = length(cell);

    // dots: light dots on black, swelling where the photo is bright
    float radius = (0.5 * pow(lum, 0.8)) * uReveal;
    float dot = smoothstep(radius, radius - 0.06, d);

    float grain = (hash(vUv * uRes.xy + uTime) - 0.5) * 0.06;
    vec3 col = vec3(dot) + grain;
    col = clamp(col, 0.0, 1.0);
    // slight vignette to seat it in the page
    float vig = smoothstep(1.15, 0.35, length(vUv - 0.5));
    col *= mix(0.78, 1.0, vig);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function HalftoneHero({ src }: { src: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" })
    } catch { setFailed(true); return }

    const dpr = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.domElement.style.display = "block"
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uRes: { value: new THREE.Vector2(mount.clientWidth, mount.clientHeight) },
      uImg: { value: new THREE.Vector2(1600, 1000) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uReveal: { value: 0 },
    }
    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)

    new THREE.TextureLoader().setCrossOrigin("anonymous").load(
      src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        uniforms.uTex.value = tex
        uniforms.uImg.value.set(tex.image.width, tex.image.height)
      },
      undefined,
      () => setFailed(true),
    )

    const target = new THREE.Vector2(0, 0)
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    }
    window.addEventListener("pointermove", onMove)

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      uniforms.uRes.value.set(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener("resize", onResize)

    let raf = 0
    const clock = new THREE.Clock()
    const tick = () => {
      uniforms.uTime.value = clock.getElapsedTime()
      uniforms.uMouse.value.lerp(target, 0.06)
      uniforms.uScroll.value = Math.min(1, window.scrollY / (window.innerHeight || 1))
      if (uniforms.uReveal.value < 1) uniforms.uReveal.value = Math.min(1, uniforms.uReveal.value + 0.012)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("resize", onResize)
      uniforms.uTex.value?.dispose()
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [src])

  if (failed) {
    return <img src={src} alt="" className="absolute inset-0 size-full object-cover bw-hi opacity-70" />
  }
  return <div ref={mountRef} className="absolute inset-0 size-full" aria-hidden />
}
