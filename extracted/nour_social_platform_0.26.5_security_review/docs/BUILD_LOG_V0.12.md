# Nūr V0.12.0 — Profiles & Follow

## Scope
- Public user profile API (`GET /api/users/:username`) returning display info, bio, public post count, follower/following counts, and whether the current viewer follows the user.
- Public posts of a user (`GET /api/users/:username/posts`).
- Authenticated follow/unfollow toggle (`POST /api/users/:userId/follow`).
- New Arabic RTL profile page at `/u/[username]` with stats, follow button (when applicable), and the user's public posts.
- Feed author names now link to the corresponding profile page.
- Identifier standard and BUILD_STATUS updated for the new page and controls.

## Verification status in this workspace
- Source wiring for new profile/follow endpoints and page: PASS (manual review).
- TypeScript syntax: expected PASS (syntax-only transpile).
- Static ID checks: expected PASS after `pnpm check:ids` (new page IDs and dynamic `btn_profile_follow_<id>` / `profile_<id>` / `link_post_author_<id>` added).
- Dependency install, semantic typecheck, production build, Prisma operations, and real browser E2E: NOT VERIFIED in this environment.

## Limitations
- Follow graph is not yet used to personalize the main feed (still public-only).
- No block UI, no private/followers-only post visibility enforcement beyond the existing visibility field, no stories.
- Email verification, rate limits, and full security review remain outside this phase.
