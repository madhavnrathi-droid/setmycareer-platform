// Real speech-to-text core, shared by the Vercel edge function
// (api/transcribe.ts) and the Vite dev middleware so dev and prod are identical.
// Uses Groq's hosted Whisper (whisper-large-v3-turbo) — fast, accurate, cheap.
// The API key is passed in by each caller (never read from env here).

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
const MODEL = "whisper-large-v3-turbo"

export type TranscriptSegment = { start: number; end: number; text: string }
export type TranscriptionResult = { text: string; segments: TranscriptSegment[]; durationSec?: number }

/** Send an audio blob/file to Groq Whisper and return text + timed segments. */
export async function transcribeAudio(opts: {
  file: File | Blob
  filename?: string
  apiKey?: string
}): Promise<TranscriptionResult> {
  if (!opts.apiKey) throw new Error("Missing GROQ_API_KEY")
  const form = new FormData()
  form.append("file", opts.file, opts.filename ?? "audio.webm")
  form.append("model", MODEL)
  form.append("response_format", "verbose_json")
  form.append("temperature", "0")

  const r = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}` },
    body: form,
  })
  if (!r.ok) {
    const detail = await r.text().catch(() => "")
    throw new Error(`Groq transcription ${r.status}: ${detail.slice(0, 300)}`)
  }
  const data = (await r.json()) as {
    text?: string
    duration?: number
    segments?: { start: number; end: number; text: string }[]
  }
  return {
    text: (data.text ?? "").trim(),
    durationSec: data.duration,
    segments: (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })),
  }
}

/** Handle a POST with a multipart `audio` field → JSON {text, segments}. Used by
 *  both the edge function and the dev middleware (which build a web Request). */
export async function handleTranscribeRequest(request: Request, apiKey?: string): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }
  try {
    const form = await request.formData()
    const file = form.get("audio")
    if (!(file instanceof Blob)) {
      return Response.json({ error: "No audio file in 'audio' field" }, { status: 400 })
    }
    // Groq caps single requests at 25MB; the platform body limit is lower still.
    if (file.size > 24 * 1024 * 1024) {
      return Response.json({ error: "Audio too large for a single pass (25MB max)." }, { status: 413 })
    }
    const filename = file instanceof File ? file.name : "audio.webm"
    const out = await transcribeAudio({ file, filename, apiKey })
    return Response.json(out)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 },
    )
  }
}
