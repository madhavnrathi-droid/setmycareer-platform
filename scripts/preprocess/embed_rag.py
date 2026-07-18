"""Embed the RAG corpus + counsel_chat → data/embeddings/  (offline, one-time).

Produces TF-IDF vectors with numpy — zero GPU, zero API, runs on this Mac's
Python 3.14 (where torch has no wheels yet). The live backend uses the pure-
stdlib retriever in app/rag.py; this artifact is for offline experiments and is
the drop-in substrate for semantic search once a neural embedder (e.g.
sentence-transformers all-MiniLM-L6-v2, or an embedding API) is available —
swap the vectorizer, keep the .npz contract.

Outputs (git-ignored):
  data/embeddings/frameworks.npz   {vectors[N,V] float32, ids, meta(json)}
  data/embeddings/counsel_chat.npz
  data/embeddings/vocab.json       shared idf vocabulary

Run:  .venv/bin/python scripts/preprocess/embed_rag.py
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RAG = ROOT / "data" / "rag" / "frameworks.jsonl"
PROC = ROOT / "data" / "processed" / "counsel_chat.jsonl"
OUT = ROOT / "data" / "embeddings"
OUT.mkdir(parents=True, exist_ok=True)

_TOKEN = re.compile(r"[a-z][a-z']+")
_STOP = set("the a an and or of to in is are be for with on as at it this that you your "
            "i we can will may not but if so do does has have had they them their".split())


def tok(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP and len(t) > 2]


def load(path: Path, text_key: str):
    ids, texts, meta = [], [], []
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        txt = r.get(text_key) or ""
        if text_key == "context" and r.get("response"):
            txt = f"{txt} {r['response']}"   # counsel_chat: embed Q+A together
        if len(txt) < 20:
            continue
        ids.append(r["id"])
        texts.append(txt)
        meta.append({"framework": r.get("framework"), "topic": r.get("topic"),
                     "source": r.get("source") or r.get("dataset")})
    return ids, texts, meta


def main() -> None:
    corpora = []
    if RAG.exists():
        corpora.append(("frameworks", *load(RAG, "text")))
    if PROC.exists():
        corpora.append(("counsel_chat", *load(PROC, "context")))

    # shared vocabulary + idf across all corpora
    df: Counter = Counter()
    tokenized = {}
    total_docs = 0
    for name, ids, texts, meta in corpora:
        toks = [tok(t) for t in texts]
        tokenized[name] = toks
        for ts in toks:
            df.update(set(ts))
        total_docs += len(texts)
    vocab = {t: i for i, t in enumerate(sorted(df))}
    idf = np.zeros(len(vocab), dtype=np.float32)
    for t, i in vocab.items():
        idf[i] = np.log((1 + total_docs) / (1 + df[t])) + 1
    (OUT / "vocab.json").write_text(json.dumps(
        {"vocab": vocab, "idf": idf.tolist(), "total_docs": total_docs}))

    for name, ids, texts, meta in corpora:
        V = len(vocab)
        mat = np.zeros((len(texts), V), dtype=np.float32)
        for r, ts in enumerate(tokenized[name]):
            for t, f in Counter(ts).items():
                j = vocab.get(t)
                if j is not None:
                    mat[r, j] = f * idf[j]
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        mat /= norms
        np.savez_compressed(OUT / f"{name}.npz",
                            vectors=mat, ids=np.array(ids),
                            meta=np.array([json.dumps(m) for m in meta]))
        print(f"✓ {name:14s} {mat.shape[0]:>6,} × {V:,} dims  "
              f"({(OUT / f'{name}.npz').stat().st_size/1e6:.1f} MB)")
    print(f"vocab: {len(vocab):,} terms → data/embeddings/")


if __name__ == "__main__":
    main()
