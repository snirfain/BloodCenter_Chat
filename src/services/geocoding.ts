import { countriesDatabase, type Country } from '../data/countries';

type NominatimAddress = { country?: string; country_code?: string };

type NominatimResult = { address?: NominatimAddress; display_name?: string };

const NOMINATIM_PATH = '/api/nominatim';

/** Resolve location search to a country from our DB, or return null. */
function matchCountryByEnglishName(
  en: string,
): { country: Country; displayNameHe: string } | null {
  const t = en.trim();
  if (!t) return null;
  const lower = t.toLowerCase();

  for (const c of countriesDatabase) {
    if (c.name.toLowerCase() === lower) {
      return { country: c, displayNameHe: c.name };
    }
    if (c.aliases?.some((a) => a.toLowerCase() === lower)) {
      return { country: c, displayNameHe: c.name };
    }
  }

  for (const c of countriesDatabase) {
    for (const a of c.aliases || []) {
      if (a.length > 2 && (lower === a.toLowerCase() || lower.startsWith(a.toLowerCase() + ' ') || lower.endsWith(' ' + a.toLowerCase()))) {
        return { country: c, displayNameHe: c.name };
      }
    }
  }

  return null;
}

/**
 * Forward geocoding: city or free text to country from Nominatim (via /api on prod, Vite proxy in dev).
 */
export async function geocodeLookupCountry(
  input: string,
  signal?: AbortSignal,
): Promise<NominatimResult[] | null> {
  const q = input.trim();
  if (q.length < 2) return null;

  const url = new URL(
    NOMINATIM_PATH,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
  );
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '2');

  const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  return Array.isArray(data) ? data : null;
}

export function resolveCountryFromGeocode(
  results: NominatimResult[] | null,
): { country: Country; displayNameHe: string } | { unknownLabel: string } | null {
  if (!results?.length) return null;
  const countryEn =
    results[0].address?.country || results[0].display_name?.split(',').at(-1)?.trim();
  if (!countryEn) return null;

  const match = matchCountryByEnglishName(countryEn);
  if (match) return match;

  return { unknownLabel: countryEn };
}
