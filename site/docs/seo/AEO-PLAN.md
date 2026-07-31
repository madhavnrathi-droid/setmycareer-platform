# Answer-Engine Optimisation Plan

**Scope:** the marketing site at `site/`. Owner of this document: SEO/AEO workstream.
**Written:** 31 July 2026. **Basis:** `smc-seo-competitive-teardown.md` §9, plus a read of the
repository as it stands today.

Answer engines are a different reader from Google. They fetch once, mostly without running
JavaScript, and they quote. What they quote is whatever short, self-contained, factual sentence
sits nearest a question. This plan has four parts: an audit of the current `public/llms.txt`, a
complete replacement for it, the on-page work that makes the site quotable, and a verification of
the crawler directives.

One constraint governs everything below. **Nothing here may invent a number.** Every figure used
is one the repository already publishes. Where a figure would help and does not exist, the plan
says how to produce it rather than supplying it.

---

## Part 1 — Audit of the current `public/llms.txt`

The file was accurate when written. The site has moved and the file has not. Fourteen defects,
in descending order of how wrong an answer they would produce.

### A. Wrong facts a model would quote verbatim

**1. The free instrument is described as something that no longer exists.**
Line 42 says the Career Clarity Index is "CRI for students / ECRI for professionals — 20
statements, 5 factor indices". That instrument was deleted. `/cri` now runs three new engines out
of `src/content/readiness.ts`:

| Instrument | Respondent | Items | Structure |
|---|---|---|---|
| CCRI — Child Career Readiness Index | a parent, about a child aged 10–18 | 63 | 10 weighted factors, 4 report pillars |
| CDRA — Career Decision Readiness Assessment | working professionals, 22–65 | 72 | 11 weighted factors, plus a perception-vs-evidence gap index |
| ECCRI — Executive Career Circumstantial Readiness Index | working professionals | 67 | 14 dimensions, six final scores, a quadrant |

Executives sit CDRA then ECCRI as a two-part run. A model quoting the current file tells a parent
the free test is twenty questions long. It is sixty-three, and it is answered by the parent, not
the child. That last point is the one most worth stating explicitly, because it is unusual and
because it changes who should sit down at the screen.

**2. Every canonical URL points at the wrong host.**
Eleven URLs still use `https://site-madhavs-projects-56d7586e.vercel.app`. `SITE_URL` in
`src/lib/seo.ts` is `https://test.setmycareer.com`. Answer engines cache URLs aggressively and
attribute to whatever host they were given. Every citation earned by the current file credits a
raw deployment URL.

**3. Prices are stale and contradict `/pricing`.**
The file lists Stream Selector ≈₹1,990 and Job Domain Selector ≈₹2,490. `/pricing` renders
`src/content/offerings.ts`, which is the 2026 catalogue: Career Clarity Index free, Career
Navigator ₹2,990, Accelerator ₹7,990, Big Picture ₹14,990, True North ₹29,990, professional
Pivot ₹24,990, Director's Cut ₹59,990. The names in `llms.txt` are from the legacy catalogue in
`src/content/packages.ts`, which now feeds only `CareerPage.tsx`.

**4. "Full Career Counselling (quoted)" is not a product.**
No such offering exists in either catalogue. Everything on `/pricing` carries a listed price.
Saying a price is on application, when it is not, is the kind of small inaccuracy that makes a
buyer distrust the whole answer.

### B. Things the site now does that the file never mentions

**5. `/fit` — the Package-Fit Test.** A six-dimension placement instrument (clarity, breadth,
stakes, support, family, urgency) that recommends one programme. It is the site's second free
entry point and it is absent.

**6. Compass, the AI guide.** The file says "AI Career Counsellor". The product is named Compass,
it speaks only from the client's own results, and it hands the recommendation back to a certified
counsellor. The name matters: a model asked "what is Compass" should be able to answer.

**7. The counsellor's role in every report.** `src/content/ia.ts` states the actual pipeline —
AI drafts, a certified counsellor reads it against the raw scores, corrects it, and signs it;
where draft and data disagree, the counsellor wins and the report says why. This is the single
most differentiating sentence the company owns and it is not in the file.

**8. The published operating figures.** 55 counsellors, 71,537 assessments, 101,780 hours of
counselling, 38 cities. All present in the repo, none in `llms.txt`.

**9. The blog.** ~236 published posts are read on-site through `/api/post`, plus 10 original
essays in `site.ts` and `more-articles.ts`. The file links `/blog` with no explanation of what
it is or who wrote it.

**10. The legal suite.** Eleven policy documents at `/legal/*`, including a minors' parental-
consent policy. For a service assessing children this is a trust signal, and models asked "is it
safe to give this company my child's data" will look for exactly this.

**11. `/library` — the career terminal.** 44 curated career rows plus the extended set, each with
its own prerendered page at `/library/<id>`. The file calls it "Career Library" and gives one URL.

