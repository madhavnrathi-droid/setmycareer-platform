// Seed college database — a tier-spanning set of real Indian institutions across
// engineering, medical, law, design, science and commerce. NIRF ranks (2024),
// fees and median packages are indicative; closing cutoffs are representative of
// recent general-category flagship-branch closes (JoSAA / MCC / consortium). The
// ETL refreshes these each admission cycle; curated here so estimates are
// explainable today.

import type { College } from "../types"

// fee/package shorthands (INR)
const L = 100000

export const COLLEGES: College[] = [
  // ── engineering: IITs (JEE Advanced, rank) ──────────────────────────────────
  {
    id: "iitb", name: "Indian Institute of Technology Bombay", shortName: "IIT Bombay", type: "IIT", city: "Mumbai", state: "Maharashtra",
    nirfRank: 3, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 2.3 * L, medianPackage: 21 * L, topPackage: 1.7 * 100 * L, placementRate: 90,
    flagshipPrograms: ["CSE", "Electrical", "Mechanical", "B.Des (IDC)"], domains: ["engineering", "design"], admissionExamIds: ["jee_adv", "uceed"], ownership: "public", estbYear: 1958,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 67, branch: "CSE" }], notable: "Top placements + IDC design school",
  },
  {
    id: "iitd", name: "Indian Institute of Technology Delhi", shortName: "IIT Delhi", type: "IIT", city: "New Delhi", state: "Delhi",
    nirfRank: 2, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 2.3 * L, medianPackage: 20 * L, topPackage: 2 * 100 * L, placementRate: 89,
    flagshipPrograms: ["CSE", "Electrical", "Mathematics & Computing"], domains: ["engineering"], admissionExamIds: ["jee_adv"], ownership: "public", estbYear: 1961,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 118, branch: "CSE" }],
  },
  {
    id: "iitm", name: "Indian Institute of Technology Madras", shortName: "IIT Madras", type: "IIT", city: "Chennai", state: "Tamil Nadu",
    nirfRank: 1, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 2.2 * L, medianPackage: 20 * L, topPackage: 1.9 * 100 * L, placementRate: 88,
    flagshipPrograms: ["CSE", "Aerospace", "Engineering Physics"], domains: ["engineering"], admissionExamIds: ["jee_adv"], ownership: "public", estbYear: 1959,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 162, branch: "CSE" }], notable: "NIRF #1 overall + engineering",
  },
  {
    id: "iitk", name: "Indian Institute of Technology Kanpur", shortName: "IIT Kanpur", type: "IIT", city: "Kanpur", state: "Uttar Pradesh",
    nirfRank: 4, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 2.2 * L, medianPackage: 19 * L, placementRate: 86,
    flagshipPrograms: ["CSE", "Electrical", "Aerospace"], domains: ["engineering"], admissionExamIds: ["jee_adv"], ownership: "public", estbYear: 1959,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 237, branch: "CSE" }],
  },
  {
    id: "iitkgp", name: "Indian Institute of Technology Kharagpur", shortName: "IIT Kharagpur", type: "IIT", city: "Kharagpur", state: "West Bengal",
    nirfRank: 5, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 2.2 * L, medianPackage: 18 * L, placementRate: 85,
    flagshipPrograms: ["CSE", "Electronics", "Ocean Engineering"], domains: ["engineering"], admissionExamIds: ["jee_adv"], ownership: "public", estbYear: 1951,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 279, branch: "CSE" }],
  },
  // ── engineering: NITs / IIIT (JEE Main, percentile) ─────────────────────────
  {
    id: "nitt", name: "National Institute of Technology Tiruchirappalli", shortName: "NIT Trichy", type: "NIT", city: "Tiruchirappalli", state: "Tamil Nadu",
    nirfRank: 9, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 1.6 * L, medianPackage: 12 * L, placementRate: 84,
    flagshipPrograms: ["CSE", "ECE", "Mechanical"], domains: ["engineering"], admissionExamIds: ["jee_main"], ownership: "public", estbYear: 1964,
    cutoffs: [{ examId: "jee_main", category: "general", metric: "percentile", closing: 99.35, branch: "CSE" }], notable: "Top-ranked NIT",
  },
  {
    id: "nitk", name: "National Institute of Technology Karnataka, Surathkal", shortName: "NIT Surathkal", type: "NIT", city: "Mangalore", state: "Karnataka",
    nirfRank: 17, nirfCategory: "engineering", naac: "A+", nbaAccredited: true, annualFee: 1.6 * L, medianPackage: 11 * L, placementRate: 82,
    flagshipPrograms: ["CSE", "IT", "Mechanical"], domains: ["engineering"], admissionExamIds: ["jee_main"], ownership: "public", estbYear: 1960,
    cutoffs: [{ examId: "jee_main", category: "general", metric: "percentile", closing: 99.25, branch: "CSE" }],
  },
  {
    id: "nitw", name: "National Institute of Technology Warangal", shortName: "NIT Warangal", type: "NIT", city: "Warangal", state: "Telangana",
    nirfRank: 21, nirfCategory: "engineering", naac: "A+", nbaAccredited: true, annualFee: 1.6 * L, medianPackage: 11 * L, placementRate: 82,
    flagshipPrograms: ["CSE", "ECE", "EEE"], domains: ["engineering"], admissionExamIds: ["jee_main"], ownership: "public", estbYear: 1959,
    cutoffs: [{ examId: "jee_main", category: "general", metric: "percentile", closing: 99.15, branch: "CSE" }],
  },
  {
    id: "iiith", name: "International Institute of Information Technology Hyderabad", shortName: "IIIT Hyderabad", type: "IIIT", city: "Hyderabad", state: "Telangana",
    nirfRank: 47, nirfCategory: "engineering", naac: "A", nbaAccredited: true, annualFee: 3.5 * L, medianPackage: 28 * L, topPackage: 80 * L, placementRate: 95,
    flagshipPrograms: ["CSE", "ECE", "CS + dual"], domains: ["engineering", "computer_applications"], admissionExamIds: ["jee_main"], ownership: "private", estbYear: 1998,
    cutoffs: [{ examId: "jee_main", category: "general", metric: "percentile", closing: 99.1, branch: "CSE" }], notable: "Elite CS research + placements",
  },
  // ── engineering: deemed/private (own tests) ─────────────────────────────────
  {
    id: "bitsp", name: "Birla Institute of Technology and Science, Pilani", shortName: "BITS Pilani", type: "deemed", city: "Pilani", state: "Rajasthan",
    nirfRank: 20, nirfCategory: "engineering", naac: "A", nbaAccredited: true, annualFee: 5.4 * L, medianPackage: 18 * L, placementRate: 90,
    flagshipPrograms: ["CSE", "EEE", "Mechanical"], domains: ["engineering", "computer_applications"], admissionExamIds: ["bitsat"], ownership: "private", estbYear: 1964,
    cutoffs: [{ examId: "bitsat", category: "general", metric: "score", closing: 327, branch: "CSE" }], notable: "Flexible curriculum + practice school",
  },
  {
    id: "vitv", name: "Vellore Institute of Technology", shortName: "VIT Vellore", type: "deemed", city: "Vellore", state: "Tamil Nadu",
    nirfRank: 11, nirfCategory: "engineering", naac: "A++", nbaAccredited: true, annualFee: 3.0 * L, medianPackage: 9 * L, placementRate: 85,
    flagshipPrograms: ["CSE", "AI & ML", "ECE"], domains: ["engineering", "computer_applications"], admissionExamIds: ["viteee"], ownership: "private", estbYear: 1984,
    cutoffs: [{ examId: "viteee", category: "general", metric: "rank", closing: 7000, branch: "CSE" }], notable: "Strong mass-recruiter placements",
  },
  // ── medical (NEET-UG, score / 720) ──────────────────────────────────────────
  {
    id: "aiimsd", name: "All India Institute of Medical Sciences, Delhi", shortName: "AIIMS Delhi", type: "AIIMS", city: "New Delhi", state: "Delhi",
    nirfRank: 1, nirfCategory: "medical", naac: "A++", annualFee: 0.06 * L, medianPackage: 12 * L, placementRate: 100,
    flagshipPrograms: ["MBBS"], domains: ["medical"], admissionExamIds: ["neet_ug"], ownership: "public", estbYear: 1956,
    cutoffs: [{ examId: "neet_ug", category: "general", metric: "score", closing: 705, branch: "MBBS" }], notable: "NIRF #1 medical; nominal fees",
  },
  {
    id: "jipmer", name: "Jawaharlal Institute of Postgraduate Medical Education & Research", shortName: "JIPMER Puducherry", type: "govt_college", city: "Puducherry", state: "Puducherry",
    nirfRank: 6, nirfCategory: "medical", naac: "A", annualFee: 0.05 * L, medianPackage: 11 * L, placementRate: 100,
    flagshipPrograms: ["MBBS"], domains: ["medical"], admissionExamIds: ["neet_ug"], ownership: "public", estbYear: 1956,
    cutoffs: [{ examId: "neet_ug", category: "general", metric: "score", closing: 690, branch: "MBBS" }],
  },
  {
    id: "mamc", name: "Maulana Azad Medical College", shortName: "MAMC Delhi", type: "govt_college", city: "New Delhi", state: "Delhi",
    nirfRank: 14, nirfCategory: "medical", naac: "A", annualFee: 0.1 * L, medianPackage: 10 * L, placementRate: 100,
    flagshipPrograms: ["MBBS"], domains: ["medical"], admissionExamIds: ["neet_ug"], ownership: "public", estbYear: 1958,
    cutoffs: [{ examId: "neet_ug", category: "general", metric: "score", closing: 685, branch: "MBBS" }],
  },
  {
    id: "cmcv", name: "Christian Medical College, Vellore", shortName: "CMC Vellore", type: "deemed", city: "Vellore", state: "Tamil Nadu",
    nirfRank: 3, nirfCategory: "medical", naac: "A++", annualFee: 0.5 * L, medianPackage: 11 * L, placementRate: 100,
    flagshipPrograms: ["MBBS"], domains: ["medical"], admissionExamIds: ["neet_ug"], ownership: "private", estbYear: 1900,
    cutoffs: [{ examId: "neet_ug", category: "general", metric: "score", closing: 660, branch: "MBBS" }], notable: "Premier mission hospital + research",
  },
  // ── law (CLAT / AILET, rank) ─────────────────────────────────────────────────
  {
    id: "nlsiu", name: "National Law School of India University", shortName: "NLSIU Bangalore", type: "state_university", city: "Bengaluru", state: "Karnataka",
    nirfRank: 1, nirfCategory: "law", naac: "A", annualFee: 3.2 * L, medianPackage: 17 * L, placementRate: 95,
    flagshipPrograms: ["BA LLB (Hons)"], domains: ["law"], admissionExamIds: ["clat"], ownership: "public", estbYear: 1987,
    cutoffs: [{ examId: "clat", category: "general", metric: "rank", closing: 130, branch: "BA LLB" }], notable: "NIRF #1 law",
  },
  {
    id: "nalsar", name: "NALSAR University of Law", shortName: "NALSAR Hyderabad", type: "state_university", city: "Hyderabad", state: "Telangana",
    nirfRank: 3, nirfCategory: "law", naac: "A+", annualFee: 3.0 * L, medianPackage: 15 * L, placementRate: 92,
    flagshipPrograms: ["BA LLB (Hons)"], domains: ["law"], admissionExamIds: ["clat"], ownership: "public", estbYear: 1998,
    cutoffs: [{ examId: "clat", category: "general", metric: "rank", closing: 220, branch: "BA LLB" }],
  },
  // ── design (UCEED / NID DAT, rank) ──────────────────────────────────────────
  {
    id: "nid_a", name: "National Institute of Design, Ahmedabad", shortName: "NID Ahmedabad", type: "deemed", city: "Ahmedabad", state: "Gujarat",
    nirfRank: null, naac: "A", annualFee: 3.5 * L, medianPackage: 9 * L, placementRate: 88,
    flagshipPrograms: ["B.Des"], domains: ["design"], admissionExamIds: ["nid_dat"], ownership: "public", estbYear: 1961,
    cutoffs: [{ examId: "nid_dat", category: "general", metric: "rank", closing: 90, branch: "B.Des" }], notable: "India's premier design school",
  },
  // ── science (UG; admits via JEE/IAT — modelled via JEE Adv channel) ──────────
  {
    id: "iiscb", name: "Indian Institute of Science", shortName: "IISc Bangalore", type: "deemed", city: "Bengaluru", state: "Karnataka",
    nirfRank: 1, nirfCategory: "overall", naac: "A++", annualFee: 0.3 * L, medianPackage: 16 * L, placementRate: 85,
    flagshipPrograms: ["BS Research"], domains: ["pure_sciences"], admissionExamIds: ["jee_adv", "neet_ug"], ownership: "public", estbYear: 1909,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 1500, branch: "BS Research" }], notable: "India's top research institute",
  },
  {
    id: "iiserp", name: "Indian Institute of Science Education and Research, Pune", shortName: "IISER Pune", type: "deemed", city: "Pune", state: "Maharashtra",
    nirfRank: 25, nirfCategory: "overall", naac: "A", annualFee: 0.3 * L, medianPackage: 10 * L, placementRate: 78,
    flagshipPrograms: ["BS-MS Dual"], domains: ["pure_sciences"], admissionExamIds: ["jee_adv"], ownership: "public", estbYear: 2006,
    cutoffs: [{ examId: "jee_adv", category: "general", metric: "rank", closing: 6000, branch: "BS-MS" }],
  },
  // ── commerce / humanities (CUET, percentile) ────────────────────────────────
  {
    id: "srcc", name: "Shri Ram College of Commerce, University of Delhi", shortName: "SRCC (DU)", type: "central_university", city: "New Delhi", state: "Delhi",
    nirfRank: 11, nirfCategory: "commerce_finance", naac: "A++", annualFee: 0.5 * L, medianPackage: 9 * L, placementRate: 80,
    flagshipPrograms: ["B.Com (Hons)", "BA Economics (Hons)"], domains: ["commerce_finance", "humanities"], admissionExamIds: ["cuet_ug"], ownership: "public", estbYear: 1926,
    cutoffs: [{ examId: "cuet_ug", category: "general", metric: "percentile", closing: 99.5, branch: "B.Com (Hons)" }], notable: "India's top commerce college",
  },
]

export const getCollege = (id: string) => COLLEGES.find((c) => c.id === id)
