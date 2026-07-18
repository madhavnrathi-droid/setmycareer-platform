// The career "instruments" behind the Career Terminal. Each career is treated
// like a tradable position: an outlook signal, a demand trend, a pay trajectory,
// and an AI-exposure ("volatility") read. Macro signals are grounded in named
// sources; India pay figures are INDICATIVE LPA ranges (2024-25) — see METHOD.
//
// Data researched + verified by the career-dataset-research workflow (15 careers,
// grounded in WEF Future of Jobs 2025, US BLS 2024-34, NASSCOM 2024, India Skills
// Report 2024). The shape is stable so the UI never changes when the data grows.

export type Outlook = "Expanding" | "Stable" | "Cooling"
export type AiExposure = "Low" | "Moderate" | "High"
// the overall verdict on a career's demand path — drives the terminal's colour:
// up = growth (purple), down = decline (red), flat = stagnant (blue).
export type Trajectory = "up" | "down" | "flat"

// every demandTrend is an annual demand-index series (0-100) running this many
// years, so the line shows "from the start of the field to now" incl. real
// inflections (COVID 2020-21, the 2022-24 tech correction, the 2023+ GenAI shock).
export const DEMAND_START_YEAR = 2015
export const DEMAND_END_YEAR = 2025

export interface CareerStage { label: string; years: string; payLo: number; payHi: number; shift: string }
export interface Career {
  id: string
  ticker: string
  name: string
  cluster: string
  oneLine: string
  outlook: Outlook
  trajectory: Trajectory
  growthNote: string
  demandTrend: number[]
  aiExposure: AiExposure
  aiNote: string
  payEntry: [number, number]
  payMid: [number, number]
  paySenior: [number, number]
  skills: string[]
  education: string[]
  related: string[]
  stages: CareerStage[]
}

export const METHOD =
  "Indicative Indian pay ranges (LPA, 2024-25) from public salary references; macro signals from WEF Future of Jobs 2025, US BLS 2024, NASSCOM and the India Skills Report 2024. Directional, not a quote."

export const MACRO: { label: string; value: string; unit: string; source: string }[] = [
  { label: "New jobs created globally by 2030", value: "170", unit: "M", source: "WEF Future of Jobs 2025" },
  { label: "Core job skills disrupted by 2030", value: "39", unit: "%", source: "WEF Future of Jobs 2025" },
  { label: "India tech-industry workforce", value: "5.43", unit: "M", source: "NASSCOM 2024" },
  { label: "Indian youth assessed employable", value: "54.8", unit: "%", source: "India Skills Report 2025" },
]

