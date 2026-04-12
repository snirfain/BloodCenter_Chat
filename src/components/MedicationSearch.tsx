import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { searchMedication, type Medication } from '../data/medications';

interface MedicationSearchProps {
  onSelect: (medication: Medication | null, rawText: string) => void;
  disabled?: boolean;
}

export const MedicationSearch: React.FC<MedicationSearchProps> = ({ onSelect, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medication[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setResults(searchMedication(val));
    setSelected(null);
  };

  const handlePick = (med: Medication) => {
    setQuery(med.name);
    setResults([]);
    setSelected(med.name);
    onSelect(med, med.name);
  };

  const handleManualSubmit = () => {
    if (!query.trim()) return;
    onSelect(null, query.trim());
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-1 px-2 mt-2 relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="תרופה אחת או יותר, מופרדות ב-+ או פסיק..."
            disabled={disabled}
            dir="rtl"
            aria-label="חיפוש תרופה"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            className="w-full pr-9 pl-4 py-3 rounded-full border-2 border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mda-red focus:border-mda-red disabled:opacity-50 transition-colors"
          />
        </div>
        {!selected && query.trim() && (
          <button
            onClick={handleManualSubmit}
            disabled={disabled}
            type="button"
            aria-label="אשר תרופה"
            className="px-4 py-3 rounded-full bg-mda-red text-white text-sm font-medium hover:bg-mda-red-dark active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-mda-red focus:ring-offset-2 disabled:opacity-50"
          >
            אשר
          </button>
        )}
      </div>

      {/* Autocomplete results */}
      {results.length > 0 && (
        <ul
          role="listbox"
          aria-label="תוצאות חיפוש תרופות"
          className="absolute top-14 right-2 left-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"
        >
          {results.map((med) => (
            <li key={med.name}>
              <button
                role="option"
                type="button"
                onClick={() => handlePick(med)}
                className="w-full text-right px-4 py-3 text-sm hover:bg-red-50 hover:text-mda-red transition-colors"
                dir="rtl"
              >
                <span className="font-medium">{med.name}</span>
                {med.aliases && med.aliases.length > 0 && (
                  <span className="text-gray-400 text-xs block">
                    {med.aliases.slice(0, 3).join(', ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
