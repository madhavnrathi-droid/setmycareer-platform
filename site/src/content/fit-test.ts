// The Package-Fit Test — a placement instrument for /fit.
//
// WHAT IT MEASURES — six dimensions, four scored questions each, every answer
// 0–4 and each dimension normalised to 0–100:
//   CLARITY  how defined the goal already is        (high = knows the answer)
//   BREADTH  how many options are genuinely in play (high = wide-open field)
//   STAKES   consequence × time horizon             (high = years + money ride on it)
//   SUPPORT  self-serve ↔ wants a human             (high = wants human guidance)
//   FAMILY   how far family sits inside the call    (high = family co-decides)
//   URGENCY  deadline pressure                      (high = a date is forcing it)
//
// The scored questions are written to feel like reflection, not a form —
// simpler words, but more introspective. Two open REFLECTION questions at the
// end are never scored; they are captured only to give the AI report writer the
// respondent's own words, so its recommendation is justified in language that
// sounds like them.
//
// HOW IT PLACES YOU — deterministic, no randomness:
//   1. TRACK GATE — stage ∈ working* → the professional catalogue; students &
//      parents → the student catalogue. (The catalogue is the candidate set.)
//   2. Each candidate programme carries a design PROFILE: a target value and a
//      weight per dimension.
//   3. distance d = √( Σ w·(target−score)² / Σ w )   — a weighted RMS, 0–100.
//   4. matchScore = 100 − d + boosts (small, documented nudges from explicit
//      signals + Big Picture's default gravity for the messy middle).
//   5. fitPct = clamp(round(matchScore − 2), 62, 96).
// Primary = highest matchScore, runner-up = second.
//
// The RESULT is then dramatised into a conversion report (buildReport): a named
// JOURNEY (anchor programme + follow-ups, e.g. "Pivot + two follow-up
// sessions") with a WHY, a phased FUTURE PLAN, and a staged BUYING PLAN. The
// deterministic report always renders; /api/fit-report enriches its prose with
// the AI when keys are present, and falls back to this silently when they're not.

import { ALL_OFFERINGS, LONGTERM, fmtINR, type LongTermProgram } from "@/content/offerings"

export type Dimension = "clarity" | "breadth" | "stakes" | "support" | "family" | "urgency"
export type FitTrack = "student" | "professional"
export type Signal = "switch" | "restart" | "promotion" | "study_abroad" | "life_plan" | "family_business"

/* ── intake vocabulary ──────────────────────────────────────────────────── */

export const AGE_BANDS = ["13–15", "16–18", "19–22", "23–28", "29–40", "40+"] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export interface FitStage {
  id: string
  label: string
  track: FitTrack
  exec?: boolean // Working 15+ — leadership-level boost
}

export const STAGES: FitStage[] = [
  { id: "class_8_10", label: "Class 8–10", track: "student" },
  { id: "class_11_12", label: "Class 11–12", track: "student" },
  { id: "ug", label: "Undergraduate", track: "student" },
  { id: "pg", label: "Postgraduate", track: "student" },
  { id: "work_0_5", label: "Working 0–5 yrs", track: "professional" },
  { id: "work_5_15", label: "Working 5–15 yrs", track: "professional" },
  { id: "work_15", label: "Working 15+ yrs", track: "professional", exec: true },
  { id: "parent", label: "Parent of a student", track: "student" },
]

export const stageById = (id: string): FitStage | undefined => STAGES.find((s) => s.id === id)

/* ── dimensions ─────────────────────────────────────────────────────────── */

export interface DimMeta {
  key: Dimension
  label: string
  short: string // the mono initial used in the lead message + profile bars
  /** short reads for the result bars, by thirds of the scale */
  reads: [string, string, string] // low (<34) · mid (34–66) · high (>66)
}

export const DIMENSIONS: DimMeta[] = [
  { key: "clarity", label: "Clarity", short: "C", reads: ["Direction still forming", "A shortlist, not a decision", "Direction largely set"] },
  { key: "breadth", label: "Breadth", short: "B", reads: ["One question in focus", "A few live options", "The field is wide open"] },
  { key: "stakes", label: "Stakes", short: "S", reads: ["Low-cost, reversible", "Real but recoverable", "Years and money ride on it"] },
  { key: "support", label: "Support", short: "Su", reads: ["Happiest self-serve", "Tools plus a second opinion", "Wants a human on the case"] },
  { key: "family", label: "Family", short: "F", reads: ["This call is yours alone", "Family has a voice", "Family co-decides"] },
  { key: "urgency", label: "Urgency", short: "U", reads: ["No clock on this", "A season, not a siren", "A date is forcing it"] },
]

export const dimRead = (meta: DimMeta, value: number): string =>
  value < 34 ? meta.reads[0] : value <= 66 ? meta.reads[1] : meta.reads[2]

/* ── the scored questions ───────────────────────────────────────────────── */

