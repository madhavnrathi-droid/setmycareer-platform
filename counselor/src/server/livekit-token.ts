// LiveKit access-token minting (shared by the edge function + Vite dev middleware).
// Signs a LiveKit JWT (HS256) with Web Crypto — no node SDK, edge-compatible. If
// LIVEKIT_API_KEY/SECRET aren't set, returns { demo: true } so the call room
// gracefully falls back to a local preview instead of failing.

function b64url(input: ArrayBuffer | string): string {
  let bytes: Uint8Array
  if (typeof input === "string") bytes = new TextEncoder().encode(input)
  else bytes = new Uint8Array(input)
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function mintToken(opts: {
  apiKey: string
  secret: string
  identity: string
  room: string
  name?: string
  ttlSec?: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "HS256", typ: "JWT" }
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    name: opts.name ?? opts.identity,
    nbf: now,
    exp: now + (opts.ttlSec ?? 60 * 60 * 6),
    video: { room: opts.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
  }
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(opts.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  return `${data}.${b64url(sig)}`
}

export async function handleTokenRequest(
  request: Request,
  env: { apiKey?: string; secret?: string; url?: string },
): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  try {
    const { room, identity, name } = (await request.json()) as { room?: string; identity?: string; name?: string }
    if (!room || !identity) return Response.json({ error: "room and identity are required" }, { status: 400 })
    if (!env.apiKey || !env.secret || !env.url) {
      // not configured → the room runs in local-preview demo mode
      return Response.json({ demo: true, reason: "LiveKit keys not set" })
    }
    const token = await mintToken({ apiKey: env.apiKey, secret: env.secret, identity, room, name })
    return Response.json({ token, url: env.url, room, identity })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "token error" }, { status: 500 })
  }
}
