'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from "../../../lib/api";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string };
};
type ApiError = { message?: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ reports: Report[] }>('/reports/admin/open');
      setReports(data.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل. يلزم صلاحية إدارة.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, status: 'RESOLVED' | 'DISMISSED') {
    setBusy(true);
    try {
      await request('/reports/admin/resolve', {
        method: 'POST',
        body: JSON.stringify({ reportId: id, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحديث.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="page_admin_reports" className="feed-page" dir="rtl">
      <header className="feed-header">
        <a id="link_admin_reports_home" href="/">نُور</a>
        <nav>
          <a id="link_admin_reports_feed" href="/feed">التغذية</a>
          <a id="link_admin_reports_account" href="/account">الحساب</a>
        </nav>
      </header>
      <div className="feed-layout">
        <section className="feed-main" style={{ gridColumn: '1 / -1' }}>
          <h1 className="feed-heading">إدارة البلاغات</h1>
          <p className="messages-hint">يتطلب أن يكون اسم المستخدم ضمن ADMIN_USERNAMES في بيئة الـ API.</p>
          {error && <p className="feed-alert error">{error}</p>}
          {loading ? (
            <div className="feed-empty">جاري التحميل…</div>
          ) : reports.length === 0 ? (
            <div className="feed-empty">لا بلاغات مفتوحة.</div>
          ) : (
            <div id="list_admin_reports" className="feed-post-list">
              {reports.map(r => (
                <article id={`admin_report_${r.id}`} key={r.id} className="feed-post">
                  <b>
                    {r.reason} · {r.targetType}/{r.targetId}
                  </b>
                  <p className="feed-post-body">{r.details || '—'}</p>
                  <small>
                    من @{r.author.username} · {r.status}
                  </small>
                  <div className="feed-post-actions">
                    <button id={`btn_admin_report_resolve_${r.id}`} type="button" disabled={busy} onClick={() => void resolve(r.id, 'RESOLVED')}>
                      حلّ
                    </button>
                    <button id={`btn_admin_report_dismiss_${r.id}`} type="button" disabled={busy} onClick={() => void resolve(r.id, 'DISMISSED')}>
                      رفض
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
