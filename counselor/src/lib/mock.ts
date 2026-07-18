// Counsellor-console local store + constants.
//
// This module USED to ship demo personas (Tiffany, Aarav, …) so the console had
// something to render before the live backend was wired. Those personas are gone:
// every real counsellor/navigator login now reads its own LIVE caseload
// (getClientsByNavi) and every client/customer login reads its own live records,
// so the demo arrays below are intentionally EMPTY. What remains is purely
// functional — the local recording→session store (so a recorded session shows up
// immediately, then mirrors to the cloud), note drafting, the intake helper, and
// UI constants (CLUSTER_LABELS). Nothing here fabricates a person.
import type {
  Appointment, AttentionItem, Client, Counselor, CounselorReport, Note,
  Prescription, Session, Signal, TestResult, TranscriptTurn, ScoreDelta, OverviewStats,
  RadarProfiles, CaseloadTrendPoint, CompositionSlice,
  SessionNotes, RecordingDraft, RecordingLine, UnloggedRecording, VizTone, RingDatum,
} from "./types"
// Fire-and-forget cloud persistence (never throws; local store is always the
// source of truth). persist.ts is standalone and must NOT import this module.
import { persistSession, persistSessionNotes } from "./persist"

// A neutral fallback identity for the few places that want a counsellor name
// before the live session resolves. Real screens use the signed-in session name.
export const counselor: Counselor = {
  id: "cn_self",
  name: "Counsellor",
  title: "Career & Wellbeing Counsellor",
  role: "therapist",
  email: "",
  avatarInitials: "—",
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

// pc.* signal catalogue helper → used by blueprint() (which addClient() uses to
// scaffold a fresh, all-zero blueprint for a hand-added intake).
const sig = (id: string, name: string, cluster: Signal["cluster"], score: number | null, confidence: Signal["confidence"], delta?: number, quote?: string): Signal =>
  ({ id, name, cluster, score, confidence, delta, quote })

function blueprint(seed: number, headline: string) {
  const j = (n: number) => Math.max(8, Math.min(96, Math.round(n)))
  return {
    careerIndex: j(seed),
    bloomIndex: j(seed - 6),
    confidence: (seed > 70 ? "moderate" : "tentative") as Signal["confidence"],
    headline,
    signals: [
      sig("pc.career_clarity", "Career clarity", "direction_identity", j(seed + 8), "moderate"),
      sig("pc.interest_role_fit", "Interest–role fit", "direction_identity", j(seed + 4), "moderate"),
      sig("pc.values_alignment_work", "Values alignment", "direction_identity", j(seed - 3), "tentative"),
      sig("pc.market_readiness", "Market readiness", "market_readiness", j(seed - 2), "moderate"),
      sig("pc.skill_coverage", "Skill coverage", "market_readiness", j(seed + 1), "moderate"),
      sig("pc.skill_gap_severity", "Skill-gap severity", "market_readiness", j(seed - 8), "tentative"),
      sig("pc.execution_momentum", "Execution momentum", "execution_momentum", j(seed + 6), "moderate"),
      sig("pc.follow_through", "Follow-through", "execution_momentum", j(seed - 4), "tentative"),
      sig("pc.professional_confidence", "Professional confidence", "confidence_decision", j(seed - 10), "tentative"),
      sig("pc.impostor_load", "Impostor load", "confidence_decision", j(seed - 14), "tentative"),
      sig("pc.networking_momentum", "Networking momentum", "network_environment", j(seed - 6), "tentative"),
      sig("pc.workload_sustainability", "Workload sustainability", "network_environment", j(seed - 12), "tentative"),
    ],
    composites: [
      { id: "cx.career_index", name: "Career index", score: j(seed), confidence: "moderate" as Signal["confidence"] },
      { id: "cx.bloom_index", name: "Life-performance", score: j(seed - 6), confidence: "tentative" as Signal["confidence"] },
    ],
    contradiction: null,
  }
}

// 6-axis RIASEC + 5-axis Big Five scaffold (used by addClient for a fresh, all-zero radar).
function radarProfiles(seed: number, riasec: [number, number, number, number, number, number], bigFive: [number, number, number, number, number]): RadarProfiles {
  const k = (seed - 50) / 6
  return {
    riasec: [
      { axis: "Realistic", value: clamp(riasec[0] + k) },
      { axis: "Investigative", value: clamp(riasec[1] + k) },
      { axis: "Artistic", value: clamp(riasec[2] + k) },
      { axis: "Social", value: clamp(riasec[3] + k) },
      { axis: "Enterprising", value: clamp(riasec[4] + k) },
      { axis: "Conventional", value: clamp(riasec[5] + k) },
    ],
    bigFive: [
      { axis: "Openness", value: clamp(bigFive[0] + k) },
      { axis: "Conscientiousness", value: clamp(bigFive[1] + k) },
      { axis: "Extraversion", value: clamp(bigFive[2] + k) },
      { axis: "Agreeableness", value: clamp(bigFive[3] + k) },
      { axis: "Neuroticism", value: clamp(bigFive[4] - k) },
    ],
  }
}

// ── demo persona data — intentionally EMPTY (real logins read live data) ──────
export const clients: Client[] = []
export const sessions: Session[] = []
export const transcript: TranscriptTurn[] = []
export function clientTranscript(_clientId: string): TranscriptTurn[] { return [] }
export const proposedDeltas: ScoreDelta[] = []
export const tests: TestResult[] = []
export const notes: Note[] = []
export const prescriptions: Prescription[] = []
export const appointments: Appointment[] = []
export const reports: CounselorReport[] = []
export const attention: AttentionItem[] = []

export const overviewStats: OverviewStats = {
  activeClients: 0, sessionsThisWeek: 0, avgCaseloadIndex: 0, avgIndexDelta: 0, reportsShared: 0,
}
export const caseloadTrend: CaseloadTrendPoint[] = []
export const caseloadRiskComposition: CompositionSlice[] = []
export const todayProgress: { rings: RingDatum[] } = { rings: [] }
export const weeklyActivity: { day: string; sessions: number }[] = []
export const weeklyActivityTodayIdx = 0
export const weeklyTotals = { sessions: 0, hours: 0 }

export interface PracticeInsight {
  key: string; label: string; value: string; sub: string; tone: VizTone; trend: number[]
}
export const practiceInsights: PracticeInsight[] = []

// ---- accessors (empty until the live layer / local recording store fills them) ----
export const getClient = (id: string) => clients.find((c) => c.id === id)
export const clientSessions = (id: string) => sessions.filter((s) => s.clientId === id)
export const getSession = (id: string) => sessions.find((s) => s.id === id)
export const allSessions = () => sessions
export const clientNotes = (id: string) => notes.filter((n) => n.clientId === id)
export const clientPrescriptions = (id: string) => prescriptions.filter((p) => p.clientId === id)
export const clientReports = (id: string) => reports.filter((r) => r.clientId === id)
export const clientTests = (_id: string) => tests
export const clientIndexHistory = (id: string) => getClient(id)?.indexHistory ?? []
export const clientRadar = (id: string) => getClient(id)?.radar

export const CLUSTER_LABELS: Record<string, string> = {
  direction_identity: "Direction & Identity",
  market_readiness: "Market Readiness",
  execution_momentum: "Execution & Momentum",
  confidence_decision: "Confidence & Decision",
  network_environment: "Network & Environment",
}

/* ============================================================
   Live, mutable local store (recordings → logged sessions → notes)

   The recording flow mutates the module-level `sessions` array in place and
   notifies subscribers so a just-recorded session appears immediately, then
   mirrors to the cloud. Starts empty; everything in it is a REAL recorded session.
   ============================================================ */

type StoreListener = () => void
const listeners = new Set<StoreListener>()
let storeVersion = 0

function emit() {
  storeVersion++
  listeners.forEach((l) => l())
}

export function subscribeSessions(l: StoreListener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
export function sessionsSnapshot() {
  return storeVersion
}

// A rotating script the live recording streams while "listening" when no real STT
// is available (simulated-recording fallback only). Never shown as a real client.
export const RECORDING_SCRIPT: RecordingLine[] = [
  { speaker: "Client", text: "Thanks for making the time — there's a lot on my mind about the next step." },
  { speaker: "Dr. Lin", text: "Let's start there. What's feeling most alive for you right now?" },
  { speaker: "Client", text: "I think I finally know I want to move toward product, but I keep second-guessing it." },
  { speaker: "Dr. Lin", text: "That clarity matters. What's underneath the second-guessing?" },
  { speaker: "Client", text: "Honestly, whether I'm actually ready. Everyone around me seems further along." },
  { speaker: "Dr. Lin", text: "Let's look at the evidence rather than the feeling. What have you shipped lately?" },
  { speaker: "Client", text: "I rebuilt my portfolio and shipped two side projects last month." },
  { speaker: "Dr. Lin", text: "That's real, concrete proof. Notice the doubt is loud, but the facts are on your side." },
  { speaker: "Client", text: "When you put it like that… I have been working till midnight though, I'm pretty drained." },
  { speaker: "Dr. Lin", text: "Let's protect your reserves so the momentum holds. Could we set one boundary this week?" },
  { speaker: "Client", text: "Maybe no laptop after nine. And I'd like to prep for the interviews coming up." },
  { speaker: "Dr. Lin", text: "Good. We'll line up a mock interview and a CV pass before we meet next." },
]

// Auto-generate draft notes from a transcript — a short counselor summary plus a
// warm, plain-language client-facing paragraph. Deterministic; no real model.
export function generateNotesFromTranscript(
  transcript: RecordingLine[],
  clientName?: string,
): SessionNotes {
  const first = clientName ? clientName.split(" ")[0] : "your client"
  const clientLines = transcript.filter((l) => l.speaker !== "Dr. Lin").map((l) => l.text)
  const hasEvidence = clientLines.some((t) => /portfolio|shipped|project|built/i.test(t))
  const hasStrain = clientLines.some((t) => /drained|midnight|tired|burn|exhaust|stress/i.test(t))
  const hasDirection = clientLines.some((t) => /product|move|switch|toward|direction/i.test(t))

  const counselor = [
    `S: ${clientName ?? "Client"} discussed next-step direction; engaged and reflective.`,
    `O: ${hasDirection ? "Clear emerging direction stated. " : ""}${hasEvidence ? "Strong concrete evidence of progress. " : ""}${hasStrain ? "Workload strain noted." : "Energy appears sustainable."}`,
    `A: ${hasEvidence && hasStrain ? "Confidence gap, not capability gap; protect reserves." : "Momentum building; monitor follow-through."}`,
    `P: ${hasDirection ? "Mock interview + CV pass before next session. " : "Clarify direction next session. "}${hasStrain ? "Set one workload boundary." : "Maintain current cadence."}`,
  ].join("\n")

  const client = [
    `Good session today, ${first}.`,
    hasDirection ? "You named a clear direction to move toward, which is a real milestone." : "We started mapping out where you'd like to head next.",
    hasEvidence ? "And you've got solid proof behind you — the work you've shipped recently shows you're more ready than the doubt suggests." : "",
    hasStrain ? "One thing to watch: you've been running on empty lately. Let's protect your evenings so the progress actually sticks." : "Keep the steady pace you're on.",
    "Before we next meet, we'll line up a mock interview and a quick CV pass.",
  ].filter(Boolean).join(" ")

  return { counselor, client, status: "draft" }
}

const fmtDateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// Convert a recording draft into a real, logged session with auto-draft notes and
// push it into the live store so it shows up in the client's Sessions list.
export function logRecording(
  draft: RecordingDraft,
  opts: { clientId: string; clientName?: string; title?: string; platform?: Session["platform"] },
): Session {
  const transcript = draft.transcript
  const firstClientLine = transcript.find((l) => l.speaker !== "Dr. Lin")?.text
  const session: Session = {
    id: `se_rec_${Date.now()}`,
    clientId: opts.clientId,
    date: fmtDateOnly(new Date(draft.startedAt)),
    durationMin: Math.max(1, draft.durationMin),
    platform: opts.platform ?? (draft.source === "meeting" ? "zoom" : "in_person"),
    status: "completed",
    attended: true,
    hasTranscript: transcript.length > 0,
    hasReport: false,
    summary: opts.title ?? draft.aiNotes?.summary ?? "Recorded session — auto-summarized from transcript.",
    snippet: firstClientLine,
    indexDelta: null,
    notes: draft.aiNotes
      ? { counselor: draft.aiNotes.counselor, client: draft.aiNotes.client, status: "draft" }
      : generateNotesFromTranscript(transcript, opts.clientName),
  }
  sessions.unshift(session)
  emit()
  void persistSession(session, transcript)
  return session
}

// Update a session's notes (used by the SessionDetail approval gate).
export function setSessionNotes(sessionId: string, notes: SessionNotes): void {
  const s = sessions.find((x) => x.id === sessionId)
  if (!s) return
  s.notes = notes
  emit()
  void persistSessionNotes(sessionId, notes)
}

/* ---- new client onboarding ---- */

export type NewClientForm = {
  name: string
  age?: number
  profession?: string
  standard?: string
  education?: string
  reason?: string
  notes?: string
  relationship?: string
}

// Build a fresh client from the intake form: identity from the form, reads
// empty/zero ("awaiting first session") so nothing is fabricated.
export function addClient(form: NewClientForm): Client {
  const id = `cl_new_${Date.now()}`
  const initials =
    form.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "—"
  const headline = [form.profession, form.standard].filter(Boolean).join(" · ") || "New client"
  const bp = blueprint(50, "New client")
  const c: Client = {
    id,
    name: form.name.trim(),
    initials,
    preferredName: form.name.trim().split(/\s+/)[0],
    age: form.age ?? 0,
    headline,
    status: "active",
    careerIndex: null,
    bloomIndex: null,
    wellbeingBand: null,
    riskFlag: "none",
    lastSessionAt: null,
    nextSessionAt: null,
    sessionCount: 0,
    relationship: form.relationship || "career coaching",
    blueprint: {
      ...bp,
      careerIndex: 0,
      bloomIndex: 0,
      confidence: "tentative",
      headline: "Awaiting first session — complete an intake to generate the read",
      signals: bp.signals.map((s) => ({ ...s, score: 0, confidence: "tentative" as const, delta: undefined, quote: undefined })),
      composites: bp.composites.map((x) => ({ ...x, score: 0, confidence: "tentative" as const })),
      contradiction: null,
    },
    clinical: {
      wellbeingIndex: null,
      wellbeingBand: null,
      riskFlag: "none",
      alliance: null,
      engagement: null,
      adherence: null,
      notes: [
        form.reason && `Reason for reaching out: ${form.reason}`,
        form.education && `Education: ${form.education}`,
        form.notes,
      ].filter(Boolean) as string[],
    },
    history: [],
    indexHistory: [],
    radar: radarProfiles(50, [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0]),
  }
  clients.unshift(c)
  return c
}

// A zero-state Client for a real (live) client we only know id + name for, so
// screens expecting a full Client shape (report builder / preview) render
// honestly — everything "awaiting assessment", nothing fabricated.
export function scaffoldClient(id: string, name: string): Client {
  const nm = name.trim()
  const initials = nm.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "—"
  const bp = blueprint(50, "Awaiting assessment")
  return {
    id, name: nm, initials, preferredName: nm.split(/\s+/)[0], age: 0, headline: "",
    status: "active", careerIndex: null, bloomIndex: null, wellbeingBand: null, riskFlag: "none",
    lastSessionAt: null, nextSessionAt: null, sessionCount: 0, relationship: "career coaching",
    blueprint: {
      ...bp, careerIndex: 0, bloomIndex: 0, confidence: "tentative",
      headline: "Awaiting first assessment — complete an intake to generate the read",
      signals: bp.signals.map((s) => ({ ...s, score: 0, confidence: "tentative" as const, delta: undefined, quote: undefined })),
      composites: bp.composites.map((x) => ({ ...x, score: 0, confidence: "tentative" as const })),
      contradiction: null,
    },
    clinical: { wellbeingIndex: null, wellbeingBand: null, riskFlag: "none", alliance: null, engagement: null, adherence: null, notes: [] },
    history: [], indexHistory: [], radar: radarProfiles(50, [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0]),
  }
}

// ── Tiffany Woodward — the one seeded demo persona, kept for the marketing
//    Product-tab report demo (a fully-populated Career Intelligence Report). Real
//    logins never see it (they read live caseloads); it exists only so the demo /
//    marketing capture shows a real, non-empty report. ──────────────────────────
clients.push({
  ...scaffoldClient("cl_tiffany", "Tiffany Woodward"),
  age: 22,
  headline: "Final-year design student — choosing between product design and UX research",
  status: "active",
  careerIndex: 76,
  bloomIndex: 70,
  sessionCount: 4,
  lastSessionAt: "2026-06-27T15:00:00.000Z",
  nextSessionAt: "2026-07-09T10:30:00.000Z",
  blueprint: blueprint(76, "A strong analytical–creative blend — a builder who wants the work to mean something"),
  radar: radarProfiles(76, [38, 72, 82, 66, 70, 54], [84, 74, 66, 71, 38]),
})

// Merge cloud-persisted sessions into the local store, deduped by id.
export function mergeSessions(incoming: Session[]): number {
  if (!incoming || incoming.length === 0) return 0
  const seen = new Set(sessions.map((s) => s.id))
  let added = 0
  for (const s of incoming) {
    if (!s || !s.id || seen.has(s.id)) continue
    seen.add(s.id)
    sessions.push(s)
    added++
  }
  if (added > 0) emit()
  return added
}

/* ---- unlogged recordings ("log later") store ---- */

const unlogged: UnloggedRecording[] = []
const unloggedListeners = new Set<StoreListener>()
let unloggedVersion = 0

function emitUnlogged() {
  unloggedVersion++
  unloggedListeners.forEach((l) => l())
}
export function subscribeUnlogged(l: StoreListener): () => void {
  unloggedListeners.add(l)
  return () => { unloggedListeners.delete(l) }
}
export function unloggedSnapshot() {
  return unloggedVersion
}
export function unloggedRecordings() {
  return unlogged
}
export function parkUnlogged(draft: UnloggedRecording): void {
  unlogged.unshift(draft)
  emitUnlogged()
}
export function removeUnlogged(id: string): void {
  const i = unlogged.findIndex((u) => u.id === id)
  if (i >= 0) {
    unlogged.splice(i, 1)
    emitUnlogged()
  }
}
