// ─────────────────────────────────────────────────────────────────────────────
// Deterministic engines — the maths the agents run. Pure functions over the
// student profile + curated data: no LLM, no randomness, fully explainable. The
// LLM layer narrates these numbers; it never invents them.
//
//   admissionProbability · roiEstimate · employabilityForecast · scholarshipMatch
//   · domainFit
// ─────────────────────────────────────────────────────────────────────────────

import type {
  StudentProfile, College, Scholarship, Domain,
  AdmissionEstimate, ROIEstimate, EmployabilityForecast, ScholarshipMatch, Likelihood,
} from "./types"

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const logistic = (x: number) => 1 / (1 + Math.exp(-x))
const bandFor = (p: number): Likelihood => (p >= 80 ? "safe" : p >= 50 ? "target" : p >= 25 ? "reach" : "unlikely")

// ── admission probability ────────────────────────────────────────────────────
// Compares the student's exam outcome to the college's closing cutoff for their
// category and maps the margin through a logistic curve. Rank: lower is better,
// so being *below* the closing rank is good. Percentile/score: higher is better.

export function admissionProbability(profile: StudentProfile, college: College): AdmissionEstimate | null {
  if (!college.cutoffs?.length) return null
  const cat = profile.category ?? "general"
  // pick a cutoff matching the student's category (fall back to general), for any
  // exam the student has a result in.
  const results = profile.examResults ?? []
  let best: { est: AdmissionEstimate; prob: number } | null = null

  for (const cut of college.cutoffs) {
    const res = results.find((r) => r.examId === cut.examId)
    if (!res) continue
    if (cut.category !== cat && cut.category !== "general") continue

    const student = cut.metric === "rank" ? res.rank : cut.metric === "percentile" ? res.percentile : res.score
    if (student == null) continue

    // soft margin in "band widths": +1 ≈ comfortably in, 0 ≈ right at the cutoff,
    // −1 ≈ comfortably out. Each metric needs its own scale because rank, percentile
    // (dense near 100) and score (out of a max) compress very differently.
    let m: number
    if (cut.metric === "rank") m = (cut.closing - student) / (Math.max(cut.closing, 1) * 0.5)
    else if (cut.metric === "percentile") m = (student - cut.closing) / (Math.max(100 - cut.closing, 0.5) * 0.5)
    else m = (student - cut.closing) / (Math.max(cut.closing, 1) * 0.06) // score

    // logistic centred on the cutoff; k=2.2 → ±1 band ≈ 90/10.
    const prob = clamp(Math.round(logistic(2.2 * m) * 100))
    const studentStr = cut.metric === "rank" ? `rank ${student.toLocaleString("en-IN")}` : cut.metric === "percentile" ? `${student} %ile` : `score ${student}`
    const closeStr = cut.metric === "rank" ? `closes ~${cut.closing.toLocaleString("en-IN")}` : `closes ~${cut.closing}`
    const est: AdmissionEstimate = {
      collegeId: college.id, collegeName: college.shortName ?? college.name,
      program: cut.branch, probability: prob, band: bandFor(prob), examId: cut.examId,
      basis: `${cat.toUpperCase()} ${cut.branch ?? "flagship"}: your ${studentStr} vs ${closeStr}`,
    }
    if (!best || prob > best.prob) best = { est, prob }
  }
  return best?.est ?? null
}

// ── ROI / outcomes ───────────────────────────────────────────────────────────
// Total program cost (tuition × years + living) vs expected starting CTC, with a
// simple payback period and a 10-year nominal net. Normalised to a 0–100 score.

const LIVING_PER_YEAR = 150_000 // indicative hostel + expenses, INR/yr

export function roiEstimate(college: College, durationYears = 4): ROIEstimate {
  const fee = college.annualFee ?? 150_000
  const totalCost = fee * durationYears + LIVING_PER_YEAR * durationYears
  const startCTC = college.medianPackage ?? 600_000
  const paybackYears = +(totalCost / Math.max(startCTC, 1)).toFixed(2)
  // 10-year nominal: assume ~8% annual growth on starting CTC, minus the one-off cost
  let earn = 0, ctc = startCTC
  for (let y = 0; y < 10; y++) { earn += ctc; ctc *= 1.08 }
  const tenYearNet = Math.round(earn - totalCost)
  // score blends payback (faster = better) and absolute net
  const paybackScore = clamp(100 - paybackYears * 18)
  const netScore = clamp((tenYearNet / 12_000_000) * 100)
  return {
    collegeId: college.id, collegeName: college.shortName ?? college.name,
    totalCost, expectedStartCTC: startCTC, paybackYears, tenYearNet,
    roiScore: Math.round(paybackScore * 0.5 + netScore * 0.5),
  }
}

