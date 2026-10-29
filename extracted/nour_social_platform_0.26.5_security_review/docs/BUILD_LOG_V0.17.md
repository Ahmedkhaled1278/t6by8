# Nūr V0.17.0 — Notifications & Search

## Scope
- Notification model in Prisma.
- Create notifications on follow, comment, like, and new direct message.
- `GET /api/notifications`, `POST /api/notifications/read`.
- Web page `/notifications` with mark-all-read.
- `GET /api/search?q=` for users and public posts (respects blocks).
- Web page `/search`.
- Navigation links from feed and messages.

## Verification
- Source wiring: PASS.
- Static ID checks: expected PASS.
- Runtime/database: NOT VERIFIED (schema push required for Notification table).
