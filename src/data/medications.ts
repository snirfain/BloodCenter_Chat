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
