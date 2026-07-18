"""Ingest the open HF text datasets into data/raw/<name>/.

Each dataset is cached as parquet + a sidecar meta.json. Script-based HF repos
(blocked by datasets>=3) fall back to the Hub's refs/convert/parquet mirror.

Run:  .venv/bin/python scripts/ingest/hf_text.py [name ...]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from datasets import load_dataset
from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"

# repo, config, license, lang, why-we-want-it
SOURCES = {
    "empathetic_dialogues": dict(
        repo="facebook/empathetic_dialogues", config=None,
        license="CC BY-NC 4.0", lang="en",
        purpose="empathy modeling, emotional mirroring, rewrite agent"),
    "esconv": dict(
        repo="thu-coai/esconv", config=None,
        license="research-only (ESConv terms)", lang="en",
        purpose="support strategies, intervention timing, therapy routing"),
    "counsel_chat": dict(
        repo="nbertagnolli/counsel-chat", config=None,
        license="MIT (repo) / source counselchat.com", lang="en",
        purpose="therapist-style language, psychoeducation RAG, evaluator benchmarks"),
    "psyqa": dict(
        repo="sunhaozhepy/psyqa", config=None,
        license="research-only (PsyQA terms)", lang="zh",
        purpose="psychology-informed structured reasoning (Chinese)"),
    "go_emotions": dict(
        repo="google-research-datasets/go_emotions", config="simplified",
        license="Apache-2.0", lang="en",
        purpose="fine-grained emotion classification (EmotionDetectionNode)"),
    "daily_dialog": dict(
        repo="li2017dailydialog/daily_dialog", config=None,
        license="CC BY-NC-SA 4.0", lang="en",
        purpose="natural conversational flow, anti-robotic phrasing"),
    "emotion": dict(
        repo="dair-ai/emotion", config="split",
        license="educational/research (dair-ai terms)", lang="en",
        purpose="emotion classification baseline (ensemble member)"),
    "mh_counseling": dict(
        repo="Amod/mental_health_counseling_conversations", config=None,
        license="openrail", lang="en",
        purpose="counselor response style (already used by Stage-2 LoRA plan)"),
    "mentalchat16k": dict(
        repo="ShenLab/MentalChat16K", config=None,
        license="MIT", lang="en",
        purpose="counseling conversations incl. grief/anxiety/caregiver distress"),
    "mh_chatbot_faq": dict(
        repo="heliosbrahma/mental_health_chatbot_dataset", config=None,
        license="MIT", lang="en",
        purpose="conversational psychoeducation pairs for RAG"),
    "mh_faq": dict(
        repo="tolu07/Mental_Health_FAQ", config=None,
        license="MIT (card; Kaggle-origin FAQ)", lang="en",
        purpose="mental health FAQ for retrieval/psychoeducation"),
}


def load_with_fallback(repo: str, config: str | None):
    try:
        return load_dataset(repo, config) if config else load_dataset(repo)
    except Exception as first:
        # script-based repo → use the Hub's parquet conversion branch
        api = HfApi()
        files = [f for f in api.list_repo_files(repo, repo_type="dataset",
                                                revision="refs/convert/parquet")
                 if f.endswith(".parquet")]
        if not files:
            raise first
        cfg = config or sorted({f.split("/")[0] for f in files})[0]
        picked = [f for f in files if f.startswith(cfg + "/")] or files
        data_files = {}
        for f in picked:
            split = ("train" if "train" in f else
                     "validation" if ("valid" in f or "dev" in f) else
                     "test" if "test" in f else "train")
            data_files.setdefault(split, []).append(
                f"hf://datasets/{repo}@refs/convert/parquet/{f}")
        return load_dataset("parquet", data_files=data_files)


def ingest(name: str) -> dict:
    spec = SOURCES[name]
    out = RAW / name
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    ds = load_with_fallback(spec["repo"], spec["config"])
    rows = 0
    for split, d in ds.items():
        d.to_parquet(out / f"{split}.parquet")
        rows += d.num_rows
    meta = {
        "name": name, "repo": spec["repo"], "license": spec["license"],
        "lang": spec["lang"], "purpose": spec["purpose"],
        "splits": {s: d.num_rows for s, d in ds.items()}, "rows": rows,
        "columns": list(next(iter(ds.values())).column_names),
        "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seconds": round(time.time() - t0, 1),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    return meta


if __name__ == "__main__":
    targets = sys.argv[1:] or list(SOURCES)
    ok, failed = [], []
    for name in targets:
        try:
            m = ingest(name)
            ok.append(name)
            print(f"✓ {name:22s} {m['rows']:>7,} rows  ({m['seconds']}s)")
        except Exception as exc:  # noqa: BLE001 — keep going, report at end
            failed.append((name, str(exc)[:160]))
            print(f"✗ {name:22s} FAILED: {str(exc)[:160]}")
    print(f"\ningested {len(ok)}/{len(targets)};", ("failures: " + ", ".join(n for n, _ in failed)) if failed else "no failures")
