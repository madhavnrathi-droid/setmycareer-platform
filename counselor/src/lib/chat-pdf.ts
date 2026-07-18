// ─────────────────────────────────────────────────────────────────────────────
// Chat → PDF export (single + bulk), ChatGPT-style.
//
// Dependency-free: we render a clean, branded HTML document into a hidden iframe
// and trigger the browser's print engine (→ "Save as PDF"). That gives crisp,
// selectable text and proper pagination without shipping a PDF library. Works for
// one conversation or for every saved conversation (page-broken, with a cover).
// ─────────────────────────────────────────────────────────────────────────────

import type { UIMessage } from "ai"
import type { StoredChat } from "./assistant-chats"

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Pull the readable text out of a UIMessage's parts. */
function messageText(m: UIMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (m as any).parts
  if (Array.isArray(parts)) {
    return parts
      .filter((p: { type?: string }) => p?.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => String(p.text ?? ""))
      .join("\n")
      .trim()
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return String((m as any).content ?? "").trim()
}

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })

/** One conversation rendered as an article (title + dated Q/A turns). */
function renderChat(chat: StoredChat, opts: { heading?: "h1" | "h2" } = {}): string {
  const Tag = opts.heading ?? "h1"
  const turns = chat.messages
    .map((m) => {
      const text = messageText(m)
      if (!text) return ""
      const who = m.role === "user" ? "You" : "Compass"
      const cls = m.role === "user" ? "turn user" : "turn ai"
      return `<div class="${cls}"><div class="who">${esc(who)}</div><div class="bubble">${esc(text).replace(/\n/g, "<br>")}</div></div>`
    })
    .join("")
  return `
    <section class="chat">
      <${Tag} class="title">${esc(chat.title || "Conversation")}</${Tag}>
      <div class="meta">${esc(fmtDate(chat.updatedAt))} · ${chat.messages.length} messages</div>
      <div class="turns">${turns || '<div class="empty">No messages.</div>'}</div>
    </section>`
}

const STYLES = `
  * { box-sizing: border-box; }
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Montserrat", system-ui, sans-serif; color: #15171a; margin: 0; }
  .brand { display:flex; align-items:center; gap:10px; padding-bottom:14px; margin-bottom:18px; border-bottom:2px solid #111; }
  .brand .mark { width:26px; height:26px; }
  .brand .wm { font-family: Georgia, "Cambo", serif; font-size:18px; letter-spacing:.2px; }
  .brand .sub { margin-left:auto; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#6b7280; }
  .cover { padding: 30mm 0 12mm; border-bottom:1px solid #e5e7eb; margin-bottom:20px; }
  .cover h1 { font-family: Georgia, "Cambo", serif; font-size:30px; margin:0 0 6px; }
  .cover p { color:#6b7280; margin:0; font-size:13px; }
  .chat { break-inside: avoid-page; margin: 0 0 26px; }
  .chat + .chat { page-break-before: always; }
  .title { font-family: Georgia, "Cambo", serif; font-size:21px; margin:0 0 2px; }
  h2.title { font-size:17px; }
  .meta { color:#9ca3af; font-size:11px; margin-bottom:14px; }
  .turn { margin: 0 0 12px; }
  .turn .who { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#6b7280; margin-bottom:3px; }
  .turn .bubble { font-size:13px; line-height:1.55; white-space:normal; }
  .turn.user .bubble { background:#111; color:#fff; padding:9px 12px; border-radius:12px 12px 12px 3px; display:inline-block; max-width:88%; }
  .turn.ai .bubble { color:#15171a; }
  .empty { color:#9ca3af; font-size:12px; }
  .footer { margin-top:18px; padding-top:10px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:10px; }
`

// the brand logomark, inline so the print is self-contained (no asset fetch)
const LOGO = `<svg class="mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.09 8.26L20.51 8.26L15.21 12.13L17.3 18.39L12 14.52L6.7 18.39L8.79 12.13L3.49 8.26L9.91 8.26L12 2Z" fill="#111"/></svg>`

function wrapDoc(title: string, inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLES}</style></head>
  <body>
    <div class="brand">${LOGO}<span class="wm">Setmycareer</span><span class="sub">Compass · Conversation export</span></div>
    ${inner}
    <div class="footer">Exported from SetMyCareer Compass · ${esc(fmtDate(Date.now()))}</div>
  </body></html>`
}

/** Print an HTML document via a hidden iframe (no popup, no library). */
function printHtml(html: string): void {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) { iframe.remove(); return }
  doc.open(); doc.write(html); doc.close()
  const done = () => setTimeout(() => iframe.remove(), 1000)
  const win = iframe.contentWindow!
  win.onafterprint = done
  // give the iframe a tick to lay out before printing
  setTimeout(() => { win.focus(); win.print(); done() }, 250)
}

/** Export a single conversation to PDF (via the print dialog → Save as PDF). */
export function exportChatPdf(chat: StoredChat): void {
  printHtml(wrapDoc(chat.title || "Conversation", renderChat(chat, { heading: "h1" })))
}

/** Export every saved conversation as one PDF — cover + page-broken chats. */
export function exportAllChatsPdf(chats: StoredChat[]): void {
  if (chats.length === 0) return
  const cover = `<div class="cover"><h1>Compass conversations</h1><p>${chats.length} saved conversation${chats.length === 1 ? "" : "s"} · exported ${esc(fmtDate(Date.now()))}</p></div>`
  const body = chats.map((c) => renderChat(c, { heading: "h2" })).join("")
  printHtml(wrapDoc("Compass conversations", cover + body))
}
