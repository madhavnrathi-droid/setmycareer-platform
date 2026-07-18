// Self-healing for stale tabs. After a deploy, a tab that's been open since an
// older build keeps running OLD JavaScript — including old routing (e.g. an
// /admin route that still redirects to the counsellor console). This detects when
// a NEWER bundle has been deployed and reloads the tab once so it can never keep
// serving stale behaviour. No-op in dev; never interrupts active typing.

const BUNDLE_RE = /\/assets\/index-[A-Za-z0-9_-]+\.js/

function loadedBundle(): string | null {
  for (const s of Array.from(document.scripts)) {
    const m = s.src.match(BUNDLE_RE)
    if (m) return m[0]
  }
  return null
}

let current: string | null = null
let reloading = false

async function check(): Promise<void> {
  if (reloading || !current) return
  // never reload out from under someone mid-typing
  const el = document.activeElement
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (el as HTMLElement | null)?.isContentEditable) return
  try {
    const html = await fetch(`/?_v=${Date.now()}`, { cache: "no-store" }).then((r) => r.text())
    const latest = html.match(BUNDLE_RE)?.[0]
    if (latest && latest !== current) {
      reloading = true
      location.reload()
    }
  } catch {
    /* offline / transient — try again next trigger */
  }
}

/** Start watching for new deploys and reload stale tabs. Call once at boot. */
export function startVersionGuard(): void {
  if (!import.meta.env.PROD) return
  current = loadedBundle()
  if (!current) return
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void check() })
  window.addEventListener("focus", () => void check())
  setInterval(() => void check(), 5 * 60 * 1000) // backstop poll
}
