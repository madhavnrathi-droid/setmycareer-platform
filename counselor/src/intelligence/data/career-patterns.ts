// =============================================================================
// SetMyCareer — Mined Recommendation Patterns (grounding module)
// =============================================================================
// A self-contained, pure-data knowledge module synthesizing the patterns mined
// from SetMyCareer's recommendation spreadsheets and live counselling notes.
// Intended to ground the report generator and the AI chatbot/voicebot so their
// suggestions echo what SetMyCareer's own engine and counsellors actually do.
//
// SOURCE SPREADSHEETS & DATA (all figures below are MINED AGGREGATES, indicative
// not exhaustive — see CAREER_PATTERNS_CAVEATS):
//   • Copy of Career Codes for Automation.xlsx
//       - Sheet1: 610 job-role rows (abilities, personality, job groups)
//       - Sheet6: 30 Job-Group × 7-Stream affinity matrix (scored 1–10)
//       - Sheet3: "Automated Career Recommendations" report template
//   • Stream_to_Degree_Mapping_India_Corrected.xlsx — 313 programs, 205 degrees
//   • India_Bachelors_Degrees_Citywise_Seed.xlsx — 45 named institutions
//   • Bachelor's Degrees — Arts / Science / Commerce workbooks (degree detail)
//   • non_conventional_degree_courses_india.xlsx — 117 any-stream-leaning courses
//   • Bachelor's Career Roles — Arts/Commerce/PCM-PCB-PCMB workbooks
//       - 225 degree→role→salary→demand records (deduped)
//   • Personality calibration set — 243 respondents × 18 subfactors (JCE-inspired)
//   • Counselling notes — 10 demo SOAP notes (mock.ts) + 49 live comments / 22 clients
//
// DESIGN: no imports of app code, no side effects. Constants are `as const` so
// downstream code gets precise literal types; companion `type` aliases are
// exported for convenience. Safe to import from the knowledge/LLM layer.
// =============================================================================

/** The seven academic streams SetMyCareer maps recommendations against. */
export const STREAMS = [
  "Science PCM",
  "Science PCB",
  "Science PCMB",
  "Commerce with Maths",
  "Commerce without Maths",
  "Arts",
  "Arts with Maths",
] as const

export type Stream = (typeof STREAMS)[number]

// -----------------------------------------------------------------------------
// 1. RECURRING BY STREAM
//    Per stream: the strongest-fit job groups (Sheet6 affinity ≥7), the
//    canonical recommended degrees (degree-universe mining), the dominant
//    abilities required, the eligible-program breadth, and how many roles fall
//    into that stream's strong-fit groups. This is the spine of any per-stream
//    recommendation.
// -----------------------------------------------------------------------------

export interface StreamPattern {
  /** Job groups with affinity ≥7 for this stream, strongest first (score /10). */
  readonly strongFitJobGroups: ReadonlyArray<{ readonly group: string; readonly affinity: number }>
  /** Canonical recommended degrees students in this stream are routed toward. */
  readonly canonicalDegrees: readonly string[]
  /** Dominant abilities the matched roles require (most frequent first). */
  readonly dominantAbilities: readonly string[]
  /** Recurring personality signals associated with the stream's roles. */
  readonly personalitySignals: readonly string[]
  /** How many of the 313 mapped programs this stream can enter. */
  readonly eligibleProgramCount: number
  /** Roles (of 610) sitting in this stream's strong-fit job groups. */
  readonly rolesInStrongFitGroups: number
  /** One-line on-brand framing for the chatbot/report. */
  readonly framing: string
}

