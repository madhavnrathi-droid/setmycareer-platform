// Real, answer-first career Q&A — grounded in the SMC method and the articles.
// Mirrored verbatim as FAQPage JSON-LD in index.html so answer engines (and AI
// assistants) can quote it even without executing JS. Keep the two in sync.

export interface Qa { q: string; a: string }

export const FAQ: Qa[] = [
  {
    q: "When should a student take a career assessment?",
    a: "The two natural decision points are after Class 10, when you choose a stream, and after Class 12, when you choose a degree and field. An assessment is most useful slightly before each — around Class 9–10 and Class 11–12 — while options are still open. Professionals weighing a switch benefit at any stage. The goal is to decide on evidence about your own aptitudes and interests rather than under last-minute pressure.",
  },
  {
    q: "Is career counselling worth it in India?",
    a: "For most families, yes — the gap is real and the economics are stark. Over 90% of Indian schools have no dedicated career counsellor, and the national counsellor-to-student ratio is roughly 1:3,000 against a recommended 1:250, so most students choose a stream or degree with almost no structured guidance. Yet families routinely spend ₹1–4 lakh on coaching and ₹10–40 lakh on a degree. Career counselling is the diligence before that spend: a few thousand rupees and a few weeks to replace hearsay with measured aptitude, interest and personality data, and to narrow a wide field to the few options that genuinely fit. It is the smallest line in the ledger, and the one that decides whether the rest was worth it.",
  },
  {
    q: "What is the difference between aptitude, interest and personality tests?",
    a: "Aptitude measures what you can do well with effort — reasoning abilities such as verbal, numerical and spatial. Interest measures what you are drawn to, often along the RIASEC model. Personality describes how you tend to operate, often along the Big Five. They answer different questions, and a sound recommendation looks for where strong aptitude, real interest and a fitting temperament overlap.",
  },
  {
    q: "How do I choose a stream after Class 10?",
    a: "Weigh three inputs in order: aptitude first, where steady effort compounds fastest; then interest, what holds your attention unprompted; then opportunity, the job market and your constraints. Avoid two myths — that science is the 'safe' superset, since carrying subjects you have no aptitude for has a real cost, and that commerce and arts are fallbacks, since both lead to strong professions. Almost nothing here is permanent: decide carefully, then hold the decision lightly.",
  },
  {
    q: "Can AI replace a career counsellor?",
    a: "It can replace parts of the work, not the whole. AI is well suited to scoring assessments consistently and retrieving the full breadth of pathways. It is structurally unsuited to interpreting a score in the context of a person's circumstances, or to the conversation about what someone is willing to give up for a path. The right design is the machine doing the measuring so the human is free to do the judgement.",
  },
  {
    q: "How much does career counselling cost at SetMyCareer?",
    a: "It scales with depth. The Career Clarity Index is free; focused tools such as the Stream Selector and Job Domain Selector are priced in the low thousands of rupees; full counselling — assessments plus sessions with an expert and a written report — is quoted to the engagement. You can begin with a free check and a conversation before committing to anything.",
  },
  {
    q: "What is the SetMyCareer method?",
    a: "Five steps. Assess, using validated aptitude, interest and personality instruments. Interpret, where a trained counsellor reads the scores as a pattern. Map, translating that into specific streams, courses and fields. Decide, weighing each option against admission odds, return on investment and fit. And Support, staying with you through admissions and the questions that follow. The science has been refined over fifteen years; the technology makes it faster and available the moment you need it.",
  },
  {
    q: "Engineering or medicine — how should I decide?",
    a: "Start before the binary. After Class 12 the real map is far wider than two exams — pure sciences, design, law, economics, psychology, data and more — and the binary usually reflects what the people around you happened to know, not what fits you. Read your own aptitudes and interests first, then test each option against the daily work it actually leads to, not its image.",
  },
]
