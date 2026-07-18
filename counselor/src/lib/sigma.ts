// Sigma psychometric battery — types + demo profile.
// Mirrors a real Test report (Aanya Raman · Test EvYtfZjR/T1LhTHa7 · 18-05-2026).
// The console renders these read-only; the scoring engine owns interpretation.
//
// Three sub-tests:
//   • Personality — 6 dimensions × 3 bipolar sub-dimensions, score 0–99
//   • Ability     — 7 aptitudes, score 1–10
//   • Interest    — four scale sets (work roles, work styles, personal styles, job groups)

// ---- bands ------------------------------------------------------------------

export type Band = "low" | "moderate" | "high"
export type BandScale = "personality" | "ability" | "percentile"

/** Map a raw score to a low/moderate/high band per scale.
 *  personality 0–99: 0–39 low · 40–59 moderate · 60–99 high
 *  ability     1–10: 1–3 low  · 4–7 moderate  · 8–10 high
 *  percentile  0–99: <34 low  · 34–66 average  · >66 high */
export function band(score: number, scale: BandScale): Band {
  switch (scale) {
    case "personality":
      return score <= 39 ? "low" : score <= 59 ? "moderate" : "high"
    case "ability":
      return score <= 3 ? "low" : score <= 7 ? "moderate" : "high"
    case "percentile":
      return score < 34 ? "low" : score <= 66 ? "moderate" : "high"
  }
}

export const BAND_LABEL: Record<BandScale, Record<Band, string>> = {
  personality: { low: "Low", moderate: "Moderate", high: "High" },
  ability: { low: "Below moderate", moderate: "Moderate", high: "High" },
  percentile: { low: "Low", moderate: "Average", high: "High" },
}

// ---- personality ------------------------------------------------------------

/** One bipolar sub-dimension. `score` 0–99 places the marker between the two
 *  poles; <40 leans `low`, >59 leans `high`, otherwise mixed/centered. */
export interface SigmaSubDimension {
  key: string
  /** the score's headline name (the trait being measured) */
  name: string
  score: number
  low: { label: string; desc: string }
  high: { label: string; desc: string }
}

export interface SigmaDimension {
  key: string
  label: string
  /** one-line read of what this dimension captures */
  summary: string
  subs: SigmaSubDimension[]
}

// ---- ability ----------------------------------------------------------------

export interface SigmaAptitude {
  code: string // e.g. "CA"
  label: string // e.g. "Closure"
  score: number // 1–10
  definition: string
  examples: string // example fields/careers
}

// ---- interest ---------------------------------------------------------------

/** A ranked percentile scale item (work roles / work styles / personal styles). */
export interface SigmaScaleItem {
  label: string
  /** percentile 0–99 */
  value: number
  code?: string
  desc?: string
}

export type JobGroupTone = "similar" | "neutral" | "dissimilar"

export interface SigmaJobGroup {
  label: string
  tone: JobGroupTone
}

export interface SigmaInterest {
  takeaway: string
  workRoles: SigmaScaleItem[]
  workStyles: SigmaScaleItem[]
  personalStyles: SigmaScaleItem[]
  jobGroups: SigmaJobGroup[]
}

// ---- profile ----------------------------------------------------------------

export interface SigmaProfile {
  clientId: string
  testId: string
  takenAt: string // ISO
  personality: { takeaway: string; dimensions: SigmaDimension[] }
  ability: { takeaway: string; aptitudes: SigmaAptitude[] }
  interest: SigmaInterest
}

// ---- demo data --------------------------------------------------------------