export const LIKERT_SCALE = [
  { v: 1, label: "Not at all like me" },
  { v: 2, label: "A little" },
  { v: 3, label: "Somewhere in between" },
  { v: 4, label: "Mostly like me" },
  { v: 5, label: "Exactly like me" },
] as const

export interface ChoiceOption {
  label: string
  score: number // 0–4, same scale as a likert answer
  signal?: Signal
}

interface QuestionBase {
  id: string
  dim: Dimension
}

export interface LikertQuestion extends QuestionBase {
  kind: "likert"
  text: string
  /** agreement LOWERS the dimension (e.g. "I'd rather do this myself" on SUPPORT) */
  reverse?: boolean
  /** answering ≥ min raises this signal (e.g. study-abroad genuinely in the mix) */
  signal?: { min: number; tag: Signal }
  /** professional-track phrasing swap — same dimension, same position */
  pro?: { text: string }
}

export interface ChoiceQuestion extends QuestionBase {
  kind: "choice"
  text: string
  options: ChoiceOption[]
  pro?: { text: string; options: ChoiceOption[] }
}

export type FitQuestion = LikertQuestion | ChoiceQuestion

/** An open, unscored question — captured only to give the AI report the
 *  respondent's own words. Never affects the deterministic placement. */
export interface ReflectionQuestion {
  id: string
  kind: "text"
  text: string
  placeholder: string
  optional?: boolean
}

export type FlowItem = FitQuestion | ReflectionQuestion

// Interleaved C→B→S→Su→F→U rounds so no dimension reads as a block. The four
// professional swaps (c1, b1, st1, u1) keep switch / promotion / restart
// phrasing on the same dimensions the student items measure. The wording is
// deliberately plainer and more reflective than a survey — first instinct is
// the honest answer.
export const QUESTIONS: FitQuestion[] = [
  /* ── round 1 ── */
  {
    id: "c1", dim: "clarity", kind: "likert",
    text: "If a friend asked what you want to do with your life, you'd give a real answer — not a placeholder.",
    pro: { text: "If someone asked what you want your career to become next, you'd give a real answer — not a placeholder." },
  },
  {
    id: "b1", dim: "breadth", kind: "choice",
    text: "How many paths feel genuinely alive for you right now?",
    options: [
      { label: "One — I mostly need to be sure of it", score: 0.5 },
      { label: "Two or three I keep circling between", score: 2.5 },
      { label: "Four or more — the field feels wide open", score: 4 },
      { label: "I don't even know what the options are yet", score: 3.2 },
    ],
    pro: {
      text: "What's actually on the table for you right now?",
      options: [
        { label: "Growing where I already am — a promotion, more scope", score: 1, signal: "promotion" },
        { label: "A switch into a different field or role", score: 2.6, signal: "switch" },
        // several-doors is BREADTH (score 4), not committed switch intent — no signal
        { label: "Several doors at once — switch, MBA, break, relocation", score: 4 },
        { label: "A restart, after a break or a setback", score: 2.2, signal: "restart" },
      ],
    },
  },
  {
    id: "st1", dim: "stakes", kind: "likert",
    text: "This choice will still matter to me in five years — it isn't just about right now.",
    pro: { text: "This move shapes the next decade — my income, my standing, maybe the people I'll lead." },
  },
  {
    id: "su1", dim: "support", kind: "likert", reverse: true,
    text: "I trust myself and good tools more than sitting across from someone for advice.",
  },
  {
    id: "f1", dim: "family", kind: "likert",
    text: "The people closest to me and I don't quite picture my future the same way.",
  },
  {
    id: "u1", dim: "urgency", kind: "likert",
    text: "A date is pushing this — an exam, an admission window, a deadline I can't move.",
    pro: { text: "A date is pushing this — a notice period, an appraisal, an offer already waiting." },
  },

  /* ── round 2 ── */
  {
    id: "c2", dim: "clarity", kind: "likert",
    text: "The direction I lean toward feels like mine — not something I inherited or borrowed.",
  },
  {
    id: "b2", dim: "breadth", kind: "likert",
    text: "Lately I add new possibilities to my list faster than I cross old ones off.",
  },
  {
    id: "st2", dim: "stakes", kind: "choice",
    text: "If this turned out to be the wrong turn, how hard would it be to walk it back?",
    options: [
      { label: "Easy — I could change lanes later without much cost", score: 0.5 },
      { label: "Some cost, but recoverable", score: 1.8 },
      { label: "Hard — real money and years would be lost", score: 3.2 },
      { label: "It's a one-way door", score: 4 },
    ],
  },
  {
    id: "su2", dim: "support", kind: "likert",
    text: "I'd like someone wiser to look at my whole situation and tell me honestly what they see.",
  },
  {
    id: "f2", dim: "family", kind: "likert",
    text: "Whatever I choose, I'll have to explain it — and defend it — at home.",
  },
  {
    id: "u2", dim: "urgency", kind: "choice",
    text: "When does this really need to be settled?",
    options: [
      { label: "Within the month", score: 4 },
      { label: "This quarter", score: 3 },
      { label: "Sometime this year", score: 1.8 },
      { label: "No clock — I want it right, not fast", score: 0.4 },
    ],
  },

  /* ── round 3 ── */
  {
    id: "c3", dim: "clarity", kind: "choice",
    text: "Which is closest to the truth today?",
    options: [
      { label: "I know where I'm headed", score: 4 },
      { label: "I have a shortlist, not a decision", score: 2.4 },
      { label: "A few vague directions, nothing firm", score: 1.2 },
      { label: "Honestly — a blank page", score: 0 },
    ],
  },
  {
    id: "b3", dim: "breadth", kind: "likert",
    text: "Building a life or career abroad is genuinely on my mind.",
    signal: { min: 4, tag: "study_abroad" },
  },
  {
    id: "st3", dim: "stakes", kind: "likert",
    text: "Real money — fees, savings, a salary — is riding on getting this right.",
  },
  {
    id: "su3", dim: "support", kind: "choice",
    text: "When a big decision has you stuck, what actually moves you forward?",
    options: [
      { label: "Reading and figuring it out on my own", score: 0.5 },
      { label: "Structured tests and hard data", score: 1.6 },
      { label: "Talking it through with someone qualified", score: 3.2 },
      { label: "Someone who stays with me through the whole journey", score: 4 },
    ],
  },
  {
    id: "f3", dim: "family", kind: "choice",
    text: "Who else is really inside this decision with you?",
    options: [
      { label: "Just me", score: 0 },
      { label: "Parents or partner have a real voice", score: 2.4 },
      { label: "It's a family decision as much as mine", score: 3.4 },
      { label: "There's a family business or legacy in the picture", score: 4, signal: "family_business" },
    ],
  },
  {
    id: "u3", dim: "urgency", kind: "likert",
    text: "Not deciding is starting to cost me — sleep, focus, or peace of mind.",
  },

  /* ── round 4 ── */
  {
    id: "c4", dim: "clarity", kind: "likert", reverse: true,
    text: "If I'm honest, my current plan is more what's expected of me than what I've chosen.",
  },
  {
    id: "b4", dim: "breadth", kind: "likert",
    text: "If I committed to one road today, I'd quietly mourn the ones I let go.",
  },
  {
    id: "st4", dim: "stakes", kind: "choice",
    text: "How far into the future does this plan need to hold?",
    options: [
      { label: "The next few months", score: 0.5 },
      { label: "A year or two", score: 1.8 },
      { label: "Five years or more", score: 3.2 },
      { label: "It's a life plan — possibly across my family", score: 4, signal: "life_plan" },
    ],
  },
  {
    id: "su4", dim: "support", kind: "likert",
    text: "I've already tried to settle this on my own — and it hasn't settled.",
  },
  {
    id: "f4", dim: "family", kind: "likert",
    text: "It would change things if my family heard the plan from someone they trust — not just from me.",
  },
  {
    id: "u4", dim: "urgency", kind: "likert",
    text: "People around me are already moving, and part of me feels a little behind.",
  },
]

