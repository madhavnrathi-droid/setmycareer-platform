// SunriseField — the test-room gradient, rendered by the REAL ShaderGradient
// engine (shadergradient.co — see SunriseScene for the founder's reference
// scene) with our per-test palettes. A CSS mask confines the light to a diffuse
// pool at the bottom-right, a soft run along the WHOLE bottom edge and a little
// way up the right edge — never the top, never the left, never a frame. The
// masked-out area shows the Frame's #08090b room, so reading copy stays on
// near-black. three.js is code-split behind React.lazy: it loads only when a
// test room mounts, and the room is plain dark until then (no flash).

import { Suspense, lazy } from "react"
import { cn } from "@/lib/utils"

const Scene = lazy(() => import("./SunriseScene"))

// ONE wide ellipse anchored past the bottom-right corner — its shape IS the
// union we want: a pool at the corner, a run along the whole bottom edge
// (fainter toward bottom-left), dying ~45% up the right edge. Deliberately a
// single layer: Chromium's multi-layer mask-composite over an accelerated
// WebGL canvas leaks (a strip of unmasked gradient ran up the right edge to
// the top corner) — verified in preview, single layer renders correctly.
// Mid-stops kept low (0.3 / 0.1) so the plane's bright waves stay subdued
// where they cross the reading column.
// ry 65% (was 95%): the light must never touch the middle of the screen — it
// tops out ~30% up the right edge and stays a low band elsewhere.
const MASK =
  "radial-gradient(170% 65% at 105% 108%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.08) 60%, transparent 72%)"

export function SunriseField({
  palette,
  className,
}: {
  /** three stops: [deep shadow, dominant mid, bright highlight] */
  palette: [string, string, string]
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none overflow-hidden", className)}
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <Suspense fallback={null}>
        <Scene palette={palette} />
      </Suspense>
    </div>
  )
}