const PERSONALITY: SigmaDimension[] = [
  {
    key: "people",
    label: "People Orientation",
    summary: "Socially engaged and willing to take the lead, with a measured taste for the spotlight.",
    subs: [
      {
        key: "social", name: "Social", score: 52,
        low: { label: "Reserved", desc: "Keeps to self, recharges alone." },
        high: { label: "Sociable", desc: "Actively socialises, energized by groups." },
      },
      {
        key: "assertive", name: "Assertive", score: 55,
        low: { label: "Collaborative", desc: "Values harmony, works with others." },
        high: { label: "Assertive", desc: "Takes control, guides others." },
      },
      {
        key: "exhibitive", name: "Exhibitive", score: 48,
        low: { label: "Reserved", desc: "Prefers the background." },
        high: { label: "Expressive", desc: "Enjoys the spotlight." },
      },
    ],
  },
  {
    key: "team",
    label: "Team Orientation",
    summary: "Team-first and even-keeled, balancing generosity with measured composure.",
    subs: [
      {
        key: "generous", name: "Generous", score: 58,
        low: { label: "Self-focused", desc: "Protects own recognition." },
        high: { label: "Generous", desc: "Shares credit, team-first." },
      },
      {
        key: "cool", name: "Cool", score: 44,
        low: { label: "Reactive", desc: "Reactive when emotions run high." },
        high: { label: "Composed", desc: "Stays calm under pressure." },
      },
      {
        key: "tolerant", name: "Tolerant", score: 50,
        low: { label: "Defensive", desc: "Defensive about criticism." },
        high: { label: "Tolerant", desc: "Open to criticism, seeks to improve." },
      },
    ],
  },
  {
    key: "leadership",
    label: "Leadership Orientation",
    summary: "Forms own views and takes charge, balancing self-direction with openness to support.",
    subs: [
      {
        key: "ownership", name: "Ownership-driven", score: 62,
        low: { label: "Guided", desc: "Seeks guidance, follows norms." },
        high: { label: "Ownership-driven", desc: "Forms own views, takes charge." },
      },
      {
        key: "self_assured", name: "Self-assured", score: 57,
        low: { label: "Conforming", desc: "Conforms, seeks prestige." },
        high: { label: "Self-assured", desc: "Expresses ideas freely, authentic." },
      },
      {
        key: "self_reliant", name: "Self-reliant", score: 49,
        low: { label: "Supported", desc: "Seeks support, values compassion." },
        high: { label: "Self-reliant", desc: "Stands on own feet, logic over feelings." },
      },
    ],
  },
  {
    key: "learning",
    label: "Learning Orientation",
    summary: "Strongly curious and open to new ideas, learning best alongside others.",
    subs: [
      {
        key: "change", name: "Change-driven", score: 66,
        low: { label: "Steady", desc: "Prefers the familiar." },
        high: { label: "Change-driven", desc: "Embraces novelty and new experiences." },
      },
      {
        key: "intellectual", name: "Intellectual", score: 71,
        low: { label: "Practical", desc: "Practical, concrete tasks." },
        high: { label: "Intellectual", desc: "Curious, enjoys ideas and analysis." },
      },
      {
        key: "participative", name: "Participative", score: 60,
        low: { label: "Independent", desc: "Learns independently." },
        high: { label: "Participative", desc: "Learns collaboratively." },
      },
    ],
  },
  {
    key: "system",
    label: "System Orientation",
    summary: "Leans planful and deliberate, while staying relaxed about everyday order.",
    subs: [
      {
        key: "planning", name: "Planning", score: 54,
        low: { label: "Spontaneous", desc: "Spontaneous, flows with the moment." },
        high: { label: "Planful", desc: "Systematic, detailed plans." },
      },
      {
        key: "decision", name: "Decision Making", score: 58,
        low: { label: "Impulsive", desc: "Quick, impulsive." },
        high: { label: "Deliberate", desc: "Thoughtful, structured." },
      },
      {
        key: "organizing", name: "Organizing", score: 47,
        low: { label: "Relaxed", desc: "Relaxed about order." },
        high: { label: "Orderly", desc: "Neat, a place for everything." },
      },
    ],
  },
  {
    key: "achievement",
    label: "Achievement Motivation",
    summary: "Goal-oriented and persistent, with an earnest, focused approach to work.",
    subs: [
      {
        key: "result", name: "Result-driven", score: 63,
        low: { label: "Easygoing", desc: "Prefers simpler tasks." },
        high: { label: "Result-driven", desc: "Sets high goals, competitive." },
      },
      {
        key: "persistent", name: "Persistent", score: 59,
        low: { label: "Yielding", desc: "Eases off when it gets hard." },
        high: { label: "Persistent", desc: "Pushes through difficulty." },
      },
      {
        key: "serious", name: "Serious", score: 55,
        low: { label: "Light-hearted", desc: "Light, relaxed." },
        high: { label: "Serious", desc: "Earnest, focused." },
      },
    ],
  },
]

const ABILITY: SigmaAptitude[] = [
  { code: "CA", label: "Closure", score: 5, definition: "Grasping a whole pattern from incomplete stimuli.", examples: "Graphic design, programming, air-traffic control, surgery" },
  { code: "CL", label: "Clerical", score: 3, definition: "Rapid speed and accuracy spotting same/different details.", examples: "Record-keeping, data entry, coding" },
  { code: "MA", label: "Mechanical", score: 7, definition: "Understanding machines, tools and physical forces.", examples: "Mechanics, engineering, carpentry" },
  { code: "NA", label: "Numerical", score: 3, definition: "Working with numbers quickly and accurately.", examples: "Accounting, engineering, finance" },
  { code: "RA", label: "Reasoning", score: 6, definition: "Logical thinking — generalising rules from specifics.", examples: "Maths, programming, research" },
  { code: "SA", label: "Spatial", score: 4, definition: "Perceiving 2D/3D arrangements and orientation.", examples: "Architecture, engineering, design" },
  { code: "VA", label: "Verbal", score: 9, definition: "Understanding and using language and ideas.", examples: "Marketing, PR, law" },
]

