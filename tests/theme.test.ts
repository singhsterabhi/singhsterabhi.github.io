import { describe, expect, it } from 'vitest';
import { resolveTheme, nextTheme, THEME_KEY } from '../src/lib/theme';
import { resolveMotion } from '../src/lib/motion';

describe('resolveTheme', () => {
  it('honours an explicit stored light choice over a dark OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('honours an explicit stored dark choice over a light OS preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('falls back to the OS preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
  it('ignores a corrupt stored value rather than throwing', () => {
    expect(resolveTheme('chartreuse', true)).toBe('dark');
  });
  it('exposes a stable storage key', () => {
    expect(THEME_KEY).toBe('theme');
  });
});

describe('nextTheme', () => {
  it('round-trips', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme(nextTheme('light'))).toBe('light');
  });
});

describe('resolveMotion', () => {
  it('defaults to reduced when the OS asks for it', () => {
    expect(resolveMotion(null, true)).toBe('reduced');
  });
  it('lets an explicit full choice override the OS flag', () => {
    // WCAG 2.2.2 wants a mechanism; a user who cannot set the OS flag,
    // and one who wants motion despite it, must both be served.
    expect(resolveMotion('full', true)).toBe('full');
  });
  it('lets an explicit reduced choice apply without the OS flag', () => {
    expect(resolveMotion('reduced', false)).toBe('reduced');
  });
});
