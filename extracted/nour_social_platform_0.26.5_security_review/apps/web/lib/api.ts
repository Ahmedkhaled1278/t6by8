/**
 * Shared API client for web + Capacitor.
 * - Browser: cookies (credentials: include)
 * - Capacitor native shell: Bearer token in Preferences / localStorage
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'nour_session_token';

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  try {
    return Boolean(w.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined' || !isNativeApp()) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  // Never persist bearer tokens in browser storage. Web uses the HttpOnly session cookie.
  if (!isNativeApp()) return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore quota */
  }
  try {
    const pref = (
      window as Window & {
        Capacitor?: {
          Plugins?: {
            Preferences?: {
              set: (o: { key: string; value: string }) => Promise<void>;
              remove: (o: { key: string }) => Promise<void>;
            };
          };
        };
      }
    ).Capacitor?.Plugins?.Preferences;
    if (pref) {
      if (token) await pref.set({ key: TOKEN_KEY, value: token });
      else await pref.remove({ key: TOKEN_KEY });
    }
  } catch {
    /* optional */
  }
}

export type ApiErrorBody = { message?: string | string[]; error?: string; statusCode?: number };

function errorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== 'object') return `HTTP ${status}`;
  const body = data as ApiErrorBody;
  const msg = body.message;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  return `HTTP ${status}`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new Error('تعذر الاتصال بالخادم. تحقق من الشبكة وعنوان API.');
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 300) };
    }
  }

  if (!response.ok) {
    throw new Error(errorMessage(data, response.status));
  }

  if (path === '/auth/login' || path === '/auth/register') {
    const tokenFromBody = (data as { token?: string })?.token;
    if (tokenFromBody) await setStoredToken(tokenFromBody);
  }
  if (path === '/auth/logout') {
    await setStoredToken(null);
  }

  return data as T;
}

export function apiOrigin(): string {
  return API_BASE.replace(/\/api\/?$/, '');
}
