import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/global.css', 'utf8');

describe('motion implementation', () => {
  it('uses native CSS scroll-driven animation, not a JS library', () => {
    expect(css).toContain('animation-timeline');
    expect(css).toContain('@supports (animation-timeline: view())');
  });

  it('drives every duration and easing from the tokens, never a literal', () => {
    const reveal = css.slice(css.indexOf('.reveal'));
    expect(reveal).toMatch(/var\(--dur-\d\)/);
    expect(reveal).toMatch(/var\(--ease\)/);
    expect(reveal).not.toMatch(/\b\d+ms\b/);
  });

  it('substitutes opacity for movement under reduced motion rather than deleting it', () => {
    expect(css).toMatch(/data-motion="reduced"\][^{]*\.reveal\s*\{[^}]*opacity:\s*1/);
  });

  it('ships no animation library', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const banned of ['gsap', 'framer-motion', 'motion', 'lenis', 'animejs']) {
      expect(deps, `${banned} must not be a dependency`).not.toContain(banned);
    }
  });
});
