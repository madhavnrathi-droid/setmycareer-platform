// FINAL Career Interest Assessment — built from the founder's
// "Interest_Assessment_Manual.docx". 34 interest clusters × (2 Attraction +
// 2 Engagement) + 10 Work Environment × 2 + 10 Job Characteristics × 2 =
// 176 items on a 1–5 like/true scale. Scoring per the manual §6:
//   standardised item = (raw − 1) × 25
//   Attraction A   = mean of the 2 Attraction items
//   Engagement E   = mean of the 2 Engagement items
//   WE / JC factor = mean of its 2 items
//   W, J           = mean of the cluster's 2 mapped WE / JC factor scores
//   Career-Level   = 0.50·E + 0.25·W + 0.25·J   (provisional 50-25-25 model)
//   Hobby-Career Gap HCG = A − Career
// Bands (§6.11): ≥80 Very strong · 65–79 Strong · 50–64 Moderate ·
// 35–49 Low · <35 Very low. Recommendation categories per §7.1.
// Cluster items are only scored when ≥3 of their 4 items are answered (§10).
//
// ITEM TEXT: deliberately reworded for 12–16-year-old readability per the
// founder's notes (2026-07-21) — shorter sentences, everyday vocabulary, one
// idea per item. The wording therefore DIVERGES from the manual on purpose;
// the manual remains the source of truth for what each item MEASURES
// (Attraction = liking the activity/field; Engagement = willingness to do the
// real work repeatedly; WE/JC = the stated preference). When editing an item,
// keep its construct, its position (storage order), and every label intact —
// the portal report-bridge string-matches cluster/factor labels, and the
// scoring bases 136 (WE) / 156 (JC) are hard-coded below.

export interface IfinCluster { label: string; a1: string; a2: string; e1: string; e2: string; we: [string, string]; jc: [string, string] }
export interface IfinSupport { key: string; label: string; i1: string; i2: string }

export const IFIN_SCALE = [
  "Strongly Dislike / Not at all true for me",
  "Dislike / Slightly true for me",
  "Unsure / Moderately true for me",
  "Like / Mostly true for me",
  "Strongly Like / Very true for me",
]

export type IfinBand = "Very strong" | "Strong" | "Moderate" | "Low" | "Very low"
export function ifinBand(score: number): IfinBand {
  if (score >= 80) return "Very strong"
  if (score >= 65) return "Strong"
  if (score >= 50) return "Moderate"
  if (score >= 35) return "Low"
  return "Very low"
}

export type IfinCategory = "Strongly Supported" | "Supported" | "Explore" | "Conditional" | "Hobby / Side Pursuit" | "Not Currently Supported"

export interface IfinFlatItem {
  idx: number
  kind: "attraction" | "engagement" | "we" | "jc"
  /** cluster label (attraction/engagement) or WE/JC factor key */
  owner: string
  ownerLabel: string
  text: string
}

/** The 176 items in manual order: per-cluster A1,A2,E1,E2 → WE pairs → JC pairs.
 *  The runner shuffles DISPLAY order per taker; storage stays in this order. */
export function ifinItems(): IfinFlatItem[] {
  const out: IfinFlatItem[] = []
  for (const c of IFIN_CLUSTERS) {
    out.push({ idx: 0, kind: "attraction", owner: c.label, ownerLabel: c.label, text: c.a1 })
    out.push({ idx: 0, kind: "attraction", owner: c.label, ownerLabel: c.label, text: c.a2 })
    out.push({ idx: 0, kind: "engagement", owner: c.label, ownerLabel: c.label, text: c.e1 })
    out.push({ idx: 0, kind: "engagement", owner: c.label, ownerLabel: c.label, text: c.e2 })
  }
  for (const w of IFIN_WE) {
    out.push({ idx: 0, kind: "we", owner: w.key, ownerLabel: w.label, text: w.i1 })
    out.push({ idx: 0, kind: "we", owner: w.key, ownerLabel: w.label, text: w.i2 })
  }
  for (const j of IFIN_JC) {
    out.push({ idx: 0, kind: "jc", owner: j.key, ownerLabel: j.label, text: j.i1 })
    out.push({ idx: 0, kind: "jc", owner: j.key, ownerLabel: j.label, text: j.i2 })
  }
  return out.map((it, i) => ({ ...it, idx: i }))
}

