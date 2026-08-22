import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Nav from '../../src/components/Nav.astro';

const render = async (props: Record<string, unknown> = {}) => {
  const c = await AstroContainer.create();
  return c.renderToString(Nav as never, { props });
};

const css = readFileSync('src/styles/global.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('Nav — sticky header', () => {
  it('pins the header to the top of the viewport', async () => {
    const html = await render();
    const header = html.match(/<header[^>]*>/)![0];
    expect(header).toMatch(/\bsticky\b/);
    expect(header).toMatch(/\btop-0\b/);
  });

  // The bug this catches: making the max-width element itself sticky leaves
  // transparent gutters on wide screens, and page content scrolls up through
  // them beside the bar. The bar must be full-bleed with the width constraint
  // on an inner row.
  it('keeps the width constraint off the sticky element, so the bar is full-bleed', async () => {
    const html = await render();
    const header = html.match(/<header[^>]*>/)![0];
    expect(header, 'max-width is on the sticky element').not.toMatch(/max-w-/);
    expect(html, 'no inner row carries the width constraint').toMatch(/max-w-\[1120px\]/);
  });

  it('still renders the wordmark and every nav destination', async () => {
    const html = await render();
    expect(html).toContain('abhishek');
    expect(html).toMatch(/href="\/#work"/);
    expect(html).toMatch(/href="\/about"/);
  });

  it('marks the current page for assistive tech', async () => {
    expect(await render({ current: 'about' })).toMatch(/aria-current="page"/);
    expect(await render({ current: 'home' })).not.toMatch(/aria-current="page"/);
  });
});

describe('sticky header chrome (global.css)', () => {
  // A sticky bar covers whatever an in-page anchor scrolls to, so /#work would
  // land underneath it. Measured header height is ~84px at 1440 and ~79px at
  // 375, so the reservation has to clear that — a sticky header shipped without
  // this is a silently broken anchor on every jump.
  it('reserves the bar height for anchor jumps, and reserves enough', () => {
    const m = css.match(/scroll-padding-top:\s*([\d.]+)rem/);
    expect(m, 'no scroll-padding-top — anchors will land under the header').not.toBeNull();
    expect(Number(m![1]) * 16).toBeGreaterThanOrEqual(84);
  });

  it('falls back to an opaque bar where backdrop-filter is unsupported', () => {
    // Translucent with no blur is the one combination that makes the nav
    // illegible over scrolling content, so the fallback must exist.
    expect(css).toMatch(/@supports not \(backdrop-filter/);
    const block = css.slice(css.indexOf('@supports not (backdrop-filter'));
    expect(block).toMatch(/\.site-header\s*\{[^}]*background:\s*var\(--color-bg\)/);
  });

  it('tints the bar by mixing toward transparent, never toward black or white', () => {
    const rule = css.match(/\.site-header\s*\{[^}]*\}/)![0];
    expect(rule).toMatch(/color-mix\(in oklch, var\(--color-bg\)[^)]*transparent\)/);
    expect(rule).not.toMatch(/\b(black|white)\b/);
  });
});
