// Search-shaped heads for our OWN essays.
//
// The on-page H1 stays editorial ("the switch at thirty", "beyond the jee/neet
// binary") because that voice is the brand and the reason a reader stays. But
// nobody searches for it. This table gives each essay a second, keyword-led
// identity for the <title>, the meta description and the FAQPage graph — the
// three things a crawler or an answer engine reads before a human ever arrives.
//
// Scope note: these are the ten ORIGINAL essays (src/content/site.ts ARTICLES —
// six in site.ts plus four in more-articles.ts). The ~236 mirrored posts are not
// ours and must keep canonicalling to their setmycareer.com originals; they get
// no entry here.
//
// Keyword assignments follow the July 2026 competitive teardown's Top-50. One
// discipline held throughout: the transactional test terms ("free career test",
// "career aptitude test") are reserved for the /career-test hub and are never
// used as an essay primary — an essay that outranks its own landing page for a
// buying query is a loss, not a win.

export interface PostSeo {
  /** must match an Article.slug in src/content/site.ts ARTICLES */
  slug: string
  /** the COMPLETE <title> element, brand suffix already included where it fits
   *  under 60 chars — consumers must not append " — SetMyCareer" again */
  title: string
  description: string
  /** the single query this page is built to win */
  primary: string
  /** supporting queries the same page can plausibly hold */
  secondary: string[]
  /** answered by the essay's own argument, so FAQPage schema stays truthful and
   *  the answer is actually findable on the page */
  faq?: { q: string; a: string }[]
}

