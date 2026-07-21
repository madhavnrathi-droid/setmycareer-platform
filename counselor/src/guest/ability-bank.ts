// The digital Ability battery — the founder's real DBDA (David's Battery of
// Differential Abilities, Loratis) subtests, digitised for the /t/ flow.
//
// FOLDER-ONLY RULE (founder, 2026-07-21): every item below is transcribed from
// the seven booklet PDFs in "Ability Test Details" (via the verified extraction
// JSONs). Nothing invented, nothing substituted. Section config from the Test
// Administrator table: CA 20 items/5 min · VA 24/7.5 min (booklet: Part 1 4 min +
// Part 2 3 min 30 s, run here as one 7.5-min block) · NA 20/5 min 30 s ·
// RA 12/5 min · SA 72/6 min* · MA 25/9 min · CL 72/3 min*. The two asterisked
// speed tests (SA, CL) hide their timer — the paper form forbids disclosing
// their duration. Raw scores map onto the Loratis norm tables
// (src/guest/ability-norms.ts). Battery total: 41 minutes, as printed.
//
// ANSWER-KEY PROVENANCE — the booklets print NO key for any live item:
//   · CA — derived by exact letter-multiset (anagram) match: the unique option
//     whose letters equal the stem word. Deterministic; certain.
//   · CL — derived by string equality of the pair. Deterministic; certain.
//   · SA — the booklet art could not be reproduced pixel-faithfully, so the 12
//     row samples are rebuilt as clean SVG shape data from the extraction's
//     row-theme descriptions, and each test figure is RENDERED from the sample
//     by a rotate (S) or mirror+rotate (R) transform. The key is therefore true
//     BY CONSTRUCTION — what is shown always matches what is scored. The shapes
//     are booklet-approximate (documented on the founder asset list); the
//     measured decision — "same, only turned" vs "reversed" — is identical.
//   · VA — solved semantically (synonym / matching proverb). High confidence,
//     but the official key (Loratis norms PDF, page 6) should be transcribed to
//     confirm.
//   · NA — computed arithmetic; certain, except items 8/18/19 whose printed
//     stems are defective (see TYPO/RECONSTRUCTION LOG) — those are provisional.
//   · RA — rules identified per row (documented inline). Inferred, pending the
//     official key; all 12 listed in PROVISIONAL_KEYS.
//   · MA — solved from the physics of each figure description. Per-item
//     confidence recorded in MA_KEYS; items whose figure detail the scans could
//     not resolve (5, 12, 17, 21, 22, 23) are provisional, and 5/12/23 also
//     carry requiresAsset (the runner shows a labelled placeholder panel).
//
// TYPO / RECONSTRUCTION LOG (every deliberate deviation from the printed page):
//   VA 10  "APETHETIC" → APATHETIC (booklet misprint).
//   VA 20d "He who groups in the dark…" → "He who gropes in the dark…".
//   VA 22d "Action speak louder than words" → "Actions speak louder than words".
//   VA 22e "When needs is highest…" → "When need is highest…".
//   NA 8   printed stem is unreadable ("Divide: 4.8/ 7- 20"); options imply a
//          simple decimal division — reconstructed as 4.8 ÷ 4 (= 1.2, option a).
//          PROVISIONAL until the original booklet is checked.
//   NA 18  printed "+" between {1/2−1/3} and 3/4 matches no option; "÷" matches
//          option c exactly — operator corrected to ÷. PROVISIONAL.
//   NA 19  printed "{1/2+1/3}" (= 5/6) matches no option; reconstructed as
//          (1/2 + 1/8)² = 25/64 (option d), the only reading that fits.
//          PROVISIONAL — needs the original DBDA booklet.
//   MA 2   duplicated clause removed ("…direction of the arrow, which way does
//          the gear of the arrow, which way does the gear o the right turn?").
//   MA 4   "A device that the same thing as a fuse does" → "A device that does
//          the same thing as a fuse".
//   MA 9   "Powered graphite’s" → "Powdered graphite".
//   MA 12d truncated "slower than wheel" → "slower than wheel Y".
//   MA 15  "This tool s used" → "This tool is used".
//   MA 17d trailing comma "first A, then B," → "first A, then B".
//   MA 24a option printed lowercase "a" → "A".
//   CA 5/15 stems corrected vs the OLD code (which had "organizer"/"pleasant"):
//          the booklet words are "organize" and "peasant".
//
// The CA stimulus is the stem word rendered degraded (CSS mask clipping parts of
// the letter strokes) — the extraction confirms any masking that leaves the word
// inferable is functionally equivalent to the booklet's erasure pattern.

import type { AbilityKey } from "./ability-norms"

export type SectionKey = AbilityKey

export interface McqItem {
  text: string
  options: string[]
  /** index into options */
  answer: number
  passage?: string
  /** closure (CA): the target word shown degraded above the jumbled options */
  word?: string
  /** id of the figure in ability-assets.tsx shown beside the question */
  figure?: string
  /** the original figure could not be rebuilt — runner shows a placeholder */
  requiresAsset?: boolean
}

