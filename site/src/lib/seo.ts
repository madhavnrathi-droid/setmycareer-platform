import { useEffect } from "react"

// Lightweight head management for the SPA: dynamic <title>/description/canonical per
// route, plus optional per-page JSON-LD (e.g. BlogPosting). The static homepage
// schema (Organization, Service, FAQPage) lives in index.html for non-JS crawlers;
// this layer keeps things correct as the user navigates client-side.

export const SITE_URL = "https://site-madhavs-projects-56d7586e.vercel.app"

function meta(key: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute("content", content)
}
function canonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el) }
  el.href = href
}

export function useSeo({ title, description, path, jsonLd }: { title: string; description: string; path: string; jsonLd?: object | null }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : ""
  useEffect(() => {
    document.title = title
    meta("description", description)
    meta("og:title", title, "property")
    meta("og:description", description, "property")
    meta("og:url", SITE_URL + path, "property")
    meta("twitter:title", title)
    meta("twitter:description", description)
    canonical(SITE_URL + path)
    let script: HTMLScriptElement | null = null
    if (ld) {
      script = document.createElement("script")
      script.type = "application/ld+json"
      script.setAttribute("data-route-ld", "true")
      script.textContent = ld
      document.head.appendChild(script)
    }
    return () => { script?.remove() }
  }, [title, description, path, ld])
}
