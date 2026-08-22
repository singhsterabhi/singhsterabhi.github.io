import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  /hello@example\.com/i,
  /\bexample\.com\b/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /\bFill in\b/i,
  /lorem ipsum/i,
  /drop a real photo here/i,
  /<CHOSEN DISPLAY FACE>/,
  /oklch\(<L>/,
];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === 'node_modules' || f === 'dist' || f === '.git' || f === '.astro') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let failed = 0;
for (const file of walk('src').concat(walk('public'))) {
  const text = readFileSync(file, 'utf8');
  for (const rx of BANNED) {
    if (rx.test(text)) {
      console.log(`FAIL ${file} matches ${rx}`);
      failed++;
    }
  }
}
console.log(failed ? `\n${failed} placeholder(s) found — spec §13 forbids these reaching master.` : 'no placeholders found');
process.exit(failed ? 1 : 0);