// ── Closure Ability (CA) — 20 items · 5 min ──────────────────────────────────
// Booklet-verbatim: the degraded word on the left, the five printed jumbles on
// the right. The key is the unique true anagram (answerDerived in extraction).
interface CaItem { word: string; options: string[]; answer: number }
const CA_RAW: CaItem[] = [
  { word: "brand", options: ["rodba", "dnbra", "aibni", "radeb", "bneas"], answer: 1 },
  { word: "illness", options: ["sisleln", "nselsu", "rsipmes", "drusens", "ruseds"], answer: 0 },
  { word: "window", options: ["lowilw", "rdweno", "dwowni", "nawred", "nidrem"], answer: 2 },
  { word: "again", options: ["rgoan", "gapna", "lpano", "ginaa", "garin"], answer: 3 },
  { word: "organize", options: ["rygzeran", "ezcyrnai", "izonrega", "yezirdan", "nyoneiza"], answer: 2 },
  { word: "mirror", options: ["onimr", "rrimor", "lermi", "rmuro", "ulrrc"], answer: 1 },
  { word: "water", options: ["rweat", "twahc", "lovra", "twckei", "berbru"], answer: 0 },
  { word: "success", options: ["eusscsc", "aesrfcu", "dscucee", "sdsaces", "pssrepus"], answer: 0 },
  { word: "leading", options: ["yldiena", "gdalein", "inoadgi", "nlginae", "ididaene"], answer: 1 },
  { word: "flank", options: ["irouf", "rknfa", "cflka", "efrla", "alnfk"], answer: 4 },
  { word: "terminal", options: ["leorfma", "altnemni", "aintmlne", "letanirm", "faelrima"], answer: 3 },
  { word: "audience", options: ["dernccee", "condiunce", "ndeucaei", "enoduine", "eodncnie"], answer: 2 },
  { word: "jolly", options: ["ljoyl", "glaji", "yegll", "eyjil", "lylej"], answer: 0 },
  { word: "healthy", options: ["hytrae", "amgienn", "meyinan", "ylnmeai", "lyehaht"], answer: 4 },
  { word: "peasant", options: ["trsepen", "tpnesaa", "patsran", "psarnet", "trnoasp"], answer: 1 },
  { word: "since", options: ["hcicn", "issgh", "nices", "hnies", "ncaih"], answer: 2 },
  { word: "gambling", options: ["emlignba", "abcorlig", "grmlaigh", "mbigagnl", "lirggamn"], answer: 3 },
  { word: "camera", options: ["maarce", "rlnua", "rtaem", "yllauble", "nocraa"], answer: 0 },
  { word: "cannot", options: ["ecrtcor", "aocrtr", "acmaer", "tnoanc", "fornca"], answer: 3 },
  { word: "nation", options: ["nroait", "ruatne", "gtarin", "tinono", "ntiaon"], answer: 4 },
]
const CLOSURE: McqItem[] = CA_RAW.map(({ word, options, answer }) => ({ word, options, answer, text: "" }))

const m = (text: string, options: string[], answer: number, figure?: string, requiresAsset?: boolean): McqItem =>
  ({ text, options, answer, ...(figure ? { figure } : {}), ...(requiresAsset ? { requiresAsset } : {}) })

// ── Verbal Ability (VA) — 24 items · 7.5 min ─────────────────────────────────
// Booklet-verbatim. Part 1 (1–15): closest synonym. Part 2 (16–24): the saying
// that means the same as the proverb. Keys solved semantically (booklet prints
// none); official key lives on norms-PDF page 6 — verify (see PROVISIONAL_KEYS).
const VERBAL: McqItem[] = [
  m("Closest in meaning — FAST", ["Old", "Rapid", "Slow", "Early", "Late"], 1),
  m("Closest in meaning — DECEIVE", ["Blunder", "Obtain", "Conceal", "Mislead", "Disclose"], 3),
  m("Closest in meaning — EXCESS", ["Waste", "Departure", "Surplus", "Tax", "Approach"], 2),
  m("Closest in meaning — BELIEVABLE", ["Admirable", "Real", "Personable", "Unlikely", "Credible"], 4),
  m("Closest in meaning — CONTEMPLATE", ["Heal", "Advance", "Meditate", "Rest", "Worry"], 2),
  m("Closest in meaning — AMIABLE", ["Friendly", "Humorous", "Healthy", "Convincing", "Polished"], 0),
  m("Closest in meaning — TURMOIL", ["Circular", "Turbulent", "Calm", "Spinning", "Air-borne"], 1),
  m("Closest in meaning — DECEPTIVE", ["Illogical", "Illusory", "Magical", "Visible", "Clear"], 1),
  m("Closest in meaning — WHIMSICAL", ["Unlike", "Musical", "Dancing", "Unpredictable", "Equatorial"], 3),
  m("Closest in meaning — APATHETIC", ["Ignorant", "Indifferent", "Pitiful", "Concerned", "Clever"], 1),
  m("Closest in meaning — ARDUOUS", ["Repulsive", "Loving", "Easy", "Interesting", "Strenuous"], 4),
  m("Closest in meaning — PLACATE", ["Cover", "Beautify", "Arouse", "Plasticize", "Appease"], 4),
  m("Closest in meaning — CLANDESTINE", ["Furtive", "Safe", "Tribal", "Open", "Healthful"], 0),
  m("Closest in meaning — VINDICATE", ["Deny", "State", "Persecute", "Defend", "Accuse"], 3),
  m("Closest in meaning — INCULCATE", ["Grow", "Inquire", "Instill", "Compute", "Acquire"], 2),
  m("Same meaning — “STRIKE WHILE THE IRON IS HOT”", [
    "Take things as you find them", "Hot love is soon cold", "Make hay while the sun shines",
    "First think and then speak", "Look before you leap",
  ], 2),
  m("Same meaning — “IT NEVER RAINS BUT IT POURS”", [
    "Cloudy mornings turn to clear evenings", "Misfortunes never come one at a time", "Easy come, easy go",
    "The least predictable thing in life is the weather", "Every cloud has a silver lining",
  ], 1),
  m("Same meaning — “LET SLEEPING DOGS LIE”", [
    "As you made your bed, so you must lie on it", "Do not keep a dog and bark yourself",
    "There will be sleeping enough in the grave", "Never look for trouble; let trouble look for you",
    "An old dog does not bark for nothing",
  ], 3),
  m("Same meaning — “THERE IS NO VENOM LIKE THAT OF THE TONGUE”", [
    "The tongue of an idle person is never idle", "Talking pays no toll", "Few words are best",
    "Words cut more than swords", "Bad news travels fast",
  ], 3),
  m("Same meaning — “IT IS ALWAYS DARKEST BEFORE THE DAWN”", [
    "The longest day means the shortest night", "What is done by night appears by day",
    "He who runs in the dark may well stumble", "He who gropes in the dark finds what he would not",
    "When things are at the worst they will improve",
  ], 4),
  m("Same meaning — “ALL THAT GLITTERS IS NOT GOLD”", [
    "Don’t judge a book by its cover", "All men can’t be masters", "Gold dust blinds all eyes",
    "Money is the root of all evil", "Riches alone will not make a man happy",
  ], 0),
  m("Same meaning — “TOO MANY COOKS SPOIL THE BROTH”", [
    "Too much praise is a burden", "Too much consulting confounds", "Truth needs not many words",
    "Actions speak louder than words", "When need is highest, help is nighest",
  ], 1),
  m("Same meaning — “A STITCH IN TIME SAVES NINE”", [
    "It is never too late to mend", "Time cures all things", "Prevention is better than cure",
    "Take time while time is, for time will away", "It is no use crying over spilled milk",
  ], 2),
  m("Same meaning — “LITTLE STROKES FELL GREAT OAKS”", [
    "Step after step the ladder is ascended", "Great strokes make not sweet music",
    "Tall oaks from little acorns grow", "Oaks may fall when reeds stand the storm",
    "Little things please little minds",
  ], 0),
]