export const RECURRING_BY_STREAM: Readonly<Record<Stream, StreamPattern>> = {
  "Science PCM": {
    strongFitJobGroups: [
      { group: "Engineering & Technical Support", affinity: 10 },
      { group: "Machining & Mechanical Trades", affinity: 10 },
      { group: "Construction", affinity: 10 },
      { group: "Mathematics", affinity: 10 },
      { group: "Information Technology & Computers", affinity: 10 },
      { group: "Protective Services & Public Safety", affinity: 10 },
      { group: "Physical Science & Research", affinity: 10 },
      { group: "Commercial Art & Design", affinity: 8 },
      { group: "Financial & Business Services", affinity: 7 },
      { group: "Health Services", affinity: 7 },
      { group: "Nature, Agriculture & Environment", affinity: 7 },
    ],
    canonicalDegrees: ["B.Tech", "B.Sc", "B.Des", "BBA", "B.Com", "B.Voc"],
    dominantAbilities: ["Numerical", "Reasoning", "Verbal", "Closure"],
    personalitySignals: ["Extroverted", "Independence", "Industriousness", "Openness to Experience", "Methodicalness"],
    eligibleProgramCount: 223,
    rolesInStrongFitGroups: 232,
    framing:
      "The engineering/tech spine — clean 10/10 affinity across Engineering, IT, Maths, Physical Science. Numerical + Reasoning are the entry tickets; B.Tech and B.Sc are the backbone degrees.",
  },
  "Science PCB": {
    strongFitJobGroups: [
      { group: "Health Services", affinity: 10 },
      { group: "Nature, Agriculture & Environment", affinity: 10 },
      { group: "Life Science & Research", affinity: 10 },
      { group: "Physical Health & Recreation", affinity: 10 },
      { group: "Medical Diagnosis & Treatment", affinity: 10 },
      { group: "Service & Hospitality", affinity: 8 },
      { group: "Social Service & Mental Health", affinity: 8 },
      { group: "Career & Guidance Counseling", affinity: 7 },
      { group: "Protective Services & Public Safety", affinity: 7 },
    ],
    canonicalDegrees: ["B.Sc", "MBBS", "BDS", "BAMS", "BHMS", "BPT", "B.Sc Nursing", "Bachelor of Optometry", "B.Des", "BBA"],
    dominantAbilities: ["Closure", "Numerical", "Reasoning", "Spatial"],
    personalitySignals: [],
    eligibleProgramCount: 194,
    rolesInStrongFitGroups: 147,
    framing:
      "The health & life-science track. NEET-UG gates the medical/AYUSH block; PCB cannot enter core engineering. Closure (accuracy/attention) joins the Numerical+Reasoning core.",
  },
  "Science PCMB": {
    strongFitJobGroups: [
      { group: "Nature, Agriculture & Environment", affinity: 9 },
      { group: "Physical Science & Research", affinity: 9 },
      { group: "Engineering & Technical Support", affinity: 8 },
      { group: "Construction", affinity: 8 },
      { group: "Mathematics", affinity: 8 },
      { group: "Information Technology & Computers", affinity: 8 },
      { group: "Protective Services & Public Safety", affinity: 8 },
      { group: "Health Services", affinity: 8 },
      { group: "Physical Health & Recreation", affinity: 8 },
      { group: "Medical Diagnosis & Treatment", affinity: 8 },
      { group: "Social Service & Mental Health", affinity: 7 },
      { group: "Machining & Mechanical Trades", affinity: 7 },
    ],
    canonicalDegrees: ["B.Tech", "B.Sc", "MBBS", "BDS", "BAMS", "B.Des", "BBA", "B.Com", "B.Voc"],
    dominantAbilities: ["Numerical", "Reasoning", "Closure", "Verbal"],
    personalitySignals: ["Extroverted", "Independence", "Industriousness", "Openness to Experience", "Methodicalness"],
    eligibleProgramCount: 247,
    rolesInStrongFitGroups: 246,
    framing:
      "The master key — widest eligibility (247/313 programs). Spans both the PCM engineering apex and the PCB medical apex; keep both doors explicitly open until the student narrows.",
  },
  "Commerce with Maths": {
    strongFitJobGroups: [
      { group: "Financial & Business Services", affinity: 10 },
      { group: "Merchandising & Marketing", affinity: 8 },
      { group: "Clerical & Administrative Support", affinity: 8 },
      { group: "Sales & Business Development", affinity: 8 },
      { group: "Management & Administration", affinity: 7 },
      { group: "Law & Government", affinity: 7 },
    ],
    canonicalDegrees: ["B.Com", "BBA", "B.Sc", "Integrated Programme in Management", "B.Des", "BFA"],
    dominantAbilities: ["Reasoning", "Numerical", "Verbal", "Closure", "Spatial"],
    personalitySignals: ["Extroverted", "Independence", "Openness to Experience", "Industriousness"],
    eligibleProgramCount: 145,
    rolesInStrongFitGroups: 115,
    framing:
      "Best-ROI stream. Maths unlocks quantitative finance (Quant, IB, CA, Actuary). Densest degree data in the corpus (BBA/B.Com + MBA Finance/Supply-Chain). Financial & Business Services is the 10/10 anchor.",
  },
  "Commerce without Maths": {
    strongFitJobGroups: [
      { group: "Merchandising & Marketing", affinity: 10 },
      { group: "Clerical & Administrative Support", affinity: 10 },
      { group: "Sales & Business Development", affinity: 10 },
      { group: "Human Resources", affinity: 10 },
      { group: "Management & Administration", affinity: 10 },
      { group: "Financial & Business Services", affinity: 9 },
      { group: "Service & Hospitality", affinity: 8 },
      { group: "Law & Government", affinity: 8 },
      { group: "Communications & Writing", affinity: 7 },
    ],
    canonicalDegrees: ["B.Com", "BBA", "B.Des", "BFA", "Integrated Programme in Management", "B.Voc"],
    dominantAbilities: ["Reasoning", "Numerical", "Verbal", "Closure", "Spatial"],
    personalitySignals: ["Extroverted", "Independence", "Openness to Experience", "Industriousness"],
    eligibleProgramCount: 142,
    rolesInStrongFitGroups: 151,
    framing:
      "Marketing / HR / operations leadership. Five job groups at a perfect 10/10. Without Maths the quant-finance ceiling is capped (~₹25 LPA) — lean on the any-stream non-conventional catalog to widen options.",
  },
  Arts: {
    strongFitJobGroups: [
      { group: "Human Resources", affinity: 10 },
      { group: "Career & Guidance Counseling", affinity: 10 },
      { group: "Law & Government", affinity: 10 },
      { group: "Social Service & Mental Health", affinity: 10 },
      { group: "Social Science & Research", affinity: 10 },
      { group: "Primary Education", affinity: 10 },
      { group: "Communications & Writing", affinity: 10 },
      { group: "Fine Art", affinity: 10 },
      { group: "Entertainment", affinity: 10 },
      { group: "Management & Administration", affinity: 8 },
      { group: "Service & Hospitality", affinity: 8 },
      { group: "Music", affinity: 8 },
    ],
    canonicalDegrees: ["BA family", "B.Sc (soft)", "B.Des", "BFA", "BBA", "B.Com", "BSW"],
    dominantAbilities: ["Reasoning", "Numerical", "Closure", "Verbal", "Spatial"],
    personalitySignals: ["Extroverted", "Independence", "Industriousness"],
    eligibleProgramCount: 148,
    rolesInStrongFitGroups: 179,
    framing:
      "Broadest people/society pool — nine job groups at 10/10 (HR, Law, Social Science, Counseling, Writing, Fine Art, Entertainment). Home of civil-services, judiciary, journalism and social-research paths. CUET-UG is the dominant gateway.",
  },
  "Arts with Maths": {
    strongFitJobGroups: [
      { group: "Social Science & Research", affinity: 9 },
      { group: "Primary Education", affinity: 9 },
      { group: "Communications & Writing", affinity: 9 },
      { group: "Music", affinity: 9 },
      { group: "Clerical & Administrative Support", affinity: 8 },
      { group: "Human Resources", affinity: 8 },
      { group: "Law & Government", affinity: 8 },
      { group: "Social Service & Mental Health", affinity: 8 },
      { group: "Fine Art", affinity: 8 },
      { group: "Entertainment", affinity: 8 },
      { group: "Sales & Business Development", affinity: 7 },
      { group: "Management & Administration", affinity: 7 },
    ],
    canonicalDegrees: ["BA family", "BA Mathematics (Hons)", "B.Sc", "B.Des", "BFA", "BBA", "B.Com"],
    dominantAbilities: ["Reasoning", "Numerical", "Verbal", "Closure", "Spatial"],
    personalitySignals: ["Extroverted", "Independence", "Industriousness", "Openness to Experience"],
    eligibleProgramCount: 152,
    rolesInStrongFitGroups: 189,
    framing:
      "Arts with a quantitative edge. Maths is the single biggest lever — it adds analytics & quant-social-science crossovers (BA Maths → Quant/Data Scientist) and lifts the salary ceiling from ~₹25 LPA toward ₹45 LPA.",
  },
} as const

