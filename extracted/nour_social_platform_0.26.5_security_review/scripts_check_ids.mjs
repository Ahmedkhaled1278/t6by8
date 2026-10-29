import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'apps/web/app');
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name)) files.push(path);
  }
}
walk(appRoot);
let failed = false;
let literalCount = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const ids = [...source.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(m => m[1]);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) { literalCount++; if (seen.has(id)) duplicates.add(id); seen.add(id); }
  if (duplicates.size) {
    failed = true;
    console.error(`FAIL duplicate literal id in ${relative(root, file)}: ${[...duplicates].join(', ')}`);
  } else console.log(`PASS literal ids unique in ${relative(root, file)} (${ids.length})`);
}
const requiredPages = [
  ['apps/web/app/page.tsx', 'page_home'],
  ['apps/web/app/feed/page.tsx', 'page_feed'],
  ['apps/web/app/account/page.tsx', 'page_account'],
  ['apps/web/app/offline/page.tsx', 'page_offline'],
  ['apps/web/app/u/[username]/page.tsx', 'page_profile'],
  ['apps/web/app/messages/page.tsx', 'page_messages'],
  ['apps/web/app/notifications/page.tsx', 'page_notifications'],
  ['apps/web/app/search/page.tsx', 'page_search'],
  ['apps/web/app/stories/page.tsx', 'page_stories'],
];
for (const [path, id] of requiredPages) {
  const source = readFileSync(join(root, path), 'utf8');
  const ok = new RegExp(`\\bid\\s*=\\s*["']${id}["']`).test(source);
  console.log(`${ok ? 'PASS' : 'FAIL'} page id ${id}`);
  if (!ok) failed = true;
}
// Every interactive JSX element must have an explicit, testable ID.
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const interactive = [...source.matchAll(/<(a|button|input|textarea|select|form)\b([\s\S]*?)>/g)];
  const missing = [];
  for (const match of interactive) {
    if (!/\bid\s*=\s*(?:"[^"]+"|'[^']+'|\{`[^`]+`\})/.test(match[2])) {
      const line = source.slice(0, match.index).split('\n').length;
      missing.push(`${match[1]}@${line}`);
    }
  }
  if (missing.length) {
    failed = true;
    console.error(`FAIL interactive elements without id in ${relative(root, file)}: ${missing.join(', ')}`);
  } else console.log(`PASS all interactive elements have ids in ${relative(root, file)} (${interactive.length})`);
}

const feed = readFileSync(join(appRoot, 'feed/page.tsx'), 'utf8');
for (const [label, pattern] of [
  ['post id includes database id', /id=\{`post_\$\{post\.id\}`\}/],
  ['comment id includes database id', /id=\{`comment_\$\{comment\.id\}`\}/],
  ['post reaction control includes post id', /id=\{`btn_post_reaction_\$\{post\.id\}`\}/],
  ['comment control includes post id', /id=\{`btn_comment_submit_\$\{post\.id\}`\}/],
]) {
  const ok = pattern.test(feed);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
console.log(`SUMMARY files=${files.length} literal_ids=${literalCount}`);
if (failed) process.exit(1);
