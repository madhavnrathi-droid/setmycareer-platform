import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Dev parity for the Compass API functions: serve POST /api/assistant and
// /api/transcribe locally using the same shared cores the Vercel functions use.
// Registered in the configureServer body so they run BEFORE Vite's proxy
// middleware (which forwards other /api/* to the deployed backend).
function apiDev(apiKey?: string, orKey?: string, livekit?: { apiKey?: string; secret?: string; url?: string }, razorpay?: { id?: string; secret?: string }, supabase?: { url?: string; key?: string }, geminiKey?: string): Plugin {
  return {
    name: 'api-dev',
    configureServer(server: ViteDevServer) {
      // Google Ads marketing spend → marketing-core (server-only creds)
      server.middlewares.use('/api/marketing', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const { runMarketing } = await server.ssrLoadModule('/src/server/marketing-core.ts')
          const response: Response = await runMarketing({
            devToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN, clientId: process.env.GOOGLE_ADS_CLIENT_ID,
            clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET, refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
            customerId: process.env.GOOGLE_ADS_CUSTOMER_ID, loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
            currency: process.env.GOOGLE_ADS_CURRENCY,
          })
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500; res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ connected: false, error: err instanceof Error ? err.message : 'Marketing error' }))
        }
      })

      // app-native persistence (chats + per-user state) → Supabase via cloud-core
      server.middlewares.use('/api/cloud', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const { runCloud } = await server.ssrLoadModule('/src/server/cloud-core.ts')
          const response: Response = await runCloud(JSON.parse(Buffer.concat(chunks).toString() || '{}'), supabase ?? {})
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Cloud error' }))
        }
      })
      // streaming AI assistant
      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const body = Buffer.concat(chunks).toString('utf8')
          const { runAssistant } = await server.ssrLoadModule('/src/server/assistant-core.ts')
          const { messages, context, plain } = JSON.parse(body || '{}')
          const response: Response = await runAssistant({ messages, context, plain, apiKey, openrouterKey: orKey, geminiKey })
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          const reader = response.body?.getReader()
          if (reader) {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(Buffer.from(value))
            }
          }
          res.end()
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Assistant error' }))
        }
      })

      // AI session notes (JSON transcript → Groq structured object)
      server.middlewares.use('/api/notes', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request('http://local/api/notes', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Buffer.concat(chunks),
          })
          const { handleNotesRequest } = await server.ssrLoadModule('/src/server/notes-core.ts')
          const response: Response = await handleNotesRequest(request, apiKey, orKey)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Notes error' }))
        }
      })

      // AI report prose (JSON scaffold payload → Groq narrative)
      server.middlewares.use('/api/report', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request('http://local/api/report', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Buffer.concat(chunks),
          })
          const { handleReportRequest } = await server.ssrLoadModule('/src/server/report-core.ts')
          const response: Response = await handleReportRequest(request, apiKey, orKey)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Report error' }))
        }
      })

      // real speech-to-text (multipart audio → Groq Whisper)

      server.middlewares.use('/api/consolidate', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request('http://local/api/consolidate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Buffer.concat(chunks),
          })
          const { handleConsolidateRequest } = await server.ssrLoadModule('/src/server/consolidate-core.ts')
          const response: Response = await handleConsolidateRequest(request, { gemini: geminiKey, groq: apiKey, openrouter: orKey })
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Consolidate error' }))
        }
      })

      server.middlewares.use('/api/transcribe', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request('http://local/api/transcribe', {
            method: 'POST',
            headers: { 'content-type': req.headers['content-type'] || '' },
            body: Buffer.concat(chunks),
          })
          const { handleTranscribeRequest } = await server.ssrLoadModule('/src/server/transcribe-core.ts')
          const response: Response = await handleTranscribeRequest(request, apiKey)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Transcription error' }))
        }
      })

      // LiveKit access token (or { demo:true } if keys aren't set)
      server.middlewares.use('/api/livekit-token', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const request = new Request('http://local/api/livekit-token', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Buffer.concat(chunks),
          })
          const { handleTokenRequest } = await server.ssrLoadModule('/src/server/livekit-token.ts')
          const response: Response = await handleTokenRequest(request, livekit ?? {})
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Token error' }))
        }
      })

      // Real infrastructure usage (Razorpay txns, Supabase counts, OpenRouter credits)
      server.middlewares.use('/api/providers', async (_req, res) => {
        try {
          const { runProviders } = await server.ssrLoadModule('/api/providers.ts')
          const response: Response = await runProviders({
            razorpay: razorpay ?? {},
            supabase: supabase ?? {},
            openrouter: orKey,
            groq: apiKey,
            // the dev `livekit` object uses `apiKey`; the endpoint expects `key`
            livekit: { key: livekit?.apiKey, secret: livekit?.secret, url: livekit?.url },
          })
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Providers error' }))
        }
      })

      // Razorpay — config / order / verify / refund (real REST when keys are set).
      // CORS + OPTIONS mirror the prod handler so the marketing site can call it.
      server.middlewares.use('/api/razorpay', async (req, res) => {
        res.setHeader('access-control-allow-origin', '*')
        res.setHeader('access-control-allow-methods', 'POST, OPTIONS')
        res.setHeader('access-control-allow-headers', 'content-type')
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const { runRazorpay } = await server.ssrLoadModule('/api/razorpay.ts')
          const response: Response = await runRazorpay(JSON.parse(Buffer.concat(chunks).toString() || '{}'), razorpay ?? {}, supabase ?? {})
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Razorpay error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load all env (no VITE_ prefix filter) so the dev middleware can reach GROQ_API_KEY
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), apiDev(env.GROQ_API_KEY, env.OPENROUTER_API_KEY, { apiKey: env.LIVEKIT_API_KEY, secret: env.LIVEKIT_API_SECRET, url: env.LIVEKIT_URL }, { id: env.RAZORPAY_KEY_ID, secret: env.RAZORPAY_KEY_SECRET }, { url: env.SUPABASE_URL, key: env.SUPABASE_KEY }, env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://setmycareer.vercel.app',
          changeOrigin: true,
          // let the local API functions fall through to the dev middleware above
          bypass: (req) =>
            req.url && /^\/api\/(assistant|transcribe|notes|report|livekit-token|razorpay|cloud|marketing|providers)/.test(req.url)
              ? req.url
              : undefined,
        },
      },
    },
  }
})
