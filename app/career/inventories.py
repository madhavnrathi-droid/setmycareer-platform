"""Public-domain interest + personality inventories (IPIP).

Replaces the quick 6-chip RIASEC pick with proper, validated, commercial-clean
instruments:
  • RIASEC / Holland interests — IPIP-style markers, 5 items per type.
  • Big Five — Mini-IPIP (Donnellan et al., 2006), 4 items per trait.
Both are public domain (IPIP), so they're safe to ship and score on-device or
server-side. Scores feed pc.interest_role_fit (RIASEC × O*NET) and the values /
personality grounding (Big Five). 5-point Likert: 1 = strongly disagree … 5 =
strongly agree. Reverse-keyed items are flipped during scoring.
"""
from __future__ import annotations

# ── RIASEC / Holland (all positively keyed) ────────────────────────────────
RIASEC_ITEMS = [
    ("R", "Build or repair things with my hands"),
    ("R", "Work with tools, machines, or equipment"),
    ("R", "Work outdoors or with my body"),
    ("R", "Figure out how mechanical things work"),
    ("R", "Operate equipment or vehicles"),
    ("I", "Solve complex or abstract problems"),
    ("I", "Analyze data and look for patterns"),
    ("I", "Study scientific or technical topics"),
    ("I", "Run experiments or test ideas"),
    ("I", "Understand why things happen"),
    ("A", "Create art, music, or writing"),
    ("A", "Come up with original ideas"),
    ("A", "Express myself creatively"),
    ("A", "Design how things look or feel"),
    ("A", "Work without strict rules or routine"),
    ("S", "Help people with their problems"),
    ("S", "Teach, coach, or mentor others"),
    ("S", "Work closely as part of a team"),
    ("S", "Care about others' wellbeing"),
    ("S", "Listen and give advice"),
    ("E", "Lead a team or a project"),
    ("E", "Persuade people or sell ideas"),
    ("E", "Start new ventures or initiatives"),
    ("E", "Make decisions and take risks"),
    ("E", "Negotiate, pitch, or influence"),
    ("C", "Organize information and records"),
    ("C", "Follow clear procedures and systems"),
    ("C", "Work with numbers and details"),
    ("C", "Plan, schedule, and keep order"),
    ("C", "Keep things accurate and precise"),
]

# ── Big Five — Mini-IPIP (trait, item, reverse_keyed) ──────────────────────
BIG_FIVE_ITEMS = [
    ("E", "Am the life of the party", False),
    ("A", "Sympathize with others' feelings", False),
    ("C", "Get chores done right away", False),
    ("N", "Have frequent mood swings", False),
    ("O", "Have a vivid imagination", False),
    ("E", "Don't talk a lot", True),
    ("A", "Am not interested in other people's problems", True),
    ("C", "Often forget to put things back in their proper place", True),
    ("N", "Am relaxed most of the time", True),
    ("O", "Am not interested in abstract ideas", True),
    ("E", "Talk to a lot of different people at parties", False),
    ("A", "Feel others' emotions", False),
    ("C", "Like order", False),
    ("N", "Get upset easily", False),
    ("O", "Have difficulty understanding abstract ideas", True),
    ("E", "Keep in the background", True),
    ("A", "Am not really interested in others", True),
    ("C", "Make a mess of things", True),
    ("N", "Seldom feel blue", True),
    ("O", "Do not have a good imagination", True),
]

BIG_FIVE_NAMES = {"O": "Openness", "C": "Conscientiousness", "E": "Extraversion",
                  "A": "Agreeableness", "N": "Neuroticism"}


def items() -> dict:
    """Item banks for the client to administer (stable order = response order)."""
    return {
        "riasec": [{"type": t, "text": txt} for t, txt in RIASEC_ITEMS],
        "big_five": [{"trait": t, "text": txt} for t, txt, _ in BIG_FIVE_ITEMS],
        "scale": {"min": 1, "max": 5, "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]},
    }


def _pct(raw_sum: int, n: int) -> int:
    """Mean of n 1–5 items → 0–100."""
    if n == 0:
        return 0
    mean = raw_sum / n
    return round((mean - 1) / 4 * 100)


def score_riasec(responses: list) -> dict:
    """responses: list of 1–5 in RIASEC_ITEMS order. Returns per-type 0–100 + top-2 Holland code."""
    by_type: dict[str, list[int]] = {k: [] for k in "RIASEC"}
    for (t, _), r in zip(RIASEC_ITEMS, responses or []):
        if r is not None:
            by_type[t].append(int(r))
    scores = {t: _pct(sum(v), len(v)) for t, v in by_type.items() if v}
    code = "".join(t for t, _ in sorted(scores.items(), key=lambda kv: -kv[1])[:3])
    return {"scores": scores, "code": code, "top": code[:2]}


def score_big_five(responses: list) -> dict:
    """responses: list of 1–5 in BIG_FIVE_ITEMS order. Returns per-trait 0–100."""
    by_trait: dict[str, list[int]] = {k: [] for k in "OCEAN"}
    for (trait, _, rev), r in zip(BIG_FIVE_ITEMS, responses or []):
        if r is None:
            continue
        val = (6 - int(r)) if rev else int(r)
        by_trait[trait].append(val)
    return {BIG_FIVE_NAMES[t]: _pct(sum(v), len(v)) for t, v in by_trait.items() if v}
