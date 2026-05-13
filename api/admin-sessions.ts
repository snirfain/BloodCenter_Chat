import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE, parseCookie, verifyAdminToken } from './_adminToken';

export const config = { runtime: 'nodejs' };

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminSecret || !url || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawCookie = parseCookie(req.headers.get('cookie'), ADMIN_COOKIE);
  const token = rawCookie?.trim();
  if (!verifyAdminToken(token, adminSecret)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const u = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') ?? '30', 10) || 30));
  const cursor = u.searchParams.get('cursor');

  const supabase = createClient(url, serviceKey);

  let query = supabase
    .from('medical_sessions')
    .select(
      `
      session_id,
      user_id,
      answers_log,
      final_status,
      rating,
      feedback_text,
      created_at,
      users ( phone_number )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = data ?? [];
  let nextCursor: string | null = null;
  let slice = rows;
  if (rows.length > limit) {
    nextCursor = (rows[limit - 1] as { created_at: string }).created_at;
    slice = rows.slice(0, limit);
  }

  const sessions = slice.map((row: Record<string, unknown>) => {
    const users = row.users as { phone_number?: string } | null;
    const phone = users?.phone_number ?? '';
    return {
      session_id: row.session_id,
      created_at: row.created_at,
      final_status: row.final_status,
      rating: row.rating,
      feedback_text: row.feedback_text,
      answers_log: row.answers_log,
      phone_masked: maskPhone(phone),
    };
  });

  return new Response(JSON.stringify({ ok: true, sessions, nextCursor }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
