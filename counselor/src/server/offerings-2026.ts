// The 2026 product catalog — the counselor-side mirror of the marketing site's
// src/content/offerings.ts (same ids, same prices; keep the two in lock-step).
// Consumed by: the portal (credit grants on purchase), the chatbot personas
// (catalog knowledge + packageCard grounding), and the admin (new-vs-legacy
// product segregation). Money amounts here are RUPEES; api/razorpay.ts keeps its
// own self-contained PRICES in paise (Node serverless cannot import this module).
//
// CAREER CREDITS are the proprietary AI allowance (never exposed as messages/
// minutes on marketing surfaces): careerCredits ≈ chat interactions, voiceCredits
// ≈ voice minutes. Exact conversion lives in FAQ/terms only and may change.

export type Track2026 = "student" | "professional" | "marketplace" | "custom"

export interface Offering2026 {
  id: string
  track: Track2026
  name: string
  inr: number                 // rupees; 0 = free
  usd?: number
  sessions: number
  careerCredits: number
  voiceCredits: number
  memory?: string
  featured?: boolean
  oneLine: string
  solves: string[]
  certificates?: string[]
}

export const OFFERINGS_2026: Offering2026[] = [
  // student journey
  { id: "free_cri", track: "student", name: "Career Clarity Index", inr: 0, sessions: 0, careerCredits: 0, voiceCredits: 0, memory: "Session only",
    oneLine: "Free ~4-minute readiness check — the journey's starting point.", solves: ["Where do I stand?"] },
  { id: "sj_navigator", track: "student", name: "Career Navigator", inr: 2990, usd: 99, sessions: 0, careerCredits: 100, voiceCredits: 60, memory: "Tests & reports",
    oneLine: "Digital-only toolkit: all three assessments, reports, dashboard and the AI copilot — no counsellor.", solves: ["Which careers fit me?", "What should I study?"] },
  { id: "sj_consult_student", track: "student", name: "Consultation · Student", inr: 3000, sessions: 1, careerCredits: 0, voiceCredits: 0,
    oneLine: "60-minute diagnosis with a certified counsellor; ends with a recommendation of the right programme.", solves: ["What do I actually need?"] },
  { id: "sj_accelerator", track: "student", name: "Accelerator", inr: 7990, usd: 499, sessions: 1, careerCredits: 200, voiceCredits: 90, memory: "Tests, reports & sessions",
    oneLine: "One major decision settled — stream, degree, college or career — with 1 recorded session and an action plan.", solves: ["Stream", "Degree", "College", "Career"],
    certificates: ["Career Direction Certificate"] },
  { id: "sj_big_picture", track: "student", name: "Big Picture", inr: 14990, usd: 899, sessions: 3, careerCredits: 350, voiceCredits: 180, memory: "Persistent case memory", featured: true,
    oneLine: "MOST POPULAR — 3 sessions, advanced report, admission strategy, a parent session and priority support.", solves: ["Multiple options", "Parents", "College & abroad", "Future planning", "Decision anxiety"],
    certificates: ["Career Fit", "Education Fit"] },
  { id: "sj_true_north", track: "student", name: "True North", inr: 29990, usd: 1995, sessions: 5, careerCredits: 750, voiceCredits: 360, memory: "Long-term personal profile",
    oneLine: "Complete career architecture with a senior counsellor — up to 5 sessions, Career Intelligence Profile, six-month review.", solves: ["Anything a career can ask"],
    certificates: ["Career Fit", "Job Market Fit", "Learning Profile"] },
  // professional track
  { id: "pro_consult", track: "professional", name: "Consultation · Professional", inr: 4000, sessions: 1, careerCredits: 0, voiceCredits: 0,
    oneLine: "60-minute working session with a senior counsellor on where your career stands.", solves: ["What's my right next programme?"] },
  { id: "pro_pivot", track: "professional", name: "Pivot", inr: 24990, usd: 1295, sessions: 3, careerCredits: 750, voiceCredits: 300, memory: "Professional profile",
    oneLine: "A structured career switch — MBA, promotion, break or relocation — with 3 sessions and an executive resume.", solves: ["Career switch", "MBA", "Promotion", "Break", "Relocation"],
    certificates: ["Professional Certificate"] },
  { id: "pro_directors_cut", track: "professional", name: "Director's Cut", inr: 59990, usd: 2995, sessions: 5, careerCredits: 1200, voiceCredits: 600, memory: "Executive knowledge base",
    oneLine: "Leadership-level reinvention — CXO, founder, board — 5 sessions of executive strategy.", solves: ["Leadership transitions", "CXO moves", "Reinvention"],
    certificates: ["Leadership Certificates"] },
  // marketplace
  { id: "mk_meet_expert", track: "marketplace", name: "Meet an Expert", inr: 2990, usd: 149, sessions: 1, careerCredits: 0, voiceCredits: 0,
    oneLine: "45–60 minutes with a practitioner who has done the career (doctors, engineers, founders, pilots, designers, lawyers, PMs, researchers). Starts at ₹2,990.", solves: ["What is this career really like?"] },
  { id: "sj_extra_session", track: "marketplace", name: "Additional Session · Student", inr: 1990, sessions: 1, careerCredits: 0, voiceCredits: 0,
    oneLine: "One more 60-minute session with your counsellor.", solves: ["One more conversation"] },
  { id: "pro_extra_session", track: "marketplace", name: "Additional Session · Professional", inr: 2990, sessions: 1, careerCredits: 0, voiceCredits: 0,
    oneLine: "One more 60-minute session with your senior counsellor.", solves: ["One more conversation"] },
  // long-term programs (application only — custom quote, no online checkout)
  { id: "lt_blueprint", track: "custom", name: "Blueprint", inr: 140000, sessions: 0, careerCredits: 0, voiceCredits: 0,
    oneLine: "The STUDENT long-term programme — a 3–5 year mentorship (up to ~100 sessions). Application-only, custom quote from ~₹1.4L; apply at /programs/blueprint.", solves: ["Multi-year student guidance", "Study-abroad planning", "Full education roadmap"] },
  { id: "lt_autobiography", track: "custom", name: "Autobiography", inr: 260000, sessions: 0, careerCredits: 0, voiceCredits: 0,
    oneLine: "The EXECUTIVE long-term programme — a 3–5 year senior advisory partnership (up to ~100 sessions). Application-only, custom quote from ~₹2.6L; apply at /programs/autobiography.", solves: ["Multi-year leadership arc", "Founder & CXO reinvention"] },
]

