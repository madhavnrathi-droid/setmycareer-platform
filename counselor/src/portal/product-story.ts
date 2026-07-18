// Sales storytelling for the product/checkout pages. Each product gets a scroll
// narrative — a promise, a "how it works" map, an interactive mock report + test
// preview (so a buyer sees exactly what they'll get), why it matters, and which
// other products pair with it. Bespoke content for the hero products (Stream
// Selector first); everything else gets a sensible default generated from the
// catalogue fields so the page is complete for every product.

import { getProduct, type Product, type ProductCategory } from "./products"

export interface ProcessStep { kicker: string; title: string; desc: string }
export interface StatPoint { value: string; label: string }
/** One interactive fit-bar in the mock report (hover/focus reveals `note`). */
export interface MockBar { label: string; value: number; note: string }
export interface MockReport { title: string; subtitle: string; bars: MockBar[]; callouts: { title: string; desc: string }[] }
export interface MockTest { intro: string; question: string; options: string[]; progress: string }
export interface PairItem { productId: string; why: string }

export interface ProductStory {
  hero: { kicker: string; promise: string }
  process: ProcessStep[]
  report?: MockReport
  test?: MockTest
  whyTitle: string
  whyBody: string
  stats: StatPoint[]
  pairsTitle: string
  pairs: PairItem[]
}

// ── bespoke stories ──────────────────────────────────────────────────────────