// -----------------------------------------------------------------------------
// 2. JOB-GROUP × STREAM AFFINITY MATRIX (Sheet6, scored 1–10)
//    The real stream→role linkage engine. ≥7 = strong fit; 10 = signature fit.
//    Use to rank job groups for a stream, or sanity-check a role suggestion.
// -----------------------------------------------------------------------------

export const JOB_GROUP_STREAM_AFFINITY = {
  "Financial & Business Services": { "Science PCM": 7, "Science PCB": 3, "Science PCMB": 5, "Commerce with Maths": 10, "Commerce without Maths": 9, Arts: 3, "Arts with Maths": 6 },
  "Merchandising & Marketing": { "Science PCM": 4, "Science PCB": 3, "Science PCMB": 3, "Commerce with Maths": 8, "Commerce without Maths": 10, Arts: 7, "Arts with Maths": 5 },
  "Clerical & Administrative Support": { "Science PCM": 1, "Science PCB": 2, "Science PCMB": 2, "Commerce with Maths": 8, "Commerce without Maths": 10, Arts: 7, "Arts with Maths": 8 },
  "Sales & Business Development": { "Science PCM": 5, "Science PCB": 4, "Science PCMB": 4, "Commerce with Maths": 8, "Commerce without Maths": 10, Arts: 5, "Arts with Maths": 7 },
  "Human Resources": { "Science PCM": 2, "Science PCB": 3, "Science PCMB": 3, "Commerce with Maths": 6, "Commerce without Maths": 10, Arts: 10, "Arts with Maths": 8 },
  "Management & Administration": { "Science PCM": 3, "Science PCB": 3, "Science PCMB": 3, "Commerce with Maths": 7, "Commerce without Maths": 10, Arts: 8, "Arts with Maths": 7 },
  "Service & Hospitality": { "Science PCM": 5, "Science PCB": 8, "Science PCMB": 5, "Commerce with Maths": 6, "Commerce without Maths": 8, Arts: 8, "Arts with Maths": 6 },
  "Career & Guidance Counseling": { "Science PCM": 4, "Science PCB": 7, "Science PCMB": 6, "Commerce with Maths": 5, "Commerce without Maths": 6, Arts: 10, "Arts with Maths": 7 },
  "Law & Government": { "Science PCM": 4, "Science PCB": 4, "Science PCMB": 4, "Commerce with Maths": 7, "Commerce without Maths": 8, Arts: 10, "Arts with Maths": 8 },
  "Teaching & Instruction": { "Science PCM": 5, "Science PCB": 5, "Science PCMB": 5, "Commerce with Maths": 5, "Commerce without Maths": 5, Arts: 5, "Arts with Maths": 5 },
  "Social Service & Mental Health": { "Science PCM": 4, "Science PCB": 8, "Science PCMB": 7, "Commerce with Maths": 5, "Commerce without Maths": 6, Arts: 10, "Arts with Maths": 8 },
  "Engineering & Technical Support": { "Science PCM": 10, "Science PCB": 6, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 2, Arts: 3, "Arts with Maths": 2 },
  "Social Science & Research": { "Science PCM": 4, "Science PCB": 5, "Science PCMB": 5, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 10, "Arts with Maths": 9 },
  "Primary Education": { "Science PCM": 4, "Science PCB": 4, "Science PCMB": 4, "Commerce with Maths": 4, "Commerce without Maths": 4, Arts: 10, "Arts with Maths": 9 },
  "Machining & Mechanical Trades": { "Science PCM": 10, "Science PCB": 5, "Science PCMB": 7, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 2, "Arts with Maths": 3 },
  Construction: { "Science PCM": 10, "Science PCB": 3, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 2, "Arts with Maths": 3 },
  Mathematics: { "Science PCM": 10, "Science PCB": 3, "Science PCMB": 8, "Commerce with Maths": 5, "Commerce without Maths": 4, Arts: 2, "Arts with Maths": 3 },
  "Information Technology & Computers": { "Science PCM": 10, "Science PCB": 3, "Science PCMB": 8, "Commerce with Maths": 5, "Commerce without Maths": 3, Arts: 1, "Arts with Maths": 2 },
  "Protective Services & Public Safety": { "Science PCM": 10, "Science PCB": 7, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 3, "Arts with Maths": 4 },
  "Health Services": { "Science PCM": 7, "Science PCB": 10, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 5, "Arts with Maths": 4 },
  "Communications & Writing": { "Science PCM": 4, "Science PCB": 4, "Science PCMB": 4, "Commerce with Maths": 6, "Commerce without Maths": 7, Arts: 10, "Arts with Maths": 9 },
  Music: { "Science PCM": 5, "Science PCB": 4, "Science PCMB": 5, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 8, "Arts with Maths": 9 },
  "Nature, Agriculture & Environment": { "Science PCM": 7, "Science PCB": 10, "Science PCMB": 9, "Commerce with Maths": 5, "Commerce without Maths": 4, Arts: 5, "Arts with Maths": 4 },
  "Physical Science & Research": { "Science PCM": 10, "Science PCB": 6, "Science PCMB": 9, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 1, "Arts with Maths": 2 },
  "Commercial Art & Design": { "Science PCM": 8, "Science PCB": 6, "Science PCMB": 7, "Commerce with Maths": 5, "Commerce without Maths": 4, Arts: 8, "Arts with Maths": 7 },
  "Life Science & Research": { "Science PCM": 5, "Science PCB": 10, "Science PCMB": 7, "Commerce with Maths": 4, "Commerce without Maths": 3, Arts: 6, "Arts with Maths": 5 },
  "Fine Art": { "Science PCM": 1, "Science PCB": 4, "Science PCMB": 3, "Commerce with Maths": 5, "Commerce without Maths": 6, Arts: 10, "Arts with Maths": 8 },
  "Physical Health & Recreation": { "Science PCM": 5, "Science PCB": 10, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 5, Arts: 4, "Arts with Maths": 3 },
  "Medical Diagnosis & Treatment": { "Science PCM": 6, "Science PCB": 10, "Science PCMB": 8, "Commerce with Maths": 4, "Commerce without Maths": 5, Arts: 5, "Arts with Maths": 4 },
  Entertainment: { "Science PCM": 4, "Science PCB": 5, "Science PCMB": 6, "Commerce with Maths": 6, "Commerce without Maths": 5, Arts: 10, "Arts with Maths": 8 },
} as const

