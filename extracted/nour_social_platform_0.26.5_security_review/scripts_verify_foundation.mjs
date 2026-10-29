import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'apps/web/app/page.tsx',
  'apps/web/app/layout.tsx',
  'apps/web/app/globals.css',
  'apps/web/public/nour-mark.svg',
  'apps/api/src/main.ts',
  'apps/api/prisma/schema.prisma',
  'docker-compose.yml',
  '.env.example',
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error('FAIL: missing required files:', missing.join(', '));
  process.exit(1);
}
const page = readFileSync(join(root, 'apps/web/app/page.tsx'), 'utf8');
const layout = readFileSync(join(root, 'apps/web/app/layout.tsx'), 'utf8');
const css = readFileSync(join(root, 'apps/web/app/globals.css'), 'utf8');
const schema = readFileSync(join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
const checks = [
  ['Arabic RTL document root', /<html lang="ar" dir="rtl">/.test(layout)],
  ['Feature section anchor', /id="features"/.test(page)],
  ['Build-status disclosure', /حالة المشروع/.test(page)],
  ['Mobile breakpoint', /@media\s*\(max-width:\s*680px\)/.test(css)],
  ['Reduced-motion support', /prefers-reduced-motion:\s*reduce/.test(css)],
  ['Post data model exists', /model Post\s*\{/.test(schema)],
  ['Conversation data model exists', /model Conversation\s*\{/.test(schema)],
  ['Session model exists', /model AuthSession\s*\{/.test(schema)],
  ['Session tokens stored as hashes', /tokenHash String\s+@unique/.test(schema)],
  ['Auth routes registered', existsSync(join(root, 'apps/api/src/modules/auth/auth.controller.ts'))],
  ['Password hashing implemented', /scrypt/.test(readFileSync(join(root, 'apps/api/src/modules/auth/auth.service.ts'), 'utf8'))],
  ['Session token helper (cookie+Bearer)', existsSync(join(root, 'apps/api/src/common/session-token.ts'))],
  ['Social media URL helper', /withMediaUrls/.test(readFileSync(join(root, 'apps/api/src/modules/social/social.controller.ts'), 'utf8'))],
  ['Web API client for mobile', existsSync(join(root, 'apps/web/lib/api.ts'))],
  ['Capacitor config', existsSync(join(root, 'capacitor.config.ts'))],
  ['Global session revocation supported', /allSessions/.test(readFileSync(join(root, 'apps/api/src/modules/auth/auth.service.ts'), 'utf8'))],
];
let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed = true;
}
// A lightweight structural check only; this is not a substitute for Next/Nest builds.
const openBraces = (css.match(/\{/g) ?? []).length;
const closeBraces = (css.match(/\}/g) ?? []).length;
const balanced = openBraces === closeBraces;
console.log(`${balanced ? 'PASS' : 'FAIL'} CSS brace balance (${openBraces}/${closeBraces})`);
if (!balanced) failed = true;
if (failed) process.exit(1);
console.log('NOTE: structural checks only; dependency install, application build, database, and runtime remain unverified.');