/* ── the open reflections (unscored, for the AI report) ──────────────────── */

export const REFLECTIONS: ReflectionQuestion[] = [
  {
    id: "r_crux", kind: "text",
    text: "In your own words — what's the real question that made you take this test?",
    placeholder: "The thing you actually want answered. A sentence or two is plenty.",
  },
  {
    id: "r_future", kind: "text",
    text: "Picture this working out beautifully, a few years from now. What does that look like?",
    placeholder: "Where you are, what you're doing, how it feels. Write freely — or skip it.",
    optional: true,
  },
]

/** likert/choice text swapped for the pro track in place. */
export const questionsFor = (track: FitTrack): FitQuestion[] =>
  QUESTIONS.map((q) => {
    if (track !== "professional" || !q.pro) return q
    return q.kind === "likert"
      ? { ...q, text: q.pro.text }
      : { ...q, text: q.pro.text, options: q.pro.options }
  })

/** The full one-per-view flow: the 24 scored questions, then the reflections. */
export const flowFor = (track: FitTrack): FlowItem[] => [...questionsFor(track), ...REFLECTIONS]

/* ── programme profiles (the candidate set, per track) ──────────────────── */

type DimVector = Record<Dimension, number>

interface Candidate {
  id: string
  target: DimVector // where this programme's ideal respondent sits, 0–100
  weight: DimVector // how much this programme cares about each dimension
}

