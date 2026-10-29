'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from "../../lib/api";

type Author = { id: string; username: string; displayName: string; avatarKey?: string | null };
type Comment = { id: string; body: string; createdAt: string; author: Pick<Author, 'id' | 'username' | 'displayName'> };
type MediaItem = { id: string; objectKey: string; mediaType: string; byteSize: number; url?: string };
type Post = { id: string; body: string | null; createdAt: string; visibility?: string; author: Author; comments?: Comment[]; _count?: { comments: number; reactions: number }; media?: MediaItem[] };
type ApiError = { message?: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return ''; }
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'>('PUBLIC');
  const [pendingMedia, setPendingMedia] = useState<{ objectKey: string; mediaType: string; byteSize: number; previewUrl: string } | null>(null);
  const [scope, setScope] = useState<'all' | 'following'>('all');
  const [meId, setMeId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPosts = useCallback(async (cursor?: string | null, append = false) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (scope === 'following') params.set('scope', 'following');
      if (cursor) params.set('before', cursor);
      const q = params.toString() ? `?${params}` : '';
      const data = await request<{ posts: Post[]; nextCursor?: string | null }>(`/posts${q}`);
      setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المنشورات.');
    } finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  useEffect(() => {
    request<{ user: { id: string } }>('/auth/me')
      .then((d) => setMeId(d.user.id))
      .catch(() => setMeId(null));
  }, []);

  async function onPickImage(file: File | null) {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const presign = await request<{ objectKey: string; uploadUrl: string; mediaType: string; byteSize?: number }>('/media/presign', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, byteSize: file.size, folder: 'posts' }),
      });
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('تعذر رفع الملف إلى التخزين.');
      if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
      setPendingMedia({
        objectKey: presign.objectKey,
        mediaType: presign.mediaType || file.type,
        byteSize: file.size,
        previewUrl: URL.createObjectURL(file),
      });
      setNotice('تم تجهيز الوسائط للنشر.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تجهيز الوسائط. يلزم تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {

    event.preventDefault(); if (!draft.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request('/posts', { method: 'POST', body: JSON.stringify({ body: draft.trim(), visibility, media: pendingMedia ? [{ objectKey: pendingMedia.objectKey, mediaType: pendingMedia.mediaType, byteSize: pendingMedia.byteSize }] : [] }) });
      setDraft(''); setVisibility('PUBLIC'); if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl); setPendingMedia(null); setNotice('تم نشر منشورك.'); await loadPosts();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر نشر المنشور.'); }
    finally { setBusy(false); }
  }

  async function addComment(postId: string) {
    const body = commentDrafts[postId]?.trim(); if (!body || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
      setCommentDrafts(current => ({ ...current, [postId]: '' })); setNotice('تمت إضافة التعليق.'); await loadPosts();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إضافة التعليق.'); }
    finally { setBusy(false); }
  }

  async function saveEdit(postId: string) {
    if (!editBody.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editBody.trim() }),
      });
      setEditId(null);
      setEditBody('');
      setNotice('تم تعديل المنشور.');
      await loadPosts();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر التعديل.'); }
    finally { setBusy(false); }
  }

  async function deletePost(postId: string) {
    if (busy) return;
    if (!window.confirm('حذف المنشور؟')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      setNotice('تم حذف المنشور.');
      await loadPosts();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف المنشور.'); }
    finally { setBusy(false); }
  }

  async function toggleReaction(postId: string) {
    setBusy(true); setError(''); setNotice('');
    try { await request(`/posts/${encodeURIComponent(postId)}/reactions`, { method: 'POST', body: '{}' }); setNotice('تم تحديث تفاعلك.'); await loadPosts(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تسجيل التفاعل.'); }
    finally { setBusy(false); }
  }

  return <main id="page_feed" className="feed-page" dir="rtl">
    <header id="section_feed_header" className="feed-header"><a id="link_feed_brand" className="brand" href="/"><span className="brand-mark">ن</span><span>نُور</span></a><nav id="nav_feed_primary"><a id="link_feed_nav_home" href="/">الرئيسية</a><a id="link_feed_nav_feed" className="active" href="/feed">المنشورات</a><a id="link_feed_nav_account" href="/account">حسابك</a></nav><a id="link_feed_account" className="feed-account-link" href="/account">تسجيل الدخول / حساب جديد</a></header>
    <div id="section_feed_layout" className="feed-layout">
      <aside id="section_feed_sidebar" className="feed-sidebar"><div className="feed-side-card"><span className="feed-side-mark">ن</span><h2>مساحة نُور</h2><p>منشورات عامة من مجتمع نُور.</p><a id="link_feed_sidebar_account" href="/account">إدارة الحساب ←</a></div><div className="feed-side-note">شارك باحترام، وتذكّر إن خصوصية الناس مهمة.</div></aside>
      <section id="section_feed_main" className="feed-main"><div className="feed-heading"><div><span className="section-kicker">المجتمع</span><h1>المنشورات</h1><p>تابع الأفكار وشارك اللي يهمك.</p></div><div className="feed-scope">
            <button id="btn_feed_scope_all" type="button" className={scope === 'all' ? 'selected' : ''} onClick={() => setScope('all')}>الكل</button>
            <button id="btn_feed_scope_following" type="button" className={scope === 'following' ? 'selected' : ''} onClick={() => setScope('following')}>أتابعهم</button>
            <button id="btn_feed_refresh" className="feed-refresh" onClick={() => void loadPosts()} disabled={loading}>↻ تحديث</button>
          </div></div>
        <form id="form_post_create" className="feed-composer" onSubmit={createPost}><label htmlFor="field_post_body">إيه اللي حابب تشاركه؟</label><textarea id="field_post_body" value={draft} onChange={e => setDraft(e.target.value)} maxLength={5000} rows={4} placeholder="اكتب منشورك هنا…" required /><div className="composer-meta"><label htmlFor="field_post_visibility">الخصوصية</label><select id="field_post_visibility" value={visibility} onChange={e => setVisibility(e.target.value as 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE')}><option value="PUBLIC">عام</option><option value="FOLLOWERS">المتابعون فقط</option><option value="PRIVATE">خاص</option></select><label htmlFor="field_post_image" className="composer-file-label">صورة / فيديو</label><input id="field_post_image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => void onPickImage(e.target.files?.[0] ?? null)} /></div>{pendingMedia && <div id="preview_post_image" className="composer-preview">{pendingMedia.mediaType?.startsWith('video/') ? <video src={pendingMedia.previewUrl} controls playsInline preload="metadata" /> : <img src={pendingMedia.previewUrl} alt="معاينة الوسائط" />}<button id="btn_post_image_clear" type="button" onClick={() => { URL.revokeObjectURL(pendingMedia.previewUrl); setPendingMedia(null); }}>إزالة</button></div>}<div className="composer-footer"><small>{draft.length}/5000</small><button id="btn_post_create_submit" type="submit" disabled={busy || !draft.trim()}>{busy ? 'جاري التنفيذ…' : 'نشر المنشور'}</button></div><p className="composer-hint">النشر يتطلب تسجيل الدخول. اختر مستوى الخصوصية المناسب.</p></form>
        {error && <p className="feed-alert error" role="alert">{error} <a id="link_feed_error_account" href="/account">افتح صفحة الحساب</a></p>}
        {notice && <p className="feed-alert success" role="status">{notice}</p>}
        {loading ? <div className="feed-empty">جاري تحميل المنشورات…</div> : posts.length === 0 ? <div className="feed-empty"><span>✦</span><h2>لسه مفيش منشورات</h2><p>لو عندك حساب، ابدأ أول منشور في نُور.</p></div> : <div id="list_feed_posts" className="feed-post-list">{posts.map(post => <article id={`post_${post.id}`} data-entity-id={post.id} className="feed-post" key={post.id}><div className="feed-post-author"><span className="feed-avatar">{post.author.displayName?.slice(0, 1) || 'ن'}</span><div><b><a id={`link_post_author_${post.id}`} href={`/u/${post.author.username}`}>{post.author.displayName}</a></b><small dir="ltr">@{post.author.username} · {formatDate(post.createdAt)}{post.visibility && post.visibility !== 'PUBLIC' ? ` · ${post.visibility === 'FOLLOWERS' ? 'المتابعون' : 'خاص'}` : ''}</small></div></div><p className="feed-post-body">{post.body}</p>{(post.media?.length ?? 0) > 0 && <div id={`section_post_media_${post.id}`} className="feed-post-media">{post.media?.map(m => !m.url ? null : m.mediaType?.startsWith('video/') ? <video id={`media_${m.id}`} key={m.id} src={m.url} controls playsInline preload="metadata" /> : <img id={`media_${m.id}`} key={m.id} src={m.url} alt="" loading="lazy" />)}</div>}<div className="feed-post-actions"><button id={`btn_post_reaction_${post.id}`} data-action="post-reaction" disabled={busy} onClick={() => void toggleReaction(post.id)}>♡ إعجاب ({post._count?.reactions ?? 0})</button><span>◯ {post._count?.comments ?? 0} تعليق</span>{meId && post.author.id === meId ? <>
          <button id={`btn_post_edit_${post.id}`} type="button" disabled={busy} onClick={() => { setEditId(post.id); setEditBody(post.body || ''); }}>تعديل</button>
          <button id={`btn_post_delete_${post.id}`} type="button" disabled={busy} onClick={() => void deletePost(post.id)}>حذف</button>
        </> : null}</div>
        {editId === post.id ? <div id={`form_post_edit_${post.id}`} className="feed-comment-form">
          <textarea id={`field_post_edit_body_${post.id}`} value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={5000} rows={3} />
          <button id={`btn_post_edit_save_${post.id}`} type="button" disabled={busy || !editBody.trim()} onClick={() => void saveEdit(post.id)}>حفظ</button>
          <button id={`btn_post_edit_cancel_${post.id}`} type="button" onClick={() => setEditId(null)}>إلغاء</button>
        </div> : null}{(post.comments?.length ?? 0) > 0 && <div id={`section_post_comments_${post.id}`} className="feed-comments" aria-label="أحدث التعليقات">{post.comments?.map(comment => <div id={`comment_${comment.id}`} data-entity-id={comment.id} className="feed-comment" key={comment.id}><span className="feed-avatar small">{comment.author.displayName?.slice(0, 1) || 'ن'}</span><div className="feed-comment-content"><b>{comment.author.displayName}</b><p>{comment.body}</p><small>{formatDate(comment.createdAt)}</small></div></div>)}</div>}<div id={`form_comment_${post.id}`} className="feed-comment-form"><input id={`field_comment_body_${post.id}`} aria-label="اكتب تعليقًا" value={commentDrafts[post.id] ?? ''} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} maxLength={3000} placeholder="اكتب تعليقًا…" /><button id={`btn_comment_submit_${post.id}`} disabled={busy || !(commentDrafts[post.id] ?? '').trim()} onClick={() => void addComment(post.id)}>تعليق</button></div></article>)}</div>}
        {nextCursor ? <button id="btn_feed_load_more" type="button" className="feed-refresh" disabled={loading} onClick={() => void loadPosts(nextCursor, true)}>تحميل المزيد</button> : null}
      </section>
    </div>
  </main>;
}
