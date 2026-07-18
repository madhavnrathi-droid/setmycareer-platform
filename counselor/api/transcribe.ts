// Vercel Edge function: POST /api/transcribe  (multipart: audio=<blob>)
// Edge runtime — esbuild bundles the ../src core; web FormData/Request are native.
// Real speech-to-text via Groq Whisper. Same key as the assistant (GROQ_API_KEY).
import { handleTranscribeRequest } from "../src/server/transcribe-core"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  return handleTranscribeRequest(req, process.env.GROQ_API_KEY)
}