// Students & parents. Encodes the placement rules:
//  high CLARITY + self-serve → Navigator · low CLARITY + wants human + low
//  commitment → Consultation · one clear decision (high C, LOW B) → Accelerator
//  · the messy middle (breadth/family/abroad) → Big Picture (default) ·
//  very high STAKES + long horizon → True North · exceptional multi-year
//  complexity → the Blueprint long-term programme (application only).
const STUDENT_CANDIDATES: Candidate[] = [
  {
    id: "sj_navigator",
    target: { clarity: 82, breadth: 35, stakes: 40, support: 12, family: 30, urgency: 45 },
    weight: { clarity: 1.3, breadth: 0.7, stakes: 0.5, support: 1.5, family: 0.5, urgency: 0.4 },
  },
  {
    id: "sj_consult_student",
    target: { clarity: 15, breadth: 55, stakes: 40, support: 85, family: 45, urgency: 55 },
    weight: { clarity: 1.3, breadth: 0.5, stakes: 0.7, support: 1.2, family: 0.5, urgency: 0.5 },
  },
  {
    id: "sj_accelerator",
    target: { clarity: 80, breadth: 18, stakes: 55, support: 65, family: 40, urgency: 75 },
    weight: { clarity: 1.2, breadth: 1.4, stakes: 0.7, support: 0.8, family: 0.4, urgency: 0.8 },
  },
  {
    id: "sj_big_picture",
    target: { clarity: 45, breadth: 78, stakes: 65, support: 70, family: 78, urgency: 55 },
    weight: { clarity: 0.6, breadth: 1.2, stakes: 0.7, support: 0.7, family: 1.2, urgency: 0.5 },
  },
  {
    id: "sj_true_north",
    target: { clarity: 40, breadth: 55, stakes: 92, support: 82, family: 55, urgency: 30 },
    weight: { clarity: 0.5, breadth: 0.5, stakes: 1.7, support: 0.9, family: 0.5, urgency: 0.7 },
  },
  {
    id: "lt_blueprint",
    target: { clarity: 35, breadth: 65, stakes: 96, support: 92, family: 82, urgency: 20 },
    weight: { clarity: 0.4, breadth: 0.5, stakes: 1.6, support: 1.0, family: 1.1, urgency: 0.6 },
  },
]

// Working professionals. pro_pivot carries switch/restart/promotion intent;
// pro_directors_cut is the Working-15+/leadership placement; lt_autobiography
// is the multi-year executive engagement (application only).
const PRO_CANDIDATES: Candidate[] = [
  {
    id: "pro_consult",
    target: { clarity: 18, breadth: 55, stakes: 50, support: 85, family: 30, urgency: 55 },
    weight: { clarity: 1.3, breadth: 0.5, stakes: 0.6, support: 1.2, family: 0.3, urgency: 0.5 },
  },
  {
    id: "pro_pivot",
    target: { clarity: 55, breadth: 50, stakes: 72, support: 70, family: 30, urgency: 68 },
    weight: { clarity: 0.8, breadth: 0.7, stakes: 1.1, support: 0.8, family: 0.3, urgency: 0.9 },
  },
  {
    id: "pro_directors_cut",
    target: { clarity: 45, breadth: 40, stakes: 92, support: 80, family: 25, urgency: 30 },
    weight: { clarity: 0.5, breadth: 0.4, stakes: 1.6, support: 0.9, family: 0.3, urgency: 0.6 },
  },
  {
    id: "lt_autobiography",
    target: { clarity: 35, breadth: 55, stakes: 95, support: 90, family: 60, urgency: 20 },
    weight: { clarity: 0.4, breadth: 0.5, stakes: 1.6, support: 1.0, family: 0.9, urgency: 0.6 },
  },
]

/* ── scoring ────────────────────────────────────────────────────────────── */

export interface DimScore {
  key: Dimension
  label: string
  short: string
  value: number // 0–100
  read: string
}

export interface FitPick {
  id: string
  fitPct: number
}

export interface FitComputed {
  track: FitTrack
  dims: DimScore[]
  signals: Signal[]
  primary: FitPick & { why: string[] }
  runnerUp: FitPick
}

/** answers: question id → likert value 1–5, or chosen option INDEX for choice questions */
export type AnswerMap = Record<string, number>
/** reflections: question id → the respondent's free text */
export type TextAnswerMap = Record<string, string>

const raw04 = (q: FitQuestion, a: number): number => {
  if (q.kind === "likert") {
    const v = Math.min(5, Math.max(1, a))
    return q.reverse ? 5 - v : v - 1
  }
  const opt = q.options[Math.min(q.options.length - 1, Math.max(0, Math.round(a)))]
  return opt ? opt.score : 0
}

const signalsFrom = (qs: FitQuestion[], answers: AnswerMap): Signal[] => {
  const out = new Set<Signal>()
  for (const q of qs) {
    const a = answers[q.id]
    if (a == null) continue
    if (q.kind === "likert") {
      if (q.signal && a >= q.signal.min) out.add(q.signal.tag)
    } else {
      const opt = q.options[Math.round(a)]
      if (opt?.signal) out.add(opt.signal)
    }
  }
  return [...out]
}

