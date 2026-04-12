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

export const medicationsDatabase: Medication[] = [
  // ── אנלגטיקה ──────────────────────────────────────────────────────────────
  {
    name: 'אספירין',
    aliases: ['aspirin', 'אצטילסליצילית'],
    indications: [
      { reason: 'שיכוך כאבים / חום', action: 'זכאות מלאה', waitTime: '48 שעות מהמנה האחרונה' },
      {
        reason: 'מניעת קרישים / מחלת לב / מניעה שניונית',
        action: 'פסילה קבועה',
        details: 'שימוש קבוע לבעיות קרדיווסקולריות מעיד על מצב רפואי מנגד',
      },
    ],
  },
  {
    name: 'אקמול',
    aliases: ['פרצטמול', 'paracetamol', 'acamol', 'טיילנול', 'deximol'],
    indications: [
      { reason: 'כאב / חום / שימוש כללי', action: 'זכאות מלאה', waitTime: '24 שעות מהמנה האחרונה' },
    ],
  },
  {
    name: 'איבופרופן',
    aliases: ['ibuprofen', 'advil', 'nurofen', 'נורופן', 'אדוויל', 'brufen', 'brufin'],
    indications: [
      { reason: 'שיכוך כאבים / דלקת / חום', action: 'זכאות מלאה', waitTime: '48 שעות מהמנה האחרונה' },
      {
        reason: 'מחלה דלקתית כרונית (RA, Crohn וכד׳)',
        action: 'בירור רפואי',
        details: 'יש לבדוק את הבסיס הרפואי',
      },
    ],
  },
  {
    name: 'נפרוקסן',
    aliases: ['naproxen', 'narocin', 'נרוצין', 'synflex'],
    indications: [
      { reason: 'שיכוך כאבים', action: 'זכאות מלאה', waitTime: '48 שעות' },
      { reason: 'דלקת מפרקים כרונית', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'דיקלופנק',
    aliases: ['diclofenac', 'voltaren', 'וולטרן', 'cambia'],
    indications: [
      { reason: 'שיכוך כאבים / דלקת', action: 'זכאות מלאה', waitTime: '48 שעות' },
      { reason: 'דלקת מפרקים כרונית', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'טרמדול',
    aliases: ['tramadol', 'tramal', 'טרמל', 'tramex'],
    indications: [
      { reason: 'שיכוך כאבים חריף', action: 'פסילה זמנית', waitTime: '48 שעות ממנה אחרונה' },
      { reason: 'כאב כרוני', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'קודאין',
    aliases: ['codeine'],
    indications: [
      { reason: 'שיכוך כאבים / שיעול', action: 'פסילה זמנית', waitTime: '48 שעות ממנה אחרונה' },
      { reason: 'שימוש ממושך', action: 'בירור רפואי' },
    ],
  },

  // ── אנטיביוטיקה ───────────────────────────────────────────────────────────
  {
    name: 'אמוקסיצילין',
    aliases: ['amoxicillin', 'augmentin', 'אוגמנטין', 'moxyvit'],
    indications: [
      {
        reason: 'זיהום חיידקי פשוט (אוזן, שקדים, שתן)',
        action: 'פסילה זמנית',
        waitTime: '7 ימים לאחר סיום הקורס',
      },
    ],
  },
  {
    name: 'אזיתרומיצין',
    aliases: ['azithromycin', 'zithromax', 'zitro', 'זיטרו'],
    indications: [
      {
        reason: 'זיהום חיידקי',
        action: 'פסילה זמנית',
        waitTime: '7 ימים לאחר סיום הקורס',
      },
    ],
  },
  {
    name: 'ציפרופלוקסצין',
    aliases: ['ciprofloxacin', 'cipro', 'ציפרו', 'keflor'],
    indications: [
      {
        reason: 'זיהום חיידקי',
        action: 'פסילה זמנית',
        waitTime: '7 ימים לאחר סיום הקורס',
      },
    ],
  },
  {
    name: 'דוקסיציקלין',
    aliases: ['doxycycline', 'vibramycin', 'וויברמיצין'],
    indications: [
      { reason: 'זיהום חיידקי / אקנה', action: 'פסילה זמנית', waitTime: '7 ימים לאחר סיום' },
      {
        reason: 'מניעת מלריה',
        action: 'פסילה זמנית',
        waitTime: '4 שבועות לאחר חזרה מאזור מלריה וסיום הטיפול',
      },
    ],
  },

  // ── לחץ דם / לב ──────────────────────────────────────────────────────────
  {
    name: 'ליסינופריל',
    aliases: ['lisinopril', 'zestril', 'lisinol'],
    indications: [
      {
        reason: 'לחץ דם גבוה',
        action: 'בירור רפואי',
        details: 'תלוי ברמת שליטה בלחץ הדם ובמצב הכללי',
      },
      { reason: 'אי ספיקת לב', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'אמלודיפין',
    aliases: ['amlodipine', 'norvasc', 'נורבסק', 'amlodipin'],
    indications: [
      { reason: 'לחץ דם גבוה', action: 'בירור רפואי' },
      { reason: 'אנגינה פקטוריס', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'מטופרולול',
    aliases: ['metoprolol', 'betaloc', 'בטאלוק', 'lopressor'],
    indications: [
      { reason: 'לחץ דם גבוה', action: 'בירור רפואי' },
      { reason: 'מחלת לב / אי ספיקת לב / אנגינה', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'קומדין',
    aliases: ['warfarin', 'coumadin', 'וורפרין'],
    indications: [
      {
        reason: 'כל סיבה (נוגד קרישה)',
        action: 'פסילה קבועה',
        details: 'כל שימוש בנוגדי קרישה מהווה פסילה קבועה',
      },
    ],
  },
  {
    name: 'קלקסן',
    aliases: ['clexane', 'enoxaparin', 'אנוקסאפרין', 'heparin', 'הפרין'],
    indications: [
      {
        reason: 'כל סיבה (נוגד קרישה)',
        action: 'פסילה קבועה',
        details: 'כל שימוש בנוגדי קרישה מהווה פסילה קבועה',
      },
    ],
  },
  {
    name: 'אלטיזם',
    aliases: ['eliquis', 'אפיקסבן', 'apixaban', 'xarelto', 'rivaroxaban', 'pradaxa', 'dabigatran'],
    indications: [
      {
        reason: 'כל סיבה (נוגד קרישה חדש)',
        action: 'פסילה קבועה',
        details: 'נוגדי קרישה מהדור החדש — פסילה קבועה',
      },
    ],
  },

  // ── כולסטרול ──────────────────────────────────────────────────────────────
  {
    name: 'אטורבסטטין',
    aliases: ['atorvastatin', 'lipitor', 'ליפיטור', 'crestor', 'rosuvastatin', 'רוסובסטטין'],
    indications: [
      {
        reason: 'כולסטרול גבוה',
        action: 'בירור רפואי',
        details: 'בדרך כלל מאושר אם הכולסטרול מפוקח ואין מחלת לב',
      },
    ],
  },

  // ── סוכרת ────────────────────────────────────────────────────────────────
  {
    name: 'מטפורמין',
    aliases: ['metformin', 'glucophage', 'גלוקופאג׳', 'diformin'],
    indications: [
      {
        reason: 'סוכרת סוג 2 / תנגודת אינסולין',
        action: 'בירור רפואי',
        details: 'תלוי ברמות הסוכר ובמצב הכללי',
      },
    ],
  },
  {
    name: 'אינסולין',
    aliases: ['insulin', 'humalog', 'novorapid', 'lantus', 'לנטוס'],
    indications: [
      {
        reason: 'סוכרת סוג 1 או 2 המוטרת באינסולין',
        action: 'פסילה קבועה',
        details: 'שימוש קבוע באינסולין — פסילה קבועה',
      },
    ],
  },

  // ── בלוטת תריס ────────────────────────────────────────────────────────────
  {
    name: 'לבותירוקסין',
    aliases: ['levothyroxine', 'eltroxin', 'אלטרוקסין', 'synthroid', 'L-T4'],
    indications: [
      {
        reason: 'תת-פעילות בלוטת תריס — מפוקח',
        action: 'זכאות מלאה',
        details: 'אם TSH תקין ומצב מפוקח היטב',
      },
      { reason: 'יתר-פעילות / מחלה אוטואימונית לא מפוקחת', action: 'בירור רפואי' },
    ],
  },

  // ── פסיכיאטרי / מערכת עצבים ──────────────────────────────────────────────
  {
    name: 'ריטלין',
    aliases: ['ritalin', 'methylphenidate', 'מתילפנידאט', 'concerta', 'קונצרטה'],
    indications: [
      {
        reason: 'ADHD',
        action: 'זכאות מלאה',
        details: 'בדרך כלל מאושר לתרומה אם המצב יציב',
      },
    ],
  },
  {
    name: 'פלואוקסטין',
    aliases: ['fluoxetine', 'prozac', 'פרוזק', 'prozan'],
    indications: [
      {
        reason: 'דיכאון / OCD / חרדה',
        action: 'בירור רפואי',
        details: 'תלוי בחומרת המצב ויציבות',
      },
    ],
  },
  {
    name: 'סרטרלין',
    aliases: ['sertraline', 'zoloft', 'זולופט', 'lustral'],
    indications: [
      { reason: 'דיכאון / חרדה', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'ונלפקסין',
    aliases: ['venlafaxine', 'effexor', 'אפקסור'],
    indications: [
      { reason: 'דיכאון / חרדה', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'ליתיום',
    aliases: ['lithium', 'lithobid'],
    indications: [
      { reason: 'הפרעה דו-קוטבית', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'קרבמזפין',
    aliases: ['carbamazepine', 'tegretol', 'טגרטול'],
    indications: [
      { reason: 'אפילפסיה / כאב עצב', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'ולפרואט',
    aliases: ['valproate', 'valproic acid', 'depakote', 'דפקוט', 'epilim', 'אפילים'],
    indications: [
      { reason: 'אפילפסיה / מאניה', action: 'פסילה קבועה' },
    ],
  },
  {
    name: 'בנזודיאזפין',
    aliases: ['benzodiazepine', 'alprazolam', 'xanax', 'קסנקס', 'diazepam', 'valium', 'ולאום', 'clonazepam', 'rivotril', 'ריבוטריל', 'lorazepam'],
    indications: [
      { reason: 'חרדה חריפה / שימוש מזדמן', action: 'פסילה זמנית', waitTime: '24 שעות ממנה אחרונה' },
      { reason: 'שימוש קבוע / כרוני', action: 'בירור רפואי' },
    ],
  },

  // ── עור / אקנה ──────────────────────────────────────────────────────────
  {
    name: 'רואקוטן',
    aliases: ['roaccutane', 'isotretinoin', 'אקוטן', 'acnotin'],
    indications: [
      {
        reason: 'אקנה',
        action: 'פסילה זמנית',
        waitTime: '4 שבועות לאחר סיום הטיפול',
      },
    ],
  },

  // ── עיכול ────────────────────────────────────────────────────────────────
  {
    name: 'אומפרזול',
    aliases: ['omeprazole', 'losec', 'לוסק', 'prilosec', 'esomeprazole', 'nexium', 'נקסיום', 'pantoprazole', 'controloc'],
    indications: [
      { reason: 'צרבת / כיב קיבה / ריפלוקס', action: 'זכאות מלאה' },
    ],
  },

  // ── הורמונים / גלולות ────────────────────────────────────────────────────
  {
    name: 'גלולות למניעת היריון',
    aliases: ['birth control', 'oral contraceptive', 'OCP', 'yasmin', 'ישמין', 'diane', 'diane35', 'microgynon', 'loette'],
    indications: [
      { reason: 'מניעת היריון', action: 'זכאות מלאה' },
    ],
  },
  {
    name: 'פרוגסטרון',
    aliases: ['progesterone', 'duphaston', 'דופסטון', 'utrogestan', 'prometrium'],
    indications: [
      { reason: 'אי-סדירות מחזור / תמיכה בהריון', action: 'זכאות מלאה' },
      { reason: 'ממצא קלינולוגי', action: 'בירור רפואי' },
    ],
  },

  // ── אנטי-היסטמינים ───────────────────────────────────────────────────────
  {
    name: 'לוריטדין',
    aliases: ['loratadine', 'claritin', 'clarityne', 'קלריטין', 'aerius', 'desloratadine'],
    indications: [
      { reason: 'אלרגיה עונתית / נזלת', action: 'זכאות מלאה' },
    ],
  },
  {
    name: 'צטיריזין',
    aliases: ['cetirizine', 'zyrtec', 'zyrtac', 'זירטק', 'reactine'],
    indications: [
      { reason: 'אלרגיה / גרד', action: 'זכאות מלאה' },
    ],
  },

  // ── נשימה ─────────────────────────────────────────────────────────────────
  {
    name: 'ונטולין',
    aliases: ['ventolin', 'salbutamol', 'אלבוטרול', 'albuterol', 'proventil'],
    indications: [
      {
        reason: 'אסתמה קלה / מצבית (לפי הצורך)',
        action: 'זכאות מלאה',
        details: 'אם האסתמה מפוקחת ואין התקפים לאחרונה',
      },
      { reason: 'אסתמה חמורה / לא מפוקחת', action: 'בירור רפואי' },
    ],
  },
  {
    name: 'פלוטיקזון',
    aliases: ['fluticasone', 'flixotide', 'פליקסוטייד', 'advair', 'symbicort', 'סימביקורט'],
    indications: [
      { reason: 'אסתמה מפוקחת', action: 'זכאות מלאה' },
      { reason: 'אסתמה לא מפוקחת', action: 'בירור רפואי' },
    ],
  },

  // ── אנטי-ויראליים ────────────────────────────────────────────────────────
  {
    name: 'טמיפלו',
    aliases: ['tamiflu', 'oseltamivir', 'אוסלטמיביר'],
    indications: [
      {
        reason: 'שפעת',
        action: 'פסילה זמנית',
        waitTime: '7 ימים לאחר סיום הטיפול ו-24 שעות חסרי סימפטומים',
      },
    ],
  },
  {
    name: 'אציקלוביר',
    aliases: ['acyclovir', 'zovirax', 'זובירקס', 'valacyclovir', 'valtrex', 'ולטרקס'],
    indications: [
      {
        reason: 'הרפס / אבעבועות רוח',
        action: 'פסילה זמנית',
        waitTime: '7 ימים לאחר סיום הטיפול ועד שהנגע נרפא',
      },
    ],
  },

  // ── ניהול כאב עצב ────────────────────────────────────────────────────────
  {
    name: 'גבפנטין',
    aliases: ['gabapentin', 'neurontin', 'נירונטין', 'pregabalin', 'lyrica', 'ליריקה'],
    indications: [
      { reason: 'כאב עצבי', action: 'בירור רפואי' },
      { reason: 'אפילפסיה', action: 'פסילה קבועה' },
    ],
  },
];

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