/** AI credit top-ups (the add-on store). */
export const CREDIT_PACKS_2026 = [
  { id: "cc_100", name: "100 Career Credits", unit: "career" as const, amount: 100, inr: 499 },
  { id: "cc_250", name: "250 Career Credits", unit: "career" as const, amount: 250, inr: 999 },
  { id: "cc_500", name: "500 Career Credits", unit: "career" as const, amount: 500, inr: 1799 },
  { id: "vc_60", name: "60 Voice Credits", unit: "voice" as const, amount: 60, inr: 799 },
  { id: "vc_120", name: "120 Voice Credits", unit: "voice" as const, amount: 120, inr: 1499 },
]

export const offering2026ById = (id?: string) => OFFERINGS_2026.find((o) => o.id === id)

/** Set of NEW-catalog razorpay tier ids (offerings + packs) — for admin new-vs-legacy segregation. */
export const NEW_TIER_IDS = new Set<string>([...OFFERINGS_2026.map((o) => o.id), ...CREDIT_PACKS_2026.map((p) => p.id)])

/** Compact catalog brief for the AI personas (visitor/client) — ground truth for
 *  package questions. Prices are real; AI allowances are stated as Career/Voice
 *  Credits ("AI Career Copilot included"), never messages or minutes. */
export const CATALOG_2026_BRIEF: string = [
  "=== SETMYCAREER PROGRAMMES & PRICING (2026 catalog — ground truth; never invent prices) ===",
  "THE STUDENT JOURNEY (in order): Free Career Clarity Index (/cri) → Career Navigator ₹2,990 (digital-only: 3 assessments + reports + dashboard + AI copilot 100 Career Credits/60 Voice Credits) → Consultation ₹3,000 (60-min diagnosis) → Accelerator ₹7,990 (1 session + action plan; AI 200/90) → THE BIG PICTURE ₹14,990 ⭐ MOST POPULAR (3 sessions + advanced report + admission strategy + parent session; AI 350/180, persistent memory) → True North ₹29,990 (senior counsellor, up to 5 sessions, Career Intelligence Profile; AI 750/360).",
  "PROFESSIONALS: Consultation ₹4,000 → Pivot ₹24,990 (career switch/MBA/promotion; 3 sessions, executive resume; AI 750/300) → Director's Cut ₹59,990 (CXO/founder-level, 5 sessions; AI 1,200/600).",
  "MARKETPLACE: Meet an Expert from ₹2,990 (45–60 min with a practitioner) · Additional sessions ₹1,990 student / ₹2,990 professional. There is NO admission-assistance product — if asked, admission strategy is part of Big Picture and above.",
  "LONG-TERM PROGRAMMES (application only, custom quote, NO online checkout — direct people to apply, don't quote a fixed price): Blueprint = the STUDENT 3–5 year mentorship (up to ~100 sessions; from ~₹1.4L; apply at /programs/blueprint). Autobiography = the EXECUTIVE 3–5 year senior advisory partnership (from ~₹2.6L; apply at /programs/autobiography). These grew out of SetMyCareer's Visionary Career Leadership Program (VCLP). Position them as aspirational; recommend them only for genuinely multi-year / high-complexity situations and send the person to apply.",
  "AI allowances: describe as 'AI Career Copilot included' with Career Credits (chat) and Voice Credits (voice). NEVER translate credits into message counts or minutes — consumption rules live in the FAQ/terms and may change. Credit top-ups exist (from ₹499).",
  "Guidance: recommend by SITUATION, not budget — one clear decision → Accelerator; multiple options/parents/abroad → Big Picture (the default recommendation); long-horizon/complex student → True North, or the Blueprint long-term programme for a multi-year 8th–PG journey; working professional switch → Pivot; leadership reinvention → Director's Cut, or the Autobiography long-term programme for a multi-year executive arc; just exploring → free CRI, then Career Navigator.",
  "=== END CATALOG ===",
].join("\n")
