import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const sources = walk('src').filter((f) => /\.(astro|tsx|ts|css)$/.test(f));

describe('theme safety — a colour must resolve sensibly in BOTH themes', () => {
  // The bug this catches: `color-mix(in oklch, var(--color-bg) 84%, black)`
  // reads as a subtly recessed panel on a dark ground and as a mid-grey slab on
  // a near-white one. Darkening toward a literal is a dark-theme idiom; whether
  // a panel should go darker or lighter than its ground is exactly the thing
  // that flips between themes, so it belongs in a token, not a component.
  it('never mixes a theme token toward a literal black or white', () => {
    const offenders = sources.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [...text.matchAll(/color-mix\([^)]*?var\(--color-[^)]*\)[^)]*?,\s*(black|white)\s*\)/g)].map(
        (m) => `${file}: ${m[0]}`,
      );
    });
    expect(offenders).toEqual([]);
  });

  it('defines every panel and scrim token in all three theme blocks', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    for (const token of ['--color-panel', '--color-scrim']) {
      // light :root, [data-theme="dark"], and the prefers-color-scheme guard.
      expect(css.split(`${token}:`).length - 1).toBe(3);
    }
  });

  it('keeps the scrim translucent, so the page still reads behind the dialog', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    for (const decl of css.match(/--color-scrim:[^;]+;/g) ?? []) {
      expect(decl).toContain('transparent');
    }
  });
});
