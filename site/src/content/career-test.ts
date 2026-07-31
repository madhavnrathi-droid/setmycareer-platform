// The /career-test/ cluster — hub plus four audience landing pages.
//
// WHY THIS FILE EXISTS
// The assessment-intent keywords ("free career test", "career aptitude test",
// "career test for class 10 students") are the highest-converting terms in the
// category and the site has no page for them. One rival — Edumilestones — runs a
// 14-page assessment architecture and nothing else in the space comes close.
//
// WHY IT IS WRITTEN THIS WAY
// Everything on these pages is grounded in an instrument that already runs on
// this site. There are exactly two free ones:
//
//   /cri  Career Clarity Index — a structured SELF-REPORT of readiness.
//         · student track  = CCRI, 63 items, answered by the PARENT of a child
//           aged 10–18, about ten minutes (content/readiness.ts → CCRI).
//         · executive track = CDRA then ECCRI, two parts, about twenty minutes,
//           for working professionals (content/readiness.ts → CDRA, ECCRI).
//   /fit  Package-Fit Test — six dimensions (clarity, breadth, stakes, support,
//         family, urgency) plus two open questions, about five minutes. It reads
//         what KIND of help a decision needs, and returns a recommended
//         programme (content/fit-test.ts).
//
// NEITHER IS A PSYCHOMETRIC. Aptitude, interest and personality are measured
// only inside the paid catalogue (content/offerings.ts → Career Navigator and
// upward). Saying so plainly is the point: the honesty is what earns the
// citation, and it is the one thing no competitor in the teardown does.
//
// PRICES here come from content/offerings.ts, because /pricing renders that
// catalogue. content/packages.ts still carries the older, lower legacy prices
// for the same product names — do not quote from it on these pages.

import type { Qa } from "./faq"

/* ── shape ──────────────────────────────────────────────────────────────── */

/** A question-formatted H2 with a 40–60 word direct answer under it. The answer
 *  is what a featured snippet or an answer engine lifts, so it must stand alone
 *  without the body paragraphs that follow it. */
export interface CtSection {
  h2: string
  answer: string
  body?: string[]
}

/** An instrument we actually run, described honestly enough that a reader knows
 *  before clicking whether it is the one for them. */
export interface CtInstrument {
  name: string
  to: string
  who: string
  length: string
  cost: string
  gives: string
  /** the sentence that stops a wrong click */
  notFor?: string
}

export interface CtLink {
  label: string
  to: string
  hint: string
}

export interface CareerTestPage {
  /** route path — the hub is the parent of the other four */
  slug: string
  /** stable id for keys, analytics and the prerender table */
  key: string
  /** eyebrow / kicker */
  audience: string
  /** <title>, 60 characters or fewer */
  title: string
  /** meta description, 140–158 characters */
  description: string
  primaryKeyword: string
  secondaryKeywords: string[]
  /** the single H1 */
  h1: string
  /** one editorial sentence under the H1 */
  dek: string
  intro: string
  sections: CtSection[]
  instruments: CtInstrument[]
  /** what the free instrument on this page does measure */
  measures: string[]
  /** what it does not — the brand's whole differentiator, kept first-person plain */
  limits: string[]
  faq: Qa[]
  links: CtLink[]
}

/* ── shared constants ───────────────────────────────────────────────────── */

export const CAREER_TEST_BASE = "/career-test"

/** Adapted from the disclaimer already shown at the foot of every Career
 *  Clarity Index report, so the landing page and the product agree. */
export const CAREER_TEST_HONESTY =
  "A free test on this site scores your own answers to a structured self-report. That reads readiness and self-perception — not aptitude, interest or personality, which require validated psychometric instruments and a certified expert to interpret. Treat the free result as a diagnosis of how much measurement you need, not as the measurement."

/** Used in the author/credential line on every page in the cluster. Both facts
 *  are already published in src/content/site.ts (COPY.heroKicker, proofHeadline). */
export const CAREER_TEST_CREDENTIAL =
  "SetMyCareer has measured careers since 2010. Founded by Dr. Nandkishore Rathi, PhD, IIT Bombay."

/* ── the free instruments, described once ───────────────────────────────── */
// declared as functions of nothing rather than inlined five times, so a change
// to what the product actually does cannot drift between pages.

const CRI_PARENT: CtInstrument = {
  name: "Career Clarity Index — parent track",
  to: "/cri",
  who: "A parent of a student aged 10 to 18. The parent answers, not the child.",
  length: "63 statements, about ten minutes",
  cost: "Free. No card, scored on screen.",
  gives:
    "Four readiness pillars, factor-level scores, a composite clarity index, and eight common misconceptions checked against your own answers.",
  notFor: "It is not an aptitude, interest or personality test, and it does not name a career.",
}

const CRI_EXEC: CtInstrument = {
  name: "Career Clarity Index — executive track",
  to: "/cri",
  who: "A working professional deciding about a switch, a promotion, a break or a return.",
  length: "Two parts, about twenty minutes",
  cost: "Free. No card, scored on screen.",
  gives:
    "A career decision readiness score with an interpretation band, a perception-versus-evidence gap, and a read on the circumstances around a move — money, family, location, health, learning and opportunity.",
  notFor: "It measures readiness and circumstance, not ability. It will not tell you which role to take.",
}

