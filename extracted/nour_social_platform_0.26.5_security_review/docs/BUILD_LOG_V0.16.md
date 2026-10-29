# Nūr V0.16.0 — Messaging MVP

## Scope
- List conversations for the signed-in user.
- Get-or-create direct conversation between two users (respects blocks).
- List messages in a conversation (marks lastReadAt).
- Send text message with clientMessageId idempotency and monotonic sequence.
- Web page `/messages`: conversation list, start-by-username, thread view, send form.
- Profile page: "رسالة" button to open a direct conversation.
- Navigation links to messages from feed and profile.

## Verification status
- Source wiring: PASS (manual review).
- Static ID checks: expected PASS.
- Runtime, database, Socket.IO realtime, and browser E2E: NOT VERIFIED.

## Limitations
- No realtime push yet (refresh / re-open to see new messages).
- Text only; no media in messages.
- No group chats UI yet (schema supports GROUP).
- No delivery/read receipt UI beyond lastReadAt storage.
