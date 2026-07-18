// Interest / Work-Environment / Job-Characteristic inventory — scoring per the
// founder's "Psychometric_Interest_Scoring_Logic_and_Key" workbook:
//   • factor score = MEAN of answered items (≥2 of 3 required, else unscored)
//   • absolute POMP = ((mean − 1) / 4) × 100         (0–100)
//   • relative z    = (mean − person scale-mean) / person scale-SD (within scale type)
//   • within-person standard = 50 + 10z
//   • Primary interest  = POMP ≥65 AND z ≥ +0.50 (top 5)
//   • Emerging interest = POMP 50–64 AND z ≥ +0.50
//   • Validity flags: straight-lining ≥90%, acquiescence mean >4.40, nay-saying
//     mean <1.60, flat profile (SD of factor means < 0.30), missingness rules.
// No reverse-scored items exist in this inventory (per the key) — do not invent any.

import { INVENTORY, type InvFactor, type InvScale } from "./interest-items"

export { INVENTORY }
export type { InvFactor, InvScale }

export const LIKERT_LABELS = [
  "Strongly dislike — not like me at all",
  "Dislike — slightly unlike me",
  "Neutral / unsure",
  "Like — somewhat like me",
  "Strongly like — very much like me",
]

export interface FlatItem { idx: number; scale: InvScale; factor: string; text: string }
/** The inventory flattened in administration order (interest → work-env → job-char). */
export const FLAT_ITEMS: FlatItem[] = INVENTORY.flatMap((f) =>
  f.items.map((text) => ({ idx: 0, scale: f.scale, factor: f.factor, text })),
).map((it, i) => ({ ...it, idx: i }))

export const SCALE_LABEL: Record<InvScale, string> = {
  interest: "Interest clusters",
  workenv: "Work environment",
  jobchar: "Job characteristics",
}

export type PompBand = "Very strong" | "Strong" | "Moderate" | "Low" | "Very low"
export function pompBand(p: number): PompBand {
  if (p >= 80) return "Very strong"
  if (p >= 65) return "Strong"
  if (p >= 50) return "Moderate"
  if (p >= 35) return "Low"
  return "Very low"
}

export interface FactorScore {
  scale: InvScale
  factor: string
  answered: number
  mean: number | null
  pomp: number | null
  z: number | null
  /** 50 + 10z within-person standard score. */
  standard: number | null
  band: PompBand | null
  classification: "Primary" | "Emerging" | null
}

export interface ValidityFlags {
  missingOverallPct: number
  straightLining: boolean
  acquiescence: boolean
  naySaying: boolean
  flatProfile: boolean
  confidence: "High" | "Moderate" | "Low"
  notes: string[]
}

export interface InterestResult {
  factors: FactorScore[]
  bySc: Record<InvScale, FactorScore[]>
  primaries: FactorScore[]
  emerging: FactorScore[]
  validity: ValidityFlags
}