const FIT: CtInstrument = {
  name: "Package-Fit Test",
  to: "/fit",
  who: "Anyone from Class 8 to fifteen years into a career, and parents deciding on behalf of a child.",
  length: "Six dimensions plus two questions in your own words, about five minutes",
  cost: "Free, on screen.",
  gives:
    "Your profile across clarity, breadth, stakes, support, family and urgency, then the SetMyCareer programme that matches it and the next moves in order.",
  notFor: "It reads what kind of help the decision needs. It does not read you.",
}

/* ── the hub ────────────────────────────────────────────────────────────── */

export const CAREER_TEST_HUB: CareerTestPage = {
  slug: CAREER_TEST_BASE,
  key: "hub",
  audience: "Free career test",
  title: "Free career test — what it measures | SetMyCareer",
  description:
    "A free career test, scored on screen, plus a plain account of what a career aptitude test can measure about you and what no test can. Read the limits first.",
  primaryKeyword: "free career test",
  secondaryKeywords: [
    "career aptitude test",
    "psychometric test for career selection",
    "which career is best for me",
    "career test online free india",
  ],
  h1: "Take a free career test — then read what it actually measures",
  dek: "Two instruments run free on this page. Neither of them is the one that names your career, and we would rather say so before you start.",
  intro:
    "Most free career tests in India end at a results page and a phone number. This one begins with the arithmetic of the decision behind it. Families here spend ₹1–4 lakh on coaching and ₹10–40 lakh on a degree, and choose the direction of both with almost no structured guidance — over 90% of Indian schools have no dedicated career counsellor, and the national ratio runs at roughly one counsellor to 3,000 students against a recommended 1:250. A free test cannot close that gap. It can tell you, in ten minutes, how far you are from a decision you could defend.",
  sections: [
    {
      h2: "What does a free career test actually measure?",
      answer:
        "Most free career tests measure self-report: what you say about yourself, scored consistently. That is genuinely useful — it shows how clear or unclear the decision currently is. It is not the same as measuring aptitude, interest and personality, which needs timed, validated instruments and a trained reader. Both matter; only one is free.",
      body: [
        "The distinction is not pedantry. A self-report asks you to rate statements about your own situation and returns a structured picture of your answers. A psychometric measures something you cannot simply assert — how fast you reason with numbers, what holds your attention when nobody is grading you, how you work under structure or without it.",
        "A free test that quietly blurs the two produces the worst outcome in this category: a confident recommendation built on nothing measured. We keep them separate on purpose.",
      ],
    },
    {
      h2: "Is a career aptitude test the same as a career test?",
      answer:
        "No. An aptitude test is one component. It times your reasoning — verbal, numerical, abstract, spatial — to find where learning costs you least. A full career test reads that alongside interest and personality, then checks the shortlist against admission odds and the labour market. Aptitude alone recommends nothing.",
      body: [
        "The three instruments answer different questions. Aptitude asks where effort compounds fastest. Interest, measured on Holland's RIASEC model, asks what you return to unprompted. Personality, measured on the Big Five, asks in what conditions you do your best work.",
        "A recommendation is only worth acting on where the three agree and the market can absorb the result. Strong aptitude without interest produces a competent, unhappy professional; strong interest without market reality produces an educated, unemployed one.",
      ],
    },
    {
      h2: "Which free career test on this site should I take?",
      answer:
        "Two exist, and they answer different questions. The Career Clarity Index reads how ready the decision is — one instrument for a parent of a child aged ten to eighteen, a two-part diagnostic for working professionals. The Package-Fit Test reads what kind of help the decision needs. Neither is a psychometric.",
      body: [
        "If you are a parent, start with the Career Clarity Index. If you are the student, or a graduate, start with the Package-Fit Test — it accepts every stage from Class 8 to fifteen years into a career. If you are working and weighing a move, the executive track of the Clarity Index is the more useful twenty minutes.",
      ],
    },
    {
      h2: "How accurate is a free career test?",
      answer:
        "Accurate about what it asks, and silent on the rest. A self-report is scored consistently and reproducibly, so two people answering the same way get the same result. It cannot correct for what you do not know about yourself. That is why the free check is a diagnosis of need, not a recommendation.",
      body: [
        "This is also why the parent track of the Clarity Index carries eight deliberately reverse-scored statements about common misconceptions. It is the only honest way a self-report can flag its own blind spots back to the person answering it.",
      ],
    },
    {
      h2: "What does a paid career assessment add that a free test cannot?",
      answer:
        "Measurement, and a person who reads it. Career Navigator adds the three validated instruments — interest, personality and aptitude — with matched careers and degree suggestions. From Accelerator upward a certified counsellor interprets the pattern against your circumstances, edits the draft, and owns the recommendation you receive.",
      body: [
        "Career Navigator is ₹2,990 and has no counsellor attached. Accelerator, at ₹7,990, adds one session and a written action plan. Big Picture, at ₹14,990, adds three sessions and a dedicated parent session. Every price on this site is listed in full before you enter anything.",
      ],
    },
  ],
  instruments: [CRI_PARENT, FIT, CRI_EXEC],
  measures: [
    "How clear the decision already is, scored rather than guessed",
    "Where the gap sits — understanding the person, choosing well, or preparing for what follows",
    "Which common misconceptions are quietly shaping the choice",
    "What kind of help the decision needs, and what it does not",
  ],
  limits: [
    "It does not measure aptitude, interest or personality — those are timed and validated instruments, not self-report",
    "It does not name a career, a stream or a college",
    "It does not predict marks, rank or admission",
    "It cannot see what you do not know about yourself; a confident answer and a correct one look identical to a self-report",
    "It is not a psychological diagnosis, and it is not medical advice",
  ],
  faq: [
    {
      q: "Is the career test on SetMyCareer really free?",
      a: "Yes. The Career Clarity Index and the Package-Fit Test both run free on the site, scored on screen, with no card and no obligation. What is paid is the psychometric battery — interest, personality and aptitude — and the counselling that interprets it. The free instruments exist so you can judge whether you need the paid ones.",
    },
    {
      q: "Do I need to create an account to take the free career test?",
      a: "No account is needed to take either free instrument and see your result on screen. You are asked for a name and contact only so a counsellor can follow up if you want one; the scoring runs the same either way.",
    },
    {
      q: "When should a student take a career assessment?",
      a: "The two natural decision points are after Class 10, when you choose a stream, and after Class 12, when you choose a degree and field. An assessment is most useful slightly before each — around Class 9–10 and Class 11–12 — while options are still open. Professionals weighing a switch benefit at any stage.",
    },
    {
      q: "What is the difference between aptitude, interest and personality tests?",
      a: "Aptitude measures what you can do well with effort — reasoning abilities such as verbal, numerical and spatial. Interest measures what you are drawn to, often along the RIASEC model. Personality describes how you tend to operate, often along the Big Five. A sound recommendation looks for where strong aptitude, real interest and a fitting temperament overlap.",
    },
    {
      q: "Can an AI career test replace a counsellor?",
      a: "It can replace parts of the work, not the whole. AI is well suited to scoring assessments consistently and retrieving the full breadth of pathways. It is structurally unsuited to interpreting a score in the context of a person's circumstances. The machine measures so the human is free to judge.",
    },
    {
      q: "How much does a full career assessment cost at SetMyCareer?",
      a: "It scales with depth. The free instruments cost nothing. Career Navigator — all three assessments with reports and no counsellor — is ₹2,990. Accelerator, which adds a counselling session and a written action plan, is ₹7,990. Big Picture, the fullest student programme, is ₹14,990. Every figure is listed on the pricing page.",
    },
  ],
  links: [
    { label: "Career test for Class 8–10", to: "/career-test/class-8-10", hint: "The stream decision, before it is forced" },
    { label: "Career test for Class 11–12", to: "/career-test/class-11-12", hint: "Degree and field, with the exam already running" },
    { label: "Career test for college students", to: "/career-test/college", hint: "A degree is not a direction" },
    { label: "Career assessment for working professionals", to: "/career-test/working-professionals", hint: "Switch, promotion, break, return" },
    { label: "Take the Career Clarity Index", to: "/cri", hint: "Free readiness check, scored on screen" },
    { label: "Take the Package-Fit Test", to: "/fit", hint: "Which programme the decision actually needs" },
    { label: "The decision model", to: "/framework#model", hint: "The four factors we read together" },
    { label: "Scientific foundation", to: "/framework#science", hint: "RIASEC, Big Five, aptitude — and their limits" },
    { label: "Pricing", to: "/pricing", hint: "Every programme, priced in full" },
    { label: "The science behind a career assessment", to: "/blog/science-behind-a-career-assessment", hint: "What the instruments can and cannot claim" },
    { label: "How AI career counselling actually works", to: "/blog/how-ai-career-counselling-actually-works", hint: "Where the machine stops and the counsellor starts" },
    { label: "Career library", to: "/library", hint: "The map, wider than two roads" },
  ],
}

