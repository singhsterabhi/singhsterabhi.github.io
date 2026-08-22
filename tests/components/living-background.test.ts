import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The wiring lives in an Astro inline <script>, which no renderer will execute
// for us, so these are source-text invariants. Comments are stripped first —
// they discuss the very identifiers being matched.
const src = readFileSync('src/components/LivingBackground.astro', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('LivingBackground — click ripple wiring', () => {
  // The obvious way to get click coordinates is to listen on the canvas, which
  // means dropping pointer-events-none. That would put a full-viewport canvas
  // over the whole page and swallow every click on every link and button.
  it('keeps the canvas pointer-events-none, so it never steals a click', () => {
    expect(src).toMatch(/pointer-events-none/);
  });

  it('listens on the window rather than the canvas', () => {
    expect(src).toMatch(/window\.addEventListener\(\s*'pointerdown'/);
  });

  it('feeds the click straight into the rain', () => {
    expect(src).toMatch(/rain\.ripple\(/);
  });

  // The dialog sits above a blurred scrim: a reaction behind it is invisible
  // work, and every keystroke in the terminal would otherwise be paid for.
  it('skips clicks inside the terminal dialog', () => {
    expect(src).toMatch(/closest\('dialog'\)/);
  });

  it('leaves the reduced-motion and stopped-loop guards to rain.ts', () => {
    // Duplicating them here would mean two places to keep in step; rain.ripple()
    // already no-ops in both cases (see tests/dom/rain.test.ts).
    const listener = src.slice(src.indexOf("window.addEventListener('pointerdown'"));
    const body = listener.slice(0, listener.indexOf('});'));
    expect(body).not.toMatch(/reducedMotion|shouldRun/);
  });
});