// Documented nudges — small against the 0–100 distance scale, decisive on ties.
const boostFor = (id: string, signals: Signal[], stage: FitStage, score: DimVector): number => {
  const has = (s: Signal) => signals.includes(s)
  let b = 0
  if (id === "sj_big_picture") {
    b += 4 // the catalogue's default gravity — the messy middle lands here
    if (has("study_abroad")) b += 6
    if (stage.id === "parent") b += 4 // the dedicated parent session
  }
  if (id === "sj_true_north" && has("life_plan")) b += 5
  if (id === "lt_blueprint") {
    if (has("life_plan")) b += 9
    if (has("family_business")) b += 9
  }
  if (id === "pro_pivot") {
    // clarity-gated: a switch you can already name is Pivot territory; a switch
    // you can't name yet should still diagnose first (pro_consult wins)
    const committed = score.clarity >= 40
    if (has("switch")) b += committed ? 12 : 4
    if (has("restart")) b += committed ? 9 : 3
    if (has("promotion")) b += 6
  }
  if (id === "pro_directors_cut" && stage.exec) b += 14
  if (id === "lt_autobiography" && has("life_plan")) b += 8
  return b
}

const clampPct = (matchScore: number): number =>
  Math.max(62, Math.min(96, Math.round(matchScore - 2)))

export function computeFit(stageId: string, answers: AnswerMap): FitComputed {
  const stage = stageById(stageId) ?? STAGES[0]
  const track = stage.track
  const qs = questionsFor(track)

  // 1) dimension scores — Σ of four 0–4 items → /16 → 0–100
  const dims: DimScore[] = DIMENSIONS.map((meta) => {
    const mine = qs.filter((q) => q.dim === meta.key)
    const sum = mine.reduce((acc, q) => acc + raw04(q, answers[q.id] ?? 3), 0)
    const value = Math.round((sum / (mine.length * 4)) * 100)
    return { key: meta.key, label: meta.label, short: meta.short, value, read: dimRead(meta, value) }
  })
  const score = Object.fromEntries(dims.map((d) => [d.key, d.value])) as DimVector

  // 2–4) weighted RMS distance to every candidate profile, plus boosts
  const signals = signalsFrom(qs, answers)
  const candidates = track === "professional" ? PRO_CANDIDATES : STUDENT_CANDIDATES
  const ranked = candidates
    .map((c) => {
      let num = 0
      let den = 0
      for (const d of DIMENSIONS) {
        const w = c.weight[d.key]
        const diff = c.target[d.key] - score[d.key]
        num += w * diff * diff
        den += w
      }
      const distance = Math.sqrt(num / den)
      return { id: c.id, matchScore: 100 - distance + boostFor(c.id, signals, stage, score) }
    })
    .sort((a, b) => b.matchScore - a.matchScore)

  const first = ranked[0]
  const second = ranked[1]
  return {
    track,
    dims,
    signals,
    primary: { id: first.id, fitPct: clampPct(first.matchScore), why: whyFor(first.id, score, stage) },
    runnerUp: { id: second.id, fitPct: clampPct(second.matchScore) },
  }
}

/* ── why-it-fits bullets — tied to the respondent's actual scores ───────── */