const STORY: Record<string, ProductStory> = {
  stream_selector: {
    hero: {
      kicker: "Class 10 → the right stream",
      promise: "Choose Science, Commerce or Arts with evidence — not pressure, peers or guesswork. One 30-minute test, one clear answer.",
    },
    process: [
      { kicker: "Step 1", title: "Take the 30-minute test", desc: "A validated psychometric test reads your interests, aptitude and personality. On any device, no preparation needed." },
      { kicker: "Step 2", title: "We model all 7 streams", desc: "Your responses are scored against every academic stream to find genuine fit — not what's popular or expected." },
      { kicker: "Step 3", title: "Get your best-fit report", desc: "A ranked, plain-English report names your strongest stream and the exact traits behind it — ready to discuss at home." },
    ],
    report: {
      title: "Your stream-fit, ranked",
      subtitle: "A preview of the report you'll receive",
      bars: [
        { label: "Science (PCM)", value: 88, note: "Strong logical & spatial reasoning, high interest in how systems work." },
        { label: "Science (PCB)", value: 71, note: "Solid investigative drive, but lower pull toward life-sciences specifics." },
        { label: "Commerce + Maths", value: 64, note: "Enterprising and numerical — a viable second track." },
        { label: "Commerce", value: 57, note: "Comfort with structure and money, less with abstraction." },
        { label: "Humanities", value: 49, note: "Real curiosity, but your aptitude peaks elsewhere." },
        { label: "Design", value: 44, note: "Creative spark present; not your strongest evidenced fit." },
        { label: "Vocational", value: 38, note: "Hands-on interest is moderate relative to your top streams." },
      ],
      callouts: [
        { title: "Ranked, never binary", desc: "Every stream is scored, so a close second is never a surprise." },
        { title: "Evidence for each score", desc: "Each number traces back to the traits that produced it." },
        { title: "Built to discuss", desc: "Designed to settle the dinner-table debate with data, calmly." },
      ],
    },
    test: {
      intro: "A glimpse of the actual test",
      question: "I enjoy figuring out how machines and systems actually work.",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      progress: "Question 7 of 30",
    },
    whyTitle: "Why getting this right matters",
    whyBody: "The stream you pick at 16 quietly decides the degrees, entrance exams and careers open to you at 22. A wrong guess can cost years and lakhs to undo. Stream Selector replaces pressure and hearsay with a validated, personal read — so the choice stays yours, just made with evidence.",
    stats: [
      { value: "2 yrs", label: "saved by avoiding a wrong-stream switch" },
      { value: "7", label: "streams scientifically compared" },
      { value: "38", label: "cities we assess across" },
    ],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "job_domain", why: "Once your stream is set, find the industry it leads toward." },
      { productId: "success_package", why: "Go further — subjects, courses and a counsellor session." },
      { productId: "consultation", why: "Talk your result through with a counsellor before you decide." },
    ],
  },

  job_domain: {
    hero: { kicker: "Find your industry", promise: "Know the exact domain your strengths belong in — across 22 industries, ranked by genuine fit, not job-board noise." },
    process: [
      { kicker: "Step 1", title: "Take the 30-min test", desc: "An international-level psychometric battery reads your interests, personality and aptitude." },
      { kicker: "Step 2", title: "We map 22 domains", desc: "Your profile is scored against every major industry to surface real fit." },
      { kicker: "Step 3", title: "Get your top 3 domains", desc: "A ranked report names your three strongest domains and exactly why each fits." },
    ],
    report: {
      title: "Your domain fit, ranked",
      subtitle: "A preview of the report you'll receive",
      bars: [
        { label: "Technology & Engineering", value: 84, note: "Analytical depth and systems-thinking point here first." },
        { label: "Finance & Consulting", value: 76, note: "Strong numerical reasoning and structured problem-solving." },
        { label: "Healthcare & Life Sciences", value: 67, note: "Investigative interest is high; the people-facing load is the trade-off." },
        { label: "Creative & Media", value: 60, note: "Genuine creative pull, a step behind your analytical edge." },
        { label: "Public & Social impact", value: 54, note: "Values align; your aptitude peaks in more technical domains." },
        { label: "Operations & Supply", value: 48, note: "Comfort with process, less with open-ended ambiguity." },
        { label: "Sales & Business Dev", value: 42, note: "Possible, but not where your evidence concentrates." },
      ],
      callouts: [
        { title: "Top 3, ranked", desc: "Three strong domains in order of fit — not one risky bet." },
        { title: "Industry-level", desc: "Mapped to real industries, not vague 'career clusters'." },
        { title: "Job-market aware", desc: "Points you where you'll thrive and hire well." },
      ],
    },
    test: { intro: "A glimpse of the actual test", question: "I'd rather crack a hard analytical problem alone than rally a team around a goal.", options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], progress: "Question 12 of 30" },
    whyTitle: "Why the right domain matters",
    whyBody: "Most people pick a job title and back into an industry by accident. Knowing your domain first means every application, internship and skill compounds in one direction — instead of scattering across industries that were never your fit.",
    stats: [{ value: "22", label: "industries scientifically compared" }, { value: "Top 3", label: "domains ranked by your fit" }, { value: "30 min", label: "to a clear shortlist" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "success_package", why: "Turn your domains into a full plan with a counsellor." },
      { productId: "stream_selector", why: "Earlier in school? Get your academic stream first." },
      { productId: "additional_session", why: "Revisit your domains as your goals evolve." },
    ],
  },

  diy_career: {
    hero: { kicker: "Explore on your own", promise: "The full psychometric battery and reports — yours to explore at your own pace, no counsellor required." },
    process: [
      { kicker: "Step 1", title: "Take the full battery", desc: "Interest, personality and aptitude assessments — international-level, self-paced." },
      { kicker: "Step 2", title: "Get your reports", desc: "Detailed self-analysis reports unpack every dimension of your profile." },
      { kicker: "Step 3", title: "Explore independently", desc: "Use your evidence to research careers and decide on your own terms." },
    ],
    report: {
      title: "Your profile, decoded",
      subtitle: "A preview of your self-analysis",
      bars: [
        { label: "Investigative", value: 82, note: "You're energised by analysis, research and root-cause thinking." },
        { label: "Enterprising", value: 69, note: "Comfortable driving outcomes and persuading — a real secondary strength." },
        { label: "Realistic", value: 63, note: "You like tangible, build-it work more than most." },
        { label: "Artistic", value: 57, note: "Creative interest present; best expressed applied to problems." },
        { label: "Social", value: 51, note: "You can work with people, but it isn't your primary fuel." },
        { label: "Conventional", value: 46, note: "Structure helps you, though routine alone won't satisfy." },
      ],
      callouts: [
        { title: "Every dimension", desc: "Interests, personality and aptitude — the full picture, not a slice." },
        { title: "Yours to keep", desc: "Reports stay in your account to revisit whenever you explore." },
        { title: "No appointment", desc: "Self-paced and self-serve — depth without the calendar." },
      ],
    },
    test: { intro: "A glimpse of the actual test", question: "I get real satisfaction from understanding why something works, even with no immediate use for it.", options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], progress: "Question 18 of 45" },
    whyTitle: "Why self-knowledge pays off",
    whyBody: "Every good career decision starts from an honest read of yourself. The DIY battery gives you the same scientific profile our counsellors use — so whether you decide alone or bring it to a session later, you're arguing from evidence, not vibes.",
    stats: [{ value: "3", label: "assessments in one battery" }, { value: "Self-paced", label: "explore on your schedule" }, { value: "100%", label: "yours to keep & revisit" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "consultation", why: "Bring your reports to a counsellor to go deeper." },
      { productId: "success_package", why: "Add guided sessions and a synthesised plan." },
      { productId: "job_domain", why: "Zero in on the single best industry for you." },
    ],
  },

  consultation: {
    hero: { kicker: "Talk it through", promise: "Thirty focused minutes with a career counsellor to name what's really holding you back — and the one next step that moves it." },
    process: [
      { kicker: "Step 1", title: "Book a slot", desc: "Pick a time that suits you, online or at a centre in 38 cities." },
      { kicker: "Step 2", title: "Meet your counsellor", desc: "A focused 30-minute conversation that diagnoses your real concern." },
      { kicker: "Step 3", title: "Leave with clarity", desc: "A sharp problem statement and the right next step — no fluff." },
    ],
    whyTitle: "Why start with a conversation",
    whyBody: "Sometimes you don't need a full package — you need a clear-eyed expert to tell you what the actual problem is. A consultation cuts through the noise in half an hour, so whatever you do next is aimed at the right target.",
    stats: [{ value: "30 min", label: "focused, 1:1 with a counsellor" }, { value: "38", label: "cities, online or offline" }, { value: "1", label: "clear next step to act on" }],
    pairsTitle: "Where it leads",
    pairs: [
      { productId: "success_package", why: "Go deeper than one conversation with a full plan." },
      { productId: "stream_selector", why: "Add hard evidence if it's a stream decision." },
      { productId: "job_domain", why: "Pin down your industry with a psychometric test." },
    ],
  },

  success_package: {
    hero: { kicker: "The complete plan", promise: "Assessment, a McKinsey-grade report and guided counsellor sessions — the full path from 'I'm unsure' to a confident, evidenced decision." },
    process: [
      { kicker: "Step 1", title: "Assess passion & potential", desc: "Interest and personality assessments build your complete profile." },
      { kicker: "Step 2", title: "Get your report", desc: "A detailed Career Intelligence Report on your best-fit options." },
      { kicker: "Step 3", title: "Discuss your options", desc: "Guided sessions turn the report into a decision you own." },
    ],
    report: {
      title: "Your career routes, modelled",
      subtitle: "A preview of your Career Intelligence Report",
      bars: [
        { label: "Lead route", value: 78, note: "The path your data most clearly supports — your highest-base-rate move." },
        { label: "Specialist route", value: 71, note: "Going deeper on craft until you're the person teams rely on." },
        { label: "Leadership route", value: 63, note: "Trading individual contribution for scope, people and outcomes." },
        { label: "Adjacent pivot", value: 55, note: "A hedged step sideways — same strengths, new context." },
      ],
      callouts: [
        { title: "Modelled, not guessed", desc: "Each route carries a modelled success probability and horizon." },
        { title: "Counsellor-explained", desc: "A real person walks you through every option in your sessions." },
        { title: "A 90-day plan", desc: "You leave with a sequenced action plan, not just insight." },
      ],
    },
    test: { intro: "Part of your assessment", question: "I do my best work when the outcome is clearly measurable.", options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], progress: "Interest + Personality" },
    whyTitle: "Why the full package",
    whyBody: "A test tells you about yourself; a counsellor tells you what to do about it. The Career Success Packages pair both — the science of who you are with the judgement of someone who's guided thousands — so the decision is evidenced and genuinely yours.",
    stats: [{ value: "2", label: "scientific assessments" }, { value: "1", label: "detailed report, explained" }, { value: "1–3", label: "guided counsellor sessions" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "admission", why: "Once direction is set, get into the right college." },
      { productId: "additional_session", why: "Keep a session in reserve to revisit later." },
      { productId: "psych_consult", why: "Protect the reserves that make the plan stick." },
    ],
  },

  admission: {
    hero: { kicker: "Get in, not just decided", promise: "Shortlist the right colleges, confirm real eligibility, and get application support — right up to admission." },
    process: [
      { kicker: "Step 1", title: "Shortlist colleges", desc: "We match you to colleges for your course, city and profile." },
      { kicker: "Step 2", title: "Check eligibility", desc: "Eligibility, fees and official links — verified, not guessed." },
      { kicker: "Step 3", title: "Apply with support", desc: "Guidance through applications, all the way to admission." },
    ],
    report: {
      title: "Your college shortlist",
      subtitle: "Ranked by overall match",
      bars: [
        { label: "Target · College A", value: 89, note: "Your best-balanced pick — strong course fit and a realistic admit." },
        { label: "Safe · College B", value: 84, note: "High admission odds with a course you'd genuinely enjoy." },
        { label: "Target · College C", value: 80, note: "Solid fit on course and city; competitive but reachable." },
        { label: "Safe · College D", value: 75, note: "A reliable fallback that still matches your goals." },
        { label: "Reach · College E", value: 64, note: "A stretch on cut-offs, but a superb fit if it lands." },
      ],
      callouts: [
        { title: "Real eligibility", desc: "Cut-offs, fees and links checked — so you don't waste applications." },
        { title: "City-specific", desc: "Tuned to the cities you'll actually study in." },
        { title: "Application support", desc: "Help filling and submitting, not just a list to chase alone." },
      ],
    },
    whyTitle: "Why guided admissions",
    whyBody: "Choosing a course is half the battle — getting in is the other half. The wrong shortlist burns months and applications; the right one, eligibility verified and forms supported, turns a stressful scramble into a clear, sequenced campaign.",
    stats: [{ value: "10–40", label: "colleges shortlisted to fit" }, { value: "Exact", label: "eligibility, fees & contacts" }, { value: "Till admission", label: "support that doesn't stop early" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "success_package", why: "Be sure of the course before you apply." },
      { productId: "personality_dev", why: "Sharpen interviews and how you present." },
      { productId: "consultation", why: "Talk a tricky admissions call through first." },
    ],
  },

  psych_consult: {
    hero: { kicker: "Steadier reserves", promise: "Confidential 1:1 support for your wellbeing — because clearer thinking and steadier nerves make every career decision better." },
    process: [
      { kicker: "Step 1", title: "Book a session", desc: "A confidential slot with a counselling psychologist, online or offline." },
      { kicker: "Step 2", title: "Talk, safely", desc: "A judgement-free space to work through what's weighing on you." },
      { kicker: "Step 3", title: "Leave lighter", desc: "Practical tools and a steadier footing to carry forward." },
    ],
    whyTitle: "Why wellbeing is career work",
    whyBody: "Burnout, anxiety and self-doubt quietly sabotage good decisions. Psychological counselling isn't separate from your career — it's the reserve that decides whether your plans actually stick. A steadier you makes better calls.",
    stats: [{ value: "1:1", label: "with a counselling psychologist" }, { value: "100%", label: "confidential, always" }, { value: "38", label: "cities, online or offline" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "success_package", why: "Pair wellbeing with a clear career plan." },
      { productId: "coaching_mentoring", why: "Sustained support over the long haul." },
    ],
  },

  coaching_mentoring: {
    hero: { kicker: "The long game", promise: "1:1 mentoring across 1–3 years to build your personality, portfolio and goals — end-to-end career development, not a one-off." },
    process: [
      { kicker: "Step 1", title: "Set the direction", desc: "We map where you are and where you want to be." },
      { kicker: "Step 2", title: "Build, session by session", desc: "25–100 sessions develop personality, portfolio and skills." },
      { kicker: "Step 3", title: "Hit real milestones", desc: "Short- and long-term goals, tracked and adjusted as you grow." },
    ],
    whyTitle: "Why long-term mentoring",
    whyBody: "Big careers aren't built in a single session. A mentor who knows your story over years compounds small, consistent gains into a portfolio and presence no quick fix can match — and keeps you accountable when motivation dips.",
    stats: [{ value: "25–100", label: "sessions across 1–3 years" }, { value: "1:1", label: "with a dedicated mentor" }, { value: "Hybrid", label: "online, offline or both" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "success_package", why: "Anchor the mentoring to a clear plan." },
      { productId: "personality_dev", why: "Add focused skill sprints along the way." },
    ],
  },

  personality_dev: {
    hero: { kicker: "Show up sharper", promise: "Communication, presence, CV and interview skills — so you're as impressive in the room as you are on paper." },
    process: [
      { kicker: "Step 1", title: "Spot the gaps", desc: "We pinpoint what's holding your presentation back." },
      { kicker: "Step 2", title: "Practise deliberately", desc: "CV, communication and mock interviews, with real feedback." },
      { kicker: "Step 3", title: "Perform when it counts", desc: "Walk into interviews and rooms with earned confidence." },
    ],
    whyTitle: "Why presentation matters",
    whyBody: "The best-qualified candidate doesn't always win — the best-prepared one does. Sharpening how you communicate, write and interview closes the gap between your real ability and how it lands on the people deciding your future.",
    stats: [{ value: "CV", label: "writing that gets read" }, { value: "Mock", label: "interviews with feedback" }, { value: "38", label: "cities, online or offline" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "admission", why: "Nail the interviews your applications earn." },
      { productId: "success_package", why: "Know the direction you're presenting toward." },
    ],
  },

  additional_session: {
    hero: { kicker: "Revisit, anytime", promise: "Already taken a package? Reopen your options with a counsellor — because your mind, and the world, change over time." },
    process: [
      { kicker: "Step 1", title: "Pick a time", desc: "Book a 60-minute session whenever you need to revisit." },
      { kicker: "Step 2", title: "Reopen your options", desc: "Walk back through your reports and what's changed since." },
      { kicker: "Step 3", title: "Decide with confidence", desc: "Re-confirm your path or pivot — without second-guessing." },
    ],
    whyTitle: "Why revisit",
    whyBody: "The plan that fit you a year ago may not fit the you of today. A periodic session re-pressure-tests your direction against new information and a changed you — cheap insurance against drifting into a decision you'll regret.",
    stats: [{ value: "60 min", label: "with your counsellor" }, { value: "Reports", label: "already on file, ready" }, { value: "Anytime", label: "as your goals shift" }],
    pairsTitle: "Pairs well with",
    pairs: [
      { productId: "success_package", why: "The package your session builds on." },
      { productId: "psych_consult", why: "Add wellbeing support if the pivot is heavy." },
    ],
  },
}

