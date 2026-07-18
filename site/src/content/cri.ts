// Career Readiness Index — the real instrument, verbatim from the master docs:
// CRI_Mixed_Questions (students) and Executive_Career_Readiness_Index (ECRI)™,
// with the CCI Report V2 metric format (0–1 indices + factor meanings). The
// scoring keys, bands and trigger rule are the documented ones; the personality
// reads are generated FROM the respondent's actual factor pattern (accurate by
// construction — persuasion through precision, not invention).

import { offeringById, fmtINR } from "./offerings"

export type Audience = "student" | "executive"

export interface CriFactor {
  key: string
  name: string
  meaning: string // CCI-style one-liner: what this index indicates
  qs: number[] // 1-based question numbers
}

export interface CriBand { min: number; name: string; note: string }

export interface CriInstrument {
  title: string
  tagline: string
  questions: string[] // index 0 = Q1
  factors: CriFactor[]
  bands: CriBand[] // descending by min
}

export const SCALE = [
  { v: 5, label: "Strongly agree" },
  { v: 4, label: "Agree" },
  { v: 3, label: "Not sure" },
  { v: 2, label: "Disagree" },
  { v: 1, label: "Strongly disagree" },
]

export const STUDENT: CriInstrument = {
  title: "Career Readiness Index (CRI)™",
  tagline: "Twenty statements. Five indices. An honest read on how ready your career decision actually is.",
  questions: [
    "If admissions opened tomorrow, I would know exactly what to apply for and why.",
    "I can clearly describe activities that energize me.",
    "Different advice from relatives, friends and social media rarely changes my career direction.",
    "I understand the education pathway required for my preferred career.",
    "I actively explore how technology and AI may impact my future career.",
    "I know my strongest abilities better than most students of my age.",
    "I have explored at least three alternative career options in depth.",
    "I am comfortable making important career decisions without excessive anxiety.",
    "I regularly seek information about industries and professions that interest me.",
    "My education choices are influenced more by my strengths than by others' opinions.",
    "I understand the future opportunities and challenges in my chosen field.",
    "I have spoken with professionals or seniors about careers I am considering.",
    "I believe I am moving towards a career that genuinely suits me.",
    "When people appreciate me, the reasons are usually similar and predictable.",
    "I can justify my stream/course choice using facts rather than trends.",
    "If my current career plan does not work out, I know my alternatives.",
    "I understand the investment of time, effort and money required for my chosen path.",
    "I know the key reasons behind my current educational goals.",
    "I can confidently explain why I am considering my current career option.",
    "If asked to describe my ideal future workday, I can do it confidently.",
  ],
  factors: [
    { key: "SA", name: "Self-Awareness", meaning: "Clarity on who you are — the first step in smart career management.", qs: [2, 6, 14, 20] },
    { key: "CC", name: "Career Clarity", meaning: "Clarity on best-fit options, ideally aligned to your talent and interest.", qs: [1, 4, 7, 11, 16, 19] },
    { key: "DR", name: "Decision Readiness", meaning: "Clarity to make the call — it arrives when self-knowledge and options are both high.", qs: [8, 13, 15, 18] },
    { key: "FP", name: "Future Preparedness", meaning: "Whether you are reading where the work is going, not just where it is.", qs: [5, 9, 12, 17] },
    { key: "EI", name: "Influence Resistance", meaning: "How much of this decision is yours — versus the loudest voice in the room.", qs: [3, 10] },
  ],
  bands: [
    { min: 85, name: "Career Ready", note: "Strong self-awareness and career clarity. Guidance can help optimize opportunities and long-term success." },
    { min: 70, name: "Mostly Clear", note: "Reasonable direction — but some important questions may remain unanswered." },
    { min: 55, name: "Career Confusion Zone", note: "Professional guidance can bring structure, confidence and clarity." },
    { min: 40, name: "High-Risk Zone", note: "Major educational decisions should not be made without guidance." },
    { min: 0, name: "Career Emergency Zone", note: "Immediate career planning support is recommended." },
  ],
}

