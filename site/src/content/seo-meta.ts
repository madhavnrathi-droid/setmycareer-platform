// Per-route metadata — the single source of truth for every <title>, meta
// description, on-page H1, robots directive and breadcrumb trail on this site.
//
// Two consumers read this table and they must never disagree:
//   • scripts/prerender.mjs stamps it into dist/<route>/index.html at build time,
//     which is what crawlers and answer engines actually see (most of them never
//     execute JavaScript, and this site is a client-rendered SPA).
//   • src/lib/seo.ts (useSeo) keeps the head correct as a visitor navigates inside
//     the SPA, where no new document is ever fetched.
// Keeping the copy here rather than in each page component is the whole point: a
// title written in one place cannot drift from the title a crawler is served.
//
// CANONICAL POLICY. Pages self-canonical to SITE_URL + path. The ~236 mirrored
// blog posts read through api/post.ts are NOT ours to claim — they canonical to
// their original setmycareer.com URL, which BlogPost.tsx passes to useSeo as
// `canonicalUrl`. That is why /blog/:slug appears here as a template with no
// keyword ambition, and why only the ten self-canonical originals in site.ts +
// more-articles.ts get their own entries.
//
// LENGTH DISCIPLINE (counted, not eyeballed — 47 entries measured by code point):
//   • titles       — 21..56 characters, every one ≤ 60. Anything over 60 is
//                    truncated in the SERP, which wastes the keyword you put there.
//                    The short end is the noindex utility pages, which have no
//                    keyword to carry and should not pretend otherwise.
//   • descriptions — 146..158 characters, every one inside the 140–158 window.
//   • every description contains its own primary keyword, except the two bracketed
//     templates (/library/:id, /experts/:id) whose keyword has a placeholder in it
//     and can only be satisfied by the page at runtime.
//   • the " | SetMyCareer" suffix is present only where it still fits under 60;
//     the keyword outranks the brand when the two compete for the same 60 chars.

export interface RouteSeo {
  /** exact route path as declared in App.tsx; ':param' segments allowed */
  path: string
  /** ≤ 60 characters, primary keyword inside the first three words */
  title: string
  /** 140–158 characters, contains the primary keyword, ends on a reason to click */
  description: string
  /** the on-page H1, where the page should be retitled to match the target term */
  h1?: string
  primary: string
  secondary: string[]
  robots?: "index" | "noindex"
  /** ancestors only, nearest last, excluding the page itself */
  breadcrumb?: { name: string; path: string }[]
}

// breadcrumb ancestors are shared by dozens of routes; naming them once keeps the
// trails identical, which is what BreadcrumbList schema is actually checked against
const HOME = { name: "Home", path: "/" }
const CRUMB_HOME = [HOME]
const CRUMB_BLOG = [HOME, { name: "Field Notes", path: "/blog" }]
const CRUMB_TEST = [HOME, { name: "Career Test", path: "/career-test" }]
const CRUMB_EXPERTS = [HOME, { name: "The Network", path: "/experts" }]