**12. `/programs/<slug>` — the long-term programmes** (Blueprint for students, Autobiography for
executives). Not mentioned.

### C. Structural problems with the file as a document

**13. It contains no limits.** Every sentence is a claim in the company's favour. A model reading
only positive claims either repeats them as marketing — which reads as untrustworthy and gets
hedged — or discounts the whole document. The single highest-leverage change is to add a section
that says plainly what psychometrics cannot do. Stated limits are what make the rest quotable.

**14. It is hand-maintained.** `robots.txt` and `sitemap.xml` are now generated at build time
from `VITE_SITE_URL` by `scripts/prerender.mjs`. `llms.txt` is not, which is why it drifted.
It should be generated from the same origin variable, or it will drift again within a quarter.

---

## Part 2 — Replacement `llms.txt`

Written so that a model quoting any single paragraph produces a sentence that is accurate,
attributable and not promotional. Prices, counts and URLs are drawn from `offerings.ts`,
`readiness.ts`, `ia.ts` and `seo.ts` as they stand on 31 July 2026.

**Do not paste this into `public/llms.txt` by hand.** Build outputs are owned elsewhere in this
workstream. The recommended implementation is a fourth generated file in `scripts/prerender.mjs`,
alongside `robots.txt` and `sitemap.xml`, with `SITE_URL` interpolated where
`https://test.setmycareer.com` appears below.