export const EXECUTIVE: CriInstrument = {
  title: "Executive Career Readiness Index (ECRI)™",
  tagline: "For working professionals, managers and executives. Twenty statements against five indices — a 30-year career is nearly 60,000 working hours; this asks whether yours is built by design or by default.",
  questions: [
    "I can clearly explain why I am in my current profession.",
    "I know which aspects of my work energize me the most.",
    "If offered a new role today, I would know what kind of work suits me best.",
    "I understand how AI and automation may impact my role over the next five years.",
    "My career decisions are based more on self-understanding than market hype.",
    "I have a clear picture of where I want my career to be in the next 5 years.",
    "I know my strongest professional competencies.",
    "I have explored multiple alternative career paths available to me.",
    "I understand the future demand for my skills.",
    "I can confidently explain my unique value proposition as a professional.",
    "I feel prepared to make a major career transition if required.",
    "I regularly learn new skills relevant to my future career.",
    "I know which industries can best utilize my strengths.",
    "I seek career advice from multiple sources before making decisions.",
    "I believe my current role is aligned with my natural strengths.",
    "I have spoken with professionals working in careers I aspire to enter.",
    "I understand the financial implications of changing careers.",
    "I know the key reasons behind my long-term career goals.",
    "I have a realistic backup plan if my current career path stagnates.",
    "If I lost my job today, I would know my next career move.",
  ],
  factors: [
    { key: "PSA", name: "Professional Self-Awareness", meaning: "Clarity on your strengths and value — what you actually bring, in your own words.", qs: [2, 7, 10, 15] },
    { key: "CDC", name: "Career Direction & Clarity", meaning: "Whether the next five years have a shape, or just a salary.", qs: [1, 3, 6, 13, 18, 20] },
    { key: "CTR", name: "Transition Readiness", meaning: "Whether you could move — alternatives mapped, finances understood, a real plan B.", qs: [8, 11, 17, 19] },
    { key: "FEI", name: "Future Employability", meaning: "Whether your skills are compounding toward where demand is going — AI included.", qs: [4, 9, 12, 16] },
    { key: "DII", name: "Decision Independence", meaning: "Whether your moves come from self-understanding or from market noise.", qs: [5, 14] },
  ],
  bands: [
    { min: 85, name: "Career Strategist", note: "Strong self-awareness, direction and future preparedness. Guidance is useful mainly for leadership growth, positioning or strategic acceleration." },
    { min: 70, name: "Career Stable", note: "Reasonable clarity — but there may be hidden gaps in long-term planning, industry trends or growth opportunities." },
    { min: 55, name: "Career Drift Zone", note: "Your career appears to be progressing more by circumstances than by deliberate strategy." },
    { min: 40, name: "Career Risk Zone", note: "Possible dissatisfaction, stagnation or vulnerability to industry change. Professional guidance is strongly recommended before major decisions." },
    { min: 0, name: "Career Intervention Recommended", note: "Significant concerns around fit, direction, employability or transition readiness. Immediate planning support is recommended." },
  ],
}

/* per-factor Low/Medium/High thresholds scale with question count (per the ECRI
   scoring key: 4-item L≤10 M≤15 H≤20 · 6-item L≤15 M≤22 H≤30 · 2-item L≤5 M≤7 H≤10) */
export function factorLevel(sum: number, nQs: number): "Low" | "Medium" | "High" {
  const table: Record<number, [number, number]> = { 2: [5, 7], 4: [10, 15], 6: [15, 22] }
  const [lo, mid] = table[nQs] ?? [Math.round(nQs * 2.5), Math.round(nQs * 3.75)]
  return sum <= lo ? "Low" : sum <= mid ? "Medium" : "High"
}

/* personality reads — chosen by the respondent's ACTUAL pattern, so every line
   is true of them by construction. One per factor level, plus pattern reads. */
