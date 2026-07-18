// Content for the interactive product demos (Session 3). Shapes match the
// content-workflow schemas; the market figures are upgraded with web-verified
// sources from that workflow. Mock report/chat are illustrative by design.

export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C"

export interface TestQuestion {
  prompt: string
  a: { label: string; type: RiasecType }
  b: { label: string; type: RiasecType }
}
export interface TestResult { type: RiasecType; name: string; blurb: string; careers: string[] }
export interface ReportMock {
  student: { name: string; grade: string; line: string }
  summary: string
  strengths: { label: string; score: number }[]
  matches: { title: string; fit: number; why: string }[]
  prediction: string
}
export interface ChatScript { chips: string[]; turns: { role: "user" | "ai"; text: string }[] }
export interface MarketPoint { label: string; metric: string; value: number; unit: string; source: string }

export interface DemoContent {
  test: { questions: TestQuestion[]; results: TestResult[] }
  report: ReportMock
  chat: ChatScript
  market: MarketPoint[]
}

export const DEMOS: DemoContent = {
  test: {
    questions: [
      { prompt: "A free afternoon. Where do you go?", a: { label: "Repair a bike engine in the garage", type: "R" }, b: { label: "Trace why an experiment gave odd readings", type: "I" } },
      { prompt: "Your college fest needs a hand. You pick:", a: { label: "Design the stage backdrop and posters", type: "A" }, b: { label: "Run the help desk for lost first-years", type: "S" } },
      { prompt: "A new club is forming. You volunteer to:", a: { label: "Pitch sponsors and rally the team", type: "E" }, b: { label: "Keep the accounts and register clean", type: "C" } },
      { prompt: "A weekend project tempts you more if it is:", a: { label: "Working out the maths behind a puzzle", type: "I" }, b: { label: "Building a working model by hand", type: "R" } },
      { prompt: "A start-up offers you one role:", a: { label: "Mentor interns through their first month", type: "S" }, b: { label: "Close the big client deal yourself", type: "E" } },
      { prompt: "Given a messy shared folder, you would rather:", a: { label: "Sort every file into a clean system", type: "C" }, b: { label: "Turn the contents into a short film", type: "A" } },
    ],
    results: [
      { type: "R", name: "Realistic", blurb: "Drawn to hands-on, physical work with tools, machines and tangible results over abstract talk.", careers: ["Mechanical engineer", "Civil site supervisor", "Commercial pilot"] },
      { type: "I", name: "Investigative", blurb: "Drawn to analysing problems, testing ideas, and understanding how and why things work.", careers: ["Data scientist", "Medical researcher", "Forensic analyst"] },
      { type: "A", name: "Artistic", blurb: "Drawn to self-expression and original design — work without rigid rules or fixed answers.", careers: ["UX designer", "Architect", "Film editor"] },
      { type: "S", name: "Social", blurb: "Drawn to helping, teaching and guiding people, and to work built on human connection.", careers: ["Clinical psychologist", "Schoolteacher", "Public health worker"] },
      { type: "E", name: "Enterprising", blurb: "Drawn to leading, persuading and building ventures — comfortable with risk and ambition.", careers: ["Startup founder", "Investment banker", "Civil services officer"] },
      { type: "C", name: "Conventional", blurb: "Drawn to order, accuracy and systems — to work with clear structure and records.", careers: ["Chartered accountant", "Company secretary", "Data analyst"] },
    ],
  },
  report: {
    student: { name: "Ananya Iyer", grade: "Class 12 · Science (PCM)", line: "Pune student weighing JEE-track engineering against design, unsure her quiet temperament fits either." },
    summary: "Ananya combines strong analytical reasoning with unusually high spatial ability — a profile that favours building and structuring over front-facing roles. Her interests lean Investigative and Realistic, pointing toward applied technical work rather than the management track her marks alone might suggest.",
    strengths: [
      { label: "Analytical Reasoning", score: 88 },
      { label: "Spatial Visualisation", score: 84 },
      { label: "Conscientiousness", score: 79 },
      { label: "Verbal Reasoning", score: 68 },
      { label: "Social Orientation", score: 52 },
    ],
    matches: [
      { title: "Architecture / Built-Environment Design", fit: 89, why: "High spatial reasoning and conscientiousness map cleanly to structured, visual design work." },
      { title: "Mechanical / Aerospace Engineering", fit: 81, why: "Strong analytical and spatial scores fit systems thinking and physical-design problems." },
      { title: "Data Science / Quantitative Analysis", fit: 71, why: "Analytical strength suits it; lower verbal orientation makes communication-heavy roles less natural." },
    ],
    prediction: "Within five years she is likely to move from a technical foundation into a design-and-build specialist role, where measured, detail-led work compounds faster than visible leadership.",
  },
  chat: {
    chips: ["Which careers fit my interests?", "Is BSc Psychology worth it in India?", "What else can I do with PCM?"],
    turns: [
      { role: "user", text: "Class 12, Science with PCM here. I keep flip-flopping between computer science engineering and a BSc in psychology. I like both, and it's making me anxious." },
      { role: "ai", text: "That flip-flopping usually means both paths touch something real in you, not that you're indecisive. Your assessment shows high Investigative interests with a Realistic streak, and high Openness with moderate Conscientiousness. Both fields fit that profile — so this is a values question, not an aptitude one." },
      { role: "user", text: "A values question? I assumed I'd just pick whichever I'm better at." },
      { role: "ai", text: "Your scores are close enough that “better at” won't separate them — abstract and verbal reasoning both sat in your top band. So the deciding factor is what you want your days made of: building systems and debugging logic, or understanding people and sitting with ambiguity. That's yours to judge, not the test's." },
      { role: "user", text: "I think I prefer understanding people. But everyone says CS is the safe choice for jobs and money." },
      { role: "ai", text: "In the Indian market that's partly true and partly outdated. CS still has deeper entry-level hiring, but psychology has widened into UX research, HR analytics and clinical work — usually after a master's. Its strong outcomes lean on postgraduate study, so it's a longer runway, not a closed door. Would you be open to a route like UX research, where a CS base meets applied psychology and earns earlier?" },
    ],
  },
  market: [
    { label: "Big Data Specialists", metric: "fastest-growing job worldwide, 2025–2030", value: 113, unit: "%", source: "WEF Future of Jobs, 2025" },
    { label: "FinTech Engineers", metric: "2nd fastest-growing job worldwide", value: 93, unit: "%", source: "WEF Future of Jobs, 2025" },
    { label: "AI & Machine Learning Specialists", metric: "projected role growth worldwide", value: 82, unit: "%", source: "WEF Future of Jobs, 2025" },
    { label: "Wind Turbine Technicians", metric: "fastest-growing US occupation, 2023–2033", value: 60, unit: "%", source: "US BLS, 2024" },
    { label: "Solar PV Installers", metric: "2nd fastest-growing US occupation", value: 48, unit: "%", source: "US BLS, 2024" },
    { label: "Nurse Practitioners", metric: "fastest-growing US healthcare role", value: 46, unit: "%", source: "US BLS, 2024" },
    { label: "Data Scientists", metric: "fastest-growing US math occupation", value: 36, unit: "%", source: "US BLS, 2024" },
    { label: "Information Security Analysts", metric: "fastest-growing US computer occupation", value: 33, unit: "%", source: "US BLS, 2024" },
    { label: "Global Net-New Jobs", metric: "net gain by 2030 (170M created − 92M displaced)", value: 78, unit: "M jobs", source: "WEF Future of Jobs, 2025" },
    { label: "India AI & Data Talent", metric: "projected demand by 2026", value: 1, unit: "M+ jobs", source: "NASSCOM, 2023" },
  ],
}
