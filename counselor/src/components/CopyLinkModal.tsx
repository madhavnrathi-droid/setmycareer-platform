// Google-Meet-style "here's your link" dialog — centered card over a dim tint,
// link in a pill with one obvious Copy action. Shared by test links + meet links.

import { useEffect, useState } from "react"
import { Copy, Check, X } from "lucide-react"

export function CopyLinkModal({ title, subtitle, url, onClose }: {
  title: string
  subtitle?: string
  url: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {
      const ta = document.createElement("textarea")
      ta.value = url; document.body.appendChild(ta); ta.select()
      document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-float)]">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
          <X className="size-4" />
        </button>
        <p className="text-[15px] font-medium text-foreground">{title}</p>
        {subtitle && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 py-2 pl-3.5 pr-2">
          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{url.replace(/^https?:\/\//, "")}</span>
          <button
            onClick={copy}
            aria-label="Copy link"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-transform hover:scale-105"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
        {copied && <p className="mt-2 text-[12px] text-muted-foreground">Copied to clipboard</p>}
      </div>
    </div>
  )
}
