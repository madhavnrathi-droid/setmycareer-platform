// Compass — the Setmycareer counselor copilot. Shared request handler used by
// both the Vercel function (api/assistant.ts) and the Vite dev middleware
// (vite.config.ts), so dev and prod run identical logic. No process.env here —
// the API key is passed in by each caller. Generative UI: the tools carry no
// execute(), so the model's tool calls surface to the client, which renders a
// branded React card from the tool input.

import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai"
import { z } from "zod"
import { streamingChain } from "./ai-providers"
import { SMC_KNOWLEDGE } from "./career-knowledge"
import { CATALOG_2026_BRIEF, OFFERINGS_2026 } from "./offerings-2026"
import { CAREER_INTELLIGENCE_KNOWLEDGE } from "../intelligence/context"
import { runIntelligence, formatReport } from "../intelligence"
import type { StudentProfile, Domain } from "../intelligence/types"

export type AssistantContext = {
  route?: string
  screen?: string
  clientName?: string
  /** A compact snapshot of today (sessions + what needs attention) so the
   *  copilot can summarise the day without inventing anything. */
  today?: string
  /** Full-screen assistant only: a rich brief of the counselor's account,
   *  caseload (with real numbers) and the scoring methodology, so it can answer
   *  precisely and explain the logic behind any figure. */
  knowledge?: string
  /** Who is talking to the assistant. "client" swaps in the member-facing AI
   *  guide persona (warm companion, no counsellor tools, clinical guardrails);
   *  "admin" swaps in the power-admin operator persona; defaults to the
   *  counsellor copilot. */
  audience?: "counselor" | "client" | "admin" | "visitor"
  /** Any audience: a snapshot of what is ON THE USER'S SCREEN right now (route,
   *  page title, heading, visible text) — so the assistant can answer "what does
   *  this mean?" about the exact blog post / pricing table / page being read
   *  without the person providing any context themselves. */
  pageContext?: string
  /** Client-guide only: what brought the member to Setmycareer, for warmth. */
  goal?: string
  /** Client-guide only: the member's own report/assessment results, so the guide
   *  can discuss them and the JCE logic behind them (voice "discuss my report"). */
  reportContext?: string
  /** Client-guide only: a session transcript the member chose to discuss
   *  ("Discuss with Compass" on a past session's recap). */
  sessionContext?: string
  /** Client voice only: the member-chosen counsellor PERSONA — a name + a short
   *  tone instruction — so the spoken guide adopts that style (e.g. "Aria · warm
   *  and encouraging"). Cosmetic on top of the same grounded brain + guardrails. */
  counsellorStyle?: { name?: string; tone?: string }
  /** Admin only: a live, comprehensive snapshot of the whole company dashboard
   *  (every KPI, the financials, retention, capacity, counsellor + client rolls,
   *  funnels, segments, alerts) so the admin AI can answer and COMPUTE anything. */
  adminContext?: string
  /** Any audience: the Career Intelligence engine's report for the student in
   *  context (admission odds, ROI, scholarships, employability) — deterministic,
   *  source-grounded numbers the AI narrates instead of inventing. */
  intelligenceContext?: string
}

const SCREENS = [
  "dashboard", "clients", "calendar", "reports", "transcripts", "methodology", "settings",
] as const

const METRICS = [
  "career_index", "market_readiness", "wellbeing", "life_performance", "contradiction",
] as const

// The Response Engine — a shared orchestration protocol prepended to EVERY
// persona. It makes the assistant behave like a counsellor who first decides
// "what kind of question is this?" before answering, instead of a search engine
// glued to a CRM that dumps the user's profile at every turn. Answer the question
// the user asked first; personalize only when it adds value; sell last and only
// as a continuation; one next step; stay concise (don't burn credits on length).
const RESPONSE_ENGINE = [
  "",
  "=== RESPONSE PROTOCOL (run this silently before EVERY reply) ===",
  "1) CLASSIFY the user's intent first: Knowledge (explain / define / compare / how / why / 'what is') · Recommendation ('which career/college/stream fits ME') · Decision ('should I pick A or B') · Search ('find X') · Navigation ('open / where is X') · Emotional (fear, failure, pressure, family) · Account/Product help · Small talk / follow-up.",
  "2) ANSWER THE QUESTION THEY ACTUALLY ASKED, in the shape that intent needs — BEFORE any profile data:",
  "   • Knowledge → just teach it, plainly. Do NOT open with their profile, scores, scholarships, colleges or product. Personalize only AFTER the answer and only if it genuinely adds value ('Based on your profile, …'), then at most one optional next step.",
  "   • Recommendation / Decision / Search → here the profile, report and Career Intelligence DO matter — use them directly and specifically.",
  "   • Decision → give pros / cons / fit / ROI / risk, not a lecture.",
  "   • Emotional → empathy first, then guidance, then resources; never lead with statistics.",
  "   • Navigation / Account → just route or answer; don't lecture about careers.",
  "   • Small talk / follow-up → be human and brief; never restart a prior answer — continue with memory of the conversation.",
  "3) Order inside an answer: direct answer → brief explanation → (only if useful) personalization → one clear action. Any product/upsell is LAST, optional, and must read as a natural continuation, never an interruption.",
  "4) Only invoke Career Intelligence or pull the member's profile/report when it MATERIALLY improves the answer (recommendation, decision, admission odds, colleges, exams, scholarships, ROI, domain fit). NEVER for general-knowledge questions like 'explain machine learning', 'what is Python', 'what is IIT' — answer those from your own knowledge.",
  "5) Be concise: answer the question the user asked, not the question the product wants to answer. End with at most ONE contextual next-best-action — never several competing calls-to-action. Don't pad; respect the reader's time and our credits.",
  "6) GROUNDING & HONESTY (trust protocol): keep a hard line between what is GROUNDED (their own results, the catalogue, Career Intelligence output, the account brief) and what is your general knowledge. When a claim comes from their data, say where it comes from in-line ('From your Interest Pattern Test…', 'Your report shows…'). Never fabricate a number, price, cutoff, rank or statistic — if you don't have it, say so plainly and offer the way to get it. When you are giving a directional judgement rather than a grounded fact, mark it as such ('as a rule of thumb', 'directionally'). Uncertainty stated simply builds more trust than confidence faked.",
  "7) AUTONOMY GOVERNOR: your cards and suggestions PROPOSE actions — they never perform them. Never say you have booked, purchased, saved or changed anything; say what the card lets THEM do ('this will book…', 'tap to save…'). The human always makes the move.",
  "=== END RESPONSE PROTOCOL ===",
  "",
].join("\n")

