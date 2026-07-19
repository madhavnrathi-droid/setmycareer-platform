// The live brief handed to the Mission Control AI. Assembles EVERYTHING the admin
// dashboard knows — every KPI, the financials, retention, unit economics, funnels,
// segments, capacity, the counsellor + client rolls (with the at-risk health
// worklist), API spend, support and alerts — into a compact, labelled snapshot the
// LLM can ground in and freely compute over. Pass the live clients (so it reflects
// admin edits / hand-added clients / pauses); the rest comes from the metrics
// layer. Swap for a server pull behind the same shape later.

import { KPIS, COUNSELLORS, REVENUE_BY_PRODUCT, fmtINR, STAGE_LABEL, type JourneyStage } from "./admin-data"
import {
  MRR_NOW, retention, engagement, FUNNEL, ACTIVATION, ADOPTION, LIFECYCLE, TIME_TO_VALUE_DAYS,
  SEG_PLAN, SEG_GEO, SEG_CHANNEL, REVENUE_SPLIT, FINANCE, pacing, capacity, dunning, support,
  leakageSteps, healthScore, healthBand, ALERTS,
} from "./metrics"
import { companyUE, DRIVERS } from "./economics"
import { counsellorName, type CompanyClient } from "./company-store"
import { OFFERINGS_2026, CREDIT_PACKS_2026, type Track2026 } from "../server/offerings-2026"
import type { AdminLiveSnapshot } from "./client-directory"

const n = (x: number) => Math.round(x).toLocaleString("en-IN")
const pc = (x: number) => `${x}%`

