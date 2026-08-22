import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLlmsTxt, buildLlmsFullTxt, POSITIONING } from '../../src/lib/site-content';

// Deliberately unsorted (gym-log first, table-kit featured) so tests that
// assert featured-first ordering actually exercise the sort.
const projects = [
  { slug: 'gym-log', kicker: 'side project', title: 'A workout tracker', summary: 'Two taps.', tags: ['React'], demo: 'https://gl.app', featured: false },
  { slug: 'table-kit', kicker: 'open source', title: 'A headless table toolkit', summary: 'Packaged once.', tags: ['TypeScript'], repo: 'https://g/tk', featured: true },
];

describe('robots.txt', () => {
  const txt = readFileSync('public/robots.txt', 'utf8');

  it('names the AI crawlers explicitly rather than relying on a wildcard (§11)', () => {
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      expect(txt).toContain(bot);
    }
  });

  it('states an allow policy for them', () => {
    expect(txt).toMatch(/Allow: \//);
  });

  it('points at the sitemap with an absolute URL', () => {
    expect(txt).toContain('Sitemap: https://singhsterabhi.pages.dev/sitemap-index.xml');
  });
});

describe('buildLlmsTxt', () => {
  const txt = buildLlmsTxt(projects as any);

  it('opens with an H1 naming the person', () => {
    expect(txt.split('\n')[0]).toBe('# Abhishek Singh');
  });

  it('states the positioning line', () => {
    expect(txt).toContain(POSITIONING);
  });

  it('lists every project with an absolute URL', () => {
    expect(txt).toContain('table-kit');
    expect(txt).toContain('https://g/tk');
    expect(txt).toContain('https://gl.app');
  });

  it('points to the résumé (when present), contact and the markdown twins', () => {
    if (existsSync('public/abhishek-singh.pdf')) {
      expect(txt).toContain('/abhishek-singh.pdf');
    }
    expect(txt).toContain('singhsterabhi@gmail.com');
    expect(txt).toContain('/index.md');
    expect(txt).toContain('/about.md');
  });

  it('advertises the agent card so a capable agent finds the tools', () => {
    expect(txt).toContain('/.well-known/agent-card.json');
  });

  it('stays concise — llms.txt is an index, not the corpus', () => {
    expect(txt.length).toBeLessThan(3000);
  });

  it('lists projects featured-first, matching every human-facing page', () => {
    expect(txt.indexOf('table-kit')).toBeLessThan(txt.indexOf('gym-log'));
  });

  it('omits the résumé line while the PDF is absent', () => {
    if (existsSync('public/abhishek-singh.pdf')) {
      expect(txt).toContain('Résumé:');
    } else {
      expect(txt).not.toContain('Résumé:');
    }
  });
});

describe('buildLlmsFullTxt', () => {
  const full = buildLlmsFullTxt(projects as any);

  it('includes the full about prose, not just a summary', () => {
    expect(full).toContain('Gorakhpur');
    expect(full).toContain('empty state that tells you what to do next');
  });

  it('includes every project summary in full', () => {
    expect(full).toContain('Packaged once.');
    expect(full).toContain('Two taps.');
  });

  it('is materially longer than llms.txt', () => {
    expect(full.length).toBeGreaterThan(buildLlmsTxt(projects as any).length);
  });
});

describe('no-links branch', () => {
  it('handles a project with no links at all — the case both real projects hit today', () => {
    const bare = [{ slug: 'bare', kicker: 'side project', title: 'A thing', summary: 'Does a thing.', tags: ['TS'], featured: false }];
    const short = buildLlmsTxt(bare as any);
    const full = buildLlmsFullTxt(bare as any);
    for (const txt of [short, full]) {
      expect(txt).toContain('bare');
      expect(txt).not.toContain('undefined');
      expect(txt).not.toMatch(/repo:\s*$/m);
      expect(txt).not.toMatch(/demo:\s*$/m);
    }
    expect(full).toContain('none published yet');
  });
});
