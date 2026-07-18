// FINAL Career Competency & Potential Assessment (CCPA) — generated from the
// founder's "Competency_Assessment_Manual.docx". Three methods over 12
// competencies:
//   Part A  Situational Judgement — 16 scenarios, choose MOST and LEAST likely
//           (per-option competency loadings; raw = Σ MOST − Σ LEAST; scaled to
//           0–100 against the enumerated min/max of all valid MOST≠LEAST pairs)  40%
//   Part B  Forced choice — 24 blocks of 4 statements, choose MOST and LEAST
//           descriptive (+2 MOST / −2 LEAST for that option's competency; each
//           competency appears 8× → raw −16..+16 → 0–100)                       30%
//   Part C  48 indirect Likert statements, 4 per competency (1 reverse each);
//           mean of ≥3 answered → 0–100 = 25 × (mean − 1)                       30%
// Composite(c) = 0.40·SJT + 0.30·FC + 0.30·LIK. Provisional bands per §7.8.
// Do not hand-edit scenario text, statements or loadings — regenerate.

export type CompCode = "AR" | "SO" | "LA" | "CC" | "CL" | "IN" | "IT" | "ED" | "AD" | "ST" | "LO" | "IV"
export const COMP_CODES: CompCode[] = ["AR", "SO", "LA", "CC", "CL", "IN", "IT", "ED", "AD", "ST", "LO", "IV"]

export const COMPETENCIES: Record<CompCode, { label: string; blurb: string }> = {
  AR: { label: "Analytical Reasoning", blurb: "Separates a complex issue into meaningful parts, identifies patterns and causes, evaluates evidence, and draws logically defensible conclusions." },
  SO: { label: "Solution Orientation", blurb: "Converts a problem into workable alternatives and selects a practical course of action within real constraints." },
  LA: { label: "Learning Agility", blurb: "Acquires unfamiliar knowledge quickly, learns from experience, unlearns outdated methods and applies learning in new contexts." },
  CC: { label: "Communication Clarity", blurb: "Organises and conveys information so that different audiences understand the intended message and required action." },
  CL: { label: "Collaboration", blurb: "Works interdependently, shares information, integrates different perspectives and contributes to a shared result." },
  IN: { label: "Influence", blurb: "Builds voluntary support for an idea or course of action through reasoning, credibility, relationships and appropriate persuasion." },
  IT: { label: "Initiative", blurb: "Recognises useful action before being instructed and begins responsible action without waiting for ideal conditions." },
  ED: { label: "Execution Discipline", blurb: "Translates priorities into organised, reliable completion while monitoring deadlines, quality and follow-through." },
  AD: { label: "Adaptability", blurb: "Maintains effectiveness when priorities, information, roles or conditions change, while preserving essential objectives." },
  ST: { label: "Stakeholder Orientation", blurb: "Understands the needs, impact and expectations of customers, users, colleagues and other affected parties, then responds responsibly." },
  LO: { label: "Leadership Ownership", blurb: "Provides direction, accepts accountability for collective outcomes and enables others to perform, especially when ambiguity or difficulty is present." },
  IV: { label: "Innovation", blurb: "Creates and tests useful new approaches by questioning assumptions, connecting ideas and learning through disciplined experimentation." },
}

export type OptionKey = "A" | "B" | "C" | "D"
export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"]

export interface Sjt {
  n: number
  title: string
  scenario: string
  options: Record<OptionKey, string>
  loadings: Record<OptionKey, Partial<Record<CompCode, number>>>
}
export interface FcBlock { n: number; statements: Record<OptionKey, string>; codes: Record<OptionKey, CompCode> }
export interface CcpaLikItem { id: string; comp: CompCode; text: string; reverse: boolean }

/** One MOST/LEAST pick (option letters); null = not yet answered. */
export interface MostLeast { m: OptionKey; l: OptionKey }

