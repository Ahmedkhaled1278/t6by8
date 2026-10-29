# Nūr V0.14.0 — Composer Privacy & Media Prep

## Scope
- Add a visibility selector to the feed post composer (PUBLIC / FOLLOWERS / PRIVATE).
- Persist the chosen visibility when creating a post.
- Show a small visibility badge on non-public posts in the feed.
- Include `media` relation in post queries so the next phase (image upload) can display attachments without another schema change.

## Verification status in this workspace
- Source wiring for composer select and visibility display: PASS.
- Static ID check for `field_post_visibility`: expected PASS.
- Runtime, database, and browser tests: NOT VERIFIED.

## Next planned
- Presigned upload flow against MinIO / S3-compatible storage.
- Attach uploaded images to posts and render them in feed and profile.
