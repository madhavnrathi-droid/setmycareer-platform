// Career Terminal — the client portal edition. The audience comes from the
// ACCOUNT's track (chosen at sign-up; live accounts fall back to the purchase
// hint inside useTrack) and stays user-switchable in the panel. "Ask" hands the
// prompt to the floating Compass guide via the smc:ask event; "See the
// programme" routes into the catalogue — the terminal sells as well as informs.

import { useNavigate } from "react-router-dom"
import { useTrack } from "../portal-store"
import { CareerTerminalPanel } from "../terminal/CareerTerminalPanel"
import type { Audience } from "../terminal/insights"

export function PortalTerminal() {
  const nav = useNavigate()
  const track = useTrack()
  const defaultAudience: Audience = track === "professional" ? "executive" : "student"
  const ask = (prompt: string) => window.dispatchEvent(new CustomEvent("smc:ask", { detail: prompt }))
  const sell = (offeringId: string) => nav(`/portal/services/${offeringId}`)
  return <CareerTerminalPanel defaultAudience={defaultAudience} onAsk={ask} onSell={sell} />
}