export const CCPA_SCALE = ["Strongly Disagree", "Disagree", "Neither Agree nor Disagree", "Agree", "Strongly Agree"]

export type CcpaBand = "Very pronounced" | "Pronounced" | "Moderate" | "Less consistent" | "Much less characteristic"
export function ccpaBand(score: number): CcpaBand {
  if (score >= 80) return "Very pronounced"
  if (score >= 65) return "Pronounced"
  if (score >= 50) return "Moderate"
  if (score >= 35) return "Less consistent"
  return "Much less characteristic"
}

export interface CcpaCompScore {
  code: CompCode
  label: string
  blurb: string
  sjt: number | null
  fc: number | null
  lik: number | null
  composite: number | null
  band: CcpaBand | null
}
export interface CcpaFlags {
  sjtPositionBias: boolean
  fcPositionBias: boolean
  likLongString: boolean
  likLowVariance: boolean
  notes: string[]
}
export interface CcpaResult { comps: CcpaCompScore[]; top: CcpaCompScore[]; flags: CcpaFlags }

/** Theoretical SJT min/max per competency, enumerating every valid MOST≠LEAST
 *  pair per scenario (per §7.2) — computed once at module load. */
function sjtRange(): Record<CompCode, { min: number; max: number }> {
  const out = Object.fromEntries(COMP_CODES.map((c) => [c, { min: 0, max: 0 }])) as Record<CompCode, { min: number; max: number }>
  for (const s of SJTS) {
    for (const c of COMP_CODES) {
      let lo = Infinity, hi = -Infinity
      for (const m of OPTION_KEYS) for (const l of OPTION_KEYS) {
        if (m === l) continue
        const v = (s.loadings[m][c] ?? 0) - (s.loadings[l][c] ?? 0)
        lo = Math.min(lo, v); hi = Math.max(hi, v)
      }
      out[c].min += lo; out[c].max += hi
    }
  }
  return out
}
let _range: Record<CompCode, { min: number; max: number }> | null = null