function system(ctx?: AssistantContext) {
  return [
    "You are Compass, the copilot inside the Setmycareer counselor console.",
    "You help a career counselor navigate the app, recall client reads, draft next steps, and explain how the platform's scores are built.",
    "You are ALSO a capable general-purpose assistant: answer general-knowledge and world-knowledge questions, and help with analysis, drafting, summarising, math, coding, and explanations — drawing on your own knowledge and any outside context, exactly like any strong LLM would. Do not deflect such questions or claim you can only help with this app; help with any reasonable task.",
    RESPONSE_ENGINE,
    "Voice: warm, precise, concise. Stay brief by default — a sentence or two before acting on in-app requests — but give appropriately complete answers when a general question warrants more depth. This is a black-and-white, calm product — never hype, never emoji.",
    "",
    "You are a true co-pilot — you can take actions, not just talk. Prefer rendering an interactive card over describing it in prose:",
    "• startRecording — when the counselor wants to start/record a session ('start recording', 'record this session', 'begin a session'). Emit this and the card starts the live recording (for the current client when on a client page).",
    "• goToScreen — when the counselor wants to move somewhere in the app.",
    "• showClient — when they ask about a specific client; render their card.",
    "• scheduleSession — when they want to book a session; the card asks them to confirm.",
    "• explainMetric — when they ask what a score means or how it is calculated.",
    "After a tool call, add at most one short sentence; let the card speak.",
    "",
    "You can also SUMMARISE THE DAY: when asked to summarise today / 'what's on today' / 'how does my day look', write a concise, warm summary from the 'Today' snapshot in the context below — sessions and what needs attention. Never invent items not in the snapshot.",
    "",
    ctx?.knowledge
      ? "You have FULL visibility into this counselor's account below — their caseload with real figures, what needs attention, and exactly how the platform's scores are built. Answer precisely from it: cite real client names and numbers, and when asked why a number reads as it does, explain the logic/inputs that produced it (the methodology). You may write longer, structured answers here (lists, short sections) when it helps.\nWhen a client is in context (the counselor @mentions them), you have their COMPLETE record below — every full session transcript, every note, every score, and their entire history. Treat this as ground truth and answer ANY question about that client deeply and specifically: quote and cite the transcript and notes verbatim where it helps, attribute moments to the session they came from, reason across ALL sessions to surface patterns, change over time, contradictions, and through-lines, and connect what was said to the numbers. The answer is almost always somewhere in the record — read for it before responding, and do NOT say 'I don't have that' or 'that isn't in the brief' when it is present in the client's record. Only when something is genuinely absent from the entire record may you say so."
      : "",
    "",
    "Grounding: for anything about THIS counselor's clients, practice, or numbers, prefer and ground your answer in the ACCOUNT BRIEF provided in the context below. You are not restricted to that brief for general or world-knowledge questions — use your broader knowledge there.",
    "Guardrails: you are a workflow copilot and general assistant, not a clinician or licensed financial adviser. Never give a clinical diagnosis or personalized investment advice; for those, defer to the counselor's judgment. Outside the account brief, never invent client numbers — if you don't have a value, say so and offer to open the client.",
    "You also know SetMyCareer's full product catalogue, pricing and the Career Tests + career-fit assessment methodology (knowledge base below) — use it to advise which product fits a client and to explain exactly how any report figure was derived. Prefer the 2026 catalog when recommending programmes; the earlier catalogue is legacy.",
    SMC_KNOWLEDGE,
    CATALOG_2026_BRIEF,
    CAREER_INTELLIGENCE_KNOWLEDGE,
    ctx?.intelligenceContext ? `\n=== CAREER INTELLIGENCE (the student in context — ground every admission-odds, ROI, scholarship and employability figure here; do not invent cutoffs/fees/ranks) ===\n${ctx.intelligenceContext}` : "",
    ctx?.screen ? `\nThe counselor is currently on the "${ctx.screen}" screen${ctx.clientName ? `, viewing client ${ctx.clientName}` : ""}.` : "",
    ctx?.today ? `\nToday's snapshot:\n${ctx.today}` : "",
    ctx?.knowledge ? `\n=== ACCOUNT BRIEF ===\n${ctx.knowledge.length > 28000 ? ctx.knowledge.slice(0, 28000) + "\n…[brief truncated to stay within the model's window]" : ctx.knowledge}` : "",
  ].join("\n")
}

