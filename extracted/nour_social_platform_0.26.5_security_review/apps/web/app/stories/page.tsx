'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from "../../lib/api";

type Author = { id: string; username: string; displayName: string; avatarKey?: string | null };
type StoryItem = {
  id: string;
  caption: string | null;
  mediaType: string;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  url: string;
};
type StoryGroup = { author: Author; stories: StoryItem[] };
type ApiError = { message?: string | string[] };


async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export default function StoriesPage() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [active, setActive] = useState<{ groupIndex: number; storyIndex: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [pending, setPending] = useState<{ objectKey: string; mediaType: string; previewUrl: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ groups: StoryGroup[] }>('/stories');
      setGroups(data.groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل القصص.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPick(file: File | null) {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const presign = await request<{ objectKey: string; uploadUrl: string; mediaType: string }>('/media/presign', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, byteSize: file.size , folder: 'stories'}),
      });
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('تعذر رفع الصورة.');
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      setPending({
        objectKey: presign.objectKey,
        mediaType: presign.mediaType,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تجهيز القصة. يلزم تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/stories', {
        method: 'POST',
        body: JSON.stringify({
          objectKey: pending.objectKey,
          mediaType: pending.mediaType,
          caption: caption.trim() || undefined,
        }),
      });
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
      setCaption('');
      setNotice('تم نشر القصة (24 ساعة).');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر نشر القصة.');
    } finally {
      setBusy(false);
    }
  }

  async function openStory(groupIndex: number, storyIndex: number) {
    setActive({ groupIndex, storyIndex });
    const story = groups[groupIndex]?.stories[storyIndex];
    if (!story) return;
    try {
      await request(`/stories/${story.id}/view`, { method: 'POST', body: JSON.stringify({}) });
    } catch {
      // ignore view errors for anonymous / self
    }
  }

  function nextStory() {
    if (!active) return;
    const g = groups[active.groupIndex];
    if (!g) return;
    if (active.storyIndex + 1 < g.stories.length) {
      void openStory(active.groupIndex, active.storyIndex + 1);
    } else if (active.groupIndex + 1 < groups.length) {
      void openStory(active.groupIndex + 1, 0);
    } else {
      setActive(null);
    }
  }

  function prevStory() {
    if (!active) return;
    if (active.storyIndex > 0) {
      void openStory(active.groupIndex, active.storyIndex - 1);
    } else if (active.groupIndex > 0) {
      const prevGroup = groups[active.groupIndex - 1];
      void openStory(active.groupIndex - 1, Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
    }
  }

  const current =
    active && groups[active.groupIndex]
      ? groups[active.groupIndex].stories[active.storyIndex]
      : null;
  const currentAuthor = active && groups[active.groupIndex] ? groups[active.groupIndex].author : null;

  return (
    <main id="page_stories" className="feed-page" dir="rtl">
      <header id="section_stories_header" className="feed-header">
        <a id="link_stories_nav_home" href="/">نُور</a>
        <nav>
          <a id="link_stories_nav_feed" href="/feed">التغذية</a>
          <a id="link_stories_nav_messages" href="/messages">الرسائل</a>
          <a id="link_stories_nav_account" href="/account">الحساب</a>
        </nav>
      </header>

      <div className="feed-layout">
        <section id="section_stories_main" className="feed-main" style={{ gridColumn: '1 / -1' }}>
          <h1 className="feed-heading">القصص</h1>

          <form id="form_story_create" className="feed-composer" onSubmit={publish}>
            <label htmlFor="field_story_image">أضف قصة (صورة · 24 ساعة)</label>
            <input
              id="field_story_image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={e => void onPick(e.target.files?.[0] ?? null)}
            />
            {pending && (
              <div id="preview_story_image" className="composer-preview">
                <img src={pending.previewUrl} alt="معاينة" />
                <button
                  id="btn_story_image_clear"
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pending.previewUrl);
                    setPending(null);
                  }}
                >
                  إزالة
                </button>
              </div>
            )}
            <label htmlFor="field_story_caption">تعليق (اختياري)</label>
            <input
              id="field_story_caption"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={500}
              placeholder="اكتب تعليقًا…"
            />
            <div className="composer-footer">
              <button id="btn_story_publish" type="submit" disabled={busy || !pending}>
                {busy ? 'جاري التنفيذ…' : 'نشر القصة'}
              </button>
            </div>
          </form>

          {error && (
            <p className="feed-alert error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="feed-alert success" role="status">
              {notice}
            </p>
          )}

          {loading ? (
            <div className="feed-empty">جاري التحميل…</div>
          ) : groups.length === 0 ? (
            <div className="feed-empty">
              <span>✦</span>
              <h2>لا توجد قصص نشطة</h2>
              <p>تابع أشخاصًا أو انشر قصتك الأولى.</p>
            </div>
          ) : (
            <div id="list_stories_rail" className="stories-rail">
              {groups.map((g, gi) => (
                <button
                  key={g.author.id}
                  id={`btn_story_group_${g.author.id}`}
                  type="button"
                  className="stories-rail-item"
                  onClick={() => void openStory(gi, 0)}
                >
                  <span className="feed-avatar">{g.author.displayName?.slice(0, 1) || 'ن'}</span>
                  <small>{g.author.displayName}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {current && currentAuthor && (
        <div id="section_story_viewer" className="story-viewer" role="dialog" aria-modal="true">
          <div className="story-viewer-inner">
            <div className="story-viewer-top">
              <b>{currentAuthor.displayName}</b>
              <button id="btn_story_close" type="button" onClick={() => setActive(null)}>
                إغلاق
              </button>
            </div>
            <img id={`story_media_${current.id}`} src={current.url} alt="" />
            {current.caption && <p className="story-caption">{current.caption}</p>}
            <small className="story-meta">{current.viewsCount} مشاهدة</small>
            <div className="story-nav">
              <button id="btn_story_prev" type="button" onClick={prevStory}>
                السابق
              </button>
              <button id="btn_story_next" type="button" onClick={nextStory}>
                التالي
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
