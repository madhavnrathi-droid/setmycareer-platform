// Career Terminal — the counsellor console edition. The same live market board
// the client sees, framed for the caseload: flip between the student and the
// executive read depending on who's in your next session. "Ask" hands the
// prompt to the full-screen Assistant (sessionStorage handoff → auto-send).

import { useNavigate } from "react-router-dom"
import { CareerTerminalPanel } from "@/portal/terminal/CareerTerminalPanel"

export function Terminal() {
  const nav = useNavigate()
  const ask = (prompt: string) => {
    try { sessionStorage.setItem("smc.assistant.prompt", prompt) } catch { /* private mode */ }
    nav("/assistant")
  }
  return (
    <div className="mx-auto max-w-6xl">
      <CareerTerminalPanel defaultAudience="student" onAsk={ask} whoLabel="for your caseload" />
    </div>
  )
}