/** sjt/fc: one MOST+LEAST per block (null = skipped); lik: 1–5 per CCPA_LIK index. */
export function scoreCcpa(
  sjt: (MostLeast | null)[],
  fc: (MostLeast | null)[],
  lik: (number | null)[],
): CcpaResult {
  _range ??= sjtRange()
  const comps: CcpaCompScore[] = COMP_CODES.map((code) => {
    // Part A — SJT
    let raw = 0, sjtAnswered = 0
    SJTS.forEach((s, i) => {
      const a = sjt[i]
      if (!a) return
      sjtAnswered++
      raw += (s.loadings[a.m][code] ?? 0) - (s.loadings[a.l][code] ?? 0)
    })
    const r = _range![code]
    const sjtScore = sjtAnswered >= SJTS.length - 1 && r.max > r.min
      ? Math.round((100 * (raw - r.min)) / (r.max - r.min))
      : null

    // Part B — forced choice
    let fcRaw = 0, fcAnswered = 0
    FC_BLOCKS.forEach((b, i) => {
      const a = fc[i]
      if (!a) return
      fcAnswered++
      if (b.codes[a.m] === code) fcRaw += 2
      if (b.codes[a.l] === code) fcRaw -= 2
    })
    const fcScore = fcAnswered >= FC_BLOCKS.length - 2 ? Math.round((100 * (fcRaw + 16)) / 32) : null

    // Part C — Likert (mean of ≥3 of the competency's 4 items)
    const vals: number[] = []
    CCPA_LIK.forEach((it, i) => {
      if (it.comp !== code) return
      const a = lik[i]
      if (a != null && a >= 1 && a <= 5) vals.push(it.reverse ? 6 - a : a)
    })
    const likScore = vals.length >= 3 ? Math.round(25 * (vals.reduce((x, y) => x + y, 0) / vals.length - 1)) : null

    const composite = sjtScore != null && fcScore != null && likScore != null
      ? Math.round(0.4 * sjtScore + 0.3 * fcScore + 0.3 * likScore)
      : null
    return {
      code, label: COMPETENCIES[code].label, blurb: COMPETENCIES[code].blurb,
      sjt: sjtScore, fc: fcScore, lik: likScore, composite,
      band: composite != null ? ccpaBand(composite) : null,
    }
  })

  // response-quality (§7.9)
  const mostPos = (arr: (MostLeast | null)[]) => {
    const c = new Map<string, number>()
    arr.forEach((a) => { if (a) c.set(a.m, (c.get(a.m) ?? 0) + 1) })
    return Math.max(0, ...c.values())
  }
  const givenLik = lik.filter((a): a is number => a != null)
  let maxRun = 0, run = 0, prev: number | null = null
  for (const a of lik) {
    if (a != null && a === prev) run++
    else run = a != null ? 1 : 0
    prev = a; maxRun = Math.max(maxRun, run)
  }
  const gm = givenLik.length ? givenLik.reduce((x, y) => x + y, 0) / givenLik.length : 0
  const gsd = givenLik.length > 1 ? Math.sqrt(givenLik.reduce((a, b) => a + (b - gm) ** 2, 0) / (givenLik.length - 1)) : 0
  const flags: CcpaFlags = {
    sjtPositionBias: mostPos(sjt) >= 13,
    fcPositionBias: mostPos(fc) >= 18,
    likLongString: maxRun >= 16,
    likLowVariance: givenLik.length > 0 && gsd < 0.35,
    notes: [],
  }
  if (flags.sjtPositionBias) flags.notes.push("The same option position was chosen MOST in 13+ scenarios — possible position bias.")
  if (flags.fcPositionBias) flags.notes.push("The same option position was chosen MOST in 18+ forced-choice blocks — possible response strategy.")
  if (flags.likLongString) flags.notes.push("A long run of identical ratings was detected — engagement may have been low.")
  if (flags.likLowVariance) flags.notes.push("Very low rating variance — statements were weakly differentiated.")

  const top = [...comps].filter((c) => c.composite != null).sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0)).slice(0, 3)
  return { comps, top, flags }
}

