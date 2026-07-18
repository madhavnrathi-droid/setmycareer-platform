# Setmycareer → Blueprint: Foundation Document

*Behavioral-market intelligence across three layers — Reflective/Mental Health, Professional/Career, and a combined Life-Performance OS — built on the shipped privacy-first stack (FastAPI · LangGraph · React/Vite SPA · IndexedDB-only). This document assembles six drafted sections into one working reference: the metric ontology, the multi-agent architecture, the dashboard information architecture, the implementation + training spec, the UX teardown, and the open-data/licensing map. It reconciles their contradictions, then closes with an easiest-first build roadmap and an open-risks register.*

---

## Product reframe (one paragraph)

Setmycareer turns a session transcript into a "Blueprint" — today, seven evidence-anchored wellbeing dimensions, a deterministic risk-capped composite, a hedged SOAP note, risk screening, and a warm client reflection, all computed transiently (server stores **nothing**; everything lives on-device in IndexedDB). The next chapter evolves Setmycareer into a calm, emotionally-safe "stock terminal for the self": a **master index + sub-indices tracked since the user's first session**, a scrubbable "what you said → what changed → why" timeline, multi-agent reasoning (Mental Health, Career, Life Coach, Behavioral Scientist, Contradiction, Evidence Verifier, Synthesis), and a **PERSONAL / PROFESSIONAL / BOTH** settings toggle where each mode runs its own algorithm so signals never cross-contaminate. A text AI counsellor (Reflect / Strategize / Decide / Review / Prepare / Challenge) answers from the user's own account with citations. Career intelligence rides on open, bundled labor data (O*NET / BLS / ESCO). The non-negotiables stay: signal-language + confidence everywhere, never diagnose, "decision support, not authority," warmth over clinical coldness, local-first privacy.

---

## Executive summary — the architecture in 17 bullets

1. **Three layers, one shell.** PERSONAL (mental health), PROFESSIONAL (career), BOTH (Life-Performance OS). A Settings toggle swaps the *dataset and the algorithm*, not a filter. Each mode uses its own weight vectors; cross-family scores never average together.
2. **Two layers of weighting, both deterministic in Python — never model-invented.** (a) *source → dimension*: the founder's mix (transcript .40 / validated assessments .20 / longitudinal trend .15 / journal .10 / counsellor notes .10 / self-report .05; uploaded reports scaled by source quality, hard-capped). (b) *dimension → index*: separate clinical vs. career vectors.
3. **LLM proposes, Python decides.** Every index/confidence number is computed in pure-Python modules (`weighting.py`, `confidence.py`) that extend today's `_composite()` / `_confidence()`. LLMs only emit quote-gated JSON.
4. **Quote-verification gate is the trust backbone.** Every score/claim must cite a verbatim span Python re-checks (extend `_evidence_count`). Unverifiable → score nulls out. The reflection verifier is promoted to a first-class **Evidence Verifier** node shared by all agents.
5. **Risk overrides optimism, PERSONAL only.** A high/moderate safety flag caps the personal index (≤25 / ≤45). No analogous cap on the professional index — career strain ≠ safety. Safety items are serious, never "bloopers."
6. **0–100 scale, 100 = thriving.** Inverse instruments (PHQ-9, GAD-7, ISI, UCLA, RRS, MBI) are flipped so higher is always healthier. No-signal constructs render `null` / "not discussed," never guessed.
7. **Confidence ladder, shown everywhere.** `none → low → tentative → moderate → high` (high added for validated-assessment cases). Per-dimension confidence = product of independent factors (evidence × agreement × recency × verifier); index confidence = weight-and-confidence-weighted roll-up, dampened by coverage and trend stability.
8. **Metric ontology: 70 named metrics, 130+ leaves.** PERSONAL `pm.*` (30) · PROFESSIONAL `pc.*` (31) · COMPOSITE `cx.*` (9). The seven shipped dimensions and their live weights carry forward unchanged — the ontology is a superset, not a rewrite.
9. **Eight-node LangGraph DAG → layer-routed subgraphs + cross-cutting agents.** Today's chain becomes the Reflective lane; a parallel Career lane is added; Behavioral Scientist ∥ Contradiction fan in; Evidence Verifier is a hard gate before Synthesis. Disjoint state keys preserve parallelism and the SSE `('node', name)` streaming contract.
10. **Career grounding is open, bundled, commercial-clean.** O*NET (CC BY 4.0), BLS (public domain, free API), ESCO (free incl. commercial), public-domain RIASEC/IPIP + Big Five. A second TF-IDF RAG corpus (`labor_data.jsonl`) over the same `rag.py` engine.
11. **AI counsellor = text chat, RAG + agentic NOW, grounded in the user's own account, every answer cited.** Six modes; runs stateless (`/api/chat[/stream]`); the Profile tab becomes the chat surface; settings move top-right.
12. **The single most important new data structure is `indexHistory`** — an append-only on-device store powering the scrubbable timeline, the 15% trend weight, and pattern detection.
13. **Provider: provider-agnostic graph, per-agent model choice as config.** The repo's `chat_json`/`chat_text` interface stays. **Recommended for the reasoning agents (Behavioral, Contradiction, Verifier, Synthesis): Claude Opus 4.8 (`claude-opus-4-8`)** with adaptive thinking, `effort` tuning, and structured outputs — far more robust than JSON-mode workarounds for the strict JSON these agents emit. Cheaper extraction nodes can stay on Groq/Haiku.
14. **Dashboard = Bloomberg-terminal × Apple-Health × TradingView, emotionally safe.** Master-index hero with confidence ribbon, sortable sub-index ticker board, scrubbable all-time timeline with gentle annotations ("New high" / "Worth a look"), forensics three-pane, ≤3 taps to any evidence. Down-moves read as "a heavier week," never red-alarm; red is reserved for safety.
15. **Bloom / Bloopers / Blueprint vocabulary is locked.** Blooms = sustained gains; Bloopers = gentle non-shaming flags (never safety); Blueprint = the cross-session synthesis and exportable PDF.
16. **Eval-first; train only when proven the bottleneck.** A generalized multi-agent, multi-layer LLM-judge harness with a blocking crisis gate and calibration metrics is built *before* any LoRA. License-gate every dataset (`commercially_usable`) — research-only corpora go to eval/prompt-design only.
17. **Privacy invariant is absolute and rising in stakes.** Server stores nothing; `account` data is sent transiently per request and discarded. As career/market data and a chat counsellor raise the stakes, "on your device · estimate, not diagnosis" appears on every screen.

---

# Section 1 — Setmycareer Metric Ontology v1

**Scope.** 70 named metrics across **PERSONAL/Mental (`pm.*`)**, **PROFESSIONAL/Career (`pc.*`)**, and **COMPOSITE (`cx.*`)**, decomposing into 130+ leaf metrics with per-instrument sub-signals. Each metric carries an `id`, plain-language definition, inputs, evidence basis, derivation, confidence rule, suggested weight, and signal-language phrasing. The tree maps directly onto the Settings toggle; each mode uses its own family weights.

### 0. Conventions (apply to every metric)

| Convention | Rule |
|---|---|
| **Scale** | `0–100`, **100 = thriving / strong signal**, `0 = severe difficulty / absent`. Inverse instruments (RRS, PHQ-9, GAD-7, ISI, UCLA, burnout) are flipped so "higher is always healthier." |
| **Null state** | No real signal in inputs → `score = null`, `state = "not discussed"`. Never guessed. |
| **Confidence tiers** | `none` (score null) → `low` (0 verified anchors) → `tentative` (1 anchor) → `moderate` (≥2 anchors or 1 validated instrument) → `high` (validated instrument + corroborating transcript/longitudinal). Mirrors `_confidence()` in `metrics_agent.py`, extended with `high`. |
| **Confidence raisers** | verbatim-verified quotes; a completed validated assessment; agreement across ≥2 input sources; longitudinal consistency (≥3 sessions same direction); counsellor-note corroboration. |
| **Confidence lowerers** | single short session; unverifiable/paraphrased evidence; source disagreement (Contradiction flag); stale data; self-report only. |
| **ID namespace** | `pm.*` personal/mental · `pc.*` professional/career · `cx.*` composite. |
| **Weights** | Within a family, weights sum to 1.0 per index. Across families, the founder's source-weights apply to *inputs* (see Section 2 §4). |
| **Tone** | Signal-language only. The phrasing column is the *only* user-facing language. Never diagnostic, never trait-fixing, never "you are." Safety items are serious, not "bloopers." |

## FAMILY 1 — PERSONAL / MENTAL (`pm.*`) · toggle: PERSONAL & BOTH

### 1.1 Affect & Mood cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pm.mood` | Day-to-day baseline of low vs. bright mood, interest, self-worth | transcript, journal, PHQ-9 | **PHQ-9** | LLM band + PHQ-9 map (0–4→85+, 20–27→<19); flip of PHQ severity | high if PHQ-9 present; else verified-quote count | .14 | "This week sounded heavier than usual" |
| `pm.affect_balance` | Ratio of positive to negative feeling expressed | transcript, journal | **PANAS** | (PA−NA) normalized to 0–100; LLM tallies affect words | moderate w/ PANAS; tentative from tone | .08 | "More weight on the hard feelings than the warm ones lately" |
| `pm.emotional_volatility` | How much affect swings within/between sessions | multi-session transcripts, journal timestamps | PANAS variance, affect-shift markers | rolling SD of session affect scores (inverse → higher=steadier) | needs ≥3 sessions for moderate+ | .06 | "Feelings have been moving around a lot session to session" |
| `pm.hopelessness` | Sense of a foreclosed / bleak future (safety-adjacent) | transcript, journal | PHQ-9 item 2/9, Beck-hopelessness | LLM detects future-bleakness language; **routes to risk agent** | tentative→moderate; **never reassuring-rounded** | .07 | "Some doubt this week about things getting better" *(serious, not a blooper)* |
| `pm.self_compassion` | Warmth vs. harshness toward self | transcript, journal | self-criticism markers, RRS overlap | LLM contrast of self-blame vs. self-kindness language | tentative from single session | .05 | "You spoke to yourself pretty sternly here" |
| `pm.shame_load` | Felt shame / unworthiness pressure | transcript | shame vs. guilt linguistics | LLM tags shame-specific statements | tentative | .04 | "A thread of feeling 'not enough' ran through this" |

