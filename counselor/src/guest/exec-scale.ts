// GENERATED from the founder's executive assessment workbook
// (Refined_Personality_Scale_with_Scoring.xlsx). This is the THIRD-test
// instrument for EXECUTIVES (working professionals), replacing the student
// timed ability battery. 6 factors x 3 subfactors x 4 items = 72 Likert items,
// 1-5 agree scale, D = direct / R = reverse-keyed (6 - raw). Scoring verified
// to reproduce the workbook's own scored columns EXACTLY (0 mismatches).
// Do not hand-edit item text or keying.

export type ExecKey = "D" | "R"
export interface ExecItem { text: string; factor: string; subfactor: string; reverse: boolean }
export interface ExecSubfactor { key: string; label: string; items: ExecItem[] }
export interface ExecFactor { key: string; label: string; blurb: string; subfactors: ExecSubfactor[] }

export const EXEC_FACTORS: ExecFactor[] = [
  { key: "people_energy", label: "People Energy", blurb: "Drive to engage, lead and be visible with people \u2014 outward energy and influence.", subfactors: [
    { key: "sociability", label: "Sociability", items: [
      { text: "I enjoy meeting new people and starting conversations.", factor: "people_energy", subfactor: "sociability", reverse: false },
      { text: "I actively look for chances to connect with others at events.", factor: "people_energy", subfactor: "sociability", reverse: false },
      { text: "I keep to myself unless someone approaches me first.", factor: "people_energy", subfactor: "sociability", reverse: true },
      { text: "I feel energized after spending time with groups.", factor: "people_energy", subfactor: "sociability", reverse: false },
    ] },
    { key: "assertive_leadership", label: "Assertive Leadership", items: [
      { text: "I am comfortable taking the lead when a group needs direction.", factor: "people_energy", subfactor: "assertive_leadership", reverse: false },
      { text: "I speak up to influence decisions that affect the team.", factor: "people_energy", subfactor: "assertive_leadership", reverse: false },
      { text: "I avoid positions where I have to direct others.", factor: "people_energy", subfactor: "assertive_leadership", reverse: true },
      { text: "I can persuade people to get behind a plan.", factor: "people_energy", subfactor: "assertive_leadership", reverse: false },
    ] },
    { key: "expressiveness", label: "Expressiveness", items: [
      { text: "I enjoy presenting or performing in front of others.", factor: "people_energy", subfactor: "expressiveness", reverse: false },
      { text: "I am fine being the center of attention when needed.", factor: "people_energy", subfactor: "expressiveness", reverse: false },
      { text: "I feel uneasy if people notice me too much.", factor: "people_energy", subfactor: "expressiveness", reverse: true },
      { text: "I like to entertain or engage an audience.", factor: "people_energy", subfactor: "expressiveness", reverse: false },
    ] },
  ] },
  { key: "team_composure", label: "Team & Composure", blurb: "How you work within a team and hold steady under pressure and criticism.", subfactors: [
    { key: "cooperation", label: "Cooperation", items: [
      { text: "I prefer sharing credit rather than competing for it.", factor: "team_composure", subfactor: "cooperation", reverse: false },
      { text: "I step in to support teammates when work gets tough.", factor: "team_composure", subfactor: "cooperation", reverse: false },
      { text: "I would rather work alone even when team help is available.", factor: "team_composure", subfactor: "cooperation", reverse: true },
      { text: "I prevent others from taking unfair credit for my work.", factor: "team_composure", subfactor: "cooperation", reverse: false },
    ] },
    { key: "tolerance_to_criticism", label: "Tolerance to Criticism", items: [
      { text: "I listen calmly when I receive tough feedback.", factor: "team_composure", subfactor: "tolerance_to_criticism", reverse: false },
      { text: "I can separate feedback about my work from my self-worth.", factor: "team_composure", subfactor: "tolerance_to_criticism", reverse: false },
      { text: "I react strongly when someone points out my mistakes.", factor: "team_composure", subfactor: "tolerance_to_criticism", reverse: true },
      { text: "I ask clarifying questions to understand criticism.", factor: "team_composure", subfactor: "tolerance_to_criticism", reverse: false },
    ] },
    { key: "emotional_composure", label: "Emotional Composure", items: [
      { text: "I stay calm and polite under pressure.", factor: "team_composure", subfactor: "emotional_composure", reverse: false },
      { text: "I am slow to anger, even when things go wrong.", factor: "team_composure", subfactor: "emotional_composure", reverse: false },
      { text: "I often lose my temper when plans change suddenly.", factor: "team_composure", subfactor: "emotional_composure", reverse: true },
      { text: "I handle disagreements without raising my voice.", factor: "team_composure", subfactor: "emotional_composure", reverse: false },
    ] },
  ] },
  { key: "independence", label: "Independence & Self-Image", blurb: "Self-direction, how much external validation you seek, and image sensitivity.", subfactors: [
    { key: "autonomy", label: "Autonomy", items: [
      { text: "I make important decisions without needing approval from others.", factor: "independence", subfactor: "autonomy", reverse: false },
      { text: "I trust my judgment when the situation is uncertain.", factor: "independence", subfactor: "autonomy", reverse: false },
      { text: "I hesitate to act until someone else confirms my choice.", factor: "independence", subfactor: "autonomy", reverse: true },
      { text: "I take ownership for results, whether good or bad.", factor: "independence", subfactor: "autonomy", reverse: false },
    ] },
    { key: "image_concern", label: "Image Concern", items: [
      { text: "I worry about how others perceive my actions.", factor: "independence", subfactor: "image_concern", reverse: false },
      { text: "Public image matters more to me than my own standards.", factor: "independence", subfactor: "image_concern", reverse: false },
      { text: "I share my ideas even if they are unpopular.", factor: "independence", subfactor: "image_concern", reverse: true },
      { text: "I value authenticity over social approval.", factor: "independence", subfactor: "image_concern", reverse: true },
    ] },
    { key: "support_seeking", label: "Support-Seeking", items: [
      { text: "I prefer having someone to rely on during difficult times.", factor: "independence", subfactor: "support_seeking", reverse: false },
      { text: "I look for protective people who can take care of me.", factor: "independence", subfactor: "support_seeking", reverse: false },
      { text: "I try to solve problems on my own before seeking help.", factor: "independence", subfactor: "support_seeking", reverse: true },
      { text: "I can cope with challenges without much external support.", factor: "independence", subfactor: "support_seeking", reverse: true },
    ] },
  ] },
  { key: "learning", label: "Learning Orientation", blurb: "Openness to change, curiosity and breadth of interests.", subfactors: [
    { key: "openness_to_change", label: "Openness to Change", items: [
      { text: "I like trying activities I have never done before.", factor: "learning", subfactor: "openness_to_change", reverse: false },
      { text: "I adapt quickly when routines or environments change.", factor: "learning", subfactor: "openness_to_change", reverse: false },
      { text: "I prefer to stick to familiar habits.", factor: "learning", subfactor: "openness_to_change", reverse: true },
      { text: "I enjoy exploring new foods, places, or cultures.", factor: "learning", subfactor: "openness_to_change", reverse: false },
    ] },
    { key: "intellectual_curiosity", label: "Intellectual Curiosity", items: [
      { text: "I use careful reasoning to form opinions.", factor: "learning", subfactor: "intellectual_curiosity", reverse: false },
      { text: "I enjoy reading deeply on topics that interest me.", factor: "learning", subfactor: "intellectual_curiosity", reverse: false },
      { text: "I avoid discussions that require careful thinking.", factor: "learning", subfactor: "intellectual_curiosity", reverse: true },
      { text: "I connect ideas across different subjects.", factor: "learning", subfactor: "intellectual_curiosity", reverse: false },
    ] },
    { key: "breadth_of_interests", label: "Breadth of Interests", items: [
      { text: "I actively pursue hobbies across diverse areas.", factor: "learning", subfactor: "breadth_of_interests", reverse: false },
      { text: "I keep myself updated on developments in many fields.", factor: "learning", subfactor: "breadth_of_interests", reverse: false },
      { text: "I rarely attend cultural or social events.", factor: "learning", subfactor: "breadth_of_interests", reverse: true },
      { text: "I like learning outside my main area of study.", factor: "learning", subfactor: "breadth_of_interests", reverse: false },
    ] },
  ] },
  { key: "discipline", label: "System & Discipline", blurb: "Planning, methodical decision-making and orderliness.", subfactors: [
    { key: "planning_clarity", label: "Planning & Clarity", items: [
      { text: "I outline tasks and timelines before I start work.", factor: "discipline", subfactor: "planning_clarity", reverse: false },
      { text: "I ask questions until the goal is fully clear.", factor: "discipline", subfactor: "planning_clarity", reverse: false },
      { text: "I jump in without a plan and figure it out later.", factor: "discipline", subfactor: "planning_clarity", reverse: true },
      { text: "I create checklists for most projects.", factor: "discipline", subfactor: "planning_clarity", reverse: false },
    ] },
    { key: "methodical_decisions", label: "Methodical Decisions", items: [
      { text: "I think through important choices before acting.", factor: "discipline", subfactor: "methodical_decisions", reverse: false },
      { text: "I approach problems in a systematic way.", factor: "discipline", subfactor: "methodical_decisions", reverse: false },
      { text: "I respond impulsively rather than pausing to reflect.", factor: "discipline", subfactor: "methodical_decisions", reverse: true },
      { text: "I review options and consequences before deciding.", factor: "discipline", subfactor: "methodical_decisions", reverse: false },
    ] },
    { key: "orderliness", label: "Orderliness", items: [
      { text: "I prefer my study or workspace to be neat and organized.", factor: "discipline", subfactor: "orderliness", reverse: false },
      { text: "I return things to their place when I’m done with them.", factor: "discipline", subfactor: "orderliness", reverse: false },
      { text: "I can work fine in messy or cluttered spaces.", factor: "discipline", subfactor: "orderliness", reverse: true },
      { text: "I function best when routines and systems are in place.", factor: "discipline", subfactor: "orderliness", reverse: false },
    ] },
  ] },
  { key: "achievement", label: "Achievement Drive", blurb: "Goal focus, persistence and work ethic.", subfactors: [
    { key: "goal_orientation", label: "Goal Orientation", items: [
      { text: "I set ambitious goals and track my progress.", factor: "achievement", subfactor: "goal_orientation", reverse: false },
      { text: "I feel motivated by meaningful results.", factor: "achievement", subfactor: "goal_orientation", reverse: false },
      { text: "I rarely challenge myself beyond minimum requirements.", factor: "achievement", subfactor: "goal_orientation", reverse: true },
      { text: "I like knowing the expected outcomes before I begin.", factor: "achievement", subfactor: "goal_orientation", reverse: false },
    ] },
    { key: "persistence_grit", label: "Persistence (Grit)", items: [
      { text: "I keep working steadily until tasks are completed.", factor: "achievement", subfactor: "persistence_grit", reverse: false },
      { text: "I can maintain focus for long stretches if a task matters.", factor: "achievement", subfactor: "persistence_grit", reverse: false },
      { text: "I tend to quit when a task becomes difficult.", factor: "achievement", subfactor: "persistence_grit", reverse: true },
      { text: "People rely on me for jobs that require patience.", factor: "achievement", subfactor: "persistence_grit", reverse: false },
    ] },
    { key: "seriousness_work_ethic", label: "Seriousness / Work Ethic", items: [
      { text: "I am willing to work while others are relaxing.", factor: "achievement", subfactor: "seriousness_work_ethic", reverse: false },
      { text: "I prioritize long-term gains over short-term fun.", factor: "achievement", subfactor: "seriousness_work_ethic", reverse: false },
      { text: "I only do the bare minimum that is necessary.", factor: "achievement", subfactor: "seriousness_work_ethic", reverse: true },
      { text: "I push myself to exceed expectations.", factor: "achievement", subfactor: "seriousness_work_ethic", reverse: false },
    ] },
  ] },
]

