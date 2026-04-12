import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, FlowStep, SessionAnswers, FinalStatus, Issue, IssueType } from '../types/chat';
import { searchMedication, type Indication, type Medication } from '../data/medications';
import { searchCountry } from '../data/countries';
import { createUser, createSession, updateSession, saveRating } from '../services/db';

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

/** זכאות מלאה עם המתנה (למשל קולכיצין) — לא מציגים «ללא מגבלה». */
function botMessageForFullEligibility(medName: string, ind: Indication): string {
  const w = ind.waitTime?.trim();
  if (w) {
    return `✓ ${medName} — מותר להתרים רק לאחר ${w}. נמשיך.`;
  }
  return `✓ ${medName} — ללא מגבלה. נמשיך.`;
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
      const wait = i.waitTime ? ` (המתנה: ${i.waitTime})` : '';
      lines.push(`   • ${i.reason}${wait}`);
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

  // ── Supabase IDs ──────────────────────────────────────────────────────────────
  const userIdRef    = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ── Answers snapshot ref (avoids stale closure in queue processors) ──────────
  const answersRef = useRef<SessionAnswers>({});

  // ── Issue helper ──────────────────────────────────────────────────────────────
  const addIssue = useCallback((issue: Issue) => {
    issuesRef.current = [...issuesRef.current, issue];
  }, []);

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

      setTimeout(async () => {
        await addBotMessage('⭐ נשמח לדעת — איך הייתה החוויה שלך עם הבוט?', BOT_DELAY_SHORT);
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
          await addBotMessage('🤰 האם עברת הריון, לידה או הפלה ב-6 חודשים האחרונים?', BOT_DELAY_SHORT); break;
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
          await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
        } else if (ind.action === 'פסילה זמנית') {
          addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${med.name}`, waitTime: ind.waitTime });
          await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
        } else if (ind.action === 'בירור רפואי') {
          addIssue({ type: 'בירור רפואי', reason: `תרופה: ${med.name} — ${ind.reason}` });
          await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
        } else if (ind.action === 'זכאות מלאה') {
          await addBotMessage(botMessageForFullEligibility(med.name, ind), BOT_DELAY_SHORT);
        } else {
          await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
        }

        await processNextMedication(updatedAnswers);
      } else {
        // Multiple indications — pause queue, ask user
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

      if (country.risk === 'malaria') {
        addIssue({ type: 'פסילה זמנית', reason: `ביקור באזור מלריה: ${country.name}`, waitTime: '3 חודשים מחזרה' });
        await addBotMessage(`נרשם — ${country.name} הוא אזור מלריה. נמשיך.`, BOT_DELAY_SHORT);
      } else if (country.risk === 'high_risk') {
        addIssue({ type: 'פסילה זמנית', reason: `ביקור באזור בסיכון גבוה: ${country.name}`, waitTime: '6 חודשים מחזרה' });
        await addBotMessage(`נרשם — ${country.name} הוא אזור בסיכון גבוה. נמשיך.`, BOT_DELAY_SHORT);
      } else {
        await addBotMessage(`✓ ${country.name} — לא נמצאה מגבלה. נמשיך.`, BOT_DELAY_SHORT);
      }

      await processNextCountry(updatedAnswers);
    },
    [addBotMessage, addIssue, updateAnswers, goToStep],
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
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          }
          await goToStep('age', updatedAnswers);
          break;
        }

        case 'age': {
          updatedAnswers = updateAnswers({ age: value });
          if (value === 'under17') {
            addIssue({ type: 'פסילה קבועה', reason: 'גיל מתחת ל-17' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          } else if (value === 'over65') {
            addIssue({ type: 'פסילה קבועה', reason: 'גיל מעל 65' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          } else if (value === '17_18') {
            addIssue({ type: 'זכאות עם אישור', reason: 'גיל 17–18 — נדרש אישור הורים' });
          } else if (value === '60_65') {
            addIssue({ type: 'זכאות עם אישור', reason: 'גיל 60–65 — תרומה רק באתר נייח, בכפוף לבדיקה' });
          }
          await goToStep('weight', updatedAnswers);
          break;
        }

        case 'weight': {
          updatedAnswers = updateAnswers({ weight: value });
          if (value === 'below50') {
            addIssue({ type: 'פסילה קבועה', reason: 'משקל מתחת ל-50 ק״ג' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          }
          await goToStep('pregnancy', updatedAnswers);
          break;
        }

        case 'pregnancy': {
          updatedAnswers = updateAnswers({ pregnancy: value });
          if (value === 'yes') {
            addIssue({ type: 'פסילה זמנית', reason: 'הריון / לידה ב-6 חודשים האחרונים', waitTime: '6 חודשים מהלידה' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          }
          await goToStep('procedure', updatedAnswers);
          break;
        }

        case 'procedure': {
          updatedAnswers = updateAnswers({ procedureType: value });
          if (value === 'tattoo') {
            addIssue({ type: 'פסילה זמנית', reason: 'קעקוע או פירסינג', waitTime: '4 חודשים' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
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
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          }
          await goToStep('medications', updatedAnswers);
          break;
        }

        case 'colonoscopy_result': {
          updatedAnswers = updateAnswers({ colonoscopyResult: value });
          if (value === 'abnormal') {
            addIssue({ type: 'בירור רפואי', reason: 'תוצאת קולונוסקופיה / גסטרוסקופיה לא תקינה' });
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
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
            await addBotMessage('נרשם. נמשיך.', BOT_DELAY_SHORT);
          } else if (indication.action === 'פסילה זמנית') {
            addIssue({ type: 'פסילה זמנית', reason: `תרופה: ${pendingMedication.name}`, waitTime: indication.waitTime });
            await addBotMessage('נרשם. נמשיך.', BOT_DELAY_SHORT);
          } else if (indication.action === 'בירור רפואי') {
            addIssue({ type: 'בירור רפואי', reason: `תרופה: ${pendingMedication.name} — ${indication.reason}` });
            await addBotMessage('נרשם. נמשיך.', BOT_DELAY_SHORT);
          } else if (indication.action === 'זכאות מלאה') {
            await addBotMessage(botMessageForFullEligibility(pendingMedication.name, indication), BOT_DELAY_SHORT);
          } else {
            await addBotMessage('נרשם. נמשיך.', BOT_DELAY_SHORT);
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
            await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
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

        default: break;
      }
    },
    [
      currentStep, isCompleted, pendingMedication,
      addMessage, addIssue, updateAnswers, addBotMessage,
      goToStep, processNextMedication,
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
            await addBotMessage(`נרשם "${originalName}" לבירור רפואי. נמשיך.`, BOT_DELAY_SHORT);
            await processNextMedication(answersRef.current);
            return;
          }

          const matches = searchMedication(text);
          if (matches.length === 0) {
            // Still not found — ask again
            currentUnknownMedRef.current = text.trim();
            await addBotMessage(
              `לא מצאתי גם את "${text}" במאגר.\nנסה שם אחר, או לחץ "אין שם אחר" כדי לדלג.`,
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
            } else if (ind.action === 'זכאות מלאה') {
              await addBotMessage(botMessageForFullEligibility(med.name, ind), BOT_DELAY_SHORT);
            } else {
              await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
            }
            if (ind.action !== 'זכאות מלאה') {
              await addBotMessage(`נרשם (${med.name}). נמשיך.`, BOT_DELAY_SHORT);
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
          break;
        }

        // ── Disease details ─────────────────────────────────────────────────────
        case 'disease_details': {
          const updatedAnswers = updateAnswers({ diseaseDetails: text });
          addIssue({ type: 'בירור רפואי', reason: `מצב רפואי: ${text}` });
          await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
          await goToStep('illness', updatedAnswers);
          break;
        }

        // ── Infection details ───────────────────────────────────────────────────
        case 'infection_details': {
          const updatedAnswers = updateAnswers({ infectionDetails: text });
          addIssue({ type: 'בירור רפואי', reason: `מחלה זיהומית: ${text}` });
          await addBotMessage('נרשם. נמשיך לשאלות הבאות.', BOT_DELAY_SHORT);
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
            await addBotMessage(`נרשם "${originalName}" לבירור רפואי. נמשיך.`, BOT_DELAY_SHORT);
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
            currentUnknownCountryRef.current = text.trim();
            await addBotMessage(
              `לא מצאתי גם את "${text}".\nנסה שם אחר, או לחץ "אין שם אחר" כדי לדלג.`,
              BOT_DELAY_SHORT,
            );
            return;
          }

          const updatedAnswers = updateAnswers({ travelCountry: country.name, countryRisk: country.risk });
          if (country.risk === 'malaria') {
            addIssue({ type: 'פסילה זמנית', reason: `ביקור באזור מלריה: ${country.name}`, waitTime: '3 חודשים מחזרה' });
            await addBotMessage(`נרשם — ${country.name} הוא אזור מלריה. נמשיך.`, BOT_DELAY_SHORT);
          } else if (country.risk === 'high_risk') {
            addIssue({ type: 'פסילה זמנית', reason: `ביקור באזור בסיכון גבוה: ${country.name}`, waitTime: '6 חודשים מחזרה' });
            await addBotMessage(`נרשם — ${country.name} אזור בסיכון גבוה. נמשיך.`, BOT_DELAY_SHORT);
          } else {
            await addBotMessage(`✓ ${country.name} — ללא מגבלה. נמשיך.`, BOT_DELAY_SHORT);
          }
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
      goToStep, processNextMedication, processNextCountry,
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
        await addBotMessage(`נרשם — עוד ${remaining} ימים עד שתוכל לתרום. נמשיך לשאלות.`, BOT_DELAY_SHORT);
      } else {
        await addBotMessage(`תרמת ב-${displayDate} — עברו יותר מ-3 חודשים. נמשיך.`, BOT_DELAY_SHORT);
      }
      await goToStep('age', updatedAnswers);
    },
    [addMessage, addIssue, updateAnswers, addBotMessage, goToStep],
  );

  // ── Rating ────────────────────────────────────────────────────────────────────
  const handleRating = useCallback(async (stars: number) => {
    if (sessionIdRef.current) await saveRating(sessionIdRef.current, stars);
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
    handleRating,
    handleRestart,
  };
}