// ── generated default for everything else ────────────────────────────────────

const PROCESS_BY_CATEGORY: Record<ProductCategory, ProcessStep[]> = {
  journey2026: [
    { kicker: "Step 1", title: "Assess", desc: "Scientific assessments map your interests, personality and competencies." },
    { kicker: "Step 2", title: "Decide with a counsellor", desc: "Guided sessions turn your reports into one clear decision." },
    { kicker: "Step 3", title: "Act with your copilot", desc: "Your AI Career Copilot and action plan keep the momentum between sessions." },
  ],
  professional2026: [
    { kicker: "Step 1", title: "Diagnose", desc: "A senior counsellor maps where your career stands and what's next." },
    { kicker: "Step 2", title: "Strategise", desc: "Structured sessions build the move — pivot, promotion or reinvention." },
    { kicker: "Step 3", title: "Execute", desc: "An executive plan, plus your AI Career Copilot to keep it on track." },
  ],
  marketplace2026: [
    { kicker: "Step 1", title: "Pick your expert or service", desc: "Choose the practitioner or support that fits your question." },
    { kicker: "Step 2", title: "Meet 1:1", desc: "A focused conversation with someone who has actually done it." },
    { kicker: "Step 3", title: "Move forward", desc: "Leave with specific, first-hand answers and next steps." },
  ],
  longterm2026: [
    { kicker: "Step 1", title: "Apply", desc: "Tell us your situation and what you want over the years ahead — no cost, no obligation." },
    { kicker: "Step 2", title: "Discovery conversation", desc: "A senior counsellor talks it through and shapes a bespoke multi-year roadmap." },
    { kicker: "Step 3", title: "Walk it together", desc: "A dedicated mentor stays with you — re-assessing and re-planning as you grow." },
  ],
  assessment: [
    { kicker: "Step 1", title: "Take the test", desc: "A validated psychometric test on any device — no preparation needed." },
    { kicker: "Step 2", title: "We analyse it", desc: "Your responses are scored by our engine against the full model." },
    { kicker: "Step 3", title: "Get your report", desc: "A clear, personal report you can act on and discuss." },
  ],
  consultation: [
    { kicker: "Step 1", title: "Book a slot", desc: "Pick a time that suits you — online or at a centre." },
    { kicker: "Step 2", title: "Meet your counsellor", desc: "A focused conversation that diagnoses your real concern." },
    { kicker: "Step 3", title: "Leave with a plan", desc: "A clear problem statement and the right next step for you." },
  ],
  package: [
    { kicker: "Step 1", title: "Assess passion & potential", desc: "Interest and personality assessments build your profile." },
    { kicker: "Step 2", title: "Get your report", desc: "A detailed report on your best-fit options, explained." },
    { kicker: "Step 3", title: "Discuss your options", desc: "Guided sessions turn the report into a confident decision." },
  ],
  admission: [
    { kicker: "Step 1", title: "Shortlist colleges", desc: "We match you to the right colleges for your course and city." },
    { kicker: "Step 2", title: "Check eligibility", desc: "Eligibility, fees and links — verified, not guessed." },
    { kicker: "Step 3", title: "Apply with support", desc: "Guidance through applications, right up to admission." },
  ],
  ongoing: [
    { kicker: "Step 1", title: "Start with a session", desc: "We meet you where you are and set the direction." },
    { kicker: "Step 2", title: "Work the plan", desc: "Regular, structured sessions build real momentum." },
    { kicker: "Step 3", title: "Track your growth", desc: "Progress you can see, adjusted as you evolve." },
  ],
  addon: [
    { kicker: "Step 1", title: "Pick a time", desc: "Book whenever you need to revisit your guidance." },
    { kicker: "Step 2", title: "Revisit your options", desc: "Reopen your reports and talk through what's changed." },
    { kicker: "Step 3", title: "Decide with confidence", desc: "Re-confirm or pivot — without second-guessing." },
  ],
}

