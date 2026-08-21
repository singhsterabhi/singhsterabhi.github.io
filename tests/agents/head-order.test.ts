import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Task 11 built the About page, so both routes are checked.
// Task 12 added /terminal, which also renders through Base.astro, so the
// no-flash invariant applies to it too.
const pages = [
  'dist/index.html',
  'dist/about/index.html',
  'dist/terminal/index.html',
  'dist/404.html',
];

const headOf = (path: string) =>
  readFileSync(path, 'utf8')
    .split('</head>')[0]
    .replace(/<!--[\s\S]*?-->/g, '');   // comments survive into built output and
                                        // contain tag names in prose; scanning
                                        // raw text without stripping them
                                        // measures the comment, not the markup.

describe('no-flash guard (inherited from Task 5)', () => {
  for (const path of pages) {
    it(`${path}: the theme script runs before any stylesheet`, () => {
      expect(existsSync(path), 'run `pnpm build` first').toBe(true);
      const head = headOf(path);
      const scriptAt = head.search(/<script(?![^>]*\bsrc=)/);
      const styleAt = head.search(/<(link[^>]+stylesheet|style)/);
      expect(scriptAt, 'no inline script in head').toBeGreaterThan(-1);
      expect(styleAt, 'no stylesheet in head').toBeGreaterThan(-1);
      expect(scriptAt, 'script after stylesheet — this is the flash').toBeLessThan(styleAt);
    });

    it(`${path}: no inline script is deferred`, () => {
      const head = headOf(path);
      for (const tag of head.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? []) {
        expect(tag, `deferred inline script: ${tag}`).not.toMatch(/\b(defer|async)\b/);
      }
    });

    it(`${path}: the theme script is the first script or style in head`, () => {
      const head = headOf(path);
      const firstPaintish = head.search(/<(script|style|link[^>]+stylesheet)/);
      const themeScript = head.search(/<script(?![^>]*\bsrc=)/);
      expect(themeScript).toBe(firstPaintish);
    });
  }
});
