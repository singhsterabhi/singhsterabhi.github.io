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

  it('uses a lower alpha ceiling in the light theme', () => {
    const dark = createRain(cv, { reducedMotion: false, theme: 'dark' });
    const light = createRain(cv, { reducedMotion: false, theme: 'light' });
    expect(light.maxAlpha()).toBeLessThan(dark.maxAlpha());
  });
});
