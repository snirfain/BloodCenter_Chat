import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, FlowStep, SessionAnswers, FinalStatus, Issue, IssueType } from '../types/chat';
import { searchMedication, type Medication } from '../data/medications';
import type { Country } from '../data/countries';
import {
  searchCountry,
  isIndiaCountry,
  INDIA_TRAVEL_REFERENCE,
  findCountryFromLlmHints,
} from '../data/countries';
import { createUser, createSession, updateSession, saveSessionFeedback } from '../services/db';
import { geocodeLookupCountry, resolveCountryFromGeocode } from '../services/geocoding';
import { resolveEntityWithLlm } from '../services/llmEntityResolve';

// ─── Timing ───────────────────────────────────────────────────────────────────
const BOT_DELAY_SHORT = 600;
const BOT_DELAY_LONG = 1000;

// ─── Severity ordering ────────────────────────────────────────────────────────
const SEVERITY: Record<IssueType, number> = {
  'פסילה קבועה': 4,
  'בירור רפואי': 3,
  'פסילה זמנית': 2,
  'זכאות עם אישור': 1,
};

function overallStatus(issues: Issue[]): FinalStatus {
  if (issues.length === 0) return 'זכאות מלאה';
  const worst = issues.reduce((a, b) => (SEVERITY[a.type] >= SEVERITY[b.type] ? a : b));
  return worst.type;
}

function infectionIssueFromText(text: string): Issue {
  const t = text.toLowerCase();
  if (t.includes('שלשול')) {
    return {
      type: 'פסילה זמנית',
      reason: 'שלשולים',
      waitTime: 'מותר להתרים שבוע לאחר החלמה',
    };
  }
  return { type: 'בירור רפואי', reason: `מחלה זיהומית: ${text}` };
}

