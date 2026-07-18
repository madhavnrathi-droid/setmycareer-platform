// Coupons & refunds — the admin money desk. Create/list coupons (server-backed
// ones discount real Razorpay orders), see redemptions, and issue refunds (real
// Razorpay refund when a payment id is present). Everything posts to the activity
// stream and rolls up into Revenue & subscriptions.

import { useMemo, useState } from "react"
import { Ticket, RotateCcw, Plus, Trash2 } from "lucide-react"
import { fmtINR } from "../admin-data"
import { useClientDirectory } from "../client-directory"
import {
  useCoupons, useRefunds, useCommerceMetrics, createCoupon, toggleCoupon, deleteCoupon, issueRefund, type Coupon,
} from "../commerce-store"
import { Scorecard } from "../dash"
import { Modal, Field, fieldBox, btnPrimary, btnGhost, tableHead, td } from "../ui"
import { cn } from "@/lib/utils"

const rupees = (paise: number) => fmtINR(Math.round(paise / 100))
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const couponValue = (c: Coupon) => (c.kind === "percent" ? `${c.value}% off${c.maxOff ? ` (max ${rupees(c.maxOff)})` : ""}` : `${rupees(c.value)} off`)

export function NewCouponModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("")
  const [kind, setKind] = useState<"percent" | "flat">("percent")
  const [value, setValue] = useState("")
  const [maxOff, setMaxOff] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [limit, setLimit] = useState("")
  const [expiry, setExpiry] = useState("")
  const ok = code.trim().length >= 3 && Number(value) > 0
  const save = () => {
    if (!ok) return
    createCoupon({
      code, kind, value: kind === "percent" ? Number(value) : Math.round(Number(value) * 100),
      maxOff: maxOff ? Math.round(Number(maxOff) * 100) : undefined,
      minAmount: minAmount ? Math.round(Number(minAmount) * 100) : undefined,
      limit: limit ? Number(limit) : undefined, expiry: expiry || undefined, active: true,
    })
    onClose()
  }
  return (
    <Modal title="New coupon" subtitle="Discount codes for the checkout." onClose={onClose} wide
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={save} disabled={!ok} className={btnPrimary}>Create coupon</button></>}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Code *"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EARLY25" className={fieldBox} autoFocus /></Field>
        <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as "percent" | "flat")} className={fieldBox}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></Field>
        <Field label={kind === "percent" ? "Percent (%) *" : "Amount (₹) *"}><input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} className={fieldBox} inputMode="numeric" /></Field>
        {kind === "percent" && <Field label="Max discount (₹)"><input value={maxOff} onChange={(e) => setMaxOff(e.target.value.replace(/[^\d.]/g, ""))} className={fieldBox} inputMode="numeric" /></Field>}
        <Field label="Min order (₹)"><input value={minAmount} onChange={(e) => setMinAmount(e.target.value.replace(/[^\d.]/g, ""))} className={fieldBox} inputMode="numeric" /></Field>
        <Field label="Usage limit"><input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="Unlimited" className={fieldBox} inputMode="numeric" /></Field>
        <Field label="Expiry"><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={fieldBox} /></Field>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-300">New codes track usage immediately. To discount real Razorpay orders they must also exist in the server catalog (razorpay-core) — wire your DB to make admin coupons server-authoritative.</p>
    </Modal>
  )
}