export const SJTS: Sjt[] = [
  { n: 1, title: "The delayed launch", scenario: "Your team is preparing to launch a new service in five days. Testing shows an intermittent error, but the exact cause is still unclear. Customers have already been informed of the launch date.",
    options: {A: "Pause the entire launch until the exact technical cause is known.", B: "Launch as planned and ask the team to repair problems if customers report them.", C: "Assess severity, identify a safe temporary control, revise the launch scope and inform affected stakeholders.", D: "Ask senior management to decide because the risk belongs to them."},
    loadings: {A: {AR: 3, ST: 1}, B: {ED: 2, AD: 1, ST: -2}, C: {SO: 3, ST: 2, ED: 1}, D: {LO: -2, IT: -1, ST: 1}} },
  { n: 2, title: "The unfamiliar assignment", scenario: "You are assigned a project using a tool you have never used. The deadline is realistic, but no formal training is available.",
    options: {A: "Request reassignment because someone experienced will produce better work.", B: "Start immediately by trial and error without first identifying reliable learning resources.", C: "Break the task into learning needs, use documentation and expert guidance, then apply the learning to a small test.", D: "Wait until a colleague has time to show you every step."},
    loadings: {A: {LA: -2, AD: -1}, B: {IT: 2, LA: 1, ED: -1}, C: {LA: 3, AR: 1, ED: 1}, D: {CL: 1, IT: -2, LA: -1}} },
  { n: 3, title: "The underperforming colleague", scenario: "A reliable colleague has recently missed two commitments. Other team members are becoming frustrated, but the reason is unknown.",
    options: {A: "Discuss the pattern privately, understand the cause, agree on recovery actions and monitor the next commitment.", B: "Reassign the colleague's work without discussion so the deadline is protected.", C: "Raise the issue in the next team meeting so everyone understands the impact.", D: "Wait for one more failure because the colleague was reliable in the past."},
    loadings: {A: {LO: 3, CC: 2, CL: 1}, B: {ED: 2, CL: -1, LO: -1}, C: {CC: 1, LO: -2, ST: -1}, D: {AD: 1, ED: -2, LO: -1}} },
  { n: 4, title: "The changing customer request", scenario: "Halfway through a project, a customer requests a major change that could improve usefulness but would affect cost and schedule.",
    options: {A: "Reject the change because the original agreement has already been approved.", B: "Accept the change immediately to keep the customer satisfied.", C: "Clarify the need, estimate impact, offer alternatives and agree on a revised decision with the customer.", D: "Send the request to the project sponsor without analysis."},
    loadings: {A: {ED: 2, ST: -2, AD: -1}, B: {ST: 2, ED: -2, AR: -1}, C: {ST: 3, AR: 2, SO: 2}, D: {LO: -1, IT: -1, ST: 1}} },
  { n: 5, title: "The old process", scenario: "A routine process has been used for years. You believe a digital method could reduce errors, but the current process is familiar and stable.",
    options: {A: "Replace the process immediately and explain the benefits afterward.", B: "Document the current errors, build a small pilot, compare results and involve users before wider adoption.", C: "Keep the process because stability is more important than possible improvement.", D: "Mention the idea informally and wait to see whether someone senior takes it forward."},
    loadings: {A: {IV: 2, IT: 2, ST: -2}, B: {IV: 3, AR: 2, ST: 1}, C: {ED: 1, IV: -2, LA: -1}, D: {IV: 1, IN: 1, IT: -2}} },
  { n: 6, title: "The unpopular recommendation", scenario: "Your analysis indicates that the most popular proposal will probably fail. The meeting is dominated by senior colleagues who support it.",
    options: {A: "Stay silent because challenging senior colleagues could damage relationships.", B: "State that the proposal is wrong and insist that the group follow your analysis.", C: "Present the evidence, explain the risk, acknowledge uncertainty and suggest a test or decision criterion.", D: "Discuss your concern privately after the meeting and avoid affecting the current decision."},
    loadings: {A: {IN: -2, CC: -1, AR: 1}, B: {AR: 2, IN: -1, CL: -2}, C: {IN: 3, CC: 2, AR: 2}, D: {CC: 1, IN: 1, ED: -1}} },
  { n: 7, title: "The critical feedback", scenario: "A manager says your recent presentation was accurate but too detailed and difficult for the audience to follow.",
    options: {A: "Explain that the audience should have prepared better because the subject is complex.", B: "Ask for examples, identify where attention was lost and redesign the next presentation for the audience.", C: "Use fewer facts next time, even if some important qualifications are omitted.", D: "Avoid presenting in the future and send written material instead."},
    loadings: {A: {CC: -2, LA: -2}, B: {LA: 3, CC: 3}, C: {AD: 2, CC: 1, AR: -1}, D: {CC: -2, AD: -1}} },
  { n: 8, title: "Competing deadlines", scenario: "Three important tasks are due in the same week. It is unlikely that all three can be completed to the expected standard with available time.",
    options: {A: "Work longer hours and try to complete everything without raising concern.", B: "Rank the tasks by impact and dependency, estimate capacity, negotiate priorities and track the revised plan.", C: "Start with the easiest task to create momentum and decide about the others later.", D: "Wait for the manager to notice the workload problem."},
    loadings: {A: {ED: 2, ST: -1, LO: -1}, B: {ED: 3, AR: 1, CC: 2}, C: {ED: 1, SO: 1, AR: -1}, D: {IT: -2, ED: -2}} },
  { n: 9, title: "The recurring service failure", scenario: "A recurring customer complaint has been handled several times with temporary fixes. The complaint appears again during a busy period.",
    options: {A: "Apply the usual fix because immediate service restoration is the priority.", B: "Restore service, record the pattern and schedule a root-cause review with the relevant functions.", C: "Tell the customer that the issue is known and may occur again until the system is replaced.", D: "Escalate the complaint without proposing action because it involves several departments."},
    loadings: {A: {SO: 1, ED: 2, AR: -1}, B: {SO: 3, AR: 2, CL: 1}, C: {ST: 1, SO: -1, CC: -1}, D: {CL: 1, IT: -2, SO: -1}} },
  { n: 10, title: "The team disagreement", scenario: "Two experienced colleagues strongly disagree about how to complete a task. The disagreement is affecting the rest of the team.",
    options: {A: "Choose the approach you personally prefer so that work can continue.", B: "Ask each colleague to explain assumptions and evidence, identify common criteria, and agree on a decision process.", C: "Let them continue debating because experienced professionals should resolve their own differences.", D: "Divide the task so both approaches can be used, even if they do not integrate well."},
    loadings: {A: {LO: 2, CL: -2, AR: -1}, B: {CL: 3, CC: 2, AR: 1}, C: {CL: -2, LO: -1}, D: {AD: 1, CL: 1, ED: -1}} },
  { n: 11, title: "The new technology", scenario: "A new technology may significantly affect your field, but its value is uncertain and your current workload is heavy.",
    options: {A: "Ignore it until your organisation formally adopts it.", B: "Spend substantial time mastering it immediately, even if current commitments slip.", C: "Identify likely relevance, allocate limited exploration time, test a useful application and review evidence.", D: "Follow online opinions and adopt whichever view is most popular."},
    loadings: {A: {LA: -2, IV: -1}, B: {LA: 3, ED: -2}, C: {LA: 3, IV: 2, ED: 1}, D: {AR: -2, LA: 1}} },
  { n: 12, title: "The overlooked opportunity", scenario: "You notice a small market opportunity that is outside your formal responsibility but could benefit the organisation.",
    options: {A: "Prepare a brief evidence-based proposal and discuss a limited next step with the appropriate owner.", B: "Begin contacting potential customers immediately so the opportunity is not lost.", C: "Mention it casually to a colleague and consider your responsibility complete.", D: "Ignore it because working outside role boundaries creates risk."},
    loadings: {A: {IT: 3, IN: 2, AR: 1}, B: {IT: 3, ST: -2, LO: -1}, C: {IT: -1, IN: 1}, D: {IT: -2, IV: -1}} },
  { n: 13, title: "The urgent decision", scenario: "A decision must be made within an hour. Information is incomplete, and delaying the decision also has consequences.",
    options: {A: "Delay until all important information is available.", B: "Identify the minimum critical information, assess reversible and irreversible risks, decide and set a review point.", C: "Ask the most senior person available to decide.", D: "Choose quickly based on instinct and avoid wasting time on analysis."},
    loadings: {A: {AR: 2, AD: -2, LO: -1}, B: {LO: 3, AD: 2, AR: 2}, C: {LO: -2, CL: 1}, D: {IT: 2, AR: -2, LO: 1}} },
  { n: 14, title: "The colleague requesting help", scenario: "A colleague asks for help shortly before your own deadline. Their task affects the team result, but helping fully could put your commitment at risk.",
    options: {A: "Decline immediately because each person is responsible for their own work.", B: "Take over their task so the team result is protected.", C: "Clarify the problem, offer focused support or resources, and agree on what each person will complete.", D: "Help without mentioning your own deadline and work late to catch up."},
    loadings: {A: {CL: -2, ED: 2}, B: {CL: 1, ED: -2, LO: -1}, C: {CL: 3, ED: 2, CC: 1}, D: {CL: 2, ST: -1, ED: -1}} },
  { n: 15, title: "The rejected idea", scenario: "A proposal you developed is rejected. The decision-maker says it is interesting but not financially justified.",
    options: {A: "Abandon the idea because the decision-maker has already concluded.", B: "Argue that innovation cannot always be judged through financial measures.", C: "Ask which assumptions are unconvincing, revise the value case and test the riskiest assumption at low cost.", D: "Take the proposal to another decision-maker without informing the first."},
    loadings: {A: {IV: -2, LA: -1}, B: {IV: 2, IN: -1, ST: -1}, C: {IV: 3, LA: 2, IN: 2}, D: {IN: 2, ST: -2, CL: -1}} },
  { n: 16, title: "The ethical pressure", scenario: "A senior colleague asks you to present a project result in a way that hides an important limitation. The result will influence a client decision.",
    options: {A: "Follow the instruction because the senior colleague owns the client relationship.", B: "Refuse publicly in the meeting so the client knows you disagree.", C: "Raise the concern privately, explain the decision risk, and propose wording that presents both the result and limitation clearly.", D: "Include the limitation in technical notes where it is available but unlikely to be noticed."},
    loadings: {A: {LO: -2, ST: -3, CC: -1}, B: {LO: 2, ST: 2, CC: -1, CL: -2}, C: {ST: 3, CC: 3, IN: 2}, D: {ST: 1, CC: -2, LO: -1}} },
]

