#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reads scripts/country_travel_criteria.tsv → scripts/reference-tables/country_travel_reference.json"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TSV_PATH = ROOT / "scripts" / "country_travel_criteria.tsv"
REF_DIR = ROOT / "scripts" / "reference-tables"
OUT_JSON = REF_DIR / "country_travel_reference.json"


def main() -> None:
    if not TSV_PATH.is_file():
        REF_DIR.mkdir(parents=True, exist_ok=True)
        OUT_JSON.write_text("[]", encoding="utf-8")
        print(f"No TSV at {TSV_PATH}; wrote empty {OUT_JSON}")
        return

    rows_out: list[dict[str, str]] = []
    with TSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter="\t")
        seq = 0
        for row in reader:
            if not row or not any(c.strip() for c in row):
                continue
            while len(row) < 5:
                row.append("")
            seq += 1
            rows_out.append(
                {
                    "id": f"country-travel-{seq:03d}",
                    "nameHe": row[0].strip(),
                    "nameEn": row[1].strip(),
                    "topic": row[2].strip(),
                    "criteria": row[3].strip(),
                    "remarks": row[4].strip(),
                }
            )

    REF_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(rows_out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows_out)} rows (JSON, not bundled) -> {OUT_JSON}")


if __name__ == "__main__":
    main()
