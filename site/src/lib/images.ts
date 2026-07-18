// Monochrome imagery. Deterministic grayscale photographs (stable, CORS-open —
// the WebGL hero needs a cross-origin-clean texture), treated in CSS with grain +
// high contrast for an editorial, premium feel. Each slot is a single seed string,
// so swapping in curated Unsplash URLs or your own premium B/W photography later
// is a one-line change per slot.

const SRC = (seed: string, w = 1200, h = 1500) => `https://picsum.photos/seed/${seed}/${w}/${h}?grayscale`

export const IMG = {
  hero: SRC("smc-hero-eye", 1600, 1000),
  method: [SRC("smc-m1"), SRC("smc-m2"), SRC("smc-m3")],
  product: SRC("smc-product", 1400, 1000),
  experts: SRC("smc-experts", 1200, 900),
  start: SRC("smc-start", 1400, 1000),
  fragments: [SRC("smc-f1", 800, 1000), SRC("smc-f2", 900, 700), SRC("smc-f3", 700, 900)],
}

export const methodImg = (i: number) => SRC(`smc-step-${i}`, 900, 1200)
export const blogCover = (slug: string, w = 1400, h = 800) => `https://picsum.photos/seed/smc-${slug}/${w}/${h}?grayscale`
export const avatar = (key: string, s = 480) => `https://picsum.photos/seed/smc-p-${key}/${s}/${s}?grayscale`