/** answers: value 1–5 per FLAT_ITEMS index, null = unanswered. */
export function scoreInventory(answers: (number | null)[]): InterestResult {
  // per-factor means (≥2 answered required)
  const raw: { f: InvFactor; vals: number[] }[] = []
  let cursor = 0
  for (const f of INVENTORY) {
    const vals: number[] = []
    for (let i = 0; i < f.items.length; i++) {
      const v = answers[cursor++]
      if (v != null && v >= 1 && v <= 5) vals.push(v)
    }
    raw.push({ f, vals })
  }

  const scored: FactorScore[] = raw.map(({ f, vals }) => ({
    scale: f.scale, factor: f.factor, answered: vals.length,
    mean: vals.length >= 2 ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    pomp: null, z: null, standard: null, band: null, classification: null,
  }))

  // POMP + within-person z per scale type
  for (const scale of ["interest", "workenv", "jobchar"] as InvScale[]) {
    const group = scored.filter((s) => s.scale === scale && s.mean != null)
    const means = group.map((s) => s.mean!) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const m = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0
    const sd = means.length > 1 ? Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / (means.length - 1)) : 0
    for (const s of group) {
      s.pomp = Math.round(((s.mean! - 1) / 4) * 1000) / 10
      s.z = sd > 0 ? Math.round(((s.mean! - m) / sd) * 100) / 100 : 0
      s.standard = Math.round(50 + 10 * (s.z ?? 0))
      s.band = pompBand(s.pomp)
    }
  }

  // Primary / Emerging (interest clusters only, per the key)
  const interests = scored.filter((s) => s.scale === "interest" && s.pomp != null)
  const sorted = [...interests].sort((a, b) => (b.pomp ?? 0) - (a.pomp ?? 0) || (b.z ?? 0) - (a.z ?? 0))
  const primaries: FactorScore[] = []
  for (const s of sorted) {
    if ((s.pomp ?? 0) >= 65 && (s.z ?? 0) >= 0.5 && primaries.length < 5) {
      s.classification = "Primary"; primaries.push(s)
    }
  }
  const emerging = sorted.filter((s) => s.classification == null && (s.pomp ?? 0) >= 50 && (s.pomp ?? 0) < 65 && (s.z ?? 0) >= 0.5)
  emerging.forEach((s) => { s.classification = "Emerging" })

  // ── validity ──
  const given = answers.filter((a): a is number => a != null)
  const missingPct = Math.round(((answers.length - given.length) / answers.length) * 100)
  const counts = new Map<number, number>()
  given.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  const maxSame = Math.max(0, ...counts.values())
  const overallMean = given.length ? given.reduce((a, b) => a + b, 0) / given.length : 0
  const iMeans = interests.map((s) => s.mean!).filter((v) => v != null) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const im = iMeans.length ? iMeans.reduce((a, b) => a + b, 0) / iMeans.length : 0
  const isd = iMeans.length > 1 ? Math.sqrt(iMeans.reduce((a, b) => a + (b - im) ** 2, 0) / (iMeans.length - 1)) : 0

  const flags: ValidityFlags = {
    missingOverallPct: missingPct,
    straightLining: given.length > 0 && maxSame / given.length >= 0.9,
    acquiescence: overallMean > 4.4,
    naySaying: given.length > 0 && overallMean < 1.6,
    flatProfile: isd < 0.3,
    confidence: "High",
    notes: [],
  }
  if (flags.missingOverallPct > 10) flags.notes.push("More than 10% of items were left unanswered — profile is provisional.")
  if (flags.straightLining) flags.notes.push("Responses were nearly identical throughout — engagement may have been low.")
  if (flags.acquiescence) flags.notes.push("Very high agreement across all areas — elevated scores may partly reflect response style.")
  if (flags.naySaying) flags.notes.push("Very low agreement across all areas — depressed scores may partly reflect response style.")
  if (flags.flatProfile) flags.notes.push("Preferences are not strongly differentiated — treat rankings as exploratory.")
  flags.confidence = flags.notes.length === 0 ? "High" : flags.notes.length === 1 ? "Moderate" : "Low"

  const bySc = {
    interest: scored.filter((s) => s.scale === "interest"),
    workenv: scored.filter((s) => s.scale === "workenv"),
    jobchar: scored.filter((s) => s.scale === "jobchar"),
  }
  return { factors: scored, bySc, primaries, emerging, validity: flags }
}

/** Careers + typical subjects per interest cluster — exploration pointers shown in
 *  the report (aligned to the reference report format's "Possible Careers" blocks). */
