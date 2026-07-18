# Setmycareer — dataset registry & documentation (v2)

> `scripts/ingest → scripts/normalize → scripts/validate` →
> `data/processed/*.jsonl` (one schema) + `dataset_registry.json` (27 entries).
> RAG corpus: `scripts/preprocess/build_rag.py` → `data/rag/frameworks.jsonl`.
> Data is git- & railway-ignored; rebuild with the three commands at the bottom.
> **No training has been run.** Licenses verified against HF card data at ingest.

## Unified schema (`data/processed/*.jsonl`)

```json
{ "id": "esconv:1a2b3c", "dataset": "esconv", "lang": "en",
  "context": "...", "response": "...", "emotion": "anxiety",
  "valence": "negative", "intensity": 0.45, "vad": {"valence": 2.2, "arousal": 3.4, "dominance": 2.9},
  "support_strategy": "Reflection of feelings", "topic": "job crisis",
  "tags": {"safety": ["suicidality"], "intervention": ["mindfulness"]},
  "license": "research-only (ESConv terms)" }
```
`intensity`/`vad` are EmoBank-only (null elsewhere). Tags are keyword heuristics
for routing/filtering — never a crisis classifier.

---

## A · Processed now (12 sets, ~258k rows, 120 MB)

| rank | dataset | rows | license | commercial | nodes |
|---|---|---:|---|---|---|
| high | esconv | 13,966 | research-only | ✗ | TherapyRouter, SupportStrategySelector |
| high | counsel_chat | 2,600 | MIT (repo) | ✓ | RAG, EmpathyEvaluator, NoteStyle |
| high | **mentalchat16k** | 15,964 | **MIT** | ✓ | EmpathyEvaluator, NoteStyle, StrategySelector |
| high | empathetic_dialogues | 47,385 | CC BY-NC | ✗ | EmpathyEvaluator, RewriteAgent |
| high | go_emotions | 53,865 | Apache-2.0 | ✓ | EmotionDetectionNode |
| medium | **emobank** | 9,776 | CC BY-SA 4.0 | conditional (share-alike) | EmotionDetection (intensity/VAD) |
| medium | **meld** (text) | 11,703 | research | ✗ | VoiceEmotion text-bootstrap, ConversationalEmotion |
| medium | emotion (dair-ai) | 19,947 | research/edu | ✗ | EmotionDetection ensemble |
| medium | **mh_chatbot_faq** | 171 | MIT | ✓ | RAG/Psychoeducation |
| medium | **mh_faq** | 98 | MIT (Kaggle-origin — retrieval only) | ✓ | RAG/Psychoeducation |
| experimental | daily_dialog | 79,921 | CC BY-NC-SA | ✗ | realism reference; keep out of therapy-tone mixes |
| **avoid** | mh_counseling (Amod) | 2,015 | openrail | ✓ | **99% duplicate of counsel_chat — superseded** |

### RAG corpus (`data/rag/frameworks.jsonl`, 372 chunks)
WHO mhGAP v2 (316 chunks, CC BY-NC-SA IGO) · CCI behavioural-strategies +
unhelpful-thinking-styles (51) · curated CBT/DBT/ACT/MI/guidelines summaries (5,
authored in `docs/frameworks/` — DBT/ACT/MI manuals are copyrighted books, we
summarize with citations). APA & NICE: cite/link only (their reuse terms).
counsel_chat + the two FAQ sets double as RAG sources. Embeddings deferred.

## B · Gated (apply — cannot be scripted)
DAIC-WOZ (USC EULA; **no open substitute** for clinical depression interviews),
CLPsych (per-task DUAs), IEMOCAP (USC form), MSP-IMPROV (UTD license).
Interim for SafetyNode language: counsel_chat + GoEmotions grief/sadness slices,
prompt+rule-gated, human escalation (988) — per plan, never train crisis from scratch.

