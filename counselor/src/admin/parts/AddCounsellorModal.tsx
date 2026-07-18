// Invite a counsellor — captures who they are + scope, records the hire on the
// activity stream, and (once the backend lands) sends the scoped console invite.

import { useState } from "react"
import { toast } from "sonner"
import { logEvent } from "../admin-events"
import { addNavigator } from "@/lib/smc-live-api"
import { Modal, Field, fieldBox, btnPrimary, btnGhost } from "../ui"

const TITLES = ["Career Strategist", "Counselling Psychologist", "STEM & Research Mentor", "Admissions Specialist", "Career & Wellbeing Counsellor", "Career Coach"]

export function AddCounsellorModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState(TITLES[0])
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tempPwd, setTempPwd] = useState("")
  const ok = name.trim().length > 1 && /\S+@\S+/.test(email)
  const invite = async () => {
    if (!ok || busy) return
    setBusy(true)
    // create the REAL navigator account on the live backend; they go active
    // once approved (EnableNavigator) on the Counsellors screen
    const pwd = `Smc!${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`
    try {
      await addNavigator({ name: name.trim(), email: email.trim(), password: pwd })
      setTempPwd(pwd)
      logEvent({ kind: "counsellor", title: `Counsellor account created · ${name.trim()}`, detail: `${title} · ${email.trim()}` })
      setDone(true)
    } catch (err) {
      toast.error(`Couldn't create the account — ${err instanceof Error ? err.message : "the backend rejected it"}. Try again.`)
    } finally { setBusy(false) }
  }
  return (
    <Modal title="Invite a counsellor" subtitle="They join with their own scoped console login." onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>{done ? "Done" : "Cancel"}</button><button onClick={invite} disabled={!ok || done || busy} className={btnPrimary}>{done ? "Created" : busy ? "Creating…" : "Create account"}</button></>}>
      {done ? (
        <div className="py-3 text-center">
          <p className="text-[13.5px] text-foreground">Account created for {name.trim()}.</p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Share their sign-in: <b className="font-medium text-foreground">{email.trim()}</b> · temporary password{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px]">{tempPwd}</code>
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">Approve them under Counsellors to activate the console.</p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          <Field label="Full name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Riya Sharma" className={fieldBox} autoFocus /></Field>
          <Field label="Work email *"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@setmycareer.com" className={fieldBox} type="email" /></Field>
          <Field label="Role / title"><select value={title} onChange={(e) => setTitle(e.target.value)} className={fieldBox}>{TITLES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        </div>
      )}
    </Modal>
  )
}
