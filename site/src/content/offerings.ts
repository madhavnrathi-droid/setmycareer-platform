// The 2026 product ecosystem — the ONE canonical catalog the pricing page,
// checkout flow, chatbot cards and comparison grids all draw from. Built as a
// CUSTOMER JOURNEY, not a product list: Free → Navigator → Consultation →
// Accelerator → Big Picture ⭐ → True North, with a parallel professional
// track (up to Director's Cut), a marketplace, and two application-only
// LONG-TERM programmes (Blueprint for students, Autobiography for executives).
//
// PRICING RULES (from the pricing-strategy brief):
// · Never expose backend AI limits as "messages/minutes" — AI is sold as
//   "AI Career Copilot included" with CAREER CREDITS + VOICE CREDITS beneath
//   (a proprietary allowance; exact consumption rules live in FAQ/terms only).
// · Big Picture is the anchor tier (Most Popular). Blueprint & Autobiography
//   are the aspirational anchors: no price, no feature table — application only.
// · tier ids are NEW (sj_/pro_/mk_/lt_/cc_/vc_ namespaces) and must match the
//   counselor api/razorpay.ts PRICES keys 1:1 — legacy ids stay untouched.

export type Track = "student" | "professional" | "marketplace" | "custom"

export interface OfferingAI {
  headline: string            // e.g. "AI Career Copilot included"
  careerCredits: number       // chat allowance (proprietary unit)
  voiceCredits: number        // voice allowance (~1 credit ≈ 1 minute; not stated on site)
  memory: string              // what the copilot remembers
}

export interface Offering {
  id: string                  // razorpay tier id (counselor PRICES key)
  track: Track
  order: number               // position on the journey ladder
  name: string
  price: { inr: number; usd?: number }  // rupees (not paise)
  priceNote?: string          // "starts at", "per session", etc.
  featured?: boolean          // Big Picture ⭐
  tagline: string             // one calm line under the name
  bestFor: string             // "I want clarity before talking to someone."
  solves: string[]            // the decisions/problems it answers
  includes: string[]          // headline inclusions (grouped, short)
  sessions: number            // human counselling sessions included
  ai?: OfferingAI             // absent = no AI copilot bundled
  certificates?: string[]
  cta: string                 // button label
}

// ── the student journey (the core ladder) ───────────────────────────────────
export const STUDENT_JOURNEY: Offering[] = [
  {
    id: "free_cri", track: "student", order: 0,
    name: "Career Clarity Index", price: { inr: 0 }, cta: "Take the free test",
    tagline: "Do you really need career counselling? Find out free, in about four minutes.",
    bestFor: "Anyone who wants a first, honest read before spending a rupee.",
    solves: ["Where do I stand?", "Am I ready to decide?"],
    includes: [
      "Career Clarity Assessment", "Basic dashboard", "Career Confidence Score",
      "AI demo", "Career & College Explorer previews", "Weekly career newsletter", "Save your profile",
    ],
    sessions: 0,
    ai: { headline: "AI demo", careerCredits: 0, voiceCredits: 0, memory: "This session only" },
  },
  {
    id: "sj_navigator", track: "student", order: 1,
    name: "Career Navigator", price: { inr: 2990, usd: 99 }, cta: "Start Navigator",
    tagline: "The complete digital toolkit — assessments, reports and the AI copilot. No counsellor.",
    bestFor: "“I want clarity before talking to someone.”",
    solves: ["Which careers actually fit me?", "What should I study?"],
    includes: [
      "All three assessments — Interest, Personality, Aptitude",
      "Career Snapshot + Top Career Matches reports",
      "Degree & subject suggestions",
      "Career dashboard — compare careers, colleges and degrees",
    ],
    sessions: 0,
    ai: { headline: "AI Career Copilot included", careerCredits: 100, voiceCredits: 60, memory: "Your tests & reports" },
  },
  {
    id: "sj_consult_student", track: "student", order: 2,
    name: "Consultation", price: { inr: 3000 }, priceNote: "60 minutes", cta: "Book a consultation",
    tagline: "A 60-minute diagnosis with a certified counsellor — then a clear recommendation.",
    bestFor: "You'd rather start by talking it through.",
    solves: ["What's my situation, really?", "Which programme do I actually need?"],
    includes: ["60-minute 1:1 with a certified counsellor", "Situation diagnosis", "A recommendation of the right next step", "Portal account with your notes & recommendation"],
    sessions: 1,
  },
  {
    id: "sj_accelerator", track: "student", order: 3,
    name: "Accelerator", price: { inr: 7990, usd: 499 }, cta: "Start Accelerator",
    tagline: "One major decision, settled — stream, degree, college or career.",
    bestFor: "One big question that needs a definitive answer.",
    solves: ["Stream", "Degree", "College", "Career"],
    includes: [
      "Everything in Career Navigator — all 3 assessments, reports & dashboard",
      "1 counselling session — recorded, transcribed, with counsellor notes",
      "A written action plan",
    ],
    sessions: 1,
    ai: { headline: "AI Career Copilot included", careerCredits: 200, voiceCredits: 90, memory: "Tests, reports & sessions" },
    certificates: ["Career Direction Certificate"],
  },
  {
    id: "sj_big_picture", track: "student", order: 4, featured: true,
    name: "Big Picture", price: { inr: 14990, usd: 899 }, cta: "Choose Big Picture",
    tagline: "The full map — every option weighed, parents included, anxiety handled.",
    bestFor: "Multiple options, family in the loop, plans that reach past one decision.",
    solves: ["Multiple career options", "Parents' questions", "College & study abroad", "Future planning", "Decision anxiety"],
    includes: [
      "Everything in Accelerator — assessments, reports & dashboard",
      "3 counselling sessions",
      "Advanced career report + admission strategy",
      "A dedicated parent session",
      "Priority support",
    ],
    sessions: 3,
    ai: { headline: "AI Career Copilot included", careerCredits: 350, voiceCredits: 180, memory: "Persistent case memory" },
    certificates: ["Career Fit", "Education Fit"],
  },
  {
    id: "sj_true_north", track: "student", order: 5,
    name: "True North", price: { inr: 29990, usd: 1995 }, cta: "Begin True North",
    tagline: "Complete career architecture, set with a senior counsellor.",
    bestFor: "When the answer has to hold for years, not a semester.",
    solves: ["Anything a career can ask"],
    includes: [
      "Everything in Big Picture — full battery & dashboard",
      "Up to 5 sessions with a senior counsellor",
      "Career Intelligence Profile + Future Skills Report",
      "Six-month review + priority booking",
    ],
    sessions: 5,
    ai: { headline: "AI Career Copilot included", careerCredits: 750, voiceCredits: 360, memory: "Long-term personal profile" },
    certificates: ["Career Fit", "Job Market Fit", "Learning Profile"],
  },
]

