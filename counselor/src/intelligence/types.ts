// ─────────────────────────────────────────────────────────────────────────────
// Career Intelligence — domain model.
//
// The shared vocabulary for the intelligence layer: the student profile that
// flows in, the entities we reason over (colleges, programs, exams, scholarships),
// and the structured estimates the engines produce (admission probability, ROI,
// employability, scholarship fit). Every AI surface — counsellor Compass, client
// guide, report agents, admin + in-call assistants — speaks these types.
// ─────────────────────────────────────────────────────────────────────────────

export type EducationLevel = "after_8th" | "after_10th" | "after_12th" | "ug" | "pg" | "working"
export type Stream = "science_pcm" | "science_pcb" | "science_pcmb" | "commerce" | "arts" | "vocational" | "undecided"
export type Domain =
  | "engineering" | "medical" | "law" | "management" | "design" | "architecture"
  | "pure_sciences" | "commerce_finance" | "humanities" | "computer_applications"
  | "agriculture" | "pharmacy" | "hotel_management" | "liberal_arts" | "general"

export type InstituteType = "IIT" | "NIT" | "IIIT" | "AIIMS" | "central_university" | "state_university" | "deemed" | "private" | "govt_college"
export type AccreditationGrade = "A++" | "A+" | "A" | "B++" | "B+" | "B" | "C" | "unaccredited"

/** Money is always INR. Fees/packages stored as plain rupees (number). */
export type INR = number

// ── the student ──────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string
  name?: string
  level: EducationLevel
  stream?: Stream
  /** class-10 / class-12 board % (0–100). */
  academicPercent?: number
  /** normalised aptitude from the ability battery (0–100) per faculty, if taken. */
  aptitude?: Partial<Record<"quantitative" | "verbal" | "logical" | "spatial" | "clerical", number>>
  /** RIASEC interest profile (0–100), if taken. */
  interests?: Partial<Record<"R" | "I" | "A" | "S" | "E" | "C", number>>
  /** entrance-exam results the student already holds. */
  examResults?: ExamResult[]
  /** preferred study domains, ranked. */
  domains?: Domain[]
  /** home state — drives state quota, domicile scholarships, location ROI. */
  homeState?: string
  category?: "general" | "ews" | "obc_ncl" | "sc" | "st"
  gender?: "male" | "female" | "other"
  /** annual family income (drives scholarship + means-tested eligibility). */
  familyIncome?: INR
  /** locations the student will study in. */
  locationPrefs?: string[]
  /** hard budget for tuition+living over the full program, if any. */
  budget?: INR
  personDisability?: boolean
}

export interface ExamResult {
  examId: string
  /** general rank (CRL) where applicable. */
  rank?: number
  /** category rank. */
  categoryRank?: number
  /** percentile (0–100) for percentile-normalised exams (JEE Main, CUET). */
  percentile?: number
  /** raw marks / score where that's what cutoffs use (NEET). */
  score?: number
  year?: number
}

// ── entities ─────────────────────────────────────────────────────────────────

/** A representative closing cutoff for a college (optionally a specific branch),
 *  per exam + category — what the admission engine compares the student against. */
export interface CollegeCutoff {
  examId: string
  category: NonNullable<StudentProfile["category"]> | "general"
  metric: "rank" | "percentile" | "score"
  /** the last-admitted value: closing rank (lower better) / percentile / score. */
  closing: number
  branch?: string
}

export interface College {
  id: string
  name: string
  shortName?: string
  type: InstituteType
  city: string
  state: string
  /** NIRF rank within its category (lower is better); null if unranked. */
  nirfRank?: number | null
  nirfCategory?: Domain | "overall"
  naac?: AccreditationGrade
  nbaAccredited?: boolean
  /** indicative annual tuition (INR). */
  annualFee?: INR
  /** indicative median placement (INR per annum). */
  medianPackage?: INR
  topPackage?: INR
  placementRate?: number // 0–100
  flagshipPrograms?: string[]
  domains: Domain[]
  /** which exam gates admission here. */
  admissionExamIds: string[]
  /** representative closing cutoffs (flagship branch unless noted). */
  cutoffs?: CollegeCutoff[]
  ownership: "public" | "private"
  estbYear?: number
  notable?: string
}

