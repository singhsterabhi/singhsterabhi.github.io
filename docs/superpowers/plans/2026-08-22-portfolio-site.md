# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repo's single hand-written `index.html` with a fast, dual-theme, agent-readable Astro portfolio (Home, About, 404, terminal overlay) deployed to Cloudflare Pages.

**Architecture:** Astro static output; zero JavaScript on Home and About. One React island — a terminal overlay — lazy-loaded on first open. A single command registry module is the source of truth for the terminal UI, the WebMCP agent tool surface, and the published A2A agent card. A single Astro content collection is the source of truth for project cards, the terminal's `projects` command, and the generated markdown/`llms.txt` twins. Colour and type resolve exclusively through OKLCH design tokens defined for both themes.

**Tech Stack:** Astro 7.2.4 · Tailwind CSS 4.3.3 (`@tailwindcss/vite`) · React 19.2.8 (one island) · Vitest 4.1.11 · `@astrojs/sitemap` 3.7.3 · `culori` 4.0.2 (token tests only) · Node 22.18

**Spec:** `docs/superpowers/specs/2026-08-22-portfolio-site-design.md` — read it alongside this plan. Every task argues from a numbered spec section.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Host: Cloudflare Pages**, static output, `https://singhsterabhi.pages.dev`. No SSR adapter. (§2)
- **`site: 'https://singhsterabhi.pages.dev'` in `astro.config.mjs`. `base` MUST NOT be set.** Every absolute URL (sitemap, canonical, JSON-LD, `llms.txt`, agent card) derives from `site` and nowhere else. (§2, §14)
- **No `dist/` in git.** No GitHub Actions deploy workflow — Cloudflare's Git integration builds. (§2)
- **No `.nojekyll`** — that was a GitHub Pages requirement. (§5)
- **Zero JavaScript on Home and About.** The terminal island is the only JS, code-split behind a dynamic import on first open. This is verified by an explicit JS-disabled test. (§4, §7, §11)
- **Both themes are fully authored.** Dark is not an inversion of light. No theme control may exist without somewhere real to switch to. Contrast verified in both. (§8, §10)
- **All colour goes through OKLCH tokens.** No raw hex or named colours in components. (§8)
- **All fonts self-hosted** via Astro's Fonts API. No `fonts.googleapis.com` request at runtime. (§8)
- **Motion contract:** durations `120ms` / `180ms` / `240ms` / `520ms`; one easing `cubic-bezier(0.16, 1, 0.3, 1)`; defined once as tokens. No animation library. (§9)
- **`prefers-reduced-motion` gets a real reduced path** — opacity substituted for movement, never a deleted animation leaving a broken layout — plus an on-page motion toggle persisted to `localStorage`. (§10)
- **Dead-link rule:** a project card renders only the links it actually has. No card renders a URL that has not been verified resolving. (§6)
- **No placeholder copy reaches `master`:** specifically not `hello@example.com`, not the notes-to-self timeline entries, not the striped portrait placeholder. (§13)
- **The design artboard is a reference, not code to port.** No inline `style="…"` attributes in output; no `screens` switcher; no `screen`/`terminalAffordance`/`bentoColumns` props; `support.js` is not ported. (§8)
- **Test placement rule — this is not cosmetic.** Astro's container renderer does **not** work under jsdom (verified on Astro 7.2.4: `renderToString` throws inside `NOOP_MIDDLEWARE_FN`). Therefore: tests that container-render `.astro` components live in **`tests/components/`** and run under **node** with NO environment pragma. Tests that genuinely need a DOM — React islands via `@testing-library/react`, anything touching `document` — live in **`tests/dom/`** and carry `// @vitest-environment jsdom` as their FIRST line. Putting a container-render test in `tests/dom/` with the pragma produces a confusing `NoMatchingRenderer` failure.
- **Harness:** `vitest.config.ts` uses `getViteConfig` from `astro/config` (plain `defineConfig` cannot resolve `.astro` imports), with a base `environment: 'node'` and per-file pragmas for the DOM suites. `projects` was tried and rejected: each project gets its own Vite config and loses the root Astro plugin. Do not "simplify" this back.
- **Package manager: pnpm 10.33.2.** Every command in this plan uses pnpm. `pnpm-lock.yaml` is committed — Cloudflare detects the package manager from it. Never run `npm install` in this repo; it would produce a competing `package-lock.json` and a different dependency tree than the one tested.
- **Commit discipline — IMPLEMENTERS MUST NEVER COMMIT.** Do not run `git commit`, `git commit --amend`, or any command that creates a commit. Stage your work with `git add -A`, report, and stop. The controller commits in the main conversation, where the user sees each permission decision. **If any git command of yours is denied, that denial is final — report it as a concern and stop. Never re-run a denied command.** Retrying a denied call until it succeeds is a permission bypass and is treated as a task failure regardless of the outcome.
- Commit messages (written by the controller) carry no `Co-Authored-By` trailer, no `Generated with` line, and no signature of any kind — the user asked for this explicitly.
- Pushing, merging, and tagging are NOT authorized for anyone, controller included: ask the user first.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `.gitignore` | Toolchain |
| `astro.config.mjs` | `site`, integrations, fonts, Tailwind plugin |
| `vitest.config.ts` | Test runner; jsdom environment for island/DOM tests |
| `src/styles/tokens.css` | OKLCH tokens, both themes, motion contract. The only place colour is defined. |
| `src/styles/global.css` | Tailwind import, base element styles, `.hr` fading rule, focus states |
| `src/lib/theme.ts` | Pure theme-resolution logic (no DOM) |
| `src/lib/motion.ts` | Pure motion-preference logic (no DOM) |
| `src/commands/registry.ts` | **Command registry — single source of truth.** Name, description, `inputSchema`, `readOnly`, handler. |
| `src/commands/complete.ts` | Tab-completion and nearest-match, derived from the registry |
| `src/content.config.ts` | `projects` and `timeline` collections + Zod schemas |
| `src/data/projects.yaml` | The two real project entries |
| `src/data/timeline.yaml` | Experience entries (populated from §13 inputs) |
| `src/components/*.astro` | `Nav`, `Footer`, `Hero`, `ProjectGrid`, `ProjectCard`, `Timeline`, `ThemeToggle`, `MotionToggle`, `TerminalButton`, `JsonLd` |
| `src/islands/Terminal.tsx` | The only React. `<dialog>`-based overlay consuming the registry. |
| `src/islands/webmcp.ts` | Registers registry commands as `document.modelContext` tools |
| `src/layouts/Base.astro` | Head, fonts, theme init script, JSON-LD slot, skip link |
| `src/pages/index.astro`, `about.astro`, `terminal.astro`, `404.astro` | Routes |
| `src/pages/index.md.ts`, `about.md.ts`, `llms.txt.ts`, `llms-full.txt.ts`, `agent-card.json.ts` | Generated agent-facing endpoints |
| `public/robots.txt`, `public/_headers` | Static agent-facing files |
| `tests/**` | Vitest suites, mirroring `src/`|
| `scripts/verify-links.mjs` | Asserts every project URL resolves (§6 dead-link rule) |
| `scripts/verify-agent-surface.mjs` | Asserts every agent endpoint returns 200 + correct content type |

---

## Task 1: Scaffold, toolchain, and a build that proves the invariants

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/pages/index.astro`
- Delete: `index.html`
- Test: `tests/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm build`, `pnpm test`; the `site` constant `https://singhsterabhi.pages.dev` used by every later task.

- [ ] **Step 1: Initialise the project and install exact versions**

```bash
pnpm init
pnpm pkg set type=module
# Pin the package manager so Cloudflare's build image and every contributor
# resolve the same pnpm. Cloudflare reads this and the lockfile to pick pnpm.
pnpm pkg set packageManager="pnpm@10.33.2"
pnpm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.preview="astro preview" scripts.test="vitest run" scripts.test:watch="vitest"
pnpm add astro@7.2.4 @astrojs/sitemap@3.7.3 @astrojs/react@6.0.4 react@19.2.8 react-dom@19.2.8 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
pnpm add -D vitest@4.1.11 @types/react@19.2.18 culori@4.0.2 jsdom typescript
```

- [ ] **Step 2: Write the failing test**

This test encodes the two constraints most likely to be broken silently: `base` must be unset, and `site` must be the deployed origin. Both are load-bearing for every absolute URL on the site.

`tests/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';

describe('astro config', () => {
  it('sets site to the deployed origin', () => {
    expect(config.site).toBe('https://singhsterabhi.pages.dev');
  });

  it('does not set base — user-site root serving depends on it being absent', () => {
    expect('base' in config).toBe(false);
  });

  it('emits a fully static build', () => {
    expect(config.adapter).toBeUndefined();
    expect(config.output ?? 'static').toBe('static');
  });

  it('registers the sitemap integration', () => {
    const names = (config.integrations ?? []).flat().map((i: any) => i.name);
    expect(names).toContain('@astrojs/sitemap');
  });

  it('self-hosts every font — no runtime Google Fonts request', () => {
    expect(config.fonts?.length).toBeGreaterThan(0);
    for (const f of config.fonts) expect(f.cssVariable).toMatch(/^--font-/);
  });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `pnpm vitest run tests/config.test.ts`
Expected: FAIL — cannot resolve `../astro.config.mjs`.

- [ ] **Step 4: Write the config**

`astro.config.mjs` — note `fonts` uses Astro 7's stable Fonts API, which downloads and self-hosts into `_astro/fonts` at build time. `DISPLAY_FACE` is filled in by Task 2; until then Inter stands in for both so the build is green.

```js
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://singhsterabhi.pages.dev',
  integrations: [sitemap(), react()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body',
      weights: ['400', '500', '600'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400', '500'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/dom/**', 'jsdom']],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["astro/client"]
  }
}
```

`.gitignore` — note `pnpm-lock.yaml` is deliberately **not** listed. Cloudflare
detects the package manager from the committed lockfile; ignoring it silently
falls back to npm and installs different versions than were tested.
```
node_modules/
dist/
.astro/
.wrangler/
*.log
.DS_Store
```

`.npmrc` — pnpm's strict, non-hoisted `node_modules` is correct here and is left
on. `strict-peer-dependencies=false` avoids install failures on the peer ranges
Astro integrations declare loosely, without hiding real conflicts.
```
strict-peer-dependencies=false
```

- [ ] **Step 5: Replace the old entry point**

The old `index.html` is deleted — its copy already lives in the spec (§8) and is implemented in Task 11.

```bash
git rm index.html
```

`src/pages/index.astro` (temporary shell, replaced in Task 10):
```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Abhishek Singh</title></head>
  <body><h1>Abhishek Singh</h1></body>
</html>
```

- [ ] **Step 6: Run the tests and the build**

Run: `pnpm vitest run tests/config.test.ts && pnpm build`
Expected: 5 tests PASS; build succeeds; `dist/index.html` exists and `dist/_astro/fonts/` contains self-hosted font files.

- [ ] **Step 7: Verify the fonts are genuinely self-hosted**

Run: `grep -rc 'fonts.googleapis.com' dist/ || echo "clean"`
Expected: `clean` — zero matches. If any match appears, the Fonts API is not being used correctly and Step 4 must be fixed before continuing.

- [ ] **Step 8: Stage**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 2: Choose the palette and display face (decision gate — requires the user)

**Files:**
- Create: `docs/superpowers/decisions/2026-08-22-palette-and-type.md`
- Modify: `astro.config.mjs` (the `fonts` array gains the chosen display face)

**Interfaces:**
- Consumes: Task 1's config.
- Produces: the concrete OKLCH values and `--font-heading` family that Task 3 encodes as tokens.

This task is a decision, not a test cycle. Spec §8 states the hues and display face are chosen during implementation with rendered options presented for approval — because palette selection requires seeing it in the real layout. Do not guess these values.

- [ ] **Step 1: Invoke the frontend-design skill**

Use the `frontend-design` skill. Brief it with: the artboard's structural facts (§8 "Layout facts fixed by the artboard"), the requirement that light and dark are both first-class and neither derived from the other, the retained fading-rule signature, Inter for body, JetBrains Mono for the terminal and kickers, and the candidate display faces from §8 (Clash Display, Cabinet Grotesk, Space Grotesk, Instrument Serif).

- [ ] **Step 2: Build a comparison page and show it**

Render the Home hero and one project card at real size, for each candidate palette and display face, in **both** themes. Publish as an Artifact so the user can compare side by side rather than reading hex values.

- [ ] **Step 3: Record the decision**

Write `docs/superpowers/decisions/2026-08-22-palette-and-type.md` containing: the chosen display face and its Google Fonts name; the full OKLCH value for `bg`, `surface`, `text`, `accent`, and `divider` in **both** themes; and the nine-step neutral and accent ramps in both. These exact strings are what Task 3 encodes — no re-derivation.

- [ ] **Step 4: Add the display face to the config**

Append to the `fonts` array in `astro.config.mjs`, substituting the chosen family:

```js
    {
      // Astro 7 requires a FontProvider object, NOT the string 'google'.
      // `fontProviders` is already imported by astro.config.mjs from Task 1.
      provider: fontProviders.google(),
      name: '<CHOSEN DISPLAY FACE>',
      cssVariable: '--font-heading',
      weights: ['500', '600'],
      subsets: ['latin'],
      fallbacks: ['Inter', 'system-ui', 'sans-serif'],
    },
```

- [ ] **Step 5: Verify**

Run: `pnpm build && pnpm vitest run tests/config.test.ts`
Expected: build succeeds, config tests still pass, three font families now in `dist/_astro/fonts/`.

- [ ] **Step 6: Write the failing test for the rain field**

`tests/dom/rain.test.ts` — the assertions that matter are the guard rails, not the
visuals. Each of these is a requirement from the decision doc that would
otherwise be silently dropped.

```ts
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
```

- [ ] **Step 7: Run it to make sure it fails**

Run: `pnpm vitest run tests/dom/rain.test.ts`
Expected: FAIL — cannot resolve `src/scripts/rain`.

- [ ] **Step 8: Implement the rain field**

`src/scripts/rain.ts` exports `columnCount(width: number): number` and
`createRain(canvas, opts): { start(): void; stop(): void; running(): boolean; maxAlpha(): number }`.

Requirements, all from `docs/superpowers/decisions/2026-08-22-palette-and-type.md`:
- Glyph set `01<>/{}[]#$_—❯abcdef`, falling in columns at varied speeds, a bright
  magenta head and a dim cyan tail, over a scanline drift of 1px lines every 4px.
- Colours read from the **computed CSS custom properties**, never hardcoded — the
  field must recolour itself when the theme flips.
- `maxAlpha()` returns 0.16 for dark and 0.08 for light.
- `columnCount` derives from viewport width; cap at 26 columns at 375px.
- Cap the device pixel ratio at 2.
- Re-derive columns on resize, debounced.

`src/components/LivingBackground.astro` renders
`<canvas aria-hidden="true" data-living-bg></canvas>`, absolutely positioned behind
content at `z-index: 0` with the page content at `z-index: 1`, and a `<script>` that
**dynamically imports** `rain.ts` on `requestIdleCallback` (falling back to a
`setTimeout`), so nothing is in the LCP path. It pauses via `IntersectionObserver`
and on `document.visibilitychange`, and re-reads the theme on the `data-theme`
attribute change via a `MutationObserver`.

Mount it in `Base.astro` behind the content.

