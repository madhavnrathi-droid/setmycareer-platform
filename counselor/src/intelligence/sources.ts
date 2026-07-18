// ─────────────────────────────────────────────────────────────────────────────
// Data-source registry — every official Indian education/skills/credential source
// the Career Intelligence engine reasons across, with the ACCESS REALITY for each
// (public portal vs API vs bulk download vs scrape) so the ETL layer knows how to
// ingest it. This is the map the supervisor uses to decide where a fact comes
// from and how fresh it is.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceCategory =
  | "enrolment" | "regulator" | "rankings" | "accreditation" | "admissions"
  | "careers" | "skills" | "credentials" | "scholarships"
export type AccessMethod = "rest_api" | "bulk_download" | "portal_scrape" | "oauth_user" | "manual_curation"
export type Cadence = "realtime" | "daily" | "seasonal" | "annual" | "ad_hoc"
export type IngestStatus = "wired" | "planned" | "curated"

export interface DataSource {
  id: string
  name: string
  full: string
  category: SourceCategory
  /** what facts this source authoritatively provides. */
  provides: string
  access: AccessMethod
  cadence: Cadence
  /** how the ETL pulls it today. */
  status: IngestStatus
  url?: string
  /** caveats that shape ingestion (auth, rate limits, format). */
  notes?: string
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "aishe", name: "AISHE", full: "All India Survey on Higher Education", category: "enrolment",
    provides: "Institution master list, enrolment, programmes, faculty, GER by state/discipline/gender",
    access: "bulk_download", cadence: "annual", status: "planned", url: "https://aishe.gov.in",
    notes: "Annual report + dimension tables; bulk CSV/PDF. Authoritative institution universe.",
  },
  {
    id: "ugc", name: "UGC", full: "University Grants Commission", category: "regulator",
    provides: "Recognised universities (12B/2f), fake-university list, approved programmes, norms",
    access: "portal_scrape", cadence: "ad_hoc", status: "planned", url: "https://www.ugc.gov.in",
    notes: "Authoritative for 'is this university genuine'. List pages, no API.",
  },
  {
    id: "nirf", name: "NIRF", full: "National Institutional Ranking Framework", category: "rankings",
    provides: "Annual institute ranks + scores by category (Overall/Engineering/Medical/Management/Law/…)",
    access: "bulk_download", cadence: "annual", status: "curated", url: "https://www.nirfindia.org",
    notes: "Published rank lists + parameter scores (TLR, RPC, GO, OI, PR). Curated into the college DB.",
  },
  {
    id: "naac", name: "NAAC", full: "National Assessment and Accreditation Council", category: "accreditation",
    provides: "Institutional accreditation grade (A++…C) + CGPA, validity period",
    access: "portal_scrape", cadence: "ad_hoc", status: "curated", url: "https://www.naac.gov.in",
    notes: "Quality signal for non-ranked colleges. Accredited-institution lists.",
  },
  {
    id: "nba", name: "NBA", full: "National Board of Accreditation", category: "accreditation",
    provides: "Programme-level accreditation (esp. engineering/management/pharmacy)",
    access: "portal_scrape", cadence: "ad_hoc", status: "curated", url: "https://www.nbaind.org",
    notes: "Programme (not institute) granularity — matters for B.Tech branch quality.",
  },
  {
    id: "josaa", name: "JoSAA", full: "Joint Seat Allocation Authority", category: "admissions",
    provides: "IIT/NIT/IIIT/GFTI opening & closing ranks per institute/branch/category/round",
    access: "portal_scrape", cadence: "seasonal", status: "curated", url: "https://josaa.nic.in",
    notes: "The ground truth for engineering cutoffs. Round-wise OR/CR tables each cycle.",
  },
  {
    id: "csab", name: "CSAB", full: "Central Seat Allocation Board", category: "admissions",
    provides: "Supplementary NIT+ rounds, special/vacancy allocation cutoffs",
    access: "portal_scrape", cadence: "seasonal", status: "planned", url: "https://csab.nic.in",
    notes: "Fills seats after JoSAA; extends cutoff coverage for spot rounds.",
  },
  {
    id: "ncs", name: "NCS", full: "National Career Service (MoLE)", category: "careers",
    provides: "Job postings, career profiles, skill demand, counselling, occupation taxonomy",
    access: "rest_api", cadence: "daily", status: "planned", url: "https://www.ncs.gov.in",
    notes: "Live labour-market demand signal for employability forecasting.",
  },
  {
    id: "nsdc", name: "NSDC / Skill India", full: "National Skill Development Corporation", category: "skills",
    provides: "Sector skill councils, QP-NOS job roles, NSQF levels, training/apprenticeship",
    access: "portal_scrape", cadence: "ad_hoc", status: "planned", url: "https://nsdcindia.org",
    notes: "Maps non-degree skilling pathways + NSQF qualification levels.",
  },
  {
    id: "digilocker", name: "DigiLocker", full: "DigiLocker (MeitY)", category: "credentials",
    provides: "Verified marksheets, certificates, IDs — with user consent",
    access: "oauth_user", cadence: "realtime", status: "planned", url: "https://www.digilocker.gov.in",
    notes: "Consent-based per-student credential pull. Verifies academic % without manual entry.",
  },
  {
    id: "apaar", name: "APAAR / ABC", full: "APAAR ID + Academic Bank of Credits", category: "credentials",
    provides: "Lifelong learner ID + accumulated academic credits (NEP)",
    access: "oauth_user", cadence: "realtime", status: "planned", url: "https://www.abc.gov.in",
    notes: "Credit history + transfer eligibility for lateral/transfer pathways.",
  },
  {
    id: "nsp", name: "NSP", full: "National Scholarship Portal", category: "scholarships",
    provides: "Central + state scholarship schemes, eligibility, windows, disbursal",
    access: "portal_scrape", cadence: "seasonal", status: "curated", url: "https://scholarships.gov.in",
    notes: "Single window for govt scholarships. Curated into the scholarship DB.",
  },
]

export const sourcesByCategory = (c: SourceCategory) => DATA_SOURCES.filter((s) => s.category === c)
export const getSource = (id: string) => DATA_SOURCES.find((s) => s.id === id)
