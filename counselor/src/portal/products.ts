// The real SetMyCareer product catalogue — pricing and contents transcribed from
// the company's package sheets and setmycareer.com. This is the single source of
// truth for the client-side "buy" flows, the counsellor reference page, and the
// AI knowledge layer. Package→test/session assembly is the founder's to finalise;
// where known (e.g. True North) it's encoded, otherwise left as a sensible scaffold.

import { OFFERINGS_2026, type Offering2026 } from "../server/offerings-2026"

export type ProductCategory =
  | "journey2026" | "professional2026" | "marketplace2026" | "longterm2026"
  | "assessment" | "consultation" | "package" | "admission" | "ongoing" | "addon"

// The long-term programmes are application-only; their apply pages live on the
// marketing site (same base the portal already uses for the blog feed + legal).
const MARKETING_URL = "https://site-madhavs-projects-56d7586e.vercel.app"

export type AccentTone = "brand" | "mind" | "well" | "warn" | "risk"

export interface ProductTier {
  id: string
  name: string
  /** INR */
  price: number
  highlight?: boolean
  /** headline of what this tier gets you */
  summary: string
  /** feature rows (label → value/✓/✗) for the comparison view */
  features: { label: string; value: string }[]
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  tagline: string
  /** lowest INR price shown on the card; 0 = free */
  priceFrom: number
  /** optional explicit "from" override label, e.g. "₹499 / ₹699" */
  priceLabel?: string
  accent: AccentTone
  /** single-product narrative (Job Domain / DIY / Psych / Additional Session) */
  forWhom?: string
  whatYouGet?: string
  benefits?: string
  duration?: string
  mode?: string
  /** plain feature bullets for single-tier products */
  features?: string[]
  /** multi-tier products (success packages, admission, consultation) */
  tiers?: ProductTier[]
  /** call-to-action verb */
  cta: string
  /** application-only (no online checkout) — the rail shows an Apply link instead */
  applyOnly?: boolean
  /** where the Apply CTA goes (the marketing programme + form page) */
  applyHref?: string
}

const f = (label: string, value: string) => ({ label, value })

// ── 2026 catalog → products ───────────────────────────────────────────────────
// The new offerings come straight from the canonical catalog (offerings-2026);
// their ids double as the Razorpay PRICES keys, so payAndUnlock({ tier: id })
// just works. AI allowances render as "AI Career Copilot included" + Career/
// Voice Credits — never message counts or minutes.

const CATEGORY_2026: Record<Offering2026["track"], ProductCategory> = {
  student: "journey2026",
  professional: "professional2026",
  marketplace: "marketplace2026",
  custom: "longterm2026",
}
const ACCENT_2026: Record<Offering2026["track"], AccentTone> = {
  student: "brand", professional: "mind", marketplace: "warn", custom: "well",
}
/** the marketing apply page for a long-term offering (lt_blueprint → /programs/blueprint) */
const applyHrefFor = (id: string) => `${MARKETING_URL}/programs/${id.replace(/^lt_/, "")}`

function offeringFeatures(o: Offering2026): string[] {
  const out: string[] = []
  if (o.sessions) out.push(`${o.sessions} counsellor session${o.sessions === 1 ? "" : "s"}`)
  if (o.careerCredits || o.voiceCredits) {
    out.push("AI Career Copilot included")
    out.push(`${o.careerCredits} Career Credits · ${o.voiceCredits} Voice Credits`)
  }
  if (o.memory) out.push(`Memory: ${o.memory}`)
  if (o.certificates?.length) out.push(o.certificates.join(" · "))
  return out
}

const PRODUCTS_2026: Product[] = OFFERINGS_2026.map((o) => {
  const applyOnly = o.track === "custom"
  return {
    id: o.id,
    name: o.name,
    category: CATEGORY_2026[o.track],
    tagline: o.oneLine,
    priceFrom: o.inr,
    priceLabel: applyOnly ? `Custom quote · from ${fmtINR(o.inr)}` : undefined,
    accent: o.featured ? "brand" : ACCENT_2026[o.track],
    forWhom: o.solves.join(" · "),
    whatYouGet: o.oneLine,
    features: applyOnly
      ? ["3–5 year mentorship · up to ~100 sessions", "A dedicated counsellor who stays for years", "Application only · a custom proposal follows a conversation"]
      : offeringFeatures(o),
    cta: applyOnly ? "Apply" : o.inr === 0 ? "Start free" : "Buy now",
    applyOnly,
    applyHref: applyOnly ? applyHrefFor(o.id) : undefined,
  }
})