export type JobGroup = keyof typeof JOB_GROUP_STREAM_AFFINITY

/** Job groups ranked by how many of the 610 roles fall in them (most first). */
export const TOP_JOB_GROUPS_BY_ROLE_COUNT = [
  { group: "Engineering & Technical Support", roles: 76 },
  { group: "Teaching & Instruction", roles: 75 },
  { group: "Human Resources", roles: 67 },
  { group: "Management & Administration", roles: 66 },
  { group: "Information Technology & Computers", roles: 54 },
  { group: "Health Services", roles: 54 },
  { group: "Nature, Agriculture & Environment", roles: 53 },
  { group: "Physical Science & Research", roles: 52 },
  { group: "Life Science & Research", roles: 51 },
  { group: "Social Science & Research", roles: 49 },
  { group: "Merchandizing & Marketing", roles: 47 },
  { group: "Social Service & Mental Health", roles: 44 },
] as const

/** The ability triad that recurs across nearly every role (global frequency). */
export const RECURRING_ABILITY_TRIAD = ["Reasoning", "Numerical", "Verbal"] as const
/** Secondary abilities that distinguish specialised roles. */
export const SECONDARY_ABILITIES = ["Closure", "Spatial"] as const

// -----------------------------------------------------------------------------
// 3. PROFILE ARCHETYPES (243-respondent calibration; JCE-inspired similarity)
//    Six factor-led personas + the Achievement "bridge". Archetypes exist at the
//    factor / factor-pair level (literal trios are almost all unique).
// -----------------------------------------------------------------------------

export interface ProfileArchetype {
  readonly name: string
  /** Dominant personality factor that leads this archetype. */
  readonly leadFactor: string
  /** Share of respondents whose dominant factor is this one. */
  readonly dominantSharePct: number
  /** Signature top-3 subfactors. */
  readonly signatureSubfactors: readonly string[]
  /** JCE WorkStyle scales bridging personality → interest space. */
  readonly workStyleBridge: readonly string[]
  /** Education groups this archetype typically maps to. */
  readonly mapsToEducation: readonly string[]
  /** Job groups this archetype typically maps to. */
  readonly mapsToJobGroups: readonly string[]
  readonly note: string
}

export const PROFILE_ARCHETYPES: readonly ProfileArchetype[] = [
  {
    name: "The Anchor",
    leadFactor: "Team & Composure",
    dominantSharePct: 19.8,
    signatureSubfactors: ["Tolerance to Criticism", "Cooperation", "Emotional Composure"],
    workStyleBridge: ["Accountability", "Interpersonal Confidence"],
    mapsToEducation: ["Social Service", "Education", "Health Services & Science", "Behavioral Science"],
    mapsToJobGroups: ["Human Resources", "Social Service & Mental Health", "Health Services", "Career & Guidance Counseling", "Teaching & Instruction"],
    note: "Largest single dominant-factor group. Composure + cooperation route toward people / service / care roles.",
  },
  {
    name: "The Individualist",
    leadFactor: "Independence & Self-Image",
    dominantSharePct: 19.3,
    signatureSubfactors: ["Support-Seeking", "Image Concern", "Autonomy"],
    workStyleBridge: ["Independence", "Interpersonal Confidence", "Job Security"],
    mapsToEducation: ["Art & Architecture", "Communication Arts", "Business", "Social Science, Law & Politics"],
    mapsToJobGroups: ["Sales & Business Development", "Entertainment", "Commercial Art & Design", "Law & Government", "Merchandising & Marketing"],
    note: "Autonomy + image drive entrepreneurial, creative, sales, performance and self-directed paths.",
  },
  {
    name: "The Organizer",
    leadFactor: "System & Discipline",
    dominantSharePct: 17.3,
    signatureSubfactors: ["Methodical Decisions", "Planning & Clarity", "Orderliness"],
    workStyleBridge: ["Organization", "Accountability", "Job Security"],
    mapsToEducation: ["Business", "Mathematical Science", "Computer Science", "Health Services & Science"],
    mapsToJobGroups: ["Clerical & Administrative Support", "Financial & Business Services", "Information Technology & Computers", "Mathematics"],
    note: "Planning + order + method route toward finance, admin, IT and structured analytical work.",
  },
  {
    name: "The Driver",
    leadFactor: "Achievement Drive",
    dominantSharePct: 14.8,
    signatureSubfactors: ["Persistence (Grit)", "Goal Orientation", "Seriousness / Work Ethic"],
    workStyleBridge: ["Academic Achievement", "Endurance", "Accountability"],
    mapsToEducation: ["Science", "Engineering", "Mathematical Science", "Business", "Computer Science"],
    mapsToJobGroups: ["Management & Administration", "Engineering & Technical Support", "Financial & Business Services", "Mathematics"],
    note: "Achievement is the universal connector — it co-occurs with every other factor and overlays onto every archetype rather than standing alone.",
  },
  {
    name: "The Explorer",
    leadFactor: "Learning Orientation",
    dominantSharePct: 14.4,
    signatureSubfactors: ["Openness to Change", "Intellectual Curiosity", "Breadth of Interests"],
    workStyleBridge: ["Academic Achievement", "Independence"],
    mapsToEducation: ["Science", "Engineering", "Behavioral Science", "Communication Arts", "Computer Science"],
    mapsToJobGroups: ["Social Science & Research", "Life Science & Research", "Physical Science & Research", "Information Technology & Computers", "Communications & Writing"],
    note: "Curiosity + openness route toward research, analysis and writing across the science and social-science spectrum.",
  },
  {
    name: "The Connector",
    leadFactor: "People Energy",
    dominantSharePct: 14.4,
    signatureSubfactors: ["Expressiveness", "Sociability", "Assertive Leadership"],
    workStyleBridge: ["Interpersonal Confidence", "Independence"],
    mapsToEducation: ["Performing Arts", "Communication Arts", "Business", "Social Service"],
    mapsToJobGroups: ["Sales & Business Development", "Entertainment", "Music", "Management & Administration", "Merchandising & Marketing"],
    note: "Expressiveness + sociability route toward sales, performance, communication and front-of-house leadership.",
  },
] as const

