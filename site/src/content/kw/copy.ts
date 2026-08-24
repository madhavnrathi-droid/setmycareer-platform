import type { KwCopy } from "./types"

/* Copy for the twelve keyword-mapped pages (see ../kw-map.ts for the search targets).
 *
 * These supersede twelve .php pages on the live setmycareer.com. Six of those pages
 * currently carry canonical tags pointing at unrelated blog URLs, which tells Google
 * they are duplicates and suppresses them; that is fixed structurally here, because
 * every route below self-canonicals through the prerenderer.
 *
 * Each page argues one decision. The `limits` block on each is not a disclaimer — it
 * is the differentiator. No competitor in this category publishes what their own
 * assessment cannot establish, and it is the passage most likely to be quoted. */

const CLARITY = { label: "Take the Career Clarity Index", to: "/cri", note: "Free, about ten minutes, scored on the spot." }

export const KW_COPY: KwCopy[] = [
  {
    route: "/career-counselling",
    h1: "Career counselling, built on evidence rather than opinion",
    dek: "The diligence that belongs before a ten-lakh decision, not after it.",
    intro:
      "Career counselling in India is usually a conversation with someone who means well and knows a little. It should be a measurement. SetMyCareer has run career counselling since 2010 on validated aptitude, interest and personality instruments, read by a trained counsellor and turned into a shortlist you can explain to anyone who asks — including yourself.",
    sections: [
      {
        h2: "What does career counselling actually involve?",
        answer:
          "Three parts. You take validated instruments that measure aptitude, interest and personality. A trained counsellor reads the scores as a pattern rather than a list. Then the two of you translate that pattern into specific streams, courses or roles, weighed against admission odds, cost and what the daily work is really like.",
        body: [
          "The order matters. Most guidance starts with options and works backwards to justify them. Starting from measurement means the shortlist is a finding rather than a preference, and it survives the first argument at the dinner table.",
        ],
      },
      {
        h2: "Is career counselling worth it in India?",
        answer:
          "The economics are stark. Over 90% of Indian schools have no dedicated career counsellor, and the national ratio is roughly one counsellor per 3,000 students against a recommended 1:250. Yet families routinely spend ₹1–4 lakh on coaching and ₹10–40 lakh on a degree chosen with almost no structured input.",
        body: [
          "Counselling is the smallest line in that ledger and the one that decides whether the rest was worth spending. It does not guarantee an outcome. It removes the guesswork from the single most expensive decision most families make.",
        ],
      },
      {
        h2: "When is the right time for career counselling?",
        answer:
          "Slightly before each decision, while options are still open. That means Class 9–10 ahead of stream selection, Class 11–12 ahead of degree choice, and the final year of a degree ahead of the first job. Working professionals benefit at any point, most of all before a switch rather than during one.",
      },
      {
        h2: "How is online career counselling different from meeting in person?",
        answer:
          "The instruments are identical and scored the same way. Online career counselling removes the travel and the scheduling friction, which in practice means families actually finish the process. Sessions run live with the same trained counsellors, and the written report is the same document either way.",
      },
    ],
    limits: {
      title: "What career counselling cannot do",
      items: [
        "It cannot tell you an exam result before you sit the exam.",
        "It cannot make a path that does not fit you fit you, and a good counsellor will say so early.",
        "It cannot settle a family disagreement by itself — it can only replace opinion with evidence, which usually shortens the argument.",
        "It measures aptitude, interest and personality. It does not measure effort, and effort still decides most outcomes.",
      ],
    },
    faq: [
      { q: "How much does career counselling cost?", a: "It scales with depth. The Career Clarity Index is free. Focused assessments sit in the low thousands of rupees, and full counselling — instruments, sessions with a trained expert and a written report — is quoted to the engagement. Every fee is itemised on the pricing page." },
      { q: "Do you offer free career counselling?", a: "The Career Clarity Index is genuinely free and needs no account. It is a structured self-report that reads how ready you are to decide, not a full assessment. It is the honest place to start, and it tells you how much measurement you actually need." },
      { q: "Who does the counselling?", a: "Trained counsellors who read psychometric results for a living, working from the same five-step method every time. The founder, Dr. Nandkishore Rathi, has run this practice since 2010." },
      { q: "Can I get career counselling near me?", a: "Sessions run online across India, which is how most families use it. The instruments and the report are identical to an in-person engagement." },
      { q: "What is the difference between career guidance and career counselling?", a: "Career guidance and counselling for students are often used interchangeably. In practice guidance is informational — what exists, what it pays, what it needs. Counselling is interpretive: a trained person reading your measured results against your circumstances. Guidance widens the field; counselling narrows it with reasons." },
      { q: "How do I judge the best career counselling service?", a: "Ask three things. Which validated instruments do they use, and will they name them. Who reads the results, and what are their credentials. And what will they not claim — anyone promising a guaranteed outcome or a single perfect career is selling certainty that psychometrics cannot supply." },
    ],
    cta: CLARITY,
  },
  {
    route: "/career-counselling/class-8",
    h1: "Career guidance for Class 8 students, before anything is decided",
    dek: "The stage where breadth is the whole objective.",
    intro:
      "Career guidance for Class 8 students is not about choosing a career. It is about noticing, early and without pressure, what a child is drawn to and what they are quietly good at — while there is still time for that to change. Nothing at this age is a commitment, and treating it as one is the most common mistake families make.",
    sections: [
      {
        h2: "Do career guidance websites help at this age?",
        answer:
          "Career guidance websites for students are useful for exposure. They widen the list of jobs a thirteen-year-old has heard of, which is the real constraint at this stage. What they cannot do is measure aptitude, and the honest ones say so. Treat them as a catalogue rather than an assessment.",
        body: [
          "Career guidance and counselling for students becomes measurement-led from Class 9 onward. Before that, the most useful career guidance questions for students are about attention rather than ambition: what they return to unprompted, and what they quietly abandon.",
          "Stream-specific advice — career guidance for science students, for instance — belongs after Class 10, not before it. Narrowing to a stream at Class 8 forecloses the exploration this stage exists for. A structured career guidance program for students can carry that decision forward when it arrives.",
        ],
      },
      {
        h2: "Should a Class 8 student be thinking about careers at all?",
        answer:
          "Not about careers — about themselves. At thirteen, the useful work is building self-awareness: what holds their attention unprompted, what they recover from quickly, where effort turns into progress. Those observations are worth recording now because memory rewrites them later, usually to match whatever the child chose in Class 11.",
      },
      {
        h2: "What can actually be measured this early?",
        answer:
          "Interest patterns and learning preferences read reasonably well by Class 8. Aptitude is still developing and should be treated as a snapshot, not a verdict. Personality is emerging. Anything that claims to name a child's career at this age is selling certainty that does not exist yet.",
      },
      {
        h2: "How should parents use career guidance at this stage?",
        answer:
          "As a widening exercise. Expose the child to more kinds of work than the four or five careers your own circle happens to know, and watch what they return to on their own. The goal for Class 8 is a longer list, not a shorter one.",
      },
    ],
    limits: {
      title: "What this stage cannot tell you",
      items: [
        "It cannot name a career. Almost nothing is decided yet, and that is the point.",
        "Aptitude scores at thirteen move. Treat them as a reading, not a ceiling.",
        "A strong interest now may not survive Class 10, and that is normal rather than a failure.",
      ],
    },
    faq: [
      { q: "Is Class 8 too early for career guidance?", a: "Too early to choose, exactly right to observe. The value is a record of what your child gravitates towards before exam pressure narrows the field and everyone starts arguing from marks instead." },
      { q: "What does career guidance for Class 8 students include?", a: "A structured read of interests and learning preferences, a conversation with the parent about what to expose the child to next, and a written note to revisit at Class 10 when the stream decision arrives." },
      { q: "Will this tell us which stream to pick?", a: "No, and any service that claims otherwise at Class 8 is guessing. The stream decision belongs at Class 9–10, on a fuller assessment." },
      { q: "What career guidance questions should I ask a Class 8 student?", a: "Ask what they lose track of time doing, what they would happily explain to someone else, and what frustrates them enough to give up. Those three answers say more about aptitude and temperament at thirteen than any question about what they want to be." },
      { q: "Is there free career guidance for students at this stage?", a: "The Career Clarity Index is free and needs no account. It reads how ready a family is to make the decision rather than measuring the child, which at Class 8 is the more useful of the two. A full assessment becomes worthwhile closer to Class 9." },
    ],
    cta: { label: "Start with the free readiness check", to: "/cri", note: "Answered by a parent, about one child aged 10–18." },
  },
  {
    route: "/career-counselling/class-9",
    h1: "Career guidance for Class 9 students, the year before the first real choice",
    dek: "Stream selection is one year away. This is when the evidence gets gathered.",
    intro:
      "Career guidance for Class 9 students matters because the stream decision arrives at the end of Class 10 and is usually made in a fortnight, under pressure, on marks alone. A year of lead time changes that. It is long enough to measure aptitude properly, test an interest against reality, and arrive at the decision with something more than a percentage.",
    sections: [
      {
        h2: "What should career guidance look like in Class 9?",
        answer:
          "Measurement-led rather than conversational. Career guidance and counselling for students at this stage should establish aptitude with validated instruments, because the stream decision a year away deserves better evidence than a preference expressed in a single conversation.",
        body: [
          "The career guidance questions for students that matter in Class 9 differ from those that mattered in Class 8. They are no longer about exposure but about evidence: where does effort actually convert into progress, and which subjects reward it. A career guidance program for students records that and revisits it, rather than treating one sitting as the whole answer.",
          "Career guidance websites for students remain useful for widening the field, but by Class 9 the constraint has shifted from not knowing the options to not knowing which of them fit.",
        ],
      },
      {
        h2: "Why does Class 9 matter more than families expect?",
        answer:
          "Because it is the last uncrowded year. By Class 10 the board exam absorbs everything and the stream question gets answered in whatever time is left over. Doing the assessment in Class 9 means the decision is made from evidence rather than from exhaustion.",
      },
      {
        h2: "What should a Class 9 assessment cover?",
        answer:
          "Aptitude across verbal, numerical and spatial reasoning; interest along an established framework; and personality, because temperament decides which environments a student will tolerate for a decade. Read together they show where strong ability and genuine interest overlap — which is a much smaller field than either alone.",
      },
      {
        h2: "How do we test an interest before committing to it?",
        answer:
          "Put the student near the actual daily work, not its image. A week of shadowing, a short project, a conversation with someone doing the job now. Interests that survive contact with the ordinary parts of the work are the ones worth building a stream around.",
      },
    ],
    limits: {
      title: "What this stage cannot tell you",
      items: [
        "It cannot predict a Class 10 board result, and the stream decision will still depend partly on it.",
        "It cannot rule a stream out on aptitude alone — effort and teaching quality move outcomes substantially.",
        "It cannot settle what a family will fund. That constraint is real and belongs in the conversation openly.",
      ],
    },
    faq: [
      { q: "Is Class 9 the right time for a career assessment?", a: "It is the best time before Class 10. There is enough cognitive maturity for aptitude testing to read reliably, and enough time left to act on what it finds." },
      { q: "What is the difference between Class 8 and Class 9 guidance?", a: "Class 8 widens the field; Class 9 starts narrowing it against measured ability. The instruments are fuller and the output is a shortlist rather than an observation." },
      { q: "Does this replace the Class 10 stream decision?", a: "No. It supplies the evidence that decision should be made on. The decision itself belongs to the student and the family." },
      { q: "What does career guidance for students after 10th depend on?", a: "On what was established before it. A Class 9 assessment gives the stream decision measured aptitude and interest to work from, so the choice made after 10th rests on evidence rather than on board marks alone. Without it, that decision is usually made in a fortnight under pressure." },
      { q: "Is free career guidance for students enough at Class 9?", a: "A free readiness check tells you whether you need a full assessment; it does not replace one. At Class 9, with the stream decision a year out, the fuller instruments are worth the cost because there is still time to act on what they find." },
    ],
    cta: { label: "See what a full assessment covers", to: "/career-test/class-8-10", note: "The instruments, and what each one establishes." },
  },
  {
    route: "/career-counselling/after-10th",
    h1: "Career options after 10th, and how to choose a stream calmly",
    dek: "Seven streams, one decision, and far less permanence than anyone tells you.",
    intro:
      "Career options after 10th come down to a stream choice that families treat as irreversible and mostly is not. Science, commerce and arts each open wide fields, and the right one is the stream where measured aptitude, genuine interest and what you can realistically sustain overlap. Marks alone are the weakest of those three inputs, and the one most decisions get made on.",
    sections: [
      {
        h2: "How do I choose a stream after 10th?",
        answer:
          "Weigh three inputs in order. Aptitude first, because that is where steady effort compounds fastest. Then interest, meaning what holds your attention without being asked. Then opportunity — the job market, the cost, and what your family can support. A stream that fails on any one of the three tends to fail slowly and expensively.",
      },
      {
        h2: "Is science the safest stream after 10th?",
        answer:
          "It is the widest on paper and the most costly to carry without aptitude for it. Science keeps engineering and medicine open, but a student without numerical and spatial strength spends two years fighting the subject and often arrives at Class 12 with worse options than commerce would have given them.",
      },
      {
        h2: "Are commerce and arts fallback options?",
        answer:
          "No, and treating them that way costs students real careers. Commerce leads to chartered accountancy, finance, economics and business. Arts leads to law, psychology, design, civil services and media. Both contain professions that pay well and are hard to enter — they are simply less advertised.",
      },
      {
        h2: "Can I change stream later?",
        answer:
          "More often than families assume. Several degrees accept students from any stream, and lateral routes exist into most fields. It is not free — you may lose a year or sit an additional qualification — but almost nothing decided at fifteen is permanent. Decide carefully, then hold the decision lightly.",
      },
    ],
    limits: {
      title: "What an assessment cannot settle here",
      items: [
        "It cannot tell you which stream your school will actually offer, or which teachers will be good.",
        "It cannot price the decision. Coaching and degree costs vary enormously and belong in a separate conversation.",
        "It cannot remove the trade-off. Every stream closes something, and a good counsellor names what you are giving up.",
      ],
    },
    faq: [
      { q: "What are the best career options after 10th?", a: "The ones where your measured aptitude and your interest agree. That is a different answer for different students, which is why generic 'top 10 careers' lists are close to useless at this decision." },
      { q: "Which stream has the most scope?", a: "Scope is not a property of a stream, it is a property of the fit between a student and a stream. Science has the widest nominal options and the highest cost of a bad fit." },
      { q: "Should I choose a stream based on my 10th marks?", a: "Marks are one input and a noisy one. They measure performance in a syllabus, not aptitude for a field. Use them alongside an assessment, not instead of one." },
      { q: "Can a career assessment tell me which stream to take?", a: "It can narrow seven options to two or three with reasons you can articulate. The final call stays with you, which is the correct place for it." },
      { q: "What are the career options after 10th in commerce?", a: "Commerce opens chartered accountancy, company secretaryship, economics, finance, business administration, actuarial science and analytics. Several are among the harder professional qualifications in India to complete, and they are reachable without the coaching costs that dominate the science route." },
      { q: "What are the career options after 10th in arts?", a: "Arts leads to law, psychology, design, journalism, civil services, economics, social work, languages and education. It carries the weakest reputation of the three streams and some of the strongest professional destinations, several harder to enter than an engineering seat." },
      { q: "Is a stream selector test worth taking?", a: "A stream selector test is useful when it measures aptitude rather than asking a student to self-report a preference. Career guidance after 10th works best when the test narrows seven options to two or three, and a counsellor explains why each survived." },
    ],
    cta: { label: "Take the Class 8–10 career test", to: "/career-test/class-8-10", note: "Built for the stream decision specifically." },
  },
  {
    route: "/career-counselling/class-11",
    h1: "Career guidance for Class 11 students, with the stream already chosen",
    dek: "Two years to convert a stream into a specific plan.",
    intro:
      "Career guidance for Class 11 students works on a narrower question than earlier stages: the stream is settled, so the task is choosing what to do with it. That means picking a degree and a field, understanding which entrance exams actually matter for it, and finding out now — not in Class 12 — whether the plan matches the student rather than the household's assumption.",
    sections: [
      {
        h2: "What kind of guidance is worth paying for in Class 11?",
        answer:
          "The kind that narrows rather than widens. Career guidance and counselling for students in Class 11 has a specific job: turning a settled stream into a degree, an exam list and a backup. Anything that only broadens the field at this point is arriving two years late.",
        body: [
          "Free career guidance for students — a structured readiness check — is a reasonable place to start, and it will tell you whether a full assessment is warranted. A career guidance program for students carries the plan through to admission, which is where most plans are actually lost.",
          "Career guidance websites for students are no substitute once the decision is this specific. The career guidance questions for students in Class 11 are about trade-offs between real options, and answering them needs someone who can read a score in context.",
        ],
      },
      {
        h2: "What should a Class 11 student be deciding?",
        answer:
          "Which degree, which entrance exams, and which backup. Class 11 is when a plan can still be changed cheaply. By the middle of Class 12 the exam calendar has decided most of it for you, so the value of getting this right is highest right now.",
      },
      {
        h2: "How many entrance exams should a student prepare for?",
        answer:
          "Fewer than most attempt, chosen deliberately. Each additional exam costs preparation time that comes out of the others. Two well-matched exams with a genuine backup beat five taken hopefully, and an assessment helps decide which two by showing where the student is actually strong.",
      },
      {
        h2: "What if the stream now looks like the wrong choice?",
        answer:
          "Say it early. In Class 11 a correction is inconvenient; in Class 12 it is expensive; after admission it costs years. Lateral routes exist into most fields, and a counsellor can map what is still reachable from where the student currently sits.",
      },
    ],
    limits: {
      title: "What this stage cannot tell you",
      items: [
        "It cannot forecast a cut-off or an entrance rank.",
        "It cannot make an unfit stream fit — it can only map the routes out of it honestly.",
        "It cannot decide how much risk a family is willing to carry. That is a conversation, not a score.",
      ],
    },
    faq: [
      { q: "Is Class 11 too late for career guidance?", a: "No. It is the last stage where the plan can change without cost. The stream is fixed but the degree, the exams and the field are all still open." },
      { q: "What does career guidance for Class 11 students cover?", a: "Degree and field shortlisting against measured aptitude and interest, entrance exam selection, admission odds, and an honest read on whether the current plan fits the student." },
      { q: "My child wants to change stream in Class 11. Is that possible?", a: "Sometimes, depending on the board and the school, and it is worth investigating immediately rather than at the end of the year. Where it is not possible, lateral routes after Class 12 usually are." },
      { q: "What career guidance questions matter most in Class 11?", a: "Which degree does this stream actually lead to, which entrance exams matter for it, and what happens if the exam does not go well. A plan that has no answer to the third question is not a plan yet." },
      { q: "How does this differ from career guidance for students after 12th?", a: "Class 11 can still change the plan cheaply. After 12th the exam results have already narrowed the field, so the work shifts from choosing a target to choosing among what is actually reachable." },
    ],
    cta: { label: "Take the Class 11–12 career test", to: "/career-test/class-11-12", note: "Degree and field fit, measured." },
  },
  {
    route: "/career-counselling/after-12th",
    h1: "Career options after 12th, mapped properly rather than narrowed to two",
    dek: "The real map is far wider than engineering and medicine.",
    intro:
      "Career options after 12th are usually presented as a short list that reflects what the people around a student happen to know. The actual field is much larger: pure sciences, design, law, economics, psychology, data, architecture, hospitality, media and the civil services all begin here. Choosing well means testing each option against the daily work it leads to, not its reputation.",
    sections: [
      {
        h2: "What are the career options after 12th science?",
        answer:
          "Far more than the two exams that dominate the conversation. Beyond engineering and medicine, PCM and PCB open pure sciences, research, architecture, data science, biotechnology, pharmacy, agriculture and design. Several of these have shorter routes, lower costs and less crowded entry than the two everyone prepares for.",
      },
      {
        h2: "What can I do after 12th commerce?",
        answer:
          "Chartered accountancy, company secretaryship, economics, finance, business administration, actuarial science, law through integrated programmes, and data or analytics routes that accept commerce students. Commerce is frequently described as a fallback and is in fact one of the most direct paths to a well-paid profession.",
      },
      {
        h2: "What are the options after 12th arts?",
        answer:
          "Law, psychology, design, journalism, civil services, economics, social work, languages, hospitality and education. Arts carries the weakest reputation and some of the strongest professional destinations, several of which are harder to enter than an engineering seat.",
      },
      {
        h2: "How do I choose between engineering and medicine?",
        answer:
          "Start before the binary. Both are long, expensive commitments to a specific daily reality — one largely technical and project-based, the other clinical and human-facing. Read your own aptitude and interest first, then test each against the actual work rather than its image, and only then look at the exams.",
      },
    ],
    limits: {
      title: "What this page cannot settle",
      items: [
        "It cannot tell you your entrance rank, and admission odds depend heavily on it.",
        "It cannot cost your options. Fees, coaching and living costs vary by an order of magnitude across these paths.",
        "It cannot tell you whether you will enjoy the work in ten years. It can tell you whether you are suited to it now.",
      ],
    },
    faq: [
      { q: "What are the best career options after 12th?", a: "The ones where measured aptitude, genuine interest and a realistic route agree. That is specific to the student, which is why a list of 'top careers' rarely survives contact with an actual decision." },
      { q: "What are the courses after 12th science without NEET?", a: "Pure sciences, biotechnology, pharmacy, agriculture, allied health, data science, architecture, design and research routes all open without NEET. The binary is a convention, not a constraint." },
      { q: "Is a career assessment useful after 12th?", a: "It is most useful slightly before, in Class 11 or early Class 12, while the exam plan can still change. Taken after results, it is still worth doing before committing to a degree." },
      { q: "How long does career counselling after 12th take?", a: "The assessment is completed in a sitting. The counselling and the shortlist typically run across a small number of sessions, quoted to the engagement." },
      { q: "What does career guidance after 12th science involve?", a: "Establishing which of the science routes fits measured aptitude, not just which exam is being prepared for. Career guidance for students after 12th science should surface pure sciences, research, data, architecture, pharmacy and design alongside the two exams that dominate the conversation." },
      { q: "Is career guidance after 12th still useful once results are out?", a: "Yes, though it is more useful before. After results the field is fixed but the choice within it is not, and a degree commitment of three to five years is worth measuring against aptitude before it is signed." },
    ],
    cta: { label: "Take the Class 11–12 career test", to: "/career-test/class-11-12", note: "Degree and field fit, before you commit." },
  },
  {
    route: "/career-counselling/after-graduation",
    h1: "Career options after graduation, when the degree has not decided anything",
    dek: "A degree is a qualification. It is not a direction.",
    intro:
      "Career options after graduation are widest and least obvious at exactly the moment most graduates feel they should already know. A degree qualifies you for a field; it does not tell you which role inside that field fits, whether to specialise further, or whether the last three years pointed at the right thing at all. That question is worth answering deliberately.",
    sections: [
      {
        h2: "What should I do after graduation?",
        answer:
          "Establish which of three routes fits before committing to any: enter the workforce now, specialise through a postgraduate degree, or qualify professionally. The right answer depends on measured aptitude, the field's actual entry norms, and what a further two years would cost you in earnings and fees.",
      },
      {
        h2: "Should I do a master's degree straight after graduation?",
        answer:
          "Only where the field genuinely requires it or where two years of work would not teach the same thing faster. Many graduates take a postgraduate degree to defer the decision rather than to advance it, which is expensive. Establish the reason first, then choose the programme.",
      },
      {
        h2: "Can I change field after graduating in something else?",
        answer:
          "Frequently, and more cheaply than most graduates assume. Analytics, product, design, content, operations and sales all take entrants from unrelated degrees. What matters is demonstrable capability and a credible account of why the switch makes sense — not the subject on the certificate.",
      },
    ],
    limits: {
      title: "What this stage cannot tell you",
      items: [
        "It cannot tell you whether a specific employer will hire you.",
        "It cannot price a postgraduate degree against foregone earnings without your own numbers.",
        "It cannot fix a degree that does not suit you — it can identify which of its adjacent fields does.",
      ],
    },
    faq: [
      { q: "What are the best career options after graduation?", a: "The ones your measured aptitude supports and the market is actually hiring for. Those two conditions narrow a very wide field quickly, and rarely to the option a graduate arrived assuming." },
      { q: "Is career counselling useful after graduation?", a: "Often more useful than earlier, because the constraints are concrete: a degree, a market, a timeline and real financial pressure. There is less to guess at and more to weigh." },
      { q: "What career options exist after arts or commerce graduation?", a: "Both open management, analytics, law, finance, content, public policy and civil services routes. The narrowing usually comes from what a graduate has been told, not from what is available." },
      { q: "What are the career options after commerce graduation?", a: "Chartered accountancy and company secretaryship if not already begun, plus finance, analytics, consulting, banking, taxation and business roles. Career options after commerce graduation are unusually direct — several qualify you professionally without a further degree." },
      { q: "What are the career options after graduation in arts?", a: "Law, public policy, psychology, content, design, civil services, human resources and education. Good career options after arts graduation exist in quantity; the constraint is usually what a graduate has been told about their degree rather than what the market accepts." },
      { q: "What does career guidance after graduation add?", a: "It separates a capability problem from a market problem. Those feel identical from the inside and require completely different responses — one is addressed by training, the other by repositioning." },
    ],
    cta: { label: "Take the college career test", to: "/career-test/college", note: "Built for the graduate decision." },
  },
  {
    route: "/career-counselling/after-post-graduation",
    h1: "Career guidance after post graduation, when specialising has narrowed the field",
    dek: "A specialisation is leverage in one direction and a constraint in every other.",
    intro:
      "Career guidance after post graduation deals with a specific problem: two more years of study have narrowed the field, and the remaining options are fewer but higher-stakes. The question is no longer what you are capable of — it is whether the specialisation you chose matches the roles actually hiring, and what the honest routes are if it does not.",
    sections: [
      {
        h2: "What are the options after a postgraduate degree?",
        answer:
          "Usually three. Enter the specialisation directly, which is the intended route and the narrowest. Move to an adjacent field where the degree still counts for something. Or reposition entirely, using the degree as evidence of capability rather than as subject expertise. Each has a different cost and a different timeline.",
      },
      {
        h2: "What if my postgraduate specialisation is not hiring?",
        answer:
          "It is a common and recoverable position. The degree still demonstrates sustained analytical work, which transfers. The task is identifying which adjacent fields read it that way and what short additional qualification, if any, makes the move credible to a hiring manager.",
      },
      {
        h2: "Is further study worth it after post graduation?",
        answer:
          "Rarely, unless a specific role requires a specific credential. A third degree usually signals indecision rather than depth. Where a gap is real, a short professional qualification or demonstrable project work almost always costs less and moves faster.",
      },
    ],
    limits: {
      title: "What this stage cannot tell you",
      items: [
        "It cannot revalue a specialisation the market has moved away from.",
        "It cannot substitute for experience where a field requires it.",
        "It cannot tell you how long a repositioning will take — that depends on the market and on how much you can invest in the meantime.",
      ],
    },
    faq: [
      { q: "Is career guidance after post graduation different from after graduation?", a: "Yes. The field is narrower, the opportunity cost of a wrong move is higher, and the useful question shifts from 'what suits me' to 'what does my specialisation actually open, and what does it not'." },
      { q: "Can I switch fields after a postgraduate degree?", a: "Yes, and postgraduates switch more successfully than they expect, because the degree evidences capability even where it does not evidence subject fit." },
      { q: "What does an assessment add at this stage?", a: "It separates a mismatch of ability from a mismatch of market. Those look identical from the inside and call for completely different responses." },
      { q: "Is a career assessment aptitude test useful after a postgraduate degree?", a: "Yes, because a specialisation narrows options without confirming fit. A career assessment aptitude test at this stage establishes whether the difficulty is the field, the role or the market — a distinction that decides whether you retrain, reposition or simply apply differently." },
      { q: "What does career guidance after graduation in commerce or science look like at postgraduate level?", a: "The same instruments, a narrower field. Career guidance after graduation in commerce tends to surface finance, analytics and consulting routes; in science it surfaces research, industry R&D and data roles. In arts it surfaces policy, psychology and communication." },
      { q: "Is there a career guidance test after graduation worth taking?", a: "One that measures aptitude, interest and working style together is worth taking. One that asks you to pick your favourite subject and returns a job title is not measuring anything you did not already know." },
    ],
    cta: { label: "Take the college career test", to: "/career-test/college", note: "Aptitude, interest and fit, measured." },
  },
  {
    route: "/career-counselling/working-professionals",
    h1: "Career change counselling for working professionals",
    dek: "A switch is a sequencing problem before it is a courage problem.",
    intro:
      "A career change is the decision people postpone longest and research least. Career change counselling for working professionals treats it as two separate questions asked in order: whether your capability and interests actually point somewhere else, and whether your current circumstances — finances, family, location, timing — can support the move yet. Answering them in the wrong order is why most switches stall.",
    sections: [
      {
        h2: "How do I know if I should change careers?",
        answer:
          "Separate dissatisfaction with a role from dissatisfaction with a field. Most people who believe they need a new career need a different role, employer or manager within the same field — which is far cheaper to achieve. A structured assessment distinguishes the two before you resign.",
      },
      {
        h2: "Is it too late to change careers at 30 or 40?",
        answer:
          "Not on capability. The real constraints are financial runway, dependants and the length of the retraining, and those are arithmetic rather than age. Many switches are achievable in a lateral step that keeps income intact, which is usually a better plan than a clean break.",
      },
      {
        h2: "What does career counselling for working professionals involve?",
        answer:
          "Measurement of aptitude, interest and working style; a readiness read on whether your circumstances currently support a move; and a mapped sequence — the roles that are reachable from where you sit now, in what order, and what each step requires you to acquire first.",
      },
      {
        h2: "How do I explain a career change to employers?",
        answer:
          "As a decision with reasoning, not as an escape. A hiring manager is assessing risk: will this person leave again. A clear account of what you measured, what you concluded, and what you have already done to bridge the gap answers that question directly.",
      },
    ],
    limits: {
      title: "What this cannot do",
      items: [
        "It cannot create financial runway you do not have — but it can tell you how much you need before moving.",
        "It cannot shorten the retraining a regulated field requires.",
        "It cannot guarantee a role. It can substantially improve which roles you apply for and why.",
      ],
    },
    faq: [
      { q: "What is the best career change at 30 in India?", a: "The one your measured aptitude supports and your circumstances can currently fund. Those two filters remove most of a very long list, and what remains is usually adjacent to your existing field rather than distant from it." },
      { q: "Should I quit before finding the next thing?", a: "Rarely. A lateral move or a period of overlap preserves the runway that makes a considered switch possible. Resigning first converts a career decision into a cash-flow emergency." },
      { q: "How long does a career change take?", a: "Anywhere from a few months for an adjacent move to a couple of years where a formal qualification is required. Establishing which of those you are facing is most of the value of the assessment." },
      { q: "Do you offer career counselling for working professionals online?", a: "Yes. Sessions run online with trained counsellors, and the instruments and written report are identical to any other engagement." },
      { q: "Is a career change at 40 realistic?", a: "A career change at 40 is constrained by runway and dependants, not by capability. Career change in 40s most often succeeds as a lateral move that keeps income intact while the new skill is built, rather than as a clean break followed by retraining." },
      { q: "What is career transition counselling?", a: "Career transition counselling maps the sequence rather than the destination: which roles are reachable from your current position, in what order, and what each step requires you to acquire first. Mid-career change guidance is mostly sequencing work." },
      { q: "Should I consider a change of career or a change of employer?", a: "Test the cheaper hypothesis first. Most dissatisfaction attributed to a field turns out to be about a role, a manager or an organisation, and changing those costs a fraction of what changing careers does." },
    ],
    cta: { label: "Take the working professionals career test", to: "/career-test/working-professionals", note: "Readiness and fit, measured before you move." },
  },
  {
    route: "/vclp/students",
    h1: "A career development program for students, run across years rather than sessions",
    dek: "Guidance that stays with the decision instead of arriving once.",
    intro:
      "A career development program for students differs from a single assessment in one respect that matters: it continues. Interests shift, marks move, and the decision that looked settled in Class 9 often is not by Class 11. Long-term guidance revisits the evidence at each stage rather than treating one sitting as the whole answer.",
    sections: [
      {
        h2: "How is a programme different from a one-off assessment?",
        answer:
          "An assessment is a measurement at a moment. A programme re-measures as the student develops and adjusts the plan when the evidence changes. For a decision that unfolds across four or five school years, that difference is the difference between a snapshot and a record.",
      },
      {
        h2: "Who is a long-term student programme for?",
        answer:
          "Families making the decision early and deliberately, usually from Class 8 or 9, who would rather revisit a plan several times than commit to one reading of it. It suits students whose interests are still moving, which at that age is most of them.",
      },
    ],
    limits: {
      title: "Worth knowing before you enquire",
      items: [
        "Long-term programmes are application-based rather than an instant purchase, because they only work where the family intends to stay with them.",
        "They do not replace school. They sit alongside it and address the decision school does not cover.",
        "If you need one decision resolved quickly, a single assessment is the better and cheaper instrument.",
      ],
    },
    faq: [
      { q: "What is a career development program for students?", a: "Structured guidance that runs across school years rather than a single sitting: repeated measurement, a counsellor who knows the history, and a plan updated as the student changes." },
      { q: "When should a student join?", a: "Class 8 or 9 gives the most room, because the stream and degree decisions are both still ahead." },
      { q: "How do I find out what it costs?", a: "Long-term engagements are quoted after an initial conversation, since scope depends on how many years and decisions they cover. Start with the free readiness check and a conversation." },
      { q: "Is a career assessment aptitude test part of the programme?", a: "Yes. A career development training program is built on measurement rather than conversation, so aptitude, interest and personality instruments run at the start and are repeated as the student develops." },
      { q: "How does this relate to a stream selector test?", a: "A stream selector test answers one decision at one moment. A career guidance program for students carries that decision forward and revisits it, which matters because the stream choice is the first of several, not the last." },
    ],
    cta: { label: "See the programmes", to: "/pricing", note: "Long-term engagements, itemised." },
  },
  {
    route: "/vclp/graduates",
    h1: "A career development training program for graduates entering the market",
    dek: "The gap between qualified and employable, addressed deliberately.",
    intro:
      "A career development training program for graduates exists because a degree certifies knowledge and employers hire for something broader. Sustained guidance at this stage works on the difference: identifying which roles genuinely fit measured aptitude, and what has to be demonstrable before an application is credible in that field.",
    sections: [
      {
        h2: "What does a graduate programme address that a degree does not?",
        answer:
          "Direction and evidence. A degree establishes that you can learn a subject. It does not establish which roles suit you, how a specific field screens applicants, or what you need to have built before applying. Those are learnable and rarely taught.",
      },
      {
        h2: "Is this useful if I already have a job offer?",
        answer:
          "It can be. A first offer is often taken because it arrived, not because it fits. Establishing whether it points where you want to go is worth doing before two years pass and the switch becomes harder to explain.",
      },
    ],
    limits: {
      title: "Worth knowing before you enquire",
      items: [
        "It is guidance, not placement. We do not promise a role, and any programme that does should be read carefully.",
        "It cannot substitute for demonstrable work in fields that screen on portfolio.",
        "Long-term engagements are application-based rather than bought instantly.",
      ],
    },
    faq: [
      { q: "What is a career development training program?", a: "Sustained guidance combining assessment, a counsellor who tracks progress, and a plan for making a graduate credible in a specific field — rather than one session and a report." },
      { q: "Does it guarantee placement?", a: "No. It improves which roles you target and how well you can argue for them. Nobody honest guarantees a hire." },
      { q: "How is it different from the assessment alone?", a: "The assessment establishes fit. The programme stays through acting on it, which is where most graduates lose momentum." },
      { q: "Does the programme include a career assessment aptitude test?", a: "Yes. Career guidance after graduation begins with measurement — aptitude, interest and working style — because a graduate's constraint is usually direction rather than ability, and the two are easy to confuse from the inside." },
      { q: "How is this different from a career development program for students?", a: "The constraints are concrete rather than developmental: a degree already earned, a market actively hiring or not, and financial pressure. The work is narrower and more immediate." },
    ],
    cta: { label: "Take the college career test", to: "/career-test/college", note: "Start with the measurement." },
  },
  {
    route: "/vclp/professionals",
    h1: "An employee career development program for working professionals and teams",
    dek: "Career clarity, delivered to people already in the work.",
    intro:
      "An employee career development program applies the same instruments used with individuals to people already in employment — either professionals investing in their own direction, or organisations investing in their teams. The output is the same: measured aptitude and interest, an honest read on circumstances, and a route that fits the person rather than the org chart.",
    sections: [
      {
        h2: "What does an employee career development program cover?",
        answer:
          "Assessment of aptitude, interest and working style; a readiness read on whether circumstances support a move or a stretch; and a mapped sequence of roles reachable from the person's current position, with what each step requires.",
      },
      {
        h2: "Why would an organisation run this for its teams?",
        answer:
          "Because most attrition is a fit problem discovered late. Establishing where someone's measured strengths actually sit tends to surface internal moves that retain people, which is materially cheaper than replacing them.",
      },
    ],
    limits: {
      title: "Worth knowing before you enquire",
      items: [
        "It measures the individual. It does not diagnose an organisation's structure or management.",
        "Results belong to the person assessed; how much is shared with an employer is agreed in advance.",
        "Team engagements are scoped and quoted rather than bought off a page.",
      ],
    },
    faq: [
      { q: "What is an employee career development program?", a: "Structured career guidance delivered to people in employment — individually or across a team — combining psychometric assessment with counselling and a concrete route." },
      { q: "Can my employer see my results?", a: "Only what is agreed before the engagement begins. The default is that results belong to the person assessed." },
      { q: "How do organisations start?", a: "With a conversation about scope. Team engagements are quoted rather than listed, because they vary widely in size and depth." },
      { q: "How does this differ from career counselling for working professionals?", a: "Career counselling for working professionals is an individual engagement. A career development program for employees runs the same instruments across a team, with results belonging to each person and only agreed summaries shared." },
      { q: "Is a career assessment aptitude test included?", a: "Yes. A career development training program is built on measured aptitude, interest and working style rather than on a conversation about ambitions, because the second tends to reproduce whatever the person already believed." },
    ],
    cta: { label: "Take the working professionals career test", to: "/career-test/working-professionals", note: "The individual instrument, free to start." },
  },
]

export const kwCopyFor = (route: string): KwCopy | undefined =>
  KW_COPY.find((p) => p.route === route)
