// The Expert, Mentor & Coach onboarding — option lists and terms transcribed
// verbatim from the SetMyCareer Master Expert Onboarding Agreement (Loratis
// SetMyCareer.Net Pvt. Ltd.). Single source of truth for the /experts/apply
// form so the page component stays presentational.
//
// What actually writes to the server from the public form is only the account
// (name / email / password → NavigatorDetail/AddNavigator). Everything below is
// collected to hand off into the counsellor workspace, where the full profile,
// documents and signature complete. Do not add a public write for these fields
// without an authenticated, gated endpoint.

/* B — Professional profile */
export const EMPLOYMENT_TYPES = [
  "Full-time", "Part-time", "Self-employed / Independent",
  "Business owner", "Consultant", "Retired", "Between roles",
] as const

export const QUALIFICATIONS = [
  "Diploma", "Bachelor's", "Master's / MBA", "M.Phil", "PhD / Doctorate", "Professional certification",
] as const

/* C — Functional expertise (choose up to 5) */
export const FUNCTIONAL_EXPERTISE = [
  "Leadership & General Management", "Strategy", "Business Development",
  "Product Management", "Program Management", "Project Management",
  "Software Development", "Cloud & Infrastructure", "Data Science",
  "Artificial Intelligence / ML", "Cyber Security", "Sales",
  "Marketing", "Digital Marketing", "Market Research", "Business Analytics",
  "Finance", "Accounting", "Banking", "Investment Management",
  "Human Resources", "Talent Acquisition", "Learning & Development",
  "Executive Coaching", "Career Counselling", "Operations",
  "Supply Chain", "Manufacturing", "Logistics", "Teaching",
  "Research", "Healthcare Services", "Media & Communication",
  "Public Policy", "Entrepreneurship", "Legal & Compliance", "UI/UX Design",
] as const

/* D — Industry exposure (choose up to 5) */
export const INDUSTRY_EXPOSURE = [
  "IT / ITES", "SaaS", "AI & Analytics", "BFSI", "FinTech", "Insurance",
  "Consulting", "E-Commerce", "Retail", "FMCG", "Consumer Durables",
  "Manufacturing", "Automotive", "Aviation", "Aerospace & Defence",
  "Telecom", "Healthcare", "Hospitals", "Pharma", "Biotech",
  "Education", "EdTech", "Media & Entertainment", "Advertising",
  "Real Estate", "Construction", "Infrastructure", "Energy",
  "Agriculture", "AgriTech", "Logistics", "Hospitality",
  "Government", "Public Sector", "NGO / Non-Profit",
  "Research Organizations", "Startups",
] as const

/* E — Target audience */
export const TARGET_AUDIENCE = [
  "School Students", "Parents", "College Students", "Fresh Graduates",
  "Working Professionals", "Senior Executives", "Entrepreneurs", "Career Break Candidates",
] as const

/* F — Services offered */
export const SERVICES_OFFERED = [
  "Career Guidance", "Career Transition Coaching", "Functional Mentoring",
  "Leadership Coaching", "Executive Coaching", "Industry Insights",
  "Interview Preparation", "Resume Review", "Entrepreneurship Mentoring",
  "Corporate Training", "Webinars", "Written Expert Advice",
] as const

/* G — Availability */
export const SESSION_FORMATS = [
  "1:1 sessions", "Group sessions", "Workshops", "Written queries",
] as const
export const DAY_BANDS = ["Weekdays", "Weekends"] as const
export const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Late evening"] as const

/* I — Documents required (uploaded inside the portal, not on the public form) */
export const DOCUMENTS_REQUIRED = [
  { label: "Resume / CV", note: "PDF, current" },
  { label: "Professional photo", note: "Square, well-lit" },
  { label: "Highest qualification proof", note: "Degree or certificate" },
  { label: "PAN card", note: "For payouts & compliance" },
  { label: "Aadhaar card", note: "Identity verification" },
  { label: "Bank account details", note: "For revenue share" },
  { label: "GST registration", note: "If applicable" },
] as const

/* The four onboarding steps — apply, admin review, complete, go live. */
export const ONBOARDING_STEPS = [
  { t: "Apply here", d: "Your profile, expertise and availability — an account is created as you submit." },
  { t: "We review & approve", d: "Our team reviews every application — usually within a couple of working days — before a profile can go live." },
  { t: "Complete your profile", d: "Sign in to the workspace to confirm details, upload documents and sign the onboarding agreement." },
  { t: "Go live on the roster", d: "Once approved, your profile joins the live network on this site and in the client portal." },
] as const

/* Terms & Conditions — the material points, condensed from the 15-clause
   agreement. The full agreement is signed inside the workspace. */
export const KEY_TERMS = [
  "Strict confidentiality on all client data, assessments, reports and recordings.",
  "No soliciting or serving SetMyCareer clients outside the platform.",
  "No poaching of clients or fellow experts.",
  "Ethical, unbiased, evidence-based guidance; conflicts of interest disclosed up front.",
  "SetMyCareer's intellectual property and brand are respected at all times.",
  "Full compliance with applicable data-privacy laws.",
  "Sessions may be recorded for quality assurance and compliance review.",
  "Experts are independent professionals, not employees; revenue sharing is set per assignment agreement.",
  "Non-solicitation of clients and experts for 12 months after the association ends.",
] as const

/* Declaration & consent — the four checkboxes from the agreement. All required. */
export const CONSENT_ITEMS = [
  "The information I have provided is true and accurate to the best of my knowledge.",
  "I agree to the confidentiality, non-poaching and professional-conduct terms above.",
  "I consent to session recording, quality audits and client feedback.",
  "I will abide by SetMyCareer's policies and the Expert, Mentor & Coach Onboarding Agreement.",
] as const

/* The case for joining as a domain expert — used on the intro of the apply page. */
export const WHY_JOIN = [
  { title: "Booked by your field", body: "Clients who need your exact role, industry or specialty are matched to you. No funnel of your own to run." },
  { title: "Sessions, not admin", body: "Forty-five-minute 1:1s. Scheduling, video, notes and payment run on the platform — your time goes to the conversation." },
  { title: "Paid per session", body: "Revenue is shared transparently per a separate assignment agreement. Offer sessions standalone, or as an add-on to any package." },
  { title: "You stay independent", body: "This is your expertise, on your terms. No fee to apply; you keep full say over your availability and scope." },
] as const