// ── the professional track ───────────────────────────────────────────────────
export const PROFESSIONAL: Offering[] = [
  {
    id: "pro_consult", track: "professional", order: 1,
    name: "Consultation", price: { inr: 4000 }, priceNote: "60 minutes", cta: "Book a consultation",
    tagline: "A 60-minute working session on where your career stands — and what it needs next.",
    bestFor: "Professionals who want a diagnosis before committing.",
    solves: ["Where am I, honestly?", "What's the right programme for me?"],
    includes: ["60-minute 1:1 with a senior counsellor", "Situation diagnosis", "A recommendation of the right next step", "Portal account with your notes & recommendation"],
    sessions: 1,
  },
  {
    id: "pro_pivot", track: "professional", order: 2,
    name: "Pivot", price: { inr: 24990, usd: 1295 }, cta: "Start Pivot",
    tagline: "A structured career switch — MBA, promotion, break or relocation.",
    bestFor: "A working professional changing direction with real stakes.",
    solves: ["Career switch", "MBA decision", "Promotion path", "Career break", "Relocation"],
    includes: ["3 sessions with a senior counsellor", "Full assessment battery — professional norms", "Executive resume + written transition plan", "Career dashboard & portal access"],
    sessions: 3,
    ai: { headline: "AI Career Copilot included", careerCredits: 750, voiceCredits: 300, memory: "Professional profile" },
    certificates: ["Professional Certificate"],
  },
  {
    id: "pro_directors_cut", track: "professional", order: 3,
    name: "Director's Cut", price: { inr: 59990, usd: 2995 }, cta: "Begin Director's Cut",
    tagline: "Career reinvention at the leadership level — CXO, founder, board.",
    bestFor: "Leaders whose next move shapes an organisation, not just a CV.",
    solves: ["Leadership transitions", "CXO moves", "Founder decisions", "Career reinvention"],
    includes: ["5 sessions of executive strategy", "Executive assessment battery + private dashboard", "Executive positioning & narrative", "Leadership development plan"],
    sessions: 5,
    ai: { headline: "AI Career Copilot included", careerCredits: 1200, voiceCredits: 600, memory: "Executive knowledge base" },
    certificates: ["Leadership Certificates"],
  },
]

