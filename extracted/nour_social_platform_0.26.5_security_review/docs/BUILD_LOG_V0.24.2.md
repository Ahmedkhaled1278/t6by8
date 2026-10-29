# Nūr V0.24.2 — Runtime bugfix batch

## Fixes
- Global `DatabaseModule` (single Prisma client)
- Auth module no longer duplicates Prisma
- `withMediaUrls` converts `byteSize` BigInt → number (prevents JSON crash)
- Direct conversations matched only when exactly two members
- Message sequence allocation retries on unique conflicts
- `cookie-parser` enabled in API bootstrap
- Media presign supports `folder`: posts | stories | avatars
- Stories upload uses `folder: 'stories'`
- API client clearer offline / Nest error messages

## Still NOT verified in this environment
- Full `pnpm install` + `pnpm build` + DB e2e
- Android APK Gradle build
