// The single source that aggregates EVERYTHING known about a client into one
// rich, structured context — plus a LONG plain-text digest of it. This is the
// payload the report generator (server/report-core.ts) and the in-app assistant
// (lib/assistant-knowledge.ts) feed to the LLM: "as large a dataset as available".
//
// `buildDossier` assembles the structured object from the demo store; the two
// `*Text` helpers flatten it into navigable plain text with clear headers so a
// model can read top-to-bottom and answer ANY question about the client.
//
// This module is read-only over the mock store — it never mutates state and has
// no side effects, so it is safe to call from anywhere (UI, server prelude).

import type {
  Client, Signal, Composite, Session, Note, TestResult, CounselorReport,
  TranscriptTurn, IndexHistoryPoint, IndexPoint, RadarAxis, ClinicalLayer,
} from "./types"
import {
  clientSessions, clientNotes, clientTests, clientReports, clientPrescriptions,
  clientTranscript, CLUSTER_LABELS,
} from "./mock"

/* ============================================================
   Structured dossier
   ============================================================ */

/** Identity / who-this-is header. */
export interface DossierIdentity {
  id: string
  name: string
  preferredName: string
  pronouns: string
  age: number
  headline: string
  status: Client["status"]
  relationship: string
  sessionCount: number
  lastSessionAt: string | null
  nextSessionAt: string | null
}

/** The headline indices + the diagnosis-style blueprint line. */
export interface DossierScores {
  careerIndex: number | null
  bloomIndex: number | null
  wellbeingIndex: number | null
  wellbeingBand: string | null
  riskFlag: ClinicalLayer["riskFlag"]
  blueprintHeadline: string
  blueprintConfidence: Signal["confidence"]
  contradiction: { kind: string; text: string } | null
}

/** A pc.* signal grouped under its cluster, with the human cluster label. */
export interface DossierSignal extends Signal {
  clusterLabel: string
}

/** Clinical/wellbeing layer + the running counsellor note bullets on the record. */
export interface DossierClinical {
  wellbeingIndex: number | null
  wellbeingBand: string | null
  riskFlag: ClinicalLayer["riskFlag"]
  alliance: number | null
  engagement: number | null
  adherence: number | null
  notes: string[]
}

/** One session, flattened with its notes (private + client-facing) inline. */
export interface DossierSession {
  id: string
  date: string
  durationMin: number
  platform: Session["platform"]
  status: Session["status"]
  attended: boolean
  hasTranscript: boolean
  hasReport: boolean
  summary: string | null
  snippet: string | null
  indexDelta: number | null
  recos: { label: string; count: number }[]
  notesStatus: "draft" | "approved" | null
  counselorNote: string | null
  clientNote: string | null
}

/** Everything known about one client, assembled from the whole store. */
export interface ClientDossier {
  identity: DossierIdentity
  scores: DossierScores
  /** Flat list of pc.* signals (cluster-labelled), in blueprint order. */
  signals: DossierSignal[]
  /** Signals bucketed by cluster key, for grouped rendering. */
  signalsByCluster: { clusterKey: string; clusterLabel: string; signals: DossierSignal[] }[]
  /** cx.* composite indices. */
  composites: Composite[]
  /** RIASEC (6 axes) + Big Five (5 axes). */
  radar: { riasec: RadarAxis[]; bigFive: RadarAxis[] }
  clinical: DossierClinical
  /** Free-form clinical/counsellor notes attached to the client record (Note[]). */
  clinicalNotes: Note[]
  /** Per-session career/wellbeing index trend (for sparklines / narrative). */
  indexHistory: IndexHistoryPoint[]
  /** Longer-range career/wellbeing/master index points. */
  history: IndexPoint[]
  /** All sessions, newest first, with notes folded in. */
  sessions: DossierSession[]
  /** The full, multi-session, speaker-attributed transcript. */
  transcriptTurns: TranscriptTurn[]
  /** Assessments that feed the scores (RIASEC, Big Five, skills, GAD-7, …). */
  tests: TestResult[]
  /** Reports/career assets produced for the client. */
  reports: CounselorReport[]
  /** Any active/ended prescriptions on file (clinical relationships). */
  prescriptions: ReturnType<typeof clientPrescriptions>
}

/* ---- helpers ---- */

const firstName = (c: Client) => c.preferredName ?? c.name.split(/\s+/)[0] ?? c.name

