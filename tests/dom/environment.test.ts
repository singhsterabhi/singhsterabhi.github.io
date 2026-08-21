// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('gives tests/dom/** a real DOM — tasks 5, 8, 9, 10 and 11 depend on this', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });
});
