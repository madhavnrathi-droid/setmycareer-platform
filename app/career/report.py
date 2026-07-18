"""Career report ("Blueprint") — a generated, cited, branded HTML report.

Renders a print-ready report from a Blueprint: career index + sub-signals (with
the verbatim quote each is anchored to) + grounded next moves + the career×wellbeing
note. The browser prints it to PDF, so there's no heavy server-side PDF dependency
(serverless-friendly). Signal-language throughout; the footer states plainly that
this is decision support, not a guarantee.
"""
from __future__ import annotations

import html

from . import ontology

_FONTS = "https://fonts.googleapis.com/css2?family=Cambo&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@600;700;800&display=swap"

# brand logomark, inlined so the report is fully self-contained
_LOGOMARK = (
    '<svg viewBox="0 0 26.279 27.234" fill="#231F20" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M7.35 25.559a1.293 1.293 0 0 1-1.293-1.293V3.015a1.293 1.293 0 1 1 2.586 0v21.251c0 .714-.578 1.293-1.293 1.293Z"/>'
    '<path d="M1.556 12.346a1.293 1.293 0 0 1-.4-2.523L21.389 3.248a1.293 1.293 0 0 1 .8 2.46L1.956 12.283a1.3 1.3 0 0 1-.4.063Z"/>'
    '<path d="M24.814 19.971a1.29 1.29 0 0 1-1.047-.533L11.262 2.226a1.293 1.293 0 1 1 2.092-1.52l12.505 17.212a1.293 1.293 0 0 1-1.045 2.053Z"/>'
    '<path d="M12.242 27.234a1.293 1.293 0 0 1-1.045-2.053L23.701 7.97a1.293 1.293 0 1 1 2.093 1.52L13.289 26.701a1.29 1.29 0 0 1-1.047.533Z"/>'
    '<path d="M21.684 24.098a1.3 1.3 0 0 1-.399-.063L1.052 17.461a1.293 1.293 0 0 1 .798-2.46l20.233 6.574a1.293 1.293 0 0 1-.399 2.523Z"/>'
    '</svg>'
)


def _band(score):
    if score is None:
        return ("Not discussed", "#A6A2A0")
    if score >= 75:
        return ("Strong", "#1F9D6B")
    if score >= 55:
        return ("Steady", "#0574A9")
    if score >= 40:
        return ("Building", "#C0892D")
    return ("Needs focus", "#EC2C2E")