### 1.2 Anxiety & Activation cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pm.anxiety_regulation` | Worry, dread, restlessness, and the ability to settle | transcript, journal, GAD-7 | **GAD-7** | LLM band + GAD-7 map; flip severity | high w/ GAD-7 | .14 | "Worry seemed louder than usual, and harder to settle" |
| `pm.worry_load` | Volume/spread of worry content | transcript | GAD-7 item 1–3 | density of worry topics per session | tentative | .04 | "A lot of different things were on your mind" |
| `pm.physiological_arousal` | Body-level tension/panic signals (language-only) | transcript, journal | GAD-7 somatic, panic markers | LLM tags reported body sensations (no inferred cues) | tentative; language-only | .04 | "Your body seemed to be holding some of this" |
| `pm.energy_activation` | Fatigue, drive, engagement with life | transcript, journal, wearables(later) | PHQ-9 fatigue/psychomotor | LLM band; later HRV/steps blend | moderate w/ trend | .08 | "Running on a lower tank this week" |
| `pm.behavioral_activation` | Doing valued/pleasant activities | transcript, journal | BA construct (CBT) | count of approach vs. avoidance behaviors | tentative | .05 | "Fewer things that usually refill you got space this week" |
| `pm.avoidance_index` | Steering away from feared situations | transcript | exposure/avoidance (CBT) | LLM tags avoidance moves (inverse) | tentative | .04 | "A few things got sidestepped that felt big" |

### 1.3 Cognition & Regulation cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pm.rumination` | Stuck, repetitive negative thought loops | transcript, journal | **RRS** | RRS map; LLM detects loop language (inverse) | high w/ RRS | .08 | "Some thoughts kept circling back" |
| `pm.cognitive_flexibility` | Ease of shifting perspective, not all-or-nothing | transcript | RRS inverse, distortion set | LLM tags reframes vs. rigidity | moderate | .07 | "Room opened up to see it more than one way" |
| `pm.cognitive_distortions` | Frequency of distortion patterns | transcript | CBT distortion taxonomy | LLM-tag count, normalized (inverse) | tentative | .04 | "A few thinking shortcuts showed up here" |
| `pm.metacognition` | Noticing one's own thoughts/patterns | transcript | ACT defusion, insight markers | LLM tags "I noticed I…" statements | tentative | .04 | "You caught yourself mid-pattern a couple times" |
| `pm.values_clarity` | Clarity on what matters personally | transcript, journal | **ACT** valued-living | LLM tags values statements | tentative | .04 | "What matters to you came through more clearly" |

### 1.4 Connection, Sleep & Resilience cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pm.social_connectedness` | Felt support & contact vs. isolation | transcript, journal, UCLA | **UCLA** loneliness | UCLA map; LLM contact/support tally | high w/ UCLA | .10 | "More on your own than feels good lately" |
| `pm.relational_safety` | Felt safety/trust in close relationships | transcript | attachment-adjacent (state, not trait) | LLM tags trust/conflict episodes | tentative; **state not trait** | .04 | "Some closeness felt uncertain this week" |
| `pm.support_utilization` | Reaching out / using support when needed | transcript, journal | help-seeking markers | count of support-seeking acts | tentative | .03 | "You let a couple people in" |
| `pm.sleep_quality` | Falling/staying asleep, daytime impact | transcript, journal, ISI, wearables(later) | **ISI** | ISI map; LLM band; later sleep-stage blend | high w/ ISI | .09 | "Sleep didn't give much back this week" |
| `pm.sleep_relationship` | Worry/struggle *about* sleep | transcript, journal | ISI item 5–7 | LLM tags sleep-anxiety language | tentative | .03 | "Sleep itself became something to worry about" |
| `pm.resilience` | Bounce-back after setbacks | multi-session, transcript | CD-RISC-style, coping markers | recovery slope after low sessions | moderate w/ ≥3 sessions | .06 | "You found your footing again after a hard stretch" |
| `pm.coping_repertoire` | Range/use of healthy coping skills | transcript, journal | DBT/CBT skills set | count of distinct skills used effectively | tentative→moderate | .05 | "Your toolkit got some good use this week" |
| `pm.emotional_regulation` | Modulating intensity without shutdown/explosion | transcript | **DBT** emotion-reg | LLM tags reg strategies & overwhelm episodes | tentative | .06 | "Big feelings stayed a bit more manageable" |

### 1.5 Burnout & Safety cluster *(safety items: serious, never bloopers)*
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pm.burnout_markers` | Exhaustion + cynicism + depletion | transcript, journal | **MBI** | LLM tags 3 MBI sub-signals (inverse) | moderate w/ trend | .06 | "Signs of running on empty showed up" |
| `pm.depletion_recovery` | Whether rest actually restores | transcript, journal, wearables(later) | MBI efficacy, recovery science | rest→energy delta across sessions | moderate w/ trend | .04 | "Rest hasn't been refilling the way it usually does" |
| `pm.risk_flag` | Safety screen: self-harm/SI/harm ideation | transcript | **C-SSRS-style** screen (risk agent) | **risk_agent owns this; caps composites** | always surfaced; never softened | n/a (gate) | Direct, warm, resource-forward — **not** a "blooper" |
| `pm.functional_impairment` | Impact on work/home/self-care | transcript, journal | WHODAS-style | LLM tags functional-impact statements (inverse) | tentative | .04 | "This started to spill into daily things" |

## FAMILY 2 — PROFESSIONAL / CAREER (`pc.*`) · toggle: PROFESSIONAL & BOTH

> **Reconciliation note.** Section 1 names the full `pc.*` tree; Section 2 sketches a shorter career rubric (`role_fit`, `skill_utilization`, `growth_trajectory`, `burnout_load`, `comp_security`, `market_alignment`, `autonomy_meaning`, `network_capital`). The Section-2 set is the **MVP scoring subset** the career agent ships first; the table below is the **full ontology** it grows into. Mapping: `role_fit`→`pc.interest_role_fit`/`pc.career_clarity`; `skill_utilization`→`pc.skill_coverage`; `growth_trajectory`→`pc.skill_velocity`/`pc.execution_momentum`; `burnout_load`→`pc.workload_sustainability`; `comp_security`→`pc.credential_signal`/`pc.aspiration_realism`; `market_alignment`→`pc.market_readiness`; `autonomy_meaning`→`pc.values_alignment_work`; `network_capital`→`pc.networking_momentum`.

### 2.1 Direction & Identity cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pc.career_clarity` | How clear the user is on direction/next step | transcript, journal, RIASEC | **RIASEC/Holland** coherence | LLM clarity band + RIASEC differentiation | high w/ RIASEC; tentative from talk | .12 | "Your direction is coming into sharper focus" |
| `pc.professional_identity` | Coherent sense of "who I am professionally" | transcript, journal | Holland congruence, narrative-identity | LLM tags identity statements; role congruence | tentative→moderate | .08 | "A clearer story of your work self is forming" |
| `pc.values_alignment_work` | Fit between work and personal values | transcript, journal, Big Five | **Big Five**, ACT values | overlap of stated values vs. role demands | tentative | .07 | "Your work and what you care about pulled closer" |
| `pc.interest_role_fit` | Match of interests to target occupations | RIASEC, transcript, **O*NET** | **RIASEC × O*NET** | cosine of user RIASEC vs. O*NET occupation vectors | high w/ RIASEC+O*NET | .07 | "These roles line up with what energizes you" |
| `pc.aspiration_realism` | Gap between goals and current market/skill reality | transcript, O*NET, BLS | O*NET skills/outlook, BLS | LLM gap-analysis vs. bundled labor data | moderate w/ data | .05 | "Worth checking what the path actually asks for" |

### 2.2 Market Readiness cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pc.market_readiness` | Overall readiness to compete for target roles | transcript, reports, O*NET, BLS | **O*NET skills**, **BLS outlook** | composite of skill-coverage × demand × confidence | moderate w/ report+data | .12 | "You're closer to ready than it feels" |
| `pc.skill_coverage` | % of target-role required skills held | transcript, reports, O*NET | **O*NET skills/abilities** | matched skills ÷ O*NET-required, importance-weighted | high w/ verified report; moderate from talk | .09 | "Most of the core skills are already in your kit" |
| `pc.skill_velocity` | Rate of new skill acquisition over time | multi-session, journal, reports | O*NET skill deltas | new-skill mentions per unit time (slope) | moderate w/ ≥3 sessions | .06 | "You're picking up new ground steadily" |
| `pc.skill_gap_severity` | How far key gaps are from target | reports, O*NET | O*NET importance × gap (inverse) | weighted gap distance to role profile | moderate w/ data | .05 | "A couple of skills are worth prioritizing next" |
| `pc.credential_signal` | Strength of credentials/portfolio evidence | uploaded reports, transcript | source-quality weighting | verified-artifact scoring | high w/ verified docs | .04 | "Your track record speaks for itself here" |
| `pc.opportunity_surface_area` | Breadth of viable options open | transcript, O*NET, BLS, LinkedIn(later) | BLS openings, O*NET related occupations | count × demand of reachable roles within skill radius | moderate w/ data | .06 | "More doors are open than you're counting" |

### 2.3 Execution & Momentum cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pc.execution_momentum` | Are stated intentions turning into action | transcript, journal | goal-enactment, **Big Five Conscientiousness** | ratio of completed vs. stated commitments across sessions | moderate w/ ≥3 sessions | .10 | "Plans are turning into moves" |
| `pc.focus_consistency` | Steadiness of attention/effort over time | journal, transcript, screen-time(later) | Conscientiousness, deep-work markers | variance of effort signal (inverse) | moderate w/ trend | .06 | "Your focus held more steadily this stretch" |
| `pc.follow_through` | Closing loops on what was started | transcript, journal | commitment-completion | completed ÷ opened tasks | moderate w/ trend | .05 | "You closed loops you usually leave open" |
| `pc.proactivity` | Initiating vs. reacting | transcript, journal | proactive-personality markers | LLM tags initiated actions | tentative | .04 | "You led more than you waited this week" |
| `pc.experimentation_rate` | Trying new approaches/bets | transcript, journal | Openness, exploration markers | count of distinct new attempts | tentative | .03 | "You ran a few small experiments" |

### 2.4 Confidence & Decision cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pc.professional_confidence` | Felt competence/self-efficacy at work | transcript, journal | **GSE** self-efficacy, Big Five | LLM efficacy-language band | moderate w/ trend | .08 | "Your sense of 'I can do this' grew" |
| `pc.decision_confidence` | Conviction behind career choices | transcript, journal | decision-self-efficacy | LLM tags decisiveness vs. spinning | tentative→moderate | .06 | "You're standing more firmly behind your choices" |
| `pc.strategic_thinking` | Quality of long-horizon planning | transcript, journal | planning-horizon, systems-thinking | LLM rates horizon + contingency depth | tentative | .05 | "You're thinking a few moves ahead now" |
| `pc.impostor_load` | Self-doubt undercutting real capability | transcript, journal | Clance impostor markers (inverse) | LLM tags impostor language vs. evidence | tentative | .04 | "Some self-doubt was louder than the facts warranted" |
| `pc.risk_tolerance_work` | Comfort with calculated career risk | transcript, journal | Big Five, risk-attitude | LLM tags risk-approach vs. avoidance | tentative | .03 | "You leaned into a bolder option" |

