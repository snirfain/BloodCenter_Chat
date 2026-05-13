import type { Issue } from '../types/chat';
import type { Indication } from './medications';

/** Substrings that usually imply a time-based deferral if present without structured waitTime */
const DEFERRAL_HINTS: readonly string[] = [
  'לאחר סיום',
  'לאחר החלמה',
  'לאחר סיום הקורס',
  'לאחר סיום הטיפול',
  'לאחר סיום טיפול',
  'ימים לאחר',
  'שבועות לאחר',
  'חודש לאחר',
  'חודשיים לאחר',
  'חודשים לאחר',
  'שנה לאחר',
  'שנתיים לאחר',
  'שעות לאחר',
  'שעה לאחר',
  '24 שעות',
  '48 שעות',
];

export function detailsSuggestDeferral(text: string): boolean {
  const t = text.replace(/\u200f/g, '').trim();
  return DEFERRAL_HINTS.some((h) => t.includes(h));
}

function clipAroundHint(text: string, maxLen = 220): string {
  const t = text.replace(/\u200f/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  const idx = DEFERRAL_HINTS.map((h) => t.indexOf(h)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (idx === undefined) return `${t.slice(0, maxLen)}…`;
  const start = Math.max(0, idx - 40);
  const slice = t.slice(start, start + maxLen);
  return start > 0 ? `…${slice}…` : `${slice}${t.length > start + maxLen ? '…' : ''}`;
}

/**
 * Best-effort deferral phrase from free-text (aligned with scripts/build-medication-eligibility.py).
 */
export function inferDeferralPhraseFromText(g: string): string | undefined {
  const text = g.replace(/\u200f/g, '').trim();
  const longFirst = [
    /\d+\s*חודשים\s*לאחר\s*סיום[^\n.]*/u,
    /\d+\s*שנים\s*לאחר\s*סיום[^\n.]*/u,
    /\d+\s*שבועות?\s*לאחר[^\n.]*/u,
    /\d+\s*ימים?\s*לאחר[^\n.]*/u,
    /\d+\s*שעות?\s*לאחר[^\n.]*/u,
  ];
  for (const pat of longFirst) {
    const m = text.match(pat);
    if (m) return m[0].trim().replace(/[.,]$/, '');
  }
  const noLeadingDigit = [
    /חודשיים\s*לאחר[^\n.]*/u,
    /חודש\s*לאחר[^\n.]*/u,
    /שבועיים\s*לאחר[^\n.]*/u,
    /שבוע\s*לאחר[^\n.]*/u,
    /יומיים\s*לאחר[^\n.]*/u,
    /יום\s*לאחר[^\n.]*/u,
    /שנתיים\s*לאחר[^\n.]*/u,
    /שנה\s*לאחר[^\n.]*/u,
  ];
  for (const pat of noLeadingDigit) {
    const m = text.match(pat);
    if (m) return m[0].trim().replace(/[.,]$/, '');
  }
  const patterns = [
    /\d+\s*שנים?\s*לאחר/u,
    /\d+\s*שנה\s*לאחר/u,
    /\d+\s*חודשים?\s*לאחר/u,
    /\d+\s*חודש\s*לאחר/u,
    /\d+\s*שבועות?\s*לאחר/u,
    /\d+\s*שבוע\s*לאחר/u,
    /\d+\s*ימים?\s*לאחר/u,
    /\d+\s*יום\s*לאחר/u,
    /\d+\s*שעות?\s*לאחר/u,
    /\d+\s*שעה\s*לאחר/u,
    /24\s*שעות/u,
    /12\s*שעות/u,
    /48\s*שעות/u,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[0].trim().replace(/[.,]$/, '');
  }
  if (text.includes('24 שעות') || text.includes('עברו 24 שעות')) return '24 שעות';
  if (text.includes('12 שעות')) return '12 שעות';

  const mEnd = text.match(/[^\n.]*לאחר סיום ה?טיפול[^\n.]*/u);
  if (mEnd) return mEnd[0].trim().replace(/[.,]$/, '');
  if (text.includes('לאחר סיום הקורס')) {
    const m = text.match(/[^\n.]*לאחר סיום הקורס[^\n.]*/u);
    if (m) return m[0].trim().replace(/[.,]$/, '');
    return 'לאחר סיום הקורס';
  }
  if (text.includes('לאחר החלמה')) {
    const m = text.match(/[^\n.]*לאחר החלמה[^\n.]*/u);
    if (m) return m[0].trim().replace(/[.,]$/, '');
  }
  return undefined;
}

/**
 * Maps a single indication to an eligibility issue, or null if no restriction applies.
 * For `זכאות מלאה`, defers when waitTime exists, when a deferral phrase can be inferred,
 * or when guideline text clearly implies waiting but structured waitTime is missing (defense in depth).
 */
export function indicationToMedicationIssue(medName: string, ind: Indication): Issue | null {
  const drugLabel = `תרופה: ${medName}`;
  const combined = `${ind.details ?? ''}\n${ind.reason ?? ''}`;

  switch (ind.action) {
    case 'פסילה קבועה':
      return { type: 'פסילה קבועה', reason: `${drugLabel} — ${ind.reason}` };
    case 'פסילה זמנית':
      return { type: 'פסילה זמנית', reason: drugLabel, waitTime: ind.waitTime };
    case 'בירור רפואי':
      return { type: 'בירור רפואי', reason: `${drugLabel} — ${ind.reason}` };
    case 'זכאות מלאה': {
      const explicit = ind.waitTime?.trim();
      if (explicit) {
        return { type: 'פסילה זמנית', reason: `${drugLabel} — ${ind.reason}`, waitTime: explicit };
      }
      const inferred = inferDeferralPhraseFromText(combined);
      if (inferred) {
        return { type: 'פסילה זמנית', reason: `${drugLabel} — ${ind.reason}`, waitTime: inferred };
      }
      if (detailsSuggestDeferral(combined)) {
        const clip = clipAroundHint(ind.details || ind.reason || combined);
        return {
          type: 'פסילה זמנית',
          reason: `${drugLabel} — ${ind.reason}`,
          summaryLine: `${drugLabel} — ${ind.reason}. לפי הנחיות מד״א: ${clip}`,
        };
      }
      return null;
    }
    default:
      return null;
  }
}