export const CAREERS: Career[] = [
  {
    id: "data-scientist", ticker: "DSCI", name: "Data Scientist", cluster: "Technology & Data",
    oneLine: "Turns messy data into models and decisions using statistics, ML, and business context",
    outlook: "Expanding", trajectory: "up", growthNote: "BLS projects data-scientist jobs +36% for 2023-33, among the fastest of all occupations",
    demandTrend: [40, 45, 51, 57, 62, 60, 66, 74, 80, 87, 93], aiExposure: "Moderate", aiNote: "Tailwind: GenAI automates rote analysis but raises demand for those who build and judge models",
    payEntry: [5, 10], payMid: [12, 22], paySenior: [24, 42],
    skills: ["Python/SQL", "Statistics & ML", "Data visualization", "Experiment design", "Business communication", "Cloud data tools"],
    education: ["B.Tech/B.Sc in CS, Stats or Math", "M.Sc/M.Tech Data Science", "IIT/IISc analytics programs", "Certs: Google/AWS ML, upGrad/Scaler"],
    related: ["AI/ML Engineer", "Data Engineer", "Analytics Manager", "Quant Analyst", "Product Analyst"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 5, payHi: 10, shift: "Cleans data, builds basic models under supervision" },
      { label: "Mid", years: "3-6 yrs", payLo: 12, payHi: 22, shift: "Owns end-to-end models and stakeholder problems" },
      { label: "Senior", years: "7-10 yrs", payLo: 24, payHi: 42, shift: "Sets modelling strategy, mentors, drives impact" },
      { label: "Lead", years: "10+ yrs", payLo: 38, payHi: 65, shift: "Leads DS org, ties data science to P&L" },
    ],
  },
  {
    id: "ai-ml-engineer", ticker: "MLEN", name: "AI/ML Engineer", cluster: "Technology & Data",
    oneLine: "Builds, deploys, and scales machine-learning and GenAI systems into production",
    outlook: "Expanding", trajectory: "up", growthNote: "Naukri JobSpeak logged +46% YoY growth for ML-engineer roles (2024); a top-3 fastest-growing role globally (WEF 2025)",
    demandTrend: [30, 34, 39, 45, 51, 50, 58, 72, 84, 92, 100], aiExposure: "Low", aiNote: "Strong tailwind: the role exists to build the AI wave, not be displaced by it",
    payEntry: [6, 12], payMid: [14, 28], paySenior: [28, 55],
    skills: ["Python & ML frameworks", "MLOps & deployment", "Cloud (AWS/GCP/Azure)", "LLMs & GenAI", "Data pipelines", "System design"],
    education: ["B.Tech CS/AI/ECE", "M.Tech/M.S in ML or AI", "IIT/IIIT AI programs", "Certs: TensorFlow, AWS ML, DeepLearning.AI"],
    related: ["Data Scientist", "MLOps Engineer", "Data Engineer", "AI Research Scientist", "Backend Engineer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 6, payHi: 12, shift: "Implements models and pipelines from specs" },
      { label: "Mid", years: "3-6 yrs", payLo: 14, payHi: 28, shift: "Owns production ML systems and MLOps" },
      { label: "Senior", years: "7-10 yrs", payLo: 28, payHi: 55, shift: "Architects AI platforms, sets ML standards" },
      { label: "Lead", years: "10+ yrs", payLo: 48, payHi: 85, shift: "Leads AI eng org, owns model and product strategy" },
    ],
  },
  {
    id: "cybersecurity-analyst", ticker: "CSEC", name: "Cybersecurity Analyst", cluster: "Technology & Data",
    oneLine: "Defends systems and data by monitoring threats, hunting attacks, and hardening defenses",
    outlook: "Expanding", trajectory: "up", growthNote: "BLS projects information-security analysts +33% for 2023-33; India's workforce gap runs into hundreds of thousands (NASSCOM/DSCI 2024)",
    demandTrend: [42, 47, 52, 57, 62, 64, 69, 74, 79, 85, 90], aiExposure: "Low", aiNote: "Tailwind: AI adds new attack surfaces and defense tooling, deepening demand for skilled analysts",
    payEntry: [4, 9], payMid: [11, 20], paySenior: [24, 42],
    skills: ["Network & OS security", "SIEM & threat monitoring", "Incident response", "Vulnerability assessment", "Cloud security", "Scripting (Python/Bash)"],
    education: ["B.Tech CS/IT or B.Sc CS", "Certs: CompTIA Security+, CEH", "OSCP / CISSP (advanced)", "M.Tech/PG Diploma in Cyber Security"],
    related: ["Penetration Tester", "Security Engineer", "SOC Analyst", "Cloud Security Engineer", "GRC Analyst"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 4, payHi: 9, shift: "Monitors alerts in SOC, triages incidents" },
      { label: "Mid", years: "3-6 yrs", payLo: 11, payHi: 20, shift: "Runs incident response, threat hunting" },
      { label: "Senior", years: "7-10 yrs", payLo: 24, payHi: 42, shift: "Designs security architecture, leads response" },
      { label: "Lead", years: "10+ yrs", payLo: 38, payHi: 65, shift: "Heads security function, sets risk strategy" },
    ],
  },
  {
    id: "chartered-accountant", ticker: "CA", name: "Chartered Accountant", cluster: "Business & Finance",
    oneLine: "Audits accounts, files tax, ensures compliance and advises businesses on financial health.",
    outlook: "Stable", trajectory: "flat", growthNote: "Accountants/auditors projected ~+5% 2024-34 (US BLS), about the all-occupation average; durable statutory demand",
    demandTrend: [55, 56, 57, 58, 58, 55, 57, 59, 58, 59, 60], aiExposure: "Moderate", aiNote: "Headwind on routine bookkeeping/reconciliation; tailwind for CAs who move up to advisory and analysis",
    payEntry: [6, 10], payMid: [11, 18], paySenior: [20, 40],
    skills: ["Financial reporting", "Auditing", "Direct & indirect tax", "IFRS/Ind AS", "Excel & ERP (SAP/Tally)", "Regulatory compliance"],
    education: ["ICAI CA (Foundation-Inter-Final + articleship)", "B.Com alongside CA", "Post-qual: CFA / DISA / CPA", "Big 4 articleship route"],
    related: ["Financial Analyst", "Internal Auditor", "Investment Banking Analyst", "CFO / Finance Controller", "Tax Consultant"],
    stages: [
      { label: "Entry", years: "0-2", payLo: 6, payHi: 10, shift: "Newly qualified; executes audit/tax under supervision" },
      { label: "Mid", years: "3-6", payLo: 11, payHi: 18, shift: "Owns engagements, manages juniors, client-facing" },
      { label: "Senior", years: "7-12", payLo: 20, payHi: 40, shift: "Finance Manager/Controller; strategy over compliance" },
      { label: "Lead", years: "12+", payLo: 40, payHi: 90, shift: "CFO or firm Partner; owns P&L and firm direction" },
    ],
  },
  {
    id: "investment-banking-analyst", ticker: "IBA", name: "Investment Banking Analyst", cluster: "Business & Finance",
    oneLine: "Builds financial models and pitchbooks for M&A, IPOs and capital-raising deals.",
    outlook: "Stable", trajectory: "flat", growthNote: "Securities/financial-services roles ~+3% 2024-34 (US BLS); a 2021 deal boom, then GenAI compressing junior-analyst headcount",
    demandTrend: [54, 56, 57, 58, 59, 55, 61, 58, 54, 55, 56], aiExposure: "Moderate", aiNote: "Headwind: GenAI automates model/deck grunt work; tailwind for judgment, relationships, deal execution",
    payEntry: [12, 22], payMid: [24, 45], paySenior: [55, 110],
    skills: ["Financial modelling", "Valuation (DCF/comps)", "M&A & capital markets", "Advanced Excel & PowerPoint", "Accounting analysis", "Client/deal communication"],
    education: ["MBA (Finance) from top B-school", "CA + finance specialisation", "CFA charter", "B.Com/BBA + analyst training"],
    related: ["Chartered Accountant", "Private Equity Associate", "Equity Research Analyst", "Corporate Development", "Venture Capital Analyst"],
    stages: [
      { label: "Entry", years: "0-3", payLo: 12, payHi: 22, shift: "Analyst; models, decks, data rooms, long hours" },
      { label: "Mid", years: "3-6", payLo: 24, payHi: 45, shift: "Associate; owns deal workstreams, manages analysts" },
      { label: "Senior", years: "6-12", payLo: 55, payHi: 110, shift: "VP; runs deal execution and client relationships" },
      { label: "Lead", years: "12+", payLo: 110, payHi: 250, shift: "MD; originates deals, owns revenue and clients" },
    ],
  },
  {
    id: "product-manager", ticker: "PM", name: "Product Manager", cluster: "Business & Finance",
    oneLine: "Owns what a product does and why: sets strategy, prioritises, aligns eng, design and business.",
    outlook: "Expanding", trajectory: "up", growthNote: "A strong run to a 2022 peak, a 2023 tech-correction dip, then recovery; AI-product PMs are among the hottest 2025 roles (WEF 2025)",
    demandTrend: [45, 51, 57, 63, 68, 66, 74, 78, 66, 70, 79], aiExposure: "Moderate", aiNote: "Tailwind: AI copilots speed specs/research; AI-product PMs are among the hottest 2025 roles",
    payEntry: [10, 18], payMid: [18, 35], paySenior: [32, 60],
    skills: ["Product strategy & roadmapping", "User research & discovery", "Data analysis / metrics", "Stakeholder management", "Prioritisation & specs", "Basic tech/UX fluency"],
    education: ["Engineering/CS degree + PM path", "MBA (product/tech)", "APM programmes (Google/Flipkart/etc.)", "PM bootcamps & certifications"],
    related: ["Product Marketing Manager", "Business Analyst", "UX Designer", "Program Manager", "Growth Manager"],
    stages: [
      { label: "Entry", years: "0-2", payLo: 10, payHi: 18, shift: "APM; owns features under a senior PM's roadmap" },
      { label: "Mid", years: "3-5", payLo: 18, payHi: 35, shift: "PM; owns a product area end-to-end" },
      { label: "Senior", years: "5-8", payLo: 32, payHi: 60, shift: "Senior PM; sets strategy, mentors, drives metrics" },
      { label: "Lead", years: "8+", payLo: 55, payHi: 120, shift: "Group PM/Director; owns portfolio and PM team" },
    ],
  },
  {
    id: "clinical-psychologist", ticker: "CLPSY", name: "Clinical Psychologist", cluster: "Healthcare & Life Sciences",
    oneLine: "Assesses, diagnoses and treats mental-health and behavioural conditions through therapy and testing.",
    outlook: "Expanding", trajectory: "up", growthNote: "A clear COVID 2020-21 mental-health demand spike that never receded; BLS sees mental-health employment growing ~3x the all-jobs rate",
    demandTrend: [40, 43, 46, 49, 52, 60, 68, 71, 74, 78, 82], aiExposure: "Low", aiNote: "Tailwind: AI triage/screening tools augment intake, but clinical judgment and therapeutic rapport stay human.",
    payEntry: [3, 5], payMid: [6, 12], paySenior: [12, 24],
    skills: ["Psychodiagnostic assessment", "CBT / psychotherapy", "Case formulation", "Clinical interviewing", "Psychometric testing", "Ethics & confidentiality"],
    education: ["BA/BSc Psychology + MA/MSc Clinical Psychology", "MPhil in Clinical Psychology (RCI-recognised, licensure route)", "PsyD / PhD for senior practice"],
    related: ["Counselling Psychologist", "Psychiatrist", "Neuropsychologist", "Rehabilitation Psychologist", "Organizational Psychologist"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 5, shift: "Supervised assessments & therapy under a licensed clinician" },
      { label: "Mid", years: "3-7 yrs", payLo: 6, payHi: 12, shift: "Independent caseload; specializes (child, trauma, neuro)" },
      { label: "Senior", years: "8-14 yrs", payLo: 12, payHi: 22, shift: "Runs private practice or leads a hospital unit" },
      { label: "Lead", years: "15+ yrs", payLo: 20, payHi: 28, shift: "Clinical director; trains, supervises, sets protocols" },
    ],
  },
  {
    id: "physiotherapist", ticker: "PHYSIO", name: "Physiotherapist", cluster: "Healthcare & Life Sciences",
    oneLine: "Restores movement and function through exercise, manual therapy and rehab after injury or illness.",
    outlook: "Expanding", trajectory: "up", growthNote: "Physical therapists projected +11% 2024-34, much faster than average (US BLS); a 2020 elective-care dip, then an ageing-driven rebound",
    demandTrend: [46, 49, 52, 55, 58, 55, 61, 65, 69, 73, 77], aiExposure: "Low", aiNote: "Tailwind: wearables and motion-analysis apps aid tracking; hands-on manual therapy resists automation.",
    payEntry: [2.5, 4], payMid: [4, 7], paySenior: [8, 14],
    skills: ["Manual therapy", "Exercise prescription", "Musculoskeletal assessment", "Neuro & sports rehab", "Electrotherapy modalities", "Patient education"],
    education: ["BPT (Bachelor of Physiotherapy, 4.5 yrs)", "MPT (specialization: ortho/neuro/sports/cardio)", "Sports/manual-therapy certifications (MFR, dry needling)"],
    related: ["Occupational Therapist", "Sports Rehabilitation Specialist", "Athletic Trainer", "Rehabilitation Counsellor", "Chiropractor"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 2.5, payHi: 4, shift: "OPD/ward rotations; builds hands-on clinical hours" },
      { label: "Mid", years: "3-6 yrs", payLo: 4, payHi: 7, shift: "Specialises; owns caseload, some referral base" },
      { label: "Senior", years: "7-12 yrs", payLo: 8, payHi: 12, shift: "Runs own clinic or heads a hospital rehab team" },
      { label: "Lead", years: "13+ yrs", payLo: 11, payHi: 14, shift: "Chain-clinic owner or academic/HOD; scales practice" },
    ],
  },
  {
    id: "biotech-research-associate", ticker: "BTRA", name: "Biotech Research Associate", cluster: "Healthcare & Life Sciences",
    oneLine: "Runs lab experiments, assays and analysis to support drug, diagnostics and bioprocess R&D.",
    outlook: "Expanding", trajectory: "up", growthNote: "A COVID-era vaccine/R&D bump, a mild 2022 funding cooldown, then resumed growth; India's bioeconomy reached ~$151bn in 2024 (DBT/BIRAC 2024)",
    demandTrend: [43, 47, 50, 54, 57, 62, 68, 66, 68, 73, 78], aiExposure: "Moderate", aiNote: "Mixed: Bio-AI and lab automation speed screening (headwind on rote pipetting) but raise value of AI-fluent RAs.",
    payEntry: [3, 6], payMid: [6, 12], paySenior: [12, 18],
    skills: ["Molecular biology (PCR, cloning)", "Cell culture", "Assay development", "Data analysis / bioinformatics", "GLP/GMP documentation", "Chromatography & spectrometry"],
    education: ["BSc/BTech Biotechnology or Life Sciences", "MSc/MTech Biotech, Microbiology or Biochemistry", "PhD for senior scientist track"],
    related: ["Clinical Research Associate", "Bioinformatics Analyst", "Quality Control Analyst", "Bioprocess Engineer", "Medical Science Liaison"],
    stages: [
      { label: "Entry", years: "0-3 yrs", payLo: 3, payHi: 6, shift: "Executes protocols; logs and cleans experimental data" },
      { label: "Mid", years: "4-8 yrs", payLo: 6, payHi: 12, shift: "Designs assays; owns a project workstream" },
      { label: "Senior", years: "9-13 yrs", payLo: 12, payHi: 16, shift: "Leads studies; mentors juniors, liaises with sponsors" },
      { label: "Lead", years: "14+ yrs", payLo: 15, payHi: 18, shift: "Sets research direction; manages lab & budgets" },
    ],
  },
  {
    id: "ux-designer", ticker: "UXD", name: "UX Designer", cluster: "Design & Media",
    oneLine: "Shapes how digital products feel and flow through research, wireframes, and testing",
    outlook: "Expanding", trajectory: "up", growthNote: "Peaked in 2022, took a sharp 2023 design-layoff trough, and is recovering; still among the top-10 fastest-growing roles to 2030 (WEF 2025)",
    demandTrend: [44, 50, 56, 62, 67, 66, 73, 76, 61, 65, 72], aiExposure: "Moderate", aiNote: "Tailwind: AI speeds mockups and research synthesis, but human judgment on flows and users still leads",
    payEntry: [3, 6], payMid: [8, 15], paySenior: [18, 32],
    skills: ["User research", "Figma / prototyping", "Interaction design", "Usability testing", "Design systems", "Information architecture"],
    education: ["B.Des / M.Des (NID, MIT-ID, Srishti)", "Google UX Design certificate", "Any degree + UX bootcamp (DesignBoat, IDF)", "Self-taught portfolio route"],
    related: ["Product Designer", "UI Designer", "UX Researcher", "Product Manager", "Content / Brand Strategist"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 6, shift: "Execute wireframes and flows under a senior's direction" },
      { label: "Mid", years: "2-5 yrs", payLo: 8, payHi: 15, shift: "Own features end-to-end and run your own research" },
      { label: "Senior", years: "5-9 yrs", payLo: 18, payHi: 32, shift: "Set product direction and mentor; drive design strategy" },
      { label: "Lead", years: "9+ yrs", payLo: 30, payHi: 45, shift: "Head design org, own vision and hiring across teams" },
    ],
  },
  {
    id: "content-brand-strategist", ticker: "CBST", name: "Content / Brand Strategist", cluster: "Design & Media",
    oneLine: "Owns the big idea, voice, and content roadmap that make a brand recognizable",
    outlook: "Stable", trajectory: "flat", growthNote: "Strategy work holds its value while GenAI erodes commodity content from 2023 — the role plateaus rather than grows (WEF 2025)",
    demandTrend: [48, 50, 52, 54, 55, 53, 57, 58, 55, 54, 55], aiExposure: "Moderate", aiNote: "Tailwind for strategy (AI drafts, human directs); headwind for commodity copywriting that AI now automates",
    payEntry: [3, 5], payMid: [7, 14], paySenior: [15, 28],
    skills: ["Brand positioning", "Content strategy", "Storytelling / copy", "SEO & analytics", "Campaign planning", "Audience research"],
    education: ["Any bachelor's (mass comm, English, marketing)", "MBA / PG in marketing or communication", "Digital marketing / content certifications", "Portfolio + agency experience route"],
    related: ["Marketing Manager", "Copywriter", "Social Media Manager", "UX Writer", "Product Marketer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 5, shift: "Produce content and support strategy set by seniors" },
      { label: "Mid", years: "2-5 yrs", payLo: 7, payHi: 14, shift: "Own a brand's content calendar and voice guidelines" },
      { label: "Senior", years: "5-9 yrs", payLo: 15, payHi: 25, shift: "Set positioning and campaign strategy across channels" },
      { label: "Lead", years: "9+ yrs", payLo: 25, payHi: 40, shift: "Head of brand/content; owns narrative and team P&L" },
    ],
  },
  {
    id: "filmmaker-video-editor", ticker: "FVED", name: "Filmmaker / Video Editor", cluster: "Design & Media",
    oneLine: "Shoots and cuts footage into films, ads, and social video that hold attention",
    outlook: "Cooling", trajectory: "down", growthNote: "Commodity video/edit gigs are contracting as AI auto-editing tools spread post-2023, after a COVID halt and a content-boom rebound (freelance-demand study 2024)",
    demandTrend: [52, 55, 57, 59, 60, 54, 61, 60, 52, 47, 43], aiExposure: "High", aiNote: "Headwind: AI auto-cuts, captions, and rough edits commoditize basic work; craft and storytelling stay human",
    payEntry: [2.5, 5], payMid: [5, 10], paySenior: [10, 18],
    skills: ["Premiere Pro / DaVinci Resolve", "Storytelling & pacing", "Color grading", "Motion graphics", "Sound editing", "Cinematography"],
    education: ["Film school (FTII, SRFTI, Whistling Woods)", "B.A. / diploma in film or mass comm", "Editing software certifications", "Self-taught + freelance portfolio route"],
    related: ["Motion Graphics Designer", "Cinematographer", "Content Creator / YouTuber", "VFX Artist", "Video Producer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 2.5, payHi: 5, shift: "Assist edits and cut short-form under supervision" },
      { label: "Mid", years: "2-5 yrs", payLo: 5, payHi: 10, shift: "Own full edits and shape story from raw footage" },
      { label: "Senior", years: "5-9 yrs", payLo: 10, payHi: 18, shift: "Lead projects, direct shoots, define visual style" },
      { label: "Lead", years: "9+ yrs", payLo: 18, payHi: 30, shift: "Run a studio/team or command premium freelance rates" },
    ],
  },
  {
    id: "mechanical-engineer", ticker: "MECH", name: "Mechanical Engineer", cluster: "Engineering & Built",
    oneLine: "Designs, tests and builds machines, engines, tools and thermal/mechanical systems.",
    outlook: "Stable", trajectory: "flat", growthNote: "Mechanical engineers projected +9% 2024-34 off a large mature base (US BLS); a stable band with a 2020 industrial dip",
    demandTrend: [52, 53, 54, 55, 55, 52, 55, 57, 56, 57, 58], aiExposure: "Moderate", aiNote: "Tailwind: AI-driven CAD, generative design and simulation augment the core design work rather than replace it.",
    payEntry: [3, 5.5], payMid: [7, 14], paySenior: [16, 28],
    skills: ["CAD/SolidWorks", "Thermodynamics & FEA/CFD", "Manufacturing/GD&T", "Product design", "Automation & robotics", "Project management"],
    education: ["B.E./B.Tech Mechanical Engineering", "M.Tech (Design/Thermal/Manufacturing)", "GATE for PSU/M.Tech routes", "PG in Robotics/Mechatronics/EV"],
    related: ["Renewable Energy Engineer", "Robotics/Mechatronics Engineer", "Manufacturing/Production Engineer", "Automotive Design Engineer", "HVAC Engineer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 5.5, shift: "Learns CAD, drawings and shop-floor/design basics" },
      { label: "Mid", years: "3-7 yrs", payLo: 7, payHi: 14, shift: "Owns design modules; picks a domain (thermal, auto, ER&D)" },
      { label: "Senior", years: "8-14 yrs", payLo: 16, payHi: 28, shift: "Leads product/system design and vendor/quality calls" },
      { label: "Lead", years: "15+ yrs", payLo: 25, payHi: 45, shift: "Owns engineering roadmap, teams and P&L outcomes" },
    ],
  },
  {
    id: "renewable-energy-engineer", ticker: "RENW", name: "Renewable Energy Engineer", cluster: "Engineering & Built",
    oneLine: "Designs and delivers solar, wind and storage systems for clean-power generation.",
    outlook: "Expanding", trajectory: "up", growthNote: "Green-transition acceleration mid-decade after a brief 2020 capex pause; among the top-15 fastest-growing roles to 2030 (WEF 2025)",
    demandTrend: [38, 43, 47, 51, 55, 54, 60, 66, 72, 79, 85], aiExposure: "Low", aiNote: "Tailwind: AI optimizes plant yield and grid forecasting, but on-ground design, siting and commissioning stay human-led.",
    payEntry: [3.5, 6], payMid: [8, 15], paySenior: [17, 32],
    skills: ["Solar PV/wind system design", "PVsyst/energy modelling", "Power electronics & grid integration", "Energy storage (BESS)", "EPC/project execution", "Site & feasibility analysis"],
    education: ["B.E./B.Tech (Mechanical/Electrical/Energy)", "M.Tech Renewable/Energy Systems", "NISE / solar PV certifications", "PG diploma in Energy Management"],
    related: ["Mechanical Engineer", "Electrical/Power Systems Engineer", "Energy Storage Engineer", "Sustainability/ESG Consultant", "Electric Vehicle Engineer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3.5, payHi: 6, shift: "Sizing, layouts and site surveys under supervision" },
      { label: "Mid", years: "3-7 yrs", payLo: 8, payHi: 15, shift: "Owns plant design and EPC coordination end-to-end" },
      { label: "Senior", years: "8-14 yrs", payLo: 17, payHi: 32, shift: "Leads MW-scale projects, grid clearances and bids" },
      { label: "Lead", years: "15+ yrs", payLo: 28, payHi: 50, shift: "Heads project portfolios, PPAs and developer strategy" },
    ],
  },
  {
    id: "architect", ticker: "ARCH", name: "Architect", cluster: "Engineering & Built",
    oneLine: "Plans and designs buildings and spaces, balancing form, function, code and cost.",
    outlook: "Stable", trajectory: "flat", growthNote: "Architects projected +4% 2024-34, about the all-occupation average (US BLS); construction-cyclical with a visible 2020 trough",
    demandTrend: [50, 51, 53, 54, 54, 49, 52, 55, 53, 53, 54], aiExposure: "Moderate", aiNote: "Tailwind: generative/BIM AI speeds drafting and options, but concept, client fit and code judgment stay human.",
    payEntry: [2.5, 4.5], payMid: [5, 10], paySenior: [12, 22],
    skills: ["AutoCAD & Revit/BIM", "Design & space planning", "Building codes & bylaws", "3D visualization (SketchUp/Rhino)", "Sustainable/green design", "Site & project coordination"],
    education: ["B.Arch (COA-recognized, 5 yrs)", "M.Arch (Urban/Sustainable/Landscape)", "Council of Architecture registration", "LEED/IGBC green-building certs"],
    related: ["Urban Planner", "Interior Designer", "Landscape Architect", "BIM Manager", "Construction Project Manager"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 2.5, payHi: 4.5, shift: "Drafts, models and produces working drawings" },
      { label: "Mid", years: "3-7 yrs", payLo: 5, payHi: 10, shift: "Runs projects and client/site coordination" },
      { label: "Senior", years: "8-14 yrs", payLo: 12, payHi: 22, shift: "Leads design direction and multi-project delivery" },
      { label: "Lead", years: "15+ yrs", payLo: 20, payHi: 40, shift: "Principal/own firm; wins clients and sets vision" },
    ],
  },
  {
    id: "software-developer", ticker: "SWDE", name: "Software Developer", cluster: "Technology & Data",
    oneLine: "Builds and maintains the software, apps and systems that run modern businesses",
    outlook: "Stable", trajectory: "up", growthNote: "A boom to 2021-22, a sharp 2023-24 layoff and fresher-hiring trough, then a long-run recovery; BLS still projects +15-17% (Layoffs.fyi / US BLS)",
    demandTrend: [50, 56, 62, 68, 72, 74, 82, 80, 62, 66, 76], aiExposure: "High", aiNote: "Copilots automate boilerplate and compress junior headcount, but raise the pay for engineers who architect, review AI output and ship reliable systems",
    payEntry: [4, 12], payMid: [8, 15], paySenior: [18, 40],
    skills: ["Data structures & algorithms", "One core language (Java/Python/JS)", "Git & version control", "APIs & databases (SQL)", "System design basics", "Debugging & code review"],
    education: ["B.Tech/B.E. in CSE or IT", "BCA + MCA route for non-engineers", "Bootcamps (Scaler, Masai, Newton) + strong portfolio", "B.Sc CS + internships and open-source"],
    related: ["Data Scientist", "AI/ML Engineer", "Product Manager", "UX Designer", "Cybersecurity Analyst"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 4, payHi: 12, shift: "Ship features under review, learn the codebase and DSA on the job" },
      { label: "Mid", years: "2-5 yrs", payLo: 8, payHi: 15, shift: "Own modules end-to-end, mentor juniors, make design decisions" },
      { label: "Senior", years: "5-9 yrs", payLo: 18, payHi: 40, shift: "Architect systems, set technical direction across teams" },
      { label: "Lead", years: "9+ yrs", payLo: 30, payHi: 60, shift: "Own platform strategy or engineering management; scope over code" },
    ],
  },
  {
    id: "digital-marketing", ticker: "DMKT", name: "Digital Marketing Specialist", cluster: "Business & Finance",
    oneLine: "Drives sales and brand growth through SEO, paid ads, social and performance campaigns",
    outlook: "Stable", trajectory: "flat", growthNote: "India's digital ad spend keeps climbing double-digits, sustaining steady demand — but AI is commoditizing generalist work (Dentsu/IAMAI 2024-25)",
    demandTrend: [50, 52, 54, 55, 56, 53, 58, 59, 56, 55, 56], aiExposure: "Moderate", aiNote: "AI writes copy and auto-optimizes bids, squeezing generalists; specialists fluent in analytics, GEO/AEO and strategy earn a premium",
    payEntry: [3, 6], payMid: [6, 12], paySenior: [12, 22],
    skills: ["SEO & keyword research", "Google & Meta paid ads", "Analytics (GA4, dashboards)", "Content & social strategy", "Conversion & funnel optimization", "Campaign copywriting"],
    education: ["Any bachelor's + a digital-marketing certification", "Google, Meta & HubSpot certifications", "MBA in Marketing for the strategy track", "Specialist bootcamps (Kraftshala, IIDE) with live campaigns"],
    related: ["Content Writer", "Content / Brand Strategist", "Product Manager", "Social Media Manager", "Growth Manager"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 6, shift: "Execute campaigns, run reports and learn the platforms" },
      { label: "Mid", years: "2-5 yrs", payLo: 6, payHi: 12, shift: "Own channels and budgets, optimize performance, prove ROI" },
      { label: "Senior", years: "5-9 yrs", payLo: 12, payHi: 22, shift: "Set marketing strategy, manage teams and larger budgets" },
      { label: "Lead", years: "9+ yrs", payLo: 20, payHi: 50, shift: "Head of Marketing / growth owning the funnel and P&L" },
    ],
  },
  {
    id: "graphic-designer", ticker: "GDES", name: "Graphic Designer", cluster: "Design & Media",
    oneLine: "Creates visual identity, layouts and brand assets across print and digital",
    outlook: "Cooling", trajectory: "down", growthNote: "Generative image tools and template platforms are shrinking demand for routine production design; hiring is softening for generalists (industry surveys 2024-25)",
    demandTrend: [55, 57, 58, 59, 60, 57, 61, 60, 50, 45, 41], aiExposure: "High", aiNote: "AI generates logos, layouts and social creatives in seconds, hollowing out entry-level work; art direction, brand and UX hold their value",
    payEntry: [2.5, 5], payMid: [5, 9], paySenior: [9, 18],
    skills: ["Adobe Photoshop & Illustrator", "Typography & layout", "Brand & visual identity", "Figma / UI basics", "Colour theory & composition", "Client & brief communication"],
    education: ["B.Des / BFA in Graphic or Communication Design", "Diploma in Graphic Design", "Self-taught with a strong portfolio", "Any bachelor's + a specialized design course"],
    related: ["UX Designer", "Content Writer", "Filmmaker / Video Editor", "Content / Brand Strategist", "Motion Designer"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 2.5, payHi: 5, shift: "Produce assets to brief, learn tools and brand systems" },
      { label: "Mid", years: "2-5 yrs", payLo: 5, payHi: 9, shift: "Own projects end-to-end, handle clients, develop a style" },
      { label: "Senior", years: "5-9 yrs", payLo: 9, payHi: 18, shift: "Lead visual direction and shape brand identity" },
      { label: "Lead", years: "9+ yrs", payLo: 15, payHi: 30, shift: "Art/creative director; or pivot to UX for higher ceilings" },
    ],
  },
  {
    id: "content-writer", ticker: "CWRI", name: "Content Writer", cluster: "Design & Media",
    oneLine: "Writes articles, web copy and marketing content that informs and converts readers",
    outlook: "Cooling", trajectory: "down", growthNote: "The roster's steepest GenAI displacement — freelance writing postings dropped ~30% post-ChatGPT; hiring is contracting for generalists (ScienceDirect 2024)",
    demandTrend: [56, 58, 59, 60, 61, 59, 62, 58, 45, 39, 34], aiExposure: "High", aiNote: "LLMs draft competent copy instantly, gutting commodity writing; writers who bring original reporting, expertise and brand voice stay in demand",
    payEntry: [2.5, 5], payMid: [4.5, 8], paySenior: [8, 15],
    skills: ["Clear, persuasive writing", "SEO & keyword research", "Research & fact-checking", "Editing & proofreading", "Content strategy & briefs", "AI tools & prompt editing"],
    education: ["BA in English, Journalism or Mass Comm", "Any bachelor's + a proven writing portfolio", "Content-writing certification (HubSpot, UpGrad)", "Freelance apprenticeship building published clips"],
    related: ["Digital Marketing Specialist", "Graphic Designer", "Content / Brand Strategist", "UX Designer", "Journalist"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 2.5, payHi: 5, shift: "Write to briefs, learn SEO and house style" },
      { label: "Mid", years: "2-5 yrs", payLo: 4.5, payHi: 8, shift: "Own content calendars, specialize in a niche, edit others" },
      { label: "Senior", years: "5-9 yrs", payLo: 8, payHi: 15, shift: "Set content strategy, manage writers, own brand voice" },
      { label: "Lead", years: "9+ yrs", payLo: 12, payHi: 25, shift: "Head of Content; strategy over volume" },
    ],
  },
  {
    id: "civil-engineer", ticker: "CIVL", name: "Civil Engineer", cluster: "Engineering & Built",
    oneLine: "Designs, plans and supervises roads, buildings and public infrastructure",
    outlook: "Stable", trajectory: "flat", growthNote: "India's sustained infrastructure push (NIP, Gati Shakti) keeps steady demand; BLS projects +5% 2024-34, tied to cyclical investment",
    demandTrend: [51, 52, 53, 54, 54, 51, 53, 56, 55, 56, 57], aiExposure: "Low", aiNote: "Physical site work, structural judgment and on-ground supervision resist automation; AI mainly speeds BIM/CAD, not the engineer",
    payEntry: [3, 6], payMid: [6, 12], paySenior: [12, 20],
    skills: ["AutoCAD & BIM (Revit)", "Structural analysis", "Site supervision & QA/QC", "Estimation & costing", "Project management", "Building codes & safety"],
    education: ["B.Tech/B.E. in Civil Engineering", "Diploma in Civil Engineering (polytechnic)", "B.Tech + M.Tech (Structural/Construction Mgmt)", "GATE + government engineering services (PWD, railways)"],
    related: ["Architect", "Mechanical Engineer", "Renewable Energy Engineer", "Structural Engineer", "Construction Manager"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 3, payHi: 6, shift: "Assist on site and in design, learn codes and software" },
      { label: "Mid", years: "2-6 yrs", payLo: 6, payHi: 12, shift: "Run site execution or design packages, manage timelines" },
      { label: "Senior", years: "6-10 yrs", payLo: 12, payHi: 20, shift: "Lead projects, own budgets, quality and clients" },
      { label: "Lead", years: "10+ yrs", payLo: 18, payHi: 35, shift: "Project director / PMC lead; or structural consulting" },
    ],
  },
  {
    id: "physician-mbbs", ticker: "MBBS", name: "Physician (MBBS)", cluster: "Healthcare & Life Sciences",
    oneLine: "Diagnoses and treats patients as a licensed medical doctor across clinics and hospitals",
    outlook: "Expanding", trajectory: "up", growthNote: "A COVID 2020-21 healthcare surge, then durable demand amplified by India's ~1:1,500 doctor-population gap (MoHFW / US BLS)",
    demandTrend: [48, 51, 53, 56, 58, 66, 71, 70, 72, 76, 80], aiExposure: "Low", aiNote: "AI assists with imaging, triage and diagnostics but cannot replace clinical examination, hands-on treatment and patient trust; it augments, not displaces",
    payEntry: [6, 12], payMid: [10, 20], paySenior: [18, 40],
    skills: ["Clinical diagnosis", "Patient examination & history", "Pharmacology & prescribing", "Emergency & critical-care basics", "Medical ethics & communication", "Continuous medical learning"],
    education: ["MBBS (5.5 yrs incl. internship) via NEET-UG", "MBBS + MD/MS specialization via NEET-PG", "MBBS + DNB as an alternate PG route", "MBBS + government service (medical officer) or MPH"],
    related: ["Clinical Psychologist", "Physiotherapist", "Biotech Research Associate", "Surgeon", "Pharmacist"],
    stages: [
      { label: "Entry", years: "0-2 yrs", payLo: 6, payHi: 12, shift: "Practice as a medical officer or junior resident after internship" },
      { label: "Mid", years: "3-6 yrs", payLo: 10, payHi: 20, shift: "Complete PG (MD/MS/DNB) and practice as a specialist" },
      { label: "Senior", years: "6-12 yrs", payLo: 18, payHi: 40, shift: "Consultant with your own patient base; earnings scale with reputation" },
      { label: "Lead", years: "12+ yrs", payLo: 30, payHi: 80, shift: "Senior consultant, department head or private-practice owner" },
    ],
  },
]

