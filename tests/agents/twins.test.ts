import { describe, expect, it } from 'vitest';
import { buildHomeMarkdown, buildAboutMarkdown } from '../../src/lib/site-content';
import { ABOUT_PARAGRAPHS, POSITIONING, HOME_ABOUT_TEASER } from '../../src/lib/site-content';

const projects = [
  { slug: 'table-kit', kicker: 'open source', title: 'A headless table toolkit', summary: 'Packaged once.', tags: ['TypeScript'], repo: 'https://g/tk', featured: true },
];

describe('markdown twins — generated, so they cannot drift (§11)', () => {
  it('home markdown carries the same positioning line as the page', () => {
    expect(buildHomeMarkdown(projects as any)).toContain(POSITIONING);
  });

  it('home markdown carries the same about teaser as the page', () => {
    expect(buildHomeMarkdown(projects as any)).toContain(HOME_ABOUT_TEASER);
  });

  it('home markdown lists the projects', () => {
    expect(buildHomeMarkdown(projects as any)).toContain('A headless table toolkit');
  });

  it('about markdown carries every paragraph of the page verbatim', () => {
    const md = buildAboutMarkdown();
    for (const p of ABOUT_PARAGRAPHS) expect(md).toContain(p);
  });

  it('both are valid markdown documents with a single H1', () => {
    for (const md of [buildHomeMarkdown(projects as any), buildAboutMarkdown()]) {
      expect(md.match(/^# /gm)?.length).toBe(1);
    }
  });
});
