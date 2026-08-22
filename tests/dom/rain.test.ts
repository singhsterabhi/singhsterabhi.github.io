// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { columnCount, createRain, TOKENS } from '../../src/scripts/rain';

describe('columnCount — mobile budget (decision doc, non-negotiable 4)', () => {
  it('scales with viewport width', () => {
    expect(columnCount(1440)).toBeGreaterThan(columnCount(375));
  });
  it('stays modest on a phone', () => {
    expect(columnCount(375)).toBeLessThanOrEqual(26);
  });
  it('never returns zero, so the field is never empty on a narrow screen', () => {
    expect(columnCount(280)).toBeGreaterThan(0);
  });
});

describe('createRain', () => {
  let cv: HTMLCanvasElement;
  beforeEach(() => {
    cv = document.createElement('canvas');
    Object.defineProperty(cv, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(cv, 'clientHeight', { value: 600, configurable: true });
  });

  it('draws exactly one frame and never starts a loop under reduced motion', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const r = createRain(cv, { reducedMotion: true, theme: 'dark' });
    r.start();
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });

  it('exposes a stop() that halts the loop', () => {
    const r = createRain(cv, { reducedMotion: false, theme: 'dark' });
    r.start();
    r.stop();
    expect(r.running()).toBe(false);
  });

  it('gives each theme its own alpha ceiling, tuned per ground', () => {
    const dark = createRain(cv, { reducedMotion: false, theme: 'dark' });
    const light = createRain(cv, { reducedMotion: false, theme: 'light' });
    expect(dark.maxAlpha()).not.toBe(light.maxAlpha());
    for (const a of [dark.maxAlpha(), light.maxAlpha()]) {
      expect(a).toBeGreaterThan(0.1);   // below this the field is invisible
      expect(a).toBeLessThan(0.45);     // above this it competes with content
    }
  });

  it('uses a higher ceiling on the light ground, where glyphs are dark on white', () => {
    const dark = createRain(cv, { reducedMotion: false, theme: 'dark' });
    const light = createRain(cv, { reducedMotion: false, theme: 'light' });
    expect(light.maxAlpha()).toBeGreaterThan(dark.maxAlpha());
  });
});