// A transcript "turn" is a real utterance only when it isn't a session divider
// (those use the "—" speaker / "Session …" label produced by mock.ts).
const isDivider = (t: TranscriptTurn) => t.speaker === "—"

function toDossierSession(s: Session): DossierSession {
  const n = s.notes
  return {
    id: s.id,
    date: s.date,
    durationMin: s.durationMin,
    platform: s.platform,
    status: s.status,
    attended: s.attended,
    hasTranscript: s.hasTranscript,
    hasReport: s.hasReport,
    summary: s.summary ?? null,
    snippet: s.snippet ?? null,
    indexDelta: s.indexDelta ?? null,
    recos: s.recos ?? [],
    notesStatus: n?.status ?? null,
    counselorNote: n?.counselor ?? null,
    clientNote: n?.client ?? null,
  }
}

/**
 * Assemble the full structured dossier for a client by pulling from every store
 * accessor (sessions, transcript, tests, reports, notes, prescriptions). Pure;
 * never mutates. Sessions are ordered newest-first; signals keep blueprint order.
 */
export function buildDossier(client: Client): ClientDossier {
  const bp = client.blueprint
  const cl = client.clinical

  const signals: DossierSignal[] = bp.signals.map((s) => ({
    ...s,
    clusterLabel: CLUSTER_LABELS[s.cluster] ?? s.cluster,
  }))

  // Bucket signals by cluster, preserving first-seen cluster order.
  const clusterOrder: string[] = []
  const byCluster = new Map<string, DossierSignal[]>()
  for (const s of signals) {
    if (!byCluster.has(s.cluster)) {
      byCluster.set(s.cluster, [])
      clusterOrder.push(s.cluster)
    }
    byCluster.get(s.cluster)!.push(s)
  }
  const signalsByCluster = clusterOrder.map((clusterKey) => ({
    clusterKey,
    clusterLabel: CLUSTER_LABELS[clusterKey] ?? clusterKey,
    signals: byCluster.get(clusterKey) ?? [],
  }))

  const sessions = [...clientSessions(client.id)]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map(toDossierSession)

  return {
    identity: {
      id: client.id,
      name: client.name,
      preferredName: firstName(client),
      pronouns: client.pronouns ?? "they/them",
      age: client.age,
      headline: client.headline,
      status: client.status,
      relationship: client.relationship,
      sessionCount: client.sessionCount,
      lastSessionAt: client.lastSessionAt,
      nextSessionAt: client.nextSessionAt,
    },
    scores: {
      careerIndex: client.careerIndex,
      bloomIndex: client.bloomIndex,
      wellbeingIndex: cl.wellbeingIndex,
      wellbeingBand: client.wellbeingBand,
      riskFlag: client.riskFlag,
      blueprintHeadline: bp.headline,
      blueprintConfidence: bp.confidence,
      contradiction: bp.contradiction ?? null,
    },
    signals,
    signalsByCluster,
    composites: bp.composites,
    radar: { riasec: client.radar.riasec, bigFive: client.radar.bigFive },
    clinical: {
      wellbeingIndex: cl.wellbeingIndex,
      wellbeingBand: cl.wellbeingBand,
      riskFlag: cl.riskFlag,
      alliance: cl.alliance,
      engagement: cl.engagement,
      adherence: cl.adherence,
      notes: cl.notes,
    },
    clinicalNotes: clientNotes(client.id),
    indexHistory: client.indexHistory,
    history: client.history,
    sessions,
    transcriptTurns: clientTranscript(client.id),
    tests: clientTests(client.id),
    reports: clientReports(client.id),
    prescriptions: clientPrescriptions(client.id),
  }
}

/* ============================================================
   Plain-text digests (the LLM payload)
   ============================================================ */

const NA = "—"
const num = (n: number | null | undefined) => (n == null ? NA : String(Math.round(n)))
const pct = (n: number | null | undefined) => (n == null ? NA : `${Math.round(n)}%`)
const delta = (n: number | null | undefined) =>
  n == null ? "" : ` (${n >= 0 ? "+" : ""}${n})`

function h(title: string): string {
  return `\n## ${title}\n`
}

/** Render one signal as a single grounded line: name, score, confidence, Δ, quote. */
function signalLine(s: DossierSignal): string {
  const score = s.score == null ? NA : String(s.score)
  const d = delta(s.delta)
  const q = s.quote ? `  — "${s.quote}"` : ""
  return `  • ${s.name} [${s.id}]: ${score}/100${d} · ${s.confidence}${q}`
}

