// Vercel Edge function: POST /api/livekit-token  ({ room, identity, name })
// Mints a LiveKit access token (or returns { demo:true } if keys aren't set).
import { handleTokenRequest } from "../src/server/livekit-token"

export const config = { runtime: "edge" }

export default function handler(req: Request): Promise<Response> {
  return handleTokenRequest(req, {
    apiKey: process.env.LIVEKIT_API_KEY,
    secret: process.env.LIVEKIT_API_SECRET,
    url: process.env.LIVEKIT_URL,
  })
}
