"""Voice-emotion datasets — download ON DEMAND (audio is GBs; no training yet).

  RAVDESS  — Zenodo, CC BY-NC-SA 4.0      (~1.1 GB speech audio)
  CREMA-D  — GitHub, ODbL 1.0             (~2 GB audio)
  MELD     — affective-meld.github.io,    text CSVs small / full A/V ~10 GB
             research license

Gated (cannot be scripted — require signed agreements):
  IEMOCAP (USC SAIL release form) · MSP-IMPROV (UT Dallas academic license)
  DAIC-WOZ (USC ICT EULA)         · CLPsych shared tasks (per-task DUA)

Run:  .venv/bin/python scripts/ingest/audio_on_demand.py ravdess|crema_d|meld_text
"""
from __future__ import annotations

import sys
from pathlib import Path
import ssl

import certifi
from urllib.request import Request, urlopen

SSL_CTX = ssl.create_default_context(cafile=certifi.where())

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"

TARGETS = {
    "ravdess": [
        ("ravdess/Audio_Speech_Actors_01-24.zip",
         "https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip?download=1"),
    ],
    "crema_d": [
        # audio lives in the repo's AudioWAV/ via git-lfs; manifest first:
        ("crema_d/SentenceFilenames.csv",
         "https://raw.githubusercontent.com/CheyneyComputerScience/CREMA-D/master/processedResults/summaryTable.csv"),
    ],
    "wesad": [
        # WESAD wearable stress (UCI/Bosch) ~2.1 GB — CC BY 4.0-style academic terms
        ("wellness/WESAD.zip",
         "https://uni-siegen.sciebo.de/s/HGdUkoNlW1Ub0Gx/download"),
    ],
    "lifesnaps": [
        # LifeSnaps fitbit+mood, 71 users x 4 months — CC BY 4.0 (Zenodo 10.5281/zenodo.7229547)
        ("wellness/lifesnaps.zip",
         "https://zenodo.org/api/records/7229547/files-archive"),
    ],
    "meld_text": [
        ("meld/train_sent_emo.csv",
         "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/train_sent_emo.csv"),
        ("meld/dev_sent_emo.csv",
         "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/dev_sent_emo.csv"),
        ("meld/test_sent_emo.csv",
         "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/test_sent_emo.csv"),
    ],
}


def fetch(rel: str, url: str) -> None:
    dest = RAW / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (Setmycareer-research-cache)"})
    with urlopen(req, timeout=300, context=SSL_CTX) as r, dest.open("wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    print(f"✓ {rel} ({dest.stat().st_size/1e6:.1f} MB)")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "meld_text"
    for rel, url in TARGETS[which]:
        fetch(rel, url)
