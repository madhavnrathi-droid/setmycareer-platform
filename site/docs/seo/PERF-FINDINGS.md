# Performance findings — marketing site

Measured 2026-07-31 against the working tree at commit `f309c4f`
(*site SEO: build-time static rendering, single origin, per-route heads*).

Every number below was observed, not estimated. Where a number is an approximation
the method is stated. Nothing here has been applied to the source — this is a fix
list, ranked by the size of the win.

---

## Measurement basis

**Build** — one run of `npm run build`
(`tsc -b && vite build && vite build --ssr && node scripts/prerender.mjs`):

| Artefact | Raw | Gzip |
|---|---:|---:|
| `dist/assets/index-*.js` (client entry) | 2,023.96 kB | 576.53 kB |
| `dist/assets/index-*.css` | 127.60 kB | 21.96 kB |
| `Art01Reveal` … `Art06Compass` (6 lazy chunks) | 3.08–7.90 kB each | 1.51–3.26 kB |
| `dist/index.html` (prerendered home) | 170,426 B | 25,360 B |
| `dist/blog/index.html` | 63,759 B | 10,459 B |
| `dist/app.html` (SPA shell) | 6,665 B | 2,396 B |

Rolldown emitted its own warning on the entry chunk: *"Some chunks are larger than
500 kB after minification."*

**Library weight**, each bundled in isolation with the repo's own rolldown
(`node_modules/.bin/rolldown … --minify --platform browser`):

| Import | Minified | Gzip |
|---|---:|---:|
| `three` (+ `WebGLRenderer`) | 457.8 kB | 112.0 kB |
| `gsap` + `ScrollTrigger` + `SplitText` | 118.1 kB | 45.9 kB |
| `react` + `react-dom/client` + `react-router-dom` | 379.0 kB | 117.8 kB |
| `lenis` | 17.9 kB | 5.1 kB |

Those four account for roughly 973 kB of the 2,024 kB entry chunk — about 48%.
The React figure is the least precise of the four (measured outside Vite's
`define`, so production-only branches may not have been pruned); the three.js and
GSAP figures are exact.

**Fonts** — the two live Google Fonts URLs from `index.html` were fetched with a
current Chrome user-agent and every `latin` face downloaded and weighed. Those
byte counts appear in finding 4.

---

## 1 · The splash overlay owns the first 2.36 s of every visit

**Evidence.** `src/components/Splash.tsx:52-61` builds a GSAP timeline of
1.5 s (progress rule + counter + mark rotation) `+= 0.2` s, then a 0.66 s wipe —
2.36 s before the page beneath it is visible. The escape-hatch timeout at
`Splash.tsx:44` is 3.2 s. It renders from `src/App.tsx:38` as the first child of
the app, and `src/index.css:376` places it at `position: fixed; inset: 0;
z-index: 9800; background: var(--color-ink)`. There is no first-visit gate: it
runs on every navigation that remounts the app, on every visit, forever.

The interaction with the new prerender is the part worth being precise about. The
prerendered HTML paints the real hero first, so the LCP entry is very likely the
hero `<h1>` and is *not* itself delayed. What the splash destroys is Speed Index
and everything a person actually perceives: after the hero paints, hydration drops
a full-viewport black plate over it for up to 2.36 s. On a cold cache the 2,024 kB
entry chunk has to arrive before that timer even starts, so the plate lands late
and clears later still.

**Fix.** Keep the overture, ration it. Gate on first view per session and halve
the duration. In `src/components/Splash.tsx`, alongside the existing `IS_BROWSER`
constant at line 25:

```tsx
// the overture is an arrival, not a toll booth — it plays once per session and
// never on a route the visitor came back to
const SEEN_KEY = "smc.splash.seen"
const alreadySeen = () => {
  try { return sessionStorage.getItem(SEEN_KEY) === "1" } catch { return false }
}

export function Splash() {
  const [show] = useState(() => IS_BROWSER && !alreadySeen())
  useEffect(() => { try { sessionStorage.setItem(SEEN_KEY, "1") } catch { /* private mode */ } }, [])
  return show ? <SplashOverture /> : null
}
```

and shorten the timeline in the same file (`Splash.tsx:53-61`): `duration: 1.5`
→ `0.8` on the three parallel tweens, `"+=0.2"` → `"+=0.1"`, wipe `0.66` → `0.45`.
That is 1.35 s instead of 2.36 s, on the first view only. Lower the guard at line
44 from `3200` to `1800`.

