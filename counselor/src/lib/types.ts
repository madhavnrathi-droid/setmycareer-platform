// Setmycareer counselor console — domain types.
// Mirrors the FastAPI/Appwrite data model; the console renders these (never re-scores).

export type Confidence = "none" | "low" | "tentative" | "moderate" | "high"
export type ClientStatus = "active" | "needs_attention" | "at_risk" | "awaiting_review" | "archived"
export type SessionStatus = "scheduled" | "live" | "completed" | "no_show" | "canceled"
export type Platform = "livekit" | "google_meet" | "zoom" | "teams" | "in_person"
export type CounselorRole = "counselor" | "therapist" | "admin"

// Semantic palette used by the data-viz primitives (rings, sparklines, cards).
export type VizTone = "brand" | "well" | "mind" | "warn" | "risk" | "ink"

// One Apple-Fitness-style progress ring (dashboard "today's progress").
export interface RingDatum {
  key: string
  label: string
  value: number
  max: number
  tone: VizTone
  /** Display string for the legend value (e.g. "1/3", "2.5h"). */
  display: string
}

export type ClusterKey =
  | "direction_identity"
  | "market_readiness"
  | "execution_momentum"
  | "confidence_decision"
  | "network_environment"

export interface Counselor {
  id: string
  name: string
  title: string
  role: CounselorRole
  email: string
  avatarInitials: string
}

export interface Signal {
  id: string // pc.*
  name: string
  cluster: ClusterKey
  score: number | null // 0–100
  confidence: Confidence
  delta?: number | null
  quote?: string
}

export interface Composite {
  id: string // cx.*
  name: string
  score: number | null
  confidence: Confidence
}

export interface Blueprint {
  careerIndex: number | null
  bloomIndex: number | null
  confidence: Confidence
  headline: string // career equivalent of a diagnosis line, e.g. "Market-ready, low confidence"
  signals: Signal[]
  composites: Composite[]
  contradiction?: { kind: string; text: string } | null
}

export interface ClinicalLayer {
  wellbeingIndex: number | null
  wellbeingBand: string | null
  riskFlag: "none" | "low" | "moderate" | "high"
  alliance: number | null // therapeutic alliance 0–100
  engagement: number | null
  adherence: number | null
  notes: string[]
}

export interface IndexPoint {
  ts: string
  careerIndex: number | null
  wellbeingIndex: number | null
  masterIndex: number | null
}

// Compact per-session time-series the viz consumes directly (career index +
// wellbeing across a client's sessions). Values 0–100. `label` is a short
// session/date tag for the x-axis (e.g. "Apr 10").
export interface IndexHistoryPoint {
  label: string
  careerIndex: number
  wellbeing: number
}

// One radar axis: a labelled value 0–100. Used for RIASEC (6), Big Five (5),
// and the 5 career clusters.
export interface RadarAxis {
  axis: string
  value: number
}

// Per-client personality/interest profiles suitable for a recharts RadarChart.
// `riasec` always has 6 axes (R,I,A,S,E,C); `bigFive` always has 5
// (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).
export interface RadarProfiles {
  riasec: RadarAxis[]   // 6 axes
  bigFive: RadarAxis[]  // 5 axes
}

export interface Client {
  id: string
  name: string
  initials: string
  /** Preferred / first name to address the client by in reports (defaults to the first token of `name`). */
  preferredName?: string
  /** e.g. "she/her", "he/him", "they/them" — collected at intake so reports read in the right voice. */
  pronouns?: string
  age: number
  headline: string // e.g. "Final-year · Product track"
  status: ClientStatus
  careerIndex: number | null
  bloomIndex: number | null
  wellbeingBand: string | null
  riskFlag: ClinicalLayer["riskFlag"]
  lastSessionAt: string | null
  nextSessionAt: string | null
  sessionCount: number
  relationship: string // "career coaching" | "therapy" | ...
  blueprint: Blueprint
  clinical: ClinicalLayer
  history: IndexPoint[]
  // ~6 points across this client's sessions for TrendArea / sparklines.
  indexHistory: IndexHistoryPoint[]
  // RIASEC (6 axes) + Big Five (5 axes) for the Radar centerpiece.
  radar: RadarProfiles
}

