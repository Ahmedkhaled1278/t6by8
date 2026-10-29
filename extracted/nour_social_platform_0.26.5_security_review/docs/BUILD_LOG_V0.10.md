# Build Log — V0.10.0

- Added stable IDs to homepage navigation and CTA links.
- Added deterministic IDs to repeated feature/principle cards using stable item keys.
- Added IDs to feed navigation links, account shortcuts, and offline return link.
- Fixed the post composer label to reference `field_post_body`.
- Expanded `scripts_check_ids.mjs` to fail when interactive anchors, buttons, inputs, textareas, selects, or forms lack an explicit ID.
- Updated identifier standard, README, package versions, and BUILD_STATUS.

## Verification

- Static source ID check: PASS.
- Source structure check: PASS.
- TypeScript syntax transpilation: PASS (syntax-only).
- ZIP integrity: PASS.
- Full dependency install/build/browser runtime: NOT VERIFIED (dependencies/browser environment not available).
