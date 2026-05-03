export const config = { runtime: 'edge' };

type Body = { context?: string; query?: string };

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function systemPrompt(context: string): string {
  if (context === 'travel') {
    return `You help a Hebrew blood-donation eligibility chatbot map free-text travel locations to a country.
Return ONLY valid JSON with keys:
- countryHe (string|null): official Hebrew country name as used in Israel (e.g. "הודו", "טנזניה"), or null
- countryEn (string|null): ISO English country name if known (e.g. "India"), or null
- userFacingHe (string): one short Hebrew phrase for the user (e.g. "הודו", "מדינת הודו")
At least one of countryHe or countryEn must be non-null when the input clearly refers to a place (city, region, or country).
If the place is ambiguous, set both to null and userFacingHe to a short Hebrew question mark phrase.`;
  }
  if (context === 'medication') {
    return `You help map user-typed medication names (Hebrew/English/brand) to names that might exist in a pharmacy database.
Return ONLY valid JSON with keys:
- medicationCandidates (array of 1-3 strings): best generic or brand names to try, in Hebrew or Latin as appropriate
If unknown, return {"medicationCandidates":[]}.`;
  }
  if (context === 'disease') {
    return `You normalize a lay description of a chronic condition into a short clinical Hebrew label for medical triage (not a diagnosis).
Return ONLY valid JSON with keys:
- diseaseSummaryHe (string|null): one short phrase in Hebrew (e.g. "סוכרת סוג 2") or null if unintelligible`;
  }
  return `Return {"error":"unknown context"}`;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      },
    });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const context = (body.context ?? '').trim();
  const query = (body.query ?? '').trim();
  if (!query || !['travel', 'medication', 'disease'].includes(context)) {
    return new Response(JSON.stringify({ ok: false, error: 'bad context or query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const sys = systemPrompt(context);
  const user = `הקלט של המשתמש:\n"""${query.replace(/"""/g, "'")}"""`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(JSON.stringify({ ok: false, error: t.slice(0, 200) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const data = (await r.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? '{}';

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'LLM JSON parse' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const countryHe =
    typeof parsed.countryHe === 'string' ? parsed.countryHe.trim() || null : null;
  const countryEn =
    typeof parsed.countryEn === 'string' ? parsed.countryEn.trim() || null : null;
  const userFacingHe =
    typeof parsed.userFacingHe === 'string' ? parsed.userFacingHe.trim() : '';
  const medicationCandidates = Array.isArray(parsed.medicationCandidates)
    ? parsed.medicationCandidates
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 5)
    : [];
  const diseaseSummaryHe =
    typeof parsed.diseaseSummaryHe === 'string'
      ? parsed.diseaseSummaryHe.trim() || null
      : null;

  const out = {
    ok: true as const,
    countryHe,
    countryEn,
    userFacingHe: userFacingHe || countryHe || countryEn || '',
    medicationCandidates,
    diseaseSummaryHe,
  };

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
