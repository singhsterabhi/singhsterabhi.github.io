import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readdirSync('dist/_astro')
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(`dist/_astro/${f}`, 'utf8'))
  .join('');

describe('font utilities actually emit rules', () => {
  for (const [cls, token] of [
    ['font-mono', '--font-mono'],
    ['font-heading', '--font-heading'],
  ] as const) {
    it(`.${cls} emits a font-family rule`, () => {
      expect(css).toContain(`.${cls}{font-family:var(${token})}`);
    });
  }

  it('no arbitrary font-family value survives in source — Tailwind v4 drops them silently', () => {
    const files = readdirSync('src', { recursive: true }) as string[];
    const offenders = files
      .filter((f) => f.endsWith('.astro') || f.endsWith('.tsx'))
      .filter((f) => readFileSync(`src/${f}`, 'utf8').includes('font-[var(--font-'));
    expect(offenders, `these use font-[var(...)], which emits nothing`).toEqual([]);
  });
});
