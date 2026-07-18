// Real AI session-notes generation, shared by the edge function (api/notes.ts)
// and the Vite dev middleware. Drafts two audiences from the transcript:
//   • counselor — private, observational working notes + next steps
//   • client    — warm, plain-language notes shown once the counselor approves
// Grounded strictly in the transcript; never invents facts. API key passed in.
//
// Uses generateText + defensive JSON parsing (Groq's llama-3.3 doesn't support
// the json_schema structured-output mode, so we instruct + parse instead).

import { generateTextWithFallback } from "./ai-providers"

export type GeneratedNotes = { summary: string; counselor: string; client: string }

/** Pull a JSON object out of an LLM response, tolerating fences / stray prose. */
function parseNotes(raw: string): GeneratedNotes {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const a = s.indexOf("{")
  const b = s.lastIndexOf("}")
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try {
    const o = JSON.parse(s) as Partial<GeneratedNotes>
    return {
      summary: String(o.summary ?? "").trim(),
      counselor: String(o.counselor ?? "").trim(),
      client: String(o.client ?? "").trim(),
    }
  } catch {
    return { summary: "", counselor: raw.trim().slice(0, 800), client: "" }
  }
}

export async function generateNotes(opts: {
  transcript: { speaker?: string; text: string }[]
  clientName?: string
  apiKey?: string
  openrouterKey?: string
}): Promise<GeneratedNotes> {
  const transcriptText = opts.transcript
    .map((l) => (l.speaker ? `${l.speaker}: ` : "") + l.text)
    .join("\n")
    .slice(0, 9000)

  const text = await generateTextWithFallback(
    { groq: opts.apiKey, openrouter: opts.openrouterKey },
    {
      temperature: 0.3,
      system:
        "You are a career-counseling assistant drafting session notes from a transcript. Be faithful to the transcript; never invent facts not present. Respond with ONLY a JSON object — no markdown, no commentary — with exactly these string keys: " +
        '"summary" (one concise sentence summarising the session), ' +
        '"counselor" (3-5 short lines of private, observational working notes plus 1-2 concrete next steps; career-focused, clinical where relevant), ' +
        '"client" (2-4 warm, plain-language, second-person sentences the client will read; encouraging and concrete, no jargon).',
      prompt: `Client: ${opts.clientName ?? "the client"}\n\nSession transcript:\n${transcriptText}\n\nReturn the JSON object now.`,
    },
  )
  return parseNotes(text)
}

export async function handleNotesRequest(request: Request, apiKey?: string, openrouterKey?: string): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  try {
    const { transcript, clientName } = (await request.json()) as {
      transcript?: { speaker?: string; text: string }[]
      clientName?: string
    }
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return Response.json({ error: "No transcript provided" }, { status: 400 })
    }
    const notes = await generateNotes({ transcript, clientName, apiKey, openrouterKey })
    return Response.json(notes)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Notes generation failed" },
      { status: 500 },
    )
  }
}
