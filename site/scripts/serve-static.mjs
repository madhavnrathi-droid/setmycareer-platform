#!/usr/bin/env node
//
// Test harness that serves dist/ the way Vercel actually does, so prerendered
// output can be verified locally before deploying.
//
// `vite preview` is NOT a faithful harness: it applies an SPA fallback to every
// request, so it returns dist/index.html for /pricing and /blog and makes all 244
// prerendered files look identical. That masked the whole prerender in testing.
//
// Vercel's routing order (the part that matters here):
//   1. static filesystem — /pricing resolves to dist/pricing/index.html
//   2. rewrites — anything still unmatched falls through to /app.html (the SPA shell)
//
// Usage: node scripts/serve-static.mjs [port]

import http from "node:http"
import fs from "node:fs/promises"
import path from "node:path"
import { createReadStream } from "node:fs"

const DIST = path.join(process.cwd(), "dist")
const PORT = Number(process.argv[2] || 4180)

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".ico": "image/x-icon", ".pdf": "application/pdf",
}

const stat = async (p) => { try { return await fs.stat(p) } catch { return null } }

/** Resolve a URL path to a file exactly as Vercel would. */
async function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/"
  const rel = clean === "/" ? "index.html" : clean.replace(/^\//, "")
  const direct = path.join(DIST, rel)

  // guard against path traversal out of dist/
  if (!direct.startsWith(DIST)) return null

  const s = await stat(direct)
  if (s?.isFile()) return direct
  if (s?.isDirectory()) {
    const idx = path.join(direct, "index.html")
    if ((await stat(idx))?.isFile()) return idx
  }
  // "/pricing" with no extension -> dist/pricing/index.html
  if (!path.extname(rel)) {
    const idx = path.join(DIST, rel, "index.html")
    if ((await stat(idx))?.isFile()) return idx
  }
  return null
}

http.createServer(async (req, res) => {
  let file = await resolve(req.url || "/")
  let status = 200
  if (!file) {
    // the SPA rewrite in vercel.json — unprerendered routes render client-side
    file = path.join(DIST, "app.html")
    if (!(await stat(file))?.isFile()) { res.writeHead(404).end("not found"); return }
  }
  res.writeHead(status, {
    "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  })
  createReadStream(file).pipe(res)
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving dist/ (Vercel-style: filesystem first, /app.html fallback) on http://127.0.0.1:${PORT}`)
})
