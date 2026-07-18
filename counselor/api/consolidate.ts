// Vercel Edge function: POST /api/consolidate — AI consolidation for the guest
// assessment report (Gemini first, then Groq/OpenRouter).
import { handleConsolidateRequest } from "../src/server/consolidate-core"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  return handleConsolidateRequest(req, {
    gemini: process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  })
}
