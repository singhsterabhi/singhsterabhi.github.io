import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const path = 'dist/404.html';

describe('404 page (built output)', () => {
  it('is emitted at the root so Cloudflare serves it automatically', () => {
    expect(existsSync(path), 'run `pnpm build` first').toBe(true);
  });

  it('offers working escape hatches to Home and About', () => {
    const html = readFileSync(path, 'utf8');
    expect(html).toMatch(/href="\/"/);
    expect(html).toMatch(/href="\/about"/);
  });

  it('is excluded from indexing — a 404 must not be advertised', () => {
    expect(readFileSync(path, 'utf8')).toMatch(/<meta name="robots" content="noindex"/);
  });

  it('keeps the site voice rather than a bare browser error', () => {
    expect(readFileSync(path, 'utf8')).toContain('Nothing here.');
  });

  it('states plainly that it is a real 404', () => {
    expect(readFileSync(path, 'utf8')).toContain('genuinely, not a soft one');
  });

  it('advertises no markdown twin — there is no /404.md', () => {
    expect(readFileSync(path, 'utf8')).not.toContain('text/markdown');
  });

  it('links no résumé, per the generalised dead-link rule', () => {
    expect(readFileSync(path, 'utf8')).not.toContain('Résumé');
  });
});
