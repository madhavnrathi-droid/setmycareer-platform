import { lazy, Suspense } from 'react'

// Heavy three.js — lazy-load so first paint stays fast and it only costs when a
// surface using it mounts. Bespoke GLSL flowing gradient (ShaderSurface).
const Lazy = lazy(() => import('./ShaderSurface'))

// Blend a possibly-alpha hex onto white (the shader needs opaque 6-digit hex).
function flatten(hex) {
  if (hex.length !== 9) return hex
  const a = parseInt(hex.slice(7, 9), 16) / 255
  const ch = (i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * a + 255 * (1 - a))
    .toString(16).padStart(2, '0')
  return `#${ch(1)}${ch(3)}${ch(5)}`
}

// curated two-blue palettes (navy mirage → powder, over the white app)
export const PALETTES = {
  navy: ['#0E2942', '#2C5C82', '#A7D4E4'],     // deep hero (dashboard / metric header)
  mist: ['#A7D4E4', '#D7EAF3', '#FFFFFF'],     // light ambient (onboarding / cards)
  tide: ['#12354E', '#3E7AA6', '#CFE7F1'],     // mid, watery
  // blue shader variations for the session report bento
  deep: ['#06223F', '#0F4C81', '#3E8FC4'],     // deep ocean (report hero)
  ocean: ['#0A2E52', '#2E6FA6', '#7FC4E6'],    // bright cobalt
  dusk: ['#13294B', '#3A5E97', '#86A8D8'],     // indigo dusk
  ice: ['#2E6FA6', '#76BBE0', '#DCF0FA'],      // pale ice (light text → dark needed)
}

/**
 * A living, grainy gradient surface. Drop inside a position:relative rounded
 * container; it fills behind siblings. Renders an instant CSS-gradient + grain
 * fallback first (so there is never a blank frame, and it degrades without WebGL).
 */
export default function Aurora({
  palette = 'navy', colors, speed = 0.16, grain = true, className, style,
}) {
  const solid = (colors || PALETTES[palette] || PALETTES.navy).map(flatten)
  return (
    <div className={'aurora ' + (className || '')} aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit',
      background: `linear-gradient(150deg, ${solid[0]}, ${solid[1]} 52%, ${solid[2]})`,
      ...style,
    }}>
      <Suspense fallback={null}>
        <Lazy colors={solid} speed={speed} grain={grain} />
      </Suspense>
      {grain && <span className="aurora-grain" />}
    </div>
  )
}