// ── Numerical Ability (NA) — 20 items · 5 min 30 s ───────────────────────────
// Booklet-verbatim arithmetic; keys computed. Items 8/18/19 reconstructed from
// defective print (see the log up top) and listed in PROVISIONAL_KEYS.
const NUMERICAL: McqItem[] = [
  m("Add:  41 + 57 + 88 + 34", ["230", "218", "200", "220", "219"], 3),
  m("Subtract:  967 − 435", ["552", "532", "522", "531", "523"], 1),
  m("Multiply:  974 × 3", ["2822", "2582", "2922", "2893", "2904"], 2),
  m("Divide:  2226 ÷ 7", ["318", "316", "324", "326", "213"], 0),
  m("Multiply:  253 × 20", ["5050", "5060", "4760", "4750", "4050"], 1),
  m("Subtract:  952 − 727", ["224", "234", "235", "225", "325"], 3),
  m("Add:  9 3/5 + 6 1/2", ["16 1/10", "16 1/5", "15 4/5", "15 1/10", "15 9/10"], 0),
  m("Divide:  4.8 ÷ 4", ["1.2", "15.0", "12.0", "0.12", "1.5"], 0),
  m("Multiply:  4.52 × 5", ["22.60", "22.50", "22.40", "22.26", "26.10"], 0),
  m("Divide:  1050 ÷ 15", ["30", "32", "70", "72", "60"], 2),
  m("2 × (25 − 19) ÷ 9 = ?", ["2/3", "1 1/3", "1 1/9", "1 7/9", "2 2/5"], 1),
  m("Which one of the numbers below could replace X in both places:  4 + X = 6 − X ?", ["4", "3", "2", "1", "−2"], 3),
  m("7/8 × (7/10 − 3/5) = ?", ["39/40", "7/40", "1 11/80", "2 11/40", "7/80"], 4),
  m("Subtract:  35 3/4 − 28 2/3", ["7 1/6", "7 5/6", "7 1/12", "6 11/12", "6 5/6"], 2),
  m("125% of 32 = ?", ["6", "12", "36", "52", "40"], 4),
  m("√196 = ?", ["14", "16", "24", "36", "98"], 0),
  m("5/7 of 245 = ?", ["165", "175", "185", "207", "343"], 1),
  m("(1/2 − 1/3) ÷ 3/4 = ?", ["1/3", "1/8", "2/9", "1 1/9", "5/8"], 2),
  m("(1/2 + 1/8)² = ?", ["1/8", "81/256", "17/64", "25/64", "1 1/4"], 3),
  m("(2/3 × 5/6) + 1/3 = ?", ["1 5/6", "5/27", "11/9", "8/9", "7/9"], 3),
]

// ── Reasoning Ability (RA) — 12 items · 5 min ────────────────────────────────
// Booklet-verbatim letter-sets: four of the five follow one rule, one breaks it.
// Keys inferred by identifying each row's rule (documented inline) — pending
// the official key; all 12 appear in PROVISIONAL_KEYS.
const R = (sets: [string, string, string, string, string], answer: number): McqItem =>
  ({ text: "Four of these five sets follow one rule. Mark the ONE that does not.", options: sets, answer })
