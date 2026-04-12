import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';

interface DatePickerInputProps {
  onSubmit: (isoDate: string) => void;
  disabled?: boolean;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');

  // Max = today, min = 10 years ago (reasonable upper bound)
  const today = new Date().toISOString().split('T')[0];
  const tenYearsAgo = new Date(
    new Date().setFullYear(new Date().getFullYear() - 10),
  )
    .toISOString()
    .split('T')[0];

  const handleSubmit = () => {
    if (!value) return;
    onSubmit(value);
  };

  return (
    <div className="flex items-center gap-2 px-2 mt-2">
      <div className="relative flex-1">
        <CalendarDays
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={tenYearsAgo}
          max={today}
          disabled={disabled}
          aria-label="בחר תאריך תרומה אחרונה"
          className="w-full pr-9 pl-4 py-3 rounded-full border-2 border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mda-red focus:border-mda-red disabled:opacity-50 transition-colors"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || !value}
        type="button"
        aria-label="אשר תאריך"
        className={`
          px-5 py-3 rounded-full font-medium text-sm transition-all duration-150 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-mda-red focus:ring-offset-2
          ${value && !disabled
            ? 'bg-mda-red text-white hover:bg-mda-red-dark shadow-md'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
        `}
      >
        אשר
      </button>
    </div>
  );
};
