'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from "../../lib/api";

type ApiError = { message?: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

function ResetPasswordInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'request' | 'reset'>(params.get('token') ? 'reset' : 'request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await request<{ success: boolean; devResetToken?: string }>('/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(
        data.devResetToken
          ? `تم إنشاء رمز استعادة (وضع التطوير): ${data.devResetToken}`
          : 'إن وُجد الحساب ستصلك تعليمات الاستعادة.',
      );
      if (data.devResetToken) {
        setToken(data.devResetToken);
        setMode('reset');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الطلب.');
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage('تم تغيير كلمة المرور. يمكنك تسجيل الدخول.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة التعيين.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="page_reset_password" className="account-page" dir="rtl">
      <div className="account-card" id="section_reset_card">
        <h1>استعادة كلمة المرور</h1>
        {mode === 'request' ? (
          <form id="form_password_forgot" className="account-form" onSubmit={onRequest}>
            <label htmlFor="field_reset_email">
              البريد الإلكتروني
              <input id="field_reset_email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <button id="btn_password_forgot" className="account-submit" type="submit" disabled={busy}>
              إرسال رابط الاستعادة
            </button>
          </form>
        ) : (
          <form id="form_password_reset" className="account-form" onSubmit={onReset}>
            <label htmlFor="field_reset_token">
              رمز الاستعادة
              <input id="field_reset_token" value={token} onChange={e => setToken(e.target.value)} required />
            </label>
            <label htmlFor="field_reset_password">
              كلمة المرور الجديدة
              <input id="field_reset_password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={10} required />
            </label>
            <button id="btn_password_reset" className="account-submit" type="submit" disabled={busy}>
              تعيين كلمة المرور
            </button>
          </form>
        )}
        {error && <p className="account-message error">{error}</p>}
        {message && <p className="account-message success">{message}</p>}
        <p className="account-disclaimer">
          <a id="link_reset_to_account" href="/account">
            العودة لتسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="account-page" dir="rtl"><div className="account-card">جاري التحميل…</div></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
