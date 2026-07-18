"""Career counseling ontology — the single source of truth.

Faithful encoding of FOUNDATION.md §1 (PROFESSIONAL / CAREER `pc.*`) and the
COMPOSITE indices (`cx.*`). Every downstream consumer — the career scoring agent's
rubric, the deterministic weighting/confidence engines, the Supabase schema, the
report generator — reads from here so the ontology can never drift out of sync.

Conventions (apply to every metric):
  * Scale 0–100, 100 = thriving / strong signal, 0 = severe difficulty / absent.
    Inverse constructs (impostor_load, skill_gap_severity, workload_sustainability
    risk) are flipped so "higher is always healthier."
  * Null state: no real signal in the inputs → score = null, state = "not discussed".
    Never guessed.
  * Confidence ladder: none → low → tentative → moderate → high.
  * Career has NO safety floor — unlike the personal index, the career index is
    never risk-capped (career strain ≠ safety). Risk caps live in bloo's lane only.
  * The `phrasing` field is the ONLY user-facing language. Never diagnostic,
    never "you are", never a verdict ("you should quit"). Signal-language only.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Confidence tiers as numbers internally, words in the UI.
CONFIDENCE_VALUES = {"none": 0.0, "low": 0.25, "tentative": 0.5, "moderate": 0.75, "high": 1.0}
CONFIDENCE_ORDER = ["none", "low", "tentative", "moderate", "high"]


@dataclass(frozen=True)
class Metric:
    id: str                 # e.g. "pc.career_clarity"
    name: str               # human label
    cluster: str            # ontology cluster
    definition: str         # plain-language meaning
    instrument: str         # evidence basis / grounding instrument
    weight: float           # suggested weight in the career index (renormalized over present dims)
    phrasing: str           # the ONLY user-facing signal-language exemplar
    inverse: bool = False   # construct measured inverse (higher raw = worse → flipped to 0–100 healthy)
    needs_sessions: int = 1 # min sessions before this can reach moderate+ confidence
    tags: tuple = field(default_factory=tuple)  # e.g. ("riasec",), ("onet",), ("longitudinal",)


# ---------------------------------------------------------------------------
# FAMILY — PROFESSIONAL / CAREER (pc.*)  ·  grounded in O*NET / BLS / ESCO / RIASEC / Big Five
# ---------------------------------------------------------------------------

PC_METRICS: list[Metric] = [
    # 2.1 Direction & Identity
    Metric("pc.career_clarity", "Career clarity", "direction_identity",
           "How clear you are on direction and the next step.",
           "RIASEC / Holland coherence", 0.12,
           "Your direction is coming into sharper focus.", tags=("riasec",)),
    Metric("pc.professional_identity", "Professional identity", "direction_identity",
           "A coherent sense of who you are professionally.",
           "Holland congruence, narrative-identity", 0.08,
           "A clearer story of your work self is forming."),
    Metric("pc.values_alignment_work", "Values alignment", "direction_identity",
           "Fit between your work and what you personally value.",
           "Big Five, ACT values", 0.07,
           "Your work and what you care about pulled closer.", tags=("bigfive",)),
    Metric("pc.interest_role_fit", "Interest–role fit", "direction_identity",
           "Match of your interests to target occupations.",
           "RIASEC × O*NET vectors", 0.07,
           "These roles line up with what energizes you.", tags=("riasec", "onet")),
    Metric("pc.aspiration_realism", "Aspiration realism", "direction_identity",
           "Gap between your goals and current market / skill reality.",
           "O*NET skills/outlook, BLS", 0.05,
           "Worth checking what the path actually asks for.", tags=("onet", "bls")),

    # 2.2 Market Readiness
    Metric("pc.market_readiness", "Market readiness", "market_readiness",
           "Overall readiness to compete for your target roles.",
           "O*NET skills × BLS outlook", 0.12,
           "You're closer to ready than it feels.", tags=("onet", "bls")),
    Metric("pc.skill_coverage", "Skill coverage", "market_readiness",
           "Share of the target role's required skills you already hold.",
           "O*NET skills/abilities (importance-weighted)", 0.09,
           "Most of the core skills are already in your kit.", tags=("onet",)),
    Metric("pc.skill_velocity", "Skill velocity", "market_readiness",
           "Rate at which you're acquiring new skills over time.",
           "O*NET skill deltas (longitudinal)", 0.06,
           "You're picking up new ground steadily.", needs_sessions=3, tags=("longitudinal",)),
    Metric("pc.skill_gap_severity", "Skill-gap severity", "market_readiness",
           "How far your key gaps are from the target profile.",
           "O*NET importance × gap", 0.05,
           "A couple of skills are worth prioritizing next.", inverse=True, tags=("onet",)),
    Metric("pc.credential_signal", "Credential signal", "market_readiness",
           "Strength of your credentials / portfolio evidence.",
           "source-quality weighting of verified artifacts", 0.04,
           "Your track record speaks for itself here.", tags=("reports",)),
    Metric("pc.opportunity_surface_area", "Opportunity surface", "market_readiness",
           "Breadth of viable options open within your skill radius.",
           "BLS openings, O*NET related occupations", 0.06,
           "More doors are open than you're counting.", tags=("onet", "bls")),

    # 2.3 Execution & Momentum
    Metric("pc.execution_momentum", "Execution momentum", "execution_momentum",
           "Whether stated intentions are turning into action.",
           "goal-enactment, Big Five Conscientiousness", 0.10,
           "Plans are turning into moves.", needs_sessions=3, tags=("bigfive", "longitudinal")),
    Metric("pc.focus_consistency", "Focus consistency", "execution_momentum",
           "Steadiness of attention and effort over time.",
           "Conscientiousness, deep-work markers", 0.06,
           "Your focus held more steadily this stretch.", tags=("longitudinal",)),
    Metric("pc.follow_through", "Follow-through", "execution_momentum",
           "Closing loops on what you started.",
           "commitment-completion ratio", 0.05,
           "You closed loops you usually leave open.", tags=("longitudinal",)),
    Metric("pc.proactivity", "Proactivity", "execution_momentum",
           "Initiating versus reacting.",
           "proactive-personality markers", 0.04,
           "You led more than you waited this week."),
    Metric("pc.experimentation_rate", "Experimentation", "execution_momentum",
           "Trying new approaches and small bets.",
           "Openness, exploration markers", 0.03,
           "You ran a few small experiments.", tags=("bigfive",)),

    # 2.4 Confidence & Decision
    Metric("pc.professional_confidence", "Professional confidence", "confidence_decision",
           "Felt competence / self-efficacy at work.",
           "GSE self-efficacy, Big Five", 0.08,
           "Your sense of 'I can do this' grew.", tags=("bigfive",)),
    Metric("pc.decision_confidence", "Decision confidence", "confidence_decision",
           "Conviction behind your career choices.",
           "decision self-efficacy", 0.06,
           "You're standing more firmly behind your choices."),
    Metric("pc.strategic_thinking", "Strategic thinking", "confidence_decision",
           "Quality of long-horizon planning.",
           "planning-horizon, systems-thinking", 0.05,
           "You're thinking a few moves ahead now."),
    Metric("pc.impostor_load", "Impostor load", "confidence_decision",
           "Self-doubt undercutting real capability.",
           "Clance impostor markers", 0.04,
           "Some self-doubt was louder than the facts warranted.", inverse=True),
    Metric("pc.risk_tolerance_work", "Career risk tolerance", "confidence_decision",
           "Comfort with calculated career risk.",
           "Big Five, risk-attitude", 0.03,
           "You leaned into a bolder option.", tags=("bigfive",)),

    # 2.5 Network & Environment
    Metric("pc.networking_momentum", "Networking momentum", "network_environment",
           "Activity and growth in professional relationships.",
           "social-capital, weak-tie theory", 0.06,
           "Your circle widened this stretch.", tags=("longitudinal",)),
    Metric("pc.mentorship_access", "Mentorship access", "network_environment",
           "Access to guidance / sponsorship.",
           "developmental-network research", 0.03,
           "You're not navigating this alone."),
    Metric("pc.workplace_environment_fit", "Environment fit", "network_environment",
           "Fit with your current role's culture and demands.",
           "P–E fit theory, O*NET work context", 0.05,
           "The environment isn't fully meeting you.", tags=("onet",)),
    Metric("pc.workload_sustainability", "Workload sustainability", "network_environment",
           "Whether your current load is survivable long-term.",
           "JD-R model, MBI overlap", 0.05,
           "This pace may be hard to keep up.", inverse=True, tags=("longitudinal",)),
    Metric("pc.learning_orientation", "Learning orientation", "network_environment",
           "Growth-mindset and active-learning behavior.",
           "Dweck mindset, learning-goal orientation", 0.03,
           "You treated setbacks as material to learn from."),
]

PC_BY_ID = {m.id: m for m in PC_METRICS}

PC_CLUSTERS = {
    "direction_identity": "Direction & Identity",
    "market_readiness": "Market Readiness",
    "execution_momentum": "Execution & Momentum",
    "confidence_decision": "Confidence & Decision",
    "network_environment": "Network & Environment",
}

# Career-index weight vector (suggested). Presence-renormalized at compute time over
# the dimensions that actually have signal this session (see weighting.py).
CAREER_INDEX_WEIGHTS = {m.id: m.weight for m in PC_METRICS}


# ---------------------------------------------------------------------------
# COMPOSITE INDICES (cx.*) — deterministic, never LLM-invented, confidence-propagated
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Composite:
    id: str
    name: str
    toggle: str             # "career" | "both" (bridge needs bloo wellbeing)
    inputs: tuple           # metric ids it blends (pc.* / pm.* / cx.*)
    derivation: str
    phrasing: str
    needs_sessions: int = 1
    risk_capped: bool = False


CX_COMPOSITES: list[Composite] = [
    Composite("cx.career_index", "Career index", "career",
              tuple(CAREER_INDEX_WEIGHTS.keys()),
              "Deterministic weighted mean over present pc.* (presence-renormalized). No risk-cap.",
              "Where your professional momentum sits."),
    Composite("cx.bloom_index", "Life-performance index", "both",
              ("cx.wellbeing_index", "cx.career_index"),
              "Master blend α·wellbeing + β·career (default α=.6/β=.4). Risk-capped via the wellbeing leg only.",
              "Your overall Setmycareer, tracked since day one.", risk_capped=True),
    Composite("cx.wellbeing_index", "Wellbeing index", "both",
              ("pm.*",),
              "Personal/mental composite — owned by bloo, consumed here as a bridge input.",
              "Where your inner weather sits this week."),
    Composite("cx.alignment_index", "Alignment", "both",
              ("pm.values_clarity", "pc.values_alignment_work", "pc.execution_momentum", "pc.workplace_environment_fit"),
              "Coherence between stated values, enacted behavior, and environment. The heart of the contradiction band.",
              "How closely your life matches what you want from it.", needs_sessions=3),
    Composite("cx.decision_health", "Decision health", "both",
              ("pc.decision_confidence", "pc.strategic_thinking", "pm.cognitive_flexibility", "pm.rumination"),
              "Quality + confidence + values-fit of recent decisions (low-spin).",
              "How well-grounded your recent choices feel."),
    Composite("cx.recovery_burnout_index", "Recovery vs burnout", "both",
              ("pm.burnout_markers", "pm.depletion_recovery", "pc.workload_sustainability", "pm.energy_activation"),
              "Balance of depletion vs restoration (inverse of burnout).",
              "How your reserves are holding up.", needs_sessions=2),
    Composite("cx.stability_index", "Stability", "both",
              ("cx.bloom_index",),
              "Volatility-adjusted steadiness — inverse normalized SD of the master index over time.",
              "How steady things have been, not just where they are.", needs_sessions=4),
    Composite("cx.trajectory_index", "Trajectory", "both",
              ("cx.bloom_index",),
              "Direction & slope of change — regression slope of the master index + sub-indices.",
              "Which way things have been trending.", needs_sessions=3),
    Composite("cx.engagement_index", "Engagement", "both",
              ("usage",),
              "Consistency of using Setmycareer itself — deterministic from session/journal cadence.",
              "How consistently you've been checking in."),
]

CX_BY_ID = {c.id: c for c in CX_COMPOSITES}

# Default master-index blend (tunable later in settings).
MASTER_BLEND = {"alpha_wellbeing": 0.6, "beta_career": 0.4}


# ---------------------------------------------------------------------------
# Rubric generation — the career scoring agent's prompt is BUILT from the ontology
# so the two never drift. Returns the per-metric rubric block for the LLM.
# ---------------------------------------------------------------------------

def rubric_block() -> str:
    """Compact, LLM-facing rubric for every pc.* metric, grouped by cluster."""
    lines: list[str] = []
    for ckey, cname in PC_CLUSTERS.items():
        lines.append(f"\n## {cname}")
        for m in PC_METRICS:
            if m.cluster != ckey:
                continue
            inv = " (inverse — flip so higher = healthier)" if m.inverse else ""
            lines.append(
                f"- {m.id} — {m.definition} Grounded in {m.instrument}.{inv} "
                f"Signal-language example: \"{m.phrasing}\""
            )
    return "\n".join(lines)


def metric_ids() -> list[str]:
    return [m.id for m in PC_METRICS]


def counts() -> dict:
    return {
        "pc_metrics": len(PC_METRICS),
        "cx_composites": len(CX_COMPOSITES),
        "clusters": len(PC_CLUSTERS),
        "career_weight_sum": round(sum(CAREER_INDEX_WEIGHTS.values()), 4),
    }
