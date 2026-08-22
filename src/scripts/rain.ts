// Character-rain field + scanline drift — the "living background" (decision
// doc §"The living background"). Hand-written canvas, no animation library.
//
// Five non-negotiables carried in from the decision doc, enforced here:
//   1. This module is dynamically imported by LivingBackground.astro on
//      idle — never in the LCP path. (enforced by the caller, not here)
//   2. Under reduced motion, `start()` draws exactly one static frame and
//      never calls requestAnimationFrame.
//   3. With JS disabled the canvas is simply empty — nothing here runs.
//   4. `columnCount` scales down for narrow viewports, capped at 26 at
//      375px, and callers pause the loop when off-screen/hidden.
//   5. `maxAlpha()` returns a lower ceiling for the light theme.

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
}

const GLYPHS = '01<>/{}[]#$_—❯abcdef'.split('');
const CELL = 16; // px per glyph cell, also the column pitch
const SCANLINE_STEP = 4; // px between 1px scanlines

/** Non-negotiable 4: mobile gets fewer columns and a lower frame budget.
 *  Scales with viewport width, capped at 26 columns at/around 375px, and
 *  never returns zero so the field is never empty on a narrow screen. */
export function columnCount(width: number): number {
  const raw = Math.floor(width / CELL);
  const capped = Math.min(raw, 26 + Math.floor(Math.max(0, width - 375) / 40));
  return Math.max(1, Math.min(raw, capped));
}

function readColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Non-negotiable 5: dark reads at up to 0.16 alpha; light must be lower
 *  (0.08) or the same values read as dirt on a near-white ground. */
function maxAlphaFor(theme: Theme): number {
  return theme === 'dark' ? 0.16 : 0.08;
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
    y: Math.random() * -height,
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
  let scanlineOffset = 0;

  let width = canvas.clientWidth || 800;
  let height = canvas.clientHeight || 600;
  let dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);

  let cols = columnCount(width);
  let columns: Column[] = Array.from({ length: cols }, (_, i) => makeColumn(i * CELL, height));

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
    ctx.font = `${CELL - 2}px var(--font-mono, ui-monospace, monospace)`;
    ctx.textBaseline = 'top';

    for (const col of columns) {
      for (let i = 0; i < col.glyphs.length; i++) {
        const gy = col.y - i * CELL;
        if (gy < -CELL || gy > height) continue;
        const isHead = i === 0;
        const fade = 1 - i / col.glyphs.length;
        ctx.globalAlpha = alpha * (isHead ? 1 : 0.55 * fade);
        ctx.fillStyle = isHead ? head : tail;
        ctx.fillText(col.glyphs[i], col.x, gy);
      }
    }

    // Scanline drift: 1px lines every 4px, creeping vertically.
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = tail;
    for (let y = -SCANLINE_STEP; y < height + SCANLINE_STEP; y += SCANLINE_STEP) {
      const ly = (y + scanlineOffset) % (height + SCANLINE_STEP);
      ctx.fillRect(0, ly, width, 1);
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    for (const col of columns) {
      col.y += col.speed;
      if (col.y - col.length * CELL > height) {
        col.y = Math.random() * -height * 0.2;
        col.speed = 0.4 + Math.random() * 1.1;
      }
    }
    scanlineOffset = (scanlineOffset + 0.15) % SCANLINE_STEP;
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
    resize(w: number, h: number) {
      width = w;
      height = h;
      dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
      applyCanvasSize();
      cols = columnCount(width);
      columns = Array.from({ length: cols }, (_, i) => makeColumn(i * CELL, height));
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
