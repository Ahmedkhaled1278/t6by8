# Nūr V0.11.0 — Browser / End-to-End Test Phase

## Scope
- Add Playwright configuration for the production-built web app and API.
- Add an end-to-end account and social flow: registration, publishing a public post, commenting, reacting, logout, and login.
- Add rendered-DOM checks for duplicate IDs and interactive elements without IDs on the home, feed, account, and offline pages.
- Extend CI to provision PostgreSQL, generate Prisma Client, push the schema, typecheck/build, install Chromium, and run browser tests.

## Verification status in this workspace
- `node scripts_check_ids.mjs`: PASS (60 literal IDs; all detected interactive source elements have IDs; dynamic post/comment ID rules pass).
- `node scripts_verify_foundation.mjs`: PASS for the documented structural checks.
- TypeScript syntax transpilation: PASS for 18 TS/TSX files; this is syntax-only, not semantic typechecking.
- JSON manifests: PASS parsing for root/web/API package manifests and build status.
- Playwright execution: NOT VERIFIED in this workspace until dependencies, PostgreSQL, and browser binaries can be installed and the tests actually run.
- Production build, semantic typecheck, Prisma database operations, and real browser execution must not be inferred from the presence of CI configuration.

## Limitations
- The CI workflow is configured to run the integration flow on GitHub Actions, but its result remains unknown until the workflow executes.
- Email verification, password reset, rate limiting, and production security review remain outside this phase.
