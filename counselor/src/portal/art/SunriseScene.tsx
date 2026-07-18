// The heavy half of SunriseField — the real ShaderGradient engine
// (@shadergradient/react, the library behind shadergradient.co) running the
// founder's reference scene: plane / uDensity 1.3 / uFrequency 5.5 / uSpeed 0.4 /
// uStrength 4 / rotationZ 50 / brightness 1.2 / grain on / lightType 3d.
// Our per-test palette rides in as color1..3 (mid = dominant hue, deep = shadow,
// bright = highlight). Default export so React.lazy can code-split three.js
// away from the portal bundle — it only loads when a test room mounts.

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react"

function enc(hex: string) {
  return "%23" + hex.replace("#", "")
}

export default function SunriseScene({ palette }: { palette: [string, string, string] }) {
  const [deep, mid, bright] = palette
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // the founder's shadergradient.co/customize reference, colours swapped per test
  const urlString =
    `https://www.shadergradient.co/customize?animate=${reduced ? "off" : "on"}` +
    "&axesHelper=off&brightness=1.2&cAzimuthAngle=180&cDistance=3.6&cPolarAngle=90&cameraZoom=1" +
    `&color1=${enc(mid)}&color2=${enc(deep)}&color3=${enc(bright)}` +
    "&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide" +
    "&grain=on&lightType=3d&pixelDensity=1&positionX=-1.4&positionY=0&positionZ=0&range=disabled" +
    "&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=10&rotationZ=50&shader=defaults" +
    // uSpeed 0.4 → 0.08: an almost-imperceptible large drift (~50s to feel one
    // full movement) — macOS-wallpaper energy, nothing that pulls the eye
    "&type=plane&uAmplitude=1&uDensity=1.3&uFrequency=5.5&uSpeed=0.08&uTime=0&uStrength=4&wireframe=false"

  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
      // lazyLoad defaults TRUE and gates the canvas behind an
      // IntersectionObserver — pointless for a fixed full-viewport field, and
      // it never fires in a backgrounded tab (headless verification, previews)
      lazyLoad={false}
    >
      <ShaderGradient control="query" urlString={urlString} />
    </ShaderGradientCanvas>
  )
}
