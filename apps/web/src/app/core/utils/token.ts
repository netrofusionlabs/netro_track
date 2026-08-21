/**
 * Client-side JWT expiry check. The signature is not verified here — the API
 * still rejects a forged token. This only keeps an expired session from
 * looking "signed in" until the next 401.
 */
export function accessTokenLive(token: string | null | undefined, skewMs = 5_000): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const exp = payload['exp'];
  if (typeof exp !== 'number') return true;
  return exp * 1000 > Date.now() + skewMs;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Only in-app paths. Anything else would be an open redirect. */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  if (raw.startsWith('/login')) return '/dashboard';
  return raw;
}