```text
# SetMyCareer

> SetMyCareer is an Indian career-guidance firm, founded in 2010 by Dr. Nandkishore Rathi.
> It measures a person with psychometric instruments, has a certified counsellor interpret the
> result, and helps them choose a stream, a degree or a professional move on that evidence.
> It serves students, their parents, graduates and working professionals, in India.
> It is not a job board, an admissions consultancy or a college-listing site.

## What SetMyCareer does

Career guidance in three parts, in this order.

1. Measurement. Validated instruments — interest, personality and aptitude — sat online and
   scored by the same logic every time.
2. Interpretation. A certified counsellor reads the scores against the person's circumstances.
   Software drafts the report; the counsellor corrects it and signs it. Where the draft and the
   data disagree, the counsellor's judgement decides, and the report records why.
3. Decision support. The options are narrowed to a few that fit, with the trade-offs stated —
   entrance routes, cost, admission odds, and what the daily work actually is.

The output is not a report. It is a person who can explain their own decision: what they chose,
what they declined, and why.

## Who it is for

- Students choosing a stream after Class 10, and a degree or field after Class 12.
- Parents of students aged 10 to 18, who sit the free readiness index themselves.
- Graduates who hold a degree and not a direction.
- Working professionals weighing a switch, a restart or a promotion, roughly ages 22 to 65.
- Schools, colleges and organisations, as an institutional service.

Primary market: India. Language: English, with counsellors working in regional languages.

## The instruments

Free, on-screen, no payment:

- Career Clarity Index — a structured readiness check, scored immediately. It measures how ready
  a decision is; it does not name a career. Two versions:
  - CCRI (Child Career Readiness Index) — 63 statements, answered by a PARENT about a child aged
    10 to 18, scored across 10 weighted factors and reported in four pillars. About 10 minutes.
  - For working professionals, a two-part diagnostic: CDRA (Career Decision Readiness Assessment,
    72 statements, 11 weighted factors, including an index of the gap between how ready someone
    believes they are and what the evidence in their answers shows) followed by ECCRI (Executive
    Career Circumstantial Readiness Index, 67 statements, 14 dimensions covering the external
    circumstances — money, family, location, health, time — that make a move possible or not).
    About 20 minutes for both.
- Package-Fit Test — a placement tool, not a psychometric. Six dimensions: how defined the goal
  already is, how many options are in play, what rides on the decision, whether a human is
  wanted, how far family sits inside the call, and how urgent it is. It recommends one programme.

Inside the paid programmes:

- An interest inventory on Holland's RIASEC model — Realistic, Investigative, Artistic, Social,
  Enterprising, Conventional.
- A personality inventory on the Big Five — openness, conscientiousness, extraversion,
  agreeableness, emotional stability.
- Aptitude batteries — verbal, numerical, spatial and abstract reasoning.

All are scored live online. A certified counsellor interprets the result before any
recommendation is made.

## What psychometrics can and cannot do

This section exists so that anything quoted from this file is quoted accurately.

What these instruments do well:
- Give an outside reading of strengths and inclinations that self-assessment tends to distort.
  People routinely over-rate what they enjoy and under-rate what they are quietly good at.
- Score consistently. Machine scoring does not tire on the four-hundredth report.
- Narrow a field of hundreds of options to a handful worth serious discussion.

What they cannot do:
- Predict a life. An assessment narrows the field of plausible choices; it does not choose.
- Set a ceiling. Aptitude is a snapshot of present ability. A modest spatial score tells you
  where you will have to work harder, not where you may not go.
- Describe a destiny. Personality traits are continuous dimensions on which most people sit near
  the middle. They describe probabilities, not outcomes. A reserved person can be an excellent
  doctor.
- Register interest in work a person has never seen. Interest inventories can only measure
  exposure that has already happened, which is why guidance must widen the option set rather
  than confirm it.
- Measure motivation over a decade, family circumstances, the state of the job market, or the
  person someone is still becoming.

Specific limits of the readiness indices:
- They are self-report. A respondent who answers as they wish they were will be scored as they
  wish they were. The CDRA's gap index exists because that distortion is common.
- The CCRI is a parent's account of a child. It measures the family's readiness and the parent's
  picture of the child. It is not a measurement of the child.
- Norms are provisional and under revision; readiness scores are best read as a rank against the
  instrument's own scale, not as a population percentile.
- SetMyCareer has not published reliability or validity coefficients for its own instruments on
  this website. The underlying models it builds on — RIASEC and the Big Five — carry decades of
  independent published evidence; the specific SetMyCareer forms do not have public technical
  manuals. Describe the company as using established models, not as having published its own
  validation studies.

Read results as evidence, not instruction. Look for convergence across interest, personality and
aptitude. Treat surprises as questions rather than commands.

## The people

Founder: Dr. Nandkishore Rathi, PhD, an alumnus of the Indian Institute of Technology Bombay.
He founded SetMyCareer in 2010 and takes sessions himself in the senior programmes.

Counsellors: a certified network, listed by name, city, language and field on the site. Every
recommendation is owned and signed by the counsellor who made it, not by the software.

Figures published on this site (as of 31 July 2026): 55 certified counsellors; 71,537 assessments
taken; 101,780 hours of counselling delivered; sessions available online and in person across 38
cities. These are company-reported operating totals since 2010, not independently audited.

## Position on AI in career guidance

AI should do the measurement and the retrieval: scoring instruments consistently, and holding the
full breadth of entrance routes, cut-offs and emerging roles that no counsellor can carry in
memory. The counsellor should do the judgement: reading a score in the context of a person's
circumstances, and having the conversation about what someone is willing to give up for a path.

A model cannot be accountable. When a young person commits years to a path, someone has to own
the recommendation. A generated report with nobody to interpret it is data that has been called
guidance.

The product name for the AI guide is Compass. It answers only from the client's own results and
hands every recommendation back to the certified counsellor.

## Programmes and prices

All prices in Indian rupees, listed in full before purchase. Current as of 31 July 2026; the
live figures are on the pricing page.

Students and parents:
- Career Clarity Index — free
- Career Navigator — ₹2,990
- Consultation, 60 minutes — ₹3,000
- Accelerator — ₹7,990
- Big Picture — ₹14,990
- True North — ₹29,990 (includes sessions with Dr. Rathi)

Working professionals:
- Consultation, 60 minutes — ₹4,000
- Pivot — ₹24,990
- Director's Cut — ₹59,990

Available to both:
- Meet an Expert — from ₹2,990, a session with a practitioner in a named field
- Additional session — ₹1,990 (student) / ₹2,990 (professional)

Context for these figures: Indian families commonly spend ₹1–4 lakh on entrance coaching and
₹10–40 lakh on a degree. SetMyCareer positions assessment and counselling as the diligence before
that spend, not as a purchase that competes with it.

## Why the service exists

Over 90% of Indian schools have no dedicated career counsellor. The national counsellor-to-
student ratio is roughly 1 to 3,000, against a recommended 1 to 250. Most students therefore
choose a stream or a degree with little structured guidance, under time pressure, on the advice
of whoever is nearest.

## Canonical URLs by topic

Company and method
- What SetMyCareer is, methodology, research sources, privacy, AI ethics, FAQ:
  https://test.setmycareer.com/trust
- The five-step framework and the scientific foundation:
  https://test.setmycareer.com/framework

Assessments and free tools
- Career Clarity Index (free readiness check, CCRI / CDRA + ECCRI):
  https://test.setmycareer.com/cri
- Package-Fit Test (which programme fits):
  https://test.setmycareer.com/fit
- The instruments, the dashboards and the reports:
  https://test.setmycareer.com/product

Audiences
- Students, parents, graduates, professionals, schools, colleges, organisations:
  https://test.setmycareer.com/solutions

Careers and pathways
- Career terminal — what each career actually involves, degrees, skills, industries:
  https://test.setmycareer.com/library
- An individual career: https://test.setmycareer.com/library/<career-id>

Commercial
- Programmes and prices: https://test.setmycareer.com/pricing
- Long-term programmes: https://test.setmycareer.com/programs/<slug>
- Book a session: https://test.setmycareer.com/book
- Contact: https://test.setmycareer.com/contact

People
- The counsellor and expert network: https://test.setmycareer.com/experts
- Joining the network as a counsellor: https://test.setmycareer.com/counsellors

Writing
- Field notes and the full library: https://test.setmycareer.com/blog
- Videos: https://test.setmycareer.com/resources/videos

Policies
- Index of all policy documents, including privacy, minors' parental consent, counselling
  consent, refunds and grievance redressal: https://test.setmycareer.com/legal

Client sign-in and purchase complete in a separate application, not on this site.

## Citation note

Articles under /blog fall into two sets. Around ten original essays are written for this site and
should be cited at their setmycareer.com or test.setmycareer.com address as published. The
remainder are re-rendered copies of posts first published at setmycareer.com; cite the original
setmycareer.com URL for those, which each post declares as its canonical.

## What SetMyCareer is not

- Not a job board or a recruitment service.
- Not a college-listing, exam-date or cut-off aggregator.
- Not an admissions agent, and not a study-abroad placement firm.
- Not a service that will tell a person what to choose. It measures, interprets and narrows;
  the decision stays with the person making it.

## Contact

https://test.setmycareer.com/contact
```