// ── the marketplace (standalone or add-on) ───────────────────────────────────
export const MARKETPLACE: Offering[] = [
  {
    id: "mk_meet_expert", track: "marketplace", order: 1,
    name: "Meet an Expert", price: { inr: 2990, usd: 149 }, priceNote: "starts at", cta: "Browse experts",
    tagline: "45–60 minutes with someone who has done the career you're weighing.",
    bestFor: "A real conversation with a practitioner, not a brochure.",
    solves: ["What is this career actually like?"],
    includes: ["Doctors · Engineers · Founders · Pilots · Designers · Lawyers · Product managers · Researchers", "45–60 minute session", "Standalone, or added to any programme"],
    sessions: 1,
  },
  {
    id: "sj_extra_session", track: "marketplace", order: 2,
    name: "Additional Session · Student", price: { inr: 1990 }, priceNote: "per session", cta: "Add a session",
    tagline: "One more hour with your counsellor, whenever you need it.",
    bestFor: "Existing members who want another conversation.",
    solves: ["One more decision to talk through"],
    includes: ["One 60-minute counselling session"],
    sessions: 1,
  },
  {
    id: "pro_extra_session", track: "marketplace", order: 3,
    name: "Additional Session · Professional", price: { inr: 2990 }, priceNote: "per session", cta: "Add a session",
    tagline: "One more hour with your senior counsellor.",
    bestFor: "Existing professional members.",
    solves: ["One more decision to talk through"],
    includes: ["One 60-minute session with a senior counsellor"],
    sessions: 1,
  },
]

// ── the long-term programs — application only, priced by custom proposal ──────
// The two multi-year engagements that grew out of SetMyCareer's Visionary Career
// Leadership Program (VCLP): a student track (Blueprint) and an executive track
// (Autobiography). Not bought online — you apply, we talk, and a bespoke roadmap
// + quote follows. Consumed by the /programs/<slug> pages + the application form.
export interface LongTermProgram {
  id: string          // razorpay-namespaced id (used only as a lead tag; no checkout)
  slug: string        // /programs/<slug>
  audience: "student" | "executive"
  name: string
  eyebrow: string     // "Long-term · Students"
  tagline: string
  positioning: string
  body: string[]
  /** the problems it answers — stat-anchored, from the VCLP research */
  problems: { stat: string; label: string }[]
  /** who it's for */
  forWhom: string[]
  /** the six development pillars (VCLP's 6 areas / 30 sub-areas, condensed) */
  pillars: { title: string; detail: string }[]
  /** what a bespoke roadmap can include */
  canInclude: string[]
  horizon: string     // "3–5 years · up to 100 sessions"
  priceFrom: number   // indicative starting INR (custom quote after discovery)
  priceNote: string
  offeringId: string  // gradient palette id reused for the hero
}

