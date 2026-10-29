/** Session token extraction: supports HttpOnly cookie (web) and Bearer (Capacitor / mobile). */

export const SESSION_COOKIE_NAME = 'nour_session';

export function readCookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function readBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match) return undefined;
  const token = match[1].trim();
  return token.length > 0 && token.length <= 200 ? token : undefined;
}

/** Prefer Authorization Bearer (mobile), fall back to session cookie (web). */
export function readSessionToken(
  cookieHeader?: string,
  authorization?: string,
): string | undefined {
  return readBearerToken(authorization) ?? readCookieValue(cookieHeader, SESSION_COOKIE_NAME);
}

export function cookieOptions(expiresAt?: Date) {
  const crossSite = process.env.COOKIE_SAMESITE === 'none' || process.env.MOBILE_CORS === '1';
  const sameSite = crossSite ? ('none' as const) : ('lax' as const);
  const secure =
    process.env.NODE_ENV === 'production' || sameSite === 'none' || process.env.COOKIE_SECURE === '1';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}
