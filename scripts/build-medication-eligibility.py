#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reads scripts/medication_eligibility.tsv and emits src/data/medicationEligibilityDerived.ts"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TSV_PATH = ROOT / "scripts" / "medication_eligibility.tsv"
OUT_PATH = ROOT / "src" / "data" / "medicationEligibilityDerived.ts"
FLAT_PATH = ROOT / "src" / "data" / "medicationReferenceFlat.generated.ts"


def extract_wait_time(g: str) -> str | None:
    """Best-effort extraction of deferral / timing hints for UI."""
    g = g.replace("\u200f", "").strip()
    # Prefer longer phrases (e.g. full "6 חודשים לאחר סיום הטיפול")
    long_first = [
        r"\d+\s*חודשים\s*לאחר\s*סיום[^\n.]*",
        r"\d+\s*שנים\s*לאחר\s*סיום[^\n.]*",
        r"\d+\s*שבועות?\s*לאחר[^\n.]*",
        r"\d+\s*ימים?\s*לאחר[^\n.]*",
        r"\d+\s*שעות?\s*לאחר[^\n.]*",
    ]
    for pat in long_first:
        m = re.search(pat, g)
        if m:
            return m.group(0).strip().rstrip(".,")
    patterns = [
        r"\d+\s*שנים?\s*לאחר",
        r"\d+\s*שנה\s*לאחר",
        r"\d+\s*חודשים?\s*לאחר",
        r"\d+\s*חודש\s*לאחר",
        r"\d+\s*שבועות?\s*לאחר",
        r"\d+\s*שבוע\s*לאחר",
        r"\d+\s*ימים?\s*לאחר",
        r"\d+\s*יום\s*לאחר",
        r"\d+\s*שעות?\s*לאחר",
        r"\d+\s*שעה\s*לאחר",
        r"24\s*שעות",
        r"12\s*שעות",
        r"48\s*שעות",
    ]
    for pat in patterns:
        m = re.search(pat, g, re.IGNORECASE)
        if m:
            return m.group(0).strip().rstrip(".,")
    if "24 שעות" in g or "עברו 24 שעות" in g:
        return "24 שעות"
    if "12 שעות" in g:
        return "12 שעות"
    return None


def guideline_to_action(guidelines: str) -> tuple[str, str | None]:
    """
    Map Hebrew MDA guideline text to MedicationAction + optional waitTime string.
    Returns (action, waitTime_or_none).
    """
    g = guidelines.strip().lstrip(".").strip()

    # Steroids / complex: deferral + medical authority
    if "לתרומות עתידיות לפנות" in g or "לתרומות עתידיות לפנות לסמכות" in g:
        return "בירור רפואי", extract_wait_time(g)

    if "לפנות לסמכות" in g or "לבירור לסמכות" in g or "לפנות לבירור" in g:
        return "בירור רפואי", extract_wait_time(g)

    if "כפוף לחומרת" in g or "לפנות לבירור" in g:
        return "בירור רפואי", extract_wait_time(g)

    if "אסור להתרים" in g:
        return "פסילה קבועה", None

    if "מותר להתרים" in g:
        wt = extract_wait_time(g)
        return "זכאות מלאה", wt

    if "בהתאם ל" in g or "בהתאם למצב" in g:
        return "בירור רפואי", extract_wait_time(g)

    if "סיכון לירידת לחץ דם" in g and "מותר" in g:
        return "זכאות מלאה", extract_wait_time(g)

    return "בירור רפואי", extract_wait_time(g)


def load_rows() -> list[tuple[str, str, str, str, str]]:
    if not TSV_PATH.is_file():
        return []
    out: list[tuple[str, str, str, str, str]] = []
    with TSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if not row or not any(c.strip() for c in row):
                continue
            while len(row) < 5:
                row.append("")
            out.append(
                (
                    row[0].strip(),
                    row[1].strip(),
                    row[2].strip(),
                    row[3].strip(),
                    row[4].strip(),
                )
            )
    return out


def build_medications(rows: list[tuple[str, str, str, str, str]]) -> list[dict]:
    """Group by Hebrew trade name; merge aliases and indications."""
    by_name: dict[str, dict] = {}
    alias_sets: dict[str, set[str]] = defaultdict(set)

    for name_he, name_en, generic, guidelines, criterion in rows:
        if not name_he:
            continue
        action, wt = guideline_to_action(guidelines)
        ind = {
            "reason": criterion or "לא צוין",
            "action": action,
            "details": guidelines,
        }
        if wt:
            ind["waitTime"] = wt

        if name_he not in by_name:
            by_name[name_he] = {
                "name": name_he,
                "aliases": [],
                "indications": [],
            }
        by_name[name_he]["indications"].append(ind)
        if name_en:
            alias_sets[name_he].add(name_en.lower())
            alias_sets[name_he].add(name_en)
        if generic:
            for part in re.split(r"[,/&+]", generic):
                p = part.strip()
                if p:
                    alias_sets[name_he].add(p.lower())
                    alias_sets[name_he].add(p)

    for name_he, med in by_name.items():
        med["aliases"] = sorted(alias_sets[name_he], key=lambda x: (len(x), x))[:24]

    return list(by_name.values())


def emit_ts(meds: list[dict]) -> str:
    payload = json.dumps(meds, ensure_ascii=False, indent=2)
    return f"""/* eslint-disable */
// Auto-generated by scripts/build-medication-eligibility.py — do not edit by hand.

export const medicationsFromMdaEligibility = {payload};
"""


def emit_flat_ts(rows: list[tuple[str, str, str, str, str]]) -> str:
    flat: list[dict[str, str]] = []
    for name_he, name_en, generic, guidelines, criterion in rows:
        if not name_he:
            continue
        flat.append(
            {
                "nameHe": name_he,
                "nameEn": name_en,
                "genericName": generic,
                "guidelines": guidelines,
                "criterion": criterion,
            }
        )
    payload = json.dumps(flat, ensure_ascii=False, indent=2)
    return f"""/* eslint-disable */
// Auto-generated by scripts/build-medication-eligibility.py — flat rows for reference tables.

export type MedicationReferenceFlatRow = {{
  nameHe: string;
  nameEn: string;
  genericName: string;
  guidelines: string;
  criterion: string;
}};

export const MEDICATION_REFERENCE_FLAT_ROWS: MedicationReferenceFlatRow[] = {payload};
"""


def main() -> None:
    rows = load_rows()
    meds = build_medications(rows)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(emit_ts(meds), encoding="utf-8")
    FLAT_PATH.write_text(emit_flat_ts(rows), encoding="utf-8")
    print(f"Wrote {len(meds)} medications ({len(rows)} TSV rows) -> {OUT_PATH}")
    print(f"Wrote {len(rows)} flat reference rows -> {FLAT_PATH}")


if __name__ == "__main__":
    main()
