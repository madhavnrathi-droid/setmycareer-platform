// The site's origin, and nothing else.
//
// This module deliberately has ZERO imports. seo.ts, schema.ts and the prerender
// script all need the origin, and if they reach for it through each other the
// import graph closes into a cycle — whichever module happens to initialise first
// reads the other's `const` before it is assigned and the whole app dies at boot
// with a TDZ error that neither tsc nor the build catches. A leaf module makes
// that class of bug impossible.

// ONE definition of the origin. It used to be hardcoded in four places
// (index.html, seo.ts, robots.txt, sitemap.xml) which had already drifted onto the
// raw *.vercel.app deployment URL — telling Google the real site lived there.
//
// At domain cutover this single variable moves and canonicals, OG tags, JSON-LD
// @ids, robots.txt and the sitemap all follow.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://test.setmycareer.com").replace(/\/+$/, "")

// Staging must not compete with the live site at setmycareer.com for its own brand
// terms, so it ships `noindex` until this flips to "1". Crawling stays allowed —
// a crawler has to fetch the page to see the noindex tag.
export const SITE_INDEXABLE = import.meta.env.VITE_SITE_INDEXABLE === "1"

/** Absolute URL for a site-relative path. */
export const abs = (path: string) => SITE_URL + (path.startsWith("/") ? path : "/" + path)
