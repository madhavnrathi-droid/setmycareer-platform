// Loratis Aptitude Test norms — transcribed from "Loratis Aptitude Test Norms.pdf".
// Raw section score → standard score (A best … J lowest) by gender × age band.
//
// Encoding: for each ability we store the UPPER raw bound of each grade in the
// order J,I,H,G,F,E,D,C,B (A = everything above B's bound, up to the section max).
// A "-" (skipped grade) in the source table is encoded by repeating the previous
// bound, which makes that grade unreachable — same semantics as the printed table.
// Obvious print typos in the source are corrected to keep bounds monotone and are
// noted inline (the corrected value is forced by the neighbouring cells).

export type AbilityKey = "VA" | "SA" | "RA" | "NA" | "MA" | "CL" | "CA"
export type Gender = "male" | "female"
export type Grade = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"

/** Section maxima (also the item counts of the digital battery). */
export const ABILITY_MAX: Record<AbilityKey, number> = {
  VA: 24, SA: 72, RA: 12, NA: 20, MA: 25, CL: 72, CA: 20,
}

export const ABILITY_LABEL: Record<AbilityKey, string> = {
  VA: "Verbal Ability",
  SA: "Spatial Ability",
  RA: "Reasoning Ability",
  NA: "Numerical Ability",
  MA: "Mechanical Ability",
  CL: "Clerical Ability",
  CA: "Closure Ability",
}

/** What each ability measures — used on section intros + the report. */
export const ABILITY_MEANING: Record<AbilityKey, string> = {
  VA: "Understanding and reasoning with words — vocabulary, relationships between ideas, and reading precision.",
  SA: "Seeing objects in the mind's eye — recognising a shape when it is turned, and telling it apart from its mirror image.",
  RA: "Working out rules and patterns — series, categories, and logical deduction.",
  NA: "Working with numbers — arithmetic, proportions, and everyday quantitative problems.",
  MA: "Understanding physical cause and effect — gears, levers, forces, and how mechanisms behave.",
  CL: "Speed and accuracy with detail — comparing entries quickly without slips.",
  CA: "Completing partial information — recognising the whole word or figure from fragments.",
}

// bounds = upper raw bound for J,I,H,G,F,E,D,C,B  (A = above B, ≤ max)
type Bounds = [number, number, number, number, number, number, number, number, number]
type BandTable = Record<AbilityKey, Bounds>

// ── 13 – 14.5 years ──────────────────────────────────────────────────────────
const B_13: BandTable = {
  VA: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  SA: [11, 17, 23, 29, 35, 40, 46, 52, 58],
  RA: [1, 1, 2, 3, 3, 4, 5, 5, 6], // I, F and C skipped in source
  NA: [1, 2, 3, 4, 4, 5, 6, 7, 8], // F skipped
  MA: [3, 4, 6, 7, 9, 10, 12, 13, 15],
  CL: [8, 13, 17, 21, 26, 30, 34, 38, 43],
  CA: [1, 2, 3, 4, 5, 6, 6, 7, 8], // D skipped
}
const G_13: BandTable = {
  VA: [2, 3, 4, 6, 7, 8, 9, 10, 12],
  SA: [10, 15, 20, 25, 30, 35, 40, 45, 50],
  RA: [1, 1, 2, 3, 4, 4, 5, 5, 6], // I, E, C skipped
  NA: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  MA: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  CL: [10, 15, 20, 25, 30, 35, 39, 44, 49],
  CA: [2, 3, 4, 6, 7, 8, 9, 10, 12],
}

// ── 14.5 – 15.5 years ────────────────────────────────────────────────────────
const B_145: BandTable = {
  VA: [2, 3, 4, 6, 7, 8, 9, 10, 12],
  SA: [12, 18, 24, 31, 37, 43, 49, 55, 61],
  RA: [1, 2, 2, 3, 4, 4, 5, 5, 6], // H, E, C skipped
  NA: [2, 3, 4, 5, 6, 7, 8, 10, 11],
  MA: [3, 5, 7, 9, 11, 13, 15, 17, 18], // source "12-31" for E is a misprint of 12-13
  CL: [9, 14, 18, 23, 28, 32, 37, 42, 46],
  CA: [1, 2, 3, 4, 5, 6, 7, 8, 9],
}
const G_145: BandTable = {
  VA: [2, 4, 5, 7, 8, 10, 11, 13, 14], // source "111" for D is a misprint of 11
  SA: [11, 16, 21, 27, 32, 37, 43, 48, 53],
  RA: [2, 2, 3, 3, 4, 4, 5, 5, 6], // I, G, E, C skipped
  NA: [2, 3, 4, 5, 7, 8, 9, 10, 11],
  MA: [2, 3, 4, 5, 7, 8, 9, 10, 11],
  CL: [10, 16, 21, 26, 32, 37, 42, 47, 53],
  CA: [2, 4, 5, 6, 8, 9, 10, 12, 13],
}

// ── 15.5 – 16.5 years ────────────────────────────────────────────────────────
const B_155: BandTable = {
  VA: [3, 4, 6, 7, 9, 10, 12, 14, 15],
  SA: [13, 19, 26, 32, 39, 45, 52, 58, 65],
  RA: [1, 2, 3, 4, 5, 5, 6, 7, 8], // E skipped
  NA: [2, 4, 5, 6, 8, 9, 10, 12, 13],
  MA: [4, 6, 9, 11, 13, 15, 17, 20, 22], // source "1-12" for F is a misprint of 12-13
  CL: [10, 15, 20, 25, 30, 35, 39, 44, 49],
  CA: [2, 3, 5, 6, 7, 8, 9, 11, 12],
}
const G_155: BandTable = {
  VA: [3, 5, 7, 9, 10, 12, 14, 16, 17],
  SA: [12, 18, 24, 31, 37, 43, 49, 55, 61],
  RA: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  NA: [2, 4, 5, 7, 8, 9, 11, 12, 14],
  MA: [3, 4, 6, 7, 9, 10, 12, 13, 15],
  CL: [11, 17, 22, 28, 34, 39, 45, 51, 56],
  CA: [3, 4, 6, 7, 9, 10, 12, 13, 15],
}