/* ── audience pages ─────────────────────────────────────────────────────── */

const CLASS_8_10: CareerTestPage = {
  slug: `${CAREER_TEST_BASE}/class-8-10`,
  key: "class-8-10",
  audience: "Class 8–10",
  title: "Career test for class 10 students | SetMyCareer",
  description:
    "A free career test for class 10 students and their parents, before the stream is chosen on hearsay. What it measures, what it cannot, and what follows.",
  primaryKeyword: "career test for class 10 students",
  secondaryKeywords: [
    "aptitude test for stream selection after 10th",
    "which stream to choose after 10th",
    "stream selector test",
    "career test for class 9",
  ],
  h1: "A career test for Class 10 students, before the stream is chosen",
  dek: "The stream decision is made at fifteen, on the least information a family will ever have. A test does not make it for you; it changes what the argument is about.",
  intro:
    "Class 10 is the first fork that closes doors. Science, Commerce and Arts are chosen in a fortnight, usually on three inputs: marks, what a cousin did, and which coaching centre had a hoarding on the school route. None of those describes the student. A career test is worth taking here for one reason — it puts information on the table that nobody in the room currently has, and it does it while the options are still open.",
  sections: [
    {
      h2: "What is the right career test for a Class 10 student?",
      answer:
        "At this stage two free instruments apply. A parent can take the Career Clarity Index — 63 statements, about ten minutes — which reads how the decision is being made at home. The student can take the Package-Fit Test, which reads what kind of guidance the decision needs. Neither measures aptitude.",
      body: [
        "The split is deliberate. At fifteen, much of what determines the outcome sits with the adults: how much of the choice is already settled, how much pressure is in the room, which misconceptions are running unchallenged. The parent track measures exactly that. The student's own aptitude and interest are measured later, and are measured properly.",
      ],
    },
    {
      h2: "Should a Class 10 student take an aptitude test or an interest test?",
      answer:
        "Both, and a personality assessment with them. Aptitude finds where two years of Physics or Accountancy will cost the least effort. Interest finds what holds attention without a grade attached. Personality describes the working conditions that suit. One instrument alone recommends a stream badly; three read together recommend it well.",
      body: [
        "At SetMyCareer all three are taken in one sitting inside Career Navigator, at ₹2,990, and are scored online. Accelerator, at ₹7,990, adds a counselling session in which a certified counsellor reads the three profiles as a pattern and answers the questions a report cannot anticipate.",
      ],
    },
    {
      h2: "Which stream should I choose after Class 10?",
      answer:
        "Weigh three inputs in order: aptitude first, where steady effort compounds fastest; then interest, what holds your attention unprompted; then opportunity, the job market and your constraints. Avoid two myths — that Science is the safe superset, and that Commerce and Arts are fallbacks. Both lead to strong professions.",
      body: [
        "Carrying subjects you have no aptitude for has a real cost, paid in two years of diminishing marks and a confidence that does not recover quickly. Almost nothing here is permanent, though: decide carefully, then hold the decision lightly.",
      ],
    },
    {
      h2: "Is Class 10 too early for a career test?",
      answer:
        "It is the right time for the first one. An assessment is most useful slightly before a decision, while options are still open — around Class 9 and 10 for stream, and again in Class 11 and 12 for degree. Taken after the choice is locked, it can only confirm or unsettle it.",
    },
    {
      h2: "What does a career test for Class 10 cost?",
      answer:
        "The Career Clarity Index and the Package-Fit Test are free. The full battery — interest, personality and aptitude with matched streams and reports — is ₹2,990 inside Career Navigator. Adding a counselling session and a written action plan brings it to ₹7,990. Every price is published before you begin.",
      body: [
        "Set that against what the same family will spend on coaching, ₹1–4 lakh, and on the degree the stream leads to, ₹10–40 lakh. The assessment is the smallest line in the ledger and the one that decides whether the rest was worth it.",
      ],
    },
  ],
  instruments: [CRI_PARENT, FIT],
  measures: [
    "How ready the household actually is to make the stream decision",
    "Which of the eight common misconceptions about career choice are in play at home",
    "How much of the choice has already been settled by pressure rather than evidence",
    "What kind of guidance would help — a report, a counsellor, or a conversation with the parents in the room",
  ],
  limits: [
    "It does not measure the student's aptitude, interest or personality — the parent is the respondent on the free readiness check",
    "It does not choose a stream, and it will not tell you Science, Commerce or Arts",
    "It does not predict board marks or entrance-exam performance",
    "It says nothing about which school or which coaching centre",
    "A parent's honest answer about their child is still a parent's view of their child",
  ],
  faq: [
    {
      q: "Can a Class 10 student take a career test on their own?",
      a: "Yes — the Package-Fit Test accepts Class 8–10 as a stage and runs in about five minutes. The free Career Clarity Index is different: it is written for a parent of a child aged 10 to 18 to answer. The psychometric battery, when you take it, is taken by the student.",
    },
    {
      q: "Is a stream selector test the same as a career test?",
      a: "A stream selector answers one question — which of the streams available after Class 10 fits best. A career test is wider, mapping aptitude, interest and personality to fields and roles rather than to a school timetable. At Class 10 the stream is the live question, so it is the sharper place to start.",
    },
    {
      q: "How accurate is a career test at age 15?",
      a: "Interest and personality are still forming at fifteen, and any honest report says so. Aptitude is measurable and reasonably stable. The value at this age is not prophecy — it is narrowing a field of hundreds of options to a handful worth a serious conversation, and having that conversation before the deadline rather than after.",
    },
    {
      q: "My child's marks are good in Science. Is that enough to choose it?",
      a: "Marks measure how well a syllabus was learned in one school with one teacher. They do not separate aptitude from effort, coaching or interest, and they say nothing about the profession the stream leads to. A good Biology score is not a verdict that medicine must follow.",
    },
    {
      q: "Should parents be part of the assessment?",
      a: "They already are — every stream decision in India is made jointly. That is why the free readiness check is written for the parent to answer, and why Big Picture, at ₹14,990, includes a dedicated parent session. The aim is to move the decision from a negotiation to a document two people can read at the same table.",
    },
  ],
  links: [
    { label: "Take the Career Clarity Index", to: "/cri", hint: "Free, about ten minutes, for a parent to answer" },
    { label: "Take the Package-Fit Test", to: "/fit", hint: "Free, about five minutes, for the student" },
    { label: "Career test for Class 11–12", to: "/career-test/class-11-12", hint: "The next fork, two years on" },
    { label: "Free career test hub", to: "/career-test", hint: "What every free test can and cannot measure" },
    { label: "Choosing a stream after Class 10", to: "/blog/choosing-a-stream-after-class-10", hint: "The three inputs, in order" },
    { label: "What parents get right, and wrong", to: "/blog/what-parents-get-right-and-wrong-about-career-choice", hint: "Where a parent's map is twenty years old" },
    { label: "For students", to: "/solutions#students", hint: "You are not your rank" },
    { label: "For parents", to: "/solutions#parents", hint: "In the decision, not the argument" },
    { label: "The decision model", to: "/framework#model", hint: "Aptitude, interest, personality, market" },
    { label: "Pricing", to: "/pricing", hint: "What the full battery costs" },
  ],
}