export interface IfinClusterScore {
  label: string
  attraction: number | null
  engagement: number | null
  w: number | null
  j: number | null
  career: number | null
  hcg: number | null
  attractionBand: IfinBand | null
  careerBand: IfinBand | null
  category: IfinCategory | null
}
export interface IfinSupportScore { key: string; label: string; score: number | null }
export interface IfinFlags {
  missingPct: number
  straightLining: boolean
  highEndorsement: boolean
  lowEndorsement: boolean
  lowDifferentiation: boolean
  confidence: "High" | "Moderate" | "Low"
  notes: string[]
}
export interface IfinResult {
  clusters: IfinClusterScore[]
  we: IfinSupportScore[]
  jc: IfinSupportScore[]
  byAttraction: IfinClusterScore[]
  byCareer: IfinClusterScore[]
  flags: IfinFlags
}

const std = (v: number) => (v - 1) * 25
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

/** answers: 1–5 per ifinItems() index, null = unanswered. */
export function scoreIfin(answers: (number | null)[]): IfinResult {
  const val = (i: number): number | null => {
    const a = answers[i]
    return a != null && a >= 1 && a <= 5 ? std(a) : null
  }

  // support factors first (clusters reference them)
  const weScores: IfinSupportScore[] = IFIN_WE.map((w) => {
    const base = 136 + IFIN_WE.indexOf(w) * 2
    const vals = [val(base), val(base + 1)].filter((v): v is number => v != null)
    return { key: w.key, label: w.label, score: vals.length ? Math.round(mean(vals)!) : null }
  })
  const jcScores: IfinSupportScore[] = IFIN_JC.map((j) => {
    const base = 156 + IFIN_JC.indexOf(j) * 2
    const vals = [val(base), val(base + 1)].filter((v): v is number => v != null)
    return { key: j.key, label: j.label, score: vals.length ? Math.round(mean(vals)!) : null }
  })
  const weBy = new Map(weScores.map((s) => [s.key, s.score]))
  const jcBy = new Map(jcScores.map((s) => [s.key, s.score]))

  const clusters: IfinClusterScore[] = IFIN_CLUSTERS.map((c, ci) => {
    const base = ci * 4
    const raw = [answers[base], answers[base + 1], answers[base + 2], answers[base + 3]]
    const answered = raw.filter((a) => a != null).length
    if (answered < 3) {
      return { label: c.label, attraction: null, engagement: null, w: null, j: null, career: null, hcg: null, attractionBand: null, careerBand: null, category: null }
    }
    const aVals = [val(base), val(base + 1)].filter((v): v is number => v != null)
    const eVals = [val(base + 2), val(base + 3)].filter((v): v is number => v != null)
    const A = aVals.length ? mean(aVals)! : null
    const E = eVals.length ? mean(eVals)! : null
    const wVals = c.we.map((k) => weBy.get(k)).filter((v): v is number => v != null)
    const jVals = c.jc.map((k) => jcBy.get(k)).filter((v): v is number => v != null)
    const W = wVals.length ? mean(wVals)! : null
    const J = jVals.length ? mean(jVals)! : null
    const career = E != null && W != null && J != null ? 0.5 * E + 0.25 * W + 0.25 * J : null
    const hcg = A != null && career != null ? A - career : null

    let category: IfinCategory | null = null
    if (career != null && A != null && hcg != null) {
      if (A >= 65 && hcg > 20) category = "Hobby / Side Pursuit"
      else if (career >= 80 && A >= 65) category = "Strongly Supported"
      else if (career >= 70) category = "Supported"
      else if (career >= 60) category = "Explore"
      else if (career >= 50) category = "Conditional"
      else category = "Not Currently Supported"
    }
    return {
      label: c.label,
      attraction: A != null ? Math.round(A) : null,
      engagement: E != null ? Math.round(E) : null,
      w: W != null ? Math.round(W) : null,
      j: J != null ? Math.round(J) : null,
      career: career != null ? Math.round(career) : null,
      hcg: hcg != null ? Math.round(hcg) : null,
      attractionBand: A != null ? ifinBand(A) : null,
      careerBand: career != null ? ifinBand(career) : null,
      category,
    }
  })

  // ── response quality (§10) ──
  const given = answers.filter((a): a is number => a != null)
  const missingPct = Math.round(((answers.length - given.length) / answers.length) * 100)
  const counts = new Map<number, number>()
  given.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  const maxSame = Math.max(0, ...counts.values())
  const gm = given.length ? given.reduce((x, y) => x + y, 0) / given.length : 0
  const aScores = clusters.map((c) => c.attraction).filter((v): v is number => v != null)
  const am = aScores.length ? aScores.reduce((x, y) => x + y, 0) / aScores.length : 0
  const asd = aScores.length > 1 ? Math.sqrt(aScores.reduce((x, y) => x + (y - am) ** 2, 0) / (aScores.length - 1)) : 0

  const flags: IfinFlags = {
    missingPct,
    straightLining: given.length > 0 && maxSame / given.length >= 0.85,
    highEndorsement: gm > 4.4,
    lowEndorsement: given.length > 0 && gm < 1.6,
    lowDifferentiation: asd < 10,
    confidence: "High",
    notes: [],
  }
  if (missingPct > 10) flags.notes.push("More than 10% of items were left unanswered — profile is provisional.")
  if (flags.straightLining) flags.notes.push("Responses were nearly identical throughout — engagement may have been low.")
  if (flags.highEndorsement) flags.notes.push("Very high agreement across all areas — elevated scores may partly reflect response style.")
  if (flags.lowEndorsement) flags.notes.push("Very low agreement across all areas — depressed scores may partly reflect response style.")
  if (flags.lowDifferentiation) flags.notes.push("Attraction scores are weakly differentiated — treat fine rankings as exploratory.")
  flags.confidence = flags.notes.length === 0 ? "High" : flags.notes.length === 1 ? "Moderate" : "Low"

  const scored = clusters.filter((c) => c.career != null)
  return {
    clusters,
    we: weScores,
    jc: jcScores,
    byAttraction: [...clusters].filter((c) => c.attraction != null).sort((a, b) => (b.attraction ?? 0) - (a.attraction ?? 0)),
    byCareer: [...scored].sort((a, b) => (b.career ?? 0) - (a.career ?? 0)),
    flags,
  }
}