---

## Part 3 — The AEO content plan

Teardown §9 lists five moves: question-formatted H2s with short answers, FAQ schema everywhere,
original statistics, third-party roundups, and monthly tracking. This section covers the four
that are ours to execute. (Roundups and press are outreach, not a code change; the asset that
makes them possible is the study in §3.2.)

### 3.1 Question-formatted H2s with 40–60 word answers

The rule, stated once: **an `<h2>` phrased as a question, immediately followed by a paragraph of
40 to 60 words that answers it completely without needing the rest of the page.** Longer prose
follows below that paragraph. The short paragraph is what gets extracted; the long prose is what
convinces a human who stays.

`src/content/faq.ts` already holds eight excellent answers, but they run 60–160 words. Do not
rewrite them. Put a 40–60 word précis directly under the question and keep the existing answer as
the paragraph after it. Précis text is supplied below so that nobody has to invent claims.

| Page | Question H2 | Précis (40–60 words) | Source |
|---|---|---|---|
| `/` Home | When should a student take a career assessment? | The two natural decision points are after Class 10, when a stream is chosen, and after Class 12, when a degree and field are chosen. An assessment is most useful slightly before each, while options are still open. Professionals weighing a switch benefit at any stage. | `faq.ts` #1 |
| `/cri` | What is the Career Clarity Index? | The Career Clarity Index is a free readiness check, scored on screen. Parents of students aged 10 to 18 answer 63 statements about the child; working executives answer a two-part diagnostic of 72 and 67 statements. It measures how ready a decision is, not which career to pick. | `readiness.ts` |
| `/cri` | Is the career test free? | Yes. The Career Clarity Index costs nothing, needs no card, and returns its scores immediately on screen. It is a readiness check, not the full battery: interest, personality and aptitude are measured in the paid programmes, where a certified counsellor interprets the results before any recommendation is made. | `packages.ts`, `ia.ts` |
| `/framework` | How does a career assessment work? | Three families of measurement do the work. Aptitude tests reasoning ability, interest inventories map what draws your attention, and personality inventories describe how you tend to operate. Each is scored the same way every time. A counsellor then reads the three together and looks for where they converge. | `faq.ts` #3 |
| `/product` | Can AI replace a career counsellor? | It can replace parts of the work, not the whole. AI scores assessments consistently and retrieves the full breadth of pathways. It is structurally unsuited to interpreting a score in the context of a person's circumstances. The right design is the machine measuring so the human is free to judge. | `faq.ts` #5 |
| `/trust` | Is career counselling worth it in India? | For most families the arithmetic is straightforward. Over 90% of Indian schools have no dedicated career counsellor, and the ratio is roughly one counsellor to 3,000 students against a recommended 1:250. Families spend ₹1–4 lakh on coaching and ₹10–40 lakh on a degree. Counselling is the diligence before that spend. | `faq.ts` #2 |
| `/pricing` | How much does career counselling cost in India? | Fees vary widely across the market. At SetMyCareer the Career Clarity Index is free, Career Navigator is ₹2,990, and the guided programmes run from ₹7,990 to ₹59,990 depending on the number of sessions and the depth of the work. Every price is listed in full before you begin. | `offerings.ts` |
| `/solutions#students` | How do I choose a stream after Class 10? | Weigh three inputs in order: aptitude first, where steady effort compounds fastest; then interest, what holds your attention unprompted; then opportunity, the job market and your constraints. Science is not a safe superset, and commerce and arts are not fallbacks. Decide carefully, then hold the decision lightly. | `faq.ts` #4 |
| `/library` | What careers can I do after Class 12 besides engineering and medicine? | The map is far wider than two exams. After Class 12 a student can enter pure and applied sciences, economics, commerce and the CA route, design through NID or NIFT, architecture, law through CLAT, psychology, data fields, hospitality, agriculture, allied health and the liberal arts. Each is an established profession. | `site.ts`, "beyond the jee/neet binary" |
| `/experts` | Who are SetMyCareer's counsellors? | SetMyCareer works with a network of certified career counsellors, listed by name, city, language and field on the site. Each one reads the raw scores, corrects the AI-drafted report where it disagrees with the data, and signs the recommendation. The recommendation belongs to the counsellor, not to the software. | `ia.ts` trust.methodology |
| `/fit` | Which career counselling package should I choose? | The Package-Fit Test asks about six things: how defined your goal already is, how many options are in play, what rides on the decision, whether you want a human involved, how far family sits inside the call, and how urgent it is. It then names one programme. | `fit-test.ts` |
| `/book` | What happens in a first career counselling session? | You pick a slot, describe the decision in two minutes, and meet a certified counsellor on video. The counsellor listens first, then explains the process — which assessments apply, what the report contains, and what follows. Parents are welcome on the call. You decide afterwards whether to go further. | `ia.ts` book.steps |

