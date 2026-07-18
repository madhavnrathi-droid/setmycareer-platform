# SetMyCareer — Mined Recommendation Patterns

A human-readable synthesis of the patterns mined from SetMyCareer's recommendation
spreadsheets and counselling notes. This is the narrative companion to the typed
grounding module at `counselor/src/intelligence/data/career-patterns.ts`, which the
report generator and AI chatbot/voicebot import to keep their suggestions grounded
in what SetMyCareer's own engine and counsellors actually do.

**All figures below are mined aggregates — indicative, directional defaults, not
guarantees. See [Data caveats](#data-caveats).**

## Sources

| Source | What it gave us |
|---|---|
| `Copy of Career Codes for Automation.xlsx` | 610 job-role rows (Sheet1); the 30 Job-Group × 7-Stream affinity matrix (Sheet6); the report template (Sheet3) |
| `Stream_to_Degree_Mapping_India_Corrected.xlsx` | Master degree universe: 313 programs, 205 degrees, per-stream eligibility |
| `India_Bachelors_Degrees_Citywise_Seed.xlsx` | 45 named institutions, citywise; degree specializations |
| Bachelor's Degrees — Arts / Science / Commerce workbooks | Stream-specific degree detail with salary & careers |
| `non_conventional_degree_courses_india.xlsx` | 117 mostly any-stream-eligible courses across 10 categories |
| Bachelor's Career Roles — Arts/Commerce/PCM-PCB-PCMB workbooks | 225 degree→role→salary→demand records (deduped) |
| Personality calibration set | 243 respondents × 18 subfactors (JCE-inspired similarity) |
| Counselling notes | 10 demo SOAP notes (`mock.ts`) + 49 live comments across 22 clients |

---

## 1. Recurring recommendations per stream

The real stream→role linkage is **not** a column on the role sheet — Sheet1's
`Stream` field is blank for ~590/610 roles. It lives in **Sheet6, a Job-Group ×
Stream affinity matrix** (scored 1–10). A score of **≥7 is a strong fit; 10 is a
signature fit.** Each stream's roles are attributed via the job groups that score
≥7 for it.

| Stream | Signature (10/10) job groups | Canonical degrees | Eligible programs (of 313) |
|---|---|---|---|
| **Science PCM** | Engineering, Machining, Construction, Maths, IT, Protective Services, Physical Science (all 10) | B.Tech, B.Sc, B.Des, BBA, B.Com | 223 |
| **Science PCB** | Health Services, Nature/Agri, Life Science, Physical Health, Medical Diagnosis (all 10) | B.Sc + health block (MBBS, BDS, BAMS, BHMS, BPT, Nursing, Optometry) | 194 |
| **Science PCMB** | Nature/Agri, Physical Science (9); Engineering, Construction, Maths, IT, Health (8) | B.Tech + B.Sc + full Health & Allied | **247 (widest)** |
| **Commerce w/ Maths** | Financial & Business Services (10); Merchandising, Clerical, Sales (8) | B.Com, BBA, B.Sc (data/stats), IPM | 145 |
| **Commerce w/o Maths** | Merchandising, Clerical, Sales, HR, Management (all 10); Financial Services (9) | B.Com, BBA, B.Des, BFA | 142 |
| **Arts** | HR, Counseling, Law, Social Service, Social Science, Primary Ed, Writing, Fine Art, Entertainment (all 10) | BA family, B.Sc (soft), B.Des, BSW, BBA | 148 |
| **Arts with Maths** | Social Science, Primary Ed, Writing, Music (9); Clerical, HR, Law (8) | BA family, BA Maths (Hons), B.Sc, B.Des | 152 |

**What recurs everywhere:** a **Reasoning + Numerical + Verbal** ability triad is
the entry ticket for nearly every role; **Closure** and **Spatial** distinguish the
specialised ones. **B.Tech / B.Sc / B.Des / BBA / B.Com** are the canonical degree
backbone in every stream view. The recurring personality cluster is
Extroverted · Independence · Industriousness · Openness ("EIIO").

**Job groups by raw role count (of 610):** Engineering & Technical Support (76),
Teaching & Instruction (75), Human Resources (67), Management & Administration (66),
IT & Computers (54), Health Services (54), Nature/Agri (53), Physical Science (52).

---

## 2. Profile archetypes → recommendations

From the **243-respondent** calibration set: the distribution is strikingly flat —
no dominant trait, and profiles are broad, not specialised (only **0.8%** are
single-factor specialists; 67.9% draw their top-3 from three different factors).
Archetypes therefore exist at the **factor / factor-pair level**, not the literal
trio. Six factor-led personas recur:

| Archetype | Lead factor (share) | Maps to education | Maps to job groups |
|---|---|---|---|
| **The Anchor** | Team & Composure (19.8%) | Social Service, Education, Health, Behavioral Science | HR, Social Service & Mental Health, Counseling, Teaching |
| **The Individualist** | Independence & Self-Image (19.3%) | Art & Architecture, Communication Arts, Business | Sales, Entertainment, Commercial Art, Law |
| **The Organizer** | System & Discipline (17.3%) | Business, Mathematical Science, Computer Science | Clerical/Admin, Financial Services, IT, Mathematics |
| **The Driver** | Achievement Drive (14.8%) | Science, Engineering, Business | Management, Engineering Support, Financial Services |
| **The Explorer** | Learning Orientation (14.4%) | Science, Engineering, Behavioral Science | Research (Social/Life/Physical), IT, Writing |
| **The Connector** | People Energy (14.4%) | Performing Arts, Communication Arts, Business | Sales, Entertainment, Music, Management |

**Achievement Drive is the universal connector** — it co-occurs with every other
factor (top pair: Achievement × Team & Composure, 21.4%) and overlays onto every
archetype rather than standing alone. The bridge between personality and interest
space is the JCE WorkStyle scales (Academic Achievement, Accountability, Endurance,
Independence, Interpersonal Confidence, Job Security, Organization).

**Rare / standout signals** (flag as genuinely distinctive): Assertive Leadership
as the single strongest trait (2.5%), Orderliness as #1 (3.3%), and single-factor
specialists (0.8%).

---

## 3. Standout high-value paths

Demand mix across 225 records: **High 120 · Very High 77 · Moderate 28** — no
"Low"-demand roles appear, so the set skews in-demand.

| Role | Degree | Stream | Range (₹ LPA) | Demand |
|---|---|---|---|---|
| Quantitative Analyst | BBA (Quant Finance) | Commerce + Maths | 6 – 50+ | Very High |
| Cloud Solutions Architect | B.Tech CSE | PCM | 9.1 – 47 | Very High |
| Quantitative Analyst | BA Maths (Hons) | Arts + Maths | 6 – 45+ | Very High |
| Investment Banker | B.Com Honours | Commerce + Maths | 6 – 40+ | Very High |
| Specialist Doctor | MBBS | PCB | 6 – 35+ | Very High |
| Chartered Accountant | B.Com Honours | Commerce + Maths | 3 – 35+ | Very High |
| Data Scientist | B.Tech CSE | PCM | 4 – 29 | Very High |
| Civil Service Officer (IAS/IPS/IFS) | Any degree + UPSC | Arts / any | 5.6 – 25 | Moderate |

**The headline pattern:** the very top ceilings cluster in **(a) maths-based finance**
(Quant, IB, CA, Actuary) and **(b) CS/cloud/data** — both require a quantitative
degree, and both are the twin engines of "Very High" demand. **Adding Maths to an
Arts/Commerce student is the single biggest lever**, lifting ceilings from ~₹25 LPA
toward ₹45–50 LPA. Medicine (MBBS specialist) is the lone PCB entry at the top;
Civil Services is the highest-pay non-quant route, reachable from many Arts degrees.

**Stream ceilings:** Commerce+Maths ₹50 LPA max / ₹18 median (best ROI) · Arts+Maths
₹45 / ₹14 · PCM ₹47 / ₹11.5 · PCMB-hybrid ₹30 / ₹16 · PCB ₹35 / ₹10 ·
Commerce-noMaths & Arts-noMaths both cap ₹25 LPA.

**Safe, portable bets** (many degrees route into them): Financial Analyst (5
degrees), Software Developer (5), Business Analyst (4); then CA, Actuary, Tax
Consultant, Civil Service Officer (3 each). The other ~59% (132 roles) are
single-degree, high-specialisation paths with a higher switching cost.

---

## 4. The college / entrance universe

**313 programs · 205 distinct degrees.** PCMB is the master key (247 eligible
programs); adding Maths to Arts/Commerce adds only ~4–7 programs but unlocks the
high-value quant ceilings above.

- **Canonical degrees overall:** B.Tech (36) > B.Sc (25) > B.Des (14) > BBA (11) >
  B.Com (10) > B.Voc (5).
- **CUET-UG is the great equalizer** — the single most common gateway across every
  stream. Specialised exams gate only their niche: **JEE Main** (engineering →
  NITs/IIITs, qualifier for **JEE Advanced** → IITs), **NEET-UG** (medical/AYUSH),
  **CLAT / AILET / LSAT-India** (law), **NATA / JEE Paper-2** (architecture),
  **UCEED / NID DAT / NIFT** (design), **NCHM JEE** (hotel mgmt), **IMU-CET**
  (merchant navy), **CUET ICAR-UG** (agriculture), **State CETs**.
- **Durations:** 4 years (engineering/design) and 3 years (arts/commerce/science)
  dominate; 5–5.5 years for professional/integrated (MBBS, B.Arch, integrated law).
- **Institution hubs (named exemplars):** Bengaluru, New Delhi, Mumbai, Chennai,
  Hyderabad, Pune, Kolkata (5 each), then Ahmedabad and Jaipur. Standout names:
  IISc, IITs, ISI Kolkata, IISER Mohali, IIIT-H (tech/science); IIMs, NMIMS,
  Symbiosis, Christ (management); NLSIU, NLU Delhi (law); NID, NIFT, CEPT, FTII
  (design/media); TISS, JNU, Jamia, DU (social sciences); NDA Pune (defence).
- **Non-conventional catalog (117 courses, mostly any-stream eligible)** — the
  widest open door for Arts/Commerce students without Maths: B.Sc Nautical Science /
  Merchant Navy (IMU-CET), B.Sc Hospitality / IHM (NCHM JEE), BBA Aviation, B.Plan /
  B.Arch, BA Criminology, B.Sc Event Management, the B.Voc ladder (with exit awards),
  integrated 5-yr law, B.Des UX/Interaction, B.F.Sc Fisheries.

---

## 5. Note / "what to study — next action" patterns

Two **distinct** note shapes were mined.

**Demo SOAP notes (`mock.ts`)** — clean single-line `S:/O:/A:/P:`. The `P:` line is
the "next action" engine: 2–3 semicolon-separated **concrete deliverables**,
future-dated to the next session, usually pairing a career action with a wellbeing
guardrail. Recurring types (by frequency): wellbeing/boundary/self-care (7),
artifact/collateral — CV/brag-doc/evidence-file (5), interview/negotiation prep (3),
reframe/explore options (3), structure/planning/targeting (3), ship capstone (2),
networking outreach (2). **Structural signature:** quantified-and-small ("one" mock
interview, "two" applications, "one-week" log), always a deadline, always a
counsellor-side prep step; clinical screens (GAD-7/PHQ-2, SI safety, meds review)
baked into plan lines.

**Live real notes (API, read-only)** — a completely different shape: a free-text
running intake log, telegraphic, blending client biography + parent remarks +
observed interests + a triage decision. **The live "next action" is overwhelmingly
a sales/routing decision, not a study plan:** which package to sell (Premium /
Advance / True North / Big Picture, 21 mentions) and which counsellor runs the first
session (17). Genuine "what to study" guidance is rare and high-level (NIOS board
switch, foundational basics over shortcuts, backend→full-stack reskill, "is MCA/MBA
worth it", "career 10 years down the line" vs jumping to a Masters abroad).

**Demo vs Live:** Demo `P:` is forward-looking homework **for the client** (a
deliverable); Live is an internal navigator memo to sell the right **product + a
person** — the deep study plan happens later, in the paid sessions. Shared themes:
confidence/impostor gaps, career-break reframing, switch/clarity-seeking,
burnout, parental pressure on stream choice. **Implication for the bot/report:**
produce the demo-style deliverable plan (quantified, dated, paired with a wellbeing
guardrail); let the live patterns inform tone and triage, not the study content.

The Sheet3 report scaffold the engine emits: **Step-1 flow** — Check Job Group →
Check Work Preference → Give Job Options → Give Related Education Options; **Step-2**
a fitment table (Job Role | Ideal vs Present Personality Score | Effort | Ideal vs
Obtained Ability Score | Effort | **Fitment Score**), e.g. *Software Professional* →
Reasoning High / Numerical Medium / Closure Medium → Fitment 0.7.

---

## Data caveats

- All figures are **mined aggregates** from seed spreadsheets, **not a full client
  corpus** — directional defaults, not guarantees.
- Sheet1's `Stream` column is blank for ~590/610 roles; stream→role links are
  **derived** from the Sheet6 affinity matrix (≥7 = strong fit), not stated.
- Recommended-degree strings on roles are sparse (~16 rows). The dense, reliable
  dimensions are **Job Group** then **abilities**; treat degree counts as indicative.
- Personality archetypes rest on a **243-respondent** calibration (one fewer than
  the 244 stated) and a **transparent JCE-inspired similarity model — not Sigma's
  proprietary key**.
- Salary ranges (₹ LPA) and demand labels are parsed from the role workbooks; **no
  "Low"-demand roles appear**, so the set skews toward in-demand paths.
- Note patterns rest on a **small sample** — 10 demo SOAP notes + 49 live comments
  across 22 clients — illustrative of style, not statistically representative.
