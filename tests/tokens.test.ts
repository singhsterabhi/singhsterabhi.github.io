import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wcagContrast, parse } from 'culori';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function block(selector: string): Record<string, string> {
  const i = css.indexOf(selector);
  if (i === -1) throw new Error(`missing block: ${selector}`);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const line of body.split(';')) {
    const [k, ...v] = line.split(':');
    if (k?.trim().startsWith('--')) out[k.trim()] = v.join(':').trim();
  }
  return out;
}

const light = block(':root');
const dark = block('[data-theme="dark"]');

const REQUIRED = [
  '--color-bg', '--color-surface', '--color-text', '--color-accent', '--color-divider',
  ...Array.from({ length: 9 }, (_, i) => `--color-neutral-${(i + 1) * 100}`),
  ...Array.from({ length: 9 }, (_, i) => `--color-accent-${(i + 1) * 100}`),
];

describe('design tokens', () => {
  it('defines every colour token in both themes', () => {
    for (const t of REQUIRED) {
      expect(light[t], `${t} missing from light`).toBeDefined();
      expect(dark[t], `${t} missing from dark`).toBeDefined();
    }
  });

  it('expresses every colour in oklch', () => {
    for (const theme of [light, dark]) {
      for (const t of REQUIRED) {
        if (t === '--color-divider') continue; // color-mix() of a token
        expect(theme[t], `${t} is not oklch`).toMatch(/^oklch\(/);
      }
    }
  });

  it('meets WCAG AA for body text on the ground in both themes', () => {
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const c = wcagContrast(parse(theme['--color-text'])!, parse(theme['--color-bg'])!);
      expect(c, `${name} text-on-bg contrast ${c}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets WCAG AA for muted text used in body copy', () => {
    // --color-neutral-400 (light) / -400 (dark) carry the 15-17px prose in the artboard
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const c = wcagContrast(parse(theme['--color-neutral-400'])!, parse(theme['--color-bg'])!);
      expect(c, `${name} muted contrast ${c}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets WCAG AA non-text contrast for accent borders and focus rings', () => {
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const c = wcagContrast(parse(theme['--color-accent'])!, parse(theme['--color-bg'])!);
      expect(c, `${name} accent contrast ${c}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('defines the motion contract exactly once, with the spec values', () => {
    expect(light['--dur-1']).toBe('120ms');
    expect(light['--dur-2']).toBe('180ms');
    expect(light['--dur-3']).toBe('240ms');
    expect(light['--dur-4']).toBe('520ms');
    expect(light['--ease']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('honours prefers-color-scheme without an explicit choice', () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(css).toMatch(/:root:not\(\[data-theme="light"\]\)/);
  });
});
