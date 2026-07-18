// Vercel Edge function: POST /api/notes  ({ transcript, clientName })
// Real AI session-notes generation via Groq. Same key as the other functions.
import { handleNotesRequest } from "../src/server/notes-core"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  return handleNotesRequest(req, process.env.GROQ_API_KEY, process.env.OPENROUTER_API_KEY)
}
