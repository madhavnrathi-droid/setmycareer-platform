// ─────────────────────────────────────────────────────────────────────────────
// Multi-agent architecture — nine specialised agents under one supervisor.
//
// Each agent owns a slice of the reasoning, declares which DATA_SOURCES it draws
// on and which deterministic ENGINE it runs, and exposes a typed input→output
// contract. The supervisor sequences them (some fan out in parallel) and merges
// their outputs into one IntelligenceReport. This registry is the source of truth
// the orchestrator, the docs, and the admin "architecture" view all read from.
// ─────────────────────────────────────────────────────────────────────────────

import type { StudentProfile, IntelligenceReport } from "./types"

export type AgentId =
  | "intake" | "psychometric" | "college_discovery" | "admission"
  | "exam_strategy" | "scholarship_finance" | "roi_outcomes"
  | "employability" | "pathway_planner"

export interface AgentSpec {
  id: AgentId
  name: string
  /** one-line mandate. */
  role: string
  /** DATA_SOURCES ids this agent consults. */
  sources: string[]
  /** deterministic engine(s) it runs, if any. */
  engines: ("admission" | "roi" | "employability" | "scholarship" | "fit")[]
  /** agents whose output it needs first (DAG edges). */
  dependsOn: AgentId[]
  /** what it contributes to the final report. */
  produces: string
  /** can run concurrently with its dependency-free siblings. */
  parallel: boolean
}

export const AGENTS: AgentSpec[] = [
  {
    id: "intake", name: "Intake & Profile", role: "Normalise the student into a complete, typed profile",
    sources: ["digilocker", "apaar"], engines: [], dependsOn: [],
    produces: "Verified academic %, level/stream, category, income — fills gaps before anyone reasons", parallel: false,
  },
  {
    id: "psychometric", name: "Psychometric Fit", role: "Turn aptitude + interest into ranked study domains",
    sources: [], engines: ["fit"], dependsOn: ["intake"],
    produces: "recommendedDomains[] with a why, from the ability battery + interest profile", parallel: true,
  },
  {
    id: "college_discovery", name: "College Discovery", role: "Shortlist real institutions by domain, location, budget, quality",
    sources: ["aishe", "ugc", "nirf", "naac", "nba"], engines: [], dependsOn: ["psychometric"],
    produces: "Candidate colleges + programs, quality-screened (genuine, accredited, ranked)", parallel: false,
  },
  {
    id: "admission", name: "Admission Probability", role: "Estimate the odds of an offer at each shortlisted college",
    sources: ["josaa", "csab"], engines: ["admission"], dependsOn: ["college_discovery"],
    produces: "admissions[]: probability + safe/target/reach band vs real cutoffs", parallel: true,
  },
  {
    id: "exam_strategy", name: "Exam Strategy", role: "Map targets to the exams that gate them + a prep timeline",
    sources: ["josaa", "csab"], engines: [], dependsOn: ["college_discovery"],
    produces: "Required exams, windows, and what score band each target needs", parallel: true,
  },
  {
    id: "scholarship_finance", name: "Scholarship & Finance", role: "Match funding and stress-test affordability",
    sources: ["nsp"], engines: ["scholarship"], dependsOn: ["intake", "college_discovery"],
    produces: "scholarships[]: eligible awards ranked by fit + value, net-cost view", parallel: true,
  },
  {
    id: "roi_outcomes", name: "ROI & Outcomes", role: "Weigh program cost against expected earnings",
    sources: ["nirf"], engines: ["roi"], dependsOn: ["college_discovery"],
    produces: "roi[]: payback years, 10-year net, ROI score per college", parallel: true,
  },
  {
    id: "employability", name: "Employability & Market", role: "Forecast domain demand over the next ~5 years",
    sources: ["ncs", "nsdc"], engines: ["employability"], dependsOn: ["psychometric"],
    produces: "employability[]: outlook, trend, drivers, risks, roles per domain", parallel: true,
  },
  {
    id: "pathway_planner", name: "Pathway Planner", role: "Sequence a primary plan with backups and alternates",
    sources: ["nsdc", "apaar"], engines: [], dependsOn: ["admission", "exam_strategy", "roi_outcomes", "scholarship_finance", "employability"],
    produces: "An ordered plan: primary + safety options, timeline, decision points", parallel: false,
  },
]

export const SUPERVISOR = {
  id: "supervisor" as const,
  name: "Supervisor",
  role: "Orchestrate the nine agents over the DAG, reconcile conflicts, and assemble one report",
  /** how it runs the DAG: dependency-free agents fan out; the planner closes it. */
  policy: "Resolve the agent DAG in topological waves — run every agent whose dependencies are met in parallel, then merge. Down-weight any estimate whose source is stale or whose profile inputs are missing; surface that in `confidence`.",
}

export const getAgent = (id: AgentId) => AGENTS.find((a) => a.id === id)

/** Topologically ordered waves of agent ids — each wave runs in parallel, waves
 *  run in sequence. Drives both the real orchestrator and the architecture view. */
export function agentWaves(): AgentId[][] {
  const done = new Set<AgentId>()
  const waves: AgentId[][] = []
  let guard = 0
  while (done.size < AGENTS.length && guard++ < AGENTS.length + 2) {
    const wave = AGENTS.filter((a) => !done.has(a.id) && a.dependsOn.every((d) => done.has(d))).map((a) => a.id)
    if (!wave.length) break // cycle guard
    wave.forEach((id) => done.add(id))
    waves.push(wave)
  }
  return waves
}

/** Marker type — the supervisor's assembled output is an IntelligenceReport. */
export type SupervisorOutput = IntelligenceReport
export type { StudentProfile }