export const CLUSTER_CAREERS: Record<string, { careers: string[]; subjects: string[] }> = {
  "Sales & Business Development": { careers: ["Business development associate", "Key account manager", "Sales strategist"], subjects: ["Business studies", "Economics", "Communication"] },
  "Digital & Search-based Marketing": { careers: ["Digital marketer", "SEO analyst", "Performance-marketing manager"], subjects: ["Marketing", "Statistics", "Media studies"] },
  "Finance, Accounting & Banking": { careers: ["Chartered accountant", "Financial analyst", "Banking officer"], subjects: ["Accountancy", "Mathematics", "Economics"] },
  "Entrepreneurship & Start-ups": { careers: ["Founder", "Product manager", "Venture analyst"], subjects: ["Business studies", "Economics", "Design thinking"] },
  "General Management & Strategy": { careers: ["Management consultant", "Strategy analyst", "Operations lead"], subjects: ["Business studies", "Mathematics", "Economics"] },
  "Human Resource Management": { careers: ["HR generalist", "Talent-acquisition specialist", "L&D coordinator"], subjects: ["Psychology", "Business studies", "Sociology"] },
  "Law & Legal Services": { careers: ["Lawyer", "Legal associate", "Compliance officer"], subjects: ["Political science", "English", "Logic"] },
  "Public Policy & Governance": { careers: ["Policy analyst", "Civil services", "Programme officer"], subjects: ["Political science", "Economics", "Sociology"] },
  "Administration & Office Support": { careers: ["Office administrator", "Executive assistant", "Operations coordinator"], subjects: ["Business studies", "Computer applications", "English"] },
  "Education & Teaching": { careers: ["Teacher", "Instructional designer", "Academic counsellor"], subjects: ["Education", "Psychology", "Subject specialisation"] },
  "Physical Science & Research": { careers: ["Research scientist", "Lab scientist", "Physicist / chemist"], subjects: ["Physics", "Chemistry", "Mathematics"] },
  "Social Science & Research": { careers: ["Social researcher", "Economist", "Anthropologist"], subjects: ["Sociology", "Economics", "Statistics"] },
  "Engineering (Core)": { careers: ["Mechanical engineer", "Civil engineer", "Electrical engineer"], subjects: ["Physics", "Mathematics", "Engineering drawing"] },
  "IT & Software Development": { careers: ["Software developer", "Full-stack engineer", "QA engineer"], subjects: ["Computer science", "Mathematics", "Logic"] },
  "Data Science & Analytics": { careers: ["Data analyst", "Data scientist", "Business analyst"], subjects: ["Statistics", "Mathematics", "Computing"] },
  "Artificial Intelligence & Robotics": { careers: ["ML engineer", "Robotics engineer", "AI researcher"], subjects: ["Mathematics", "Computer science", "Physics"] },
  "Healthcare (Medicine & Nursing)": { careers: ["Doctor", "Nurse", "Clinical officer"], subjects: ["Biology", "Chemistry", "Physics"] },
  "Allied Health (Pharmacy, Therapy, Lab)": { careers: ["Pharmacist", "Physiotherapist", "Lab technologist"], subjects: ["Biology", "Chemistry", "Health science"] },
  "Psychology & Counselling": { careers: ["Counsellor", "Clinical psychologist", "School psychologist"], subjects: ["Psychology", "Biology", "Statistics"] },
  "Social Work & Community Service": { careers: ["Social worker", "NGO programme lead", "Community organiser"], subjects: ["Sociology", "Social work", "Psychology"] },
  "Hospitality & Tourism": { careers: ["Hotel manager", "Travel consultant", "Guest-relations lead"], subjects: ["Hospitality management", "Geography", "Languages"] },
  "Event Management": { careers: ["Event manager", "Wedding planner", "Production coordinator"], subjects: ["Business studies", "Communication", "Design"] },
  "Creative Arts & Design": { careers: ["Graphic designer", "UI/UX designer", "Illustrator"], subjects: ["Fine arts", "Design", "Computer applications"] },
  "Performing Arts & Music": { careers: ["Musician", "Actor", "Choreographer"], subjects: ["Music", "Theatre", "Dance"] },
  "Journalism, Media & Communication": { careers: ["Journalist", "News producer", "Communications specialist"], subjects: ["English", "Political science", "Media studies"] },
  "Writing & Content Creation": { careers: ["Content writer", "Copywriter", "Editor"], subjects: ["English", "Literature", "Media studies"] },
  "Architecture & Planning": { careers: ["Architect", "Urban planner", "Interior designer"], subjects: ["Mathematics", "Physics", "Design"] },
  "Agriculture & Environment": { careers: ["Agronomist", "Environmental scientist", "Forestry officer"], subjects: ["Biology", "Geography", "Chemistry"] },
  "Defence, Police & Safety Services": { careers: ["Armed forces officer", "Police services", "Safety officer"], subjects: ["Physical education", "Mathematics", "General studies"] },
  "Operations Management": { careers: ["Operations manager", "Plant supervisor", "Process analyst"], subjects: ["Mathematics", "Business studies", "Statistics"] },
  "Retail & Merchandising": { careers: ["Retail manager", "Merchandiser", "Category analyst"], subjects: ["Business studies", "Economics", "Design"] },
  "Supply Chain Management": { careers: ["Supply-chain analyst", "Logistics manager", "Procurement officer"], subjects: ["Mathematics", "Business studies", "Geography"] },
}