- [ ] **Step 9: Verify the four non-negotiables by hand**

Run `pnpm build && pnpm preview`, then confirm and record:
1. `dist/` has the rain code in its **own chunk**, not the main bundle.
2. With JS disabled: both pages fully usable, canvas simply empty.
3. With `prefers-reduced-motion: reduce`: a still field, not a blank one, and no
   rAF activity in the performance profile.
4. At a 375px viewport with CPU throttled 4×: the page stays interactive. Record
   the actual frame cost.

- [ ] **Step 10: Run the whole suite**

Run: `pnpm vitest run && pnpm build`
Expected: every suite PASS; build succeeds.

- [ ] **Step 6: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 3: Dual-theme OKLCH tokens, contrast-verified in both

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: the recorded values from Task 2.
- Produces: every CSS custom property the rest of the site uses — `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-divider`, `--color-neutral-{100..900}`, `--color-accent-{100..900}`, `--dur-{1..4}`, `--ease`.

- [ ] **Step 1: Write the failing test**

This is the strongest test in the plan: it enforces the spec's hardest-to-eyeball constraints — that no token is defined in only one theme, that all colour is OKLCH, and that contrast holds in **both** themes rather than only the designed dark one.

`tests/tokens.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/tokens.test.ts`
Expected: FAIL — `ENOENT: src/styles/tokens.css`.

- [ ] **Step 3: Write the tokens**

`src/styles/tokens.css`. **Copy every value from `docs/superpowers/decisions/2026-08-22-palette-and-type.md`** — it holds the complete 9-step neutral and accent ramps for both themes, the `accent-2` (magenta) steps, and the tone mapping for terminal lines. The structure below is fixed; the values are neither invented nor derived here. **Read that document's "Ramp semantics" section first: the step number is contrast rank against the ground, not absolute lightness, so lightness descends through the dark ramp and ascends through the light one. Do not "correct" it.** Also add `--font-heading: var(--font-mono);` to the theme-independent block, and add `'700'` to JetBrains Mono's `weights` array in `astro.config.mjs`. Both themes are authored; the dark block is not a transform of the light one. The three-way theme handling matches the spec: bare `:root` is light, `prefers-color-scheme` covers the untouched default, and `[data-theme]` lets the toggle win in both directions.

```css
:root {
  /* ── light theme (authored) ── */
  --color-bg:      oklch(<L> <C> <H>);
  --color-surface: oklch(<L> <C> <H>);
  --color-text:    oklch(<L> <C> <H>);
  --color-accent:  oklch(<L> <C> <H>);
  --color-divider: color-mix(in oklch, var(--color-text) 16%, transparent);

  --color-neutral-100: oklch(<L> <C> <H>);
  /* … 200 through 900, one shared lightness scale … */
  --color-accent-100: oklch(<L> <C> <H>);
  /* … 200 through 900, same lightness scale as the neutrals … */

  /* ── motion contract (§9) — theme-independent, defined once ── */
  --dur-1: 120ms;
  --dur-2: 180ms;
  --dur-3: 240ms;
  --dur-4: 520ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] {
  /* ── dark theme (authored independently, not inverted) ── */
  --color-bg:      oklch(<L> <C> <H>);
  --color-surface: oklch(<L> <C> <H>);
  --color-text:    oklch(<L> <C> <H>);
  --color-accent:  oklch(<L> <C> <H>);
  --color-divider: color-mix(in oklch, var(--color-text) 16%, transparent);
  --color-neutral-100: oklch(<L> <C> <H>);
  /* … full ramps … */
  --color-accent-100: oklch(<L> <C> <H>);
  /* … full ramps … */
}

/* Default "system" setting stamps no attribute — only prefers-color-scheme
   separates light from dark. Guarded so an explicit light choice still wins. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg:      oklch(<same as dark>);
    --color-surface: oklch(<same as dark>);
    --color-text:    oklch(<same as dark>);
    --color-accent:  oklch(<same as dark>);
    --color-neutral-100: oklch(<same as dark>);
    /* … full ramps, identical to [data-theme="dark"] … */
  }
}
```

- [ ] **Step 4: Write global.css including the fading-rule signature**

`src/styles/global.css`:
```css
@import 'tailwindcss';
@import './tokens.css';

@theme inline {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --color-accent: var(--color-accent);
  --font-body: var(--font-body);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.55;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.015em;
  margin: 0;
}

:focus { outline: none; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
::selection { background: color-mix(in oklch, var(--color-accent) 30%, transparent); }

/* Nocturne signature, retained (§8): freestanding rules fade to transparent
   over 48px at each end. Box outlines and in-control separators stay solid. */
.hr {
  height: 1px;
  border: 0;
  background: linear-gradient(to right,
    transparent, var(--color-divider) 48px,
    var(--color-divider) calc(100% - 48px), transparent);
}

.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 8px; top: 8px; z-index: 200;
  padding: 8px 12px;
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 8px;
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/tokens.test.ts`
Expected: all 7 PASS. If a contrast assertion fails, **change the token value, not the assertion** — a failing contrast test means the palette is wrong, which is exactly what it is there to catch.

- [ ] **Step 6: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 4: Theme and motion preference logic (pure, then wired)

**Files:**
- Create: `src/lib/theme.ts`, `src/lib/motion.ts`, `src/components/ThemeToggle.astro`, `src/components/MotionToggle.astro`
- Test: `tests/theme.test.ts`, `tests/components/toggles.test.ts`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces:
  - `resolveTheme(stored: string | null, prefersDark: boolean): 'light' | 'dark'`
  - `nextTheme(current: 'light' | 'dark'): 'light' | 'dark'`
  - `THEME_KEY = 'theme'`, `MOTION_KEY = 'motion'`
  - `resolveMotion(stored: string | null, prefersReduced: boolean): 'full' | 'reduced'`
  - A global `window.__setTheme(theme)` and `window.__setMotion(mode)` used by the terminal's `theme` command in Task 7.

- [ ] **Step 1: Write the failing test for the pure logic**

`tests/theme.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/theme.test.ts`
Expected: FAIL — cannot resolve `../src/lib/theme`.

- [ ] **Step 3: Write the pure logic**

`src/lib/theme.ts`:
```ts
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'theme';

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
```

`src/lib/motion.ts`:
```ts
export type Motion = 'full' | 'reduced';
export const MOTION_KEY = 'motion';

export function resolveMotion(stored: string | null, prefersReduced: boolean): Motion {
  if (stored === 'full' || stored === 'reduced') return stored;
  return prefersReduced ? 'reduced' : 'full';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/theme.test.ts`
Expected: 9 PASS.

- [ ] **Step 5: Write the toggle components**

Both toggles are plain HTML buttons with a tiny inline script — no framework, so Home and About keep shipping zero framework JS. The `◑` glyph is the artboard's.

`src/components/ThemeToggle.astro`:
```astro
<button
  id="theme-toggle"
  type="button"
  aria-label="Switch between light and dark theme"
  class="grid size-8 place-items-center rounded-lg border border-[var(--color-neutral-800)] bg-transparent text-[13px] text-[var(--color-neutral-400)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-300)]"
  style="transition-duration: var(--dur-2); transition-timing-function: var(--ease);"
>◑</button>

<script>
  import { THEME_KEY, nextTheme, resolveTheme, type Theme } from '../lib/theme';

  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(t === 'dark'));
  };

  // Exposed so the terminal's `theme` command drives this same state (§10)
  // rather than reimplementing it.
  window.__setTheme = (t: Theme) => {
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    apply(t);
  };

  let current = resolveTheme(
    (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })(),
    matchMedia('(prefers-color-scheme: dark)').matches,
  );
  apply(current);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    current = nextTheme(current);
    window.__setTheme(current);
  });
</script>
```

`src/components/MotionToggle.astro`:
```astro
<button
  id="motion-toggle"
  type="button"
  class="rounded-lg border border-[var(--color-neutral-800)] px-2.5 py-1 font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-500)] hover:border-[var(--color-accent)]"
>motion</button>

<script>
  import { MOTION_KEY, resolveMotion, type Motion } from '../lib/motion';

  const apply = (m: Motion) => {
    document.documentElement.dataset.motion = m;
    const btn = document.getElementById('motion-toggle');
    btn?.setAttribute('aria-pressed', String(m === 'reduced'));
    btn?.setAttribute('aria-label', m === 'reduced' ? 'Enable animations' : 'Reduce animations');
  };

  window.__setMotion = (m: Motion) => {
    try { localStorage.setItem(MOTION_KEY, m); } catch {}
    apply(m);
  };

  let current = resolveMotion(
    (() => { try { return localStorage.getItem(MOTION_KEY); } catch { return null; } })(),
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  apply(current);

  document.getElementById('motion-toggle')?.addEventListener('click', () => {
    current = current === 'reduced' ? 'full' : 'reduced';
    window.__setMotion(current);
  });
</script>
```

- [ ] **Step 5b: Write the toggle markup test**

The behaviour of these toggles lives in an inline `<script>`, which the container
API does not execute — so a behavioural test here would be testing a fake
harness, not the code. Their *markup contract* is testable and is what actually
breaks silently: an icon-only button with no accessible name is invisible to a
screen reader, and `◑` is not a name.

`tests/components/toggles.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ThemeToggle from '../../src/components/ThemeToggle.astro';
import MotionToggle from '../../src/components/MotionToggle.astro';

const render = async (C: any) => (await AstroContainer.create()).renderToString(C, {});

describe('ThemeToggle', () => {
  it('is a real button, so it is keyboard reachable without extra work', async () => {
    const html = await render(ThemeToggle);
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  it('carries an accessible name — the glyph alone is not one', async () => {
    const html = await render(ThemeToggle);
    expect(html).toMatch(/aria-label="[^"]{6,}"/);
  });

  it('has a stable id for the inline script to bind to', async () => {
    expect(await render(ThemeToggle)).toContain('id="theme-toggle"');
  });
});

describe('MotionToggle', () => {
  it('is a real button', async () => {
    expect(await render(MotionToggle)).toMatch(/<button[^>]*type="button"/);
  });

  it('has a stable id for the inline script to bind to', async () => {
    expect(await render(MotionToggle)).toContain('id="motion-toggle"');
  });
});
```

Run: `pnpm vitest run tests/components/toggles.test.ts`
Expected: 5 PASS. If the accessible-name assertion fails on `MotionToggle`, note
that its label is set by the inline script at runtime — the static markup must
still carry a sensible fallback, so add one rather than relaxing the test.

Behavioural verification of both toggles (that clicking actually flips
`data-theme` / `data-motion` and persists) is Task 18 Steps 4 and 5, which drive
a real browser.

- [ ] **Step 6: Add the reduced-motion CSS path**

Append to `src/styles/global.css`. Note this substitutes opacity for movement rather than deleting the animation — the spec is explicit that a deleted animation leaving a broken layout is not acceptable.

```css
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"]) *,
  :root:not([data-motion="full"]) *::before,
  :root:not([data-motion="full"]) *::after {
    animation-duration: var(--dur-1) !important;
    animation-iteration-count: 1 !important;
    transition-duration: var(--dur-1) !important;
    scroll-behavior: auto !important;
  }
}
```

Note: the reduced-motion rule for `.reveal` belongs to Task 15, which
introduces that class. Do not add it here.

- [ ] **Step 7: Declare the globals so TypeScript is happy**

Create `src/env.d.ts`:
```ts
/// <reference types="astro/client" />

// This file must stay a global SCRIPT — no top-level import/export. Two
// consequences, both load-bearing:
//  * `interface Window` merges globally on its own here. A `declare global`
//    wrapper does nothing in a script file, so the augmentation silently fails
//    to apply and window.__setTheme ends up untyped.
//  * `declare module '*.astro'` is only ambient in script context; a top-level
//    import turns this into a module and that declaration stops working.
// Use inline import() types, never import statements.
interface Window {
  __setTheme?: (t: import('./lib/theme').Theme) => void;
  __setMotion?: (m: import('./lib/motion').Motion) => void;
}

declare module '*.astro' {
  const Component: (props?: Record<string, unknown>) => unknown;
  export default Component;
}
```

- [ ] **Step 8: Verify and stage**

Run: `pnpm vitest run tests/theme.test.ts && pnpm build`
Expected: tests PASS, build succeeds.

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 5: Base layout with no-flash theme init

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/JsonLd.astro`
- Test: `tests/components/base-layout.test.ts`

**Interfaces:**
- Consumes: `src/styles/global.css`, `resolveTheme`, `resolveMotion`.
- Produces: `Base.astro` accepting props `{ title: string; description: string; canonical: string; jsonLd?: object }` and a `<slot />`. Every page in Tasks 10–13 uses it.

- [ ] **Step 1: Write the failing test**

The critical assertion is that the theme is applied **before first paint** — a blocking inline script in `<head>`, ahead of any stylesheet-driven paint. If it lands after, every dark-theme visitor sees a white flash.

`tests/components/base-layout.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Base from '../../src/layouts/Base.astro';

const render = async () => {
  const c = await AstroContainer.create();
  return c.renderToString(Base, {
    props: {
      title: 'Test title',
      description: 'Test description',
      canonical: 'https://singhsterabhi.pages.dev/',
    },
    slots: { default: '<main id="main">body</main>' },
  });
};