const REASONING: McqItem[] = [
  R(["DEPD", "RFMR", "SJUS", "TVWT", "GBBK"], 4), // first letter = last letter; GBBK breaks
  R(["XFGX", "BLMB", "KQRK", "DTSD", "MYZM"], 3), // middle pair ascends (FG/LM/QR/YZ); TS descends
  R(["FGHE", "IJKH", "LMNP", "RSTQ", "VWXU"], 2), // ascending triple + the letter before it; LMNP ends P not K
  R(["EDDG", "IHHJ", "NMMO", "RQQS", "TSSU"], 0), // X,(X−1)(X−1),X+1; EDDG ends G (+2)
  R(["VWVT", "SVWV", "VWVR", "QVWV", "VWPV"], 4), // contains the trigram VWV; VWPV does not
  R(["CDED", "LMOM", "PQRQ", "STUT", "WXYX"], 1), // X,X+1,X+2,X+1; LMOM has O (skips N)
  R(["RYAA", "BBRG", "RPCC", "DDRD", "RLEE"], 3), // one R + one doubled pair + one other; DDRD has three D-family letters
  R(["ORAR", "PGRR", "RBVR", "RRUH", "LRLX"], 4), // exactly two R's; LRLX has one
  R(["DECG", "JKIL", "MNLO", "QRPS", "UVTW"], 0), // X,X+1,X−1,X+2; DECG ends G (+3)
  R(["BCFF", "GHKK", "KLNN", "PQTT", "VWZZ"], 2), // X,X+1 then doubled X+4; KLNN doubles N (= L+2)
  R(["CGFJ", "EIHL", "GKJN", "IMNR", "MQPT"], 3), // +4,−1,+4; IMNR is +4,+1,+4
  R(["HGFC", "KJIG", "NMLI", "TSRO", "YXWT"], 1), // descending triple then 3 back; KJIG's G is only 2 back
]

// ── Mechanical Ability (MA) — 25 items · 9 min ───────────────────────────────
// Booklet-verbatim stems/options (typo fixes logged up top). The booklet has NO
// key: MA_KEYS holds the answers solved from each figure's physics, with an
// honest per-item confidence. Items 5, 12 and 23 also need the original art
// (placeholder panel shown); 2, 17, 21, 22 are drawable but their booklet key
// cannot be pinned from the scans — provisional.
export interface MaKey { answer: number; confidence: "certain" | "provisional" }
export const MA_KEYS: MaKey[] = [
  { answer: 3, confidence: "certain" },     // 1  wooden handle → Wood
  { answer: 1, confidence: "provisional" }, // 2  bevel/crown train — sense of the output arrows unresolvable in scan
  { answer: 3, confidence: "certain" },     // 3  soldering gun
  { answer: 0, confidence: "certain" },     // 4  fuse ≈ circuit breaker
  { answer: 1, confidence: "provisional" }, // 5  levers — fulcrum offsets unreadable; B (longest effort arm) pending art
  { answer: 3, confidence: "certain" },     // 6  bank the OUTER edge of the curve → D
  { answer: 2, confidence: "certain" },     // 7  high anchor + full-span tie → C
  { answer: 3, confidence: "certain" },     // 8  idler between equal gears → direction B, same speed
  { answer: 3, confidence: "certain" },     // 9  powdered graphite → lubricant
  { answer: 0, confidence: "certain" },     // 10 motor drives A; pulleys grow A<B<C → A fastest
  { answer: 4, confidence: "certain" },     // 11 steel, iron, copper, lead
  { answer: 0, confidence: "provisional" }, // 12 treadle — 'A' arrow not resolvable; X is faster (smaller, crossed belt)
  { answer: 1, confidence: "certain" },     // 13 bimetallic strip
  { answer: 2, confidence: "certain" },     // 14 X marks the chuck
  { answer: 3, confidence: "certain" },     // 15 plumb bob → straightness of walls
  { answer: 4, confidence: "certain" },     // 16 carburettor mixes air and petrol
  { answer: 0, confidence: "provisional" }, // 17 worm gear — worm-rotation arrow unclear; our art is drawn so A is correct
  { answer: 1, confidence: "certain" },     // 18 equal voltage regardless of R → parallel = B (labelled in our art)
  { answer: 1, confidence: "certain" },     // 19 off-centre glance → striker deflects up-right = B
  { answer: 1, confidence: "certain" },     // 20 water is less viscous than oil → coin sinks faster in B
  { answer: 2, confidence: "provisional" }, // 21 cuboid has most wall+roof+floor material — dims not measurable in scan
  { answer: 1, confidence: "provisional" }, // 22 vertical ceiling rod at the tip — vs full-span brace A, booklet intent unverified
  { answer: 2, confidence: "provisional" }, // 23 mirror image → C (arrow flips left, big dot to centre-right) — dots fiddly in scan
  { answer: 1, confidence: "certain" },     // 24 thick glass cracks under thermal shock → B
  { answer: 3, confidence: "certain" },     // 25 opposite sectors ×4 → 2 × 4 = 8
]
const M_STEMS: { text: string; options: string[]; figure?: string; requiresAsset?: boolean }[] = [
  { text: "On what material would this chisel be used?", options: ["Metal", "Cement", "Plastic", "Wood", "Glass"], figure: "ma-1" },
  { text: "If the gear on the left turns in the direction of the arrow, which way does the gear on the right turn?", options: ["A", "B", "C", "Alternately B and C", "The right gear does not turn"], figure: "ma-2" },
  { text: "What is this tool?", options: ["Drill", "Welding torch", "Paint sprayer", "Soldering gun", "Burning tool"], figure: "ma-3" },
  { text: "A device that does the same thing as a fuse is called a(n)", options: ["Circuit breaker", "Resistor", "Relay", "Alternator", "Voltage regulator"] },
  { text: "In which of the following situations is the least force needed at the arrow, to balance the lever?", options: ["A", "B", "C", "A and C", "B and C"], figure: "ma-5", requiresAsset: true },
  { text: "Where should the highway be elevated or raised?", options: ["A", "B", "C", "D", "E"], figure: "ma-6" },
  { text: "Which of the shelves will support the greatest weight?", options: ["A", "B", "C", "D", "They will all support the same weight"], figure: "ma-7" },
  { text: "If gear X is turning in the direction of the arrow, in what direction and how fast is Gear Y turning?", options: ["In direction A and the same speed as gear X", "In direction A and faster than gear X", "In direction B and slower than gear X", "In direction B and the same speed as gear X", "In direction B and faster than gear X"], figure: "ma-8" },
  { text: "Powdered graphite is useful as a(n)", options: ["Adhesive", "Thickening agent", "Fuel", "Lubricant", "Conducting agent"] },
  { text: "Which shaft is turning fastest?", options: ["A", "B", "C", "D", "They will all move at the same speed"], figure: "ma-10" },
  { text: "In which of the following lists are the four metals arranged from hardest to softest?", options: ["Steel, copper, iron, lead", "Steel, iron, lead, copper", "Iron, steel, copper, lead", "Iron, steel, lead, copper", "Steel, iron, copper, lead"] },
  { text: "In what direction and how fast is wheel X turning as the Treadle moves in the direction of the arrow?", options: ["Direction A and faster than wheel Y", "Direction A and slower than wheel Y", "Direction B and faster than wheel Y", "Direction B and slower than wheel Y", "Direction A and the same speed as wheel Y"], figure: "ma-12", requiresAsset: true },
  { text: "A basic part of many thermostats is", options: ["A knife switch", "A bimetallic strip", "A spring-activated relay", "An electromagnetic relay", "A photo-sensitive activating device"] },
  { text: "What do we call the part of this tool that is marked with an X?", options: ["Bit", "Housing", "Chuck", "Reduction", "Key"], figure: "ma-14" },
  { text: "This tool is used by a mason for:", options: ["Making holes", "Measuring thickness of wall", "Cementing bricks", "Examining the straightness of walls", "Writing on the walls"], figure: "ma-15" },
  { text: "An automobile carburettor", options: ["Provides a coupling between front and rear wheels", "Changes direct electrical current to alternating current", "Allows the rear wheels to turn at greater speed", "Converts the up and down motion of the pistons", "Allows the mixture of air and petrol"] },
  { text: "The shaft in the picture cannot move from one side to the other, but it can turn. As the shaft is turned in the direction shown by the arrow, which way will the gear turn?", options: ["A", "B", "Alternately A and B", "First A, then B", "The gear will not turn"], figure: "ma-17" },
  { text: "In which circuit is the voltage always the same across each resistor, regardless of the values of R1 and R2?", options: ["A", "B", "Both A and B", "Neither A nor B", "It depends on the resistance"], figure: "ma-18" },
  { text: "After hitting the black coin, which way is the striker likely to go on the carrom board?", options: ["A", "B", "C", "D", "It will rebound"], figure: "ma-19" },
  { text: "If the same kinds of coins are dropped in these two beakers, which coin will drown faster?", options: ["A", "B", "Both will take equal time", "Coin in beaker A will float", "Coin in beaker B will float"], figure: "ma-20" },
  { text: "Which of these wooden boxes is the heaviest?", options: ["A", "B", "C", "All are equal in weight", "B and C are the heaviest"], figure: "ma-21" },
  { text: "Which of these shelves will hold the maximum weight?", options: ["A", "B", "C", "All will hold equal weight", "A and B will hold same weight"], figure: "ma-22" },
  { text: "How will figure X look in the mirror? Choose from the figures given below:", options: ["A", "B", "C", "D", "E"], figure: "ma-23", requiresAsset: true },
  { text: "Which of these glasses will break easily when poured with very hot liquid?", options: ["A", "B", "Both will break at the same time", "Both can retain the hot liquid", "Hot liquid cannot be poured in A"], figure: "ma-24" },
  { text: "Find out the missing number:", options: ["17", "12", "32", "8", "40"], figure: "ma-25" },
]
const MECHANICAL: McqItem[] = M_STEMS.map((s, i) => ({ ...s, answer: MA_KEYS[i].answer }))

