import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const entries = parse(readFileSync('src/data/projects.yaml', 'utf8')) ?? [];
const urls = entries.flatMap((e) => [e.repo, e.demo].filter(Boolean));

if (urls.length === 0) {
  console.log('no project URLs declared yet — nothing to verify');
  process.exit(0);
}

let failed = 0;
for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${url}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ---  ${url} (${err.message})`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} project link(s) do not resolve. Remove them from projects.yaml or fix them — a card must never render a dead link (spec §6).`);
  process.exit(1);
}
