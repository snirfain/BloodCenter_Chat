import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { searchCountry, type Country } from '../data/countries';

interface CountrySearchProps {
  onSelect: (country: Country | null, rawText: string) => void;
  disabled?: boolean;
}

export const CountrySearch: React.FC<CountrySearchProps> = ({ onSelect, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setResults(searchCountry(val));
    setSelected(null);
  };

  const handlePick = (country: Country) => {
    setQuery(country.name);
    setResults([]);
    setSelected(country.name);
    onSelect(country, country.name);
  };

  const handleManualSubmit = () => {
    if (!query.trim()) return;
    onSelect(null, query.trim()); // unknown country
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
            placeholder="הקלד שם מדינה..."
            disabled={disabled}
            dir="rtl"
            aria-label="חיפוש מדינה"
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
            aria-label="אשר מדינה"
            className="px-4 py-3 rounded-full bg-mda-red text-white text-sm font-medium hover:bg-mda-red-dark active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-mda-red focus:ring-offset-2 disabled:opacity-50"
          >
            אשר
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {results.length > 0 && (
        <ul
          role="listbox"
          aria-label="תוצאות חיפוש מדינות"
          className="absolute top-14 right-2 left-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"
        >
          {results.map((country) => (
            <li key={country.name}>
              <button
                role="option"
                type="button"
                onClick={() => handlePick(country)}
                className="w-full text-right px-4 py-3 text-sm hover:bg-red-50 hover:text-mda-red transition-colors flex items-center justify-between"
                dir="rtl"
              >
                <span>{country.name}</span>
                {country.risk !== 'none' && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {country.risk === 'malaria' ? 'מלריה' : 'סיכון גבוה'}
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
