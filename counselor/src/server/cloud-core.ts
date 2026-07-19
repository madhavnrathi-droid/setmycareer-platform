// ─────────────────────────────────────────────────────────────────────────────
// Cloud store core — the server side of SetMyCareer's app-native persistence.
//
// ⚠️ CURRENTLY DORMANT (2026-07-19). The Supabase project this pointed at was
// retired, and SUPABASE_URL / SUPABASE_KEY are unset in production. With no
// config this returns {ok:false, disabled:true} at HTTP 200 and the browser
// falls back to per-user localStorage — a designed, tested path, not a failure.
// The code is kept deliberately: it speaks plain PostgREST, so ANY Postgres
// re-enables the server store by setting those two env vars. No code change.
//
// The browser NEVER talks to the database directly; it only POSTs to /api/cloud,
// and this stateless core relays to PostgREST with a server-only key. Two
// tables, both scoped by (app, user_id):
//   • app_chats — saved AI conversations (one row each, ≤50/user enforced client-side)
//   • app_state — generic per-user key/value documents (every former localStorage store)
//
// Same shape as razorpay-core / notes-core: a single `runCloud(body, env)` that
// dev (Vite middleware) and prod (Vercel function) both call, so they're identical.
//
// Security: access is function-gated. Per-user Postgres RLS (auth.uid()) and a
// service-role key are required hardening BEFORE any future server store is
// switched on; until then the user_id scoping here is the isolation boundary.
// ─────────────────────────────────────────────────────────────────────────────

export interface CloudEnv {
  url?: string // SUPABASE_URL — PostgREST base, e.g. https://xxxx.supabase.co (unset)
  key?: string // SUPABASE_KEY — anon/publishable key (unset; service-role later)
}

const APPS = new Set(["counsellor", "client", "admin"])

/** A saved chat row, mirrored from the client's StoredChat. */
interface ChatRow {
  id: string
  title?: string
  messages?: unknown
  created_at?: string
  updated_at?: string
}

type CloudRequest =
  | { kind: "state"; op: "getAll"; app: string; userId: string }
  | { kind: "state"; op: "set"; app: string; userId: string; key: string; value: unknown }
  | { kind: "state"; op: "remove"; app: string; userId: string; key: string }
  | { kind: "chats"; op: "list"; app: string; userId: string }
  | { kind: "chats"; op: "upsert"; app: string; userId: string; chat: ChatRow }
  | { kind: "chats"; op: "remove"; app: string; userId: string; id: string }
  | { kind: "chats"; op: "clear"; app: string; userId: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const enc = encodeURIComponent

/** Is the cloud store configured (env present)? When not, the client falls back
 *  to local-only mode so the app still works offline / before keys are set. */
export function cloudConfigured(env: CloudEnv): boolean {
  return !!(env.url && env.key)
}

export async function runCloud(raw: unknown, env: CloudEnv): Promise<Response> {
  if (!cloudConfigured(env)) {
    // not configured → tell the client to stay local-only (not an error)
    return json({ ok: false, disabled: true, error: "Cloud store not configured" }, 200)
  }
  const req = raw as CloudRequest
  if (!req || typeof req !== "object") return json({ ok: false, error: "Bad request" }, 400)
  const app = String((req as { app?: unknown }).app ?? "")
  const userId = String((req as { userId?: unknown }).userId ?? "").trim()
  if (!APPS.has(app)) return json({ ok: false, error: "Unknown app" }, 400)
  if (!userId) return json({ ok: false, error: "Missing user" }, 400)

  const base = env.url!.replace(/\/$/, "") + "/rest/v1"
  const headers = (extra?: Record<string, string>): Record<string, string> => ({
    apikey: env.key!,
    authorization: `Bearer ${env.key!}`,
    "content-type": "application/json",
    ...extra,
  })

  try {
    switch (`${req.kind}:${req.op}`) {
      // ── app_state ────────────────────────────────────────────────────────
      case "state:getAll": {
        const r = await fetch(
          `${base}/app_state?app=eq.${enc(app)}&user_id=eq.${enc(userId)}&select=key,value`,
          { headers: headers() },
        )
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        const rows = (await r.json()) as { key: string; value: unknown }[]
        const map: Record<string, unknown> = {}
        for (const row of rows) map[row.key] = row.value
        return json({ ok: true, state: map })
      }
      case "state:set": {
        const { key, value } = req as Extract<CloudRequest, { op: "set" }>
        if (!key) return json({ ok: false, error: "Missing key" }, 400)
        const r = await fetch(`${base}/app_state`, {
          method: "POST",
          headers: headers({ prefer: "resolution=merge-duplicates,return=minimal" }),
          body: JSON.stringify({ app, user_id: userId, key, value: value ?? null, updated_at: new Date().toISOString() }),
        })
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true })
      }
      case "state:remove": {
        const { key } = req as Extract<CloudRequest, { op: "remove"; kind: "state" }>
        const r = await fetch(
          `${base}/app_state?app=eq.${enc(app)}&user_id=eq.${enc(userId)}&key=eq.${enc(key)}`,
          { method: "DELETE", headers: headers({ prefer: "return=minimal" }) },
        )
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true })
      }

      // ── app_chats ────────────────────────────────────────────────────────
      case "chats:list": {
        const r = await fetch(
          `${base}/app_chats?app=eq.${enc(app)}&user_id=eq.${enc(userId)}&order=updated_at.desc&select=id,title,messages,created_at,updated_at`,
          { headers: headers() },
        )
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true, chats: await r.json() })
      }
      case "chats:upsert": {
        const { chat } = req as Extract<CloudRequest, { op: "upsert" }>
        if (!chat?.id) return json({ ok: false, error: "Missing chat id" }, 400)
        const now = new Date().toISOString()
        const r = await fetch(`${base}/app_chats`, {
          method: "POST",
          headers: headers({ prefer: "resolution=merge-duplicates,return=minimal" }),
          body: JSON.stringify({
            id: chat.id,
            app,
            user_id: userId,
            title: chat.title ?? "New chat",
            messages: chat.messages ?? [],
            created_at: chat.created_at ?? now,
            updated_at: chat.updated_at ?? now,
          }),
        })
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true })
      }
      case "chats:remove": {
        const { id } = req as Extract<CloudRequest, { op: "remove"; kind: "chats" }>
        const r = await fetch(
          `${base}/app_chats?app=eq.${enc(app)}&user_id=eq.${enc(userId)}&id=eq.${enc(id)}`,
          { method: "DELETE", headers: headers({ prefer: "return=minimal" }) },
        )
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true })
      }
      case "chats:clear": {
        const r = await fetch(
          `${base}/app_chats?app=eq.${enc(app)}&user_id=eq.${enc(userId)}`,
          { method: "DELETE", headers: headers({ prefer: "return=minimal" }) },
        )
        if (!r.ok) return json({ ok: false, error: await r.text() }, 502)
        return json({ ok: true })
      }
      default:
        return json({ ok: false, error: "Unknown op" }, 400)
    }
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Cloud error" }, 500)
  }
}
