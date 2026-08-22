const base = (process.argv[2] ?? 'https://singhsterabhi.pages.dev').replace(/\/$/, '');

const checks = [
  ['/robots.txt', 'text/plain'],
  ['/sitemap-index.xml', 'xml'],
  ['/llms.txt', 'text/plain'],
  ['/llms-full.txt', 'text/plain'],
  ['/index.md', 'text/markdown'],
  ['/about.md', 'text/markdown'],
  ['/.well-known/agent-card.json', 'application/json'],
];

let failed = 0;
for (const [path, expectedType] of checks) {
  try {
    const res = await fetch(base + path);
    const type = res.headers.get('content-type') ?? '';
    const ok = res.status === 200 && type.includes(expectedType);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${path} (${type || 'no content-type'})`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ---  ${path} (${err.message})`);
    failed++;
  }
}

// A real 404, not a soft 200 (§7, §11).
const missing = await fetch(base + '/definitely-not-a-page-' + Date.now());
const is404 = missing.status === 404;
console.log(`${is404 ? 'OK  ' : 'FAIL'} ${missing.status} unknown path returns a genuine 404`);
if (!is404) failed++;

// Link headers — _headers is host-specific and fails silently if malformed (§12).
const head = await fetch(base + '/', { method: 'HEAD' });
const link = head.headers.get('link') ?? '';
const hasLink = link.includes('llms.txt');
console.log(`${hasLink ? 'OK  ' : 'FAIL'} Link header advertises llms.txt (${link || 'absent'})`);
if (!hasLink) failed++;

process.exit(failed ? 1 : 0);
