// FINAL Career Interest Assessment — generated from the founder's
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
// Do not hand-edit item text or mappings — regenerate from the manual.

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

export const IFIN_CLUSTERS: IfinCluster[] = [
  { label: "Sales & Business Development", a1: "I enjoy observing how products, services, or ideas influence people's decisions.", a2: "I find it interesting to understand why some people are more persuasive than others.", e1: "I would enjoy regularly meeting people and discussing solutions that match their needs.", e2: "I would enjoy working toward targets that depend on relationship building, follow-up, and influencing decisions.", we: ["WE8", "WE2"], jc: ["JC5", "JC4"] },
  { label: "Digital Marketing", a1: "I enjoy understanding how online content attracts attention and influences behaviour.", a2: "I find it interesting to study why certain advertisements, posts, or campaigns perform better than others.", e1: "I would enjoy regularly creating, testing, and improving digital campaigns or content.", e2: "I would enjoy analysing audience responses and online trends to improve communication results.", we: ["WE1", "WE6"], jc: ["JC3", "JC5"] },
  { label: "Finance & Banking", a1: "I enjoy understanding how money, investments, financial records, and banking systems work.", a2: "I find it interesting to examine how financial decisions affect individuals or organisations.", e1: "I would enjoy regularly analysing financial information and making decisions based on numbers.", e2: "I would enjoy monitoring financial performance and identifying risks, errors, or opportunities.", we: ["WE5", "WE2"], jc: ["JC1", "JC9"] },
  { label: "Entrepreneurship", a1: "I enjoy thinking about ideas that could become useful products, services, or businesses.", a2: "I find it exciting to notice opportunities where others mainly see problems.", e1: "I would enjoy taking responsibility for turning an idea into reality despite uncertainty.", e2: "I would enjoy building and improving something new even when success is not guaranteed.", we: ["WE4", "WE2"], jc: ["JC5", "JC4"] },
  { label: "Leadership & Management", a1: "I enjoy understanding how people, priorities, and resources work together to achieve a goal.", a2: "I find it interesting to observe how organisations make decisions and coordinate different functions.", e1: "I would enjoy coordinating people and resources to achieve organisational outcomes.", e2: "I would enjoy balancing competing priorities and taking decisions that affect a team or organisation.", we: ["WE2", "WE3"], jc: ["JC4", "JC8"] },
  { label: "Human Resources", a1: "I enjoy understanding what helps people perform, develop, and work well together.", a2: "I find it interesting to understand differences in people's motivations, strengths, and work needs.", e1: "I would enjoy helping organisations recruit, develop, and support employees.", e2: "I would enjoy handling people-related processes, discussions, and workplace-development activities regularly.", we: ["WE8", "WE3"], jc: ["JC2", "JC7"] },
  { label: "Law", a1: "I enjoy understanding rules, rights, responsibilities, justice, and how disputes are resolved.", a2: "I find it interesting to analyse different sides of an argument before reaching a conclusion.", e1: "I would enjoy regularly analysing cases, rules, and evidence to build a logical position.", e2: "I would enjoy reading detailed material, preparing arguments, and examining facts carefully.", we: ["WE7", "WE5"], jc: ["JC1", "JC4"] },
  { label: "Public Policy & Governance", a1: "I enjoy understanding how governments, institutions, and public decisions influence society.", a2: "I find it interesting to study how policies affect communities and different groups of people.", e1: "I would enjoy working on solutions to public and social issues.", e2: "I would enjoy evaluating programmes or policies and recommending improvements based on evidence.", we: ["WE1", "WE7"], jc: ["JC10", "JC7"] },
  { label: "Administration & Compliance", a1: "I enjoy orderly systems, accurate records, and the smooth functioning of processes.", a2: "I find it satisfying when rules, schedules, and information are properly maintained.", e1: "I would enjoy organising information, schedules, documents, and routine operational activities.", e2: "I would enjoy ensuring that procedures are followed accurately and consistently.", we: ["WE5", "WE2"], jc: ["JC9", "JC8"] },
  { label: "Education & Teaching", a1: "I enjoy helping other people understand new ideas or skills.", a2: "I find it rewarding when someone learns because of my explanation or guidance.", e1: "I would enjoy regularly teaching, mentoring, or facilitating learning.", e2: "I would enjoy preparing explanations, activities, and feedback for learners with different needs.", we: ["WE8", "WE7"], jc: ["JC7", "JC2"] },
  { label: "Physical Science & Research", a1: "I enjoy understanding how the natural and physical world works.", a2: "I find scientific discoveries, experiments, and evidence-based explanations fascinating.", e1: "I would enjoy conducting experiments and analysing scientific observations.", e2: "I would enjoy investigating technical questions through repeated testing, evidence, and logic.", we: ["WE1", "WE7"], jc: ["JC10", "JC1"] },
  { label: "Social Science & Research", a1: "I enjoy understanding how people, groups, institutions, and societies function.", a2: "I find it interesting to study human behaviour, social systems, history, or economics.", e1: "I would enjoy researching social issues and interpreting findings.", e2: "I would enjoy collecting and analysing information about people, communities, or institutions.", we: ["WE1", "WE7"], jc: ["JC10", "JC7"] },
  { label: "Core Engineering", a1: "I enjoy understanding how machines, structures, materials, and technical systems work.", a2: "I find it interesting to understand how physical products or systems are designed and built.", e1: "I would enjoy solving technical problems using engineering principles.", e2: "I would enjoy testing and improving machines, structures, products, or processes through technical work.", we: ["WE10", "WE2"], jc: ["JC6", "JC1"] },
  { label: "IT & Software Engineering", a1: "I enjoy understanding how software and digital systems solve problems.", a2: "I find it interesting to explore how applications, platforms, and computer systems are created.", e1: "I would enjoy spending substantial time developing or improving software solutions.", e2: "I would enjoy debugging, testing, and refining digital systems until they work reliably.", we: ["WE1", "WE4"], jc: ["JC1", "JC8"] },
  { label: "Data Science & Analytics", a1: "I enjoy discovering patterns hidden within numbers, charts, or information.", a2: "I find it interesting to use data to answer questions and support decisions.", e1: "I would enjoy analysing data to identify trends, relationships, and useful insights.", e2: "I would enjoy cleaning information, testing explanations, and developing evidence-based recommendations.", we: ["WE1", "WE7"], jc: ["JC1", "JC10"] },
  { label: "AI & Robotics", a1: "I enjoy learning about intelligent technologies, automation, and machine-based decision systems.", a2: "I find it fascinating how machines can recognise patterns or perform complex tasks.", e1: "I would enjoy spending substantial time designing, testing, and improving intelligent systems.", e2: "I would enjoy working repeatedly on automation or robotics problems that require logic and experimentation.", we: ["WE1", "WE7"], jc: ["JC10", "JC6"] },
  { label: "Healthcare / Medicine", a1: "I enjoy understanding health, illness, treatment, and human wellbeing.", a2: "I find medical knowledge, patient care, and healthcare systems interesting.", e1: "I would enjoy regularly learning clinical information and contributing to people's health.", e2: "I would enjoy working in situations that involve patient care, health-related decisions, and serious responsibility.", we: ["WE2", "WE7"], jc: ["JC2", "JC1"] },
  { label: "Allied Health", a1: "I enjoy understanding how therapies, diagnostics, medicines, and rehabilitation improve quality of life.", a2: "I find recovery, treatment support, and specialised healthcare services interesting.", e1: "I would enjoy performing careful diagnostic, therapeutic, pharmacy, or rehabilitation-related activities.", e2: "I would enjoy helping people improve physical, functional, or health-related abilities over time.", we: ["WE2", "WE10"], jc: ["JC2", "JC6"] },
  { label: "Psychology", a1: "I enjoy understanding why people think, feel, and behave differently.", a2: "I find human emotions, motivation, relationships, and behaviour fascinating.", e1: "I would enjoy spending time helping individuals understand and address personal or behavioural challenges.", e2: "I would enjoy regularly listening, asking thoughtful questions, and examining behavioural patterns in depth.", we: ["WE8", "WE7"], jc: ["JC2", "JC10"] },
  { label: "Social Work", a1: "I enjoy understanding challenges faced by individuals, families, and communities.", a2: "I find social causes, inequality, welfare, and community-development issues meaningful.", e1: "I would enjoy supporting people facing personal or social difficulties.", e2: "I would enjoy working with communities, services, or institutions to improve difficult social conditions.", we: ["WE8", "WE9"], jc: ["JC2", "JC7"] },
  { label: "Hospitality", a1: "I enjoy creating comfortable, welcoming, and enjoyable experiences for other people.", a2: "I find guest service, travel experiences, and customer satisfaction interesting.", e1: "I would enjoy consistently paying attention to details that improve a guest's experience.", e2: "I would enjoy coordinating service activities and responding calmly to guest needs or complaints.", we: ["WE8", "WE6"], jc: ["JC2", "JC6"] },
  { label: "Event Management", a1: "I enjoy seeing events, celebrations, exhibitions, or programmes come together successfully.", a2: "I find it exciting to plan and coordinate activities involving many people and details.", e1: "I would enjoy organising events involving multiple people, suppliers, schedules, and moving parts.", e2: "I would enjoy managing logistics and last-minute problems under strict timelines.", we: ["WE6", "WE3"], jc: ["JC5", "JC6"] },
  { label: "Creative Arts & Design", a1: "I enjoy visual creativity, aesthetics, and artistic expression.", a2: "I find innovative designs, colours, forms, and original visual ideas appealing.", e1: "I would enjoy creating visual concepts, designs, or artistic work.", e2: "I would enjoy refining creative ideas repeatedly until they become finished outputs.", we: ["WE4", "WE7"], jc: ["JC3", "JC6"] },
  { label: "Performing Arts", a1: "I enjoy artistic performance and expressing ideas or emotions before others.", a2: "I find stage performance, music, acting, dance, and audience engagement exciting.", e1: "I would enjoy regularly practising and performing before an audience.", e2: "I would enjoy investing substantial time in rehearsal and skill development despite criticism or rejection.", we: ["WE8", "WE7"], jc: ["JC3", "JC4"] },
  { label: "Journalism & Mass Communication", a1: "I enjoy discovering and sharing information that may be useful or important to the public.", a2: "I find current events, public-interest topics, media, and communication processes interesting.", e1: "I would enjoy investigating issues and reporting findings accurately.", e2: "I would enjoy gathering information from multiple sources and presenting it clearly to a public audience.", we: ["WE6", "WE8"], jc: ["JC7", "JC10"] },
  { label: "Writing & Content Creation", a1: "I enjoy expressing ideas, information, or stories through words or multimedia.", a2: "I find it satisfying to shape messages for different audiences.", e1: "I would enjoy regularly creating written, audio, visual, or digital content.", e2: "I would enjoy researching, revising, and improving content until it communicates effectively.", we: ["WE4", "WE7"], jc: ["JC3", "JC7"] },
  { label: "Architecture", a1: "I enjoy understanding how buildings, spaces, and environments are designed.", a2: "I find the relationship between functionality, safety, human use, and aesthetics interesting.", e1: "I would enjoy designing buildings, spaces, or environments.", e2: "I would enjoy translating broad ideas into detailed drawings, plans, and specifications.", we: ["WE5", "WE7"], jc: ["JC6", "JC3"] },
  { label: "Agriculture & Environment", a1: "I enjoy understanding how food, crops, soil, water, climate, and natural resources are connected.", a2: "I find farming, ecosystems, sustainability, and environmental systems interesting.", e1: "I would enjoy improving agricultural productivity, conservation, or sustainable resource use.", e2: "I would enjoy working on practical field or research problems related to food and the environment.", we: ["WE9", "WE7"], jc: ["JC6", "JC10"] },
  { label: "Defence Services", a1: "I admire discipline, duty, national service, and coordinated missions.", a2: "I find strategic operations, public safety, and organised service roles interesting.", e1: "I would enjoy working in environments that demand discipline, responsibility, and readiness.", e2: "I would enjoy contributing to missions that require teamwork, resilience, physical effort, and personal sacrifice.", we: ["WE2", "WE3"], jc: ["JC4", "JC6"] },
  { label: "Operations Management", a1: "I enjoy understanding how work, resources, time, and processes can function efficiently.", a2: "I find process improvement and reliable day-to-day execution interesting.", e1: "I would enjoy improving the efficiency and reliability of processes or services.", e2: "I would enjoy coordinating multiple activities and solving disruptions to keep work running smoothly.", we: ["WE5", "WE6"], jc: ["JC8", "JC6"] },
  { label: "Retail & Consumer Business", a1: "I enjoy understanding consumer preferences, purchasing behaviour, and product presentation.", a2: "I find retail environments, products, pricing, and customer interactions interesting.", e1: "I would enjoy managing products, customers, stock, and business performance in a retail setting.", e2: "I would enjoy improving customer experience while working toward sales and commercial outcomes.", we: ["WE8", "WE6"], jc: ["JC5", "JC6"] },
  { label: "Supply Chain & Logistics", a1: "I enjoy understanding how goods, information, and resources move from one place to another.", a2: "I find large interconnected systems of purchasing, transport, storage, and delivery interesting.", e1: "I would enjoy planning and coordinating the movement of products and resources.", e2: "I would enjoy solving logistical problems involving delays, locations, suppliers, and multiple stakeholders.", we: ["WE5", "WE2"], jc: ["JC8", "JC1"] },
  { label: "Sports & Physical Fitness", a1: "I enjoy sports, exercise, and activities that improve physical fitness.", a2: "I find it inspiring to see people develop physical abilities through training and practice.", e1: "I would enjoy following a regular training routine to improve fitness or athletic performance.", e2: "I would enjoy setting physical performance goals and working consistently to achieve them.", we: ["WE7", "WE10"], jc: ["JC6", "JC4"] },
  { label: "Adventure & Exploration", a1: "I enjoy activities that involve exploration, discovery, and unfamiliar experiences.", a2: "I find outdoor adventures, challenging terrain, and new environments exciting.", e1: "I would enjoy participating regularly in outdoor activities that involve challenge and uncertainty.", e2: "I would enjoy planning and undertaking treks, expeditions, or exploration-based experiences.", we: ["WE9", "WE7"], jc: ["JC6", "JC10"] },
]