**Impact.** Speed Index, and the field metrics that follow perceived load. No
change to LCP or CLS.

---

## 2 · three.js is in the entry chunk, so all 244 routes pay for the hero

**Evidence.** `src/three/HalftoneHero.tsx:7` and `src/three/JourneyObject.tsx:8`
both do `import * as THREE from "three"` at module scope. `src/pages/Home.tsx:6`
imports `HalftoneHero` statically; `src/components/StudentJourney.tsx:6` imports
`JourneyObject` statically. Because `src/App.tsx` imports every page statically
(finding 3), three.js lands in the single entry chunk that `/legal/privacy`,
`/blog/<any-post>` and `/contact` all download. Measured cost: **457.8 kB
minified, 112.0 kB gzip** — 22.6% of the entry chunk's raw bytes.

The six `journey-art` modules are already lazy (`StudentJourney.tsx:17-22`), and
`Art01Reveal` pulls three.js too — so the split boundary already exists in this
repo and simply was not applied to the two components that matter most.

**Fix.** Two `React.lazy` boundaries, mirroring the pattern already used at
`StudentJourney.tsx:17`. In `src/pages/Home.tsx`, replace the line-6 import with:

```tsx
import { lazy, Suspense } from "react"
// the WebGL hero is 112 kB gzip of three.js — it must not ride in the entry
// chunk that every legal page and blog post also downloads
const HalftoneHero = lazy(() =>
  import("@/three/HalftoneHero").then((m) => ({ default: m.HalftoneHero })),
)
```

and wrap the usage at `Home.tsx:72`:

```tsx
<Suspense fallback={<div className="absolute inset-0 size-full bg-ink" aria-hidden />}>
  <HalftoneHero src={IMG.hero} />
</Suspense>
```

The fallback matters: the hero section is `plate-dark`, so an ink-filled div is
byte-identical to the pre-texture state and introduces no shift. Do the same for
`JourneyObject` at `StudentJourney.tsx:6` and `:175`, where the surrounding
element already carries `aspect-square w-[min(78vw,360px)]` and therefore reserves
its own space.

**Read finding 3 before shipping this** — `Suspense` and the current prerenderer
do not get along.

**Impact.** LCP and TBT on every route except `/`. Removes ~112 kB gzip from the
critical path of 243 of 244 prerendered pages.

---

## 3 · No route-level code splitting — and the prerenderer blocks the obvious fix

**Evidence.** `src/App.tsx` lines 6–33 carry 26 static `@/pages/*` imports,
covering every route in the app. Not one is lazy. One consequence is that
route-specific data tables ride in the entry chunk on every page:

| Module | Source size | Only used by |
|---|---:|---|
| `src/content/careers-ext.ts` | 155.0 kB | `src/pages/CareerPage.tsx` (`/library/:id`) |
| `src/content/readiness.ts` | 56.5 kB | `src/components/cri/CriFlow.tsx` (`/cri`) |
| `src/lib/art.ts` | 41.8 kB | Blog / Resources / NewsFeed |
| `src/content/fit-test.ts` | 38.9 kB | `src/components/fit/*` (`/fit`) |
| `src/content/ia.ts` | 34.1 kB | generated page copy |

That is roughly 326 kB of source text, none of which the home page reads, all of
which the home page downloads.

**The constraint.** `src/entry-server.tsx:13` uses `renderToString` from
`react-dom/server`. In React 19 `renderToString` does **not** await Suspense — it
emits the fallback and warns. Introduce `React.lazy` at the route level and
`scripts/prerender.mjs` will happily write 244 static pages whose `<div id="root">`
contains the Suspense fallback and nothing else. The SEO work that just landed
would be silently undone, and the safety contract in `prerender.mjs:15-22` would
not catch it, because nothing throws.

**Fix — in this order.**

Step one, switch the prerenderer to the static API. React 19.2.7 is installed and
`react-dom/static` is present (verified: `prerenderToNodeStream` is exported). In
`src/entry-server.tsx`:

```tsx
import { prerenderToNodeStream } from "react-dom/static"

/** Render one route to markup. `url` is a path such as "/" or "/blog/foo".
 *  Uses the static API rather than renderToString because it AWAITS Suspense —
 *  without that, any React.lazy route would prerender as its fallback. */
export async function render(url: string): Promise<RenderResult> {
  ssrHead.current = null
  const { prelude } = await prerenderToNodeStream(
    <StrictMode><StaticRouter location={url}><App /></StaticRouter></StrictMode>,
  )
  let html = ""
  for await (const chunk of prelude) html += chunk
  return { html, head: ssrHead.current }
}
```

