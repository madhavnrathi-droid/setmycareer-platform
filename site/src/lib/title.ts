// One capitalization system for the whole feed: sentence case with a proper-noun
// dictionary (the live API normalises its own posts server-side in api/blog.ts —
// keep KEEP lists in sync). Fixes the mixed title-case/sentence-case/random-caps
// mess across the imported library.

const KEEP = ["AI", "IELTS", "UKVI", "MBA", "MBBS", "UPSC", "NEET", "JEE", "CET", "GMAT", "FMGE", "ANM", "GNM", "BBA", "BBM", "B.Com", "BCom", "B.Tech", "BTech", "PGDCA", "IQ", "ATS", "LOR", "PR", "SWOT", "STAR", "CPL", "STEM", "MNCs", "MNC", "India", "Indian", "Indians", "Google", "Australia", "Karnataka", "Kota", "Gen Z", "LinkedIn", "SetMyCareer", "Dr", "Rathi", "English", "USA", "UK", "US", "Canada", "Germany", "IIT", "IIM", "PCM", "PCB", "RIASEC"]

export function editorialTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim()
  t = t.replace(/\s*\|\s*/g, " — ").replace(/\s+-\s+/g, " — ")
  t = t.toLowerCase()
  t = t.replace(/\bdont\b/g, "don't").replace(/\byoure\b/g, "you're").replace(/\bwhats\b/g, "what's").replace(/\bcant\b/g, "can't").replace(/\bwont\b/g, "won't").replace(/\bheres\b/g, "here's").replace(/\bi\b/g, "I")
  t = t.replace(/(^|[—:?.]\s*)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
  for (const k of KEEP) t = t.replace(new RegExp("\\b" + k.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&") + "\\b", "gi"), k)
  return t
}
