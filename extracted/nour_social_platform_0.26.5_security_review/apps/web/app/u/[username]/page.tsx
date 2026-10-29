'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from "../../../lib/api";

type Author = { id: string; username: string; displayName: string; avatarKey?: string | null };
type Comment = { id: string; body: string; createdAt: string; author: Pick<Author, 'id' | 'username' | 'displayName'> };
type MediaItem = { id: string; objectKey: string; mediaType: string; byteSize: number; url?: string };
type Post = {
  id: string;
  body: string | null;
  createdAt: string;
  author: Author;
  comments?: Comment[];
  _count?: { comments: number; reactions: number };
  media?: MediaItem[];
};
type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarKey: string | null;
  createdAt: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isBlocked: boolean;
  isSelf: boolean;
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

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError('');
    try {
      const [profileRes, postsRes] = await Promise.all([
        request<{ profile: Profile }>(`/users/${encodeURIComponent(username)}`),
        request<{ posts: Post[] }>(`/users/${encodeURIComponent(username)}/posts`),
      ]);
      setProfile(profileRes.profile);
      setPosts(postsRes.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الملف الشخصي.');
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFollow() {
    if (!profile || profile.isSelf || profile.isBlocked || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request<{ following: boolean }>(`/users/${profile.id}/follow`, { method: 'POST' });
      setProfile(current =>
        current
          ? {
              ...current,
              isFollowing: result.following,
              followersCount: current.followersCount + (result.following ? 1 : -1),
            }
          : current,
      );
      setNotice(result.following ? 'تمت المتابعة.' : 'تم إلغاء المتابعة.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث المتابعة. يلزم تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  async function reportUser() {
    if (!profile || profile.isSelf || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request('/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'user', targetId: profile.id, reason: 'other', details: 'بلاغ من الملف الشخصي' }),
      });
      setNotice('تم إرسال البلاغ.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال البلاغ.');
    } finally {
      setBusy(false);
    }
  }

  async function startMessage() {
    if (!profile || profile.isSelf || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request<{ conversation: { id: string } }>('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ userId: profile.id }),
      });
      window.location.href = `/messages`; // simple: go to messages list
      setNotice('تم فتح المحادثة.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر بدء المحادثة.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!profile || profile.isSelf || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request<{ blocked: boolean }>(`/users/${profile.id}/block`, { method: 'POST' });
      if (result.blocked) {
        setNotice('تم حظر المستخدم.');
        setProfile(null);
        setPosts([]);
      } else {
        setProfile(current => (current ? { ...current, isBlocked: false, isFollowing: false } : current));
        setNotice('تم إلغاء الحظر.');
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الحظر. يلزم تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }


  return (
    <main id="page_profile" className="feed-page" dir="rtl">
      <header id="section_profile_header" className="feed-header">
        <a id="link_profile_nav_home" href="/">نُور</a>
        <nav>
          <a id="link_profile_nav_feed" href="/feed">التغذية</a>
          <a id="link_profile_nav_messages" href="/messages">الرسائل</a><a id="link_profile_nav_account" href="/account">الحساب</a>
        </nav>
      </header>

      <div id="section_profile_layout" className="feed-layout">
        <aside id="section_profile_sidebar" className="feed-sidebar">
          <p>ملف شخصي عام</p>
          <a id="link_profile_sidebar_feed" href="/feed">العودة إلى التغذية</a>
        </aside>

        <section id="section_profile_main" className="feed-main">
          {loading ? (
            <div className="feed-empty">جاري تحميل الملف الشخصي…</div>
          ) : error && !profile ? (
            <div className="feed-empty">
              <span>✦</span>
              <h2>تعذر العثور على المستخدم</h2>
              <p>{error}</p>
              <a id="link_profile_error_feed" href="/feed">العودة إلى التغذية</a>
            </div>
          ) : profile ? (
            <>
              <article id={`profile_${profile.id}`} data-entity-id={profile.id} className="feed-post profile-card">
                <div className="feed-post-author">
                  <span className="feed-avatar large">{profile.displayName?.slice(0, 1) || 'ن'}</span>
                  <div>
                    <b>{profile.displayName}</b>
                    <small dir="ltr">@{profile.username}</small>
                  </div>
                </div>
                {profile.bio && <p className="feed-post-body">{profile.bio}</p>}
                <div className="feed-post-actions profile-stats">
                  <span id="stat_profile_posts">{profile.postsCount} منشور</span>
                  <span id="stat_profile_followers">{profile.followersCount} متابع</span>
                  <span id="stat_profile_following">{profile.followingCount} يتابع</span>
                </div>
                {!profile.isSelf && (
                  <div className="composer-footer profile-actions">
                    {!profile.isBlocked && (
                      <button
                        id={`btn_profile_follow_${profile.id}`}
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleFollow()}
                      >
                        {busy ? 'جاري التنفيذ…' : profile.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                      </button>
                    )}
                    {!profile.isBlocked && (
                      <button
                        id={`btn_profile_message_${profile.id}`}
                        type="button"
                        disabled={busy}
                        onClick={() => void startMessage()}
                      >
                        رسالة
                      </button>
                    )}
                    <button
                      id={`btn_profile_block_${profile.id}`}
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleBlock()}
                      className="btn-secondary"
                    >
                      {busy ? 'جاري التنفيذ…' : profile.isBlocked ? 'إلغاء الحظر' : 'حظر'}
                    </button>
                    <button
                      id={`btn_profile_report_${profile.id}`}
                      type="button"
                      disabled={busy}
                      onClick={() => void reportUser()}
                      className="btn-secondary"
                    >
                      إبلاغ
                    </button>
                  </div>
                )}
                {profile.isSelf && <p className="composer-hint">هذا ملفك الشخصي.</p>}

              </article>

              {error && (
                <p className="feed-alert error" role="alert">
                  {error} <a id="link_profile_error_account" href="/account">افتح صفحة الحساب</a>
                </p>
              )}
              {notice && (
                <p className="feed-alert success" role="status">
                  {notice}
                </p>
              )}

              <h2 id="section_profile_posts_title" className="feed-section-title">
                المنشورات العامة
              </h2>

              {posts.length === 0 ? (
                <div className="feed-empty">
                  <span>✦</span>
                  <h2>لا توجد منشورات عامة بعد</h2>
                </div>
              ) : (
                <div id="list_profile_posts" className="feed-post-list">
                  {posts.map(post => (
                    <article
                      id={`post_${post.id}`}
                      data-entity-id={post.id}
                      className="feed-post"
                      key={post.id}
                    >
                      <div className="feed-post-author">
                        <span className="feed-avatar">{post.author.displayName?.slice(0, 1) || 'ن'}</span>
                        <div>
                          <b>{post.author.displayName}</b>
                          <small dir="ltr">
                            @{post.author.username} · {formatDate(post.createdAt)}
                          </small>
                        </div>
                      </div>
                      <p className="feed-post-body">{post.body}</p>{(post.media?.length ?? 0) > 0 && <div id={`section_post_media_${post.id}`} className="feed-post-media">{post.media?.map(m => !m.url ? null : m.mediaType?.startsWith('video/') ? <video id={`media_${m.id}`} key={m.id} src={m.url} controls playsInline preload="metadata" /> : <img id={`media_${m.id}`} key={m.id} src={m.url} alt="" loading="lazy" />)}</div>}
                      <div className="feed-post-actions">
                        <span>♡ {post._count?.reactions ?? 0}</span>
                        <span>◯ {post._count?.comments ?? 0} تعليق</span>
                      </div>
                      {(post.comments?.length ?? 0) > 0 && (
                        <div id={`section_post_comments_${post.id}`} className="feed-comments" aria-label="أحدث التعليقات">
                          {post.comments?.map(comment => (
                            <div
                              id={`comment_${comment.id}`}
                              data-entity-id={comment.id}
                              className="feed-comment"
                              key={comment.id}
                            >
                              <span className="feed-avatar small">{comment.author.displayName?.slice(0, 1) || 'ن'}</span>
                              <div className="feed-comment-content">
                                <b>{comment.author.displayName}</b>
                                <p>{comment.body}</p>
                                <small>{formatDate(comment.createdAt)}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
