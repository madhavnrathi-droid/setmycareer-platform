// Admin → Test links. Mint unique /t/<token> assessment links (no account needed
// to take them), keep the minted list in the shared cloud store, copy with the
// Meet-style dialog, and export the whole list as a CSV sheet.

import { useEffect, useMemo, useState } from "react"
import { Link2, Plus, Download, Copy } from "lucide-react"
import { toast } from "sonner"
import { cloudStateGetAllFor, cloudStateSetFor } from "@/lib/cloud"
import { mintToken } from "@/guest/guest-store"
import { CopyLinkModal } from "@/components/CopyLinkModal"

interface TestLinkRow { token: string; createdAt: string; label?: string }
const STORE_KEY = "guest.test-links"
// one shared scope so every admin sees the same list
const SCOPE = { app: "admin" as const, userId: "shared" }

export function AdminTestLinks() {
  const [rows, setRows] = useState<TestLinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState("1")
  const [justMinted, setJustMinted] = useState<string | null>(null)
  const base = useMemo(() => `${window.location.origin}/t/`, [])

  useEffect(() => {
    void (async () => {
      const all = await cloudStateGetAllFor(SCOPE.app, SCOPE.userId)
      const v = all?.[STORE_KEY]
      if (Array.isArray(v)) setRows(v as TestLinkRow[])
      setLoading(false)
    })()
  }, [])

  const persist = async (next: TestLinkRow[]) => {
    setRows(next)
    const ok = await cloudStateSetFor(SCOPE.app, SCOPE.userId, STORE_KEY, next)
    if (!ok) toast.error("Couldn't sync the list to the cloud store — links still work, but re-generate the sheet before sharing.")
  }

  const mint = async () => {
    const n = Math.max(1, Math.min(200, Number(count) || 1))
    const now = new Date().toISOString()
    const minted: TestLinkRow[] = Array.from({ length: n }, () => ({ token: mintToken(), createdAt: now }))
    await persist([...minted, ...rows])
    if (n === 1) setJustMinted(minted[0].token)
    else toast.success(`${n} test links generated`)
  }

  const copyOne = async (token: string) => {
    await navigator.clipboard.writeText(base + token).catch(() => {})
    toast.success("Link copied")
  }

  const downloadCsv = () => {
    const lines = ["link,token,created", ...rows.map((r) => `${base}${r.token},${r.token},${r.createdAt}`)]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `smc-test-links-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Shareable test links</h2>
          <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Links are REUSABLE — the same link can go to many people, no account needed. Every new
            device starts fresh at the details form (Personality → Interest → timed Ability →
            report); on a shared device the taker can hand off with "start fresh". Results stay on
            the taker's device — they download the PDF and send it back. Links never expire.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-16 rounded-lg border border-border bg-card px-2.5 py-2 text-center text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="How many links"
          />
          <button onClick={() => void mint()} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background">
            <Plus className="size-4" /> Generate
          </button>
          <button onClick={downloadCsv} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium disabled:opacity-40">
            <Download className="size-4" /> CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="px-4 py-6 text-[13px] text-muted-foreground">Loading the minted list…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted-foreground">No links yet — generate the first batch above.</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.token} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i ? "1px solid var(--border)" : undefined }}>
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{base}{r.token}</span>
              <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:block">
                {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => void copyOne(r.token)} aria-label="Copy link"
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary">
                <Copy className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {justMinted && (
        <CopyLinkModal
          title="Your test link is ready"
          subtitle="Share it with as many people as you like — each person starts fresh on their own device and downloads their own PDF report."
          url={base + justMinted}
          onClose={() => setJustMinted(null)}
        />
      )}
    </div>
  )
}