`scripts/prerender.mjs` already awaits nothing around `render()`, so its call site
needs an `await` and the route loop needs to stay sequential (it already is).

Step two, split the routes. In `src/App.tsx`:

```tsx
import { lazy, Suspense } from "react"

// Home stays eager — it is the entry point for most sessions and splitting it
// only adds a round trip. Everything else loads on demand.
import { Home } from "@/pages/Home"
const Product     = lazy(() => import("@/pages/Product").then((m) => ({ default: m.Product })))
const Library     = lazy(() => import("@/pages/Library").then((m) => ({ default: m.Library })))
const CareerPage  = lazy(() => import("@/pages/CareerPage").then((m) => ({ default: m.CareerPage })))
const Cri         = lazy(() => import("@/pages/Cri").then((m) => ({ default: m.Cri })))
const Fit         = lazy(() => import("@/pages/Fit").then((m) => ({ default: m.Fit })))
const Blog        = lazy(() => import("@/pages/Blog").then((m) => ({ default: m.Blog })))
const BlogPost    = lazy(() => import("@/pages/BlogPost").then((m) => ({ default: m.BlogPost })))
const Checkout    = lazy(() => import("@/pages/Checkout").then((m) => ({ default: m.Checkout })))
// …the remaining 20 follow the same shape

// no visible fallback: the reveal system already opens pages at opacity 0, and a
// spinner here would be the only spinner on the site
<Suspense fallback={null}>
  <Routes>{/* unchanged */}</Routes>
</Suspense>
```

Highest-value boundaries first, by measured source weight: `CareerPage`
(carries `careers-ext.ts`, 155.0 kB), `Cri` (`readiness.ts`, 56.5 kB), `Fit`
(`fit-test.ts`, 38.9 kB), `Blog`/`BlogPost` (`art.ts`, 41.8 kB),
`Checkout` (29.9 kB of its own), `ExpertApply` (29.4 kB), `Product` (28.4 kB).

**Impact.** TBT and LCP on every route. The entry chunk should fall well under
the 500 kB warning threshold once three.js (finding 2) and these seven leave it.

---

## 4 · The font request: two blocking stylesheets, a wasted axis, and two weights that are used but never loaded

`index.html:31-36` is one finding with five separable defects. Both `<link
rel="stylesheet">` elements are render-blocking, and both sit ahead of the local
`/assets/index-*.css` in the head.

### 4a · Two requests where one would do

**Evidence.** Fetched with a current Chrome UA: request 1 returns **27,817 B**
of CSS containing 68 `@font-face` blocks (13 of them `latin`); request 2 returns
**18,494 B** containing 48 blocks (8 `latin`). **46,311 B of render-blocking CSS
across two round trips.**

### 4b · The enumerated weights cost CSS, not fonts

**Evidence.** IBM Plex Sans is served as a *variable* font. All six requested
weights — 200, 300, 400, 500, 600, 700 — resolve to the **same file**,
`zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxeKYbSB4Zh.woff2`, **40,240 B** for
`latin`. Same for Source Serif 4. So `wght@200;300;400;500;600;700` downloads
nothing extra; it just multiplies the `@font-face` blocks by six across every
Unicode subset. Requesting the range `wght@200..700` yields one block per subset
declaring `font-weight: 200 700`, pointing at that same file.

`font-bold` appears **0** times in `src/`, and no rule in `src/index.css` and no
`fontWeight` prop in any `.tsx` sets 700. IBM Plex Sans 700 is loaded and never
used — which, given the variable font, costs CSS bytes only. Worth removing for
tidiness, not for speed.

### 4c · The `opsz` axis triples the Source Serif download

**Evidence.** Measured `latin` woff2 for Source Serif 4:

| Request shape | Upright | Italic | Total |
|---|---:|---:|---:|
| `ital,opsz,wght@0,8..60,…` *(current)* | 122,168 B | 129,940 B | **252,108 B** |
| `ital,wght@0,300..700;1,300..600` | 50,924 B | 51,532 B | **102,456 B** |
| `ital,wght@0,400;1,400` (static 400 only) | 20,112 B | 20,132 B | 40,244 B |