function whyFor(id: string, s: DimVector, stage: FitStage): string[] {
  const c = s.clarity, b = s.breadth, st = s.stakes, su = s.support, f = s.family, u = s.urgency
  switch (id) {
    case "sj_navigator":
      return [
        `Clarity ${c}/100 — you already carry a direction; what it needs is evidence, not somebody else's opinion.`,
        `Support ${su}/100 — you lean self-serve, and Navigator is the full self-serve kit: all three assessments, reports, and the AI copilot with no sessions to book.`,
        `Breadth ${b}/100 — the dashboard lets you compare careers, colleges and degrees at your own pace before you commit further.`,
      ]
    case "sj_consult_student":
      return [
        `Clarity ${c}/100 — the honest starting point is a diagnosis, not a programme. Sixty minutes with a certified counsellor names your situation first.`,
        `Support ${su}/100 — you told us a qualified human is what actually helps when you're stuck.`,
        `Stakes ${st}/100 with urgency ${u}/100 — a single low-commitment session is the right-sized first move before anything bigger.`,
      ]
    case "sj_accelerator":
      return [
        `Clarity ${c}/100 against breadth ${b}/100 — one big question, mostly framed. Accelerator exists to settle exactly one decision, definitively.`,
        `Urgency ${u}/100 — a recorded, transcribed session plus a written action plan turns pressure into a dated next step.`,
        `Support ${su}/100 — you get the counsellor hour where it counts, on top of the complete Navigator toolkit.`,
      ]
    case "sj_big_picture":
      return [
        `Breadth ${b}/100 — several options are genuinely live, and the three-session arc is built to weigh all of them, not crown one prematurely.`,
        `Family ${f}/100 — a dedicated parent session puts everyone in the same room, so the plan survives the dinner table.`,
        `Stakes ${st}/100 — the advanced report and admission strategy reach past this one decision into what comes after it.`,
      ]
    case "sj_true_north":
      return [
        `Stakes ${st}/100 — this answer has to hold for years, which is senior-counsellor territory: up to five sessions of complete career architecture.`,
        `Support ${su}/100 — you asked for someone who stays on the case; True North adds a six-month review and priority booking.`,
        `Urgency ${u}/100 — you're building for the long horizon, and the Career Intelligence Profile and Future Skills Report are made for exactly that.`,
      ]
    case "pro_consult":
      return [
        `Clarity ${c}/100 — before committing to a programme, a 60-minute working session with a senior counsellor diagnoses where your career actually stands.`,
        `Support ${su}/100 — you want experienced eyes on the whole case; that is precisely what this hour is.`,
        `Stakes ${st}/100 — the outcome is a recommendation of the right next step, so nothing bigger is bought blind.`,
      ]
    case "pro_pivot":
      return [
        `Stakes ${st}/100 — a working professional changing direction has real money and momentum on the line; Pivot is a structured transition, not a pep talk.`,
        `Clarity ${c}/100 — three senior-counsellor sessions plus a written transition plan turn a direction into a sequence.`,
        `Urgency ${u}/100 — the executive resume and plan give the move a timetable${u > 66 ? " while the clock is running" : ""}.`,
      ]
    case "pro_directors_cut":
      return [
        `Stakes ${st}/100 at the ${stage.label} mark — the next move shapes an organisation, not just a CV. This is reinvention at the leadership level.`,
        `Support ${su}/100 — five sessions of executive strategy, positioning and narrative, with a leadership development plan.`,
        `Clarity ${c}/100 — the work here is not finding an option; it is architecting the one that carries a decade.`,
      ]
    case "lt_blueprint":
      return [
        `Stakes ${st}/100 with family ${f}/100 — this is bigger than one decision cycle: a multi-year student journey, planned milestone by milestone.`,
        `Support ${su}/100 — Blueprint is our long-term mentorship: a dedicated counsellor who re-assesses as you grow, plans every admission, and stays for years.`,
        `Because every Blueprint is bespoke, it begins with a conversation and a custom proposal — not a checkout.`,
      ]
    case "lt_autobiography":
      return [
        `Stakes ${st}/100 — a leadership arc is authored over years, not redirected in one sitting: Autobiography is a 3–5 year senior advisory partnership.`,
        `Support ${su}/100 — a dedicated senior mentor who re-reads the market and your ambitions as they change, through every transition.`,
        `Because every Autobiography is bespoke, it begins with a private conversation and a custom proposal — not a checkout.`,
      ]
    default:
      return [
        `Your six dimension scores sit closest to this programme's design profile.`,
        `Support ${su}/100 and stakes ${st}/100 shaped the placement most.`,
        `The runner-up was close — the full catalogue shows both side by side.`,
      ]
  }
}

/* ── result-card display data (offerings + the long-term programmes) ─────── */

export interface RecCard {
  id: string
  name: string
  priceLine: string   // "₹14,990" · "Custom proposal"
  priceNote?: string  // "60 minutes" · "$899 USD" · the long-term note
  tagline: string
  cta: string
  to: string          // checkout route, or /programs/<slug> for long-term
  isLongTerm: boolean // application-only (no checkout)
}

const longTermById = (id: string): LongTermProgram | undefined => LONGTERM.find((p) => p.id === id)

export function recCard(id: string): RecCard {
  const lt = longTermById(id)
  if (lt) {
    return {
      id,
      name: lt.name,
      priceLine: "Custom proposal",
      priceNote: `Application only · from ${fmtINR(lt.priceFrom)}`,
      tagline: lt.tagline,
      cta: `Explore ${lt.name}`,
      to: `/programs/${lt.slug}`,
      isLongTerm: true,
    }
  }
  const o = ALL_OFFERINGS.find((x) => x.id === id)
  if (!o) {
    // unknown id — never crash the result screen
    return { id, name: "SetMyCareer programme", priceLine: "", tagline: "", cta: "See the catalogue", to: "/pricing", isLongTerm: false }
  }
  const notes: string[] = []
  if (o.priceNote) notes.push(o.priceNote)
  if (o.price.usd != null) notes.push(`$${o.price.usd.toLocaleString("en-US")} USD`)
  return {
    id: o.id,
    name: o.name,
    priceLine: o.price.inr === 0 ? "Free" : fmtINR(o.price.inr),
    priceNote: notes.length ? notes.join(" · ") : undefined,
    tagline: o.tagline,
    cta: o.cta,
    to: o.price.inr === 0 ? "/cri" : o.id === "mk_meet_expert" ? "/experts" : `/checkout/${o.id}`,
    isLongTerm: false,
  }
}

/* ── the conversion report — a named journey, a future plan, a buying plan ──
   Deterministic and always available; /api/fit-report enriches the prose with
   the AI and falls back to exactly this when no keys are set. The AI is asked
   to return the SAME shape, so FitResult renders one component either way. */