export const IFIN_WE: IfinSupport[] = [
  { key: "WE1", label: "Learning Driven", i1: "I prefer environments where I am continuously learning new knowledge or skills.", i2: "I feel energised when my work requires regular development and adaptation." },
  { key: "WE2", label: "Accountable", i1: "I prefer roles where I am personally responsible for meaningful outcomes.", i2: "I am comfortable being held accountable for commitments and results." },
  { key: "WE3", label: "Team Oriented", i1: "I enjoy working closely with others to achieve common goals.", i2: "I gain satisfaction from contributing as part of a team." },
  { key: "WE4", label: "Independent", i1: "I enjoy having freedom to decide how I approach my work.", i2: "I prefer managing my tasks with limited supervision." },
  { key: "WE5", label: "Organized", i1: "I prefer environments where work is planned and well organised.", i2: "I enjoy keeping activities, information, and resources structured." },
  { key: "WE6", label: "Fast Paced", i1: "I enjoy situations where priorities change and quick action is required.", i2: "I feel energised when work involves urgency and rapid movement." },
  { key: "WE7", label: "Enduring", i1: "I can remain involved in work that requires patience and long-term effort.", i2: "I prefer roles where meaningful results may require sustained persistence." },
  { key: "WE8", label: "Interaction Oriented", i1: "I enjoy spending a significant part of my day interacting with people.", i2: "I gain energy from conversations, discussions, and relationship building." },
  { key: "WE9", label: "Field Based", i1: "I enjoy work that takes me outside a regular office or classroom setting.", i2: "I prefer being present where activities are happening rather than remaining at one location." },
  { key: "WE10", label: "Hands-On", i1: "I enjoy working directly with tools, equipment, materials, or practical activities.", i2: "I prefer learning and solving problems by doing rather than only reading or discussing." },
]

