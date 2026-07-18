// FINAL Personality Assessment — generated from the founder's
// "Personality_Assessment.xlsx" (01_Revised_Item_Bank + 02_Scoring_Key +
// 03_Scale_Map). 6 factors × 3 sub-factors × 4 items = 72 statements, 1–5
// agree scale ("Neither Agree nor Disagree" midpoint). Scoring follows the
// workbook exactly: reverse items = 6 − response; sub-factor = mean of ≥3
// answered items; factor = mean of its three VALID sub-factors (all three
// required); 0–100 = ((mean − 1) / 4) × 100; NO overall total; within-person
// z across the 18 sub-factor means; provisional 0–100 bands.
// Do not hand-edit item text or keying — regenerate from the workbook.

export interface PfinItem { id: string; text: string; reverse: boolean }
export interface PfinSub { label: string; interp: string; items: PfinItem[] }
export interface PfinFactor { label: string; subs: PfinSub[] }

export const PFIN_SCALE = ["Strongly Disagree", "Disagree", "Neither Agree nor Disagree", "Agree", "Strongly Agree"]

export type PfinBand = "Very pronounced" | "Pronounced" | "Moderate" | "Less characteristic" | "Much less characteristic"
export function pfinBand(score: number): PfinBand {
  if (score >= 80) return "Very pronounced"
  if (score >= 65) return "Pronounced"
  if (score >= 50) return "Moderate"
  if (score >= 35) return "Less characteristic"
  return "Much less characteristic"
}

export interface PfinSubScore { label: string; interp: string; mean: number | null; score: number | null; band: PfinBand | null; z: number | null; lowConfidence: boolean }
export interface PfinFactorScore { label: string; mean: number | null; score: number | null; band: PfinBand | null; subs: PfinSubScore[] }
export interface PfinFlags { missing: number; invalid: boolean; longString: boolean; lowVariance: boolean; extreme: boolean; notes: string[] }
export interface PfinResult { factors: PfinFactorScore[]; flags: PfinFlags }

/** All 72 items flattened in workbook order (factor → sub-factor → item). */
export function pfinItems(): (PfinItem & { factor: string; sub: string })[] {
  return PFIN_FACTORS.flatMap((f) => f.subs.flatMap((s) => s.items.map((it) => ({ ...it, factor: f.label, sub: s.label }))))
}

/** answers: 1–5 per pfinItems() index, null = unanswered. */
export function scorePfin(answers: (number | null)[]): PfinResult {
  let idx = 0
  const factors: PfinFactorScore[] = PFIN_FACTORS.map((f) => {
    const subs: PfinSubScore[] = f.subs.map((s) => {
      const vals: number[] = []
      let answered = 0
      for (const it of s.items) {
        const a = answers[idx++]
        if (a != null && a >= 1 && a <= 5) { answered++; vals.push(it.reverse ? 6 - a : a) }
      }
      // workbook rule: score only when ≥3 of 4 items answered; 3 ⇒ lower confidence
      const mean = answered >= 3 ? vals.reduce((x, y) => x + y, 0) / vals.length : null
      return {
        label: s.label, interp: s.interp, mean,
        score: mean != null ? Math.round(((mean - 1) / 4) * 100) : null,
        band: mean != null ? pfinBand(((mean - 1) / 4) * 100) : null,
        z: null, lowConfidence: answered === 3,
      }
    })
    // factor validity: ALL THREE sub-factors must be valid
    const sm = subs.map((s) => s.mean)
    const valid = sm.every((m): m is number => m != null)
    const fmean = valid ? (sm as number[]).reduce((x, y) => x + y, 0) / 3 : null
    return {
      label: f.label, mean: fmean,
      score: fmean != null ? Math.round(((fmean - 1) / 4) * 100) : null,
      band: fmean != null ? pfinBand(((fmean - 1) / 4) * 100) : null,
      subs,
    }
  })

  // within-person z across the 18 sub-factor means
  const allSubs = factors.flatMap((f) => f.subs)
  const means = allSubs.map((s) => s.mean).filter((m): m is number => m != null)
  const m = means.length ? means.reduce((x, y) => x + y, 0) / means.length : 0
  const sd = means.length > 1 ? Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / (means.length - 1)) : 0
  for (const s of allSubs) if (s.mean != null) s.z = sd > 0 ? Math.round(((s.mean - m) / sd) * 100) / 100 : 0

  // response-quality indicators (05_Response_Quality)
  const given = answers.filter((a): a is number => a != null)
  const missing = answers.length - given.length
  let maxRun = 0, run = 0, prev: number | null = null
  for (const a of answers) {
    if (a != null && a === prev) run++
    else run = a != null ? 1 : 0
    prev = a
    maxRun = Math.max(maxRun, run)
  }
  const gm = given.length ? given.reduce((x, y) => x + y, 0) / given.length : 0
  const gsd = given.length > 1 ? Math.sqrt(given.reduce((a, b) => a + (b - gm) ** 2, 0) / (given.length - 1)) : 0
  const extremePct = given.length ? given.filter((v) => v === 1 || v === 5).length / given.length : 0
  const flags: PfinFlags = {
    missing,
    invalid: missing > 7, // >10% of 72
    longString: maxRun >= 18,
    lowVariance: given.length > 0 && gsd < 0.35,
    extreme: extremePct > 0.8,
    notes: [],
  }
  if (flags.invalid) flags.notes.push("More than 10% of items unanswered — profile is incomplete, not definitive.")
  if (flags.longString) flags.notes.push("A long run of identical answers was detected — engagement may have been low.")
  if (flags.lowVariance) flags.notes.push("Very low response variance — answers were weakly differentiated.")
  if (flags.extreme) flags.notes.push("Mostly extreme responses — scores may partly reflect response style.")
  return { factors, flags }
}

