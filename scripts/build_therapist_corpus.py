"""Build the therapist grounding corpus from the processed datasets.

Outputs (all committed, stdlib-only so it runs anywhere):
  app/knowledge/therapist_exemplars.jsonl   curated client→counselor exemplars
                                             (few-shot voice anchors for the reflection node)
  app/knowledge/params.json                  emotion taxonomy, support strategies, distortions
  data/finetune/therapist_sft.jsonl          chat-format SFT export (persona + exemplars) for
                                             later fine-tuning of a dedicated model

Run from the repo root:  python scripts/build_therapist_corpus.py
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
KNOW = ROOT / "app" / "knowledge"
FT = ROOT / "data" / "finetune"

# MIT-licensed real-counselor sources are safe to bake into the app as voice
# anchors; research-only sets (esconv, empathetic) are used only to derive the
# strategy/emotion *taxonomy*, never copied as exemplar text.
EXEMPLAR_SOURCES = ["counsel_chat.jsonl", "mentalchat16k.jsonl"]
TAXONOMY_SOURCES = ["esconv.jsonl", "empathetic_dialogues.jsonl", "go_emotions.jsonl", "emobank.jsonl"]

VALIDATING = ("understand", "hear you", "makes sense", "it's okay", "valid", "not alone",
              "thank you for sharing", "that sounds", "i can imagine", "it's understandable",
              "courage", "brave", "commendable", "i'm glad")
# style anchors should not be crisis transcripts
SAFETY_EXCLUDE = {"abuse", "self_harm", "suicide", "violence", "crisis"}

COGNITIVE_DISTORTIONS = [
    "all-or-nothing thinking", "catastrophizing", "overgeneralization", "mind reading",
    "fortune telling", "emotional reasoning", "should statements", "labeling",
    "personalization", "mental filter", "disqualifying the positive", "magnification",
]


def read_jsonl(path: Path):
    if not path.exists():
        return
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def quality(rec: dict) -> float:
    """Heuristic: reward validation, an invitation (question), and concreteness."""
    ctx, resp = rec.get("context", "") or "", rec.get("response", "") or ""
    if rec.get("lang", "en") != "en":
        return -1
    if not (40 <= len(ctx) <= 1100 and 220 <= len(resp) <= 1400):
        return -1
    safety = set((rec.get("tags") or {}).get("safety", []) or [])
    if safety & SAFETY_EXCLUDE:
        return -1
    low = resp.lower()
    score = 0.0
    score += sum(1.5 for p in VALIDATING if p in low)        # warmth
    score += 1.2 if "?" in resp else 0                        # invites the person in
    score += 0.6 if any(w in low for w in ("you might", "try", "could", "let's", "what if", "notice")) else 0
    score += min(len(resp) / 600.0, 1.2)                      # substance (capped)
    score -= 2.0 if low.count("you should") > 1 else 0        # penalize lecturing
    return score


def build_exemplars():
    rows = []
    for src in EXEMPLAR_SOURCES:
        scored = []
        for rec in read_jsonl(PROC / src):
            q = quality(rec)
            if q > 0:
                scored.append((q, rec))
        scored.sort(key=lambda x: x[0], reverse=True)
        # diversify by topic so anchors aren't all "depression"
        per_topic, picked = Counter(), []
        for q, rec in scored:
            t = (rec.get("topic") or "general").strip() or "general"
            if per_topic[t] >= 12:
                continue
            per_topic[t] += 1
            picked.append(rec)
            if len(picked) >= 220:
                break
        rows.extend(picked)

    seen, out = set(), []
    for rec in rows:
        key = (rec.get("context", "")[:60]).lower()
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "id": rec.get("id"),
            "source": rec.get("dataset"),
            "topic": (rec.get("topic") or "").strip(),
            "context": rec.get("context", "").strip(),
            "response": rec.get("response", "").strip(),
            "support_strategy": (rec.get("support_strategy") or "").strip(),
            "license": rec.get("license", ""),
        })
    KNOW.mkdir(parents=True, exist_ok=True)
    with (KNOW / "therapist_exemplars.jsonl").open("w", encoding="utf-8") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"therapist_exemplars.jsonl: {len(out)} exemplars")
    return out


def build_params():
    emotions, strategies, valences = Counter(), Counter(), Counter()
    for src in TAXONOMY_SOURCES:
        for rec in read_jsonl(PROC / src):
            if e := (rec.get("emotion") or "").strip().lower():
                emotions[e] += 1
            if s := (rec.get("support_strategy") or "").strip():
                strategies[s] += 1
            if v := (rec.get("valence") or "").strip().lower():
                valences[v] += 1
    params = {
        "emotions": [e for e, _ in emotions.most_common(40)],
        "support_strategies": sorted(strategies),
        "valences": sorted(valences),
        "cognitive_distortions": COGNITIVE_DISTORTIONS,
        "note": "Derived from the processed datasets for consistent agent vocabulary.",
    }
    with (KNOW / "params.json").open("w", encoding="utf-8") as f:
        json.dump(params, f, ensure_ascii=False, indent=2)
    print(f"params.json: {len(params['emotions'])} emotions, "
          f"{len(params['support_strategies'])} strategies")
    return params


def build_sft(exemplars):
    try:
        from app.agents.persona import PERSONA
    except Exception:
        PERSONA = "You are a warm, evidence-based therapeutic companion."
    sys = (PERSONA + "\n\nGiven what the person shares, respond as a skilled, "
           "warm counselor would: validate first, be specific, then offer at most one "
           "small, doable step or an open question. Ground everything in what they said.")
    FT.mkdir(parents=True, exist_ok=True)
    n = 0
    with (FT / "therapist_sft.jsonl").open("w", encoding="utf-8") as f:
        for r in exemplars:
            if not (r["context"] and r["response"]):
                continue
            f.write(json.dumps({"messages": [
                {"role": "system", "content": sys},
                {"role": "user", "content": r["context"]},
                {"role": "assistant", "content": r["response"]},
            ]}, ensure_ascii=False) + "\n")
            n += 1
    print(f"therapist_sft.jsonl: {n} training examples")


if __name__ == "__main__":
    ex = build_exemplars()
    build_params()
    build_sft(ex)
    print("done.")
