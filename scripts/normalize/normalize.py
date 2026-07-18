"""Normalize every raw dataset into ONE schema → data/processed/<name>.jsonl

Unified row:
{
  "id":         "<dataset>:<hash8>",
  "dataset":    "...",
  "lang":       "en|zh",
  "context":    "what the person said / situation",
  "response":   "supportive reply (empty for pure-classification sets)",
  "emotion":    "primary emotion label or ''",
  "valence":    "positive|negative|ambiguous|neutral|''",
  "support_strategy": "ESConv strategy or ''",
  "topic":      "free-text topic or ''",
  "tags":       {"safety": [...], "intervention": [...]},
  "license":    "...",
}

Dedupe: exact-normalized-text hash within a dataset.
Tags: fast keyword heuristics (no LLM calls) — recall-oriented safety flags so
downstream nodes can route/filter; NOT a crisis classifier.

Run:  .venv/bin/python scripts/normalize/normalize.py [name ...]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

# ---- emotion → valence -----------------------------------------------------
POS = {"joy", "love", "gratitude", "admiration", "amusement", "approval",
       "caring", "excitement", "optimism", "pride", "relief", "contentment",
       "hopeful", "proud", "grateful", "impressed", "excited", "joyful",
       "trusting", "confident", "faithful", "caring2", "happiness", "happy", "surprise"}
NEG = {"sadness", "anger", "fear", "disgust", "grief", "remorse", "annoyance",
       "disappointment", "disapproval", "embarrassment", "nervousness",
       "sad", "angry", "afraid", "terrified", "anxious", "lonely", "guilty",
       "ashamed", "devastated", "disappointed", "embarrassed", "furious",
       "jealous", "annoyed", "disgusted", "apprehensive", "depression",
       "shame", "fear2", "frustrated"}
AMB = {"surprise", "realization", "confusion", "curiosity", "desire",
       "anticipating", "nostalgic", "sentimental", "prepared", "neutral"}


def valence(emo: str) -> str:
    e = (emo or "").lower()
    if not e:
        return ""
    if e in POS:
        return "positive"
    if e in NEG:
        return "negative"
    if e in AMB:
        return "ambiguous"
    return "ambiguous"


# ---- safety / intervention keyword tagging ----------------------------------
SAFETY_PATTERNS = {
    "suicidality": r"\b(suicid\w*|kill (myself|me)|end (it all|my life)|don'?t want to (live|be alive)|better off dead)\b",
    "self_harm": r"\b(self[- ]?harm\w*|cut(ting)? myself|hurt(ing)? myself)\b",
    "abuse": r"\b(abus(e|ive|ed)|assault\w*|molest\w*|rape\w*)\b",
    "substance": r"\b(overdos\w*|relaps\w*|addict\w*|alcohol\w* problem)\b",
}
INTERVENTION_PATTERNS = {
    "cbt": r"\b(cognitive|reframe|reframing|thought record|automatic thought|distortion)\b",
    "behavioral_activation": r"\b(behavio(u)?ral activation|schedule (an |one )?activit|small step)\b",
    "mindfulness": r"\b(mindful\w*|breathing exercise|grounding|meditat\w*)\b",
    "social_support": r"\b(reach(ing)? out|talk to (a |your )?(friend|family|someone)|support (system|network))\b",
    "professional_help": r"\b(therap(y|ist)|counsel(or|ing)|psychiatrist|professional help)\b",
}
SAFETY = {k: re.compile(v, re.I) for k, v in SAFETY_PATTERNS.items()}
INTERV = {k: re.compile(v, re.I) for k, v in INTERVENTION_PATTERNS.items()}


def tags_for(text: str) -> dict:
    return {
        "safety": [k for k, rx in SAFETY.items() if rx.search(text)],
        "intervention": [k for k, rx in INTERV.items() if rx.search(text)],
    }


def rows_of(name: str) -> pd.DataFrame:
    parts = [pd.read_parquet(p) for p in sorted((RAW / name).glob("*.parquet"))]
    parts += [pd.read_csv(p) for p in sorted((RAW / name).glob("*.csv"))]
    return pd.concat(parts, ignore_index=True)


# ---- per-dataset adapters → list[dict] --------------------------------------

def adapt_empathetic(df: pd.DataFrame):
    # rows are utterances grouped by conv_id; speaker alternates (even idx = seeker)
    for conv_id, g in df.groupby("conv_id"):
        g = g.sort_values("utterance_idx")
        utts = g["utterance"].tolist()
        emo = str(g["context"].iloc[0])
        for i in range(0, len(utts) - 1, 2):
            yield {"context": utts[i], "response": utts[i + 1], "emotion": emo,
                   "support_strategy": "", "topic": ""}


def adapt_esconv(df: pd.DataFrame):
    # each row holds a JSON conversation with strategy-annotated turns
    col = "text" if "text" in df.columns else df.columns[0]
    for raw in df[col]:
        try:
            conv = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            continue
        emo = (conv.get("emotion_type") or "")
        topic = (conv.get("problem_type") or "")
        dialog = conv.get("dialog") or []
        last_seeker = ""
        for turn in dialog:
            txt = (turn.get("content") or turn.get("text") or "").strip()
            spk = turn.get("speaker")
            if spk in ("seeker", "usr"):
                last_seeker = txt
            elif spk in ("supporter", "sys") and last_seeker:
                strat = turn.get("strategy") or (turn.get("annotation") or {}).get("strategy", "")
                yield {"context": last_seeker, "response": txt, "emotion": emo,
                       "support_strategy": strat, "topic": topic}
                last_seeker = ""


def adapt_counsel_chat(df: pd.DataFrame):
    qcol = "questionText" if "questionText" in df.columns else "questionTitle"
    for _, r in df.iterrows():
        q = str(r.get(qcol) or "").strip()
        a = str(r.get("answerText") or "").strip()
        if len(q) > 30 and len(a) > 60:
            yield {"context": q, "response": a, "emotion": "",
                   "support_strategy": "", "topic": str(r.get("topic") or "")}


def adapt_psyqa(df: pd.DataFrame):
    qc = "question" if "question" in df.columns else df.columns[0]
    ac = "answer" if "answer" in df.columns else ("answers" if "answers" in df.columns else df.columns[-1])
    for _, r in df.iterrows():
        q, a = str(r.get(qc) or ""), r.get(ac)
        if isinstance(a, (list, tuple)):
            a = a[0] if len(a) else ""
        a = str(a or "")
        if len(q) > 10 and len(a) > 30:
            yield {"context": q, "response": a, "emotion": "",
                   "support_strategy": "", "topic": ""}


GO_LABELS = ["admiration", "amusement", "anger", "annoyance", "approval", "caring",
             "confusion", "curiosity", "desire", "disappointment", "disapproval",
             "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
             "joy", "love", "nervousness", "optimism", "pride", "realization",
             "relief", "remorse", "sadness", "surprise", "neutral"]


def adapt_go_emotions(df: pd.DataFrame):
    for _, r in df.iterrows():
        labs = r["labels"]
        labs = list(labs) if labs is not None else []
        emo = GO_LABELS[int(labs[0])] if len(labs) else "neutral"
        yield {"context": str(r["text"]), "response": "", "emotion": emo,
               "support_strategy": "", "topic": ""}


DD_EMO = ["neutral", "anger", "disgust", "fear", "happiness", "sadness", "surprise"]


def adapt_daily_dialog(df: pd.DataFrame):
    for _, r in df.iterrows():
        utts = r["dialog"]; utts = list(utts) if utts is not None else []
        emos = r["emotion"]; emos = list(emos) if emos is not None else []
        for i in range(len(utts) - 1):
            emo = DD_EMO[emos[i]] if i < len(emos) and emos[i] < len(DD_EMO) else ""
            yield {"context": str(utts[i]).strip(), "response": str(utts[i + 1]).strip(),
                   "emotion": emo if emo != "neutral" else "", "support_strategy": "", "topic": ""}


EMO6 = ["sadness", "joy", "love", "anger", "fear", "surprise"]


def adapt_emotion(df: pd.DataFrame):
    for _, r in df.iterrows():
        yield {"context": str(r["text"]), "response": "",
               "emotion": EMO6[int(r["label"])], "support_strategy": "", "topic": ""}


def adapt_mh_counseling(df: pd.DataFrame):
    for _, r in df.iterrows():
        q, a = str(r.get("Context") or ""), str(r.get("Response") or "")
        if len(q) > 30 and len(a) > 60:
            yield {"context": q, "response": a, "emotion": "",
                   "support_strategy": "", "topic": ""}


def adapt_mentalchat16k(df: pd.DataFrame):
    for _, r in df.iterrows():
        q = str(r.get("input") or "").strip()
        a = str(r.get("output") or "").strip()
        if len(q) > 30 and len(a) > 60:
            yield {"context": q, "response": a, "emotion": "",
                   "support_strategy": "", "topic": ""}


def adapt_mh_chatbot_faq(df: pd.DataFrame):
    for _, r in df.iterrows():
        t = str(r.get("text") or "")
        if "<HUMAN>:" in t and "<ASSISTANT>:" in t:
            q, a = t.split("<ASSISTANT>:", 1)
            q = q.replace("<HUMAN>:", "").strip()
            a = a.strip()
            if len(q) > 8 and len(a) > 40:
                yield {"context": q, "response": a, "emotion": "",
                       "support_strategy": "", "topic": "psychoeducation"}


def adapt_mh_faq(df: pd.DataFrame):
    for _, r in df.iterrows():
        q = str(r.get("Questions") or "").strip()
        a = str(r.get("Answers") or "").strip()
        if len(q) > 8 and len(a) > 40:
            yield {"context": q, "response": a, "emotion": "",
                   "support_strategy": "", "topic": "psychoeducation"}


def adapt_emobank(df: pd.DataFrame):
    # V/A/D on a 1-5 scale, 3 = neutral. Valence label from V; intensity from
    # distance-to-neutral and arousal (rounded 0-1).
    for _, r in df.iterrows():
        t = str(r.get("text") or "").strip()
        if len(t) < 8:
            continue
        v, a, d = float(r["V"]), float(r["A"]), float(r["D"])
        val = "positive" if v >= 3.4 else "negative" if v <= 2.6 else "neutral"
        intensity = round(min(1.0, (abs(v - 3) / 2 + (a - 1) / 4) / 2), 2)
        yield {"context": t, "response": "", "emotion": "",
               "support_strategy": "", "topic": "",
               "valence_override": val, "intensity": intensity,
               "vad": {"valence": v, "arousal": a, "dominance": d}}


def adapt_meld(df: pd.DataFrame):
    df = df.sort_values(["Dialogue_ID", "Utterance_ID"])
    for _, r in df.iterrows():
        t = str(r.get("Utterance") or "").strip()
        emo = str(r.get("Emotion") or "").lower()
        if len(t) >= 8:
            yield {"context": t, "response": "",
                   "emotion": "" if emo == "neutral" else emo,
                   "support_strategy": "", "topic": "scripted-tv-dialogue"}


ADAPTERS = {
    "mentalchat16k": adapt_mentalchat16k,
    "mh_chatbot_faq": adapt_mh_chatbot_faq,
    "mh_faq": adapt_mh_faq,
    "emobank": adapt_emobank,
    "meld": adapt_meld,
    "empathetic_dialogues": adapt_empathetic,
    "esconv": adapt_esconv,
    "counsel_chat": adapt_counsel_chat,
    "psyqa": adapt_psyqa,
    "go_emotions": adapt_go_emotions,
    "daily_dialog": adapt_daily_dialog,
    "emotion": adapt_emotion,
    "mh_counseling": adapt_mh_counseling,
}


def normalize(name: str) -> dict:
    meta = json.loads((RAW / name / "meta.json").read_text())
    df = rows_of(name)
    seen, kept, dups = set(), 0, 0
    out_path = OUT / f"{name}.jsonl"
    with out_path.open("w") as f:
        for rec in ADAPTERS[name](df):
            ctx = re.sub(r"\s+", " ", rec["context"]).strip()
            rsp = re.sub(r"\s+", " ", rec["response"]).strip()
            if len(ctx) < 8:
                continue
            h = hashlib.sha1((ctx + "␞" + rsp).encode()).hexdigest()[:12]
            if h in seen:
                dups += 1
                continue
            seen.add(h)
            kept += 1
            f.write(json.dumps({
                "id": f"{name}:{h}",
                "dataset": name,
                "lang": meta["lang"],
                "context": ctx,
                "response": rsp,
                "emotion": rec["emotion"],
                "valence": rec.get("valence_override") or valence(rec["emotion"]),
                "intensity": rec.get("intensity", None),
                "vad": rec.get("vad", None),
                "support_strategy": rec["support_strategy"],
                "topic": rec["topic"],
                "tags": tags_for(ctx + " " + rsp),
                "license": meta["license"],
            }, ensure_ascii=False) + "\n")
    return {"name": name, "kept": kept, "duplicates_removed": dups,
            "out": str(out_path.relative_to(ROOT))}


if __name__ == "__main__":
    targets = sys.argv[1:] or [n for n in ADAPTERS if (RAW / n / "meta.json").exists()]
    for n in targets:
        try:
            r = normalize(n)
            print(f"✓ {n:22s} kept {r['kept']:>7,}  (-{r['duplicates_removed']:,} dups)")
        except Exception as exc:  # noqa: BLE001
            print(f"✗ {n:22s} FAILED: {str(exc)[:140]}")
