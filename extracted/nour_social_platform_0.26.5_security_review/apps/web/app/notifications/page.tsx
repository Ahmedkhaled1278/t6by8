'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from "../../lib/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  readAt: string | null;
  createdAt: string;
};
type ApiError = { message?: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الإشعارات. يلزم تسجيل الدخول.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  
  async function enablePush() {
    setBusy(true); setError(''); setPushStatus('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('المتصفح لا يدعم الإشعارات الفورية.');
      }
      const vapid = await request<{ publicKey: string | null; enabled: boolean }>('/push/vapid-public-key');
      if (!vapid.enabled || !vapid.publicKey) throw new Error('Web Push غير مفعّل على الخادم (VAPID).');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('تم رفض إذن الإشعارات.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const json = sub.toJSON();
      await request('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      setPushStatus('تم تفعيل إشعارات المتصفح.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تفعيل الإشعارات.');
    } finally {
      setBusy(false);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    try {
      await request('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الإشعارات.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="page_notifications" className="feed-page" dir="rtl">
      <header id="section_notifications_header" className="feed-header">
        <a id="link_notifications_nav_home" href="/">نُور</a>
        <nav>
          <a id="link_notifications_nav_feed" href="/feed">التغذية</a>
          <a id="link_notifications_nav_messages" href="/messages">الرسائل</a>
          <a id="link_notifications_nav_account" href="/account">الحساب</a>
        </nav>
      </header>

      <div className="feed-layout">
        <section id="section_notifications_main" className="feed-main" style={{ gridColumn: '1 / -1' }}>
          <div className="feed-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h1>الإشعارات {unreadCount > 0 ? `(${unreadCount})` : ''}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button id="btn_notifications_enable_push" type="button" disabled={busy} onClick={() => void enablePush()}>
                تفعيل إشعارات المتصفح
              </button>
              <button id="btn_notifications_mark_read" type="button" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>
                تعليم الكل كمقروء
              </button>
            </div>
          </div>

          {error && <p className="feed-alert error" role="alert">{error}</p>}
          {pushStatus && <p className="feed-alert success" role="status">{pushStatus}</p>}
          {loading ? (
            <div className="feed-empty">جاري التحميل…</div>
          ) : items.length === 0 ? (
            <div className="feed-empty">
              <span>✦</span>
              <h2>لا توجد إشعارات</h2>
            </div>
          ) : (
            <div id="list_notifications" className="feed-post-list">
              {items.map(n => (
                <article
                  id={`notification_${n.id}`}
                  data-entity-id={n.id}
                  key={n.id}
                  className="feed-post"
                  style={{ opacity: n.readAt ? 0.75 : 1 }}
                >
                  <b>{n.title}</b>
                  {n.body && <p className="feed-post-body">{n.body}</p>}
                  <small style={{ color: '#80918a' }}>{formatDate(n.createdAt)} · {n.type}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
