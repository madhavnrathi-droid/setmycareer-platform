import { createElement, lazy, type ComponentType } from "react"

// Route-level code splitting that survives hydration.
//
// Every page used to be a static import, so every visitor downloaded and parsed every
// page's code and content (the careers dataset alone is ~110KB raw) before anything on
// screen responded to a tap. Splitting by route fixes that — but a plain React.lazy page
// renders its Suspense fallback on the first pass, which does not match the prerendered
// HTML, and React would throw the prerendered page away again.
//
// So each route component can be PRELOADED. The client loads the current route's chunk
// before hydrating, and the prerenderer loads it before rendering. Once loaded, the
// component renders synchronously — identical output on both sides, nothing suspends.
// Pages reached later by in-app navigation load on demand through React.lazy.

export type RouteComponent = ComponentType<object> & { preload: () => Promise<void> }

const RELOAD_FLAG = "smc.chunk-reload"

export function lazyRoute(load: () => Promise<ComponentType<object>>): RouteComponent {
  let Loaded: ComponentType<object> | null = null
  let pending: Promise<void> | null = null

  const preload = () =>
    (pending ??= load().then(
      (C) => { Loaded = C },
      (err) => {
        // After a redeploy, a visitor still running the previous bundle asks for chunk
        // names that no longer exist. Reload once so they get the current build instead
        // of a blank page; the flag stops a genuinely broken chunk from looping.
        pending = null
        if (typeof window !== "undefined") {
          try {
            if (!sessionStorage.getItem(RELOAD_FLAG)) {
              sessionStorage.setItem(RELOAD_FLAG, "1")
              window.location.reload()
              return new Promise<void>(() => {}) // hold the fallback while the reload happens
            }
          } catch { /* storage blocked: fall through to the error */ }
        }
        throw err
      },
    ))

  const Lazy = lazy(() => preload().then(() => ({ default: Loaded as ComponentType<object> })))
  const Route = (props: object) => createElement(Loaded ?? Lazy, props)
  return Object.assign(Route, { preload })
}

/** A successful load means the build is current; clear the one-shot reload guard. */
export function clearChunkReloadFlag() {
  try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* ignore */ }
}
