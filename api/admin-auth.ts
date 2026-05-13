import { ADMIN_COOKIE, signAdminToken, timingSafeEqualStr } from './_adminToken';

export const config = { runtime: 'nodejs' };

function setCookieHeader(token: string, req: Request): string {
  const secure = req.url.startsWith('https:') ? '; Secure' : '';
  const maxAge = 7 * 24 * 3600;
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'Admin auth not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { password?: string; secret?: string };
  try {
    body = (await req.json()) as { password?: string; secret?: string };
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const attempt = (body.password ?? body.secret ?? '').trim();
  if (!timingSafeEqualStr(attempt, secret)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = signAdminToken(secret);
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', setCookieHeader(token, req));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