export function buildAdminContext(clients: CompanyClient[], live?: AdminLiveSnapshot): string {
  const r = retention(), eng = engagement(), ue = companyUE(), cap = capacity(), sup = support(), dun = dunning()
  const active = clients.filter((c) => c.state !== "archived")
  const scored = active.map((c) => ({ c, s: healthScore(c) }))
  const atRisk = [...scored].sort((a, b) => a.s - b.s).slice(0, 8)
  const expansion = [...scored].filter((x) => x.s >= 70 && x.c.stage !== "complete").sort((a, b) => b.s - a.s).slice(0, 6)
  const stages = (Object.keys(STAGE_LABEL) as JourneyStage[]).map((s) => `${STAGE_LABEL[s]} ${active.filter((c) => c.stage === s).length}`).join(", ")
  const totalRev = REVENUE_BY_PRODUCT.reduce((s, p) => s + p.revenue, 0)
  const units = REVENUE_BY_PRODUCT.reduce((s, p) => s + p.units, 0)
  const onTarget = COUNSELLORS.filter((c) => c.rating >= 4.5 && c.utilization >= 60 && c.utilization <= 95 && c.notesSlaPct >= 85 && c.responseHrs <= 8).length
  const fc = (steps: ReturnType<typeof leakageSteps>) => steps.map((s) => `${s.label} ${s.kind === "down" ? "−" : ""}${fmtINR(Math.abs(s.value))}`).join(" → ")
  const funStr = (f: { label: string; count: number }[]) => f.map((s, i) => `${s.label} ${n(s.count)}${i > 0 ? ` (${Math.round((s.count / f[i - 1].count) * 100)}%)` : ""}`).join(" → ")

  const L: string[] = []

  // REAL backend data first — the assistant should ground its client/counsellor
  // answers here. The business-intelligence model below is illustrative.
  if (live) {
    L.push("== LIVE OPERATIONS (SetMyCareer production backend — REAL data) ==")
    L.push(`Counsellors on the live roster: ${n(live.counsellorCount)}. Clients in the live directory: ${n(live.clientCount)} (${n(live.namedClientCount)} with a resolved real name)${live.loading ? " — still loading the full feed" : ""}.`)
    if (live.topClients.length) L.push("Most-active live clients: " + live.topClients.map((c) => `${c.name} (${c.sessions} sessions${c.navigator ? `, navigator ${c.navigator}` : ""}, ${c.reports} reports, ${c.comments} notes)`).join("; ") + ".")
    if (live.recentReports.length) L.push("Latest reports generated: " + live.recentReports.map((r) => `${r.clientName} — ${r.kind}${r.date ? ` (${r.date})` : ""}${r.navigator ? ` by ${r.navigator}` : ""}`).join("; ") + ".")
    if (live.recentComments.length) L.push("Latest counsellor notes: " + live.recentComments.map((c) => `${c.clientName}: "${c.text.slice(0, 140)}"${c.date ? ` (${c.date})` : ""}`).join("; ") + ".")
    L.push("")
  }

  L.push("SetMyCareer — Mission Control snapshot. The LIVE OPERATIONS block above is REAL production data. The business-intelligence figures below (MRR, CAC, retention, finance, funnels) are an ILLUSTRATIVE planning model — SetMyCareer does not yet pipe these from a billing/analytics system, so treat them as directional, not booked numbers, and say so if asked.")

  L.push("\n== HEADLINE KPIs ==")
  for (const k of KPIS) L.push(`${k.label}: ${k.value}${k.target ? ` (target ${k.target})` : ""}, ${k.delta >= 0 ? "+" : ""}${k.delta}% vs prev.`)

  L.push("\n== GROWTH & RETENTION ==")
  L.push(`MRR ${fmtINR(MRR_NOW.end)} (MoM +${r.growthMoM}%, YoY +${r.growthYoY}%). NRR ${r.nrr}%, GRR ${r.grr}%. Gross revenue churn ${r.grossChurn}%, net churn ${r.netChurn}%. Quick ratio ${r.quickRatio}×. Rule of 40 ≈ ${r.ruleOf40}. Magic number ${r.magicNumber}.`)
  L.push(`Engagement: DAU/MAU stickiness ${eng.stickiness}% (DAU ${n(eng.dau)} / WAU ${n(eng.wau)} / MAU ${n(eng.mau)}). Activation ${eng.activation}%. Time-to-value ${TIME_TO_VALUE_DAYS}d.`)

  L.push("\n== MRR MOVEMENT (this month) ==")
  L.push(`Start ${fmtINR(MRR_NOW.start)} → New +${fmtINR(MRR_NOW.new)}, Expansion +${fmtINR(MRR_NOW.expansion)}, Reactivation +${fmtINR(MRR_NOW.reactivation)}, Contraction −${fmtINR(MRR_NOW.contraction)}, Churned −${fmtINR(MRR_NOW.churned)} → End ${fmtINR(MRR_NOW.end)} (net ${MRR_NOW.net >= 0 ? "+" : "−"}${fmtINR(Math.abs(MRR_NOW.net))}).`)

  L.push("\n== FINANCE ==")
  L.push(`Cash ${fmtINR(FINANCE.cash)}. Gross burn ${fmtINR(FINANCE.grossBurn)}/mo. Net burn ${fmtINR(FINANCE.netBurn)}/mo. Runway ${FINANCE.runwayMonths} months. Net margin ${FINANCE.netMarginPct}%.`)

  L.push("\n== REVENUE ==")
  L.push(`Total (MTD) ${fmtINR(totalRev)} across ${n(units)} purchases. Avg order ${fmtINR(Math.round(totalRev / units))}. Gross margin ${ue.grossMarginPct}%.`)
  L.push(`Recurring (MRR) ${fmtINR(REVENUE_SPLIT.recurring)} (${REVENUE_SPLIT.recurringPct}%) vs Transactional ${fmtINR(REVENUE_SPLIT.transactional)} (${100 - REVENUE_SPLIT.recurringPct}%). MRR excludes one-off sales so churn/NRR stay honest.`)
  L.push("By product: " + REVENUE_BY_PRODUCT.map((p) => `${p.name} (${n(p.units)}× = ${fmtINR(p.revenue)})`).join("; ") + ".")
  L.push("By plan: " + SEG_PLAN.map((s) => `${s.label} ${fmtINR(s.value)}`).join(", ") + ".")
  L.push("By geography: " + SEG_GEO.map((s) => `${s.label} ${fmtINR(s.value)}`).join(", ") + ".")
  L.push("By channel: " + SEG_CHANNEL.map((s) => `${s.label} ${fmtINR(s.value)}`).join(", ") + ".")
  L.push("Leakage: " + fc(leakageSteps()) + ".")

  L.push("\n== UNIT ECONOMICS ==")
  L.push(`ARPU ${fmtINR(ue.arpu)}. Contribution/member ${fmtINR(ue.contributionPerMember)}. Blended CAC ${fmtINR(ue.blendedCac)}. LTV ${fmtINR(ue.ltv)}. LTV:CAC ${ue.ltvCac}×. CAC payback ${ue.paybackMonths} mo. ${n(ue.members)} paying members.`)
  L.push(`Drivers: blended CAC ${fmtINR(DRIVERS.blendedCac)}, gross-margin target ${DRIVERS.grossMarginTargetPct}%, monthly churn ${DRIVERS.monthlyChurnPct}%, referral discount ${DRIVERS.refDiscountPct}%, payment fee ${DRIVERS.paymentFeePct}%; service COGS 44% / digital COGS 19%.`)

  L.push("\n== FUNNELS & PRODUCT ==")
  L.push("Acquisition (30d): " + funStr(FUNNEL) + ".")
  L.push("Activation: " + funStr(ACTIVATION) + ".")
  L.push("Feature adoption (% of active): " + ADOPTION.map((a) => `${a.label} ${pc(a.value)}`).join(", ") + ".")
  L.push("Lifecycle: " + LIFECYCLE.map((s) => `${s.label} ${n(s.value)}`).join(", ") + ".")

  L.push("\n== CAPACITY (counsellor control tower) ==")
  L.push(`Team utilization ${cap.utilPct}% (booked ${n(cap.totalBooked)} / capacity ${n(cap.totalCapacity)} sessions). Demand ${n(cap.demand)}, headroom ${n(cap.headroom)}, waitlisted ${n(cap.waitlisted)}.`)
  L.push("Per counsellor: " + cap.rows.map((x) => `${x.name} ${x.booked}/${x.capacity} (${x.util}%)`).join("; ") + ".")

  L.push(`\n== COUNSELLORS (${COUNSELLORS.length} on team; ${onTarget} fully on-target) ==`)
  for (const c of COUNSELLORS) L.push(`${c.name} (${c.title}): caseload ${c.caseload}, ${c.sessionsMonth} sessions/mo, ★${c.rating}, utilization ${c.utilization}%, notes-SLA ${c.notesSlaPct}%, response ${c.responseHrs}h, revenue ${fmtINR(c.revenueMonth)}, status ${c.status.replace("_", " ")}.`)
  L.push("Off-target = rating<4.5 OR utilization outside 60–95% OR notes-SLA<85% OR response>8h.")

  L.push(`\n== CLIENTS (${active.length} active; ${atRisk.filter((x) => x.s < 38).length} at-risk; avg LTV ${fmtINR(Math.round(active.filter((c) => c.ltv > 0).reduce((s, c) => s + c.ltv, 0) / Math.max(1, active.filter((c) => c.ltv > 0).length)))}) ==`)
  L.push("Stage distribution: " + stages + ".")
  L.push("At-risk worklist (lowest health 0–100): " + atRisk.map(({ c, s }) => `${c.name} [${s}, ${healthBand(s).replace("_", "-")}, ${STAGE_LABEL[c.stage]}, ${counsellorName(c.counsellorId)}, LTV ${c.ltv ? fmtINR(c.ltv) : "—"}]`).join("; ") + ".")
  L.push("Expansion-ready (high health, mid-journey): " + (expansion.length ? expansion.map(({ c, s }) => `${c.name} [${s}, ${STAGE_LABEL[c.stage]}]`).join("; ") : "none right now") + ".")

  L.push("\n== API & INFRA ==")
  L.push("Real stack: SetMyCareer Core API (clients/sessions/reports), Groq (Llama 3.3 70B LLM + Whisper STT), OpenRouter (LLM fallback), LiveKit (video/voice rooms), Razorpay (payments). Chats and app state are stored in the browser only — the Supabase cloud store was retired on 2026-07-19, so nothing app-layer is persisted server-side. Live per-provider usage (Razorpay transactions, OpenRouter credits) is on the API & usage screen; there is no synthetic provider-spend figure.")

  L.push("\n== SUPPORT & SENTIMENT ==")
  L.push(`Speed-to-lead ${sup.speedToLeadMin} min. First response ${sup.firstResponseHrs}h. Resolution ${sup.resolutionHrs}h. CSAT ${sup.csat}%. CES ${sup.ces}/5. NPS ${sup.nps}. SLA attainment ${sup.slaAttainment}%. Open tickets ${sup.ticketsOpen} (${sup.ticketsWeek}/week).`)

  L.push("\n== PAYMENT RECOVERY (dunning) ==")
  L.push(`Failed ${dun.failed}, in-retry ${dun.inRetry}, recovered ${dun.recovered} (${dun.recoveryRate}% recovery), lost ${dun.lost}. ${fmtINR(dun.atRiskValue)} still at risk.`)

  L.push("\n== PACING TO TARGET (this month) ==")
  for (const p of pacing(fmtINR)) L.push(`${p.label}: ${p.fmt(p.mtd)} so far, projected ${p.fmt(p.projected)} / target ${p.fmt(p.target)} (${p.pacePct}% pace).`)

  L.push("\n== ACTIVE ALERTS ==")
  for (const a of ALERTS) L.push(`[${a.severity}] ${a.title} — ${a.detail}`)

  // 2026 catalog (REAL prices from the shared contract — not modeled numbers).
  const exact = (v: number) => (v > 0 ? `₹${v.toLocaleString("en-IN")}` : "Free")
  const TRACK_2026: [Track2026, string][] = [["student", "STUDENT JOURNEY"], ["professional", "PROFESSIONAL"], ["marketplace", "MARKETPLACE"], ["custom", "VCLP"]]
  L.push("\n== 2026 CATALOG (REAL prices; AI a/b = Career/Voice Credits) ==")
  for (const [track, label] of TRACK_2026) {
    L.push(`${label}:`)
    for (const o of OFFERINGS_2026.filter((x) => x.track === track))
      L.push(`- ${o.name} [${o.id}] ${exact(o.inr)}${o.careerCredits || o.voiceCredits ? ` · AI ${o.careerCredits}/${o.voiceCredits}` : ""}${o.featured ? " · MOST POPULAR" : ""}`)
  }
  L.push("Credit packs (cc=Career, vc=Voice): " + CREDIT_PACKS_2026.map((p) => `${p.amount}${p.unit === "career" ? "cc" : "vc"} ${exact(p.inr)}`).join(" · ") + ".")
  L.push("Market AI allowances as 'AI Career Copilot included' + credits — never messages/minutes. VCLP is application-only, custom-priced (only the discovery is listed). Legacy catalog still live — segregated in the packages screen (2026 catalog | Legacy toggle); 2026 tier ids prefixed sj_/pro_/mk_/lt_/cc_/vc_ are badged '2026' on purchase rows.")

  return L.join("\n")
}