/** Achievement-anchored factor pairs that recur most across the 243 profiles. */
export const RECURRING_BRIDGE_PERSONAS = [
  { persona: "Achievement Drive × Team & Composure", coOccurrencePct: 21.4 },
  { persona: "Achievement Drive × People Energy", coOccurrencePct: 20.2 },
  { persona: "Achievement Drive × Independence & Self-Image", coOccurrencePct: 18.5 },
  { persona: "Learning Orientation × Team & Composure", coOccurrencePct: 18.1 },
  { persona: "Achievement Drive × Learning Orientation", coOccurrencePct: 17.7 },
] as const

/** Under-represented signals — flag these as genuinely distinctive when seen. */
export const RARE_PROFILE_SIGNALS = [
  "Assertive Leadership as the single strongest trait (only 2.5% of respondents)",
  "Orderliness as the single strongest trait (only 3.3%); rarest in any top-3 (10.3%)",
  "Single-factor specialists — all top-3 from one factor (only 0.8%, 2 of 243)",
] as const

// -----------------------------------------------------------------------------
// 4. HIGH-VALUE PATHS — standout high-salary / high-demand routes (LPA = ₹/yr).
//    The recurring takeaway: the top ceilings cluster in (a) maths-based finance
//    and (b) CS/cloud/data — adding Maths to Arts/Commerce is the biggest lever.
// -----------------------------------------------------------------------------

export interface HighValuePath {
  readonly role: string
  readonly degree: string
  readonly stream: string
  readonly lowLpa: number
  readonly highLpa: number
  readonly demand: "Very High" | "High" | "Moderate"
  readonly note: string
}

export const HIGH_VALUE_PATHS: readonly HighValuePath[] = [
  { role: "Quantitative Analyst (Quant)", degree: "BBA (Quantitative Finance)", stream: "Commerce with Maths", lowLpa: 6, highLpa: 50, demand: "Very High", note: "Highest ceiling in the corpus; specialised quant-finance role." },
  { role: "Cloud Solutions Architect", degree: "B.Tech Computer Science & Engineering", stream: "Science PCM", lowLpa: 9.1, highLpa: 47, demand: "Very High", note: "Emerging CS role; highest entry floor of the top paths." },
  { role: "Quantitative Analyst", degree: "BA Mathematics (Honours)", stream: "Arts with Maths", lowLpa: 6, highLpa: 45, demand: "Very High", note: "Maths lifts an Arts degree to near-science ceilings." },
  { role: "Investment Banker", degree: "B.Com Honours", stream: "Commerce with Maths", lowLpa: 6, highLpa: 40, demand: "Very High", note: "M&A-driven; bonus-heavy." },
  { role: "Specialist Doctor (Surgery/Medicine/Pediatrics)", degree: "MBBS", stream: "Science PCB", lowLpa: 6, highLpa: 35, demand: "Very High", note: "The lone PCB entry at the top; long but high-ceiling path." },
  { role: "Chartered Accountant (CA)", degree: "B.Com Honours", stream: "Commerce with Maths", lowLpa: 3, highLpa: 35, demand: "Very High", note: "Regulatory-growth demand; wide salary spread." },
  { role: "MBA Graduate Roles", degree: "B.Com + MBA", stream: "PCMB / Commerce-hybrid", lowLpa: 6, highLpa: 30, demand: "Very High", note: "MBA premium; the Commerce-hybrid blend." },
  { role: "Data Scientist", degree: "B.Tech Computer Science & Engineering", stream: "Science PCM", lowLpa: 4, highLpa: 29, demand: "Very High", note: "Exponential-growth demand; the CS/data engine." },
  { role: "Actuary", degree: "B.Com Honours", stream: "Commerce with Maths", lowLpa: 5, highLpa: 25, demand: "Very High", note: "Niche, exam-gated, high-value quant path." },
  { role: "Civil Service Officer (IAS/IPS/IFS)", degree: "Bachelor's (any stream) + UPSC", stream: "Arts / any", lowLpa: 5.6, highLpa: 25, demand: "Moderate", note: "Highest-pay non-quant route; reachable from many Arts degrees." },
] as const

/** Twin engines of 'Very High' demand across the dataset. */
export const DEMAND_ENGINES = [
  "Tech (Software Developer / Full Stack / Cloud Architect / Data Scientist) — via PCM CS",
  "Regulated finance (CA / Financial Analyst / Investment Banker / Actuary) — via Commerce+Maths or BA Maths",
] as const

/** Safe, portable roles many degrees route into (degree_count from mining). */
export const TRANSFERABLE_ROLES = [
  { role: "Financial Analyst", degreeCount: 5 },
  { role: "Software Developer", degreeCount: 5 },
  { role: "Business Analyst", degreeCount: 4 },
  { role: "Chartered Accountant", degreeCount: 3 },
  { role: "Actuary", degreeCount: 3 },
  { role: "Tax Consultant", degreeCount: 3 },
  { role: "Civil Service Officer", degreeCount: 3 },
] as const