### 2.5 Network & Environment cluster
| id | definition | inputs | evidence basis | derivation | confidence rule | wt | signal-language |
|---|---|---|---|---|---|---|---|
| `pc.networking_momentum` | Activity/growth in professional relationships | transcript, journal, LinkedIn(later) | social-capital, weak-tie theory | count + quality of new/renewed connections | moderate w/ data | .06 | "Your circle widened this stretch" |
| `pc.mentorship_access` | Access to guidance/sponsorship | transcript, journal | developmental-network research | LLM tags mentor/sponsor interactions | tentative | .03 | "You're not navigating this alone" |
| `pc.workplace_environment_fit` | Fit with current role's culture/demands | transcript, journal | P-E fit theory, O*NET work context | LLM contrast of needs vs. environment | tentative | .05 | "The environment isn't fully meeting you" |
| `pc.workload_sustainability` | Whether current load is survivable long-term | transcript, journal, wearables(later) | JD-R model, MBI overlap | LLM tags demand-vs-resource balance (inverse) | moderate w/ trend | .05 | "This pace may be hard to keep up" |
| `pc.learning_orientation` | Growth-mindset & active learning behavior | transcript, journal | Dweck mindset, learning-goal orientation | LLM tags learning-seeking language | tentative | .03 | "You treated setbacks as material to learn from" |

## FAMILY 3 — COMPOSITE INDICES (`cx.*`)

> Composites are **deterministic** (computed in Python from sub-metrics), **never invented by an LLM**, risk-capped, and carry **propagated confidence** = weighted mean of input confidences, downgraded one tier if the Contradiction agent flags disagreement.

| id | definition | toggle | inputs (sub-metrics) | derivation | confidence rule | signal-language |
|---|---|---|---|---|---|---|
| `cx.bloom_index` | **Master index** — overall life-performance since first session | BOTH | blend of `cx.wellbeing_index` + `cx.career_index` (mode-dependent split, default α=.6/β=.4) | deterministic weighted mean, risk-capped (high→≤25, mod→≤45) | propagated; high only if both sub-indices ≥moderate; = min(personal_conf, professional_conf) by α/β | "Your overall Setmycareer, tracked since day one" |
| `cx.wellbeing_index` | Personal/mental composite (current Blueprint index) | PERSONAL/BOTH | all `pm.*` (live weights: mood .25, anxiety .20, social .15, energy .10, sleep .10, cogflex .10, affect .10) | existing `_composite()`, risk-capped | propagated from dimension confidences | "Where your inner weather sits this week" |
| `cx.career_index` | Professional composite | PROFESSIONAL/BOTH | all `pc.*` (career weight vector) | deterministic weighted mean (no risk-cap) | propagated | "Where your professional momentum sits" |
| `cx.alignment_index` | **Wants vs. actions vs. environment** coherence | BOTH | `pm.values_clarity`, `pc.values_alignment_work`, `pc.execution_momentum`, `pc.workplace_environment_fit` | distance between stated values, enacted behavior, environment | moderate only w/ ≥3 sessions | "How closely your life matches what you want from it" |
| `cx.decision_health` | Quality + confidence + values-fit of recent decisions | BOTH | `pc.decision_confidence`, `pc.strategic_thinking`, `pm.cognitive_flexibility`, `pm.rumination`(inv) | blend of conviction, deliberation, low-spin | tentative→moderate | "How well-grounded your recent choices feel" |
| `cx.recovery_burnout_index` | Balance of depletion vs. restoration | BOTH | `pm.burnout_markers`, `pm.depletion_recovery`, `pc.workload_sustainability`, `pm.energy_activation` | deterministic blend (inverse of burnout) | moderate w/ trend | "How your reserves are holding up" |
| `cx.stability_index` | Volatility-adjusted steadiness of the whole picture | BOTH | rolling SD of `cx.bloom_index` over time | inverse normalized volatility | needs ≥4 sessions | "How steady things have been, not just where they are" |
| `cx.trajectory_index` | Direction & slope of change over time | BOTH | longitudinal slope of `cx.bloom_index` + sub-indices | regression slope, annotated ("New Record" / "Worth a look") | moderate w/ ≥3 sessions | "Which way things have been trending" |
| `cx.engagement_index` | Consistency of using Setmycareer itself (meta) | BOTH | session cadence, journal frequency, assessment completion | deterministic from usage timestamps | high (objective) | "How consistently you've been checking in" |

### Toggle & weighting summary
| Mode | Active families | Master index | Cross-contamination guard |
|---|---|---|---|
| **PERSONAL-only** | `pm.*` + `cx.wellbeing/alignment/decision/recovery/stability/trajectory` | `cx.wellbeing_index` headline | `pc.*` signals **excluded** from any composite |
| **PROFESSIONAL-only** | `pc.*` + `cx.career/decision/recovery/...` | `cx.career_index` headline | `pm.*` clinical signals **excluded**; only burnout/energy bridge if user opts in |
| **BOTH** | all | `cx.bloom_index` headline | separate sub-pipelines; `cx.*` blends pre-computed family indices, never raw cross-family scores |

**Multi-agent mapping:** Mental Health → `pm.*`; Career Counsellor + Life Coach → `pc.*`; Behavioral Scientist → derivation/weighting of `cx.*` trends; Contradiction → confidence downgrades + `cx.alignment_index`; Evidence Verifier → the verified-quote / instrument checks that set every confidence tier; Synthesis → assembles the terminal view.

**Counts:** Personal/Mental = 30 · Professional/Career = 31 · Composite = 9 → **70 named metrics**; with per-instrument sub-signals (PHQ-9×9, GAD-7×7, ISI×7, UCLA×3, RRS×2, PANAS×20, RIASEC×6, Big Five×5, O*NET facets, MBI×3), leaf count exceeds **130+**.

**Grounded in code:** scale/bands, `_composite()` deterministic weighting, risk-capping (high→≤25, moderate→≤45), and the `none/low/tentative/moderate` ladder come from `/Users/madhavrathi/Setmycareer/app/agents/metrics_agent.py`; the seven current `pm.*` dimensions and their live weights carry forward unchanged. State plumbing extends `SessionState` in `/Users/madhavrathi/Setmycareer/app/agents/state.py`.

---

# Section 2 — Multi-Agent Architecture & Weighting (LangGraph)

Designed to **drop onto the existing stack** (`app/agents/*.py`, `StateGraph(SessionState)` in `graph.py`, `chat_json`/`chat_text` in `llm.py`, TF-IDF RAG in `rag.py`). Today's 8 nodes (entity → pattern → retrieval → note → risk → metrics → evidence → reflection) become the **Reflective/Mental-Health lane**. This adds a **Career lane**, **cross-cutting reasoning agents**, a **deterministic weighting + confidence engine**, and **PERSONAL / PROFESSIONAL / BOTH** routing — all evidence-anchored, hedged, confidence-tagged, never diagnostic.

### 0. Design invariants (non-negotiable)
| Invariant | Where it lives today | Keep it because |
|---|---|---|
| **LLM proposes, Python decides** | `_composite()` is deterministic; risk caps the index | Indices must be reproducible, auditable, immune to "vibes" drift |
| **Quote-verification gate** | `_evidence_count()` substring-checks every quote; unverifiable → `None` | Stops hallucinated numbers entering the index |
| **Confidence shown everywhere** | `_confidence()` → none/low/tentative/moderate | "Decision support, not authority" |
| **Risk overrides optimism** | `wellbeing = min(wellbeing, 25/45)` on high/moderate | Dashboard must never look calm during a safety flag |
| **Always-on verifier pass** | reflection agent drafts → re-checks groundedness | Measurable accuracy lift; reused as the **Evidence Verifier** below |
| **Disjoint state keys + parallel DAG** | each node writes one key; branches run concurrently | Wall-clock follows critical path, not node count |

### 1. State extension (`app/agents/state.py`)
All `total=False`, disjoint keys so parallel writes never collide:
```python
mode: str                      # "personal" | "professional" | "both"
inputs: dict                   # {transcript, notes[], counsellor_notes[], reports[], assessments{}, self_report{}, history[]}
# Reflective lane (existing): entities, patterns, framework_context, note, risk, metrics, evidence, reflection
career_signals: dict           # career dimensions + evidence (mirrors metrics shape)
labor_context: str             # retrieved O*NET/BLS grounding (career RAG)
behavioral: dict               # mechanisms/leading indicators across both lanes
contradictions: list           # cross-source/cross-lane conflicts
verified: dict                 # per-claim keep/downgrade/drop decisions + confidences
synthesis: dict                # master index, sub-indices, timeline deltas, actionable + retrospective insight
source_weights: dict           # resolved per-source weights for THIS session (audit trail)
```
`inputs` is the typed bundle the founder's weighting acts on; counsellor notes and reports are separate keys so they can be weight-capped independently (§4).

### 2. The agents
"Quote-gated" = every score/claim must cite a verbatim span Python re-checks (extend `_evidence_count`).

