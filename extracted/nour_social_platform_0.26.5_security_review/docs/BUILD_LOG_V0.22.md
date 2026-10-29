# Nūr V0.22.0 — SMTP email + Web Push

## Scope
- Optional SMTP via nodemailer (password reset + email verification).
- PushSubscription model; VAPID web-push send on in-app notifications.
- Push subscribe/unsubscribe APIs; SW push + notificationclick handlers.
- Notifications page: enable browser push button.

## Verification
- Source wiring: PASS.
- Real SMTP/VAPID delivery: NOT VERIFIED (needs keys and browser HTTPS/localhost).