export const PRODUCTS: Product[] = [
  ...PRODUCTS_2026,
  // ── instant assessments ────────────────────────────────────────────────────
  {
    id: "career_clarity",
    name: "Career Clarity Index",
    category: "assessment",
    tagline: "A free 3-minute check on how clear your direction is.",
    priceFrom: 0,
    accent: "well",
    duration: "3 min",
    mode: "Online",
    forWhom: "Anyone who wants a quick, free read on where they stand.",
    whatYouGet: "A short scientific self-check and an instant clarity score.",
    benefits: "A no-cost starting point before you go deeper.",
    features: ["3-minute assessment", "Instant clarity score", "No card needed"],
    cta: "Start free",
  },
  {
    id: "stream_selector",
    name: "Stream Selector",
    category: "assessment",
    tagline: "Find the one right academic stream for you, instantly.",
    priceFrom: 1990,
    accent: "brand",
    duration: "30 min",
    mode: "Online · 38 cities",
    forWhom: "Students choosing between streams after 10th.",
    whatYouGet: "A 30-minute psychometric test and a report recommending your best-fit stream from 7 options.",
    benefits: "Avoid years of effort in the wrong direction by choosing the right stream early.",
    features: ["7 streams analysed", "30-min validated test", "Best-fit stream report"],
    cta: "Buy now",
  },
  {
    id: "job_domain",
    name: "Job Domain Selector",
    category: "assessment",
    tagline: "Know your perfect domain/industry of work, instantly.",
    priceFrom: 2499,
    accent: "mind",
    duration: "30 min",
    mode: "Online · 38 cities",
    forWhom: "For those who want to know their perfect domain/industry of work, instantly.",
    whatYouGet: "An international-level psychometric test (30 mins) and a report with your top three domain options in descending order of your fitment.",
    benefits: "Awareness of your top three career domains can significantly boost your job satisfaction, streamline your job search, and provide clarity for your long-term professional journey.",
    features: ["22 domains analysed", "30-min international-level test", "Top 3 domains, ranked by fit"],
    cta: "Buy now",
  },
  {
    id: "diy_career",
    name: "DIY Career",
    category: "assessment",
    tagline: "Know more about yourself, instantly — explore your career on your own.",
    priceFrom: 3990,
    accent: "brand",
    duration: "Self-paced",
    mode: "Online",
    forWhom: "For those who want to know more about themselves, instantly.",
    whatYouGet: "International-level psychometric tests and reports for self-analysis.",
    benefits: "Understanding your passion, personality and competencies to explore your career on your own.",
    features: ["Full psychometric battery", "Detailed self-analysis reports", "Explore careers independently"],
    cta: "Buy now",
  },

  // ── consultation ───────────────────────────────────────────────────────────
  {
    id: "consultation",
    name: "Consultation",
    category: "consultation",
    tagline: "A 30-minute video meet to diagnose your concern.",
    priceFrom: 499,
    priceLabel: "₹499 / ₹699",
    accent: "brand",
    duration: "30 min",
    mode: "Online / Offline · 38 cities",
    cta: "Book now",
    tiers: [
      {
        id: "consultation_student", name: "Student", price: 499, summary: "30-min video meet with a career counsellor.",
        features: [f("For", "Students"), f("Duration", "30 min"), f("What", "Diagnose your concern + problem statement"), f("Mode", "Online / Offline")],
      },
      {
        id: "consultation_executive", name: "Executive", price: 699, summary: "30-min video meet for working professionals.",
        features: [f("For", "Working professionals"), f("Duration", "30 min"), f("What", "Diagnose your concern + problem statement"), f("Mode", "Online / Offline")],
      },
    ],
  },

  // ── career success packages ────────────────────────────────────────────────
  {
    id: "success_package",
    name: "Career Success Packages",
    category: "package",
    tagline: "Assessment of passion & potential, report analysis, and a discussion on your options.",
    priceFrom: 5990,
    accent: "brand",
    duration: "1–6 days",
    mode: "Online / Offline · 38 cities",
    cta: "Choose package",
    tiers: [
      {
        id: "accelerator", name: "Accelerator (A)", price: 5990,
        summary: "Solution to your best higher-studies options — subjects, courses, degree and specialization.",
        features: [
          f("Assessments", "Interest + Personality"), f("Sessions", "1 (45-min)"), f("Time-frame", "1–2 days"),
          f("Session 1", "45-min discussion on best education options + Q&A"), f("Certificate", "—"),
          f("Best for", "Avoiding effort in the wrong direction"),
        ],
      },
      {
        id: "big_picture", name: "Big Picture (B)", price: 8990, highlight: true,
        summary: "Accelerator + solution to your best long-term job & career fitment options.",
        features: [
          f("Assessments", "Interest + Personality"), f("Sessions", "3 (60 + 60 + 15-min)"), f("Time-frame", "2–4 days"),
          f("Session 1", "60-min detailed report explanation + Q&A"), f("Session 2", "60-min discussion on each education & job option + Q&A"),
          f("Session 3", "15-min follow-up to clarify doubts"), f("Certificate", "—"),
        ],
      },
      {
        id: "true_north", name: "True North (C)", price: 13990,
        summary: "Big Picture + strategizing success in career & life with Dr. Rathi.",
        features: [
          f("Assessments", "Interest + Personality"), f("Sessions", "3 (60 + 60 + 45-min)"), f("Time-frame", "4–6 days"),
          f("Session 1", "60-min detailed report explanation + Q&A"), f("Session 2", "60-min deep-dive on each education & job option with Dr. Rathi + Q&A"),
          f("Session 3", "45-min customized career success strategy & action-plan with Dr. Rathi + Q&A"), f("Certificate", "Passion Certificate"),
        ],
      },
    ],
  },

  // ── admission assistance ───────────────────────────────────────────────────
  {
    id: "admission",
    name: "Admission Assistance",
    category: "admission",
    tagline: "Shortlist colleges, check eligibility, and get application support.",
    priceFrom: 4990,
    accent: "mind",
    mode: "Indian colleges",
    cta: "Choose plan",
    tiers: [
      {
        id: "admission_basic", name: "Basic", price: 4990,
        summary: "Fast & specific support for a course in 1 Indian city.",
        features: [
          f("Sessions", "2 (30–45 min)"), f("Validity", "1 month"), f("Colleges", "10–20"),
          f("Coverage", "Specific course, 1 city"), f("Eligibility + website links", "✓"), f("Follow-up call", "✗"),
        ],
      },
      {
        id: "admission_advance", name: "Advance", price: 9990, highlight: true,
        summary: "Basic + more discussion, admission prediction across up to 4 cities.",
        features: [
          f("Sessions", "4 (30–45 min)"), f("Validity", "3 months"), f("Colleges", "20–30"),
          f("Coverage", "Specific course, up to 4 cities"), f("Follow-up + admission prediction", "✓"), f("Fee info", "Approximate"),
        ],
      },
      {
        id: "admission_premium", name: "Premium", price: 89990,
        summary: "Advance + research + application filling, till admission.",
        features: [
          f("Sessions", "8 (30–45 min)"), f("Validity", "Till admission (max 12 months)"), f("Colleges", "30–40"),
          f("Coverage", "2 courses, up to 8 cities"), f("Application filling support", "✓"), f("Fee info + college contacts", "Exact"),
        ],
      },
    ],
  },

  // ── ongoing / other services ───────────────────────────────────────────────
  {
    id: "psych_consult",
    name: "Psychological Counselling",
    category: "ongoing",
    tagline: "Confidential 1:1 support for wellbeing alongside your career.",
    priceFrom: 1199,
    accent: "well",
    duration: "Per session",
    mode: "Online / Offline · 38 cities",
    forWhom: "Anyone who wants confidential mental-health and wellbeing support.",
    whatYouGet: "A 1:1 session with a counselling psychologist.",
    benefits: "Steadier reserves and clearer thinking make every career decision better.",
    features: ["1:1 with a psychologist", "Confidential", "₹1,199 per session"],
    cta: "Book now",
  },
  {
    id: "coaching_mentoring",
    name: "Coaching & Mentoring",
    category: "ongoing",
    tagline: "1:1 mentoring over 1–3 years to develop personality, portfolio and goals.",
    priceFrom: 150000,
    priceLabel: "₹1.5L+",
    accent: "brand",
    duration: "1–3 years",
    mode: "Online / Offline / Hybrid",
    forWhom: "Those wanting end-to-end, long-term career development.",
    whatYouGet: "25–100 sessions of 1:1 mentoring across 1–3 years.",
    benefits: "Develop personality, portfolio, and address short- and long-term career goals.",
    features: ["25–100 sessions", "Personality + portfolio", "Short & long-term goals"],
    cta: "Enquire",
  },
  {
    id: "personality_dev",
    name: "Personality Development",
    category: "ongoing",
    tagline: "Communication, presence, CV writing and interview skills.",
    priceFrom: 2500,
    accent: "warn",
    duration: "Per session / assignment",
    mode: "Online / Offline · 38 cities",
    forWhom: "Students and professionals sharpening how they present themselves.",
    whatYouGet: "Personality development, CV writing, and interview-skills coaching.",
    benefits: "Show up sharper in interviews, applications and at work.",
    features: ["CV writing", "Interview skills", "~₹2,500 / session"],
    cta: "Book now",
  },

  // ── add-on ─────────────────────────────────────────────────────────────────
  {
    id: "additional_session",
    name: "Additional Session",
    category: "addon",
    tagline: "Discuss your suggested options again, any time.",
    priceFrom: 2990,
    accent: "mind",
    duration: "60 min",
    mode: "Online / Offline",
    forWhom: "For those who have taken our career success package in the past and want to discuss more about the suggested options.",
    whatYouGet: "You get to review and re-consider the options suggested to you during the last session. All your doubts get cleared.",
    benefits: "Your mind gets influenced or changed over a period of time. Periodic discussion saves you from taking a wrong career decision.",
    features: ["60-min session", "Reports already available", "Re-confirm or pivot confidently"],
    cta: "Buy now",
  },
]