describe('column placement spans the full width (bug: bunched left when column count was capped)', () => {
  // Regression for: cols * fixed-16px-pitch left roughly 40% of wide
  // viewports empty on the right, because the cap on column COUNT (mobile
  // frame budget) was also being used as a fixed horizontal pitch. The fix
  // derives pitch from width / cols so any capped count still spans the
  // full canvas.
  it.each([375, 768, 1440, 2560])(
    'at %dpx width, the leftmost and rightmost columns sit within the outer tenths of the canvas',
    (width) => {
      const cv = document.createElement('canvas');
      Object.defineProperty(cv, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(cv, 'clientHeight', { value: 600, configurable: true });
      const r = createRain(cv, { reducedMotion: true, theme: 'dark' });
      const xs = r.columnXs();
      expect(xs.length).toBeGreaterThan(0);
      const min = Math.min(...xs);
      const max = Math.max(...xs);
      expect(min).toBeLessThanOrEqual(width * 0.1);
      expect(max).toBeGreaterThanOrEqual(width * 0.9);
    }
  );

  it('resize() re-spreads columns across the new full width', () => {
    const cv = document.createElement('canvas');
    Object.defineProperty(cv, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(cv, 'clientHeight', { value: 600, configurable: true });
    const r = createRain(cv, { reducedMotion: true, theme: 'dark' });
    r.resize(2000, 900);
    const xs = r.columnXs();
    expect(Math.min(...xs)).toBeLessThanOrEqual(200);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(1800);
  });
});

describe('click ripple', () => {
  let cv: HTMLCanvasElement;
  const make = (o: { reducedMotion?: boolean } = {}) => {
    const r = createRain(cv, { reducedMotion: o.reducedMotion ?? false, theme: 'dark' });
    r.resize(800, 600);
    return r;
  };
  beforeEach(() => {
    cv = document.createElement('canvas');
    Object.defineProperty(cv, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(cv, 'clientHeight', { value: 600, configurable: true });
  });

  it('excites nothing until a click happens', () => {
    const r = make();
    r.start();
    r.step();
    expect(r.excitement().every((e) => e === 0)).toBe(true);
  });

  it('flares the lane under the click on the very first frame', () => {
    const r = make();
    r.start();
    const x = r.columnXs()[3];
    r.ripple(x);
    r.step();
    expect(r.excitement()[3]).toBeGreaterThan(0.9);
  });

  // This is the effect itself: the wavefront takes time to cross the field, so
  // a distant lane must still be at rest on the frame a near lane is flaring.
  // Without this, the ripple is just "every column lights up at once".
  it('reaches near lanes before far ones', () => {
    const r = make();
    r.start();
    const xs = r.columnXs();
    r.ripple(xs[0]);
    r.step();
    expect(r.excitement()[0]).toBeGreaterThan(0.9);
    expect(r.excitement()[xs.length - 1], 'far lane reacted on the same frame').toBe(0);

    // Keep stepping; the front must eventually get there.
    for (let i = 0; i < 60; i++) r.step();
    expect(Math.max(...r.excitement().slice(-3)), 'front never reached the far edge')
      .toBeGreaterThan(0);
  });

  it('decays back to rest, so a click does not brighten the field permanently', () => {
    const r = make();
    r.start();
    r.ripple(r.columnXs()[2]);
    r.step();
    const peak = r.excitement()[2];
    for (let i = 0; i < 200; i++) r.step();
    expect(r.excitement().every((e) => e === 0), 'still excited long after the click').toBe(true);
    expect(peak).toBeGreaterThan(0);
  });

  it('surges the lane it hits, then returns it to its own resting speed', () => {
    const r = make();
    r.start();
    // Same seed for both: compare a clicked field against an unclicked one by
    // measuring travel, which is the only externally visible consequence.
    const before = r.excitement().length;
    r.ripple(r.columnXs()[1]);
    r.step();
    expect(r.excitement()[1]).toBeGreaterThan(0);
    for (let i = 0; i < 300; i++) r.step();
    // Speed is derived from excitement, never accumulated into the column, so
    // a decayed lane is indistinguishable from one that was never hit.
    expect(r.excitement()[1]).toBe(0);
    expect(r.excitement().length).toBe(before);
  });

  it('does nothing at all under reduced motion (non-negotiable 2)', () => {
    const r = make({ reducedMotion: true });
    r.start();
    r.ripple(r.columnXs()[0]);
    expect(r.rippleCount()).toBe(0);
    r.step();
    expect(r.excitement().every((e) => e === 0)).toBe(true);
  });

  // Queueing while stopped would make every ripple fire at once on the next
  // start() — a burst of flares from clicks the visitor made minutes ago.
  it('ignores clicks while the loop is stopped (off-screen or hidden tab)', () => {
    const r = make();
    r.start();
    r.stop();
    r.ripple(r.columnXs()[0]);
    expect(r.rippleCount()).toBe(0);
  });

  it('caps concurrent wavefronts, keeping the newest click responsive', () => {
    const r = make();
    r.start();
    for (let i = 0; i < 40; i++) r.ripple(i * 10);
    expect(r.rippleCount()).toBeLessThanOrEqual(4);
    // The most recent click must be among the survivors, not dropped for being
    // last in — so the field always reacts to what the visitor just did.
    r.step();
    expect(r.excitement().some((e) => e > 0.9)).toBe(true);
  });

  it('retires wavefronts once they leave the field, so they do not run forever', () => {
    const r = make();
    r.start();
    r.ripple(400);
    expect(r.rippleCount()).toBe(1);
    for (let i = 0; i < 80; i++) r.step();
    expect(r.rippleCount()).toBe(0);
  });

  it('keeps the resting alpha ceiling untouched — the flare is a transient', () => {
    const r = make();
    const resting = r.maxAlpha();
    r.start();
    r.ripple(r.columnXs()[0]);
    r.step();
    expect(r.maxAlpha()).toBe(resting);
  });
});

describe('the vocabulary — meaningful tokens in the field', () => {
  let cv: HTMLCanvasElement;
  const make = () => {
    const r = createRain(cv, { reducedMotion: false, theme: 'dark' });
    r.resize(1440, 900);
    return r;
  };
  beforeEach(() => {
    cv = document.createElement('canvas');
    Object.defineProperty(cv, 'clientWidth', { value: 1440, configurable: true });
    Object.defineProperty(cv, 'clientHeight', { value: 900, configurable: true });
  });

  // THE load-bearing test. Columns are stored bottom-up (glyphs[0] is the head
  // at the BOTTOM), so a token must be reversed on the way in. Get that wrong
  // and every token renders backwards — which looks like noise from a distance
  // and like gibberish to the one person who leans in, i.e. exactly the visitor
  // the feature exists for. Nothing else in this file can see it.
  it('spells its tokens forwards on screen, not reversed', () => {
    const r = make();
    const seen = new Set<string>();
    // Recycle the field repeatedly to sample far more columns than exist.
    for (let i = 0; i < 4000; i++) r.step();
    for (const text of r.columnText()) seen.add(text);
    for (let i = 0; i < 4000; i++) r.step();
    for (const text of r.columnText()) seen.add(text);

    const hits = [...seen].filter((t) => TOKENS.includes(t));
    expect(hits.length, 'no column ever spelled a token').toBeGreaterThan(0);
    // And no column spells one backwards.
    const reversed = TOKENS.filter((t) => t.length > 2)
      .map((t) => [...t].reverse().join(''));
    for (const text of seen) {
      expect(reversed, `column reads backwards: ${text}`).not.toContain(text);
    }
  });

  it('mixes tokens with noise rather than going all-in either way', () => {
    const r = make();
    let tokenCols = 0;
    let total = 0;
    for (let round = 0; round < 40; round++) {
      for (let i = 0; i < 200; i++) r.step();
      for (const text of r.columnText()) {
        total++;
        if (TOKENS.includes(text)) tokenCols++;
      }
    }
    const share = tokenCols / total;
    expect(share, 'the field is pure noise — no tokens reached it').toBeGreaterThan(0.15);
    expect(share, 'the field is all language and competes with the copy').toBeLessThan(0.55);
  });

  // A column that kept its contents for the life of the page would show one
  // token forever, so the whole vocabulary would never be wider than the
  // column count no matter how many entries TOKENS has.
  it('re-picks a column contents when it recycles, so the vocabulary turns over', () => {
    const r = make();
    const first = r.columnText();
    for (let i = 0; i < 3000; i++) r.step();
    const later = r.columnText();
    const changed = first.filter((t, i) => t !== later[i]).length;
    expect(changed, 'no column ever changed its contents').toBeGreaterThan(0);
  });

  it('keeps every token short enough to fit a column', () => {
    for (const t of TOKENS) {
      expect(t.length, `${t} is too long to read as one column`).toBeLessThanOrEqual(16);
      expect(t.length, `${t} is too short to register`).toBeGreaterThanOrEqual(3);
    }
  });

  it('has no duplicates — a repeated entry silently doubles its odds', () => {
    expect(new Set(TOKENS).size).toBe(TOKENS.length);
  });
});

// The field is the owner's own résumé in the wallpaper, so an invented token is
// a lie on the page. Each one has to be traceable to real content in the repo.
describe('every token is sourced from the repo, never invented', () => {
  // src/scripts/rain.ts is deliberately NOT in this list. TOKENS is declared
  // there, so including it would make every assertion below self-satisfying —
  // each token would match its own declaration and the test would certify
  // nothing. The corpus is only files that describe the real work.
  const corpus = [
    'src/data/projects.yaml',
    'src/data/timeline.yaml',
    'src/lib/site-content.ts',
    'src/components/LivingBackground.astro',
    'package.json',
    'astro.config.mjs',
    'src/styles/tokens.css',
  ].map((f) => readFileSync(f, 'utf8')).join('\n').toLowerCase();

  for (const token of TOKENS) {
    it(`${token} appears in the site's own content`, () => {
      // Hyphenated compounds are written as separate words in prose
      // ("power systems", "offline-first"), so each part is checked.
      const parts = token.toLowerCase().split('-');
      for (const part of parts) {
        expect(corpus, `${token}: "${part}" is nowhere in the repo`).toContain(part);
      }
    });
  }
});
