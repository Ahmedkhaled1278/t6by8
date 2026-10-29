# Build log — V0.9.0

- Added `scripts_check_ids.mjs` to verify duplicate literal IDs within each TS/TSX file, required page IDs, and dynamic database-backed post/comment IDs.
- Added root command `pnpm check:ids`.
- Updated package versions and identifier standard to 0.9.0.
- Static checks only; full app build and browser-rendered DOM uniqueness remain NOT VERIFIED.