/** Overall demand mix across the 225 degree→role records (no 'Low' appears). */
export const DEMAND_DISTRIBUTION = { "Very High": 77, High: 120, Moderate: 28 } as const

/** Per-stream salary ceilings (₹ LPA) and demand skew from the role corpus. */
export const STREAM_OUTCOME_SUMMARY = [
  { stream: "Commerce (with Maths)", maxHighLpa: 50, medianHighLpa: 18, note: "Richest median; all roles High/Very-High. Best ROI." },
  { stream: "Arts (with Maths)", maxHighLpa: 45, medianHighLpa: 14, note: "Maths pulls it near the science streams." },
  { stream: "PCM (Science)", maxHighLpa: 47, medianHighLpa: 11.5, note: "Broadest (18 degrees); CS-driven top end." },
  { stream: "PCMB / Commerce-hybrid", maxHighLpa: 30, medianHighLpa: 16, note: "Mostly Very-High (fintech / MBA blends)." },
  { stream: "PCB (Science)", maxHighLpa: 35, medianHighLpa: 10, note: "Deep (17 degrees) but lower median outside MBBS." },
  { stream: "Commerce (without Maths)", maxHighLpa: 25, medianHighLpa: 14, note: "Capped without Maths." },
  { stream: "Arts (without Maths)", maxHighLpa: 25, medianHighLpa: 12, note: "Softest segment; most 'Moderate' demand." },
] as const

// -----------------------------------------------------------------------------
// 5. COLLEGE UNIVERSE — canonical degrees → entrance exams → notable institutions.
//    CUET-UG is the great equalizer; specialised exams gate only their niche.
// -----------------------------------------------------------------------------

/** Most-recommended degrees overall (the canonical backbone, by frequency). */
export const CANONICAL_DEGREES = [
  { degree: "B.Tech", count: 36 },
  { degree: "B.Sc", count: 25 },
  { degree: "B.Des", count: 14 },
  { degree: "BBA", count: 11 },
  { degree: "B.Com", count: 10 },
  { degree: "B.Voc", count: 5 },
] as const

export interface CollegeUniverseEntry {
  readonly degree: string
  /** Streams that can typically enter this degree. */
  readonly streams: readonly string[]
  /** Primary entrance / selection gateways. */
  readonly entranceExams: readonly string[]
  /** Representative specializations or sub-tracks. */
  readonly specializations: readonly string[]
  /** Notable institutions (national exemplars). */
  readonly notableInstitutions: readonly string[]
  readonly typicalDurationYears: string
}

export const COLLEGE_UNIVERSE: readonly CollegeUniverseEntry[] = [
  {
    degree: "B.Tech",
    streams: ["Science PCM", "Science PCMB"],
    entranceExams: ["JEE Main", "JEE Advanced (IITs)", "State CET", "BITSAT", "VITEEE", "CUET"],
    specializations: ["Computer Science & Engineering", "AI & Data Science", "Cyber Security", "Electronics & Communication", "Mechanical", "Civil", "Aerospace", "Robotics", "Biotechnology"],
    notableInstitutions: ["IIT Delhi", "IIT Bombay", "IIT Madras", "IIT Hyderabad", "IIIT Hyderabad", "RV College of Engineering"],
    typicalDurationYears: "4",
  },
  {
    degree: "B.Sc",
    streams: ["Science PCM", "Science PCB", "Science PCMB"],
    entranceExams: ["CUET-UG", "University / Merit", "State CET", "Institute exams"],
    specializations: ["Physics", "Mathematics", "Statistics", "Computer Science", "Data Science", "Biotechnology", "Forensic Science", "Actuarial Science", "Nautical Science", "Agriculture"],
    notableInstitutions: ["IISc Bengaluru", "ISI Kolkata", "IISER Mohali", "University of Delhi", "University of Hyderabad"],
    typicalDurationYears: "3 (4 in NEP / Research track)",
  },
  {
    degree: "MBBS",
    streams: ["Science PCB", "Science PCMB"],
    entranceExams: ["NEET-UG"],
    specializations: ["General Medicine", "Surgery", "Pediatrics", "(then MD/MS specialisation)"],
    notableInstitutions: ["AIIMS New Delhi", "government medical colleges (via MCC/state counselling)"],
    typicalDurationYears: "5.5 (incl. internship)",
  },
  {
    degree: "B.Com",
    streams: ["Commerce with Maths", "Commerce without Maths", "Arts with Maths"],
    entranceExams: ["CUET-UG", "DU JAT", "University / Merit"],
    specializations: ["Honours", "Accounting & Finance", "+ CA / CMA / ACCA professional track"],
    notableInstitutions: ["University of Delhi (SRCC etc.)", "Christ (Deemed) Bengaluru", "St. Xavier's Mumbai"],
    typicalDurationYears: "3",
  },
  {
    degree: "BBA",
    streams: ["Commerce with Maths", "Commerce without Maths", "Arts", "Arts with Maths"],
    entranceExams: ["CUET-UG", "NPAT", "SET", "IPMAT (integrated)", "University / Merit"],
    specializations: ["Finance", "Marketing", "Quantitative Finance", "Aviation / Airport Management", "Digital Marketing"],
    notableInstitutions: ["NMIMS Mumbai", "Symbiosis Pune", "Christ Bengaluru", "IIM Indore/Rohtak (IPM)"],
    typicalDurationYears: "3",
  },
  {
    degree: "B.Des",
    streams: ["Science PCM", "Science PCB", "Science PCMB", "Commerce with Maths", "Commerce without Maths", "Arts", "Arts with Maths"],
    entranceExams: ["UCEED", "NID DAT", "NIFT", "Institute + portfolio / studio test"],
    specializations: ["Product / Industrial", "Communication / Graphic", "UX / Interaction", "Fashion", "Urban / Spatial"],
    notableInstitutions: ["NID Ahmedabad", "IIT Bombay (IDC)", "NIFT (Chennai/Jodhpur)", "CEPT Ahmedabad"],
    typicalDurationYears: "4",
  },
  {
    degree: "Integrated Law (BA/BBA/B.Com LL.B)",
    streams: ["Commerce with Maths", "Commerce without Maths", "Arts", "Arts with Maths"],
    entranceExams: ["CLAT", "AILET", "LSAT-India"],
    specializations: ["5-year integrated LL.B (Hons)"],
    notableInstitutions: ["NLSIU Bengaluru", "NLU Delhi"],
    typicalDurationYears: "5",
  },
] as const