// ── Provisional keys — the founder-facing honesty list ───────────────────────
export interface ProvisionalKey { section: SectionKey; item: number; note: string }
export const PROVISIONAL_KEYS: ProvisionalKey[] = [
  { section: "NA", item: 8, note: "Stem unreadable in print; reconstructed as 4.8 ÷ 4 from the options" },
  { section: "NA", item: 18, note: "Printed '+' matches no option; operator corrected to '÷'" },
  { section: "NA", item: 19, note: "Printed stem defective; reconstructed as (1/2 + 1/8)² — needs original booklet" },
  ...REASONING.map((_, i) => ({ section: "RA" as SectionKey, item: i + 1, note: "Rule inferred, not from an official key" })),
  ...MA_KEYS.flatMap((k, i) => (k.confidence === "provisional"
    ? [{ section: "MA" as SectionKey, item: i + 1, note: "Solved from figure physics; booklet detail unresolvable in scan" }]
    : [])),
]

// ── Spatial Ability (SA) — 12 rows × 6 test figures · 6 min (timer hidden) ───
// Booklet model: each row has ONE Sample Figure and SIX Test Figures. A test
// figure is either the sample merely turned around (answer S = Same) or its
// mirror image, possibly also turned (answer R = Reversed). The 12 samples are
// rebuilt as SVG shape data from the extraction's row-theme descriptions (flag
// with grey triangle, notched disc with tab, banner, chevron, funnel, curvy L,
// hourglass with symbols, step polygon, skewed quad, partitioned diamond,
// pinwheel, rabbit-head blob). Every shape is chiral, and every test figure is
// RENDERED from its sample by rotate / mirror+rotate — so the S/R key is true
// by construction. Shapes are booklet-approximate; the official 72-item R/S key
// printed on norms-PDF page 6 should be transcribed so the mirror flags can be
// aligned to the paper form exactly (founder asset list).
export interface SpatialMarker {
  kind: "dot" | "circle" | "plus" | "square" | "fsquare" | "line"
  x: number
  y: number
  r?: number
  x2?: number
  y2?: number
}
export interface SpatialShapeDef {
  /** closed outline as an SVG path (viewBox 0 0 100 100) */
  outline: string
  /** grey-filled interior regions (the booklet's shaded cues) */
  greyFills?: string[]
  /** interior symbols that carry the chirality cue */
  markers?: SpatialMarker[]
}
export const SPATIAL_SHAPES: SpatialShapeDef[] = [
  { // row 1 — swallow-tail flag with grey triangle in the top-right corner
    outline: "M22 20 L80 20 L62 50 L80 80 L22 80 Z",
    greyFills: ["M80 20 L62 20 L71 35 Z"],
  },
  { // row 2 — disc with wedge notch + rectangular tab, dot near the top
    outline: "M78 34 A32 32 0 1 0 78 66 L64 58 L64 55 L90 55 L90 45 L64 45 L64 42 Z",
    markers: [{ kind: "dot", x: 42, y: 32, r: 3.5 }],
  },
  { // row 3 — bookmark banner: step cut upper-left, V-notch in the bottom edge
    outline: "M28 30 L44 30 L44 14 L72 14 L72 86 L50 68 L28 86 Z",
  },
  { // row 4 — thick chevron / squared L
    outline: "M20 80 L20 30 L40 30 L40 60 L80 60 L80 80 Z",
  },
  { // row 5 — funnel with a small + inside near the lower-right
    outline: "M44 12 L58 12 L58 36 L84 84 L18 84 L44 36 Z",
    markers: [{ kind: "plus", x: 62, y: 70, r: 5 }],
  },
  { // row 6 — curvy L/boot, open circle on the curled tip
    outline: "M28 22 C20 32 24 46 40 52 L64 60 L64 84 L80 84 L80 48 C62 40 48 32 40 20 Z",
    markers: [{ kind: "circle", x: 30, y: 24, r: 5 }],
  },
  { // row 7 — vertical hourglass with 4 interior symbols
    outline: "M30 15 L70 15 L56 50 L70 85 L30 85 L44 50 Z",
    markers: [
      { kind: "circle", x: 42, y: 29, r: 4 },
      { kind: "dot", x: 58, y: 29, r: 4 },
      { kind: "plus", x: 42, y: 71, r: 4.5 },
      { kind: "square", x: 56, y: 67, r: 4 },
    ],
  },
  { // row 8 — rectilinear staircase / S polygon (its chirality IS the cue)
    outline: "M30 15 L70 15 L70 45 L55 45 L55 85 L15 85 L15 55 L30 55 Z",
  },
  { // row 9 — skewed quadrilateral with a notch at the bottom-left
    outline: "M25 22 L78 16 L84 78 L40 84 L40 72 L28 72 Z",
    markers: [
      { kind: "fsquare", x: 68, y: 28, r: 4 },
      { kind: "circle", x: 38, y: 58, r: 4.5 },
    ],
  },
  { // row 10 — diamond with chord-cut left/right corners + 3 symbols
    outline: "M50 12 L88 50 L50 88 L12 50 Z",
    markers: [
      { kind: "line", x: 28, y: 34, x2: 28, y2: 66 },
      { kind: "line", x: 72, y: 34, x2: 72, y2: 66 },
      { kind: "fsquare", x: 21, y: 50, r: 3.5 },
      { kind: "circle", x: 79, y: 50, r: 3.5 },
      { kind: "plus", x: 50, y: 28, r: 4.5 },
    ],
  },
  { // row 11 — angular pinwheel with an internal line + filled dot
    outline: "M50 12 L62 38 L88 30 L70 55 L84 80 L52 68 L28 84 L34 58 L14 46 L40 42 Z",
    markers: [
      { kind: "line", x: 62, y: 38, x2: 70, y2: 55 },
      { kind: "dot", x: 31, y: 76, r: 3.5 },
    ],
  },
  { // row 12 — rabbit-head blob: rounded lobe right, two-prong slot upper-left
    outline: "M20 84 L20 32 L26 20 L32 20 L32 46 L38 46 L38 20 L46 20 C62 14 76 24 80 38 C86 48 84 62 78 70 C72 80 58 88 44 84 Z",
  },
]

