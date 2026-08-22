// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { columnCount, createRain } from '../../src/scripts/rain';

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