/**
 * The FULL transcript as "Speaker (mm:ss): text" lines. Session-divider turns
 * become blank-line-separated header rows ("— Session …") so the record reads as
 * a continuous, navigable script across all of the client's sessions.
 */
export function transcriptText(client: Client): string {
  const turns = clientTranscript(client.id)
  const lines: string[] = []
  for (const t of turns) {
    if (isDivider(t)) {
      lines.push("", `— ${t.text} —`)
      continue
    }
    const tag = t.gatesMetric ? `  [signal: ${t.gatesMetric}]` : ""
    lines.push(`${t.speaker} (${t.ts}): ${t.text}${tag}`)
  }
  return lines.join("\n").trim()
}

/**
 * A LONG, well-organised plain-text digest of EVERYTHING in the dossier —
 * identity, every score with confidence, the full RIASEC/Big-Five, every
 * clinical + counsellor note, EVERY session (date, summary, snippet, notes,
 * index delta), the FULL transcript, tests, and the history trend. Structured
 * with clear `##` headers so a model can navigate it. This is the canonical
 * context the report generator and the assistant read.
 */
export function dossierText(client: Client): string {
  const d = buildDossier(client)
  const id = d.identity
  const sc = d.scores
  const out: string[] = []

  out.push(`# CLIENT DOSSIER — ${id.name} (${id.id})`)
  out.push(
    `Everything on file for this client: identity, scores with confidence, ` +
      `personality/interests, clinical + counsellor notes, every session with notes, ` +
      `the full session transcript, assessments, and the index trend.`,
  )

  // ── Identity ──
  out.push(h("Identity"))
  out.push(
    [
      `Name: ${id.name} (prefers "${id.preferredName}")`,
      `Pronouns: ${id.pronouns}`,
      `Age: ${id.age}`,
      `Headline: ${id.headline}`,
      `Engagement: ${id.relationship}`,
      `Status: ${id.status}`,
      `Sessions on record: ${id.sessionCount}`,
      `Last session: ${id.lastSessionAt ?? NA}`,
      `Next session: ${id.nextSessionAt ?? NA}`,
    ].join("\n"),
  )

  // ── Headline read ──
  out.push(h("Headline read (career equivalent of a diagnosis line)"))
  out.push(
    [
      `Blueprint: ${sc.blueprintHeadline} (overall confidence: ${sc.blueprintConfidence})`,
      `Career index: ${num(sc.careerIndex)}/100`,
      `Life-performance (bloom) index: ${num(sc.bloomIndex)}/100`,
      `Wellbeing index: ${num(sc.wellbeingIndex)}/100${sc.wellbeingBand ? ` · band: ${sc.wellbeingBand}` : ""}`,
      `Clinical risk flag: ${sc.riskFlag}`,
    ].join("\n"),
  )
  if (sc.contradiction) {
    out.push(`Tension flagged (${sc.contradiction.kind}): ${sc.contradiction.text}`)
  }

  // ── Composites ──
  out.push(h("Composite indices (cx.*)"))
  out.push(
    d.composites.length
      ? d.composites
          .map((c: Composite) => `  • ${c.name} [${c.id}]: ${num(c.score)}/100 · ${c.confidence}`)
          .join("\n")
      : "  (none)",
  )

  // ── Signals, grouped by cluster ──
  out.push(h("Career signals (pc.*), by cluster — score/100, confidence, Δ since last, evidence quote"))
  for (const group of d.signalsByCluster) {
    out.push(`### ${group.clusterLabel}`)
    out.push(group.signals.map(signalLine).join("\n"))
  }

  // ── Personality & interests ──
  out.push(h("Interests — RIASEC (Holland), 0–100"))
  out.push(d.radar.riasec.map((a: RadarAxis) => `  • ${a.axis}: ${a.value}`).join("\n"))
  out.push(h("Personality — Big Five (Mini-IPIP), 0–100"))
  out.push(d.radar.bigFive.map((a: RadarAxis) => `  • ${a.axis}: ${a.value}`).join("\n"))

  // ── Clinical / wellbeing ──
  out.push(h("Clinical & wellbeing layer"))
  out.push(
    [
      `Wellbeing index: ${num(d.clinical.wellbeingIndex)}/100${d.clinical.wellbeingBand ? ` · ${d.clinical.wellbeingBand}` : ""}`,
      `Risk flag: ${d.clinical.riskFlag}`,
      `Therapeutic alliance: ${pct(d.clinical.alliance)}`,
      `Engagement: ${pct(d.clinical.engagement)}`,
      `Adherence: ${pct(d.clinical.adherence)}`,
    ].join("\n"),
  )
  if (d.clinical.notes.length) {
    out.push("Clinical note bullets on record:")
    out.push(d.clinical.notes.map((n: string) => `  • ${n}`).join("\n"))
  }

  // ── Prescriptions (when present) ──
  if (d.prescriptions.length) {
    out.push(h("Prescriptions"))
    out.push(
      d.prescriptions
        .map(
          (p) =>
            `  • ${p.drug} ${p.dose}, ${p.frequency} (since ${p.startDate}) · adherence ${pct(p.adherence)} · ${p.status}${p.renewalDue ? " · RENEWAL DUE" : ""}`,
        )
        .join("\n"),
    )
  }

  // ── Counsellor notes (Note[]) ──
  out.push(h("Counsellor notes (clinical record)"))
  if (d.clinicalNotes.length) {
    for (const n of d.clinicalNotes) {
      out.push(
        `[${n.createdAt}] ${n.type.toUpperCase()} by ${n.author}` +
          (n.tags.length ? ` · tags: ${n.tags.join(", ")}` : "") +
          `\n${n.body}`,
      )
    }
  } else {
    out.push("(no free-form notes on record)")
  }

  // ── Index trend ──
  out.push(h("Index trend across sessions (career / wellbeing, 0–100)"))
  out.push(
    d.indexHistory.length
      ? d.indexHistory
          .map((p: IndexHistoryPoint) => `  • ${p.label}: career ${p.careerIndex}, wellbeing ${p.wellbeing}`)
          .join("\n")
      : "  (no trend recorded yet)",
  )
  if (d.history.length) {
    out.push("Longer-range index points (career / wellbeing / master):")
    out.push(
      d.history
        .map((p: IndexPoint) => `  • ${p.ts}: career ${num(p.careerIndex)}, wellbeing ${num(p.wellbeingIndex)}, master ${num(p.masterIndex)}`)
        .join("\n"),
    )
  }

  // ── Sessions (every one, with notes) ──
  out.push(h("Sessions (newest first) — summary, key quote, index Δ, and both notes"))
  if (d.sessions.length) {
    for (const s of d.sessions) {
      const head = `### ${s.date} · ${s.durationMin}min · ${s.platform} · ${s.status}${s.attended ? "" : " · NOT ATTENDED"}${s.indexDelta == null ? "" : ` · index Δ ${s.indexDelta >= 0 ? "+" : ""}${s.indexDelta}`}`
      out.push(head)
      if (s.summary) out.push(`Summary: ${s.summary}`)
      if (s.snippet) out.push(`Key quote: "${s.snippet}"`)
      if (s.recos.length) out.push(`Recommendations: ${s.recos.map((r) => `${r.label} ×${r.count}`).join(", ")}`)
      if (s.counselorNote) out.push(`Counsellor note${s.notesStatus ? ` (${s.notesStatus})` : ""}:\n${s.counselorNote}`)
      if (s.clientNote) out.push(`Client-facing note:\n${s.clientNote}`)
    }
  } else {
    out.push("(no sessions logged yet)")
  }

  // ── Assessments ──
  out.push(h("Assessments / tests feeding the scores"))
  out.push(
    d.tests.length
      ? d.tests
          .map(
            (t: TestResult) =>
              `  • ${t.name} (${t.date}): ${t.result}${t.score == null ? "" : ` · score ${t.score}`} · ${t.status} · feeds ${t.feeds}`,
          )
          .join("\n")
      : "  (none)",
  )

  // ── Reports ──
  out.push(h("Reports & career assets produced"))
  out.push(
    d.reports.length
      ? d.reports
          .map(
            (r: CounselorReport) =>
              `  • ${r.title} (${r.type}, ${r.date}) · ${r.shared ? "shared" : "not shared"}${r.recipients.length ? ` → ${r.recipients.join(", ")}` : ""} · ${r.format}`,
          )
          .join("\n")
      : "  (none)",
  )

  // ── Full transcript ──
  out.push(h("Full session transcript (speaker · mm:ss · signal tags)"))
  out.push(transcriptText(client))

  return out.join("\n")
}