export interface JourneyStep {
  name: string
  meta?: string   // price / cadence line
  why: string
  to?: string     // where this step is bought / begun
  cta?: string
}

export interface FuturePhase {
  horizon: string // "First 30 days" · "This year" · "The long game"
  move: string
}

export interface BuyStep {
  when: string    // "Start here" · "Then" · "Later"
  item: string
  meta?: string
  why: string
}

export interface FitReport {
  /** e.g. "Pivot, plus two follow-up sessions" */
  journeyTitle: string
  /** 2–3 sentences: the crux (in their language) + why this journey answers it */
  summary: string
  /** the recommended bundle, in order */
  journey: JourneyStep[]
  /** why this exact shape — the sentence that earns the recommendation */
  journeyWhy: string
  /** a phased plan for their life/career (not about buying) */
  futurePlan: FuturePhase[]
  /** the staged way to spend — start small, add as it proves out */
  buyingPlan: BuyStep[]
  /** the last, warm nudge */
  closing: string
  /** true when the AI wrote the prose; false = deterministic fallback */
  ai: boolean
}

const offer = (id: string) => ALL_OFFERINGS.find((o) => o.id === id)

/** how many follow-up sessions the journey should bundle, from the profile. */
const followUpCount = (s: DimScore[]): number => {
  const v = (k: Dimension) => s.find((d) => d.key === k)?.value ?? 50
  const heat = (v("stakes") + v("support") + v("urgency")) / 3
  return heat >= 70 ? 2 : heat >= 45 ? 1 : 0
}

