import React from 'react';

export interface QuickReplyOption {
  label: string;
  value: string;
}

interface QuickReplyProps {
  options: QuickReplyOption[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
  columns?: 1 | 2 | 3;
}

export const QuickReply: React.FC<QuickReplyProps> = ({
  options,
  onSelect,
  disabled = false,
  columns = 2,
}) => {
  const colClass =
    columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div
      className={`grid ${colClass} gap-2 mt-2 px-2`}
      role="group"
      aria-label="אפשרויות תשובה מהירה"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          className="quick-reply-btn"
          onClick={() => onSelect(opt.value, opt.label)}
          disabled={disabled}
          aria-label={opt.label}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
