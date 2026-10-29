#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const checks = [
  ['production CORS reflection rejected', 'apps/api/src/main.ts', "production && process.env.CORS_REFLECT === '1'"],
  ['production WEB_ORIGIN required', 'apps/api/src/main.ts', "production && !raw"],
  ['production WEB_ORIGIN HTTPS validation', 'apps/api/src/main.ts', "parsed.protocol !== 'https:' || parsed.origin !== origin"],
  ['password reset rate limited', 'apps/api/src/modules/auth/auth.controller.ts', "'auth-reset'"],
  ['email verification request rate limited', 'apps/api/src/modules/auth/auth.controller.ts', "'email-request-verification'"],
  ['email verification token attempts rate limited', 'apps/api/src/modules/auth/auth.controller.ts', "'email-verify'"],
  ['production S3 configuration validated', 'apps/api/src/modules/media/media.service.ts', 'Missing required production media configuration'],
  ['production S3 endpoint requires HTTPS', 'apps/api/src/modules/media/media.service.ts', "endpoint.startsWith('https://')"],
  ['production SMTP configuration required', 'apps/api/src/modules/mail/mail.service.ts', 'are required in production'],
];
let failed = 0;
for (const [label, file, needle] of checks) {
  const content = readFileSync(resolve(root, file), 'utf8');
  if (content.includes(needle)) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failed += 1; }
}
console.log(`SUMMARY checks=${checks.length} failed=${failed}`);
process.exitCode = failed ? 1 : 0;
