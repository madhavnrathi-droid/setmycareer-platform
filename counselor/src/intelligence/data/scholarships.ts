// Seed scholarship database — major Indian scholarships across govt, private and
// institutional providers. Income ceilings / benefits are indicative of recent
// cycles; the ETL refreshes windows + amounts from the National Scholarship Portal
// and provider sites. Values in INR.

import type { Scholarship } from "../types"

export const SCHOLARSHIPS: Scholarship[] = [
  {
    id: "nsp_postmatric_scst", name: "Post-Matric Scholarship (SC/ST)", provider: "Ministry of Social Justice / Tribal Affairs", kind: "government",
    level: ["after_10th", "after_12th", "ug", "pg"], incomeCeiling: 250000, categories: ["sc", "st"],
    benefit: "Full tuition reimbursement + maintenance allowance for post-matric study", approxAnnualValue: 60000,
    windowMonths: [8, 9, 10], portal: "https://scholarships.gov.in",
  },
  {
    id: "nsp_postmatric_obc", name: "Post-Matric Scholarship (OBC)", provider: "Ministry of Social Justice", kind: "government",
    level: ["after_10th", "after_12th", "ug"], incomeCeiling: 250000, categories: ["obc_ncl"],
    benefit: "Tuition + maintenance for OBC students in post-matric courses", approxAnnualValue: 40000,
    windowMonths: [8, 9, 10], portal: "https://scholarships.gov.in",
  },
  {
    id: "inspire_she", name: "INSPIRE-SHE", provider: "Department of Science & Technology", kind: "government",
    level: ["ug", "pg"], incomeCeiling: null, minAcademicPercent: 90, domains: ["pure_sciences"],
    benefit: "₹80,000/yr for top-1% science students pursuing BSc/MSc in natural sciences", approxAnnualValue: 80000,
    windowMonths: [7, 8, 9], portal: "https://online-inspire.gov.in",
  },
  {
    id: "pm_yasasvi", name: "PM-YASASVI", provider: "Ministry of Social Justice", kind: "government",
    level: ["after_8th", "after_10th"], incomeCeiling: 250000, categories: ["obc_ncl"],
    benefit: "Pre/post-matric support for OBC, EBC and DNT students (entrance-tested)", approxAnnualValue: 75000,
    windowMonths: [7, 8], portal: "https://yet.nta.ac.in",
  },
  {
    id: "means_merit", name: "National Means-cum-Merit (NMMS)", provider: "Department of School Education", kind: "government",
    level: ["after_8th"], incomeCeiling: 350000, minAcademicPercent: 55,
    benefit: "₹12,000/yr (₹1,000/month) through classes 9–12 to curb dropout", approxAnnualValue: 12000,
    windowMonths: [10, 11], portal: "https://scholarships.gov.in",
  },
  {
    id: "pragati_aicte", name: "Pragati Scholarship (AICTE)", provider: "AICTE", kind: "government",
    level: ["ug"], incomeCeiling: 800000, genders: ["female"],
    benefit: "₹50,000/yr for girls in AICTE-approved technical diploma/degree (2 per family)", approxAnnualValue: 50000,
    windowMonths: [11, 12], portal: "https://www.aicte-india.org", domains: ["engineering", "pharmacy", "architecture"],
  },
  {
    id: "saksham_aicte", name: "Saksham Scholarship (AICTE)", provider: "AICTE", kind: "government",
    level: ["ug"], incomeCeiling: 800000, forDisability: true,
    benefit: "₹50,000/yr for differently-abled students in AICTE technical programmes", approxAnnualValue: 50000,
    windowMonths: [11, 12], portal: "https://www.aicte-india.org", domains: ["engineering"],
  },
  {
    id: "pm_usp_cs", name: "PM-USP Central Sector Scholarship", provider: "Department of Higher Education", kind: "government",
    level: ["ug"], incomeCeiling: 450000, minAcademicPercent: 80,
    benefit: "₹10,000–20,000/yr for top-20-percentile 12th students in college (merit + means)", approxAnnualValue: 12000,
    windowMonths: [8, 9, 10], portal: "https://scholarships.gov.in",
  },
  {
    id: "sitaram_jindal", name: "Sitaram Jindal Foundation Scholarship", provider: "Sitaram Jindal Foundation", kind: "private",
    level: ["after_10th", "after_12th", "ug", "pg"], incomeCeiling: 400000, minAcademicPercent: 65,
    benefit: "₹500–3,200/month by level/stream; need-cum-merit, pan-India", approxAnnualValue: 24000,
    windowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], portal: "https://www.sitaramjindalfoundation.org",
  },
  {
    id: "reliance_uud", name: "Reliance Foundation UG Scholarship", provider: "Reliance Foundation", kind: "private",
    level: ["ug"], incomeCeiling: 1500000, minAcademicPercent: 60,
    benefit: "Up to ₹2,00,000 (one-time, over the course) for meritorious UG students", approxAnnualValue: 50000,
    windowMonths: [10, 11], portal: "https://www.reliancefoundation.org",
  },
  {
    id: "tata_capital_pankh", name: "Tata Capital Pankh Scholarship", provider: "Tata Capital", kind: "private",
    level: ["after_10th", "after_12th", "ug"], incomeCeiling: 400000, minAcademicPercent: 60,
    benefit: "Up to 80% of fees (capped ₹12,000–50,000 by level) for need-based students", approxAnnualValue: 30000,
    windowMonths: [9, 10, 11], portal: "https://www.tatacapital.com",
  },
  {
    id: "ab_scholarship", name: "Aditya Birla Scholarship", provider: "Aditya Birla Group", kind: "private",
    level: ["ug", "pg"], incomeCeiling: null, minAcademicPercent: 85, domains: ["engineering", "management", "law"],
    benefit: "Up to ₹1.75L/yr for top entrants at premier institutes (IIT/IIM/NLS/BITS/XLRI)", approxAnnualValue: 175000,
    windowMonths: [8, 9], portal: "https://www.adityabirlascholars.net",
  },
  {
    id: "kishore_vaigyanik", name: "PRERANA / Science Talent Support", provider: "DST / institutional", kind: "government",
    level: ["after_12th", "ug"], incomeCeiling: null, minAcademicPercent: 80, domains: ["pure_sciences"],
    benefit: "Mentorship + fellowship support for research-track science students", approxAnnualValue: 60000,
    windowMonths: [6, 7], portal: "https://dst.gov.in",
  },
  {
    id: "state_ews_fee", name: "State EWS Fee Concession", provider: "State Governments", kind: "government",
    level: ["after_12th", "ug"], incomeCeiling: 800000, categories: ["ews"],
    benefit: "Tuition-fee waiver/concession for EWS students in state institutions (varies by state)", approxAnnualValue: 45000,
    windowMonths: [7, 8, 9], portal: "https://scholarships.gov.in",
  },
]

export const getScholarship = (id: string) => SCHOLARSHIPS.find((s) => s.id === id)
