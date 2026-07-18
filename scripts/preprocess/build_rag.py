"""Build the therapy-framework RAG corpus → data/rag/frameworks.jsonl

Sources:
  data/raw/frameworks/*.pdf   (CCI workbooks, WHO mhGAP — cached, licensed for use)
  docs/frameworks/*.md        (curated CBT/DBT/ACT/MI/guideline summaries, in-git)

Chunking: ~1200 chars with 150 overlap, paragraph-aligned where possible.
Each chunk: {id, framework, source, license, text, n_chars}.
Embeddings are deferred (no training yet) — data/embeddings stays empty.

Run:  .venv/bin/python scripts/preprocess/build_rag.py
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "frameworks"
DOCS = ROOT / "docs" / "frameworks"
OUT = ROOT / "data" / "rag"
OUT.mkdir(parents=True, exist_ok=True)

PDFS = {
    "cci_ba_activity_planning.pdf": ("CBT/Behavioral Activation", "CCI free resources (internal RAG only)"),
    "cci_unhelpful_thinking_styles.pdf": ("CBT/Cognitive Restructuring", "CCI free resources (internal RAG only)"),
    "who_mhgap_v2.pdf": ("WHO mhGAP", "CC BY-NC-SA 3.0 IGO"),
}

CHUNK, OVERLAP = 1200, 150


def clean(text: str) -> str:
    text = re.sub(r"-\n(?=[a-z])", "", text)          # de-hyphenate line breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunks_of(text: str):
    # paragraph units; any paragraph longer than CHUNK is split on sentences
    units: list[str] = []
    for p in text.split("\n\n"):
        p = p.strip()
        if len(p) <= 40:
            continue
        if len(p) <= CHUNK:
            units.append(p)
        else:
            sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z•\d])", p)
            units.extend(s.strip() for s in sentences if len(s.strip()) > 20)
    buf = ""
    for u in units:
        if len(buf) + len(u) > CHUNK and buf:
            yield buf
            buf = buf[-OVERLAP:] + " " + u
        else:
            buf = (buf + " " + u).strip()
    if len(buf) > 80:
        yield buf


def main() -> None:
    n = 0
    with (OUT / "frameworks.jsonl").open("w") as f:
        for name, (fw, lic) in PDFS.items():
            path = RAW / name
            if not path.exists():
                print(f"! missing {name} — run scripts/ingest/fetch_frameworks.py")
                continue
            text = clean("\n".join((pg.extract_text() or "") for pg in PdfReader(path).pages))
            for ch in chunks_of(text):
                h = hashlib.sha1(ch.encode()).hexdigest()[:10]
                f.write(json.dumps({
                    "id": f"fw:{h}", "framework": fw, "source": name,
                    "license": lic, "text": ch, "n_chars": len(ch),
                }, ensure_ascii=False) + "\n")
                n += 1
        for md in sorted(DOCS.glob("*.md")):
            text = clean(md.read_text())
            fw = text.splitlines()[0].lstrip("# ").split("—")[0].strip()
            for ch in chunks_of(text):
                h = hashlib.sha1(ch.encode()).hexdigest()[:10]
                f.write(json.dumps({
                    "id": f"fw:{h}", "framework": fw, "source": f"docs/frameworks/{md.name}",
                    "license": "Setmycareer-authored summary (cites primary sources)",
                    "text": ch, "n_chars": len(ch),
                }, ensure_ascii=False) + "\n")
                n += 1
    print(f"wrote {n} chunks -> data/rag/frameworks.jsonl")


if __name__ == "__main__":
    main()
