// Colored brand + institution logos, SELF-HOSTED as crisp vector SVGs in
// /public/logos (sourced from gilbarbara/logos + Wikimedia). Local files mean
// full colour, no runtime CORS / rate-limit / globe-fallback, and never
// pixelated. `src` is a public path the browser serves directly.
// Marks belong to their owners; shown as reference, not endorsement.
export interface Brand { name: string; src: string }
const co = (slug: string, name: string): Brand => ({ name, src: `/logos/${slug}.svg` })

// Where clients work — the biggest, most-recognised names across global tech,
// consulting and finance and the Indian corporate majors our clients actually
// join. Curated to the marks with a clean self-hosted vector, capped so the wall
// stays ≤5 rows (7-wide on desktop). Self-hosted SVGs in /public/logos.
export const CLIENT_COMPANIES: Brand[] = [
  co("google", "Google"), co("apple", "Apple"), co("microsoft", "Microsoft"), co("amazon", "Amazon"),
  co("nvidia", "NVIDIA"), co("samsung", "Samsung"), co("adobe", "Adobe"),
  co("oracle", "Oracle"), co("ibm", "IBM"), co("intel", "Intel"), co("salesforce", "Salesforce"),
  co("openai", "OpenAI"), co("accenture", "Accenture"), co("deloitte", "Deloitte"),
  co("mckinsey", "McKinsey & Company"), co("capgemini", "Capgemini"),
  co("tcs", "TCS"), co("infosys", "Infosys"), co("hcltech", "HCLTech"),
  co("mahindra", "Mahindra"), co("tatasteel", "Tata Steel"), co("itc", "ITC"),
  co("hul", "Hindustan Unilever"), co("hdfc", "HDFC Bank"), co("icici", "ICICI Bank"),
  co("myntra", "Myntra"), co("sail", "SAIL"), co("indianarmy", "Indian Army"),
  co("delphi", "Delphi"), co("daimler", "Daimler"),
]

// Institutions woven into the student journey as the "destinations" — the best-
// known name in each field (real colour crests, self-hosted). Grouped by field so
// the journey can caption them; Indian flagships first, global aspiration after.
export interface Inst { name: string; field: string; src: string }
const ed = (slug: string, name: string, field: string): Inst => ({ name, field, src: `/logos/edu/${slug}.svg` })

export const JOURNEY_UNIS: Inst[] = [
  ed("iitd", "IIT Delhi", "Engineering"),
  ed("iima", "IIM Ahmedabad", "Management"),
  ed("iisc", "IISc Bengaluru", "Science & research"),
  ed("nlsiu", "NLSIU Bengaluru", "Law"),
  ed("mit", "MIT", "Global"),
  ed("harvard", "Harvard", "Global"),
  ed("oxford", "Oxford", "Global"),
]
