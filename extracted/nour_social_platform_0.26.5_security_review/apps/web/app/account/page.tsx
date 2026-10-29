'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest, setStoredToken } from '../../lib/api';

type User = {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarKey?: string | null;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    request<{ user: User }>('/auth/me')
      .then((data) => {
        if (!alive) return;
        setUser(data.user);
        setDisplayName(data.user.displayName || '');
        setBio(data.user.bio || '');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { username, displayName, email, password };
      const data = await request<{ user: User }>(path, { method: 'POST', body: JSON.stringify(payload) });
      setUser(data.user);
      setDisplayName(data.user.displayName || '');
      setBio(data.user.bio || '');
      setPassword('');
      setNotice(mode === 'login' ? 'تم تسجيل الدخول بنجاح.' : 'تم إنشاء الحساب بنجاح.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إكمال الطلب.');
    } finally {
      setBusy(false);
    }
  }

  async function logout(allSessions = false) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/auth/logout', { method: 'POST', body: JSON.stringify({ allSessions }) });
      setUser(null);
      setNotice('تم تسجيل الخروج.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تسجيل الخروج.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await request<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio }),
      });
      setUser(data.user);
      setNotice('تم تحديث الملف الشخصي.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الملف.');
    } finally {
      setBusy(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file || !user || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const presign = await request<{ objectKey: string; uploadUrl: string; mediaType: string }>('/media/presign', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, byteSize: file.size, folder: 'avatars' }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('تعذر رفع الصورة.');
      const data = await request<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarKey: presign.objectKey }),
      });
      setUser(data.user);
      setNotice('تم تحديث الصورة الشخصية.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الصورة.');
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await request<unknown>('/auth/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nour-export-${user.username}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('تم تنزيل نسخة من بياناتك.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تصدير البيانات.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    if (!window.confirm('هل أنت متأكد من حذف الحساب؟ هذا إجراء لا يمكن التراجع عنه بسهولة.')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/auth/delete', { method: 'POST', body: JSON.stringify({ password: deletePassword }) });
      await setStoredToken(null);
      setUser(null);
      setDeletePassword('');
      setNotice('تم حذف الحساب.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف الحساب.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="page_account" className="account-page" dir="rtl">
      <a id="link_account_back_home" className="account-back" href="/">
        ← الرجوع للرئيسية
      </a>
      <section id="section_account_card" className="account-card">
        <a id="link_account_brand" className="account-brand" href="/" aria-label="نُور">
          <span className="brand-mark">ن</span>
          <span>نُور</span>
        </a>
        {user ? (
          <>
            <span className="account-eyebrow">حسابك في نُور</span>
            <h1>أهلًا بيك، {user.displayName}</h1>
            <p className="account-description">
              أنت مسجّل الدخول باسم <b dir="ltr">@{user.username}</b>.
            </p>
            <div className="account-profile">
              <span className="account-avatar">{user.displayName.slice(0, 1)}</span>
              <div>
                <b>{user.displayName}</b>
                <span dir="ltr">{user.email}</span>
              </div>
            </div>

            <form id="form_account_profile" className="account-form" onSubmit={saveProfile}>
              <label>
                الاسم الظاهر
                <input
                  id="field_account_edit_display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <label>
                نبذة قصيرة
                <textarea
                  id="field_account_edit_bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="اكتب نبذة عنك…"
                />
              </label>
              <label className="composer-file-label">
                صورة شخصية
                <input
                  id="field_account_avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
                />
              </label>
              <button id="btn_account_save_profile" className="account-submit" type="submit" disabled={busy}>
                حفظ الملف الشخصي
              </button>
            </form>

            <button id="btn_account_export" className="account-secondary" disabled={busy} onClick={() => void exportData()}>
              تصدير بياناتي (JSON)
            </button>
            <button id="btn_account_logout" className="account-submit" disabled={busy} onClick={() => void logout(false)}>
              تسجيل الخروج
            </button>
            <button id="btn_account_logout_all" className="account-secondary" disabled={busy} onClick={() => void logout(true)}>
              تسجيل الخروج من كل الجلسات
            </button>

            <form id="form_account_delete" className="account-form" onSubmit={deleteAccount} style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
              <p className="account-description">حذف الحساب (يلزم كلمة المرور)</p>
              <label>
                كلمة المرور للتأكيد
                <input
                  id="field_account_delete_password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  minLength={10}
                />
              </label>
              <button id="btn_account_delete" className="account-secondary" type="submit" disabled={busy}>
                حذف الحساب نهائيًا
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="account-eyebrow">مساحتك بتبدأ من هنا</span>
            <h1>{mode === 'login' ? 'نورت نُور من جديد' : 'خلّيك جزء من نُور'}</h1>
            <p className="account-description">
              {mode === 'login' ? 'سجّل دخولك عشان تكمل.' : 'أنشئ حسابك وابدأ رحلتك.'}
            </p>
            <div id="group_account_mode" className="account-switch" role="group" aria-label="نوع العملية">
              <button
                id="btn_account_mode_login"
                className={mode === 'login' ? 'selected' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setNotice('');
                }}
              >
                تسجيل الدخول
              </button>
              <button
                id="btn_account_mode_register"
                className={mode === 'register' ? 'selected' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                  setNotice('');
                }}
              >
                حساب جديد
              </button>
            </div>
            <form id={`form_account_${mode}`} className="account-form" onSubmit={submit}>
              {mode === 'register' && (
                <>
                  <label>
                    الاسم الظاهر
                    <input
                      id="field_account_display_name"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label>
                    اسم المستخدم <small dir="ltr">(English, numbers, _)</small>
                    <input
                      id="field_account_username"
                      dir="ltr"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z0-9_]{3,30}"
                      required
                    />
                  </label>
                </>
              )}
              <label>
                البريد الإلكتروني
                <input
                  id="field_account_email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                كلمة المرور
                <input
                  id="field_account_password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  required
                />
              </label>
              <button id="btn_account_submit" className="account-submit" type="submit" disabled={busy}>
                {busy ? 'جاري التنفيذ…' : mode === 'login' ? 'دخول آمن' : 'إنشاء الحساب'}
              </button>
            </form>
            <p className="account-security">🔒 الجلسة تُحفظ في Cookie محمية، وعلى الموبايل يُستخدم توكن آمن.</p>
          </>
        )}
        {error && (
          <p className="account-message error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="account-message success" role="status">
            {notice}
          </p>
        )}
        <p className="account-disclaimer">نسخة تطويرية: لا تستخدم كلمة مرور حقيقية قبل اكتمال اختبارات الأمان.</p>
      </section>
    </main>
  );
}
