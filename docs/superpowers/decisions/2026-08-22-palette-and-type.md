# Palette and type — decided

**Date:** 2026-08-22
**Task:** 2 (decision gate) of `docs/superpowers/plans/2026-08-22-portfolio-site.md`
**Decided by:** the user, from three rendered concepts
**Status:** final — Task 3 transcribes these values verbatim

## The decision

**Direction: "Systems Console" (concept 01).** The user reviewed three structurally
different concepts and chose 01 for its **colour, living background, and overall
feel**, while keeping the **layout and structure from the Claude Design artboard**
(`Portfolio Site.dc.html`): hero → bento project grid → about teaser, plus the
terminal overlay, About page and 404.

So this is not concept 01's split-pane skeleton. It is the artboard's editorial
structure wearing the Console's skin.

Explicit additional requirement from the user: **the result must be mobile
compatible.** This is now a first-class constraint, not a verification
afterthought.

## Type — no separate display face

| Role | Family | Notes |
|---|---|---|
| Headings (`--font-heading`) | **JetBrains Mono**, weight 700 | Mono at display size is what makes the page read as a console rather than a dark page with cyan on it. |
| Body (`--font-body`) | **Inter**, 400/500/600 | Unchanged. |
| Mono / terminal / kickers (`--font-mono`) | **JetBrains Mono**, 400/500 | Unchanged. |

**`--font-heading` resolves to the same family as `--font-mono`.** No third font is
downloaded, and `astro.config.mjs` needs **no new entry** — Task 3 sets
`--font-heading: var(--font-mono)` in `tokens.css`.

This supersedes the spec's earlier plan to add a characterful display face, and it
retires the Cabinet Grotesk / Clash Display candidates, which were Fontshare rather
than Google and therefore unavailable to `fontProviders.google()`.

Headings take **weight 700 and tracking `-0.03em`** — mono at large sizes needs the
tracking pulled in hard or it reads loose and accidental.

## Ramp semantics — read this before transcribing

The step number means **contrast rank against the ground, not absolute lightness.**

- `100` = maximum contrast against the ground (the text colour)
- `900` = minimum contrast (a fill barely distinguishable from the ground)

So lightness *descends* through the dark ramp and *ascends* through the light one.
This is what lets a component say `border: 1px solid var(--color-neutral-800)` once
and be correct in both themes. Do not "fix" the light ramp to descend — that would
invert every border and fill in light mode.

## Dark theme (the primary)

```
--color-bg:      oklch(0.155 0.030 265)
--color-surface: oklch(0.190 0.032 265)
--color-text:    oklch(0.950 0.010 200)
--color-accent:  oklch(0.815 0.150 195)   /* cyan */
--color-accent-2: oklch(0.700 0.215 340)  /* magenta */
--color-divider: color-mix(in oklch, var(--color-text) 16%, transparent)

--color-neutral-100: oklch(0.950 0.010 200)
--color-neutral-200: oklch(0.890 0.008 230)
--color-neutral-300: oklch(0.815 0.010 240)
--color-neutral-400: oklch(0.720 0.012 246)
--color-neutral-500: oklch(0.630 0.015 250)
--color-neutral-600: oklch(0.600 0.016 252)
--color-neutral-700: oklch(0.470 0.020 256)
--color-neutral-800: oklch(0.330 0.025 258)
--color-neutral-900: oklch(0.228 0.022 260)

--color-accent-100: oklch(0.960 0.030 195)
--color-accent-200: oklch(0.910 0.060 195)
--color-accent-300: oklch(0.855 0.110 195)
--color-accent-400: oklch(0.760 0.140 195)
--color-accent-500: oklch(0.680 0.135 197)
--color-accent-600: oklch(0.590 0.115 199)
--color-accent-700: oklch(0.490 0.090 200)
--color-accent-800: oklch(0.400 0.070 200)
--color-accent-900: oklch(0.300 0.050 202)

--color-accent-2-300: oklch(0.780 0.160 340)
--color-accent-2-500: oklch(0.700 0.215 340)
--color-accent-2-800: oklch(0.395 0.095 342)
```

## Light theme (authored independently, not inverted)

A light console is a *paper terminal* — the cyan and magenta both drop in lightness
and gain contrast so they carry against a near-white ground. The ground itself stays
cool, so every warm or saturated note on the page comes from the accents.

