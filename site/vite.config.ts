import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the manifest maps each page module to its chunk, so scripts/prerender.mjs can emit
  // <link rel="modulepreload"> for exactly the chunk a route needs
  build: { manifest: true },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // DEV ONLY: the /api/* Vercel functions don't run under plain `vite`, so proxy
  // them to the deployed origin for local verification. No effect on the build.
  server: {
    proxy: {
      "/api": { target: "https://site-madhavs-projects-56d7586e.vercel.app", changeOrigin: true, secure: true },
    },
  },
})