/* ── reliability-index helpers (report only — never touch scoring) ────────── */

/** Pair-agreement check across all 88 construct pairs: per cluster the A-pair
 *  (A1↔A2) and the E-pair (E1↔E2) = 68 pairs, + 10 WE pairs + 10 JC pairs.
 *  A pair is DIVERGENT when both items were answered and the raw 1–5 responses
 *  differ by ≥2 — the two items claim the same construct, so a wide split hints
 *  at inconsistent (or inattentive) responding. */
export interface IfinPairCheck { divergentPairs: number; totalPairs: number; consistency: number | null }
export function ifinPairConsistency(answers: (number | null)[]): IfinPairCheck {
  const pairs: [number, number][] = []
  for (let c = 0; c < IFIN_CLUSTERS.length; c++) {
    const base = c * 4
    pairs.push([base, base + 1], [base + 2, base + 3]) // A-pair, E-pair
  }
  for (let k = 0; k < IFIN_WE.length; k++) pairs.push([136 + k * 2, 137 + k * 2])
  for (let k = 0; k < IFIN_JC.length; k++) pairs.push([156 + k * 2, 157 + k * 2])
  let bothAnswered = 0
  let divergent = 0
  for (const [x, y] of pairs) {
    const a = answers[x]
    const b = answers[y]
    if (a == null || b == null) continue
    bothAnswered++
    if (Math.abs(a - b) >= 2) divergent++
  }
  return {
    divergentPairs: divergent,
    totalPairs: pairs.length,
    consistency: bothAnswered > 0 ? Math.round(100 * (1 - divergent / bothAnswered)) : null,
  }
}

/** Response-time summary for the reliability index. `times` = ms per item in
 *  STORAGE order (null = no time recorded for that item). Old attempts predate
 *  capture entirely → `recorded: false` (the report shows "Not recorded for
 *  this attempt" — honest degrade, never a fabricated number). */