// ── employability / market outlook ───────────────────────────────────────────
// A curated domain-outlook table (the live build refreshes it from NCS/NSDC demand
// signals; static here so the number is explainable).

interface DomainSignal { outlook: number; trend: EmployabilityForecast["trend"]; drivers: string[]; risks: string[]; roles: string[] }

const DOMAIN_OUTLOOK: Partial<Record<Domain, DomainSignal>> = {
  engineering: { outlook: 82, trend: "rising", drivers: ["AI/ML & data demand", "semiconductor & EV push", "global capability centres"], risks: ["commoditised core IT roles", "automation of routine coding"], roles: ["Software/Data Engineer", "ML Engineer", "Embedded/Chip Designer"] },
  computer_applications: { outlook: 80, trend: "rising", drivers: ["cloud & SaaS growth", "cybersecurity skills gap"], risks: ["GenAI compresses junior dev demand"], roles: ["Full-stack Dev", "Cloud/DevOps", "Security Analyst"] },
  medical: { outlook: 78, trend: "stable", drivers: ["ageing demographics", "tier-2/3 healthcare expansion", "diagnostics & devices"], risks: ["very long, costly training", "seat scarcity"], roles: ["Physician", "Surgeon", "Diagnostician"] },
  management: { outlook: 72, trend: "stable", drivers: ["consulting & product roles", "startup operating talent"], risks: ["MBA oversupply at lower tiers"], roles: ["Product Manager", "Consultant", "Operations Lead"] },
  commerce_finance: { outlook: 74, trend: "rising", drivers: ["fintech & digital payments", "GCC finance shared-services"], risks: ["automation of bookkeeping"], roles: ["Analyst", "CA/CFA track", "Fintech Ops"] },
  law: { outlook: 70, trend: "rising", drivers: ["corporate, IP & data-privacy law", "litigation & policy"], risks: ["tier matters a lot for outcomes"], roles: ["Corporate Counsel", "Litigator", "Policy Analyst"] },
  design: { outlook: 71, trend: "rising", drivers: ["product/UX demand", "D2C & content economy"], risks: ["portfolio-driven, tier-agnostic competition"], roles: ["UX/UI Designer", "Product Designer", "Design Researcher"] },
  pure_sciences: { outlook: 64, trend: "stable", drivers: ["research, data & analytics crossover", "deep-tech"], risks: ["academic track is long; needs PG"], roles: ["Research Scientist", "Data Analyst", "Academia"] },
  architecture: { outlook: 60, trend: "stable", drivers: ["infrastructure & urban growth"], risks: ["cyclical with real estate"], roles: ["Architect", "Urban Planner", "BIM Specialist"] },
  humanities: { outlook: 62, trend: "stable", drivers: ["content, policy, EdTech, civil services"], risks: ["pathway-dependent outcomes"], roles: ["Civil Services", "Content/Policy", "Educator"] },
}

export function employabilityForecast(domain: Domain): EmployabilityForecast {
  const s = DOMAIN_OUTLOOK[domain] ?? { outlook: 60, trend: "stable" as const, drivers: ["broad-based demand"], risks: ["depends on specialisation"], roles: ["varied"] }
  return { domain, outlook: s.outlook, trend: s.trend, demandDrivers: s.drivers, risks: s.risks, roles: s.roles }
}

// ── scholarship matching ─────────────────────────────────────────────────────
// Scores how well the student meets each award's gates; eligible requires every
// hard gate to pass (income, category, academics, gender, disability, level).

