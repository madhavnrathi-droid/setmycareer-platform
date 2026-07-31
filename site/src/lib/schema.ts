import { SITE_URL, abs } from "./site"

// Typed JSON-LD builders — one place where the site's structured data is defined.
//
// Before this file, every page hand-wrote its own graph inline (BlogPost.tsx,
// CareerPage.tsx, ExpertDetail.tsx) and index.html held a fourth, separate copy.
// They had already drifted: three different Organization @ids, a publisher
// reference that pointed somewhere the graph never defined, and an Offer that
// carried a currency with no price. Structured data that contradicts itself is
// worse than none — a validator reads it as an unreliable source and an answer
// engine has no way to tell which version is true.
//
// Rules this module holds to, because they are the ones that get sites penalised:
//   · Never assert what the page does not show. FAQPage only where the Q&A is
//     rendered, Offer prices only where the price is on screen.
//   · Never invent a rating, a review or a review count. There is no
//     aggregateRating builder here and there should not be one until real,
//     attributable reviews exist in the repo.
//   · Every node identifies the same Organization by the same @id, so the graph
//     resolves to one entity rather than five near-duplicates.
//
// Pure functions only. No React, no DOM, no `document` — this runs identically in
// the browser, in the SSR bundle and inside scripts/prerender.mjs at build time.

export type JsonLd = Record<string, unknown>

const CONTEXT = "https://schema.org"

/** Stable identity for the company across every graph the site emits. Derived
 *  from SITE_URL so the domain cutover moves it with everything else, per the
 *  one-origin doctrine in seo.ts. */
export const ORG_ID = `${SITE_URL}/#organization`

/** Stable identity for the site itself (distinct from the company that runs it). */
export const WEBSITE_ID = `${SITE_URL}/#website`

// ── helpers ──────────────────────────────────────────────────────────────────

/** Absolute URL from either a site-relative path or an already-absolute URL.
 *  Mirrored library posts pass absolute setmycareer.com URLs; everything else
 *  passes a path. Both have to end up absolute — schema.org URLs are resolved by
 *  crawlers with no page context, so a relative one is simply lost. */
function url(pathOrUrl: string): string {
  const s = pathOrUrl.trim()
  return /^https?:\/\//i.test(s) ? s : abs(s)
}

/** True only for values `url()` can turn into something a crawler can fetch: a
 *  site-relative path, or an http(s) URL. Everything else — data:, blob:,
 *  mailto:, javascript: — must be rejected BEFORE absolutising, because abs()
 *  will happily prefix the origin onto "data:image/png;base64,…" and produce a
 *  URL that looks valid and fetches nothing. */
function isFetchable(pathOrUrl?: string): boolean {
  const s = pathOrUrl?.trim()
  if (!s) return false
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(s)
  return scheme ? /^https?$/i.test(scheme[1]) : true
}

/** ISO 8601 or nothing. An unparseable date invalidates the node it sits in, so
 *  a bad value is dropped rather than guessed at. Authored date-only strings
 *  ("2024-03-05") are passed through unchanged — widening them to a fake
 *  midnight timestamp would claim a precision we do not have. */
function isoDate(value?: string): string | undefined {
  if (!value) return undefined
  const t = Date.parse(value)
  if (Number.isNaN(t)) return undefined
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(value.trim()) ? value.trim() : new Date(t).toISOString()
}

/** Shallow removal of empty members. JSON.stringify would drop `undefined`
 *  anyway, but empty strings and empty arrays survive it and read as assertions
 *  ("this article has no author") rather than as absences. */
