#!/usr/bin/env node
/**
 * Prepare web assets + Capacitor Android sync.
 * Prefer CAPACITOR_SERVER_URL for production social apps.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'apps/web/out');

function run(cmd, args, env = {}) {
  console.log('>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

if (process.env.CAPACITOR_SERVER_URL) {
  // Minimal placeholder so Capacitor webDir exists while shell loads remote URL
  writeFileSync(join(outDir, 'index.html'), '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>نُور</title></head><body>نُور</body></html>\n');
  console.log('Using CAPACITOR_SERVER_URL=', process.env.CAPACITOR_SERVER_URL);
} else {
  run('pnpm', ['--filter', '@nour/web', 'build'], { MOBILE_BUILD: '1' });
}

if (!existsSync(join(root, 'android'))) {
  run('pnpm', ['exec', 'cap', 'add', 'android']);
}

run('pnpm', ['exec', 'cap', 'sync', 'android']);
console.log('Done. Open Android Studio: pnpm mobile:open');