Dropping the optical-size axis saves **149,652 B** on every page that renders the
editorial serif — which includes the home page, because `src/components/bits.tsx:120`
(`<div className="editorial">`) and `src/components/LeadForm.tsx:47`
(`ed-title-xl`) are both in the home tree.

This is a genuine trade, not free. `font-optical-sizing` defaults to `auto`, so
the `opsz` axis is currently doing real work at the display sizes this design
reaches (`.ed-display` runs to `clamp(2.5rem, 6vw, 4.5rem)` at
`src/pages/BlogPost.tsx:138`). The honest recommendation: drop `opsz` from the
Google request now for the 146 kB, and if the optical refinement is wanted back,
buy it by self-hosting a subset (finding 4e) rather than by shipping the full
variable font over the network.

### 4d · Two weights the CSS uses are not in the request

**Evidence.**

- `src/components/Founder.tsx:19` renders the founder's pull-quote as
  `className="serif … font-light italic"` — IBM Plex Serif, **italic 300**. The
  request at `index.html:33` loads `ital,wght@0,300;0,400;1,400`: upright 300,
  upright 400, italic 400. Italic 300 is absent, so the quote falls back to
  italic 400 or a synthesised face.
- `src/index.css:92` and `:96` set `.ed-display .b, .ed-display em` and
  `.ed-title-xl .b, .ed-title-xl em` to `font-style: italic; font-weight: 600`.
  The request at `index.html:36` loads italic 300, 400 and 500 only. Every
  italic display accent therefore renders one step light. That includes the
  `/blog` H1 (`src/pages/Blog.tsx:77`, `Field <span class="b">Notes</span>`),
  the `/resources/videos` H1 (`src/pages/Videos.tsx:109`, `The <em>films</em>`)
  and the checkout confirmation head (`src/pages/Checkout.tsx:291`).

Conversely, **IBM Plex Serif upright 300 is loaded and never used** — `.serif` is
400 at `src/index.css:83`, and the only `font-light` on a `.serif` element is the
italic one above.

### 4e · Fix

Replace `index.html:31-36` with a single request, corrected axes and weights:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<!-- ONE request. Plex Sans and Source Serif are variable on Google Fonts, so a
     weight RANGE costs the same file as a single weight and a fraction of the
     CSS. The opsz axis is deliberately absent from Source Serif: it tripled the
     download (252 kB → 102 kB for the latin pair). Plex Serif carries italic 300
     because Founder.tsx renders the pull-quote there, and Source Serif's italic
     range reaches 600 because .ed-display em does. -->
<link
  href="https://fonts.googleapis.com/css2?family=Cambo&family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@200..700&family=IBM+Plex+Serif:ital,wght@0,400;1,300;1,400&family=Source+Serif+4:ital,wght@0,300..700;1,300..600&display=swap"
  rel="stylesheet" />
```

Measured result of that exact URL: **19,927 B** of CSS, 50 `@font-face` blocks
(10 `latin`), against 46,311 B and 116 blocks today. One blocking request instead
of two. The `latin` faces it resolves to:

| Face | Bytes |
|---|---:|
| IBM Plex Sans, variable 200–700 | 40,240 |
| Source Serif 4, variable 300–700 upright | 50,924 |
| Source Serif 4, variable 300–600 italic | 51,532 |
| IBM Plex Serif 400 upright | 14,916 |
| IBM Plex Serif 400 italic | 16,024 |
| IBM Plex Serif 300 italic | 16,704 |
| IBM Plex Mono 300 / 400 / 500 | 10,112 / 10,052 / 10,060 |
| Cambo 400 | 9,608 |

**Follow-on, once that lands.** Self-host. It removes two cross-origin
connections from the critical path and lets the two faces that paint the LCP be
preloaded at the same priority as the HTML:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/ibm-plex-sans-var-latin.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/ibm-plex-mono-500-latin.woff2" />
```

Those two are the correct pair to preload: the home LCP element is the hero `<h1>`
at `src/pages/Home.tsx:78` (`.display`, IBM Plex Sans 200), and the `.kicker`
directly above it is IBM Plex Mono 500 (`src/index.css:72-79`).

**Impact.** LCP (one fewer blocking round trip, 146 kB less font on the wire on
editorial routes), and a rendering-fidelity bug fixed on the `/blog` and
`/resources/videos` H1s at zero byte cost.

---

## 5 · Every photograph on the site is fetched from picsum.photos

**Evidence.** `src/lib/images.ts:6`:

```ts
const SRC = (seed: string, w = 1200, h = 1500) => `https://picsum.photos/seed/${seed}/${w}/${h}?grayscale`
```

Everything downstream is that call: the hero WebGL texture (`IMG.hero`, used at
`src/pages/Home.tsx:72`), the method images, the two `Problem` fragments
(`Home.tsx:104` and `:107`), every counsellor portrait via `avatar()` (used at
`Home.tsx:399`, `src/pages/ExpertDetail.tsx:191`), and `blogCover()`.

Measured, three consecutive cold requests to `https://picsum.photos/seed/smc-hero-eye/1600/1000?grayscale`:
**140,402 B**, **1 redirect**, TTFB 0.45–0.50 s warm and 1.19 s on the first hit.
`index.html` has no `preconnect` to `picsum.photos`, so a real visitor pays DNS +
TLS + the 302 hop before a single byte of the hero texture arrives.

Two consequences. The performance one: the hero canvas is empty until that chain
completes, and the counsellor grid on `/experts` fires one such request per face.
The other one is not a performance issue at all — a site whose whole argument is
that decisions should rest on evidence is illustrating itself with a random-image
service, and the images will change without warning.

**Fix, immediate** — add to `index.html` beside the font preconnects:

```html
<!-- imagery is still served from picsum + Wikimedia; the 302 + TLS handshake is
     otherwise paid inside the render, not before it -->
<link rel="preconnect" href="https://picsum.photos" crossorigin />
<link rel="preconnect" href="https://upload.wikimedia.org" crossorigin />
```

**Fix, real** — move the hero, the two fragments and the method stills into
`public/art/` as AVIF (with a WebP sibling), and serve counsellor portraits from
the live API rather than a placeholder generator. `src/lib/images.ts` is written
to make this a one-line change per slot, which is the right shape; it has just
never been taken.

**Impact.** LCP on `/` (the hero paints sooner) and on `/experts`. The preconnect
alone is worth roughly a round trip.

---

## 6 · The `/blog` LCP element is a 300–470 kB cross-origin JPEG

**Evidence.** `src/pages/Blog.tsx:187` renders the feature plate with
`loading={eager ? "eager" : "lazy"}` and `eager` set true for the first card
(`Blog.tsx:210`). `item.image` resolves through `src/lib/feed.ts` into
`src/lib/art.ts`, which is 156 hard-coded `upload.wikimedia.org` URLs at the
`1280px-` thumbnail size. Two representative plates, measured:

- `1280px-Wassily_Kandinsky_Erste_Radierung_…jpg` — **309,830 B**
- `1280px-Hilma_af_Klint_-_1920_-_Buddha's_Standpoint…jpg` — **467,973 B**

There is no `preconnect` to `upload.wikimedia.org`, no `fetchpriority="high"` on
the eager plate, no `srcset`, and the plate is displayed inside
`aspect-[16/9] p-[6%]` in a `md:col-span-7` column — never wider than about
760 CSS px on a 1440 px viewport, and about 340 px on mobile. A 1280 px source is
roughly 2.8× the pixels needed on mobile.

**Fix.** `src/lib/art.ts` stores full Wikimedia thumbnail URLs, and Wikimedia's
thumbnailer is width-addressable — the width is a path segment. Add a helper
beside the `Art` interface:

```ts
/** Wikimedia's thumbnailer takes the width in the path, so a plate can be asked
 *  for the size it is actually rendered at instead of a blanket 1280px. */
export const artAt = (url: string, w: 480 | 800 | 1280): string =>
  url.replace(/\/\d+px-/, `/${w}px-`)
```

then in `src/pages/Blog.tsx:187`:

```tsx
<img
  src={artAt(item.image, 800)}
  srcSet={`${artAt(item.image, 480)} 480w, ${artAt(item.image, 800)} 800w, ${item.image} 1280w`}
  sizes="(min-width: 768px) 58vw, 92vw"
  alt={item.title}
  loading={eager ? "eager" : "lazy"}
  {...(eager ? { fetchPriority: "high" as const } : {})}
  className="edit-img max-h-full max-w-full object-contain …"
/>
```

Note that only URLs already containing a `/NNNpx-` segment can be resized — a
handful of entries in `art.ts` are direct file URLs with no thumbnail segment
(for example the Primordial Chaos and Booklet 01 entries), where the regex is a
no-op and the original is served. Those should be normalised to thumbnail URLs.