export const FC_BLOCKS: FcBlock[] = [
  { n: 1, statements: {A: "Find the cause of an unexpected result", B: "Bring people together around a common approach", C: "Finish a difficult commitment on time", D: "Test a new possibility"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 2, statements: {A: "Clarify what a customer actually needs", B: "Start useful work without being reminded", C: "Explain a complex matter simply", D: "Learn an unfamiliar method quickly"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 3, statements: {A: "Take responsibility when a group is uncertain", B: "Gain support for a proposal", C: "Create a practical way around an obstacle", D: "Adjust when priorities change suddenly"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 4, statements: {A: "Compare evidence before deciding", B: "Help a team integrate different viewpoints", C: "Track work until every commitment is closed", D: "Question an assumption that limits improvement"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 5, statements: {A: "Consider how a decision affects different people", B: "Notice and act on an opportunity", C: "Structure information for an audience", D: "Apply learning from one situation to another"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 6, statements: {A: "Set direction when no one is sure what to do", B: "Persuade others without using authority", C: "Generate workable alternatives", D: "Remain effective with incomplete information"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 7, statements: {A: "Identify a pattern hidden in data", B: "Share resources so the group performs better", C: "Prioritise competing deadlines", D: "Combine ideas to create a different approach"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 8, statements: {A: "Use feedback to improve a service", B: "Volunteer for a neglected responsibility", C: "Check that others understood the message", D: "Seek a challenge that requires new knowledge"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 9, statements: {A: "Own the result of a difficult decision", B: "Build commitment to a change", C: "Turn a vague problem into an actionable solution", D: "Change approach without losing the objective"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 10, statements: {A: "Distinguish fact from assumption", B: "Offer support while preserving shared accountability", C: "Maintain steady follow-through during a long project", D: "Run a small experiment before a major change"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 11, statements: {A: "Balance the needs of several stakeholders", B: "Take the first responsible step", C: "Adapt the level of detail to the listener", D: "Update a view when new evidence appears"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 12, statements: {A: "Delegate clearly and hold people accountable", B: "Frame an idea in terms that matter to others", C: "Select a solution that works within constraints", D: "Reprioritise after a major disruption"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 13, statements: {A: "Examine why a problem keeps returning", B: "Build on another person's idea", C: "Communicate slippage before it becomes a crisis", D: "Imagine a useful service that does not yet exist"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 14, statements: {A: "Clarify expectations before offering help", B: "Act when a useful gap is visible", C: "Make the required action clear", D: "Learn through feedback after a mistake"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 15, statements: {A: "Make a decision despite reasonable uncertainty", B: "Address resistance to an important proposal", C: "Find another route when the first method fails", D: "Work effectively in a new environment"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 16, statements: {A: "Test competing explanations", B: "Resolve disagreement around common criteria", C: "Create a sequence of steps and complete them", D: "Improve an established system"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 17, statements: {A: "Anticipate the downstream effect on users", B: "Move an idea from discussion to first action", C: "Listen and summarise before responding", D: "Explore knowledge outside current expertise"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 18, statements: {A: "Guide a team through a difficult period", B: "Establish credibility for a recommendation", C: "Design a practical response to a service failure", D: "Stay productive while requirements evolve"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 19, statements: {A: "Find the important relationship among several facts", B: "Coordinate work that depends on several people", C: "Close a task before shifting attention", D: "Challenge a routine that no longer adds value"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 20, statements: {A: "Recognise a need that was not clearly expressed", B: "Begin preparation before being asked", C: "Present a concise recommendation", D: "Master a new tool for an immediate task"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 21, statements: {A: "Accept accountability for a collective outcome", B: "Create agreement among different interests", C: "Improve a process that repeatedly creates difficulty", D: "Recover quickly after plans fail"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
  { n: 22, statements: {A: "Use evidence to identify the strongest explanation", B: "Invite quieter members to contribute", C: "Maintain quality when workload increases", D: "Develop and test an original alternative"}, codes: {A: "AR", B: "CL", C: "ED", D: "IV"} },
  { n: 23, statements: {A: "Respond fairly to competing requests", B: "Take responsibility for an unassigned issue", C: "Translate technical information for a non-technical person", D: "Unlearn an outdated method"}, codes: {A: "ST", B: "IT", C: "CC", D: "LA"} },
  { n: 24, statements: {A: "Provide direction and enable others to act", B: "Motivate action through a convincing case", C: "Convert an obstacle into a feasible next step", D: "Switch priorities without losing momentum"}, codes: {A: "LO", B: "IN", C: "SO", D: "AD"} },
]

export const CCPA_LIK: CcpaLikItem[] = [
  { id: "AR1", comp: "AR", text: "When two explanations appear possible, I look for information that can separate them.", reverse: false },
  { id: "AR2", comp: "AR", text: "I notice when a conclusion is based on an assumption rather than a fact.", reverse: false },
  { id: "AR3", comp: "AR", text: "I naturally organise scattered information into a pattern.", reverse: false },
  { id: "AR4", comp: "AR", text: "Once an answer appears reasonable, further checking usually feels unnecessary.", reverse: true },
  { id: "SO1", comp: "SO", text: "When a method fails, I can usually identify another workable route.", reverse: false },
  { id: "SO2", comp: "SO", text: "I try to define what can actually be changed before proposing a solution.", reverse: false },
  { id: "SO3", comp: "SO", text: "I consider whether a solution can be implemented with available time and resources.", reverse: false },
  { id: "SO4", comp: "SO", text: "When a problem has no obvious answer, I prefer someone else to decide what to do.", reverse: true },
  { id: "LA1", comp: "LA", text: "I can use lessons from one type of task in a different type of task.", reverse: false },
  { id: "LA2", comp: "LA", text: "Feedback often changes how I approach the next attempt.", reverse: false },
  { id: "LA3", comp: "LA", text: "I can become useful in an unfamiliar area within a reasonable time.", reverse: false },
  { id: "LA4", comp: "LA", text: "I avoid assignments that require me to learn a completely new method.", reverse: true },
  { id: "CC1", comp: "CC", text: "Before explaining something, I decide what the listener most needs to understand.", reverse: false },
  { id: "CC2", comp: "CC", text: "I can state the main point without losing essential meaning.", reverse: false },
  { id: "CC3", comp: "CC", text: "I notice when my explanation is not reaching the other person.", reverse: false },
  { id: "CC4", comp: "CC", text: "If my message is accurate, it is not my responsibility whether others understand it.", reverse: true },
  { id: "CL1", comp: "CL", text: "I share information that may help another person complete their part of the work.", reverse: false },
  { id: "CL2", comp: "CL", text: "I can disagree with a colleague without making the relationship unworkable.", reverse: false },
  { id: "CL3", comp: "CL", text: "I adjust my contribution when the group needs something different from me.", reverse: false },
  { id: "CL4", comp: "CL", text: "I prefer to keep my work separate even when the result depends on coordination.", reverse: true },
  { id: "IN1", comp: "IN", text: "I can explain an idea in terms of what matters to the other person.", reverse: false },
  { id: "IN2", comp: "IN", text: "When people resist a proposal, I try to understand the reason before responding.", reverse: false },
  { id: "IN3", comp: "IN", text: "I can gain commitment even when I do not control the final decision.", reverse: false },
  { id: "IN4", comp: "IN", text: "I usually withdraw an idea when others do not support it immediately.", reverse: true },
  { id: "IT1", comp: "IT", text: "I notice useful work that has not yet been assigned.", reverse: false },
  { id: "IT2", comp: "IT", text: "I take a reasonable first step before asking others to solve a routine problem.", reverse: false },
  { id: "IT3", comp: "IT", text: "I act on worthwhile opportunities without waiting for perfect conditions.", reverse: false },
  { id: "IT4", comp: "IT", text: "I prefer detailed direction before beginning anything unfamiliar.", reverse: true },
  { id: "ED1", comp: "ED", text: "I keep track of commitments that are easy to forget during busy periods.", reverse: false },
  { id: "ED2", comp: "ED", text: "I communicate early when a deadline is at risk.", reverse: false },
  { id: "ED3", comp: "ED", text: "I continue routine follow-through after the interesting part of a task is over.", reverse: false },
  { id: "ED4", comp: "ED", text: "I sometimes move to a new task before fully closing the previous one.", reverse: true },
  { id: "AD1", comp: "AD", text: "I can revise priorities without feeling that the entire plan has failed.", reverse: false },
  { id: "AD2", comp: "AD", text: "I remain useful when instructions are incomplete.", reverse: false },
  { id: "AD3", comp: "AD", text: "After an unexpected change, I regain my working rhythm quickly.", reverse: false },
  { id: "AD4", comp: "AD", text: "Sudden changes make it difficult for me to continue effectively.", reverse: true },
  { id: "ST1", comp: "ST", text: "I ask questions when a request does not reveal the real need.", reverse: false },
  { id: "ST2", comp: "ST", text: "I consider who may be affected later by a decision made now.", reverse: false },
  { id: "ST3", comp: "ST", text: "I can balance service with limits of time, cost and fairness.", reverse: false },
  { id: "ST4", comp: "ST", text: "Once a task is completed as requested, later user concerns are not my responsibility.", reverse: true },
  { id: "LO1", comp: "LO", text: "When a group is uncertain, I can create enough direction for work to continue.", reverse: false },
  { id: "LO2", comp: "LO", text: "I can address poor performance without avoiding the issue or humiliating the person.", reverse: false },
  { id: "LO3", comp: "LO", text: "I accept responsibility for decisions made under my direction.", reverse: false },
  { id: "LO4", comp: "LO", text: "I prefer not to be answerable for results that depend on other people.", reverse: true },
  { id: "IV1", comp: "IV", text: "I often see a different way to define a familiar problem.", reverse: false },
  { id: "IV2", comp: "IV", text: "I prefer testing an uncertain idea on a small scale before dismissing it.", reverse: false },
  { id: "IV3", comp: "IV", text: "I connect ideas from different areas to create useful possibilities.", reverse: false },
  { id: "IV4", comp: "IV", text: "If an existing method works, exploring alternatives is usually a waste of time.", reverse: true },
]