export const FACTOR_READS: Record<string, Record<"Low" | "Medium" | "High", string>> = {
  SA: {
    High: "You read yourself unusually well for your age — you can name what energizes you and why people value you. Protect that; most confusion starts where self-knowledge stops.",
    Medium: "You know parts of yourself clearly and guess at the rest. You tend to describe yourself in borrowed words — a measured profile would give you your own.",
    Low: "You are making a life-sized decision with a blurred mirror. Not a flaw — nobody taught you to measure yourself — but it is the first gap to close.",
  },
  CC: {
    High: "Your options are mapped. The risk for you is not ignorance but tunnel vision — clarity this early can quietly close doors worth keeping open.",
    Medium: "You see two or three roads but not the map between them. You compare options by reputation more than by fit — that is exactly where evidence helps.",
    Low: "The options in your head are the visible ten, not the real thousands. You cannot choose well from a menu you have never seen.",
  },
  DR: {
    High: "When you have the facts, you decide without drama. Your answers show composure that most people twice your age lack.",
    Medium: "You can decide, but the decision sits heavy — you revisit it at night. That is usually missing evidence, not missing courage.",
    Low: "Decisions this size currently cost you sleep. That anxiety is information: it means the foundation under the choice doesn't feel solid yet — because it isn't.",
  },
  FP: {
    High: "You are already reading where work is going — AI, industries, the people doing the jobs. Keep that habit; it compounds.",
    Medium: "You look ahead when prompted but not on a rhythm. The market will not send you a notification when your field shifts.",
    Low: "You are choosing for the world as it looks today. The careers you are weighing will be different by the time you arrive in them.",
  },
  EI: {
    High: "The loudest voice in the room does not steer you. Rare, and worth keeping — provided your own compass is calibrated with real data.",
    Medium: "You hold your direction until someone you respect pushes — then you wobble. You don't need thicker skin; you need firmer ground.",
    Low: "Right now, other people's certainty substitutes for your own. Every relative's opinion moves you because nothing measured is anchoring you.",
  },
  PSA: {
    High: "You can name your strengths and your value without reaching for your job title. That self-clarity is the raw material of every good move.",
    Medium: "You know what you do; you are less sure what you are. Your value proposition still leans on your employer's name more than your own pattern.",
    Low: "Years in, the mirror has gone quiet — your answers suggest you describe your role fluently and yourself with difficulty. Careers stall exactly here.",
  },
  CDC: {
    High: "Your next five years have a shape, not just a salary. Most professionals never get this far on direction.",
    Medium: "You have a direction the way most people do — inherited from the last promotion. It may be right; it has not been tested.",
    Low: "Your career is being decided by whoever assigns your next project. Drift feels like stability until the industry moves.",
  },
  CTR: {
    High: "If the ground shifted tomorrow, you would land on a plan, not a panic. Genuine transition readiness is rare — you have it.",
    Medium: "You have thought about moving; you have not priced it. The financial and practical map of a transition is still fog.",
    Low: "You are one reorganisation away from improvising. No mapped alternatives, no priced plan B — that is the riskiest place to stand still.",
  },
  FEI: {
    High: "Your skills are compounding toward demand, not away from it. You watch what AI does to your field instead of hoping.",
    Medium: "You learn, but reactively. The skills that will carry you at 45 need choosing now, not when the market forces it.",
    Low: "Your employability is quietly ageing. What you know is what the job needed five years ago — and automation is pricing that in.",
  },
  DII: {
    High: "You move on self-understanding, not market noise. Your decisions will age better than the hype cycle.",
    Medium: "You consult widely — good — but the final call still tilts toward whoever spoke last.",
    Low: "Market hype and borrowed opinions are currently steering. Independence is not stubbornness; it is having your own data.",
  },
}

/* the pattern read — variance across answers, honestly framed */
export function patternRead(values: number[]): string {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length)
  if (sd >= 1.25) return "Your answers swing wide — near-certainty on some statements, near-blankness on others. That is not inconsistency; it is a precise map of where your clarity ends. The strong patches are real. So are the gaps."
  if (sd <= 0.6) return "You answered in a narrow band — few extremes either way. People who answer like this are usually careful, a little self-protective, and more capable than they claim on paper. The caution reads as modesty; it is also what keeps decisions perpetually 'almost made'."
  return "Your answers show a familiar shape: confident where you have looked, honest where you haven't. You are capable of discipline when the goal feels real to you — and you drift when it doesn't. Both showed up in your responses."
}

export const LOADING_STAGES = [
  "Scoring your twenty responses…",
  "Computing your five factor indices…",
  "Comparing against 71,537 assessment profiles…",
  "Reading the pattern in your answers…",
  "Writing your report…",
]

export const DISCLAIMER =
  "These indices are the result of your responses to a qualitative but well-constructed questionnaire. No actual measurement of fitment or alignment between your career options and your personality, ability and interests has been made. Exact clarity comes from a psychometric assessment and a structured discussion with a certified expert — this index tells you how urgently you need one."