## C · On-demand (scripted, not cached)
`audio_on_demand.py`: ravdess (CC BY-NC-SA, 1.1GB) · crema_d (ODbL) ·
meld A/V (~10GB) · **wesad** (stress+HRV wearable, ~2.1GB) ·
**lifesnaps** (CC BY 4.0 — fitbit + mood EMA, 71 users × 4 months; the best
*commercially safe* sleep/activity↔mood set; fetch when wellness-context modeling is scheduled).

## D · Avoid (with reasons)
mh_counseling (duplicate) · PsyQA mirrors (official is gated; mirrors unlicensed; zh) ·
LuangMV97 empathetic counseling (**no license declared**) · samhog/psychology-10k
(no license + GPT-generated) · Felladrin pretrain merge (re-imports our duplicates) ·
Reddit MH scrapes (consent/ToS/deanonymization) · Crisis-Text-Line-style logs (hard no).
Psych-101 (Apache) is registered "experimental": cognition experiments, not counseling.

---

## Node map

| node | datasets |
|---|---|
| EmotionDetectionNode | go_emotions (train) + emotion (ensemble) + emobank (intensity/VAD) |
| EmpathyEvaluatorNode | empathetic_dialogues (eval-only, NC) + counsel_chat + mentalchat16k |
| TherapyRouterNode | esconv strategy taxonomy (prompt design) + frameworks RAG |
| SafetyNode | rule+prompt gated; DAIC-WOZ/CLPsych post-application |
| VoiceEmotionNode | meld text now; ravdess/crema_d/meld-AV on demand; IEMOCAP/MSP gated |
| RAG / Psychoeducation | data/rag/frameworks.jsonl + counsel_chat + mh_chatbot_faq + mh_faq |
| Sleep/Activity/StressContext | lifesnaps + wesad (on demand) |
| MemoryNode | user's own sessions/journal/feedback (on-device) — no external set needed |

## The 80/20 (top value for Setmycareer)

1. **esconv** — the only strategy-annotated support corpus; powers routing + timing.
2. **go_emotions** — Apache, big, fine-grained; the emotion backbone.
3. **counsel_chat** — commercially safe therapist voice + RAG.
4. **mentalchat16k** — MIT, 16k modern counseling pairs; the main commercially safe style set.
5. **frameworks RAG (372 chunks)** — grounds every "try this" in CBT/DBT/ACT/MI/WHO.
6. **lifesnaps** (when wellness ships) — CC BY, real-world sleep/mood.

## Usage tiers (training vs retrieval vs evaluation)

| use | sets |
|---|---|
| **may influence commercial training** | go_emotions, mentalchat16k, counsel_chat, (emobank w/ share-alike), synthetic, in-app "feels right" feedback |
| **retrieval only** | frameworks RAG, mh_chatbot_faq, mh_faq, counsel_chat verbatim text |
| **evaluator / prompt-design only** | empathetic_dialogues, esconv, emotion, meld, daily_dialog (all NC/research) |
| **never** | anything in section D |

## Risk ledger
- **NC/research licenses** on esconv + empathetic_dialogues: their *taxonomies*
  inform prompts freely; their *text* must not train shipped models.
- **Acted emotion** (MELD/RAVDESS/CREMA-D/IEMOCAP): theatrical prosody — bootstrap/eval only.
- **MentalChat16K** is partly GPT-synthesized from interview paraphrases — good
  style, weak ground truth; don't treat as clinical fact source.
- **counsel_chat verbatim**: RAG-summarize, don't republish therapist answers.
- **Quality noise**: daily_dialog dups (-8.9k) and meld scriptedness already flagged in registry notes.
- **Crisis gap** stands: no dataset here licenses a suicide classifier; SafetyNode stays rule+prompt+human-escalation.

## Rebuild
```bash
.venv/bin/python scripts/ingest/hf_text.py
.venv/bin/python scripts/ingest/fetch_frameworks.py
.venv/bin/python scripts/normalize/normalize.py
.venv/bin/python scripts/preprocess/build_rag.py
.venv/bin/python scripts/validate/validate.py
```
