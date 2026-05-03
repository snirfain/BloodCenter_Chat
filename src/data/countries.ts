export type CountryRisk = 'none' | 'malaria' | 'high_risk' | 'bse';

export interface Country {
  name: string;
  aliases?: string[];
  risk: CountryRisk;
  waitTime?: string;
  reason?: string;
}

/** מתאם ל־country_travel_reference.json (country-travel-065) — תצוגה אחת ללא כפילות reason/waitTime. */
export const INDIA_TRAVEL_REFERENCE = {
  /** ללוגיקה פנימית / Supabase */
  reason: 'נסיעה להודו (מלריה — נוהל מד״א)',
  /** שורה אחת קריאה בסיכום הסופי */
  summaryLine:
    'נסיעה להודו (מלריה): דחייה של 12 חודשים מהחזרה לביקור רגיל; אם שהית בהודו מעל שישה חודשים — דחייה של שלוש שנים מהחזרה.',
} as const;

/** זיהוי הודו לפני כללי «מלריה» גנריים (מונע הצגת 3 חודשים בטעות). */
export function isIndiaCountry(country: Country): boolean {
  const name = country.name.normalize('NFC').trim();
  const refHe = 'הודו'.normalize('NFC');
  if (name === refHe) return true;
  return country.aliases?.some((a) => /^india$/i.test(a.trim())) ?? false;
}

