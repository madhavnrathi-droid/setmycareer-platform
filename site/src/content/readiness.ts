/*
 * readiness.ts — SMC readiness engines
 * Generated from the founder's three readiness documents 2026-07-21 — keep the site mirror in sync
 * (site mirror: site/src/content/readiness.ts — byte-identical).
 *
 * Instruments
 *   CCRI  — Child Career Readiness Index (parent respondent, child 10-18)
 *   CDRA  — Career Decision Readiness Assessment (working executives 22-65)
 *   ECCRI — Executive Career Circumstantial Readiness Index (executives, external readiness)
 *
 * Verbatim vs authored
 *   CCRI: all 63 item texts are verbatim from the founder's document (55 factor items in
 *     factor order, then the 8 reverse-keyed misconception items, indices 55-62). The
 *     document's "(R)" notation is carried as `reverse: true`, not in the display text.
 *   CDRA: all 72 item texts are verbatim (F1-F9 four each; F10 six, last two reverse;
 *     F11 thirty — six labelled subscales of four plus the six reverse Reality Check items).
 *   ECCRI: dims 1-9 and 11 are verbatim including the document's (R) marks; semantically
 *     negative items without an explicit (R) are still reverse-keyed so every dim scores
 *     0-100 with high = supports career freedom/readiness. Dims 10, 12, 13 are given only
 *     as keywords in the document (Health/Energy/Stress/Burnout/Sleep/Exercise;
 *     Money/Courses/Mentors/Books/Networking; Passport/Language/Networking/Interview/
 *     Resume/LinkedIn/Portfolio) — one first-person statement was authored per keyword.
 *     Dim 14 gives 14 one-word constraint areas plus the question "Which of these currently
 *     stop your career growth? Rate 1-5." — full-sentence ratings were authored per area.
 *     Authored item ids (authored: true on each):
 *       eccri-ls-1 … eccri-ls-6   (Lifestyle Stability)
 *       eccri-li-1 … eccri-li-5   (Learning Investment)
 *       eccri-or-1 … eccri-or-7   (Opportunity Readiness)
 *       eccri-cx-salary … eccri-cx-networking (Career Satisfaction Constraints, 14)
 *
 * Scoring (identical primitives across instruments, per the CDRA document's formula)
 *   Reverse score          = 6 − x                       (x in 1..5)
 *   Factor/dim score       = POMP of the item mean       = ((mean − 1) / 4) × 100  → 0-100
 *   Coverage rule          = a factor/dim scores null when under 60% of its items are answered
 *   Answers                = storage-order arrays over the module's item order, values 1-5,
 *                            null = unanswered
 *   CCRI cri / CDRA cdrs   = Σ(weight × factor) / Σ(weights of scored factors)   (weights per doc)
 *   CCRI pillar score      = weight-proportional mean of its factors (doc Report Structure)
 *   CDRA gap index         = perception − evidence (doc "Perception vs. Evidence Gap")
 *       perception = mean(F1 Self Awareness, F3 Future Confidence, F7 Employability Awareness,
 *                         F11 Career Positioning Confidence subscale)
 *       evidence   = mean(F11 Competitive Benchmarking, F11 Professional Visibility,
 *                         F11 Future Readiness, F11 Reality Check score)
 *   ECCRI dim 14           = its direct POMP is a CONSTRAINT level (high = more blocked);
 *                            its entry in `dims` is 100 − that level so the dims array stays
 *                            uniformly high = ready. constraintTop lists the doc's areas
 *                            sorted by their raw 1-5 rating (top 5).
 *   ECCRI final scores     = the document names six final scores (Freedom, Stability,
 *                            Mobility, Growth, Satisfaction, Constraint) but gives no
 *                            formulas; the means below are an interpretive implementation
 *                            of its Enablers/Constraints/Drivers classification — each is
 *                            commented at the definition.
 *   ECCRI overall          = plain mean of all scored non-profile dims (high = ready).
 */

export type ReadinessTrack = "student" | "executive";

export interface RItem {
  id: string;
  text: string;
  factor: string;
  reverse?: boolean;
  authored?: boolean;
  profileOnly?: boolean;
}

export interface RFactor {
  key: string;
  name: string;
  weightPct?: number;
  note?: string;
}

/** 5 labels, index 0 = value 1. */
export const READINESS_SCALE: string[] = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

/** CCRI's own scale wording — its document anchors value 3 as "Not Sure"
 *  (the executive instruments use "Neutral"). UIs pick this for the CCRI run. */
export const CCRI_SCALE: string[] = [
  "Strongly Disagree",
  "Disagree",
  "Not Sure",
  "Agree",
  "Strongly Agree",
];

