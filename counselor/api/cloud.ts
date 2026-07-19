// Vercel Edge function: POST /api/cloud
// Relays the browser's app-native persistence (chats + per-user state) to a
// PostgREST backend via the shared cloud-core, using server-only credentials.
//
// SUPABASE_URL / SUPABASE_KEY are UNSET in production as of 2026-07-19, so this
// answers {ok:false, disabled:true} and the client stays local-only by design.
import { runCloud } from "../src/server/cloud-core"

export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  try {
    const body = await req.json()
    return await runCloud(body, {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_KEY,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Cloud error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}