export function IssueRefundModal({ onClose }: { onClose: () => void }) {
  // the REAL client base (folded from the live session feed), searchable
  const dir = useClientDirectory()
  const [q, setQ] = useState("")
  const [clientId, setClientId] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [paymentId, setPaymentId] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = dir.clients.filter((c) => c.named)
    const filtered = needle ? base.filter((c) => c.name.toLowerCase().includes(needle) || c.id.includes(needle)) : base
    return filtered.slice(0, 50)
  }, [dir.clients, q])

  const client = dir.byId.get(clientId)
  const ok = !!client && Number(amount) > 0 && reason.trim().length > 2
  const submit = async () => {
    if (!ok || !client) return
    setBusy(true)
    const r = await issueRefund({ clientId: client.id, clientName: client.name, amount: Math.round(Number(amount) * 100), reason: reason.trim(), paymentId: paymentId.trim() || undefined })
    setBusy(false)
    setResult(r.status === "failed" ? "Razorpay refund failed — recorded as failed." : r.razorpayRefundId ? `Refunded via Razorpay (${r.razorpayRefundId}).` : "Refund recorded (pending — add the Razorpay payment id to process it live).")
    setTimeout(onClose, 1400)
  }
  return (
    <Modal title="Issue a refund" subtitle="Real Razorpay refund when a payment id is given." onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={submit} disabled={!ok || busy} className={btnPrimary}>{busy ? "Processing…" : "Issue refund"}</button></>}>
      {result ? <p className="py-4 text-center text-[13.5px] text-foreground">{result}</p> : (
        <div className="grid gap-3.5">
          <Field label="Find client">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dir.loading ? "Loading client directory…" : "Search by name or id…"} className={fieldBox} />
          </Field>
          <Field label="Client *">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldBox}>
              <option value="">{matches.length ? "Select a client…" : "No matching clients"}</option>
              {matches.map((c) => <option key={c.id} value={c.id}>{c.name}{c.navigator ? ` · ${c.navigator}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹) *"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className={fieldBox} inputMode="numeric" /></Field>
          <Field label="Reason *"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Duplicate charge / service not delivered…" className={fieldBox} /></Field>
          <Field label="Razorpay payment id (optional)"><input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_…" className={fieldBox} /></Field>
        </div>
      )}
    </Modal>
  )
}

export function AdminCommerce() {
  const coupons = useCoupons()
  const refunds = useRefunds()
  const m = useCommerceMetrics()
  const [newCoupon, setNewCoupon] = useState(false)
  const [refund, setRefund] = useState(false)

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Coupons &amp; refunds</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{m.activeCoupons} active codes · {m.redemptions.toLocaleString("en-IN")} redemptions · {rupees(m.refundsThisMonth)} refunded</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Scorecard label="Active coupons" value={`${m.activeCoupons}/${m.totalCoupons}`} tone="mind" />
        <Scorecard label="Redemptions" value={m.redemptions.toLocaleString("en-IN")} tone="well" />
        <Scorecard label="Refunds (count)" value={String(m.refundCount)} tone="warn" />
        <Scorecard label="Refunded value" value={rupees(m.refundsThisMonth)} tone="risk" />
      </div>

      {/* coupons */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><Ticket className="size-3.5" /> Coupons</h2>
          <button onClick={() => setNewCoupon(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12px] font-medium text-background hover:opacity-90"><Plus className="size-3.5" /> New coupon</button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
          <table className="w-full border-collapse">
            <thead><tr className={tableHead}><th className="py-2.5 pl-4 pr-3">Code</th><th className="py-2.5 pr-3">Discount</th><th className="hidden py-2.5 pr-3 sm:table-cell">Usage</th><th className="hidden py-2.5 pr-3 md:table-cell">Expiry</th><th className="py-2.5 pr-3">Status</th></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pl-4 pr-3"><span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px] font-semibold text-foreground">{c.code}</span>{c.serverBacked && <span className="ml-2 text-[10px] text-well-600">● live</span>}</td>
                  <td className={cn(td, "pr-3")}>{couponValue(c)}{c.minAmount ? ` · min ${rupees(c.minAmount)}` : ""}</td>
                  <td className={cn(td, "hidden pr-3 tabular-nums sm:table-cell")}>{c.uses.toLocaleString("en-IN")}{c.limit ? ` / ${c.limit}` : ""}</td>
                  <td className={cn(td, "hidden pr-3 text-muted-foreground md:table-cell")}>{c.expiry ?? "—"}</td>
                  <td className={cn(td, "pr-4")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => toggleCoupon(c.code)} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", c.active ? "bg-well-50 text-well-700" : "bg-ink-100 text-ink-500")}>{c.active ? "Active" : "Paused"}</button>
                      <button
                        onClick={() => { if (window.confirm(`Remove coupon ${c.code}? This can't be undone.`)) deleteCoupon(c.code) }}
                        aria-label={`Remove coupon ${c.code}`} title="Remove coupon"
                        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-risk-100 hover:text-risk-600"
                      >
                        <Trash2 className="size-3.5 stroke-[1.75]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* refunds */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><RotateCcw className="size-3.5" /> Refunds</h2>
          <button onClick={() => setRefund(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-secondary"><Plus className="size-3.5" /> Issue refund</button>
        </div>
        {refunds.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No refunds yet.</p> : (
          <div className="divide-y divide-border">
            {refunds.map((r) => (
              <div key={r.id} className="flex items-center gap-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-risk-100 text-risk-600"><RotateCcw className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium text-foreground">{r.clientName}</p><p className="truncate text-[12px] text-muted-foreground">{r.reason} · {fmtDateTime(r.at)}{r.razorpayRefundId ? ` · ${r.razorpayRefundId}` : ""}</p></div>
                <span className="shrink-0 text-[13px] font-medium tabular-nums text-risk-600">−{rupees(r.amount)}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", r.status === "processed" ? "bg-well-50 text-well-700" : r.status === "failed" ? "bg-risk-100 text-risk-600" : "bg-warn-50 text-warn-700")}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {newCoupon && <NewCouponModal onClose={() => setNewCoupon(false)} />}
      {refund && <IssueRefundModal onClose={() => setRefund(false)} />}
    </div>
  )
}
