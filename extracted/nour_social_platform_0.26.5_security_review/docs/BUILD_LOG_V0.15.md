# Nūr V0.15.0 — Image Upload MVP

## Scope
- Presigned upload flow against S3-compatible storage (MinIO).
- `POST /api/media/presign` returns a time-limited PUT URL for JPEG/PNG/WebP/GIF (max 8 MB).
- Create-post accepts optional media metadata and stores `PostMedia` rows.
- Feed composer: file picker, local preview, clear button, upload-then-publish flow.
- Feed and profile post lists resolve short-lived (or public) read URLs for attached images.
- Basic CSS for preview and post images.

## Verification status in this workspace
- Source wiring: PASS (manual review).
- Static ID checks: expected PASS for new control IDs.
- Dependency install (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), MinIO bucket creation, and real browser upload: NOT VERIFIED in this environment.

## Limitations
- One image per post in the current UI (API accepts up to 4).
- No server-side content scanning or virus scan.
- No image resizing/variants yet.
- Bucket must exist and be reachable via `S3_*` env vars.