function compact(o: JsonLd): JsonLd {
  const out: JsonLd = {}
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue
    if (typeof v === "string" && v.trim() === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

/** The publisher/provider stub. Deliberately NOT a bare `{"@id": …}` reference:
 *  a reference only resolves if the full Organization node is present in the same
 *  document, and route-scoped JSON-LD cannot guarantee that. Carrying @id *and*
 *  name means the node is self-sufficient for a validator and still merges into
 *  the full Organization wherever that is emitted alongside it. */
export const orgRef = (): JsonLd => ({ "@type": "Organization", "@id": ORG_ID, name: "SetMyCareer" })

/** Compose several nodes into one `@graph` document. Falsy nodes are dropped, so
 *  `graph(orgSchema(), breadcrumbSchema(trail))` is safe even when the breadcrumb
 *  builder declines to emit. Inner `@context` keys are stripped — repeating the
 *  context on every member is legal JSON-LD but noise, and useSeo() would
 *  otherwise emit a `null` script tag for any builder that returned null. */
export function graph(...nodes: (JsonLd | null | undefined)[]): JsonLd {
  const members: JsonLd[] = []
  for (const n of nodes) {
    if (!n) continue
    const rest: JsonLd = {}
    for (const [k, v] of Object.entries(n)) if (k !== "@context") rest[k] = v
    members.push(rest)
  }
  return { "@context": CONTEXT, "@graph": members }
}

// ── Organization ─────────────────────────────────────────────────────────────

/** The company. Data is carried over verbatim from the @graph in index.html —
 *  founding year, founder, description, areaServed, knowsAbout — so the two
 *  layers cannot describe different companies.
 *
 *  `url` stays the production domain: that is the brand's home whatever origin
 *  this build is served from, and it is what `sameAs` corroborates. `@id` moves
 *  with SITE_URL, so at domain cutover the identifier and the URL converge.
 *
 *  Deliberately absent: address, telephone, contactPoint, aggregateRating,
 *  numberOfEmployees. None of them are verifiable in this repo, and a wrong
 *  address in structured data is a trust failure, not a rounding error. */
export function orgSchema(): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": ORG_ID,
    name: "SetMyCareer",
    alternateName: "Set My Career",
    url: "https://setmycareer.com",
    logo: { "@type": "ImageObject", url: abs("/og.svg") },
    foundingDate: "2010",
    founder: {
      "@type": "Person",
      name: "Dr. Nandkishore Rathi",
      jobTitle: "Founder",
      alumniOf: { "@type": "CollegeOrUniversity", name: "Indian Institute of Technology Bombay" },
    },
    description:
      "SetMyCareer is a science-backed career counselling and assessment platform for students and professionals in India. It pairs validated psychometric assessments — aptitude, interest and personality — with trained human counsellors and AI tools to turn career decisions from guesswork into evidence.",
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: [
      "Career counselling",
      "Psychometric assessment",
      "Aptitude testing",
      "RIASEC interest inventory",
      "Big Five personality",
      "Stream selection after Class 10",
      "Career guidance for students",
      "Career change",
    ],
    sameAs: ["https://setmycareer.com"],
  }
}

// ── WebSite ──────────────────────────────────────────────────────────────────

/** The site.
 *
 *  NO SearchAction. A WebSite may declare a `potentialAction` sitewide search so
 *  Google can render a sitelinks search box — but only if the declared endpoint
 *  actually returns results. This site has no search: src/App.tsx registers 20
 *  routes and none of them is /search, and src/content/nav.ts (the single source
 *  of truth for nav and footer) exposes no search affordance. Pointing a
 *  SearchAction at a URL that resolves to the 404 route would be a claim the site
 *  cannot honour, so the property is omitted. Add it here — and only here — if a
 *  real search route ever ships. */
export function websiteSchema(): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: abs("/"),
    name: "SetMyCareer",
    inLanguage: "en-IN",
    publisher: orgRef(),
  }
}

// ── BreadcrumbList ───────────────────────────────────────────────────────────

export interface Crumb {
  name: string
  /** site-relative path, or an absolute URL for an off-site ancestor */
  path: string
}

/** Breadcrumbs for a nested page.
 *
 *  Returns null for a trail shorter than two entries: a breadcrumb that contains
 *  only the current page describes no hierarchy, and Google ignores it. Compose
 *  with `graph()`, which drops the null for you. */
export function breadcrumbSchema(trail: Crumb[]): JsonLd | null {
  const items = trail.filter((c) => c && c.name?.trim() && isFetchable(c.path))
  if (items.length < 2) return null
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: url(c.path),
    })),
  }
}

// ── Article / BlogPosting ────────────────────────────────────────────────────

export interface ArticleInput {
  headline: string
  description?: string
  /** The page this article is published at. Pass a site-relative path for our own
   *  essays; pass the ORIGINAL setmycareer.com URL for a mirrored library post,
   *  so mainEntityOfPage agrees with rel=canonical instead of contradicting it. */
  url: string
  /** ISO date; dropped silently if unparseable */
  datePublished?: string
  /** Falls back to datePublished — omitting it entirely reads as "never reviewed" */
  dateModified?: string
  author?: string
  /** "Person" for a named byline, "Organization" for a house byline */
  authorType?: "Person" | "Organization"
  image?: string | string[]
  /** e.g. "Career Guidance" — the section the piece belongs to */
  section?: string
  /** BlogPosting for field notes, Article for standalone essays and guides */
  type?: "Article" | "BlogPosting"
}

/** One article.
 *
 *  The headline is emitted verbatim and never truncated. Google prefers headlines
 *  under ~110 characters, but silently shortening it here would make the schema
 *  disagree with the visible H1 — and a headline/H1 mismatch is read as a
 *  manipulation signal, which costs more than the rich-result eligibility saves.
 *  Keep the H1 short instead. */
