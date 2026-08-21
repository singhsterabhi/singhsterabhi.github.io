// Runs under node, NOT jsdom: Astro's container renderer throws under jsdom
// (NOOP_MIDDLEWARE_FN). Container-render tests belong in tests/components/;
// tests needing a real DOM belong in tests/dom/ with a jsdom pragma.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ThemeToggle from '../../src/components/ThemeToggle.astro';
import MotionToggle from '../../src/components/MotionToggle.astro';

const render = async (C: any) => (await AstroContainer.create()).renderToString(C, {});

describe('ThemeToggle', () => {
  it('is a real button, so it is keyboard reachable without extra work', async () => {
    const html = await render(ThemeToggle);
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  it('carries an accessible name — the glyph alone is not one', async () => {
    const html = await render(ThemeToggle);
    expect(html).toMatch(/aria-label="[^"]{6,}"/);
  });

  it('has a stable id for the inline script to bind to', async () => {
    expect(await render(ThemeToggle)).toContain('id="theme-toggle"');
  });
});

describe('MotionToggle', () => {
  it('is a real button', async () => {
    expect(await render(MotionToggle)).toMatch(/<button[^>]*type="button"/);
  });

  it('has a stable id for the inline script to bind to', async () => {
    expect(await render(MotionToggle)).toContain('id="motion-toggle"');
  });
});
