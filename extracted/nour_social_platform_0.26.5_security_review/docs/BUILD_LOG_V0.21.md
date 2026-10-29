# Nūr V0.21.0 — Auth recovery & admin reports

## Scope
- AuthToken model + emailVerifiedAt on User.
- Password forgot/reset APIs (dev returns token; no SMTP required in development).
- Email verification request/verify APIs.
- Admin open reports list + resolve/dismiss (ADMIN_USERNAMES).
- Pages: /reset-password, /admin/reports.

## Verification
- Source wiring: PASS.
- Runtime email delivery: not implemented (dev tokens only).