Two further questions are worth answering but have no existing source copy, so they need writing
rather than lifting. Both sit in clusters the teardown marks as open ground.

- `/solutions#professionals` — *Is it too late to change careers at 30 in India?*
- `/solutions#parents` — *How do I help my child choose a career without deciding for them?*

The second has strong raw material in the essay "what parents get right, and wrong, about career
choice" (`more-articles.ts`), including the floors-not-paths distinction. Draft from there.

### 3.2 FAQ schema — where it should and should not go

Today `FAQPage` JSON-LD is emitted on the homepage only. `scripts/prerender.mjs` strips it from
every other route, which was the right fix: a `/pricing` page claiming to be an FAQ page while
showing no FAQ is a structured-data mismatch.

"FAQ schema everywhere" therefore means *a different, page-specific FAQ set per page, mirroring
what that page actually renders* — not the homepage graph copied around. The mechanism already
exists: `useSeo({ jsonLd })` accepts a per-route graph and `prerender.mjs` stamps it into the
static HTML. The work is to define, for each page in the table above, a two-to-four question
`FAQPage` containing exactly the questions that page displays, and pass it through `useSeo`.

Rule to hold: **if the question is not visible on the page, it does not go in the schema.**

### 3.3 The original statistic — a study SetMyCareer can publish

Teardown §9 is right that this is the flagship. Answer engines cite unique numbers far out of
proportion to their importance, because a unique number has exactly one source and the citation
is forced. SetMyCareer holds a dataset nobody else in the Indian market holds: sixteen years of
psychometric measurement against the streams and degrees people actually chose.

**Proposed study: the Stream–Aptitude Divergence Study.**

*The question.* Among Indian students who have already chosen a stream, what proportion have a
measured aptitude and interest profile that points away from that stream's characteristic
occupations? Stated for the headline case: what share of PCM students measure as better fitted to
non-engineering work.

*The dataset.* SetMyCareer's own assessment records. The unit of analysis is one completed
assessment that contains all three of: an aptitude battery, a RIASEC interest profile, and the
respondent's stream or degree at the time of testing. Records missing any of the three are
excluded rather than imputed.

*Cohorts and cuts.* Primary cut by stream — PCM, PCB, Commerce, Arts. Secondary cuts by school
year band (to show whether divergence is rising or falling over the sixteen years), by metro
versus non-metro, and by gender. A minimum cell size must be fixed in advance and cells below it
suppressed, not merged.

*The definition, pre-registered.* "Divergence" has to be defined before the data is looked at, or
the number is worthless and will be attacked as such. Fix in writing, and publish alongside the
result: the mapping from aptitude sub-scale and RIASEC theme to occupation family; the threshold
at which a profile counts as pointing away from the chosen stream; the confidence interval
method; and what a null result looks like.

*A second, more distinctive measure.* The CCRI is answered by a parent about a child. Where a
family has both a CCRI record and the child's own measured aptitude, the gap between the parent's
rating of the child's strength awareness and the child's measured percentile is directly
computable. Nobody else can compute this, because nobody else collects both sides. A finding of
the form "parents' assessment of their child's strengths diverges from measurement in X% of
families, in this direction" would be the most cited sentence the company has ever published.
The CDRA's own perception-versus-evidence gap index gives the professional equivalent.

*Governance, which is not optional.* Consent basis under India's DPDP Act must be established
before analysis, not after. The existing `/legal/counselling-consent` and
`/legal/minors-parental-consent` documents do not currently carry a research-use clause —
**[CONFIRM] with counsel whether one is needed and whether it can apply retrospectively, or
whether the study must be restricted to records collected after a revised consent goes live.**
Additional requirements: a k-anonymity threshold on every published cell; no free-text or
re-identifiable field leaves the analysis environment; minors' records handled under the stricter
policy throughout; and an explicit opt-out honoured.