// ── 16.5 – 17.5 years ────────────────────────────────────────────────────────
const B_165: BandTable = {
  VA: [-1, 1, 4, 7, 10, 13, 16, 18, 21], // J unreachable in source ("-")
  SA: [15, 22, 28, 34, 40, 47, 53, 59, 66],
  RA: [1, 2, 3, 4, 5, 6, 7, 8, 8], // B skipped
  NA: [-1, 1, 4, 6, 8, 11, 13, 16, 18], // J unreachable
  MA: [4, 7, 9, 12, 14, 16, 19, 21, 24],
  CL: [10, 16, 21, 26, 31, 36, 42, 47, 52],
  CA: [-1, 1, 4, 6, 8, 11, 13, 15, 18], // J unreachable
}
const G_165: BandTable = {
  VA: [-1, 3, 5, 8, 10, 13, 16, 18, 21], // J unreachable
  SA: [11, 18, 25, 32, 39, 46, 53, 60, 67],
  RA: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  NA: [-1, 2, 5, 7, 9, 11, 13, 16, 18], // J unreachable
  MA: [3, 5, 6, 8, 10, 11, 13, 15, 16],
  CL: [11, 17, 23, 29, 35, 40, 46, 52, 58],
  CA: [2, 4, 6, 8, 10, 12, 14, 16, 18],
}

// ── 18 – 22 years ────────────────────────────────────────────────────────────
const B_18: BandTable = {
  VA: [4, 7, 9, 11, 14, 16, 19, 21, 23],
  SA: [22, 28, 34, 40, 46, 52, 59, 65, 71],
  RA: [2, 3, 4, 5, 6, 8, 9, 10, 11],
  NA: [6, 7, 9, 11, 12, 14, 15, 17, 18],
  MA: [8, 10, 12, 14, 16, 18, 20, 22, 24],
  CL: [14, 21, 28, 35, 42, 49, 56, 63, 70],
  CA: [3, 5, 7, 9, 11, 13, 15, 17, 18], // source "1-12" for E is a misprint of 12-13
}
const G_18: BandTable = {
  VA: [4, 6, 8, 10, 12, 14, 16, 18, 20],
  SA: [21, 26, 31, 36, 42, 47, 52, 58, 63],
  RA: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  NA: [3, 5, 6, 8, 10, 11, 13, 15, 17],
  MA: [5, 7, 8, 10, 11, 12, 14, 15, 17],
  CL: [22, 27, 33, 39, 44, 50, 55, 61, 66],
  CA: [6, 8, 9, 11, 12, 14, 16, 17, 19],
}

interface AgeBand { min: number; max: number; label: string; male: BandTable; female: BandTable }
const BANDS: AgeBand[] = [
  { min: 12, max: 14.5, label: "13–14.5 yrs", male: B_13, female: G_13 },
  { min: 14.5, max: 15.5, label: "14.5–15.5 yrs", male: B_145, female: G_145 },
  { min: 15.5, max: 16.5, label: "15.5–16.5 yrs", male: B_155, female: G_155 },
  { min: 16.5, max: 18, label: "16.5–17.5 yrs", male: B_165, female: G_165 },
  { min: 18, max: 99, label: "18–22 yrs", male: B_18, female: G_18 },
]

const GRADES: Grade[] = ["J", "I", "H", "G", "F", "E", "D", "C", "B"]

/** The five-level descriptor conventionally attached to a 10-grade standard scale. */
export function gradeBand(g: Grade): { label: string; rank: number } {
  if (g === "A" || g === "B") return { label: "High", rank: 5 }
  if (g === "C" || g === "D") return { label: "Above average", rank: 4 }
  if (g === "E" || g === "F") return { label: "Average", rank: 3 }
  if (g === "G" || g === "H") return { label: "Below average", rank: 2 }
  return { label: "Low", rank: 1 }
}

/** Approximate percentile midpoint per grade on a 10-band standard scale. */
export const GRADE_PERCENTILE: Record<Grade, number> = {
  A: 96, B: 89, C: 77, D: 60, E: 50, F: 40, G: 23, H: 11, I: 4, J: 1,
}

export function normBandFor(age: number) {
  const a = Math.max(12, Math.min(age, 99))
  const band = BANDS.find((b) => a >= b.min && a < b.max) ?? BANDS[BANDS.length - 1]
  return band
}

/** Raw score → standard grade for an ability, given age + gender. */
export function standardScore(ability: AbilityKey, raw: number, age: number, gender: Gender): Grade {
  const band = normBandFor(age)
  const bounds = (gender === "female" ? band.female : band.male)[ability]
  for (let i = 0; i < GRADES.length; i++) {
    if (raw <= bounds[i]) return GRADES[i]
  }
  return "A"
}

export interface AbilityScore {
  key: AbilityKey
  raw: number
  max: number
  attempted: number
  grade: Grade
  band: string
  rank: number
  percentile: number
}

export function scoreAbilitySection(
  ability: AbilityKey, raw: number, attempted: number, age: number, gender: Gender,
): AbilityScore {
  const grade = standardScore(ability, raw, age, gender)
  const b = gradeBand(grade)
  return {
    key: ability, raw, max: ABILITY_MAX[ability], attempted, grade,
    band: b.label, rank: b.rank, percentile: GRADE_PERCENTILE[grade],
  }
}
