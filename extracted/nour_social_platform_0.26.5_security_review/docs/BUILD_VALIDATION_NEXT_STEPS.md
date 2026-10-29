# Build validation and Android APK workflow

## What was checked in the available environment

- `node scripts_verify_foundation.mjs`: PASS (static source-structure checks).
- `node scripts_check_ids.mjs`: PASS (literal IDs and interactive-element IDs).
- Local dependency installation and full build could not be run in this environment because pnpm was not installed and the package registry could not be reached. Therefore TypeScript, Next.js/NestJS production builds, database-backed tests, E2E tests, and APK generation remain unverified.

## Run CI validation

Push this repository to GitHub. The existing `.github/workflows/ci.yml` installs dependencies and runs Prisma generation/push, TypeScript checks, production builds, and Playwright E2E tests. Review the Actions run and fix any failures before release.

## Build an Android APK

1. Deploy the web app to a working HTTPS URL first. The APK workflow loads this deployed URL inside Capacitor, so it does not bundle a complete offline version of the dynamic Next.js app.
2. In GitHub, open **Actions → Build Android APK → Run workflow**.
3. Enter the deployed HTTPS URL (for example, `https://app.example.com`).
4. When the workflow succeeds, download the `nour-social-platform-debug-apk` artifact from the run summary.
5. Install and test it on a physical Android device before release.

The workflow creates a **debug APK**, not a signed production release. Do not use it as a public store release without configuring signing, secrets, and a release build.
