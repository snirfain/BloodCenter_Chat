import React, { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { QuickReply } from './QuickReply';
import { TextInput } from './TextInput';
import { MedicationSearch } from './MedicationSearch';
import { StarRating } from './StarRating';
import { DatePickerInput } from './DatePickerInput';
import { useChatFlow, validateIsraeliPhone } from '../hooks/useChatFlow';
import type { FlowStep } from '../types/chat';
import type { Medication } from '../data/medications';

// ─── Quick reply maps per step ────────────────────────────────────────────────

function getQuickReplies(step: FlowStep, pendingMedication: Medication | null) {
  switch (step) {
    case 'last_donation':
      return [
        { label: 'לא תרמתי בעבר',        value: 'never' },
        { label: 'בחר תאריך מדויק',       value: 'pick_date' },
        { label: 'עברו יותר מ-3 חודשים', value: 'more_3months' },
        { label: 'לא עברו 3 חודשים',      value: 'less_3months' },
      ];

    case 'age':
      return [
        { label: 'מתחת ל-17', value: 'under17' },
        { label: '17–18',     value: '17_18' },
        { label: '18–60',     value: '18_60' },
        { label: '60–65',     value: '60_65' },
        { label: '65+',       value: 'over65' },
      ];

    case 'weight':
      return [
        { label: 'כן, מעל 50 ק״ג',      value: 'above50' },
        { label: 'לא, מתחת ל-50 ק״ג',   value: 'below50' },
      ];

    case 'pregnancy':
      return [
        { label: 'לא', value: 'no' },
        { label: 'כן', value: 'yes' },
      ];

    case 'procedure':
      return [
        { label: 'לא ביצעתי',                       value: 'none' },
        { label: 'קעקוע / פירסינג',                 value: 'tattoo' },
        { label: 'קולונוסקופיה / גסטרוסקופיה',      value: 'colonoscopy' },
      ];

    case 'colonoscopy_biopsy':
      return [
        { label: 'כן, נלקחה ביופסיה', value: 'yes' },
        { label: 'לא',                value: 'no' },
      ];

    case 'colonoscopy_biopsy_result':
    case 'colonoscopy_result':
      return [
        { label: 'כן, תקינה',           value: 'normal' },
        { label: 'לא תקינה / לא ידוע', value: 'abnormal' },
      ];

    case 'medications':
      return [
        { label: 'לא', value: 'no' },
        { label: 'כן', value: 'yes' },
      ];

    case 'medication_indication':
      if (!pendingMedication) return [];
      return pendingMedication.indications.map((ind) => ({
        label: ind.reason,
        value: ind.reason,
      }));

    case 'disease':
      return [
        { label: 'לא', value: 'no' },
        { label: 'כן', value: 'yes' },
      ];

    case 'illness':
      return [
        { label: 'לא חליתי / לא טיפול שיניים', value: 'none' },
        { label: 'מחלה זיהומית',                value: 'infection' },
        { label: 'טיפול שיניים',                value: 'dental' },
      ];

    case 'dental_type':
      return [
        { label: 'שיננית / סתימה (24 שעות)',  value: 'hygienist' },
        { label: 'עקירה כירורגית (7 ימים)',    value: 'extraction' },
        { label: 'שתל / ניתוח (חודש)',         value: 'implant' },
      ];

    case 'travel':
      return [
        { label: 'לא', value: 'no' },
        { label: 'כן', value: 'yes' },
      ];

    case 'travel_timeframe':
      return [
        { label: 'בחודש האחרון',               value: 'last_month' },
        { label: 'לפני חודש עד 3 חודשים',      value: '1_3_months' },
        { label: 'לפני 3 חודשים עד שנה',       value: '3_12_months' },
      ];

    case 'country_geocode_confirm':
      return [
        { label: 'כן', value: 'yes' },
        { label: 'לא', value: 'no' },
      ];

    default:
      return [];
  }
}

// ─── Shared "skip" button ─────────────────────────────────────────────────────
const SkipButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({
  label,
  onClick,
  disabled,
}) => (
  <div className="px-2 mt-1">
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className="quick-reply-btn w-full"
    >
      {label}
    </button>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const ChatWindow: React.FC = () => {
  const {
    messages,
    currentStep,
    isTyping,
    finalStatus,
    isCompleted,
    pendingMedication,
    startChat,
    handlePhoneSubmit,
    handleQuickReply,
    handleTextSubmit,
    handleDateSubmit,
    handleSessionFeedback,
    handleRestart,
  } = useChatFlow();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatStarted    = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!chatStarted.current) {
      chatStarted.current = true;
      startChat();
    }
  }, [startChat]);

  const quickReplies          = getQuickReplies(currentStep, pendingMedication);
  const isInteractionDisabled = isTyping;

  const renderInput = () => {
    if (isCompleted && currentStep !== 'rating') return null;

    switch (currentStep) {
      case 'phone':
        return (
          <TextInput
            placeholder="מספר טלפון (05X-XXXXXXX)"
            onSubmit={handlePhoneSubmit}
            type="tel"
            validate={validateIsraeliPhone}
            disabled={isInteractionDisabled}
          />
        );

      case 'last_donation_date':
        return <DatePickerInput onSubmit={handleDateSubmit} disabled={isInteractionDisabled} />;

      case 'last_donation':
      case 'age':
      case 'weight':
      case 'pregnancy':
      case 'procedure':
      case 'colonoscopy_biopsy':
      case 'colonoscopy_biopsy_result':
      case 'colonoscopy_result':
      case 'medications':
      case 'medication_indication':
      case 'disease':
      case 'illness':
      case 'dental_type':
      case 'travel':
      case 'travel_timeframe':
      case 'country_geocode_confirm':
        return quickReplies.length > 0 ? (
          <QuickReply
            options={quickReplies}
            onSelect={handleQuickReply}
            disabled={isInteractionDisabled}
            columns={quickReplies.length <= 2 ? 2 : quickReplies.length === 3 ? 1 : 2}
          />
        ) : null;

      // ── Medication name: free-text with autocomplete ──────────────────────────
      case 'medication_name':
        return (
          <MedicationSearch
            onSelect={(_med, raw) => handleTextSubmit(raw)}
            disabled={isInteractionDisabled}
          />
        );

      // ── Unknown medication: ask for alternative name ──────────────────────────
      case 'medication_unknown_retry':
        return (
          <div className="flex flex-col gap-1">
            <TextInput
              placeholder="הקלד שם חלופי לתרופה..."
              onSubmit={handleTextSubmit}
              disabled={isInteractionDisabled}
            />
            <SkipButton
              label="אין שם אחר — המשך"
              onClick={() => handleTextSubmit('אין')}
              disabled={isInteractionDisabled}
            />
          </div>
        );

      case 'disease_details':
      case 'infection_details':
        return (
          <TextInput
            placeholder="תאר בקצרה..."
            onSubmit={handleTextSubmit}
            disabled={isInteractionDisabled}
          />
        );

      // ── Country: free-text (multi-country aware) ──────────────────────────────
      case 'travel_country':
        return (
          <TextInput
            placeholder="מדינה אחת או יותר, מופרדות ב-+ או פסיק..."
            onSubmit={handleTextSubmit}
            disabled={isInteractionDisabled}
          />
        );

      // ── Unknown country: ask for alternative name ─────────────────────────────
      case 'country_unknown_retry':
        return (
          <div className="flex flex-col gap-1">
            <TextInput
              placeholder="הקלד שם חלופי למדינה..."
              onSubmit={handleTextSubmit}
              disabled={isInteractionDisabled}
            />
            <SkipButton
              label="אין שם אחר — המשך"
              onClick={() => handleTextSubmit('אין')}
              disabled={isInteractionDisabled}
            />
          </div>
        );

      case 'additional_info':
        return (
          <div className="flex flex-col gap-1">
            <TextInput
              placeholder="מידע נוסף (אופציונלי)..."
              onSubmit={handleTextSubmit}
              disabled={isInteractionDisabled}
            />
            <SkipButton
              label="לא, סיימתי"
              onClick={() => handleTextSubmit('אין מידע נוסף')}
              disabled={isInteractionDisabled}
            />
          </div>
        );

      case 'rating':
        return (
          <div className="px-4 pt-1 pb-1 space-y-3">
            <p className="text-center text-sm text-gray-800 font-medium" dir="rtl">
              נשמח לדעת — איך הייתה החוויה שלך עם הבוט?
            </p>
            <StarRating onRate={(n) => handleSessionFeedback({ rating: n })} />
            <label className="block text-sm text-gray-600 font-medium" dir="rtl" htmlFor="session-feedback">
              הערות או משוב (אופציונלי)
            </label>
            <textarea
              id="session-feedback"
              dir="rtl"
              rows={3}
              placeholder="כתבו כאן הערות…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mda-red/30 focus:border-mda-red"
              onBlur={(e) => {
                void handleSessionFeedback({ feedbackText: e.target.value.trim() });
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const statusColors: Record<string, string> = {
    'זכאות מלאה':     'bg-green-50 border-green-300 text-green-800',
    'זכאות עם אישור': 'bg-yellow-50 border-yellow-300 text-yellow-800',
    'פסילה קבועה':    'bg-red-50 border-red-300 text-red-800',
    'פסילה זמנית':    'bg-orange-50 border-orange-300 text-orange-800',
    'בירור רפואי':    'bg-blue-50 border-blue-300 text-blue-800',
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main
        className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-1"
        role="log"
        aria-live="polite"
        aria-label="שיחת צ׳אט"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </main>

      {finalStatus && (
        <div
          className={`mx-4 mb-2 px-4 py-2 rounded-xl border text-center text-sm font-semibold ${statusColors[finalStatus] || ''}`}
          role="status"
          aria-live="assertive"
        >
          תוצאה: {finalStatus}
        </div>
      )}

      <div
        className="border-t border-gray-200 bg-white px-0 pt-3 pb-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {renderInput()}

        {isCompleted && currentStep !== 'rating' && (
          <div className="px-4 mt-3">
            <button
              onClick={handleRestart}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <RefreshCw className="w-4 h-4" />
              התחל שאלון מחדש
            </button>
          </div>
        )}

        {currentStep === 'rating' && (
          <div className="px-4 mt-3">
            <button
              onClick={handleRestart}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-mda-red text-white font-medium text-sm hover:bg-mda-red-dark active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-mda-red"
            >
              <RefreshCw className="w-4 h-4" />
              התחל שאלון מחדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