**Impact.** LCP on `/blog`, which after the home page is the most-linked route in
the prerendered set.

---

## 7 · Not one `<img>` in the codebase declares width and height

**Evidence.** 27 `<img>` elements across `src/`. `grep -rn "width=\|height=" src/
| grep -i img` returns exactly one hit, and it is an `<svg>` in
`src/components/Brand.tsx:7`.

Most are contained: they sit inside `aspect-[…]` or `size-full` wrappers that
reserve their box, so the missing attributes cost nothing. Two are not, and they
are the product screenshots:

- `src/components/product/ProductShot.tsx:55-60` — `<img className="block w-full …">`
  inside `<span className="relative block overflow-hidden rounded-[6px]">`, no
  ratio anywhere in the chain.
- `src/components/product/IMacFrame.tsx:69-74` — the same shape.

Both render PNGs whose dimensions are uniform and known. Every file in
`public/product/` is **2880 × 1800**. Until each one decodes, its frame has zero
height, and `/product` reflows as they arrive.

**Fix.** Both components take `src` from a fixed set, so the ratio is a constant:

```tsx
// every product capture is 2880×1800 — declaring it lets the frame reserve its
// box before the PNG decodes, which is the whole of the CLS on /product
<img
  src={src}
  alt={alt}
  width={2880}
  height={1800}
  loading="lazy"
  className={`block h-auto w-full …`}
/>
```

The `h-auto` matters: without it, Tailwind's preflight `height: auto` on images
still applies, but being explicit prevents the declared height from being taken
literally if the preflight order ever changes.

**Impact.** CLS on `/product` — the only route in the set with a measurable
image-driven shift.

---

## 8 · Four CSS transitions animate layout properties, one of them forever

The repo's own rule in `CLAUDE.md` is "animate transforms/opacity ONLY". These
four break it, and the first one runs on every page for the life of the session.

**Evidence.**

- `src/index.css:295-302` — `.bar-sheen` animates `left` from `-45%` to `125%`
  on `animation: bar-sheen 7.5s ease-in-out infinite`. `left` is a layout
  property: this schedules a layout pass on every animation frame, permanently.
  The element belongs to the Compass bar, which `src/App.tsx:53` mounts globally.
- `src/index.css:288` — `.compass-bar` transitions `width` and `padding`.
- `src/index.css:321` — `.compass .ring` transitions `width`, `height`, `left`
  and `top`; it fires on every `.near` state change, which is every time the
  cursor approaches a control.
- `src/index.css:356` — `.unlock .more` transitions `max-height`.

**Fix.** The sheen is the one that matters and is a clean swap — the element is
already `position: absolute` inside an `overflow: hidden` parent:

```css
/* transform, not `left` — the sheen ran an infinite layout loop on every page */
.bar-sheen {
  position: absolute; top: 0; bottom: 0; left: 0; width: 34%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: skewX(-16deg) translateX(-230%);
  pointer-events: none;
  animation: bar-sheen 7.5s ease-in-out infinite;
}
@keyframes bar-sheen {
  0%, 70% { transform: skewX(-16deg) translateX(-230%); opacity: 0; }
  78%     { opacity: 1; }
  92%, 100% { transform: skewX(-16deg) translateX(368%); opacity: 0; }
}
```

`.compass .ring` should scale a fixed-size ring rather than resize it: keep
`width: 21px; height: 21px; left: -10.5px; top: -10.5px` as the base, set
`transform: scale(0.76)` by default and `scale(1)` under `.compass.near`, and
transition `transform, opacity` only. `.unlock .more` should use
`grid-template-rows: 0fr → 1fr` on a grid wrapper instead of `max-height` —
which also removes the magic `140px` ceiling at `index.css:357` that silently
clips any longer disclosure.

**Impact.** INP and frame stability during scroll and hover. No visual change.

---

## 9 · Three full-viewport blend-mode layers sit above the page

**Evidence.** `src/index.css:223-229` — `.grain` is `position: fixed; inset: 0;
z-index: 9000; mix-blend-mode: multiply` with an `feTurbulence` data-URI
background, mounted globally at `src/App.tsx:39`. `src/index.css:216-220` —
`.scroll-progress`, `mix-blend-mode: difference`, `z-index: 9001`, also global.
`src/index.css:253` — `.compass`, `mix-blend-mode: difference`, `z-index: 10600`.

A full-viewport blending layer forces the compositor to flatten everything beneath
it into one texture before it can composite the blend, on every frame in which
anything below changes — which, on a Lenis-driven page where the scroll position
changes continuously, is every frame.