/** Entrance / selection gateways and what they gate (overall frequency rank). */
export const ENTRANCE_EXAM_GATEWAYS = [
  { exam: "CUET-UG", gates: "central + many universities, every stream", note: "The great equalizer — most common gateway across all streams." },
  { exam: "University / Merit (10+2 board)", gates: "the broad merit-based route", note: "Single largest selection mode (120+ programs)." },
  { exam: "JEE Main", gates: "B.Tech / engineering (NITs, IIITs; qualifier for JEE Advanced → IITs)" },
  { exam: "NEET-UG", gates: "MBBS / BDS / AYUSH and the medical block" },
  { exam: "State CET", gates: "state engineering / professional seats" },
  { exam: "CLAT / LSAT-India / AILET", gates: "5-year integrated law (NLUs)" },
  { exam: "NATA / JEE Paper-2", gates: "B.Arch / B.Plan (architecture)" },
  { exam: "UCEED / NID DAT / NIFT", gates: "design (B.Des)" },
  { exam: "NCHM JEE", gates: "hotel management (B.Sc Hospitality / IHM)" },
  { exam: "IMU-CET", gates: "B.Sc Nautical Science / merchant navy" },
  { exam: "CUET (ICAR-UG)", gates: "agriculture programs" },
  { exam: "IPMAT / NPAT / SET", gates: "integrated management (IPM) and private-university management" },
] as const

