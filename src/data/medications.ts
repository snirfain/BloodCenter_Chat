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

/** Levenshtein distance over Unicode code units. */
function medicationLevenshtein(a: string, b: string): number {
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
 * Restricted Damerau–Levenshtein (substring transposition of adjacent chars costs 1).
 * Fixes swaps like פרופסיה ↔ פורפסיה vs plain Levenshtein tying unrelated drugs.
 */
function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const H: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) H[i][0] = i;
  for (let j = 0; j <= n; j++) H[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      H[i][j] = Math.min(H[i][j - 1] + 1, H[i - 1][j] + 1, H[i - 1][j - 1] + cost);
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        H[i][j] = Math.min(H[i][j], H[i - 2][j - 2] + 1);
      }
    }
  }
  return H[m][n];
}

const HEBREW_IN = /[\u0590-\u05FF]/;

/** Best distance between query and Hebrew name + Hebrew-looking aliases. */
function minDistToMedicationStrings(qLower: string, med: Medication): { dD: number; dL: number } {
  let dD = damerauLevenshtein(qLower, med.name.toLowerCase());
  let dL = medicationLevenshtein(qLower, med.name.toLowerCase());
  const aliases = med.aliases ?? [];
  for (const al of aliases) {
    const a = al.trim();
    if (!a) continue;
    const alLow = a.toLowerCase();
    if (HEBREW_IN.test(a)) {
      const dd = damerauLevenshtein(qLower, alLow);
      const dl = medicationLevenshtein(qLower, alLow);
      if (dd < dD || (dd === dD && dl < dL)) {
        dD = dd;
        dL = dl;
      }
    } else if (!HEBREW_IN.test(qLower)) {
      const dd = damerauLevenshtein(qLower, alLow);
      const dl = medicationLevenshtein(qLower, alLow);
      if (dd < dD || (dd === dD && dl < dL)) {
        dD = dd;
        dL = dl;
      }
    }
  }
  return { dD, dL };
}

function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1;
  return i;
}

/**
 * When substring search fails: best medication by Damerau distance (handles letter swaps).
 * Tie-break when same min D: lower plain Levenshtein, longer common prefix; still tied → reject.
 */
export function findBestFuzzyHebrewMedicationMatch(query: string): Medication | null {
  const q = normalizeMedQuery(query);
  if (q.length < 3) return null;

  const qLower = q.toLowerCase();
  const maxD = q.length <= 6 ? 2 : 3;

  type Cand = {
    med: Medication;
    dD: number;
    dL: number;
    prefix: number;
  };
  const cands: Cand[] = [];

  for (const med of medicationsDatabase) {
    const { dD, dL } = minDistToMedicationStrings(qLower, med);
    if (dD > maxD) continue;
    const prefix = commonPrefixLen(qLower, med.name.toLowerCase());
    cands.push({ med, dD, dL, prefix });
  }

  if (cands.length === 0) return null;

  cands.sort((a, b) => {
    if (a.dD !== b.dD) return a.dD - b.dD;
    if (a.dL !== b.dL) return a.dL - b.dL;
    return b.prefix - a.prefix;
  });

  const top = cands[0];
  if (cands.length >= 2) {
    const second = cands[1];
    if (
      second.dD === top.dD &&
      second.dL === top.dL &&
      second.prefix === top.prefix
    ) {
      return null;
    }
  }

  return top.med;
}

/**
 * Latin / ASCII input: fuzzy-match against Latin aliases (Hebrew trade names skipped).
 */
export function findBestFuzzyLatinAliasMatch(hint: string): Medication | null {
  const qNorm = hint.trim().toLowerCase().replace(/[\s-]+/g, '');
  if (qNorm.length < 3) return null;
  const maxD = qNorm.length <= 6 ? 2 : 3;

  type Row = { med: Medication; dD: number; dL: number };
  const rows: Row[] = [];

  /** One score per medication: best Latin alias distance only (duplicate alias rows collapsed). */
  for (const med of medicationsDatabase) {
    let bestD = Infinity;
    let bestL = Infinity;
    for (const al of med.aliases ?? []) {
      const a = al.trim();
      if (!a || HEBREW_IN.test(a)) continue;
      const pNorm = a.toLowerCase().replace(/[\s-]+/g, '');
      if (pNorm.length < 3) continue;
      const dD = damerauLevenshtein(qNorm, pNorm);
      if (dD > maxD) continue;
      const dL = medicationLevenshtein(qNorm, pNorm);
      if (dD < bestD || (dD === bestD && dL < bestL)) {
        bestD = dD;
        bestL = dL;
      }
    }
    if (bestD !== Infinity) {
      rows.push({ med, dD: bestD, dL: bestL });
    }
  }

  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.dD !== b.dD ? a.dD - b.dD : a.dL - b.dL));
  const head = rows[0];
  if (rows.length >= 2 && rows[1].dD === head.dD && rows[1].dL === head.dL) return null;
  return head.med;
}

/** Substring hit first; else Hebrew fuzzy; else fuzzy on Latin aliases (LLM fallback). */
export function firstMedicationHitForCandidateStrings(candidates: string[]): Medication | undefined {
  for (const raw of candidates) {
    const c = raw.trim();
    if (!c) continue;

    const fromSub = searchMedication(c)[0];
    if (fromSub) return fromSub;

    if (HEBREW_IN.test(c)) {
      const fuzzy = findBestFuzzyHebrewMedicationMatch(c);
      if (fuzzy) return fuzzy;
      continue;
    }

    const latin = findBestFuzzyLatinAliasMatch(c);
    if (latin) return latin;
  }

  return undefined;
}
