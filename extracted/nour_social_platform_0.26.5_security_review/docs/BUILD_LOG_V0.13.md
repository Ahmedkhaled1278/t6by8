# Nūr V0.13.0 — Block & Privacy Enforcement

## Scope
- Authenticated block / unblock (`POST /api/users/:userId/block`).
- Blocking removes any existing follow relationship in both directions.
- Mutual block hides the profile and all posts of the other user.
- Post visibility is now enforced:
  - PUBLIC: visible to everyone
  - FOLLOWERS: visible only to the author and their followers
  - PRIVATE: visible only to the author
- Feed listing, user posts, comments and reactions all respect visibility and blocks.
- Profile page UI: Block / Unblock button.

## Verification status in this workspace
- Source wiring for block + privacy helpers: PASS (manual review).
- Static ID checks: expected PASS (`btn_profile_block_<id>` added).
- Dependency install, semantic typecheck, production build, Prisma operations, and real browser E2E: NOT VERIFIED.

## Limitations
- No mute (only hard block).
- No UI yet to choose visibility when composing a post (API already accepts it).
- No block list management page.
- Stories, media upload, messaging and notifications remain future work.