/* -- helpers -- */
export const CLUSTERS = Array.from(new Set(CAREERS.map((c) => c.cluster)))
export const careerById = (id?: string) => CAREERS.find((c) => c.id === id)
export const careerByName = (name: string) =>
  CAREERS.find((c) => c.name.toLowerCase() === name.toLowerCase())

export function searchCareers(q: string): Career[] {
  const t = q.trim().toLowerCase()
  if (!t) return CAREERS
  return CAREERS.filter((c) =>
    c.name.toLowerCase().includes(t) || c.ticker.toLowerCase().includes(t) || c.cluster.toLowerCase().includes(t) ||
    c.oneLine.toLowerCase().includes(t) || c.skills.some((s) => s.toLowerCase().includes(t)) ||
    c.related.some((r) => r.toLowerCase().includes(t)),
  )
}

// a single "change %" read from the demand trend (last vs first) — the decade
// move (2015→2025), for the board's Δ column
export const trendPct = (t: number[]) => (t.length < 2 ? 0 : Math.round(((t[t.length - 1] - t[0]) / t[0]) * 100))
// the recent-momentum read (last ~5 years), for the deep-dive header
export const recentPct = (t: number[]) => {
  if (t.length < 2) return 0
  const from = t[Math.max(0, t.length - 6)]
  return Math.round(((t[t.length - 1] - from) / from) * 100)
}
export const OUTLOOK_GLYPH: Record<Outlook, string> = { Expanding: "▲", Stable: "▪", Cooling: "▼" }
export const AI_LEVEL: Record<AiExposure, number> = { Low: 1, Moderate: 2, High: 3 }

