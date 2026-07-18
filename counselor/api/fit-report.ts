// Vercel Edge function: POST /api/fit-report
// The AI writer behind the marketing site's Package-Fit result. The site (a
// different origin) POSTs its deterministic report + the respondent's scores and
// own words; we rewrite the prose with the AI provider chain and return it. CORS
// is open because the call is cross-origin (same as /api/assistant). On any
// missing key or failure the core returns { ok:false } and the site keeps its
// deterministic report — this endpoint never 500s the result screen.
import { handleFitReportRequest } from "../src/server/fit-report-core"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  // Groq first, then OpenRouter — deliberately NOT Gemini: the shared Gemini key
  // is free-tier and rate-limited, and its 429 backoff can blow the Edge timeout
  // (this is exactly why /api/report also skips it). One fast generation, or a
  // clean { ok:false } so the site keeps its deterministic report.
  return handleFitReportRequest(req, {
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  })
}
