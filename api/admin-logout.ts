import { ADMIN_COOKIE } from './_adminToken';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const secure = req.url.startsWith('https:') ? '; Secure' : '';
  const clear = `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', clear);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
