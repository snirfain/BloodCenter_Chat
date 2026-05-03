export type ResolveContext = 'travel' | 'medication' | 'disease';

export type LlmResolveResult =
  | {
      ok: true;
      countryHe: string | null;
      countryEn: string | null;
      userFacingHe: string;
      medicationCandidates: string[];
      diseaseSummaryHe: string | null;
    }
  | { ok: false; error?: string };

/**
 * קריאה ל־`/api/resolve-entity` (Vercel Function + OPENAI_API_KEY).
 * בפיתוח מקומי ללא `vercel dev` — כנראה ייכשל בשקט והזרימה תמשיך ללא LLM.
 */
export async function resolveEntityWithLlm(
  context: ResolveContext,
  query: string,
  signal?: AbortSignal,
): Promise<LlmResolveResult> {
  const q = query.trim();
  if (q.length < 2) return { ok: false, error: 'empty' };

  try {
    const res = await fetch('/api/resolve-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ context, query: q }),
      signal,
    });
    const data = (await res.json()) as LlmResolveResult & { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `http ${res.status}` };
    }
    return data;
  } catch {
    return { ok: false, error: 'network' };
  }
}
