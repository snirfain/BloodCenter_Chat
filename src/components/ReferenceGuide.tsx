import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { RECEIVING_BLOOD_CRITERIA_ROWS } from '../data/receivingBloodCriteriaTable';
import { MEDICATION_REFERENCE_FLAT_ROWS } from '../data/medicationReferenceFlat.generated';

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export const ReferenceGuide: React.FC = () => {
  const [criteriaQuery, setCriteriaQuery] = useState('');
  const [medQuery, setMedQuery] = useState('');

  const filteredCriteria = useMemo(() => {
    const q = normalize(criteriaQuery);
    if (!q) return RECEIVING_BLOOD_CRITERIA_ROWS;
    return RECEIVING_BLOOD_CRITERIA_ROWS.filter((row) => {
      const hay = `${row.subjectHe} ${row.subjectEn} ${row.criteria} ${row.remarks}`.toLowerCase();
      return hay.includes(q);
    });
  }, [criteriaQuery]);

  const filteredMedications = useMemo(() => {
    const q = normalize(medQuery);
    if (!q) return MEDICATION_REFERENCE_FLAT_ROWS;
    return MEDICATION_REFERENCE_FLAT_ROWS.filter((row) => {
      const hay = `${row.nameHe} ${row.nameEn} ${row.genericName} ${row.guidelines} ${row.criterion}`.toLowerCase();
      return hay.includes(q);
    });
  }, [medQuery]);

  return (
    <div
      id="reference-guide"
      className="flex flex-col flex-1 min-h-0 bg-gray-50"
      role="region"
      aria-label="טבלאות מידע — קריטריונים ותרופות"
    >
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 space-y-10">
        <section aria-labelledby="criteria-heading">
          <div className="mb-3">
            <h2 id="criteria-heading" className="text-lg font-bold text-gray-900 mb-1">
              קריטריונים לקבלת דם
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              הנתונים מוצגים כאן בצורה קבועה במסמך — לפי מאגר המערכת (מד״א).
            </p>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={criteriaQuery}
                onChange={(e) => setCriteriaQuery(e.target.value)}
                placeholder="סינון בטבלה…"
                dir="rtl"
                className="w-full pr-9 pl-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mda-red focus:border-mda-red"
                aria-label="סינון קריטריונים"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              מוצגות {filteredCriteria.length} שורות מתוך {RECEIVING_BLOOD_CRITERIA_ROWS.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-800 text-right border-b border-gray-200">
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    נושא (עברית)
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    נושא (אנגלית)
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold min-w-[12rem]">
                    קריטריון
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold min-w-[8rem]">
                    הערות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCriteria.map((row) => (
                  <tr key={row.id} className="hover:bg-red-50/40 align-top">
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{row.subjectHe}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs" lang="en" dir="ltr">
                      {row.subjectEn}
                    </td>
                    <td className="px-3 py-2 text-gray-800 leading-snug">{row.criteria}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs leading-snug">{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="meds-heading">
          <div className="mb-3">
            <h2 id="meds-heading" className="text-lg font-bold text-gray-900 mb-1">
              תרופות והנחיות התרמה
            </h2>
            <p className="text-xs text-gray-500 mb-3">טבלה מלאה לפי שם מסחרי, גנרי והנחיות.</p>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={medQuery}
                onChange={(e) => setMedQuery(e.target.value)}
                placeholder="סינון בטבלה…"
                dir="rtl"
                className="w-full pr-9 pl-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mda-red focus:border-mda-red"
                aria-label="סינון תרופות"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              מוצגות {filteredMedications.length} שורות מתוך {MEDICATION_REFERENCE_FLAT_ROWS.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-800 text-right border-b border-gray-200">
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    שם בעברית
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    שם באנגלית
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                    שם גנרי
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold min-w-[14rem]">
                    הנחיות
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold min-w-[10rem]">
                    קריטריון
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMedications.map((row, i) => (
                  <tr
                    key={`${row.nameHe}-${row.criterion}-${row.guidelines.slice(0, 40)}-${i}`}
                    className="hover:bg-red-50/40 align-top"
                  >
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{row.nameHe}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs" lang="en" dir="ltr">
                      {row.nameEn}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs" lang="en" dir="ltr">
                      {row.genericName}
                    </td>
                    <td className="px-3 py-2 text-gray-800 leading-snug">{row.guidelines}</td>
                    <td className="px-3 py-2 text-gray-700 leading-snug">{row.criterion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