export interface Program {
  id: string
  collegeId: string
  name: string
  domain: Domain
  degree: string // e.g. "B.Tech", "MBBS", "BA LLB (Hons)"
  durationYears: number
  annualFee?: INR
  intake?: number
  examIds: string[]
}

export interface Exam {
  id: string
  name: string
  fullName: string
  body: string
  level: "ug" | "pg" | "diploma"
  domain: Domain
  /** percentile | rank | score — how cutoffs are expressed. */
  scoring: "percentile" | "rank" | "score"
  approxRegistrations?: number
  monthsHeld: number[] // 1–12
  gates: InstituteType[]
  notes?: string
}

/** A cutoff band maps an exam outcome range to the institutions it realistically
 *  opens — the backbone of admission-probability reasoning. */
export interface CutoffBand {
  examId: string
  metric: "rank" | "percentile" | "score"
  /** inclusive lower/upper of the metric. For rank, lower=best. For percentile/
   *  score, higher=better, so `min` is the floor that still qualifies. */
  min: number
  max: number
  category?: StudentProfile["category"]
  /** institutions/branches this band realistically opens. */
  opens: string
  collegeIds?: string[]
  domain: Domain
}

export interface Scholarship {
  id: string
  name: string
  provider: string
  kind: "government" | "private" | "institutional"
  level: EducationLevel[]
  /** income ceiling (INR/yr) for means-tested awards; null = not means-tested. */
  incomeCeiling?: INR | null
  categories?: NonNullable<StudentProfile["category"]>[]
  /** minimum academic % required. */
  minAcademicPercent?: number
  genders?: NonNullable<StudentProfile["gender"]>[]
  forDisability?: boolean
  /** the award, human-readable. */
  benefit: string
  /** indicative annual value for ranking matches (INR). */
  approxAnnualValue?: INR
  windowMonths?: number[]
  portal?: string
  domains?: Domain[]
}

// ── engine outputs ───────────────────────────────────────────────────────────

export type Likelihood = "safe" | "target" | "reach" | "unlikely"

export interface AdmissionEstimate {
  collegeId: string
  collegeName: string
  program?: string
  /** 0–100 probability the student gets an offer. */
  probability: number
  band: Likelihood
  basis: string
  examId?: string
}

export interface ROIEstimate {
  collegeId: string
  collegeName: string
  /** total program cost (tuition + living), INR. */
  totalCost: INR
  /** expected starting CTC, INR/yr. */
  expectedStartCTC: INR
  /** simple payback period in years (cost / annual earnings). */
  paybackYears: number
  /** 10-year net (earnings − cost), nominal INR. */
  tenYearNet: INR
  roiScore: number // 0–100 normalised
}

export interface EmployabilityForecast {
  domain: Domain
  /** 0–100 outlook over the next ~5 years. */
  outlook: number
  trend: "rising" | "stable" | "cooling"
  demandDrivers: string[]
  risks: string[]
  /** illustrative roles this opens. */
  roles: string[]
}

export interface ScholarshipMatch {
  scholarshipId: string
  name: string
  /** 0–100 eligibility fit. */
  fit: number
  eligible: boolean
  reasons: string[]
  benefit: string
  approxAnnualValue?: INR
}

/** The aggregate the supervisor assembles — what an AI surface renders or speaks. */
export interface IntelligenceReport {
  profile: StudentProfile
  recommendedDomains: { domain: Domain; score: number; why: string }[]
  admissions: AdmissionEstimate[]
  roi: ROIEstimate[]
  employability: EmployabilityForecast[]
  scholarships: ScholarshipMatch[]
  /** confidence the engine has in this picture given how complete the profile is. */
  confidence: number
  /** generated narrative hooks for the AI to expand. */
  highlights: string[]
  generatedAt?: number
}
