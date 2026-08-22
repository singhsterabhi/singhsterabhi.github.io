import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wcagContrast, parse, oklch, inGamut } from 'culori';

const css = readFileSync('src/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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

// culori's parse() returns a union of colour spaces; oklch() narrows it so .l
// is actually typed.
const L = (v: string) => oklch(parse(v))!.l;

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

  it('meets WCAG AA for accent-2 error text in both themes', () => {
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const c = wcagContrast(parse(theme['--color-accent-2-300'])!, parse(theme['--color-bg'])!);
      expect(c, `${name} accent-2-300 contrast ${c}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The bug this catches: light mode shipped with --color-surface DARKER than
  // --color-bg, so every elevated component (cards, chips, the featured panel)
  // rendered as a recessed grey dent on a near-white page instead of lifting
  // off it. Contrast tests could not see it — both values were legible, and
  // legible is not the same as correctly ordered.
  it('elevates surface above the ground in BOTH themes', () => {
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const bg = L(theme['--color-bg']);
      const surface = L(theme['--color-surface']);
      expect(surface, `${name}: surface ${surface} must be lighter than bg ${bg}`)
        .toBeGreaterThan(bg);
    }
  });

  it('keeps borders far enough off the ground to read as edges', () => {
    // --color-neutral-900 is the faintest border step and carries the project
    // card outlines. Below ~0.04 of lightness separation it disappears and the
    // page reads as fog — the "washed out" report.
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const delta = Math.abs(L(theme['--color-neutral-900']) - L(theme['--color-bg']));
      expect(delta, `${name}: neutral-900 is only ${delta.toFixed(3)} off the ground`)
        .toBeGreaterThanOrEqual(0.04);
    }
  });

  // Text on a FILL, not on the ground. The ground-contrast tests above all
  // passed while the project-card tag chips sat at 4.085:1 in light mode,
  // because nothing checked a token pair that never touches --color-bg.
  it('meets WCAG AA for tag text on the neutral-900 chip fill', () => {
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      const c = wcagContrast(parse(theme['--color-neutral-400'])!, parse(theme['--color-neutral-900'])!);
      expect(c, `${name} tag-on-chip contrast ${c}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // OKLCH can name colours no screen can show. When a step is outside sRGB the
  // browser silently clips it, so the colour that renders is NOT the colour
  // declared — and every contrast number measured above is measured against a
  // value that never reaches a pixel. Four steps of the amber light ramp were
  // out of gamut when first drafted; nothing here could have caught it.
  it('keeps every accent step inside sRGB, so measured contrast is what renders', () => {
    const srgb = inGamut('rgb');
    for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
      for (const t of REQUIRED) {
        if (!t.startsWith('--color-accent-')) continue;
        expect(srgb(parse(theme[t])!), `${name} ${t} = ${theme[t]} is outside sRGB`).toBe(true);
      }
      expect(srgb(parse(theme['--color-accent'])!), `${name} --color-accent outside sRGB`).toBe(true);
    }
  });

  it('keeps the two dark blocks in lockstep — editing one without the other is a silent bug', () => {
    const media = block(':root:not([data-theme="light"])');
    for (const t of Object.keys(dark)) {
      expect(media[t], `${t} differs between [data-theme="dark"] and the media query`).toBe(dark[t]);
    }
    expect(Object.keys(media).sort()).toEqual(Object.keys(dark).sort());
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
