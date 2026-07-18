// Vercel Edge function: POST /api/assistant
// Edge runtime — esbuild bundles all imports (incl. ../src core + the AI SDK)
// into one module, and web Request/Response streaming is native here. Delegates
// to the shared core so dev (Vite middleware) and prod run identical logic.
import { runAssistant, type AssistantContext } from "../src/server/assistant-core"
import type { UIMessage } from "ai"

export const config = { runtime: "edge" }

// CORS: the marketing site (a different origin) calls this for its visitor
// guide — JSON POSTs trigger a preflight, so OPTIONS must answer too.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
}
const withCors = (res: Response) => {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS })
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS })
  }
  try {
    const { messages, context, plain } = (await req.json()) as {
      messages: UIMessage[]
      context?: AssistantContext
      plain?: boolean
    }
    return withCors(await runAssistant({
      messages, context, plain,
      geminiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY,
      apiKey: process.env.GROQ_API_KEY,
      openrouterKey: process.env.OPENROUTER_API_KEY,
    }))
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Assistant error" }),
      { status: 500, headers: { "content-type": "application/json", ...CORS } },
    )
  }
}
