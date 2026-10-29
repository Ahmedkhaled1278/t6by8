# Security hardening pass — 0.26.2

Changes made:
- Password-reset tokens are only returned in non-production environments, even if SMTP is missing.
- Email-verification requests now attempt to send the issued token by email; dev-only token exposure is disabled in production.
- Browser clients no longer persist bearer tokens in localStorage; browser requests rely on the HttpOnly cookie. Native Capacitor clients retain their token storage path.
- Android mixed content is disabled and WebView debugging is disabled by default.

Before production:
1. Configure SMTP and verify delivery end-to-end.
2. Ensure production web and API use HTTPS and correct cookie settings/CORS.
3. Review object storage bucket policy and prevent public access to private media.
4. Generate and commit `pnpm-lock.yaml` with pnpm 10.12.1.
5. Install dependencies, run Prisma generation, typecheck, build, tests, and an Android release build.

Validation status: source edits applied; dependency installation, typechecking, build, runtime, and APK were not run in this environment.


Additional 0.26.2 changes:
- Post creation rejects unknown visibility values rather than silently treating them as PUBLIC.
- Media reads always use short-lived signed URLs; `S3_PUBLIC_BASE` no longer bypasses the media access path. Confirm bucket policy is private.
- Adding a group member checks for a block in either direction, matching group creation behavior.
- Feed pagination advances from the last scanned candidate so hidden posts do not stall pagination.

Validation performed for 0.26.2:
- `node scripts_verify_foundation.mjs`: PASS.
- `node scripts_check_ids.mjs`: PASS (173 literal IDs; interactive elements checked).
- Full typecheck/build/database/runtime/APK: NOT RUN; pnpm is not installed in this environment.


## 0.26.5 — hardening follow-up

- Added per-IP throttling to password-reset token submissions and email verification request/token endpoints.
- Production startup rejects `CORS_REFLECT=1`, requires explicit `WEB_ORIGIN`, requires SMTP credentials, and requires an HTTPS S3 endpoint plus explicit bucket/access credentials.
- Updated the health endpoint version.
- Run `pnpm check:security` for source-level regression checks. These checks do not replace TypeScript, dependency, integration, or runtime tests.
