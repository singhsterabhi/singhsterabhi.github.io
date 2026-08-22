// Character-rain field — the "living background" (decision doc §"The living
// background"). Hand-written canvas, no animation library. The scanline
// drift layer was removed after user feedback (fix round 1): it read as a
// print artifact on the light ground and competed with the glyphs rather
// than adding motion, so only the rain remains.
//
// Five non-negotiables carried in from the decision doc, enforced here:
//   1. This module is dynamically imported by LivingBackground.astro on
//      idle — never in the LCP path. (enforced by the caller, not here)
//   2. Under reduced motion, `start()` draws exactly one static frame and
//      never calls requestAnimationFrame.
//   3. With JS disabled the canvas is simply empty — nothing here runs.
//   4. `columnCount` scales down for narrow viewports, capped at 26 at
//      375px, and callers pause the loop when off-screen/hidden.
//   5. `maxAlpha()` gives each theme its own ceiling, tuned per ground —
//      light needs a HIGHER ceiling than dark (glyphs are dark-on-white
//      there, which reads fainter per unit alpha than light-on-dark).

export type Theme = 'dark' | 'light';

export interface RainOptions {
  reducedMotion: boolean;
  theme: Theme;
}

export interface Rain {
  start(): void;
  stop(): void;
  running(): boolean;
  maxAlpha(): number;
  /** Re-derive columns for a new width (called on debounced resize). */
  resize(width: number, height: number): void;
  /** Re-read theme colours from the computed custom properties. */
  setTheme(theme: Theme): void;
  /** Flip the reduced-motion behaviour at runtime (the motion toggle). */
  setReducedMotion(reduced: boolean): void;
  /** Current x position of every column's lane centre — exposed for testing
   *  full-width coverage (bug: columns used to bunch against the left edge). */
  columnXs(): number[];
}

const GLYPHS = '01<>/{}[]#$_—❯abcdef'.split('');
// GLYPH_CELL is the glyph's own vertical metric: font size and line height
// (the fall step between stacked characters in a column). It is NOT the
// horizontal column pitch — that is derived per-width below so the capped
// column count always spans the full canvas instead of bunching at the left
// edge (the bug: 52 columns * a fixed 16px pitch = 832px on a 1440px canvas).
const GLYPH_CELL = 16;

/** Non-negotiable 4: mobile gets fewer columns and a lower frame budget.
 *  Scales with viewport width, capped at 26 columns at/around 375px, and
 *  never returns zero so the field is never empty on a narrow screen. */
export function columnCount(width: number): number {
  const raw = Math.floor(width / GLYPH_CELL);
  const capped = Math.min(raw, 26 + Math.floor(Math.max(0, width - 375) / 40));
  return Math.max(1, Math.min(raw, capped));
}

/** Horizontal lane pitch: spread the (possibly capped) column count evenly
 *  across the full width, rather than packing columns at a fixed pitch that
 *  only fills part of the canvas when the count is capped. */
function columnPitch(width: number, cols: number): number {
  return width / cols;
}

function readColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Non-negotiable 5: each theme gets its own ceiling. Dark glyphs are
 *  light-on-dark (ΔL per unit alpha ≈ 0.66); light glyphs are dark-on-white
 *  (ΔL per unit alpha ≈ 0.50) — so light needs a HIGHER alpha ceiling than
 *  dark to read with comparable presence, not a lower one. Raised again
 *  (fix round 1, addendum) once the scanline layer was removed — with no
 *  other texture on the canvas the glyphs are the whole field and need to
 *  carry it alone. */
function maxAlphaFor(theme: Theme): number {
  return theme === 'dark' ? 0.30 : 0.38;
}

interface Column {
  x: number;
  y: number;
  speed: number;
  glyphs: string[];
  length: number;
}

function makeColumn(x: number, height: number): Column {
  const length = 6 + Math.floor(Math.random() * 10);
  const glyphs = Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
  return {
    x,
    // Seeded within the visible band (not above it) so the very first
    // drawn frame already shows a populated field — this matters under
    // reduced motion, where that first frame is the only one ever drawn
    // and must never come up blank by the luck of the random seed.
    y: Math.random() * height,
    speed: 0.4 + Math.random() * 1.1,
    glyphs,
    length,
  };
}

export function createRain(canvas: HTMLCanvasElement, opts: RainOptions): Rain {
  const ctx = canvas.getContext('2d');
  let theme = opts.theme;
  let reducedMotion = opts.reducedMotion;
  let running = false;
  let rafId: number | null = null;

  let width = canvas.clientWidth || 800;
  let height = canvas.clientHeight || 600;
  let dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);

  let cols = columnCount(width);
  let pitch = columnPitch(width, cols);
  let columns: Column[] = Array.from({ length: cols }, (_, i) =>
    makeColumn(Math.round(i * pitch + pitch / 2), height)
  );

  let head = readColor('--color-accent-2', '#e070c0');
  let tail = readColor('--color-accent', '#3ad1e0');

  function applyCanvasSize() {
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  applyCanvasSize();

  function drawFrame() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const alpha = maxAlphaFor(theme);
    ctx.font = `${GLYPH_CELL - 2}px var(--font-mono, ui-monospace, monospace)`;
    ctx.textBaseline = 'top';

    for (const col of columns) {
      for (let i = 0; i < col.glyphs.length; i++) {
        const gy = col.y - i * GLYPH_CELL;
        if (gy < -GLYPH_CELL || gy > height) continue;
        const isHead = i === 0;
        const fade = 1 - i / col.glyphs.length;
        ctx.globalAlpha = alpha * (isHead ? 1 : 0.55 * fade);
        ctx.fillStyle = isHead ? head : tail;
        ctx.fillText(col.glyphs[i], col.x, gy);
      }
    }

    ctx.globalAlpha = 1;
  }

  function tick() {
    for (const col of columns) {
      col.y += col.speed;
      if (col.y - col.length * GLYPH_CELL > height) {
        col.y = Math.random() * -height * 0.2;
        col.speed = 0.4 + Math.random() * 1.1;
      }
    }
    drawFrame();
    if (running) rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      if (reducedMotion) {
        // Non-negotiable 2: one static frame, then nothing moves.
        drawFrame();
        return;
      }
      running = true;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    running() {
      return running;
    },
    maxAlpha() {
      return maxAlphaFor(theme);
    },
    columnXs() {
      return columns.map((c) => c.x);
    },
    resize(w: number, h: number) {
      width = w;
      height = h;
      dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
      applyCanvasSize();
      cols = columnCount(width);
      pitch = columnPitch(width, cols);
      columns = Array.from({ length: cols }, (_, i) =>
        makeColumn(Math.round(i * pitch + pitch / 2), height)
      );
      if (!running) drawFrame();
    },
    setTheme(t: Theme) {
      theme = t;
      head = readColor('--color-accent-2', head);
      tail = readColor('--color-accent', tail);
      if (!running) drawFrame();
    },
    setReducedMotion(reduced: boolean) {
      reducedMotion = reduced;
      if (reduced) {
        running = false;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        drawFrame();
      }
    },
  };
}