export const IFIN_JC: IfinSupport[] = [
  { key: "JC1", label: "Logical", i1: "I prefer work where conclusions are based on evidence and reasoning.", i2: "I enjoy identifying patterns, causes, and relationships before deciding." },
  { key: "JC2", label: "Helping", i1: "I gain satisfaction from helping people overcome challenges.", i2: "I enjoy contributing directly to another person's growth or wellbeing." },
  { key: "JC3", label: "Expressive", i1: "I enjoy communicating ideas in creative or engaging ways.", i2: "I prefer work where originality and self-expression are encouraged." },
  { key: "JC4", label: "Assertive", i1: "I am comfortable stating a position clearly when an issue is important.", i2: "I enjoy taking charge when action or direction is needed." },
  { key: "JC5", label: "Enterprising", i1: "I enjoy identifying opportunities and turning ideas into action.", i2: "I prefer work where I can pursue ambitious goals and influence outcomes." },
  { key: "JC6", label: "Practical", i1: "I prefer solutions that work in real-life situations.", i2: "I enjoy applying ideas to produce tangible or visible results." },
  { key: "JC7", label: "Informative", i1: "I enjoy sharing knowledge and useful information with others.", i2: "I prefer work where I explain concepts, findings, or instructions clearly." },
  { key: "JC8", label: "Structured", i1: "I value planning, sequence, and organised methods.", i2: "I prefer work that follows clear steps and defined responsibilities." },
  { key: "JC9", label: "Conventional", i1: "I appreciate accuracy, records, standards, and attention to detail.", i2: "I prefer consistency and dependable procedures over unnecessary change." },
  { key: "JC10", label: "Inquiring", i1: "I enjoy exploring new questions, explanations, and possibilities.", i2: "I like understanding why things happen and examining issues in depth." },
]