/* -- trajectory: the one colour axis on the terminal (purple/red/blue) -- */
export const TRAJ_HUE: Record<Trajectory, string> = { up: "var(--color-growth)", down: "var(--color-decline)", flat: "var(--color-flat)" }
export const TRAJ_LABEL: Record<Trajectory, string> = { up: "Growth", down: "Decline", flat: "Flat" }
export const TRAJ_GLYPH: Record<Trajectory, string> = { up: "▲", down: "▼", flat: "▬" }
// the calendar years a demandTrend series spans, for chart x-axes
export const demandYears = (n: number): number[] => Array.from({ length: n }, (_, i) => DEMAND_START_YEAR + i)

// a simple, damped 5-year forward projection (2026–2030) from recent momentum —
// the "analyst target" segment. Flat trajectories hold; up/down continue their
// recent slope at 70% (regression to the mean). Clamped to the 0–100 index.
export function projectDemand(t: number[], trajectory: Trajectory): number[] {
  const v0 = t[t.length - 1]
  const recent = t.length >= 4 ? (t[t.length - 1] - t[t.length - 4]) / 3 : 0
  const per = trajectory === "flat" ? 0 : recent * 0.7
  return Array.from({ length: 5 }, (_, i) => Math.round(Math.max(5, Math.min(100, v0 + per * (i + 1)))))
}
