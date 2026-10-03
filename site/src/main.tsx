import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"

const root = document.getElementById("root")!
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Every indexable route is prerendered to real HTML (scripts/prerender.mjs), so React
// ADOPTS that DOM instead of replacing it. With createRoot it threw the prerendered page
// away and rendered a new one — and because the new headline was a few pixels larger once
// the web font had loaded, the browser counted it as a fresh largest paint. Inner pages
// painted at ~1.5s on a mid-range phone but reported LCP at ~8s, the moment the bundle
// finished. Hydrating keeps the original nodes, so the first paint stays the LCP.
//
// If the client's first render ever disagrees with the prerender, React 19 recovers by
// re-rendering on the client — the old behaviour, not a broken page. Routes that are not
// prerendered (/experts/:id via app.html, or `vite dev`) have an empty root and render
// client-side as before.
if (root.firstElementChild) {
  hydrateRoot(root, app, {
    onRecoverableError: (error, info) => {
      const msg = String((error as Error)?.message ?? error)
      // #419: a Suspense boundary the server finished as its fallback. renderToString does
      // not wait for React.lazy, so the six lazy WebGL journey artworks on the homepage are
      // always completed in the browser — intended (they are heavy and below the fold),
      // and the content around them still hydrates. Anything else is a real mismatch.
      if (/#419\b|could not finish this Suspense boundary/.test(msg)) return
      console.warn("[hydration] recovered by client render:", msg, info?.componentStack?.split("\n").slice(0, 6).join(" <- ") ?? "")
    },
  })
} else {
  createRoot(root).render(app)
}
