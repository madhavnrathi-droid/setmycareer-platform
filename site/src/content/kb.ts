// Knowledge base for the floating Compass bar — every answer is drawn from
// content that already lives on the site (FAQ, framework, pricing, the cited
// market data), so the bar can never say something the site doesn't stand behind.

import { FAQ } from "./faq"
import { IA_CONTENT } from "./ia"
import { DEMOS } from "./demos"

export interface KbEntry {
  keywords: string[]
  title: string
  answer: string
  links: { label: string; to: string }[]
}

const marketTop = DEMOS.market.filter((m) => m.unit === "%").slice(0, 4)

export const KB: KbEntry[] = [
  // the FAQ, verbatim
  ...FAQ.map((f) => ({
    keywords: f.q.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
    title: f.q,
    answer: f.a,
    links: [{ label: "All questions", to: "/trust#faq" }],
  })),
  {
    keywords: ["job", "market", "demand", "growth", "growing", "fastest", "future", "jobs", "hiring", "ai", "automation"],
    title: "Where the job market is actually growing",
    answer: `The fastest-growing roles right now, from the sources we cite on this site: ${marketTop.map((m) => `${m.label} (+${m.value}%, ${m.source})`).join("; ")}. The WEF projects a net gain of 78 million jobs worldwide by 2030 — but the gains and losses land unevenly, which is exactly why we set every recommendation against labour-market data, not vibes.`,
    links: [{ label: "The live data", to: "/product#reports" }, { label: "Emerging careers", to: "/library#emerging" }],
  },
  {
    keywords: ["counselling", "process", "work", "works", "session", "happens", "steps", "method", "how"],
    title: "How the counselling process works",
    answer: "Five steps: Assess (validated aptitude, interest and personality instruments, scored live), Interpret (a certified counsellor reads the scores as a pattern), Map (specific streams, courses and fields), Decide (each option weighed against admission odds, ROI and fit), and Support (through admissions and after). AI does the measuring and drafting; the counsellor does the judging.",
    links: [{ label: "The framework", to: "/framework" }, { label: "Book a session", to: "/book" }],
  },
  {
    keywords: ["price", "cost", "pricing", "fees", "much", "pay", "package", "packages", "money", "rupees"],
    title: "What it costs",
    answer: `${IA_CONTENT.pricing.positioning} Career Clarity Index — free. Stream Selector — ₹1,990. Job Domain Selector — ₹2,490. Full Career Counselling — quoted to the engagement. Every tier is itemised on the pricing page; the free index is the honest place to start.`,
    links: [{ label: "Pricing, itemised", to: "/pricing" }, { label: "Take the free index", to: "/cri" }],
  },
  {
    keywords: ["free", "test", "index", "cri", "clarity", "readiness", "check", "quiz", "assessment", "start"],
    title: "The free Career Clarity Index",
    answer: "Twenty statements, about four minutes, five factor indices — self-awareness, clarity, decision readiness, future preparedness and influence resistance — with an honest report on screen. There's a student version (CRI™) and one for working professionals (ECRI™). It tells you how urgently you need guidance, including when you don't.",
    links: [{ label: "Take it now", to: "/cri" }],
  },
  {
    keywords: ["stream", "class", "10th", "10", "science", "commerce", "arts", "choose", "pick", "school"],
    title: "Choosing a stream after Class 10",
    answer: "Weigh three inputs in order: aptitude first (where effort compounds fastest), then interest (what holds your attention unprompted), then opportunity. Two myths to drop: science is not a 'safe superset' if you lack the aptitude for it, and commerce/arts are not fallbacks — both lead to strong professions. Almost nothing is irreversible; decide carefully, hold it lightly.",
    links: [{ label: "The full guide", to: "/blog/choosing-a-stream-after-class-10" }, { label: "Stream Selector", to: "/pricing" }],
  },
  {
    keywords: ["jee", "neet", "engineering", "medicine", "doctor", "exam", "entrance", "binary", "coaching"],
    title: "Beyond the JEE/NEET binary",
    answer: "Engineering and medicine are two roads on a continent — after Class 12 the real map includes pure sciences, economics, design (NID/NIFT/UCEED), law (CLAT), psychology, data, allied health and more. The binary persists because it's legible, not because it fits you. Read your own aptitudes first, then test each option against its daily work.",
    links: [{ label: "The essay", to: "/blog/beyond-the-jee-neet-binary" }, { label: "Career comparisons", to: "/library#comparisons" }],
  },
  {
    keywords: ["switch", "change", "career", "thirty", "30", "professional", "transition", "quit", "stuck", "stagnation"],
    title: "Changing careers as a working professional",
    answer: "Test the switch with evidence before you jump: re-measure aptitude and interest (they drift), map adjacent roles rather than romantic leaps, and price the runway honestly — EMIs included. The ECRI (free, 4 minutes) tells you which of those pieces is actually missing.",
    links: [{ label: "The guide", to: "/blog/changing-careers-at-thirty-in-india" }, { label: "Take the ECRI", to: "/cri" }],
  },
  {
    keywords: ["counsellor", "counselor", "expert", "who", "people", "network", "roster", "join", "become"],
    title: "The counsellors",
    answer: "55+ certified counsellors, trained on a method refined over fifteen years, led by Dr. Nandkishore Rathi (PhD, IIT Bombay; Mercer Asia Award). The full roster is live on the network page — real names, photos, expertise and experience. Counsellors can also apply to join.",
    links: [{ label: "Meet the roster", to: "/experts" }, { label: "Become an expert", to: "/experts/apply" }],
  },
  {
    keywords: ["book", "session", "talk", "appointment", "schedule", "call", "meet"],
    title: "Booking a session",
    answer: "Three steps: create a free account, pick a counsellor and time, and come as you are — no preparation needed, no commitment beyond the conversation. Sessions are on video, and parents are welcome to join.",
    links: [{ label: "Book a session", to: "/book" }],
  },
  {
    keywords: ["report", "results", "get", "receive", "psychometric", "big", "five", "riasec", "personality"],
    title: "The assessments and the report",
    answer: "The real instruments are a Big Five personality assessment, a RIASEC interest inventory and a multi-part aptitude battery — scored live online. AI drafts the report; a certified counsellor interprets, edits and owns it. What you receive is a ranked shortlist with the reasoning shown, plus admission odds and ROI per path.",
    links: [{ label: "See a report build itself", to: "/product#reports" }, { label: "The science", to: "/framework#science" }],
  },
]

export const KB_CHIPS = [
  { label: "Is counselling worth it?", q: "is career counselling worth it" },
  { label: "What does it cost?", q: "what does it cost" },
  { label: "Where are jobs growing?", q: "fastest growing jobs market" },
  { label: "JEE or something else?", q: "jee neet engineering alternatives" },
]

/* keyword scorer — small, predictable, no network */
export function searchKb(query: string): KbEntry[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  if (!words.length) return []
  const scored = KB.map((e) => {
    const hay = new Set([...e.keywords, ...e.title.toLowerCase().split(/\W+/)])
    let score = 0
    for (const w of words) { if (hay.has(w)) score += 2; else if ([...hay].some((k) => k.startsWith(w) || w.startsWith(k))) score += 1 }
    return { e, score }
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map((s) => s.e)
}
