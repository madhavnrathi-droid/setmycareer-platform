// The site's information architecture — one source of truth for the nav
// dropdowns, the mobile drawer, and the footer sitemap. Grouping follows
// Hick/Miller (chunked choices); order follows the serial-position effect
// (Product first, Pricing/Book Session last where decisions land). Each leaf
// carries a one-line hint so the dropdowns inform, not just list.

export interface NavLeaf { label: string; to: string; hint: string }
export interface NavGroup { label: string; to: string; blurb: string; children: NavLeaf[] }

export const IA_NAV: NavGroup[] = [
  {
    label: "Product", to: "/product", blurb: "The instruments, live on the page.",
    children: [
      { label: "Overview", to: "/product#overview", hint: "What the product is" },
      { label: "Live Demo", to: "/product#demo", hint: "Take the real index, free" },
      { label: "Product Tour", to: "/product#tour", hint: "Sign-up to decision, five stops" },
      { label: "Assessments", to: "/product#assessments", hint: "Validated instruments, scored live" },
      { label: "Packages", to: "/product#packages", hint: "The catalogue, priced" },
      { label: "AI Career Coach", to: "/product#coach", hint: "Chat and voice, grounded in you" },
      { label: "Client Dashboard", to: "/product#dashboard", hint: "One home for every client" },
      { label: "Counselor Dashboard", to: "/product#counselor", hint: "The counsellor's console" },
      { label: "Reports", to: "/product#reports", hint: "Scores become a story" },
    ],
  },
  {
    label: "Process", to: "/framework", blurb: "How the decision is actually made.",
    children: [
      { label: "The SetMyCareer Framework", to: "/framework#framework", hint: "Five steps, one decision" },
      { label: "How Career Decisions Actually Work", to: "/framework#how", hint: "The honest mechanics" },
      { label: "Decision Model", to: "/framework#model", hint: "Four factors, one overlap" },
      { label: "Scientific Foundation", to: "/framework#science", hint: "RIASEC, Big Five, aptitude" },
      { label: "Research Library", to: "/framework#research", hint: "Read the thinking" },
    ],
  },
  {
    label: "Solutions", to: "/solutions", blurb: "Whoever is deciding, we meet them there.",
    children: [
      { label: "Students", to: "/solutions#students", hint: "Streams, exams, degrees" },
      { label: "Parents", to: "/solutions#parents", hint: "In the decision, not the argument" },
      { label: "Graduates", to: "/solutions#graduates", hint: "A degree isn't a direction" },
      { label: "Professionals", to: "/solutions#professionals", hint: "Growth, switches, AI risk" },
      { label: "Schools", to: "/solutions#schools", hint: "Guidance at scale" },
      { label: "Colleges", to: "/solutions#colleges", hint: "Employability, measured" },
      { label: "Organizations", to: "/solutions#organizations", hint: "Career clarity for teams" },
    ],
  },
  {
    label: "Terminal", to: "/library", blurb: "The map, wider than two roads.",
    children: [
      { label: "Careers", to: "/library#careers", hint: "What the work actually is" },
      { label: "Degrees", to: "/library#degrees", hint: "Where each one leads" },
      { label: "Skills", to: "/library#skills", hint: "Where they earn" },
      { label: "Industries", to: "/library#industries", hint: "Trajectories, plainly" },
      { label: "Emerging Careers", to: "/library#emerging", hint: "New roads opening" },
      { label: "Career Comparisons", to: "/library#comparisons", hint: "The classic either/ors" },
    ],
  },
  {
    label: "Resources", to: "/resources", blurb: "The library — videos, notes, the e-book.",
    children: [
      { label: "Blog", to: "/blog", hint: "The full library, live" },
      { label: "Videos", to: "/resources/videos", hint: "From the channel" },
      { label: "E-Book", to: "/resources#ebook", hint: "13 career-success strategies" },
      { label: "Webinars & Events", to: "/resources#events", hint: "Sessions and gatherings" },
      { label: "Career Bank", to: "/library", hint: "Every career, measured" },
    ],
  },
  {
    label: "Ontology", to: "/trust", blurb: "What we are, and the receipts behind it.",
    children: [
      { label: "About us", to: "/trust#about", hint: "What SetMyCareer is, plainly" },
      { label: "What is career counselling", to: "/trust#counselling", hint: "For anyone new to it" },
      { label: "Methodology", to: "/trust#methodology", hint: "How recommendations are made" },
      { label: "Research", to: "/trust#research", hint: "Every source we cite" },
      { label: "Privacy", to: "/trust#privacy", hint: "Your data is the session's" },
      { label: "AI Ethics", to: "/trust#ethics", hint: "The machine never decides" },
      { label: "FAQ", to: "/trust#faq", hint: "Answers, before you ask" },
      { label: "Contact", to: "/contact", hint: "Talk to a career expert" },
    ],
  },
]

export const PRICING_LINK = { label: "Pricing", to: "/pricing" }
export const BOOK_LINK = { label: "Book Session", to: "/book" }
