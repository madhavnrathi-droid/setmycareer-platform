// The real SetMyCareer product catalogue — transcribed from the client-dashboard
// source of truth (counselor/src/portal/products.ts). This is what the marketing
// site offers; prices and contents match the portal exactly. Purchases complete
// in the portal (Razorpay), so paid CTAs route there; free/booking routes stay
// on-site.

import { PORTAL_URL } from "@/lib/api"

export type ProductCategory = "assessment" | "consultation" | "expert" | "package" | "admission" | "ongoing" | "addon"

export interface ProductTier {
  id: string
  name: string
  price: number // INR
  highlight?: boolean
  summary: string
  features: { label: string; value: string }[]
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  tagline: string
  priceFrom: number // lowest INR; 0 = free
  priceLabel?: string
  forWhom?: string
  whatYouGet?: string
  benefits?: string
  duration?: string
  mode?: string
  features?: string[]
  tiers?: ProductTier[]
  cta: string
}

const f = (label: string, value: string) => ({ label, value })

export const PRODUCTS: Product[] = [
  {
    id: "career_clarity", name: "Career Clarity Index", category: "assessment",
    tagline: "A free structured check on how clear the direction really is.", priceFrom: 0,
    duration: "10–20 min", mode: "Online",
    forWhom: "Parents of students aged 10–18, and working professionals.",
    whatYouGet: "A structured self-check and instant readiness scores.",
    benefits: "A no-cost starting point before you go deeper.",
    features: ["Structured self-report", "Instant readiness scores", "No card needed"], cta: "Start free",
  },
  {
    id: "stream_selector", name: "Stream Selector", category: "assessment",
    tagline: "Find the one right academic stream for you, instantly.", priceFrom: 1990,
    duration: "30 min", mode: "Online · 38 cities",
    forWhom: "Students choosing between streams after 10th.",
    whatYouGet: "A 30-minute psychometric test and a report recommending your best-fit stream from 7 options.",
    benefits: "Avoid years of effort in the wrong direction by choosing the right stream early.",
    features: ["7 streams analysed", "30-min validated test", "Best-fit stream report"], cta: "Buy now",
  },
  {
    id: "job_domain", name: "Job Domain Selector", category: "assessment",
    tagline: "Know your perfect domain/industry of work, instantly.", priceFrom: 2499,
    duration: "30 min", mode: "Online · 38 cities",
    forWhom: "Those who want to know their perfect domain/industry of work.",
    whatYouGet: "An international-level psychometric test (30 mins) and a report with your top three domain options, ranked by fit.",
    benefits: "Clarity on your top three domains boosts job satisfaction and streamlines your search.",
    features: ["22 domains analysed", "30-min international-level test", "Top 3 domains, ranked by fit"], cta: "Buy now",
  },
  {
    id: "diy_career", name: "DIY Career", category: "assessment",
    tagline: "Explore your career on your own with full psychometrics.", priceFrom: 3990,
    duration: "Self-paced", mode: "Online",
    forWhom: "Those who want to know more about themselves and explore independently.",
    whatYouGet: "International-level psychometric tests and reports for self-analysis.",
    benefits: "Understand your passion, personality and competencies to explore careers on your own.",
    features: ["Full psychometric battery", "Detailed self-analysis reports", "Explore careers independently"], cta: "Buy now",
  },
  {
    id: "consultation", name: "Consultation", category: "consultation",
    tagline: "A 30-minute video meet to diagnose your concern.", priceFrom: 499, priceLabel: "₹499 / ₹699",
    duration: "30 min", mode: "Online / Offline · 38 cities", cta: "Book now",
    tiers: [
      { id: "consultation_student", name: "Student", price: 499, summary: "30-min video meet with a career counsellor.", features: [f("For", "Students"), f("Duration", "30 min"), f("What", "Diagnose your concern"), f("Mode", "Online / Offline")] },
      { id: "consultation_executive", name: "Executive", price: 699, summary: "30-min video meet for working professionals.", features: [f("For", "Working professionals"), f("Duration", "30 min"), f("What", "Diagnose your concern"), f("Mode", "Online / Offline")] },
    ],
  },
  {
    id: "expert_session", name: "Expert Session", category: "expert",
    tagline: "Forty-five minutes with a senior domain expert — a practitioner in your field, not a generalist.", priceFrom: 2990,
    duration: "45 min", mode: "Online",
    forWhom: "Anyone who wants field-level advice on a specific role, industry or move — students, graduates and working professionals.",
    whatYouGet: "A 45-minute 1:1 with a vetted domain expert matched to your field: someone who has done the exact work and can speak to it in detail.",
    benefits: "Counselling sets your direction; an expert session gives you the inside detail only a practitioner has. Book it on its own, or add it to any package.",
    features: ["45-min 1:1 with a specialist", "Matched to your field", "Standalone or add-on"], cta: "Book an expert",
  },
  {
    id: "success_package", name: "Career Success Packages", category: "package",
    tagline: "Assessment of passion & potential, report analysis, and a guided discussion on your options.", priceFrom: 5990,
    duration: "1–6 days", mode: "Online / Offline · 38 cities", cta: "Choose package",
    tiers: [
      { id: "accelerator", name: "Accelerator", price: 5990, summary: "Your best higher-studies options — subjects, courses, degree and specialization.",
        features: [f("Assessments", "Interest + Personality"), f("Sessions", "1 × 45-min"), f("Time-frame", "1–2 days"), f("Best for", "Choosing the right education path")] },
      { id: "big_picture", name: "Big Picture", price: 8990, highlight: true, summary: "Accelerator + your best long-term job & career fitment options.",
        features: [f("Assessments", "Interest + Personality"), f("Sessions", "3 × (60 + 60 + 15-min)"), f("Time-frame", "2–4 days"), f("Best for", "Education AND career direction")] },
      { id: "true_north", name: "True North", price: 13990, summary: "Big Picture + strategizing success in career & life with Dr. Rathi.",
        features: [f("Assessments", "Interest + Personality"), f("Sessions", "3 × (60 + 60 + 45-min)"), f("Time-frame", "4–6 days"), f("With", "Dr. Rathi + Passion Certificate")] },
    ],
  },
  {
    id: "psych_consult", name: "Psychological Counselling", category: "ongoing",
    tagline: "Confidential 1:1 support for wellbeing alongside your career.", priceFrom: 1199,
    duration: "Per session", mode: "Online / Offline · 38 cities",
    whatYouGet: "A 1:1 session with a counselling psychologist.",
    benefits: "Steadier reserves and clearer thinking make every career decision better.",
    features: ["1:1 with a psychologist", "Confidential", "₹1,199 per session"], cta: "Book now",
  },
  {
    id: "coaching_mentoring", name: "Coaching & Mentoring", category: "ongoing",
    tagline: "1:1 mentoring over 1–3 years to build personality, portfolio and goals.", priceFrom: 150000, priceLabel: "₹1.5L+",
    duration: "1–3 years", mode: "Online / Offline / Hybrid",
    whatYouGet: "25–100 sessions of 1:1 mentoring across 1–3 years.",
    benefits: "Develop personality, portfolio, and address short- and long-term goals.",
    features: ["25–100 sessions", "Personality + portfolio", "Short & long-term goals"], cta: "Enquire",
  },
  {
    id: "personality_dev", name: "Personality Development", category: "ongoing",
    tagline: "Communication, presence, CV writing and interview skills.", priceFrom: 2500,
    duration: "Per session", mode: "Online / Offline · 38 cities",
    whatYouGet: "Personality development, CV writing, and interview-skills coaching.",
    benefits: "Show up sharper in interviews, applications and at work.",
    features: ["CV writing", "Interview skills", "~₹2,500 / session"], cta: "Book now",
  },
  {
    id: "additional_session", name: "Additional Session", category: "addon",
    tagline: "Revisit your suggested options with a counsellor, any time.", priceFrom: 2990,
    duration: "60 min", mode: "Online / Offline",
    forWhom: "Anyone who has taken a career package and wants to discuss the options again.",
    whatYouGet: "Review and re-consider the options from your last session; clear every doubt.",
    benefits: "Minds change over time — a periodic discussion saves you from a wrong turn.",
    features: ["60-min session", "Reports already available", "Re-confirm or pivot confidently"], cta: "Buy now",
  },
]

export const PRODUCT_GROUPS: { key: ProductCategory; label: string; blurb: string }[] = [
  { key: "assessment", label: "Instant assessments", blurb: "Validated tests, instant reports." },
  { key: "consultation", label: "Consultation", blurb: "Talk to a counsellor about your concern." },
  { key: "expert", label: "Expert sessions", blurb: "Field-level advice from a domain specialist." },
  { key: "package", label: "Career success packages", blurb: "Assessment, report and guided discussion." },
  { key: "ongoing", label: "Ongoing support", blurb: "Wellbeing, mentoring and skills." },
  { key: "addon", label: "Add-ons", blurb: "Top up your guidance any time." },
]

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id)
export const fmtINR = (n: number) => (n === 0 ? "Free" : n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 ? 2 : 1)}L` : `₹${n.toLocaleString("en-IN")}`)

// where a "buy/start" CTA goes: the free index + booking stay on-site; every paid
// product completes checkout in the portal.
export const buyHref = (p: Product) =>
  p.id === "career_clarity" ? "/cri" : p.category === "consultation" || p.category === "addon" || p.category === "expert" ? "/book" : PORTAL_URL
