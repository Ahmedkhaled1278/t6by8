'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiOrigin, apiRequest, getStoredToken } from "../../lib/api";

type UserBrief = { id: string; username: string; displayName: string; avatarKey?: string | null };
type LastMessage = { id: string; body: string | null; kind: string; createdAt: string; sender: UserBrief };
type Conversation = {
  id: string;
  type: string;
  title: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  members: UserBrief[];
  lastMessage: LastMessage | null;
};
type ChatMessage = {
  id: string;
  clientMessageId: string;
  sequence: string;
  kind: string;
  body: string | null;
  createdAt: string;
  sender: UserBrief;
};
type ApiError = { message?: string | string[] };


async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [startUsername, setStartUsername] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const data = await request<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المحادثات. يلزم تسجيل الدخول.');
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const base = apiOrigin();
    const token = getStoredToken();
    const socket = io(`${base}/ws`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;
    socket.on('message:new', (payload: { conversationId: string; message: ChatMessage }) => {
      if (payload.conversationId === activeIdRef.current) {
        setMessages(current => {
          if (current.some(m => m.id === payload.message.id)) return current;
          return [...current, payload.message];
        });
      }
      void loadConversations();
    });
    socket.on('conversation:updated', () => {
      void loadConversations();
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadConversations]);

  async function openConversation(id: string) {
    setActiveId(id);
    setLoadingChat(true);
    setError('');
    try {
      const data = await request<{ messages: ChatMessage[] }>(`/conversations/${id}/messages`);
      setMessages(data.messages);
      socketRef.current?.emit('conversation:join', { conversationId: id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الرسائل.');
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !draft.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const clientMessageId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const data = await request<{ message: ChatMessage }>(`/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim(), clientMessageId }),
      });
      setMessages(current => [...current, data.message]);
      setDraft('');
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال الرسالة.');
    } finally {
      setBusy(false);
    }
  }

  async function startDirect(event: FormEvent) {
    event.preventDefault();
    if (!startUsername.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      // Resolve username → user id via profile endpoint
      const profileRes = await request<{ profile: { id: string } }>(`/users/${encodeURIComponent(startUsername.trim())}`);
      const data = await request<{ conversation: { id: string } }>('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ userId: profileRes.profile.id }),
      });
      setStartUsername('');
      setNotice('تم فتح المحادثة.');
      await loadConversations();
      await openConversation(data.conversation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر بدء المحادثة.');
    } finally {
      setBusy(false);
    }
  }


  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupTitle.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const names = groupMembers
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const memberUserIds: string[] = [];
      for (const name of names) {
        const profileRes = await request<{ profile: { id: string } }>(`/users/${encodeURIComponent(name)}`);
        memberUserIds.push(profileRes.profile.id);
      }
      const data = await request<{ conversation: { id: string } }>('/conversations/group', {
        method: 'POST',
        body: JSON.stringify({ title: groupTitle.trim(), memberUserIds }),
      });
      setGroupTitle('');
      setGroupMembers('');
      setNotice('تم إنشاء المجموعة.');
      await loadConversations();
      await openConversation(data.conversation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء المجموعة.');
    } finally {
      setBusy(false);
    }
  }

  const active = conversations.find(c => c.id === activeId) ?? null;
  const peerName = active?.type === 'GROUP' ? (active.title || 'مجموعة') : (active?.members[0]?.displayName ?? active?.title ?? 'محادثة');

  return (
    <main id="page_messages" className="feed-page messages-page" dir="rtl">
      <header id="section_messages_header" className="feed-header">
        <a id="link_messages_nav_home" href="/">نُور</a>
        <nav>
          <a id="link_messages_nav_feed" href="/feed">التغذية</a><a id="link_messages_nav_search" href="/search">بحث</a><a id="link_messages_nav_notifications" href="/notifications">إشعارات</a>
          <a id="link_messages_nav_account" href="/account">الحساب</a>
        </nav>
      </header>

      <div id="section_messages_layout" className="messages-layout">
        <aside id="section_messages_sidebar" className="messages-sidebar">
          <h1>الرسائل</h1>
          <form id="form_messages_start" className="messages-start" onSubmit={startDirect}>
            <label htmlFor="field_messages_start_username">بدء محادثة</label>
            <div className="messages-start-row">
              <input
                id="field_messages_start_username"
                value={startUsername}
                onChange={e => setStartUsername(e.target.value)}
                placeholder="اسم المستخدم"
                maxLength={30}
              />
              <button id="btn_messages_start_submit" type="submit" disabled={busy || !startUsername.trim()}>
                ابدأ
              </button>
            </div>
          </form>
            <form id="form_messages_group" className="messages-start" onSubmit={createGroup}>
              <label htmlFor="field_messages_group_title">مجموعة جديدة</label>
              <input
                id="field_messages_group_title"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="اسم المجموعة"
                maxLength={120}
                required
              />
              <input
                id="field_messages_group_members"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
                placeholder="أعضاء: username1 username2"
                dir="ltr"
              />
              <button id="btn_messages_group_create" type="submit" disabled={busy || !groupTitle.trim()}>
                إنشاء مجموعة
              </button>
            </form>


          {loadingList ? (
            <p className="messages-hint">جاري التحميل…</p>
          ) : conversations.length === 0 ? (
            <p className="messages-hint">لا توجد محادثات بعد.</p>
          ) : (
            <ul id="list_messages_conversations" className="messages-list">
              {conversations.map(c => {
                const name = c.members[0]?.displayName ?? c.title ?? 'محادثة';
                const preview = c.lastMessage?.body ?? '—';
                return (
                  <li key={c.id}>
                    <button
                      id={`btn_conversation_${c.id}`}
                      type="button"
                      className={c.id === activeId ? 'active' : ''}
                      onClick={() => void openConversation(c.id)}
                    >
                      <b>{name}</b>
                      <small>{preview}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section id="section_messages_main" className="messages-main">
          {!activeId ? (
            <div className="feed-empty">
              <span>✦</span>
              <h2>اختر محادثة</h2>
              <p>أو ابدأ محادثة جديدة باسم المستخدم.</p>
            </div>
          ) : (
            <>
              <div id="section_messages_chat_header" className="messages-chat-header">
                <b>{peerName}</b>
              </div>
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
              <div id="list_messages_thread" className="messages-thread">
                {loadingChat ? (
                  <p className="messages-hint">جاري تحميل الرسائل…</p>
                ) : messages.length === 0 ? (
                  <p className="messages-hint">ابدأ المحادثة بأول رسالة.</p>
                ) : (
                  messages.map(m => (
                    <div id={`message_${m.id}`} data-entity-id={m.id} className="messages-bubble" key={m.id}>
                      <div className="messages-bubble-meta">
                        <b>{m.sender.displayName}</b>
                        <small>{formatDate(m.createdAt)}</small>
                      </div>
                      <p>{m.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form id="form_messages_send" className="messages-composer" onSubmit={sendMessage}>
                <input
                  id="field_messages_body"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="اكتب رسالة…"
                  maxLength={4000}
                  autoComplete="off"
                />
                <button id="btn_messages_send" type="submit" disabled={busy || !draft.trim()}>
                  إرسال
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