**Fix.** This one is a design decision, not a bug, so the recommendation is a
measurement rather than an edit: profile a scroll on `/` with and without
`.grain`, and if the delta is material, either (a) bake the grain into a static
paper-toned PNG background with no blend mode, or (b) restrict `.grain` to
`@media (min-width: 1024px)` so mid-tier mobile is not paying for it. The grain
is the expensive one of the three; the other two cover a 2 px strip and a cursor.

**Impact.** INP and scroll smoothness, mobile especially. Do not change this
without a before/after profile — it is a load-bearing part of the visual system.

---

## 10 · 19.5 MB of assets in `public/` that nothing references

**Evidence.** `public/` totals 26 MB. Vercel deploys it verbatim.

- **`public/grads/` — 18 MB, 18 PNGs**, 677.6 kB to 1,352.0 kB each.
  `grep -rn "grads" --include='*.ts' --include='*.tsx' --include='*.mjs'
  --include='*.html'` across the repo returns **nothing**. Not one is referenced.
- `public/product/portal-signin.png` — **640.8 kB**, referenced nowhere in `src/`.
- `public/product/console-calendar.png` — **170.0 kB**, referenced nowhere.
- `public/logos/indianarmy.svg` — **341.1 kB**; `myntra.svg` — **135.4 kB**;
  `icici.svg` — **123.5 kB**. These render at `height: size` in the marquee
  (`src/components/LogoWall.tsx:26`), typically under 30 px. An SVG that large
  contains embedded raster data or unflattened paths.

Nothing on this list is on the critical path — it costs deploy size, build time
and bandwidth on the routes that do reference neighbours in the same directory.
It is listed because it is a two-minute fix.

**Fix.** Delete `public/grads/`, `public/product/portal-signin.png` and
`public/product/console-calendar.png` (confirm with the founder first — the
`grads/` folder has a matching source directory outside the repo, so it may be an
intentional staging area). Run the three oversized logos through SVGO, or replace
them with the traced marks used elsewhere in `public/logos/`.

The nine *referenced* product PNGs total roughly **3.1 MB**, all at 2880 × 1800,
displayed at no more than about 1,200 CSS px. Re-encoding them at 1600 px wide as
AVIF with a WebP fallback would land the set nearer 400 kB.

**Impact.** Deploy weight, and LCP on `/product` once the images are re-encoded.

---

## 11 · Two autoplaying `<video>` elements have no `preload` attribute

**Evidence.** `src/components/product/ProductShot.tsx:53` and
`src/components/product/IMacFrame.tsx:58-66` both render
`<video src={video} poster={src} autoPlay muted loop playsInline>` with no
`preload`. Chrome's default for an `autoPlay` video is effectively `auto`, so the
whole file downloads as soon as the element is parsed — regardless of whether it
is in the viewport. `src/components/product/FeaturePlayer.tsx:153` already gets
this right with `preload="metadata"`.

The files: `dashboard-scroll.mp4` 176.4 kB, `test-flow.mp4` 152.2 kB,
`report-scroll.mp4` 106.0 kB — **434.6 kB**, all three referenced from
`src/pages/Product.tsx`.

**Fix.** Add `preload="metadata"` to both, matching `FeaturePlayer`:

```tsx
<video ref={videoRef} src={video} poster={src} autoPlay muted loop playsInline
       preload="metadata" className="block w-full motion-reduce:hidden …" />
```

The `poster` is already the full-resolution PNG, so nothing is visually missing
while the video streams.

**Impact.** LCP and total bytes on `/product`.

---

## 12 · `vercel.json` sets no cache headers

**Evidence.** `vercel.json` contains `framework`, `buildCommand`,
`outputDirectory`, one `rewrites` rule and one `crons` entry. There is no
`headers` block. Vite's own `/assets/*` output is content-hashed and Vercel
handles it, but everything in `public/` — 6.9 MB of product captures, 1.1 MB of
logos, `art/mona.jpg` at 505.2 kB — is served under whatever default applies, and
none of those filenames carry a hash.

**Fix.**

```json
"headers": [
  {
    "source": "/(product|logos|art|grads)/(.*)",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=604800, stale-while-revalidate=86400" }
    ]
  }
]
```

A week rather than a year, because these filenames are not content-hashed and a
replaced screenshot must be able to propagate.

