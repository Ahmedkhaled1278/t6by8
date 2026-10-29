# Build log V0.8.0 — Identifier standard

- Added stable DOM identifiers for home, feed, account, and offline routes.
- Added IDs to key page sections, account form fields/actions, feed composer/actions, post records, comments, and per-post controls.
- Dynamic post/comment identifiers use their database record IDs rather than list positions.
- Added `data-entity-id` on rendered post and comment records.
- Added `docs/IDENTIFIER_STANDARD.md` with naming, uniqueness, and compatibility rules.

Verification performed in this environment: source-level checks and archive integrity checks only. Full Next/Nest production build, browser DOM uniqueness across live data, database integration, and end-to-end tests remain NOT VERIFIED because dependencies/services are not installed/running here.
