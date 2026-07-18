// The sources behind the terminal — real, currently-citable reports on the
// future of work, jobs, skills and AI's labour impact (verified via the research
// pass). Each carries a short "cover code" plus a HERO STAT (the one number the
// finding turns on) so the wire can render an information-forward report cover
// without hotlinking fragile external images.

export interface Research {
  code: string        // cover wordmark (short)
  publisher: string
  title: string
  year: string
  stat: string        // the hero number, the cover's visual anchor (e.g. "+78M", "56%")
  statLabel: string   // what the number counts (2–4 words)
  finding: string     // one-line headline finding, with a number
  url: string
  tag: "Global" | "India" | "AI" | "Skills"
  tone: "ink" | "paper"
}

export const CITED_RESEARCH: Research[] = [
  {
    code: "WEF", publisher: "World Economic Forum", title: "The Future of Jobs Report 2025", year: "2025",
    stat: "+78M", statLabel: "net new jobs by 2030",
    finding: "By 2030, churn creates 170M new jobs and displaces 92M — a net +78M, with 22% of jobs disrupted.",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/", tag: "Global", tone: "ink",
  },
  {
    code: "BLS", publisher: "U.S. Bureau of Labor Statistics", title: "Employment Projections: 2024–2034", year: "2025",
    stat: "+10.1%", statLabel: "growth, computing roles",
    finding: "5.2M U.S. jobs added 2024–34; computer & mathematical roles grow +10.1% on AI demand.",
    url: "https://www.bls.gov/news.release/ecopro.nr0.htm", tag: "Global", tone: "ink",
  },
  {
    code: "NASSCOM", publisher: "NASSCOM", title: "Technology Sector in India: Strategic Review 2025", year: "2025",
    stat: "$282.6B", statLabel: "India tech revenue, FY25",
    finding: "India's tech revenue hit $282.6B in FY25 (+5.1%); 77% of providers expect AI-led growth.",
    url: "https://nasscom.in/knowledge-center/publications/technology-sector-india-strategic-review-2025", tag: "India", tone: "paper",
  },
  {
    code: "ISR", publisher: "Wheebox · India Skills Report", title: "India Skills Report 2025", year: "2025",
    stat: "54.8%", statLabel: "youth employability",
    finding: "India's youth employability rose to 54.8% in 2025, up from 51.3% a year earlier.",
    url: "https://wheebox.com/india-skills-report.htm", tag: "Skills", tone: "paper",
  },
  {
    code: "LinkedIn", publisher: "LinkedIn", title: "Jobs on the Rise 2025 — India", year: "2025",
    stat: "2 in 3", statLabel: "top roles are new",
    finding: "Two-thirds of India's 25 fastest-growing roles are new to the list; half didn't exist 25 years ago.",
    url: "https://www.linkedin.com/pulse/linkedin-jobs-rise-2025-25-fastest-growing-roles-india-lnqcc", tag: "India", tone: "paper",
  },
  {
    code: "Naukri", publisher: "Naukri (Info Edge)", title: "JobSpeak Index", year: "2025",
    stat: "+54%", statLabel: "AI/ML hiring, YoY",
    finding: "White-collar hiring grew +10% YoY (Sep 2025); AI/ML roles surged +54% YoY.",
    url: "https://www.naukri.com/blog/understanding-hiring-trends-with-naukri-jobspeak-report-oct-2025/", tag: "India", tone: "paper",
  },
  {
    code: "PwC", publisher: "PwC", title: "2025 Global AI Jobs Barometer", year: "2025",
    stat: "56%", statLabel: "AI-skill wage premium",
    finding: "AI-skilled jobs carry a 56% wage premium; AI-exposed industries show ~4× productivity growth.",
    url: "https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/report.pdf", tag: "AI", tone: "ink",
  },
  {
    code: "McKinsey", publisher: "McKinsey & Company", title: "Superagency in the Workplace", year: "2025",
    stat: "$4.4T", statLabel: "AI opportunity",
    finding: "92% of firms plan to raise AI investment; the long-term opportunity is sized at $4.4T.",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work", tag: "AI", tone: "paper",
  },
  {
    code: "NASSCOM·BCG", publisher: "NASSCOM & BCG", title: "AI-Powered Tech Services", year: "2024",
    stat: "$17B", statLabel: "India AI market by 2027",
    finding: "India's AI market is projected to reach $17B by 2027 (25–35% CAGR); AI-engineer roles up 67% YoY.",
    url: "https://indiaai.gov.in/news/nasscom-bcg-report-says-india-s-ai-market-is-expected-to-touch-17-billion-usd-by-2027", tag: "India", tone: "paper",
  },
]