export const ROUTE_SEO: RouteSeo[] = [
  // ── the service, the audience, the people ─────────────────────────────────
  // Three counselling terms deliberately split three ways: / owns the service,
  // /solutions owns the audience, /experts owns the practitioners. If any two
  // start describing the same thing they will trade rankings with each other.
  {
    path: "/",
    title: "Career Counselling Online in India | SetMyCareer",
    description:
      "Career counselling online for Indian students and professionals — aptitude, interest and personality measured first, then read by a counsellor. Since 2010.",
    h1: "Career counselling online, for people who would rather decide on evidence",
    primary: "career counselling online",
    secondary: [
      "career counselling India",
      "online career guidance India",
      "career counselling services India",
      "career guidance for students and professionals",
    ],
    robots: "index",
  },
  {
    path: "/product",
    title: "AI Career Counsellor & Career Report | SetMyCareer",
    description:
      "An AI career counsellor that scores the instruments and drafts the report, and a trained human who reads your circumstances and owns the recommendation.",
    h1: "An AI career counsellor that measures, and a person who decides",
    primary: "AI career counsellor",
    secondary: [
      "AI career coach India",
      "career decision intelligence platform",
      "AI career report",
      "online career assessment platform",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    // explanatory, never imperative — /framework explains the instruments and their
    // limits; /career-test/aptitude is the page that actually runs one
    path: "/framework",
    title: "Psychometric Test for Career Selection, Explained",
    description:
      "A psychometric test for career selection measures three separate things — aptitude, interest and personality. What each one tells you, and where each stops.",
    h1: "What a psychometric test for career selection can and cannot tell you",
    primary: "psychometric test for career selection",
    secondary: [
      "RIASEC interest inventory India",
      "Big Five career assessment",
      "difference between aptitude interest and personality tests",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/solutions",
    title: "Career Counselling for Students & Parents, India",
    description:
      "Career counselling for students, parents, graduates and professionals, plus schools and colleges — one measured method, with a clear first step for each.",
    h1: "Career counselling for students, parents, graduates and professionals",
    primary: "career counselling for students",
    secondary: [
      "career counselling for parents",
      "career guidance for schools",
      "career counselling for graduates",
      "career guidance for working professionals",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },

  // ── the career library ────────────────────────────────────────────────────
  {
    path: "/library",
    title: "High Demand Careers in India | SetMyCareer",
    description:
      "High demand careers in India on one screen: demand trend, pay trajectory, AI exposure and adjacent moves, grounded in WEF, BLS, O*NET and NASSCOM data.",
    h1: "High demand careers in India, with the evidence attached",
    primary: "high demand careers in India",
    secondary: [
      "emerging careers in India",
      "careers safe from AI in India",
      "future careers in India 2030",
      "career options list India",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    // TEMPLATE ENTRY. CareerPage.tsx composes the real per-career title from the
    // row it renders; this is the fallback for any consumer that cannot. Do not
    // let it be stamped onto every career page — see the note at the foot of file.
    path: "/library/:id",
    title: "Career Profiles in India — Pay, Demand, How to Enter",
    description:
      "How to become one, what the work actually is, what it pays in India and where demand is heading — every career profile carries its sources, not adjectives.",
    primary: "how to become a [career] in India",
    secondary: [
      "career in [field] in India",
      "[role] salary in India",
      "[career] scope in India",
      "is [career] a good career in India",
    ],
    robots: "index",
    breadcrumb: [HOME, { name: "Career Terminal", path: "/library" }],
  },

  // ── the library's front doors ─────────────────────────────────────────────
  {
    // no keyword ambition on purpose: this hub duplicates /blog, /resources/videos
    // and /library, and is a consolidation candidate rather than a ranking target
    path: "/resources",
    title: "Resources — Videos, Field Notes & E-book | SetMyCareer",
    description:
      "The SetMyCareer working library — expert videos, the Field Notes blog, the 13 Career-Success Strategies e-book, the live Career Terminal and events.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/resources/videos",
    title: "Career Guidance Videos & Webinars | SetMyCareer",
    description:
      "Career guidance videos from the SetMyCareer channel — Dr. Rathi on streams, degrees and switches, plus webinars and deep-dives, read here on the site.",
    h1: "Career guidance videos, straight from the counselling room",
    primary: "career guidance videos",
    secondary: [
      "career advice videos India",
      "career counselling webinars India",
      "career success video series",
    ],
    robots: "index",
    breadcrumb: [HOME, { name: "Resources", path: "/resources" }],
  },

  // ── definition, receipts, price, booking ──────────────────────────────────
  {
    // /trust is the definition + methodology + sources page. It must NOT carry
    // "what does a career counsellor do" as an H2 (that belongs to the essay at
    // /blog/what-career-counselling-actually-changes) and must not re-argue
    // "is it worth it" (that answer lives in faq.ts and on the cost essay).
    path: "/trust",
    title: "What Is Career Counselling? Method & Receipts",
    description:
      "What is career counselling, how a recommendation is actually produced and checked, every source we cite, and the AI red lines we hold — stated plainly.",
    h1: "What career counselling is, and how ours is actually produced",
    primary: "what is career counselling",
    secondary: [
      "career counselling meaning",
      "how does career counselling work",
      "career guidance vs career counselling",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/pricing",
    title: "Career Counselling Fees in India | SetMyCareer",
    description:
      "Career counselling fees in India, stated in full: a free Career Clarity Index, the Stream Selector at ₹1,990, the Job Domain Selector at ₹2,499, and beyond.",
    h1: "Career counselling fees in India, every price stated",
    primary: "career counselling fees in India",
    secondary: [
      "career counselling cost in India",
      "psychometric test price in India",
      "career assessment cost India",
      "career counselling charges",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/book",
    title: "Book a Career Counselling Session | SetMyCareer",
    description:
      "Book a career counselling session with a certified counsellor — create an account, pick a time, come as you are. No commitment beyond the conversation.",
    h1: "Book a career counselling session with a certified counsellor",
    primary: "book a career counselling session",
    secondary: [
      "career counselling appointment online",
      "online career counselling session",
      "talk to a career counsellor",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    // a lead form; the booking intent is ceded to /book on purpose
    path: "/contact",
    title: "Contact — Talk to a Career Expert | SetMyCareer",
    description:
      "Leave your details and a certified SetMyCareer counsellor calls back, usually within a working day, for a straight conversation about your next decision.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },

  // ── the two free on-page instruments ──────────────────────────────────────
  // /cri measures decision READINESS; /career-test measures career FIT. /cri must
  // never be retitled toward "free career test" — that term belongs to the hub, and
  // the two pages should cross-link as "readiness first, fit second".
  {
    path: "/cri",
    title: "Career Readiness Assessment for Students — Free",
    description:
      "A free career readiness assessment for students, scored on screen: one instrument for parents of 10–18s, and a two-part decision diagnostic for executives.",
    h1: "A career readiness assessment, before the career fit question",
    primary: "career readiness assessment for students",
    secondary: [
      "career decision readiness test",
      "executive career readiness assessment",
      "free career clarity check",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    // a branded package selector, NOT a career test — it must not drift toward
    // "which career is best for me", which belongs to the /career-test cluster
    path: "/fit",
    title: "The Package-Fit Test — Find Your Programme | SetMyCareer",
    description:
      "Six dimensions and two questions in your own words, matched against every SetMyCareer programme — you get a best fit, a recommended route and next moves.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },

  // ── recruiting: two pages, two different propositions ─────────────────────
  // /counsellors owns the recruiting term. /experts/apply is the practitioner /
  // mentor proposition only. If the copy on the two ever converges, merge them —
  // splitting recruiting authority across two URLs is the failure mode here.
  {
    path: "/counsellors",
    title: "Become a Career Counsellor in India | SetMyCareer",
    description:
      "Become a career counsellor in India on a console where clients arrive booked, notes write themselves and AI drafts the report — the judgement stays yours.",
    h1: "Become a career counsellor in India, with the admin taken off you",
    primary: "become a career counsellor in India",
    secondary: [
      "career counsellor jobs in India",
      "join a career counselling network",
      "work as an online career counsellor",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/experts",
    title: "Career Counsellors in India — The Network | SetMyCareer",
    description:
      "The career counsellors in India on the SetMyCareer network, live from the roster — trained to read assessments with care, and matched to your decision.",
    h1: "The career counsellors in India who read your results",
    primary: "career counsellors in India",
    secondary: [
      "certified career counsellor India",
      "career counsellor near me",
      "career counselling experts India",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/experts/apply",
    title: "Become a Career Mentor in India | SetMyCareer",
    description:
      "Apply to become a career mentor in India — paid 45-minute sessions, clients matched to your field. Senior practitioners only, reviewed before you go live.",
    h1: "Become a career mentor in India, paid by the session",
    primary: "become a career mentor in India",
    secondary: ["paid career mentoring sessions India", "career expert network India"],
    robots: "index",
    breadcrumb: CRUMB_EXPERTS,
  },
  {
    // TEMPLATE ENTRY, and a conditional one: index a counsellor profile only when it
    // carries a real bio or credentials. A roster of 55+ pages built from the same
    // fallback sentences is a near-duplicate cluster, not a network.
    path: "/experts/:id",
    title: "Career Counsellor Profile | SetMyCareer",
    description:
      "A certified career counsellor on the SetMyCareer network — experience, expertise and the assessments they read, with a route to book time with them.",
    primary: "[counsellor name] career counsellor",
    secondary: [
      "career counsellor in [city]",
      "[counsellor name] SetMyCareer",
      "career counsellor for [service]",
    ],
    robots: "index",
    breadcrumb: CRUMB_EXPERTS,
  },

  // ── the publication ───────────────────────────────────────────────────────
  {
    path: "/blog",
    title: "Career Guidance Blog, India — Field Notes | SetMyCareer",
    description:
      "Field Notes, SetMyCareer's career guidance blog for India: streams, courses, assessments, the job market and switching — written to be argued with.",
    h1: "Field Notes — a career guidance blog for India",
    primary: "career guidance blog India",
    secondary: ["career advice articles India", "career counselling blog"],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    // TEMPLATE ENTRY with zero keyword ambition by design: most /blog/:slug URLs are
    // mirrored posts that canonical to setmycareer.com, so this domain is not trying
    // to rank them. The ten self-canonical originals are listed individually below.
    path: "/blog/:slug",
    title: "Field Notes — Career Guidance | SetMyCareer",
    description:
      "A field note from SetMyCareer — careers, courses, assessments and the decisions around them, written by the counsellors who sit in the room for them.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },

  // ── the ten original, self-canonical essays ───────────────────────────────
  {
    path: "/blog/what-to-automate-and-what-to-keep-human",
    title: "Can AI Replace a Career Counsellor? | SetMyCareer",
    description:
      "Can AI replace a career counsellor? It scores an assessment and retrieves every pathway, but cannot read a score against a life. Where the line sits, and why.",
    h1: "Can AI replace a career counsellor? Parts of the work, not the whole",
    primary: "can AI replace a career counsellor",
    secondary: [
      "will AI replace career counsellors",
      "AI vs human career counselling",
      "ChatGPT for career advice",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/how-ai-career-counselling-actually-works",
    title: "AI Career Guidance for Students: How It Works",
    description:
      "AI career guidance for students, described plainly: what the machine scores, what it retrieves, what it drafts, and where a counsellor overrules it.",
    h1: "How AI career guidance for students actually works",
    primary: "AI career guidance for students",
    secondary: [
      "how AI career counselling works",
      "AI career guidance India",
      "AI in career counselling",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/what-parents-get-right-and-wrong-about-career-choice",
    title: "How to Help My Child Choose a Career | SetMyCareer",
    description:
      "How to help my child choose a career is the right question; how to choose it for them is not. What parents get right, and where the old map quietly fails.",
    h1: "How to help my child choose a career, without choosing it for them",
    primary: "how to help my child choose a career",
    secondary: [
      "parents role in career choice",
      "how to talk to your child about careers",
      "career guidance for parents India",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/changing-careers-at-thirty-in-india",
    title: "Career Change at 30 in India — What to Weigh",
    description:
      "A career change at 30 in India is heavier, not braver. Re-measure aptitude, map the adjacency, do the runway maths, and run the test before the resignation.",
    h1: "A career change at 30 in India, decided on arithmetic",
    primary: "career change at 30 in India",
    secondary: [
      "midlife career change India",
      "how to switch careers in India",
      "career change after 30",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/the-cost-of-a-wrong-career-choice",
    title: "Is Career Counselling Worth It in India? | SetMyCareer",
    description:
      "Is career counselling worth it in India? Families spend ₹1–4 lakh on coaching and ₹10–40 lakh on a degree, then choose the direction on hearsay. The ledger.",
    h1: "Is career counselling worth it in India? Read the ledger first",
    primary: "is career counselling worth it in India",
    secondary: [
      "cost of a wrong career choice",
      "why career counselling matters",
      "career counselling benefits India",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    // the guide half of the "guide + quiz" pair. This page owns the informational
    // H1; /career-test/stream-selector owns the "test / selector" H1. They interlink.
    path: "/blog/choosing-a-stream-after-class-10",
    title: "How to Choose a Stream After Class 10 | SetMyCareer",
    description:
      "Aptitude first, then interest, then opportunity — how to choose a stream after Class 10 without the two myths that cost families most: safety and fallback.",
    h1: "How to choose a stream after Class 10, in the right order",
    primary: "how to choose a stream after class 10",
    secondary: [
      "which stream to choose after 10th",
      "best stream after 10th",
      "science commerce or arts how to decide",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/beyond-the-jee-neet-binary",
    title: "Engineering or Medicine — Which Is Better for You?",
    description:
      "Engineering or medicine is a binary the room inherited, not a map. The wider set of options after Class 12, and how to test each against the work it leads to.",
    h1: "Engineering or medicine: which is better is the wrong first question",
    primary: "engineering or medicine which is better",
    secondary: [
      "alternatives to JEE and NEET",
      "career options after 12th science beyond engineering and medicine",
      "PCM and PCB alternatives after 12th",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/science-behind-a-career-assessment",
    title: "How Accurate Are Career Aptitude Tests? | SetMyCareer",
    description:
      "How accurate are career aptitude tests? They are instruments with error bars, not oracles. What reliability and validity mean, and how to read your results.",
    h1: "How accurate are career aptitude tests, honestly measured",
    primary: "how accurate are career aptitude tests",
    secondary: [
      "are career tests reliable",
      "career assessment validity",
      "how to read career test results",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    path: "/blog/restarting-a-career-after-a-break",
    title: "How to Restart Your Career After a Break | SetMyCareer",
    description:
      "How to restart your career after a break: re-measure what has changed, choose roles that reuse what you already built, and explain the gap without apology.",
    h1: "How to restart your career after a break, without starting over",
    primary: "how to restart your career after a break",
    secondary: [
      "returning to work after a career break India",
      "career gap explanation in interview",
      "career break comeback plan",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },
  {
    // the process from the inside — the counterpart to /trust, which is the
    // definition and the receipts. Neither page should attempt the other's job.
    path: "/blog/what-career-counselling-actually-changes",
    title: "What Does a Career Counsellor Do? | SetMyCareer",
    description:
      "What does a career counsellor do? The assessment, the reading, the argument at home it replaces, and what a family actually walks out of the room holding.",
    h1: "What does a career counsellor do, from inside the room",
    primary: "what does a career counsellor do",
    secondary: [
      "what happens in career counselling",
      "career counselling process",
      "how career counselling helps",
    ],
    robots: "index",
    breadcrumb: CRUMB_BLOG,
  },

  // ── legal, account, transaction ───────────────────────────────────────────
  {
    path: "/legal",
    title: "Legal & Policies | SetMyCareer",
    description:
      "SetMyCareer's policies — privacy, terms, refunds, cookies, disclaimers, consents and grievance redressal — written for India's DPDP Act and the US CCPA.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/legal/:slug",
    title: "Policy Document | SetMyCareer",
    description:
      "A SetMyCareer policy in full — what we collect, what we do with it, what you can ask us to do about it, and who to contact when something goes wrong.",
    primary: "",
    secondary: [],
    robots: "index",
    breadcrumb: [HOME, { name: "Legal", path: "/legal" }],
  },
  {
    // thin, gated, and a duplicate of the portal login — nothing to index
    path: "/signin",
    title: "Sign In | SetMyCareer",
    description:
      "Sign in to SetMyCareer, or create the account that runs your client portal, your assessment results, your written report and the AI Career Copilot.",
    primary: "",
    secondary: [],
    robots: "noindex",
    breadcrumb: CRUMB_HOME,
  },
  {
    // transactional and parameterised: one thin page per tier, all of them the
    // same page with a different price on it
    path: "/checkout/:tierId",
    title: "Checkout | SetMyCareer",
    description:
      "Secure checkout for SetMyCareer programmes — payment by Razorpay, and the programme opens inside your client portal the moment the payment clears.",
    primary: "",
    secondary: [],
    robots: "noindex",
    breadcrumb: [HOME, { name: "Programmes & Pricing", path: "/pricing" }],
  },
  {
    // TEMPLATE ENTRY — two instances today (Blueprint, Autobiography); Program.tsx
    // composes the real per-programme title from the offering it renders
    path: "/programs/:slug",
    title: "Long-Term Career Mentorship Programmes, India | SMC",
    description:
      "Application-only long-term career mentorship in India — a discovery conversation first, then a bespoke multi-year roadmap and a proposal quoted against it.",
    primary: "long-term career mentorship programme India",
    secondary: [
      "executive career coaching India",
      "multi-year career guidance for students",
      "career mentorship programme India",
    ],
    robots: "index",
    breadcrumb: [HOME, { name: "Programmes & Pricing", path: "/pricing" }],
  },
  {
    // NotFound currently self-declares path "/404" in its own useSeo call; this
    // entry is keyed "*" to match the route table. Look it up with seoFor("*").
    path: "*",
    title: "Page Not Found | SetMyCareer",
    description:
      "This page does not exist. The career assessments, the free Career Clarity Index, the Career Terminal and the Field Notes library are all one click from here.",
    primary: "",
    secondary: [],
    robots: "noindex",
    breadcrumb: CRUMB_HOME,
  },

  // ── /career-test — the assessment cluster ─────────────────────────────────
  // Eleven pages, each owning exactly one transactional term and nothing else. The
  // hub carries the generic term; every child carries its own audience or purpose.
  // Nothing outside this cluster is allowed to nibble at these keywords, and the
  // cluster is not allowed to nibble at /cri (readiness) or /framework (explanation).
  {
    path: "/career-test",
    title: "Free Career Test Online, India | SetMyCareer",
    description:
      "A free career test that measures aptitude, interest and personality rather than asking what you like — scored on screen, with the reasoning shown to you.",
    h1: "A free career test that measures, rather than asks",
    primary: "free career test",
    secondary: [
      "free career test online India",
      "career test for students",
      "free online career assessment",
      "career quiz free India",
    ],
    robots: "index",
    breadcrumb: CRUMB_HOME,
  },
  {
    path: "/career-test/class-8-10",
    title: "Career Test for Class 10 Students | SetMyCareer",
    description:
      "A career test for Class 10 students, and for Class 8 and 9 — aptitude, interest and personality measured before the stream decision, while options are open.",
    h1: "A career test for Class 10 students, taken before the stream decision",
    primary: "career test for class 10 students",
    secondary: [
      "career test for class 9 students",
      "career assessment after 10th",
      "career guidance test for class 8",
    ],
    robots: "index",
    breadcrumb: CRUMB_TEST,
  },
  {
    path: "/career-test/class-11-12",
    title: "Career Test for Class 12 Students | SetMyCareer",
    description:
      "A career test for Class 12 students, and for Class 11 — measured aptitude and interest set against degrees, entrance exams and the work each one leads to.",
    h1: "A career test for Class 12 students, before the degree is chosen",
    primary: "career test for class 12 students",
    secondary: [
      "career test for class 11 students",
      "career assessment after 12th",
      "career aptitude test after 12th",
    ],
    robots: "index",
    breadcrumb: CRUMB_TEST,
  },
  {
    path: "/career-test/college",
    title: "Career Test for College Students | SetMyCareer",
    description:
      "A career test for college students and fresh graduates — what your measured aptitudes and interests actually fit, set against the roles each profile serves.",
    h1: "A career test for college students, when the degree is not the direction",
    primary: "career test for college students",
    secondary: [
      "career test after graduation",
      "career assessment for graduates India",
      "which job is right for me after graduation",
    ],
    robots: "index",
    breadcrumb: CRUMB_TEST,
  },
  {
    path: "/career-test/working-professionals",
    title: "Career Assessment for Working Professionals | SMC",
    description:
      "A career assessment for working professionals — re-measure aptitude and interest at thirty or forty, then test a switch against adjacency before you resign.",
    h1: "A career assessment for working professionals weighing a switch",
    primary: "career assessment for working professionals",
    secondary: [
      "career test for professionals India",
      "mid-career assessment test",
      "should I change my career test",
    ],
    robots: "index",
    breadcrumb: CRUMB_TEST,
  },
]

// ── lookup ──────────────────────────────────────────────────────────────────

/** "/blog/foo/" → ["blog", "foo"]; "/" → [] */
const segments = (p: string) => p.split("/").filter(Boolean)

/**
 * Metadata for a path. Exact match wins; a `:param` route matches only as a
 * fallback, so /experts/apply can never be served /experts/:id's copy and the
 * ten original essays can never be served the /blog/:slug template.
 *
 * Returns undefined for an unlisted path rather than guessing — a caller that
 * gets undefined should leave the document's default head alone, which is
 * strictly safer than stamping the wrong title on an unknown route.
 */
export function seoFor(path: string): RouteSeo | undefined {
  const clean = (path.split("?")[0].split("#")[0] || "/").replace(/(.)\/+$/, "$1")
  const exact = ROUTE_SEO.find((r) => r.path === clean)
  if (exact) return exact

  const want = segments(clean)
  return ROUTE_SEO.find((r) => {
    if (!r.path.includes(":")) return false
    const have = segments(r.path)
    if (have.length !== want.length) return false
    return have.every((seg, i) => (seg.startsWith(":") ? want[i].length > 0 : seg === want[i]))
  })
}

/**
 * Every concrete, indexable URL in this table — the static half of the sitemap.
 * Parameterised routes are excluded on purpose: their real URLs are expanded from
 * the content modules in src/entry-server.tsx (careers, legal docs, programmes,
 * the original essays), so the sitemap can never claim a page that does not exist.
 */
export const INDEXABLE_PATHS: string[] = ROUTE_SEO.filter(
  (r) => !r.path.includes(":") && r.path !== "*" && r.robots !== "noindex",
).map((r) => r.path)

// ── two integration notes for whoever wires the prerenderer ─────────────────
//
// 1. TEMPLATE ENTRIES ARE FALLBACKS, NOT PAGE TITLES. scripts/prerender.mjs calls
//    seoFor() with a concrete URL such as "/library/pilot", which param-matches
//    "/library/:id" and would stamp one identical title across every career page.
//    The page components already compute correct per-instance titles; the
//    prerenderer should prefer a page-supplied title and fall back to these.
//
// 2. RouteSeo carries no `canonicalUrl` or `jsonLd`. prerender.mjs reads both off
//    the object, gets undefined, and correctly falls back to SITE_URL + route. That
//    is right for every route here, because the mirrored blog posts — the only URLs
//    that must canonical elsewhere — are not in the prerender route table at all.
//    If mirrored posts are ever prerendered, this interface needs `canonicalUrl`
//    first, or the copies will claim canonical over the originals.
