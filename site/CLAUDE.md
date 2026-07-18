# SetMyCareer marketing site (site/)

You are building the SetMyCareer marketing website — a standalone, monochrome-editorial,
scroll-interactive site (separate from the product apps and from setmycareer.com's SEO engine).

**Always load the `madhav-ui-design` skill for design work here.** It carries the design
philosophy, the UX-law checklist (`references/ux-laws.md`, from lawsofux.com), and the full
curated resource library (`references/resources.md`: Carbon, shadcn/Radix, Motion.dev, GSAP,
Lenis, R3F, inspiration sites, MCP servers). Emulate Linear/Stripe/Vercel/Apple/Anthropic/Arc
*principles* — never copy assets.

## Stack (as built — do not swap without reason)
- Vite 8 + React 19 + TypeScript (strict) + Tailwind v4 (`@theme` tokens in `src/index.css`)
- GSAP + ScrollTrigger + SplitText (all free) · Lenis smooth scroll · three.js (halftone hero)
- Icons: @carbon/icons-react · Fonts: IBM Plex Sans/Mono/Serif + Cambo (wordmark)
- Deploy: `npx vercel --prod --yes` from `site/` (project `site`, team madhavs-projects-56d7586e)

## Hard requirements
- Animate transforms/opacity ONLY; 60fps; `prefers-reduced-motion` = full content visible
- Responsive 320px→4K, no horizontal scroll; WCAG AA; 44px targets; semantic landmarks
- Monochrome B/W only, no rounded corners/shadows/boxes; hairlines + type do the structure
- ONE solid CTA per view (`.btn--solid`); everything else `.btn` outline or `.ul` links
- Trust is a design output: precise numbers, cited sources, NO fabricated testimonials

## Architecture map
- IA / nav / footer sitemap: `src/content/nav.ts` (single source of truth)
- Generated page copy: `src/content/ia.ts` (workflow-generated, curated) · articles in
  `src/content/site.ts` + `more-articles.ts` · demos data `src/content/demos.ts` (cited)
- Live data: `src/lib/api.ts` (api.setmycareer.com open reads) · SEO: `src/lib/seo.ts`
  (per-route title/canonical/JSON-LD) + static schema in `index.html` + `public/llms.txt`
- Motion core: `src/lib/motion.ts` (Lenis + hash-aware routing + reveals/counters)
- Cursor: `src/components/CompassCursor.tsx` (circle = hotspot, split-fill arrow aims at the
  nearest control, magnetic hover/click via `.magnet-hover`)

## Known traps (cost us real debugging time)
1. **Cascade layers**: unlayered CSS beats Tailwind's `@layer utilities`. Element-level base
   rules (like `a { color: inherit }`) MUST live in `@layer base` or they silently kill
   text-color utilities. (This made every button label invisible for weeks.)
2. **Preview harness**: the automated preview tab is backgrounded — rAF, IntersectionObserver,
   ScrollTrigger and CSS transitions are frozen; a fresh tab can be 0×0 until resized.
   Verify structure/state/computed styles there; verify MOTION on a focused tab.
3. The site URL is hardcoded in `index.html`, `seo.ts`, `robots.txt`, `sitemap.xml` — update
   all four when pointing a custom domain.
4. `.btn` fills use a positioned `::before`; direct children get z-index — always wrap button
   label text in an element, never a bare text node.

## Docs lookups
Never guess library APIs — fetch current docs (Context7 MCP if available, else WebFetch the
official docs listed in the skill's `references/resources.md`).