const PAIRS_BY_CATEGORY: Partial<Record<ProductCategory, PairItem[]>> = {
  journey2026: [
    { productId: "sj_big_picture", why: "The default recommendation — 3 sessions and the full picture." },
    { productId: "mk_meet_expert", why: "Hear the career first-hand before you commit." },
  ],
  professional2026: [
    { productId: "pro_extra_session", why: "Keep a session in reserve as the move unfolds." },
    { productId: "mk_meet_expert", why: "Talk to someone already doing the role you're weighing." },
  ],
  marketplace2026: [
    { productId: "sj_big_picture", why: "Turn the conversation into a full guided decision." },
  ],
  assessment: [
    { productId: "success_package", why: "Turn your result into a full guided plan." },
    { productId: "consultation", why: "Talk the result through with a counsellor." },
  ],
  consultation: [
    { productId: "success_package", why: "Go deeper than a single conversation." },
    { productId: "stream_selector", why: "Add hard evidence to the discussion." },
  ],
  package: [
    { productId: "admission", why: "Once direction is clear, get into the right college." },
    { productId: "additional_session", why: "Keep a session in reserve to revisit later." },
  ],
  admission: [
    { productId: "success_package", why: "Be sure of the course before you apply." },
    { productId: "personality_dev", why: "Sharpen interviews and how you present." },
  ],
  ongoing: [
    { productId: "success_package", why: "Anchor the work to a clear career plan." },
  ],
  addon: [
    { productId: "success_package", why: "Revisit the package your session builds on." },
  ],
}

