"""
Fetch US Macro & Capital Market time series from St. Louis Fed FRED public CSV endpoints
(no API key required) and build `public/data/us_macro_live.json` for CME Workbench v2.0.
"""

from __future__ import annotations

import csv
import io
import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"

SERIES_CONFIG: Dict[str, str] = {
    "FEDFUNDS": "Effective Federal Funds Rate (%)",
    "DGS3MO": "3-Month Treasury Constant Maturity (%)",
    "DGS1": "1-Year Treasury Constant Maturity (%)",
    "DGS2": "2-Year Treasury Constant Maturity (%)",
    "DGS5": "5-Year Treasury Constant Maturity (%)",
    "DGS10": "10-Year Treasury Constant Maturity (%)",
    "DGS20": "20-Year Treasury Constant Maturity (%)",
    "DGS30": "30-Year Treasury Constant Maturity (%)",
    "T10Y2Y": "10Y-2Y Treasury Spread (%)",
    "PCEPILFE": "Core PCE Price Index (Index)",
    "GDPC1": "Real GDP (Billions of Chained 2017 Dollars)",
    "GDPPOT": "Real Potential GDP (CBO, Billions)",
    "BAMLC0A0CM": "ICE BofA US Corporate IG OAS (%)",
    "BAMLH0A0HYM2": "ICE BofA US High Yield OAS (%)",
    "GFDEGDQ188S": "Federal Debt: Total Public Debt as % of GDP",
    "FYFSGDA188S": "Federal Surplus or Deficit (-) as % of GDP",
    "NETEXP": "Net Exports of Goods and Services (Billions)",
    "GDP": "Nominal GDP (Billions)",
}


def fetch_series_csv(series_id: str, timeout: int = 20) -> List[Tuple[str, float]]:
    url = FRED_CSV_URL.format(series_id=series_id)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "CME-Macro-Workbench/2.0 (Educational Research)"
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        text = resp.read().decode("utf-8", errors="replace")

    rows: List[Tuple[str, float]] = []
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    if not header:
        return rows
    for line in reader:
        if len(line) < 2:
            continue
        date_str, val_str = line[0].strip(), line[1].strip()
        if not val_str or val_str == ".":
            continue
        try:
            val = float(val_str)
            if math.isfinite(val):
                rows.append((date_str, val))
        except ValueError:
            continue
    return rows


def to_quarter_key(date_str: str) -> str:
    year = int(date_str[:4])
    month = int(date_str[5:7])
    q = (month - 1) // 3 + 1
    return f"{year}-Q{q}"