const CLASS_11_12: CareerTestPage = {
  slug: `${CAREER_TEST_BASE}/class-11-12`,
  key: "class-11-12",
  audience: "Class 11–12",
  title: "Career test for class 12 students | SetMyCareer",
  description:
    "A free career test for class 12 students weighing degrees, exams and fields. What it measures, what it cannot, and how to decide beyond the JEE-NEET binary.",
  primaryKeyword: "career test for class 12 students",
  secondaryKeywords: [
    "career options after 12th",
    "which career is best for me quiz",
    "career test for class 11",
    "psychometric test for career selection",
  ],
  h1: "A career test for Class 12 students, when the degree decision arrives",
  dek: "By Class 12 the exam is already running and the map has narrowed to two roads. A test is worth taking here to widen it again before the form is filled.",
  intro:
    "After Class 12 the real map is far wider than two entrance exams — pure sciences, design, law, economics, psychology, data, architecture, the civil services and a great deal else. The binary most families reach for usually reflects what the people around them happened to know, not what fits the student. This is the last point at which measurement is cheap: a wrong degree costs ₹10–40 lakh and three to five years, and it is discovered in the second year, not the first.",
  sections: [
    {
      h2: "What is the right career test for a Class 12 student?",
      answer:
        "Start free with the Package-Fit Test — six dimensions, about five minutes — which reads how settled the decision is and what help it needs. Then take the full battery: interest, personality and aptitude, scored together, with matched fields and degree suggestions. At Class 12 the free check is a triage step, not the answer.",
      body: [
        "The reason is timing. In Class 10 there is room to sit with a result for a year. In Class 12 there is a form with a date on it, so the useful sequence is a five-minute read of what you need, then the measurement itself, then a counsellor who can argue the shortlist with you before the deadline.",
      ],
    },
    {
      h2: "Can a career test tell me whether to choose engineering or medicine?",
      answer:
        "It can tell you whether either belongs on your shortlist, and what else does. Start before the binary. Read your own aptitudes and interests first, then test each option against the daily work it actually leads to, not its image. The test narrows; the deciding stays yours.",
      body: [
        "Both professions are real and demanding and suit a specific pattern of aptitude and temperament. What a measured profile does is stop the question being asked in a vacuum — and usually adds three or four fields to the conversation that nobody at the dinner table had mentioned.",
      ],
    },
    {
      h2: "Is Class 12 too late to take a career test?",
      answer:
        "No, but the window is narrower. An assessment taken in Class 11 leaves time to act on it; taken in Class 12 it still prevents the largest error, which is applying to a degree on hearsay. The measurement takes a sitting and the counselling a few days, not months.",
    },
    {
      h2: "What does a career test for Class 12 cost?",
      answer:
        "The free instruments cost nothing. Career Navigator — all three assessments, a career snapshot, top matches and degree suggestions, no counsellor — is ₹2,990. Accelerator, which settles one major decision with a counselling session and a written plan, is ₹7,990. Big Picture, at ₹14,990, covers education and career direction with three sessions.",
      body: [
        "Compare that with the coaching already paid for, at ₹1–4 lakh, and the degree ahead at ₹10–40 lakh. The assessment is the diligence before the spend, not another item of it.",
      ],
    },
    {
      h2: "What do I do if my measured profile does not fit the exam I have prepared for?",
      answer:
        "You get the information early enough to act on it, which is the point. A profile that argues against a chosen exam does not invalidate two years of preparation — reasoning ability transfers. It changes what you apply for with it, and that conversation is exactly what the counselling session exists for.",
    },
  ],
  instruments: [FIT, CRI_PARENT],
  measures: [
    "How settled the degree decision genuinely is, versus how settled it feels",
    "How many options are still live, and whether the field has been narrowed by evidence or by pressure",
    "What is riding on the choice — years, money, family expectation, a deadline",
    "What kind of help fits: a report to read alone, or a counsellor to argue it with",
  ],
  limits: [
    "The free check does not measure aptitude, interest or personality",
    "It does not predict a board result, a JEE or NEET rank, or a CUET score",
    "It does not tell you which college will admit you, or on what cutoff",
    "It cannot weigh a family's finances or a seat's availability — that is the market-reality check inside the paid work",
    "No test predicts a life. A good assessment narrows hundreds of options to a handful worth serious discussion",
  ],
  faq: [
    {
      q: "Which career is best for me after Class 12?",
      a: "No test answers that in one line, and any that claims to is guessing. What a proper assessment produces is a ranked shortlist with the reasoning shown — why each path fits your measured aptitude, interest and temperament, what it demands, what the admission odds are, and what it returns. The choosing stays with you.",
    },
    {
      q: "Is a free online career test enough at Class 12?",
      a: "It is enough to tell you how urgently you need the real thing. The free instruments read readiness and fit of support, not ability. With a degree decision weeks away, most students should go on to the measured battery rather than act on a self-report.",
    },
    {
      q: "How long does the full assessment take?",
      a: "The three instruments — interest, personality and aptitude — are taken online and scored in real time in a single sitting. Accelerator runs the assessment and one counselling session; Big Picture runs three sessions including a dedicated parent session, and the reports arrive between them.",
    },
    {
      q: "Can I take a career test if I have already chosen a stream?",
      a: "Yes, and it is still worth it. The Class 11–12 question is not the stream but what to do with it: which degree, which entrance exams are worth two years, and which fields the stream actually opens. Those are different questions with different answers.",
    },
    {
      q: "What is the difference between a career test and career counselling?",
      a: "The test measures. The counselling interprets. A certified counsellor reads the three profiles as a pattern, weighs them against your circumstances, admission odds and cost, edits the draft recommendation, and owns what reaches you. The instruments are useless without that step and the step is guesswork without the instruments.",
    },
  ],
  links: [
    { label: "Take the Package-Fit Test", to: "/fit", hint: "Free, about five minutes" },
    { label: "Take the Career Clarity Index", to: "/cri", hint: "Free readiness check for parents" },
    { label: "Career test for Class 8–10", to: "/career-test/class-8-10", hint: "The stream fork, two years earlier" },
    { label: "Career test for college students", to: "/career-test/college", hint: "If the degree is already running" },
    { label: "Free career test hub", to: "/career-test", hint: "What free tests measure, and what they cannot" },
    { label: "Beyond the JEE-NEET binary", to: "/blog/beyond-the-jee-neet-binary", hint: "The map is wider than two exams" },
    { label: "The cost of a wrong career choice", to: "/blog/the-cost-of-a-wrong-career-choice", hint: "What the error actually costs" },
    { label: "Scientific foundation", to: "/framework#science", hint: "RIASEC, Big Five, aptitude — and their limits" },
    { label: "Career library", to: "/library", hint: "What each field is actually like" },
    { label: "Pricing", to: "/pricing", hint: "Navigator, Accelerator, Big Picture" },
  ],
}