export interface IfinTimingSummary { medianSec: number | null; fastPct: number | null; recorded: boolean }
export function ifinTiming(times: (number | null)[] | undefined): IfinTimingSummary {
  const rec = (times ?? []).filter((t): t is number => t != null && Number.isFinite(t) && t >= 0)
  if (rec.length === 0) return { medianSec: null, fastPct: null, recorded: false }
  const sorted = [...rec].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianMs = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const fast = rec.filter((t) => t < 1200).length
  return {
    medianSec: Math.round((medianMs / 1000) * 10) / 10,
    fastPct: Math.round((fast / rec.length) * 100),
    recorded: true,
  }
}

export const IFIN_CLUSTERS: IfinCluster[] = [
  { label: "Sales & Business Development", a1: "I enjoy noticing what makes people decide to buy or agree to something.", a2: "I find it interesting how some people convince others so easily.", e1: "I would enjoy meeting people often and suggesting things that fit their needs.", e2: "I would enjoy chasing targets by building relationships and convincing people.", we: ["WE8", "WE2"], jc: ["JC5", "JC4"] },
  { label: "Digital Marketing", a1: "I enjoy seeing how online posts and videos grab people's attention.", a2: "I find it interesting why some ads or posts become popular and others don't.", e1: "I would enjoy making online content and improving it again and again.", e2: "I would enjoy studying how audiences react online and using that to improve posts.", we: ["WE1", "WE6"], jc: ["JC3", "JC5"] },
  { label: "Finance & Banking", a1: "I enjoy learning how money, savings, banks, and investments work.", a2: "I find it interesting how money decisions change people's lives or businesses.", e1: "I would enjoy working with money figures and deciding based on the numbers.", e2: "I would enjoy keeping watch on money matters and spotting risks or mistakes.", we: ["WE5", "WE2"], jc: ["JC1", "JC9"] },
  { label: "Entrepreneurship", a1: "I enjoy thinking of ideas that could become a product or business.", a2: "I get excited when I spot an opportunity others have missed.", e1: "I would enjoy taking charge of turning an idea into something real.", e2: "I would enjoy working on something new even when success is not guaranteed.", we: ["WE4", "WE2"], jc: ["JC5", "JC4"] },
  { label: "Leadership & Management", a1: "I enjoy seeing how people, plans, and resources come together to reach a goal.", a2: "I find it interesting how organisations make decisions and organise their work.", e1: "I would enjoy leading people and resources to get results.", e2: "I would enjoy making decisions that affect a whole team, even difficult ones.", we: ["WE2", "WE3"], jc: ["JC4", "JC8"] },
  { label: "Human Resources", a1: "I enjoy learning what helps people do their best work together.", a2: "I find it interesting that different people want different things from work.", e1: "I would enjoy helping an organisation hire, train, and support its people.", e2: "I would enjoy handling people matters at a workplace every day.", we: ["WE8", "WE3"], jc: ["JC2", "JC7"] },
  { label: "Law", a1: "I enjoy learning about rules, rights, justice, and how disputes get settled.", a2: "I find it interesting to weigh both sides of an argument before judging.", e1: "I would enjoy studying cases and evidence to build a strong argument.", e2: "I would enjoy reading detailed material and checking facts carefully.", we: ["WE7", "WE5"], jc: ["JC1", "JC4"] },
  { label: "Public Policy & Governance", a1: "I enjoy learning how governments and their decisions shape people's lives.", a2: "I find it interesting how a new rule or scheme affects different communities.", e1: "I would enjoy working on solutions to problems society faces.", e2: "I would enjoy checking whether public schemes work and suggesting improvements.", we: ["WE1", "WE7"], jc: ["JC10", "JC7"] },
  { label: "Administration & Compliance", a1: "I enjoy neat systems, accurate records, and things running smoothly.", a2: "I feel satisfied when rules, timetables, and records are properly kept.", e1: "I would enjoy organising files, schedules, and everyday office tasks.", e2: "I would enjoy making sure rules and procedures are followed correctly.", we: ["WE5", "WE2"], jc: ["JC9", "JC8"] },
  { label: "Education & Teaching", a1: "I enjoy helping others understand new ideas or skills.", a2: "I feel happy when someone learns something because I explained it.", e1: "I would enjoy teaching or guiding learners regularly.", e2: "I would enjoy preparing lessons and feedback for students with different needs.", we: ["WE8", "WE7"], jc: ["JC7", "JC2"] },
  { label: "Physical Science & Research", a1: "I enjoy learning how nature and the physical world work.", a2: "I find scientific discoveries and experiments fascinating.", e1: "I would enjoy doing experiments and studying the results.", e2: "I would enjoy testing an idea again and again until the evidence is clear.", we: ["WE1", "WE7"], jc: ["JC10", "JC1"] },
  { label: "Social Science & Research", a1: "I enjoy learning how people, groups, and societies work.", a2: "I find subjects like history, economics, and human behaviour interesting.", e1: "I would enjoy studying social problems and explaining what I find.", e2: "I would enjoy collecting facts about people and communities and analysing them.", we: ["WE1", "WE7"], jc: ["JC10", "JC7"] },
  { label: "Core Engineering", a1: "I enjoy learning how machines, structures, and technical things work.", a2: "I find it interesting how physical products are designed and built.", e1: "I would enjoy solving technical problems using science and maths.", e2: "I would enjoy testing and improving machines, structures, or processes myself.", we: ["WE10", "WE2"], jc: ["JC6", "JC1"] },
  { label: "IT & Software Engineering", a1: "I enjoy learning how software and apps solve problems.", a2: "I find it interesting how apps, websites, and computer systems are made.", e1: "I would enjoy spending long hours building or improving software.", e2: "I would enjoy fixing bugs and testing programs until they work properly.", we: ["WE1", "WE4"], jc: ["JC1", "JC8"] },
  { label: "Data Science & Analytics", a1: "I enjoy finding patterns hidden in numbers, charts, or information.", a2: "I find it interesting to use data to answer questions.", e1: "I would enjoy studying data to find trends and useful insights.", e2: "I would enjoy cleaning up data and testing ideas to reach solid conclusions.", we: ["WE1", "WE7"], jc: ["JC1", "JC10"] },
  { label: "AI & Robotics", a1: "I enjoy learning about AI, robots, and machines that make decisions.", a2: "I find it fascinating that machines can spot patterns and do complex tasks.", e1: "I would enjoy spending long hours building and improving smart machines.", e2: "I would enjoy working on robot or automation problems that need logic and trial.", we: ["WE1", "WE7"], jc: ["JC10", "JC6"] },
  { label: "Healthcare / Medicine", a1: "I enjoy learning about health, illness, and how treatments work.", a2: "I find medicine, patient care, and hospitals interesting.", e1: "I would enjoy studying medical knowledge and helping people stay healthy.", e2: "I would enjoy caring for patients even with the serious responsibility involved.", we: ["WE2", "WE7"], jc: ["JC2", "JC1"] },
  { label: "Allied Health", a1: "I enjoy learning how therapy, tests, and medicines help people recover.", a2: "I find recovery care and specialised health services interesting.", e1: "I would enjoy careful work like health tests, therapy, or pharmacy tasks.", e2: "I would enjoy helping people slowly regain strength and health over time.", we: ["WE2", "WE10"], jc: ["JC2", "JC6"] },
  { label: "Psychology", a1: "I enjoy understanding why people think, feel, and act differently.", a2: "I find people's emotions, motivation, and behaviour fascinating.", e1: "I would enjoy helping people work through personal problems.", e2: "I would enjoy listening carefully and studying why people behave as they do.", we: ["WE8", "WE7"], jc: ["JC2", "JC10"] },
  { label: "Social Work", a1: "I enjoy understanding the problems that families and communities face.", a2: "I find social causes like fairness, poverty, and community welfare meaningful.", e1: "I would enjoy supporting people going through hard times.", e2: "I would enjoy working with communities to improve difficult living conditions.", we: ["WE8", "WE9"], jc: ["JC2", "JC7"] },
  { label: "Hospitality", a1: "I enjoy making people feel welcome and comfortable.", a2: "I find hotels, travel, and guest service interesting.", e1: "I would enjoy looking after small details that make a guest's stay better.", e2: "I would enjoy handling guests' needs and complaints calmly.", we: ["WE8", "WE6"], jc: ["JC2", "JC6"] },
  { label: "Event Management", a1: "I enjoy watching events and celebrations come together well.", a2: "I find it exciting to plan activities involving many people and details.", e1: "I would enjoy organising events with many people, suppliers, and schedules.", e2: "I would enjoy fixing last-minute problems to keep an event on time.", we: ["WE6", "WE3"], jc: ["JC5", "JC6"] },
  { label: "Creative Arts & Design", a1: "I enjoy art, design, and things that look beautiful.", a2: "I find fresh designs, colours, and original visual ideas appealing.", e1: "I would enjoy creating designs, drawings, or artwork.", e2: "I would enjoy reworking a creative idea until it is truly finished.", we: ["WE4", "WE7"], jc: ["JC3", "JC6"] },
  { label: "Performing Arts", a1: "I enjoy performing and expressing feelings in front of others.", a2: "I find music, acting, dance, and the stage exciting.", e1: "I would enjoy practising and performing before an audience regularly.", e2: "I would enjoy long hours of rehearsal even when facing criticism or rejection.", we: ["WE8", "WE7"], jc: ["JC3", "JC4"] },
  { label: "Journalism & Mass Communication", a1: "I enjoy finding and sharing information the public should know.", a2: "I find news, current events, and the media interesting.", e1: "I would enjoy investigating stories and reporting them accurately.", e2: "I would enjoy collecting facts from many sources and presenting them clearly.", we: ["WE6", "WE8"], jc: ["JC7", "JC10"] },
  { label: "Writing & Content Creation", a1: "I enjoy expressing ideas and stories through words or media.", a2: "I like shaping a message so it suits its audience.", e1: "I would enjoy regularly creating written, audio, or video content.", e2: "I would enjoy rewriting and polishing my work until it communicates clearly.", we: ["WE4", "WE7"], jc: ["JC3", "JC7"] },
  { label: "Architecture", a1: "I enjoy learning how buildings and spaces are designed.", a2: "I find it interesting how buildings can be useful, safe, and beautiful together.", e1: "I would enjoy designing buildings or spaces.", e2: "I would enjoy turning a rough idea into detailed drawings and plans.", we: ["WE5", "WE7"], jc: ["JC6", "JC3"] },
  { label: "Agriculture & Environment", a1: "I enjoy learning how food, soil, water, and climate are connected.", a2: "I find farming, nature, and the environment interesting.", e1: "I would enjoy working to grow food better or protect natural resources.", e2: "I would enjoy solving real problems on farms, in fields, or in nature.", we: ["WE9", "WE7"], jc: ["JC6", "JC10"] },
  { label: "Defence Services", a1: "I admire discipline, duty, and serving the country.", a2: "I find the armed forces, public safety, and organised missions interesting.", e1: "I would enjoy working where discipline and readiness are expected every day.", e2: "I would enjoy tough missions that need teamwork, fitness, and personal sacrifice.", we: ["WE2", "WE3"], jc: ["JC4", "JC6"] },
  { label: "Operations Management", a1: "I enjoy seeing how work, time, and resources can be used well.", a2: "I find it interesting how daily work can be made smoother and more reliable.", e1: "I would enjoy making processes and services run faster and better.", e2: "I would enjoy handling many tasks and fixing problems to keep work moving.", we: ["WE5", "WE6"], jc: ["JC8", "JC6"] },
  { label: "Retail & Consumer Business", a1: "I enjoy noticing what customers like and how products are presented.", a2: "I find shops, products, prices, and customer behaviour interesting.", e1: "I would enjoy managing a shop's products, stock, and customers.", e2: "I would enjoy serving customers well while working towards sales goals.", we: ["WE8", "WE6"], jc: ["JC5", "JC6"] },
  { label: "Supply Chain & Logistics", a1: "I enjoy learning how goods travel from factories to shops and homes.", a2: "I find the big network of buying, transport, and delivery interesting.", e1: "I would enjoy planning how products move from place to place.", e2: "I would enjoy sorting out delivery problems like delays and missing supplies.", we: ["WE5", "WE2"], jc: ["JC8", "JC1"] },
  { label: "Sports & Physical Fitness", a1: "I enjoy sports, exercise, and staying physically fit.", a2: "I find it inspiring to watch people grow stronger through training.", e1: "I would enjoy following a regular training routine to improve my fitness.", e2: "I would enjoy setting fitness goals and working steadily to reach them.", we: ["WE7", "WE10"], jc: ["JC6", "JC4"] },
  { label: "Adventure & Exploration", a1: "I enjoy exploring and trying unfamiliar experiences.", a2: "I find outdoor adventures and new places exciting.", e1: "I would enjoy regular outdoor activities that involve challenge and uncertainty.", e2: "I would enjoy planning and going on treks or expeditions.", we: ["WE9", "WE7"], jc: ["JC6", "JC10"] },
]

