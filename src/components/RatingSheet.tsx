import React, { useState } from 'react';
import { ChevronUp, RefreshCw } from 'lucide-react';
import { StarRating } from './StarRating';

interface RatingSheetProps {
  onFeedbackRating: (rating: number) => void;
  onFeedbackText: (text: string) => void;
  onRestart: () => void;
  disabled?: boolean;
}

export const RatingSheet: React.FC<RatingSheetProps> = ({
  onFeedbackRating,
  onFeedbackText,
  onRestart,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end pointer-events-none"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto mx-2 sm:mx-3 rounded-t-2xl bg-white shadow-[0_-6px_28px_rgba(0,0,0,0.12)] border border-gray-200 border-b-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          disabled={disabled}
          aria-expanded={expanded}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          dir="rtl"
        >
          <ChevronUp
            className={`w-5 h-5 shrink-0 text-mda-red transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
          דרג את החוויה שלך
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100 max-h-[min(70vh,520px)] overflow-y-auto">
              <p className="text-center text-sm text-gray-800 font-medium" dir="rtl">
                נשמח לדעת — איך הייתה החוויה שלך עם הבוט?
              </p>
              <StarRating onRate={onFeedbackRating} disabled={disabled} />
              <label className="block text-sm text-gray-600 font-medium" dir="rtl" htmlFor="session-feedback-sheet">
                הערות או משוב (אופציונלי)
              </label>
              <textarea
                id="session-feedback-sheet"
                dir="rtl"
                rows={3}
                placeholder="כתבו כאן הערות…"
                disabled={disabled}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mda-red/30 focus:border-mda-red disabled:opacity-50"
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t) onFeedbackText(t);
                }}
              />
              <button
                onClick={onRestart}
                type="button"
                disabled={disabled}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-mda-red text-white font-medium text-sm hover:bg-mda-red-dark active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-mda-red disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                התחל שאלון מחדש
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