/* ------------------------------------------------------------------ */
/* Shared scoring primitives                                           */
/* ------------------------------------------------------------------ */

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function meanOf(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x != null);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * POMP score for a set of items. `answers` is indexed by position in `all`
 * (the instrument's full item array). Returns null when under 60% of the
 * given items are answered.
 */
function pompScore(
  items: RItem[],
  all: RItem[],
  answers: (number | null)[]
): number | null {
  let sum = 0;
  let n = 0;
  for (const it of items) {
    const idx = all.indexOf(it);
    const a = idx >= 0 ? answers[idx] : null;
    if (a == null) continue;
    sum += it.reverse ? 6 - a : a;
    n++;
  }
  if (items.length === 0 || n / items.length < 0.6) return null;
  return round1(((sum / n - 1) / 4) * 100);
}

/* ================================================================== */
/* CCRI — Child Career Readiness Index (parent respondent)             */
/* ================================================================== */

const CCRI_FACTORS: RFactor[] = [
  // Weights per the document's scoring table: 15/15/10/10/10/10/8/7/5/10.
  { key: "selfAwareness", name: "Self Awareness", weightPct: 15, note: "How well the child understands themselves." },
  { key: "strengthAwareness", name: "Strength Awareness", weightPct: 15, note: "Whether natural abilities are identified rather than assumed." },
  { key: "interestClarity", name: "Interest Clarity", weightPct: 10, note: "Whether interests are consistent and understood." },
  { key: "careerAwareness", name: "Career Awareness", weightPct: 10, note: "How wide and current the family's picture of careers is." },
  { key: "decisionReadiness", name: "Decision Readiness", weightPct: 10, note: "Whether educational decisions rest on information, not pressure." },
  { key: "learningGrowth", name: "Learning & Growth", weightPct: 10, note: "Curiosity, persistence and ownership of learning." },
  { key: "emotionalReadiness", name: "Emotional Readiness", weightPct: 8, note: "Stress management, recovery and confidence." },
  { key: "lifeSkills", name: "Life Skills", weightPct: 7, note: "Communication, time, collaboration and everyday problem-solving." },
  { key: "parentingReadiness", name: "Parenting Readiness", weightPct: 5, note: "The family's approach, not the child." },
  { key: "futurePreparedness", name: "Future Career Preparedness", weightPct: 10, note: "Awareness of where careers and competencies are heading." },
];

const CCRI_ITEMS: RItem[] = [
  // Factor 1 — Self Awareness (verbatim)
  { id: "ccri-sa-1", text: "My child understands what they enjoy doing.", factor: "selfAwareness" },
  { id: "ccri-sa-2", text: "My child knows what they are naturally good at.", factor: "selfAwareness" },
  { id: "ccri-sa-3", text: "My child can describe their own strengths.", factor: "selfAwareness" },
  { id: "ccri-sa-4", text: "My child recognizes situations that frustrate them.", factor: "selfAwareness" },
  { id: "ccri-sa-5", text: "My child understands why they like certain activities more than others.", factor: "selfAwareness" },
  // Factor 2 — Strength Awareness (verbatim)
  { id: "ccri-st-1", text: "We have objectively identified my child's natural abilities.", factor: "strengthAwareness" },
  { id: "ccri-st-2", text: "My child performs consistently well in some activities without much effort.", factor: "strengthAwareness" },
  { id: "ccri-st-3", text: "We know which abilities are exceptional.", factor: "strengthAwareness" },
  { id: "ccri-st-4", text: "My child's strengths are documented rather than assumed.", factor: "strengthAwareness" },
  { id: "ccri-st-5", text: "We understand the difference between learned skills and natural strengths.", factor: "strengthAwareness" },
  // Factor 3 — Interest Clarity (verbatim)
  { id: "ccri-ic-1", text: "My child's hobbies remain consistent over time.", factor: "interestClarity" },
  { id: "ccri-ic-2", text: "My child enjoys learning beyond school.", factor: "interestClarity" },
  { id: "ccri-ic-3", text: "My child explores different activities voluntarily.", factor: "interestClarity" },
  { id: "ccri-ic-4", text: "We know which interests are temporary and which are long-term.", factor: "interestClarity" },
  { id: "ccri-ic-5", text: "We understand how interests relate to future careers.", factor: "interestClarity" },
  // Factor 4 — Career Awareness (verbatim)
  { id: "ccri-ca-1", text: "My child knows about many different careers.", factor: "careerAwareness" },
  { id: "ccri-ca-2", text: "We regularly discuss future career options.", factor: "careerAwareness" },
  { id: "ccri-ca-3", text: "We understand careers beyond engineering, medicine and government jobs.", factor: "careerAwareness" },
  { id: "ccri-ca-4", text: "We know how different careers are changing because of technology.", factor: "careerAwareness" },
  { id: "ccri-ca-5", text: "We understand the qualifications needed for different professions.", factor: "careerAwareness" },
  // Factor 5 — Decision Readiness (verbatim)
  { id: "ccri-dr-1", text: "Important educational decisions are based on objective information.", factor: "decisionReadiness" },
  { id: "ccri-dr-2", text: "We compare multiple options before making decisions.", factor: "decisionReadiness" },
  { id: "ccri-dr-3", text: "Our decisions are not driven mainly by relatives or social pressure.", factor: "decisionReadiness" },
  { id: "ccri-dr-4", text: "We know how to evaluate different educational pathways.", factor: "decisionReadiness" },
  { id: "ccri-dr-5", text: "We have a long-term career plan.", factor: "decisionReadiness" },
  // Factor 6 — Learning & Growth (verbatim)
  { id: "ccri-lg-1", text: "My child enjoys learning new things.", factor: "learningGrowth" },
  { id: "ccri-lg-2", text: "My child persists even when tasks become difficult.", factor: "learningGrowth" },
  { id: "ccri-lg-3", text: "My child willingly accepts feedback.", factor: "learningGrowth" },
  { id: "ccri-lg-4", text: "My child is curious about how things work.", factor: "learningGrowth" },
  { id: "ccri-lg-5", text: "My child takes responsibility for learning.", factor: "learningGrowth" },
  // Factor 7 — Emotional Readiness (verbatim)
  { id: "ccri-er-1", text: "My child manages stress reasonably well.", factor: "emotionalReadiness" },
  { id: "ccri-er-2", text: "My child recovers after setbacks.", factor: "emotionalReadiness" },
  { id: "ccri-er-3", text: "My child remains motivated despite failures.", factor: "emotionalReadiness" },
  { id: "ccri-er-4", text: "My child asks for help when needed.", factor: "emotionalReadiness" },
  { id: "ccri-er-5", text: "My child shows confidence while trying new things.", factor: "emotionalReadiness" },
  // Factor 8 — Life Skills (verbatim)
  { id: "ccri-lk-1", text: "My child communicates confidently.", factor: "lifeSkills" },
  { id: "ccri-lk-2", text: "My child manages time reasonably well.", factor: "lifeSkills" },
  { id: "ccri-lk-3", text: "My child collaborates effectively with others.", factor: "lifeSkills" },
  { id: "ccri-lk-4", text: "My child shows responsibility.", factor: "lifeSkills" },
  { id: "ccri-lk-5", text: "My child solves everyday problems independently.", factor: "lifeSkills" },
  // Factor 9 — Parenting Readiness (verbatim; measures the family's approach, not the child)
  { id: "ccri-pr-1", text: "We understand that every child is unique.", factor: "parentingReadiness" },
  { id: "ccri-pr-2", text: "We avoid comparing our child with others.", factor: "parentingReadiness" },
  { id: "ccri-pr-3", text: "We encourage exploration before specialization.", factor: "parentingReadiness" },
  { id: "ccri-pr-4", text: "We are open to careers beyond traditional professions.", factor: "parentingReadiness" },
  { id: "ccri-pr-5", text: "We are willing to change our views if evidence suggests another path suits our child better.", factor: "parentingReadiness" },
  // Factor 10 — Future Career Preparedness (verbatim)
  { id: "ccri-fp-1", text: "We know which careers will grow during the next 15 years.", factor: "futurePreparedness" },
  { id: "ccri-fp-2", text: "We understand how AI may change future jobs.", factor: "futurePreparedness" },
  { id: "ccri-fp-3", text: "We know which competencies employers increasingly value.", factor: "futurePreparedness" },
  { id: "ccri-fp-4", text: "We understand the importance of work environment fit.", factor: "futurePreparedness" },
  { id: "ccri-fp-5", text: "We understand personality-job fit.", factor: "futurePreparedness" },
  { id: "ccri-fp-6", text: "We know how interests affect long-term job satisfaction.", factor: "futurePreparedness" },
  { id: "ccri-fp-7", text: "We know how natural abilities affect career success.", factor: "futurePreparedness" },
  { id: "ccri-fp-8", text: "We understand that marks alone cannot predict career success.", factor: "futurePreparedness" },
  { id: "ccri-fp-9", text: "We know the risks of choosing a career without scientific evaluation.", factor: "futurePreparedness" },
  { id: "ccri-fp-10", text: "We have used objective methods to understand our child's career potential.", factor: "futurePreparedness" },
  // Reverse-keyed misconception items (verbatim, indices 55-62), each mapped to its most
  // relevant factor: marks-guarantee + marks-predict + passion-alone -> Future Career
  // Preparedness; science-student-engineering -> Career Awareness; children-know-best +
  // guidance-only-if-confused + planning-can-wait -> Decision Readiness;
  // parents-know-without-assessment -> Parenting Readiness.
  { id: "ccri-mis-1", text: "Good marks alone guarantee career success.", factor: "futurePreparedness", reverse: true },
  { id: "ccri-mis-2", text: "Every science student should aim for engineering or medicine.", factor: "careerAwareness", reverse: true },
  { id: "ccri-mis-3", text: "Children usually know the best career for themselves.", factor: "decisionReadiness", reverse: true },
  { id: "ccri-mis-4", text: "Career guidance is only needed if a child is confused.", factor: "decisionReadiness", reverse: true },
  { id: "ccri-mis-5", text: "School marks accurately predict future professional success.", factor: "futurePreparedness", reverse: true },
  { id: "ccri-mis-6", text: "Passion alone is enough to build a successful career.", factor: "futurePreparedness", reverse: true },
  { id: "ccri-mis-7", text: "Parents usually know their child well enough without any assessment.", factor: "parentingReadiness", reverse: true },
  { id: "ccri-mis-8", text: "Career planning can wait until after Class 12.", factor: "decisionReadiness", reverse: true },
];

export const CCRI: { title: string; tagline: string; factors: RFactor[]; items: RItem[] } = {
  title: "Child Career Readiness Index (CCRI)",
  tagline:
    "How prepared is your child—not just for the next exam, but for a successful and fulfilling career?",
  factors: CCRI_FACTORS,
  items: CCRI_ITEMS,
};

// Pillars per the document's Report Structure section.
const CCRI_PILLARS: { key: string; name: string; question: string; factorKeys: string[] }[] = [
  {
    key: "understanding",
    name: "Understanding the Child",
    question:
      "How well do you truly understand your child's unique abilities, interests, personality, motivations, and developmental needs?",
    factorKeys: ["selfAwareness", "strengthAwareness", "interestClarity"],
  },
  {
    key: "choices",
    name: "Making the Right Choices",
    question:
      "How prepared are you to make evidence-based decisions about subjects, education pathways, and careers?",
    factorKeys: ["careerAwareness", "decisionReadiness"],
  },
  {
    key: "preparing",
    name: "Preparing for the Future",
    question:
      "How well are you helping your child develop the competencies, adaptability, and resilience needed for a rapidly changing world?",
    factorKeys: ["learningGrowth", "emotionalReadiness", "lifeSkills"],
  },
  {
    key: "longTerm",
    name: "Building Long-Term Success",
    question:
      "How likely is your current approach to help your child achieve sustained performance, satisfaction, and purpose in adulthood?",
    factorKeys: ["parentingReadiness", "futurePreparedness"],
  },
];

// Descriptive phrases per factor, used to generate pillar reads that are accurate by
// construction (describe, don't prescribe). "high" is used when the factor scores >= 60.
const CCRI_FACTOR_PHRASES: Record<string, { high: string; low: string }> = {
  selfAwareness: {
    high: "your child's own sense of what they enjoy and where they struggle reads as well formed",
    low: "your child's own picture of what they enjoy and where they struggle is still forming",
  },
  strengthAwareness: {
    high: "natural abilities have been observed and named rather than assumed",
    low: "natural abilities are currently assumed rather than objectively identified",
  },
  interestClarity: {
    high: "interests appear consistent enough to build on",
    low: "it is hard to tell yet which interests will last and which are passing",
  },
  careerAwareness: {
    high: "the family's picture of possible careers extends well beyond the familiar few",
    low: "the picture of possible careers is still narrow, centred on the familiar professions",
  },
  decisionReadiness: {
    high: "educational decisions are being weighed against information rather than pressure",
    low: "decisions currently lean more on expectation and social pressure than on compared evidence",
  },
  learningGrowth: {
    high: "curiosity and persistence with difficult tasks both show up consistently",
    low: "persistence and curiosity are not yet reliable habits",
  },
  emotionalReadiness: {
    high: "setbacks are being absorbed without losing motivation",
    low: "stress and setbacks still take a visible toll on motivation",
  },
  lifeSkills: {
    high: "communication, time management and everyday problem-solving are carrying their weight",
    low: "everyday skills — communication, time, independent problem-solving — still need deliberate room to grow",
  },
  parentingReadiness: {
    high: "the family's stance leaves room for the child to be who they are",
    low: "the family's stance may be closing options before the child has explored them",
  },
  futurePreparedness: {
    high: "the family is tracking where careers and employer expectations are actually heading",
    low: "the view of where careers are heading is running on older assumptions",
  },
};

function ccriPillarBand(score: number | null): string {
  if (score == null) return "Not scored";
  if (score >= 75) return "Strong footing";
  if (score >= 50) return "Developing";
  return "Needs attention";
}

function ccriPillarRead(
  score: number | null,
  factors: { key: string; name: string; score: number | null }[]
): string {
  const scored = factors.filter(
    (f): f is { key: string; name: string; score: number } => f.score != null
  );
  if (score == null || !scored.length) {
    return "Too few of these questions were answered to read this pillar.";
  }
  const opener =
    score >= 75
      ? "This pillar is on firm ground."
      : score >= 50
        ? "This pillar is developing — some of it is in place, some is not yet."
        : "This pillar currently needs attention.";
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const phrase = (f: { key: string; score: number }) =>
    f.score >= 60 ? CCRI_FACTOR_PHRASES[f.key].high : CCRI_FACTOR_PHRASES[f.key].low;
  if (scored.length === 1 || top.key === bottom.key) {
    return `${opener} Within it, ${phrase(top)}.`;
  }
  if (top.score - bottom.score < 10) {
    return `${opener} The factors here sit at a similar level: ${phrase(top)}, and ${phrase(bottom)}.`;
  }
  return `${opener} ${top.name} is the firmest signal — ${phrase(top)}. ${bottom.name} sits lowest — ${phrase(bottom)}.`;
}

export interface CcriResult {
  factors: { key: string; name: string; score: number | null; weightPct: number }[];
  cri: number | null;
  pillars: {
    key: string;
    name: string;
    question: string;
    score: number | null;
    band: string;
    read: string;
  }[];
  misconceptions: { text: string; endorsed: boolean }[];
  finalInsight: string;
}

// Lightly adapted from the document's Final Insight closing (balanced, no sales tone).
const CCRI_FINAL_INSIGHT =
  "This index measures your family's readiness to support career development. It does not " +
  "directly measure your child's abilities, personality, interests, motivations, or career fit — " +
  "many of the factors that most influence long-term career success cannot be accurately " +
  "inferred from observation alone. If your scores sit in the moderate or low range, or an " +
  "important educational decision is approaching, an objective 360-degree evaluation of your " +
  "child's strengths, interests, personality, competencies, values, and suitable pathways can " +
  "reduce guesswork and support more confident, informed decisions.";

export function scoreCcri(answers: (number | null)[]): CcriResult {
  const factors = CCRI_FACTORS.map((f) => ({
    key: f.key,
    name: f.name,
    score: pompScore(
      CCRI_ITEMS.filter((i) => i.factor === f.key),
      CCRI_ITEMS,
      answers
    ),
    weightPct: f.weightPct ?? 0,
  }));

  // CRI = Σ(weight × factor) / Σ(weights of scored factors).
  let wSum = 0;
  let wTotal = 0;
  for (const f of factors) {
    if (f.score == null) continue;
    wSum += f.weightPct * f.score;
    wTotal += f.weightPct;
  }
  const cri = wTotal > 0 ? round1(wSum / wTotal) : null;

  const pillars = CCRI_PILLARS.map((p) => {
    const pf = factors.filter((f) => p.factorKeys.includes(f.key));
    // Pillar score = weight-proportional mean of its scored factors.
    let s = 0;
    let w = 0;
    for (const f of pf) {
      if (f.score == null) continue;
      s += f.weightPct * f.score;
      w += f.weightPct;
    }
    const score = w > 0 ? round1(s / w) : null;
    return {
      key: p.key,
      name: p.name,
      question: p.question,
      score,
      band: ccriPillarBand(score),
      read: ccriPillarRead(score, pf),
    };
  });

  // Misconceptions: the 8 reverse items; endorsed = raw answer >= 4 (Agree or Strongly Agree).
  const misconceptions = CCRI_ITEMS.filter((i) => i.reverse).map((i) => {
    const raw = answers[CCRI_ITEMS.indexOf(i)];
    return { text: i.text, endorsed: raw != null && raw >= 4 };
  });

  return { factors, cri, pillars, misconceptions, finalInsight: CCRI_FINAL_INSIGHT };
}

/* ================================================================== */
/* CDRA — Career Decision Readiness Assessment (executives)            */
/* ================================================================== */

const CDRA_FACTORS: RFactor[] = [
  // Weights per the document's CDRS table: 10/10/8/8/10/8/8/8/8/10/12 = 100.
  { key: "F1", name: "Self Awareness", weightPct: 10 },
  { key: "F2", name: "Career Alignment", weightPct: 10 },
  { key: "F3", name: "Future Confidence", weightPct: 8 },
  { key: "F4", name: "Labour Market Awareness", weightPct: 8 },
  { key: "F5", name: "Career Decision Rationality", weightPct: 10 },
  { key: "F6", name: "Career Exploration", weightPct: 8 },
  { key: "F7", name: "Employability Awareness", weightPct: 8 },
  { key: "F8", name: "Career Purpose", weightPct: 8 },
  { key: "F9", name: "Adaptability & Continuous Learning", weightPct: 8 },
  { key: "F10", name: "Scientific Career Planning Orientation", weightPct: 10 },
  { key: "F11", name: "Competitive Positioning Index", weightPct: 12 },
];

const CDRA_ITEMS: RItem[] = [
  // FACTOR 1: SELF AWARENESS (verbatim)
  { id: "cdra-f1-1", text: "I clearly understand my strongest professional strengths.", factor: "F1" },
  { id: "cdra-f1-2", text: "I know which type of work naturally energizes me.", factor: "F1" },
  { id: "cdra-f1-3", text: "I understand the situations in which I perform poorly.", factor: "F1" },
  { id: "cdra-f1-4", text: "I know why I enjoy certain roles more than others.", factor: "F1" },
  // FACTOR 2: CAREER ALIGNMENT (verbatim)
  { id: "cdra-f2-1", text: "My current work fully utilizes my natural strengths.", factor: "F2" },
  { id: "cdra-f2-2", text: "My job feels meaningful.", factor: "F2" },
  { id: "cdra-f2-3", text: "Success comes naturally in my present role.", factor: "F2" },
  { id: "cdra-f2-4", text: "I believe I have chosen the right profession.", factor: "F2" },
  // FACTOR 3: FUTURE CONFIDENCE (verbatim)
  { id: "cdra-f3-1", text: "I know how my career should evolve during the next decade.", factor: "F3" },
  { id: "cdra-f3-2", text: "I know which competencies will make me valuable in future.", factor: "F3" },
  { id: "cdra-f3-3", text: "I feel confident despite AI and technological disruption.", factor: "F3" },
  { id: "cdra-f3-4", text: "I know what my next career move should be.", factor: "F3" },
  // FACTOR 4: LABOUR MARKET AWARENESS (verbatim)
  { id: "cdra-f4-1", text: "I regularly follow hiring trends.", factor: "F4" },
  { id: "cdra-f4-2", text: "I understand industry changes affecting my profession.", factor: "F4" },
  { id: "cdra-f4-3", text: "I know which industries are growing.", factor: "F4" },
  { id: "cdra-f4-4", text: "I understand employer expectations.", factor: "F4" },
  // FACTOR 5: CAREER DECISION RATIONALITY (verbatim)
  { id: "cdra-f5-1", text: "My career decisions are based on evidence.", factor: "F5" },
  { id: "cdra-f5-2", text: "I compare multiple options before deciding.", factor: "F5" },
  { id: "cdra-f5-3", text: "I validate decisions using objective information.", factor: "F5" },
  { id: "cdra-f5-4", text: "I avoid making career decisions based only on emotions.", factor: "F5" },
  // FACTOR 6: CAREER EXPLORATION (verbatim)
  { id: "cdra-f6-1", text: "I know several careers that suit me.", factor: "F6" },
  { id: "cdra-f6-2", text: "I regularly explore adjacent career opportunities.", factor: "F6" },
  { id: "cdra-f6-3", text: "I understand careers beyond my current profession.", factor: "F6" },
  { id: "cdra-f6-4", text: "I know which roles may suit me better.", factor: "F6" },
  // FACTOR 7: EMPLOYABILITY AWARENESS (verbatim)
  { id: "cdra-f7-1", text: "I know how employers perceive my profile.", factor: "F7" },
  { id: "cdra-f7-2", text: "I know my market value.", factor: "F7" },
  { id: "cdra-f7-3", text: "I understand my competitive advantages.", factor: "F7" },
  { id: "cdra-f7-4", text: "I know where I need improvement.", factor: "F7" },
  // FACTOR 8: CAREER PURPOSE (verbatim)
  { id: "cdra-f8-1", text: "My work gives meaning to my life.", factor: "F8" },
  { id: "cdra-f8-2", text: "I know what contribution I want to make.", factor: "F8" },
  { id: "cdra-f8-3", text: "My career reflects my values.", factor: "F8" },
  { id: "cdra-f8-4", text: "I have clearly defined success.", factor: "F8" },
  // FACTOR 9: ADAPTABILITY (verbatim)
  { id: "cdra-f9-1", text: "I enjoy learning continuously.", factor: "F9" },
  { id: "cdra-f9-2", text: "I quickly adapt to change.", factor: "F9" },
  { id: "cdra-f9-3", text: "I actively build future skills.", factor: "F9" },
  { id: "cdra-f9-4", text: "I am prepared to reinvent myself.", factor: "F9" },
  // FACTOR 10: SCIENTIFIC CAREER PLANNING (verbatim; last two reverse per doc)
  { id: "cdra-f10-1", text: "Scientific assessment improves career decisions.", factor: "F10" },
  { id: "cdra-f10-2", text: "Objective evidence should guide career planning.", factor: "F10" },
  { id: "cdra-f10-3", text: "Personality assessment provides useful career insights.", factor: "F10" },
  { id: "cdra-f10-4", text: "Career planning should be data driven.", factor: "F10" },
  { id: "cdra-f10-5", text: "Experience alone is sufficient to plan a career.", factor: "F10", reverse: true },
  { id: "cdra-f10-6", text: "Personality alone is sufficient to choose a career.", factor: "F10", reverse: true },
  // FACTOR 11: COMPETITIVE POSITIONING INDEX (verbatim; six labelled subscales of four
  // plus the six reverse-keyed Reality Check items — subscale marker lives in the id).
  // — Labour Market Awareness (lm)
  { id: "cdra-f11-lm-1", text: "I understand how my profession is changing.", factor: "F11" },
  { id: "cdra-f11-lm-2", text: "I regularly monitor hiring trends.", factor: "F11" },
  { id: "cdra-f11-lm-3", text: "I know where demand for my expertise exists.", factor: "F11" },
  { id: "cdra-f11-lm-4", text: "I understand AI's impact on my career.", factor: "F11" },
  // — Competitive Benchmarking (cb)
  { id: "cdra-f11-cb-1", text: "I know how I compare with peers.", factor: "F11" },
  { id: "cdra-f11-cb-2", text: "I know how my salary compares with the market.", factor: "F11" },
  { id: "cdra-f11-cb-3", text: "I understand employer expectations.", factor: "F11" },
  { id: "cdra-f11-cb-4", text: "I know my differentiating strengths.", factor: "F11" },
  // — Global Employability (ge)
  { id: "cdra-f11-ge-1", text: "My skills are globally competitive.", factor: "F11" },
  { id: "cdra-f11-ge-2", text: "I understand international expectations.", factor: "F11" },
  { id: "cdra-f11-ge-3", text: "My expertise is transferable.", factor: "F11" },
  { id: "cdra-f11-ge-4", text: "I can compete internationally.", factor: "F11" },
  // — Future Readiness (fr)
  { id: "cdra-f11-fr-1", text: "I know which skills I must acquire.", factor: "F11" },
  { id: "cdra-f11-fr-2", text: "I am investing in future competencies.", factor: "F11" },
  { id: "cdra-f11-fr-3", text: "I know which of my skills are becoming obsolete.", factor: "F11" },
  { id: "cdra-f11-fr-4", text: "I have a long-term employability strategy.", factor: "F11" },
  // — Professional Visibility (pv)
  { id: "cdra-f11-pv-1", text: "Recruiters easily understand my strengths.", factor: "F11" },
  { id: "cdra-f11-pv-2", text: "My profile clearly communicates my value.", factor: "F11" },
  { id: "cdra-f11-pv-3", text: "I receive regular external opportunities.", factor: "F11" },
  { id: "cdra-f11-pv-4", text: "I understand how employers perceive me.", factor: "F11" },
  // — Career Positioning Confidence (cp)
  { id: "cdra-f11-cp-1", text: "I know exactly where I stand.", factor: "F11" },
  { id: "cdra-f11-cp-2", text: "I know how to become more competitive.", factor: "F11" },
  { id: "cdra-f11-cp-3", text: "I know which opportunities suit me.", factor: "F11" },
  { id: "cdra-f11-cp-4", text: "My career decisions are based on labour-market evidence.", factor: "F11" },
  // — Reverse-Keyed Reality Check (rc)
  { id: "cdra-f11-rc-1", text: "Years of experience alone make me competitive.", factor: "F11", reverse: true },
  { id: "cdra-f11-rc-2", text: "Good professionals never need to worry about market changes.", factor: "F11", reverse: true },
  { id: "cdra-f11-rc-3", text: "My employer's opinion accurately reflects my market value.", factor: "F11", reverse: true },
  { id: "cdra-f11-rc-4", text: "Technical expertise alone guarantees future success.", factor: "F11", reverse: true },
  { id: "cdra-f11-rc-5", text: "Senior executives no longer face career competition.", factor: "F11", reverse: true },
  { id: "cdra-f11-rc-6", text: "Finding an equivalent role would be easy if I lost my job tomorrow.", factor: "F11", reverse: true },
];

export const CDRA: { title: string; factors: RFactor[]; items: RItem[] } = {
  title: "Career Decision Readiness Assessment (CDRA)",
  factors: CDRA_FACTORS,
  items: CDRA_ITEMS,
};

// Interpretation rows verbatim from the document.
const CDRA_BANDS: { min: number; name: string; note: string }[] = [
  {
    min: 85,
    name: "Evidence-Based Career Leader",
    note: "Strong self-awareness and market awareness; well-positioned to make informed career decisions.",
  },
  {
    min: 70,
    name: "Career Ready",
    note: "Good decision readiness with some areas requiring strengthening before major career transitions.",
  },
  {
    min: 55,
    name: "Moderate Readiness",
    note: "Several blind spots in self-understanding or labour-market awareness; comprehensive assessment recommended.",
  },
  {
    min: 40,
    name: "Career Risk Zone",
    note: "Important career decisions are likely being made with incomplete information; objective evaluation is strongly advised.",
  },
  {
    min: 0,
    name: "Career Blind Spot",
    note: "High risk of misaligned career choices due to significant gaps in self-awareness, competitive positioning, and future planning.",
  },
];

export interface CdraResult {
  factors: { key: string; name: string; score: number | null; weightPct: number }[];
  cdrs: number | null;
  band: { name: string; note: string } | null;
  gap: {
    perception: number | null;
    evidence: number | null;
    gap: number | null;
    read: string;
  };
}

function cdraSubscale(prefix: string, answers: (number | null)[]): number | null {
  return pompScore(
    CDRA_ITEMS.filter((i) => i.id.startsWith(prefix)),
    CDRA_ITEMS,
    answers
  );
}

export function scoreCdra(answers: (number | null)[]): CdraResult {
  const factors = CDRA_FACTORS.map((f) => ({
    key: f.key,
    name: f.name,
    score: pompScore(
      CDRA_ITEMS.filter((i) => i.factor === f.key),
      CDRA_ITEMS,
      answers
    ),
    weightPct: f.weightPct ?? 0,
  }));

  // CDRS = Σ(weight × factor) / Σ(weights of scored factors), per the document's weighted table.
  let wSum = 0;
  let wTotal = 0;
  for (const f of factors) {
    if (f.score == null) continue;
    wSum += f.weightPct * f.score;
    wTotal += f.weightPct;
  }
  const cdrs = wTotal > 0 ? round1(wSum / wTotal) : null;

  const band =
    cdrs == null ? null : (CDRA_BANDS.find((b) => cdrs >= b.min) ?? CDRA_BANDS[CDRA_BANDS.length - 1]);

  // Perception vs. Evidence Gap Index (doc Report Highlight).
  // Perception: how prepared the respondent FEELS —
  //   F1 Self Awareness, F3 Future Confidence, F7 Employability Awareness,
  //   F11 Career Positioning Confidence subscale.
  // Evidence: what the market has actually verified —
  //   F11 Competitive Benchmarking, F11 Professional Visibility, F11 Future Readiness,
  //   and the Reality Check score (reverse-keyed, so high = realistic).
  const f1 = factors.find((f) => f.key === "F1")!.score;
  const f3 = factors.find((f) => f.key === "F3")!.score;
  const f7 = factors.find((f) => f.key === "F7")!.score;
  const cp = cdraSubscale("cdra-f11-cp-", answers);
  const cb = cdraSubscale("cdra-f11-cb-", answers);
  const pv = cdraSubscale("cdra-f11-pv-", answers);
  const fr = cdraSubscale("cdra-f11-fr-", answers);
  const rc = cdraSubscale("cdra-f11-rc-", answers);

  const perceptionRaw = meanOf([f1, f3, f7, cp]);
  const evidenceRaw = meanOf([cb, pv, fr, rc]);
  const perception = perceptionRaw == null ? null : round1(perceptionRaw);
  const evidence = evidenceRaw == null ? null : round1(evidenceRaw);
  const gap =
    perception == null || evidence == null ? null : round1(perception - evidence);

  let read: string;
  if (gap == null) {
    read =
      "Too few of the underlying questions were answered to compare perceived readiness with verified evidence.";
  } else if (gap > 20) {
    read =
      "Confidence is running well ahead of verified evidence. Career decisions made now would rest more on assumption than on tested market information.";
  } else if (gap >= 10) {
    read =
      "There is a modest gap between how prepared you feel and the evidence behind it — worth verifying before a major move.";
  } else if (gap <= -10) {
    read =
      "The evidence is ahead of your confidence. Your market position appears stronger than you currently give it credit for.";
  } else {
    read =
      "Perceived readiness and verified evidence are broadly aligned — a sound base for career decisions.";
  }

  return {
    factors,
    cdrs,
    band: band ? { name: band.name, note: band.note } : null,
    gap: { perception, evidence, gap, read },
  };
}

/* ================================================================== */
/* ECCRI — Executive Career Circumstantial Readiness Index             */
/* ================================================================== */

/*
 * Dimension kinds, mapped from the document's own classification lists:
 *   Career Enablers (doc): financial flexibility, family support, learning investment,
 *     opportunity readiness, market mobility, time availability
 *     → kind "enabler" for those six, plus Location Flexibility and Lifestyle Stability
 *       (the doc's constraint list names their negatives — location, health, stress — so the
 *       keyed 0-100 high=ready dims sit naturally with the enablers).
 *   Career Constraints (doc): EMIs, dependent parents, children, location, health, stress,
 *     fear, educational mismatch
 *     → kind "constraint" for Family Dependency and Career Satisfaction Constraints (dim 14).
 *   Career Drivers (doc): purpose, identity, growth mindset, learning, competitiveness
 *     → kind "driver" for Career Identity, Education Alignment, Emotional Freedom.
 *   Work Flexibility is a work-style profile (WFH vs Hybrid vs Office) → kind "profile";
 *     its pure-preference items are profileOnly and never scored.
 */
const ECCRI_KINDS: Record<string, "enabler" | "constraint" | "driver" | "profile"> = {
  financialFlexibility: "enabler",
  familyDependency: "constraint",
  locationFlexibility: "enabler",
  workFlexibility: "profile",
  educationAlignment: "driver",
  careerIdentity: "driver",
  marketMobility: "enabler",
  familySupport: "enabler",
  emotionalFreedom: "driver",
  lifestyleStability: "enabler",
  timeAvailability: "enabler",
  learningInvestment: "enabler",
  opportunityReadiness: "enabler",
  constraints: "constraint",
};

const ECCRI_DIMS: RFactor[] = [
  { key: "financialFlexibility", name: "Financial Flexibility", note: "Measures financial freedom." },
  { key: "familyDependency", name: "Family Dependency", note: "Measures dependence of others." },
  { key: "locationFlexibility", name: "Location Flexibility", note: "Measures geographical freedom." },
  { key: "workFlexibility", name: "Work Flexibility", note: "Work-style profile: WFH vs hybrid vs office." },
  { key: "educationAlignment", name: "Education Alignment", note: "One of the strongest factors." },
  { key: "careerIdentity", name: "Career Identity", note: "Professional identity and direction." },
  { key: "marketMobility", name: "Market Mobility", note: "Evidence of movement in the labour market." },
  { key: "familySupport", name: "Family Support", note: "Whether the family backs career growth." },
  { key: "emotionalFreedom", name: "Emotional Freedom", note: "Fear keeps executives stuck." },
  { key: "lifestyleStability", name: "Lifestyle Stability", note: "Health, energy, stress, burnout, sleep, exercise." },
  { key: "timeAvailability", name: "Time Availability", note: "Time available to learn and grow." },
  { key: "learningInvestment", name: "Learning Investment", note: "Money, courses, mentors, books, networking." },
  { key: "opportunityReadiness", name: "Opportunity Readiness", note: "Practical readiness to act on an opportunity." },
  { key: "constraints", name: "Career Satisfaction Constraints", note: "What currently stops career growth." },
];

// Career Satisfaction Constraints — the document's 14 areas, in doc order.
const ECCRI_CONSTRAINT_AREAS: { slug: string; name: string }[] = [
  { slug: "salary", name: "Salary" },
  { slug: "boss", name: "Boss" },
  { slug: "location", name: "Location" },
  { slug: "organization", name: "Organization" },
  { slug: "industry", name: "Industry" },
  { slug: "technology", name: "Technology" },
  { slug: "family", name: "Family" },
  { slug: "health", name: "Health" },
  { slug: "education", name: "Education" },
  { slug: "confidence", name: "Confidence" },
  { slug: "age", name: "Age" },
  { slug: "ai", name: "AI" },
  { slug: "competition", name: "Competition" },
  { slug: "networking", name: "Networking" },
];

const ECCRI_ITEMS: RItem[] = [
  // 1. Financial Flexibility (verbatim; (R) marks per doc)
  { id: "eccri-ff-1", text: "I can survive six months without salary.", factor: "financialFlexibility" },
  { id: "eccri-ff-2", text: "I have enough savings to change jobs if required.", factor: "financialFlexibility" },
  { id: "eccri-ff-3", text: "My EMIs significantly influence my career decisions.", factor: "financialFlexibility", reverse: true },
  { id: "eccri-ff-4", text: "Financial commitments stop me from taking better opportunities.", factor: "financialFlexibility", reverse: true },
  { id: "eccri-ff-5", text: "I can afford temporary income reduction for long-term growth.", factor: "financialFlexibility" },
  // 2. Family Dependency (verbatim; keyed so high score = LOW dependency = career freedom)
  { id: "eccri-fd-1", text: "My family depends heavily on my income.", factor: "familyDependency", reverse: true },
  { id: "eccri-fd-2", text: "I am the primary earning member.", factor: "familyDependency", reverse: true },
  { id: "eccri-fd-3", text: "I have flexibility in relocating.", factor: "familyDependency" },
  { id: "eccri-fd-4", text: "My family responsibilities reduce my career options.", factor: "familyDependency", reverse: true },
  { id: "eccri-fd-5", text: "My spouse can financially support the family if needed.", factor: "familyDependency" },
  // 3. Location Flexibility (verbatim; needing remote work / staying put keyed as reduced freedom)
  { id: "eccri-lf-1", text: "I can relocate if required.", factor: "locationFlexibility" },
  { id: "eccri-lf-2", text: "Location limits my opportunities.", factor: "locationFlexibility", reverse: true },
  { id: "eccri-lf-3", text: "I am willing to move internationally.", factor: "locationFlexibility" },
  { id: "eccri-lf-4", text: "I prefer remaining in my current city regardless of opportunity.", factor: "locationFlexibility", reverse: true },
  { id: "eccri-lf-5", text: "Remote work is essential for my current life situation.", factor: "locationFlexibility", reverse: true },
  // 4. Work Flexibility (verbatim; pure preferences are profileOnly — shown as a work-style
  //    profile, excluded from scores. The remaining items are keyed as adaptability.)
  { id: "eccri-wf-1", text: "I prefer complete WFH.", factor: "workFlexibility", profileOnly: true },
  { id: "eccri-wf-2", text: "I am comfortable with office work.", factor: "workFlexibility" },
  { id: "eccri-wf-3", text: "Travel is manageable.", factor: "workFlexibility" },
  { id: "eccri-wf-4", text: "Frequent travel affects my family.", factor: "workFlexibility", reverse: true },
  { id: "eccri-wf-5", text: "Hybrid work suits me best.", factor: "workFlexibility", profileOnly: true },
  // 5. Education Alignment (verbatim; unrelated field / limiting degree keyed reverse)
  { id: "eccri-ea-1", text: "My education supports my current career.", factor: "educationAlignment" },
  { id: "eccri-ea-2", text: "I work in an unrelated field.", factor: "educationAlignment", reverse: true },
  { id: "eccri-ea-3", text: "I possess qualifications required for future growth.", factor: "educationAlignment" },
  { id: "eccri-ea-4", text: "My degree limits my opportunities.", factor: "educationAlignment", reverse: true },
  { id: "eccri-ea-5", text: "I have upgraded my education.", factor: "educationAlignment" },
  // 6. Career Identity (verbatim; (R) per doc)
  { id: "eccri-ci-1", text: "I know what professional identity I want.", factor: "careerIdentity" },
  { id: "eccri-ci-2", text: "I have a long-term career direction.", factor: "careerIdentity" },
  { id: "eccri-ci-3", text: "My career has happened by chance.", factor: "careerIdentity", reverse: true },
  { id: "eccri-ci-4", text: "I know why employers hire me.", factor: "careerIdentity" },
  { id: "eccri-ci-5", text: "I know what differentiates me.", factor: "careerIdentity" },
  // 7. Market Mobility (verbatim; (R) per doc)
  { id: "eccri-mm-1", text: "I receive interview calls.", factor: "marketMobility" },
  { id: "eccri-mm-2", text: "Recruiters contact me.", factor: "marketMobility" },
  { id: "eccri-mm-3", text: "I know my market value.", factor: "marketMobility" },
  { id: "eccri-mm-4", text: "I have changed jobs successfully before.", factor: "marketMobility" },
  { id: "eccri-mm-5", text: "Finding another job would be difficult.", factor: "marketMobility", reverse: true },
  // 8. Family Support (verbatim; avoidance-due-to-disagreement keyed reverse)
  { id: "eccri-fs-1", text: "My spouse supports career growth.", factor: "familySupport" },
  { id: "eccri-fs-2", text: "My family encourages learning.", factor: "familySupport" },
  { id: "eccri-fs-3", text: "Career discussions are positive.", factor: "familySupport" },
  { id: "eccri-fs-4", text: "I avoid career decisions due to family disagreements.", factor: "familySupport", reverse: true },
  { id: "eccri-fs-5", text: "My family supports relocation.", factor: "familySupport" },
  // 9. Emotional Freedom (verbatim; fear/avoidance/delay/worry keyed reverse, confidence direct)
  { id: "eccri-ef-1", text: "I fear making career mistakes.", factor: "emotionalFreedom", reverse: true },
  { id: "eccri-ef-2", text: "I avoid risks.", factor: "emotionalFreedom", reverse: true },
  { id: "eccri-ef-3", text: "I delay decisions.", factor: "emotionalFreedom", reverse: true },
  { id: "eccri-ef-4", text: "I worry about job security.", factor: "emotionalFreedom", reverse: true },
  { id: "eccri-ef-5", text: "I feel confident changing careers.", factor: "emotionalFreedom" },
  // 10. Lifestyle Stability (AUTHORED — the doc gives keywords only:
  //     Health / Energy / Stress / Burnout / Sleep / Exercise)
  { id: "eccri-ls-1", text: "My health supports the career I want to build.", factor: "lifestyleStability", authored: true },
  { id: "eccri-ls-2", text: "I have the daily energy for demanding work.", factor: "lifestyleStability", authored: true },
  { id: "eccri-ls-3", text: "My stress levels are manageable.", factor: "lifestyleStability", authored: true },
  { id: "eccri-ls-4", text: "I am close to burnout.", factor: "lifestyleStability", authored: true, reverse: true },
  { id: "eccri-ls-5", text: "I sleep well most nights.", factor: "lifestyleStability", authored: true },
  { id: "eccri-ls-6", text: "I exercise regularly.", factor: "lifestyleStability", authored: true },
  // 11. Time Availability (verbatim; routine-consumed keyed reverse)
  { id: "eccri-ta-1", text: "I have time to upskill.", factor: "timeAvailability" },
  { id: "eccri-ta-2", text: "I read regularly.", factor: "timeAvailability" },
  { id: "eccri-ta-3", text: "I attend learning programs.", factor: "timeAvailability" },
  { id: "eccri-ta-4", text: "Most of my time goes into routine responsibilities.", factor: "timeAvailability", reverse: true },
  // 12. Learning Investment (AUTHORED — the doc gives keywords only:
  //     Money / Courses / Mentors / Books / Networking)
  { id: "eccri-li-1", text: "I set aside money each year for my own development.", factor: "learningInvestment", authored: true },
  { id: "eccri-li-2", text: "I have paid for a course or certification in the last two years.", factor: "learningInvestment", authored: true },
  { id: "eccri-li-3", text: "I have a mentor or advisor I consult about my career.", factor: "learningInvestment", authored: true },
  { id: "eccri-li-4", text: "I regularly read books related to my field or my growth.", factor: "learningInvestment", authored: true },
  { id: "eccri-li-5", text: "I invest time in building my professional network.", factor: "learningInvestment", authored: true },
  // 13. Opportunity Readiness (AUTHORED — the doc gives keywords only: Passport / Language /
  //     Networking / Interview readiness / Resume / LinkedIn / Portfolio)
  { id: "eccri-or-1", text: "I hold a valid passport.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-2", text: "My language skills are strong enough for the roles I want.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-3", text: "My professional network could connect me to my next opportunity.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-4", text: "If an interview came up next week, I would be ready for it.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-5", text: "My resume is current and ready to send.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-6", text: "My LinkedIn profile reflects what I can do today.", factor: "opportunityReadiness", authored: true },
  { id: "eccri-or-7", text: "I have work samples or a portfolio I can show.", factor: "opportunityReadiness", authored: true },
  // 14. Career Satisfaction Constraints (AUTHORED statements over the doc's 14 areas;
  //     rated directly — high rating = currently stops growth. The dim's direct POMP is a
  //     constraint LEVEL; its dims-array score is inverted to stay high = ready.)
  ...ECCRI_CONSTRAINT_AREAS.map<RItem>((a) => ({
    id: `eccri-cx-${a.slug}`,
    text: `${a.name} currently stops my career growth.`,
    factor: "constraints",
    authored: true,
  })),
];

export const ECCRI: { title: string; dims: RFactor[]; items: RItem[] } = {
  title: "Executive Career Circumstantial Readiness Index (ECCRI)",
  dims: ECCRI_DIMS,
  items: ECCRI_ITEMS,
};

export interface EccriResult {
  dims: {
    key: string;
    name: string;
    score: number | null;
    kind: "enabler" | "constraint" | "driver" | "profile";
  }[];
  finalScores: { key: string; name: string; question: string; score: number | null }[];
  constraintTop: { name: string; level: number }[];
  overall: number | null;
}

export function scoreEccri(answers: (number | null)[]): EccriResult {
  // Per-dim POMP over scoreable (non-profileOnly) items.
  const raw: Record<string, number | null> = {};
  for (const d of ECCRI_DIMS) {
    raw[d.key] = pompScore(
      ECCRI_ITEMS.filter((i) => i.factor === d.key && !i.profileOnly),
      ECCRI_ITEMS,
      answers
    );
  }

  // Dim 14's direct POMP is a constraint level (high = more blocked). The dims array
  // stays uniformly high = ready, so its entry is 100 − level.
  const constraintLevel = raw["constraints"];
  const constraintReady = constraintLevel == null ? null : round1(100 - constraintLevel);

  const dims = ECCRI_DIMS.map((d) => ({
    key: d.key,
    name: d.name,
    score: d.key === "constraints" ? constraintReady : raw[d.key],
    kind: ECCRI_KINDS[d.key],
  }));

  const s = (key: string): number | null =>
    dims.find((d) => d.key === key)?.score ?? null;

  const finalMean = (keys: string[]): number | null => {
    const m = meanOf(keys.map(s));
    return m == null ? null : round1(m);
  };

  /*
   * Final scores — the document names these six and their questions but gives no formulas.
   * Each mean below is an interpretive implementation of the doc's Enablers/Constraints/
   * Drivers classification (all inputs are the high=ready dim scores, so plain means work;
   * unanswered dims simply drop out of their mean).
   */
  const finalScores = [
    // Freedom: what lets you decide freely — money, nerve, low dependency, and time.
    { key: "freedom", name: "Career Freedom Score", question: "How free are you to make career decisions?", score: finalMean(["financialFlexibility", "emotionalFreedom", "familyDependency", "timeAvailability"]) },
    // Stability: what lets you survive change — reserves, health, and a family that holds.
    { key: "stability", name: "Career Stability Score", question: "Can you survive change?", score: finalMean(["financialFlexibility", "lifestyleStability", "familySupport"]) },
    // Mobility: whether you can physically and practically move on an opportunity.
    { key: "mobility", name: "Career Mobility Score", question: "Can you move?", score: finalMean(["locationFlexibility", "marketMobility", "opportunityReadiness"]) },
    // Growth: the driver dims plus the market's pull and the time to invest.
    { key: "growth", name: "Career Growth Score", question: "How easily can you progress?", score: finalMean(["educationAlignment", "learningInvestment", "careerIdentity", "marketMobility", "timeAvailability"]) },
    // Satisfaction: whether daily life supports contentment — support, health, identity,
    // and few active constraints (dim 14's high=ready score).
    { key: "satisfaction", name: "Career Satisfaction Score", question: "How well does your life support happiness?", score: finalMean(["familySupport", "lifestyleStability", "careerIdentity", "constraints"]) },
    // Constraint: inverted — high = MORE external barriers. 100 − mean of the high=ready
    // scores of the dims whose negatives populate the doc's constraint list
    // (EMIs→financial, dependents→familyDependency, location, educational mismatch,
    // health/stress→lifestyle, plus dim 14 itself).
    {
      key: "constraint",
      name: "Career Constraint Score",
      question: "How many external barriers exist?",
      score: (() => {
        const m = meanOf(
          ["familyDependency", "financialFlexibility", "locationFlexibility", "educationAlignment", "lifestyleStability", "constraints"].map(s)
        );
        return m == null ? null : round1(100 - m);
      })(),
    },
  ];

  // Top constraints: the doc's areas sorted by their raw 1-5 rating, top 5.
  const constraintTop = ECCRI_ITEMS.filter((i) => i.factor === "constraints")
    .map((i) => {
      const a = answers[ECCRI_ITEMS.indexOf(i)];
      const area = ECCRI_CONSTRAINT_AREAS.find((c) => i.id === `eccri-cx-${c.slug}`);
      return a == null || !area ? null : { name: area.name, level: a };
    })
    .filter((x): x is { name: string; level: number } => x != null)
    .sort((a, b) => b.level - a.level)
    .slice(0, 5);

  // Overall: plain mean of all scored non-profile dims (high = ready orientation).
  const overallRaw = meanOf(
    dims.filter((d) => d.kind !== "profile").map((d) => d.score)
  );
  const overall = overallRaw == null ? null : round1(overallRaw);

  return { dims, finalScores, constraintTop, overall };
}

/*
 * Executive Readiness Quadrants — per the document's matrix:
 *   rows = circumstantial readiness, columns = self-awareness.
 *     High circumstantial:  Future Builder (low SA)   | Career Accelerator (high SA)
 *     Low circumstantial:   Career Survivor (low SA)  | Strategic Leader (high SA)
 *   High = score >= 60 on the 0-100 scale.
 */
export function eccriQuadrant(
  circumstantial: number,
  selfAwareness: number
): { name: string; read: string } {
  const highCirc = circumstantial >= 60;
  const highSA = selfAwareness >= 60;
  if (highCirc && highSA) {
    return {
      name: "Career Accelerator",
      read: "Your circumstances and your self-knowledge are both working for you. Decisions made now can compound quickly, because little is holding back either the plan or the person.",
    };
  }
  if (highCirc && !highSA) {
    return {
      name: "Future Builder",
      read: "Your life situation gives you room to move, but the direction itself is less settled. The circumstances can fund a transition; clearer self-knowledge would tell you which one.",
    };
  }
  if (!highCirc && highSA) {
    return {
      name: "Strategic Leader",
      read: "You know yourself well, but current circumstances leave limited room to act on it. Progress here tends to come from sequencing — loosening one constraint at a time rather than a single leap.",
    };
  }
  return {
    name: "Career Survivor",
    read: "Both circumstances and self-clarity are currently working against easy movement. This is a position to stabilise from, not one to make major career decisions from.",
  };
}

/*
 * Closing statements.
 *   executive — lightly adapted from the ECCRI document's "Most Powerful Insight".
 *   student   — the CCRI Final Insight (same text surfaced in scoreCcri results).
 */
export const READINESS_CLOSING: { student: string; executive: string } = {
  student: CCRI_FINAL_INSIGHT,
  executive:
    "Your career decisions are influenced by two independent forces. The first is internal " +
    "readiness — your personality, competencies, interests, motivations, and values. The second " +
    "is circumstantial readiness — your financial commitments, family responsibilities, location " +
    "flexibility, health, work arrangements, educational alignment, and labour-market realities. " +
    "Even highly capable professionals can feel stuck when life circumstances limit their " +
    "options; favourable circumstances alone do not guarantee fulfilment without self-awareness " +
    "and career fit. Sustainable career growth comes from aligning both.",
};