// ─── Input parsers ────────────────────────────────────────────────────────────
// Split on: +  ,  ;  /  newline  and Hebrew connective ו/ו-
function parseMultiInput(input: string): string[] {
  return input
    .split(/[+,;/\n]|\s+ו-?\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

// ─── Final Summary Builder ────────────────────────────────────────────────────
function buildFinalSummary(issues: Issue[]): string {
  const status = overallStatus(issues);

  if (issues.length === 0) {
    return (
      '✅ על בסיס כל המידע שמסרת — אתה זכאי לתרום דם!\n\n' +
      'התאמה סופית נקבעת באתר ההתרמה. הנך מוזמן להגיע לנקודת התרומה הקרובה.\n\n' +
      '🔗 מיקומים ושעות: mdais.org/blood-donation'
    );
  }

  const permanent = issues.filter((i) => i.type === 'פסילה קבועה');
  const temporary = issues.filter((i) => i.type === 'פסילה זמנית');
  const review    = issues.filter((i) => i.type === 'בירור רפואי');
  const approval  = issues.filter((i) => i.type === 'זכאות עם אישור');

  const lines: string[] = [];
  lines.push('📋 סיכום בדיקת הזכאות שלך:');
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (permanent.length > 0) {
    lines.push('');
    lines.push('❌ פסילה קבועה:');
    permanent.forEach((i) => lines.push(`   • ${i.reason}`));
  }
  if (temporary.length > 0) {
    lines.push('');
    lines.push('⏳ פסילה זמנית:');
    temporary.forEach((i) => {
      if (i.summaryLine) {
        lines.push(`   • ${i.summaryLine}`);
      } else {
        const wait = i.waitTime ? ` (המתנה: ${i.waitTime})` : '';
        lines.push(`   • ${i.reason}${wait}`);
      }
    });
  }
  if (review.length > 0) {
    lines.push('');
    lines.push('🔍 נדרש בירור רפואי:');
    review.forEach((i) => lines.push(`   • ${i.reason}`));
  }
  if (approval.length > 0) {
    lines.push('');
    lines.push('⚠️ זכאות בכפוף לאישור:');
    approval.forEach((i) => lines.push(`   • ${i.reason}`));
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  switch (status) {
    case 'פסילה קבועה':
      lines.push('לצערנו, על פי הנתונים שמסרת אינך יכול לתרום דם.\nתודה רבה על נכונותך לסייע — בריאותך חשובה לנו.');
      break;
    case 'בירור רפואי':
      lines.push('ייתכן שתוכל לתרום לאחר בירור רפואי ממוקד.\n📞 צור קשר: 03-5300400\n📧 b101b@mda.org.il');
      break;
    case 'פסילה זמנית':
      lines.push('כרגע אינך יכול לתרום, אך תוכל לעשות זאת לאחר שתקופות ההמתנה יחלפו.\nאנא בדוק שוב את הזכאות בסיום תקופת ההמתנה.');
      break;
    case 'זכאות עם אישור':
      lines.push('✅ אתה זכאי לתרום בכפוף לאישור הנדרש.\n🔗 מיקומים: mdais.org/blood-donation');
      break;
    default:
      break;
  }

  return lines.join('\n');
}

// ─── Phone Validator ──────────────────────────────────────────────────────────
export function validateIsraeliPhone(phone: string): string | null {
  const cleaned = phone.replace(/[-\s]/g, '');
  if (!/^05\d{8}$/.test(cleaned)) {
    return 'אנא הזן מספר טלפון ישראלי תקין (05X-XXXXXXX)';
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatFlow() {
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep]     = useState<FlowStep>('phone');
  const [isTyping, setIsTyping]           = useState(false);
  const [answers, setAnswers]             = useState<SessionAnswers>({});
  const [finalStatus, setFinalStatus]     = useState<FinalStatus | null>(null);
  const [isCompleted, setIsCompleted]     = useState(false);
  const [pendingMedication, setPendingMedication] = useState<Medication | null>(null);

  // ── Accumulated issues ───────────────────────────────────────────────────────
  const issuesRef = useRef<Issue[]>([]);

  // ── Medication queue ──────────────────────────────────────────────────────────
  const medicationQueueRef    = useRef<string[]>([]);
  const currentUnknownMedRef  = useRef<string>('');

  // ── Country queue ─────────────────────────────────────────────────────────────
  const countryQueueRef           = useRef<string[]>([]);
  const currentUnknownCountryRef  = useRef<string>('');
  const pendingGeocodeRef         = useRef<{
    originalInput: string;
    result:
      | { kind: 'country'; country: Country }
      | { kind: 'unmapped'; label: string; displayHe: string };
  } | null>(null);

  const pendingMedicationLlmRef   = useRef<{ med: Medication } | null>(null);
  const pendingDiseaseLlmRef       = useRef<{ raw: string; label: string } | null>(null);

  // ── Supabase IDs ──────────────────────────────────────────────────────────────
  const userIdRef    = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ── Answers snapshot ref (avoids stale closure in queue processors) ──────────
  const answersRef = useRef<SessionAnswers>({});

  // ── Issue helper ──────────────────────────────────────────────────────────────
  const addIssue = useCallback((issue: Issue) => {
    issuesRef.current = [...issuesRef.current, issue];
  }, []);

  const applyCountryRules = useCallback(
    (country: Country) => {
      // חובה לפני malaria: הודו איננה 3 חודשים ככלל מלריה — ראו country_travel_reference.json (065).
      if (isIndiaCountry(country)) {
        addIssue({
          type: 'פסילה זמנית',
          reason: INDIA_TRAVEL_REFERENCE.reason,
          summaryLine: INDIA_TRAVEL_REFERENCE.summaryLine,
        });
        return;
      }
      if (country.risk === 'malaria') {
        addIssue({
          type: 'פסילה זמנית',
          reason: `ביקור באזור מלריה: ${country.name}`,
          waitTime: '3 חודשים מחזרה',
        });
      } else if (country.risk === 'high_risk') {
        addIssue({
          type: 'פסילה זמנית',
          reason: `ביקור באזור בסיכון גבוה: ${country.name}`,
          waitTime: '6 חודשים מחזרה',
        });
      } else if (country.risk === 'bse') {
        addIssue({ type: 'בירור רפואי', reason: `ביקור — ${country.name} (BSE/נוהל מיוחד)` });
      }
    },
    [addIssue],
  );

  // ── Message helpers ───────────────────────────────────────────────────────────
  const addMessage = useCallback((sender: 'bot' | 'user', text: string): ChatMessage => {
    const msg: ChatMessage = { id: uuidv4(), sender, text, timestamp: new Date() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const addBotMessage = useCallback(
    (text: string, delay = BOT_DELAY_SHORT) =>
      new Promise<void>((resolve) => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addMessage('bot', text);
          resolve();
        }, delay);
      }),
    [addMessage],
  );

  const updateAnswers = useCallback((updates: Partial<SessionAnswers>) => {
    const next = { ...answersRef.current, ...updates };
    answersRef.current = next;
    setAnswers(next);
    if (sessionIdRef.current) {
      updateSession(sessionIdRef.current, { answers_log: next as Record<string, unknown> });
    }
    return next;
  }, []);

  // ── Finish flow ───────────────────────────────────────────────────────────────
  const finishFlow = useCallback(
    async (currentAnswers: SessionAnswers) => {
      const issues  = issuesRef.current;
      const status  = overallStatus(issues);
      const summary = buildFinalSummary(issues);

      setFinalStatus(status);
      if (sessionIdRef.current) {
        await updateSession(sessionIdRef.current, {
          final_status: status,
          answers_log: currentAnswers as Record<string, unknown>,
        });
      }

      await addBotMessage(summary, BOT_DELAY_LONG);
      setIsCompleted(true);

      setTimeout(() => {
        setCurrentStep('rating');
      }, 3000);
    },
    [addBotMessage],
  );

  // ── Step transition ───────────────────────────────────────────────────────────
  const goToStep = useCallback(
    async (step: FlowStep, currentAnswers: SessionAnswers) => {
      setCurrentStep(step);
      switch (step) {
        case 'last_donation':
          await addBotMessage('📅 מתי תרמת דם בפעם האחרונה?', BOT_DELAY_LONG); break;
        case 'age':
          await addBotMessage('👤 מה גילך?', BOT_DELAY_SHORT); break;
        case 'weight':
          await addBotMessage('⚖️ האם את/ה שוקל/ת מעל 50 ק״ג?', BOT_DELAY_SHORT); break;
        case 'pregnancy':
          await addBotMessage('🤰 האם עברת הריון או לידה ב-6 חודשים האחרונים?', BOT_DELAY_SHORT); break;
        case 'procedure':
          await addBotMessage(
            '🩺 האם ביצעת אחד מאלו ב-4 החודשים האחרונים?\n(קעקוע, פירסינג, קולונוסקופיה, גסטרוסקופיה)',
            BOT_DELAY_LONG,
          ); break;
        case 'colonoscopy_biopsy':
          await addBotMessage('🔬 האם נלקחה ביופסיה במהלך הבדיקה?', BOT_DELAY_SHORT); break;
        case 'colonoscopy_biopsy_result':
          await addBotMessage('📋 האם תוצאת הבדיקה והביופסיה תקינות?', BOT_DELAY_SHORT); break;
        case 'colonoscopy_result':
          await addBotMessage('📋 האם תוצאת הבדיקה תקינה?', BOT_DELAY_SHORT); break;
        case 'medications':
          await addBotMessage('💊 האם נטלת תרופות בחודש האחרון (כולל תרופות קבועות)?', BOT_DELAY_LONG); break;
        case 'medication_name':
          await addBotMessage(
            '🔍 אנא הקלד את שמות התרופות שאתה נוטל.\nניתן לרשום מספר תרופות מופרדות ב-+ או בפסיק:',
            BOT_DELAY_SHORT,
          ); break;
        case 'disease':
          await addBotMessage('🏥 האם אובחנת עם מחלה כלשהי או מצב רפואי כרוני?', BOT_DELAY_LONG); break;
        case 'disease_details':
          await addBotMessage('📝 אנא פרט בקצרה את המחלה או המצב הרפואי:', BOT_DELAY_SHORT); break;
        case 'illness':
          await addBotMessage(
            '🤒 האם חלית לאחרונה במחלה זיהומית או עברת טיפול שיניים בחודש האחרון?',
            BOT_DELAY_LONG,
          ); break;
        case 'infection_details':
          await addBotMessage('📝 אנא פרט את המחלה הזיהומית (שם, תסמינים עיקריים):', BOT_DELAY_SHORT); break;
        case 'dental_type':
          await addBotMessage('🦷 איזה סוג טיפול שיניים עברת?', BOT_DELAY_SHORT); break;
        case 'travel':
          await addBotMessage('✈️ האם ביקרת בחו״ל בשנה האחרונה?', BOT_DELAY_LONG); break;
        case 'travel_timeframe':
          await addBotMessage('📅 מתי חזרת מהנסיעה?', BOT_DELAY_SHORT); break;
        case 'travel_country':
          await addBotMessage(
            '🌍 באיזו מדינה / אזור ביקרת?\nניתן לרשום מספר מדינות מופרדות ב-+ או בפסיק:',
            BOT_DELAY_SHORT,
          ); break;
        case 'additional_info':
          await addBotMessage(
            '💬 האם יש מידע נוסף שברצונך לבדוק לפני התרומה?\n(לדוגמה: מחלה עבר, ניתוח, טיפול רפואי נוסף)',
            BOT_DELAY_LONG,
          ); break;
        case 'final':
          await finishFlow(currentAnswers); break;
        default: break;
      }
    },
    [addBotMessage, finishFlow],
  );

  // ── Medication queue processor ────────────────────────────────────────────────
  const processNextMedication = useCallback(
    async (currentAnswers: SessionAnswers) => {
      if (medicationQueueRef.current.length === 0) {
        await goToStep('disease', currentAnswers);
        return;
      }

      const name = medicationQueueRef.current.shift()!;
      const matches = searchMedication(name);

      if (matches.length === 0) {
        currentUnknownMedRef.current = name;
        setCurrentStep('medication_unknown_retry');
        await addBotMessage(
          `לא מצאתי את "${name}" במאגר התרופות.\nהאם יש לתרופה שם אחר (מסחרי / גנרי)?`,
          BOT_DELAY_SHORT,
        );
        return;
      }

      const med = matches[0];
      const updatedAnswers = updateAnswers({ medicationName: med.name });

      if (med.indications.length === 1) {
        const ind = med.indications[0];
        updateAnswers({ medicationIndication: ind.reason, medicationAction: ind.action });

        if (ind.action === 'פסילה קבועה') {
          addIssue({ type: 'פסילה קבועה', reason: `תרופה: ${med.name} — ${ind.reason}` });
        } else if (ind.action === 'פסילה זמנית') {
          addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${med.name}`, waitTime: ind.waitTime });
        } else if (ind.action === 'בירור רפואי') {
          addIssue({ type: 'בירור רפואי', reason: `תרופה: ${med.name} — ${ind.reason}` });
        } else if (ind.action === 'זכאות מלאה' && ind.waitTime?.trim()) {
          addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${med.name} — ${ind.reason}`, waitTime: ind.waitTime });
        }

        await processNextMedication(updatedAnswers);
      } else {
        setPendingMedication(med);
        setCurrentStep('medication_indication');
        await addBotMessage(
          `ל-${med.name} יש מספר שימושים. לאיזו מטרה אתה נוטל תרופה זו?`,
          BOT_DELAY_SHORT,
        );
      }
    },
    [addBotMessage, addIssue, updateAnswers, goToStep],
  );

  const applyMedicationMatchFromSearch = useCallback(
    async (med: Medication) => {
      const updatedAnswers = updateAnswers({ medicationName: med.name });

      if (med.indications.length === 1) {
        const ind = med.indications[0];
        updateAnswers({ medicationIndication: ind.reason, medicationAction: ind.action });
        if (ind.action === 'פסילה קבועה') {
          addIssue({ type: 'פסילה קבועה', reason: `תרופה: ${med.name} — ${ind.reason}` });
        } else if (ind.action === 'פסילה זמנית') {
          addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${med.name}`, waitTime: ind.waitTime });
        } else if (ind.action === 'בירור רפואי') {
          addIssue({ type: 'בירור רפואי', reason: `תרופה: ${med.name} — ${ind.reason}` });
        } else if (ind.action === 'זכאות מלאה' && ind.waitTime?.trim()) {
          addIssue({
            type: 'פסילה זמנית',
            reason: `תרופה: ${med.name} — ${ind.reason}`,
            waitTime: ind.waitTime,
          });
        }
        await processNextMedication(updatedAnswers);
      } else {
        setPendingMedication(med);
        setCurrentStep('medication_indication');
        await addBotMessage(
          `ל-${med.name} יש מספר שימושים. לאיזו מטרה אתה נוטל תרופה זו?`,
          BOT_DELAY_SHORT,
        );
      }
    },
    [updateAnswers, addIssue, processNextMedication, addBotMessage],
  );

  const tryOfferTravelClarification = useCallback(
    async (originalInput: string): Promise<boolean> => {
      setIsTyping(true);
      try {
        const osm = await geocodeLookupCountry(originalInput);
        const geoRes = resolveCountryFromGeocode(osm);
        if (geoRes) {
          if ('country' in geoRes) {
            pendingGeocodeRef.current = {
              originalInput,
              result: { kind: 'country', country: geoRes.country },
            };
            const display = geoRes.displayNameHe;
            await addBotMessage(
              `זיהינו שהמיקום שציינת שייך ל־${display}. האם התכוונת ל${display}?`,
              BOT_DELAY_SHORT,
            );
            setCurrentStep('country_geocode_confirm');
            return true;
          }
          if ('unknownLabel' in geoRes) {
            const display = geoRes.unknownLabel;
            pendingGeocodeRef.current = {
              originalInput,
              result: { kind: 'unmapped', label: geoRes.unknownLabel, displayHe: display },
            };
            await addBotMessage(
              `זיהינו שהמיקום שציינת שייך ל־${display}. האם התכוונת ל${display}?`,
              BOT_DELAY_SHORT,
            );
            setCurrentStep('country_geocode_confirm');
            return true;
          }
        }

        const llm = await resolveEntityWithLlm('travel', originalInput);
        if (llm.ok && (llm.countryHe || llm.countryEn)) {
          const c = findCountryFromLlmHints(llm.countryHe, llm.countryEn);
          if (c) {
            pendingGeocodeRef.current = { originalInput, result: { kind: 'country', country: c } };
            const hint = (llm.userFacingHe || c.name).trim();
            await addBotMessage(
              `לפי ניתוח הטקסט (כולל מודל שפה), נראה שהכוונה ל־${hint}.\nהאם להמשיך לפי מדינת ${c.name}?`,
              BOT_DELAY_SHORT,
            );
            setCurrentStep('country_geocode_confirm');
            return true;
          }
        }
      } catch {
        /* ignore */
      } finally {
        setIsTyping(false);
      }
      return false;
    },
    [addBotMessage],
  );

  // ── Country queue processor ───────────────────────────────────────────────────
  const processNextCountry = useCallback(
    async (currentAnswers: SessionAnswers) => {
      if (countryQueueRef.current.length === 0) {
        await goToStep('additional_info', currentAnswers);
        return;
      }

      const name = countryQueueRef.current.shift()!;
      const results = searchCountry(name);
      const country = results.find(
        (c) =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.aliases?.some((a) => a.toLowerCase() === name.toLowerCase()),
      ) ?? results[0];

      if (!country) {
        const offered = await tryOfferTravelClarification(name);
        if (offered) return;

        currentUnknownCountryRef.current = name;
        setCurrentStep('country_unknown_retry');
        await addBotMessage(
          `לא זיהיתי את "${name}" כמדינה מוכרת במאגר שלנו.\nהאם יש שם אחר למדינה זו (באנגלית / שם אחר)?`,
          BOT_DELAY_SHORT,
        );
        return;
      }

      const updatedAnswers = updateAnswers({
        travelCountry: country.name,
        countryRisk: country.risk,
      });

      applyCountryRules(country);
      await processNextCountry(updatedAnswers);
    },
    [addBotMessage, updateAnswers, goToStep, applyCountryRules, tryOfferTravelClarification],
  );

  // ── Boot ──────────────────────────────────────────────────────────────────────
  const startChat = useCallback(async () => {
    await addBotMessage(
      'שלום! ברוכים הבאים למערכת בדיקת זכאות לתרומת דם של מגן דוד אדום בישראל.\n\n' +
        'אענה על שאלותיך בהתאם לפרוטוקולים הרפואיים של מד״א.\n' +
        'כל המידע הרפואי נשמר אנונימי לחלוטין, נפרד ממספר הטלפון שלך.\n\n' +
        'כדי להתחיל, אנא הזן את מספר הטלפון שלך (פורמט: 05X-XXXXXXX):',
      BOT_DELAY_LONG,
    );
  }, [addBotMessage]);

  // ── Phone ─────────────────────────────────────────────────────────────────────
  const handlePhoneSubmit = useCallback(
    async (phone: string) => {
      addMessage('user', phone);
      const updatedAnswers = updateAnswers({ phoneNumber: phone });
      const uid = await createUser(phone);
      const sid = await createSession(uid);
      userIdRef.current  = uid;
      sessionIdRef.current = sid;
      await addBotMessage('תודה! המידע שלך נשמר באופן אנונימי. נתחיל בשאלות.', BOT_DELAY_SHORT);
      await goToStep('last_donation', updatedAnswers);
    },
    [addMessage, updateAnswers, addBotMessage, goToStep],
  );

  // ── Quick replies ─────────────────────────────────────────────────────────────
  const handleQuickReply = useCallback(
    async (value: string, label: string) => {
      if (isCompleted && currentStep !== 'rating') return;
      addMessage('user', label);
      let updatedAnswers = answersRef.current;

      switch (currentStep) {

        case 'last_donation': {
          if (value === 'pick_date') {
            await addBotMessage('בחר את תאריך התרומה האחרונה שלך:', BOT_DELAY_SHORT);
            setCurrentStep('last_donation_date');
            return;
          }
          updatedAnswers = updateAnswers({ lastDonation: value });
          if (value === 'less_3months') {
            addIssue({ type: 'פסילה זמנית', reason: 'תרומה אחרונה לפני פחות מ-3 חודשים', waitTime: '3 חודשים מהתרומה האחרונה' });
          }
          await goToStep('age', updatedAnswers);
          break;
        }

        case 'age': {
          updatedAnswers = updateAnswers({ age: value });
          if (value === 'under17') {
            addIssue({ type: 'פסילה קבועה', reason: 'גיל מתחת ל-17' });
          } else if (value === 'over65') {
            addIssue({ type: 'פסילה קבועה', reason: 'גיל מעל 65' });
          } else if (value === '17_18') {
            addIssue({ type: 'זכאות עם אישור', reason: 'גיל 17–18 — נדרש אישור הורים' });
          } else if (value === '60_65' && updatedAnswers.lastDonation === 'never') {
            addIssue({
              type: 'זכאות עם אישור',
              reason: 'גיל 60–65, תרומה ראשונה — נדרש אישור רופא, תרומה רק באתר נייח (לא נייד)',
            });
          }
          await goToStep('weight', updatedAnswers);
          break;
        }

        case 'weight': {
          updatedAnswers = updateAnswers({ weight: value });
          if (value === 'below50') {
            addIssue({ type: 'פסילה קבועה', reason: 'משקל מתחת ל-50 ק״ג' });
          }
          await goToStep('pregnancy', updatedAnswers);
          break;
        }

        case 'pregnancy': {
          updatedAnswers = updateAnswers({ pregnancy: value });
          if (value === 'yes') {
            addIssue({ type: 'פסילה זמנית', reason: 'הריון / לידה ב-6 חודשים האחרונים', waitTime: '6 חודשים מהלידה' });
          }
          await goToStep('procedure', updatedAnswers);
          break;
        }

        case 'procedure': {
          updatedAnswers = updateAnswers({ procedureType: value });
          if (value === 'tattoo') {
            addIssue({ type: 'פסילה זמנית', reason: 'קעקוע או פירסינג', waitTime: '4 חודשים' });
            await goToStep('medications', updatedAnswers);
          } else if (value === 'colonoscopy') {
            await goToStep('colonoscopy_biopsy', updatedAnswers);
          } else {
            await goToStep('medications', updatedAnswers);
          }
          break;
        }

        case 'colonoscopy_biopsy': {
          updatedAnswers = updateAnswers({ biopsyTaken: value });
          await goToStep(value === 'yes' ? 'colonoscopy_biopsy_result' : 'colonoscopy_result', updatedAnswers);
          break;
        }

        case 'colonoscopy_biopsy_result': {
          updatedAnswers = updateAnswers({ biopsyResult: value });
          if (value === 'abnormal') {
            addIssue({ type: 'בירור רפואי', reason: 'תוצאת ביופסיה לא תקינה' });
          } else {
            addIssue({
              type: 'פסילה זמנית',
              reason: 'קולונוסקופיה / גסטרוסקופיה עם ביופסיה (בכפוף לקבלת תוצאת ביופסיה תקינה)',
              waitTime: '4 חודשים',
            });
          }
          await goToStep('medications', updatedAnswers);
          break;
        }

        case 'colonoscopy_result': {
          updatedAnswers = updateAnswers({ colonoscopyResult: value });
          if (value === 'abnormal') {
            addIssue({ type: 'בירור רפואי', reason: 'תוצאת קולונוסקופיה / גסטרוסקופיה לא תקינה' });
          }
          await goToStep('medications', updatedAnswers);
          break;
        }

        case 'medications': {
          updatedAnswers = updateAnswers({ tookMedications: value });
          await goToStep(value === 'yes' ? 'medication_name' : 'disease', updatedAnswers);
          break;
        }

        case 'medication_indication': {
          if (!pendingMedication) break;
          const indication = pendingMedication.indications.find((ind) => ind.reason === value);
          if (!indication) break;

          updateAnswers({ medicationIndication: indication.reason, medicationAction: indication.action });

          if (indication.action === 'פסילה קבועה') {
            addIssue({ type: 'פסילה קבועה', reason: `תרופה: ${pendingMedication.name} — ${indication.reason}` });
          } else if (indication.action === 'פסילה זמנית') {
            addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${pendingMedication.name}`, waitTime: indication.waitTime });
          } else if (indication.action === 'בירור רפואי') {
            addIssue({ type: 'בירור רפואי', reason: `תרופה: ${pendingMedication.name} — ${indication.reason}` });
          } else if (indication.action === 'זכאות מלאה' && indication.waitTime?.trim()) {
            addIssue({
              type: 'פסילה זמנית',
              reason: `תרופה: ${pendingMedication.name} — ${indication.reason}`,
              waitTime: indication.waitTime,
            });
          }
          setPendingMedication(null);
          // Advance the medication queue
          await processNextMedication(answersRef.current);
          break;
        }

        case 'disease': {
          updatedAnswers = updateAnswers({ hasDisease: value });
          await goToStep(value === 'yes' ? 'disease_details' : 'illness', updatedAnswers);
          break;
        }

        case 'illness': {
          updatedAnswers = updateAnswers({ recentIllness: value });
          if (value === 'infection') {
            await goToStep('infection_details', updatedAnswers);
          } else if (value === 'dental') {
            await goToStep('dental_type', updatedAnswers);
          } else {
            await goToStep('travel', updatedAnswers);
          }
          break;
        }

        case 'dental_type': {
          updatedAnswers = updateAnswers({ dentalType: value });
          const dentalIssues: Record<string, Issue> = {
            hygienist: { type: 'פסילה זמנית', reason: 'טיפול שיננית / סתימה', waitTime: '24 שעות' },
            extraction: { type: 'פסילה זמנית', reason: 'עקירה כירורגית', waitTime: '7 ימים' },
            implant:    { type: 'פסילה זמנית', reason: 'שתל שיניים / ניתוח', waitTime: 'חודש' },
          };
          if (dentalIssues[value]) {
            addIssue(dentalIssues[value]);
          }
          await goToStep('travel', updatedAnswers);
          break;
        }

        case 'travel': {
          updatedAnswers = updateAnswers({ travelledAbroad: value });
          await goToStep(value === 'yes' ? 'travel_timeframe' : 'additional_info', updatedAnswers);
          break;
        }

        case 'travel_timeframe': {
          updatedAnswers = updateAnswers({ travelTimeframe: value });
          await goToStep('travel_country', updatedAnswers);
          break;
        }

        case 'country_geocode_confirm': {
          const pending = pendingGeocodeRef.current;
          if (!pending) break;
          if (value === 'no') {
            pendingGeocodeRef.current = null;
            currentUnknownCountryRef.current = pending.originalInput;
            setCurrentStep('country_unknown_retry');
            await addBotMessage('נא להקליד שם מדינה (לא שם עיר/יישוב), או ללחוץ ״אין שם אחר״:', BOT_DELAY_SHORT);
            break;
          }
          if (value !== 'yes') break;
          pendingGeocodeRef.current = null;
          if (pending.result.kind === 'country') {
            const c = pending.result.country;
            const nextAnswers = updateAnswers({ travelCountry: c.name, countryRisk: c.risk });
            applyCountryRules(c);
            await processNextCountry(nextAnswers);
          } else {
            const label = pending.result.displayHe;
            const nextAnswers = updateAnswers({ travelCountry: label, countryRisk: 'unmapped' });
            addIssue({ type: 'בירור רפואי', reason: `אימות מדינה לנסיעה: ${label}` });
            await processNextCountry(nextAnswers);
          }
          break;
        }

        case 'medication_llm_confirm': {
          const p = pendingMedicationLlmRef.current;
          if (!p) break;
          if (value === 'no') {
            pendingMedicationLlmRef.current = null;
            setCurrentStep('medication_unknown_retry');
            await addBotMessage(
              'ננסה שוב — נא להקליד שם מדויק של התרופה, או ״אין שם אחר״:',
              BOT_DELAY_SHORT,
            );
            break;
          }
          if (value !== 'yes') break;
          pendingMedicationLlmRef.current = null;
          await applyMedicationMatchFromSearch(p.med);
          break;
        }

        case 'disease_llm_confirm': {
          const pd = pendingDiseaseLlmRef.current;
          if (!pd) break;
          if (value === 'no') {
            pendingDiseaseLlmRef.current = null;
            setCurrentStep('disease_details');
            await addBotMessage('בסדר. נא לנסח שוב בקצרה את המצב הרפואי:', BOT_DELAY_SHORT);
            break;
          }
          if (value !== 'yes') break;
          pendingDiseaseLlmRef.current = null;
          const nextAnswers = updateAnswers({ diseaseDetails: pd.raw });
          addIssue({ type: 'בירור רפואי', reason: `מצב רפואי (לאחר אימות טקסט): ${pd.label}` });
          await goToStep('illness', nextAnswers);
          break;
        }

        default: break;
      }
    },
    [
      currentStep, isCompleted, pendingMedication,
      addMessage, addIssue, updateAnswers, addBotMessage,
      goToStep, processNextMedication, processNextCountry, applyCountryRules,
      applyMedicationMatchFromSearch,
    ],
  );

  // ── Free-text inputs ──────────────────────────────────────────────────────────
  const handleTextSubmit = useCallback(
    async (text: string) => {
      addMessage('user', text);

      switch (currentStep) {

        // ── Multiple medications ────────────────────────────────────────────────
        case 'medication_name': {
          const names = parseMultiInput(text);
          const queue = names.length > 0 ? names : [text.trim()];
          medicationQueueRef.current = queue;
          if (queue.length > 1) {
            await addBotMessage(`אבדוק ${queue.length} תרופות בזו אחר זו.`, BOT_DELAY_SHORT);
          }
          await processNextMedication(answersRef.current);
          break;
        }

        // ── Unknown medication retry ────────────────────────────────────────────
        case 'medication_unknown_retry': {
          const originalName = currentUnknownMedRef.current;

          if (text.trim() === 'אין') {
            addIssue({ type: 'בירור רפואי', reason: `תרופה לא מזוהה: "${originalName}"` });
            await processNextMedication(answersRef.current);
            return;
          }

          let matches = searchMedication(text);
          if (matches.length === 0) {
            setIsTyping(true);
            try {
              const llm = await resolveEntityWithLlm('medication', text.trim());
              if (llm.ok && llm.medicationCandidates?.length) {
                for (const cand of llm.medicationCandidates) {
                  const hit = searchMedication(cand)[0];
                  if (hit) {
                    pendingMedicationLlmRef.current = { med: hit };
                    await addBotMessage(
                      `לא מצאנו התאמה מדויקת במאגר. לפי ניתוח (מודל שפה), ייתכן שהתכוונת ל־«${hit.name}». האם זו התרופה?`,
                      BOT_DELAY_SHORT,
                    );
                    setCurrentStep('medication_llm_confirm');
                    return;
                  }
                }
              }
            } catch {
              /* ignore */
            } finally {
              setIsTyping(false);
            }

            currentUnknownMedRef.current = text.trim();
            await addBotMessage(
              `לא מצאתי גם את "${text}" במאגר.\nנסה שם אחר, או לחץ "אין שם אחר" כדי לדלג.`,
              BOT_DELAY_SHORT,
            );
            return;
          }

          const med = matches[0];
          await applyMedicationMatchFromSearch(med);
          break;
        }

        // ── Disease details ─────────────────────────────────────────────────────
        case 'disease_details': {
          const raw = text.trim();
          const updatedAnswers = updateAnswers({ diseaseDetails: raw });
          if (/אנדומטריוזיס/i.test(raw)) {
            await goToStep('illness', updatedAnswers);
            break;
          }
          setIsTyping(true);
          try {
            const llm = await resolveEntityWithLlm('disease', raw);
            if (llm.ok && llm.diseaseSummaryHe?.trim()) {
              const label = llm.diseaseSummaryHe.trim();
              pendingDiseaseLlmRef.current = { raw, label };
              await addBotMessage(
                `נסחנו את תיאור המצב כ־«${label}».\nהאם זה תואם למה שהתכוונת להצהיר?`,
                BOT_DELAY_SHORT,
              );
              setCurrentStep('disease_llm_confirm');
              return;
            }
          } catch {
            /* ignore */
          } finally {
            setIsTyping(false);
          }
          addIssue({ type: 'בירור רפואי', reason: `מצב רפואי: ${raw}` });
          await goToStep('illness', updatedAnswers);
          break;
        }

        // ── Infection details ───────────────────────────────────────────────────
        case 'infection_details': {
          const updatedAnswers = updateAnswers({ infectionDetails: text });
          addIssue(infectionIssueFromText(text));
          await goToStep('travel', updatedAnswers);
          break;
        }

        // ── Country input (multi-country) ────────────────────────────────────────
        case 'travel_country': {
          const names = parseMultiInput(text);
          const queue = names.length > 0 ? names : [text.trim()];
          countryQueueRef.current = queue;
          if (queue.length > 1) {
            await addBotMessage(`אבדוק ${queue.length} מדינות בזו אחר זו.`, BOT_DELAY_SHORT);
          }
          await processNextCountry(answersRef.current);
          break;
        }

        // ── Unknown country retry ────────────────────────────────────────────────
        case 'country_unknown_retry': {
          const originalName = currentUnknownCountryRef.current;

          if (text.trim() === 'אין') {
            addIssue({ type: 'בירור רפואי', reason: `מדינה לא מזוהה: "${originalName}"` });
            await processNextCountry(answersRef.current);
            return;
          }

          const results = searchCountry(text);
          const country = results.find(
            (c) =>
              c.name.toLowerCase() === text.toLowerCase() ||
              c.aliases?.some((a) => a.toLowerCase() === text.toLowerCase()),
          ) ?? results[0];

          if (!country) {
            const offered = await tryOfferTravelClarification(text.trim());
            if (offered) return;

            currentUnknownCountryRef.current = text.trim();
            await addBotMessage(
              `לא מצאתי גם את "${text}".\nנסה שם אחר, או לחץ "אין שם אחר" כדי לדלג.`,
              BOT_DELAY_SHORT,
            );
            return;
          }

          const updatedAnswers = updateAnswers({ travelCountry: country.name, countryRisk: country.risk });
          applyCountryRules(country);
          await processNextCountry(updatedAnswers);
          break;
        }

        // ── Additional info ──────────────────────────────────────────────────────
        case 'additional_info': {
          const updatedAnswers = updateAnswers({ additionalInfo: text });
          if (text !== 'אין מידע נוסף') {
            addIssue({ type: 'בירור רפואי', reason: `מידע נוסף: ${text}` });
          }
          await goToStep('final', updatedAnswers);
          break;
        }

        default: break;
      }
    },
    [
      currentStep, addMessage, addIssue, updateAnswers, addBotMessage,
      goToStep, processNextMedication, processNextCountry, applyCountryRules,
      tryOfferTravelClarification, applyMedicationMatchFromSearch,
    ],
  );

  // ── Date picker (last donation) ───────────────────────────────────────────────
  const handleDateSubmit = useCallback(
    async (isoDate: string) => {
      const [year, month, day] = isoDate.split('-');
      const displayDate = `${day}/${month}/${year}`;
      addMessage('user', displayDate);

      const diffDays = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
      const threeMonthsInDays = 91;
      const donationToken = diffDays < threeMonthsInDays ? 'less_3months' : 'more_3months';
      const updatedAnswers = updateAnswers({ lastDonation: donationToken, lastDonationDate: isoDate });

      if (donationToken === 'less_3months') {
        const remaining = Math.ceil(threeMonthsInDays - diffDays);
        addIssue({
          type: 'פסילה זמנית',
          reason: `תרומה אחרונה ב-${displayDate} (לפני ${Math.floor(diffDays)} ימים)`,
          waitTime: `עוד ${remaining} ימים`,
        });
      }
      await goToStep('age', updatedAnswers);
    },
    [addMessage, addIssue, updateAnswers, addBotMessage, goToStep],
  );

  // ── Session feedback (rating + notes) ───────────────────────────────────────
  const handleSessionFeedback = useCallback(async (data: { rating?: number; feedbackText?: string }) => {
    if (sessionIdRef.current) {
      await saveSessionFeedback(sessionIdRef.current, data);
    }
  }, []);

  // ── Restart ───────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(async () => {
    setMessages([]);
    setCurrentStep('phone');
    setIsTyping(false);
    setAnswers({});
    answersRef.current = {};
    setFinalStatus(null);
    setIsCompleted(false);
    setPendingMedication(null);
    issuesRef.current             = [];
    medicationQueueRef.current    = [];
    currentUnknownMedRef.current  = '';
    countryQueueRef.current           = [];
    currentUnknownCountryRef.current  = '';
    pendingGeocodeRef.current         = null;
    pendingMedicationLlmRef.current   = null;
    pendingDiseaseLlmRef.current      = null;
    sessionIdRef.current = null;

    if (userIdRef.current) {
      sessionIdRef.current = await createSession(userIdRef.current);
    }
    await startChat();
    setCurrentStep('phone');
  }, [startChat]);

  return {
    messages,
    currentStep,
    isTyping,
    finalStatus,
    isCompleted,
    pendingMedication,
    answers,
    startChat,
    handlePhoneSubmit,
    handleQuickReply,
    handleTextSubmit,
    handleDateSubmit,
    handleSessionFeedback,
    handleRestart,
  };
}
