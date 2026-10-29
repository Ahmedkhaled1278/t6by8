'use client';

import { FormEvent, useState } from 'react';
import { apiRequest } from "../../lib/api";

type UserHit = { id: string; username: string; displayName: string; avatarKey?: string | null; bio?: string | null };
type PostHit = {
  id: string;
  body: string | null;
  createdAt: string;
  author: { id: string; username: string; displayName: string };
  _count?: { comments: number; reactions: number };
};
type ApiError = { message?: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserHit[]>([]);
  const [posts, setPosts] = useState<PostHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await request<{ users: UserHit[]; posts: PostHit[] }>(`/search?q=${encodeURIComponent(q.trim())}`);
      setUsers(data.users);
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر البحث.');
      setUsers([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="page_search" className="feed-page" dir="rtl">
      <header id="section_search_header" className="feed-header">
        <a id="link_search_nav_home" href="/">نُور</a>
        <nav>
          <a id="link_search_nav_feed" href="/feed">التغذية</a>
          <a id="link_search_nav_messages" href="/messages">الرسائل</a>
          <a id="link_search_nav_account" href="/account">الحساب</a>
        </nav>
      </header>

      <div className="feed-layout">
        <section id="section_search_main" className="feed-main" style={{ gridColumn: '1 / -1' }}>
          <h1 className="feed-heading">بحث</h1>
          <form id="form_search" className="feed-composer" onSubmit={onSearch}>
            <label htmlFor="field_search_q">ابحث عن مستخدمين أو منشورات</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="field_search_q"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="اسم مستخدم أو نص منشور…"
                maxLength={80}
                style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid #dbe4df', padding: '10px 12px', font: 'inherit' }}
              />
              <button id="btn_search_submit" type="submit" disabled={loading || !q.trim()}>
                {loading ? '…' : 'بحث'}
              </button>
            </div>
          </form>

          {error && <p className="feed-alert error" role="alert">{error}</p>}

          {searched && !loading && (
            <>
              <h2 id="section_search_users_title" className="feed-section-title">المستخدمون</h2>
              {users.length === 0 ? (
                <p className="messages-hint">لا نتائج مستخدمين.</p>
              ) : (
                <div id="list_search_users" className="feed-post-list">
                  {users.map(u => (
                    <a
                      id={`search_user_${u.id}`}
                      key={u.id}
                      href={`/u/${u.username}`}
                      className="feed-post"
                      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <b>{u.displayName}</b>
                      <small dir="ltr"> @{u.username}</small>
                      {u.bio && <p className="feed-post-body">{u.bio}</p>}
                    </a>
                  ))}
                </div>
              )}

              <h2 id="section_search_posts_title" className="feed-section-title">المنشورات</h2>
              {posts.length === 0 ? (
                <p className="messages-hint">لا نتائج منشورات.</p>
              ) : (
                <div id="list_search_posts" className="feed-post-list">
                  {posts.map(p => (
                    <article id={`search_post_${p.id}`} key={p.id} className="feed-post">
                      <div className="feed-post-author">
                        <b>
                          <a id={`link_search_post_author_${p.id}`} href={`/u/${p.author.username}`}>{p.author.displayName}</a>
                        </b>
                        <small dir="ltr">@{p.author.username}</small>
                      </div>
                      <p className="feed-post-body">{p.body}</p>
                      <div className="feed-post-actions">
                        <span>♡ {p._count?.reactions ?? 0}</span>
                        <span>◯ {p._count?.comments ?? 0}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