def aggregate_quarterly_last(rows: List[Tuple[str, float]]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for d, v in rows:
        if d >= "1970-01-01":
            out[to_quarter_key(d)] = v
    return out


def compute_yoy_quarterly(q_map: Dict[str, float]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    sorted_keys = sorted(q_map.keys())
    for k in sorted_keys:
        y, q = k.split("-Q")
        prev_k = f"{int(y) - 1}-Q{q}"
        if prev_k in q_map and q_map[prev_k] > 0:
            out[k] = round(((q_map[k] / q_map[prev_k]) - 1.0) * 100.0, 2)
    return out


def build_snapshot_dataset() -> dict:
    raw: Dict[str, List[Tuple[str, float]]] = {}
    fetched_series: List[str] = []
    failed_series: List[str] = []

    for sid in SERIES_CONFIG:
        try:
            data = fetch_series_csv(sid)
            if data:
                raw[sid] = data
                fetched_series.append(sid)
                print(f"[OK] {sid}: {len(data)} obs (latest {data[-1][0]} = {data[-1][1]})")
            else:
                failed_series.append(sid)
                print(f"[WARN] {sid}: empty response")
        except Exception as exc:
            failed_series.append(sid)
            print(f"[ERR] {sid}: {exc}")

    if not fetched_series:
        raise RuntimeError("Failed to fetch any FRED series.")

    q_fed = aggregate_quarterly_last(raw.get("FEDFUNDS", []))
    q_3m = aggregate_quarterly_last(raw.get("DGS3MO", []))
    q_1y = aggregate_quarterly_last(raw.get("DGS1", []))
    q_2y = aggregate_quarterly_last(raw.get("DGS2", []))
    q_5y = aggregate_quarterly_last(raw.get("DGS5", []))
    q_10y = aggregate_quarterly_last(raw.get("DGS10", []))
    q_20y = aggregate_quarterly_last(raw.get("DGS20", []))
    q_30y = aggregate_quarterly_last(raw.get("DGS30", []))

    q_pce_idx = aggregate_quarterly_last(raw.get("PCEPILFE", []))
    q_pce_yoy = compute_yoy_quarterly(q_pce_idx)

    q_gdp_real = aggregate_quarterly_last(raw.get("GDPC1", []))
    q_gdp_yoy = compute_yoy_quarterly(q_gdp_real)
    q_gdp_pot = aggregate_quarterly_last(raw.get("GDPPOT", []))

    q_ig = aggregate_quarterly_last(raw.get("BAMLC0A0CM", []))
    q_hy = aggregate_quarterly_last(raw.get("BAMLH0A0HYM2", []))
    q_debt = aggregate_quarterly_last(raw.get("GFDEGDQ188S", []))
    q_deficit = aggregate_quarterly_last(raw.get("FYFSGDA188S", []))
    q_netexp = aggregate_quarterly_last(raw.get("NETEXP", []))
    q_nom_gdp = aggregate_quarterly_last(raw.get("GDP", []))

    # Annual fiscal deficit fallback carry-forward across quarters
    last_deficit = 3.5
    last_debt = 60.0
    last_ig = 1.25
    last_hy = 4.0

    all_quarters = sorted(
        {k for k in q_10y.keys() if k >= "1971-Q1"} | {k for k in q_fed.keys() if k >= "1971-Q1"}
    )

    records = []
    for qk in all_quarters:
        fed = q_fed.get(qk)
        y10 = q_10y.get(qk)
        if fed is None or y10 is None:
            continue

        y2 = q_2y.get(qk, round(fed * 0.5 + y10 * 0.5, 2))
        y3m = q_3m.get(qk, fed)
        y1 = q_1y.get(qk, round(y3m * 0.4 + y2 * 0.6, 2))
        y5 = q_5y.get(qk, round(y2 * 0.45 + y10 * 0.55, 2))
        y20 = q_20y.get(qk, round(y10 + 0.25, 2))
        y30 = q_30y.get(qk, round(y20 + 0.15, 2))

        pce_yoy = q_pce_yoy.get(qk, 2.2)
        gdp_yoy = q_gdp_yoy.get(qk, 2.5)

        output_gap = 0.0
        if qk in q_gdp_real and qk in q_gdp_pot and q_gdp_pot[qk] > 0:
            output_gap = round(((q_gdp_real[qk] / q_gdp_pot[qk]) - 1.0) * 100.0, 2)

        if qk in q_deficit:
            # FRED FYFSGDA188S is surplus (+) / deficit (-); convert to deficit positive %
            last_deficit = round(-q_deficit[qk], 2)
        if qk in q_debt:
            last_debt = round(q_debt[qk], 1)
        if qk in q_ig:
            last_ig = round(q_ig[qk], 2)
        if qk in q_hy:
            last_hy = round(q_hy[qk], 2)

        net_exp_pct = -2.8
        if qk in q_netexp and qk in q_nom_gdp and q_nom_gdp[qk] > 0:
            net_exp_pct = round((q_netexp[qk] / q_nom_gdp[qk]) * 100.0, 2)

        records.append(
            {
                "quarter": qk,
                "fedFunds": round(fed, 2),
                "corePceYoy": pce_yoy,
                "realGdpYoy": gdp_yoy,
                "outputGap": output_gap,
                "igOas": last_ig,
                "hyOas": last_hy,
                "govDebtPctGdp": last_debt,
                "fiscalDeficitPctGdp": last_deficit,
                "netExportsPctGdp": net_exp_pct,
                "curve": {
                    "3M": round(y3m, 2),
                    "1Y": round(y1, 2),
                    "2Y": round(y2, 2),
                    "5Y": round(y5, 2),
                    "10Y": round(y10, 2),
                    "20Y": round(y20, 2),
                    "30Y": round(y30, 2),
                },
            }
        )

    return {
        "source": "St. Louis Fed FRED Public CSV",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fetchedSeries": fetched_series,
        "failedSeries": failed_series,
        "latestQuarter": records[-1]["quarter"] if records else None,
        "count": len(records),
        "records": records,
    }


if __name__ == "__main__":
    out_path = Path(__file__).resolve().parent.parent / "public" / "data" / "us_macro_live.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dataset = build_snapshot_dataset()
    out_path.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {dataset['count']} quarterly records (latest: {dataset['latestQuarter']}) -> {out_path}")
