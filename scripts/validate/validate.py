"""Validate processed datasets → data/metadata/* + dataset_registry.json (v2).

Registry covers THREE kinds of entries:
  downloaded+processed   (stats computed from data/processed/*.jsonl)
  on-demand / gated      (documented, fetchable or application-required)
  excluded               (rank=avoid, with the reason — duplicates, licenses, ethics)

Quality score (0-100 heuristic): schema 40 · responses 20 · emotion labels 15 ·
structure 15 · commercial license 10.

Run:  .venv/bin/python scripts/validate/validate.py
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROC = ROOT / "data" / "processed"
META = ROOT / "data" / "metadata"
META.mkdir(parents=True, exist_ok=True)

NODE_USAGE = {
    "empathetic_dialogues": ["EmpathyEvaluatorNode", "RewriteAgent"],
    "esconv": ["TherapyRouterNode", "SupportStrategySelector"],
    "counsel_chat": ["RAG/Psychoeducation", "EmpathyEvaluatorNode", "NoteStyle"],
    "mentalchat16k": ["EmpathyEvaluatorNode", "NoteStyle", "SupportStrategySelector"],
    "go_emotions": ["EmotionDetectionNode"],
    "emotion": ["EmotionDetectionNode(ensemble)"],
    "emobank": ["EmotionDetectionNode(intensity/VAD)"],
    "meld": ["VoiceEmotionNode(text-bootstrap)", "ConversationalEmotion"],
    "daily_dialog": ["ConversationalRealism"],
    "mh_chatbot_faq": ["RAG/Psychoeducation"],
    "mh_faq": ["RAG/Psychoeducation"],
    "mh_counseling": [],
}
RANK = {
    "esconv": "high", "empathetic_dialogues": "high", "go_emotions": "high",
    "counsel_chat": "high", "mentalchat16k": "high",
    "emobank": "medium", "meld": "medium", "emotion": "medium",
    "mh_chatbot_faq": "medium", "mh_faq": "medium",
    "daily_dialog": "experimental",
    "mh_counseling": "avoid",
}
NOTES = {
    "mh_counseling": "99% duplicate of counsel_chat (Amod is counselchat-derived) — keep counsel_chat as canonical",
    "daily_dialog": "generic chitchat; realism reference only — keep OUT of therapy-tone training mixes",
    "meld": "scripted TV dialogue (Friends) — acted emotion; eval/bootstrap only",
    "mh_faq": "MIT on card but Kaggle-origin provenance — retrieval only",
    "emobank": "CC BY-SA: commercial OK with share-alike obligation on derived datasets",
}
COMMERCIAL = {  # True | False | "conditional"
    "go_emotions": True, "counsel_chat": True, "mentalchat16k": True,
    "mh_chatbot_faq": True, "mh_faq": True, "mh_counseling": True,
    "emobank": "conditional", "esconv": False, "empathetic_dialogues": False,
    "daily_dialog": False, "emotion": False, "meld": False,
}

EXTERNAL = [
    # gated — high value, application required
    dict(dataset_name="daic_woz", source="dcapswoz.ict.usc.edu", rank="high",
         status="gated (USC ICT EULA)", license="EULA", commercially_usable=False,
         node_usage=["SafetyNode", "VoiceEmotionNode"],
         notes="clinical depression interviews; no open substitute — apply"),
    dict(dataset_name="clpsych", source="clpsych.org/shared-tasks", rank="high",
         status="gated (per-task DUA)", license="DUA", commercially_usable=False,
         node_usage=["SafetyNode"], notes="suicidality/distress language; apply per task"),
    dict(dataset_name="iemocap", source="sail.usc.edu/iemocap", rank="medium",
         status="gated (release form)", license="academic", commercially_usable=False,
         node_usage=["VoiceEmotionNode"], notes="acted emotional speech"),
    dict(dataset_name="msp_improv", source="UT Dallas MSP lab", rank="medium",
         status="gated (academic license)", license="academic", commercially_usable=False,
         node_usage=["VoiceEmotionNode"], notes="acted emotional speech"),
    # on-demand — scripted fetchers, not cached (GBs / not needed pre-training)
    dict(dataset_name="ravdess", source="zenodo.org/record/1188976", rank="medium",
         status="on-demand (scripts/ingest/audio_on_demand.py ravdess)",
         license="CC BY-NC-SA 4.0", commercially_usable=False,
         node_usage=["VoiceEmotionNode"], notes="acted speech ~1.1GB"),
    dict(dataset_name="crema_d", source="github.com/CheyneyComputerScience/CREMA-D", rank="medium",
         status="on-demand", license="ODbL", commercially_usable="conditional",
         node_usage=["VoiceEmotionNode"], notes="acted speech ~2GB; ODbL share-alike on db"),
    dict(dataset_name="wesad", source="WESAD (Uni Siegen)", rank="high",
         status="on-demand (audio_on_demand.py wesad)", license="academic open",
         commercially_usable="conditional", node_usage=["StressContext(HRV)"],
         notes="wearable stress + HRV ~2.1GB; check terms before commercial training"),
    dict(dataset_name="lifesnaps", source="zenodo 10.5281/zenodo.7229547", rank="high",
         status="on-demand (audio_on_demand.py lifesnaps)", license="CC BY 4.0",
         commercially_usable=True, node_usage=["SleepMoodContext", "ActivityMoodContext"],
         notes="fitbit + mood EMA, 71 users x 4 months — best open sleep/activity↔mood set"),
    dict(dataset_name="meld_av", source="affective-meld.github.io", rank="experimental",
         status="on-demand (full audio/video ~10GB)", license="research",
         commercially_usable=False, node_usage=["VoiceEmotionNode"], notes="fetch when voice training scheduled"),
    # ---- multimodal wellness (research-only; training fuel, not live product) ----
    dict(dataset_name="studentlife", source="studentlife.cs.dartmouth.edu", rank="high",
         status="downloadable (research license + citation)", license="research-only",
         commercially_usable=False, licensing_confidence="high (clear academic terms)",
         node_usage=["LongitudinalWellnessNode", "LonelinessNode", "BurnoutNode"],
         recommended_usage="hidden-context model VALIDATION only — never ship text/derived weights commercially",
         notes="48 students, 10wk: sleep/GPS/activity/phone/EMA mood — the canonical passive-sensing↔mood set"),
    dict(dataset_name="swell_kw", source="Radboud SWELL-KW (DANS)", rank="high",
         status="gated (DANS access request)", license="research-only",
         commercially_usable=False, licensing_confidence="medium (DANS terms; request required)",
         node_usage=["BurnoutNode", "StressContext(HRV)"],
         recommended_usage="HRV/stress feature research only",
         notes="knowledge-work stress + HRV + facial/posture; apply via DANS"),
    dict(dataset_name="nsrr", source="sleepdata.org (NSRR)", rank="medium",
         status="gated (NSRR DUA + IRB-style approval)", license="DUA",
         commercially_usable=False, licensing_confidence="low (per-cohort DUAs, clinical PHI)",
         node_usage=["SleepNode"],
         recommended_usage="sleep-staging research only; do NOT use for product without legal review",
         notes="large clinical PSG cohorts; heavy approval burden — overkill for Setmycareer now"),
    dict(dataset_name="sleep_edfx", source="physionet.org/content/sleep-edfx", rank="medium",
         status="open (PhysioNet, downloadable)", license="ODC-BY 1.0",
         commercially_usable=True, licensing_confidence="high (ODC-BY)",
         node_usage=["SleepNode"],
         recommended_usage="EEG sleep-staging research; LOW product relevance (no mood labels)",
         notes="open but it's polysomnography EEG, not lifestyle sleep — Setmycareer reads device sleep instead"),
    dict(dataset_name="extrasensory", source="extrasensory.ucsd.edu", rank="high",
         status="downloadable (research use)", license="research (CC BY-NC-SA-style)",
         commercially_usable=False, licensing_confidence="medium",
         node_usage=["BehaviorNode", "WellnessContextNode"],
         recommended_usage="behavioral-context label schema reference; validation only",
         notes="60 users, phone+watch context labels — good schema template for BehaviorNode"),
    dict(dataset_name="reality_mining", source="realitycommons.media.mit.edu", rank="medium",
         status="gated (MIT Reality Commons registration)", license="research agreement",
         commercially_usable=False, licensing_confidence="medium",
         node_usage=["LonelinessNode", "SocialHealthNode"],
         recommended_usage="social-rhythm pattern reference only",
         notes="2004 phone/proximity data — dated; concepts inform LonelinessNode, data itself low value"),
    dict(dataset_name="friends_and_family", source="realitycommons.media.mit.edu/friendsdataset4",
         rank="experimental", status="gated (registration)", license="research agreement",
         commercially_usable=False, licensing_confidence="medium",
         node_usage=["SocialHealthNode"],
         recommended_usage="social-wellness concept reference",
         notes="community-scale social + wellbeing; older, niche — revisit only if social graph ships"),
    # excluded — rank avoid
    dict(dataset_name="psyqa", source="thu-coai/PsyQA (official)", rank="avoid",
         status="excluded", license="gated research agreement; HF mirrors unlicensed",
         commercially_usable=False, node_usage=[],
         notes="apply officially if needed; Chinese-language, low fit for EN launch"),
    dict(dataset_name="empathetic_counseling_LuangMV97", source="LuangMV97/Empathetic_counseling_Dataset",
         rank="avoid", status="excluded", license="NONE declared", commercially_usable=False,
         node_usage=[], notes="no license on card — legally unusable"),
    dict(dataset_name="psychology_10k", source="samhog/psychology-10k", rank="avoid",
         status="excluded", license="NONE declared", commercially_usable=False,
         node_usage=[], notes="no license + GPT-generated provenance"),
    dict(dataset_name="felladrin_pretrain_mh", source="Felladrin/pretrain-mental-health-counseling-conversations",
         rank="avoid", status="excluded", license="openrail", commercially_usable=False,
         node_usage=[], notes="merge of Amod/counsel-chat — would re-import our duplicates"),
    dict(dataset_name="reddit_mh_scrapes", source="various (SWMH, subreddit dumps)", rank="avoid",
         status="excluded", license="none/ToS-violating", commercially_usable=False,
         node_usage=[], notes="no consent, redistribution prohibited, deanonymization risk"),
    dict(dataset_name="psych_101", source="marcelbinz/Psych-101", rank="experimental",
         status="registered, not downloaded", license="Apache-2.0", commercially_usable=True,
         node_usage=["CognitionResearch(future)"], notes="cognitive-experiment transcripts; not counseling — revisit later"),
]


def validate(path: Path) -> dict:
    name = path.stem
    rows = bad = with_resp = with_emo = with_strat = with_intensity = 0
    emos, safety = Counter(), Counter()
    license_ = ""
    with path.open() as f:
        for line in f:
            r = json.loads(line)
            rows += 1
            license_ = r["license"]
            if not r.get("id") or not r.get("context"):
                bad += 1
            if r.get("response"):
                with_resp += 1
            if r.get("emotion"):
                with_emo += 1
                emos[r["emotion"]] += 1
            if r.get("intensity") is not None:
                with_intensity += 1
            if r.get("support_strategy") or r.get("topic"):
                with_strat += 1
            for t in r["tags"]["safety"]:
                safety[t] += 1
    score = 0
    score += 40 if bad == 0 else max(0, 40 - round(100 * bad / rows))
    score += 20 if with_resp / rows > 0.5 else 0
    score += 15 if (with_emo / rows > 0.5 or with_intensity / rows > 0.5) else 0
    score += 15 if with_strat / rows > 0.3 else 0
    score += 10 if COMMERCIAL.get(name) is True else 0
    meta = {
        "dataset_name": name, "rows": rows, "invalid_rows": bad,
        "pct_with_response": round(100 * with_resp / rows, 1),
        "pct_with_emotion": round(100 * with_emo / rows, 1),
        "pct_with_intensity": round(100 * with_intensity / rows, 1),
        "top_emotions": dict(emos.most_common(8)),
        "safety_flagged": dict(safety),
        "license": license_, "quality_score": score,
    }
    (META / f"{name}.json").write_text(json.dumps(meta, indent=2))
    return meta


ORDER = {"high": 0, "medium": 1, "experimental": 2, "avoid": 3}

# recommended usage for processed sets (training vs retrieval vs evaluator)
USAGE_TIER = {
    "go_emotions": "may train (Apache)", "mentalchat16k": "may train (MIT)",
    "counsel_chat": "retrieval + may train (MIT; summarize verbatim)",
    "mh_chatbot_faq": "retrieval only", "mh_faq": "retrieval only",
    "emobank": "may train w/ share-alike (CC BY-SA)",
    "esconv": "evaluator + prompt-design only (research license)",
    "empathetic_dialogues": "evaluator only (NC)", "emotion": "evaluator only",
    "meld": "evaluator/bootstrap only (acted)", "daily_dialog": "realism reference only (NC)",
    "mh_counseling": "drop (duplicate of counsel_chat)",
}


def main() -> None:
    registry = []
    for path in sorted(PROC.glob("*.jsonl")):
        m = validate(path)
        name = m["dataset_name"]
        raw_meta = json.loads((ROOT / "data" / "raw" / name / "meta.json").read_text())
        registry.append({
            "dataset_name": name,
            "source": raw_meta["repo"],
            "status": "processed",
            "node_usage": NODE_USAGE.get(name, []),
            "license": m["license"],
            "commercially_usable": COMMERCIAL.get(name, False),
            "licensing_confidence": "high (verified on HF card)",
            "recommended_usage": USAGE_TIER.get(name, "retrieval/eval"),
            "rows": m["rows"],
            "quality_score": m["quality_score"],
            "rank": RANK.get(name, "medium"),
            "notes": NOTES.get(name, ""),
            "processed_file": f"data/processed/{name}.jsonl",
            "safety_flagged_rows": sum(m["safety_flagged"].values()),
        })
        print(f"✓ {name:22s} rows={m['rows']:>7,} score={m['quality_score']:>3} rank={RANK.get(name,'medium')}")
    for e in EXTERNAL:                       # backfill the two fields where missing
        e.setdefault("licensing_confidence", "medium")
        e.setdefault("recommended_usage", "research/validation only — not for shipped model")
    registry += EXTERNAL
    registry.sort(key=lambda r: (ORDER[r["rank"]], -(r.get("quality_score") or 0)))
    (ROOT / "dataset_registry.json").write_text(json.dumps(registry, indent=2))
    print(f"\nregistry → dataset_registry.json ({len(registry)} entries: "
          f"{sum(1 for r in registry if r.get('status')=='processed')} processed, "
          f"{sum(1 for r in registry if r['rank']=='avoid')} avoid)")


if __name__ == "__main__":
    main()
