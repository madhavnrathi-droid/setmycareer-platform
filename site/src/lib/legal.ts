// Loads the legal documents authored in src/content/legal/*.md, parses their
// YAML-ish frontmatter, and exposes them ordered + grouped for the /legal pages
// and the footer. One source of truth: drop a new .md in that folder and it
// appears automatically (add its slug to ORDER + a GROUP to place it).

export interface LegalDoc {
  slug: string
  title: string
  shortLabel: string
  jurisdiction: string
  updated: string
  summary: string
  body: string
}

// Short labels + canonical order (frontmatter carries the long legal titles).
const LABEL: Record<string, string> = {
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "refund-cancellation-policy": "Refund & Cancellation",
  "delivery-policy": "Service Delivery",
  "cookie-policy": "Cookie Policy",
  "disclaimer": "Disclaimer",
  "acceptable-use-policy": "Acceptable Use",
  "counselling-consent": "Counselling & Recording Consent",
  "minors-parental-consent": "Children & Parental Consent",
  "counsellor-expert-terms": "Counsellor & Expert Terms",
  "grievance-redressal": "Grievance Redressal",
  "sub-processors": "Sub-processors",
}

export const LEGAL_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Policies", slugs: ["privacy-policy", "terms-of-service", "refund-cancellation-policy", "cookie-policy", "acceptable-use-policy", "disclaimer", "delivery-policy"] },
  { title: "Consents & disclosures", slugs: ["counselling-consent", "minors-parental-consent"] },
  { title: "Trust & governance", slugs: ["grievance-redressal", "sub-processors"] },
  { title: "For counsellors & experts", slugs: ["counsellor-expert-terms"] },
]

// The compact set surfaced in the site/app footer.
export const FOOTER_LEGAL: string[] = [
  "privacy-policy", "terms-of-service", "refund-cancellation-policy", "cookie-policy", "disclaimer", "grievance-redressal",
]

function parse(raw: string, slug: string): LegalDoc {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  const meta: Record<string, string> = {}
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
    }
  }
  // drop a leading top-level "# Title" — the page already renders the title from
  // frontmatter, so this avoids showing it twice.
  const body = (fm ? raw.slice(fm[0].length) : raw).replace(/^\s*#\s+.+\n+/, "")
  return {
    slug,
    title: meta.title || LABEL[slug] || slug,
    shortLabel: LABEL[slug] || meta.title || slug,
    jurisdiction: meta.jurisdiction || "India + United States",
    updated: meta.updated || "",
    summary: meta.summary || "",
    body,
  }
}

const files = import.meta.glob("../content/legal/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>

const BY_SLUG: Record<string, LegalDoc> = {}
for (const [path, raw] of Object.entries(files)) {
  const slug = path.split("/").pop()!.replace(/\.md$/, "")
  BY_SLUG[slug] = parse(raw, slug)
}

const ORDER = LEGAL_GROUPS.flatMap((g) => g.slugs)

export const ALL_LEGAL: LegalDoc[] = Object.values(BY_SLUG).sort(
  (a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99),
)

export const getLegalDoc = (slug: string): LegalDoc | undefined => BY_SLUG[slug]
export const legalLabel = (slug: string): string => LABEL[slug] || BY_SLUG[slug]?.title || slug
