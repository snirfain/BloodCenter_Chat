import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'bc_admin_token';

export function signAdminToken(secret: string): string {
  const payload = {
    sub: 'admin' as const,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
  } catch {
    return false;
  }
  let parsed: { exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp?: number };
  } catch {
    return false;
  }
  if (parsed.exp !== undefined && parsed.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function parseCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
