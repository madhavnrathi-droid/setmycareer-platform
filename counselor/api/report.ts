// Vercel Edge function: POST /api/report  (a JSON scaffold payload the caller builds)
// Real AI report-prose generation via Groq. Same key as the other functions.
import { handleReportRequest } from "../src/server/report-core"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  return handleReportRequest(req, process.env.GROQ_API_KEY, process.env.OPENROUTER_API_KEY)
}