export interface RecoChip {
  label: string
  count: number
}

// Per-session notes. `counselor` is the private working note; `client` is the
// plain-language version the client will see — but only ONCE the counselor flips
// the status to "approved" (the honest approval gate). `sharedAt` is stamped at
// that moment. Nothing in `client` reaches the client app until approved.
export interface SessionNotes {
  counselor: string
  client: string
  status: "draft" | "approved"
  sharedAt?: string
}

export interface Session {
  id: string
  clientId: string
  date: string
  durationMin: number
  platform: Platform
  status: SessionStatus
  attended: boolean
  hasTranscript: boolean
  hasReport: boolean
  summary?: string
  snippet?: string
  indexDelta?: number | null
  recos?: RecoChip[]
  notes?: SessionNotes
}

export interface TranscriptTurn {
  speaker: string
  ts: string // mm:ss
  text: string
  gatesMetric?: string // pc.* id this utterance gated
}

// A line in the live recording transcript (speaker + text, no timestamp yet).
export interface RecordingLine {
  speaker: string
  text: string
}

// The draft produced when a recording is stopped — handed to the log-session
// flow, or parked as an UnloggedRecording for "log later".
export interface RecordingDraft {
  id: string
  clientId?: string
  clientName?: string
  durationMin: number
  startedAt: string
  transcript: RecordingLine[]
  source: "mic" | "meeting"
  /** True once the transcript has been replaced by real STT (Groq Whisper). */
  transcribed?: boolean
  /** AI-drafted notes from the real transcript (counselor + client + summary). */
  aiNotes?: { summary?: string; counselor: string; client: string }
}

// A stopped-but-not-yet-logged recording the counselor can log later.
export type UnloggedRecording = RecordingDraft

export interface ScoreDelta {
  id: string
  name: string
  before: number | null
  after: number
  confidence: Confidence
  quote: string
  approved: boolean
}

export interface TestResult {
  id: string
  name: string
  date: string
  result: string // band / code, e.g. "RIASEC: R-I"
  score?: number | null
  status: "completed" | "in_progress" | "assigned"
  feeds: string // which pc.*/cx.* it informs
}

export interface Note {
  id: string
  clientId: string
  sessionId?: string
  body: string
  type: "soap" | "progress" | "intake" | "private"
  author: string
  createdAt: string
  tags: string[]
}

export interface Prescription {
  id: string
  clientId: string
  drug: string
  dose: string
  frequency: string
  startDate: string
  endDate?: string | null
  prescriber: string
  adherence: number | null // %
  renewalDue: boolean
  status: "active" | "ended"
}

export interface Appointment {
  id: string
  clientId: string
  clientName: string
  title: string
  scheduledAt: string
  durationMin: number
  platform: Platform
  status: SessionStatus
  botStatus?: "none" | "joining" | "in_call" | "recording" | "done"
}

export interface CounselorReport {
  id: string
  clientId: string
  clientName: string
  title: string
  type: "career_asset" | "recruiter_cv" | "progress" | "clinical_summary" | "custom"
  date: string
  shared: boolean
  recipients: string[]
  format: "pdf" | "link"
}

export type AttentionKind =
  | "awaiting_review"
  | "contradiction"
  | "renewal_due"
  | "no_show"
  | "dropping_index"

export interface AttentionItem {
  id: string
  kind: AttentionKind
  clientId: string
  clientName: string
  text: string
  href: string
}

export interface OverviewStats {
  activeClients: number
  sessionsThisWeek: number
  avgCaseloadIndex: number
  avgIndexDelta: number
  reportsShared: number
}

// Caseload-level weekly average career index for the dashboard hero TrendArea.
// `label` is a short week tag (e.g. "Apr 21"); `index` is 0–100.
export interface CaseloadTrendPoint {
  label: string
  index: number
}

// Composition of the caseload for the dashboard Donut (by status or risk).
// `key` is the underlying enum value; `label` is display text; `value` is the
// client count; `tone` maps to a semantic chart token the Donut can color by.
export interface CompositionSlice {
  key: string
  label: string
  value: number
  tone: "brand" | "well" | "warn" | "risk" | "ink"
}
