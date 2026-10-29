# Build plan and acceptance gates

## Product target
A web-first platform combining messaging and social publishing: direct/group chat, channels, posts, comments, reactions, follows, stories, notifications, media, moderation, then voice/video and optional bots/AI.

## Architecture rules
1. Start as a modular monolith; do not split into microservices until measurements justify it.
2. PostgreSQL is the source of truth. Redis is an acceleration and fan-out component, never the only durable store for messages.
3. All write APIs validate inputs on the server and authorize access at the service boundary.
4. Message creation must become idempotent using `(sender_id, client_message_id)` before realtime delivery is implemented.
5. Publish realtime events through a transactional outbox or another durable pattern; do not rely on Redis Pub/Sub alone for durable events.
6. Do not implement custom cryptography. E2EE is a separate milestone using a vetted protocol/library and independent review.
7. Uploads require size/type limits, content inspection strategy, private object storage, and short-lived signed URLs.
8. Every schema/API change requires migrations, tests, and compatibility review.

## Milestones
### M0 — foundation
- [x] Monorepo structure
- [x] Initial Prisma schema
- [x] Health endpoint and web shell
- [x] Local Postgres/Redis/MinIO compose
- [ ] Install and build in a clean environment
- [ ] Apply schema to a fresh database
- [ ] Automated API and web smoke tests

### M1 — identity and sessions
- Registration/login, password hashing, session rotation/revocation, email verification, rate limits, abuse controls, account deletion/export.

### M2 — messaging MVP
- Direct conversations, memberships, durable messages, idempotency, pagination, delivery/read receipts, Socket.IO gateway, outbox, reconnect/resync.

### M3 — social MVP
- Profiles, follow/block, posts, comments, reactions, feed pagination, privacy settings, stories and view records.

### M4 — media and notifications
- S3-compatible uploads, signed URLs, image/video processing, in-app notifications, web push.

### M5 — safety and trust
- Reports, moderation queue, admin audit log, rate limits, spam controls, privacy review.

### M6 — security and scale
- Threat model, dependency/license scan, SAST, integration/E2E tests, load tests, backups/restore drills, observability, deployment hardening.
- E2EE and WebRTC calls only after design and independent security review.

## Evidence policy
- PASS: executed test/build with captured result.
- FAIL: reproducible defect.
- NOT VERIFIED: not executed in the available environment.
Configuration files alone do not count as execution evidence.
