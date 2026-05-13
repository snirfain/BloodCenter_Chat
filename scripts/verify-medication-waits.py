#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fails if any indication has action 'זכאות מלאה', details suggest a deferral window,
but waitTime is missing. Run after: python3 scripts/build-medication-eligibility.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DERIVED = ROOT / "src" / "data" / "medicationEligibilityDerived.ts"

# Hebrew snippets that imply time-based deferral if appearing in guideline/details
DEFERRAL_HINTS = (
    "לאחר סיום",
    "לאחר החלמה",
    "לאחר סיום הקורס",
    "לאחר סיום הטיפול",
    "ימים לאחר",
    "שבועות לאחר",
    "חודש לאחר",
    "חודשיים לאחר",
    "חודשים לאחר",
    "שנה לאחר",
    "שנתיים לאחר",
    "שעות לאחר",
    "שעה לאחר",
    "24 שעות",
    "48 שעות",
)


def load_meds_from_ts() -> list[dict]:
    text = DERIVED.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\[[\s\S]*\])\s*;", text)
    if not m:
        print("Could not parse medications JSON from medicationEligibilityDerived.ts", file=sys.stderr)
        sys.exit(2)
    return json.loads(m.group(1))


def main() -> None:
    meds = load_meds_from_ts()
    problems: list[str] = []
    for med in meds:
        name = med.get("name", "?")
        for ind in med.get("indications", []):
            if ind.get("action") != "זכאות מלאה":
                continue
            details = (ind.get("details") or "") + " " + (ind.get("reason") or "")
            wt = ind.get("waitTime")
            if wt:
                continue
            if any(h in details for h in DEFERRAL_HINTS):
                problems.append(f"{name}: זכאות מלאה בלי waitTime אך details מרמזים על המתנה — {details[:80]}…")

    if problems:
        print("FAILED — indications עם רמז המתנה ללא waitTime:", file=sys.stderr)
        for p in problems[:50]:
            print(p, file=sys.stderr)
        if len(problems) > 50:
            print(f"... ועוד {len(problems) - 50}", file=sys.stderr)
        sys.exit(1)
    print(f"OK — נבדקו {len(meds)} תרופות, אין דגלים.")


if __name__ == "__main__":
    main()