def build_report(blueprint: dict, career_profile: dict | None = None, name: str = "") -> dict:
    cp = career_profile or {}
    ci = blueprint.get("career_index")
    conf = blueprint.get("confidence") or "low"
    scores = blueprint.get("scores") or {}
    moves = blueprint.get("moves") or []
    cites = blueprint.get("citations") or []
    narrative = blueprint.get("narrative") or {}
    contradiction = blueprint.get("contradiction")
    band_label, band_color = _band(ci)

    sections = []
    for cl_key, cl_name in ontology.PC_CLUSTERS.items():
        items = []
        for mid, payload in scores.items():
            m = ontology.PC_BY_ID.get(mid)
            if not m or m.cluster != cl_key:
                continue
            sc = payload.get("score")
            bl, col = _band(sc)
            quote = html.escape((payload.get("quote") or "")[:170])
            items.append(
                f'<tr><td class="sig">{html.escape(m.name)}</td>'
                f'<td class="sc" style="color:{col}">{sc if sc is not None else "—"}</td>'
                f'<td class="bd" style="color:{col}">{bl}</td>'
                f'<td class="cf">{html.escape(payload.get("confidence", ""))}</td></tr>'
                + (f'<tr class="q"><td colspan="4">&ldquo;{quote}&rdquo;</td></tr>' if quote else "")
            )
        if items:
            sections.append(f'<h3>{html.escape(cl_name)}</h3><table class="sigs">{"".join(items)}</table>')

    moves_html = "".join(
        f'<li><b>{html.escape(m.get("title", ""))}</b><span>{html.escape(m.get("why", ""))}</span></li>'
        for m in moves)
    cites_html = "".join(f"<li>{html.escape(str(c))}</li>" for c in cites)
    contra_html = (f'<div class="contra"><b>Career &times; wellbeing</b><p>{html.escape(contradiction["text"])}</p></div>'
                   if contradiction else "")
    sub = html.escape(name or "You")
    if cp.get("current"):
        sub += " &middot; " + html.escape(cp["current"])
    if cp.get("target"):
        sub += " &rarr; " + html.escape(cp["target"])

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Career Blueprint — {html.escape(name or "Setmycareer")}</title>
<link href="{_FONTS}" rel="stylesheet">
<style>
:root{{--ink:#231F20;--mut:#6E6C6B;--line:#ECEAE8;--soft:#F6F5F3}}
*{{box-sizing:border-box}}
body{{font-family:'Inter',system-ui,sans-serif;color:var(--ink);margin:0;background:#fff;line-height:1.55}}
.page{{max-width:760px;margin:0 auto;padding:44px 48px}}
.brandrow{{display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--ink);padding-bottom:14px}}
.brandrow svg{{width:30px;height:30px}}
.word{{font-family:'Cambo',serif;font-size:22px}}
.tag{{margin-left:auto;font-family:'Montserrat',sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}}
h1{{font-family:'Montserrat',sans-serif;font-weight:800;font-size:30px;margin:26px 0 2px;letter-spacing:-.02em}}
.subt{{color:var(--mut);font-size:13px;margin:0 0 18px}}
.hero{{display:flex;align-items:center;gap:18px;background:var(--soft);border-radius:16px;padding:20px 24px;margin:14px 0 20px}}
.idx{{font-family:'Montserrat',sans-serif;font-weight:800;font-size:54px;line-height:1;letter-spacing:-.03em}}
.idx small{{font-size:18px;color:var(--mut);font-weight:600}}
.pill{{display:inline-block;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:5px 12px;border-radius:999px;color:#fff}}
.narr{{font-size:15px;margin:0 0 10px}}
.next{{font-size:14px;background:#fff;border-left:3px solid var(--ink);padding:9px 13px;border-radius:8px}}
h3{{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:22px 0 6px}}
table.sigs{{width:100%;border-collapse:collapse}}
.sigs td{{padding:7px 4px;border-bottom:1px solid var(--line);font-size:13.5px;vertical-align:baseline}}
.sigs .sig{{font-weight:600}}
.sigs .sc{{font-family:'Montserrat',sans-serif;font-weight:700;text-align:right;width:46px}}
.sigs .bd{{width:108px;font-weight:600;font-size:12px}}
.sigs .cf{{width:90px;color:var(--mut);font-size:11.5px;text-align:right;text-transform:capitalize}}
.sigs tr.q td{{border-bottom:0;color:var(--mut);font-style:italic;font-size:12.5px;padding-top:0}}
ul.moves{{list-style:none;padding:0;margin:6px 0}}
ul.moves li{{padding:10px 0;border-bottom:1px solid var(--line)}}
ul.moves b{{display:block;font-size:14.5px}}
ul.moves span{{color:var(--mut);font-size:13px}}
.contra{{background:#FBF6EC;border-radius:12px;padding:12px 16px;margin:16px 0;font-size:13.5px}}
.contra p{{margin:4px 0 0}}
ul.cites{{font-size:12px;color:var(--mut);padding-left:18px}}
.foot{{margin-top:30px;border-top:1px solid var(--line);padding-top:12px;font-size:11.5px;color:var(--mut)}}
@media print{{.page{{padding:0}}@page{{margin:18mm}}}}
</style></head>
<body><div class="page">
  <div class="brandrow">{_LOGOMARK}<span class="word">Setmycareer</span><span class="tag">Find Your True North</span></div>
  <h1>Career Blueprint</h1>
  <p class="subt">{sub}</p>
  <div class="hero">
    <div class="idx" style="color:{band_color}">{ci if ci is not None else "—"}<small>/100</small></div>
    <div><span class="pill" style="background:{band_color}">{band_label}</span>
    <div style="font-size:12px;color:var(--mut);margin-top:6px">Career index &middot; {html.escape(conf)} confidence</div></div>
  </div>
  {f'<p class="narr">{html.escape(narrative.get("narrative", ""))}</p>' if narrative.get("narrative") else ''}
  {f'<div class="next"><b>Next step:</b> {html.escape(narrative.get("next_step", ""))}</div>' if narrative.get("next_step") else ''}
  {contra_html}
  <h3>Signals</h3>{"".join(sections) if sections else '<p class="subt">Add a conversation to populate your signals.</p>'}
  {f'<h3>Recommended moves</h3><ul class="moves">{moves_html}</ul>' if moves_html else ''}
  {f'<h3>Grounded in</h3><ul class="cites">{cites_html}</ul>' if cites_html else ''}
  <div class="foot">Setmycareer is decision support — signals and suggestions to help you find your true north,
  grounded in public labor data (O*NET / BLS). It is not a guarantee of any outcome. Every score is anchored to your
  own words; thin evidence is shown at lower confidence.</div>
</div></body></html>"""
    return {"html": doc, "summary": narrative.get("headline") or f"Career index {ci}/100 ({conf} confidence)"}


# ---------------------------------------------------------------------------
# Specialised report — counsellor-weighted, route-predictive, journey + JVIS.
# Extends (never replaces) build_report: renders the richer structured report
# produced by specialised.generate_report into the same branded shell.
# ---------------------------------------------------------------------------

_JOURNEY_TITLES = {
    "problem": "The problem", "assessment": "The assessment", "sessions": "The sessions",
    "synthesis": "The synthesis", "future": "What's next",
}


def _prob_pill(pct: int, color: str) -> str:
    return (f'<span class="pill" style="background:{color}">~{pct}% est.</span>')


def build_specialised_report(report: dict, name: str = "") -> dict:
    """Render the specialised report dict (from specialised.generate_report) to a
    branded, print-ready HTML report. Returns {"html", "summary", "report"} — the
    structured `report` is passed straight through so the API can return both."""
    rep = report or {}
    nm = name or rep.get("name") or "You"
    ci = rep.get("career_index") or {}
    outlook = rep.get("outlook") or {}
    routes = rep.get("routes") or []
    judgment = rep.get("counsellor_judgment") or {}
    journey = rep.get("journey") or []
    work_roles = rep.get("work_role_percentiles") or []
    job_groups = rep.get("job_group_ranking") or []
    narrative = rep.get("narrative") or {}
    cp = rep.get("career_profile") or {}

    adj_idx = ci.get("adjusted")
    band_label, band_color = _band(adj_idx)

    sub = html.escape(nm)
    if cp.get("current"):
        sub += " &middot; " + html.escape(str(cp["current"]))
    if cp.get("target"):
        sub += " &rarr; " + html.escape(str(cp["target"]))

    # Route narratives by id (from the LLM prose, when present).
    route_prose = {r.get("id"): r.get("rationale", "")
                   for r in (narrative.get("routeNarratives") or []) if r.get("id")}

    # ── Framing + executive summary ─────────────────────────────────────────
    framing = html.escape(narrative.get("framingThesis", "")) if narrative.get("framingThesis") else ""
    exec_html = "".join(f"<p class='narr'>{html.escape(p)}</p>"
                        for p in (narrative.get("executiveSummary") or []))

    # ── Routes table (fit + grounded success probability + time-to-offer) ───
    route_rows = []
    for r in routes:
        bl, col = _band(r.get("fit_pct"))
        prose = route_prose.get(r.get("id"), "")
        route_rows.append(
            f'<tr><td class="sig">{html.escape(r.get("title",""))}'
            + (f' <em style="color:var(--mut);font-weight:400">· target</em>' if r.get("is_target") else "")
            + f'</td>'
            f'<td class="sc" style="color:{col}">{r.get("fit_pct","—")}%</td>'
            f'<td class="bd">{_prob_pill(r.get("success_pct", 0), band_color)}</td>'
            f'<td class="cf">{html.escape(r.get("time_to_offer",""))}</td></tr>'
            + (f'<tr class="q"><td colspan="4">{html.escape(prose or r.get("basis",""))}</td></tr>'
               if (prose or r.get("basis")) else "")
        )
    routes_html = (f'<table class="sigs">{"".join(route_rows)}</table>') if route_rows else ""

    # ── Counsellor synthesis (notes weighted heavily + bounded audit) ───────
    cs_text = narrative.get("counsellorSynthesis") or judgment.get("rationale", "")
    adjustments = judgment.get("adjustments") or []
    adj_html = ""
    if adjustments:
        rows = "".join(
            f'<li>{html.escape(a.get("name",""))}: <b>{a.get("from")}</b> &rarr; <b>{a.get("to")}</b> '
            f'<span style="color:var(--mut)">({html.escape(a.get("note",""))})</span></li>'
            for a in adjustments)
        adj_html = f'<ul class="moves" style="font-size:13px">{rows}</ul>'
    counsellor_html = ""
    if cs_text or adj_html:
        flag = ('<div style="font-size:11.5px;color:#C0892D;margin-bottom:6px">'
                'Counsellor judgment overrode the scored signal where they conflicted.</div>'
                if judgment.get("overrides_scores") else "")
        counsellor_html = (f'<div class="contra"><b>Counsellor synthesis</b>{flag}'
                           f'<p>{html.escape(cs_text)}</p>{adj_html}</div>')

    # ── Journey ─────────────────────────────────────────────────────────────
    journey_prose = {j.get("key"): j.get("narrative", "")
                     for j in (narrative.get("journey") or []) if j.get("key")}
    journey_rows = []
    for stage in journey:
        key = stage.get("key")
        title = _JOURNEY_TITLES.get(key, (key or "").title())
        body = journey_prose.get(key) or stage.get("summary", "")
        if body:
            journey_rows.append(
                f'<div class="jstage"><div class="jk">{html.escape(title)}</div>'
                f'<p>{html.escape(body)}</p></div>')
    journey_html = "".join(journey_rows)

    # ── JVIS-style: work-role percentiles + job-group ranking ───────────────
    wr_rows = "".join(
        f'<tr><td class="sig">{html.escape(w.get("name",""))}</td>'
        f'<td class="sc">{w.get("percentile","—")}</td>'
        f'<td class="bd">{html.escape(w.get("band",""))}</td>'
        f'<td class="cf">{html.escape(w.get("cluster",""))}</td></tr>'
        for w in work_roles[:12])
    wr_html = f'<table class="sigs">{wr_rows}</table>' if wr_rows else ""

    jg_rows = "".join(
        f'<li><b>{g.get("rank")}. {html.escape(g.get("group",""))}</b>'
        f'<span>best fit {g.get("best_fit","—")}% · '
        + html.escape(", ".join(rr.get("title","") for rr in (g.get("roles") or [])[:3]))
        + '</span></li>'
        for g in job_groups)
    jg_html = f'<ul class="moves">{jg_rows}</ul>' if jg_rows else ""

    # ── Job-market reading + recommendations + pull quotes (prose) ──────────
    jm_html = "".join(f"<p class='narr'>{html.escape(p)}</p>" for p in (narrative.get("jobMarket") or []))
    recs = narrative.get("recommendations") or [m.get("title", "") for m in (rep.get("moves") or [])]
    rec_html = "".join(f"<li>{html.escape(str(x))}</li>" for x in recs if x)
    pq_html = "".join(f'<div class="pull">&ldquo;{html.escape(q)}&rdquo;</div>'
                      for q in (narrative.get("pullQuotes") or []))

    cites = rep.get("citations") or []
    cites_html = "".join(f"<li>{html.escape(str(c))}</li>" for c in cites)

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Career Report — {html.escape(nm)}</title>
<link href="{_FONTS}" rel="stylesheet">
<style>
:root{{--ink:#231F20;--mut:#6E6C6B;--line:#ECEAE8;--soft:#F6F5F3}}
*{{box-sizing:border-box}}
body{{font-family:'Inter',system-ui,sans-serif;color:var(--ink);margin:0;background:#fff;line-height:1.55}}
.page{{max-width:780px;margin:0 auto;padding:44px 48px}}
.brandrow{{display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--ink);padding-bottom:14px}}
.brandrow svg{{width:30px;height:30px}}
.word{{font-family:'Cambo',serif;font-size:22px}}
.tag{{margin-left:auto;font-family:'Montserrat',sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}}
h1{{font-family:'Montserrat',sans-serif;font-weight:800;font-size:30px;margin:26px 0 2px;letter-spacing:-.02em}}
.subt{{color:var(--mut);font-size:13px;margin:0 0 18px}}
.hero{{display:flex;align-items:center;gap:18px;background:var(--soft);border-radius:16px;padding:20px 24px;margin:14px 0 12px}}
.idx{{font-family:'Montserrat',sans-serif;font-weight:800;font-size:54px;line-height:1;letter-spacing:-.03em}}
.idx small{{font-size:18px;color:var(--mut);font-weight:600}}
.pill{{display:inline-block;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:5px 12px;border-radius:999px;color:#fff}}
.outlook{{font-size:13px;color:var(--mut);margin-top:6px}}
.thesis{{font-size:16px;font-weight:500;margin:14px 0;padding:12px 16px;background:#FBF6EC;border-radius:12px}}
.narr{{font-size:14.5px;margin:0 0 10px}}
h3{{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:24px 0 6px}}
table.sigs{{width:100%;border-collapse:collapse}}
.sigs td{{padding:7px 4px;border-bottom:1px solid var(--line);font-size:13.5px;vertical-align:baseline}}
.sigs .sig{{font-weight:600}}
.sigs .sc{{font-family:'Montserrat',sans-serif;font-weight:700;text-align:right;width:54px}}
.sigs .bd{{width:120px;font-weight:600;font-size:12px}}
.sigs .cf{{width:120px;color:var(--mut);font-size:11.5px;text-align:right}}
.sigs tr.q td{{border-bottom:0;color:var(--mut);font-style:italic;font-size:12.5px;padding-top:0}}
ul.moves{{list-style:none;padding:0;margin:6px 0}}
ul.moves li{{padding:9px 0;border-bottom:1px solid var(--line)}}
ul.moves b{{display:block;font-size:14px}}
ul.moves span{{color:var(--mut);font-size:12.5px}}
.contra{{background:#F1F6F9;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:13.5px}}
.contra p{{margin:4px 0 8px}}
.jstage{{padding:10px 0;border-bottom:1px solid var(--line)}}
.jk{{font-family:'Montserrat',sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut)}}
.jstage p{{margin:4px 0 0;font-size:14px}}
.pull{{font-family:'Cambo',serif;font-size:16px;font-style:italic;color:var(--ink);border-left:3px solid var(--ink);padding:6px 0 6px 14px;margin:10px 0}}
ul.cites{{font-size:12px;color:var(--mut);padding-left:18px}}
.foot{{margin-top:30px;border-top:1px solid var(--line);padding-top:12px;font-size:11.5px;color:var(--mut)}}
@media print{{.page{{padding:0}}@page{{margin:18mm}}}}
</style></head>
<body><div class="page">
  <div class="brandrow">{_LOGOMARK}<span class="word">Setmycareer</span><span class="tag">Find Your True North</span></div>
  <h1>Career Report</h1>
  <p class="subt">{sub}</p>
  <div class="hero">
    <div class="idx" style="color:{band_color}">{adj_idx if adj_idx is not None else "—"}<small>/100</small></div>
    <div><span class="pill" style="background:{band_color}">{band_label}</span>
    <div class="outlook">Career index &middot; {html.escape(ci.get("confidence","low"))} confidence
    {f'&middot; counsellor adj {("+" if ci.get("delta_from_counsellor",0)>0 else "")}{ci.get("delta_from_counsellor")}' if ci.get("delta_from_counsellor") else ""}</div>
    <div class="outlook"><b>Outlook:</b> typical time-to-offer {html.escape(outlook.get("time_to_offer","—"))}
    {f'&middot; lead route {html.escape(outlook.get("lead_route",""))}' if outlook.get("lead_route") else ""}</div></div>
  </div>
  {f'<div class="thesis">{framing}</div>' if framing else ''}
  {exec_html}
  {f'<h3>Best-fit routes &middot; success estimate &middot; time-to-offer</h3>{routes_html}' if routes_html else ''}
  {counsellor_html}
  {f'<h3>Your journey</h3>{journey_html}' if journey_html else ''}
  {f'<h3>Work-role profile (within-profile percentiles)</h3>{wr_html}' if wr_html else ''}
  {f'<h3>Job-group similarity ranking</h3>{jg_html}' if jg_html else ''}
  {f'<h3>Job-market reading</h3>{jm_html}' if jm_html else ''}
  {f'<h3>Recommended next moves</h3><ul class="cites" style="list-style:decimal">{rec_html}</ul>' if rec_html else ''}
  {pq_html}
  {f'<h3>Grounded in</h3><ul class="cites">{cites_html}</ul>' if cites_html else ''}
  <div class="foot">{html.escape(rep.get("disclaimer",""))} Success probabilities and time-to-offer are
  ESTIMATES grounded in public labor data (O*NET / BLS), not guarantees — the market decides the final
  outcome. The counsellor's professional judgment is weighted heavily and its adjustments are bounded and logged.</div>
</div></body></html>"""

    summary = (narrative.get("framingThesis") or judgment.get("rationale")
               or f"Career index {adj_idx}/100 — lead route {outlook.get('lead_route','—')}, "
                  f"time-to-offer {outlook.get('time_to_offer','—')}")
    return {"html": doc, "summary": summary[:280], "report": rep}
