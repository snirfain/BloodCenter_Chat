import React, { useState } from 'react';

interface StarRatingProps {
  onRate: (stars: number) => void;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ onRate, disabled }) => {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  const handleSelect = (stars: number) => {
    if (disabled || selected) return;
    setSelected(stars);
    onRate(stars);
  };

  const labels = ['', 'גרוע', 'לא טוב', 'בסדר', 'טוב', 'מצוין'];

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div
        role="group"
        aria-label="דירוג מ-1 עד 5 כוכבים"
        className="flex items-center gap-1"
        dir="ltr"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (selected || hovered);
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} כוכבים — ${labels[star]}`}
              aria-pressed={selected === star}
              className="star-btn leading-none focus:outline-none focus:ring-2 focus:ring-mda-red rounded"
              onMouseEnter={() => !selected && setHovered(star)}
              onMouseLeave={() => !selected && setHovered(0)}
              onClick={() => handleSelect(star)}
              disabled={disabled || !!selected}
            >
              <span
                style={{
                  color: isFilled ? '#F59E0B' : '#D1D5DB',
                  fontSize: '2rem',
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}
              >
                ★
              </span>
            </button>
          );
        })}
      </div>
      {(hovered > 0 || selected > 0) && (
        <p className="text-sm text-gray-600 font-medium" aria-live="polite">
          {labels[selected || hovered]}
        </p>
      )}
      {selected > 0 && (
        <p className="text-xs text-green-600 font-medium" aria-live="polite">
          תודה על הדירוג! ⭐
        </p>
      )}
    </div>
  );
};