export interface SpatialTrial {
  /** row index 0-11 → SPATIAL_SHAPES[shape] is the row's Sample Figure */
  shape: number
  /** rotation applied to the test figure (degrees) */
  rot: number
  /** true = Reversed (mirror, possibly also turned) — correct answer R */
  mirrored: boolean
}
// Per-row S/R assignments. Orientation/chirality follow the extraction's
// per-item observations where they were legible (e.g. 41 = mirror+180 matches
// the described symbol layout; 51 ≈ upright same; 55 = plain 180 turn; 72 =
// near-mirror of the sample); the rest are balanced within the row. 36 S / 36 R
// overall. Keys stay correct by construction whatever the assignment.
const ROW_TRIALS: { rot: number; mirrored: boolean }[][] = [
  [ { rot: 135, mirrored: true }, { rot: 225, mirrored: false }, { rot: 90, mirrored: false }, { rot: 180, mirrored: true }, { rot: 45, mirrored: false }, { rot: 315, mirrored: true } ],
  [ { rot: 60, mirrored: false }, { rot: 120, mirrored: true }, { rot: 300, mirrored: false }, { rot: 90, mirrored: true }, { rot: 270, mirrored: true }, { rot: 180, mirrored: false } ],
  [ { rot: 45, mirrored: false }, { rot: 135, mirrored: false }, { rot: 180, mirrored: true }, { rot: 315, mirrored: true }, { rot: 90, mirrored: false }, { rot: 270, mirrored: true } ],
  [ { rot: 90, mirrored: true }, { rot: 180, mirrored: false }, { rot: 270, mirrored: true }, { rot: 135, mirrored: false }, { rot: 315, mirrored: false }, { rot: 45, mirrored: true } ],
  [ { rot: 120, mirrored: false }, { rot: 45, mirrored: true }, { rot: 210, mirrored: true }, { rot: 180, mirrored: false }, { rot: 300, mirrored: true }, { rot: 135, mirrored: false } ],
  [ { rot: 90, mirrored: true }, { rot: 45, mirrored: true }, { rot: 270, mirrored: false }, { rot: 135, mirrored: false }, { rot: 180, mirrored: true }, { rot: 315, mirrored: false } ],
  [ { rot: 90, mirrored: false }, { rot: 45, mirrored: true }, { rot: 315, mirrored: false }, { rot: 90, mirrored: true }, { rot: 180, mirrored: true }, { rot: 135, mirrored: false } ],
  [ { rot: 45, mirrored: true }, { rot: 315, mirrored: false }, { rot: 90, mirrored: false }, { rot: 135, mirrored: true }, { rot: 225, mirrored: true }, { rot: 180, mirrored: false } ],
  [ { rot: 25, mirrored: false }, { rot: 315, mirrored: true }, { rot: 10, mirrored: false }, { rot: 90, mirrored: true }, { rot: 45, mirrored: false }, { rot: 135, mirrored: true } ],
  [ { rot: 180, mirrored: false }, { rot: 45, mirrored: true }, { rot: 90, mirrored: false }, { rot: 135, mirrored: true }, { rot: 270, mirrored: false }, { rot: 315, mirrored: true } ],
  [ { rot: 30, mirrored: true }, { rot: 90, mirrored: false }, { rot: 135, mirrored: true }, { rot: 225, mirrored: false }, { rot: 180, mirrored: false }, { rot: 315, mirrored: true } ],
  [ { rot: 90, mirrored: false }, { rot: 150, mirrored: true }, { rot: 45, mirrored: false }, { rot: 180, mirrored: false }, { rot: 135, mirrored: true }, { rot: 15, mirrored: true } ],
]
export const SPATIAL_TRIALS: SpatialTrial[] = ROW_TRIALS.flatMap((row, r) =>
  row.map(({ rot, mirrored }) => ({ shape: r, rot, mirrored })))