/** Build the deterministic conversion report from a computed result. */
export function buildReport(r: FitComputed, firstName: string, reflections?: TextAnswerMap): FitReport {
  const name = firstName.trim() || "there"
  const anchor = recCard(r.primary.id)
  const dimVal = (k: Dimension) => r.dims.find((d) => d.key === k)?.value ?? 50
  const crux = reflections?.r_crux?.trim()
  const dream = reflections?.r_future?.trim()

  const extraId = r.track === "professional" ? "pro_extra_session" : "sj_extra_session"
  const extra = offer(extraId)
  const followUps = followUpCount(r.dims)

  // ── the journey (anchor + shaped add-ons) ──
  const journey: JourneyStep[] = []
  let journeyTitle = anchor.name
  let journeyWhy = ""

  if (anchor.isLongTerm) {
    // long-term programmes are the journey — no bolt-ons
    journey.push({
      name: `${anchor.name} — discovery conversation`,
      meta: "Application only · custom proposal",
      why: "Every engagement begins with one honest conversation; the multi-year roadmap and quote are built around what we hear.",
      to: anchor.to, cta: anchor.cta,
    })
    journeyTitle = `${anchor.name} — a multi-year engagement`
    journeyWhy = `Your stakes and horizon are simply larger than any single programme. ${anchor.name} is the one engagement built to stay with you for years, re-planning as you grow — which is why it starts with a discovery conversation, not a checkout.`
  } else if (anchor.id.includes("consult")) {
    // a consult anchor — the journey is diagnose, then the likely programme
    const nextId = r.track === "professional" ? "pro_pivot" : "sj_big_picture"
    const next = recCard(nextId)
    journey.push({
      name: anchor.name, meta: anchor.priceNote ?? anchor.priceLine,
      why: "Sixty minutes to name your situation precisely and hear a straight recommendation — nothing bigger bought blind.",
      to: anchor.to, cta: anchor.cta,
    })
    journey.push({
      name: `Then, likely: ${next.name}`, meta: next.priceLine,
      why: `Most people in your position move here next — ${next.tagline.toLowerCase()} The consultation confirms it's the right fit first.`,
      to: next.to, cta: next.cta,
    })
    journeyTitle = `${anchor.name}, then ${next.name}`
    journeyWhy = `You want a human in the room before you commit. So the journey diagnoses first, then steps into the programme that fits — no guesswork, no oversell.`
  } else {
    // a full programme anchor — bundle follow-ups (the "Pivot + 2 sessions" shape)
    journey.push({
      name: anchor.name, meta: anchor.priceNote ? `${anchor.priceLine} · ${anchor.priceNote}` : anchor.priceLine,
      why: r.primary.why[0] ?? anchor.tagline,
      to: anchor.to, cta: anchor.cta,
    })
    if (followUps > 0 && extra) {
      journey.push({
        name: `${followUps} follow-up ${followUps > 1 ? "sessions" : "session"}`,
        meta: `${fmtINR(extra.price.inr)} each · added as you need them`,
        why: "The plan lands in the room; the follow-ups keep it moving — course-corrections, momentum checks, and the questions that only surface once you've started.",
        to: `/checkout/${extraId}`, cta: "Add a session",
      })
      journeyTitle = `${anchor.name} + ${followUps === 2 ? "two" : "one"} follow-up ${followUps > 1 ? "sessions" : "session"}`
    }
    journeyWhy = followUps > 0
      ? `The programme settles the big decision; the ${followUps === 2 ? "two follow-ups turn" : "follow-up turns"} it into a plan you actually execute. Your stakes (${dimVal("stakes")}/100) and appetite for guidance (${dimVal("support")}/100) say you'll use them — so we've priced the journey to start with the programme and add sessions only as they earn their place.`
      : `One decisive engagement is enough for where you are — no padding. You can always add a session later if the ground shifts.`
  }

  // ── the future plan (phased, life-first) ──
  const futurePlan: FuturePhase[] = anchor.isLongTerm
    ? [
        { horizon: "First month", move: `Discovery conversation and a full baseline — where you stand today, and the shape of the years ahead.` },
        { horizon: "First year", move: `The roadmap's opening moves: assessments, the first milestones, and the habits that compound.` },
        { horizon: "Years 2–3", move: `Re-assess, re-plan, execute. The mentor stays; the plan moves with you as you change.` },
        { horizon: "The long game", move: dream ? `The picture you described — "${trim(dream, 90)}" — built deliberately, not left to chance.` : `The life you're actually aiming at, authored on purpose rather than stumbled into.` },
      ]
    : [
        { horizon: "First 30 days", move: `Complete the assessments and your first session — turn the fog into a written, dated plan.` },
        { horizon: "This quarter", move: r.track === "professional" ? `Execute the first moves — positioning, conversations, applications — with the plan as your map.` : `Act on the plan — subjects, shortlists, or applications — while a counsellor stays in reach.` },
        { horizon: "This year", move: dream ? `Toward the outcome you named — "${trim(dream, 90)}" — with follow-ups to keep it honest.` : `Build momentum toward the outcome, using follow-ups to course-correct rather than restart.` },
        { horizon: "The long game", move: `When the next big decision arrives, you'll already have the profile, the history and the counsellor to make it fast.` },
      ]

  // ── the buying plan (staged spend) ──
  const buyingPlan: BuyStep[] = []
  if (anchor.isLongTerm) {
    buyingPlan.push({ when: "Start here", item: `${anchor.name} application`, meta: "Free — a conversation, then a custom proposal", why: "No commitment until you've seen the roadmap and the quote." })
    buyingPlan.push({ when: "If you'd rather test first", item: r.track === "professional" ? "Professional Consultation" : "Student Consultation", meta: r.track === "professional" ? fmtINR(4000) : fmtINR(3000), why: "A single session is the low-risk way to feel the counselling before the long-term commitment." })
  } else {
    buyingPlan.push({ when: "Start here", item: anchor.name, meta: anchor.priceLine, why: "The one purchase that answers your central question — everything else is optional." })
    if (followUps > 0 && extra) buyingPlan.push({ when: "As you go", item: `Follow-up ${followUps > 1 ? "sessions" : "session"}`, meta: `${fmtINR(extra.price.inr)} each`, why: "Add them only when a real question comes up — never pre-paid, never wasted." })
    // gentle upgrade ceiling
    const ceilingId = r.track === "professional" ? "lt_autobiography" : "lt_blueprint"
    if (r.primary.id !== ceilingId && dimVal("stakes") >= 60) {
      const ceil = recCard(ceilingId)
      buyingPlan.push({ when: "If it grows", item: ceil.name, meta: "Application only", why: `If this turns out to be a multi-year story, ${ceil.name} is the long-term engagement to graduate into.` })
    }
  }

  // ── prose ──
  const cruxLine = crux ? `You told us the real question is "${trim(crux, 110)}". ` : ``
  const summary = anchor.isLongTerm
    ? `${cruxLine}${name}, what you're describing isn't a single decision — it's a horizon. ${anchor.name} is the engagement built for exactly that: a mentor who stays for years and plans it with you.`
    : `${cruxLine}${name}, your answers point clearly to ${anchor.name}. ${journeyWhy}`

  const closing = anchor.isLongTerm
    ? `Start with the conversation. There's no cost and no commitment — just a clear read on whether ${anchor.name} is right for you.`
    : `You don't have to buy the whole journey today. Start with ${anchor.name}; add the rest only as it proves its worth. Either way, ${name}, you now have a plan.`

  return { journeyTitle, summary, journey, journeyWhy, futurePlan, buyingPlan, closing, ai: false }
}

const trim = (s: string, n: number): string => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…")

/* ── the lead payload message ───────────────────────────────────────────── */

export function leadMessage(r: FitComputed, reflections?: TextAnswerMap): string {
  const primary = recCard(r.primary.id)
  const runner = recCard(r.runnerUp.id)
  const dims = r.dims.map((d) => d.value).join("/")
  const crux = reflections?.r_crux?.trim()
  const base = `Package-fit test → ${primary.name} (${r.primary.fitPct}% fit); runner-up ${runner.name}; dims C/B/S/Su/F/U: ${dims}`
  return crux ? `${base}. In their words: "${trim(crux, 180)}"` : base
}
