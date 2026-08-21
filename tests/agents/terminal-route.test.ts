import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const path = 'dist/terminal/index.html';

describe('/terminal alias route (built output)', () => {
  it('is emitted', () => {
    expect(existsSync(path), 'run `pnpm build` first').toBe(true);
  });

  it('canonicalises to Home, because it is an alias not a page', () => {
    const html = readFileSync(path, 'utf8');
    expect(html).toContain('<link rel="canonical" href="https://singhsterabhi.pages.dev/"');
    expect(html).not.toContain('rel="canonical" href="https://singhsterabhi.pages.dev/terminal"');
  });

  it('advertises no markdown twin — there is no /terminal.md', () => {
    expect(readFileSync(path, 'utf8')).not.toContain('text/markdown');
  });

  it('links no résumé, per the generalised dead-link rule', () => {
    expect(readFileSync(path, 'utf8')).not.toContain('Résumé');
  });
});