export const IFIN_WE: IfinSupport[] = [
  { key: "WE1", label: "Learning Driven", i1: "I prefer work where I keep learning new things.", i2: "I feel energised when my work makes me grow and adapt." },
  { key: "WE2", label: "Accountable", i1: "I prefer roles where the results depend on me.", i2: "I am comfortable answering for my promises and results." },
  { key: "WE3", label: "Team Oriented", i1: "I enjoy working closely with others towards a shared goal.", i2: "I feel satisfied when I contribute as part of a team." },
  { key: "WE4", label: "Independent", i1: "I enjoy the freedom to decide how I do my work.", i2: "I prefer managing my own tasks without much supervision." },
  { key: "WE5", label: "Organized", i1: "I prefer workplaces where everything is planned and orderly.", i2: "I enjoy keeping tasks, information, and things well arranged." },
  { key: "WE6", label: "Fast Paced", i1: "I enjoy situations where things change quickly and I must act fast.", i2: "I feel energised when work is urgent and fast-moving." },
  { key: "WE7", label: "Enduring", i1: "I can stick with work that needs patience and long effort.", i2: "I prefer work where results come only after steady persistence." },
  { key: "WE8", label: "Interaction Oriented", i1: "I enjoy spending much of my day talking with people.", i2: "I get energy from conversations and building relationships." },
  { key: "WE9", label: "Field Based", i1: "I enjoy work that takes me out of an office or classroom.", i2: "I prefer being where the action happens, not staying in one place." },
  { key: "WE10", label: "Hands-On", i1: "I enjoy working directly with tools, materials, or equipment.", i2: "I learn best by doing things, not just reading or discussing." },
]