export const LONGTERM: LongTermProgram[] = [
  {
    id: "lt_blueprint", slug: "blueprint", audience: "student",
    name: "Blueprint", eyebrow: "Long-term · Students & parents",
    tagline: "The multi-year plan for a life still being drawn.",
    positioning: "A 3–5 year mentorship for students building a career — and a life — from the ground up, not one decision at a time.",
    body: [
      "Some things can't be settled in a session. A student's direction is set over years — the stream, the degree, the entrances, the internships, the pivots, the confidence.",
      "Blueprint is our most complete student engagement: a dedicated mentor who walks the whole way with you, re-assessing as you grow, planning each admission and each summer, so nothing is left to trial and error.",
      "Every Blueprint is bespoke. It begins with a conversation, not a checkout.",
    ],
    problems: [
      { stat: "90%", label: "of students make a misaligned early career choice" },
      { stat: "₹25–75L", label: "the cost of the wrong degree — years and fees, recovered" },
      { stat: "3–5 yrs", label: "the horizon a real education decision actually spans" },
    ],
    forWhom: [
      "School students (8th–12th) planning years ahead",
      "Undergraduates & postgraduates building a long career",
      "Families who want one guide across every milestone",
      "Students aiming at study-abroad or competitive entrances",
    ],
    pillars: [
      { title: "Assess, then re-assess", detail: "Annual psychometric batteries track how you grow — the plan moves with you." },
      { title: "Education roadmap", detail: "Stream → degree → entrance → college → specialisation, sequenced years in advance." },
      { title: "Admissions, handled", detail: "Shortlists, applications, SOPs, interviews and documentation for every gateway." },
      { title: "Skills & portfolio", detail: "Internships, projects and a portfolio built deliberately over time." },
      { title: "Mind & confidence", detail: "Mental-strength training, role-plays and interview readiness." },
      { title: "A mentor who stays", detail: "A dedicated counsellor, parent meetings and continuous progress reviews." },
    ],
    canInclude: [
      "Dedicated mentor", "Quarterly strategy sessions", "Annual assessments", "Unlimited AI copilot",
      "University & internship planning", "Admission assistance", "Expert sessions", "Parent meetings",
      "Annual career reports", "Priority support", "Continuous progress reviews",
    ],
    horizon: "3–5 years · a long-term mentorship",
    priceFrom: 140000, priceNote: "Custom proposal after a discovery conversation · flexible instalments",
    offeringId: "lt_blueprint",
  },
  {
    id: "lt_autobiography", slug: "autobiography", audience: "executive",
    name: "Autobiography", eyebrow: "Long-term · Executives & founders",
    tagline: "The multi-year engagement for a career worth authoring.",
    positioning: "A 3–5 year advisory partnership for professionals, executives and founders writing the next long chapter — deliberately.",
    body: [
      "A leadership career isn't redirected in a single sitting. It's authored over years — the pivots, the mandates, the reinventions, the moments the next move shapes an organisation and not just a CV.",
      "Autobiography is our most comprehensive executive engagement: a senior mentor who stays through every transition, re-reading the market and your ambitions as they change, so the arc is chosen, not stumbled into.",
      "Every Autobiography is bespoke. It begins with a private conversation, and a proposal follows.",
    ],
    problems: [
      { stat: "86%", label: "of Indian professionals feel disengaged in their roles" },
      { stat: "14%", label: "truly thrive — the rest drift through the middle years" },
      { stat: "3–5 yrs", label: "the horizon a leadership reinvention actually needs" },
    ],
    forWhom: [
      "Senior professionals planning a multi-year arc",
      "Executives & CXOs navigating leadership transitions",
      "Founders and entrepreneurs building the next venture",
      "Leaders relocating internationally or reinventing entirely",
    ],
    pillars: [
      { title: "Executive diagnosis", detail: "Leadership assessments, revisited annually as your mandate evolves." },
      { title: "The multi-year arc", detail: "Each move — promotion, switch, board seat, venture — sequenced and staged." },
      { title: "Positioning & narrative", detail: "Executive resume, personal brand and the story that opens rooms." },
      { title: "Leadership development", detail: "Coaching, simulations and the capabilities the next level demands." },
      { title: "Networks & mandates", detail: "Expert sessions with practitioners who have made the moves you're weighing." },
      { title: "A partner who stays", detail: "A dedicated senior mentor, priority access and continuous reviews." },
    ],
    canInclude: [
      "Dedicated senior mentor", "Quarterly strategy sessions", "Annual executive assessments", "Unlimited AI copilot",
      "Executive positioning & resume", "Leadership coaching & simulations", "Expert & board-level sessions",
      "Relocation & venture planning", "Annual leadership reports", "Priority support", "Continuous progress reviews",
    ],
    horizon: "3–5 years · a senior advisory partnership",
    priceFrom: 260000, priceNote: "Custom proposal after a private conversation · flexible instalments",
    offeringId: "lt_autobiography",
  },
]

export const longTermBySlug = (slug?: string): LongTermProgram | undefined => LONGTERM.find((p) => p.slug === slug)

// ── AI credit top-ups (the add-on store) ─────────────────────────────────────
export interface CreditPack { id: string; name: string; amount: number; unit: "career" | "voice"; price: { inr: number } }
export const CREDIT_PACKS: CreditPack[] = [
  { id: "cc_100", name: "100 Career Credits", amount: 100, unit: "career", price: { inr: 499 } },
  { id: "cc_250", name: "250 Career Credits", amount: 250, unit: "career", price: { inr: 999 } },
  { id: "cc_500", name: "500 Career Credits", amount: 500, unit: "career", price: { inr: 1799 } },
  { id: "vc_60", name: "60 Voice Credits", amount: 60, unit: "voice", price: { inr: 799 } },
  { id: "vc_120", name: "120 Voice Credits", amount: 120, unit: "voice", price: { inr: 1499 } },
]

// ── helpers ──────────────────────────────────────────────────────────────────
export const ALL_OFFERINGS: Offering[] = [...STUDENT_JOURNEY, ...PROFESSIONAL, ...MARKETPLACE]
export const offeringById = (id?: string): Offering | undefined => ALL_OFFERINGS.find((o) => o.id === id)
/** Everything money can buy on this site (offerings + credit packs), for checkout. */
export const buyableById = (id?: string): { id: string; name: string; inr: number; note?: string } | undefined => {
  const o = offeringById(id)
  if (o && o.price.inr > 0) return { id: o.id, name: o.name, inr: o.price.inr, note: o.priceNote }
  const p = CREDIT_PACKS.find((c) => c.id === id)
  return p ? { id: p.id, name: p.name, inr: p.price.inr } : undefined
}

export const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`