```
--color-bg:      oklch(0.975 0.004 250)
--color-surface: oklch(0.940 0.008 250)
--color-text:    oklch(0.200 0.020 265)
--color-accent:  oklch(0.480 0.105 205)   /* deep cyan */
--color-accent-2: oklch(0.480 0.180 345)  /* deep magenta */
--color-divider: color-mix(in oklch, var(--color-text) 16%, transparent)

--color-neutral-100: oklch(0.200 0.020 265)
--color-neutral-200: oklch(0.290 0.018 262)
--color-neutral-300: oklch(0.375 0.016 258)
--color-neutral-400: oklch(0.455 0.014 256)
--color-neutral-500: oklch(0.520 0.013 254)
--color-neutral-600: oklch(0.545 0.012 252)
--color-neutral-700: oklch(0.700 0.010 250)
--color-neutral-800: oklch(0.855 0.008 250)
--color-neutral-900: oklch(0.930 0.006 250)

--color-accent-100: oklch(0.240 0.070 205)
--color-accent-200: oklch(0.310 0.085 205)
--color-accent-300: oklch(0.430 0.100 205)
--color-accent-400: oklch(0.480 0.105 205)
--color-accent-500: oklch(0.560 0.100 203)
--color-accent-600: oklch(0.650 0.085 201)
--color-accent-700: oklch(0.750 0.065 200)
--color-accent-800: oklch(0.830 0.045 205)
--color-accent-900: oklch(0.900 0.028 205)

--color-accent-2-300: oklch(0.440 0.175 345)
--color-accent-2-500: oklch(0.480 0.180 345)
--color-accent-2-800: oklch(0.845 0.055 345)
```

## What each accent is for

Two accents, with a strict division of labour so the page does not become a
carnival:

- **Cyan (`--color-accent`)** is the structural accent: primary buttons, focus
  rings, links, the featured card's border, the `❯` prompt in prose contexts.
- **Magenta (`--color-accent-2`)** is reserved for **the live caret, the active
  state, and errors** — the things that are *happening*. It should appear on any
  given screen two or three times at most. If magenta starts decorating, it has
  stopped meaning anything.

Terminal line tones map as: `cmd` → neutral-600, `out` → neutral-300, `muted` →
neutral-600, `accent` → accent-300, `err` → accent-2-300.

## Contrast — verified pairings

Task 3's test suite asserts these. Every pairing below is intended to pass WCAG AA
(4.5:1 for text, 3:1 for non-text), **in both themes**:

- `text` on `bg`
- `neutral-400` on `bg` — carries 15–17px prose
- `neutral-600` on `bg` — carries the 10–11px uppercase mono kickers
- `accent` on `bg` — borders and focus rings (3:1)
- `accent-300` on `bg` — accent-coloured text (4.5:1)
- `accent-2-300` on `bg` — error text (4.5:1)

**Correction applied 2026-08-22 during Task 3.** Light `--color-neutral-600` was
originally specified as `oklch(0.560 0.012 252)`. Measured against the light
ground it gave **4.326:1** — below AA for the small uppercase mono labels it
carries. Darkened to `oklch(0.545 0.012 252)`, which measures **4.606:1**. The
value above is the corrected one.

Measured ratios, both themes, verified independently:

| Pairing | Light | Dark | Min |
|---|---|---|---|
| `text` on `bg` | 16.858 | 16.965 | 4.5 |
| `neutral-400` on `bg` | 6.771 | 7.900 | 4.5 |
| `neutral-600` on `bg` | 4.606 | 4.964 | 4.5 |
| `accent` on `bg` | 5.809 | 11.679 | 3 |
| `accent-300` on `bg` | 7.221 | 13.112 | 4.5 |
| `accent-2-300` on `bg` | 7.989 | 9.093 | 4.5 |

If any assertion fails, **change the value here and in `tokens.css`, not the
assertion.** A failing contrast test means the palette is wrong, which is the
entire reason the test exists.

## The living background

Adopted from concept 01 and now a **signature element with its own scope** (see
spec §9). What it is:

- A **character-rain field** of mono glyphs (`01<>/{}[]#$_—❯abcdef`) falling in
  columns at varied speeds, with a short bright head and a dim tail.