/** All 72 items flattened in administration order (factor -> subfactor -> item). */
export const EXEC_ITEMS: ExecItem[] = EXEC_FACTORS.flatMap((f) => f.subfactors.flatMap((s) => s.items))

export const EXEC_SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

export type ExecBand = "High" | "Moderate" | "Low"
/** Absolute band on the 1-5 mean (stable for a single taker; the workbook's own
 *  bands are sample-relative tertiles, which need a norm sample we don't hold for
 *  a live one-person test). Mirrors the interest inventory's POMP interpretation. */
export function execBand(mean: number): ExecBand {
  if (mean >= 3.6) return "High"
  if (mean >= 2.4) return "Moderate"
  return "Low"
}

export interface ExecSubScore { key: string; label: string; factor: string; mean: number | null; pomp: number | null; band: ExecBand | null }
export interface ExecFacScore {
  key: string; label: string; blurb: string; mean: number | null; pomp: number | null; z: number | null; band: ExecBand | null
  subs: ExecSubScore[]
}
export interface ExecResult { factors: ExecFacScore[]; top: ExecSubScore[] }

/** answers: value 1-5 per EXEC_ITEMS index (null = unanswered). Reverse items are
 *  flipped (6 - v) BEFORE any mean, exactly as the workbook does. */
export function scoreExec(answers: (number | null)[]): ExecResult {
  let idx = 0
  const factors: ExecFacScore[] = EXEC_FACTORS.map((f) => {
    const subs: ExecSubScore[] = f.subfactors.map((s) => {
      const vals: number[] = []
      for (const it of s.items) {
        const a = answers[idx++]
        if (a != null && a >= 1 && a <= 5) vals.push(it.reverse ? 6 - a : a)
      }
      const mean = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null
      return {
        key: s.key, label: s.label, factor: f.key,
        mean, pomp: mean != null ? Math.round(((mean - 1) / 4) * 100) : null,
        band: mean != null ? execBand(mean) : null,
      }
    })
    const sm = subs.map((s) => s.mean).filter((m): m is number => m != null)
    const fmean = sm.length ? sm.reduce((x, y) => x + y, 0) / sm.length : null
    return {
      key: f.key, label: f.label, blurb: f.blurb,
      mean: fmean, pomp: fmean != null ? Math.round(((fmean - 1) / 4) * 100) : null, z: null,
      band: fmean != null ? execBand(fmean) : null, subs,
    }
  })
  // within-person z across the 6 factor means (which factors stand out for THIS person)
  const fm = factors.map((f) => f.mean).filter((m): m is number => m != null)
  const m = fm.length ? fm.reduce((x, y) => x + y, 0) / fm.length : 0
  const sd = fm.length > 1 ? Math.sqrt(fm.reduce((a, b) => a + (b - m) ** 2, 0) / (fm.length - 1)) : 0
  for (const f of factors) if (f.mean != null) f.z = sd > 0 ? Math.round(((f.mean - m) / sd) * 100) / 100 : 0
  // top subfactors overall (strengths)
  const allSubs = factors.flatMap((f) => f.subs).filter((s) => s.mean != null)
  const top = [...allSubs].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0)).slice(0, 5)
  return { factors, top }
}

