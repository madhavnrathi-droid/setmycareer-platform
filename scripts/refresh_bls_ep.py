#!/usr/bin/env python
"""Refresh the BLS Employment Projections growth snapshot → app/knowledge/bls_ep.jsonl.

BLS EP growth figures (e.g. 2023–33 % change) are NOT in the live timeseries API —
they ship as a separate downloadable table. The OEWS *wage* API stays live
(app/labor.py); this script bundles the projected-growth side as a refreshable
snapshot the career pipeline grounds in (pc.aspiration_realism, opportunity_surface).

Run on demand (data is large, changes ~yearly):
    pip install pandas openpyxl
    python scripts/refresh_bls_ep.py
Source: https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm
"""
from __future__ import annotations

import json
import pathlib

URL = "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.xlsx"
OUT = pathlib.Path(__file__).resolve().parents[1] / "app/knowledge/bls_ep.jsonl"


def _num(v):
    try:
        return float(str(v).replace(",", "").replace("%", "").strip())
    except (ValueError, AttributeError):
        return None


def main() -> None:
    import pandas as pd  # dev-only dependency

    df = pd.read_excel(URL, skiprows=1)

    def col(*cands):
        for c in df.columns:
            cl = str(c).lower()
            if any(k in cl for k in cands):
                return c
        return None

    soc = col("soc")
    title = col("occupation title", "matrix title")
    growth = col("employment change, percent", "percent change", "percent employment change")
    wage = col("median annual wage")
    n = 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        for _, row in df.iterrows():
            s = str(row.get(soc, "")).strip()
            if not s or s.lower() == "nan":
                continue
            f.write(json.dumps({
                "soc": s,
                "title": str(row.get(title, "")).strip(),
                "growth_pct": _num(row.get(growth)),
                "median_wage": _num(row.get(wage)),
            }) + "\n")
            n += 1
    print(f"wrote {n} occupations → {OUT}")


if __name__ == "__main__":
    main()
