import { describe, expect, it } from 'vitest';
import { buildHomeMarkdown, buildAboutMarkdown, buildLlmsFullTxt } from '../../src/lib/site-content';
import { ABOUT_PARAGRAPHS, POSITIONING, HOME_ABOUT_TEASER } from '../../src/lib/site-content';

const projects = [
  { slug: 'table-kit', kicker: 'open source', title: 'A headless table toolkit', summary: 'Packaged once.', tags: ['TypeScript'], repo: 'https://g/tk', featured: true },
];

// Deliberately passed oldest-first: the builder must sort, not trust the caller.
const timeline = [
  { order: 4, when: 'Aug 2018 — Sep 2019', role: 'Project Engineer · Wipro', note: 'Enterprise IT in Hyderabad.' },
  { order: 0, when: 'Jan 2026 — now', role: 'Module Lead · Media.net', note: 'Stepped up to lead it.' },
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

  it('about markdown carries the timeline, so it does not drift from the page', () => {
    const md = buildAboutMarkdown(timeline);
    expect(md).toContain("Where I've been");
    for (const t of timeline) {
      expect(md).toContain(t.when);
      expect(md).toContain(t.role);
      expect(md).toContain(t.note);
    }
  });

  it('about markdown omits the timeline heading entirely when there are none', () => {
    // Same rule as Timeline.astro: no entries means no empty heading (§13).
    expect(buildAboutMarkdown([])).not.toContain("Where I've been");
    expect(buildAboutMarkdown()).not.toContain("Where I've been");
  });

  it('llms-full carries the timeline too', () => {
    const full = buildLlmsFullTxt(projects as any, timeline);
    for (const t of timeline) expect(full).toContain(t.role);
  });

  it('the twins list the timeline newest-first even when handed it oldest-first', () => {
    const md = buildAboutMarkdown(timeline);
    expect(md.indexOf('Module Lead · Media.net')).toBeLessThan(
      md.indexOf('Project Engineer · Wipro'),
    );
  });

  it('both are valid markdown documents with a single H1', () => {
    for (const md of [buildHomeMarkdown(projects as any), buildAboutMarkdown()]) {
      expect(md.match(/^# /gm)?.length).toBe(1);
    }
  });
});