/** Resolve the story for a product — bespoke if defined, else generated from the
 *  catalogue so every product has a complete, on-brand sales page. */
export function storyFor(p: Product): ProductStory {
  const bespoke = STORY[p.id]
  if (bespoke) return bespoke

  const pairs = (PAIRS_BY_CATEGORY[p.category] ?? [])
    .filter((x) => x.productId !== p.id && getProduct(x.productId))
    .slice(0, 3)

  const stats: StatPoint[] = [
    p.duration ? { value: p.duration, label: "per " + (p.category === "assessment" ? "assessment" : "engagement") } : { value: "1:1", label: "personal guidance" },
    { value: String(p.features?.length ?? 3), label: "things included" },
    { value: "38", label: "cities we serve" },
  ]

  return {
    hero: { kicker: p.category === "package" ? "Career success" : p.name, promise: p.tagline },
    process: PROCESS_BY_CATEGORY[p.category],
    whyTitle: "Why this helps",
    whyBody: p.benefits ?? p.whatYouGet ?? p.tagline,
    stats,
    pairsTitle: "Pairs well with",
    pairs,
  }
}

/** The products a buyer might pair this with, resolved to full Product objects. */
export function pairedProducts(story: ProductStory): { product: Product; why: string }[] {
  return story.pairs
    .map((x) => { const product = getProduct(x.productId); return product ? { product, why: x.why } : null })
    .filter(Boolean) as { product: Product; why: string }[]
}
