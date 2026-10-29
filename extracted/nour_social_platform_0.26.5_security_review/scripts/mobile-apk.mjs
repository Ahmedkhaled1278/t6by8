#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const gradlew = join(root, 'android', 'gradlew');
if (!existsSync(gradlew)) {
  console.error('android/ project missing. Run: pnpm mobile:sync');
  process.exit(1);
}
const r = spawnSync(gradlew, ['assembleDebug'], {
  cwd: join(root, 'android'),
  stdio: 'inherit',
  env: process.env,
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('APK: android/app/build/outputs/apk/debug/app-debug.apk');