const WORK_ROLES: SigmaScaleItem[] = [
  { label: "Social Science", value: 99 },
  { label: "Elementary Education", value: 89 },
  { label: "Nature-Agriculture", value: 85 },
  { label: "Adventure", value: 78 },
  { label: "Life Science", value: 70 },
  { label: "Creative Arts", value: 69 },
  { label: "Supervising Others", value: 64 },
  { label: "Technical Writing", value: 63 },
  { label: "Social Service", value: 61 },
  { label: "Mathematics", value: 46 },
  { label: "Performing Arts", value: 45 },
  { label: "Author-Journalism", value: 43 },
  { label: "Engineering", value: 35 },
  { label: "Teaching", value: 35 },
  { label: "Skilled Trades", value: 31 },
  { label: "Medical Service", value: 24 },
  { label: "Personal Service", value: 23 },
  { label: "Physical Science", value: 20 },
  { label: "Sales", value: 16 },
  { label: "Family Activity", value: 10 },
  { label: "Mediation & Persuasion", value: 9 },
  { label: "Business", value: 9 },
  { label: "Finance", value: 6 },
  { label: "Authoritarian Leadership", value: 5 },
  { label: "Office Work", value: 5 },
  { label: "Law", value: 3 },
  { label: "Consulting", value: 2 },
]

const WORK_STYLES: SigmaScaleItem[] = [
  { label: "Accountability", value: 50 },
  { label: "Endurance", value: 43 },
  { label: "Organization", value: 26 },
  { label: "Interpersonal Confidence", value: 17 },
  { label: "Academic Achievement", value: 13 },
  { label: "Independence", value: 13 },
  { label: "Job Security", value: 7 },
]

const PERSONAL_STYLES: SigmaScaleItem[] = [
  { label: "Inquiring", code: "Inq", value: 73, desc: "Drawn to investigation, analysis and understanding how things work." },
  { label: "Helping", code: "He", value: 65, desc: "Motivated by supporting, teaching and caring for others." },
  { label: "Expressive", code: "Ex", value: 49, desc: "Enjoys creative, artistic and self-expressive activity." },
  { label: "Practical", code: "Pr", value: 38, desc: "Prefers hands-on, concrete, tangible work." },
  { label: "Informative", code: "Inf", value: 36, desc: "Likes sharing knowledge and communicating ideas." },
  { label: "Logical", code: "Lo", value: 29, desc: "Favours systematic, rational, data-driven reasoning." },
  { label: "Structured", code: "St", value: 17, desc: "Comfortable with order, rules and clear procedures." },
  { label: "Conventional", code: "Co", value: 15, desc: "At ease with established, routine and traditional settings." },
  { label: "Enterprising", code: "En", value: 8, desc: "Energized by persuading, leading and driving outcomes." },
  { label: "Assertive", code: "As", value: 3, desc: "Inclined to direct, take charge and influence forcefully." },
]

const JOB_GROUPS: SigmaJobGroup[] = [
  { label: "Medical Diagnosis & Treatment", tone: "similar" },
  { label: "Fine Art", tone: "similar" },
  { label: "Entertainment", tone: "similar" },
  { label: "Physical Health & Recreation", tone: "similar" },
  { label: "Life Science & Research", tone: "neutral" },
  { label: "Nature/Agriculture & Environment", tone: "neutral" },
  { label: "Commercial Art & Design", tone: "neutral" },
  { label: "Communications & Writing", tone: "neutral" },
  { label: "Social Service & Mental Health", tone: "neutral" },
  { label: "Finance & Business", tone: "dissimilar" },
  { label: "Law & Politics", tone: "dissimilar" },
  { label: "Office & Administration", tone: "dissimilar" },
]

/** The demo Sigma profile. Returns the SAME illustrative report for any client
 *  for now (swap for a live fetch later). */
export function sigmaProfile(clientId: string): SigmaProfile {
  return {
    clientId,
    testId: "T1LhTHa7",
    takenAt: "2026-05-18",
    personality: {
      takeaway: "Curious and growth-oriented, leaning into leadership and achievement while staying socially balanced.",
      dimensions: PERSONALITY,
    },
    ability: {
      takeaway: "Verbal reasoning is a clear strength; mechanical and logical reasoning support it, while numerical and clerical speed lag.",
      aptitudes: ABILITY,
    },
    interest: {
      takeaway: "Pulls strongly toward social science, education and nature; least drawn to office, finance and law.",
      workRoles: WORK_ROLES,
      workStyles: WORK_STYLES,
      personalStyles: PERSONAL_STYLES,
      jobGroups: JOB_GROUPS,
    },
  }
}