export const IFIN_JC: IfinSupport[] = [
  { key: "JC1", label: "Logical", i1: "I prefer work where decisions rest on evidence and reasoning.", i2: "I enjoy spotting patterns and causes before deciding." },
  { key: "JC2", label: "Helping", i1: "I feel satisfied when I help someone overcome a problem.", i2: "I enjoy directly helping another person grow or feel better." },
  { key: "JC3", label: "Expressive", i1: "I enjoy sharing ideas in creative or interesting ways.", i2: "I prefer work that welcomes originality and self-expression." },
  { key: "JC4", label: "Assertive", i1: "I can state my view clearly when something important is at stake.", i2: "I enjoy taking charge when someone needs to lead." },
  { key: "JC5", label: "Enterprising", i1: "I enjoy spotting opportunities and acting on ideas.", i2: "I prefer work where I can chase big goals and influence results." },
  { key: "JC6", label: "Practical", i1: "I prefer solutions that actually work in real life.", i2: "I enjoy turning ideas into results I can see or touch." },
  { key: "JC7", label: "Informative", i1: "I enjoy sharing useful knowledge with others.", i2: "I prefer work where I explain things clearly to people." },
  { key: "JC8", label: "Structured", i1: "I value planning, order, and step-by-step methods.", i2: "I prefer work with clear steps and clear responsibilities." },
  { key: "JC9", label: "Conventional", i1: "I value accuracy, records, and attention to detail.", i2: "I prefer steady, dependable routines over constant change." },
  { key: "JC10", label: "Inquiring", i1: "I enjoy exploring new questions and possibilities.", i2: "I like digging into why things happen." },
]
