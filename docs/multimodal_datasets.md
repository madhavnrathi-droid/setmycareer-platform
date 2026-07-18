# Setmycareer — multimodal wellness datasets (v3)

Connecting **mental health × physical health × behavior × voice × longitudinal
patterns**. Full machine-readable list: `dataset_registry.json` (34 entries, 4 tiers).

> **The strategic call:** the live product's wellness intelligence runs on the
> user's OWN device signals (daily check-in sleep/movement/stress, journal
> moods, Blueprint dimensions over time) via deterministic nodes in
> `frontend/src/lib/wellness.js`. The research sensor datasets below are
> *future training/validation fuel* — almost all are research-only or gated and
> multi-GB. We document + scaffold them; we do **not** bulk-download GBs we
> can't legally train on yet. That's the startup-friendly, license-safe path.

## Audit — coverage vs. the requested signal gaps

| signal | status now | source when needed |
|---|---|---|
| emotional speech / voice emotion | MELD **text** processed (11.7k) | RAVDESS/CREMA-D on-demand; IEMOCAP/MSP gated |
| voice biomarkers / distress | **gap** (no open clinical voice) | DAIC-WOZ (gated EULA) — no open substitute |
| sleep | **gap** in datasets; live = user check-in | LifeSnaps (open) · Sleep-EDFx (open, EEG) · NSRR (gated) |
| activity / behavior | live = user check-in | ExtraSensory · StudentLife (research) |
| stress / physiology / HRV | live = user check-in (1-5) | WESAD · SWELL-KW (gated) |
| burnout | **derived** (BurnoutNode composite) | no labeled set exists — compute it |
| loneliness / social withdrawal | partial (session dimension) | Reality Mining / Friends&Family (gated) |
| longitudinal patterns | **live** (on-device, no dataset needed) | — |

## Storage
`data/multimodal/{sleep,stress,activity,physiology,voice,behavioral,longitudinal}/`
— populated on demand by `scripts/ingest/audio_on_demand.py`; empty by design now.

## Dataset notes (license · commercial · usage)

### Stress + physiology
- **WESAD** — academic-open, ~2.1GB. EDA/HR/temp/resp/ACC, lab stress. Commercial **conditional**. → StressNode/BurnoutNode feature research. On-demand.
- **SWELL-KW** — Radboud, **gated** (DANS request). HRV + workload + stress. Research-only. → BurnoutNode HRV research.
- **PhysioNet stress sets** (e.g. WESAD mirror, drivedb) — mixed ODC-BY/open. Use only ODC-BY ones; many need PhysioNet credentialing.

### Sleep + mood
- **StudentLife** — research license + citation, downloadable. Sleep/GPS/activity/phone/EMA mood, 48 students × 10wk. **The canonical passive-sensing↔mood set.** → LongitudinalWellnessNode/Loneliness/Burnout *validation* (not commercial).
- **NSRR** — **gated** (DUA + approvals), clinical PSG/PHI. Commercial ✗, confidence low. Overkill for Setmycareer now.
- **Sleep-EDFx** — PhysioNet, **ODC-BY (commercial OK)**, open. But it's EEG sleep-staging with no mood labels → low product relevance; Setmycareer reads device sleep instead.

### Activity + behavior
- **ExtraSensory** — UCSD, research use. Phone+watch context labels, 60 users. → its label schema is a great **template** for BehaviorNode. Validation only.
- **Reality Mining** / **Friends & Family** — MIT Reality Commons, **gated** registration; 2004-era. Concepts inform Loneliness/SocialHealth nodes; the data itself is dated/low-value.

### Voice + emotional speech
- **DAIC-WOZ** — **gated** (USC ICT EULA). Depression interviews (transcript+audio+pauses). The ideal VoiceDistress/Safety source — **no open substitute exists.** Interim: text language signals from counsel_chat + GoEmotions grief/sadness, rule+prompt gated.
- **IEMOCAP** (gated form) · **MSP-IMPROV** (gated academic) — acted emotional speech.
- **MELD** — text processed now; full A/V on-demand (~10GB). Acted (Friends) → bootstrap/eval only.
- **RAVDESS** (CC BY-NC-SA) · **CREMA-D** (ODbL) — on-demand; acted, non-commercial/share-alike.

