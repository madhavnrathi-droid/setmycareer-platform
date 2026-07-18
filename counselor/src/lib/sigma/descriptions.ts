// ─────────────────────────────────────────────────────────────────────────────
// Test report field descriptions — the plain-language meaning of every factor
// and facet, so a reader understands what each score actually says. The facet
// Low/High reads are the SetMyCareer-authored descriptions; the factor reads
// summarise the three facets beneath them. Keyed to the engine's factor/subfactor
// keys (see personality-data.ts) so the report can show the client's own side.
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldRead {
  /** The trait's display name on the report. */
  label: string
  /** What a LOW score means. */
  low: string
  /** What a HIGH score means. */
  high: string
  /** One-line gist of the trait itself. */
  gist?: string
}

/** Six factors → what they measure and what each pole means. */
export const FACTOR_READS: Record<string, FieldRead> = {
  PE: {
    label: "People Energy",
    gist: "How you draw and spend social energy.",
    low: "reserved and self-contained — you recharge in quiet and think best with space.",
    high: "outgoing and energised by people — you take the lead and thrive in company.",
  },
  TE: {
    label: "Team & Composure",
    gist: "How you work alongside others and hold steady under pressure.",
    low: "candid and competitive — you protect your corner and feel things keenly.",
    high: "cooperative and composed — you share credit and stay calm when it's tense.",
  },
  IN: {
    label: "Independence & Self-Image",
    gist: "How self-directed you are, and how much others' views weigh on you.",
    low: "consultative — you value support and care how others see you.",
    high: "self-directed and authentic — you trust your own judgment and speak freely.",
  },
  LE: {
    label: "Learning Orientation",
    gist: "How you meet ideas, novelty and change.",
    low: "practical and grounded — you favour the proven over the untested.",
    high: "curious and open — you seek out new ideas and learn widely.",
  },
  SY: {
    label: "System & Discipline",
    gist: "How you plan, structure and follow through.",
    low: "flexible and spontaneous — you improvise and adapt as you go.",
    high: "organised and methodical — you plan, structure and finish what you start.",
  },
  AC: {
    label: "Achievement Drive",
    gist: "How you set goals and push toward them.",
    low: "easygoing — you keep an even pace and stay relaxed about targets.",
    high: "driven and persistent — you set high goals and push to exceed them.",
  },
}

/** Eighteen facets → the Low/High reads (SetMyCareer descriptions), keyed by the
 *  engine's subfactor key. */
export const FACET_READS: Record<string, FieldRead> = {
  // People Energy
  sociability: { label: "Social", low: "keeps to self, recharges alone", high: "actively socialises, energised by groups" },
  assertive_leadership: { label: "Assertive", low: "collaborative, values harmony", high: "takes control, guides others" },
  expressiveness: { label: "Exhibitive", low: "prefers the background", high: "enjoys the spotlight" },
  // Team & Composure
  cooperation: { label: "Generous", low: "protects own recognition", high: "shares credit, team-first" },
  tolerance_to_criticism: { label: "Tolerant", low: "defensive about criticism", high: "open to criticism, seeks to improve" },
  emotional_composure: { label: "Cool", low: "reactive when emotions run high", high: "stays calm under pressure" },
  // Independence & Self-Image
  autonomy: { label: "Self-reliant", low: "seeks support, values compassion", high: "stands on own feet, logic over feelings" },
  image_concern: { label: "Self-assured", low: "conforms, seeks prestige", high: "expresses ideas freely, authentic" },
  support_seeking: { label: "Participative", low: "learns independently", high: "learns collaboratively" },
  // Learning Orientation
  openness_to_change: { label: "Change-driven", low: "prefers the familiar", high: "embraces novelty & new experiences" },
  intellectual_curiosity: { label: "Intellectual", low: "practical, concrete tasks", high: "curious, enjoys ideas & analysis" },
  breadth_of_interests: { label: "Wide-ranging", low: "deep in a few areas", high: "broad curiosity across many fields" },
  // System & Discipline
  planning_clarity: { label: "Planning", low: "spontaneous, flows with the moment", high: "systematic, detailed plans" },
  methodical_decisions: { label: "Decision Making", low: "quick, impulsive", high: "thoughtful, structured" },
  orderliness: { label: "Organizing", low: "relaxed about order", high: "neat, a place for everything" },
  // Achievement Drive
  goal_orientation: { label: "Result-driven", low: "prefers simpler tasks", high: "sets high goals, competitive" },
  persistence_grit: { label: "Persistent", low: "eases off when hard", high: "pushes through difficulty" },
  seriousness_work_ethic: { label: "Serious", low: "light, relaxed", high: "earnest, focused" },
}

/** The reader's own side of a facet/factor, given their band. */
export function readFor(read: FieldRead | undefined, band: "Low" | "Average" | "High"): string {
  if (!read) return ""
  if (band === "High") return read.high
  if (band === "Low") return read.low
  // Average → a balanced phrasing drawing on both poles
  return `balanced — between “${read.low}” and “${read.high}”`
}
