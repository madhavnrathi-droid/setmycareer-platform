// Shared AI knowledge — the common "training" both the client AI guide and the
// counsellor copilot receive, so either can answer questions about SetMyCareer's
// products, pricing and the science behind the reports. Product facts are
// generated from the live catalogue (src/portal/products.ts) so they never drift;
// company facts are a factual digest of setmycareer.com; the methodology block
// describes the real Career Tests + career-fit engine the platform scores with.

import { PRODUCTS, fmtINR } from "../portal/products"
import { CAREER_PATTERNS_BRIEF } from "../intelligence/data/career-patterns"
import { CAREER_BANK_KNOWLEDGE } from "../intelligence/data/career-bank"

function productLines(): string {
  return PRODUCTS.map((p) => {
    const price = p.priceLabel ?? fmtINR(p.priceFrom)
    const tiers = p.tiers
      ? " Tiers: " + p.tiers.map((t) => `${t.name} ${fmtINR(t.price)}`).join("; ") + "."
      : ""
    const narrative = [
      p.duration ? `Duration: ${p.duration}.` : "",
      p.forWhom ? `For whom: ${p.forWhom}` : "",
      p.whatYouGet ? `What you get: ${p.whatYouGet}` : "",
      p.benefits ? `Benefit: ${p.benefits}` : "",
    ].filter(Boolean).join(" ")
    return `• ${p.name} — from ${price}. ${p.tagline}${tiers} ${narrative}`.trim()
  }).join("\n")
}

const COMPANY = `ABOUT SETMYCAREER
SetMyCareer is India's most trusted career counselling and management company — 15+ years of scientific, data-driven career guidance combining validated psychometric assessments with expert human counselling. Scale: 60,000+ clients counselled, 100,000+ counselling hours, 70,000+ tests administered, present in 38 cities, 55+ certified coaches, HQ in Koramangala, Bangalore. Contact: +91-9108510058, info@setmycareer.com. Hours: Mon–Sun, 9am–8pm. Audiences: school students (8th–12th), undergraduates, postgraduates, working professionals (early- and mid-career), career-restarters, and parents.`

const METHODOLOGY = `ASSESSMENT & REPORT METHODOLOGY (the Career Tests + career-fit engine — you may explain this logic)
• Personality Test: a 72-item scale, 6 factors × 3 facets × 4 items, mixed direct/reverse keying, 5-point Likert. Scored by reverse-keying, averaging to facet then factor, and converting to a norm-referenced percentile against a 244-respondent calibration sample (Low <34th, Average 34–66th, High >66th).
• Interest Pattern Test: ~96 items across career clusters, mapped onto the 34 JCE Basic-Interest scales.
• Ability Test: objective reasoning items scored as % correct across verbal, numerical, logical and spatial.
• Career fit (JCE engine): the 34-scale interest profile is normalised as (percentile−50)/25 and Pearson-correlated against each of 30 Job-Group and 17 Education-Group weight vectors; Fit% = (similarity+1)/2; bands run Very Low → Very High. This ranks the member's best-fit job groups and fields of study.
• Blended fit (where ability + personality are available): Education Fit = 40% interest + 35% ability + 25% personality; Job Fit = 35% interest + 25% ability + 25% personality + 15% market demand.
• The Career Intelligence Report synthesises these results with the member's sessions, goals and counsellor notes — counsellor judgement is weighted heavily in the final read.`

export const SMC_KNOWLEDGE = `=== SETMYCAREER KNOWLEDGE BASE ===
${COMPANY}

PRODUCTS, SERVICES & PRICING (recommend the right one for the person's situation; never invent prices):
${productLines()}

${METHODOLOGY}

=== RECOMMENDATION PATTERNS (mined from SetMyCareer's own data) ===
${CAREER_PATTERNS_BRIEF}

=== CAREER BANK & GUIDANCE (from setmycareer.com — use this to answer career, stream, course, stage and service questions in SetMyCareer's own voice) ===
${CAREER_BANK_KNOWLEDGE}
=== END KNOWLEDGE BASE ===`