- **A. Intake & Source-Typer** *(new, deterministic + light LLM)* — normalize the raw bundle into typed, weight-tagged `inputs`; tag each item with `source_type`, `recency`, `source_quality ∈ [0,1]`. Python does file-type/validated-assessment detection; LLM only classifies free-text uploads and parses instrument scores (PHQ/GAD/ISI/UCLA/RRS/PANAS + SIGMA; RIASEC/Holland, Big Five) into strict JSON. Single entry after `START`; gates which lanes run.
- **B. Mental-Health Agent** *(= today's entity+pattern+note+metrics chain)* — scores the 7 wellbeing dimensions, emotions, hedged SOAP note. Keeps the anchored-rubric/calibration prompt. **New:** validated scores in `inputs.assessments` pass as labeled priors; the deterministic engine (not the prompt) blends them. Runs in `personal`/`both`.
- **C. Career Counsellor Agent** *(new — mirror of B)* — scores career dimensions on the same 0–100 scale, anchored to career constructs. Clones B's evidence-first/quote-gated structure with a career rubric; never gives verdicts ("you should quit") — signal-language only. Writes `career_signals`. Runs in `professional`/`both`, **parallel to B**.
- **D. Behavioral Scientist Agent** *(new)* — explains *why* signals move; surfaces leading indicators (sleep↓→mood↓ lag) and the **only sanctioned cross-lane bridge** (`cross_lane_links`). Names mechanisms tied to quotes + trend deltas, never traits. Fan-in after B and C; **parallel to E**.
- **E. Contradiction Agent** *(new)* — detects conflicts (transcript vs. validated assessment; counsellor note vs. self-report; this session vs. trend; report vs. transcript). Quote-gated on both sides; "report the conflict, do not resolve it." Severity feeds confidence down. Runs in all modes; **parallel to D**.
- **F. Risk / Safety Agent** *(= today's `risk_agent`, unchanged)* — transcript-only, starts at `START` in parallel; output caps every index downstream and can short-circuit career-strategy tone.
- **G. Evidence Verifier Agent** *(generalize today's reflection verifier into a shared gate)* — the single groundedness chokepoint; re-checks every scored dimension/mechanism/contradiction/synthesis claim; `keep|downgrade|drop`. Temperature 0. Python applies decisions deterministically — a `drop` nulls the score before Synthesis. **Hard dependency for Synthesis.**
- **H. Synthesis Agent** *(new)* — assembles master index + sub-indices + timeline + insight. Narrative is LLM; **every number is deterministic** (§4/§5). Reuses the reflection persona + safety note when risk ≥ moderate. Single fan-in before `END`; reflection writer runs in parallel off it.

### 3. The graph (LangGraph wiring)
```
                          START
                            │
              ┌─────────────┼───────────────────────────┐
              ▼             ▼                            ▼
        risk_assessor   intake_source_typer        (risk is transcript-only,
        (parallel,         │                          starts immediately)
         caps later)       │ sets `mode`, gates lanes
                ┌──────────┴───────────┐
                ▼ (personal|both)      ▼ (professional|both)
        ┌───────────────┐       ┌────────────────────┐
        │ REFLECTIVE     │       │ CAREER             │
        │ entity→pattern │       │ labor_retriever    │
        │ →framework_RAG │       │ → career_counsellor│
        │ →note→metrics  │       └─────────┬──────────┘
        └───────┬────────┘                 │
                └──────────────┬───────────┘   (B ∥ C)
                               ▼
                  ┌────────────┴────────────┐
                  ▼                          ▼
          behavioral_scientist        contradiction_agent     (D ∥ E)
                  └────────────┬────────────┘
                               ▼
                       evidence_verifier            (G — hard gate)
                               ▼
                        synthesis_agent             (H — numbers via Python)
                               ├───────────────► reflection_writer
                               ▼
                             END
```
- **Parallelism** (disjoint keys, same superstep): `risk ∥ intake`; B ∥ C; D ∥ E. The existing `stream_pipeline` walker handles multi-node supersteps — extend `STAGE_LABELS` with the new nodes for clean SSE 1/N…N/N.
- **Conditional edges:** `intake` → `add_conditional_edges` on `mode`; `risk.overall_level == "high"` routes synthesis into a "care-first" template.
- **`framework_retriever`** (existing CBT/DBT/ACT/WHO) is the reflective RAG; **`labor_retriever`** is its career twin over `app/knowledge/labor_data.jsonl` via the same TF-IDF `rag.py` engine.

### 4. Weighting algorithm (deterministic, Python — never the LLM)
| Source | Founder | Use as | Deviation & why |
|---|---|---|---|
| Transcript | 40% | **base** | Keep — richest, most recent first-person signal |
| Validated assessments | 20% | base | Keep — **only when fresh**; recency decay, else mass redistributes |
| Longitudinal trend | 15% | base | Keep as a **prior/anchor** (the smoothing term in §5), not a same-session input |
| Journal (notes) | 10% | base | Keep |
| Counsellor notes | 10% | **capped** | Cap at 10% **and** require corroboration, not origination |
| Self-report | 5% | base | Keep; lowest (least externally validated) |
| Uploaded reports | quality-weighted | **capped 0–15%** | `nominal × source_quality`; hard cap 15% so a slick PDF can't dominate |

**Resolution rules** (produce `source_weights` per session, stored for audit): (1) **presence renormalization** — only present sources contribute; weights renormalize to 1 (generalizing today's `total_w` pattern from dimensions to sources). (2) **Recency decay** — `effective = nominal × exp(-Δdays/τ)` (τ≈30d assessments, ≈90d career reports). (3) **Caps applied before renormalization**. (4) **Corroboration gate** — a counsellor note can raise/lower confidence and add evidence but cannot be a dimension's *sole* basis (else score stays `None`/qualitative). (5) **Two index families, separate weight vectors** — personal uses the clinical dimension weights already in `metrics_agent.WEIGHTS`; professional uses a career vector (proposed: role_fit .20, skill_utilization .15, growth_trajectory .15, burnout_load .15, market_alignment .10, comp_security .10, autonomy_meaning .10, network_capital .05); master = `α·personal + β·professional`, default α=0.6/β=0.4 (tunable in Settings), computed only after each sub-index is independently finalized and risk-capped.

### 5. Confidence propagation (per-metric → index)
Numbers internally (`none=0, low=.25, tentative=.5, moderate=.75, high=1.0`), words in the UI.
```
c_dim = c_evidence × c_agreement × c_recency × c_verifier
  c_evidence  = f(n_verified quotes)   # 0→low, 1→tentative, ≥2→moderate; ≥3 distinct sources → high
  c_agreement = 1 − contradiction_penalty
  c_recency   = exp(-Δdays/τ) for the freshest contributing source
  c_verifier  = residual_confidence from Evidence Verifier (drop→0)

index_confidence = Σ(w_k · c_k) / Σ(w_k)       over present dimensions k
final = index_confidence × coverage_factor × trend_factor
  coverage_factor = present_dims / total_dims
  trend_factor    = 1 − σ(recent indices)/scale
```
**Timeline smoothing** (the TradingView line): displayed index is a confidence-weighted EWMA — `display = (c_new·new + c_prior·prior)/(c_new+c_prior)` — so a single low-confidence session nudges, never whips, the line; each point carries a confidence band. **Rules:** risk-cap applies to the *score* before confidence; a Verifier `drop` sets `c_dim=0` and removes the dim (mass renormalizes); BOTH-mode master confidence = `min(personal_conf, professional_conf)` weighted by α/β.

### 6. Mode routing (no cross-contamination)
| | PERSONAL | PROFESSIONAL | BOTH |
|---|---|---|---|
| **Lanes run** | Reflective (B) | Career (C) | B ∥ C |
| **RAG** | frameworks only | labor only | both, separate keys |
| **Dimension weights** | clinical vector | career vector | each lane its own; never merged at dimension level |
| **Index** | personal sub-index (shown as master) | professional sub-index | master = α·personal + β·professional |
| **Cross-lane reasoning** | n/a | n/a | **only** via `behavioral.cross_lane_links` |
| **Always on** | Risk, Contradiction, Verifier, Synthesis | same | same |

**Anti-contamination guarantees (structural, not prompt politeness):** lanes write disjoint keys (`metrics` vs `career_signals`); neither agent reads the other's scores. Separate weight vectors + separate sub-index computations. The only bridge is `behavioral.cross_lane_links`, surfaced as hypotheses, never folded into a number. Mode is read once at Intake and drives conditional edges; switching modes re-runs the graph.

### 7. How counsellor notes & uploaded reports enter (capped, end-to-end)
Intake tags them and attaches `source_quality` + `Δdays` → lane agents may cite them (quote-gated against report text) to raise `c_evidence`/`c_agreement` → weighting caps their contribution before renormalization and the corroboration gate forbids sole-source → Contradiction explicitly checks note-vs-self-report and report-vs-transcript → Verifier can `drop` an unsupported report claim. **Net: a third-party note or polished PDF can inform and corroborate, but cannot originate or dominate a score.**

### 8. Build notes (provider, reconciled)
- **Graph:** extend `graph.py` with new nodes + `add_conditional_edges` on `mode`; keep the compile-once `PIPELINE`; add `STAGE_LABELS` entries.
- **Determinism:** all index/confidence math in pure-Python `weighting.py` / `confidence.py` mirroring `_composite()`/`_confidence()`. Numbers never trusted from the model.
- **Provider (reconciled with Sections 1/4):** The repo runs Groq today; the graph stays **provider-agnostic at the node level** behind the existing `chat_json` interface, with **per-agent model choice as config**. Recommended for the reasoning-heavy agents (Behavioral, Contradiction, Verifier, Synthesis): **Claude Opus 4.8** (`model="claude-opus-4-8"`) with `thinking={"type":"adaptive"}`, `output_config={"effort":"high"}`, and **structured outputs** — `output_config={"format":{"type":"json_schema","schema":…}}` or `client.messages.parse()` with a Pydantic model — to guarantee the strict JSON these agents emit (far more robust than JSON-mode's "must contain the word json" workaround). Cheaper extraction nodes (Intake parsing, entity) can stay on Groq/Haiku. **Note on Opus 4.8 behavior:** it under-reaches for tools/subagents and narrates more by default — encode "when to flag a contradiction / cross-lane link" explicitly in each agent's prompt, put the trigger condition in each tool's own description, and keep outputs terse (add a silence-default). Adaptive thinking is *off when omitted* — set it explicitly. `budget_tokens`, `temperature`, `top_p`, and last-assistant-turn prefills all 400 on 4.8; use `effort` + structured outputs instead.
- **Caching (if/when on Anthropic):** freeze the long, stable agent prompts (rubrics, calibration examples, persona) as `cache_control` prefixes; put the volatile transcript/inputs after the breakpoint.
- **Eval-first:** extend `scripts/eval_agent.py` with an LLM-judge harness per new agent before wiring live.

**Files to create/touch:** `app/agents/state.py` (extend), `graph.py` (nodes + conditional edges + labels), `career_agent.py`, `behavioral_agent.py`, `contradiction_agent.py`, `verifier_agent.py`, `synthesis_agent.py`, `intake_agent.py`, `app/weighting.py`, `app/confidence.py`, `app/knowledge/labor_data.jsonl` (+ second `rag.py` index), `scripts/eval_agent.py` (extend).

---

# Section 3 — Blueprint Dashboard IA (a calm stock terminal)

Reference target: **Bloomberg-terminal × Apple-Health × TradingView**, emotionally safe. Every number carries a confidence; every "down" is a *blooper*, never a failure; nothing diagnoses. Builds on shipped vocabulary (`PhaseRing` hero, `bento` grid, `ScrubLine`, `Trace`, `SignalCard`, AQI `BANDS`, 7 instrument-anchored `METRICS`, on-device `wellbeing_index`).

### 1. North-star model: the index analogy
| Stock-terminal concept | Blueprint equivalent | Source in current code |
|---|---|---|
| Market composite (S&P) | **Master Index** 0–100 | `wellbeing_index` (deterministic, risk-capped) |
| Sector indices | **Sub-indices** = 7 signals (+ career later) | `METRICS[]` + `dimensions[key].score` |
| Ticker (price + Δ + vol) | **Signal ticker**: score • ↑/↓ delta • confidence as "spread" | `SignalCard`, `bandFor`, `stateColor` |
| Candlestick / time series | **Scrubbable timeline** since first session | `ScrubLine`, `AppleBars` |
| Earnings-call drill | **"What you said"** verbatim evidence | `Trace` |
| Analyst rating | **Band + reasoning + "why this score"** | `BANDS`, `latest.reasoning`, `evidence_verified` |
| Watchlist / movers | **Bloopers** (attention) + **Blooms** (gains) | `focus`, `recoveryNode` |
| Methodology footnote | **Confidence + "decision support, not authority"** | `disclaimer`, `WHY_THESE` |

### 2. Screen map (depth-limited, ≤3 taps to any evidence)
```
L0  TERMINAL HOME ("Blueprint")
 ├─ Layer toggle: Personal · Professional · Both        [segmented, top]
 ├─ MASTER INDEX hero (big number + Δ + confidence + band ring)
 ├─ MOVERS strip (Blooms ↑ / Bloopers ↓ — 2–3 chips)
 ├─ TICKER BOARD (7 sub-index tickers, sortable)
 ├─ MASTER TIMELINE (scrubbable, since first session)
 └─ "Setmycareer noticed" (≤2 longitudinal patterns, hedged)
   L1 SUB-INDEX DRILL-DOWN → signal hero, sub-index timeline, "what you said→changed→why" (Trace), baseline + citations, calibration
     L2 EVENT/SESSION FORENSICS → that session's contribution, verbatim quotes, Δ attribution, jump to SessionDetail
   L1 TIMELINE FORENSICS → scrubber snaps to session date, three-pane WHAT YOU SAID · WHAT CHANGED · WHY, annotations
   L1 CROSS-SESSION VIEW (Blooms / Bloopers / Blueprint) → bottom-up roll-up across ALL sessions
```
**Anti-clutter:** L0 shows *state*, never raw evidence; evidence at L1+ on demand; one primary tap target per card; cards summarize at rest, expand on tap.

### 3. Master index hero (L0 top)
TRIVI big number + Products KPI delta + `PhaseRing`. Center = index 0–100 colored by `stateColor`, band label below. Delta = `↑/↓ N pts` vs last session (`recoveryNode.delta`), green up / warm-orange down (down = "a heavier week"). **Confidence ribbon** = thin spread band (TradingView "uncertainty cone"), not an error bar. Ring nodes (one per sub-index) tappable → L1. **Methodology chip** → weighting breakdown (transcript 40 / assessments 20 / trend 15 / journal 10 / counsellor 10 / self-report 5).

### 4. Ticker board (L0)
Each `SignalTicker`: name + instrument chip ("Sleep · ISI"); big score (greys to "not discussed" if null); Δ badge (hidden until ≥2 sessions); `MiniSpark` (last 6–8 pts); 3-pip confidence dot; band pill; hue rail. **Sortable**: By attention (lowest first → surfaces bloopers) · By movement (biggest |Δ|) · Clinical order (default). Not-discussed signals collapse into a thin expandable row — honest about missing evidence.

### 5. Scrubbable timeline forensics — "what you said → what changed → why"
Master timeline: X = time since first session, Y = master index, area fill in `stateColor`. Scrubber drag snaps to session dates; hero updates live (Apple-Health feel). Annotations (emotionally safe): `New high`, `Worth a look` (never "Correction Needed"), `First session`, `Last 7 days`. Range toggle: Session · Month · All. **Forensics three-pane** (on point select): WHAT YOU SAID (`Trace` verbatim ✓) · WHAT CHANGED (per-signal deltas) · WHY (band + `reasoning` + instrument construct). Δ attribution ties a quote to the signal it moved ("this line lowered Sleep by ~7"), framed as estimate. Confidence per point rendered as opacity.

### 6. Cross-session view (Bloom / Bloopers / Blueprint — locked naming)
**Blooms** = sustained gains over ≥3 sessions (`recoveryNode` extended), each with its supporting evidence window, celebratory. **Bloopers** = gentle flags from `longitudinalPatterns()` (sleep shortening, withdrawal, rising stress), phrased as invitations — **safety items are NOT bloopers** (separate, serious, never gamified). **Blueprint** = the cross-session synthesis + exportable PDF ("Your blueprint"). Pattern detection (e.g. "sleep <6h → mood ▼ next session") surfaces here, hedged, evidence-linked, confidence-gated (won't speak below N data points).

### 7. Personal / Professional / Both toggle
Segmented control under the layer header (left-rail item on desktop); Settings top-right. Switches the *entire terminal's dataset + algorithm*, not a filter — master, tickers, timeline, movers all recompute. Distinct accent per layer (Personal pastel/navy; Professional cooler analyst palette; Both split). BOTH = two stacked ticker boards under one Life-Performance master + a thin **Contradiction band** surfacing cross-layer tension with evidence ("career momentum ▲ while energy ▼"). Algorithms stay separate; BOTH shows the *lower* of the two confidences for any combined statement.

### 8. Component inventory
| Component | Role | Status |
|---|---|---|
| `LayerToggle` | Personal/Professional/Both | NEW |
| `MasterIndexHero` | composite + Δ + confidence ribbon + ring nodes | extend `PhaseRing` |
| `ConfidenceRibbon` | spread band / 3-pip dot | NEW |
| `MoversStrip` | Blooms ↑ / Bloopers ↓ | NEW (from `focus`+`recoveryNode`) |
| `SignalTicker` | sub-index card | extend `SignalCard`+`MiniSpark` |
| `TickerBoard` | sortable grid | extend `bento` |
| `ScrubTimeline` | scrubbable area + annotations | extend `ScrubLine` |
| `TimelineAnnotation` | "New high"/"Worth a look" | NEW |
| `ForensicsPanes` | what-you-said / changed / why | NEW (wraps `Trace`) |
| `EvidenceTrace` / `BandScale` / `Sparkline`/`Ring`/`SignalGauge`/`Pill` | primitives | exist |
| `MethodologySheet` | weighting + "decision support" | NEW |
| `CrossSessionRoll` | Bloom/Bloopers/Blueprint | NEW |
| `RiskCard` | safety — serious, distinct | extend (keep non-blooper) |
| `PatternCard` | hedged longitudinal pattern | exists ("Setmycareer noticed") |

### 9. Responsive reflow
Breakpoints `≤640` phone · `641–1023` tablet · `≥1024` desktop · `≥1440` wide. Phone: bottom pill nav, full-width hero, 1-col bento, full-screen forensics sheet. Desktop: **left rail** (icon+label, Settings top-right), sticky left-60% hero, 3–4 col ticker grid, **right docked forensics panel** (Bloomberg detail pane) at ≥1280. Layout primitive: `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` reflows 1→4 cols with zero media queries. Scrubber = touch-drag on phone, hover-scrub + click-to-pin on pointer; tap targets ≥44px. The current shared-`layoutId` morph stays full-screen on phone, morphs into the docked panel on desktop. PDF export renders from the desktop wide layout regardless of viewport.

### 10. Emotional-safety + trust invariants
Confidence everywhere (no number without a cue; sparse = visibly faint, never fabricated). Color discipline: `stateColor` for state; green=bloom, warm-orange=blooper, **red reserved for safety only**. Evidence on demand (state at L0, `Trace` at L1+). Never diagnose ("anchored to," "tracking signal, not a score on the instrument," "decision support, not authority"). Bloopers ≠ safety.

**Files reviewed:** `frontend/src/screens/Dashboard.jsx`, `MetricDetail.jsx`, `lib/science.js`, `lib/wellness.js`, `lib/store.js`, `components/Nav.jsx`, `App.jsx`. Primitives in `frontend/src/components/` (`gauges.jsx`, `charts.jsx`, `SignalCard.jsx`, `Blueprint.jsx`, `DimensionBento.jsx`, `Ring.jsx`).

---

# Section 4 — Claude Implementation + Training Spec

Builds incrementally on the current stack. Preserves: **server stores NOTHING** and **never diagnose / signal-language + confidence everywhere**. Eval-first: no training is justified until the eval harness exists and a node is provably the bottleneck.

### 0. Grounding — what exists today (so we extend, not rebuild)
| Layer | Current | Changes |
|---|---|---|
| API | `/api/transcribe`, `/diarize`, `/analyze`, `/analyze/stream` (SSE), `/pair/*` | + `/api/chat[/stream]`, `/import/report`, `/labor/*`; `AnalyzeRequest` gains `layer`, `assessments`, `notes`, `reports`, `history` |
| Pipeline | 8-node DAG, parallelized, streams `('node',name)` | Layer-routed subgraphs + new agents + confidence propagation |
| Scoring | `metrics_agent.py` deterministic weighted composite, risk-capped | Becomes PERSONAL sub-index; add PROFESSIONAL sub-index + master index |
| RAG | TF-IDF over `frameworks.jsonl` (372 chunks, stdlib) | + career + labor + overlap corpora, same `_Index` |
| State | `SessionState` TypedDict | + career/professional keys, `assessments`, `reports`, `history`, per-agent `confidence`, `agent_weights` |
| Persistence | IndexedDB (`store.js`) | + `assessments`, `reports`, `indexHistory`, `chatThreads`, `settings.layer` |
| Eval | `scripts/eval_agent.py` LLM-judge + hard safety gate | Multi-agent/multi-layer; calibration; training trip-wire |
| Training | `training/` (LoRA on open data) | Phased roadmap; career SFT; feedback loop as labeler |

Output-key contracts to preserve (consumed by SPA): `metrics.{wellbeing_index, dominant_emotions, dimensions{label,score,state,evidence,reasoning,evidence_verified,confidence}, clinical_summary, risk_capped, disclaimer}`; `note.{subjective,objective,assessment,plan}` + `note_markdown`; `risk.{overall_level,categories,recommended_actions,disclaimer}`; `reflection.{opening,noticing,strength,reframe,suggestion,generated}`.

### 1. Data-model evolution (on-device IndexedDB, additive)
| Store | Shape | Notes |
|---|---|---|
| `settings` | `{ layer, units, crisisRegion }` | Drives routing + algorithm. Top-right gear. |
| `assessments` | `[{ id, instrument, score, subscales, takenAt, source }]` | Validated instruments incl. RIASEC/Big Five. Feeds 20% weight. |
| `reports` | `[{ id, kind, title, text, extractedAt, sourceQuality, parsed }]` | Parsed server-side transiently via `/import/report`, stored on-device. Weighted by quality. |
| `notes` (extend) | `[{ id, ts, kind:'journal'\|'counsellor'\|'self', text, author }]` | `kind` carries distinct weights (counsellor 10%, self 5%). |
| `indexHistory` | `[{ ts, sessionId, layer, masterIndex, subIndices, dimensions, evidenceRefs, drivers }]` | Append-only since first session. Powers timeline, trend (15%), patterns. **The single most important new structure.** |
| `chatThreads` | `[{ id, mode, messages:[{role,content,refs}], createdAt }]` | AI-counsellor log, on-device. |
`exportTuningData()` extends to include `assessments`, `reportRefs`, `indexHistory` deltas, `chatFeedback`.

### 2. API contract changes (FastAPI, still stateless)
`AnalyzeRequest` gains `layer="personal"`, `assessments=[]`, `notes=[]`, `reports=[]`, `history=[]` (device assembles `history` from `indexHistory` — server never persists it).
| Endpoint | Method | Returns | Stateless? |
|---|---|---|---|
| `/api/chat` | POST `{mode, messages[], account{sessionsDigest, indexHistory, assessments, reports, notes}, layer}` | `{reply, refs[], confidence, suggested_followups}` | Yes — `account` is the device's own data, RAG'd in-memory, discarded |
| `/api/chat/stream` | POST (same) | SSE tokens | Yes |
| `/api/import/report` | POST multipart | `{kind, title, parsed, extracted_text, sourceQuality}` | Yes — parsed & returned, never written |
| `/api/labor/occupation/{code}` | GET | `{title, skills[], outlook, wage_bands, related}` | Yes — bundled corpus |
| `/api/labor/search` | GET `?q=` | ranked occupations | Yes |
**Chat internals:** retrieve over (a) framework corpus, (b) career/labor corpus, (c) device account snapshot; mode sets persona (Reflect=`PERSONA`; Strategize/Decide/Prepare=career; Review=longitudinal; Challenge=contradiction stance). Every claim carries a `ref` to a transcript quote or labor data point. *(See Section 2 §8 for the Opus 4.8 chat recommendation — stream the response, and use mid-conversation `role:"system"` messages for mode switches to preserve the cached prefix.)*

### 3. Multi-agent reasoning (extend the DAG)
Keep the parallelized DAG and `('node', name)` contract; each new node writes a disjoint state key + a `confidence` field.
| Node (key) | Role | Output |
|---|---|---|
| `layer_router` | gate downstream branch on `settings.layer` | routing flags |
| `mental_health_agent` | = today's `metrics_agent` rescoped | `metrics.subIndices.personal` |
| `career_agent` (new) | career scoring | `metrics.subIndices.professional` |
| `life_coach_agent` (new, BOTH only) | cross-layer goal/values alignment | `coach` |
| `behavioral_scientist_agent` (new) | pattern detection across `history` | `patterns_longitudinal` |
| `contradiction_agent` (new) | flags conflicts | `contradictions[]` |
| `evidence_verifier` (generalized) | verify every quote in Python | drops/downgrades |
| `synthesis_agent` (new) | weighted merge → master index | `metrics.masterIndex`, `subIndices` |

**Weighting + confidence (deterministic, `app/agents/weighting.py`):**
```python
SOURCE_WEIGHTS = { transcript:.40, assessments:.20, trend:.15, journal:.10,
                   counsellor_notes:.10, self_report:.05 }   # reports scaled by sourceQuality
```
Master index per layer kept separate (a `layer` field tags every dimension). Confidence combines as `min(present confidences)` weighted by source. Risk-cap overrides PERSONAL only; **no cap on PROFESSIONAL** (career stress ≠ safety). **Streaming:** `STAGE_LABELS` gains warm labels (`career_agent → "Reading your work signals"`, `contradiction_agent → "Checking against what you've said before"`, `synthesis_agent → "Bringing it together"`); `STAGE_TOTAL` recomputes; existing `seen` dedup handles variable counts.

### 4. RAG additions (reuse `rag.py` `_Index`, stdlib/TF-IDF)
| Corpus (new `.jsonl`) | Contents | Used by |
|---|---|---|
| `career_frameworks.jsonl` | RIASEC/Holland, Big Five → work, career-development frameworks | `career_agent`, chat Strategize/Decide/Prepare |
| `labor_data.jsonl` | **OPEN BUNDLED** O*NET/BLS occupation·skill·wage·outlook | `/api/labor/*`, `career_agent`, chat |
| `overlap.jsonl` | burnout↔depression, job-loss grief, meaning/values, work-anxiety | `life_coach_agent`, BOTH-layer chat |
Add a `corpus` arg to `rag.retrieve/grounding_text` (default frameworks); cache each index lazily like `_get_index`. Each labor record carries a citable `source`. Neural-embeddings remain the documented upgrade path.

### 5. Eval framework (BEFORE any training — the gate)
| Eval set | Cases | Judge dimensions | Hard gate |
|---|---|---|---|
| `reflection` (exists) | synthetic 5 + real | grounded, warmth, specificity, one_step, safety, non_judgmental | safety ≥4 AND risk∈{mod,high} |
| `personal_metrics` (new) | transcripts w/ gold reads | quote-verifiability, band-calibration, confidence-honesty | 0 unverifiable scores; no diagnosis |
| `professional` (new) | career transcripts/reports | groundedness, labor-data accuracy, no false certainty | every claim has a `ref` |
| `contradiction` (new) | conflicting session pairs | catches conflict, no false positives | recall ≥ target on seeded conflicts |
| `chat` (new) | multi-turn per mode | mode-fidelity, account-groundedness, decision-support-not-authority, safety | refs present; no authority/diagnosis |
| `crisis` (cross-cutting) | passive/active SI, harm | leads with care + region-aware crisis line | **blocking — ships nothing if it fails** |
Add a **calibration eval** (model scores vs gold/assessment-derived: MAE + within-band rate) to prove a tuned model beats the prompt before training. Wire `make eval`.

### 6. Phased roadmap (eval-first; train only when justified)
- **Phase 0 — Foundations (no model work).** `settings.layer` + top-right gear; `indexHistory` + scrubbable timeline UI; generalize eval harness incl. calibration. *Exit:* timeline renders from real sessions; scorecard green on existing nodes.
- **Phase 1 — PERSONAL deepening (prompt + RAG only).** Fold `assessments`/`notes`/`reports` into `AnalyzeRequest`; generalize `evidence_verifier`; deterministic `weighting.py` + confidence propagation; `behavioral_scientist_agent` + `contradiction_agent` over `history`. *Exit:* `personal_metrics` + `contradiction` gates pass; calibration MAE baseline recorded.
- **Phase 2 — PROFESSIONAL layer (RAG + agentic, NO training).** Bundle labor corpus + `/labor/*`; `career_agent`; RIASEC/Holland + Big Five; separate professional algorithm/weights; `layer_router` + `synthesis_agent`. *Exit:* `professional` gate passes; non-cross-contamination unit test passes.
- **Phase 3 — AI counsellor + BOTH (chat, RAG-grounded, agentic NOW).** `/api/chat[/stream]`, 6 modes, Profile-tab UI; `life_coach_agent` + `overlap` corpus; report import. *Exit:* `chat` + `crisis` gates pass across modes.
- **Phase 4 — Training (ONLY now, only where eval proves a bottleneck).** Existing `training/` scaffold (LoRA on open data). Learn **STYLE never diagnosis** (crisis/risk stays prompt-engineered + rule-gated): (1) `Setmycareer-note-lora` (transcript→SOAP voice); (2) `Setmycareer-blueprint-lora` (transcript→dimension JSON, trained on Stage-1 "feels right" outputs); (3) `Setmycareer-career-lora` (only after Phase 2 ships and `professional` eval shows prompt-only career is the measured bottleneck). **Justification rule:** a LoRA is greenlit only if (a) its eval set is stable, (b) calibration/judge scores plateau under prompt iteration, and (c) the tuned adapter beats the prompt on held-out + real user-rated cases.

### 7. Folding in founder's later docs/training data
Pasted product/clinical docs → chunk into matching `app/knowledge/*.jsonl`, re-run TF-IDF, immediately available. Pasted training data → register in `dataset_registry.json`; **gate on `commercially_usable`** — research-only sets (e.g. ESConv) go to eval/prompt-design only, never training. Pasted gold labels/rubrics → `data/eval/*.jsonl` (auto-loaded); become hard-gate cases and calibration references before any training target.

**Key files to touch:** `app/models.py`, `app/main.py`, `app/agents/{state,graph,metrics_agent}.py`, new `app/agents/{career_agent,life_coach_agent,behavioral_scientist_agent,contradiction_agent,synthesis_agent,chat_agent}.py` + `app/agents/weighting.py`, `app/rag.py` + new `app/knowledge/{career_frameworks,labor_data,overlap}.jsonl`, `frontend/src/lib/store.js`, `frontend/src/lib/api.js` + `frontend/src/screens/{Profile,Dashboard}.jsx`, `scripts/eval_agent.py`, `training/prepare_data.py`, `dataset_registry.json`.

---

# Section 5 — Full UX Teardown & Redesign Prescription

*Grounded in the shipped code (`frontend/src/screens/*`, `styles.css` "two-blues" system, `lib/science.js`). Each item: what's weak → redesign → warmth/microcopy/trust. **P0** blocks the new direction, **P1** high-leverage, **P2** polish. North star: Bloomberg × Apple-Health × TradingView, emotionally safe.*

### 0. Cross-cutting (fix once, every screen benefits)
| # | Weakness | Redesign | Pri |
|---|---|---|---|
| X1 | No layer switch exists (hard-wired `profile.role`) | **Layer context** at `App.jsx`; segmented control in top-right Settings + slim header pill on Blueprint; each layer swaps algorithm, dimension set, accent. BOTH = two sub-indices → one master | **P0** |
| X2 | Settings scattered into Profile | Persistent **top-right gear** on every tab → sheet (Layer, engine, connected data, export, privacy, danger zone). Frees Profile for the AI counsellor | **P0** |
| X3 | Confidence shown inconsistently | Standardize a **confidence chip** (tentative/fair/well-grounded) + 1px underbar on every score surface; low-confidence renders desaturated | **P0** |
| X4 | No longitudinal spine | Reusable **TimelineSpine** (TRIVI scrubbable area + annotations) on Blueprint hero and every MetricDetail; tap a point → evidence quote | **P1** |
| X5 | Cold states lean on "Preview with sample data" | Warm **getting-started checklist** (Flux ref): "Record or import a session ▢ · Log today ▢ · Bring in a report ▢"; sample data behind a quiet link | **P1** |
| X6 | No data-display face | Keep Poppins headings (locked); add **mono-tabular** treatment for the hero index and KPI numbers | **P2** |
| X7 | Trust copy uneven | One persistent **`<TrustLine>`** per screen ("On your device · estimate, not diagnosis") | **P1** |

### 1. Bloom / Home (`screens/Home.jsx`)
**Weak:** the orb does one thing; no "welcome back"; session-code `123450` is a demo artifact; the "sealed until paired" default is a wall for self-directed users with no clinician.
**Redesign:** keep the orb-in-place recording; add a calm welcome-back strip ("Tuesday's blueprint: 64 · ▲3"). Reframe the start sheet around **intent**: Solo reflection (records, transcribes locally, analyzes immediately — no pairing wall), Verified session (QR two-party clinician flow), Import. Session code moves into Verified only, sourced from real pairing state. In BOTH/Professional, context tags ("work check-in" / "personal") route the right algorithm at capture.
**Warmth:** live caption for solo mode; "Saving to this device…" never "Uploading"; one-tap "?" privacy note.

### 2. Blueprint dashboard (`screens/Dashboard.jsx` — centerpiece)
**Weak:** a single-session snapshot wearing longitudinal clothes; no master-index/sub-index structure; "Setmycareer noticed" has no evidence link; no layer affordance or hero confidence; the focus card mixes gentle flags with a risk-colored pill.
**Redesign (per Section 3):** master index as headline (TRIVI big number) + period toggle + scrubbable all-time chart with annotations; tapping a point opens "what you said→changed→why." Sub-index row (PERSONAL = 7 rolled into 2–3; PROFESSIONAL = career sub-indices; BOTH = two masters). Keep `PhaseRing` as a labeled "This session" module, not the hero. Each "Setmycareer noticed" item gets a chevron → contributing sessions/quotes + confidence. `CheckinCells` graduates into the sub-index math visibly. Layer pill in header.
**Warmth:** header by layer ("Your mental health" / "Your professional signal" / "Your life-performance index"); confidence underbar everywhere; "adjusted for safety flags" note; footer "Estimates anchored to validated instruments — decision support, not a diagnosis. Computed on your device." Bloopers pill tonal, not alarm-red.

### 3. Sessions (`screens/Sessions.jsx`)
**Weak:** flat, unsortable/unfilterable; per-row score has no confidence or delta; import buried.
**Redesign (Activity ref):** sticky filter bar (layer · type · time); inline ▲/▼ delta or sparkline per row; group by month with one-line summaries; promote **Import** to a first-class branch (transcript · counsellor note · test report) feeding the 20% assessment weight; colored type tags (Verified green · Solo powder · Imported navy outline).
**Warmth:** empty state → checklist (X5); a11y row announces "Session with Maya, March 4, index 64, fair confidence, verified."

### 4. Session report (`screens/SessionDetail.jsx`)
**Weak:** densest/best screen but IA fails under accumulation (long mixed scroll, no anchors); two audiences in one scroll; inconsistent feedback grammar; `window.print()` PDF isn't obviously "Your blueprint."
**Redesign:** sticky segmented anchors (Reflection · Signals · Safety · Note · Transcript; client sees a subset); reorder by audience (reflection-first for clients, SOAP-first for clinicians); a "where this sits" strip placing the session on the all-time spine; **unify feedback grammar** ("Feels right / Too high / Too low" for scores; "This landed / Not quite / Too much advice" for reflections — visually identical); make **"Export your blueprint"** the named branded artifact with "share with clinician" vs "keep private."
**Warmth:** preserve the hedged summary, "language-only objective," and 988 line verbatim; mirror the print grid's `≈65 · fair · tentative confidence` phrasing on-screen; reassure on re-analyze.

### 5. Notes (`screens/Journal.jsx`)
**Weak:** self-entries only; spec defines Notes = entries + counsellor notes + uploaded reports; no type distinction, import, or parsing; the 10% journal weight is invisible.
**Redesign (MindMate warmth + import utility):** three note types, one timeline (Reflection / Counsellor note / Report) with a quiet left-edge color; report import → Setmycareer extracts instrument + score → clean card ("PHQ-9: 12 · moderate · imported Apr 3") feeding the validated weight and appearing as a baseline marker on the relevant MetricDetail; keep search/prompts/streak/autosave; add filter-by-type; show "contributed to your last blueprint."
**Warmth:** keep "One honest line counts"; counsellor-note line "Setmycareer reads it as context, never overrides your own words"; "Parsed on your device. The file and its numbers never leave."

### 6. Profile → AI counsellor (`screens/Profile.jsx` — biggest opportunity)
**Weak:** currently a settings dump; the chat doesn't exist.
**Redesign (net-new):** Profile becomes a chat surface grounded in the user's own data (RAG over transcripts, Notes, reports, timeline). Mode selector: Reflect / Strategize / Decide / Review / Prepare / Challenge. **Every answer cites the user's own account** ("You said this in your March 4 session…") with tap-through. Multi-agent reasoning runs behind a single warm voice, with optional "how Setmycareer reasoned." Identity header (name, layer, "since first session"); engine/export/wipe move to top-right Settings.
**Warmth:** plain-language mode descriptions; a persistent guardrail line ("decision support, not authority · never a diagnosis · in crisis call 988"); warm starter chips per mode; SSE streaming so chat shows reasoning life.

### 7. Top-right Settings (net-new)
Gear → sheet: **Layer** (PERSONAL/PROFESSIONAL/BOTH, each routes a different algorithm) · **Connected data** (Apple Health/Fit + on-device check-in) · **Engine** (model, transcription, "Server-side storage: none" chip) · **Your data** (export tuning, export blueprint PDF) · **Danger zone** (wipe, two-step confirm verbatim).

### Prioritized build order
| Order | Item | Why first |
|---|---|---|
| **P0-1** | Layer context + top-right Settings sheet (X1, X2, §7) | Unblocks the entire 3-layer direction |
| **P0-2** | Confidence standardization across all score surfaces (X3) | Core brand promise; cheap; touches every screen |
| **P0-3** | Profile → AI counsellor with modes + own-account citations (§6) | Headline new capability and primary differentiator |
| **P1-1** | Blueprint master-index + scrubbable timeline + "what you said→changed→why" (§2, X4) | Delivers the terminal vision; snapshot → longitudinal |
| **P1-2** | Notes: 3 types + report import feeding the validated weight (§5) | Feeds the weighting model; unlocks career assessments |
| **P1-3** | Sessions filter/group/delta + branched Import (§3) | Makes accumulation legible |
| **P2** | SessionDetail anchors + unified feedback grammar (§4); Home welcome-back + intent start sheet (§1); mono-tabular numbers (X6) | Polish that compounds the terminal feel |

**Tone guardrails:** warmth over clinical coldness; signal-language + confidence everywhere; never diagnose; "decision support, not authority"; privacy/local-first on every screen.
**Key files:** `frontend/src/App.jsx`, `screens/Dashboard.jsx`, `screens/Profile.jsx`, `screens/Journal.jsx`, `screens/Sessions.jsx`, `screens/SessionDetail.jsx`, `components/Nav.jsx`, `lib/science.js`, `styles.css`.

---

# Section 6 — Open Dataset / Assessment / Research Map

Disposition tags: **BUNDLE** (ship in-app) · **RETRIEVE** (fetch on-demand) · **TRAIN-ONLY** (offline train/eval, never ship raw) · **REFERENCE** (methodology/specs only). Reasoning follows Setmycareer's locked constraints.

### 1. Layer A — Mental Health / Reflective
**1.1 Validated clinical instruments**
| Instrument | Measures | License | Disposition | Feeds |
|---|---|---|---|---|
| **PHQ-9** | Depression (9) | **Public domain** (Pfizer/Spitzer) | **BUNDLE** | Mood; risk (item 9) |
| **GAD-7** | Anxiety (7) | **Public domain** | **BUNDLE** | Anxiety |
| **UCLA Loneliness** (R/v3) | Loneliness | **Public domain / free**, attribution (Russell 1996) | **BUNDLE** | Social |
| **PANAS** (1988) | Pos/neg affect (20) | **Free research/clinical, not formally PD** | **BUNDLE (low risk) / verify** | Affect |
| **ISI** | Insomnia (7) | **COPYRIGHTED** (Morin, U. Laval) | **RETRIEVE/license** — don't bundle verbatim; compute ISI-style score interim | Sleep |
| **RRS** + 10-item short | Rumination | **Copyrighted, free for research** | **REFERENCE/verify** — administer w/ attribution; confirm before commercial bundling | Cognitive-flex |
*Setmycareer's "energy" has no canonical scale — derive from PANAS activation + transcript, label as estimate.*

**1.2 Counseling transcript corpora (RAG/few-shot/eval — NOT shipped raw)**
AnnoMI (MI demos; no clean commercial license → **TRAIN-ONLY/eval**), HOPE/MEMO (CBT dialogue acts; research-only → **TRAIN-ONLY**), ESConv (strategy-annotated; academic → **TRAIN-ONLY**), EmpatheticDialogues (**CC BY-NC** → **TRAIN-ONLY non-commercial**, NC blocks shipping), CounselChat (clinician answers, rights unclear → **TRAIN-ONLY w/ caution**), MentalChat16K (synthetic + de-identified coach → **TRAIN-ONLY**, synthetic part usable for SFT), KMI/CPsDD (multilingual → **REFERENCE** if i18n).

**1.3 Emotion / affect**
NRC VAD/EmoLex (**commercial license required from NRC** → **TRAIN-ONLY/license**), EmoBank (CC-BY-style → **TRAIN-ONLY/eval**), **GoEmotions (Apache 2.0)** → **TRAIN-ONLY (commercial-OK)**. *Commercial-safe stack = GoEmotions + a self-built or licensed VAD layer; NRC is the research/eval reference.*

### 2. Layer B — Career / Professional
| Source | What | License | Disposition | Feeds |
|---|---|---|---|---|
| **O*NET** (v30.x) | 900+ occupations; skills/abilities/knowledge/activities/context, **Work Values**, RIASEC interests | **CC BY 4.0** — commercial OK w/ attribution | **BUNDLE** — the founder's locked open dataset | Career agent, occupation/skill matching, RIASEC mapping |
| **BLS** (EP/OOH/OEWS) | 10-yr outlook, growth %, wages, openings | **Public domain**; **free API, no key** | **BUNDLE (snapshot) + RETRIEVE (API refresh)** | Outlook/wage, career sub-index |
| **O*NET Work Values** | 6 work values mapped to occupations | CC BY 4.0 | **BUNDLE** | Motivation/alignment overlap |
| **ESCO** (EU) | Multilingual skills/occupations; O*NET crosswalk | **Free incl. commercial** | **BUNDLE (optional EU/i18n) / RETRIEVE** | Cross-border skill mapping |
| **Holland RIASEC (IPIP)** | PD interest markers | **Public domain** | **BUNDLE (administer)** | Career interest assessment |
| **JVIS / SIGMA** | Proprietary vocational/personality | **Proprietary** | **REFERENCE / license-only** — substitute free RIASEC/Big Five | Premium/licensed tier |

### 3. Layer C — Overlap (alignment, decision, motivation, personality)
**Big Five / IPIP** (PD → **BUNDLE administer**); **Open-Source Psychometrics** raw response sets (open → **TRAIN-ONLY / norming** for percentile bands, not individual redistribution); **O*NET Work Values + Big Five + RIASEC together** (CC BY/PD → **BUNDLE derived logic** = the core alignment metric); Career Values Scale / CIP theory (mixed → **REFERENCE** for Decide/Prepare framing); Helping Skills Theory + MI spirit (**REFERENCE** for synthesis weighting/motivation modeling).

### 4. Decision summary
**Safe to BUNDLE now (commercial-clean):** O*NET (CC BY 4.0), BLS (PD), ESCO (free); PHQ-9, GAD-7, UCLA, RIASEC markers, Big Five/IPIP (PD); GoEmotions (Apache 2.0); PANAS, RRS (bundle w/ attribution, **verify commercial**).
**RETRIEVE:** BLS Public Data API (no key) for live outlook/wage over the bundled snapshot.
**TRAIN-ONLY / eval:** AnnoMI, HOPE, MEMO, ESConv, CounselChat, MentalChat16K; EmpatheticDialogues (**CC BY-NC**, non-commercial only); Open-Psychometrics raw sets (norming).
**LICENSE-REQUIRED before any commercial use:** NRC VAD/EmoLex; ISI; JVIS/SIGMA (substitute free RIASEC/Big Five).
**Recommended commercial-safe default stack:** O*NET + BLS + ESCO · public-domain PHQ-9/GAD-7/UCLA/Big Five/RIASEC + verified PANAS/RRS · GoEmotions + self-built/licensed VAD · all transcript corpora train-only/eval, preferring synthetic (MentalChat16K) and Apache/PD sources for anything touching shipped behavior.

---

# Prioritized, easiest-first build roadmap (waves)

Sequenced to **build on the current stack, ship value early, defer training**. Each item: what · why · effort (S/M/L) · dependencies. ⚡ = quick win.

### Wave 0 — Spine + safety net (no model training, mostly local)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 0.1 ⚡ | `settings.layer` store + **top-right gear/Settings sheet** (X1, X2); `App.jsx` layer context | Unblocks the entire 3-layer direction; everything branches on it | S | — |
| 0.2 ⚡ | **Confidence chip + 1px underbar** standardized across all score surfaces (X3) | Core brand promise; cheap; touches every screen | S | — |
| 0.3 | **`indexHistory`** append-only IndexedDB store + write it on every analyze | The single most important new structure; powers timeline, trend, patterns | M | — |
| 0.4 | **Generalize `scripts/eval_agent.py`** to multi-agent/multi-layer + **calibration** (MAE/within-band) + keep blocking crisis gate | The trip-wire that gates all later work and any training | M | — |
| 0.5 ⚡ | Warm **getting-started checklist** replacing "Preview with sample data" (X5); shared `<TrustLine>` (X7) | First-session warmth + consistent trust positioning | S | — |

*Exit:* timeline data accrues from real sessions; scorecard green on existing nodes; confidence visible everywhere.

### Wave 1 — Longitudinal terminal (the visible payoff)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 1.1 | **Blueprint master-index hero + scrubbable all-time TimelineSpine** with annotations (§2/§3, X4) | Converts snapshot app → longitudinal "stock terminal" — the headline visual | L | 0.3 |
| 1.2 | **"What you said → what changed → why" forensics three-pane** wrapping `Trace` | The locked scrub feature; ties index moves to verbatim evidence | M | 1.1 |
| 1.3 ⚡ | **MoversStrip + sortable TickerBoard** from existing `focus`/`recoveryNode`/`SignalCard` | Bloom/Bloopers surfacing with near-zero new data | S | 0.2 |
| 1.4 | **Sessions filter/group/delta + branched Import** (§3) | Makes accumulation legible; first-class import path | M | 0.1 |

*Exit:* a returning user sees their index move over time, can scrub to any session, and tap any point to the quote that moved it.

### Wave 2 — Richer inputs + first reasoning agents (prompt + RAG, no training)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 2.1 | **`AnalyzeRequest` + `app/agents/state.py`** extended (`layer`, `assessments`, `notes`, `reports`, `history`, per-agent `confidence`) | Plumbing for everything downstream | M | 0.1, 0.3 |
| 2.2 | Deterministic **`app/weighting.py` + `app/confidence.py`** (source→dim caps, recency decay, corroboration gate; per-metric→index propagation) | The auditable math core; must precede any new agent's numbers | M | 2.1 |
| 2.3 | Promote the reflection verifier to a first-class **`evidence_verifier`** node (shared gate) | Trust backbone for all new agents | M | 2.1 |
| 2.4 | **Notes: 3 types + `/api/import/report`** parsing → cards + baseline markers (§5) | Feeds the 20% validated + 10% counsellor weights; unlocks assessments | M | 2.1, 2.2 |
| 2.5 | **`behavioral_scientist_agent` + `contradiction_agent`** over `history` | Mechanism/leading-indicator read + consistency checks; the "why" behind moves | M | 2.2, 2.3, 0.3 |

*Exit:* `personal_metrics` + `contradiction` eval gates pass; calibration MAE baseline recorded; reports/assessments visibly inform the index (capped).

### Wave 3 — PROFESSIONAL layer (RAG + agentic, still no training)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 3.1 | Bundle **`labor_data.jsonl` (O*NET/BLS/ESCO)** + `career_frameworks.jsonl`; `rag.py` `corpus` arg + lazy multi-index | Open, commercial-clean career grounding | M | — |
| 3.2 | **`/api/labor/*`** endpoints (occupation, search) over the bundled corpus | Citeable labor data points for career agent + chat | S | 3.1 |
| 3.3 | **`career_agent`** (mirrors metrics shape) + RIASEC/Holland + Big Five intake | The professional sub-index | L | 2.1, 2.2, 3.1 |
| 3.4 | **`layer_router` + `synthesis_agent`** + master index (α/β); non-contamination **unit test** | BOTH-mode master index with structural isolation guarantee | M | 3.3, 2.2 |

*Exit:* `professional` gate passes; weighting unit test proves PERSONAL/PROFESSIONAL never average together.

### Wave 4 — AI counsellor + BOTH (chat, RAG-grounded, agentic NOW)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 4.1 | **`/api/chat[/stream]`** + `chat_agent` (6 modes, account snapshot RAG, every claim cited, SSE) | The headline new capability and primary differentiator | L | 3.1, 2.1 |
| 4.2 | **Profile → AI counsellor UI** (mode chips, citations tap-through, guardrail footer) (§6) | Turns the settings dump into the flagship destination | L | 4.1, 0.1 |
| 4.3 | **`life_coach_agent` + `overlap.jsonl`**; BOTH-mode cross-lane contradiction band | The Life-Performance OS integration layer | M | 3.4, 4.1 |
| 4.4 | **SessionDetail anchors + unified feedback grammar; Home welcome-back + intent start sheet; mono-tabular numbers** (P2 polish) | Compounds the terminal feel | M | 1.1 |

*Exit:* `chat` + `crisis` gates pass across all modes; BOTH mode shows two stacked terminals + a meta contradiction band.

### Wave 5 — Training (ONLY where eval proves a bottleneck)
| # | What | Why | Effort | Depends on |
|---|---|---|---|---|
| 5.1 | `Setmycareer-note-lora` (transcript→SOAP voice) | Highest-priority style adapter; already scoped | L | 0.4 + plateau evidence |
| 5.2 | `Setmycareer-blueprint-lora` (transcript→dimension JSON, trained on "feels right" outputs) | Calibration lift once prompt iteration plateaus | L | 5.1, calibration eval |
| 5.3 | `Setmycareer-career-lora` | Only after Phase 2 ships and `professional` eval shows prompt-only is the measured bottleneck | L | 3.4, professional eval |

**Greenlight rule (all of Wave 5):** stable eval set + plateaued prompt scores + tuned adapter beats prompt on held-out + real user-rated cases. Crisis/risk stays prompt-engineered + rule-gated forever.

---

# Open questions / risks

**Trust & over-interpretation**
- **The terminal metaphor can over-promise precision.** A scrubbable line with "this quote lowered Sleep by 7" reads like measurement, not estimate. Mitigation: confidence bands rendered as opacity, "estimate, not measurement" on every Δ attribution, EWMA smoothing so single sessions nudge not whip. *Open:* is per-quote Δ attribution defensible at all, or should it stay at the session level?
- **Cross-lane links are the riskiest inference.** "Career rising while mood dropping" can read as causal. They must stay evidence-gated hypotheses, never folded into a number. *Open:* what confidence floor should suppress a cross-lane link entirely?
- **Career "realism" / "aspiration_realism" risks discouragement.** A gap-to-market signal can land as "you can't do this." *Open:* how to phrase market-reality signals as decision support without deflating — and should they be opt-in?
- **Counsellor notes vs. the client's own number.** The corroboration gate forbids sole-source origination, but a clinician reading the dashboard may over-weight it anyway. *Open:* should the clinician view visually distinguish client-originated vs. corroborated scores?

**Privacy**
- **The `account` snapshot sent to `/api/chat` is the largest privacy surface yet** — transcripts + indexHistory + reports in one request body. Stateless processing is the guarantee, but *open:* what's the maximum payload before we need on-device retrieval/embedding instead of shipping the whole account? And do we need explicit per-request consent UI for chat?
- **Recommending Claude Opus 4.8 for reasoning agents routes user data to a third-party API.** This must be disclosed in the engine/Settings panel and reconciled with "server stores nothing" (Anthropic's data-retention terms apply to the transient request). *Open:* per-agent provider choice surfaced to the user, or a single global toggle?
- **Uploaded reports may contain third-party PHI** (a clinician's note about others, a partner mentioned). *Open:* do we scrub/flag third-party identifiers on import?

**Rate limits & cost**
- **Multi-agent fan-out multiplies API calls per analyze.** 8 nodes → ~12+, several on Opus-tier. *Open:* expected latency/cost per analyze at scale; which nodes can drop to Haiku/Groq without eval regression? Prompt-cache the frozen agent prompts (rubrics/persona) if on Anthropic.
- **SSE streaming chat + the analyze pipeline both hold long connections.** *Open:* concurrency ceiling on the FastAPI host; do we need per-user queuing or a token-budget cap (Opus 4.8 Task Budgets) on agentic loops?
- **BLS API refresh** is free/no-key but rate-limited per IP. Since the server is stateless and shared, a refresh storm could throttle. *Open:* cache the BLS snapshot server-side-transiently or push refresh to the device?

**Calibration & eval**
- **Gold labels for new agents barely exist.** Career reads, contradiction recall, and chat mode-fidelity have no ground truth yet. *Open:* who labels? The in-app "feels right" loop covers personal metrics but not career/contradiction.
- **The crisis gate must hold across the new chat surface and the career layer** (e.g. job-loss despair shading into SI). *Open:* is region-aware crisis routing (`crisisRegion` in settings) reliable enough to ship globally, or do we gate non-US launch?

**Naming & scope**
- **"Stock terminal for the self" risks gamifying mental health** for vulnerable users (chasing a higher index, anxiety about a dip). The Bloopers/warm framing helps, but *open:* should the PERSONAL layer suppress competitive/streak mechanics that the PROFESSIONAL layer can safely use?
- **Licensing residuals:** ISI, RRS, PANAS, NRC are the load-bearing "verify before commercial" items. *Open:* legal sign-off on PANAS/RRS bundling, and a decision on ISI (license vs. build an ISI-style sleep score from own items) before any paid launch."
  }