import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface TextInputProps {
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  type?: 'text' | 'tel' | 'date';
  validate?: (value: string) => string | null; // returns error message or null
  /** Optional live formatter (e.g. phone XXX-XXXXXXX); submit still receives trimmed display text */
  format?: (value: string) => string;
  autoFocus?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  placeholder = 'הקלד כאן...',
  onSubmit,
  disabled = false,
  type = 'text',
  validate,
  format,
  autoFocus = true,
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus, disabled]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (validate) {
      const errMsg = validate(trimmed);
      if (errMsg) {
        setError(errMsg);
        return;
      }
    }

    setError(null);
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex flex-col gap-1 px-2 mt-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            setValue(format ? format(raw) : raw);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          dir="rtl"
          aria-label={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'input-error' : undefined}
          className={`
            flex-1 px-4 py-3 rounded-full border-2 text-sm bg-white
            focus:outline-none focus:ring-2 focus:ring-mda-red focus:border-mda-red
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="שלח"
          type="button"
          className={`
            w-11 h-11 rounded-full flex items-center justify-center shrink-0
            transition-all duration-150 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-mda-red focus:ring-offset-2
            ${
              value.trim() && !disabled
                ? 'bg-mda-red text-white shadow-md hover:bg-mda-red-dark'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-4 h-4" style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>
      {error && (
        <p id="input-error" className="text-red-600 text-xs px-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