export const POST_SEO: PostSeo[] = [
  {
    slug: "changing-careers-at-thirty-in-india",
    title: "Career Change at 30 in India: Evidence First | SetMyCareer",
    description:
      "A career change at 30 in India is heavier, not braver. Re-measured aptitude, an adjacency map and runway maths — the arithmetic behind a switch that holds.",
    primary: "career change at 30 in India",
    secondary: [
      "midlife career change India",
      "career assessment for working professionals",
      "how to switch careers in India",
      "is 30 too late to change career",
    ],
    faq: [
      {
        q: "Is 30 too late to change careers in India?",
        a: "No. In a working life that now runs past sixty, thirty is the end of the first quarter. What changes at thirty is weight, not possibility — EMIs, family plans and dependants make the switch heavier, which is why it needs measurement, an adjacency map and runway arithmetic rather than a Sunday-night mood.",
      },
      {
        q: "Should I retake a career assessment before switching at 30?",
        a: "Yes. Most switchers self-assess from memory that is twelve years old and was collected under exam pressure. Aptitude stays fairly stable into adulthood, but interests drift as real work accumulates. A fresh aptitude battery and interest inventory tell you whether the pull is a genuine profile match or a reaction to a bad manager.",
      },
      {
        q: "How much runway do I need before quitting my job?",
        a: "Write down monthly burn, liquid savings excluding the emergency fund, and the honest months from resignation to a stable paycheque — then add six months, because transitions run late. Savings divided by burn is your runway. Under twelve months, the answer is not to abandon the switch but to make it without resigning.",
      },
      {
        q: "Do I hate my field, or just my job?",
        a: "Most thirty-year-olds who say they hate their field turn out to hate their role, their manager or their commute. An assessment separates the two by testing whether a re-measured profile matches the new field or merely opposes the old job. A resignation letter cannot make that distinction.",
      },
    ],
  },
  {
    slug: "choosing-a-stream-after-class-10",
    title: "Which Stream to Choose After 10th: A Framework | SetMyCareer",
    description:
      "Which stream to choose after 10th, decided calmly: aptitude first, then interest, then opportunity — plus the two myths that push families the wrong way.",
    primary: "which stream to choose after 10th",
    secondary: [
      "best stream after 10th",
      "how to choose stream after class 10",
      "science vs commerce vs arts after 10th",
      "career options after 10th",
    ],
    faq: [
      {
        // reused verbatim from src/content/faq.ts so the homepage FAQPage and this
        // one never state the method two different ways
        q: "How do I choose a stream after Class 10?",
        a: "Weigh three inputs in order: aptitude first, where steady effort compounds fastest; then interest, what holds your attention unprompted; then opportunity, the job market and your constraints. Avoid two myths — that science is the 'safe' superset, since carrying subjects you have no aptitude for has a real cost, and that commerce and arts are fallbacks, since both lead to strong professions. Almost nothing here is permanent: decide carefully, then hold the decision lightly.",
      },
      {
        q: "Is science really the safest stream after 10th?",
        a: "It keeps the engineering and medical routes available, which is why it is called safe. But carrying subjects you have no aptitude for has a real cost in marks, confidence and time. Commerce leads to chartered accountancy, economics, finance, law and management; the humanities lead to law, civil services, design, psychology and research. A stream chosen well beats a prestigious stream endured badly.",
      },
      {
        q: "Can I change my stream later?",
        a: "Almost nothing here is permanent. Streams can be bridged, exams re-attempted, degrees switched. The students who struggle most are rarely those who picked the wrong stream — they are those who picked under pressure, stopped thinking, and never revisited the choice.",
      },
    ],
  },
  {
    slug: "how-ai-career-counselling-actually-works",
    title: "AI Career Counsellor: How It Actually Works | SetMyCareer",
    description:
      "What an AI career counsellor actually does — scores the tests, retrieves the pathways, drafts the report — and where a certified human counsellor takes over.",
    primary: "AI career counsellor",
    secondary: [
      "AI career guidance for students",
      "how does AI career counselling work",
      "is AI career counselling reliable",
      "AI career report India",
    ],
    faq: [
      {
        q: "What does an AI career counsellor actually do?",
        a: "Three things. It scores the psychometric tests, which is arithmetic a machine does faster and without tallying errors at four in the afternoon. It retrieves current pathway, entrance-exam and salary data that no counsellor can hold in memory. And it drafts a first version of the report. A certified counsellor then edits it and owns the recommendation.",
      },
      {
        q: "Can AI write my career report without a counsellor?",
        a: "It writes the draft, not the recommendation. Every draft goes to a certified counsellor before it reaches you, because the numbers cannot tell a genuinely broad interest profile from a student answering the way they think their parents want. The AI never meets your family. The counsellor does.",
      },
      {
        q: "Are the tests behind AI career counselling new?",
        a: "No, and that is the point. The RIASEC interest inventory dates to the 1950s, the Big Five personality model carries four decades of research, and aptitude batteries are older still. AI changes how fast they are scored and how current the surrounding data is — not what is being measured.",
      },
      {
        q: "Can a career test predict my future?",
        a: "No test predicts a life. A good assessment narrows a field of hundreds of options to a handful worth serious discussion — probabilities, not prophecies. Expect it to sometimes say what you did not want to hear, and expect the counselling conversation to matter more than the PDF.",
      },
    ],
  },
  {
    slug: "what-parents-get-right-and-wrong-about-career-choice",
    title: "How to Help Your Child Choose a Career | SetMyCareer",
    description:
      "Parents hold real data on security and time; their market map is often twenty years old. How to help your child choose a career by setting floors, not paths.",
    primary: "how to help my child choose a career",
    secondary: [
      "how to help your child choose a career",
      "career counselling for my child",
      "career guidance for parents India",
      "should parents decide their child's career",
    ],
    faq: [
      {
        q: "What do parents get right about career choice?",
        a: "Two large things: security and time. A seventeen-year-old discounts risk because he has not lived through a bad decade; parents have. And parents choose in decades where teenagers choose in semesters. There is a third, less noticed: a psychometric test is a snapshot, but a parent holds ten years of film.",
      },
      {
        q: "How can I help my child choose a career without deciding for them?",
        a: "Set floors, not paths. 'You must be able to support yourself by twenty-five' is a floor; 'you must do engineering' is a path. Floors protect the future, paths confiscate it. Buy information instead of winning arguments, fund exploration before you fund coaching, and say out loud that you will advise and they will decide.",
      },
      {
        q: "Why does a parent's career advice often go wrong?",
        a: "Three failures, and they compound. The map is old — drawn when engineering, medicine and a government post covered the honourable options. Proxy ambition sends a child to service someone else's regret. And fear dressed as prudence refuses everything unfamiliar; prudence prices a risk, fear simply declines it.",
      },
    ],
  },
  {
    slug: "beyond-the-jee-neet-binary",
    title: "Courses After 12th Without NEET or JEE: The Wider Map",
    description:
      "Courses after 12th without NEET or JEE are not consolation prizes — design, law, economics, data, allied health. The wider map most students are never shown.",
    primary: "courses after 12th without NEET",
    secondary: [
      "career options after 12th science",
      "what to do after 12th besides engineering and medicine",
      "courses after 12th without JEE",
      "career options after 12th",
    ],
    faq: [
      {
        q: "What are the options after 12th besides NEET and JEE?",
        a: "Pure and applied sciences, economics, commerce and the CA, CS and CMA routes, design through NID, NIFT and UCEED, architecture and planning, five-year integrated law via CLAT, psychology and the social sciences, computer applications and data fields, hospitality and culinary arts, agriculture, allied health such as physiotherapy and nutrition, and the liberal arts.",
      },
      {
        q: "Why does the JEE and NEET binary persist?",
        a: "Because both paths are legible — parents recognise the degree, the exam and the rough salary — both have visible role models nearby, and both are served by an enormous coaching industry whose business depends on the funnel staying narrow. That makes them the most repeated options, not the best-fitting ones.",
      },
      {
        q: "How do I choose a course after 12th without NEET?",
        a: "Work from the person, not the exam. Established psychometrics give a usable starting frame: broad personality traits, RIASEC interest patterns, and aptitudes measured rather than assumed. Then read the labour market honestly, and keep options open where the cost of keeping them open is low.",
      },
    ],
  },
  {
    slug: "science-behind-a-career-assessment",
    title: "Psychometric Test for Career Selection: How to Read It",
    description:
      "What a psychometric test for career selection measures with confidence — aptitude, interest, personality — where the evidence stops, and how to read a result.",
    primary: "psychometric test for career selection",
    secondary: [
      "how accurate are career assessments",
      "RIASEC interest test explained",
      "Big Five personality career test",
      "aptitude interest personality difference",
    ],
    faq: [
      {
        q: "What does a psychometric test for career selection measure?",
        a: "Three families of measurement do most of the work. Personality describes how you tend to operate, usually along the Big Five. Interest describes where your attention goes willingly, usually along the six RIASEC themes. Aptitude measures specific reasoning abilities — verbal, numerical, spatial, abstract and mechanical.",
      },
      {
        q: "How accurate are career assessments?",
        a: "Accurate enough to narrow a field, not to issue a verdict. Conscientiousness has the most consistent link to performance across a wide range of jobs. Aptitude has the strongest relationship with how quickly someone learns demanding work. Interest predicts persistence. Traits describe probabilities, not destinies.",
      },
      {
        q: "What can a career assessment not tell me?",
        a: "No test measures motivation over a decade, family circumstances, the state of the job market, or the person you are still becoming. Aptitude is a snapshot of present ability, not a ceiling: a modest spatial score does not bar you from engineering, it tells you where you will have to work harder.",
      },
      {
        q: "How should I read my career test results?",
        a: "As evidence, not instruction. Look for convergence across the three families — where strong aptitude, real interest and a fitting temperament overlap, you have directions worth taking seriously. Where they conflict, you have the tensions worth talking through before committing years and fees. Treat surprises as questions, not commands.",
      },
    ],
  },
  {
    slug: "what-career-counselling-actually-changes",
    title: "Is Career Counselling Worth It? What It Actually Changes",
    description:
      "Is career counselling worth it when the information is already free? Information is symmetrical; a decision is not. What counselling adds that search cannot.",
    primary: "is career counselling worth it",
    secondary: [
      "what does a career counsellor do",
      "benefits of career counselling",
      "career counselling for students after 12th",
      "do I need a career counsellor",
    ],
    faq: [
      {
        q: "Is career counselling worth it if I already know my options?",
        a: "Most people who arrive have already read the course lists, eligibility rules and salary ranges. Information is symmetrical — everyone reading the same article gets the same facts. A decision is asymmetrical: it depends on aptitude, temperament and constraints specific to one person. That gap is what counselling closes.",
      },
      {
        q: "What actually stops a capable person from deciding?",
        a: "Rarely missing information. Usually it is fifteen plausible options weighted equally, other people's voices standing in for your own, or the collapse of three different things — liking a subject, being good at it, and enjoying the daily work it leads to — into one idea.",
      },
      {
        q: "What is the real outcome of career counselling?",
        a: "Not a report. A person who can explain their own decision — what they chose, what they declined, and why. That explanation is what holds up months later, when the novelty has worn off and the work is just work.",
      },
    ],
  },
  {
    slug: "what-to-automate-and-what-to-keep-human",
    title: "Can AI Choose My Career? Where the Line Is | SetMyCareer",
    description:
      "Can AI choose my career? It can score, retrieve and draft — it cannot tell you what you are willing to suffer for. Where the line sits, and why it holds.",
    primary: "can AI choose my career",
    secondary: [
      "ChatGPT for career advice",
      "can AI replace career counsellors",
      "AI career guidance limitations",
      "AI vs human career counselling",
    ],
    faq: [
      {
        // reused verbatim from src/content/faq.ts — one answer, one position
        q: "Can AI replace a career counsellor?",
        a: "It can replace parts of the work, not the whole. AI is well suited to scoring assessments consistently and retrieving the full breadth of pathways. It is structurally unsuited to interpreting a score in the context of a person's circumstances, or to the conversation about what someone is willing to give up for a path. The right design is the machine doing the measuring so the human is free to do the judgement.",
      },
      {
        q: "What should be automated in career guidance?",
        a: "Scoring and consistency, because software does not tire on the four-hundredth report or forget a sub-scale. Breadth of information, because no counsellor can hold every entrance route and emerging role in their head. And first drafts and admin, which free the hour for the person rather than the paperwork.",
      },
      {
        q: "What must stay human in career counselling?",
        a: "Interpretation in context, because the same aptitude profile means something different for a first-generation student than for one with three engineers at the table. The conversation about meaning, since a test can tell you what you are good at but not what you are willing to suffer for. And accountability — a model cannot own a recommendation.",
      },
    ],
  },
  {
    slug: "restarting-a-career-after-a-break",
    title: "Career Restart After a Break: Sequence First | SetMyCareer",
    description:
      "A career restart after a break is a sequencing problem, not a confession. Proof of work, then contacts, then applications — and one clean line for the gap.",
    // no exact Top-50 row covers re-entry after a break; nearest cluster is G
    // (professionals / career change), so this takes the long-tail head term and
    // borrows #12 and #48 as secondaries rather than fighting #46 for its SERP
    primary: "career restart after a break",
    secondary: [
      "career assessment for working professionals",
      "how to explain a career gap in an interview",
      "returning to work after a career break India",
      "midlife career change India",
    ],
    faq: [
      {
        q: "How do I explain a career break to an employer?",
        a: "In one calm sentence, then stop. 'I took two years out for family care, used the last few months to update my skills, and I am now focused on returning to data analysis.' No defensiveness, no over-sharing, no apology. The tone you set is the tone the interviewer adopts.",
      },
      {
        q: "What is the right order of steps when restarting a career?",
        a: "Repair before search. Start with one small, current proof of work — a short course, a certification, a freelance task — because a single recent, datable line resets how the whole timeline reads. Then rebuild a few live connections. Only then go wide with applications, targeting smaller organisations, returnship programmes and contract roles.",
      },
      {
        q: "Should I return at my old level after a career break?",
        a: "Decide the altitude in advance: your old level, a step down to rebuild momentum, or sideways into an adjacent role. There is no shame in a deliberate step down that buys re-entry, and real cost in holding out for an exact-match title the market is not offering.",
      },
    ],
  },
  {
    slug: "the-cost-of-a-wrong-career-choice",
    title: "The Cost of a Wrong Career Choice in India, Counted",
    description:
      "The cost of a wrong career choice in India, counted in rupees and years — coaching fees, drop years, a mismatch that keeps charging interest after the degree.",
    // the fee and employability figures below are the essay's own; nothing here
    // is invented for the snippet
    primary: "cost of a wrong career choice",
    secondary: [
      "career counselling fees in India",
      "why career guidance is important in India",
      "wrong stream after 10th consequences",
      "career regret India",
    ],
    faq: [
      {
        q: "What does a wrong career choice actually cost?",
        a: "Two bills. The visible one: NEET drop years with coaching and a Kota hostel at three to four lakh rupees a year, a private B.Tech at ten to sixteen lakh, a private MBBS seat past a crore — all paid before anyone checked the fit. The invisible one: the years between seventeen and twenty-two, spent on the wrong syllabus.",
      },
      {
        q: "Why does a career mismatch compound over time?",
        a: "A student parked in a field he has no aptitude for studies to pass, not to master, and recruiters can tell the difference in one interview. A mismatched graduate starts lower, grows slower, and switches tracks later from a weaker position. The India Skills Report 2024 assessed about 51 percent of Indian graduates as employable.",
      },
      {
        q: "Is a career assessment worth the money?",
        a: "Set it against the ledger it protects. Nobody in India buys a flat without a site visit or gold without checking the day's rate, yet a career gets forty years of a life and often less scrutiny than a refrigerator. An interest inventory, an aptitude battery and personality data cost a few thousand rupees and one honest afternoon.",
      },
    ],
  },
]

export const postSeo = (slug: string) => POST_SEO.find((p) => p.slug === slug)