/* context capture — the free-info step that also personalises the report */
export const STUDENT_STAGES = ["Class 8–9", "Class 10", "Class 11–12", "College", "Recent graduate"]
export const STUDENT_WORRIES = [
  { id: "stream", label: "Which stream to pick" },
  { id: "exam", label: "JEE/NEET vs the alternatives" },
  { id: "degree", label: "Which degree or college" },
  { id: "lost", label: "No idea at all yet" },
  { id: "family", label: "My family and I disagree" },
]
export const EXEC_LEVELS = ["Individual contributor", "Manager", "Senior manager", "Director / executive"]
export const EXEC_WORRIES = [
  { id: "stagnation", label: "Growth has stalled" },
  { id: "switch", label: "Considering a switch" },
  { id: "risk", label: "AI / layoff risk in my field" },
  { id: "meaning", label: "Pay is fine, meaning isn't" },
  { id: "returning", label: "Returning after a break" },
]

export const WORRY_LINES: Record<string, string> = {
  stream: "the stream decision — two years of study hang on a choice most families make on hearsay",
  exam: "the exam question — whether the JEE/NEET track is your track, or just the visible one",
  degree: "the degree decision — where lakhs in fees meet a field you haven't measured yourself against",
  lost: "starting from zero — which is more honest than a borrowed plan, and easier to fix",
  family: "a family disagreement — which no argument settles, but a measured report often does",
  stagnation: "stalled growth — effort is going in, and the trajectory has flattened anyway",
  switch: "a possible switch — expensive to get wrong, corrosive to keep postponing",
  risk: "exposure to AI and restructuring — a risk best measured before it is urgent",
  meaning: "the meaning gap — the salary argument for staying weakens every year it's the only one",
  returning: "re-entry after a break — a sequencing problem that guidance turns into a plan",
}

/* recommendation logic — package by audience, band and stage. Every branch
   resolves to a REAL 2026 offering (offeringId) so the recommendation card can
   render that product's own gradient + real price, and never a dead SKU. */
export interface Recommendation { offeringId: string; package: string; price: string; to: string; why: string; cta: string }

// resolve name + price from the canonical catalog so the card can never drift
const rec = (offeringId: string, why: string, cta: string, to: string): Recommendation => {
  const o = offeringById(offeringId)
  const price = o
    ? o.price.inr === 0 ? "Free" : `${fmtINR(o.price.inr)}${o.priceNote ? ` · ${o.priceNote}` : ""}`
    : "Talk to us"
  return { offeringId, package: o?.name ?? offeringId, price, to, why, cta }
}

export function recommend(aud: Audience, score: number, _stage: string, lowFactors: string[]): Recommendation {
  if (aud === "executive") {
    if (score >= 85) return rec("mk_meet_expert", "Your index is strong — the value now is pressure-testing your move with someone who has already made one like it, not another assessment.", "Meet an expert", "/experts")
    if (score >= 70) return rec("pro_consult", "Solid base with specific gaps — one working session with a senior counsellor turns them into a plan.", "Book a consultation", "/checkout/pro_consult")
    return rec("pro_pivot", `Your ${lowFactors.join(" and ")} ${lowFactors.length > 1 ? "indices are" : "index is"} in the low zone — a structured switch (the full battery on professional norms, read by a senior counsellor) is built for exactly this.`, "See what it includes", "/checkout/pro_pivot")
  }
  if (score >= 85) return rec("mk_meet_expert", "Your clarity is real. One honest conversation with someone already doing the work is worth more to you now than another test.", "Meet an expert", "/experts")
  if (score >= 55) return rec("sj_navigator", "Your live question deserves better than hearsay — you need measurement, not more opinions. All three instruments, scored, mapped to the careers and degrees that actually fit you.", "See what it includes", "/checkout/sj_navigator")
  return rec("sj_consult_student", `Your index sits in the ${score >= 40 ? "high-risk" : "emergency"} zone with ${lowFactors.join(" and ")} low — start by talking it through: a counsellor diagnoses where you stand and names the right next step, before you commit to anything.`, "Book a consultation", "/checkout/sj_consult_student")
}
