// Career Intelligence — public surface. One import for every AI tool + UI.
//
//   import { runIntelligence, buildIntelligenceContext, AGENTS, DATA_SOURCES } from "@/intelligence"

export * from "./types"
export * from "./sources"
export * from "./agents"
export * from "./engines"
export { runIntelligence } from "./orchestrator"
export type { IntelligenceOptions } from "./orchestrator"
export { buildIntelligenceContext, formatReport, profileFromAccount, CAREER_INTELLIGENCE_KNOWLEDGE } from "./context"
export { COLLEGES, EXAMS, SCHOLARSHIPS, getCollege, getExam, getScholarship } from "./data"
