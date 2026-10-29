# Nūr V0.24.0 — Capacitor Android (APK) readiness

## Scope
- Capacitor 7 config (`capacitor.config.ts`) and mobile scripts.
- API accepts `Authorization: Bearer` in addition to `nour_session` cookie.
- Login/register return `token` for native storage.
- Shared `apps/web/lib/api.ts` client with localStorage token persistence.
- CORS expanded for Capacitor WebView origins.
- Docs: `docs/MOBILE_APK.md`.

## Verification
- Source wiring: PASS (static review).
- `pnpm install` + `cap sync` + Gradle APK: NOT VERIFIED in this environment (needs Android SDK on build machine).