export const PFIN_FACTORS: PfinFactor[] = [
  { label: "Achievement Motivation", subs: [
    { label: "Goal Orientation", interp: "Preference for challenging goals and improvement", items: [
      { id: "AM-GO-1", text: "I set goals that require real effort.", reverse: false },
      { id: "AM-GO-2", text: "I try to improve my performance from one attempt to the next.", reverse: false },
      { id: "AM-GO-3", text: "Reaching a difficult target gives me satisfaction.", reverse: false },
      { id: "AM-GO-4", text: "I am satisfied with doing only what is necessary.", reverse: true },
    ] },
    { label: "Persistence", interp: "Sustained effort despite difficulty or setbacks", items: [
      { id: "AM-PE-1", text: "I keep working even when progress is slow.", reverse: false },
      { id: "AM-PE-2", text: "After a setback, I try again.", reverse: false },
      { id: "AM-PE-3", text: "I can stay focused on a difficult task for a long time.", reverse: false },
      { id: "AM-PE-4", text: "I often stop when a task becomes frustrating.", reverse: true },
    ] },
    { label: "Work Commitment", interp: "Priority given to duties, effort and delayed gratification", items: [
      { id: "AM-WC-1", text: "I complete important work before relaxing.", reverse: false },
      { id: "AM-WC-2", text: "I make time for responsibilities even when other activities are more enjoyable.", reverse: false },
      { id: "AM-WC-3", text: "I take my duties seriously even when no one is checking.", reverse: false },
      { id: "AM-WC-4", text: "I often postpone important work so that I can have fun first.", reverse: true },
    ] },
  ] },
  { label: "Leadership Orientation", subs: [
    { label: "Decision Ownership", interp: "Willingness to decide, lead and own outcomes", items: [
      { id: "LO-DO-1", text: "I am willing to make a decision when a group is unsure.", reverse: false },
      { id: "LO-DO-2", text: "I take responsibility for the results of choices I make.", reverse: false },
      { id: "LO-DO-3", text: "I step forward when a task needs someone to lead.", reverse: false },
      { id: "LO-DO-4", text: "I prefer other people to make important decisions for me.", reverse: true },
    ] },
    { label: "Self-Confidence", interp: "Confidence in one's judgement and expression", items: [
      { id: "LO-SC-1", text: "I express my view even when it differs from what others think.", reverse: false },
      { id: "LO-SC-2", text: "I trust myself to handle unfamiliar challenges.", reverse: false },
      { id: "LO-SC-3", text: "I can act without needing everyone's approval.", reverse: false },
      { id: "LO-SC-4", text: "I hold back my ideas because I worry that others may not like them.", reverse: true },
    ] },
    { label: "Independent Functioning", interp: "Ability to function independently without excessive support", items: [
      { id: "LO-IF-1", text: "I can work on my own without frequent reminders.", reverse: false },
      { id: "LO-IF-2", text: "I first try to solve routine problems myself.", reverse: false },
      { id: "LO-IF-3", text: "I use my judgement when instructions are incomplete.", reverse: false },
      { id: "LO-IF-4", text: "I need someone beside me for most difficult tasks.", reverse: true },
    ] },
  ] },
  { label: "Learning Orientation", subs: [
    { label: "Adaptability to Change", interp: "Adjustment to new conditions, routines and methods", items: [
      { id: "LR-AC-1", text: "I adjust my approach when the situation changes.", reverse: false },
      { id: "LR-AC-2", text: "I become comfortable with a new place or routine after some time.", reverse: false },
      { id: "LR-AC-3", text: "I can learn a new way of doing something even when the old way worked.", reverse: false },
      { id: "LR-AC-4", text: "Changes in routine make it difficult for me to function well.", reverse: true },
    ] },
    { label: "Intellectual Curiosity", interp: "Desire to understand, explore and acquire knowledge", items: [
      { id: "LR-IC-1", text: "I ask questions to understand how or why something happens.", reverse: false },
      { id: "LR-IC-2", text: "I enjoy learning more than what is immediately required.", reverse: false },
      { id: "LR-IC-3", text: "I like exploring different explanations for the same issue.", reverse: false },
      { id: "LR-IC-4", text: "Once I know enough to finish a task, I do not want to learn more about it.", reverse: true },
    ] },
    { label: "Breadth of Engagement", interp: "Breadth of interests and active exploration", items: [
      { id: "LR-BE-1", text: "I take part in activities that expose me to different ideas.", reverse: false },
      { id: "LR-BE-2", text: "I enjoy trying activities outside my usual interests.", reverse: false },
      { id: "LR-BE-3", text: "I have more than one area that I like learning about.", reverse: false },
      { id: "LR-BE-4", text: "I avoid activities that are unfamiliar to me.", reverse: true },
    ] },
  ] },
  { label: "People Orientation", subs: [
    { label: "Sociability", interp: "Comfort and interest in social interaction", items: [
      { id: "PO-SO-1", text: "I feel comfortable starting a conversation with someone new.", reverse: false },
      { id: "PO-SO-2", text: "I enjoy spending time with a group of people.", reverse: false },
      { id: "PO-SO-3", text: "I find it easy to build new acquaintances.", reverse: false },
      { id: "PO-SO-4", text: "I usually avoid opportunities to meet new people.", reverse: true },
    ] },
    { label: "Influence and Assertiveness", interp: "Clear self-expression, boundary setting and persuasion", items: [
      { id: "PO-IA-1", text: "I state my needs or opinions clearly.", reverse: false },
      { id: "PO-IA-2", text: "I can persuade others by giving good reasons.", reverse: false },
      { id: "PO-IA-3", text: "I can say no when it is necessary.", reverse: false },
      { id: "PO-IA-4", text: "I avoid disagreement even when an important issue is involved.", reverse: true },
    ] },
    { label: "Expressiveness", interp: "Visible expression, presentation comfort and social energy", items: [
      { id: "PO-EX-1", text: "I enjoy presenting, performing or speaking in front of a group.", reverse: false },
      { id: "PO-EX-2", text: "I show my enthusiasm openly.", reverse: false },
      { id: "PO-EX-3", text: "I feel comfortable being noticed for a contribution I have made.", reverse: false },
      { id: "PO-EX-4", text: "I feel very uncomfortable when attention is focused on me.", reverse: true },
    ] },
  ] },
  { label: "System Orientation", subs: [
    { label: "Planning", interp: "Advance organization of steps, time and resources", items: [
      { id: "SY-PL-1", text: "I decide the main steps before starting an important task.", reverse: false },
      { id: "SY-PL-2", text: "I think ahead about the time and resources a task will need.", reverse: false },
      { id: "SY-PL-3", text: "I use a schedule or checklist for complicated work.", reverse: false },
      { id: "SY-PL-4", text: "I usually begin important work without making a plan.", reverse: true },
    ] },
    { label: "Deliberative Decision-Making", interp: "Careful, systematic and consequence-aware decisions", items: [
      { id: "SY-DM-1", text: "I compare different options before making an important decision.", reverse: false },
      { id: "SY-DM-2", text: "I think about the likely consequences of my choices.", reverse: false },
      { id: "SY-DM-3", text: "I solve complicated problems in a step-by-step way.", reverse: false },
      { id: "SY-DM-4", text: "I often make important choices on impulse.", reverse: true },
    ] },
    { label: "Orderliness", interp: "Physical and task organisation", items: [
      { id: "SY-OR-1", text: "I keep my books, files or materials where I can find them easily.", reverse: false },
      { id: "SY-OR-2", text: "I usually return things to their proper place after using them.", reverse: false },
      { id: "SY-OR-3", text: "I work better when my surroundings are organised.", reverse: false },
      { id: "SY-OR-4", text: "I often lose time looking for things that I have misplaced.", reverse: true },
    ] },
  ] },
  { label: "Team Orientation", subs: [
    { label: "Cooperation", interp: "Contribution to shared goals and mutual support", items: [
      { id: "TO-CO-1", text: "I share useful information with other members of a group.", reverse: false },
      { id: "TO-CO-2", text: "I adjust my approach when it helps the group reach its goal.", reverse: false },
      { id: "TO-CO-3", text: "I help when a team member is struggling.", reverse: false },
      { id: "TO-CO-4", text: "I focus only on my own part even when the group needs help.", reverse: true },
    ] },
    { label: "Emotional Composure", interp: "Control and recovery during frustration or disagreement", items: [
      { id: "TO-EC-1", text: "I remain calm when a plan does not work as expected.", reverse: false },
      { id: "TO-EC-2", text: "I pause before responding when I feel upset.", reverse: false },
      { id: "TO-EC-3", text: "I recover reasonably quickly after a disagreement.", reverse: false },
      { id: "TO-EC-4", text: "I lose my temper when things do not go my way.", reverse: true },
    ] },
    { label: "Feedback Receptivity", interp: "Openness to corrective feedback and learning from criticism", items: [
      { id: "TO-FR-1", text: "I listen fully before defending myself when someone gives me feedback.", reverse: false },
      { id: "TO-FR-2", text: "I consider whether criticism may contain something useful.", reverse: false },
      { id: "TO-FR-3", text: "I ask what I can do better after receiving feedback.", reverse: false },
      { id: "TO-FR-4", text: "I reject feedback when it points out a mistake I made.", reverse: true },
    ] },
  ] },
]