// Based on MDA and standard blood bank international travel guidelines
export const countriesDatabase: Country[] = [
  // ── ללא סיכון מיוחד ──────────────────────────────────────────────────────
  { name: 'ארצות הברית', aliases: ['usa', 'united states', 'united states of america', 'אמריקה'], risk: 'none' },
  { name: 'קנדה', aliases: ['canada'], risk: 'none' },
  { name: 'בריטניה', aliases: ['uk', 'england', 'אנגליה', 'scotland', 'wales'], risk: 'none' },
  { name: 'גרמניה', aliases: ['germany', 'deutschland'], risk: 'none' },
  { name: 'צרפת', aliases: ['france'], risk: 'none' },
  { name: 'איטליה', aliases: ['italy'], risk: 'none' },
  { name: 'ספרד', aliases: ['spain'], risk: 'none' },
  { name: 'יוון', aliases: ['greece'], risk: 'none' },
  { name: 'הולנד', aliases: ['netherlands', 'holland'], risk: 'none' },
  { name: 'בלגיה', aliases: ['belgium'], risk: 'none' },
  { name: 'שוויץ', aliases: ['switzerland'], risk: 'none' },
  { name: 'אוסטריה', aliases: ['austria'], risk: 'none' },
  { name: 'שבדיה', aliases: ['sweden'], risk: 'none' },
  { name: 'נורווגיה', aliases: ['norway'], risk: 'none' },
  { name: 'דנמרק', aliases: ['denmark'], risk: 'none' },
  { name: 'פינלנד', aliases: ['finland'], risk: 'none' },
  { name: 'פולין', aliases: ['poland'], risk: 'none' },
  { name: 'צ׳כיה', aliases: ['czech', 'czechia'], risk: 'none' },
  { name: 'הונגריה', aliases: ['hungary'], risk: 'none' },
  { name: 'אוסטרליה', aliases: ['australia'], risk: 'none' },
  { name: 'ניו זילנד', aliases: ['new zealand'], risk: 'none' },
  { name: 'יפן', aliases: ['japan'], risk: 'none' },
  { name: 'דרום קוריאה', aliases: ['south korea', 'korea'], risk: 'none' },
  { name: 'סינגפור', aliases: ['singapore'], risk: 'none' },
  { name: 'האמירויות הערביות', aliases: ['uae', 'dubai', 'דובאי', 'abu dhabi', 'emirates'], risk: 'none' },
  { name: 'ירדן', aliases: ['jordan'], risk: 'none' },
  { name: 'מצרים', aliases: ['egypt'], risk: 'none' },
  { name: 'מרוקו', aliases: ['morocco'], risk: 'none' },
  { name: 'תוניסיה', aliases: ['tunisia'], risk: 'none' },
  { name: 'טורקיה', aliases: ['turkey', 'türkiye'], risk: 'none' },
  { name: 'קפריסין', aliases: ['cyprus'], risk: 'none' },
  { name: 'פורטוגל', aliases: ['portugal'], risk: 'none' },
  { name: 'אירלנד', aliases: ['ireland'], risk: 'none' },
  { name: 'קרואטיה', aliases: ['croatia'], risk: 'none' },
  { name: 'רומניה', aliases: ['romania'], risk: 'none' },
  { name: 'בולגריה', aliases: ['bulgaria'], risk: 'none' },
  { name: 'סרביה', aliases: ['serbia'], risk: 'none' },
  { name: 'סלובניה', aliases: ['slovenia'], risk: 'none' },
  { name: 'סלובקיה', aliases: ['slovakia'], risk: 'none' },
  { name: 'אוקראינה', aliases: ['ukraine'], risk: 'none' },
  { name: 'רוסיה', aliases: ['russia'], risk: 'none' },

  // ── BSE (מחלת פרות משוגעות) ──────────────────────────────────────────────
  // נשהות ממושכות בבריטניה / אירופה לפני 1996 — נטפל בנפרד בשאלה ייעודית

  // ── מלריה — פסילה זמנית 3 חודשים ────────────────────────────────────────
  {
    name: 'ניגריה',
    aliases: ['nigeria'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'גאנה',
    aliases: ['ghana'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'קניה',
    aliases: ['kenya'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'אתיופיה',
    aliases: ['ethiopia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'טנזניה',
    aliases: ['tanzania', 'זנזיבר', 'zanzibar'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'אוגנדה',
    aliases: ['uganda'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'קמרון',
    aliases: ['cameroon'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'קונגו',
    aliases: ['congo', 'drc', 'zaire'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'סנגל',
    aliases: ['senegal'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'מוזמביק',
    aliases: ['mozambique'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'מדגסקר',
    aliases: ['madagascar'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'זמביה',
    aliases: ['zambia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'זימבבואה',
    aliases: ['zimbabwe'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'מלאווי',
    aliases: ['malawi'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'רואנדה',
    aliases: ['rwanda'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'ברזיל',
    aliases: ['brazil'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים מסוימים — אמזוניה',
  },
  {
    name: 'קולומביה',
    aliases: ['colombia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים כפריים מסוימים',
  },
  {
    name: 'פרו',
    aliases: ['peru'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים כפריים מסוימים',
  },
  {
    name: 'בוליביה',
    aliases: ['bolivia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'גואטמלה',
    aliases: ['guatemala'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'הונדורס',
    aliases: ['honduras'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'האיטי',
    aliases: ['haiti'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'פנמה',
    aliases: ['panama'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים מסוימים',
  },
  {
    name: 'הודו',
    aliases: ['india', 'delhi', 'new delhi', 'דלהי', 'ניו דלהי', 'ניי דלהי'],
    risk: 'malaria',
    waitTime: '12 חודשים מחזרה',
    reason: 'הנחיות ביקור — דחייה 12 חודשים (מד״א)',
  },
  {
    name: 'פקיסטן',
    aliases: ['pakistan'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'בנגלדש',
    aliases: ['bangladesh'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים מסוימים',
  },
  {
    name: 'מיאנמר',
    aliases: ['myanmar', 'burma'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'קמבודיה',
    aliases: ['cambodia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזורים מסוימים',
  },
  {
    name: 'לאוס',
    aliases: ['laos'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'פפואה גינאה החדשה',
    aliases: ['papua new guinea'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה גבוה',
  },
  {
    name: 'סולומון',
    aliases: ['solomon islands'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'יאוונדה',
    aliases: ['sudan', 'south sudan'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'ליבריה',
    aliases: ['liberia'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },
  {
    name: 'סיירה לאון',
    aliases: ['sierra leone'],
    risk: 'malaria',
    waitTime: '3 חודשים מחזרה',
    reason: 'אזור מלריה',
  },

  // ── סיכון גבוה (מחלות נוספות, מגבלות מד״א) ─────────────────────────────
  {
    name: 'צ׳אד',
    aliases: ['chad'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'ניגר',
    aliases: ['niger'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'מאלי',
    aliases: ['mali'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'בורקינה פאסו',
    aliases: ['burkina faso'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'ג׳יבוטי',
    aliases: ['djibouti'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'אריתריאה',
    aliases: ['eritrea'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
  {
    name: 'סומליה',
    aliases: ['somalia'],
    risk: 'high_risk',
    waitTime: '6 חודשים מחזרה',
    reason: 'אזור בסיכון גבוה',
  },
];

// ─── Helper: autocomplete search ─────────────────────────────────────────────

export function searchCountry(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return countriesDatabase
    .filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const aliasMatch = c.aliases?.some((a) => a.toLowerCase().includes(q));
      return nameMatch || aliasMatch;
    })
    .slice(0, 6);
}

export function getCountryByName(name: string): Country | undefined {
  const q = name.trim().toLowerCase();
  return countriesDatabase.find((c) => {
    return c.name.toLowerCase() === q || c.aliases?.some((a) => a.toLowerCase() === q);
  });
}

/** יישור מול תשובת LLM (עברית/אנגלית) למבנה Country במאגר */
export function findCountryFromLlmHints(
  countryHe: string | null | undefined,
  countryEn: string | null | undefined,
): Country | undefined {
  const tryHe = countryHe?.normalize('NFC').trim();
  if (tryHe) {
    const byName = countriesDatabase.find((c) => c.name === tryHe);
    if (byName) return byName;
    const hits = searchCountry(tryHe);
    const exact = hits.find((c) => c.name === tryHe) ?? hits[0];
    if (exact) return exact;
  }
  const en = countryEn?.trim().toLowerCase();
  if (en) {
    return countriesDatabase.find(
      (c) =>
        c.aliases?.some((a) => a.toLowerCase() === en) ||
        c.name.toLowerCase() === en,
    );
  }
  return undefined;
}