- ~~Over a slow scanline drift — 1px horizontal lines every 4px, creeping
  vertically.~~ **Removed 2026-08-22 at the user's request.** The stripes were
  static texture that added visual noise without contributing motion, risked
  moiré on the light ground, and competed with the glyphs for legibility. The
  rain now carries the effect alone, which also frees a full-canvas stroke pass
  per frame.
- Head glyphs in magenta, tail glyphs in cyan, all at very low alpha (0.02–0.16).

Non-negotiables carried into implementation:

1. **Canvas, lazy, after paint.** It must never block LCP, and it is not in the
   critical path. Code-split and started on idle.
2. **`prefers-reduced-motion`: one static frame, then nothing.** Not a blank
   canvas — a still field, so the composition is intact.
3. **JS disabled: the page is unaffected.** The canvas is decorative and
   `aria-hidden`; with no JS it is simply an empty transparent element.
4. **Mobile: fewer columns and a lower frame budget**, driven by viewport width,
   and paused entirely when the tab or element is not visible
   (`IntersectionObserver`). The user asked specifically for mobile compatibility;
   a background that melts a phone battery fails that.
5. **Light theme needs a HIGHER alpha than dark, not lower.**

   **Corrected 2026-08-22 after the user reported the field invisible in light
   mode.** The original text here said the opposite — "the same alphas read as
   dirt on a near-white ground" — and that reasoning was wrong, because it
   assumed light-on-light. What actually happens:

   | | glyph | ground | ΔL per unit alpha |
   |---|---|---|---|
   | dark | cyan L 0.815 | L 0.155 | ~0.66 |
   | light | deep cyan L 0.480 | L 0.975 | ~0.50 |

   Dark-on-white loses contrast faster than light-on-black, so the light ground
   needs more opacity to register at all. At the original 0.08 the light field
   was ΔL ≈ 0.04 — below the threshold of noticing. Values are tuned by
   measuring painted-pixel count and mean alpha in both themes, not derived.

## Superseded

- Nocturne's indigo/blurple palette and its Inter-for-everything type.
- The characterful-display-face plan, and its Cabinet Grotesk / Clash Display /
  Space Grotesk / Instrument Serif candidate list.
- The three muted palettes offered in the first Task 2 round, all rejected as "too
  muted, too safe".

## Revision 2026-08-22 — accent moved to azure, light mode rebuilt on a paper ground

Two rounds of user feedback on the rendered site, both acted on. **The values in
this section supersede the dark `--color-accent*` ramp and the entire light theme
below.** Everything else in this document still stands.

### 1. The accent was pale mint, not a signal

`oklch(0.815 0.150 195)` sat close to the blue-violet ground in temperature and
at L 0.815 read as pastel. The user's words were that the dark background is good
but the accent is bad. Four candidates were rendered on the real page — the
current cyan, amber (hue 75), azure (hue 245) and a saturated teal (hue 200) —
and the user chose **azure**, knowing it is the more conservative of the two real
departures.

```
dark   --color-accent: oklch(0.700 0.185 245)
light  --color-accent: oklch(0.480 0.180 248)
```

Dark ramp (lightness descends): `100 oklch(0.945 0.045 245)` · `200 oklch(0.880
0.090 246)` · `300 oklch(0.775 0.155 248)` · `400 oklch(0.700 0.185 245)` ·
`500 oklch(0.640 0.180 247)` · `600 oklch(0.565 0.160 249)` · `700 oklch(0.480
0.135 250)` · `800 oklch(0.395 0.100 250)` · `900 oklch(0.300 0.070 252)`

Light ramp (lightness ascends): `100 oklch(0.250 0.105 255)` · `200 oklch(0.325
0.140 252)` · `300 oklch(0.420 0.170 250)` · `400 oklch(0.480 0.180 248)` ·
`500 oklch(0.550 0.170 247)` · `600 oklch(0.630 0.150 246)` · `700 oklch(0.730
0.110 245)` · `800 oklch(0.820 0.075 245)` · `900 oklch(0.900 0.045 245)`

Magenta `--color-accent-2` is unchanged and keeps its role: the live caret, the
active state, errors. Azure and magenta are further apart than cyan and magenta
were, so the division of labour reads more clearly, not less.

