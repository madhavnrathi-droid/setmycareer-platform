"""Lightweight framework-knowledge retriever (pure stdlib — no torch, no numpy).

Loads the committed therapy-framework corpus (app/knowledge/frameworks.jsonl:
WHO mhGAP + CCI workbooks + curated CBT/DBT/ACT/MI summaries) once at import,
builds a TF-IDF index, and serves cosine-ranked chunks. 372 chunks → the whole
index is a few hundred KB in memory and a query is sub-millisecond.

Why TF-IDF and not embeddings: keeps the Railway image tiny and cold-starts
instant. Neural embeddings (data/embeddings/, built offline) are the semantic
upgrade path when a GPU/embedding service is in the loop.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

_KNOWLEDGE = Path(__file__).parent / "knowledge"
# Named corpora, each its own .jsonl + lazily-built TF-IDF index. "frameworks" is
# the clinical knowledge base; "labor" is the O*NET/BLS career-grounding snapshot.
_CORPORA = {
    "frameworks": _KNOWLEDGE / "frameworks.jsonl",
    "labor": _KNOWLEDGE / "labor_data.jsonl",
}
_CORPUS = _CORPORA["frameworks"]  # back-compat default
_TOKEN = re.compile(r"[a-z][a-z']+")
_STOP = set(
    "the a an and or of to in is are be for with on as at it this that you your i we "
    "can will may not but if so do does done has have had they them their about into "
    "more most some any all our its his her he she than then when what which who".split()
)


def _tok(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP and len(t) > 2]


class _Index:
    def __init__(self, docs: list[dict]):
        self.docs = docs
        self.tf: list[Counter] = []
        df: Counter = Counter()
        for d in docs:
            c = Counter(_tok(d["text"]))
            self.tf.append(c)
            df.update(c.keys())
        n = max(1, len(docs))
        self.idf = {t: math.log((1 + n) / (1 + v)) + 1 for t, v in df.items()}
        self.norms = [self._norm(c) for c in self.tf]

    def _norm(self, c: Counter) -> float:
        return math.sqrt(sum((f * self.idf.get(t, 0)) ** 2 for t, f in c.items())) or 1.0

    def search(self, query: str, k: int = 4, min_score: float = 0.04) -> list[dict]:
        q = Counter(_tok(query))
        if not q:
            return []
        qw = {t: f * self.idf.get(t, 0) for t, f in q.items()}
        qn = math.sqrt(sum(w * w for w in qw.values())) or 1.0
        scored = []
        for i, c in enumerate(self.tf):
            dot = sum(qw.get(t, 0) * f * self.idf.get(t, 0) for t, f in c.items())
            s = dot / (qn * self.norms[i])
            if s > min_score:
                scored.append((s, i))
        scored.sort(reverse=True)
        out = []
        for s, i in scored[:k]:
            d = self.docs[i]
            out.append({"framework": d.get("framework", ""), "source": d.get("source", ""),
                        "title": d.get("title"), "text": d["text"], "score": round(s, 3)})
        return out


_indices: dict[str, _Index] = {}


def _get_index(corpus: str = "frameworks") -> _Index | None:
    """Lazily load + build the named corpus index (cached per corpus)."""
    if corpus not in _indices:
        path = _CORPORA.get(corpus)
        if not path or not path.exists():
            return None
        docs = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
        _indices[corpus] = _Index(docs)
    return _indices.get(corpus)


def retrieve(query: str, k: int = 4, corpus: str = "frameworks") -> list[dict]:
    idx = _get_index(corpus)
    return idx.search(query, k) if idx else []


def grounding_text(query: str, k: int = 3, max_chars: int = 900, corpus: str = "frameworks") -> str:
    """Compact grounding block for an LLM prompt (or '' if nothing relevant)."""
    hits = retrieve(query, k, corpus)
    if not hits:
        return ""
    lines = []
    for h in hits:
        snippet = h["text"][:max_chars // k].strip()
        tag = h.get("title") or h.get("framework") or "src"
        lines.append(f"[{tag}] {snippet}")
    return "\n".join(lines)