export const getProduct = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id)

// NOTE: a function declaration (not a const arrow) so it HOISTS — PRODUCTS_2026 above
// calls fmtINR at module-eval time, which would hit the const's temporal dead zone and
// crash the whole app on load (blank #root on every route). Hoisting fixes that.
export function fmtINR(n: number): string {
  return n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`
}

/** Grouped for the catalogue page, in display order — the 2026 catalog leads;
 *  the pre-2026 products stay purchasable under "Earlier catalog". */
export const PRODUCT_GROUPS: { key: ProductCategory; label: string; blurb: string }[] = [
  { key: "journey2026", label: "The Student Journey", blurb: "The 2026 programmes — from first clarity to full career architecture." },
  { key: "professional2026", label: "For professionals", blurb: "Pivot, promotion and leadership-level reinvention." },
  { key: "marketplace2026", label: "Marketplace & add-ons", blurb: "Experts, admissions help and extra sessions." },
  { key: "longterm2026", label: "Long-term programmes", blurb: "Blueprint & Autobiography — multi-year mentorship, by application." },
  { key: "assessment", label: "Earlier catalog · Instant assessments", blurb: "Scientific tests with instant reports." },
  { key: "consultation", label: "Earlier catalog · Consultation", blurb: "Talk to a counsellor about your concern." },
  { key: "package", label: "Earlier catalog · Career success packages", blurb: "Assessment, report and guided discussion." },
  { key: "admission", label: "Earlier catalog · Admission assistance", blurb: "Shortlist colleges and get in." },
  { key: "ongoing", label: "Earlier catalog · Ongoing support", blurb: "Wellbeing, mentoring and skills." },
  { key: "addon", label: "Earlier catalog · Add-ons", blurb: "Top up your guidance any time." },
]
