// Seed exam database — major Indian entrance exams (UG). Registration figures are
// indicative (recent cycles). Curated from official bodies; refreshed by ETL.

import type { Exam } from "../types"

export const EXAMS: Exam[] = [
  { id: "jee_main", name: "JEE Main", fullName: "Joint Entrance Examination (Main)", body: "NTA", level: "ug", domain: "engineering", scoring: "percentile", approxRegistrations: 1200000, monthsHeld: [1, 4], gates: ["NIT", "IIIT", "govt_college"], notes: "Two sessions; best NTA percentile counts. Gates NITs/IIITs/GFTIs via JoSAA and is the qualifier for JEE Advanced." },
  { id: "jee_adv", name: "JEE Advanced", fullName: "Joint Entrance Examination (Advanced)", body: "IIT (rotating)", level: "ug", domain: "engineering", scoring: "rank", approxRegistrations: 190000, monthsHeld: [5], gates: ["IIT"], notes: "Only top ~2.5L JEE Main qualifiers sit it. CRL gates the 23 IITs via JoSAA." },
  { id: "neet_ug", name: "NEET-UG", fullName: "National Eligibility cum Entrance Test (UG)", body: "NTA", level: "ug", domain: "medical", scoring: "score", approxRegistrations: 2400000, monthsHeld: [5], gates: ["AIIMS", "govt_college", "deemed", "private"], notes: "Single gateway for MBBS/BDS/AYUSH across India. Out of 720; AIR drives counselling (MCC/state)." },
  { id: "cuet_ug", name: "CUET-UG", fullName: "Common University Entrance Test (UG)", body: "NTA", level: "ug", domain: "general", scoring: "percentile", approxRegistrations: 1400000, monthsHeld: [5, 6], gates: ["central_university", "state_university", "deemed"], notes: "Admission to central + many universities (DU, BHU, JNU UG, etc.). Subject-wise normalised scores." },
  { id: "clat", name: "CLAT", fullName: "Common Law Admission Test", body: "Consortium of NLUs", level: "ug", domain: "law", scoring: "rank", approxRegistrations: 75000, monthsHeld: [12], gates: ["state_university", "deemed"], notes: "Gateway to 22+ National Law Universities for the 5-year integrated law programme." },
  { id: "bitsat", name: "BITSAT", fullName: "BITS Admission Test", body: "BITS Pilani", level: "ug", domain: "engineering", scoring: "score", approxRegistrations: 300000, monthsHeld: [5, 6], gates: ["deemed"], notes: "Computer-based; gates BITS Pilani/Goa/Hyderabad. Out of 390." },
  { id: "viteee", name: "VITEEE", fullName: "VIT Engineering Entrance Examination", body: "VIT", level: "ug", domain: "engineering", scoring: "rank", approxRegistrations: 300000, monthsHeld: [4], gates: ["deemed"], notes: "Gates VIT Vellore/Chennai/AP/Bhopal; rank-based category allocation." },
  { id: "nata", name: "NATA", fullName: "National Aptitude Test in Architecture", body: "Council of Architecture", level: "ug", domain: "architecture", scoring: "score", approxRegistrations: 40000, monthsHeld: [4, 6, 7], gates: ["state_university", "private", "deemed"], notes: "Required for B.Arch admission alongside 10+2 with Maths." },
  { id: "uceed", name: "UCEED", fullName: "Undergraduate Common Entrance Exam for Design", body: "IIT Bombay", level: "ug", domain: "design", scoring: "rank", approxRegistrations: 18000, monthsHeld: [1], gates: ["IIT", "deemed"], notes: "Gates B.Des at IIT Bombay/Delhi/Guwahati/Hyderabad and other institutes." },
  { id: "nid_dat", name: "NID DAT", fullName: "NID Design Aptitude Test", body: "NID Ahmedabad", level: "ug", domain: "design", scoring: "rank", approxRegistrations: 22000, monthsHeld: [12, 1], gates: ["deemed"], notes: "Prelims + Mains studio test for the National Institutes of Design." },
  { id: "ailet", name: "AILET", fullName: "All India Law Entrance Test", body: "NLU Delhi", level: "ug", domain: "law", scoring: "rank", approxRegistrations: 25000, monthsHeld: [12], gates: ["state_university"], notes: "Separate test exclusively for NLU Delhi's BA LLB (Hons)." },
  { id: "nda", name: "NDA", fullName: "National Defence Academy Exam", body: "UPSC", level: "ug", domain: "general", scoring: "rank", approxRegistrations: 400000, monthsHeld: [4, 9], gates: ["govt_college"], notes: "Written + SSB interview for Army/Navy/Air Force cadet entry after 12th." },
]

export const getExam = (id: string) => EXAMS.find((e) => e.id === id)