export function articleSchema(a: ArticleInput): JsonLd {
  const published = isoDate(a.datePublished)
  const images = (Array.isArray(a.image) ? a.image : a.image ? [a.image] : [])
    .filter(isFetchable)
    .map(url)

  return compact({
    "@context": CONTEXT,
    "@type": a.type ?? "BlogPosting",
    headline: a.headline,
    description: a.description,
    datePublished: published,
    dateModified: isoDate(a.dateModified) ?? published,
    author: a.author ? { "@type": a.authorType ?? "Organization", name: a.author } : orgRef(),
    image: images.length ? images : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url(a.url) },
    publisher: orgRef(),
    inLanguage: "en-IN",
    articleSection: a.section,
  })
}

// ── FAQPage ──────────────────────────────────────────────────────────────────

export interface QaPair {
  q: string
  a: string
}

/** FAQ markup for a page that VISIBLY renders these exact questions and answers.
 *
 *  This is the constraint that matters. The site previously shipped its homepage
 *  FAQ graph on all twenty routes, so /pricing and /blog each declared themselves
 *  an FAQPage answering questions they never displayed — a content mismatch
 *  Google treats as spam. scripts/prerender.mjs now strips the static block off
 *  every non-home route; this builder exists so route-scoped FAQ markup is
 *  generated next to the component that renders it, and nowhere else.
 *
 *  Answers are passed through unmodified: the markup must be the full answer text,
 *  not a summary of it. */
export function faqSchema(qa: QaPair[]): JsonLd | null {
  const pairs = qa.filter((x) => x && x.q?.trim() && x.a?.trim())
  if (!pairs.length) return null
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: pairs.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  }
}

// ── Service + OfferCatalog ───────────────────────────────────────────────────

export interface OfferInput {
  name: string
  description?: string
  /** Rupees, as a plain number. Omit entirely for quote-only engagements —
   *  do NOT pass 0 to mean "on request", 0 means free. */
  price?: number
  /** Site-relative path or absolute URL where this offer is actually purchasable */
  url?: string
}

/** The catalogue as it stands in index.html's @graph, kept here so the two agree.
 *
 *  RISK, flagged rather than silently patched: these four are the LEGACY products
 *  (src/content/packages.ts). The /pricing page renders src/content/offerings.ts —
 *  the 2026 catalogue, which declares itself the one canonical source and contains
 *  none of these names. Structured data should quote the price a visitor can see,
 *  so a caller rendering the 2026 catalogue must pass its own offers rather than
 *  take this default. The default exists only to preserve what already ships. */
export const CORE_OFFERS: OfferInput[] = [
  { name: "Career Clarity Index", price: 0, description: "A three-minute readiness check." },
  { name: "Stream Selector", price: 1990, description: "Seven streams, one right fit." },
  { name: "Job Domain Selector", price: 2499, description: "Twenty-two domains analysed against your profile." },
  // no price: quoted to the engagement. index.html carried priceCurrency here with
  // no price to attach it to — a dangling property that fails validation — so the
  // currency is dropped along with the price rather than left orphaned.
  { name: "Full Career Counselling", description: "Assessment with a trained expert, end to end, with a written report." },
]

/** The service the company sells, with its offer catalogue.
 *
 *  Prices are emitted only when a caller supplies one, and always with INR
 *  attached. Nothing here asserts availability, rating or review count. */
export function serviceSchema(offers: OfferInput[] = CORE_OFFERS): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "Service",
    serviceType: "Career counselling and psychometric assessment",
    provider: orgRef(),
    areaServed: { "@type": "Country", name: "India" },
    audience: { "@type": "EducationalAudience", audienceType: "Students and professionals" },
    url: abs("/pricing"),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Career services",
      itemListElement: offers.map((o) =>
        compact({
          "@type": "Offer",
          name: o.name,
          description: o.description,
          // price and priceCurrency travel together or not at all
          price: o.price === undefined ? undefined : String(o.price),
          priceCurrency: o.price === undefined ? undefined : "INR",
          url: o.url ? url(o.url) : undefined,
        }),
      ),
    },
  }
}

// ── ItemList ─────────────────────────────────────────────────────────────────

export interface ListEntry {
  name: string
  /** site-relative path, or absolute for a mirrored post whose canonical is
   *  the original setmycareer.com URL — list the canonical destination, not the
   *  on-site copy, or the hub points crawlers at pages it has told them to ignore */
  path: string
  description?: string
}

/** ItemList for a hub or index page — the library, the blog, the expert network.
 *
 *  Position is derived from array order, which is the order the page renders in.
 *  Passing a pre-shuffled array would make the markup disagree with the page. */
export function itemListSchema(items: ListEntry[], opts?: { name?: string; description?: string }): JsonLd | null {
  const entries = items.filter((i) => i && i.name?.trim() && isFetchable(i.path))
  if (!entries.length) return null
  return compact({
    "@context": CONTEXT,
    "@type": "ItemList",
    name: opts?.name,
    description: opts?.description,
    numberOfItems: entries.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: entries.map((e, i) =>
      compact({
        "@type": "ListItem",
        position: i + 1,
        name: e.name,
        description: e.description,
        url: url(e.path),
      }),
    ),
  })
}