describe('Base layout', () => {
  it('sets a language', async () => {
    expect(await render()).toMatch(/<html[^>]*lang="en"/);
  });

  it('applies the theme in a blocking head script, before first paint', async () => {
    const html = await render();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('data-theme');
    // no defer/async — it must block
    expect(head).not.toMatch(/<script[^>]*\b(defer|async)\b[^>]*>[^<]*data-theme/);
  });

  it('emits the title, description and canonical it was given', async () => {
    const html = await render();
    expect(html).toContain('<title>Test title</title>');
    expect(html).toMatch(/<meta name="description" content="Test description"/);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/singhsterabhi\.pages\.dev\/"/);
  });

  it('advertises llms.txt to agents via a link rel (§11)', async () => {
    expect(await render()).toMatch(/rel="alternate"[^>]*\/llms\.txt/);
  });

  it('emits the markdown alternate only when given one, verbatim', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Base, {
      props: {
        title: 't', description: 'd',
        canonical: 'https://singhsterabhi.pages.dev/about',
        markdownUrl: 'https://singhsterabhi.pages.dev/about.md',
      },
      slots: { default: '<main id="main">x</main>' },
    });
    expect(html).toContain('href="https://singhsterabhi.pages.dev/about.md"');
    expect(html).not.toContain('/about/index.md');
  });

  it('offers a skip link as the first focusable element', async () => {
    const html = await render();
    const body = html.slice(html.indexOf('<body'));
    expect(body.indexOf('skip-link')).toBeLessThan(body.indexOf('<main'));
  });

  it('renders its slot', async () => {
    expect(await render()).toContain('<main id="main">body</main>');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/components/base-layout.test.ts`
Expected: FAIL — cannot resolve `Base.astro`.

- [ ] **Step 3: Write the layout**

`src/layouts/Base.astro`:
```astro
---
import { Font } from 'astro:assets';
import '../styles/global.css';
import JsonLd from '../components/JsonLd.astro';

interface Props {
  title: string;
  description: string;
  canonical: string;
  /** Absolute URL of this page's markdown twin (§11). Passed explicitly —
      deriving it from `canonical` yields /about/index.md, which is a 404. */
  markdownUrl?: string;
  jsonLd?: object;
}
const { title, description, canonical, markdownUrl, jsonLd } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <!-- Agent-facing alternates (§11) -->
    <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
    {markdownUrl && <link rel="alternate" type="text/markdown" href={markdownUrl} />}

    <Font cssVariable="--font-body" preload />
    <Font cssVariable="--font-heading" preload />
    <Font cssVariable="--font-mono" />

    <!-- Blocking, inline, first: applies theme and motion before first paint.
         Duplicated from src/lib/* deliberately — it must run before any module
         graph loads, so it cannot import. Keep in sync with those files. -->
    <script is:inline>
      (function () {
        try {
          var s = localStorage.getItem('theme');
          var t = (s === 'light' || s === 'dark')
            ? s
            : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          document.documentElement.dataset.theme = t;

          var m = localStorage.getItem('motion');
          var mo = (m === 'full' || m === 'reduced')
            ? m
            : (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full');
          document.documentElement.dataset.motion = mo;
        } catch (e) {
          document.documentElement.dataset.theme = 'light';
          document.documentElement.dataset.motion = 'full';
        }
      })();
    </script>

    {jsonLd && <JsonLd data={jsonLd} />}
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <slot />
  </body>
</html>
```

`src/components/JsonLd.astro`:
```astro
---
interface Props { data: object }
const { data } = Astro.props;
---
<script type="application/ld+json" is:inline set:html={JSON.stringify(data)} />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/components/base-layout.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 6: Projects and timeline content collections

**Files:**
- Create: `src/content.config.ts`, `src/data/projects.yaml`, `src/data/timeline.yaml`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: collections `projects` and `timeline`. Project entry type:
  `{ slug: string; kicker: string; title: string; summary: string; tags: string[]; repo?: string; demo?: string; featured: boolean }`.
  Timeline entry type: `{ when: string; role: string; note: string }`.
  Consumed by Tasks 7 (registry), 10 (Home), 11 (About), 13 (agent surface).

- [ ] **Step 1: Write the failing test**

`tests/content.test.ts` — the schema is tested directly, which is where the dead-link rule and the no-placeholder rule are actually enforceable.

```ts
import { describe, expect, it } from 'vitest';
import { projectSchema, timelineSchema } from '../src/lib/schemas';

const valid = {
  slug: 'table-kit',
  kicker: 'open source',
  title: 'A headless table toolkit built on TanStack Table',
  summary: 'Column sizing, pinning and virtualised rows packaged once.',
  tags: ['TypeScript', 'React', 'TanStack Table'],
  repo: 'https://github.com/singhsterabhi/table-kit',
  featured: true,
};

describe('projectSchema', () => {
  it('accepts a complete entry', () => {
    expect(projectSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an entry with no links at all — the dead-link rule (§6)', () => {
    const { repo, ...noLinks } = valid;
    expect(projectSchema.safeParse(noLinks).success).toBe(true);
  });

  it('rejects a non-URL repo rather than rendering a broken button', () => {
    expect(projectSchema.safeParse({ ...valid, repo: 'coming soon' }).success).toBe(false);
  });

  it('rejects an empty tag list — tags carry context, not decoration', () => {
    expect(projectSchema.safeParse({ ...valid, tags: [] }).success).toBe(false);
  });

  it('rejects a slug that would break `open <slug>` completion', () => {
    expect(projectSchema.safeParse({ ...valid, slug: 'table kit' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...valid, slug: 'Table-Kit' }).success).toBe(false);
  });

  it('defaults featured to false', () => {
    const { featured, ...rest } = valid;
    const parsed = projectSchema.parse(rest);
    expect(parsed.featured).toBe(false);
  });
});

describe('timelineSchema', () => {
  it('accepts a real entry', () => {
    expect(timelineSchema.safeParse({
      when: '2022 → now',
      role: 'Software Engineer · media.net',
      note: 'Cut p99 on the reporting API from 1.4s to 380ms.',
    }).success).toBe(true);
  });

  it('rejects notes-to-self placeholder copy reaching master (§13)', () => {
    for (const note of ['Fill in — one line of what you owned', 'TODO', 'Add the outcomes here']) {
      expect(timelineSchema.safeParse({ when: 'x', role: 'y', note }).success).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/content.test.ts`
Expected: FAIL — cannot resolve `../src/content.config`.

- [ ] **Step 3: Write the collections**

**Two files.** `astro:content` is a build-time virtual module and cannot be
imported by a Vitest node test, so the schemas live in a plain-TS module that
imports `zod` directly, and `content.config.ts` consumes them. First install
zod: `pnpm add zod`.

`src/lib/schemas.ts`:

```ts
import { z } from 'zod';

const PLACEHOLDER = /\b(fill in|todo|tbd|lorem|placeholder|add the|example\.com)\b/i;

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  kicker: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1, 'at least one tag'),
  repo: z.string().url().optional(),
  demo: z.string().url().optional(),
  featured: z.boolean().default(false),
});

export const timelineSchema = z.object({
  when: z.string().min(1),
  role: z.string().min(1),
  note: z.string().min(1).refine((s) => !PLACEHOLDER.test(s), {
    message: 'placeholder copy must not reach master (spec §13)',
  }),
});

```

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { projectSchema, timelineSchema } from './lib/schemas';

export const collections = {
  projects: defineCollection({
    loader: file('src/data/projects.yaml'),
    schema: projectSchema,
  }),
  timeline: defineCollection({
    loader: file('src/data/timeline.yaml'),
    schema: timelineSchema,
  }),
};
```

- [ ] **Step 4: Write the real project data**

`src/data/projects.yaml`. Both entries are confirmed real (§6). **`repo` and `demo` are deliberately omitted** — the URLs are outstanding under §13, and the schema permits their absence precisely so no unverified link ships. Add them, then run `scripts/verify-links.mjs` (Task 14), before the buttons appear.

```yaml
- id: table-kit
  slug: table-kit
  kicker: open source
  title: A headless table toolkit built on TanStack Table
  summary: >-
    Column sizing, pinning and virtualised rows packaged once, so I stopped
    rewriting the same four hooks in every project.
  tags: [TypeScript, React, TanStack Table]
  featured: true

- id: gym-log
  slug: gym-log
  kicker: side project
  title: A workout tracker that fits between sets
  summary: >-
    Log a set in two taps. Offline-first, because gym wifi is a myth and nobody
    wants a spinner mid-superset.
  tags: [React, IndexedDB, PWA]
  featured: false
```

`src/data/timeline.yaml` — starts **empty**. The artboard's three entries are notes-to-self and the schema now actively rejects them (§13). Task 11 renders nothing when this is empty.

```yaml
[]
```

- [ ] **Step 5: Run the tests and the build**

Run: `pnpm vitest run tests/content.test.ts && pnpm build`
Expected: 8 PASS; build succeeds with both collections validating.

- [ ] **Step 6: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 7: The shared command registry

**Files:**
- Create: `src/commands/registry.ts`, `src/commands/complete.ts`
- Test: `tests/commands/registry.test.ts`, `tests/commands/complete.test.ts`

**Interfaces:**
- Consumes: the `projects` collection type from Task 6.
- Produces — this is the spec's §7.1 keystone; Tasks 8, 9 and 13 all read it:

```ts
export type Line = { text: string; tone: 'cmd' | 'out' | 'muted' | 'accent' | 'err' };
export type CommandResult = { lines: Line[]; navigate?: string; clear?: boolean; close?: boolean };
export type CommandCtx = { projects: ProjectEntry[]; setTheme: (t: 'light' | 'dark') => void };
export type Command = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  readOnly: boolean;
  run: (args: Record<string, string>, ctx: CommandCtx) => CommandResult;
};
export const COMMANDS: Command[] = [...];
export function runLine(line: string, ctx: CommandCtx): CommandResult;
```

- [ ] **Step 1: Write the failing registry test**

`tests/commands/registry.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { COMMANDS, runLine, type CommandCtx } from '../../src/commands/registry';

const projects = [
  { slug: 'table-kit', title: 'A headless table toolkit', repo: 'https://x/tk', demo: undefined },
  { slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl', demo: 'https://gl.app' },
];
const ctx = (): CommandCtx => ({ projects: projects as any, setTheme: vi.fn() });
const text = (r: ReturnType<typeof runLine>) => r.lines.map((l) => l.text).join('\n');

describe('registry shape — the contract Tasks 8, 9 and 13 depend on', () => {
  it('declares the nine spec commands and nothing more', () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(
      ['clear', 'contact', 'exit', 'help', 'open', 'projects', 'resume', 'theme', 'whoami'],
    );
  });

  it('gives every command a description and a valid JSON Schema', () => {
    for (const c of COMMANDS) {
      expect(c.description.length, c.name).toBeGreaterThan(0);
      expect(c.inputSchema.type, c.name).toBe('object');
      expect(typeof c.inputSchema.properties, c.name).toBe('object');
    }
  });

  it('marks the side-effecting commands as not read-only (§7.1)', () => {
    const byName = Object.fromEntries(COMMANDS.map((c) => [c.name, c]));
    for (const n of ['whoami', 'projects', 'contact', 'help']) {
      expect(byName[n].readOnly, n).toBe(true);
    }
    for (const n of ['open', 'theme', 'clear', 'exit']) {
      expect(byName[n].readOnly, n).toBe(false);
    }
  });
});

describe('runLine', () => {
  it('echoes the command back as the first line', () => {
    expect(runLine('whoami', ctx()).lines[0].text).toBe('❯ whoami');
  });

  it('help lists every registered command — derived, never hand-written', () => {
    const out = text(runLine('help', ctx()));
    for (const c of COMMANDS) expect(out).toContain(c.name);
  });

  it('projects lists every project slug', () => {
    const out = text(runLine('projects', ctx()));
    expect(out).toContain('table-kit');
    expect(out).toContain('gym-log');
  });

  it('open about navigates for real', () => {
    expect(runLine('open about', ctx()).navigate).toBe('/about');
  });

  it('open <slug> prefers the live demo over the repo', () => {
    expect(runLine('open gym-log', ctx()).navigate).toBe('https://gl.app');
  });

  it('open <slug> falls back to the repo when there is no demo', () => {
    expect(runLine('open table-kit', ctx()).navigate).toBe('https://x/tk');
  });

  it('open with no argument lists the valid targets instead of failing silently', () => {
    const out = text(runLine('open', ctx()));
    expect(out).toContain('table-kit');
    expect(out).toContain('about');
  });

  it('open on an unknown project suggests the nearest slug', () => {
    const out = text(runLine('open gymlog', ctx()));
    expect(out).toContain('gym-log');
  });

  it('theme applies a valid value through the injected setter, not the DOM', () => {
    const c = ctx();
    runLine('theme dark', c);
    expect(c.setTheme).toHaveBeenCalledWith('dark');
  });

  it('theme rejects an invalid value with usage', () => {
    const c = ctx();
    const out = text(runLine('theme chartreuse', c));
    expect(c.setTheme).not.toHaveBeenCalled();
    expect(out).toContain('usage: theme <light|dark>');
  });

  it('clear signals a clear rather than emitting lines', () => {
    expect(runLine('clear', ctx()).clear).toBe(true);
  });

  it('exit signals a close', () => {
    expect(runLine('exit', ctx()).close).toBe(true);
  });

  it('suggests the nearest command on a typo', () => {
    expect(text(runLine('proj', ctx()))).toMatch(/did you mean projects/);
  });

  it('reports genuinely unknown input without a bogus suggestion', () => {
    const out = text(runLine('xyzzy', ctx()));
    expect(out).toContain('command not found: xyzzy');
    expect(out).not.toMatch(/did you mean/);
  });

  it('is case-insensitive on the command name', () => {
    expect(text(runLine('WHOAMI', ctx()))).toContain('Abhishek');
  });

  it('treats an empty line as a no-op with just the prompt echo', () => {
    expect(runLine('   ', ctx()).lines).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/commands/registry.test.ts`
Expected: FAIL — cannot resolve `registry`.

- [ ] **Step 3: Write the registry**

`src/commands/registry.ts`. The contact details below use the values confirmed under §13 — **substitute the real email before this ships**; the placeholder-rejecting test in Task 6 does not cover this file, so Task 14's audit catches it.

```ts
export type Tone = 'cmd' | 'out' | 'muted' | 'accent' | 'err';
export type Line = { text: string; tone: Tone };

export type ProjectEntry = {
  slug: string;
  title: string;
  repo?: string;
  demo?: string;
};

export type CommandCtx = {
  projects: ProjectEntry[];
  setTheme: (t: 'light' | 'dark') => void;
};

export type CommandResult = {
  lines: Line[];
  navigate?: string;
  clear?: boolean;
  close?: boolean;
};

export type Command = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  readOnly: boolean;
  run: (args: Record<string, string>, ctx: CommandCtx) => CommandResult;
};

const NO_ARGS = { type: 'object' as const, properties: {} };
const out = (text: string): Line => ({ text, tone: 'out' });
const muted = (text: string): Line => ({ text, tone: 'muted' });
const err = (text: string): Line => ({ text, tone: 'err' });
const accent = (text: string): Line => ({ text, tone: 'accent' });

export const CONTACT = {
  email: 'singhsterabhi@gmail.com',
  github: 'https://github.com/singhsterabhi',
  linkedin: 'https://linkedin.com/in/singhsterabhi',
};

export const RESUME_PATH = '/abhishek-singh.pdf';

export const COMMANDS: Command[] = [
  {
    name: 'help',
    description: 'List every available command.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: COMMANDS.map((c) => out('  ' + c.name.padEnd(10) + c.description)),
    }),
  },
  {
    name: 'whoami',
    description: 'Who Abhishek is and what he does, one level deeper than the hero.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: [
        out('Abhishek Singh — full-stack developer.'),
        out('Interfaces people enjoy, APIs that hold up at scale.'),
        muted('Gorakhpur by origin, nomad by habit. Currently Bengaluru.'),
      ],
    }),
  },
  {
    name: 'projects',
    description: 'List every project with its links.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: (_a, ctx) => ({
      lines: [
        muted('  ' + 'name'.padEnd(12) + 'what it is'.padEnd(46) + 'links'),
        ...ctx.projects.map((p) =>
          out('  ' + p.slug.padEnd(12) + p.title.slice(0, 44).padEnd(46) +
            [p.repo && 'repo', p.demo && 'demo'].filter(Boolean).join(' ')),
        ),
        muted('  open <name> to go there'),
      ],
    }),
  },
  {
    name: 'open',
    description: 'Navigate to a project or to the about page. Takes a project slug or "about".',
    inputSchema: {
      type: 'object',
      properties: { target: { type: 'string', description: 'A project slug, or "about".' } },
      required: ['target'],
    },
    readOnly: false,
    run: (args, ctx) => {
      const target = (args.target ?? '').toLowerCase();
      const slugs = ctx.projects.map((p) => p.slug);
      if (!target) {
        return { lines: [err('open what? try: ' + slugs.concat('about').join(', '))] };
      }
      if (target === 'about') return { lines: [accent('→ /about')], navigate: '/about' };
      const hit = ctx.projects.find((p) => p.slug === target);
      if (!hit) {
        const near = nearest(target, slugs);
        return { lines: [err(`no project called "${target}"` + (near ? `. did you mean ${near}?` : '.'))] };
      }
      const url = hit.demo ?? hit.repo;
      if (!url) return { lines: [muted(`${hit.slug} has no public link yet.`)] };
      return { lines: [accent('→ ' + url)], navigate: url };
    },
  },
  {
    name: 'resume',
    description: "Open Abhishek's résumé PDF.",
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({ lines: [accent('→ ' + RESUME_PATH)], navigate: RESUME_PATH }),
  },
  {
    name: 'contact',
    description: 'Email, GitHub and LinkedIn.',
    inputSchema: NO_ARGS,
    readOnly: true,
    run: () => ({
      lines: [
        out('  email     ' + CONTACT.email),
        out('  github    ' + CONTACT.github),
        out('  linkedin  ' + CONTACT.linkedin),
      ],
    }),
  },
  {
    name: 'theme',
    description: 'Switch the site between light and dark.',
    inputSchema: {
      type: 'object',
      properties: { mode: { type: 'string', enum: ['light', 'dark'] } },
      required: ['mode'],
    },
    readOnly: false,
    run: (args, ctx) => {
      const mode = (args.mode ?? '').toLowerCase();
      if (mode !== 'light' && mode !== 'dark') {
        return { lines: [err('usage: theme <light|dark>')] };
      }
      ctx.setTheme(mode);
      return { lines: [accent('theme → ' + mode)] };
    },
  },
  {
    name: 'clear',
    description: 'Clear the output.',
    inputSchema: NO_ARGS,
    readOnly: false,
    run: () => ({ lines: [], clear: true }),
  },
  {
    name: 'exit',
    description: 'Close the terminal.',
    inputSchema: NO_ARGS,
    readOnly: false,
    run: () => ({ lines: [], close: true }),
  },
];

/** Shared by `open`'s suggestion and by tab completion. */
export function nearest(input: string, candidates: string[]): string | undefined {
  if (!input) return undefined;
  const exactPrefix = candidates.find((c) => c.startsWith(input));
  if (exactPrefix) return exactPrefix;
  const stripped = input.replace(/[^a-z0-9]/g, '');
  return candidates.find((c) => c.replace(/[^a-z0-9]/g, '').startsWith(stripped) || c.includes(stripped));
}

const POSITIONAL: Record<string, string> = { open: 'target', theme: 'mode' };

export function runLine(line: string, ctx: CommandCtx): CommandResult {
  const trimmed = line.trim();
  const echo: Line = { text: '❯ ' + trimmed, tone: 'cmd' };
  if (!trimmed) return { lines: [echo] };

  const [rawName, ...rest] = trimmed.split(/\s+/);
  const name = rawName.toLowerCase();
  const cmd = COMMANDS.find((c) => c.name === name);

  if (!cmd) {
    const near = nearest(name, COMMANDS.map((c) => c.name));
    return { lines: [echo, err('command not found: ' + rawName + (near ? ' — did you mean ' + near + '?' : ''))] };
  }

  const key = POSITIONAL[cmd.name];
  const args = key ? { [key]: rest.join(' ') } : {};
  const result = cmd.run(args, ctx);
  return { ...result, lines: [echo, ...result.lines] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/commands/registry.test.ts`
Expected: 19 PASS.

- [ ] **Step 5: Write the failing completion test**

`tests/commands/complete.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { complete } from '../../src/commands/complete';

const slugs = ['table-kit', 'gym-log'];

describe('complete', () => {
  it('completes a partial command name', () => {
    expect(complete('proj', slugs)).toBe('projects');
  });
  it('appends a space to commands that take an argument', () => {
    expect(complete('op', slugs)).toBe('open ');
    expect(complete('the', slugs)).toBe('theme ');
  });
  it('completes a project slug in argument position', () => {
    expect(complete('open gym', slugs)).toBe('open gym-log');
  });
  it('completes "about" in argument position', () => {
    expect(complete('open ab', slugs)).toBe('open about');
  });
  it('completes theme values', () => {
    expect(complete('theme da', slugs)).toBe('theme dark');
  });
  it('returns the input unchanged when nothing matches', () => {
    expect(complete('xyz', slugs)).toBe('xyz');
    expect(complete('open zzz', slugs)).toBe('open zzz');
  });
  it('leaves an already-complete command alone', () => {
    expect(complete('whoami', slugs)).toBe('whoami');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm vitest run tests/commands/complete.test.ts`
Expected: FAIL — cannot resolve `complete`.

- [ ] **Step 7: Write the completion helper**

`src/commands/complete.ts`:
```ts
import { COMMANDS } from './registry';

const ARG_VALUES: Record<string, string[]> = { theme: ['light', 'dark'] };
const TAKES_ARG = new Set(['open', 'theme']);

export function complete(input: string, projectSlugs: string[]): string {
  const parts = input.split(/\s+/);

  if (parts.length === 1) {
    const hit = COMMANDS.map((c) => c.name).find((n) => n.startsWith(parts[0]));
    if (!hit) return input;
    return TAKES_ARG.has(hit) && hit !== parts[0] ? hit + ' ' : hit;
  }

  const cmd = parts[0].toLowerCase();
  const partial = parts[parts.length - 1];
  const candidates = ARG_VALUES[cmd] ?? projectSlugs.concat('about');
  const hit = candidates.find((c) => c.startsWith(partial));
  if (!hit) return input;
  parts[parts.length - 1] = hit;
  return parts.join(' ');
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm vitest run tests/commands/`
Expected: 26 PASS across both files. If `complete('op')` returns `'open'` without the trailing space, fix the ternary in Step 7 — the test is correct.

- [ ] **Step 9: Stage and ask before committing**

```bash
git add -A
```

---

## Task 8: The terminal island

**Files:**
- Create: `src/islands/Terminal.tsx`, `src/components/TerminalButton.astro`
- Test: `tests/dom/terminal.test.tsx`

**Interfaces:**
- Consumes: `runLine`, `COMMANDS`, `complete` from Task 7; `window.__setTheme` from Task 4.
- Produces: `<Terminal projects={...} openOnMount={boolean} />`. Mounted by Tasks 10–12.

- [ ] **Step 1: Install the DOM testing tools**

```bash
pnpm add -D @testing-library/react@latest @testing-library/user-event@latest
```

- [ ] **Step 2: Write the failing test**

`tests/dom/terminal.test.tsx` — asserts the accessibility properties the spec requires, which are exactly the ones that get quietly dropped.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import Terminal from '../../src/islands/Terminal';

// @testing-library/react only auto-registers afterEach(cleanup) when Vitest runs
// with globals: true, which this project does not. Without this, renders leak
// between tests and later assertions match stale DOM.
afterEach(cleanup);

const projects = [
  { slug: 'table-kit', title: 'A headless table toolkit', repo: 'https://x/tk' },
  { slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl', demo: 'https://gl.app' },
];

beforeAll(() => {
  // jsdom implements neither of these; both are required by <dialog>.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
});

const open = async () => {
  const user = userEvent.setup();
  render(<Terminal projects={projects as any} openOnMount />);
  return user;
};

describe('Terminal', () => {
  it('is a native dialog, not a div with a role (§7)', async () => {
    await open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName).toBe('DIALOG');
  });

  it('announces output through a live region', async () => {
    await open();
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('gives the command input an accessible name', async () => {
    await open();
    expect(screen.getByLabelText('Command')).toBeTruthy();
  });

  it('runs a command and prints its output', async () => {
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'whoami{Enter}');
    expect(screen.getByText(/full-stack developer/i)).toBeTruthy();
  });

  it('recalls history with ArrowUp', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'whoami{Enter}');
    await user.type(input, '{ArrowUp}');
    expect(input.value).toBe('whoami');
  });

  it('completes on Tab', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command') as HTMLInputElement;
    await user.type(input, 'proj{Tab}');
    expect(input.value).toBe('projects');
  });

  it('clears output on the clear command', async () => {
    const user = await open();
    const input = screen.getByLabelText('Command');
    await user.type(input, 'whoami{Enter}');
    await user.type(input, 'clear{Enter}');
    expect(screen.queryByText(/full-stack developer/i)).toBeNull();
  });

  it('drives the site theme through the shared window setter, not its own state', async () => {
    const setTheme = vi.fn();
    window.__setTheme = setTheme;
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'theme dark{Enter}');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('closes on the exit command', async () => {
    const user = await open();
    await user.type(screen.getByLabelText('Command'), 'exit{Enter}');
    expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `pnpm vitest run tests/dom/terminal.test.tsx`
Expected: FAIL — cannot resolve `Terminal`.

- [ ] **Step 4: Write the island**

`src/islands/Terminal.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { runLine, type Line, type ProjectEntry } from '../commands/registry';
import { complete } from '../commands/complete';

const TONE: Record<Line['tone'], string> = {
  cmd: 'var(--color-neutral-600)',
  out: 'var(--color-neutral-300)',
  muted: 'var(--color-neutral-600)',
  accent: 'var(--color-accent-300)',
  err: 'var(--color-accent-2-300)',  // magenta — errors only (decision doc)
};

const BANNER: Line[] = [
  { text: "abhishek's portfolio — terminal v1", tone: 'accent' },
  { text: 'the same commands agents get through WebMCP. type help.', tone: 'muted' },
  { text: '', tone: 'muted' },
];

export default function Terminal({
  projects,
  openOnMount = false,
}: { projects: ProjectEntry[]; openOnMount?: boolean }) {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();                       // native focus trap + Esc handling
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closeDialog = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
  }, []);

  useEffect(() => {
    if (openOnMount) openDialog();
  }, [openOnMount, openDialog]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if (!typing && e.key === '`') { e.preventDefault(); openDialog(); }
      if (!typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openDialog(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const submit = (raw: string) => {
    const result = runLine(raw, {
      projects,
      setTheme: (t) => window.__setTheme?.(t),
    });

    if (result.clear) { setLines([]); return; }
    setLines((prev) => prev.concat(result.lines, { text: '', tone: 'muted' }));
    if (result.close) { closeDialog(); return; }
    if (result.navigate) {
      setTimeout(() => { window.location.href = result.navigate!; }, 400);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = input;
      setInput('');
      setHIdx(-1);
      if (v.trim()) setHist((h) => [v, ...h]);
      submit(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.min(hIdx + 1, hist.length - 1);
      if (i >= 0) { setHIdx(i); setInput(hist[i]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Clamp at -1. Without the floor, one ArrowDown at rest drives hIdx to -2,
      // and ArrowUp's `if (i >= 0)` guard then blocks every recovery — history
      // recall stays dead for the rest of the session.
      const i = Math.max(hIdx - 1, -1);
      setHIdx(i);
      setInput(i >= 0 ? hist[i] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setInput(complete(input, projects.map((p) => p.slug)));
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Terminal"
      onClose={() => { /* native Esc lands here; nothing to undo */ }}
      className="m-0 max-h-[72vh] w-full max-w-[760px] overflow-hidden rounded-xl border border-[var(--color-neutral-700)] bg-[color-mix(in_oklch,var(--color-bg)_84%,black)] p-0 backdrop:bg-[color-mix(in_oklch,var(--color-bg)_72%,black)] backdrop:backdrop-blur-sm"
      style={{ marginTop: '8vh', marginInline: 'auto' }}
    >
      <div className="flex flex-col max-h-[72vh]">
        <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-neutral-900)] px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="ml-2 font-[var(--font-mono)] text-xs text-[var(--color-neutral-600)]">
            abhishek@portfolio — ~
          </span>
          <button
            type="button"
            onClick={closeDialog}
            className="ml-auto font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-700)]"
          >esc to close</button>
        </div>

        <div
          ref={scrollRef}
          aria-live="polite"
          className="flex-1 overflow-y-auto px-4.5 py-4 font-[var(--font-mono)] text-[13.5px] leading-[1.85]"
        >
          {lines.map((l, i) => (
            <div key={i} style={{ color: TONE[l.tone] }}>{l.text}</div>
          ))}
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span className="flex-none text-[var(--color-accent)]">❯</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-label="Command"
              className="flex-1 border-0 bg-transparent p-0 font-[var(--font-mono)] text-[13.5px] leading-[1.85] text-[var(--color-text)] outline-none"
            />
          </div>
        </div>

        <div className="flex flex-none gap-4.5 border-t border-[var(--color-neutral-900)] px-4 py-2.5 font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-700)]">
          <span>tab completes</span><span>↑↓ history</span><span>help lists everything</span>
          <span className="ml-auto text-[var(--color-neutral-600)]">shareable at /terminal</span>
        </div>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 5: Write the trigger button**

`src/components/TerminalButton.astro` — the artboard's resolved `button` affordance (§8).

```astro
---
interface Props { variant?: 'nav' | 'hero' }
const { variant = 'hero' } = Astro.props;
---
{variant === 'hero' ? (
  <button
    type="button"
    data-open-terminal
    class="inline-flex items-center gap-3 rounded-[10px] border border-[var(--color-neutral-800)] bg-[color-mix(in_oklch,var(--color-bg)_84%,black)] px-4 py-3 font-[var(--font-mono)] text-[13px] text-[var(--color-neutral-300)] hover:border-[var(--color-accent)]"
  >
    <span class="text-[var(--color-accent)]">❯</span>
    <span>poke around in the terminal</span>
    <kbd class="rounded border border-[var(--color-neutral-800)] px-1.5 py-[3px] font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-600)]">` or ⌘K</kbd>
  </button>
) : (
  <button
    type="button"
    data-open-terminal
    class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-neutral-800)] py-1.5 pl-3 pr-2.5 text-[13px] text-[var(--color-neutral-400)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-300)]"
  >
    Terminal
    <kbd class="rounded border border-[var(--color-neutral-800)] px-1.5 py-[3px] font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-600)]">`</kbd>
  </button>
)}

<script>
  // Every trigger dispatches the same event; the island listens once.
  document.querySelectorAll('[data-open-terminal]').forEach((b) =>
    b.addEventListener('click', () =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' })),
    ),
  );
</script>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run tests/dom/terminal.test.tsx`
Expected: 9 PASS.

- [ ] **Step 7: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 9: WebMCP registration from the same registry

**Files:**
- Create: `src/islands/webmcp.ts`
- Test: `tests/dom/webmcp.test.ts`

**Interfaces:**
- Consumes: `COMMANDS`, `runLine` from Task 7.
- Produces: `registerWebMcpTools(ctx, target?): AbortController | null`.

**API note — verified 2026-08-22, do not substitute from memory:** the current API is **`document.modelContext.registerTool`**, not `navigator.modelContext` (spec §11 says `navigator`; `navigator` is deprecated as of Chrome 150). Signature: `registerTool({ name, description, inputSchema, execute, annotations }, { signal })`, where `execute` is `async (params, { signal }) => result` and `annotations.readOnlyHint` maps directly onto the registry's `readOnly` flag. Unregistration is via `AbortController`. WebMCP is an origin trial and "subject to change", so feature detection is mandatory. Types: `webmcp-types@0.1.5`.

- [ ] **Step 1: Write the failing test**

`tests/dom/webmcp.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWebMcpTools } from '../../src/islands/webmcp';
import { COMMANDS } from '../../src/commands/registry';

const projects = [{ slug: 'gym-log', title: 'A workout tracker', repo: 'https://x/gl' }];
const ctx = () => ({ projects: projects as any, setTheme: vi.fn() });

let registerTool: ReturnType<typeof vi.fn>;
let target: any;

beforeEach(() => {
  registerTool = vi.fn().mockResolvedValue(undefined);
  target = { modelContext: { registerTool } };
});

describe('registerWebMcpTools', () => {
  it('registers one tool per registry command — no hand-maintained second list (§7.1)', async () => {
    await registerWebMcpTools(ctx(), target);
    expect(registerTool).toHaveBeenCalledTimes(COMMANDS.length);
    const names = registerTool.mock.calls.map((c) => c[0].name).sort();
    expect(names).toEqual(COMMANDS.map((c) => c.name).sort());
  });

  it('passes each command description and inputSchema straight through', async () => {
    await registerWebMcpTools(ctx(), target);
    for (const c of COMMANDS) {
      const call = registerTool.mock.calls.find((x) => x[0].name === c.name)!;
      expect(call[0].description).toBe(c.description);
      expect(call[0].inputSchema).toEqual(c.inputSchema);
    }
  });

  it('maps readOnly onto annotations.readOnlyHint', async () => {
    await registerWebMcpTools(ctx(), target);
    for (const c of COMMANDS) {
      const call = registerTool.mock.calls.find((x) => x[0].name === c.name)!;
      expect(call[0].annotations.readOnlyHint, c.name).toBe(c.readOnly);
    }
  });

  it('returns the command output as text when a tool is executed', async () => {
    await registerWebMcpTools(ctx(), target);
    const whoami = registerTool.mock.calls.find((c) => c[0].name === 'whoami')![0];
    const result = await whoami.execute({}, { signal: new AbortController().signal });
    expect(String(result)).toMatch(/full-stack developer/i);
  });

  it('passes arguments through to the command', async () => {
    const c = ctx();
    await registerWebMcpTools(c, target);
    const theme = registerTool.mock.calls.find((x) => x[0].name === 'theme')![0];
    await theme.execute({ mode: 'dark' }, { signal: new AbortController().signal });
    expect(c.setTheme).toHaveBeenCalledWith('dark');
  });

  it('supplies an AbortSignal so tools can be unregistered', async () => {
    const controller = await registerWebMcpTools(ctx(), target);
    expect(controller).toBeInstanceOf(AbortController);
    for (const call of registerTool.mock.calls) expect(call[1].signal).toBe(controller!.signal);
  });

  it('no-ops without throwing when the browser has no WebMCP support', async () => {
    expect(await registerWebMcpTools(ctx(), {} as any)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/dom/webmcp.test.ts`
Expected: FAIL — cannot resolve `webmcp`.

- [ ] **Step 3: Write the registration module**

`src/islands/webmcp.ts`:
```ts
import { COMMANDS, runLine, type CommandCtx } from '../commands/registry';

type ToolTarget = { modelContext?: { registerTool: (tool: unknown, opts: unknown) => Promise<void> } };

/**
 * Registers every registry command as a WebMCP tool.
 *
 * The registry (§7.1) is the single source of truth: the terminal renders it
 * for humans, this registers it for agents, and the build emits it into
 * agent-card.json. Adding a command extends all three.
 */
export async function registerWebMcpTools(
  ctx: CommandCtx,
  target: ToolTarget = document as unknown as ToolTarget,
): Promise<AbortController | null> {
  const mc = target?.modelContext;
  if (!mc?.registerTool) return null;   // origin trial — absence is normal

  const controller = new AbortController();

  await Promise.all(
    COMMANDS.map((c) =>
      mc.registerTool(
        {
          name: c.name,
          description: c.description,
          inputSchema: c.inputSchema,
          annotations: { readOnlyHint: c.readOnly },
          execute: async (params: Record<string, string>) => {
            const positional = params?.target ?? params?.mode ?? '';
            const result = runLine(`${c.name} ${positional}`.trim(), ctx);
            return result.lines.map((l) => l.text).join('\n').trim();
          },
        },
        { signal: controller.signal },
      ),
    ),
  );

  return controller;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/dom/webmcp.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Wire it into the island**

Add to `src/islands/Terminal.tsx`, inside the component:
```tsx
  useEffect(() => {
    let controller: AbortController | null = null;
    import('./webmcp').then(({ registerWebMcpTools }) =>
      registerWebMcpTools({ projects, setTheme: (t) => window.__setTheme?.(t) })
        .then((c) => { controller = c; }),
    );
    return () => controller?.abort();
  }, [projects]);
```

- [ ] **Step 6: Verify and stage**

Run: `pnpm vitest run && pnpm build`
Expected: every suite PASS; build succeeds.

```bash
git add -A
```

---

## Task 10: Home page

**Files:**
- Create: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/Hero.astro`, `src/components/ProjectCard.astro`, `src/components/ProjectGrid.astro`
- Modify: `src/pages/index.astro` (replaces the Task 1 shell)
- Test: `tests/components/home.test.ts`

**Interfaces:**
- Consumes: `Base.astro` (Task 5), `projects` collection (Task 6), `Terminal` island (Task 8), `TerminalButton`, `ThemeToggle`, `MotionToggle`.
- Produces: the rendered Home route; `ProjectGrid` is reused nowhere else but `ProjectCard`'s link rule is asserted here.

- [ ] **Step 1: Write the failing test**

`tests/components/home.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ProjectCard from '../../src/components/ProjectCard.astro';

const base = {
  slug: 'table-kit',
  kicker: 'open source',
  title: 'A headless table toolkit built on TanStack Table',
  summary: 'Column sizing, pinning and virtualised rows packaged once.',
  tags: ['TypeScript', 'React'],
  featured: true,
};

const render = async (data: object) => {
  const c = await AstroContainer.create();
  return c.renderToString(ProjectCard, { props: { project: data } });
};

describe('ProjectCard — the dead-link rule (§6)', () => {
  it('renders no link buttons when the entry has no URLs', async () => {
    const html = await render(base);
    expect(html).not.toContain('Repo');
    expect(html).not.toContain('Live demo');
  });

  it('renders only the repo button when only repo exists', async () => {
    const html = await render({ ...base, repo: 'https://github.com/x/tk' });
    expect(html).toContain('Repo');
    expect(html).not.toContain('Live demo');
    expect(html).toContain('https://github.com/x/tk');
  });

  it('renders both buttons when both exist', async () => {
    const html = await render({ ...base, repo: 'https://g/x', demo: 'https://d.app' });
    expect(html).toContain('Repo');
    expect(html).toContain('Live demo');
  });

  it('shows the featured pill only when featured', async () => {
    expect(await render(base)).toContain('featured');
    expect(await render({ ...base, featured: false })).not.toContain('featured');
  });

  it('renders every tag', async () => {
    const html = await render(base);
    expect(html).toContain('TypeScript');
    expect(html).toContain('React');
  });

  it('uses no inline style attributes — the artboard idiom is not ported (§8)', async () => {
    expect(await render(base)).not.toMatch(/\sstyle="/);
  });

  it('opens external links safely', async () => {
    const html = await render({ ...base, repo: 'https://github.com/x/tk' });
    expect(html).toMatch(/rel="[^"]*noopener/);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/components/home.test.ts`
Expected: FAIL — cannot resolve `ProjectCard.astro`.

- [ ] **Step 3: Write ProjectCard**

`src/components/ProjectCard.astro`. Featured cards span two of the three columns and take a gradient fill and accent border; others are flat with a neutral border (§8).

```astro
---
interface Project {
  slug: string; kicker: string; title: string; summary: string;
  tags: string[]; repo?: string; demo?: string; featured: boolean;
}
interface Props { project: Project }
const { project: p } = Astro.props;

const cardClass = [
  'flex flex-col justify-between gap-6 rounded-xl p-7',
  p.featured
    ? 'md:col-span-2 min-h-[300px] border-[var(--color-accent-800)] bg-[linear-gradient(155deg,var(--color-surface)_0%,color-mix(in_oklch,var(--color-surface)_62%,var(--color-bg))_70%)]'
    : 'min-h-[260px] border-[var(--color-neutral-900)] bg-[color-mix(in_oklch,var(--color-surface)_62%,var(--color-bg))]',
  'border',
].join(' ');

const titleClass = p.featured
  ? 'font-[var(--font-heading)] text-[27px] leading-tight tracking-[-0.02em] mb-3 max-w-[24ch]'
  : 'font-[var(--font-heading)] text-[22px] leading-tight tracking-[-0.02em] mb-3 max-w-[24ch]';
---
<article class={cardClass}>
  <div>
    <div class="mb-3.5 flex items-center gap-2.5">
      <span class="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-neutral-600)]">
        {p.kicker}
      </span>
      {p.featured && (
        <span class="rounded border border-[var(--color-accent-800)] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-1.5 py-1 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--color-accent-300)]">
          featured
        </span>
      )}
    </div>
    <h3 class={titleClass}>{p.title}</h3>
    <p class="mb-5 max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)] text-pretty">
      {p.summary}
    </p>
  </div>
  <div>
    <div class="mb-4.5 flex flex-wrap gap-1.5">
      {p.tags.map((t) => (
        <span class="rounded bg-[var(--color-neutral-900)] px-2 py-1.5 font-[var(--font-mono)] text-[11px] text-[var(--color-neutral-500)]">{t}</span>
      ))}
    </div>
    <div class="flex gap-2">
      {p.repo && (
        <a href={p.repo} rel="noopener noreferrer" target="_blank"
           class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-accent-300)] no-underline hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]">
          Repo →
        </a>
      )}
      {p.demo && (
        <a href={p.demo} rel="noopener noreferrer" target="_blank"
           class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-800)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-text)] no-underline hover:border-[var(--color-neutral-700)]">
          Live demo →
        </a>
      )}
    </div>
  </div>
</article>
```

- [ ] **Step 4: Run the card tests to verify they pass**

Run: `pnpm vitest run tests/components/home.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Write Nav, Footer, Hero, ProjectGrid**

`src/components/Nav.astro`:
```astro
---
import TerminalButton from './TerminalButton.astro';
import ThemeToggle from './ThemeToggle.astro';
interface Props { current?: 'home' | 'about' }
const { current } = Astro.props;
const link = 'text-sm no-underline hover:text-[var(--color-text)]';
---
<header class="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-10 py-5.5">
  <a href="/" class="font-[var(--font-heading)] text-[15px] font-medium tracking-[-0.01em] text-[var(--color-text)] no-underline">
    abhishek<span class="text-[var(--color-accent)]">.</span>
  </a>
  <nav class="flex items-center gap-7" aria-label="Main">
    <a href="/#work" class={`${link} text-[var(--color-neutral-400)]`}>Work</a>
    <a href="/about"
       aria-current={current === 'about' ? 'page' : undefined}
       class={current === 'about'
         ? `${link} border-b border-[var(--color-accent)] pb-0.5 text-[var(--color-text)]`
         : `${link} text-[var(--color-neutral-400)]`}>About</a>
    <TerminalButton variant="nav" />
    <ThemeToggle />
  </nav>
</header>
```

`src/components/Footer.astro` — note `llms.txt` is surfaced to humans too, which is a small, honest signal (§11).
```astro
---
import MotionToggle from './MotionToggle.astro';
const link = 'text-[13px] text-[var(--color-neutral-500)] no-underline hover:text-[var(--color-text)]';
---
<footer class="border-t border-[var(--color-neutral-900)]">
  <div class="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-10 py-7">
    <span class="font-[var(--font-mono)] text-xs text-[var(--color-neutral-700)]">
      built with astro · deployed on cloudflare
    </span>
    <div class="flex items-center gap-5">
      <a class={link} href="https://github.com/singhsterabhi" rel="noopener noreferrer">GitHub</a>
      <a class={link} href="https://linkedin.com/in/singhsterabhi" rel="noopener noreferrer">LinkedIn</a>
      <a class={link} href="/llms.txt">llms.txt</a>
      <MotionToggle />
    </div>
  </div>
</footer>
```

`src/components/Hero.astro` — the copy is the artboard's, which resolved the §13 positioning-line blocker.
```astro
---
import TerminalButton from './TerminalButton.astro';
import { CONTACT, RESUME_PATH } from '../commands/registry';
const primary = 'inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-accent-300)] no-underline hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]';
const secondary = 'inline-flex items-center gap-2 rounded-lg border border-[var(--color-neutral-800)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-text)] no-underline hover:border-[var(--color-neutral-700)]';
---
<section class="mx-auto max-w-[1120px] px-10 pb-22 pt-24">
  <p class="mb-7 font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-600)]">
    Bengaluru · open to talk
  </p>
  <h1 class="mb-6 max-w-[16ch] font-[var(--font-heading)] text-[clamp(44px,6.4vw,76px)] leading-[1.02] tracking-[-0.03em]">
    Abhishek Singh
  </h1>
  <p class="mb-10 max-w-[34ch] text-[21px] leading-normal text-[var(--color-neutral-300)] text-pretty">
    Full-stack developer — I build interfaces people enjoy and APIs that hold up at scale.
  </p>
  <div class="mb-10 flex flex-wrap gap-2.5">
    <a class={primary} href={RESUME_PATH}>Résumé PDF</a>
    <a class={secondary} href={`mailto:${CONTACT.email}`}>Email</a>
    <a class={secondary} href={CONTACT.github} rel="noopener noreferrer">GitHub</a>
  </div>
  <TerminalButton variant="hero" />
</section>
```

`src/components/ProjectGrid.astro`:
```astro
---
import ProjectCard from './ProjectCard.astro';
interface Props { projects: any[] }
const { projects } = Astro.props;
// With two entries — one featured spanning two columns — this fills exactly
// one row of three, which is why it reads deliberate rather than sparse (§8).
---
<section id="work" class="mx-auto max-w-[1120px] px-10 pb-24">
  <div class="mb-6 flex items-baseline justify-between gap-6">
    <h2 class="font-[var(--font-mono)] text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-600)]">
      Selected work
    </h2>
    <span class="text-[13px] text-[var(--color-neutral-700)]">two things I actually finished</span>
  </div>
  <div class="hr mb-8"></div>
  <div class="grid gap-5 md:grid-cols-3">
    {projects.map((p) => <ProjectCard project={p} />)}
  </div>
</section>
```

- [ ] **Step 6: Write the Home route**

`src/pages/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';
import ProjectGrid from '../components/ProjectGrid.astro';
import Footer from '../components/Footer.astro';
import Terminal from '../islands/Terminal';
import { CONTACT } from '../commands/registry';

const entries = await getCollection('projects');
const projects = entries
  .map((e) => e.data)
  .sort((a, b) => Number(b.featured) - Number(a.featured));

const site = Astro.site!.href;
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': site + '#person',
      name: 'Abhishek Singh',
      jobTitle: 'Full-stack developer',
      description: 'Full-stack developer — I build interfaces people enjoy and APIs that hold up at scale.',
      url: site,
      email: 'mailto:' + CONTACT.email,
      sameAs: [CONTACT.github, CONTACT.linkedin],
      address: { '@type': 'PostalAddress', addressLocality: 'Bengaluru', addressCountry: 'IN' },
    },
    { '@type': 'WebSite', '@id': site + '#website', url: site, name: 'Abhishek Singh', publisher: { '@id': site + '#person' } },
    {
      '@type': 'ProfilePage',
      '@id': site + '#profilepage',
      isPartOf: { '@id': site + '#website' },
      mainEntity: { '@id': site + '#person' },
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.positioning'] },
    },
  ],
};
---
<Base
  title="Abhishek Singh — full-stack developer"
  description="Full-stack developer — I build interfaces people enjoy and APIs that hold up at scale."
  canonical={site}
  markdownUrl={site + 'index.md'}
  jsonLd={jsonLd}
>
  <Nav current="home" />
  <main id="main" class="bg-[radial-gradient(120%_60%_at_12%_0%,color-mix(in_oklch,var(--color-surface)_68%,var(--color-accent-900))_0%,transparent_60%)]">
    <Hero />
    <ProjectGrid projects={projects} />
    <section class="mx-auto max-w-[1120px] px-10 pb-28">
      <div class="max-w-[56ch]">
        <h2 class="mb-5 font-[var(--font-mono)] text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-600)]">About</h2>
        <p class="mb-5.5 text-[20px] leading-snug text-[var(--color-neutral-300)] text-pretty">
          Grew up in Gorakhpur, currently a bit of a nomad. I care about the boring parts — cold starts, empty states, the third click — and I like the kind of work where the fix is small and the difference is obvious.
        </p>
        <a href="/about" class="border-b border-[var(--color-accent-800)] text-[15px] text-[var(--color-accent-300)] no-underline hover:border-[var(--color-accent)]">More about me →</a>
      </div>
    </section>
  </main>
  <Footer />
  <Terminal projects={projects} client:idle />
</Base>
```

- [ ] **Step 6b: Add the no-flash guard — inherited from Task 5**

Task 5 could not test its most important invariant. The theme script must be a
blocking inline script that runs **before** the stylesheet, or every dark-theme
visitor sees a white flash on every navigation. Astro's container renderer never
injects the global `<link rel="stylesheet">`, so the ordering is invisible to a
component test. Task 10 produces the first real page that uses `Base.astro`, so
the assertion belongs here, against built output.

Append to `tests/agents/404.test.ts`'s sibling — create `tests/agents/head-order.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pages = ['dist/index.html', 'dist/about/index.html'];

describe('no-flash guard (inherited from Task 5)', () => {
  for (const path of pages) {
    it(`${path}: the theme script runs before any stylesheet`, () => {
      expect(existsSync(path), 'run `pnpm build` first').toBe(true);
      const head = readFileSync(path, 'utf8').split('</head>')[0];
      const scriptAt = head.search(/<script(?![^>]*\bsrc=)/);
      const styleAt = head.search(/<(link[^>]+stylesheet|style)/);
      expect(scriptAt, 'no inline script in head').toBeGreaterThan(-1);
      expect(styleAt, 'no stylesheet in head').toBeGreaterThan(-1);
      expect(scriptAt, 'script after stylesheet — this is the flash').toBeLessThan(styleAt);
    });

    it(`${path}: no inline script is deferred`, () => {
      const head = readFileSync(path, 'utf8').split('</head>')[0];
      for (const tag of head.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? []) {
        expect(tag, `deferred inline script: ${tag}`).not.toMatch(/\b(defer|async)\b/);
      }
    });
  }
});
```

Run: `pnpm build && pnpm vitest run tests/agents/head-order.test.ts`
Expected: 4 PASS. Note the order — the test reads build output, so build first.

- [ ] **Step 7: Verify the build and the zero-JS-on-content claim**

Run:
```bash
pnpm build
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');const m=h.match(/<script[^>]*type=\"module\"/g)||[];console.log('module scripts:',m.length)"
```
Expected: build succeeds. The terminal island is `client:idle`, so exactly one hydration script is present and it is code-split — the page content itself renders without it, which Task 17 verifies with JS disabled.

- [ ] **Step 8: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 11: About page

**Files:**
- Create: `src/components/Timeline.astro`, `src/pages/about.astro`
- Test: `tests/components/about.test.ts`

**Interfaces:**
- Consumes: `Base.astro`, `timeline` collection (Task 6, currently empty), `Nav`, `Footer`, `Terminal`.
- Produces: the `/about` route.

- [ ] **Step 1: Write the failing test**

The important assertions are the two graceful-degradation cases: the timeline is empty until §13 inputs arrive, and the portrait may be absent. Neither may leave a hole.

`tests/components/about.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Timeline from '../../src/components/Timeline.astro';

const render = async (entries: object[]) => {
  const c = await AstroContainer.create();
  return c.renderToString(Timeline, { props: { entries } });
};

describe('Timeline', () => {
  it('renders nothing at all when there are no entries — no empty heading (§13)', async () => {
    const html = (await render([])).trim();
    expect(html).not.toContain("Where I've worked");
    expect(html).not.toContain('<ol');
  });

  it('renders the section once there is at least one entry', async () => {
    const html = await render([
      { when: '2022 → now', role: 'Software Engineer · media.net', note: 'Cut p99 to 380ms.' },
    ]);
    expect(html).toContain("Where I've worked");
    expect(html).toContain('media.net');
    expect(html).toContain('380ms');
  });

  it('uses an ordered list — the sequence is meaningful', async () => {
    const html = await render([{ when: 'a', role: 'b', note: 'c' }]);
    expect(html).toContain('<ol');
  });

  it('uses no inline style attributes (§8)', async () => {
    const html = await render([{ when: 'a', role: 'b', note: 'c' }]);
    expect(html).not.toMatch(/\sstyle="/);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/components/about.test.ts`
Expected: FAIL — cannot resolve `Timeline.astro`.

- [ ] **Step 3: Write Timeline**

`src/components/Timeline.astro`:
```astro
---
interface Entry { when: string; role: string; note: string }
interface Props { entries: Entry[] }
const { entries } = Astro.props;
---
{entries.length > 0 && (
  <section class="mx-auto max-w-[1120px] px-10 pb-28 pt-14">
    <h2 class="mb-6 font-[var(--font-mono)] text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-600)]">
      Where I've worked
    </h2>
    <div class="hr mb-2"></div>
    <ol class="m-0 list-none p-0">
      {entries.map((t) => (
        <li class="grid gap-8 border-b border-[var(--color-surface)] py-5.5 md:grid-cols-[180px_minmax(0,1fr)]">
          <span class="pt-0.5 font-[var(--font-mono)] text-[13px] text-[var(--color-neutral-600)]">{t.when}</span>
          <div>
            <h3 class="mb-1.5 font-[var(--font-heading)] text-[19px] leading-tight">{t.role}</h3>
            <p class="m-0 max-w-[58ch] text-[15px] leading-relaxed text-[var(--color-neutral-500)]">{t.note}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/components/about.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Write the About route**

The prose is adopted verbatim from the artboard (§8). The portrait `<figure>` is **omitted entirely** rather than shipping the striped placeholder (§13); when a real photo arrives, restore the figure and change the grid to two columns.

`src/pages/about.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import Timeline from '../components/Timeline.astro';
import Terminal from '../islands/Terminal';
import { CONTACT, RESUME_PATH } from '../commands/registry';

const entries = (await getCollection('timeline')).map((e) => e.data);
const projects = (await getCollection('projects')).map((e) => e.data);
const site = Astro.site!.href;
const canonical = site + 'about';

const primary = 'inline-flex items-center rounded-lg border border-[var(--color-accent)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-accent-300)] no-underline hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]';
const secondary = 'inline-flex items-center rounded-lg border border-[var(--color-neutral-800)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-text)] no-underline hover:border-[var(--color-neutral-700)]';
const body = 'mb-5 text-[17px] leading-[1.7] text-[var(--color-neutral-400)] text-pretty';
---
<Base
  title="About — Abhishek Singh"
  description="Gorakhpur by origin, nomad by habit. A short honest version of who Abhishek Singh is and the work he enjoys."
  canonical={canonical}
  markdownUrl={site + 'about.md'}
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: canonical,
    mainEntity: { '@type': 'Person', name: 'Abhishek Singh', url: site },
  }}
>
  <Nav current="about" />
  <main id="main">
    <div class="mx-auto max-w-[1120px] px-10 pb-10 pt-18">
      <h1 class="mb-8 max-w-[20ch] font-[var(--font-heading)] text-[clamp(36px,4.6vw,54px)] leading-[1.05] tracking-[-0.03em]">
        A short honest version
      </h1>
      <div class="max-w-[62ch]">
        <p class="mb-5 text-[18px] leading-[1.65] text-[var(--color-neutral-300)] text-pretty">
          I'm Abhishek. I grew up in Gorakhpur and I've been a bit of a nomad since — a few cities, a few teams, one steady habit of taking things apart to see why they're slow.
        </p>
        <p class={body}>
          Work-wise I sit in the middle: interfaces on one side, the services behind them on the other. The parts I enjoy most are the unglamorous ones — a table that stays smooth at ten thousand rows, an endpoint whose p99 doesn't wobble when traffic triples, an empty state that tells you what to do next.
        </p>
        <p class={body}>
          Away from a keyboard it's mostly music and movies, and a running list of both that I'm always happy to argue about.
        </p>
        <p class="m-0 text-[17px] leading-[1.7] text-[var(--color-neutral-400)] text-pretty">
          If any of this sounds like your kind of problem — hit me up.
        </p>
      </div>
      <div class="mt-9 flex flex-wrap gap-2.5">
        <a class={primary} href={`mailto:${CONTACT.email}`}>Email me</a>
        <a class={secondary} href={RESUME_PATH}>Résumé PDF</a>
      </div>
    </div>
    <Timeline entries={entries} />
  </main>
  <Footer />
  <Terminal projects={projects} client:idle />
</Base>
```

- [ ] **Step 6: Verify and stage**

Run: `pnpm vitest run && pnpm build`
Expected: all suites PASS; `dist/about/index.html` exists and contains no "Where I've worked" heading (timeline still empty).

```bash
git add -A
```

---

## Task 12: 404 and the /terminal alias route

**Files:**
- Create: `src/pages/404.astro`, `src/pages/terminal.astro`
- Test: `tests/agents/404.test.ts`

**Interfaces:**
- Consumes: `Base.astro`, `Nav`, `Terminal`.
- Produces: `/404.html` and `/terminal`.

- [ ] **Step 1: Write the failing test**

`tests/agents/404.test.ts` — asserted against the **built output**, not through
AstroContainer. The page legitimately calls `getCollection`, and the container
has no content layer; asserting on real build output is also stronger evidence.
This test requires `pnpm build` to have run.

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const path = 'dist/404.html';

describe('404 page (built output)', () => {
  it('is emitted at the root so Cloudflare serves it automatically', () => {
    expect(existsSync(path), 'run `pnpm build` first').toBe(true);
  });

  it('offers working escape hatches to Home and About', () => {
    const html = readFileSync(path, 'utf8');
    expect(html).toMatch(/href="\/"/);
    expect(html).toMatch(/href="\/about"/);
  });

  it('is excluded from indexing — a 404 must not be advertised', () => {
    expect(readFileSync(path, 'utf8')).toMatch(/<meta name="robots" content="noindex"/);
  });

  it('keeps the site voice rather than a bare browser error', () => {
    expect(readFileSync(path, 'utf8')).toContain('Nothing here.');
  });

  it('states plainly that it is a real 404', () => {
    expect(readFileSync(path, 'utf8')).toContain('genuinely, not a soft one');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/agents/404.test.ts`
Expected: FAIL — `dist/404.html` does not exist.

- [ ] **Step 3: Write the 404 page**

Copy is the artboard's, adopted as written (§8).

`src/pages/404.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Terminal from '../islands/Terminal';
import { getCollection } from 'astro:content';
const projects = (await getCollection('projects')).map((e) => e.data);
const site = Astro.site!.href;
const primary = 'inline-flex items-center rounded-lg border border-[var(--color-accent)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-accent-300)] no-underline hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]';
const secondary = 'inline-flex items-center rounded-lg border border-[var(--color-neutral-800)] px-4.5 py-2.5 text-sm font-medium text-[var(--color-text)] no-underline hover:border-[var(--color-neutral-700)]';
---
<Base title="Nothing here — Abhishek Singh" description="Page not found." canonical={site}>
  <meta name="robots" content="noindex" slot="head" />
  <main id="main" class="grid min-h-screen place-items-center bg-[radial-gradient(90%_50%_at_20%_10%,color-mix(in_oklch,var(--color-surface)_68%,var(--color-accent-900))_0%,transparent_60%)]">
    <div class="max-w-[640px] p-10">
      <p class="mb-6 font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-neutral-600)]">
        HTTP 404 · genuinely, not a soft one
      </p>
      <h1 class="mb-6 font-[var(--font-heading)] text-[clamp(48px,7vw,84px)] leading-none tracking-[-0.035em]">
        Nothing here.
      </h1>
      <p class="mb-3 max-w-[44ch] text-[19px] leading-relaxed text-[var(--color-neutral-300)] text-pretty">
        Either I moved it, or you typed it hopefully. Both are fair.
      </p>
      <p class="mb-8 font-[var(--font-mono)] text-[13px] leading-[1.9] text-[var(--color-neutral-600)]">
        tried: <span class="text-[var(--color-neutral-400)]">/the-page-you-wanted</span><br />
        found: <span class="text-[var(--color-neutral-400)]">nothing, with a straight face</span>
      </p>
      <div class="flex flex-wrap gap-2.5">
        <a class={primary} href="/">Home</a>
        <a class={secondary} href="/about">About</a>
      </div>
    </div>
  </main>
  <Terminal projects={projects} client:idle />
</Base>
```

Add a `<slot name="head" />` to `Base.astro`'s `<head>`, immediately before `</head>`, so the `noindex` meta lands there.

- [ ] **Step 4: Write the /terminal alias**

Spec §7: a shareable URL that deep-opens the overlay, without making the CLI a separate destination. It renders Home and mounts the island with `openOnMount`.

`src/pages/terminal.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';
import ProjectGrid from '../components/ProjectGrid.astro';
import Footer from '../components/Footer.astro';
import Terminal from '../islands/Terminal';

const projects = (await getCollection('projects'))
  .map((e) => e.data)
  .sort((a, b) => Number(b.featured) - Number(a.featured));
const site = Astro.site!.href;
---
<Base
  title="Terminal — Abhishek Singh"
  description="A command-line view of Abhishek Singh's portfolio. The same commands agents get through WebMCP."
  canonical={site + 'terminal'}
>
  <Nav current="home" />
  <main id="main">
    <Hero />
    <ProjectGrid projects={projects} />
  </main>
  <Footer />
  <Terminal projects={projects} openOnMount client:load />
</Base>
```

- [ ] **Step 5: Verify and stage**

Run: `pnpm build && pnpm vitest run tests/agents/404.test.ts`
Expected: build succeeds, then 5 PASS. Note the order — the test reads build
output, so the build must run first.

```bash
git add -A
```

---

## Task 13: Agent surface — Discoverability (§11 Section 1)

**Files:**
- Create: `public/robots.txt`, `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/lib/site-content.ts`
- Test: `tests/agents/discoverability.test.ts`

**Interfaces:**
- Consumes: `projects` collection, `CONTACT`, `COMMANDS`.
- Produces: `src/lib/site-content.ts` exporting `POSITIONING`, `ABOUT_PARAGRAPHS`, `buildLlmsTxt(projects)`, `buildLlmsFullTxt(projects)` — reused by Task 14's markdown twins so there is exactly one copy of the prose.

- [ ] **Step 1: Write the failing test**

`tests/agents/discoverability.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLlmsTxt, buildLlmsFullTxt, POSITIONING } from '../../src/lib/site-content';

const projects = [
  { slug: 'table-kit', kicker: 'open source', title: 'A headless table toolkit', summary: 'Packaged once.', tags: ['TypeScript'], repo: 'https://g/tk', featured: true },
  { slug: 'gym-log', kicker: 'side project', title: 'A workout tracker', summary: 'Two taps.', tags: ['React'], demo: 'https://gl.app', featured: false },
];

describe('robots.txt', () => {
  const txt = readFileSync('public/robots.txt', 'utf8');

  it('names the AI crawlers explicitly rather than relying on a wildcard (§11)', () => {
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      expect(txt).toContain(bot);
    }
  });

  it('states an allow policy for them', () => {
    expect(txt).toMatch(/Allow: \//);
  });

  it('points at the sitemap with an absolute URL', () => {
    expect(txt).toContain('Sitemap: https://singhsterabhi.pages.dev/sitemap-index.xml');
  });
});

describe('buildLlmsTxt', () => {
  const txt = buildLlmsTxt(projects as any);

  it('opens with an H1 naming the person', () => {
    expect(txt.split('\n')[0]).toBe('# Abhishek Singh');
  });

  it('states the positioning line', () => {
    expect(txt).toContain(POSITIONING);
  });

  it('lists every project with an absolute URL', () => {
    expect(txt).toContain('table-kit');
    expect(txt).toContain('https://g/tk');
    expect(txt).toContain('https://gl.app');
  });

  it('points to the résumé, contact and the markdown twins', () => {
    expect(txt).toContain('/abhishek-singh.pdf');
    expect(txt).toContain('singhsterabhi@gmail.com');
    expect(txt).toContain('/index.md');
    expect(txt).toContain('/about.md');
  });

  it('advertises the agent card so a capable agent finds the tools', () => {
    expect(txt).toContain('/.well-known/agent-card.json');
  });

  it('stays concise — llms.txt is an index, not the corpus', () => {
    expect(txt.length).toBeLessThan(3000);
  });
});

describe('buildLlmsFullTxt', () => {
  const full = buildLlmsFullTxt(projects as any);

  it('includes the full about prose, not just a summary', () => {
    expect(full).toContain('Gorakhpur');
    expect(full).toContain('empty state that tells you what to do next');
  });

  it('includes every project summary in full', () => {
    expect(full).toContain('Packaged once.');
    expect(full).toContain('Two taps.');
  });

  it('is materially longer than llms.txt', () => {
    expect(full.length).toBeGreaterThan(buildLlmsTxt(projects as any).length);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/agents/discoverability.test.ts`
Expected: FAIL — cannot resolve `site-content`.

- [ ] **Step 3: Write the shared content module**

`src/lib/site-content.ts` — **the single copy of the site's prose.** Tasks 10, 11 and 14 all read it, so the machine-facing text cannot drift from the human-facing text (§11 design principle).

```ts
import { CONTACT, RESUME_PATH } from '../commands/registry';

export const SITE = 'https://singhsterabhi.pages.dev';
export const NAME = 'Abhishek Singh';
export const POSITIONING =
  'Full-stack developer — I build interfaces people enjoy and APIs that hold up at scale.';
export const LOCATION = 'Bengaluru, India';

export const ABOUT_PARAGRAPHS = [
  "I'm Abhishek. I grew up in Gorakhpur and I've been a bit of a nomad since — a few cities, a few teams, one steady habit of taking things apart to see why they're slow.",
  'Work-wise I sit in the middle: interfaces on one side, the services behind them on the other. The parts I enjoy most are the unglamorous ones — a table that stays smooth at ten thousand rows, an endpoint whose p99 doesn’t wobble when traffic triples, an empty state that tells you what to do next.',
  "Away from a keyboard it's mostly music and movies, and a running list of both that I'm always happy to argue about.",
  'If any of this sounds like your kind of problem — hit me up.',
];

export const HOME_ABOUT_TEASER =
  'Grew up in Gorakhpur, currently a bit of a nomad. I care about the boring parts — cold starts, empty states, the third click — and I like the kind of work where the fix is small and the difference is obvious.';

export type Project = {
  slug: string; kicker: string; title: string; summary: string;
  tags: string[]; repo?: string; demo?: string; featured: boolean;
};

const links = (p: Project) =>
  [p.repo && `repo: ${p.repo}`, p.demo && `demo: ${p.demo}`].filter(Boolean).join(' · ');

export function buildLlmsTxt(projects: Project[]): string {
  return [
    `# ${NAME}`,
    '',
    `> ${POSITIONING}`,
    '',
    `Based in ${LOCATION}. This file is a machine-readable index of the site.`,
    '',
    '## Pages',
    `- [Home](${SITE}/) — markdown: ${SITE}/index.md`,
    `- [About](${SITE}/about) — markdown: ${SITE}/about.md`,
    `- [Terminal](${SITE}/terminal) — a command-line view of this site`,
    '',
    '## Projects',
    ...projects.map((p) => `- **${p.slug}** — ${p.title}. ${p.summary} [${p.tags.join(', ')}]${links(p) ? ' ' + links(p) : ''}`),
    '',
    '## Contact',
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- LinkedIn: ${CONTACT.linkedin}`,
    `- Résumé: ${SITE}${RESUME_PATH}`,
    '',
    '## For agents',
    `- Full text: ${SITE}/llms-full.txt`,
    `- Callable tools (A2A agent card): ${SITE}/.well-known/agent-card.json`,
    '- This site also registers WebMCP tools in-page via document.modelContext.',
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(projects: Project[]): string {
  return [
    `# ${NAME}`,
    '',
    `> ${POSITIONING}`,
    '',
    `Based in ${LOCATION}.`,
    '',
    '## Home',
    '',
    HOME_ABOUT_TEASER,
    '',
    '## About',
    '',
    ...ABOUT_PARAGRAPHS.flatMap((p) => [p, '']),
    '## Projects',
    '',
    ...projects.flatMap((p) => [
      `### ${p.title}`,
      '',
      `- slug: ${p.slug}`,
      `- kind: ${p.kicker}`,
      `- tech: ${p.tags.join(', ')}`,
      ...(links(p) ? [`- links: ${links(p)}`] : ['- links: none published yet']),
      '',
      p.summary,
      '',
    ]),
    '## Contact',
    '',
    `- Email: ${CONTACT.email}`,
    `- GitHub: ${CONTACT.github}`,
    `- LinkedIn: ${CONTACT.linkedin}`,
    `- Résumé: ${SITE}${RESUME_PATH}`,
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Write robots.txt**

`public/robots.txt`:
```
# Humans and general crawlers
User-agent: *
Allow: /

# AI crawlers and agents — named explicitly so the policy is a stated
# decision rather than an accident of the wildcard above.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://singhsterabhi.pages.dev/sitemap-index.xml
```

- [ ] **Step 5: Write the two generated endpoints**

`src/pages/llms.txt.ts`:
```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildLlmsTxt } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).map((e) => e.data);
  return new Response(buildLlmsTxt(projects as any), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

`src/pages/llms-full.txt.ts`:
```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildLlmsFullTxt } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).map((e) => e.data);
  return new Response(buildLlmsFullTxt(projects as any), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

- [ ] **Step 6: Refactor the pages onto the shared prose**

Replace the hard-coded strings in `src/pages/index.astro` (the about teaser, the positioning line) and `src/pages/about.astro` (the four paragraphs) with imports from `src/lib/site-content.ts`. This is the step that makes the drift-proof claim true rather than aspirational — do not skip it.

- [ ] **Step 7: Run the tests and the build**

Run: `pnpm vitest run && pnpm build`
Expected: all suites PASS. `dist/llms.txt` and `dist/llms-full.txt` exist and contain both project slugs.

- [ ] **Step 8: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 14: Agent surface — markdown twins and the agent card (§11 Sections 2 & 3)

**Files:**
- Create: `src/pages/index.md.ts`, `src/pages/about.md.ts`, `src/pages/.well-known/agent-card.json.ts`, `public/_headers`
- Test: `tests/agents/twins.test.ts`, `tests/agents/agent-card.test.ts`

**Interfaces:**
- Consumes: `site-content.ts` (Task 13), `COMMANDS` (Task 7).
- Produces: `/index.md`, `/about.md`, `/.well-known/agent-card.json`, and the `Link` headers.

- [ ] **Step 1: Write the failing tests**

`tests/agents/twins.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildHomeMarkdown, buildAboutMarkdown } from '../../src/lib/site-content';
import { ABOUT_PARAGRAPHS, POSITIONING, HOME_ABOUT_TEASER } from '../../src/lib/site-content';

const projects = [
  { slug: 'table-kit', kicker: 'open source', title: 'A headless table toolkit', summary: 'Packaged once.', tags: ['TypeScript'], repo: 'https://g/tk', featured: true },
];

describe('markdown twins — generated, so they cannot drift (§11)', () => {
  it('home markdown carries the same positioning line as the page', () => {
    expect(buildHomeMarkdown(projects as any)).toContain(POSITIONING);
  });

  it('home markdown carries the same about teaser as the page', () => {
    expect(buildHomeMarkdown(projects as any)).toContain(HOME_ABOUT_TEASER);
  });

  it('home markdown lists the projects', () => {
    expect(buildHomeMarkdown(projects as any)).toContain('A headless table toolkit');
  });

  it('about markdown carries every paragraph of the page verbatim', () => {
    const md = buildAboutMarkdown();
    for (const p of ABOUT_PARAGRAPHS) expect(md).toContain(p);
  });

  it('both are valid markdown documents with a single H1', () => {
    for (const md of [buildHomeMarkdown(projects as any), buildAboutMarkdown()]) {
      expect(md.match(/^# /gm)?.length).toBe(1);
    }
  });
});
```

`tests/agents/agent-card.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildAgentCard } from '../../src/lib/agent-card';
import { COMMANDS } from '../../src/commands/registry';

const card = buildAgentCard();

describe('A2A agent card — generated from the registry (§7.1)', () => {
  it('identifies the site', () => {
    expect(card.name).toBe('Abhishek Singh');
    expect(card.url).toBe('https://singhsterabhi.pages.dev');
  });

  it('declares one skill per registry command, and no others', () => {
    expect(card.skills.map((s: any) => s.id).sort()).toEqual(COMMANDS.map((c) => c.name).sort());
  });

  it('carries each command description and input schema', () => {
    for (const c of COMMANDS) {
      const skill = card.skills.find((s: any) => s.id === c.name)!;
      expect(skill.description).toBe(c.description);
      expect(skill.inputSchema).toEqual(c.inputSchema);
    }
  });

  it('marks read-only skills so an agent knows what is safe to call', () => {
    for (const c of COMMANDS) {
      expect(card.skills.find((s: any) => s.id === c.name)!.readOnly).toBe(c.readOnly);
    }
  });

  it('serialises to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(card))).not.toThrow();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run tests/agents/`
Expected: the two new files FAIL — `buildHomeMarkdown` and `src/lib/agent-card` do not exist. Task 13's suite still passes.

- [ ] **Step 3: Add the markdown builders**

Append to `src/lib/site-content.ts`:
```ts
export function buildHomeMarkdown(projects: Project[]): string {
  return [
    `# ${NAME}`,
    '',
    POSITIONING,
    '',
    `Based in ${LOCATION}. Open to talk.`,
    '',
    '## Selected work',
    '',
    ...projects.flatMap((p) => [
      `### ${p.title}`,
      '',
      `${p.summary}`,
      '',
      `Tech: ${p.tags.join(', ')}`,
      ...(links(p) ? ['', links(p)] : []),
      '',
    ]),
    '## About',
    '',
    HOME_ABOUT_TEASER,
    '',
    `Full version: ${SITE}/about.md`,
    '',
    '## Contact',
    '',
    `Email ${CONTACT.email} · GitHub ${CONTACT.github} · LinkedIn ${CONTACT.linkedin}`,
    '',
  ].join('\n');
}

export function buildAboutMarkdown(): string {
  return [
    '# A short honest version',
    '',
    ...ABOUT_PARAGRAPHS.flatMap((p) => [p, '']),
    '## Contact',
    '',
    `Email ${CONTACT.email} · Résumé ${SITE}${RESUME_PATH}`,
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Write the markdown routes**

`src/pages/index.md.ts`:
```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildHomeMarkdown } from '../lib/site-content';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).map((e) => e.data);
  return new Response(buildHomeMarkdown(projects as any), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
```

`src/pages/about.md.ts`:
```ts
import type { APIRoute } from 'astro';
import { buildAboutMarkdown } from '../lib/site-content';

export const GET: APIRoute = () =>
  new Response(buildAboutMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
```

- [ ] **Step 5: Write the agent card**

`src/lib/agent-card.ts`:
```ts
import { COMMANDS } from '../commands/registry';
import { NAME, POSITIONING, SITE } from './site-content';

export function buildAgentCard() {
  return {
    protocolVersion: '0.3.0',
    name: NAME,
    description: POSITIONING,
    url: SITE,
    version: '1.0.0',
    preferredTransport: 'WebMCP',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: COMMANDS.map((c) => ({
      id: c.name,
      name: c.name,
      description: c.description,
      inputSchema: c.inputSchema,
      readOnly: c.readOnly,
      tags: ['portfolio'],
    })),
  };
}
```

`src/pages/.well-known/agent-card.json.ts`:
```ts
import type { APIRoute } from 'astro';
import { buildAgentCard } from '../../lib/agent-card';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildAgentCard(), null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
```

- [ ] **Step 6: Write the Link headers**

`public/_headers` — Cloudflare-specific, and the capability GitHub Pages could never provide (§2, §11).

```
/*
  Link: </llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt"
  Link: </sitemap-index.xml>; rel="sitemap"
  Link: </.well-known/agent-card.json>; rel="service-desc"; type="application/json"
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/index.md
  Content-Type: text/markdown; charset=utf-8

/about.md
  Content-Type: text/markdown; charset=utf-8
```

- [ ] **Step 7: Run the tests and verify the build output**

Run:
```bash
pnpm vitest run && pnpm build
ls dist/index.md dist/about.md dist/.well-known/agent-card.json dist/llms.txt dist/llms-full.txt dist/_headers
```
Expected: all suites PASS and all six files present. **If `dist/.well-known/` is missing**, Astro is treating the dot-directory as hidden — move the route to `src/pages/well-known/agent-card.json.ts` and add a `_headers` rewrite, then re-verify.

- [ ] **Step 8: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 15: Motion contract and the living background

**Files:**
- Modify: `src/styles/global.css`, `src/components/ProjectGrid.astro`, `src/components/Hero.astro`, `src/layouts/Base.astro`
- Create: `src/components/LivingBackground.astro`, `src/scripts/rain.ts`
- Test: `tests/motion.test.ts`, `tests/dom/rain.test.ts`

**Interfaces:**
- Consumes: `--dur-*` and `--ease` tokens (Task 3), `data-motion` (Task 4).
- Produces: a `.reveal` class usable anywhere.

- [ ] **Step 1: Write the failing test**

`tests/motion.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/global.css', 'utf8');

describe('motion implementation', () => {
  it('uses native CSS scroll-driven animation, not a JS library', () => {
    expect(css).toContain('animation-timeline');
    expect(css).toContain('@supports (animation-timeline: view())');
  });

  it('drives every duration and easing from the tokens, never a literal', () => {
    const reveal = css.slice(css.indexOf('.reveal'));
    expect(reveal).toMatch(/var\(--dur-\d\)/);
    expect(reveal).toMatch(/var\(--ease\)/);
    expect(reveal).not.toMatch(/\b\d+ms\b/);
  });

  it('substitutes opacity for movement under reduced motion rather than deleting it', () => {
    expect(css).toMatch(/data-motion="reduced"\][^{]*\.reveal\s*\{[^}]*opacity:\s*1/);
  });

  it('ships no animation library', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const banned of ['gsap', 'framer-motion', 'motion', 'lenis', 'animejs']) {
      expect(deps, `${banned} must not be a dependency`).not.toContain(banned);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run tests/motion.test.ts`
Expected: FAIL — `animation-timeline` is not in `global.css`.

- [ ] **Step 3: Add the reveal**

Append to `src/styles/global.css`. Progressive enhancement: without `view()` support nothing animates and nothing is hidden, so there is no way for content to be stuck invisible.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion="reduced"]) .reveal {
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 8% cover 26%;
      animation-duration: var(--dur-4);
      animation-timing-function: var(--ease);
    }
  }
}

@keyframes reveal-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

/* Explicit reduced path: present, visible, no movement (§10). */
:root[data-motion="reduced"] .reveal {
  opacity: 1;
  transform: none;
  animation: none;
}
```

- [ ] **Step 4: Apply it sparingly**

Add `class="... reveal"` to the `<article>` in `ProjectCard.astro` and to the `<h2>` and `.hr` in `ProjectGrid.astro`. Do **not** add it to the hero — the hero is the LCP element and must not start at `opacity: 0`.

- [ ] **Step 5: Run the tests and verify**

Run: `pnpm vitest run tests/motion.test.ts && pnpm build`
Expected: 4 PASS; build succeeds.

- [ ] **Step 6: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 16: Verification scripts

**Files:**
- Create: `scripts/verify-links.mjs`, `scripts/verify-agent-surface.mjs`, `scripts/audit-placeholders.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: a built `dist/` and, for the agent surface, a deployed base URL.
- Produces: `pnpm verify:links`, `pnpm verify:agents -- <baseUrl>`, `pnpm audit:placeholders`.

- [ ] **Step 1: Write the link verifier**

`scripts/verify-links.mjs` — enforces §6's dead-link rule against the real network. A broken demo is described in the research as an instant credibility killer, so this is a gate, not a warning.

```js
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const entries = parse(readFileSync('src/data/projects.yaml', 'utf8')) ?? [];
const urls = entries.flatMap((e) => [e.repo, e.demo].filter(Boolean));

if (urls.length === 0) {
  console.log('no project URLs declared yet — nothing to verify');
  process.exit(0);
}

let failed = 0;
for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${url}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ---  ${url} (${err.message})`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} project link(s) do not resolve. Remove them from projects.yaml or fix them — a card must never render a dead link (spec §6).`);
  process.exit(1);
}
```

Install the YAML reader: `pnpm add -D yaml`

- [ ] **Step 2: Write the agent-surface verifier**

`scripts/verify-agent-surface.mjs`:
```js
const base = (process.argv[2] ?? 'https://singhsterabhi.pages.dev').replace(/\/$/, '');

const checks = [
  ['/robots.txt', 'text/plain'],
  ['/sitemap-index.xml', 'xml'],
  ['/llms.txt', 'text/plain'],
  ['/llms-full.txt', 'text/plain'],
  ['/index.md', 'text/markdown'],
  ['/about.md', 'text/markdown'],
  ['/.well-known/agent-card.json', 'application/json'],
];

let failed = 0;
for (const [path, expectedType] of checks) {
  try {
    const res = await fetch(base + path);
    const type = res.headers.get('content-type') ?? '';
    const ok = res.status === 200 && type.includes(expectedType);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${path} (${type || 'no content-type'})`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ---  ${path} (${err.message})`);
    failed++;
  }
}

// A real 404, not a soft 200 (§7, §11).
const missing = await fetch(base + '/definitely-not-a-page-' + Date.now());
const is404 = missing.status === 404;
console.log(`${is404 ? 'OK  ' : 'FAIL'} ${missing.status} unknown path returns a genuine 404`);
if (!is404) failed++;

// Link headers — _headers is host-specific and fails silently if malformed (§12).
const head = await fetch(base + '/', { method: 'HEAD' });
const link = head.headers.get('link') ?? '';
const hasLink = link.includes('llms.txt');
console.log(`${hasLink ? 'OK  ' : 'FAIL'} Link header advertises llms.txt (${link || 'absent'})`);
if (!hasLink) failed++;

process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Write the placeholder audit**

`scripts/audit-placeholders.mjs` — the schema check in Task 6 covers collection data only. This covers everything else, including the registry's contact block.

```js
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  /hello@example\.com/i,
  /\bexample\.com\b/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /\bFill in\b/i,
  /lorem ipsum/i,
  /drop a real photo here/i,
  /<CHOSEN DISPLAY FACE>/,
  /oklch\(<L>/,
];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === 'node_modules' || f === 'dist' || f === '.git' || f === '.astro') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let failed = 0;
for (const file of walk('src').concat(walk('public'))) {
  const text = readFileSync(file, 'utf8');
  for (const rx of BANNED) {
    if (rx.test(text)) {
      console.log(`FAIL ${file} matches ${rx}`);
      failed++;
    }
  }
}
console.log(failed ? `\n${failed} placeholder(s) found — spec §13 forbids these reaching master.` : 'no placeholders found');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Register the scripts**

```bash
pnpm pkg set scripts.verify:links="node scripts/verify-links.mjs"
pnpm pkg set scripts.verify:agents="node scripts/verify-agent-surface.mjs"
pnpm pkg set scripts.audit:placeholders="node scripts/audit-placeholders.mjs"
pnpm add -D yaml
```

- [ ] **Step 5: Run them**

Run: `pnpm audit:placeholders && pnpm verify:links`
Expected: `verify:links` reports "no project URLs declared yet" (URLs are still an open §13 input). `audit:placeholders` **will fail** if the Task 3 token values or the Task 2 display face were left as `<...>` markers — that is the script working correctly. Fix any real hit; do not weaken the patterns.

- [ ] **Step 6: Stage and stop**

```bash
git add -A
```

Do NOT commit. Report that the work is staged; the controller commits.

---

## Task 17: Deploy to Cloudflare Pages and retire the old URL

**Files:**
- Create: `docs/DEPLOYMENT.md`
- Create (on a separate branch): `index.html` on `gh-pages-redirect`

**Interfaces:**
- Consumes: a green `pnpm build`.
- Produces: a live site at `https://singhsterabhi.pages.dev` and a redirect at the old URL.

Two steps here need the user's browser and their account — they cannot be done from the CLI. Ask; do not attempt to work around.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Ask the user to connect Cloudflare Pages**

Give them these exact settings:
- Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
- Repository: `singhsterabhi/singhsterabhi.github.io`
- Production branch: `master`
- Framework preset: **Astro**
- Build command: `pnpm build`
- Build output directory: `dist`
- Node version: set env var `NODE_VERSION=22`
- Package manager: Cloudflare infers **pnpm** from the committed
  `pnpm-lock.yaml` and the `packageManager` field. Confirm the build log shows
  `pnpm install` and not `npm install`; if it shows npm, the lockfile was not
  committed.

- [ ] **Step 3: Verify the deploy**

Run: `pnpm verify:agents -- https://singhsterabhi.pages.dev`
Expected: every check `OK`, including the genuine-404 check and the `Link` header check. A failing `Link` header means `public/_headers` was malformed — Cloudflare fails it silently, which is exactly why this check exists.

- [ ] **Step 4: Build the redirect stub on its own branch**

Spec §2: the old URL must not be left serving stale content. The visible anchor matters — a client that does not follow the refresh, agents included, must still resolve the new location.

```bash
git switch --orphan gh-pages-redirect
cat > index.html <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Abhishek Singh — moved to singhsterabhi.pages.dev</title>
  <link rel="canonical" href="https://singhsterabhi.pages.dev/">
  <meta http-equiv="refresh" content="0; url=https://singhsterabhi.pages.dev/">
  <meta name="robots" content="noindex, follow">
</head>
<body>
  <h1>This site moved</h1>
  <p>Abhishek Singh's portfolio now lives at
     <a href="https://singhsterabhi.pages.dev/">singhsterabhi.pages.dev</a>.</p>
</body>
</html>
HTML
git add index.html
```
Ask before committing and pushing this branch.

- [ ] **Step 5: Ask the user to repoint GitHub Pages**

GitHub → repo Settings → Pages → Source: *Deploy from a branch* → Branch: `gh-pages-redirect` / `/ (root)`.

- [ ] **Step 6: Verify the old URL redirects**

```bash
curl -sL https://singhsterabhi.github.io | grep -c 'singhsterabhi.pages.dev'
```
Expected: at least 1 — the stub is serving, not the old portfolio.

- [ ] **Step 7: Write DEPLOYMENT.md**

Record: the Cloudflare project name, the build settings from Step 2, the `gh-pages-redirect` branch's purpose, and the note from §14 that changing to a custom domain means editing `site` in `astro.config.mjs` and the stub — and nowhere else, because every absolute URL derives from `site`.

- [ ] **Step 8: Stage and ask before committing**

```bash
git switch master && git add -A
```

---

## Task 18: Full verification pass (spec §12)

**Files:**
- Create: `docs/superpowers/verification/2026-08-22-portfolio-site.md`

Report real numbers and real output. Do not assert any of these without having run it.

- [ ] **Step 1: Automated gates**

```bash
pnpm vitest run
pnpm build
pnpm audit:placeholders
pnpm verify:links
pnpm verify:agents -- https://singhsterabhi.pages.dev
```
Record pass/fail and counts for each.

- [ ] **Step 2: The JS-disabled test — the real test of the islands claim (§12.5)**

Use the `browse` skill with JavaScript disabled. Load `/` and `/about` and confirm: all copy present, every project card and its links present, nav links work, the theme still resolves via `prefers-color-scheme` (the inline script is blocking but JS-off means the CSS media query carries it), and no element is stuck invisible from a `.reveal` animation. Record what you saw.

- [ ] **Step 3: Lighthouse on Home and About**

Report the four actual scores plus LCP, INP and CLS for each page. No estimates.

- [ ] **Step 4: Keyboard-only walkthrough**

Tab through Home from load: skip link fires first, every control reachable with a visible focus ring, the terminal opens from its button, `` ` `` and `⌘K` both open it, focus lands in the input, `Esc` closes it and returns focus to the trigger. Repeat on About. Record any control you could not reach.

- [ ] **Step 5: Both themes**

Toggle light and dark on both pages and in the terminal. Confirm no unreadable pairing, and confirm `theme light` / `theme dark` in the terminal moves the same state as the header button. Re-run the token contrast suite as the evidence: `pnpm vitest run tests/tokens.test.ts`.

- [ ] **Step 6: Reduced motion**

With `prefers-reduced-motion: reduce` set at the OS level, load both pages: nothing moves, nothing is invisible, no layout is broken. Then confirm the on-page motion toggle overrides it in both directions.

- [ ] **Step 7: Throttled network and small viewport**

Slow 3G and a 375px viewport. Confirm the bento grid reflows to one column, the terminal overlay is usable, and the hero text does not overflow.

- [ ] **Step 8: The is-agentic scan — run it, do not estimate it (§12.8)**

Use the `browse` skill to open `https://is-agentic.com/`, submit `https://singhsterabhi.pages.dev`, and wait for the report. Record the **actual score** and the **full list of failed checks**. Then triage: fix what is fixable, and for anything that is not, state plainly why (Sections 4 and 5 are expected to be excluded as inapplicable, not failed; a hosted MCP endpoint, OpenAPI and NLWeb require Cloudflare Pages Functions, which §14 defers). Re-run after fixes and record both scores.

- [ ] **Step 9: Markdown twins have not drifted (§12.11)**

Diff `/index.md` and `/about.md` against the rendered page copy. Because both derive from `src/lib/site-content.ts` this should be exact; if it is not, something bypassed the shared module and must be refactored back onto it.

- [ ] **Step 10: Write the verification report and stage**

Write everything above into `docs/superpowers/verification/2026-08-22-portfolio-site.md`, including failures and anything left undone.

```bash
git add -A
```

---

## Outstanding content inputs (spec §13)

These block a truthful launch and cannot be invented. Ask the user for each:

1. **Repo URL for `table-kit`**; **repo and demo URLs for `gym-log`.** Until supplied, those cards render with no link buttons (by design, §6).
2. **The email to publish.** `src/commands/registry.ts` currently uses `singhsterabhi@gmail.com` from the old site; the artboard used `hello@example.com`, which `audit:placeholders` rejects. Confirm the real one.
3. **Timeline entries.** `src/data/timeline.yaml` is `[]` and the whole section is hidden until filled. Needed: the media.net entry with two or three concrete outcomes, and whether earlier roles are included. Three entries reads more confident than six.
4. **Portrait photo** for About, shot on a dark background. The `<figure>` is omitted entirely until one exists.
5. **Résumé PDF** at `public/abhishek-singh.pdf`. Until it exists, the "Résumé PDF" buttons and the `resume` command point at a 404.

---

## Self-Review

**Spec coverage:** §2 hosting/constraints → Tasks 1, 17. §3 scope → all. §4 stack → Task 1. §5 layout → Tasks 1, 5–14. §6 projects collection + dead-link rule → Tasks 6, 10, 16. §7 IA (Home, About, 404, terminal) → Tasks 10–12. §7.1 shared registry → Task 7, consumed by 8, 9, 14. §8 visual system → Tasks 2, 3, 10–12. §9 motion → Tasks 3, 15. §10 accessibility → Tasks 4, 5, 8, 18. §11 agent readability → Tasks 13, 14, 18. §12 verification → Tasks 16, 18. §13 content blockers → Task 6 schema, Task 16 audit, and the section above. §14 deferred → recorded, not built.

**Gaps found and closed during review:**
- The `<slot name="head" />` needed by the 404's `noindex` was not in Task 5's layout; Task 12 Step 3 now adds it explicitly.
- Task 13 originally left the pages' hard-coded prose in place, which would have made the "cannot drift" claim false. Step 6 now requires the refactor onto `site-content.ts`.
- `yaml` was used by `verify-links.mjs` without being installed; added to Task 16 Steps 1 and 4.
- The spec says `navigator.modelContext`; that is deprecated as of Chrome 150. Task 9 uses `document.modelContext` and states why. **The spec should be amended to match** — flag this to the user.

**Type consistency:** `Command`, `CommandCtx`, `CommandResult`, `Line`, `Tone`, `ProjectEntry` are defined once in Task 7 and imported unchanged by Tasks 8, 9 and 14. `Project` in `site-content.ts` is a structurally compatible superset used only for content generation. `runLine`, `complete`, `nearest`, `buildLlmsTxt`, `buildLlmsFullTxt`, `buildHomeMarkdown`, `buildAboutMarkdown`, `buildAgentCard`, `registerWebMcpTools`, `resolveTheme`, `nextTheme`, `resolveMotion` are each defined in exactly one task and referenced by the same name everywhere.

**Known deviation from the spec, deliberate:** Task 9 uses `document.modelContext`, not §11's `navigator.modelContext`, because the latter is deprecated. Verified against Chrome's WebMCP documentation on 2026-08-22.
