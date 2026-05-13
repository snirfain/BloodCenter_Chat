import { medicationsFromMdaEligibility } from './medicationEligibilityDerived';

export type MedicationAction =
  | 'זכאות מלאה'
  | 'פסילה קבועה'
  | 'פסילה זמנית'
  | 'בירור רפואי';

export interface Indication {
  reason: string;
  action: MedicationAction;
  waitTime?: string; // e.g. "48 שעות", "שבועיים"
  details?: string;
}

export interface Medication {
  name: string;
  aliases?: string[];
  indications: Indication[];
}

/** מאגר תרופות — נגזר מ־scripts/medication_eligibility.tsv (מקור: דף מד״א) */
export const medicationsDatabase: Medication[] = medicationsFromMdaEligibility as Medication[];

// ─── Helper: fuzzy search ────────────────────────────────────────────────────

export function searchMedication(query: string): Medication[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return medicationsDatabase.filter((med) => {
    const nameMatch = med.name.toLowerCase().includes(q);
    const aliasMatch = med.aliases?.some((a) => a.toLowerCase().includes(q));
    return nameMatch || aliasMatch;
  });
}

function normalizeMedQuery(q: string): string {
  return q.replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance over Unicode code units (fine for Hebrew + Latin aliases not used here). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * When substring search fails: best Hebrew trade name by edit distance.
 * Returns null on ties or if best distance exceeds threshold.
 */
export function findBestFuzzyHebrewMedicationMatch(query: string): Medication | null {
  const q = normalizeMedQuery(query);
  if (q.length < 3) return null;

  const qLower = q.toLowerCase();
  const maxDist = q.length <= 6 ? 2 : 3;

  let best: Medication | null = null;
  let bestD = Infinity;
  const tied = new Set<string>();

  for (const med of medicationsDatabase) {
    const name = med.name;
    const d = levenshtein(qLower, name.toLowerCase());
    if (d > maxDist) continue;
    if (d < bestD) {
      bestD = d;
      best = med;
      tied.clear();
      tied.add(name);
    } else if (d === bestD) {
      tied.add(name);
    }
  }

  if (best === null || tied.size !== 1) return null;
  return best;
}

/** Try each LLM / hint string until searchMedication returns a hit. */
export function firstMedicationHitForCandidateStrings(candidates: string[]): Medication | undefined {
  for (const c of candidates) {
    const hit = searchMedication(c)[0];
    if (hit) return hit;
  }
  return undefined;
}