export interface ClericalPair { left: string; right: string; same: boolean }

// ── Clerical Ability (CL) — 72 pairs · 3 min (timer hidden) ──────────────────
// The 72 booklet-verbatim comparison pairs (case matters; item 10's left entry
// really does start with a capital J in the booklet). `same` is derived by
// string equality, so the key can never disagree with what is shown.
const CLERICAL_RAW: [string, string][] = [
  ["1013295", "1012395"], ["krqpdisu", "krqpdisu"], ["79318453", "79318435"], ["KLSQAEPD", "KLSQAEPD"],
  ["pdesqidt", "pdesqidt"], ["JQRASMNP", "JQRASNMP"], ["RMAPIQUV", "RMAPIQUV"], ["jnlvupdi", "jnluvpdi"],
  ["59412675", "59412765"], ["Jlnvoprdi", "jlvnoprdi"], ["3645179", "3645179"], ["KRINQUSR", "KRINQUSR"],
  ["VFGARTUX", "VFGARUTX"], ["732837914", "732387914"], ["JVOPIMURA", "JVOPIMURA"], ["bxvinygru", "bxvinygur"],
  ["784513962", "784513926"], ["ARQULEWVP", "ARQULEVWP"], ["mnovprydc", "mnovprdyc"], ["793148252", "793148252"],
  ["XYBWUTYR", "XYBWUTYR"], ["zrmpfdgh", "zrmpfgdh"], ["825731496", "825731496"], ["HUMPRJEQ", "HUMPREJQ"],
  ["derpqmljn", "derpqmljn"], ["592614826", "592614286"], ["PDLMARQUJ", "PDLMARQUJ"], ["iqrspdelm", "iqsrpdelm"],
  ["JMNVUPAL", "JMNUVPAL"], ["913826574", "913826574"], ["cpdekrsqb", "cpdekrsqb"], ["AXPRWNBG", "AXPRWNBG"],
  ["294733506", "294733506"], ["CDJLQRSKN", "CDJLQSRKN"], ["reqlmjxap", "reqlmxjap"], ["ZYBMOPRQS", "ZYBMOPRQS"],
  ["3814569", "3814659"], ["qmlavwn", "qmlavwn"], ["ERYNODFP", "ERYNODFP"], ["187935824", "187953824"],
  ["NMRAPCUH", "NMRAPCUH"], ["fvbosdrn", "fvbosrdn"], ["631425719", "631425719"], ["TRCHLMOV", "TRCHMLOV"],
  ["cgierduj", "cgierduj"], ["DNWLRVAX", "DNWLRAXV"], ["hijuvmlpr", "hijuvmlpr"], ["GVAPORJM", "GVAPORJM"],
  ["81423596", "81243596"], ["KIRJSBMO", "KIRJSBMO"], ["oqxjarpd", "oqxjaprd"], ["64937215", "64937215"],
  ["XBAJZPOR", "XBAJZPOR"], ["qzbrsaqt", "qzbrsaqt"], ["63495712", "63459712"], ["PMAZRSTQE", "PMAZRSTQE"],
  ["bcxpudef", "bcxpudef"], ["51936247", "51936247"], ["JXRASPUV", "JXRASPVU"], ["drpewye", "drepwye"],
  ["4562908", "4569208"], ["MDACPURN", "MDACPURN"], ["lmnrdopsa", "lmnrdapso"], ["271659325", "271695325"],
  ["IPRSABJM", "IPRSABJM"], ["brpdavul", "brpdauvl"], ["91352748", "91352748"], ["KRIMNFOJ", "KRINMFOJ"],
  ["61825739", "61825739"], ["MPORSJNV", "MPORSJNV"], ["rbapdnuz", "rbapdnuz"], ["LKUVMPOZ", "LKVUMPOZ"],
]
export const CLERICAL_PAIRS: ClericalPair[] = CLERICAL_RAW.map(([left, right]) => ({ left, right, same: left === right }))

