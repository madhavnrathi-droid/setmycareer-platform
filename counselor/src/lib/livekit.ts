/* LiveKit token helper — same-origin POST to the edge function. Returns a real
   token when LiveKit keys are set, else { demo:true } so the call room falls back
   to a local preview. */

export type LiveKitTokenResult =
  | { token: string; url: string; room: string; identity: string }
  | { demo: true; reason?: string }

export async function fetchLiveKitToken(room: string, identity: string, name?: string): Promise<LiveKitTokenResult> {
  try {
    const r = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, identity, name }),
    })
    if (!r.ok) return { demo: true, reason: `token ${r.status}` }
    return (await r.json()) as LiveKitTokenResult
  } catch {
    return { demo: true, reason: "unreachable" }
  }
}