const COLLEGE: CareerTestPage = {
  slug: `${CAREER_TEST_BASE}/college`,
  key: "college",
  audience: "College and graduates",
  title: "Career test for college students | SetMyCareer",
  description:
    "A free career test for college students and graduates holding a degree but no direction. What it measures, what it cannot, and what follows a BSc or BCom.",
  primaryKeyword: "career test for college students",
  secondaryKeywords: [
    "career test for graduates",
    "what to do after bsc",
    "what to do after bcom",
    "career aptitude test for students",
  ],
  h1: "A career test for college students who have a degree but no direction",
  dek: "The degree was chosen at seventeen by someone with less information than you now have. Re-reading the decision is not a failure; it is the first cheap correction available.",
  intro:
    "A degree is a qualification, not a direction. Plenty of graduates finish three years of BSc, BCom or BA having learned a subject and nothing about the work it leads to — because at seventeen nobody measured anything, and the field was chosen from the ten careers the family happened to know. The correction at this stage is cheaper than it will ever be again: you still have the years, the ability is measurable, and almost every field is reachable through a first job or a postgraduate route.",
  sections: [
    {
      h2: "Is a career test useful once I am already in a degree?",
      answer:
        "More useful, not less. At seventeen a test predicts; at twenty it explains. You now have real evidence about which subjects held your attention and which did not, and a measured profile read against that evidence produces a far sharper shortlist than the same instruments would have at Class 12.",
    },
    {
      h2: "Which free career test should a college student take?",
      answer:
        "The Package-Fit Test. It accepts undergraduate and postgraduate as stages, runs in about five minutes across six dimensions, and returns what kind of help the decision needs. The Career Clarity Index is not for you yet — its two tracks are written for parents of school students and for working professionals.",
      body: [
        "That gap is deliberate rather than an oversight: the free readiness instruments were built for the two moments where a decision is being made on someone else's behalf, or under the weight of an existing career. A student inside a degree is in neither position.",
      ],
    },
    {
      h2: "What should I do after BSc, BCom or BA?",
      answer:
        "Decide in this order: what you can do well with effort, what holds your attention unprompted, and what the market will pay for. A generalist degree closes almost nothing. The practical routes are a postgraduate specialisation, a professional qualification, or a first job chosen deliberately rather than accepted by default.",
      body: [
        "The measured battery matters here because the honest answer is usually several fields wide, and the ranking between them turns on aptitude and temperament rather than on the degree printed on the certificate.",
      ],
    },
    {
      h2: "Can a career test fix a wrong degree choice?",
      answer:
        "It cannot undo three years, and no one should claim otherwise. What it can do is stop the second wrong choice, which is the more expensive one — a postgraduate degree or a first job taken for the same reasons that produced the first mistake. That is the correction actually available.",
    },
    {
      h2: "What does a career assessment cost for a graduate?",
      answer:
        "Career Navigator — the three assessments, career matches and degree suggestions with no counsellor — is ₹2,990. Accelerator, at ₹7,990, adds a counselling session and a written action plan. A single 60-minute consultation with a certified counsellor, if you would rather talk first, is ₹3,000.",
      body: [
        "A conversation with a practitioner in the field you are weighing is a separate and often decisive purchase: Meet an Expert starts at ₹2,990 for 45 to 60 minutes with someone who has actually done the work.",
      ],
    },
  ],
  instruments: [FIT],
  measures: [
    "How defined the direction already is, and how wide the field of live options still runs",
    "What is riding on the next decision — money, years, a family expectation",
    "Whether you would act better on a report alone or with a counsellor on the case",
    "How much of a deadline is genuinely forcing the timing",
  ],
  limits: [
    "It does not measure aptitude, interest or personality",
    "It does not tell you which postgraduate course to apply to, or which company to join",
    "It does not assess your CV, your projects or your interview performance",
    "It cannot see your marks, your backlog, or your placement record",
    "It reads what kind of help the decision needs — not who you are",
  ],
  faq: [
    {
      q: "I chose the wrong degree. Is it too late to change direction?",
      a: "Very little at this stage is irreversible. Most fields are reachable through a postgraduate route, a professional qualification or a deliberately chosen first job, and employers weigh demonstrated ability far more than the label on an undergraduate degree. The expensive error is repeating the original one, not correcting it.",
    },
    {
      q: "Do graduates take the same assessments as school students?",
      a: "The instruments are the same three traditions — interest, personality and aptitude — but they are read against a different question. For a school student the output is streams and degrees; for a graduate it is fields, roles and the route into them, weighed against what the labour market is actually hiring.",
    },
    {
      q: "Should I take a career test before applying for a master's?",
      a: "It is the cheapest diligence available before a two-year, several-lakh commitment. A postgraduate degree narrows a career rather than widening it, so it is worth knowing that the narrowing points where your measured aptitude and interest already do.",
    },
    {
      q: "Can I speak to someone who actually works in the field I am considering?",
      a: "Yes. Meet an Expert is a 45 to 60 minute session with a practitioner — a doctor, engineer, founder, pilot, designer, lawyer, product manager or researcher — booked on its own or added to any programme, starting at ₹2,990. Counselling sets the direction; a practitioner gives you the detail only they have.",
    },
  ],
  links: [
    { label: "Take the Package-Fit Test", to: "/fit", hint: "Free, about five minutes" },
    { label: "Free career test hub", to: "/career-test", hint: "What free tests measure, and what they cannot" },
    { label: "Career assessment for working professionals", to: "/career-test/working-professionals", hint: "Once the first job has started" },
    { label: "For graduates", to: "/solutions#graduates", hint: "A degree isn't a direction" },
    { label: "Career library", to: "/library", hint: "What each field is actually like, day to day" },
    { label: "What career counselling actually changes", to: "/blog/what-career-counselling-actually-changes", hint: "The honest account" },
    { label: "The decision model", to: "/framework#model", hint: "Four factors, one overlap" },
    { label: "Pricing", to: "/pricing", hint: "Navigator, Accelerator, consultation" },
    { label: "Book a session", to: "/book", hint: "Talk it through first" },
  ],
}

