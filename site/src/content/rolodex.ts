// The rolodex — real career questions people actually ask, from the SetMyCareer
// question taxonomy (grouped by audience). They cycle subtly through the chat
// bar's placeholder, chosen by the visitor's current route so the prompt speaks
// to whoever is likely reading. Kept short so each reads cleanly as a prompt.

type Bucket = "student" | "parent" | "graduate" | "professional" | "returner" | "founder" | "exec"

// Kept short and punchy so each reads cleanly inside the compact pill.
const Q: Record<Bucket, string[]> = {
  student: [
    "Which stream after 10th?",
    "Passion or paycheck?",
    "What if I pick the wrong career?",
    "Which careers have a future?",
    "How do I find my strengths?",
    "Is engineering right for me?",
    "I'm confused — where do I start?",
    "Do I need a top college?",
    "Study in India or abroad?",
    "Which skills should I learn now?",
  ],
  parent: [
    "Which career is safe for my child?",
    "Marks, or interest?",
    "How do I guide without forcing?",
    "What's the best ROI in education?",
    "Does my child have an aptitude?",
    "Is coaching really necessary?",
    "What if they pick an odd path?",
  ],
  graduate: [
    "How do I land my first job?",
    "Experience without experience?",
    "MBA now, or later?",
    "Which skills are most hireable?",
    "Coding, data, or AI?",
    "How do I stand out to recruiters?",
    "How do I dodge a dead-end job?",
  ],
  professional: [
    "Is it too late to switch?",
    "Why do I feel stuck?",
    "How do I future-proof my career?",
    "Should I move into management?",
    "How do I get promoted?",
    "Which skills keep me relevant?",
    "Change jobs, or stay?",
  ],
  returner: [
    "How do I explain a career gap?",
    "How do I restart after a break?",
    "Will the break count against me?",
    "How do I rebuild my confidence?",
    "Which roles suit returners?",
    "Should I pivot to something new?",
  ],
  founder: [
    "Business, or a job?",
    "Is entrepreneurship for me?",
    "Quit my job to start up?",
    "How do I find an idea?",
    "Bootstrap, or raise?",
  ],
  exec: [
    "What skills will we need next?",
    "How do I retain top talent?",
    "How do I prepare my team for AI?",
    "How do I design career paths?",
    "How do I spot leadership potential?",
  ],
}

// interleave the bucket lists so the rotation samples across audiences
function interleave(lists: string[][]): string[] {
  const out: string[] = []
  const max = Math.max(0, ...lists.map((l) => l.length))
  for (let i = 0; i < max; i++) for (const l of lists) if (i < l.length) out.push(l[i])
  return out
}

// route → the audiences most likely reading it
const ROUTE_BUCKETS: { test: RegExp; buckets: Bucket[] }[] = [
  { test: /^\/solutions/, buckets: ["student", "parent", "graduate", "professional", "returner", "exec"] },
  { test: /^\/experts/, buckets: ["professional", "returner", "graduate"] },
  { test: /^\/(framework|library|resources|blog)/, buckets: ["student", "graduate", "professional"] },
  { test: /^\/(pricing|book|cri|product)/, buckets: ["parent", "student", "graduate"] },
  { test: /^\/trust/, buckets: ["parent", "student", "professional"] },
]

const DEFAULT: Bucket[] = ["student", "parent", "graduate", "professional", "returner"]

export function rolodexFor(pathname: string): string[] {
  const match = ROUTE_BUCKETS.find((r) => r.test.test(pathname))
  const buckets = match ? match.buckets : DEFAULT
  return interleave(buckets.map((b) => Q[b]))
}
