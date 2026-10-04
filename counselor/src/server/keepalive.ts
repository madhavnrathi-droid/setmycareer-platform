// Long AI work behind a Vercel Edge function.
//
// An Edge function must START its response within 25 s, but may keep streaming for
// minutes. On the free provider tiers a report, a set of session notes or a test
// consolidation can take longer than 25 s (a per-minute token cap pushes work onto the
// slower fallback model), and the platform then kills the function with a 504, so even
// the parts that had finished are lost.
//
// These helpers open the response at once and send a space every few seconds until the
// body is ready. Leading whitespace is valid JSON, so callers keep using `res.json()`.
// The status line has already been sent by then, so it is always 200: callers must read
// success from the body ({ error } / { ok }), which every current caller already does.

const enc = new TextEncoder()

function keepaliveStream(produce: () => Promise<string>, everyMs: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(enc.encode(" "))
      const beat = setInterval(() => {
        try { controller.enqueue(enc.encode(" ")) } catch { /* closed */ }
      }, everyMs)
      try {
        controller.enqueue(enc.encode(await produce()))
      } finally {
        clearInterval(beat)
        controller.close()
      }
    },
  })
}

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }

/** Stream `work()`'s result as JSON; a thrown error arrives as {"error"}. */
export function jsonWithKeepalive(work: () => Promise<unknown>, everyMs = 5000): Response {
  return new Response(
    keepaliveStream(async () => {
      try {
        return JSON.stringify(await work())
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Generation failed" })
      }
    }, everyMs),
    { headers: HEADERS },
  )
}

/** Stream the body of a Response produced by `work()` (its status is folded into the body). */
export function responseWithKeepalive(work: () => Promise<Response>, everyMs = 5000): Response {
  return new Response(
    keepaliveStream(async () => {
      try {
        return await (await work()).text()
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Generation failed" })
      }
    }, everyMs),
    { headers: HEADERS },
  )
}