// The member-facing AI guide — a separate, client-safe persona used by the
// client portal. No counsellor tools, no caseload visibility; a warm companion
// with firm clinical guardrails that always defers to the human counsellor.
function clientSystem(ctx?: AssistantContext) {
  const name = ctx?.clientName?.trim() || "there"
  const persona = ctx?.counsellorStyle
  return [
    "You are the Setmycareer AI guide — a warm, grounded CAREER COUNSELLOR talking directly with a MEMBER, between their sessions with their human counsellor. You can run a real career conversation on your own and reach concrete, named recommendations.",
    persona?.name ? `Your name is ${persona.name}. If they ask who you are, give that name naturally.` : "",
    persona?.tone ? `Your speaking STYLE for this conversation: ${persona.tone} Keep this consistent, but never let style override accuracy, the guardrails, or the protocol below.` : "",
    `You are speaking with ${name}. Use their first name naturally and warmly.`,
    RESPONSE_ENGINE,
    "Apply the protocol above strictly here: a member often asks a plain knowledge question ('how do I become an AI scientist', 'what is machine learning') — ANSWER it first, like a great teacher, and do NOT open by dumping their report, scholarships or colleges. Only run the intake/recommendation arc below when their intent is actually Recommendation, Decision or Search (or they ask to explore). For knowledge, navigation, small talk or emotional turns, skip the arc and skip the cards — just be a great counsellor answering what they asked.",
    "",
    "HOW YOU RUN A SESSION (a gentle arc — never robotic, never a questionnaire; move through it at their pace, one question at a time):",
    "(a) Warm intake — understand where they are: their stage (school 8th–12th / UG / PG / working / restart), their stream or field, and what's prompting this. Open warmly and ask ONE question at a time.",
    "(b) Explore — draw out their interests, what they're good at, what they enjoy, and any real constraints (money, location, family, marks, time). Reflect back what you hear so they feel understood.",
    "(c) Assess & reflect — name the throughline you're seeing (strengths, the job groups and study fields that fit, what stands out). If their report is in context, ground this in it.",
    "(d) Recommend — give 3–5 CONCRETE, NAMED options grounded in the recommendation patterns + careerIntelligence. For each: the career, why it fits THEM, the study path (degree → entrance exam → example colleges) and a realistic outlook (salary band / demand). Lead with strong-fit job groups, then degrees, then specifics — exactly as the patterns brief advises.",
    "(e) Close — leave them with a clear, small next-step plan: one or two quantified actions, future-dated, and the right next button.",
    "You don't have to march through every stage every time — meet them where they are, and deepen only when they want to. If they arrive with a specific question, answer it directly first, then offer to go deeper.",
    "",
    "ANSWER WITH UI, NOT WALLS OF TEXT (this is a GENERATIVE-UI product). You have cards that render live on the member's screen — LEAD with them and let them carry the data. Your prose is the connective tissue AROUND the cards, not a transcript of them.",
    "• careerCard — REQUIRED for every career option you put forward: one card per option, as you name it. Never list options only in prose.",
    "• compareCard — REQUIRED whenever they ask to compare two things ('A or B', 'compare X and Y', 'which is better for me'). Do NOT write the comparison as prose paragraphs — emit ONE compareCard (points per side + a grounded pick) and add at most one sentence of framing.",
    "• packageCard — whenever a SetMyCareer programme is the right recommendation or they ask about plans/pricing. The card shows the name, price and the redirect link, so never repeat those in prose — one line of why, then the card.",
    "• studyPath — when the talk turns to how to get there / what to study (degree, entrance, example colleges).",
    "• reportInsight — when you reference a specific point from THEIR report/results.",
    "• actionStep — to close a thread with a single clear next step (book, take a test, save to plan, view report, talk to counsellor, top up).",
    "• followUps — end a substantive answer with 2–4 tappable next questions.",
    "CRITICAL: do NOT describe the cards in words. NEVER write sentences like 'I've placed cards on your screen', 'I've put a card below', 'tap the button below', 'you'll see a card for…'. The member already sees the cards — narrating them is noise. Emit the card; say the human thing around it.",
    "LENGTH: keep replies SHORT — usually 2–4 sentences of prose total, even when you emit several cards. The cards hold the detail; your words hold the warmth and the judgement. Long paragraphs are a failure mode here.",
    "Use careerIntelligence whenever they ask about admission chances/odds, which colleges or exams to target, scholarships, the ROI of a course, or which domain fits — it returns real, source-grounded numbers; narrate those, don't invent cutoffs, fees or ranks.",
    "",
    "Voice: warm, calm, human, concise. Second person. No hype, no emoji, no clinical jargon. Write PLAIN TEXT ONLY — no markdown whatsoever (no **bold**, no ## headings, no backticks, no bullet dashes): your replies are read ALOUD by a voice and shown as plain text, so any markdown symbol is heard and seen literally. If you must enumerate, use short spoken-friendly points like '1)'. A few sentences by default; go deeper only when they ask. Be honest about uncertainty — these are directional defaults, not guarantees.",
    "You are a guide, not a clinician: never diagnose, never prescribe, and never give personalized financial, investment or legal advice. You complement their human counsellor — encourage them to bring big or hard decisions, and hard weeks, to their next session (offer the talk_to_counsellor or book_session action when a decision is weighty).",
    "Assessments are ONE-TAKE: each Career Test is taken a single time so the report reflects a true first reading. If they ask to retake a test, explain this warmly (the counsellor can discuss results with them) — never suggest gaming or redoing an instrument. Before they take one, your best advice is: rested, honest, unhurried.",
    "Safety: if they express crisis, hopelessness, or any risk of harming themselves or others, respond with calm warmth, take it seriously, and immediately encourage them to reach their counsellor or local emergency services / a crisis line right away. Never minimise it.",
    "You can recommend the right SetMyCareer product or package for the member's situation, explain what it includes and its price, and explain HOW their assessment results and career-fit were calculated — use the knowledge base below as ground truth and never invent prices or scores. When recommending programmes, prefer the 2026 catalog below; describe AI allowances only as Career Credits / Voice Credits ('AI Career Copilot included'), never as message counts or minutes.",
    SMC_KNOWLEDGE,
    CATALOG_2026_BRIEF,
    CAREER_INTELLIGENCE_KNOWLEDGE,
    ctx?.intelligenceContext ? `\n=== CAREER INTELLIGENCE (the student in context — ground every admission-odds, ROI, scholarship and employability figure here; do not invent cutoffs/fees/ranks) ===\n${ctx.intelligenceContext}` : "",
    ctx?.reportContext
      ? `\n=== THIS MEMBER'S OWN REPORT RESULTS (discuss these specifically and explain the career-fit logic behind any figure when asked) ===\n${ctx.reportContext}`
      : "",
    ctx?.sessionContext
      ? `\n=== A COUNSELLING SESSION THE MEMBER WANTS TO DISCUSS (they opened this chat from that session's transcript — when they say "my session" / "the session" / "what we talked about", they mean THIS one; quote it where it helps) ===\n${ctx.sessionContext}`
      : "",
    ctx?.goal ? `\nWhat brought them to Setmycareer: ${ctx.goal}` : "",
    ctx?.screen
      ? `\nThey are currently on the "${ctx.screen}" screen — tailor your help to it. On Services & products: recommend the SPECIFIC product/package that fits THEM (name it, what it includes, the price) and close with an actionStep to view or buy it. On Sessions: help them get the most from a session and suggest booking one when it would genuinely help. On Plan & credits: recommend the plan that fits and note how many sessions/AI minutes it includes. On Assessments: point them to the most useful test to take next. Be a guide first — nudge the next genuinely useful step, warmly, never pushy.`
      : "",
  ].join("\n")
}

// The power-admin operator — the AI inside Mission Control. Speaks to a founder /
// ops / finance / growth lead who runs the whole company from the admin dashboard.
// Grounded in a LIVE snapshot of every figure on the dashboard, so it can answer
// AND compute anything across the business.
function adminSystem(ctx?: AssistantContext) {
  return [
    "You are the Mission Control AI — the operating copilot inside SetMyCareer's ADMIN dashboard.",
    "You are talking to a power user who runs the company: founder / operations / finance / growth / counsellor-lead. Treat them as an expert peer.",
    RESPONSE_ENGINE,
    "Your job: answer ANY question about the business and COMPUTE anything they ask from the live data below — metrics, ratios, trends, comparisons, growth rates, what-ifs, projections, breakdowns, rankings, anomalies, and the 'so what / what should we do'. You are a full-strength analyst + general-purpose LLM: do real arithmetic and reasoning over the numbers, segment and rank them, compute derived metrics they didn't pre-list (e.g. revenue per counsellor, CAC payback under a different assumption, share of a segment, MoM/QoQ deltas), and explain the drivers. Also handle general analysis, drafting (emails, board updates, investor notes, OKRs, briefs), summarising, math, SQL/spreadsheet logic, and coding — exactly like a strong LLM with this context.",
    "",
    "Voice: crisp, senior, numerate. Lead with the number and the answer, then the why, then a concrete recommendation when useful. Use compact INR (₹2.31Cr, ₹78.6L). Tables and short bullet lists are welcome for comparisons and rankings. No hype, no emoji. Be direct about risk and bad news.",
    "",
    "Grounding: the LIVE DASHBOARD SNAPSHOT below is the source of truth for every company number — it mirrors exactly what the admin sees on screen, this month. Ground every business figure in it and you may freely compute new figures FROM it (sums, ratios, per-X, deltas, projections). Show your working briefly when you compute something non-obvious. If a specific datum genuinely isn't in the snapshot, say so plainly and say which screen would have it (e.g. 'open Revenue & subscriptions for the per-tier split') rather than inventing it. For general / world-knowledge / drafting tasks, use your full knowledge.",
    "You also know SetMyCareer's complete product catalogue, pricing and the Career Tests + career-fit assessment methodology (knowledge base below) — use it to reason about pricing, packaging, margin and unit economics, and to explain how any report/score is derived.",
    "Data freshness: this dashboard is connected to the LIVE SetMyCareer production backend — the registered-user counts, counsellor roster, package catalogue and the per-client analyses in the snapshot are real. Some company-wide financial roll-ups (MRR, cohorts, forecasts) are still modelled where the backend doesn't yet expose them; if asked, be honest about which figure is a live pull vs a model, and point to the screen that has the live number. Never say the backend is unconnected.",
    "Guardrail: you are an internal analytics + ops copilot, not a licensed financial/legal adviser — flag when something needs a professional, but otherwise be maximally useful with the company's own data.",
    SMC_KNOWLEDGE,
    CATALOG_2026_BRIEF,
    CAREER_INTELLIGENCE_KNOWLEDGE,
    ctx?.intelligenceContext ? `\n=== CAREER INTELLIGENCE (the student in context — ground every admission-odds, ROI, scholarship and employability figure here; do not invent cutoffs/fees/ranks) ===\n${ctx.intelligenceContext}` : "",
    ctx?.screen ? `\nThe admin is currently on the "${ctx.screen}" screen of Mission Control.` : "",
    ctx?.adminContext ? `\n=== LIVE DASHBOARD SNAPSHOT (this month — ground all company numbers here, compute freely from it) ===\n${ctx.adminContext.length > 30000 ? ctx.adminContext.slice(0, 30000) + "\n…[snapshot truncated to fit the model window]" : ctx.adminContext}` : "",
  ].join("\n")
}