const PROFESSIONALS: CareerTestPage = {
  slug: `${CAREER_TEST_BASE}/working-professionals`,
  key: "working-professionals",
  audience: "Working professionals",
  title: "Career assessment for working professionals | SetMyCareer",
  description:
    "A free career assessment for working professionals weighing a switch, promotion or break. A two-part readiness diagnostic, scored on screen, with its limits.",
  primaryKeyword: "career assessment for working professionals",
  secondaryKeywords: [
    "career change at 30 in india",
    "midlife career change india",
    "career test for professionals",
    "career switch assessment",
  ],
  h1: "A career assessment for working professionals weighing a move",
  dek: "By the time a career feels stuck, the constraint is rarely ability. It is usually money, family, location or time — and those are measurable too.",
  intro:
    "A professional deciding about a switch is deciding under conditions a student never faces: an EMI, a family, a location that is not fully yours to choose, and a market that reads a CV before it reads a person. Two forces run in parallel. Internal readiness — competencies, interests, motivations, values. And circumstantial readiness — finances, responsibilities, mobility, health, learning capacity, the labour market as it stands. Capable people feel stuck when circumstances close the options; favourable circumstances alone do not produce a career worth having. The free diagnostic here reads both.",
  sections: [
    {
      h2: "What is a career assessment for working professionals?",
      answer:
        "At SetMyCareer it is a free two-part diagnostic, about twenty minutes, scored on screen. The first part reads career decision readiness and returns a score with an interpretation band. The second reads the circumstances around a move — money, family, location, health, learning and opportunity. Together they show where the block actually sits.",
      body: [
        "The first part also computes something most instruments will not: the gap between what you believe about your position and what the evidence in your own answers supports. Perception minus evidence. It is uncomfortable and it is the single most useful number in the report.",
      ],
    },
    {
      h2: "How is this different from a student career test?",
      answer:
        "A student is choosing a first direction with everything open. A professional is changing course with commitments running. The instruments differ accordingly: a student test weighs aptitude and interest heavily, while the professional diagnostic weighs decision readiness, market positioning and the constraints that determine whether a move is even executable.",
    },
    {
      h2: "Is it worth changing career at thirty in India?",
      answer:
        "Often, and the arithmetic is less frightening than it feels. Thirty leaves three decades of working life, and a decade of accumulated skill transfers further than most people assume. The real questions are the runway you have, what the new field pays at entry, and how long the crossing takes. All three are answerable.",
      body: [
        "What derails a switch is rarely the ambition. It is a plan built on an estimate of savings, seniority and market demand that was never checked. The circumstantial half of the free diagnostic exists to check exactly those.",
      ],
    },
    {
      h2: "Should I do an MBA, or change roles?",
      answer:
        "That depends on whether the constraint is credential, network or direction — and those look identical from the inside. An MBA solves the first two expensively and the third not at all. Establish which one is actually blocking you before committing two years and several lakh rupees to the answer.",
    },
    {
      h2: "What does a career assessment for working professionals cost?",
      answer:
        "The two-part readiness diagnostic is free. A 60-minute consultation with a senior counsellor is ₹4,000. Pivot — a structured switch with three senior sessions, the full assessment battery on professional norms, an executive resume and a written transition plan — is ₹24,990. Director's Cut, for leadership-level moves, is ₹59,990.",
    },
  ],
  instruments: [CRI_EXEC, FIT],
  measures: [
    "Career decision readiness, scored and banded",
    "The gap between how you see your position and what your own answers evidence",
    "Financial flexibility, family responsibility, location mobility and time available for a move",
    "Health and energy, learning investment, and how ready you are for an opportunity that arrives next week",
    "Which constraints are currently stopping growth, ranked",
  ],
  limits: [
    "It does not measure aptitude, interest or personality — those are separate validated instruments",
    "It does not value your CV, benchmark your salary, or predict whether a specific employer will hire you",
    "It does not tell you which role to take, or when to resign",
    "A self-report reads your perception of your circumstances, which is not the same as your circumstances",
    "It is not psychological or financial advice, and it does not substitute for either",
  ],
  faq: [
    {
      q: "Is the career assessment for working professionals free?",
      a: "The two-part readiness diagnostic is free and scored on screen, with no card. What is paid is the professional assessment battery and the counselling around a switch: a 60-minute consultation at ₹4,000, or Pivot at ₹24,990 for a structured transition with three senior sessions and a written plan.",
    },
    {
      q: "How long does it take?",
      a: "About twenty minutes for both parts. It is longer than most free tests because it asks two genuinely different sets of questions — how ready the decision is, and whether your circumstances would let you act on it. Either half alone gives a misleading answer.",
    },
    {
      q: "Can a career test tell me which job to switch to?",
      a: "A free readiness diagnostic cannot, and does not claim to. The measured battery plus a senior counsellor can produce a ranked shortlist with the reasoning shown — why each direction fits, what it demands, and what the transition costs in time and rupees. The deciding stays yours.",
    },
    {
      q: "I have taken a career break. Where should I start?",
      a: "With the circumstantial half of the diagnostic, because a return is usually blocked by logistics and confidence rather than ability. It reads financial runway, family responsibility, location flexibility and how current your professional visibility is — which is the honest list of what a return actually has to solve.",
    },
    {
      q: "Is midlife too late for a career assessment?",
      a: "The executive track is written for professionals up to sixty-five. Later in a career the constraints are heavier and the room for error smaller, which makes measuring them more valuable, not less. Director's Cut exists for exactly the moves where the next decision shapes an organisation rather than a CV.",
    },
  ],
  links: [
    { label: "Take the Career Clarity Index", to: "/cri", hint: "Free, two parts, about twenty minutes" },
    { label: "Take the Package-Fit Test", to: "/fit", hint: "Free, about five minutes" },
    { label: "Free career test hub", to: "/career-test", hint: "What free tests measure, and what they cannot" },
    { label: "Career test for college students", to: "/career-test/college", hint: "Before the first job settles" },
    { label: "For professionals", to: "/solutions#professionals", hint: "Growth, switches, AI risk" },
    { label: "Changing careers at thirty in India", to: "/blog/changing-careers-at-thirty-in-india", hint: "The arithmetic of a switch" },
    { label: "Restarting a career after a break", to: "/blog/restarting-a-career-after-a-break", hint: "What a return has to solve" },
    { label: "Pricing", to: "/pricing", hint: "Consultation, Pivot, Director's Cut" },
    { label: "Book a session", to: "/book", hint: "Talk to a senior counsellor" },
  ],
}

/* ── exports ────────────────────────────────────────────────────────────── */

/** the four audience landing pages, in the order they should appear on the hub */
export const CAREER_TEST_AUDIENCES: CareerTestPage[] = [CLASS_8_10, CLASS_11_12, COLLEGE, PROFESSIONALS]

/** hub first — the order a sitemap and a breadcrumb trail both want */
export const CAREER_TEST_PAGES: CareerTestPage[] = [CAREER_TEST_HUB, ...CAREER_TEST_AUDIENCES]

export const careerTestBySlug = (slug: string): CareerTestPage | undefined =>
  CAREER_TEST_PAGES.find((p) => p.slug === slug || p.slug === `${CAREER_TEST_BASE}/${slug}` || p.key === slug)

/** cards for the hub index and the sibling rail at the foot of each audience
 *  page — derived so a copy edit above cannot drift from the navigation. */
export interface CareerTestCard { key: string; slug: string; audience: string; dek: string }
export const CAREER_TEST_INDEX: CareerTestCard[] = CAREER_TEST_AUDIENCES.map((p) => ({
  key: p.key,
  slug: p.slug,
  audience: p.audience,
  dek: p.dek,
}))