export function scholarshipMatch(profile: StudentProfile, s: Scholarship): ScholarshipMatch {
  const reasons: string[] = []
  let eligible = true
  let fit = 60

  // a student who just finished 12th IS the audience for UG-entry scholarships
  const levelOk = s.level.includes(profile.level) || (profile.level === "after_12th" && s.level.includes("ug"))
  if (!levelOk) { eligible = false; reasons.push("level mismatch") }
  if (s.incomeCeiling != null) {
    if (profile.familyIncome == null) { fit -= 5; reasons.push("income not provided — verify ceiling") }
    else if (profile.familyIncome <= s.incomeCeiling) { fit += 15; reasons.push(`income within ₹${(s.incomeCeiling / 100000).toFixed(1)}L ceiling`) }
    else { eligible = false; reasons.push(`income above ₹${(s.incomeCeiling / 100000).toFixed(1)}L ceiling`) }
  }
  if (s.categories?.length) {
    if (profile.category && s.categories.includes(profile.category)) { fit += 15; reasons.push(`${profile.category.toUpperCase()} eligible`) }
    else { eligible = false; reasons.push(`restricted to ${s.categories.join("/").toUpperCase()}`) }
  }
  if (s.minAcademicPercent != null) {
    if (profile.academicPercent == null) { fit -= 5; reasons.push("academic % not provided") }
    else if (profile.academicPercent >= s.minAcademicPercent) { fit += 12; reasons.push(`meets ${s.minAcademicPercent}% academic bar`) }
    else { eligible = false; reasons.push(`below ${s.minAcademicPercent}% academic bar`) }
  }
  if (s.genders?.length) {
    if (profile.gender && s.genders.includes(profile.gender)) { fit += 8; reasons.push(`for ${s.genders.join("/")}`) }
    else { eligible = false; reasons.push(`restricted to ${s.genders.join("/")}`) }
  }
  if (s.forDisability) {
    if (profile.personDisability) { fit += 10; reasons.push("PwD eligible") }
    else { eligible = false; reasons.push("for persons with disability") }
  }

  return {
    scholarshipId: s.id, name: s.name, eligible,
    fit: clamp(eligible ? fit : Math.min(fit, 35)),
    reasons, benefit: s.benefit, approxAnnualValue: s.approxAnnualValue,
  }
}

// ── psychometric domain fit ──────────────────────────────────────────────────
// Maps the Sigma aptitude battery + RIASEC interests onto study domains. Each
// domain has an aptitude weight vector and a Holland-code affinity; the score is
// their weighted blend (interests lead when present, aptitude grounds it).

type Apt = NonNullable<StudentProfile["aptitude"]>
const DOMAIN_FIT: Partial<Record<Domain, { apt: Partial<Apt>; riasec: string; label: string }>> = {
  engineering: { apt: { quantitative: 0.4, logical: 0.4, spatial: 0.2 }, riasec: "IR", label: "Engineering & Technology" },
  computer_applications: { apt: { logical: 0.5, quantitative: 0.3, verbal: 0.2 }, riasec: "IC", label: "Computing & Software" },
  medical: { apt: { quantitative: 0.3, verbal: 0.3, logical: 0.4 }, riasec: "IS", label: "Medicine & Life Sciences" },
  management: { apt: { verbal: 0.4, logical: 0.3, quantitative: 0.3 }, riasec: "ES", label: "Management & Business" },
  commerce_finance: { apt: { quantitative: 0.5, clerical: 0.2, logical: 0.3 }, riasec: "CE", label: "Commerce & Finance" },
  law: { apt: { verbal: 0.6, logical: 0.4 }, riasec: "SE", label: "Law & Policy" },
  design: { apt: { spatial: 0.5, verbal: 0.2, logical: 0.3 }, riasec: "AR", label: "Design & Creative" },
  pure_sciences: { apt: { quantitative: 0.4, logical: 0.5, spatial: 0.1 }, riasec: "IR", label: "Pure & Applied Sciences" },
  humanities: { apt: { verbal: 0.6, clerical: 0.1, logical: 0.3 }, riasec: "SA", label: "Humanities & Social Sciences" },
  architecture: { apt: { spatial: 0.5, quantitative: 0.2, logical: 0.3 }, riasec: "AR", label: "Architecture & Planning" },
}

export function domainFit(profile: StudentProfile): { domain: Domain; score: number; why: string }[] {
  const apt = profile.aptitude
  const ria = profile.interests
  const out: { domain: Domain; score: number; why: string }[] = []

  for (const [domain, def] of Object.entries(DOMAIN_FIT) as [Domain, NonNullable<(typeof DOMAIN_FIT)[Domain]>][]) {
    let aptScore = 60
    if (apt) {
      let s = 0, w = 0
      for (const [k, weight] of Object.entries(def.apt)) {
        const v = apt[k as keyof Apt]
        if (v != null) { s += v * (weight as number); w += weight as number }
      }
      if (w > 0) aptScore = s / w
    }
    let riaScore = 60
    if (ria) {
      const codes = def.riasec.split("") as (keyof NonNullable<StudentProfile["interests"]>)[]
      const vals = codes.map((c) => ria[c]).filter((v): v is number => v != null)
      if (vals.length) riaScore = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    // interests lead (0.55) when present; aptitude grounds it (0.45)
    const score = Math.round(clamp(riaScore * 0.55 + aptScore * 0.45))
    const why = `${def.label}: aptitude ${Math.round(aptScore)} · interest ${Math.round(riaScore)}`
    out.push({ domain, score, why })
  }
  return out.sort((a, b) => b.score - a.score)
}
