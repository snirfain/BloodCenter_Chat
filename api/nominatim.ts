export const config = { runtime: 'edge' };

/**
 * Vercel Edge proxy to Nominatim (CORS + stable User-Agent for usage policy).
 * Pass-through query: q, format, addressdetails, limit.
 */
export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      },
    });
  }
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const u = new URL(request.url);
  const q = u.searchParams.get('q')?.trim();
  if (!q) {
    return new Response(JSON.stringify({ error: 'missing q' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const p = new URLSearchParams();
  p.set('q', q);
  p.set('format', u.searchParams.get('format') || 'json');
  p.set('addressdetails', u.searchParams.get('addressdetails') || '1');
  p.set('limit', u.searchParams.get('limit') || '2');

  const altLang = u.searchParams.get('accept-language');
  const upstream = await fetch('https://nominatim.openstreetmap.org/search?' + p.toString(), {
    headers: {
      'User-Agent': 'MDA-BloodDonation-Eligibility/1.0',
      ...(altLang ? { 'Accept-Language': altLang } : {}),
    },
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