**Impact.** Repeat-visit load. No effect on a cold first visit.

---

## 13 · Smaller items, verified

- **`simple-icons` is a declared dependency with zero imports.**
  `package.json` lists `"simple-icons": "^16.24.1"` (25 MB installed);
  `grep -rn "simple-icons"` across `src/`, `api/` and `scripts/` returns nothing.
  Remove it. No bundle effect — it is tree-shaken out today — but it is 25 MB of
  install and CI time.

- **The compass-cursor decoration is serialised into every prerendered page.**
  `src/components/CompassCursor.tsx:226` renders five `.logostar` spans, each
  containing the full `LogoMark` path. In `dist/index.html` the `logostar`
  string appears 10 times at 1,189 B intervals — roughly **11.9 kB** of the
  home page's 170,426 B is a cursor trail that no crawler can use and that JS
  immediately takes over anyway. `src/components/Splash.tsx:25` already
  establishes the `IS_BROWSER` gate for exactly this reason; apply the same
  gate to `CompassCursor`.

- **`src/content/seo-meta.ts` (36.7 kB) landed after the build measured above**
  and is imported by `src/lib/seo.ts`, which every page imports. It will ride in
  the client entry chunk on every route, even though its only consumers are the
  prerenderer and `useSeo`. Worth confirming it is genuinely needed at runtime;
  if `useSeo` only reads it during SSR, it should be imported from
  `entry-server.tsx` and not from the shared `seo.ts`.

---

## Checked and clear

Recorded so the next reader does not re-investigate:

- **No runtime `@import` in `src/index.css`.** Line 1 is `@import "tailwindcss"`,
  which the Tailwind v4 Vite plugin resolves at build time. It produces no network
  request. This is the one thing the brief flagged that is genuinely fine.
- **`font-display` is correct.** Nothing in `src/index.css` sets it; both Google
  URLs carry `&display=swap`, which is the right choice for a site whose LCP
  element is text. Keep `swap` when self-hosting.
- **The 6 `journey-art` modules are already code-split** at
  `src/components/StudentJourney.tsx:17-22`, and each is 3.08–7.90 kB. That
  pattern is the model for findings 2 and 3.
- **The CSS bundle is not a problem.** 127.60 kB raw, **21.96 kB gzip**, one file
  for the whole site. Splitting it would cost more in round trips than it saves.
- **`prefers-reduced-motion` coverage is thorough** — 14 separate reduce blocks in
  `src/index.css`. Any fix above must carry its reduce block with it.
- **Most images sit inside ratio boxes** (`aspect-[…]`, `size-full object-cover`),
  so the absent `width`/`height` attributes cost nothing outside the two product
  components named in finding 7.
- **`loading="lazy"` is applied nearly everywhere** — 20 of 27 `<img>` elements.
  The exceptions are deliberate: the eager blog feature plate
  (`src/pages/Blog.tsx:187`), the video hero (`src/pages/Videos.tsx:244`), the
  lightbox (`src/components/product/Lightbox.tsx:54`) and the WebGL fallback
  (`src/three/HalftoneHero.tsx:147`).

---

## What could not be verified here

- **No Lighthouse or WebPageTest run.** Every metric attribution above is
  reasoned from measured bytes, measured latency and the code path, not from a
  lab trace. The rankings should hold, but the absolute numbers must come from a
  real run against the staging deploy before anyone reports a score.
- **The React runtime figure (379.0 kB / 117.8 kB gzip)** was measured outside
  Vite's `define`, so Vite's production build may prune more than rolldown did in
  isolation. The three.js and GSAP figures were reproduced and are exact.
- **`prerenderToNodeStream` is present and exported** (verified against the
  installed `react-dom@19.2.7`), but the migration in finding 3 has not been run.
  Treat the code as a starting point, not a tested patch.
- **The working tree moved during this investigation.** `src/content/career-test.ts`,
  `src/content/seo-blog.ts`, `src/content/seo-meta.ts` and `src/lib/schema.ts` were
  all untracked and in flux, and `dist/` was rebuilt by a parallel process after
  the measured build (the entry chunk hash changed from `index-COaEVuuU.js` to
  `index-D4oiJlRY.js` at a near-identical 1,976.6 kB). Re-run `npm run build`
  and re-read the chunk table before acting on finding 3.
- **Whether `public/grads/` is dead or staged** was not established. It is
  referenced nowhere in the repo, but a matching source folder exists outside it.
  Confirm before deleting.