export interface AbilitySection {
  key: SectionKey
  label: string
  minutes: number
  kind: "mcq" | "closure" | "spatial" | "clerical"
  normed: boolean
  /** speeded subtests hide the countdown (paper form: "do not disclose duration") */
  hideTimer?: boolean
  /** one-line "what this measures" for the section intro */
  measures: string
  /** how to answer, taught before the clock starts */
  how: string
  items?: McqItem[]
  spatial?: SpatialTrial[]
  clerical?: ClericalPair[]
}

// ── Battery ──────────────────────────────────────────────────────────────────
export const ABILITY_SECTIONS: AbilitySection[] = [
  {
    key: "CA", label: "Closure Ability", minutes: 5, kind: "closure", normed: true,
    measures: "Completing partial information — recognising a whole word from a degraded image of it.",
    how: "A word appears with parts of its letters missing. Work out the word, then choose the ONE jumbled option that uses exactly the same letters. If you are not sure, mark your best guess. Keys 1–5 select.",
    items: CLOSURE,
  },
  {
    key: "VA", label: "Verbal Ability", minutes: 7.5, kind: "mcq", normed: true,
    measures: "Vocabulary and verbal meaning — the closest synonym, then the matching proverb.",
    how: "First fifteen: choose the word closest in meaning. Last nine: choose the saying that means the same as the proverb. If you are not sure, mark your best guess. Keys 1–5 select, Enter confirms.",
    items: VERBAL,
  },
  {
    key: "NA", label: "Numerical Ability", minutes: 5.5, kind: "mcq", normed: true,
    measures: "Arithmetic and everyday quantitative problem-solving — no calculator.",
    how: "Work each problem on a rough sheet, then choose the answer. No calculators. If you are not sure, mark your best guess.",
    items: NUMERICAL,
  },
  {
    key: "RA", label: "Reasoning Ability", minutes: 5, kind: "mcq", normed: true,
    measures: "Abstract rule-finding — spotting the set of letters that breaks the pattern.",
    how: "Four of the five letter-sets follow one hidden rule; one does not. Choose the odd one out. If you are not sure, mark your best guess. Keys 1–5 select.",
    items: REASONING,
  },
  {
    key: "SA", label: "Spatial Ability", minutes: 6, kind: "spatial", normed: true, hideTimer: true,
    measures: "Mental rotation — recognising a shape when it is turned, versus when it is turned over.",
    how: "Each item shows the row's Sample Figure and one Test Figure. If the Test Figure is the SAME figure merely turned around, answer S. If it is REVERSED — turned over like a mirror image, possibly also turned around — answer R. Work as fast as you accurately can; guess if unsure.",
  },
  {
    key: "MA", label: "Mechanical Ability", minutes: 9, kind: "mcq", normed: true,
    measures: "Mechanical facts and principles — gears, levers, tools, circuits and forces.",
    how: "Answer each question about mechanical facts and principles. Sometimes there is a picture with the question; sometimes not. If confused, go with your first thought. Keys 1–5 select.",
    items: MECHANICAL,
  },
  {
    key: "CL", label: "Clerical Ability", minutes: 3, kind: "clerical", normed: true, hideTimer: true,
    measures: "Speed and accuracy with detail — checking whether two entries match.",
    how: "Two entries appear side by side. Press S if they are exactly the SAME, D if they are different in any way. Work as quickly as you can without sacrificing accuracy.",
  },
]

export const ABILITY_TOTAL_MINUTES = ABILITY_SECTIONS.reduce((a, s) => a + s.minutes, 0)

export function sectionItemCount(s: AbilitySection): number {
  return s.kind === "spatial" ? SPATIAL_TRIALS.length
    : s.kind === "clerical" ? CLERICAL_PAIRS.length
    : s.items!.length
}

/** Score one section from its answer array (null = unanswered). MCQ/closure
 *  answers are option indices; spatial answers are "S" (same) / "R" (reversed);
 *  clerical "S"/"D". */
export function rawScore(section: AbilitySection, answers: (number | string | null)[]): { raw: number; attempted: number } {
  let raw = 0, attempted = 0
  const n = sectionItemCount(section)
  for (let i = 0; i < n; i++) {
    const a = answers[i]
    if (a == null) continue
    attempted++
    if (section.kind === "spatial") { if ((a === "R") === SPATIAL_TRIALS[i].mirrored) raw++ }
    else if (section.kind === "clerical") { if ((a === "S") === CLERICAL_PAIRS[i].same) raw++ }
    else { if (a === section.items![i].answer) raw++ }
  }
  return { raw, attempted }
}