/** Top institution hubs by count of named exemplars (citywise seed). */
export const TOP_INSTITUTION_HUBS = ["Bengaluru", "New Delhi", "Mumbai", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Jaipur"] as const

/** Standout non-conventional, mostly any-stream-eligible options — the widest
 *  open door for Arts/Commerce students who lack Maths (117-course catalog). */
export const NON_CONVENTIONAL_OPTIONS = [
  { course: "B.Sc Nautical Science / Merchant Navy", gateway: "IMU-CET", note: "Maritime & logistics; off-the-beaten-path." },
  { course: "B.Sc Hospitality (IHM)", gateway: "NCHM JEE", note: "Any-stream eligible." },
  { course: "BBA Aviation / Airline & Airport Management", gateway: "Institute / Merit", note: "Any-stream eligible." },
  { course: "B.Plan / B.Arch", gateway: "JEE Paper-2 / NATA", note: "Built environment." },
  { course: "BA Criminology", gateway: "University / Merit", note: "Social-science niche." },
  { course: "B.Sc Event Management", gateway: "Institute / Merit", note: "Any-stream eligible." },
  { course: "B.Voc ladder (Animation / Logistics / Tourism)", gateway: "Merit (with exit awards)", note: "Skill-track with flexible exits." },
  { course: "Integrated 5-yr Law (BA/BBA/B.Com LL.B)", gateway: "CLAT / LSAT-India", note: "Any commerce/arts background." },
  { course: "B.Des UX / Interaction & Urban / Spatial Design", gateway: "UCEED / NID DAT / NIFT", note: "Any-stream eligible." },
  { course: "B.F.Sc Fisheries / Computational Biology", gateway: "CUET (ICAR-UG) / Institute", note: "Agri-bio niche." },
] as const

// -----------------------------------------------------------------------------
// 6. NOTE / "WHAT TO STUDY — NEXT ACTION" TEMPLATES
//    Two distinct shapes were mined. DEMO SOAP P: lines = forward-looking
//    deliverables FOR THE CLIENT. LIVE intake logs = internal routing memos
//    (which package + which counsellor). The report/bot should produce the
//    DEMO-style deliverable plan; the LIVE patterns inform tone & triage.
// -----------------------------------------------------------------------------

export interface NoteRecommendationType {
  readonly id: string
  readonly label: string
  /** Relative frequency across the demo SOAP P: actions. */
  readonly frequency: number
  /** A reusable, quantified-and-small template line. */
  readonly template: string
}

/** Recurring "next action" deliverable templates (from demo SOAP P: lines). */
export const NOTE_RECOMMENDATION_TYPES: readonly NoteRecommendationType[] = [
  { id: "wellbeing_boundary_self_care", label: "Wellbeing / boundary / self-care", frequency: 7, template: "Set one firm boundary this week; keep sleep + meal anchors; review meds adherence." },
  { id: "artifact_collateral", label: "Artifact / collateral", frequency: 5, template: "Rework the CV; start an evidence file / brag doc of wins; draft a one-line gap narrative." },
  { id: "interview_negotiation_prep", label: "Interview / negotiation prep", frequency: 3, template: "Run one mock interview before next session; build a benchmark range + script; role-play the counter." },
  { id: "reframe_or_explore_options", label: "Reframe / explore options", frequency: 3, template: "Normalise the gap between readiness and felt-readiness; bring back two roles that fit your values." },
  { id: "structure_planning_targeting", label: "Structure / planning / targeting", frequency: 3, template: "Establish a weekly cadence; align to the promotion/selection rubric; set milestones." },
  { id: "ship_project_or_capstone", label: "Ship project / capstone", frequency: 2, template: "Ship one end-to-end capstone with a written case study, then publish it." },
  { id: "networking_outreach", label: "Networking outreach", frequency: 2, template: "Do one informational interview; reconnect with two former colleagues." },
] as const

/** The structural signature every good "next action" plan follows. */
export const NOTE_PLAN_SIGNATURE = [
  "Future-dated to the next session ('before next session', 'this week', 'next time').",
  "Bundles 2–3 concrete deliverables, not open advice.",
  "Pairs a career action with a wellbeing / boundary action when reserves are low.",
  "Includes a counsellor-side prep step (get the rubric, review meds, role-play next).",
  "Quantified and small — 'one' mock interview, 'two' applications, a 'one-week' log.",
] as const

/** What the LIVE intake notes actually decide — routing, not study plans. */
export const LIVE_TRIAGE_PATTERNS = {
  packages: ["Premium", "Advance", "True North", "Big Picture"],
  recurringThemes: [
    "package_recommendation",
    "interests_strengths_observed",
    "counsellor_assignment",
    "higher_studies_abroad / exams (NEET/JEE/UPSC/CAT/GATE)",
    "family_parental_influence on stream choice",
    "stream_subject_fit",
    "confidence_motivation_low",
    "career_break_gap",
    "career_switch_transition",
  ],
  rareStudyGuidanceExamples: [
    "Look into NIOS as an alternative board for a struggling Class-X student.",
    "Foundational basics over shortcuts before re-attempting exams.",
    "Backend → full-stack reskill to grow toward solution architect.",
    "Probe whether an MCA / MBA investment is worth it.",
    "Frame 'career 10 years down the line' vs jumping to a Masters abroad.",
  ],
} as const

/** Sheet3 — the report scaffold the engine emits (Step-1 flow + Step-2 fitment). */
export const REPORT_TEMPLATE = {
  title: "Automated Career Recommendations",
  step1Flow: ["Check Job Group", "Check Work Preference (WP)", "Give Job Options", "Give Related Education Options"],
  reportFields: ["Name", "Grade", "Stream", "Degree Options", "Job Options"],
  step2FitmentColumns: [
    "Job Role",
    "Ideal Personality Score",
    "Present Personality Score",
    "Effort Required",
    "Ideal Ability Score",
    "Ability Score Obtained",
    "Effort Required",
    "Fitment Score",
  ],
  sampleFitmentRow: {
    role: "Software Professional",
    personality: "Endurance 60+, Understanding 40-60, Methodicalness 40-60",
    abilities: "Reasoning High, Numerical Medium, Closure Medium",
    fitmentScore: 0.7,
  },
} as const

// -----------------------------------------------------------------------------
// 7. DATA CAVEATS — keep recommendations honest.
// -----------------------------------------------------------------------------

export const CAREER_PATTERNS_CAVEATS = [
  "All figures are MINED AGGREGATES from seed spreadsheets, not a full client corpus — treat as indicative, directional defaults, not guarantees.",
  "Sheet1's Stream column is blank for ~590/610 roles; stream→role links are derived from the Sheet6 Job-Group × Stream affinity matrix (≥7 = strong fit).",
  "Recommended-degree strings on roles are sparse (~16 rows); the dense, reliable dimensions are Job Group then abilities. Treat degree counts as indicative.",
  "Personality archetypes come from a 243-respondent calibration set (one fewer than the 244 stated) and a transparent, documented similarity model, not a proprietary scoring key.",
  "Salary ranges (₹ LPA) and demand labels are parsed from the role workbooks; no 'Low'-demand roles appear, so the set skews toward in-demand paths.",
  "Note patterns rest on a small sample: 10 demo SOAP notes + 49 live comments across 22 clients — illustrative of style, not statistically representative.",
] as const

// -----------------------------------------------------------------------------
// 8. CAREER_PATTERNS_BRIEF — drop-in LLM system-prompt knowledge block.
// -----------------------------------------------------------------------------

/**
 * Compact (~360-word) on-brand brief. Paste verbatim into the chatbot/voicebot
 * (or report-generator) system prompt to ground recommendations in SetMyCareer's
 * mined patterns. Calm, structured, evidence-led — what recurs vs what stands out.
 */
export const CAREER_PATTERNS_BRIEF = `SetMyCareer recommendation grounding — what recurs vs what stands out (mined from our own seed tables; figures are indicative defaults, never guarantees).

THE SPINE. Stream maps to a small set of strong-fit job groups (affinity scored 1-10; 7+ is a strong fit, 10 is signature). PCM signs on Engineering, IT, Maths and Physical Science (all 10/10); PCB on Health, Life Science and Medicine (all 10/10) and cannot enter core engineering; PCMB is the master key — widest eligibility, both the engineering and medical apex open. Commerce-with-Maths anchors on Financial & Business Services (10/10); Commerce-without-Maths on Marketing, Sales, HR, Admin and Clerical (five at 10/10); Arts on the broadest people/society pool — HR, Law, Social Science, Counseling, Writing, Fine Art and Entertainment, nine at 10/10. Across every stream a Reasoning + Numerical + Verbal ability triad recurs; Closure and Spatial distinguish specialised roles.

THE CANONICAL DEGREES. B.Tech, B.Sc, B.Des, BBA and B.Com are the backbone everywhere. CUET-UG is the great equalizer across all streams; specialised gateways gate only their niche — JEE (engineering), NEET (medical/AYUSH), CLAT (law), NATA (architecture), UCEED/NID/NIFT (design), IMU-CET (merchant navy).

WHAT STANDS OUT. The very top salary ceilings cluster in two places: maths-based finance (Quant, Investment Banking, CA, Actuary — up to ~₹50 LPA) and CS/cloud/data (B.Tech CSE — up to ~₹47 LPA). Both demand a quantitative degree. Adding Maths to an Arts or Commerce student is the single biggest lever, lifting ceilings from ~₹25 LPA toward ₹45-50 LPA. Medicine (MBBS specialist) is the lone PCB entry at the top; Civil Services is the highest-pay non-quant route, reachable from many Arts degrees.

PERSONALITY. Six factor-led archetypes recur — Anchor (Team & Composure → people/care), Individualist (Independence → creative/sales), Organizer (System & Discipline → finance/IT/admin), Driver (Achievement → management/engineering), Explorer (Learning → research), Connector (People Energy → sales/performance). Achievement Drive is the universal connector — it overlays onto every other archetype.

HOW TO ADVISE. Lead with the strong-fit job groups, then degrees, then concrete next steps. Keep "next actions" quantified and small (one mock interview, two applications, a one-week log), future-dated to the next session, and pair a career action with a wellbeing guardrail when reserves are low. Stay calm, specific and honest about uncertainty.`