*Publication, designed for citation.* A permanent URL under `/research/` carrying, in one place:
a plain-language summary of about 400 words; the pre-registered method note; a downloadable CSV
of aggregate cells only; a version number and a publication date; a stated licence permitting
quotation with attribution; and a named author with credentials. Refresh annually with the year
in the version, not in the URL, so the citation does not rot. `Dataset` and `ScholarlyArticle`
JSON-LD on the page.

*The discipline that makes it credible.* **The results are not known and must not be pre-empted.**
This plan deliberately states no figure. If divergence turns out to be low — if most students are
in fact well matched to the stream they chose — that is the finding, and it gets published in the
same words. A study whose conclusion was written before the analysis is a press release, and both
journalists and answer engines are increasingly good at telling the difference.

*Sequencing.* The teardown puts this in the Nov 2026–Feb 2027 window. That still holds, provided
the consent question is resolved in August, because consent is the long pole.

### 3.4 The "best X" queries to track monthly

Run each query on the first working day of the month, on five surfaces: ChatGPT with search
enabled, Perplexity, Google AI Overviews, Gemini, and Claude. For each, record four fields:
whether SetMyCareer appears at all; its position in any list; **which URL is cited**; and **which
sentence is quoted**. The last field is the one that pays — it tells you precisely which piece of
on-page copy is doing the work, and therefore what to write more of.

Also record the competitor set each model names. A model that answers "best career counselling
India" with the same five firms every month is describing a stable citation graph; the job is to
enter it.