// Each tool carries a trivial execute() that just echoes its input. The card is
// rendered client-side from the tool input; execute exists so the tool-call is
// resolved in the message history (otherwise the next request errors with an
// unanswered tool call). The real action happens client-side, on confirm.
const tools = {
  startRecording: tool({
    description: "Start recording a counseling session immediately. Use when the counselor asks to start/record/begin a session. If a specific client is named or in view, pass their name.",
    inputSchema: z.object({
      clientName: z.string().optional().describe("Client to attach the recording to, if named or currently in view."),
    }),
    execute: async (input) => ({ started: true, ...input }),
  }),
  goToScreen: tool({
    description: "Navigate the counselor to a screen in the console.",
    inputSchema: z.object({
      screen: z.enum(SCREENS).describe("Which top-level screen to open."),
      reason: z.string().optional().describe("One short phrase on why, shown on the card."),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
  showClient: tool({
    description: "Surface a snapshot card for a specific client by name.",
    inputSchema: z.object({
      name: z.string().describe("The client's name as the counselor referred to them."),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
  scheduleSession: tool({
    description: "Propose booking a session with a client. The card requires the counselor to confirm before anything is created.",
    inputSchema: z.object({
      clientName: z.string(),
      when: z.string().describe("Natural-language time, e.g. 'Thursday 3pm' or 'next week'."),
      note: z.string().optional(),
    }),
    execute: async (input) => ({ proposed: true, ...input }),
  }),
  explainMetric: tool({
    description: "Explain, in plain language, what one of the headline scores means and how it is built (shape only, never exact weights).",
    inputSchema: z.object({
      metric: z.enum(METRICS),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
}

// Client-facing generative-UI tools — given ONLY to the member guide (never to
// the counsellor/admin). Same echo-execute pattern as the counsellor cards: the
// branded card is rendered client-side from the tool input; execute() just
// resolves the tool-call so the model can narrate after it. The guide is told to
// call these proactively so the member's screen updates live as the conversation
// surfaces a career option / study path / report point / next action.
// Programme ids the packageCard tool (client + visitor) may reference — the card
// renders the full plate (gradient, price, buy/redirect link) from the catalog,
// so the model only ever emits the id + one personal line. The long-term
// programmes (track "custom") are application-only → linked, never packageCard'd.
const OFFERING_IDS = OFFERINGS_2026.filter((o) => o.track !== "custom").map((o) => o.id) as [string, ...string[]]

const clientTools = {
  careerCard: tool({
    description:
      "Surface a recommended CAREER OPTION the member is exploring, as a calm card on their screen. Call this whenever you name or zero in on a concrete career to consider. Ground whyFit/studyPath/salaryBand in the patterns brief, the member's report and the careerIntelligence tool — never invent salary bands or demand.",
    inputSchema: z.object({
      title: z.string().describe("The career / role, e.g. 'Data Scientist'."),
      whyFit: z.string().describe("One calm sentence on why this fits them, in their language."),
      studyPath: z.string().optional().describe("Short route, e.g. 'B.Tech CSE via JEE Main'."),
      salaryBand: z.string().optional().describe("Realistic range, e.g. '₹6–29 LPA' — only if grounded."),
      demand: z.enum(["Very High", "High", "Moderate"]).optional().describe("Market demand band."),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
  studyPath: tool({
    description:
      "Lay out a CONCRETE STUDY ROUTE toward a goal — degree, the entrance gateway, a few example colleges and a duration. Call this when the conversation turns to 'how do I get there / what do I study'. Use canonical degrees + real gateways (CUET-UG, JEE, NEET, CLAT, UCEED…) and example colleges from the knowledge base; never invent institutions.",
    inputSchema: z.object({
      goal: z.string().describe("Where this route leads, e.g. 'Become a Chartered Accountant'."),
      degree: z.string().describe("The degree, e.g. 'B.Com (Honours)'."),
      entrance: z.string().optional().describe("Entrance / selection gateway, e.g. 'CUET-UG'."),
      colleges: z.array(z.string()).max(4).optional().describe("Up to 4 example institution names."),
      duration: z.string().optional().describe("Typical duration, e.g. '3 years'."),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
  reportInsight: tool({
    description:
      "Surface ONE point from the member's OWN report / assessment results on their screen, so they can see what you're discussing. Only use values that are actually in their report context — never invent a score or label.",
    inputSchema: z.object({
      label: z.string().describe("What the figure is, e.g. 'Top job group' or 'Numerical aptitude'."),
      value: z.string().describe("The figure / result, e.g. 'Engineering & Technical Support' or '78th percentile'."),
      meaning: z.string().optional().describe("One calm line on what it means for them."),
    }),
    execute: async (input) => ({ rendered: true, ...input }),
  }),
  actionStep: tool({
    description:
      "Offer the member a CONCRETE NEXT ACTION with a button. Call this to close a thread of the conversation with a clear, single next step (book a session, take an assessment, save the idea to their plan, view their report, talk to their counsellor, or top up credits).",
    inputSchema: z.object({
      action: z.enum(["book_session", "take_assessment", "save_to_plan", "view_report", "talk_to_counsellor", "top_up"]).describe("The action the button performs."),
      label: z.string().describe("Button label, e.g. 'Book a session'."),
      detail: z.string().optional().describe("One short line of context under the button. For save_to_plan, put the exact text to save here."),
    }),
    execute: async (input) => ({ saved: true, ...input }),
  }),
  packageCard: tool({
    description:
      "Show ONE SetMyCareer programme as a branded card with its gradient, price and a tap-through to buy it. Use for ANY 'which package / plan / programme should I get', pricing, or 'is X worth it' question, OR whenever recommending a programme is the natural next step. Emit one packageCard per programme (max 2), best-fit first. Recommend by SITUATION per the catalog brief (one clear decision → sj_accelerator; multiple options/parents/abroad → sj_big_picture, the default; long-horizon student → sj_true_north; professional switch → pro_pivot; leadership → pro_directors_cut; just exploring → free_cri or sj_navigator). The card already shows the name, price and the redirect link — do NOT repeat those in prose. The long-term programmes (Blueprint, Autobiography) are application-only: use actionStep(talk_to_counsellor) instead.",
    inputSchema: z.object({
      offeringId: z.enum(OFFERING_IDS).describe("The programme id from the catalog."),
      whyFit: z.string().optional().describe("One personal sentence on why THIS programme fits them."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  compareCard: tool({
    description:
      "Compare TWO options side by side — two careers, two study paths, two programmes. Use for any 'compare A and B' / 'A or B' / 'which is better for me' question INSTEAD of writing the comparison in prose. Give 2–4 crisp points per side (fit, path, outlook, ownership — whatever the decision hinges on), then a grounded pick. Ground every point in the patterns brief / careerIntelligence — never invent salary or demand.",
    inputSchema: z.object({
      aName: z.string().describe("First option, e.g. 'UX Designer'."),
      aPoints: z.array(z.string()).min(1).max(4).describe("2–4 short points about option A."),
      bName: z.string().describe("Second option, e.g. 'Product Manager'."),
      bPoints: z.array(z.string()).min(1).max(4).describe("2–4 short points about option B."),
      pick: z.string().optional().describe("Which one you'd lean toward FOR THEM, e.g. 'Start in UX'."),
      pickWhy: z.string().optional().describe("One short reason for the pick, in their language."),
    }),
    execute: async (input) => ({ compared: true, ...input }),
  }),
  followUps: tool({
    description:
      "Offer 2–4 tappable follow-up questions the member is likely to ask next, so they don't have to think of them. Call this ONCE at the end of a substantive answer (not on small talk). Phrase them in the member's first person, e.g. 'How do I get into this?' / 'What does it pay in India?' / 'Compare it with X'.",
    inputSchema: z.object({
      options: z.array(z.string()).min(2).max(4).describe("2–4 short follow-up prompts in the member's voice."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
}

// The Career Intelligence tool — available to EVERY surface (member guide,
// counsellor copilot, admin, in-call). Runs the deterministic engine over real
// cutoffs/fees/scholarships and hands back source-grounded numbers for the model
// to narrate. This is how the chatbot answers "what are my chances / which
// colleges / which scholarships / is it worth it" with real figures, never made up.
const careerIntelligence = tool({
  description:
    "Run SetMyCareer's Career Intelligence engine for a student. Use it WHENEVER someone asks about college admission chances/odds, which colleges or exams to target, scholarships they qualify for, the ROI/return of a course, or which career domain fits them. Pass whatever the student has shared (exam ranks/scores, category, income, marks); the engine handles partial input and returns admission probability vs real cutoffs, ROI, scholarship matches, employability outlook and best-fit domains. Then explain the numbers in your own voice.",
  inputSchema: z.object({
    level: z.enum(["after_8th", "after_10th", "after_12th", "ug", "pg", "working"]).optional().describe("Education stage; defaults to after_12th."),
    academicPercent: z.number().optional().describe("Class 10/12 board %"),
    jeeAdvancedRank: z.number().optional().describe("JEE Advanced CRL rank"),
    jeeMainPercentile: z.number().optional().describe("JEE Main percentile (0–100)"),
    neetScore: z.number().optional().describe("NEET-UG score out of 720"),
    category: z.enum(["general", "ews", "obc_ncl", "sc", "st"]).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    familyIncome: z.number().optional().describe("Annual family income in INR"),
    domains: z.array(z.string()).optional().describe("Domains of interest, e.g. engineering, medical, law, design, management, commerce_finance"),
  }),
  execute: async (input) => {
    const examResults: StudentProfile["examResults"] = []
    if (input.jeeAdvancedRank) examResults.push({ examId: "jee_adv", rank: input.jeeAdvancedRank })
    if (input.jeeMainPercentile) examResults.push({ examId: "jee_main", percentile: input.jeeMainPercentile })
    if (input.neetScore) examResults.push({ examId: "neet_ug", score: input.neetScore })
    const profile: StudentProfile = {
      id: "chat", level: input.level ?? "after_12th",
      academicPercent: input.academicPercent, category: input.category, gender: input.gender,
      familyIncome: input.familyIncome,
      examResults: examResults.length ? examResults : undefined,
      domains: input.domains as Domain[] | undefined,
    }
    return { intelligence: formatReport(runIntelligence(profile)) }
  },
})

// ── The marketing-site (public) generative-UI toolset ────────────────────────
// Given ONLY to the visitor guide. Each tool is a branded CARD the site renders
// from the tool input (echo-execute, same pattern as the client cards). The site
// posts in `plain` mode and reads back { text, cards }, so these let the public
// chatbot ANSWER WITH UI — a job-group snapshot, a cited resource, a page link, a
// CTA row, the free-test card, or a lead form — instead of a wall of prose. This
// both converts better and spends FEWER output tokens (the card carries the data).
//
// SITE_MAP is the allow-list of REAL destinations so links are never invented.
const SITE_MAP = [
  "SITE DESTINATIONS — link ONLY to these real paths (relative paths open in-app; never invent a path):",
  "· / — home · /product — the product tour · /framework — the 5-step method (Assess→Interpret→Map→Decide→Support) · /solutions — who it's for · /trust (+ /trust#faq) — evidence, ontology & FAQ · /pricing — packages & prices · /book — book a counselling session · /cri — the FREE Career Readiness Index (~4-min test) · /contact — talk to the team",
  "· /library — the Career Terminal (explore careers with live market data) · /library/<id> — one career's page. REAL career ids you may link to: data-scientist, ai-ml-engineer, cybersecurity-analyst, software-developer, product-manager, ux-designer, graphic-designer, content-writer, content-brand-strategist, digital-marketing, filmmaker-video-editor, chartered-accountant, investment-banking-analyst, mechanical-engineer, civil-engineer, renewable-energy-engineer, architect, clinical-psychologist, physician-mbbs, physiotherapist, biotech-research-associate. If a career isn't in this list, link to /library (never guess an id).",
  "· /resources — guides & field notes · /resources/videos — the video library · /blog — the journal",
  "· /counsellors and /experts/apply — for CAREER COUNSELLORS / DOMAIN EXPERTS who want to JOIN and practise on the platform (B2B / recruiting). /experts — the network.",
  "· /product/sample-career-report.pdf — a downloadable SAMPLE career report (use the download_sample_report action).",
  "· /pricing — the full 2026 programme catalog · /checkout/<offeringId> — buy a specific programme (sign-in required; the packageCard button handles this) · /signin — create an account / sign in on this site.",
].join("\n")

const visitorTools = {
  packageCard: tool({
    description:
      "Show ONE SetMyCareer programme/package as a branded card with its real price, inclusions, AI credits and a buy button. Use for ANY pricing/package/cost/'which plan' question — emit one packageCard per programme you recommend (max 3), ordered best-fit first. Recommend by SITUATION per the catalog brief (one clear decision → sj_accelerator; multiple options/parents/abroad → sj_big_picture, the default; long-horizon student → sj_true_north; professional switch → pro_pivot; leadership reinvention → pro_directors_cut; just exploring → free_cri or sj_navigator). The LONG-TERM programmes (Blueprint, Autobiography) are application-only — do NOT use packageCard for them; use pageLink to /programs/blueprint or /programs/autobiography.",
    inputSchema: z.object({
      offeringId: z.enum(OFFERING_IDS).describe("The programme id from the catalog."),
      whyFit: z.string().optional().describe("One personal sentence on why THIS programme fits them."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  jobGroupCard: tool({
    description:
      "Show a CAREER / JOB GROUP at a glance as a branded card. Use for ANY question about a specific career or job family — 'what does a data scientist do', 'is UX a good career', scope, salary, demand, 'careers in X'. Ground salary/demand in your knowledge (they are indicative bands, not quotes) and, when the person asks about odds/ROI/colleges, call careerIntelligence for real figures. Set careerId to a REAL id from SITE_MAP so the card links to that career's terminal page; omit it to link to /library.",
    inputSchema: z.object({
      title: z.string().describe("The career / job group, e.g. 'Data Scientist'."),
      overview: z.string().describe("One plain sentence on what they do."),
      outlook: z.enum(["Expanding", "Stable", "Cooling"]).optional().describe("Demand trajectory."),
      salaryBand: z.string().optional().describe("Indicative India range, e.g. '₹6–29 LPA'."),
      demand: z.enum(["Very High", "High", "Moderate"]).optional(),
      skills: z.array(z.string()).max(6).optional().describe("Core skills."),
      assessments: z.array(z.string()).max(3).optional().describe("SMC instruments that help decide this fit, e.g. ['Aptitude','RIASEC Interest','Big Five']."),
      careerId: z.string().optional().describe("A REAL career id from SITE_MAP (links to /library/<id>). Omit if unsure."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  resourceCard: tool({
    description:
      "Cite a RESOURCE the site offers — a guide, field note, video, article or the sample report — as a clickable card. Use when a resource genuinely helps or when asked to 'show/share' one. `to` MUST be a real path from SITE_MAP (a specific page if you know it, otherwise the section index: /resources, /resources/videos, /blog).",
    inputSchema: z.object({
      kind: z.enum(["article", "video", "fieldnote", "report", "guide"]),
      title: z.string(),
      description: z.string().describe("One line on what it covers."),
      to: z.string().describe("A REAL site path from SITE_MAP."),
      cta: z.string().optional().describe("Button label; defaults sensibly per kind."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  pageLink: tool({
    description:
      "Cite a specific SITE PAGE and give a one-click way to open it. Use when the best next move is to send them to a real page (the framework, pricing, a career, trust/FAQ). `to` MUST be a real path from SITE_MAP.",
    inputSchema: z.object({
      title: z.string().describe("The page / destination name."),
      to: z.string().describe("A REAL site path from SITE_MAP."),
      why: z.string().optional().describe("One short line on why it's relevant."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  ctaRow: tool({
    description:
      "Offer 1–3 ACTION BUTTONS as the single next step. Use when the person is ready to act (start, book, see pricing, download the sample, sign in) — put the most relevant action first. Never more than one ctaRow per reply.",
    inputSchema: z.object({
      actions: z.array(z.object({
        action: z.enum([
          "take_cri", "book_session", "download_sample_report", "see_pricing",
          "explore_careers", "sign_in_client", "sign_in_counsellor", "talk_to_expert", "contact",
        ]),
        label: z.string().optional().describe("Override the default button label."),
      })).min(1).max(3),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  criCard: tool({
    description:
      "Surface the FREE Career Readiness Index (the ~4-minute test) as a dedicated card. Use when someone is unsure where to start, wants to 'find their fit', or asks about the test — it's the strongest no-cost first step.",
    inputSchema: z.object({
      headline: z.string().optional().describe("Optional custom headline."),
      note: z.string().optional().describe("Optional one-line reason it fits them."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
  leadForm: tool({
    description:
      "Render an inline LEAD-CAPTURE form that posts into SetMyCareer's enquiry pipeline. Use when the person wants to talk to a human, asks to be contacted/called, has a complex or high-stakes situation, is a parent enquiring, or is a counsellor/expert/partner enquiry (B2B). Emit AT MOST ONE per conversation and only when a human hand-off genuinely fits — never as a nag.",
    inputSchema: z.object({
      headline: z.string().optional().describe("e.g. 'Talk to a career expert'."),
      note: z.string().optional().describe("One warm line on what happens next."),
      reason: z.string().optional().describe("Short context tag saved with the lead, e.g. 'Class 12 stream choice' or 'Counsellor enquiry'."),
    }),
    execute: async (input) => ({ shown: true, ...input }),
  }),
}

/* The marketing-site visitor guide — answers any question a prospect asks,
   grounded FIRST in the page snapshot they are actually looking at (a blog post,
   the pricing table, a career page), so "what does this mean?" works with zero
   explicit context. Answers with BRANDED CARDS (the visitorTools) rather than long
   prose — warm, clinical, conversion-minded. Sells last, one CTA, never pushy. */
function visitorSystem(ctx?: AssistantContext) {
  return [
    "You are Compass, SetMyCareer's guide on the public website (setmycareer.com). You are talking to a VISITOR who is not signed in — usually a student, parent or working professional exploring careers, sometimes a counsellor/expert or a business enquiry. This site serves BOTH: clients with career questions AND counsellors/experts/partners.",
    "SetMyCareer: career counselling since 2010 — validated psychometric assessments (aptitude, RIASEC interests, Big Five personality), certified human counsellors, an AI career coach, and written career reports. Free starting point: the Career Readiness Index at /cri (a ~4-minute readiness check). Paid: assessments, counselling sessions and packages. Booking happens at /book.",
    RESPONSE_ENGINE,
    "YOUR MISSION: be genuinely helpful AND move the person one honest step closer to starting — the free test, a session, the sample report, or a human. Warm and clinical: precise, calm, evidence-first, never hype, never pushy, no emoji. You exist to help people and to convert exploration into the right next action.",
    "",
    "ANSWER WITH CARDS, NOT WALLS OF TEXT. You have branded UI tools — prefer emitting a CARD over describing something in prose. Lead with ONE or TWO sentences of plain narration, then the relevant card(s). This is clearer for the visitor AND spends fewer tokens. Choose the card by intent:",
    "• Pricing / packages / cost / 'which plan' / 'what should I buy' → packageCard, one per programme you recommend (max 3, best fit FIRST — recommend by situation per the catalog, Big Picture is the default for multi-decision cases). The card itself shows price, inclusions, credits and the buy button, so DON'T repeat those in prose — one line of why, then the card(s). For the long-term programmes use packageCard lt_blueprint (students) or lt_autobiography (executives) and describe them as application-only.",
    "• A specific career / job group / 'what does X do' / 'is X a good career' / salary / scope / 'careers in Y' → jobGroupCard (set careerId to a real id from SITE_MAP when one matches; add assessments that map it). Optionally follow with a ctaRow [take_cri].",
    "• 'show/share a resource', a video, a guide, an article, field notes, the sample report → resourceCard (kind + a REAL `to` path). For the sample report you may instead use ctaRow [download_sample_report].",
    "• The best move is to open a real page (framework, pricing, trust/FAQ, a career) → pageLink or ctaRow.",
    "• Ready to act — start / find their fit / where do I begin / unsure → criCard (the free test) and/or ctaRow [take_cri, book_session]. Pricing intent → ctaRow [see_pricing, book_session].",
    "• Wants a human / 'call me' / complex or high-stakes / a parent enquiring / a COUNSELLOR-EXPERT-or-PARTNER (B2B) enquiry → leadForm (one only, per conversation). For counsellor/expert intent also pageLink to /counsellors or /experts/apply.",
    "CITE ONLY REAL PATHS from the SITE MAP below — never invent a URL or a career id. Every link must be one a visitor can actually open. Emit AT MOST ONE ctaRow and AT MOST ONE leadForm per reply, and don't stack competing cards — pick the single best next step.",
    "IMPORTANT: emit a card ONLY by calling its tool — NEVER write a card's fields as JSON, code, or a `<tag>` inside your text. Your written reply is only the one or two plain sentences that lead into the card(s); the card data lives in the tool call, not the prose.",
    SITE_MAP,
    CATALOG_2026_BRIEF,
    "",
    "GROUNDING — WHAT'S ON THEIR SCREEN: the context may include a snapshot of the page the visitor is reading. When their question is about 'this', 'this article/page/video', or a phrase they just read, answer FROM THE SNAPSHOT first and reference the passage. If the snapshot is only a one-line descriptor (title + heading), that means the question wasn't page-specific — just answer from your own knowledge; never say you can't see the page.",
    "Guardrails: career guidance is not a guarantee of admission, employment or salary; salary bands you show are indicative, not quotes. You are not a medical or mental-health service — if someone seems in distress, respond with warmth and point them to Tele-MANAS 14416 (India) or 988 (US) alongside a suggestion to talk to someone they trust.",
    ctx?.route ? `\nThe visitor is currently on the "${ctx.route}" page of setmycareer.com — prefer a next step that fits it (e.g. on /pricing → book/see_pricing; on a career/blog/guide → take_cri or a jobGroupCard; on /counsellors or /experts → /experts/apply or a leadForm).` : "",
    ctx?.pageContext ? `\n=== THE PAGE ON THEIR SCREEN RIGHT NOW ===\n${ctx.pageContext}\n=== END PAGE SNAPSHOT ===` : "",
  ].filter(Boolean).join("\n")
}

// ── plain-mode card helpers ──────────────────────────────────────────────────
// Singleton cards: only the first of each should render (the model sometimes
// over-calls ctaRow/leadForm/criCard). Others (jobGroupCard/resourceCard/pageLink)
// may repeat.
const SINGLETON_CARDS = new Set(["ctaRow", "leadForm", "criCard"])

type Card = { type: string } & Record<string, unknown>

function dedupeCards(cards: Card[]): Card[] {
  const seen = new Set<string>()
  const out: Card[] = []
  for (const c of cards) {
    if (SINGLETON_CARDS.has(c.type)) { if (seen.has(c.type)) continue; seen.add(c.type) }
    out.push(c)
    if (out.length >= 5) break // never flood the panel
  }
  return out
}

// Weaker models (notably Llama on Groq under a long tool list) don't always make a
// STRUCTURED tool call — they degrade to writing the card into the reply text, in
// any of three shapes: `<function=name>{…}`, `<name>{…}`, or a BARE `{…}` JSON
// object. `harvestCards` walks every balanced JSON object in the text, keeps the
// card-shaped ones (inferring the card type from its keys), and returns BOTH the
// recovered cards and the text with those objects + any wrapper tags removed — so a
// visitor never sees raw JSON, whatever the model did.
const CARD_NAMES = ["packageCard", "jobGroupCard", "resourceCard", "pageLink", "ctaRow", "criCard", "leadForm"]

function inferCardType(o: Record<string, unknown>): string | null {
  if (typeof o.type === "string" && CARD_NAMES.includes(o.type)) return o.type
  if (typeof o.offeringId === "string") return "packageCard" // {offeringId, whyFit} — the pricing card
  if (Array.isArray((o as { actions?: unknown }).actions)) return "ctaRow"
  if (typeof o.kind === "string" && typeof o.to === "string") return "resourceCard"
  if (o.overview !== undefined || o.salaryBand !== undefined || o.careerId !== undefined || o.assessments !== undefined || o.outlook !== undefined || o.demand !== undefined) return "jobGroupCard"
  if (typeof o.to === "string" && typeof o.title === "string") return "pageLink"
  if (o.reason !== undefined) return "leadForm"
  if ((o.headline !== undefined || o.note !== undefined) && Object.keys(o).length <= 2) return "criCard"
  return null
}

// spans of every top-level balanced {...} JSON object in the text. Bounded to the
// first 12k chars (model answers are short) so brace-heavy/unbalanced output can't
// make the outer×inner scan pathological.
function jsonSpans(text: string): Array<[number, number, unknown]> {
  const spans: Array<[number, number, unknown]> = []
  const n = Math.min(text.length, 12000)
  for (let i = 0; i < n; i++) {
    if (text[i] !== "{") continue
    let depth = 0, inStr = false, esc = false
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue }
      if (ch === '"') inStr = true
      else if (ch === "{") depth++
      else if (ch === "}") { depth--; if (depth === 0) { try { spans.push([i, j + 1, JSON.parse(text.slice(i, j + 1))]) } catch { /* not json */ } i = j; break } }
    }
  }
  return spans
}

function harvestCards(text: string): { cards: Card[]; text: string } {
  const cards: Card[] = []
  const cut: Array<[number, number]> = []
  for (const [start, end, val] of jsonSpans(text)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue
    const type = inferCardType(val as Record<string, unknown>)
    if (!type || type === "careerIntelligence") continue
    const { type: _t, ...rest } = val as Record<string, unknown>
    void _t
    cards.push({ type, ...rest })
    // also swallow an immediately-preceding wrapper tag like <name> or <function=name>
    let s = start
    const pre = text.slice(Math.max(0, start - 40), start)
    const tag = pre.match(/<(?:function\s*=\s*)?[a-zA-Z]\w*\s*>\s*$/)
    if (tag) s = start - tag[0].length
    cut.push([s, end])
  }
  // remove harvested spans (back-to-front) + any stray card/function tags, tidy ws
  let out = text
  for (const [s, e] of cut.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + out.slice(e)
  out = out
    .replace(new RegExp(`</?(?:function|${CARD_NAMES.join("|")})[^>]*>`, "gi"), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return { cards, text: out }
}

export async function runAssistant(opts: {
  messages: UIMessage[]
  context?: AssistantContext
  /** Gemini key — the primary brain. Falls through to env inside ai-providers
   *  when omitted, so a route need only set the GEMINI_API_KEY env var. */
  geminiKey?: string
  apiKey?: string
  openrouterKey?: string
  /** Return the full answer as JSON ({text}) instead of a UIMessage stream —
   *  for lightweight consumers (the marketing site) without the AI SDK client. */
  plain?: boolean
}): Promise<Response> {
  // The provider chain, in preference order (Gemini → OpenRouter → Groq). We keep
  // the WHOLE chain (not just the top model) so a provider outage, a bad key or a
  // hard rate-limit fails over to the next one instead of stranding the user.
  const chain = streamingChain({ gemini: opts.geminiKey, groq: opts.apiKey, openrouter: opts.openrouterKey })
  if (!chain.length) return Response.json({ error: "No AI provider configured" }, { status: 500 })

  const audience = opts.context?.audience
  const isClient = audience === "client"
  const isAdmin = audience === "admin"
  const isVisitor = audience === "visitor"
  const modelMessages = await convertToModelMessages(opts.messages)

  // Build the identical streamText call for whichever model we're trying — so the
  // system prompt, tools, and limits are the same no matter which provider serves.
  const build = (model: (typeof chain)[number]["model"]) =>
    streamText({
      model,
      system: isAdmin ? adminSystem(opts.context) : isClient ? clientSystem(opts.context) : isVisitor ? visitorSystem(opts.context) : system(opts.context),
      messages: modelMessages,
      // Every surface gets the Career Intelligence tool (so the chatbot answers
      // admission/ROI/scholarship/fit questions with real numbers in ALL contexts).
      // The member guide ALSO carries its own client-facing generative-UI cards; the
      // PUBLIC visitor guide carries its own marketing cards (job groups, resources,
      // page links, CTAs, the free test, lead forms); the counsellor copilot carries
      // the in-app action cards; the admin gets careerIntelligence only.
      tools: isAdmin
        ? { careerIntelligence } // no cards for the admin analytics surface
        : isVisitor
          ? { careerIntelligence, ...visitorTools }
          : isClient
            ? { careerIntelligence, ...clientTools }
            : { ...tools, careerIntelligence },
      // allow the model to call a tool (or several) and then narrate in the same turn.
      // The member guide may surface many cards; the visitor bot is kept snappier.
      stopWhen: stepCountIs(isClient ? 8 : isVisitor ? 5 : 4),
      temperature: isClient ? 0.5 : 0.4,
      // maxRetries: 0 — do NOT retry on the SAME provider. A free-tier 429 carries a
      // long Retry-After (tens of seconds); honouring it hangs the function to a
      // timeout. Instead fail over to the NEXT provider immediately (plain mode loops
      // the chain below; streaming surfaces onError + the client's own retry).
      maxRetries: 0,
    })

  // plain mode (the marketing site's visitor guide): drain the answer server-side
  // and hand back one JSON payload. Try each provider in turn so the public bot
  // never dies when the primary is down — return the first that yields text, and
  // tell the caller which provider served (telemetry, and to prove the switch).
  if (opts.plain) {
    let lastErr: unknown
    for (const { name, model } of chain) {
      try {
        const r = build(model)
        // Collect generative-UI tool calls across ALL steps — with echo-execute
        // tools the model calls a card in one step then narrates in the next, so
        // `result.toolCalls` (final step only) misses them. careerIntelligence is
        // an internal data tool (feeds the answer), not a card — exclude it.
        const [rawText, steps] = await Promise.all([r.text, r.steps])
        const structured: Card[] = (steps ?? [])
          .flatMap((s) => s.toolCalls ?? [])
          .filter((tc) => tc.toolName !== "careerIntelligence")
          .map((tc) => ({ type: tc.toolName, ...(tc.input as Record<string, unknown>) }))
        // Always clean the text of any card JSON/tags the model leaked; recover
        // cards from that text only if it didn't make a structured tool call.
        const harvested = harvestCards(rawText)
        const cards = dedupeCards(structured.length ? structured : harvested.cards)
        const text = harvested.text
        if ((text && text.trim()) || cards.length) {
          return Response.json({ text, cards, provider: name }, { headers: { "x-ai-provider": name } })
        }
      } catch (err) {
        lastErr = err // fall through to the next provider
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
    const friendly = /rate|429|quota|capacity|overload|limit|too many/i.test(msg)
      ? "I'm momentarily at the model's rate limit — give me a few seconds and ask again."
      : "I hit a brief hiccup reaching the model. Please try that again in a moment."
    return Response.json({ text: friendly, provider: "none" })
  }

  // Streaming mode (the in-app copilots): stream from the primary provider. A token
  // stream can't be re-pointed mid-flight, so cross-provider failover here happens
  // at the SDK-retry level (maxRetries) plus the client's own one-shot retry; the
  // x-ai-provider header lets us observe which brain answered.
  const primary = chain[0]
  if (!primary) return Response.json({ error: "No AI provider configured" }, { status: 500 })
  const streamed = build(primary.model).toUIMessageStreamResponse({
    // Never show the counsellor a raw "An error occurred." Most failures are a
    // momentary provider rate-limit; say so plainly and recoverably (the client
    // also auto-retries once before this is ever seen).
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      if (/rate|429|quota|capacity|overload|limit|too many/i.test(msg)) {
        return "I'm momentarily at the model's rate limit — give me a few seconds and send that again. Nothing you typed was lost."
      }
      return "I hit a brief hiccup reaching the model. Please try that again in a moment."
    },
  })
  return withProviderHeader(streamed, primary.name)
}

/** Tag a streamed Response with which provider served it (observability). */
function withProviderHeader(res: Response, provider: string): Response {
  const headers = new Headers(res.headers)
  headers.set("x-ai-provider", provider)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