## Wellness nodes (live, in `frontend/src/lib/wellness.js`)

Deterministic, explainable, on-device — **context, never diagnosis**:

| node | reads | emits |
|---|---|---|
| SleepNode | check-in sleepHrs + session sleep dim | quality (poor/fair/good), score, avg_hours |
| StressNode | check-in stress + anxiety dim | load 0-1, label |
| SocialNode | social_connectedness dim | energy 0-1, label |
| BurnoutNode | sleep + stress + energy composite | risk 0-1, label |
| RecoveryNode | wellbeing index trend | improving/steady/declining |
| WellnessContextNode | all of the above | `{sleep_quality, stress_load, social_energy, burnout_risk, recovery_trend, response_style}` |

`response_style` (`gentle_support` / `soft_check_in` / `warm_encouraging` /
`steady_reflective`) is injected into the agent's analyze context to tune
empathy level & pacing, and shown on the dashboard as "Today Setmycareer will lean toward…".

**Longitudinal patterning** (`longitudinalPatterns`): compares a recent 3-4 day
window to the prior one for sleep / activity / stress / social. Surfaces at most
2 observations, only with ≥2 points per window and a meaningful shift, always
hedged and framed as an invitation — e.g. *"Your sleep's been a bit shorter the
last few days… does today feel heavier than usual?"* Safe weighting: no single
bad day triggers it; it never diagnoses; it never piles on.

## RAG retrieval (wired into LangGraph)

`app/rag.py` (pure-stdlib TF-IDF over `app/knowledge/frameworks.jsonl`, 372
chunks) → new `framework_retriever` node runs after pattern extraction and
grounds the note generator's Plan/homework in real CBT/DBT/ACT/MI/WHO material.
Offline neural-upgrade substrate: `data/embeddings/` (TF-IDF vectors for
frameworks + counsel_chat, swap-in contract for sentence-transformers later).

## Final recommendations

**1. Top datasets = 80% of value:** go_emotions, esconv, counsel_chat,
mentalchat16k, frameworks-RAG (already live) + **LifeSnaps** (only commercially
safe sleep/activity↔mood set) when wellness modeling ships.

**2. Overkill / skip:** NSRR (clinical PSG, huge approval burden), Sleep-EDFx
(EEG, no mood), Reality Mining / Friends&Family (2004 data), Psych-101 (not counseling).

**3. Require applications:** DAIC-WOZ, CLPsych, IEMOCAP, MSP-IMPROV, SWELL-KW,
NSRR, Reality Commons — all gated.

**4. Licensing concerns:** most physio/behavior sets are research-only → fine for
validation, **never** for a shipped/commercial model. Commercial-safe core stays
go_emotions/mentalchat16k/counsel_chat + LifeSnaps + synthetic + user feedback.

**5. Ethical risks:** passive-sensing data (StudentLife/Reality Mining) is
intimate — validation only, never re-identify. Acted speech overfits theatrical
prosody. **No dataset here licenses a suicide classifier** → SafetyNode stays
rule+prompt+human-escalation (988).

**6. Product-usefulness ranking:** wellness *nodes on user data* ≫ any research
dataset for the live product. The datasets matter only at training time.

**7. Should influence response generation:** the live wellness nodes
(response_style, longitudinal patterns) + frameworks RAG.

**8. Should only influence hidden context:** burnout_risk, stress_load,
sleep_quality — they tune tone/pacing silently; we surface a soft summary, never
a clinical readout, to avoid alarming the user.

Rebuild: `python scripts/preprocess/build_rag.py && python scripts/preprocess/embed_rag.py && python scripts/validate/validate.py`