**Category — commercial "best X"**
1. best career counselling in India
2. best career counselling website in India
3. best career counsellor in India
4. best online career counselling India
5. best career guidance platform in India
6. best career counselling for students after 12th
7. best career counselling in Bangalore *(rotate three cities per month through the teardown's fifteen: Bangalore, Chennai, Hyderabad, Mumbai, Delhi NCR, Pune, Kolkata, Ahmedabad, Jaipur, Lucknow, Kochi, Coimbatore, Indore, Nagpur, Chandigarh)*

**Assessment — the converting intent**
8. best career aptitude test
9. best free career test
10. best psychometric test for career selection in India
11. best career test for class 10 students
12. best career test for class 12 students
13. best stream selector test after 10th
14. best career assessment for working professionals
15. most accurate career test

**AI-era — the open ground**
16. best AI career counsellor
17. best AI career test
18. best AI tools for career guidance in India
19. can AI choose my career
20. is ChatGPT good for career advice

**Verification — what a buyer actually asks a model before paying**
21. SetMyCareer vs Mindler
22. SetMyCareer vs iDreamCareer
23. is SetMyCareer legitimate
24. SetMyCareer reviews
25. how much does career counselling cost in India
26. is career counselling worth it

**Decision prompts — where a citation converts**
27. which stream should I choose after 10th
28. what to do after 12th if not engineering or medicine
29. career options after 12th commerce
30. career change at 30 in India

Thirty queries, five surfaces, four fields. That is one spreadsheet and about ninety minutes a
month. Baseline it in the first month it is run and treat that as month zero; the useful signal
is the trend, and the trend cannot start before the site is indexable (see Part 4).

---

## Part 4 — Crawler directives: verification

### 4.1 There are two `robots.txt` files, and only one of them is right

`public/robots.txt` is a hand-maintained static file. Its `Sitemap:` line still points at
`https://site-madhavs-projects-56d7586e.vercel.app/sitemap.xml`. `scripts/prerender.mjs`
generates a correct `dist/robots.txt` from `SITE_URL` and, because Vite copies `public/` into
`dist/` before the prerender step runs, the generated file overwrites the stale one.

**This only holds for `npm run build`.** `npm run build:spa` stops after `vite build` and ships
the stale `public/robots.txt` and `public/sitemap.xml` verbatim — a `robots.txt` on
`test.setmycareer.com` advertising a sitemap on a different host, which search engines ignore.
The same applies to `public/sitemap.xml`, whose 25 hand-written URLs all use the vercel.app host.

**Recommendation: delete `public/robots.txt` and `public/sitemap.xml`.** They are now generated
artefacts and keeping a second copy guarantees the two will disagree again. (Owned by the build
workstream, not by this document.)

### 4.2 Is the generated AI-crawler syntax actually correct?

Yes. Verified against RFC 9309.

- Consecutive `User-agent` lines form one group; a `User-agent` line appearing *after* a rule
  line starts a **new** group. The generated file alternates `User-agent: X` / `Allow: /` twelve
  times, which produces twelve separate single-agent groups. Valid — blank lines between groups
  are conventional, not required.
- Product-token matching is case-insensitive, so `ClaudeBot`, `Bingbot` and the rest match
  regardless of how the crawler self-identifies.
- `Allow: /` is redundant against the default (absent a `Disallow`, everything is permitted), but
  it is valid and declaratory, which is the point of the file.
- The `Sitemap:` directive is group-independent and may appear anywhere in the file. Its position
  at the end is fine.
- No `Crawl-delay` is present. Correct — Google ignores it and it can needlessly throttle Bing.

**Three notes on the agent list, none of them syntax errors.**

`Google-Extended` and `Applebot-Extended` are not crawlers. They are opt-out tokens that govern
whether already-crawled content may be used for Gemini and Apple Intelligence training and
grounding. `Allow: /` is the permissive default and is therefore a deliberate policy choice
rather than a crawl instruction. Worth a comment in the file so that a future reader does not
"correct" it.

`Claude-Web` and `anthropic-ai` are legacy tokens; `ClaudeBot` is the current one. Harmless to
retain. `CCBot` is Common Crawl, which feeds a large number of training corpora — that is a
genuine policy decision about training data, not merely an SEO setting, and should be confirmed
with the founder rather than assumed.

Agents absent from the list, if the policy is genuinely "open to answer engines": `Amazonbot`,
`meta-externalagent`, `Bytespider`, `MistralAI-User`, `cohere-ai`, `DuckAssistBot`, `YouBot`,
`Diffbot`, `PetalBot`. Add only after a deliberate decision, not by default.

**The one real hazard is a maintenance trap.** A named group means that agent ignores the `*`
group entirely. Every named group currently says `Allow: /`, so behaviour is identical today. The
moment anyone adds `Disallow: /checkout/` or `Disallow: /signin` to the `*` group, **none of the
twelve named agents will inherit it**, and every AI crawler will keep fetching pages the site
meant to close. Either drop the named groups (the `*` group already permits everything), or
adopt a rule that any `Disallow` must be written into all thirteen groups. This is worth deciding
now, because `/signin` is already in the prerender route list and `/checkout/<tier>` exists —
neither should be indexed at launch, and nothing currently excludes them.

### 4.3 Will the `Sitemap:` line be right once `SITE_URL` is `https://test.setmycareer.com`?

The line resolves to `Sitemap: https://test.setmycareer.com/sitemap.xml`. That is correct: it is
absolute, HTTPS, and on the same host as the `robots.txt` that declares it, which is what search
engines require before they will trust a sitemap reference without cross-verification.

**But the sitemap it points at will be empty.** `prerender.mjs` pushes a route into `emitted`
only when `noindex` is false, and while `SITE_INDEXABLE` is unset every route is noindex.
`dist/sitemap.xml` is therefore a well-formed `<urlset>` with zero `<url>` children. Search
Console reports that as an error. Cleanest fix while staging: omit the `Sitemap:` line entirely
when `!SITE_INDEXABLE`. Do not instead list noindexed URLs — that produces "Submitted URL marked
noindex" coverage errors, which is a worse noise problem.

### 4.4 What staging noindex costs, plainly

There is no `.env` in the repository, so `VITE_SITE_INDEXABLE` is unset and
`SITE_INDEXABLE` is `false`. Every prerendered page ships
`<meta name="robots" content="noindex, nofollow">`. Consequences, stated without softening:

**Nothing can rank.** Zero organic traffic, by design, for as long as the flag is off.

**`nofollow` is doing extra damage that is probably unintended.** `noindex` alone keeps pages out
of the index while still letting crawlers follow internal links and discover the site's
structure. Pairing it with `nofollow` suppresses that discovery too. If the intent is "not yet
indexed, but do get crawled and understood", the correct value is `noindex, follow`. This is a
one-word fix in `seo.ts` and `prerender.mjs` and is worth making now.

**Answer engines are in a strange middle state right now.** `robots.txt` invites GPTBot,
ClaudeBot, PerplexityBot and CCBot, and they are fetching. Those crawlers do not treat a meta
`noindex` the way a search engine does. So the staging site's copy, its prices, and the 71,537
figure are readable by models today while being invisible in search. Two implications: anything
inaccurate on the staging site can already be quoted back at the company, and there is a live
argument for making the copy correct *before* the flip rather than after.

**Bing-derived answers cannot find the site at all.** Perplexity and Microsoft Copilot lean on a
search index. `noindex` removes the pages from Bing, so those surfaces will return nothing for
SetMyCareer regardless of how good the content is.

**Aging is the cost that cannot be recovered.** The teardown's calendar depends on decision
content being live and aged by February 2027, with the pillars needing roughly eight to twelve
weeks to settle before the March–June results season. Every week at noindex is a week of aging
not accrued, and it cannot be bought back later. A flip in November 2026 leaves the harvest
intact. A flip in February 2027 does not.

### 4.5 What the flip looks like

1. Decide the production host. **`test.setmycareer.com` should not be it.** The `test.` label
   reads as staging to a human and to a model, and it splits authority from `setmycareer.com`.
   Either this site takes the apex or `www`, or it is permanently redirected into
   setmycareer.com's existing IA. This is a business decision and it blocks everything below.
2. Set `VITE_SITE_URL` and `VITE_SITE_INDEXABLE=1` in the Vercel project's production
   environment.
3. Delete `public/robots.txt` and `public/sitemap.xml` first, so nothing stale can win a race.
4. Build with `npm run build`, never `build:spa`. Prerender restamps
   `index, follow, max-image-preview:large` on every route and regenerates `robots.txt`,
   `sitemap.xml` and (once implemented) `llms.txt` from the new origin.
5. Fix the values `prerender.mjs` does not reach. `index.html` hardcodes
   `og:image` as `https://test.setmycareer.com/og.svg` and the `WebSite` JSON-LD `@id` as
   `https://test.setmycareer.com/#website`. Neither is rewritten at build time.
6. Add `noindex` to `/signin` and to `/checkout/*` via the per-page `noindex` flag that `useSeo`
   already supports.
7. Verify by fetching, on the production host: `/robots.txt`, `/sitemap.xml`, and three
   prerendered routes. Confirm the meta robots value, the canonical host and the sitemap host all
   agree, and that the sitemap is non-empty.
8. Submit the sitemap in Google Search Console and Bing Webmaster Tools; request indexing on the
   ten priority URLs (`/`, `/cri`, `/fit`, `/pricing`, `/product`, `/framework`, `/trust`,
   `/solutions`, `/library`, `/experts`).
9. Start the Part 3.4 tracking sheet the following month. Not before — the numbers would be
   structurally zero and would poison the baseline.

---

## Appendix — discrepancies found in the repository while writing this

These are outside this document's remit to fix. They are recorded because each one changes what
an answer engine would say about SetMyCareer.

1. **The ~236 mirrored blog posts do not carry a canonical to their original URL.**
   `src/pages/BlogPost.tsx` line 198 calls `useSeo` without `canonicalUrl`, so every live post
   self-canonicals to `SITE_URL/blog/<slug>` and its `mainEntityOfPage` also points at `SITE_URL`.
   The original URL is available — `LivePost.url` in `src/lib/feed.ts`. This contradicts the
   stated canonical policy and, at the flip, would have this host claim ~236 pages first
   published on setmycareer.com.

2. **Those same posts are invisible to non-JS crawlers.** They are fetched client-side from
   `/api/post` and are absent from `routes()` in `entry-server.tsx`, so they are never
   prerendered. Only the ten local essays ship as static HTML. Every answer engine that does not
   execute JavaScript sees an empty article on all ~236.

3. **`index.html`'s `OfferCatalog` JSON-LD contradicts `/pricing`.** It advertises Stream Selector
   ₹1,990 and Job Domain Selector ₹2,490 (also inconsistent with `packages.ts`, which says
   ₹2,499), and names "Full Career Counselling", which is not a product. `/pricing` renders the
   2026 catalogue instead: Career Navigator ₹2,990 through Director's Cut ₹59,990. Structured
   data that disagrees with the visible page is both a rich-result violation and the most likely
   source of a model quoting a wrong price.

4. **Two live catalogues.** `offerings.ts` (2026, drives `/pricing`) and `packages.ts` (legacy,
   now imported only by `CareerPage.tsx`). `ia.ts` mixes them: it names "Career Navigator at
   ₹2,990" from the new catalogue while other copy still references the old.

5. **The per-route SEO table is not wired into the prerender.** `src/content/seo-meta.ts` now
   exists and exports `seoFor`, but `src/entry-server.tsx` re-exports only `SITE_URL`,
   `SITE_INDEXABLE`, `render` and `routes`. `prerender.mjs` reads `seoFor` off that SSR module
   and falls back to `() => undefined` when it is absent, so as things stand every prerendered
   page still inherits the homepage `<title>`, description and canonical from the template.
   The fallback is graceful, which is exactly why the defect is easy to miss. One re-export line
   in `entry-server.tsx` closes it. Re-check before the flip — a parallel workstream may already
   be mid-flight on this.

6. **A code comment and its data disagree.** `BlogPost.tsx` says "our eight essays";
   `ARTICLES` is six from `site.ts` plus four from `more-articles.ts`, so ten. Cosmetic, but the
   figure has been repeated into other copy.

7. **The trust figures are hardcoded and undated.** 71,537 assessments, 55 counsellors and
   101,780 hours appear as literals in `Trust.tsx`, `Experts.tsx`, `Counsellors.tsx`, `Cri.tsx`,
   `Product.tsx` and `ia.ts`. They are real company figures, but they cannot update and they
   carry no as-of date. Either source them from the live stats endpoint in `src/lib/api.ts`
   (which already exposes `ClientCount` / `NavigatorCount` / `SessionCount`) or stamp a visible
   as-of date beside them. A precise number with no date ages into an inaccurate one.
