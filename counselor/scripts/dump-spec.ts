// One-off: dump every test's structure + scoring metadata to JSON for the spec workbook.
import { writeFileSync } from "node:fs"
import { PERSONALITY_FACTORS } from "../src/lib/sigma/personality-data"
import { INVENTORY } from "../src/guest/interest-items"
import { ABILITY_SECTIONS, SPATIAL_TRIALS, CLERICAL_PAIRS, sectionItemCount } from "../src/guest/ability-bank"
import { EXEC_FACTORS } from "../src/guest/exec-scale"
import { ABILITY_MAX, ABILITY_LABEL, ABILITY_MEANING, GRADE_PERCENTILE } from "../src/guest/ability-norms"

const data = {
  personalityFactors: PERSONALITY_FACTORS,
  inventory: INVENTORY,
  execFactors: EXEC_FACTORS,
  ability: ABILITY_SECTIONS.map((s) => ({
    key: s.key, label: s.label, minutes: s.minutes, kind: s.kind, normed: s.normed,
    hideTimer: !!s.hideTimer, count: sectionItemCount(s), measures: s.measures, how: s.how,
    items: s.items ?? null,
  })),
  spatialTrials: SPATIAL_TRIALS,
  clericalPairs: CLERICAL_PAIRS,
  norms: { ABILITY_MAX, ABILITY_LABEL, ABILITY_MEANING, GRADE_PERCENTILE },
}
const out = process.argv[2] || "/private/tmp/spec-data.json"
writeFileSync(out, JSON.stringify(data, null, 2))
console.log("wrote", out, "bytes:", JSON.stringify(data).length)