`src/scripts/rain.ts` reads both accents from the computed tokens at runtime, so
the living background followed automatically. Only its hardcoded fallback moved
(`#3ad1e0` → `#4b8ff5`), for the case where the token lookup fails.

### 2. Light mode was washed out because its elevation was inverted

The user reported light mode as "really bad in some places… kinda washed out".
The cause was structural, not a matter of taste:

`--color-surface` (0.940) was **darker** than `--color-bg` (0.975). Every
elevated component — project cards, chips, the featured panel — therefore
rendered as a recessed grey dent on a near-white page instead of lifting off it,
and at ΔL 0.022 from the ground it barely rendered at all. The border ramp had
the same problem: `neutral-900` sat 0.045 off the ground, which is not an edge.

Light mode now uses a **paper ground with white panels**, the standard light
elevation model:

```
--color-bg:      oklch(0.962 0.006 250)   /* cool paper, was 0.975 */
--color-surface: oklch(0.995 0.003 250)   /* now LIGHTER than bg, was 0.940 */
--color-panel:   oklch(1 0 250)

--color-neutral-600: oklch(0.532 0.012 252)  /* was 0.545 — holds AA on the
                                                darker ground */
--color-neutral-700: oklch(0.660 0.010 250)  /* was 0.700 */
--color-neutral-800: oklch(0.820 0.008 250)  /* was 0.855 */
--color-neutral-900: oklch(0.900 0.006 250)  /* was 0.930 — now a real edge */
```

Darkening the ground cost `neutral-600` its margin (4.606 → 4.435, below AA), so
the token moved rather than the assertion — the rule this document already sets.
Darkening `neutral-900` then cost the project-card tag chips their margin, since
that token is both the faintest border and the chip fill; the chip text moved
from `neutral-500` to `neutral-400` (4.085 → 5.401).

### 3. Two new tokens: `--color-panel` and `--color-scrim`

Three components built their panel fill as `color-mix(in oklch, var(--color-bg)
84%, black)` and the modal scrim as the same mix at 72%. Darkening toward black
is a **dark-theme idiom**: on the near-white light ground it produced an opaque
mid-grey slab at L 0.819 for the terminal hint strip and dialog, and an opaque
L 0.702 wall for the backdrop that hid the page entirely. Whether an elevated
plane goes lighter or darker than its ground is exactly the thing that flips
between themes, so it belongs in a token.

```
dark   --color-panel: oklch(0.130 0.025 265)   /* a recessed console well */
       --color-scrim: color-mix(in oklch, oklch(0.090 0.020 265) 82%, transparent)
light  --color-panel: oklch(1 0 250)           /* white, above the paper */
       --color-scrim: color-mix(in oklch, oklch(0.28 0.020 260) 38%, transparent)
```

The scrim is translucent in **both** themes so the blurred page still reads
behind the dialog. The dark panel value reproduces what the old mix computed, so
dark mode is pixel-identical to before.

### Verified contrast, both themes

| Pairing | Light | Dark | Min |
|---|---|---|---|
| `text` on `bg` | 16.230 | 16.965 | 4.5 |
| `neutral-400` on `bg` | 6.519 | 7.900 | 4.5 |
| `neutral-600` on `bg` | 4.685 | 4.964 | 4.5 |
| `accent` on `bg` | 5.899 | 7.390 | 3 |
| `accent-300` on `bg` | 7.685 | 9.675 | 4.5 |
| `accent-2-300` on `bg` | 7.691 | 9.093 | 4.5 |
| `neutral-400` on `neutral-900` (tag chip) | 5.401 | 6.855 | 4.5 |

### Invariants added, because the tests could not see any of this

Every contrast assertion passed throughout. They compared tokens against
`--color-bg` and never asked whether the ordering made sense, so three separate
defects were invisible to a green suite:

- **`tests/tokens.test.ts`** now asserts `surface` is lighter than `bg` in both
  themes (the inverted elevation), that `neutral-900` sits at least 0.04 off the
  ground (borders that read as edges), and the tag-chip pairing (text on a fill
  that never touches `bg`).
- **`tests/theme-safety.test.ts`** is new: no source file may mix a theme token
  toward a literal `black` or `white`, every panel/scrim token must be defined in
  all three theme blocks, and the scrim must stay translucent.
